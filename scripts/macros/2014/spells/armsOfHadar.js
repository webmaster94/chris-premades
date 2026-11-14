import {actorUtils} from '../../../utils.js';

async function use({workflow}) {
    for (let target of workflow.failedSaves.tokens) {
        await actorUtils.setReactionUsed(target.actor);
    }
}
export let armsOfHadar = {
    name: 'Arms of Hadar',
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
