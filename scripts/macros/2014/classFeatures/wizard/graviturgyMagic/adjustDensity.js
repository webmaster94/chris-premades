import {actorUtils, itemUtils, workflowUtils} from '../../../../../utils.js';
async function early({trigger, workflow}) {
    if (!workflow.targets.count) return;
    let classIdentifier = itemUtils.getConfig(workflow, 'classIdentifier');
    let levels = workflow.actor.classes[classIdentifier]?.system?.levels;
    if (!levels) return;
    let maxSize = levels >= 10 ? 4 : 3;
    if (actorUtils.getSize(workflow.targets.tokens[0].actor, false) <= maxSize) return;
    await workflowUtils.updateTargets(workflow, []);
}
export let adjustDensity = {
    name: 'Adjust Density',
    version: '2.3.0',
    rules: 'legacy',
    midi: {
        item: [
            {
                pass: 'preTargeting',
                macro: early,
                priority: 50
            }
        ]
    },
    config: [
        {
            value: 'classIdentifier',
            label: 'CHRISPREMADES.Config.ClassIdentifier',
            type: 'text',
            default: 'wizard',
            category: 'homebrew',
            homebrew: true
        }
    ]
};
