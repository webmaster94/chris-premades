import {actorUtils, combatUtils, constants, effectUtils} from '../../../utils.js';
async function early({trigger, workflow}) {
    if (!workflow.targets.count) return;
    await Promise.all(workflow.targets.tokens.map(async token => {
        if (actorUtils.typeOrRace(token.actor) != 'humanoid') {
            await effectUtils.createEffect(token.actor, constants.immuneEffectData);
            return;
        }
        if (combatUtils.inCombat()) await effectUtils.createEffect(token.actor, constants.advantageEffectData);
    }));

}
export let charmPerson = {
    name: 'Charm Person',
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
