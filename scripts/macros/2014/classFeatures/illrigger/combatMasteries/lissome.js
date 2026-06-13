import {effectUtils, genericUtils, workflowUtils} from '../../../../../utils.js';
async function attack({trigger: {entity: item}, workflow}) {
    if (!workflow.activity || !workflow.hitTargets.size) return;
    if (!workflowUtils.isAttackType(workflow, 'meleeAttack')) return;
    let effect = effectUtils.getEffectByIdentifier(workflow.actor, 'combatMasteryLissomeEffect');
    if (effect && !effect.duration?.expired && !effect.disabled) return;
    let sourceEffect = item.effects.contents?.[0];
    if (!sourceEffect) return;
    let effectData = genericUtils.duplicate(sourceEffect.toObject());
    effectData.duration = {value: 1, units: 'seconds'};
    effectData.start = {time: game.time?.worldTime ?? 0};
    await effectUtils.createEffect(workflow.actor, effectData);
}
export let combatMasteryLissome = {
    name: 'Combat Mastery: Lissome',
    aliases: ['Lissome'],
    version: '1.3.66',
    rules: 'legacy',
    midi: {
        actor: [
            {
                pass: 'rollFinished',
                macro: attack,
                priority: 50
            }
        ]
    }
};