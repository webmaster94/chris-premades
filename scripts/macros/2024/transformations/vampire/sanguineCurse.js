import {genericUtils} from '../../../../utils.js';
async function use({trigger, workflow}) {
    if (!workflow.hitTargets.count) return;
    await Promise.all(workflow.hitTargets.tokens.map(async token => {
        await genericUtils.update(token.actor, {'system.attributes.exhaustion': token.actor.system.attributes.exhaustion + 1});
    }));
}
export let sanguineCurse = {
    name: 'Stage 1 Flaw: The Sanguine Curse',
    version: '2.3.0',
    rules: 'modern',
    midi: {
        item: [
            {
                pass: 'rollFinished',
                macro: use,
                priority: 50,
                activities: ['feed']
            }
        ]
    }
};
