/* eslint-env node */
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));
function exportsFrom(file) {
    const result = new Set();
    for (const block of readFileSync(file, 'utf8').matchAll(/export\s*\{([^}]+)\}\s*from/g)) {
        for (const name of block[1].split(',')) result.add(name.trim().split(/\s+as\s+/).at(-1).replace(/^['"]|['"]$/g, ''));
    }
    return result;
}
const exports = {modern: exportsFrom(path.join(root, 'scripts/macros.js')), legacy: exportsFrom(path.join(root, 'scripts/legacyMacros.js'))};
function walk(value, callback) {
    if (Array.isArray(value)) { for (const name of value) if (typeof name === 'string') callback(name); }
    else if (value && typeof value === 'object') for (const child of Object.values(value)) walk(child, callback);
}
test('every shipped CPR item automation binding has a public macro export for its ruleset', () => {
    const missing = [];
    for (const pack of readdirSync(path.join(root, 'packData'), {withFileTypes: true}).filter(entry => entry.isDirectory())) {
        for (const filename of readdirSync(path.join(root, 'packData', pack.name)).filter(name => name.endsWith('.json'))) {
            const document = JSON.parse(readFileSync(path.join(root, 'packData', pack.name, filename), 'utf8'));
            if (!document.type || document.items) continue;
            const rules = document.system?.source?.rules === '2024' ? 'modern' : 'legacy';
            walk(document.flags?.['chris-premades']?.macros, name => {
                if (!exports[rules].has(name)) missing.push(`${document.name}: ${name} (${rules})`);
            });
        }
    }
    assert.deepEqual(missing, []);
});

test('native CAT item, effect and activity bindings resolve without sharing legacy helper names', () => {
    const native = Object.fromEntries(['all', 'generic', 'legacy', 'modern'].map(group => [group, exportsFrom(path.join(root, 'scripts/native/macros', group + '.mjs'))]));
    const missing = [];
    function visit(value, filename) {
        if (!value || typeof value !== 'object') return;
        for (const entries of Object.values(value.flags?.cat?.macros ?? {})) {
            for (const binding of entries) {
                if (binding.source === 'cat') continue;
                assert.equal(binding.source, 'chris-premades-native', filename);
                const group = binding.rules === '2024' ? 'modern' : binding.rules === '2014' ? 'legacy' : 'all';
                if (![group, 'all', 'generic'].some(key => native[key].has(binding.identifier))) missing.push(filename + ': ' + binding.identifier);
            }
        }
        for (const child of Object.values(value)) if (child && typeof child === 'object') visit(child, filename);
    }
    for (const folder of readdirSync(path.join(root, 'packData')).filter(name => name.startsWith('cpr-cat-'))) {
        for (const file of readdirSync(path.join(root, 'packData', folder)).filter(name => name.endsWith('.json'))) visit(JSON.parse(readFileSync(path.join(root, 'packData', folder, file), 'utf8')), folder + '/' + file);
    }
    assert.deepEqual(missing, []);
});

test('native content references point to shipped documents', () => {
    const manifest = JSON.parse(readFileSync(path.join(root, 'module-template.json'), 'utf8'));
    const packs = new Map(manifest.packs.map(pack => {
        const folder = path.join(root, 'packData', pack.path.split('/').at(-1));
        return [pack.name, new Set(readdirSync(folder).filter(name => name.endsWith('.json')).map(name => JSON.parse(readFileSync(path.join(folder, name), 'utf8'))._id))];
    }));
    const missing = [];
    for (const folder of readdirSync(path.join(root, 'packData')).filter(name => name.startsWith('cpr-cat-'))) {
        for (const file of readdirSync(path.join(root, 'packData', folder)).filter(name => name.endsWith('.json'))) {
            const text = readFileSync(path.join(root, 'packData', folder, file), 'utf8');
            for (const [, pack, id] of text.matchAll(/Compendium\.chris-premades\.([\w-]+)\.(?:Actor|Item)\.([\w]+)/g)) if (!packs.get(pack)?.has(id)) missing.push(file + ': ' + pack + '.' + id);
        }
    }
    assert.deepEqual(missing, []);
});
