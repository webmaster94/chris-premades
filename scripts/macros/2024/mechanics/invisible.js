import {tokenUtils, workflowUtils} from '../../../utils.js';
async function attacked({trigger: {entity: effect}, workflow}) {
    if (effect.disabled) return;
    if (!workflow.targets.count || !workflowUtils.isAttackType(workflow, 'attack') || !workflow.token) return;
    if (tokenUtils.canSense(workflow.targets.tokens[0], workflow.token, ['feelTremor', 'seeInvisbility', 'blindsight', 'seeAll', 'senseAll', 'senseInvisibility'])) return;
    workflow.tracker.disadvantage.add(effect.name, effect.name);
}
async function attacking({trigger: {entity: effect}, workflow}) {
    if (effect.disabled) return;
    if (!workflow.targets.count || !workflowUtils.isAttackType(workflow, 'attack') || !workflow.token) return;
    if (tokenUtils.canSense(workflow.targets.tokens[0], workflow.token, ['feelTremor', 'seeInvisbility', 'blindsight', 'seeAll', 'senseAll', 'senseInvisibility'])) return;
    workflow.tracker.advantage.add(effect.name, effect.name);
}
export let invisible = {
    name: 'Invisible',
    version: '2.3.0',
    rules: 'modern',
    midi: {
        actor: [
            {
                pass: 'targetPreAttackRollConfig',
                macro: attacked,
                priority: 50
            },
            {
                pass: 'preAttackRollConfig',
                macro: attacking,
                priority: 50
            }
        ]
    }
};
