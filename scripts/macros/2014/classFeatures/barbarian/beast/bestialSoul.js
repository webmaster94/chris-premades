import {dialogUtils, effectUtils, genericUtils} from '../../../../../utils.js';

async function use({workflow}) {
    if (effectUtils.getEffectByIdentifier(workflow.actor, 'bestialSoul')) {
        genericUtils.notify('CHRISPREMADES.Macros.BestialSoul.Already', 'info');
        return;
    }
    let selection = await dialogUtils.buttonDialog(workflow.item.name, 'CHRISPREMADES.Macros.BestialSoul.Form', [
        ['CHRISPREMADES.Macros.BestialSoul.Climbing', 'climb'],
        ['CHRISPREMADES.Macros.BestialSoul.Jumping', 'jump'],
        ['CHRISPREMADES.Macros.BestialSoul.Swimming', 'swim']
    ]);
    if (!selection) return;
    let effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        origin: workflow.item.uuid,
        duration: {
            value: 604800,
            units: 'seconds'
        },
        start: {
            time: game.time?.worldTime ?? 0
        },
        flags: {
            dae: {
                specialDuration: [
                    'longRest',
                    'shortRest'
                ]
            }
        }
    };
    if (selection !== 'jump') {
        effectData.system = {
            changes: [
                {
                    key: 'system.attributes.movement.' + selection,
                    type: 'upgrade',
                    value: '@attributes.movement.walk',
                    priority: 20
                }
            ]
        };
    }
    await effectUtils.createEffect(workflow.actor, effectData, {identifier: 'bestialSoul'});
}
export let bestialSoul = {
    name: 'Bestial Soul',
    version: '1.1.0',
    midi: {
        item: [
            {
                pass: 'rollFinished',
                macro: use,
                priority: 50
            }
        ]
    }
};