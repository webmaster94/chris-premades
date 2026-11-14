import {actorUtils} from '../../../utils.js';
async function use({trigger, workflow}) {
    if (!workflow.failedSaves.count) return;
    await Promise.all(workflow.failedSaves.tokens.map(async token => {
        await actorUtils.setReactionUsed(token.actor);
    }));
}
export let armsOfHadar = {
    name: 'Arms of Hadar',
    version: '2.3.0',
    rules: 'modern',
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
