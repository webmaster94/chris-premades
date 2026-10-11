/* eslint-env node */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

test('native Midi-QOL 14.6 workflow events reach CPR once with the workflow payload', async () => {
    let callbacks = new Map(), calls = [];
    let stub = new Proxy(() => {}, {get: () => stub});
    let midiEvents = new Proxy({}, {get: (_, name) => workflow => calls.push({name, workflow})});
    let source = readFileSync(fileURLToPath(new URL('../scripts/hooks.js', import.meta.url)), 'utf8');
    let imports = new Map();
    for (let match of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*'([^']+)'/g)) {
        imports.set(match[2], Object.fromEntries(match[1].split(',').map(name => {
            name = name.trim();
            return [name, name === 'midiEvents' ? midiEvents : name === 'genericUtils' ? {getCPRSetting: () => false} : stub];
        })));
    }
    let context = vm.createContext({
        Hooks: {once: () => {}, on: (name, fn) => {
            let listeners = callbacks.get(name) ?? [];
            listeners.push(fn);
            callbacks.set(name, listeners);
        }},
        game: {system: {id: 'dnd5e'}, user: {isGM: false}},
        foundry: stub
    });
    let subject = new vm.SourceTextModule(source, {context});
    await subject.link(specifier => {
        let exports = imports.get(specifier);
        return new vm.SyntheticModule(Object.keys(exports), function() {
            for (let [name, value] of Object.entries(exports)) this.setExport(name, value);
        }, {context});
    });
    await subject.evaluate();
    subject.namespace.registerHooks();
    let workflow = {id: 'ChatMessage.test'};
    for (let [event, payload, handler] of [
        ['midi-qol.DamageRollComplete', workflow, 'damageRollComplete'],
        ['midi-qol.RollComplete', workflow, 'rollFinished'],
        ['midi-qol.premades.preItemRollV2', {workflow}, 'preItemRoll']
    ]) {
        let before = calls.length;
        for (let callback of callbacks.get(event) ?? []) await callback(payload);
        assert.equal(calls.length, before + 1, `${event} must dispatch exactly once`);
        assert.equal(calls.at(-1).name, handler);
        assert.equal(calls.at(-1).workflow, workflow);
    }
});
