/* eslint-env node */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const repositoryRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const subjectPath = path.join(repositoryRoot, 'scripts/extensions/activities.js');

function createSyntheticModule(context, exports, identifier) {
    return new vm.SyntheticModule(Object.keys(exports), function() {
        for (let [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, {context, identifier});
}

async function loadPatch({polymorphFromActivity}) {
    let registrations = [];
    let context = vm.createContext({
        console,
        document: {},
        game: {user: {isGM: false}},
        libWrapper: {
            register: (moduleId, target, callback, type) => registrations.push({moduleId, target, callback, type})
        }
    });
    let subject = new vm.SourceTextModule(readFileSync(subjectPath, 'utf8'), {
        context,
        identifier: subjectPath
    });
    await subject.link(async specifier => {
        if (specifier !== '../utils.js') throw new Error(`Unexpected import: ${specifier}`);
        return createSyntheticModule(context, {
            activityUtils: {},
            actorUtils: {polymorphFromActivity},
            genericUtils: {getProperty: () => undefined, log: () => {}, setProperty: () => {}}
        }, specifier);
    });
    await subject.evaluate();
    subject.namespace.activities.patchTransformInto();
    return registrations.find(i => i.target.endsWith('prototype.transformInto')).callback;
}

test('delegates a native Transform activity when the player does not own its target', async () => {
    let calls = [];
    let transformed = [{uuid: 'Scene.test.Token.transformed'}];
    let patch = await loadPatch({
        polymorphFromActivity: async (...args) => {
            calls.push(args);
            return {handled: true, tokens: transformed};
        }
    });
    let wrappedCalls = 0;
    let target = {isOwner: false};
    let source = {uuid: 'Actor.rex'};
    let settings = {preset: 'polymorph'};

    let result = await patch.call(target, async () => {
        wrappedCalls += 1;
    }, source, settings, {renderSheet: false});

    assert.equal(wrappedCalls, 0);
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], target);
    assert.equal(calls[0][1], source);
    assert.equal(result, transformed);
});

test('leaves owned transformations on the native dnd5e path', async () => {
    let delegated = false;
    let patch = await loadPatch({
        polymorphFromActivity: async () => {
            delegated = true;
        }
    });
    let nativeResult = {native: true};
    let result = await patch.call(
        {isOwner: true},
        async () => nativeResult,
        {uuid: 'Actor.rex'},
        {preset: 'polymorph'},
        {}
    );

    assert.equal(delegated, false);
    assert.equal(result, nativeResult);
});

