import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';

test('target damage hooks accept an undrawn TokenDocument without reading its compatibility getter', async () => {
    const calls = [];
    const actor = {items: [{name: {slugify: () => 'protection'}, system: {level: 0}, flags: {'chris-premades': {macros: {midi: {actor: ['protection']}}}}, effects: []}]};
    const document = {documentName: 'Token', uuid: 'Scene.s.Token.target', name: 'Target', actor, object: null, regions: [], parent: {tokens: []}};
    Object.defineProperty(document, 'document', {get() {throw new Error('TokenDocument.document is a deprecated compatibility getter');}});
    const source = readFileSync(new URL('../scripts/events/midi.js', import.meta.url), 'utf8');
    const context = vm.createContext({console});
    vm.runInContext('Set.prototype.map = function(fn) { return [...this].map(fn); };', context);
    const macro = async data => calls.push(data);
    const values = {
        custom: {getMacro: () => ({midi: {actor: [{pass: 'targetApplyDamage', macro, priority: 50}]}})},
        genericUtils: {getRules: () => 'legacy', log() {}},
        actorUtils: {getEffects: () => []},
        macroUtils: {getEmbeddedMacros: () => []},
        itemUtils: {getSaveDC: () => 0},
        templateUtils: {getTemplatesInToken: () => []}
    };
    const subject = new vm.SourceTextModule(source, {context});
    await subject.link(specifier => {
        const match = [...source.matchAll(/import\s*\{([^}]+)\}\s*from\s*'([^']+)'/g)].find(match => match[2] === specifier);
        const names = match[1].split(',').map(name => name.trim());
        return new vm.SyntheticModule(names, function() {for(const name of names) this.setExport(name, values[name] ?? {});}, {context});
    });
    await subject.evaluate();
    const workflow = {};
    const damage = {newHP: 0};
    await subject.namespace.midiEvents.preTargetDamageApplication(document, {workflow, ditem: damage});
    assert.equal(calls.length, 1);
    assert.equal(calls[0].trigger.token, document);
    assert.equal(calls[0].ditem, damage);
});

test('Death Strike uses all returned save targets when no canvas token is drawn', async () => {
    const source = readFileSync(new URL('../scripts/macros/2024/classFeatures/rogue/assassin/deathStrike.js', import.meta.url), 'utf8');
    let doubled = false;
    const context = vm.createContext({});
    const subject = new vm.SourceTextModule(source, {context});
    await subject.link(() => new vm.SyntheticModule(['itemUtils', 'rollUtils', 'workflowUtils'], function() {
        this.setExport('itemUtils', {getConfig: () => 2});
        this.setExport('rollUtils', {damageRoll: async formula => {doubled = formula === '(1d6) * 2'; return {formula};}});
        this.setExport('workflowUtils', {syntheticItemRoll: async () => ({failedSaves: {count: 1, size: 0, tokens: []}})});
    }, {context}));
    await subject.evaluate();
    const workflow = {'chris-premades': {deathStrike: true}, targets: {tokens: [{}]}, damageRolls: [{formula: '1d6'}], activity: {}};
    await subject.namespace.deathStrike.midi.actor[0].macro({trigger: {entity: {}}, workflow});
    assert.equal(doubled, true);
});

test('removing a drawn target retains off-canvas documents and remote rolls request GM fallback', async () => {
    const source = readFileSync(new URL('../scripts/lib/utilities/workflowUtils.js', import.meta.url), 'utf8');
    let updated, requested;
    class TokenDocumentSet {
        constructor(members) {this.documents = members.documents ?? Array.from(members);}
        difference(other) {return new TokenDocumentSet(this.documents.filter(document => !other.documents.includes(document)));}
    }
    const context = vm.createContext({game: {userId: 'player'}, MidiQOL: {
        TokenDocumentSet, completeActivityUse: async (_activity, config) => {requested = config; return null;}
    }});
    const subject = new vm.SourceTextModule(source, {context});
    await subject.link(specifier => {
        const names = [...source.matchAll(/import\s*\{([^}]+)\}\s*from\s*'([^']+)'/g)].find(match => match[2] === specifier)[1].split(',').map(name => name.trim());
        const values = {genericUtils: {updateTargets: async documents => {updated = documents;}}, socketUtils: {hasPermission: () => false, firstOwner: () => 'gm'}};
        return new vm.SyntheticModule(names, function() {for(const name of names) this.setExport(name, values[name] ?? {});}, {context});
    });
    await subject.evaluate();
    const drawn = {uuid: 'drawn'}, undrawn = {uuid: 'undrawn'};
    const workflow = {targets: new TokenDocumentSet([drawn, undrawn])};
    await subject.namespace.workflowUtils.removeTargets(workflow, [drawn]);
    assert.deepEqual(updated, [undrawn]);
    assert.equal(await subject.namespace.workflowUtils.completeActivityUse({actor: {}}), null);
    assert.equal(requested.midiOptions.checkGMstatus, true);
});
