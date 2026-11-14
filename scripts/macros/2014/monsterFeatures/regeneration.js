import {workflowUtils} from '../../../utils.js';

async function turnStart({trigger: {entity: item, token}}) {
    let actor = token.actor;
    if (!actor || actor.system.attributes.hp.value <= 0) return;
    await workflowUtils.completeItemUse(item);
}

export let regeneration = {
    name: 'Regeneration',
    version: '2.3.0',
    combat: [
        {
            pass: 'turnStart',
            macro: turnStart,
            priority: 50
        }
    ]
};
