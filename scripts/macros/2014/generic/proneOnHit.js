import {actorUtils, effectUtils} from '../../../utils.js';
async function late({trigger, workflow}) {
    await Promise.all(workflow.targets.tokens.map(async token => {
        if (!actorUtils.checkTrait(token.actor, 'ci', 'prone') && !effectUtils.getEffectByStatusID(token.actor, 'prone')) await effectUtils.applyConditions(token.actor, ['prone']);
    }));
}
export let proneOnHit = {
    name: 'Prone On Hit',
    version: '2.3.0',
    midi: {
        item: [
            {
                pass: 'rollFinished',
                macro: late,
                priority: 50
            }
        ]
    }
};
