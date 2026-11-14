import {actorUtils, effectUtils} from '../../../../../utils.js';
async function use({trigger, workflow}) {
    await Promise.all(workflow.failedSaves.tokens.map(async token => {
        if (!actorUtils.checkTrait(token.actor, 'ci', 'prone') && !effectUtils.getEffectByStatusID(token.actor, 'prone') && actorUtils.getSize(workflow.targets.tokens[0].actor, false) <= 3) await effectUtils.applyConditions(token.actor, ['prone']);
    }));
}
export let shieldBash = {
    name: 'Shield Bash',
    version: '2.3.0',
    midi: {
        item: [
            {
                pass: 'rollFinished',
                macro: use,
                priority: 50
            }
        ]
    },
    monster: {
        names: ['Hobgoblin Warlord']
    }
};
