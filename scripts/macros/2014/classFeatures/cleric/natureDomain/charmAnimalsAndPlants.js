import {actorUtils, workflowUtils} from '../../../../../utils.js';
async function early({workflow}) {
    let validTargets = new Set(workflow.targets.tokens).filter(i => ['beast', 'plant'].includes(actorUtils.typeOrRace(i.actor)));
    await workflowUtils.updateTargets(workflow, validTargets);
}
export let charmAnimalsAndPlants = {
    name: 'Channel Divinity: Charm Animals and Plants',
    version: '2.3.0',
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
