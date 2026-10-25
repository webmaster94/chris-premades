let collections;

export async function registerNativeContent() {
    collections = await import('../native/macros.mjs');
    const animations = await import('../native/macros/animations.mjs');
    for (const [identifier, animation] of Object.entries(animations)) cat.api.registerAnimation({...animation, identifier, source: 'chris-premades-native'});
    for (const collection of [collections.all, collections.generic, collections.legacy, collections.modern]) {
        for (const [identifier, macro] of Object.entries(collection)) {
            const data = {source: 'chris-premades-native', identifier};
            for (const key of [...cat.lib.constants.triggerTypes, 'rules', 'generic', 'genericConfig', 'documents']) {
                if (macro[key] !== undefined) data[key] = macro[key];
            }
            cat.api.registerFnMacro(data);
            for (const scale of macro.scales ?? []) {
                if (scale.data) cat.api.registerScale({source: 'chris-premades-native', rules: macro.rules ?? 'all', identifier: scale.identifier, classIdentifier: scale.classIdentifier, data: scale.data});
            }
        }
    }
}

export function nativeDescriptor(document) {
    if (!collections || document.flags?.['chris-premades']?.info) return;
    if (!document.flags?.cat?.automation) return;
    const identifier = document.system?.identifier;
    const rules = document.system?.source?.rules;
    const group = rules === '2024' ? collections.modern : rules === '2014' ? collections.legacy : collections.all;
    const sourceType = cat.utils.itemUtils.getAdvancementSourceKey(document);
    const macro = group[identifier] ?? group[identifier + '|' + sourceType] ?? collections.all[identifier] ?? collections.all[identifier + '|' + sourceType];
    return {
        version: macro?.version ?? document.flags.cat.automation.version ?? '0',
        config: macro?.config ?? {}, notes: macro?.notes ?? '',
        ...(macro?.monsterIdentifier ? {monsterIdentifier: macro.monsterIdentifier} : {}),
        ...(macro?.scales ? {scales: macro.scales.map(scale => ({source: 'chris-premades-native', rules: macro.rules ?? 'all', identifier: scale.identifier, classIdentifier: scale.classIdentifier}))} : {})
    };
}
