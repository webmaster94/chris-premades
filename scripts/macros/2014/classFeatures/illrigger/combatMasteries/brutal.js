import {actorUtils, dialogUtils, tokenUtils, workflowUtils} from '../../../../../utils.js';
async function attack({trigger: {entity: item}, workflow}) {
    if (!workflow.token || !workflow.hitTargets.count || !workflow.activity) return;
    if (!workflowUtils.isAttackType(workflow, 'meleeAttack')) return;
    if (workflow.attackMode != 'twoHanded') return;
    if (actorUtils.getSize(workflow.actor, false) + 1 < actorUtils.getSize(workflow.targets.tokens[0].actor, false)) return;
    let selection = await dialogUtils.confirmUseItem(item);
    if (!selection) return;
    await tokenUtils.pushToken(workflow.token, workflow.targets.tokens[0], 5);
}
export let combatMasteryBrutal = {
    name: 'Combat Mastery: Brutal',
    aliases: ['Brutal'],
    version: '2.3.0',
    rules: 'legacy',
    midi: {
        actor: [
            {
                pass: 'rollFinished',
                macro: attack,
                priority: 300
            }
        ]
    }
};
