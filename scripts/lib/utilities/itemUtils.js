import {actorUtils, effectUtils, genericUtils, socketUtils, compendiumUtils, animationUtils, activityUtils} from '../../utils.js';
import {custom} from '../../events/custom.js';
import {catAuthority} from '../../integrations/catAuthority.js';
import {requirements} from '../../extensions/requirements.js';
function getSaveDC(item) {
    if (item.hasSave) return item.system.activities.getByType('save')[0].save.dc.value;
    let spellChanges = item.effects.get('dnd5espellchange');
    if (spellChanges) {
        let value = spellChanges.system.changes.find(i => i.key === 'activities[save].save.dc.formula')?.value;
        if (value) return Number(value);
    }
    return item.actor?.system?.abilities?.[item.abilityMod]?.dc ?? item?.actor?.system?.attributes?.spell?.dc ?? 10;
}
async function createItems(actor, updates, {favorite, section, parentEntity, identifier, castData} = {}) {
    let hasPermission = socketUtils.hasPermission(actor, game.user.id);
    if (section) updates.forEach(i => genericUtils.setProperty(i, 'flags.tidy5e-sheet.section', section));
    if (identifier) updates.forEach(i => genericUtils.setProperty(i, 'flags.chris-premades.info.identifier', identifier));
    if (castData) updates.forEach(i => genericUtils.setProperty(i, 'flags.chris-premades.castData', castData));
    let items;
    if (hasPermission) {
        items = await actor.createEmbeddedDocuments('Item', updates);
    } else {
        items = await genericUtils.createEmbeddedDocuments(actor, 'Item', updates);
    }
    if (favorite) await actorUtils.addFavorites(actor, items);
    if (parentEntity) await effectUtils.addDependent(parentEntity, items);
    return items;
}
function getItemDescription(name) {
    let journal = game.journal.getName('CPR - Descriptions');
    if (!journal) {
        genericUtils.notify('CHRISPREMADES.Error.MissingDescriptionJournal', 'warn');
        return '';
    }
    let page = journal.pages.getName(name);
    if (!page) {
        genericUtils.notify('CHRISPREMADES.Error.MissingDescriptionPage', 'warn');
        return '';
    }
    return page.text.content;
}
function isSpellFeature(item) {
    return item.system.type?.value === 'spellFeature';
}
function getConfig(item, key) {
    if (key === 'playAnimation' && (!genericUtils.getCPRSetting('enableAnimations') || !animationUtils.sequencerCheck())) return false;
    if (key === 'animation'     && (!genericUtils.getCPRSetting('enableAnimations') || !animationUtils.sequencerCheck())) return 'none';
    let flagValue = Object.hasOwn(item.flags.cat?.config ?? {}, key) ? item.flags.cat.config[key] : item.flags['chris-premades']?.config?.[key];
    if (flagValue !== undefined) return flagValue;
    let identifier = genericUtils.getIdentifier(item);
    if (!identifier) return;
    let value = custom.getMacro(identifier, genericUtils.getRules(item))?.config?.find(i => i.value === key)?.default;
    return value === '' ? false : value;
}
async function setConfig(item, key, value) {
    return await genericUtils.setFlag(item, 'cat', 'config.' + key, value);
}
function getItemByIdentifier(actor, identifier) {
    return actor.items.find(i => genericUtils.getIdentifier(i) === identifier);
}
function getSourceClassIdentifier(item) {
    let sourceItemUuid = item?.system?.sourceItem;
    if (sourceItemUuid?.startsWith('class:')) return sourceItemUuid.slice(6);
    let sourceItem = fromUuidSync(sourceItemUuid, {strict: false});
    return genericUtils.getIdentifier(sourceItem) ?? sourceItem?.system?.identifier;
}
function getAllItemsByIdentifier(actor, identifier) {
    return actor.items.filter(i => genericUtils.getIdentifier(i) === identifier);
}
function getVersion(item) {
    return catAuthority.version(item);
}
function getSource(item) {
    return catAuthority.source(item);
}
// Returns CAT's automationStatus value.
async function isUpToDate(item) {
    return catAuthority.status(item);
}
async function syntheticItem(itemData, actor) {
    let item = new CONFIG.Item.documentClass(itemData, {parent: actor});
    item.prepareData();
    item.prepareFinalAttributes();
    item.applyActiveEffects('initial');
    return item;
}
async function enchantItem(item, effectData, {effects = [], items = [], concentrationItem, parentEntity, identifier, vae, interdependent, strictlyInterdependent} = {}) {
    genericUtils.setProperty(effectData, 'type', 'enchantment');
    effectData.transfer = false;
    genericUtils.setProperty(effectData, 'flags.dnd5e.enchantment', {
        level: {
            min: null,
            max: null
        },
        riders: {
            effect: effects,
            item: items
        }
    });
    return await effectUtils.createEffect(item, effectData, {concentrationItem, parentEntity, identifier, vae, interdependent, strictlyInterdependent});
}
// DAE's v14 convertDuration returns {type, value, units} with no seconds field; expose a
// non-enumerable legacy seconds getter so callers that need raw seconds (Summons.spawn
// durations) keep working without leaking an extra key into ActiveEffect create data.
function withLegacySeconds(duration) {
    if (!duration || Object.getOwnPropertyDescriptor(duration, 'seconds')) return duration;
    let secondsPerUnit = {
        seconds: 1,
        minutes: 60,
        hours: 3600,
        days: 86400,
        weeks: 604800,
        months: 2592000,
        years: 31536000,
        rounds: CONFIG.time?.roundTime || 6,
        turns: CONFIG.time?.roundTime || 6
    };
    Object.defineProperty(duration, 'seconds', {
        get() {
            if (!this.value) return undefined;
            return this.value * (secondsPerUnit[this.units] ?? 1);
        },
        enumerable: false,
        configurable: true
    });
    return duration;
}
function convertDurationData(durationData) {
    return withLegacySeconds(DAE.convertDuration(durationData));
}
function convertDuration(entity) {
    if (entity.documentName === 'Item') {
        return convertDurationData(entity.system.duration);
    } else if (entity.documentName === 'Activity') {
        return convertDurationData(entity.duration);
    }
}
function getEquipmentState(item) {
    let currentlyEquipped = item.system.equipped;
    let currentlyAttuned = item.system.attuned;
    let attunement = item.system?.attunement;
    let validTypes = ['required', 'optional'];
    let requiresAttunement = validTypes.includes(attunement);
    return ((requiresAttunement && currentlyAttuned) || !requiresAttunement) && currentlyEquipped ? true : false;
}
function getToolProficiency(actor, tool) {
    let toolName = tool.system.type?.baseItem;
    if (!toolName) return 0;
    return actor.system.tools[toolName]?.value ?? 0;
}
function getSavedCastData(item) {
    return item.flags['chris-premades']?.castData;
}
function getGenericFeatureConfig(item, key) {
    if (Object.hasOwn(item.flags.cat?.genericConfig?.['chris-premades'] ?? {}, key)) return item.flags.cat.genericConfig['chris-premades'][key];
    return item.flags['chris-premades']?.config?.generic?.[key];
}
function getItemByGenericFeature(actor, key) {
    return actor.items.find(i => getGenericFeatureConfig(i, key));
}
function isWeaponProficient(item) {
    if (item.system.proficient) return true;
    if (!item.actor) return false;
    if (item.actor.type === 'npc') return true;
    if (item.actor.system.traits.weaponProf.value.has(item.system.type.baseItem)) return true;
    if (item.actor.system.traits.weaponProf.value.has(CONFIG.DND5E.weaponProficienciesMap[item.system.type.value])) return true;
    return false;
}
async function itemUpdate(item) {
    return await catAuthority.update(item);
}
async function setHiddenActivities(item, activityIdentifiers, replace = true) {
    let existingHidden = replace ? [] : item.flags?.['chris-premades']?.hiddenActivities ?? [];
    existingHidden = new Set(existingHidden.concat(activityIdentifiers));
    await genericUtils.setFlag(item, 'chris-premades', 'hiddenActivities', Array.from(existingHidden));
    await genericUtils.update(item);
}
async function setSpellActivities(item, activityIdentifiers, replace = true) {
    let existingSpells = replace ? [] : item.flags?.['chris-premades']?.spellActivities ?? [];
    existingSpells = new Set(existingSpells.concat(activityIdentifiers));
    await genericUtils.setFlag(item, 'chris-premades', 'spellActivities', Array.from(existingSpells));
    await genericUtils.update(item);
}
function getHiddenActivities(item) {
    return genericUtils.getProperty(item, 'flags.chris-premades.hiddenActivities');
}
function getSpellActivities(item) {
    return genericUtils.getProperty(item, 'flags.chris-premades.spellActivities');
}
function getActivity(item, type) {
    return item.system.activities.getByType(type)?.[0];
}
function getEffectByIdentifier(item, identifier) {
    return item.effects.find(i => genericUtils.getIdentifier(i) === identifier);
}
function cloneItem(item, updates = {}, options = {keepId: true}) {
    return item.clone(updates, options);
}
async function correctActivityItemConsumption(item, activityIdentifiers = [], targetIdentifier) {
    let target = itemUtils.getItemByIdentifier(item.actor, targetIdentifier);
    if (!target) return;
    let itemData = genericUtils.duplicate(item.toObject());
    let updates = {};
    activityIdentifiers.forEach(identifier => {
        let activity = activityUtils.getActivityByIdentifier(item, identifier, {strict: true});
        if (!activity) return;
        itemData.system.activities[activity.id].consumption.targets[0].target = target.id;
        let path = 'system.activities.' + activity.id + '.consumption.targets';
        updates[path] = itemData.system.activities[activity.id].consumption.targets;
    });
    if (Object.keys(updates).length) return await genericUtils.update(item, updates);
}
async function multiCorrectActivityItemConsumption(item, activityIdentifiers = [], corrections = {}) {
    /*{
        0: 'firstItemIdentifier',
        1: 'secondItemIdentifier
    }*/
    let itemData = genericUtils.duplicate(item.toObject());
    let updates = {};
    activityIdentifiers.forEach(identifier => {
        let activity = activityUtils.getActivityByIdentifier(item, identifier, {strict: true});
        if (!activity) return;
        for (let i of Object.keys(corrections)) {
            let targetItem = itemUtils.getItemByIdentifier(item.actor, corrections[i]);
            if (!targetItem) continue;
            itemData.system.activities[activity.id].consumption.targets[i].target = targetItem.id;
        }
        let path = 'system.activities.' + activity.id + '.consumption.targets';
        updates[path] = itemData.system.activities[activity.id].consumption.targets;
    });
    if (Object.keys(updates).length) return await genericUtils.update(item, updates);
}
async function fixScales(item) {
    return await requirements.scaleCheck(item);
}
function canUse(item) {
    if (!item.system.activities.size) return true;
    if (item.system.activities.find(i => activityUtils.canUse(i))) return true;
}
export let itemUtils = {
    getSaveDC,
    createItems,
    getItemDescription,
    isSpellFeature,
    getConfig,
    getItemByIdentifier,
    getSourceClassIdentifier,
    getAllItemsByIdentifier,
    getVersion,
    getSource,
    isUpToDate,
    syntheticItem,
    enchantItem,
    convertDuration,
    convertDurationData,
    setConfig,
    getEquipmentState,
    getToolProficiency,
    getSavedCastData,
    getGenericFeatureConfig,
    getItemByGenericFeature,
    isWeaponProficient,
    itemUpdate,
    setHiddenActivities,
    getHiddenActivities,
    getActivity,
    getEffectByIdentifier,
    getSpellActivities,
    setSpellActivities,
    cloneItem,
    correctActivityItemConsumption,
    fixScales,
    multiCorrectActivityItemConsumption,
    canUse
};
