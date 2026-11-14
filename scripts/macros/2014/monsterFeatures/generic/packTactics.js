import {tokenUtils} from '../../../../utils.js';
async function early({trigger: {entity: item}, workflow}) {
    if (workflow.targets.count !== 1) return;
    let nearbyTargets = tokenUtils.findNearby(workflow.targets.tokens[0], 5, 'enemy').filter(i => i.document.uuid !== workflow.token.document.uuid);
    if (!nearbyTargets.length) return;
    workflow.tracker.advantage.add(item.name, item.name);
}
export let packTactics = {
    name: 'Pack Tactics',
    translation: 'CHRISPREMADES.Macros.PackTactics.Name',
    version: '2.3.0',
    midi: {
        actor: [
            {
                pass: 'preAttackRollConfig',
                macro: early,
                priority: 50
            }
        ]
    },
    isGenericFeature: true,
    genericConfig: []
};
