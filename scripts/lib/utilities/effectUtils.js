import {socket, sockets} from '../sockets.js';
import {actorUtils, genericUtils, socketUtils} from '../../utils.js';
function getCastData(effect) {
    return effect.flags['chris-premades']?.castData ?? effect.flags['midi-qol']?.castData;
}
function getCastLevel(effect) {
    return getCastData(effect)?.castLevel;
}
function getBaseLevel(effect) {
    return getCastData(effect)?.baseLevel;
}
async function setCastData(effect, data) {
    await effect.setFlag('chris-premades', 'castData', data);
}
async function setCastLevel(effect, level) {
    let data = getCastData(effect) ?? {};
    data.castLevel = level;
    await setCastData(effect, data);
}
async function setBaseLevel(effect, level) {
    let data = getCastData(effect) ?? {};
    data.baseLevel = level;
    await setCastData(effect, data);
}
function getSaveDC(effect) {
    return getCastData(effect)?.saveDC;
}
async function setSaveDC(effect, dc) {
    let data = getCastData(effect) ?? {};
    data.saveDC = dc;
    await setCastData(effect, data);
}
function normalizeEffectDuration(effectData) {
    let duration = effectData?.duration;
    if (!duration) return;
    if (duration.seconds !== undefined) {
        effectData.duration = {value: duration.seconds, units: 'seconds'};
    } else if (duration.rounds !== undefined) {
        effectData.duration = {value: duration.rounds, units: 'rounds'};
    } else if (duration.turns !== undefined) {
        effectData.duration = {value: duration.turns, units: 'turns'};
    }
    duration = effectData.duration;
    if (duration.value === undefined || effectData.start) return;
    if (['rounds', 'turns'].includes(duration.units)) {
        effectData.start = {round: game.combat?.round ?? 0, turn: game.combat?.turn ?? 0};
    } else {
        effectData.start = {time: game.time?.worldTime ?? 0};
    }
}
function normalizeEffectChanges(effectData) {
    if (!effectData) return;
    if (effectData.icon && !effectData.img) {
        effectData.img = effectData.icon;
        delete effectData.icon;
    }
    if (effectData.changes && !effectData.system?.changes) {
        effectData.system ??= {};
        effectData.system.changes = effectData.changes;
        delete effectData.changes;
    }
    let changes = effectData.system?.changes;
    if (!Array.isArray(changes)) return;
    let modeMap = {
        [CONST.ACTIVE_EFFECT_MODES.CUSTOM]: 'custom',
        [CONST.ACTIVE_EFFECT_MODES.MULTIPLY]: 'multiply',
        [CONST.ACTIVE_EFFECT_MODES.ADD]: 'add',
        [CONST.ACTIVE_EFFECT_MODES.DOWNGRADE]: 'downgrade',
        [CONST.ACTIVE_EFFECT_MODES.UPGRADE]: 'upgrade',
        [CONST.ACTIVE_EFFECT_MODES.OVERRIDE]: 'override'
    };
    for (let change of changes) {
        if (change.type || change.mode === undefined) continue;
        change.type = modeMap[change.mode] ?? 'custom';
        delete change.mode;
    }
}
function normalizeEffectData(effectData) {
    normalizeEffectDuration(effectData);
    normalizeEffectChanges(effectData);
}
async function createEffect(entity, effectData, {concentrationItem, parentEntity, identifier, vae, interdependent, strictlyInterdependent, unhideActivities, rules, macros, conditions, animate = true, tokenImg, avatarImg, tokenImgPriority = 50, avatarImgPriority = 50, keepId = false} = {}, {animationPath, animationSize = 1, animationFadeIn = 300, animationFadeOut = 300, animationSound} = {}) {
    normalizeEffectData(effectData);
    let hasPermission = socketUtils.hasPermission(entity, game.user.id);
    let concentrationEffect;
    if (concentrationItem) concentrationEffect = getConcentrationEffect(concentrationItem.actor, concentrationItem);
    if (concentrationEffect) effectData.origin = concentrationEffect.uuid;
    if (identifier) genericUtils.setProperty(effectData, 'flags.chris-premades.info.identifier', identifier);
    if (unhideActivities) genericUtils.setProperty(effectData, 'flags.chris-premades.unhideActivities', unhideActivities);
    if (parentEntity) genericUtils.setProperty(effectData, 'flags.chris-premades.parentEntityUuid', parentEntity.uuid);
    if (concentrationEffect) genericUtils.setProperty(effectData, 'flags.chris-premades.concentrationEffectUuid', concentrationEffect.uuid);
    if (interdependent && (parentEntity || concentrationItem)) genericUtils.setProperty(effectData, 'flags.chris-premades.interdependent', true);
    if (vae) genericUtils.setProperty(effectData, 'flags.chris-premades.vae.buttons', vae);
    if (rules) genericUtils.setProperty(effectData, 'flags.chris-premades.rules', rules);
    if (macros) macros.forEach(i => addMacro(effectData, i.type, i.macros));
    if (conditions) genericUtils.setProperty(effectData, 'flags.chris-premades.conditions', conditions);
    if (!animate) genericUtils.setProperty(effectData, 'flags.chris-premades.effect.noAnimation', true);
    if (tokenImg) {
        genericUtils.setProperty(effectData, 'flags.chris-premades.image.token.value', tokenImg);
        genericUtils.setProperty(effectData, 'flags.chris-premades.image.token.priority', tokenImgPriority);
    }
    if (avatarImg) {
        genericUtils.setProperty(effectData, 'flags.chris-premades.image.actor.value', avatarImg);
        genericUtils.setProperty(effectData, 'flags.chris-premades.image.actor.priority', avatarImgPriority);
    }
    let effects;
    if (hasPermission) {
        effects = await entity.createEmbeddedDocuments('ActiveEffect', [effectData], {keepId});
        if (concentrationEffect) await addDependent(concentrationEffect, effects);
        if (parentEntity) await addDependent(parentEntity, effects);
    } else {
        effects = [await socket.executeAsGM(sockets.createEffect.name, entity.uuid, effectData, {concentrationItemUuid: concentrationItem?.uuid, parentEntityUuid: parentEntity?.uuid, keepId})];
        effects = await Promise.all(effects.map(async i => await fromUuid(i)));
    }
    if (strictlyInterdependent) {
        if (concentrationEffect) {
            await genericUtils.setFlag(concentrationEffect, 'dnd5e', 'dependentOn', effects[0].uuid);
            await genericUtils.setFlag(effects[0], 'dnd5e', 'dependentOn', concentrationEffect.uuid);
        } else if (parentEntity) {
            await genericUtils.setFlag(parentEntity, 'dnd5e', 'dependentOn', effects[0].uuid),
            await genericUtils.setFlag(effects[0], 'dnd5e', 'dependentOn', parentEntity.uuid);
        }
    }
    if ((animationPath || animationSound) && effects.length) {
        let token = actorUtils.getFirstToken(effects[0].parent);
        if (token) {
            /* eslint-disable indent */
            new Sequence({moduleName:'chris-premades', softFail:true})
                .effect()
                    .playIf(animationPath)
                    .file(animationPath)
                    .size(animationSize, {gridUnits: true})
                    .attachTo(token)
                    .persist()
                    .fadeIn(animationFadeIn)
                    .fadeOut(animationFadeOut)
                    .tieToDocuments([token.document, effects[0]])
                .sound()
                    .playIf(animationSound)
                    .file(animationSound)
                .play();
            /* eslint-enable indent */
        }
    }
    if (effects?.length) return effects[0];
}
async function createEffects(entity, effectDataArray, effectOptionsArray) {
    let hasPermission = socketUtils.hasPermission(entity, game.user.id);
    let concentrationEffects = [];
    for (let i = 0; i < effectDataArray.length; i++) {
        let effectData = effectDataArray[i];
        normalizeEffectData(effectData);
        let {concentrationItem, parentEntity, identifier, vae, interdependent} = effectOptionsArray[i];
        let concentrationEffect;
        if (concentrationItem) concentrationEffect = getConcentrationEffect(concentrationItem.actor, concentrationItem);
        if (identifier) genericUtils.setProperty(effectData, 'flags.chris-premades.info.identifier', identifier);
        if (parentEntity) genericUtils.setProperty(effectData, 'flags.chris-premades.parentEntityUuid', parentEntity.uuid);
        if (concentrationEffect) genericUtils.setProperty(effectData, 'flags.chris-premades.concentrationEffectUuid', concentrationEffect.uuid);
        if (interdependent && (parentEntity || concentrationItem)) genericUtils.setProperty(effectData, 'flags.chris-premades.interdependent', true);
        if (vae) genericUtils.setProperty(effectData, 'flags.chris-premades.vae.buttons', vae);
        concentrationEffects.push(concentrationEffect);
    }
    let effects;
    if (hasPermission) {
        effects = await entity.createEmbeddedDocuments('ActiveEffect', effectDataArray);
        for (let i = 0; i < effects.length; i++) {
            if (concentrationEffects[i]) await addDependent(concentrationEffects[i], [effects[i]]);
            if (effectOptionsArray[i].parentEntity) await addDependent(effectOptionsArray[i].parentEntity, [effects[i]]);
        }
    } else {
        effects = await socket.executeAsGM(sockets.createEffects.name, entity.uuid, effectDataArray, {concentrationItemUuidArray: effectOptionsArray.map(i => i.concentrationItem?.uuid), parentEntityUuidArray: effectOptionsArray.map(i => i.parentEntity?.uuid)});
        effects = await Promise.all(effects.map(async i => await fromUuid(i)));
    }
    for (let i = 0; i < effects.length; i++) {
        let effect = effects[i];
        let {parentEntity, strictlyInterdependent} = effectOptionsArray[i];
        let concentrationEffect = concentrationEffects[i];
        if (strictlyInterdependent) {
            if (concentrationEffect) {
                await genericUtils.setFlag(effect, 'dnd5e', 'dependentOn', concentrationEffect.uuid);
                await genericUtils.setFlag(concentrationEffect, 'dnd5e', 'dependentOn', effect.uuid);
            } else if (parentEntity) {
                await genericUtils.setFlag(effect, 'dnd5e', 'dependentOn', parentEntity.uuid);
                await genericUtils.setFlag(parentEntity, 'dnd5e', 'dependentOn', effect.uuid);
            }
        }
    }
    if (effects?.length) return effects;
}
async function addDependent(entity, dependents, forceGM = false) {
    let hasPermission = false;
    if (!forceGM) hasPermission = !dependents.some(i => !socketUtils.hasPermission(i, game.user.id));
    if (hasPermission) {
        await Promise.all(dependents.map(i => i.setFlag('dnd5e', 'dependentOn', entity.uuid)));
    } else {
        socket.executeAsGM(sockets.addDependent.name, entity.uuid, dependents.map(i => i.uuid));
    }
}
let deletingDependentParents = new Set();
function addDocumentIfValid(documents, document, parentUuid) {
    if (!document?.uuid || document.uuid === parentUuid) return;
    documents.set(document.uuid, document);
}
function addDocumentIfDependent(documents, document, parentUuid) {
    if (document?.flags?.dnd5e?.dependentOn !== parentUuid) return;
    addDocumentIfValid(documents, document, parentUuid);
}
function collectActorDependents(documents, actor, parentUuid) {
    addDocumentIfDependent(documents, actor, parentUuid);
    actor?.effects?.forEach(effect => addDocumentIfDependent(documents, effect, parentUuid));
    actor?.items?.forEach(item => {
        addDocumentIfDependent(documents, item, parentUuid);
        item.effects?.forEach(effect => addDocumentIfDependent(documents, effect, parentUuid));
    });
}
function collectDependentDocuments(entity) {
    let parentUuid = entity?.uuid;
    if (!parentUuid) return [];
    let documents = new Map();
    globalThis.MidiQOL?.MidiDependentsRegistry?.get?.(parentUuid)?.forEach(document => addDocumentIfValid(documents, document, parentUuid));
    let flaggedDependents = entity.flags?.dnd5e?.dependents;
    if (Array.isArray(flaggedDependents)) {
        flaggedDependents.forEach(uuid => {
            let document;
            try {
                document = fromUuidSync(uuid, {strict: false});
            } catch {
                try {
                    document = fromUuidSync(uuid);
                } catch {
                    return;
                }
            }
            addDocumentIfValid(documents, document, parentUuid);
        });
    }
    game.actors?.forEach(actor => collectActorDependents(documents, actor, parentUuid));
    game.items?.forEach(item => {
        addDocumentIfDependent(documents, item, parentUuid);
        item.effects?.forEach(effect => addDocumentIfDependent(documents, effect, parentUuid));
    });
    game.scenes?.forEach(scene => {
        scene.tokens?.forEach(token => {
            addDocumentIfDependent(documents, token, parentUuid);
            collectActorDependents(documents, token.actor, parentUuid);
        });
        scene.regions?.forEach(region => addDocumentIfDependent(documents, region, parentUuid));
        scene.templates?.forEach(template => addDocumentIfDependent(documents, template, parentUuid));
        scene.lights?.forEach(light => addDocumentIfDependent(documents, light, parentUuid));
    });
    return Array.from(documents.values());
}
async function deleteDependents(entity) {
    if (!entity?.uuid || deletingDependentParents.has(entity.uuid)) return;
    deletingDependentParents.add(entity.uuid);
    try {
        let dependents = collectDependentDocuments(entity).filter(dependent => !deletingDependentParents.has(dependent.uuid));
        for (let dependent of dependents) {
            try {
                await genericUtils.remove(dependent);
            } catch (error) {
                console.warn('CPR: Failed to delete dependent document for ' + entity.uuid, dependent, error);
            }
        }
    } finally {
        deletingDependentParents.delete(entity.uuid);
    }
}
function addMacro(effectData, type, macroList) {
    let currentMacroList = genericUtils.getProperty(effectData, 'flags.chris-premades.macros.' + type) ?? [];
    return genericUtils.setProperty(effectData, 'flags.chris-premades.macros.' + type, currentMacroList.concat(macroList));
}
function getRemainingDurationSeconds(effect) {
    let duration = effect?.duration;
    if (!duration) return 0;
    if (duration.remaining === Infinity) return Infinity;
    if (Number.isFinite(duration.remaining)) {
        if (duration.units === 'seconds') return duration.remaining;
        if (Number.isFinite(duration.seconds) && Number.isFinite(duration.value) && duration.value) return Math.ceil(duration.remaining * duration.seconds / duration.value);
        return duration.remaining;
    }
    if (!Number.isFinite(duration.value)) return duration.value ?? 0;
    if (duration.units === 'seconds') return Math.max(((effect.start?.time ?? game.time?.worldTime ?? 0) + duration.value) - (game.time?.worldTime ?? 0), 0);
    if (Number.isFinite(duration.seconds)) return Math.max(((effect.start?.time ?? game.time?.worldTime ?? 0) + duration.seconds) - (game.time?.worldTime ?? 0), 0);
    return duration.value;
}
function getConcentrationEffect(actor, item) {
    return MidiQOL.getConcentrationEffect(actor, item);
}
function getEffectByIdentifier(actor, name) {
    return actorUtils.getEffects(actor).find(i => genericUtils.getIdentifier(i) === name);
}
function getAllEffectsByIdentifier(actor, name) {
    return actorUtils.getEffects(actor).filter(i => genericUtils.getIdentifier(i) === name);
}
function getEffectByStatusID(actor, statusID) {
    return actorUtils.getEffects(actor).find(i => i.id === CONFIG.statusEffects[statusID]?._id);
}
async function applyConditions(actor, conditions, {overlay = false} = {}) {
    let updates = [];
    await Promise.all(conditions.map(async i => {
        if (actorUtils.checkTrait(actor, 'ci', i)) return;
        let cEffect = getEffectByStatusID(actor, i);
        if (cEffect) return;
        let effectImplementation = await ActiveEffect.implementation.fromStatusEffect(i);
        if (!effectImplementation) return;
        let effectData = effectImplementation.toObject();
        if (overlay) genericUtils.setProperty(effectData, 'flags.core.overlay', true);
        updates.push(effectData);
    }));
    if (updates.length) return await genericUtils.createEmbeddedDocuments(actor, 'ActiveEffect', updates, {keepId: true});
}
async function sidebarEffectHelper(documentId, toggle) {
    let effectsItem = game.items.find(i => i.flags['chris-premades']?.effectInterface);
    let document = effectsItem?.collections?.effects?.get(documentId);
    if (!document) return;
    let selectedTokens = canvas.tokens.controlled;
    if (!selectedTokens.length) {
        genericUtils.notify('CHRISPREMADES.EffectInterface.SelectToken', 'warn');
        return;
    }
    let effectData = document.toObject();
    delete effectData.id;
    genericUtils.setProperty(effectData, 'start.time', game.time?.worldTime ?? 0);
    genericUtils.setProperty(effectData, 'flags.chris-premades.effectInterface.id', document.id);
    selectedTokens.forEach(i => {
        if (!i.actor) return;
        effectData.origin = i.actor.uuid;
        let effect = actorUtils.getEffects(i.actor).find(i => i.flags['chris-premades']?.effectInterface?.id === document.id || i.id === document.id);
        let stackable = effect?.flags.dae?.stackable === 'count';
        let stackCount = effect?.flags.dae?.stacks ?? 1;
        if (effect && toggle) {
            if (!stackable || stackCount === 1) {
                genericUtils.remove(effect);
            } else {
                genericUtils.update(effect, {'flags.dae.stacks': stackCount - 1});
            }
        } else if (effect && stackable) {
            genericUtils.update(effect, {'flags.dae.stacks': stackCount + 1});
        } else {
            if (effectData.flags['chris-premades']?.effectInterface?.status || effectData.flags['chris-premades']?.effectInterface?.customStatus) {
                genericUtils.createEmbeddedDocuments(i.actor, 'ActiveEffect', [effectData], {keepId: true});
            } else {
                effectUtils.createEffect(i.actor, effectData);
            }
        }
    });
}
async function toggleSidebarEffect(documentId) {
    await sidebarEffectHelper(documentId, true);
}
async function addSidebarEffect(documentId) {
    await sidebarEffectHelper(documentId, false);
}
function getSidebarEffectData(name) {
    let effectsItem = game.items.find(i => i.flags['chris-premades']?.effectInterface);
    if (!effectsItem) return;
    let effect = effectsItem.collections.effects.getName(name);
    if (!effect) return;
    let effectData = effect.toObject();
    if (!(effect.flags['chris-premades']?.effectInterface?.customStatus || effect.flags['chris-premades']?.effectInterface?.status)) delete effectData._id;
    delete effectData.origin;
    return effectData;
}
async function createEffectFromSidebar(actor, name, options) {
    let effectData = getSidebarEffectData(name);
    if (!effectData) return;
    return await createEffect(actor, effectData, options);
}
async function syntheticActiveEffect(effectData, entity) {
    normalizeEffectData(effectData);
    return new CONFIG.ActiveEffect.documentClass(effectData, {parent: entity});
}
async function getOriginItem(effect) {
    let origin = await fromUuid(effect?.origin);
    if (!origin) return;
    if (origin instanceof Item) return origin;
    if (origin.parent instanceof Item) return origin.parent;
    origin = await fromUuid(origin.origin);
    if (origin instanceof Item) return origin;
}
function getOriginItemSync(effect) {
    let origin = fromUuidSync(effect?.origin, {strict: false});
    if (!origin) return;
    if (origin instanceof Item) return origin;
    if (origin.parent instanceof Item) return origin.parent;
    origin = fromUuidSync(origin.origin, {strict: false});
    if (origin instanceof Item) return origin;
}
function getConditions(effect) {
    let conditions = new Set();
    let validKeys = [
        'macro.CE',
        'macro.CUB',
        'macro.StatusEffect',
        'StatusEffect'
    ];
    effect.system.changes.forEach(element => {
        if (validKeys.includes(element.key)) conditions.add(element.value.toLowerCase());
    });
    let effectConditions = effect.flags['chris-premades']?.conditions;
    if (effectConditions) effectConditions.forEach(c => conditions.add(c.toLowerCase()));
    conditions = conditions.union(effect.statuses ?? new Set());
    return conditions;
}
export let effectUtils = {
    getCastData,
    getCastLevel,
    getBaseLevel,
    setCastData,
    setCastLevel,
    setBaseLevel,
    getSaveDC,
    setSaveDC,
    createEffect,
    createEffects,
    addDependent,
    deleteDependents,
    addMacro,
    getRemainingDurationSeconds,
    getConcentrationEffect,
    getEffectByIdentifier,
    getAllEffectsByIdentifier,
    getEffectByStatusID,
    applyConditions,
    toggleSidebarEffect,
    addSidebarEffect,
    syntheticActiveEffect,
    getSidebarEffectData,
    createEffectFromSidebar,
    getOriginItem,
    getConditions,
    getOriginItemSync
};
