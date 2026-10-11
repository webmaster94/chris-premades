import {custom} from '../events/custom.js';
import {buildCatMigration, getMigrationDocuments, toCatConfig, indexFieldsWithoutOverlaps} from './catMigration.js';

const SOURCE = 'chris-premades';
const metadata = new Map();
let migrationPromise;

function descriptor(document) {
    const info = document.flags?.[SOURCE]?.info;
    const rules = document.system?.source?.rules === '2024' ? 'modern' : 'legacy';
    const macro = info?.identifier ? custom.getMacro(info.identifier, rules) : undefined;
    return {version: macro?.version ?? info?.version ?? '0', config: toCatConfig(macro?.config), notes: macro?.notes ?? ''};
}

export async function migrateDocument(document) {
    if (!document || document.pack && document.compendium?.locked) return false;
    const updates = buildCatMigration(document);
    if (!Object.keys(updates).length) return false;
    await document.update(updates, {cprCatMigration: true});
    return true;
}

export async function migrate({compendiums = true} = {}) {
    if (!game.user.isGM || game.users.activeGM?.id !== game.user.id) return {skipped: true};
    if (migrationPromise) return migrationPromise;
    migrationPromise = (async () => {
        const report = {updated: 0, failed: [], lockedPacks: []};
        const visit = async documents => {
            for (const document of documents) {
                try {
                    if (await migrateDocument(document)) report.updated++;
                } catch (error) {
                    report.failed.push(document.uuid);
                    console.error('CPR CAT migration failed for ' + document.uuid, error);
                }
            }
        };
        await visit(getMigrationDocuments(game));
        if (compendiums) {
            for (const pack of game.packs) {
                if (pack.metadata.packageType !== 'world' || !['Actor', 'Item'].includes(pack.documentName)) continue;
                if (pack.locked) { report.lockedPacks.push(pack.collection); continue; }
                try {
                    const documents = await pack.getDocuments();
                    await visit(getMigrationDocuments({[pack.documentName === 'Item' ? 'items' : 'actors']: documents}));
                } catch (error) {
                    report.failed.push(pack.collection);
                    console.error('CPR CAT compendium migration failed for ' + pack.collection, error);
                }
            }
        }
        if (!report.failed.length) await game.settings.set(SOURCE, 'catMigrationVersion', 1);
        console.info('CPR CAT migration', report);
        return report;
    })();
    try { return await migrationPromise; } finally { migrationPromise = undefined; }
}

// CAT owns configuration; the existing CPR functions retain their event bindings.
// Do not register those bindings in CAT too: that would execute each automation twice.
export async function ready() {
    if (!globalThis.cat?.api) throw new Error('CPR requires Coven\'s Automation Toolkit 0.1.1 or newer.');
    if (game.users.activeGM?.id === game.user.id) {
        const queueKey = Symbol.for('cpr.gps.catSourceSettings');
        const task = (globalThis[queueKey] ?? Promise.resolve()).then(async () => {
            const sources = game.settings.get('cat', 'automationSources');
            if (!Object.hasOwn(sources, SOURCE)) await game.settings.set('cat', 'automationSources', {...sources, [SOURCE]: {enabled: true, priority: 5, pack: false}});
        });
        globalThis[queueKey] = task.catch(() => {});
        await task;
    }
    const ignoredPackIds = [];
    for (const pack of game.packs) {
        if (pack.metadata.packageName !== SOURCE || pack.documentName !== 'Item') continue;
        if (pack.collection.endsWith('.CPREmbeddedMacroSampleItems') || pack.collection.endsWith('.CPRMiscellaneous')) {
            ignoredPackIds.push(pack.collection);
            continue;
        }
        const index = await pack.getIndex({fields: ['system.identifier', 'system.source', 'flags.chris-premades', 'type']});
        for (const entry of index) metadata.set(entry.uuid, descriptor(entry));
    }
    cat.api.registerSourceName(SOURCE, game.modules.get(SOURCE).title);
    await cat.api.registerAutomationModule(SOURCE, {ignoredPackIds, infoFetcherCallback: (document) => metadata.get(document.uuid) ?? descriptor(document)});
    for (const [identifier, macro] of Object.entries(globalThis.chrisPremades.legacyMacros)) {
        if (!macro.isGenericFeature) continue;
        const registered = cat.api.registerFnMacro({source: SOURCE, identifier, rules: 'all', generic: true, genericConfig: toCatConfig(macro.config), documents: ['Item']});
        if (registered) registered.label = macro.name;
    }
    const report = await migrate({compendiums: game.settings.get(SOURCE, 'catMigrationVersion') < 1});
    Hooks.callAll('cprCatReady', report);
    return report;
}

export function init() {
    const indexGuard = Symbol.for('cpr.gps.catIndexGuard');
    if (!globalThis[indexGuard]) {
        libWrapper.register(SOURCE, 'foundry.documents.collections.CompendiumCollection.prototype.getIndex', function(wrapped, options = {}) {
            return wrapped({...options, fields: indexFieldsWithoutOverlaps(options.fields ?? [], Array.from(this.indexFields))});
        }, 'WRAPPER');
        globalThis[indexGuard] = true;
    }
    game.settings.register(SOURCE, 'catMigrationVersion', {scope: 'world', config: false, type: Number, default: 0});
    // Imported items acquire CAT metadata without waiting for the next startup.
    Hooks.on('preCreateItem', document => document.updateSource(buildCatMigration(document)));
    Hooks.on('preUpdateItem', syncConfig);
    Hooks.on('preUpdateActiveEffect', syncConfig);
    Hooks.once('catReady', () => ready().catch(error => console.error('CPR CAT integration failed', error)));
}

export function syncConfig(document, changes, options = {}) {
    if (options.cprCatMigration) return;
    const expanded = foundry.utils.expandObject(changes);
    const config = expanded.flags?.cat?.config;
    if (config && document.flags[SOURCE]) {
        for (const [key, value] of Object.entries(config)) changes['flags.chris-premades.config.' + key] = value;
    }
    const generics = expanded.flags?.cat?.genericConfig?.[SOURCE];
    if (!generics) return;
    const macros = foundry.utils.deepClone(document.flags[SOURCE]?.macros ?? {});
    const oldGenerics = document.flags.cat?.genericConfig?.[SOURCE] ?? document.flags[SOURCE]?.config?.generic ?? {};
    const selected = Object.keys(generics).filter(key => !key.startsWith('-='));
    for (const identifier of new Set([...Object.keys(oldGenerics), ...selected])) {
        const macro = custom.getMacro(identifier, 'legacy');
        if (!macro?.isGenericFeature) continue;
        const applied = selected.includes(identifier);
        for (const [group, definitions] of Object.entries(macro)) {
            const groups = Array.isArray(definitions) ? {[group]: definitions} : definitions;
            if (!groups || typeof groups !== 'object') continue;
            for (const [event, entries] of Object.entries(groups)) {
                if (!Array.isArray(entries) || !entries.some(entry => typeof entry.macro === 'function')) continue;
                const path = Array.isArray(definitions) ? group : group + '.' + event;
                const list = (foundry.utils.getProperty(macros, path) ?? []).filter(key => key !== identifier);
                if (applied) list.push(identifier);
                foundry.utils.setProperty(macros, path, list);
            }
        }
        changes['flags.chris-premades.config.generic.' + (applied ? identifier : '-=' + identifier)] = applied ? {...generics[identifier], applied: true} : null;
    }
    changes['flags.chris-premades.macros'] = macros;
}

export const catIntegration = {init, ready, migrate, migrateDocument};
