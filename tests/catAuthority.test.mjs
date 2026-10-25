/* eslint-env node */
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
async function fixture() {
    const updates = [];
    const cat = {utils: {
        automationUtils: {getAutomationStatus: () => 2, isUpToDate: () => true, updateItem: async (item, options) => updates.push({item, options})},
        documentUtils: {getVersion: item => item.flags.cat.automation.version, getSource: item => item.flags.cat.automation.source}
    }};
    const context = vm.createContext({cat});
    const stub = {
        genericUtils: {getIdentifier: () => 'testFeature', getRules: () => 'modern', isNewerVersion: () => true},
        custom: {getMacro: () => ({version: '9.0.0'})},
        ItemMedkit: {itemUpdate: () => {throw new Error('Legacy updater used');}}
    };
    const cache = new Map();
    async function load(file) {
        if (cache.has(file)) return cache.get(file);
        const source = readFileSync(file, 'utf8');
        const module = new vm.SourceTextModule(source, {context, identifier: file});
        cache.set(file, module);
        await module.link(async specifier => {
            const target = path.resolve(path.dirname(file), specifier);
            if (target.endsWith(path.join('integrations', 'catAuthority.js'))) return await load(target);
            const match = Array.from(source.matchAll(/import\s*\{([^}]+)\}\s*from\s*'([^']+)'/g)).find(match => match[2] === specifier);
            const names = match[1].split(',').map(name => name.trim());
            return new vm.SyntheticModule(names, function() {for (const name of names) this.setExport(name, stub[name] ?? {});}, {context});
        });
        return module;
    }
    const module = await load(path.join(root, 'scripts/lib/utilities/itemUtils.js'));
    await module.evaluate();
    const item = {type: 'feat', actor: {type: 'character'}, flags: {cat: {automation: {source: 'chris-premades', version: '3.0.0'}}, 'chris-premades': {info: {source: 'chris-premades', version: '1.0.0', rules: 'legacy'}}}};
    return {utils: module.namespace.itemUtils, item, updates};
}

test('CAT status wins over stale legacy rules and a newer local macro version', async () => {
    const {utils, item} = await fixture();
    assert.equal(await utils.isUpToDate(item), 2);
    assert.equal(utils.getVersion(item), '3.0.0');
});

test('the legacy item update API delegates once to CAT', async () => {
    const {utils, item, updates} = await fixture();
    await utils.itemUpdate(item);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].item, item);
});

test('CPR does not ship its own Medkit applications or templates', () => {
    for (const name of ['item', 'actor', 'effect', 'activity']) assert.equal(existsSync(path.join(root, `scripts/applications/medkit-${name}.js`)), false);
});
