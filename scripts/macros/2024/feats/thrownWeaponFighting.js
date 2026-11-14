import {itemUtils, workflowUtils} from '../../../utils.js';
async function damage({trigger: {entity: item}, workflow}) {
    if (!workflow.hitTargets.count || !workflowUtils.isAttackType(workflow, 'rangedAttack') || !workflow.item.system.properties?.has('thr')) return;
    let bonus = itemUtils.getConfig(item, 'formula');
    await workflowUtils.bonusDamage(workflow, bonus);
}
export let thrownWeaponFighting = {
    name: 'Thrown Weapon Fighting',
    version: '2.3.0',
    rules: 'modern',
    midi: {
        actor: [
            {
                pass: 'damageRollComplete',
                macro: damage,
                priority: 200
            }
        ]
    },
    config: [
        {
            value: 'formula',
            label: 'CHRISPREMADES.Config.Formula',
            type: 'text',
            default: '2',
            homebrew: true,
            category: 'homebrew'
        }
    ]
};
