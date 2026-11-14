import {workflowUtils} from '../../../utils.js';

async function use({workflow}) {
    await workflowUtils.handleInstantTemplate(workflow);
}

export let sprayOfCards = {
    name: 'Spray of Cards',
    version: '2.3.0',
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
