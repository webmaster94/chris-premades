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
        for (const name of block[1].split(',')) result.add(name.trim().split(/\s+as\s+/).at(-1));
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
