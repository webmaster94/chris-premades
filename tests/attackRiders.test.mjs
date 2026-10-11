/* eslint-env node */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const subjects = {
    legacySneak: 'scripts/macros/2014/classFeatures/rogue/sneakAttack.js',
    modernSneak: 'scripts/macros/2024/classFeatures/rogue/sneakAttack.js',
    legacySmite: 'scripts/macros/2014/classFeatures/paladin/divineSmite.js',
    modernSmite: 'scripts/macros/2024/spells/divineSmite.js'
};

class Tokens extends Set {
    first() { return this.values().next().value; }
    map(fn) { return Array.from(this).map(fn); }
}

function setProperty(object, key, value) {
    let parts = key.split('.');
    let last = parts.pop();
    for (let part of parts) object = object[part] ??= {};
    object[last] = value;
}

function fixture({modern = false, smite = false, limited = true, formula = '3d6', actorType = 'npc'} = {}) {
    let bonus = [], updates = [], notices = [], rolls = [], nearby = [];
    let actor = {
        type: actorType, uuid: 'Actor.attacker', items: [], classes: {},
        system: {details: {cr: 0}, scale: {}, bonuses: {}, spells: {spell1: {value: 2, max: 2, level: 1}}},
        getRollData: () => ({})
    };
    let target = {id: 'hit', actor: {type: 'npc', creatureType: 'fiend'}, document: {uuid: 'Scene.test.Token.hit'}};
    let token = {id: 'attacker', actor, document: {uuid: 'Scene.test.Token.attacker'}};
    let feature = {
        name: smite ? 'Divine Smite' : 'Sneak Attack', id: 'feature', uuid: actor.uuid + '.Item.feature', actor,
        type: modern && smite ? 'spell' : 'feat',
        identifier: smite ? 'divineSmite' : 'sneakAttack',
        system: {
            level: 1, method: 'spell', prepared: true, hasLimitedUses: limited,
            uses: limited ? {max: '1', spent: 0, value: 1} : {max: '', spent: 0},
            activities: [{id: 'damage', _id: 'damage', type: smite ? 'utility' : 'damage', damage: {parts: [{custom: {enabled: true, formula}, types: new Set(['piercing'])}]}}]
        },
        displayCard: async () => {},
        getRollData: () => ({})
    };
    feature.system.activities.size = feature.system.activities.length;
    actor.items.push(feature);
    let activity = {type: 'attack', attack: {type: {value: 'melee', classification: 'weapon'}}, getActionType: () => 'mwak', getRollData: () => ({})};
    let workflow = {
        id: 'attack', actor, token, item: {name: 'Dagger', id: 'weapon', type: 'weapon', system: {properties: new Set(['fin'])}},
        activity, targets: new Tokens([target]), hitTargets: new Tokens([target]),
        advantage: true, disadvantage: false, defaultDamageType: 'piercing',
        damageRolls: [], castData: {baseLevel: 1, castLevel: 1}
    };
    let config = {
        auto: true, formula: '', classIdentifier: 'rogue', scaleIdentifier: 'sneak-attack',
        damageType: 'radiant', creatureTypes: ['fiend', 'undead'], diceSize: 'd8', baseDiceNumber: 2, playAnimation: false
    };
    let utils = {
        activityUtils: {getIdentifier: activity => activity.identifier, getActivityByIdentifier: () => undefined, canUse: activity => activity.canUse !== false},
        actorUtils: {
            hasSpellSlots: () => true, hasUsedBonusAction: () => false,
            getCastableSpells: () => actor.items.filter(item => item.type === 'spell'),
            typeOrRace: actor => actor.creatureType, getSize: () => 2, setBonusActionUsed: async () => {}
        },
        animationUtils: {aseCheck: () => false, jb2aCheck: () => false},
        combatUtils: {inCombat: () => true, getCurrentCombatantToken: () => token},
        constants: {unarmedAttacks: [], damageTypeOptions: [], diceSizeOptions: [], creatureTypeOptions: []},
        dialogUtils: {confirm: async () => true, selectSpellSlot: async () => 1, selectDocumentDialog: async (_, __, items) => items[0]},
        effectUtils: {getEffectByIdentifier: () => undefined},
        rollUtils: {getCriticalFormula: async formula => formula.replace(/(\d+)d/g, (_, number) => (Number(number) * 2) + 'd')},
        genericUtils: {
            getIdentifier: item => item.identifier,
            format: key => key, translate: key => key, notify: (...args) => notices.push(args),
            setProperty, duplicate: value => structuredClone(value),
            randomID: () => 'cprManualItem000',
            update: async (document, update) => { updates.push({document, update}); for (let [key, value] of Object.entries(update)) setProperty(document, key, value); },
            setFlag: async () => {}
        },
        itemUtils: {getConfig: (_, key) => config[key], canUse: () => true, getItemByIdentifier: () => undefined},
        tokenUtils: {findNearby: target => { nearby.push(target); return []; }, getDistance: () => 5},
        workflowUtils: {
            getActionType: workflow => workflow.activity.getActionType(),
            bonusDamage: async (workflow, formula, options) => bonus.push({workflow, formula, options}),
            syntheticItemRoll: async (...args) => { rolls.push(args); return {}; },
            completeItemUse: async (...args) => { rolls.push(args); return {castData: {baseLevel: 1, castLevel: 1}}; },
            syntheticItemDataRoll: async (...args) => { rolls.push(args); return {damageRolls: [{}]}; },
            getCastLevel: workflow => workflow.castData.castLevel
        }
    };
    return {actor, token, target, feature, workflow, config, utils, bonus, updates, notices, rolls, nearby};
}

async function load(name, state) {
    const context = vm.createContext({console, CONFIG: {DND5E: {damageTypes: {piercing: {}}}}, game: {combat: {id: 'combat', round: 2, turn: 0}, user: {id: 'gm', targets: new Tokens([state.target])}}});
    const modules = new Map();
    const utilsPath = path.join(root, 'scripts/utils.js');
    async function moduleFor(filename) {
        if (modules.has(filename)) return modules.get(filename);
        let module;
        if (filename === utilsPath) {
            module = new vm.SyntheticModule(Object.keys(state.utils), function() {
                for (let [key, value] of Object.entries(state.utils)) this.setExport(key, value);
            }, {context, identifier: filename});
            modules.set(filename, module);
        } else {
            module = new vm.SourceTextModule(readFileSync(filename, 'utf8'), {context, identifier: filename});
            modules.set(filename, module);
            await module.link(specifier => moduleFor(path.resolve(path.dirname(filename), specifier)));
        }
        return module;
    }
    const module = await moduleFor(path.join(root, subjects[name]));
    await module.evaluate();
    return module.namespace[name.endsWith('Smite') ? 'divineSmite' : 'sneakAttack'];
}

async function fire(name, state) {
    let macro = await load(name, state);
    await macro.midi.actor.find(macro => macro.pass === 'damageRollComplete').macro({trigger: {entity: state.feature}, workflow: state.workflow});
    return macro;
}

test('2024 NPC Sneak Attack without a class use counter adds its configured damage', async () => {
    let state = fixture({modern: true, limited: false});
    await fire('modernSneak', state);
    assert.equal(state.bonus[0]?.formula, '3d6');
});

test('2014 NPC Sneak Attack uses statblock damage instead of inferring zero dice from CR', async () => {
    let state = fixture({limited: false});
    await fire('legacySneak', state);
    assert.equal(state.bonus[0]?.formula, '3d6');
});

test('2024 Sneak Attack does not consume a use when its damage scale is missing', async () => {
    let state = fixture({modern: true, actorType: 'character', formula: ''});
    await fire('modernSneak', state);
    assert.equal(state.feature.system.uses.spent, 0);
    assert.equal(state.bonus.length, 0);
    assert.ok(state.notices.length, 'missing damage must be explained');
});

for (let name of ['legacySmite', 'modernSmite']) {
    test(`${name} refunds the selected slot when the standalone damage workflow aborts`, async () => {
        let state = fixture({modern: name === 'modernSmite', smite: true, limited: false});
        state.utils.workflowUtils.syntheticItemDataRoll = async () => ({aborted: true});
        let macro = await load(name, state);
        await macro.midi.item[0].macro({trigger: {entity: state.feature}, actor: state.actor, token: state.token});
        assert.equal(state.actor.system.spells.spell1.value, 2);
    });

    test(`${name} uses the hit target when an earlier selected target missed`, async () => {
        let state = fixture({modern: name === 'modernSmite', smite: true});
        let missed = {id: 'miss', actor: {creatureType: 'humanoid'}, document: {uuid: 'Scene.test.Token.miss'}};
        state.workflow.targets = new Tokens([missed, state.target]);
        await fire(name, state);
        assert.equal(state.bonus[0]?.formula, '3d8');
        if (name === 'modernSmite') assert.equal(state.actor.system.spells.spell1.value, 1);
    });
}

for (let name of ['legacySneak', 'modernSneak']) {
    test(`${name} does not open concurrent standalone manual prompts`, async () => {
        let state = fixture({modern: name === 'modernSneak', limited: false});
        let confirmations = 0, release;
        state.utils.dialogUtils.confirm = () => ++confirmations === 1 ? new Promise(resolve => { release = resolve; }) : false;
        let macro = await load(name, state);
        let args = {trigger: {entity: state.feature}, actor: state.actor, token: state.token};
        let first = macro.midi.item[0].macro(args);
        try {
            await macro.midi.item[0].macro(args);
            assert.equal(confirmations, 1);
            assert.ok(state.notices.length);
        } finally {
            release(false);
            await first;
        }
    });

    test(`${name} standalone manual use infers statblock damage type and cancels a closed critical prompt`, async () => {
        let state = fixture({modern: name === 'modernSneak', limited: true});
        let confirmations = 0;
        state.utils.dialogUtils.confirm = async () => ++confirmations === 1 ? true : undefined;
        let macro = await load(name, state);
        await macro.midi.item[0].macro({trigger: {entity: state.feature}, actor: state.actor, token: state.token});
        assert.equal(confirmations, 2);
        assert.equal(state.rolls.length, 0);
        assert.equal(state.feature.system.uses.spent, 0);
    });

    test(`${name} accepts CPR's false default for an unset formula`, async () => {
        let state = fixture({modern: name === 'modernSneak', limited: false});
        state.config.formula = false;
        await fire(name, state);
        assert.equal(state.bonus[0]?.formula, '3d6');
    });

    test(`${name} reads D&D 6 numeric advantage mode even when legacy roll booleans are false`, async () => {
        let state = fixture({modern: name === 'modernSneak', limited: false});
        state.workflow.advantage = false;
        state.workflow.attackRoll = {options: {advantage: false, disadvantage: false, advantageMode: 1}};
        await fire(name, state);
        assert.equal(state.bonus[0]?.formula, '3d6');
    });

    test(`${name} checks adjacency around the hit target rather than a selected miss`, async () => {
        let state = fixture({modern: name === 'modernSneak'});
        state.workflow.advantage = false;
        let missed = {id: 'miss', actor: {}, document: {uuid: 'Scene.test.Token.miss'}};
        state.workflow.targets = new Tokens([missed, state.target]);
        state.utils.tokenUtils.findNearby = target => { state.nearby.push(target); return target === state.target ? [{id: 'ally'}] : []; };
        state.config.formula = '3d6';
        await fire(name, state);
        assert.equal(state.bonus[0]?.formula, '3d6');
        assert.equal(state.nearby[0], state.target);
    });
}

test('2024 NPC Sneak Attack with a spent limited resource still stays blocked', async () => {
    let state = fixture({modern: true});
    state.feature.system.uses.value = 0;
    state.feature.system.uses.spent = 1;
    await fire('modernSneak', state);
    assert.equal(state.bonus.length, 0);
});

test('2024 Divine Smite adds damage without waiting for a resource-only utility workflow', async () => {
    let state = fixture({modern: true, smite: true, limited: false});
    state.utils.workflowUtils.completeItemUse = () => { throw new Error('A resource-only utility must not be awaited as a damage workflow'); };
    await fire('modernSmite', state);
    assert.equal(state.bonus[0]?.formula, '3d8');
    assert.equal(state.actor.system.spells.spell1.value, 1);
});

test('2024 Divine Smite consumes its granted free cast when there are no spell slots', async () => {
    let state = fixture({modern: true, smite: true, limited: false});
    let consumed = 0;
    state.actor.system.spells = {};
    state.utils.actorUtils.getCastableSpells = () => [];
    state.utils.dialogUtils.buttonDialog = async () => 'free';
    state.feature.system.linkedActivity = {item: {name: "Paladin's Smite"}, canUse: true, consume: async () => { consumed++; return {}; }};
    await fire('modernSmite', state);
    assert.equal(state.bonus[0]?.formula, '3d8');
    assert.equal(consumed, 1);
});

test('2024 Divine Smite does not add damage if linked resource consumption is cancelled', async () => {
    let state = fixture({modern: true, smite: true, limited: false});
    state.actor.system.spells = {};
    state.utils.dialogUtils.buttonDialog = async () => 'free';
    state.feature.system.linkedActivity = {item: {name: "Paladin's Smite"}, canUse: true, consume: async () => false};
    await assert.rejects(fire('modernSmite', state), /consumption was cancelled/);
    assert.equal(state.bonus.length, 0);
});

test('2024 Divine Smite can spend a spell slot after its granted free cast is exhausted', async () => {
    let state = fixture({modern: true, smite: true, limited: false});
    state.utils.actorUtils.getCastableSpells = () => [];
    state.feature.system.linkedActivity = {canUse: false};
    await fire('modernSmite', state);
    assert.equal(state.bonus[0]?.formula, '3d8');
    assert.equal(state.actor.system.spells.spell1.value, 1);
});

for (let name of Object.keys(subjects)) {
    test(`${name} exposes a manual item-use fallback`, async () => {
        let macro = await load(name, fixture({modern: name.startsWith('modern'), smite: name.endsWith('Smite')}));
        assert.ok(macro.midi.item?.some(entry => entry.pass === 'preTargeting'), 'feature item must support direct use');
    });
}

for (let name of ['legacySmite', 'modernSmite']) {
    test(`${name} manual use rolls only extra damage and consumes one selected spell slot`, async () => {
        let state = fixture({modern: name === 'modernSmite', smite: true, limited: false});
        state.utils.dialogUtils.confirm = async () => true;
        let macro = await load(name, state);
        await macro.midi.item[0].macro({trigger: {entity: state.feature}, actor: state.actor, token: state.token});
        assert.equal(state.actor.system.spells.spell1.value, 1);
        let activity = state.rolls[0]?.[0].system.activities.cprRiderDamage00;
        assert.equal(activity?.damage.parts[0].types[0], 'radiant');
        assert.equal(activity?.damage.parts[0].custom.formula, '6d8');
    });

    test(`${name} cancellation does not consume a spell slot`, async () => {
        let state = fixture({modern: name === 'modernSmite', smite: true, limited: false});
        state.utils.dialogUtils.selectSpellSlot = async () => false;
        let macro = await load(name, state);
        await macro.midi.item[0].macro({trigger: {entity: state.feature}, actor: state.actor, token: state.token});
        assert.equal(state.actor.system.spells.spell1.value, 2);
        assert.equal(state.rolls.length, 0);
    });

    test(`${name} NPC statblock Smite damage does not require class spell slots`, async () => {
        let state = fixture({modern: false, smite: true, limited: false, formula: '4d8'});
        state.feature.system.activities[0].type = 'damage';
        state.actor.system.spells = {};
        await fire(name, state);
        assert.equal(state.bonus[0]?.formula, '4d8');
    });
}

for (let name of ['legacySneak', 'modernSneak']) {
    test(`${name} reads advantage from the completed attack roll`, async () => {
        let state = fixture({modern: name === 'modernSneak', limited: false});
        state.workflow.advantage = false;
        state.workflow.attackRoll = {options: {advantage: true, disadvantage: false}};
        await fire(name, state);
        assert.equal(state.bonus[0]?.formula, '3d6');
    });

    test(`${name} disadvantage still prevents automatic Sneak Attack`, async () => {
        let state = fixture({modern: name === 'modernSneak', limited: false});
        state.workflow.attackRoll = {options: {advantage: false, disadvantage: true}};
        await fire(name, state);
        assert.equal(state.bonus.length, 0);
    });
}

for (let name of ['legacySneak', 'modernSneak']) {
    test(`${name} does not add damage twice when the damage hook repeats`, async () => {
        let state = fixture({modern: name === 'modernSneak', limited: false});
        let macro = await fire(name, state);
        await macro.midi.actor[0].macro({trigger: {entity: state.feature}, workflow: state.workflow});
        assert.equal(state.bonus.length, 1);
    });

    test(`${name} manual fallback rolls extra critical damage after declining the automatic prompt`, async () => {
        let state = fixture({modern: name === 'modernSneak', limited: false});
        state.config.auto = false;
        state.workflow.isCritical = true;
        state.utils.dialogUtils.confirm = async () => false;
        let macro = await fire(name, state);
        state.utils.dialogUtils.confirm = async () => true;
        let result = await macro.midi.item[0].macro({trigger: {entity: state.feature}, actor: state.actor, token: state.token});
        assert.equal(result, true, 'the original feature use is intercepted before consuming resources');
        let activity = state.rolls[0]?.[0].system.activities.cprRiderDamage00;
        assert.equal(activity?.damage.parts[0].custom.formula, '6d6');
        assert.equal(activity.damage.parts[0].types[0], 'piercing');
        assert.equal(state.rolls[0][2][0], state.target);
    });

    test(`${name} manual fallback refuses a hit that already received automatic damage`, async () => {
        let state = fixture({modern: name === 'modernSneak', limited: false});
        let macro = await fire(name, state);
        let result = await macro.midi.item[0].macro({trigger: {entity: state.feature}, actor: state.actor, token: state.token});
        assert.equal(result, true);
        assert.equal(state.rolls.length, 0);
        assert.ok(state.notices.length);
    });
}
