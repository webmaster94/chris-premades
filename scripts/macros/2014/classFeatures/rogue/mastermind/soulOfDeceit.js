import {rollUtils} from '../../../../../utils.js';
async function use({trigger, workflow}) {
    await rollUtils.contestedRoll({sourceToken: workflow.token, targetToken: workflow.targets.tokens[0], sourceRollType: 'skill', targetRollType: 'skill', sourceAbilities: ['dec'], targetAbilities: ['ins']});
}
export let soulOfDeceit = {
    name: 'Soul of Deceit',
    version: '2.3.0',
    rules: 'legacy',
    midi: {
        item: [
            {
                pass: 'rollFinished',
                macro: use,
                priority: 50
            }
        ]
    }
};
