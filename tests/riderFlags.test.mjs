import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';

const module = new vm.SourceTextModule(readFileSync(new URL('../scripts/lib/riderFlags.js', import.meta.url), 'utf8'));
await module.link(() => {});
await module.evaluate();
const {mergeRiderFlags} = module.namespace;
const item = {flags: {'chris-premades': {hiddenActivities: ['hidden']}, dnd5e: {riders: {activity: ['old-system', 'hidden-id'], effect: ['effect']}}}};
const activity = name => ({id: name + '-id'});

test('effect-only riders accept D&D deletion sentinels while retaining CPR hidden activities', () => {
    const updates = {flags: {dnd5e: {riders: {activity: Symbol('delete'), effect: ['new-effect']}}}};
    mergeRiderFlags(item, updates, activity);
    assert.deepEqual(updates.flags.dnd5e.riders, {activity: ['hidden-id'], effect: ['new-effect']});
});
test('new system activity riders coexist with hidden activities and exclude removed riders', () => {
    const updates = {flags: {dnd5e: {riders: {activity: ['new-system']}}}};
    mergeRiderFlags(item, updates, activity);
    assert.deepEqual(updates.flags.dnd5e.riders.activity, ['new-system', 'hidden-id']);
});
test('clearing hidden activities preserves system riders on an unrelated item update', () => {
    const updates = {flags: {'chris-premades': {hiddenActivities: []}}};
    mergeRiderFlags(item, updates, activity);
    assert.deepEqual(updates.flags.dnd5e.riders.activity, ['old-system']);
});
test('parent rider deletion is safe and does not resurrect old system riders', () => {
    const updates = {flags: {dnd5e: {riders: Symbol('delete')}}};
    mergeRiderFlags(item, updates, activity);
    assert.deepEqual(updates.flags.dnd5e.riders.activity, ['hidden-id']);
    const empty = {flags: {'chris-premades': {hiddenActivities: []}, dnd5e: {riders: Symbol('delete')}}};
    mergeRiderFlags(item, empty, activity);
    assert.equal(typeof empty.flags.dnd5e.riders, 'symbol');
});
