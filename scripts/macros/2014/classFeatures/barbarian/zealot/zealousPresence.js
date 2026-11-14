import {dialogUtils, genericUtils, workflowUtils} from '../../../../../utils.js';

async function early({workflow}) {
    let maxTargets = 10;
    if (workflow.targets.count <= maxTargets) return;
    let oldTargets = Array.from(workflow.targets.tokens);
    let newTargets;
    let selection = await dialogUtils.selectTargetDialog(workflow.item.name, genericUtils.format('CHRISPREMADES.Macros.ZealousPresence.Select', {maxTargets}), oldTargets, {type: 'multiple', skipDeadAndUnconscious: true, maxAmount: maxTargets});
    if (!selection) {
        newTargets = oldTargets.slice(0, maxTargets);
    } else {
        newTargets = selection[0] ?? [];
    }
    await workflowUtils.updateTargets(workflow, newTargets);
}
export let zealousPresence = {
    name: 'Zealous Presence',
    version: '2.3.0',
    midi: {
        item: [
            {
                pass: 'preambleComplete',
                macro: early,
                priority: 20
            }
        ]
    }
};
