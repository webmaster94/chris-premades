import {actorUtils, workflowUtils} from '../../../../../utils.js';
async function early({workflow}) {
    let validTypes = ['fey', 'fiend'];
    await workflowUtils.updateTargets(workflow, new Set(workflow.targets.tokens).filter(i => validTypes.includes(actorUtils.typeOrRace(i.actor))));
}
export let turnTheFaithless = {
    name: 'Channel Divinity: Turn the Faithless',
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
