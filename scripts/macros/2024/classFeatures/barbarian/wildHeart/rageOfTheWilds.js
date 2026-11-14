import {actorUtils, tokenUtils, workflowUtils} from '../../../../../utils.js';
async function attack({trigger: {entity: item}, workflow}) {
    if (!workflow.targets.count || !workflowUtils.isAttackType(workflow, 'attack') || !workflow.token) return;
    let nearbyTargets = tokenUtils.findNearby(workflow.targets.tokens[0], 5, 'enemy', {includeIncapacitated: false}).filter(i => actorUtils.getEffects(i.actor).find(j => j.flags['chris-premades']?.rageOfTheWildsWolf)).filter(k => k.document.id != workflow.token.document.id);
    if (!nearbyTargets.length) return;
    workflow.tracker.advantage.add(item.name, item.name);
}
export let rageOfTheWilds = {
    name: 'Rage of the Wilds',
    version: '2.3.0',
    rules: 'modern'
};
export let rageOfTheWildsWolf = {
    name: rageOfTheWilds.name,
    version: rageOfTheWilds.version,
    rules: rageOfTheWilds.rules,
    midi: {
        actor: [
            {
                pass: 'scenePreAttackRollConfig',
                macro: attack,
                priority: 50
            }
        ]
    }
};
