/* eslint-env node */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const repositoryRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const subjectPath = 'scripts/events/abilitySave.js';

function readSubject() {
    let gitRef = process.env.CPR_ABILITY_SAVE_GIT_REF;
    if (gitRef) {
        return execFileSync('git', ['show', `${gitRef}:${subjectPath}`], {
            cwd: repositoryRoot,
            encoding: 'utf8'
        });
    }
    return readFileSync(path.join(repositoryRoot, subjectPath), 'utf8');
}

function createSyntheticModule(context, exports, identifier) {
    return new vm.SyntheticModule(Object.keys(exports), function() {
        for (let [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, {context, identifier});
}

async function loadRollSave({getFirstToken, onGetEffects = () => {}}) {
    let hookCallbacks = new Map();
    let context = vm.createContext({
        CONFIG: {
            Dice: {
                D20Roll: {
                    fromRoll: roll => roll
                }
            }
        },
        Hooks: {
            once: (name, callback) => hookCallbacks.set(name, callback)
        },
        Roll: {
            _mapLegacyRollMode: mode => mode
        },
        console,
        foundry: {
            utils: {
                getType: value => value?.constructor?.name,
                isEmpty: value => !Object.keys(value).length,
                setProperty: () => {}
            }
        },
        game: {
            messages: {contents: []},
            settings: {get: () => 'publicroll'}
        },
        libWrapper: {register: () => {}}
    });
    vm.runInContext(`
        Set.prototype.map = function(callback, thisArg) {
            return Array.from(this).map(callback, thisArg);
        };
    `, context);
    let actorUtils = {
        getEffects: actor => {
            onGetEffects(actor);
            return [];
        },
        getFirstToken
    };
    let noOpUtils = {
        getBaseLevel: () => undefined,
        getCastLevel: () => undefined,
        getSaveDC: () => undefined
    };
    let moduleExports = new Map([
        ['../applications/dialog.js', {DialogApp: {}}],
        ['./custom.js', {custom: {executeScript: async () => undefined, getMacro: () => undefined}}],
        ['../utils.js', {
            actorUtils,
            effectUtils: noOpUtils,
            genericUtils: {
                duplicate: value => structuredClone(value),
                getCPRSetting: () => false,
                getRules: () => undefined,
                isTemplateRegion: () => false,
                log: () => {},
                mergeObject: (target, source) => Object.assign(target, source),
                setProperty: () => {}
            },
            itemUtils: noOpUtils,
            macroUtils: {getEmbeddedMacros: () => []},
            regionUtils: noOpUtils,
            templateUtils: {
                ...noOpUtils,
                getName: () => '',
                getTemplatesInToken: () => []
            }
        }],
        ['../macros/2024/mechanics/heroicInspiration.js', {
            heroicInspiration: {saveSkillCheck: async roll => roll}
        }]
    ]);
    let source = `${readSubject()}\nexport {rollSave};`;
    let subject = new vm.SourceTextModule(source, {
        context,
        identifier: path.join(repositoryRoot, subjectPath)
    });
    await subject.link(async specifier => {
        let exports = moduleExports.get(specifier);
        if (!exports) throw new Error(`Unexpected import: ${specifier}`);
        return createSyntheticModule(context, exports, specifier);
    });
    await subject.evaluate();
    return {hookCallbacks, rollSave: subject.namespace.rollSave};
}

function createActor(name) {
    return {
        flags: {},
        items: [],
        name,
        uuid: `Actor.${name}`
    };
}

test('player saves use the actor token when returned roll data has no token', async () => {
    let sourceActor = createActor('Source');
    let peerActor = createActor('Peer');
    let sourceDocument = {
        actor: sourceActor,
        regions: [],
        uuid: 'Scene.test.Token.source'
    };
    let peerDocument = {
        actor: peerActor,
        regions: [],
        uuid: 'Scene.test.Token.peer'
    };
    sourceDocument.parent = {tokens: [sourceDocument, peerDocument]};
    let sourceToken = {document: sourceDocument};
    let phase = 'situational';
    let peerVisits = [];
    let {hookCallbacks, rollSave} = await loadRollSave({
        getFirstToken: actor => actor === sourceActor ? sourceToken : undefined,
        onGetEffects: actor => {
            if (actor === peerActor) peerVisits.push(phase);
        }
    });
    let returnedRoll = {data: {}, options: {}};
    let wrapped = async () => {
        phase = 'bonus';
        hookCallbacks.get('dnd5e.preRollSavingThrowV2')?.(
            {ability: 'dex', subject: sourceActor},
            {},
            {data: {}, rollMode: 'publicroll'}
        );
        return [returnedRoll];
    };

    let result = await rollSave.call(
        sourceActor,
        wrapped,
        {ability: 'dex'},
        {},
        {create: false}
    );

    assert.equal(result[0], returnedRoll);
    assert.deepEqual(peerVisits, ['situational', 'bonus']);
});

test('tokenless actors skip scene save passes without failing', async () => {
    let sourceActor = createActor('Source');
    let {hookCallbacks, rollSave} = await loadRollSave({
        getFirstToken: () => undefined
    });
    let returnedRoll = {data: {}, options: {}};
    let wrapped = async () => {
        hookCallbacks.get('dnd5e.preRollSavingThrowV2')?.(
            {ability: 'wis', subject: sourceActor},
            {},
            {data: {}, rollMode: 'publicroll'}
        );
        return [returnedRoll];
    };

    let result = await rollSave.call(
        sourceActor,
        wrapped,
        {ability: 'wis'},
        {},
        {create: false}
    );

    assert.equal(result[0], returnedRoll);
});
