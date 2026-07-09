import {dialogUtils, effectUtils, genericUtils, itemUtils} from '../../../utils.js';

async function useInfusion({workflow}) {
    let targetToken = workflow.targets.first() ?? workflow.token;
    let weapons = targetToken.actor.items.filter(i => i.type === 'weapon' && i.system.equipped);
    if (!weapons.length) {
        genericUtils.notify('CHRISPREMADES.Macros.HexWarrior.NoWeapons', 'info');
        return;
    }
    let selectedWeapon = await dialogUtils.selectDocumentDialog(workflow.item.name, 'CHRISPREMADES.Macros.SacredWeapon.SelectWeapon', weapons);
    if (!selectedWeapon) return;
    let buttons = [
        ['DND5E.DAMAGE.Type.Acid', 'acid', {image: 'icons/magic/acid/projectile-faceted-glob.webp'}],
        ['DND5E.DAMAGE.Type.Cold', 'cold', {image: 'icons/magic/air/wind-tornado-wall-blue.webp'}],
        ['DND5E.DAMAGE.Type.Fire', 'fire', {image: 'icons/magic/fire/beam-jet-stream-embers.webp'}],
        ['DND5E.DAMAGE.Type.Lightning', 'lightning', {image: 'icons/magic/lightning/bolt-blue.webp'}],
        ['DND5E.DAMAGE.Type.Poison', 'poison', {image: 'icons/magic/death/skull-poison-green.webp'}]
    ];
    let damageType = await dialogUtils.buttonDialog(workflow.item.name, 'CHRISPREMADES.Dialog.DamageType', buttons);
    if (!damageType) return;
    let enchantData = {
        name: workflow.item.name,
        img: workflow.item.img,
        origin: workflow.item.uuid,
        duration: itemUtils.convertDuration(workflow.activity),
        system: {
            changes: [
                {
                    key: 'name',
                    type: 'override',
                    value: '{} (' + workflow.item.name + ')',
                    priority: 20
                },
                {
                    key: 'system.damage.parts',
                    type: 'add',
                    value: JSON.stringify([['1d4', damageType]]),
                    priority: 20
                }
            ]
        }
    };
    await itemUtils.enchantItem(selectedWeapon, enchantData, {});
}
async function useResistance({workflow}) {
    let buttons = [
        ['DND5E.DAMAGE.Type.Acid', 'acid', {image: 'icons/magic/acid/projectile-faceted-glob.webp'}],
        ['DND5E.DAMAGE.Type.Cold', 'cold', {image: 'icons/magic/air/wind-tornado-wall-blue.webp'}],
        ['DND5E.DAMAGE.Type.Fire', 'fire', {image: 'icons/magic/fire/beam-jet-stream-embers.webp'}],
        ['DND5E.DAMAGE.Type.Lightning', 'lightning', {image: 'icons/magic/lightning/bolt-blue.webp'}],
        ['DND5E.DAMAGE.Type.Poison', 'poison', {image: 'icons/magic/death/skull-poison-green.webp'}]
    ];
    // TODO: verify this is intended, otherwise show all buttons
    buttons = buttons.filter(i => workflow.workflowOptions.damageDetail.some(j => j.type === i[1]));
    let damageType;
    if (buttons.length === 1) damageType = buttons[0][1];
    if (!damageType) damageType = await dialogUtils.buttonDialog(workflow.item.name, 'CHRISPREMADES.Dialog.DamageType', buttons);
    if (!damageType) return;
    let effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        origin: workflow.item.uuid,
        duration: {
            value: 1,
            units: 'seconds'
        },
        start: {
            time: game.time?.worldTime ?? 0
        },
        system: {
            changes: [
                {
                    key: 'system.traits.dr.value',
                    type: 'add',
                    value: damageType,
                    priority: 20
                }
            ]
        },
        flags: {
            dae: {
                specialDuration: ['1Reaction']
            }
        }
    };
    await effectUtils.createEffect(workflow.actor, effectData);
}
export let chromaticInfusion = {
    name: 'Gift of the Chromatic Dragon: Chromatic Infusion',
    version: '1.1.0',
    midi: {
        item: [
            {
                pass: 'rollFinished',
                macro: useInfusion,
                priority: 50
            }
        ]
    }
};
export let reactiveResistance = {
    name: 'Gift of the Chromatic Dragon: Reactive Resistance',
    version: '1.1.0',
    midi: {
        item: [
            {
                pass: 'rollFinished',
                macro: useResistance,
                priority: 50
            }
        ]
    }
};