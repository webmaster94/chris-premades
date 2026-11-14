import {workflowUtils} from '../../../../../utils.js';
async function rest({trigger: {entity: item}}) {
    await workflowUtils.completeItemUse(item);
}
export let aspectOfTheWilds = {
    name: 'Aspect of the Wilds',
    version: '2.3.0',
    rules: 'modern',
    rest: [
        {
            pass: 'long',
            macro: rest,
            priority: 50
        }
    ]
};
