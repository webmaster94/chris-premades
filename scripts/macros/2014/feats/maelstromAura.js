import {activityUtils, compendiumUtils, constants, effectUtils, genericUtils, itemUtils, workflowUtils} from '../../../utils.js';

async function use({workflow}) {
    let effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        duration: itemUtils.convertDuration(workflow.activity),
        origin: workflow.item.uuid,
        system: {
            changes: [
                {
                    key: 'system.traits.dr.value',
                    type: 'add',
                    value: 'lightning',
                    priority: 20
                },
                {
                    key: 'system.traits.dr.value',
                    type: 'add',
                    value: 'thunder',
                    priority: 20
                },
                {
                    key: 'flags.midi-qol.grants.disadvantage.attack.all',
                    type: 'custom',
                    value: 1,
                    priority: 20
                }
            ]
        },
        flags: {
            dae: {
                specialDuration: [
                    'zeroHP',
                    'turnStartSource'
                ]
            }
        }
    };
    effectUtils.addMacro(effectData, 'combat', ['maelstromAura']);
    await effectUtils.createEffect(workflow.actor, effectData);
}
async function turnStart({trigger: {entity: effect, token, target}}) {
    let originItem = await effectUtils.getOriginItem(effect);
    if (!originItem) return;
    let feature = activityUtils.getActivityByIdentifier(originItem, 'maelstromAuraSave', {strict: true});
    if (!feature) return;
    await workflowUtils.syntheticActivityRoll(feature, [target]);
}
export let maelstromAura = {
    name: 'Soul of the Storm Giant: Maelstrom Aura',
    version: '1.1.0',
    midi: {
        item: [
            {
                pass: 'rollFinished',
                macro: use,
                priority: 50,
                activities: ['maelstromAura']
            }
        ]
    },
    combat: [
        {
            pass: 'turnStartNear',
            macro: turnStart,
            priority: 50,
            distance: 10,
            disposition: 'enemy'
        }
    ]
};