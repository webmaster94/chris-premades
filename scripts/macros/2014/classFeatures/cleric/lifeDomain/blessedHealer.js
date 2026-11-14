import {activityUtils, genericUtils, itemUtils, workflowUtils} from '../../../../../utils.js';
async function heal({trigger: {entity: item}, workflow}) {
    if (!workflow.targets.count || !workflow.item || !workflow.damageRolls) return;
    if (!(workflow.item.type === 'spell' || workflow.item.system.type?.value === 'spellfeature')) return;
    let castData = workflow.castData ?? itemUtils.getSavedCastData(workflow.item);
    if (!castData?.castLevel) return;
    if (!workflowUtils.getDamageTypes(workflow.damageRolls).has('healing')) return;
    if (workflow.targets.count === 1 && workflow.targets.tokens[0].document.uuid === workflow.token.document.uuid) return;
    let feature = activityUtils.getActivityByIdentifier(item, 'blessedHealer', {strict: true});
    if (!feature) return;
    let activityData = activityUtils.withChangedDamage(feature, 2 + castData.castLevel);
    await workflowUtils.syntheticActivityDataRoll(activityData, item, item.actor, [workflow.token]);
}
export let blessedHealer = {
    name: 'Blessed Healer',
    version: '2.3.0',
    midi: {
        actor: [
            {
                pass: 'rollFinished',
                macro: heal,
                priority: 250
            }
        ]
    }
};
