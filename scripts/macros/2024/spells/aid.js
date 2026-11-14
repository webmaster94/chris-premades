import {effectUtils, itemUtils, workflowUtils} from '../../../utils.js';
async function use({trigger, workflow}) {
    if (!workflow.targets.count) return;
    let effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        duration: itemUtils.convertDuration(workflow.item),
        system: {changes: [
            {
                key: 'system.attributes.hp.tempmax',
                type: 'add',
                value: 5 * (workflowUtils.getCastLevel(workflow) - 1),
                priority: 20
            }
        ]},
        origin: workflow.item.uuid
    };
    await Promise.all(workflow.targets.tokens.map(async token => {
        await effectUtils.createEffect(token.actor, effectData);
    }));
}
export let aid = {
    name: 'Aid',
    version: '2.3.0',
    rules: 'modern',
    midi: {
        item: [
            {
                pass: 'damageRollComplete',
                macro: use,
                priority: 50
            }
        ]
    }
};
