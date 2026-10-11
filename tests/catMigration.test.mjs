/* eslint-env node */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';

const module = new vm.SourceTextModule(readFileSync(new URL('../scripts/integrations/catMigration.js', import.meta.url), 'utf8'), {context: vm.createContext({structuredClone})});
await module.link(() => {throw new Error('Migration must not import Foundry');});
await module.evaluate();
const {buildCatMigration, getMigrationDocuments, toCatConfig, indexFieldsWithoutOverlaps} = module.namespace;

test('migration preserves false, zero, empty strings, arrays and nested item settings', () => {
    const config = {playAnimation: false, range: 0, formula: '', targets: ['ally'], summons: {count: 2}};
    const item = {flags: {'chris-premades': {info: {source: 'chris-premades', version: '1.2.28'}, config}}};
    const before = structuredClone(item);
    const updates = buildCatMigration(item);
    for (const [key, value] of Object.entries(config)) assert.deepEqual(updates['flags.cat.config.' + key], value);
    assert.equal(updates['flags.cat.automation.source'], 'chris-premades');
    assert.deepEqual(updates['flags.chris-premades.catMigration'].config, config);
    assert.deepEqual(item, before, 'building a migration must not mutate saved data');
    updates['flags.cat.config.summons'].count = 10;
    assert.equal(item.flags['chris-premades'].config.summons.count, 2);
});

test('existing CAT choices win over legacy choices, including explicit false and null', () => {
    const item = {flags: {cat: {config: {playAnimation: false, color: null}}, 'chris-premades': {config: {playAnimation: true, color: 'blue', formula: '2d6'}}}};
    const updates = buildCatMigration(item);
    assert.equal(Object.hasOwn(updates, 'flags.cat.config.playAnimation'), false);
    assert.equal(Object.hasOwn(updates, 'flags.cat.config.color'), false);
    assert.equal(updates['flags.cat.config.formula'], '2d6');
});

test('migration does not transplant settings onto an automation from another CAT source', () => {
    const item = {flags: {cat: {automation: {source: 'other'}}, 'chris-premades': {config: {formula: '2d6'}}}};
    assert.equal(Object.keys(buildCatMigration(item)).length, 0);
});

test('generic settings are namespaced and existing CAT generic choices are retained', () => {
    const item = {flags: {cat: {genericConfig: {'chris-premades': {autoPush: {distance: 10}}}}, 'chris-premades': {config: {generic: {autoPush: {distance: 5}, autoGrapple: {applied: true, dc: 15}}}}}};
    const updates = buildCatMigration(item);
    assert.equal(Object.hasOwn(updates, 'flags.cat.genericConfig.chris-premades.autoPush'), false);
    assert.equal(updates['flags.cat.genericConfig.chris-premades.autoGrapple'].dc, 15);
    assert.equal(Object.hasOwn(updates, 'flags.cat.config.generic'), false);
});

test('rerunning a completed migration produces no changes', () => {
    const item = {flags: {cat: {automation: {source: 'chris-premades', version: '1'}, config: {auto: false}}, 'chris-premades': {info: {source: 'chris-premades'}, config: {auto: true}, catMigration: {version: 1}}}};
    assert.equal(Object.keys(buildCatMigration(item)).length, 0);
});

test('world traversal includes off-scene unlinked NPC items and deduplicates linked actor documents', () => {
    const item = {uuid: 'Actor.base.Item.rider'};
    const actor = {uuid: 'Actor.base', items: [item]};
    const syntheticItem = {uuid: 'Scene.other.Token.npc.Actor.base.Item.rider', effects: [{uuid: 'Scene.other.Token.npc.Actor.base.Item.rider.ActiveEffect.mark'}], system: {activities: [{uuid: 'Scene.other.Token.npc.Actor.base.Item.rider.Activity.cast'}]}};
    const synthetic = {uuid: 'Scene.other.Token.npc.Actor.base', items: [syntheticItem]};
    const docs = getMigrationDocuments({items: [item], actors: [actor], scenes: [{tokens: [{actorLink: true, actor}, {actorLink: false, actor: synthetic}]}]});
    assert.equal(docs.filter(d => d.uuid === item.uuid).length, 1);
    assert.ok(docs.includes(syntheticItem));
    assert.equal(docs.length, 6);
});

test('CAT config descriptors preserve first defaults when a legacy key is repeated', () => {
    const config = toCatConfig([{value: 'range', type: 'number', default: 30}, {value: 'range', type: 'number', default: 5}]);
    assert.equal(config.range.default, 30);
});

test('compendium indexing avoids a core parent/child projection crash without losing source data', () => {
    const fields = indexFieldsWithoutOverlaps(['system.source.rules', 'system.source.custom', 'flags.chris-premades.info', 'flags.chris-premades'], ['system.source']);
    assert.deepEqual(Array.from(fields), ['flags.chris-premades']);
});
