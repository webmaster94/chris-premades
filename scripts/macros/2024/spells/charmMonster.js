import {combatUtils, constants, effectUtils} from '../../../utils.js';
async function early({trigger, workflow}) {
    if (!workflow.targets.count) return;
    await Promise.all(workflow.targets.tokens.map(async token => {
        if (combatUtils.inCombat()) await effectUtils.createEffect(token.actor, constants.advantageEffectData);
    }));
}
export let charmMonster = {
    name: 'Charm Monster',
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
