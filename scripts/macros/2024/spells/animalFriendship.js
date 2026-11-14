import {actorUtils, constants, effectUtils, genericUtils} from '../../../utils.js';
async function early({trigger, workflow}) {
    if (!workflow.targets.count) return;
    await Promise.all(workflow.targets.tokens.map(async token => {
        if (actorUtils.typeOrRace(token.actor) === 'beast') return;
        await effectUtils.createEffect(token.actor, constants.immuneEffectData);
    }));
}
export let animalFriendship = {
    name: 'Animal Friendship',
    version: '2.3.0',
    rules: 'modern',
    midi: {
        item: [
            {
                pass: 'preambleComplete',
                macro: early,
                priority: 50
            }
        ]
    }
};
