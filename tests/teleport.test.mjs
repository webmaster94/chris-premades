/* eslint-env node */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';

async function fixture(result) {
    const state = {moves: [], restored: 0, notices: [], result};
    const token = {id: 'caster', x: 0, y: 0, w: 100, h: 100, document: {width: 1, texture: {src: 'token.webp'}}, actor: {sheet: {rendered: true, minimize: () => {}, maximize: () => state.restored++}}};
    const utils = {
        animationUtils: {teleportEffects: {none: {pre: async () => {}, post: async () => {}}}},
        effectUtils: {getEffectByStatusID: () => undefined},
        genericUtils: {
            setProperty: (o, k, v) => o[k] = v,
            collapseObjects: (...values) => Object.assign({}, ...values),
            updateEmbeddedDocuments: async (_, __, updates) => state.moves.push(...updates),
            notify: (...args) => state.notices.push(args),
            format: (_, values) => JSON.stringify(values), translate: key => key
        },
        crosshairUtils: {aimCrosshair: async () => {if (state.error) throw state.error; return state.result;}}
    };
    const context = vm.createContext({canvas: {scene: {}, grid: {distance: 5}}, globalThis: {}, ui: {notifications: {info: () => 1, remove: () => {}}}});
    const source = new vm.SourceTextModule(readFileSync(new URL('../scripts/lib/teleport.js', import.meta.url), 'utf8'), {context});
    await source.link(specifier => {
        const exports = specifier.endsWith('teleportPrompt.js') ? {teleportPrompt: () => ({close: () => {}})} : specifier.endsWith('crosshairs.js') ? {Crosshairs: {defaultCrosshairsConfig: () => ({})}} : specifier.endsWith('crosshairUtils.js') ? {crosshairUtils: utils.crosshairUtils} : utils;
        return new vm.SyntheticModule(Object.keys(exports), function() {for (const [key, value] of Object.entries(exports)) this.setExport(key, value);}, {context});
    });
    await source.evaluate();
    return {state, token, Teleport: source.namespace.Teleport};
}

test('an out-of-range teleport selection never moves a token', async () => {
    const {state, token, Teleport} = await fixture({cancelled: false, valid: false, x: 400, y: 100, direction: 0});
    await Teleport.target(token, token, {range: 10, animation: 'none'});
    assert.equal(state.moves.length, 0);
    assert.equal(state.restored, 1);
});

test('closing the picker restores the sheet and does not move a token', async () => {
    const {state, token, Teleport} = await fixture({cancelled: true});
    await Teleport.target(token, token, {range: 30, animation: 'none'});
    assert.equal(state.moves.length, 0);
    assert.equal(state.restored, 1);
});

test('an empty picker result does not move a token', async () => {
    const {state, token, Teleport} = await fixture(null);
    await Teleport.target(token, token, {range: 30, animation: 'none'});
    assert.equal(state.moves.length, 0);
    assert.equal(state.restored, 1);
});

test('teleport uses destination centre with the moved token dimensions', async () => {
    const {state, token, Teleport} = await fixture({cancelled: false, valid: true, x: 300, y: 200, direction: 0});
    const large = {...token, id: 'target', w: 200, h: 200, document: {...token.document, width: 2}};
    await Teleport.target(large, token, {range: 30, animation: 'none'});
    assert.equal(state.moves[0].x, 200);
    assert.equal(state.moves[0].y, 100);
});

test('picker errors still restore the minimized actor sheet', async () => {
    const {state, token, Teleport} = await fixture({});
    state.error = new Error('picker failed');
    await assert.rejects(Teleport.target(token, token, {range: 30, animation: 'none'}), /picker failed/);
    assert.equal(state.restored, 1);
});
