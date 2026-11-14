import {actorUtils, effectUtils} from '../../../utils.js';
async function proneOnFailMacro({trigger, workflow}) {
    if (!workflow.failedSaves.count) return;
    await Promise.all(workflow.failedSaves.tokens.map(async token => {
        if (!actorUtils.checkTrait(token.actor, 'ci', 'prone') && !effectUtils.getEffectByStatusID(token.actor, 'prone')) await effectUtils.applyConditions(token.actor, ['prone']);
    }));
}
export let proneOnFail = {
    name: 'Prone On Fail',
    version: '2.3.0',
    midi: {
        item: [
            {
                pass: 'rollFinished',
                macro: proneOnFailMacro,
                priority: 50
            }
        ]
    }
};
