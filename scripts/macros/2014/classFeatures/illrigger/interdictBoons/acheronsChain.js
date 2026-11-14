import {itemUtils, tokenUtils} from '../../../../../utils.js';
async function pull({trigger, workflow}) {
    if (!workflow.failedSaves.count || !workflow.token) return;
    let distance = Math.min(tokenUtils.getDistance(workflow.token, workflow.failedSaves.tokens[0]) -5, 10);
    await tokenUtils.pushToken(workflow.token, workflow.failedSaves.tokens[0], -distance);
}
async function added({trigger: {entity: item}}) {
    await itemUtils.multiCorrectActivityItemConsumption(item, ['pull', 'grapple'], {
        0: 'balefulInterdict',
        1: 'interdictBoons'
    });
}
export let interdictBoonAcheronsChain = {
    name: 'Interdict Boons: Acheron\'s Chain',
    aliases: ['Acheron\'s Chain'],
    version: '2.3.0',
    rules: 'legacy',
    midi: {
        item: [
            {
                pass: 'rollFinished',
                macro: pull,
                priority: 50,
                activities: ['pull']
            }
        ]
    },
    item: [
        {
            pass: 'created',
            macro: added,
            priority: 50
        },
        {
            pass: 'itemMedkit',
            macro: added,
            priority: 50
        },
        {
            pass: 'actorMunch',
            macro: added,
            priority: 50
        }
    ]
};
