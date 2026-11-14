import {workflowUtils} from '../../../utils.js';
async function early({workflow}) {
    if (!workflow.targets.count) return;
    await workflowUtils.updateTargets(workflow, new Set(workflow.targets.tokens).filter(i => i.actor.system.abilities.int.value > 2));
}
async function use({workflow}) {
    await workflowUtils.handleInstantTemplate(workflow);
}
export let synapticStatic = {
    name: 'Synaptic Static',
    version: '2.3.0',
    midi: {
        item: [
            {
                pass: 'rollFinished',
                macro: use,
                priority: 50
            },
            {
                pass: 'preambleComplete',
                macro: early,
                priority: 50
            }
        ]
    }
};
