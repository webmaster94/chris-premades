import {actorUtils} from '../../../utils.js';
async function use({trigger, workflow}) {
    if (!workflow.targets.count) return;
    for (let target of workflow.targets.tokens) {
        await actorUtils.giveHeroicInspiration(target.actor);
    }
}
export let purpleDragonRook = {
    name: 'Purple Dragon Rook',
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
    //ddbi: {
    //    removeChoices: [
    //        'Purple Dragon Rook'
    //    ]
    //}
};
