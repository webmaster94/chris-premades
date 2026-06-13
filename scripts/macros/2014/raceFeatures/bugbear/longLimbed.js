import {effectUtils} from '../../../../utils.js';

async function turnStart({trigger: {entity: item}}) {
    let actor = item.actor;
    if (!actor) return;
    let effectData = {
        name: item.name,
        img: item.img,
        origin: item.uuid,
        duration: {
            value: 1,
            units: 'turns'
        },
        start: {
            round: game.combat?.round ?? 0,
            turn: game.combat?.turn ?? 0
        },
        system: {
            changes: [
                {
                    key: 'flags.midi-qol.range.mwak',
                    type: 'add',
                    value: 5,
                    priority: 20
                },
                {
                    key: 'flags.midi-qol.range.msak',
                    type: 'add',
                    value: 5,
                    priority: 20
                }
            ]
        },
        flags: {
            'chris-premades': {
                effect: {
                    noAnimation: true
                }
            }
        }
    };
    await effectUtils.createEffect(actor, effectData);
}
export let longLimbed = {
    name: 'Long-Limbed',
    version: '1.1.0',
    combat: [
        {
            pass: 'turnStart',
            macro: turnStart,
            priority: 50
        }
    ]
};