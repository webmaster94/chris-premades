import {combatUtils, workflowUtils} from '../../../../../utils.js';
async function attack({trigger: {entity: item}, workflow}) {
    if (!workflow.targets.count || !combatUtils.inCombat() || !workflowUtils.isAttackType(workflow, 'weaponAttack')) return;
    if (game.combat.round != 1) return;
    if (workflow.token.document.combatant.initiative <= workflow.targets.tokens[0].document.combatant.initiative) return;
    workflow.tracker.advantage.add(item.name, item.name);
    await workflowUtils.syntheticItemRoll(item, []);
}
export let assassinate = {
    name: 'Assassinate',
    version: '2.3.0',
    rules: 'modern',
    midi: {
        actor: [
            {
                pass: 'preAttackRollConfig',
                macro: attack,
                priority: 50
            }
        ]
    }
};
