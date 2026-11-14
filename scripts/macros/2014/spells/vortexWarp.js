import {Teleport} from '../../../lib/teleport.js';
import {animationUtils, itemUtils, workflowUtils} from '../../../utils.js';
async function use({trigger, workflow}) {
    let animation = itemUtils.getConfig(workflow.item, 'playAnimation') ? (animationUtils.jb2aCheck() === 'patreon' ? 'vortexWarp' : 'mistyStep') : 'none';
    if (!workflow.failedSaves.count) return;
    let range = 90 + (30 * (workflowUtils.getCastLevel(workflow) - 2));
    for (let i of workflow.failedSaves.tokens) {
        await Teleport.target([i], workflow.token, {title: workflow.item.name, range: range, animation: animation});
    }
}
export let vortexWarp = {
    name: 'Vortex Warp',
    version: '2.3.0',
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
    ]
};
