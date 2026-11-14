import {dialogUtils, itemUtils, workflowUtils} from '../../../../utils.js';
async function damage({workflow}) {
    let config = itemUtils.getGenericFeatureConfig(workflow.item, 'chooseDamageType');
    let activities = config.activities;
    if (activities?.length && !activities.includes(workflow.activity.id)) return;
    let damageTypes = config.damageTypes;
    let selection = await dialogUtils.selectDamageType(damageTypes, workflow.item.name, 'CHRISPREMADES.Generic.SelectDamageType');
    if (!selection) return;
    await workflowUtils.replaceDamage(workflow, workflow.damageRoll.formula, {damageType: selection, ignoreCrit: true});
}
function skipDNDPrompt(config, dialog) {
    const item = config.subject?.item;
    const binding = item?.flags?.['chris-premades']?.macros?.midi?.item ?? [];
    if (!binding.includes('chooseDamageType')) return;
    const selected = itemUtils.getGenericFeatureConfig(item, 'chooseDamageType');
    const activities = selected.activities ?? [];
    if (activities.length && !activities.includes(config.subject.id)) return;
    if ((selected.damageTypes?.length ?? 0) < 2) return;
    dialog.configure = false;
}
export let chooseDamageType = {
    name: 'Choose Damage',
    version: '2.3.0',
    midi: {
        item: [
            {
                pass: 'damageRollComplete',
                macro: damage,
                priority: 50
            }
        ]
    },
    isGenericFeature: true,
    genericConfig: [
        {
            value: 'activities',
            label: 'CHRISPREMADES.Config.Activities',
            type: 'activities',
            default: []
        },
        {
            value: 'damageTypes',
            label: 'CHRISPREMADES.Config.DamageTypes',
            type: 'damageTypes',
            default: []
        }
    ]
};
export {skipDNDPrompt};
