import {errors, genericUtils, itemUtils} from '../../utils.js';
async function getCPRAutomation(item) {
    return await getCatAutomation(item, 'chris-premades');
}
async function getGPSAutomation(item) {
    return await getCatAutomation(item, 'gambits-premades');
}
async function getMISCAutomation(item) {
    return await getCatAutomation(item, 'midi-item-showcase-community');
}
async function getACCAutomation(item) {
    return await getCatAutomation(item, 'automated-crafted-creations');
}
async function getItemFromCompendium(key, name, {ignoreNotFound, folderId, object = false, getDescription, translate, identifier, flatAttack, flatDC, castDataWorkflow, matchType, rules, byIdentifier, bySystemIdentifier} = {}) {
    let pack = game.packs.get(key);
    if (!pack) {
        if (!ignoreNotFound) errors.missingPack();
        return undefined;
    }
    let packIndex = await pack.getIndex({fields: ['name', 'type', 'folder', 'system.source.rules', 'flags.chris-premades.info.identifier', 'system.identifier']});
    let match;
    let alwaysFilterFunc = (item) => {
        return (!folderId || (item.folder === folderId)) && (!matchType || (item.type === matchType)) && (!rules || (item.system.source.rules === (rules === 'modern' ? '2024' : '2014')));
    };
    if (!byIdentifier && !bySystemIdentifier) {
        match = packIndex.find(item => (item.flags['chris-premades']?.info?.aliases ?? []).concat(item.name).includes(name) && alwaysFilterFunc(item));
    } else if (!bySystemIdentifier) {
        match = packIndex.find(item => item.flags['chris-premades']?.info?.identifier === name && alwaysFilterFunc(item));
    } else {
        match = packIndex.find(item => item.system?.identifier === name && alwaysFilterFunc(item));
    }
    if (match) {
        let document = await pack.getDocument(match._id);
        if (object) {
            let documentData = document.toObject();
            if (getDescription) documentData.system.description.value = itemUtils.getItemDescription(document.name);
            if (translate) {
                documentData.name = genericUtils.translate(translate);
                documentData.effects?.forEach(effectData => {
                    effectData.name = genericUtils.translate(translate);
                });
            }
            if (identifier) genericUtils.setProperty(documentData, 'flags.chris-premades.info.identifier', identifier);
            let activities = documentData.system.activities;
            if (flatAttack) {
                let activityIds = Object.entries(activities).filter(i => i[1].type === 'attack').map(i => i[0]);
                for (let activityId of activityIds) {
                    genericUtils.setProperty(documentData, 'system.activities.' + activityId + '.attack.flat', true);
                    genericUtils.setProperty(documentData, 'system.activities.' + activityId + '.attack.bonus', flatAttack);
                }
            }
            if (flatDC) {
                let activityIds = Object.entries(activities).filter(i => i[1].type === 'save').map(i => i[0]);
                for (let activityId of activityIds) {
                    genericUtils.setProperty(documentData, 'system.activities.' + activityId + '.save.dc', {
                        calculation: '',
                        formula: flatDC.toString(),
                        value: flatDC
                    });
                }
            }
            if (castDataWorkflow) {
                genericUtils.setProperty(documentData, 'flags.chris-premades.castData', castDataWorkflow.castData);
                genericUtils.setProperty(documentData, 'flags.chris-premades.castData.school', castDataWorkflow.item.system.school);
            }
            return documentData;
        } else {
            return document;
        }
    } else {
        if (!ignoreNotFound) errors.missingPackItem(key, name);
        return undefined;
    }
}
async function getActorFromCompendium(key, name, {ignoreNotFound, folderId, object = false, translate, identifier} = {}) {
    let pack = game.packs.get(key);
    if (!pack) {
        if (!ignoreNotFound) errors.missingPack();
        return undefined;
    }
    let packIndex = await pack.getIndex({fields: ['name', 'type', 'folder']});
    let match = packIndex.find(item => item.name === name && (!folderId || (folderId && item.folder === folderId)));
    if (match) {
        let document = await pack.getDocument(match._id);
        if (object) {
            let documentData = document.toObject();
            if (translate) documentData.name = genericUtils.translate(translate);
            if (identifier) genericUtils.setProperty(documentData, 'flags.chris-premades.info.identifier', identifier);
            return documentData;
        } else {
            return document;
        }
    } else {
        if (!ignoreNotFound) errors.missingPackItem(key, name);
        return undefined;
    }
}
async function getFilteredActorDocumentsFromCompendium(key, {maxCR, actorTypes, creatureTypes, creatureSubtypes, specificNames}={}) {
    let pack = game.packs.get(key);
    let packIndex = await pack.getIndex({fields: ['name', 'type', 'img', 'system.details.cr', 'system.details.type', 'system.attributes.movement']});
    let filteredIndex = packIndex.filter(i =>
        (!actorTypes?.length || actorTypes.includes(i.type)) &&
        (!maxCR || i.system?.details?.cr <= maxCR) &&
        (!creatureTypes?.length || creatureTypes.includes(i.system?.details?.type?.value)) &&
        (!creatureSubtypes?.length || creatureSubtypes.includes(i.system?.details?.type?.subtype?.toLowerCase())) &&
        (!specificNames?.length || specificNames.includes(i.name))
    );
    filteredIndex = game.dnd5e.moduleArt.apply(filteredIndex);
    filteredIndex = filteredIndex.map(i => foundry.utils.mergeObject(i, {img: 'icons/svg/mystery-man.svg'}, {overwrite: !i.img}));
    return filteredIndex;
}
async function getFilteredItemDocumentsFromCompendium(key, {specificNames, types, typeValues, badProperties}={}) {
    let pack = game.packs.get(key);
    let packIndex = await pack.getIndex({fields: ['name', 'type', 'img', 'system.type.value', 'system.properties']});
    let filteredIndex = packIndex.filter(i =>
        (!specificNames?.length || specificNames.includes(i.name)) &&
        (!types?.length || types.includes(i.type)) &&
        (!typeValues?.length || typeValues.includes(i.system?.type?.value)) &&
        (!badProperties?.length || badProperties.every(j => !i.system?.properties.includes(j)))
    );
    filteredIndex = game.dnd5e.moduleArt.apply(filteredIndex);
    filteredIndex = filteredIndex.map(i => foundry.utils.mergeObject(i, {img: 'systems/dnd5e/icons/svg/items/weapon.svg'}, {overwrite: !i.img}));
    return filteredIndex;
}
export let compendiumUtils = {
    getCPRAutomation,
    getGPSAutomation,
    getMISCAutomation,
    getACCAutomation,
    getAllAutomations,
    getItemFromCompendium,
    getPreferredAutomation,
    getActorFromCompendium,
    getFilteredActorDocumentsFromCompendium,
    getFilteredItemDocumentsFromCompendium,
    getAppliedOrPreferredAutomation
};
async function getCatAutomation(item, source) {
    const identifier = item.system?.identifier || item.name.slugify();
    const automation = source ? cat.lib.constants.automations.getAutomationByIdentifier(identifier, {source, rules: item.system?.source?.rules ?? '2014', type: item.type}) : cat.utils.automationUtils.getAppliedOrPreferredAutomation(item);
    return automation ? await fromUuid(automation.uuid) : undefined;
}
async function getAllAutomations(item) { return cat.utils.automationUtils.getAvailableAutomations(item); }
async function getPreferredAutomation(item) { return await getCatAutomation(item); }
async function getAppliedOrPreferredAutomation(item) { return await getCatAutomation(item); }
