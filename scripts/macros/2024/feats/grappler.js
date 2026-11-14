import {constants, activityUtils, combatUtils, dialogUtils, effectUtils, genericUtils, workflowUtils} from '../../../utils.js';
async function early({trigger: {entity: item}, workflow}) {
    if (!workflowUtils.isAttackType(workflow, 'attack')) return;
    if (!workflow.targets.count) return;
    let grapplingEffects = effectUtils.getAllEffectsByIdentifier(workflow.actor, 'grappling');
    if (!grapplingEffects.length) return;
    if (!grapplingEffects.some(i => i.flags['chris-premades'].grapple.tokenId === workflow.targets.tokens[0]?.id)) return;
    workflow.tracker.advantage.add(item.name, item.name);
}

async function hit({trigger: {entity: item}, workflow}) {
    if (!workflowUtils.isAttackType(workflow, 'attack')) return;
    if (workflow.hitTargets.count !== 1) return;
    if (!combatUtils.perTurnCheck(item, 'grappler')) return;
    let unarmedStrikeItem = workflow.item;
    if (!constants.unarmedAttacks.includes(genericUtils.getIdentifier(unarmedStrikeItem))) return;
    let targetToken = workflow.targets.tokens[0];
    let selection = await dialogUtils.confirm(unarmedStrikeItem.name, genericUtils.format('CHRISPREMADES.Macros.Grappler.Grapple', {tokenName: targetToken.name}));
    if (!selection) return;
    let grappleActivity = activityUtils.getActivityByIdentifier(unarmedStrikeItem, 'grapple', {strict: true});
    if (!grappleActivity) return;
    await combatUtils.setTurnCheck(item, 'grappler');
    await workflowUtils.syntheticActivityRoll(grappleActivity, [targetToken]);
}

export let grappler = {
    name: 'Grappler',
    version: '2.3.0',
    rules: 'modern',
    midi: {
        actor: [
            {
                pass: 'preAttackRollConfig',
                macro: early,
                priority: 50
            },
            {
                pass: 'rollFinished',
                macro: hit,
                priority: 50
            }
        ]
    }
};
