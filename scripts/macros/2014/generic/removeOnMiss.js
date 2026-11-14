import {genericUtils} from '../../../utils.js';

async function attack({trigger, workflow}) {
    if (workflow.targets.count !== 1) return;
    let isMiss = workflow.isFumble;
    let targetToken = workflow.targets.tokens[0];
    let attackTotal = workflow.attackTotal;
    if (targetToken.actor.system.attributes.ac.value > attackTotal) isMiss = true;
    if (isMiss) await genericUtils.remove(trigger.entity);
}
export let removeOnMiss = {
    name: 'Remove on Miss',
    version: '2.3.0',
    midi: {
        actor: [
            {
                pass: 'postAttackRoll',
                macro: attack,
                priority: 100
            }
        ]
    }
};
