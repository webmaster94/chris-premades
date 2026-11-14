import {effectUtils, genericUtils, workflowUtils} from '../../../../../utils.js';
async function attack({trigger: {entity: item}, workflow}) {
    if (!workflowUtils.isAttackType(workflow, 'attack') || !workflow.actor || !workflow.targets.count) return;
    let effect = effectUtils.getEffectByIdentifier(workflow.targets.tokens[0].actor, 'balefulInterdictEffect');
    if (!effect || effect.duration?.expired || effect.disabled) return;
    let sourceEffect = item.effects.contents?.[0];
    if (!sourceEffect) return;
    let effectData = genericUtils.duplicate(sourceEffect.toObject());
    effectData.duration = {value: 1, units: 'seconds'};
    effectData.start = {time: game.time?.worldTime ?? 0};
    effectData.origin = sourceEffect.uuid;
    await effectUtils.createEffect(workflow.targets.tokens[0].actor, effectData, {animate: false});
}
export let dispatersSupremacy = {
    name: 'Dispater\'s Interdiction: Dispater\'s Supremacy (Passive)',
    aliases: ['Dispater\'s Supremacy', 'Dispater\'s Interdiction: Dispater\'s Supremacy'],
    version: '2.3.0',
    midi: {
        actor: [
            {
                pass: 'preambleComplete',
                macro: attack,
                priority: 50
            }
        ]
    }
};
