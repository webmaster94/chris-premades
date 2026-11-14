import {effectUtils, genericUtils, itemUtils, workflowUtils} from '../../../../utils.js';
async function attack({trigger: {entity: item}, workflow}) {
    if (!workflowUtils.isAttackType(workflow, 'attack') || workflow.hitTargets.count) return;
    await workflowUtils.syntheticItemRoll(item, [workflow.targets.tokens[0]]);
    let sourceEffect = item.effects.contents?.[0];
    if (!sourceEffect) return;
    let effectData = genericUtils.duplicate(sourceEffect.toObject());
    effectData.origin = sourceEffect.uuid;
    effectData.changes[0].value = 'workflow.token.id === "' + workflow.token.id + '"';
    await effectUtils.createEffect(workflow.targets.tokens[0].actor, effectData);
}
export let studiedAttacks = {
    name: 'Studied Attacks',
    version: '2.3.0',
    rules: 'modern',
    midi: {
        actor: [
            {
                pass: 'post',
                macro: attack,
                priority: 200
            }
        ]
    }
};
