import {constants, dialogUtils, effectUtils, genericUtils, itemUtils, workflowUtils} from '../../../../utils.js';
async function hit({trigger: {entity: item}, workflow}) {
    if (!workflow.hitTargets.count) return;
    if (!itemUtils.canUse(item)) return;
    if (!workflowUtils.isAttackType(workflow, 'weaponAttack')) return;
    let martialArts = itemUtils.getItemByIdentifier(workflow.actor, 'martialArts');
    if (!martialArts) return;
    let validateWeaponType = itemUtils.getConfig(martialArts, 'validateWeaponType');
    if (validateWeaponType) {
        let isNatural = workflow.item.system.type.value === 'natural';
        let isUnarmed = constants.unarmedAttacks.includes(genericUtils.getIdentifier(workflow.item));
        if (!isUnarmed && isNatural) return;
        if (['martialM', 'martialR'].includes(workflow.item.system.type.value) && !workflow.item.system.properties.has('lgt')) return;
    }
    let selection = await dialogUtils.confirmUseItem(item);
    if (!selection) return;
    await workflowUtils.syntheticItemRoll(item, [workflow.hitTargets.tokens[0]], {consumeResources: true, consumeUsage: true});
}
async function use({trigger, workflow}) {
    if (workflow.failedSaves.count) return;
    let stunningStrikeSlow = itemUtils.getEffectByIdentifier(workflow.item, 'stunningStrikeSlow');
    let stunningStrikeAdvantage = itemUtils.getEffectByIdentifier(workflow.item, 'stunningStrikeAdvantage');
    if (!stunningStrikeSlow || !stunningStrikeAdvantage) return;
    let stunningStrikeAdvantageData = genericUtils.duplicate(stunningStrikeAdvantage.toObject());
    let stunningStrikeSlowData = genericUtils.duplicate(stunningStrikeSlow.toObject());
    stunningStrikeAdvantageData.origin = stunningStrikeAdvantage.uuid;
    stunningStrikeSlowData.origin = stunningStrikeSlow.uuid;
    stunningStrikeSlowData.duration = itemUtils.convertDuration(workflow.activity);
    stunningStrikeAdvantageData.duration = itemUtils.convertDuration(workflow.activity);
    await Promise.all(workflow.targets.tokens.map(async token => {
        if (workflow.failedSaves.has(token)) return;
        await effectUtils.createEffects(token.actor, [stunningStrikeAdvantageData, stunningStrikeSlowData], [{}, {}]);
    }));
}
async function added({trigger: {entity: item}}) {
    await itemUtils.correctActivityItemConsumption(item, ['use'], 'monksFocus');
}
export let stunningStrike = {
    name: 'Stunning Strike',
    version: '2.3.0',
    rules: 'modern',
    midi: {
        item: [
            {
                pass: 'rollFinished',
                macro: use,
                priority: 50
            }
        ],
        actor: [
            {
                pass: 'rollFinished',
                macro: hit,
                priority: 250
            }
        ]
    },
    item: [
        {
            pass: 'created',
            macro: added,
            priority: 55
        },
        {
            pass: 'itemMedkit',
            macro: added,
            priority: 55
        },
        {
            pass: 'actorMunch',
            macro: added,
            priority: 55
        }
    ]
};
