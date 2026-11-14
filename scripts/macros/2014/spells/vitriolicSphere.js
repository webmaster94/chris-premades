import {workflowUtils} from '../../../utils.js';

async function use({workflow}) {
    await workflowUtils.handleInstantTemplate(workflow);
}
export let vitriolicSphere = {
    name: 'Vitriolic Sphere',
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
