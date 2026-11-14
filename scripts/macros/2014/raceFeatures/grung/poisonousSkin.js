import {activityUtils, constants, dialogUtils, genericUtils, workflowUtils} from '../../../../utils.js';
async function damage({trigger: {entity: item}, workflow}) {
    if (workflow.hitTargets.count !== 1) return;
    if (!workflowUtils.isAttackType(workflow, 'weaponAttack')) return;
    if (workflow.item.type !== 'weapon') return;
    if (!workflowUtils.getDamageTypes(workflow.damageRolls).has('piercing')) return;
    let selection = await dialogUtils.confirm(item.name, genericUtils.format('CHRISPREMADES.Dialog.Use', {itemName: item.name}));
    if (!selection) return;
    let feature = activityUtils.getActivityByIdentifier(item, 'grungPoison', {strict: true});
    if (!feature) return;
    await workflowUtils.syntheticActivityRoll(feature, [workflow.hitTargets.tokens[0]]);
}
export let poisonousSkin = {
    name: 'Poisonous Skin',
    version: '2.3.0',
    midi: {
        actor: [
            {
                pass: 'damageRollComplete',
                macro: damage,
                priority: 50
            }
        ]
    }
};
