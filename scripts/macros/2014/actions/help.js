import {combatUtils, effectUtils} from '../../../utils.js';
async function use({trigger, workflow}) {
    if (!workflow.targets.size) return;
    let targetToken = workflow.targets.first();
    let effectData;
    if (targetToken.document.disposition === workflow.token.document.disposition) {
        effectData = {
            name: workflow.item.name,
            img: workflow.item.img,
            origin: workflow.item.uuid,
            duration: {value: combatUtils.inCombat() ? 12 : 3600, units: 'seconds'}, start: {time: game.time?.worldTime ?? 0},
            system: {changes: [
                {
                    key: 'flags.midi-qol.advantage.ability.all',
                    type: 'custom',
                    value: 1,
                    priority: 20
                }
            ]},
            flags: {
                dae: {
                    specialDuration: [
                        'isSkill',
                        'turnStartSource'
                    ]
                }
            }
        };
    } else {
        effectData = {
            name: workflow.item.name,
            img: workflow.item.img,
            origin: workflow.item.uuid,
            duration: {value: 12, units: 'seconds'}, start: {time: game.time?.worldTime ?? 0},
            system: {changes: [
                {
                    key: 'flags.midi-qol.grants.advantage.attack.all',
                    type: 'custom',
                    value: 'workflow.token.document.id != "' + workflow.token.document.id + '"',
                    priority: 20
                }
            ]},
            flags: {
                dae: {
                    specialDuration: [
                        'turnStartSource'
                    ]
                },
                'chris-premades': {
                    specialDuration: [
                        'attackedByAnotherCreature'
                    ]
                }
            }
        };
    }
    await effectUtils.createEffect(targetToken.actor, effectData);
}
export let help = {
    name: 'Help',
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