import {activityUtils, spellUtils} from '../../../../../utils.js';
async function added({trigger: {entity: item}}) {
    let summonFey = await spellUtils.getCompendiumSpell('summonFey', {identifier: true, rules: 'modern'});
    if (!summonFey) return;
    let activity = activityUtils.getActivityByIdentifier(item, 'summonFey', {strict: true});
    if (!activity) return;
    await activityUtils.correctSpellLink(activity, summonFey);
}
export let feyReinforcements  = {
    name: 'Fey Reinforcements',
    version: '2.3.0',
    rules: 'modern',
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
