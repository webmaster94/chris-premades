import {activityUtils, genericUtils, itemUtils} from '../../../utils.js';
async function use({trigger, workflow}) {
    if (!workflow.targets.count) return;
    let validTargets = new Set(workflow.targets.tokens).filter(i => i.actor.system.attributes.hp.value < i.actor.system.attributes.hp.effectiveMax);
    if (!validTargets.size) return;
    let formula = itemUtils.getConfig(workflow.item, 'formula');
    let activityData = activityUtils.withChangedDamage(workflow.activity, formula);
    workflow.item = itemUtils.cloneItem(workflow.item, {
        ['system.activities.' + workflow.activity.id]: activityData
    });
    workflow.activity = workflow.item.system.activities.get(workflow.activity.id);
}
export let tollTheDead = {
    name: 'Toll the Dead',
    version: '2.3.0',
    midi: {
        item: [
            {
                pass: 'preambleComplete',
                macro: use,
                priority: 50
            }
        ]
    },
    config: [
        {
            value: 'formula',
            label: 'CHRISPREMADES.Config.Formula',
            type: 'text',
            default: 'd12',
            homebrew: true,
            category: 'homebrew'
        }
    ]
};
