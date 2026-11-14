import {custom} from '../../../events/custom.js';
import {combatUtils} from '../../../lib/utilities/combatUtils.js';
import {activityUtils, actorUtils, compendiumUtils, constants, dialogUtils, effectUtils, genericUtils, itemUtils, tokenUtils, workflowUtils} from '../../../utils.js';
function perTurnCheck(actor, mastery) {
    if (!combatUtils.inCombat()) return true;
    let previousTurn = actor.flags['chris-premades']?.mastery?.[mastery]?.turn;
    return previousTurn !== combatUtils.currentTurn();
}
async function setTurnCheck(actor, mastery) {
    if (!combatUtils.inCombat()) return;
    let turn = game.combat.round + '-' + game.combat.turn;
    await genericUtils.setFlag(actor, 'chris-premades', 'mastery.' + mastery + '.turn', turn);
}
async function cleave({workflow}) {
    if (!perTurnCheck(workflow.actor, 'cleave')) return;
    if (!workflow.hitTargets.count) return;
    if (workflow.item.flags['chris-premades']?.cleaveMastery) return;
    let target = workflow.hitTargets.tokens[0];
    let targetNearbyAllies = tokenUtils.findNearby(target, 5, 'ally');
    let nearbyTargets = tokenUtils.findNearby(workflow.token, workflow.rangeDetails.range ?? 5, 'enemy').filter(i => i != target && targetNearbyAllies.includes(i));
    if (!nearbyTargets.length) return;
    let selection = await dialogUtils.selectTargetDialog('CHRISPREMADES.Mastery.Cleave.Name', 'CHRISPREMADES.Cleave.Use', nearbyTargets, {skipDeadAndUnconscious: false, buttons: 'yesNo'});
    if (!selection?.length) return;
    await setTurnCheck(workflow.actor, 'cleave');
    selection = selection[0];
    let mod = activityUtils.getMod(workflow.activity);
    let item = workflow.actor.items.get(workflow.item.id);
    if (mod > 0) {
        let itemData = item.toObject();
        delete itemData._id;
        itemData.system.activities[workflow.activity.id].damage.parts.push({
            number: null,
            denomination: 0,
            bonus: '-@mod',
            types: [
                workflow.defaultDamageType
            ]
        });
        genericUtils.setProperty(itemData, 'flags.chris-premades.cleaveMastery', true);
        await workflowUtils.syntheticItemDataRoll(itemData, workflow.actor, [selection]);
    } else {
        await workflowUtils.syntheticItemRoll(item, [selection]);
    }
}
async function graze({workflow}) {
    if (workflow.hitTargets.count) return;
    let mod = activityUtils.getMod(workflow.activity);
    if (!mod) return;
    await workflowUtils.applyDamage([workflow.targets.tokens[0]], mod, workflow.defaultDamageType);
}
async function push({workflow}) {
    if (!workflow.hitTargets.count) return;
    if (actorUtils.getSize(workflow.targets.tokens[0].actor, false) > 3) return;
    let selection = await dialogUtils.confirm('CHRISPREMADES.Mastery.Push.Name', 'CHRISPREMADES.Mastery.Push.Context');
    if (!selection) return;
    await tokenUtils.pushToken(workflow.token, workflow.targets.tokens[0], 10);
}
async function sap({workflow}) {
    if (!workflow.hitTargets.count) return;
    let effectData = {
        system: {changes: [
            {
                key: 'flags.midi-qol.disadvantage.attack.all',
                type: 'custom',
                value: 1,
                priority: 20
            }
        ]},
        duration: {value: 12, units: 'seconds'}, start: {time: game.time?.worldTime ?? 0},
        img: 'icons/skills/melee/sword-damaged-broken-red.webp',
        name: genericUtils.translate('CHRISPREMADES.Mastery.Sap.Name'),
        origin: workflow.item.uuid,
        flags: {
            dae: {
                specialDuration: [
                    'turnStartSource',
                    'combatEnd',
                    '1Attack'
                ],
                stackable: 'noneNameOnly'
            }
        }
    };
    await effectUtils.createEffect(workflow.targets.tokens[0].actor, effectData);
}
async function slow({workflow}) {
    if (!workflow.hitTargets.count) return;
    let effectData = {
        system: {changes: [
            {
                key: 'system.attributes.movement.all',
                type: 'custom',
                value: -10,
                priority: 20
            }
        ]},
        duration: {value: 12, units: 'seconds'}, start: {time: game.time?.worldTime ?? 0},
        img: 'icons/equipment/feet/boots-galosh-white.webp',
        name: genericUtils.translate('CHRISPREMADES.Mastery.Slow.Name'),
        origin: workflow.item.uuid,
        flags: {
            dae: {
                specialDuration: [
                    'turnStartSource',
                    'combatEnd'
                ],
                stackable: 'noneNameOnly'
            }
        }
    };
    await effectUtils.createEffect(workflow.targets.tokens[0].actor, effectData);
}
async function topple({workflow}) {
    if (!workflow.hitTargets.count) return;
    let target = workflow.targets.tokens[0];
    if (target.actor?.statuses.has('prone')) return;
    let selection = await dialogUtils.confirm('CHRISPREMADES.Mastery.Topple.Name', 'CHRISPREMADES.Mastery.Topple.Context');
    if (!selection) return;
    let featureData = await compendiumUtils.getItemFromCompendium(constants.packs.miscellaneousItems, 'Mastery: Topple', {object: true, getDescription: true, flatDC: activityUtils.getSaveDC(workflow.activity)});
    await workflowUtils.syntheticItemDataRoll(featureData, workflow.actor, [target]);
}
async function vex({workflow}) {
    if (!workflow.damageItem) return;
    if (!workflow.hitTargets.count || (workflow.damageItem.oldHP === workflow.damageItem.newHP && workflow.damageItem.oldTempHP === workflow.damageItem.newTempHP)) return;
    let effectData = {
        system: {changes: [
            {
                key: 'flags.midi-qol.advantage.attack.all',
                type: 'add',
                value: 'workflow.targets.tokens[0].id === "' + workflow.targets.tokens[0].id + '"',
                priority: 20
            }
        ]},
        duration: {value: 12, units: 'seconds'}, start: {time: game.time?.worldTime ?? 0},
        img: 'icons/magic/control/fear-fright-mask-yellow.webp',
        name: genericUtils.translate('CHRISPREMADES.Mastery.Vex.Name'),
        origin: workflow.item.uuid,
        flags: {
            dae: {
                specialDuration: [
                    'turnEndSource',
                    'combatEnd'
                ],
                stackable: 'multi'
            },
            'chris-premades': {
                mastery: {
                    vex: {
                        target: workflow.targets.tokens[0].id
                    }
                }
            }
        }
    };
    await effectUtils.createEffect(workflow.actor, effectData);
}
async function RollComplete(workflow) {
    if (!workflow.targets.count || !workflow.item || !workflow.activity || !workflow.actor || !workflow.token) return;
    let effects = actorUtils.getEffects(workflow.actor).filter(i => i.flags['chris-premades']?.mastery?.vex?.target === workflow.targets.tokens[0].id);
    if (effects.length) await genericUtils.deleteEmbeddedDocuments(workflow.actor, 'ActiveEffect', effects.map(i => i.id));
    if (!workflowUtils.isAttackType(workflow, 'weaponAttack')) return;
    let masterySetting = genericUtils.getCPRSetting('weaponMastery');
    let mastery;
    if (workflow.actor.type === 'npc') {
        if (masterySetting === 1) return;
        mastery = workflow.item.system.mastery;
    } else {
        if (masterySetting === 2) return;
        let identifier = genericUtils.getIdentifier(workflow.item);
        if (identifier === 'psychicBlades') {
            mastery = 'vex';
        } else if (itemUtils.getItemByIdentifier(workflow.actor, 'fisticuffs') && workflow.item.system.type.value === 'improv') {
            mastery = 'sap';
        } else {
            let baseItem = workflow.item.system.type.baseItem;
            if (baseItem === '') return;
            if (!workflow.actor.system.traits?.weaponProf?.mastery?.value?.has(baseItem)) return;
            mastery = workflow.attackRoll.options.mastery;
        }
    }
    if (!mastery) return;
    let macro = custom.getMacro(mastery + 'Mastery', 'modern');
    if (!macro) return;
    try {
        await macro.masteryMacro({workflow});
    } catch (error) {
        console.error(error);
    }
}
async function combatEnd(combat) {
    await Promise.all(combat.combatants.map(async combatant => {
        if (!combatant.actor) return;
        await genericUtils.update(combatant.actor, {'flags.chris-premades.-=mastery': null});
    }));
}
export let masteries = {
    RollComplete,
    combatEnd
};
export let cleaveMastery = {
    name: 'Mastery: Cleave',
    version: '2.3.0',
    masteryMacro: cleave
};
export let grazeMastery = {
    name: 'Mastery: Graze',
    version: '2.3.0',
    masteryMacro: graze
};
export let pushMastery = {
    name: 'Mastery: Push',
    version: '2.3.0',
    masteryMacro: push
};
export let sapMastery = {
    name: 'Mastery: Sap',
    version: '2.3.0',
    masteryMacro: sap
};
export let slowMastery = {
    name: 'Mastery: Slow',
    version: '2.3.0',
    masteryMacro: slow
};
export let toppleMastery = {
    name: 'Mastery: Topple',
    version: '2.3.0',
    masteryMacro: topple
};
export let vexMastery = {
    name: 'Mastery: Vex',
    version: '2.3.0',
    masteryMacro: vex
};
