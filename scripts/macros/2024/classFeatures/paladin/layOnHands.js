import {effectUtils, genericUtils} from '../../../../utils.js';
async function use({trigger, workflow}) {
    if (!workflow.targets.count) return;
    let poisoned = effectUtils.getEffectByStatusID(workflow.targets.tokens[0].actor, 'poisoned');
    if (poisoned) await genericUtils.remove(poisoned);
}
export let layOnHands = {
    name: 'Lay On Hands',
    aliases: ['Lay on Hands'],
    version: '2.3.0',
    rules: 'modern',
    midi: {
        item: [
            {
                pass: 'rollFinished',
                macro: use,
                priority: 50,
                activities: ['poison']
            }
        ]
    }
};
