import {tokenUtils} from '../../../../../utils.js';
async function early({trigger: {entity: item}, workflow}) {
    if (workflow.targets.count !== 1 || !workflow.token) return;
    if (tokenUtils.getLightLevel(workflow.token) !== 'dark') return;
    let targetToken = workflow.targets.tokens[0];
    let validModes = Object.keys(targetToken.detectionModes).filter(j => !['lightPerception', 'basicSight', 'hearing'].includes(j));
    if (tokenUtils.canSense(targetToken, workflow.token, validModes)) return;
    workflow.tracker.advantage.add(item.name, item.name);
}
async function earlyTarget({trigger: {entity: item}, workflow}) {
    if (workflow.targets.count !== 1 || !workflow.token) return;
    let targetToken = workflow.targets.tokens[0];
    if (tokenUtils.getLightLevel(targetToken) !== 'dark') return;
    let validModes = Object.keys(workflow.token.detectionModes).filter(j => !['lightPerception', 'basicSight', 'hearing'].includes(j));
    if (tokenUtils.canSense(workflow.token, targetToken, validModes)) return;
    workflow.tracker.disadvantage.add(item.name, item.name);
}
export let umbralSight = {
    name: 'Umbral Sight',
    version: '2.3.0',
    midi: {
        actor: [
            {
                pass: 'preAttackRollConfig',
                macro: early,
                priority: 50
            },
            {
                pass: 'targetPreAttackRollConfig',
                macro: earlyTarget,
                priority: 50
            }
        ]
    }
};
