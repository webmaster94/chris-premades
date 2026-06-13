import {spellList} from '../../extensions/spellList.js';
import {compendiumUtils} from './compendiumUtils.js';
import {genericUtils} from './genericUtils.js';
async function getSpellsOfLevel(level, {identifier} = {}) {
    let documents = identifier ? await spellList.getClassSpells(identifier) : await spellList.getAllClassSpells();
    return documents.filter(i => i.system.level === level);
}
function isClassSpell(item, identifier) {
    let sourceItemUuid = item.system?.sourceItem;
    if (sourceItemUuid?.startsWith('class:')) return sourceItemUuid.slice(6) === identifier;
    let sourceItem = fromUuidSync(sourceItemUuid, {strict: false});
    return (genericUtils.getIdentifier(sourceItem) ?? sourceItem?.system?.identifier) === identifier;
}
async function getCompendiumSpell(name, {identifier = false, rules, bySystemIdentifier = false, ignoreNotFound = false} = {}) {
    let packId = genericUtils.getCPRSetting('spellCompendium');
    let pack = game.packs.get(packId);
    if (!pack) return;
    return await compendiumUtils.getItemFromCompendium(packId, name, {identifier, byIdentifier: identifier, rules, bySystemIdentifier, ignoreNotFound});
}
export let spellUtils = {
    getClassSpells: spellList.getClassSpells,
    getAllClassSpells: spellList.getAllClassSpells,
    getSpellsOfLevel,
    isClassSpell,
    getCompendiumSpell
};
