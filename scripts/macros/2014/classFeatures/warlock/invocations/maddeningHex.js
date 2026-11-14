import {tokenUtils, workflowUtils} from '../../../../../utils.js';

async function use({workflow}) {
    if (workflow.targets.count !== 1) return;
    let targets = tokenUtils.findNearby(workflow.targets.tokens[0], 5, 'ally');
    if (!targets.length) return;
    let defaultDamageType = workflow.defaultDamageType;
    await workflowUtils.applyDamage(targets, workflow.damageTotal, defaultDamageType);
}
export let maddeningHex = {
    name: 'Eldritch Invocations: Maddening Hex',
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
