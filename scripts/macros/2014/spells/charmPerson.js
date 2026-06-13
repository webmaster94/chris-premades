import {combatUtils, constants, effectUtils, genericUtils} from '../../../utils.js';
import {upcastTargets} from '../../generic/upcastTargets.js';
async function early({workflow}) {
    await upcastTargets.plusOne({workflow});
    if (!workflow.targets.size) return;
    if (!combatUtils.inCombat()) return;
    let effectData = {
        name: genericUtils.translate('CHRISPREMADES.GenericEffects.ConditionAdvantage'),
        img: constants.tempConditionIcon,
        origin: workflow.item.uuid,
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
                    key: 'flags.midi-qol.advantage.save.all',
                    value: 1,
                    type: 'override',
                    priority: 120
                }
            ]
        },
        flags: {
            dae: {
                specialDuration: [
                    'isSave'
                ]
            },
            'chris-premades': {
                effect: {
                    noAnimation: true
                }
            }
        }
    };
    for (let target of workflow.targets) {
        await effectUtils.createEffect(target.actor, effectData);
    }
}
export let charmPerson = {
    name: 'Charm Person',
    version: '1.1.32',
    midi: {
        item: [
            {
                pass: 'preambleComplete',
                macro: early,
                priority: 50
            }
        ]
    }
};