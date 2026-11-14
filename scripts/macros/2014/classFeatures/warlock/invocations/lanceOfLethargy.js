import {activityUtils, combatUtils, dialogUtils, genericUtils, workflowUtils} from '../../../../../utils.js';
async function late({trigger: {entity: item}, workflow}) {
    if (!workflow.hitTargets.count || !item.system.uses.value || !workflow.token) return;
    if (activityUtils.getIdentifier(workflow.activity) !== 'eldritchBlastBeam' || !combatUtils.isOwnTurn(workflow.token)) return;
    let targetToken = workflow.targets.tokens[0];
    let selection = await dialogUtils.confirm(item.name, genericUtils.format('CHRISPREMADES.Dialog.UseOn', {itemName: item.name, tokenName: targetToken.name}));
    if (!selection) return;
    await workflowUtils.syntheticItemRoll(item, [workflow.targets.tokens[0]], {consumeResources: combatUtils.inCombat()});
}
export let lanceOfLethargy = {
    name: 'Eldritch Invocations: Lance of Lethargy',
    version: '2.3.0',
    midi: {
        actor: [
            {
                pass: 'rollFinished',
                macro: late,
                priority: 450
            }
        ]
    }
};
