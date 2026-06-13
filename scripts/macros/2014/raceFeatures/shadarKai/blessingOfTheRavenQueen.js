import {Teleport} from '../../../../lib/teleport.js';
import {animationUtils, effectUtils, itemUtils} from '../../../../utils.js';

async function use({workflow}) {
    let playAnimation = await itemUtils.getConfig(workflow.item, 'playAnimation') && animationUtils.jb2aCheck();
    await Teleport.target(workflow.token, workflow.token, {
        animation: playAnimation ? 'mistyStep' : 'none',
        range: 30
    });
    if (workflow.actor.system.details.level < 3) return;
    let effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        origin: workflow.item.uuid,
        duration: {
            value: 1,
            units: 'rounds'
        },
        start: {
            round: game.combat?.round ?? 0,
            turn: game.combat?.turn ?? 0
        },
        system: {
            changes: [
                {
                    key: 'system.traits.dr.all',
                    type: 'custom',
                    value: 1,
                    priority: 20
                }
            ]
        },
        flags: {
            dae: {
                specialDuration: [
                    'turnStartSource'
                ]
            }
        }
    };
    if (playAnimation) effectData.system.changes.push({
        key: 'macro.tokenMagic',
        type: 'custom',
        value: 'fog',
        priority: 20
    });
    await effectUtils.createEffect(workflow.actor, effectData);
}
export let blessingOfTheRavenQueen = {
    name: 'Blessing of the Raven Queen',
    version: '1.1.0',
    hasAnimation: true,
    midi: {
        item: [
            {
                pass: 'rollFinished',
                macro: use,
                priority: 50
            }
        ]
    },
    config: [
        {
            value: 'playAnimation',
            label: 'CHRISPREMADES.Config.PlayAnimation',
            type: 'checkbox',
            default: true,
            category: 'animation'
        }
    ],
    ddbi: {
        removedItems: {
            'Blessing of the Raven Queen': [
                'Blessing of the Raven Queen (Resistance)'
            ]
        }
    }
};