const SOURCE = 'chris-premades';

// Keep this module free of Foundry globals so saved data can be tested before migration.
export function buildCatMigration(document, {source = SOURCE, version, identifier} = {}) {
    const legacy = document.flags?.[SOURCE];
    const current = document.flags?.cat ?? {};
    const updates = {};
    if (!legacy || (current.automation?.source && current.automation.source !== source)) return updates;
    for (const [key, value] of Object.entries(legacy.config ?? {})) {
        if (key === 'generic' || Object.hasOwn(current.config ?? {}, key)) continue;
        updates['flags.cat.config.' + key] = structuredClone(value);
    }
    for (const [key, value] of Object.entries(legacy.config?.generic ?? {})) {
        if (Object.hasOwn(current.genericConfig?.[SOURCE] ?? {}, key)) continue;
        updates['flags.cat.genericConfig.' + SOURCE + '.' + key] = structuredClone(value);
    }
    if (!current.automation?.source && legacy.info?.source === source) {
        updates['flags.cat.automation.source'] = source;
        updates['flags.cat.automation.version'] = version ?? legacy.info.version ?? '0';
    }
    if (identifier && !document.system?.identifier) updates['system.identifier'] = identifier;
    if (Object.keys(updates).length && !legacy.catMigration) {
        updates['flags.chris-premades.catMigration'] = {version: 1, config: structuredClone(legacy.config ?? {})};
    }
    return updates;
}

export function legacySetupBinding(flags) {
    if (!flags?.['chris-premades']?.macros?.item?.length) return;
    if (flags.cat?.automation?.source && flags.cat.automation.source !== 'chris-premades') return;
    const bindings = flags.cat?.macros?.item ?? [];
    if (bindings.some(binding => binding.source === 'chris-premades' && binding.identifier === 'legacy-item-setup')) return;
    return [...bindings, {source: 'chris-premades', identifier: 'legacy-item-setup', rules: 'all'}];
}

export function getMigrationDocuments({items = [], actors = [], scenes = []} = {}) {
    const documents = new Map();
    const add = document => {
        if (!document?.uuid || documents.has(document.uuid)) return;
        documents.set(document.uuid, document);
        for (const child of document.items ?? []) add(child);
        for (const child of document.effects ?? []) add(child);
        for (const child of document.system?.activities ?? []) add(child);
    };
    for (const item of items) add(item);
    for (const actor of actors) add(actor);
    for (const scene of scenes) {
        for (const token of scene.tokens ?? []) if (!token.actorLink) add(token.actor);
    }
    return Array.from(documents.values());
}

export function toCatConfig(config = []) {
    const result = {};
    for (const {value: key, ...descriptor} of config) {
        // Legacy lists occasionally repeat a key. The first definition supplied its default.
        if (descriptor.category === 'animation') descriptor.category = 'animations';
        if (key && !Object.hasOwn(result, key)) result[key] = descriptor;
    }
    return result;
}

// Core 14.369's index projection cannot request a parent and its child together.
// Keeping the parent supplies the complete object, including the requested child.
export function indexFieldsWithoutOverlaps(fields, defaults = []) {
    const all = [...new Set([...defaults, ...fields])];
    return fields.filter(field => !all.some(parent => parent !== field && field.startsWith(parent + '.')));
}
