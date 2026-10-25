import {monster} from '../extensions/monster.js';
import * as legacyMacros from '../legacyMacros.js';
import * as macros from '../macros.js';
import {genericUtils} from '../utils.js';
async function ready() {
    let config = {
        removeChoices: [],
        renamedItems: {},
        additionalItems: {},
        removedItems: {},
        restrictedItems: {},
        correctedItems: {}
    };
    Object.values(legacyMacros).forEach(i => {
        let ddbi = i.ddbi;
        if (!ddbi) return;
        if (ddbi.removeChoices) config.removeChoices.push(...ddbi.removeChoices);
        if (ddbi.renamedItems) Object.entries(ddbi.renamedItems).forEach(j => config.renamedItems[j[0]] = j[1]);
        if (ddbi.additionalItems) Object.entries(ddbi.additionalItems).forEach(k => config.additionalItems[k[0]] = k[1]);
        if (ddbi.removedItems) Object.entries(ddbi.removedItems).forEach(l => config.removedItems[l[0]] = l[1]);
        if (ddbi.restrictedItems) Object.entries(ddbi.restrictedItems).forEach(m => config.restrictedItems[m[0]] = m[1]);
        if (ddbi.correctedItems) Object.entries(ddbi.correctedItems).forEach(n => config.correctedItems[n[0]] = n[1]);
    });
    Object.values(macros).forEach(i => {
        let ddbi = i.ddbi;
        if (!ddbi) return;
        if (ddbi.removeChoices) config.removeChoices.push(...ddbi.removeChoices);
        if (ddbi.renamedItems) Object.entries(ddbi.renamedItems).forEach(j => config.renamedItems[j[0]] = j[1]);
        if (ddbi.additionalItems) Object.entries(ddbi.additionalItems).forEach(k => config.additionalItems[k[0]] = k[1]);
        if (ddbi.removedItems) Object.entries(ddbi.removedItems).forEach(l => config.removedItems[l[0]] = l[1]);
        if (ddbi.restrictedItems) Object.entries(ddbi.restrictedItems).forEach(m => config.restrictedItems[m[0]] = m[1]);
        if (ddbi.correctedItems) Object.entries(ddbi.correctedItems).forEach(n => config.correctedItems[n[0]] = n[1]);
    });
    genericUtils.setProperty(CONFIG, 'chrisPremades', config);
}
async function getAutomation(itemName, options = {}) {
    const rules = options.rules === 'modern' ? '2024' : options.rules === 'legacy' ? '2014' : options.rules ?? '2014';
    const candidates = cat.lib.constants.automations.getAutomationByIdentifier(itemName.slugify(), {
        rules, type: options.itemType ?? 'spell', multiple: true,
        monsterIdentifier: options.monsterName?.slugify()
    });
    const automation = cat.utils.automationUtils.sortByPriority(candidates)[0];
    if (!automation) return;
    const document = await fromUuid(automation.uuid);
    if (!document) return;
    const data = document.toObject();
    genericUtils.setProperty(data, 'flags.cat.automation.source', automation.source);
    genericUtils.setProperty(data, 'flags.cat.automation.version', automation.version);
    return data;
}
async function monsterGenerics({actor}) {
    await monster.monsterGenerics(actor);
}
export let ddbi = {
    ready,
    getAutomation,
    monsterGenerics
};
