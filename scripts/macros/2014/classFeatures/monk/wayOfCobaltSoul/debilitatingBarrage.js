import {actorUtils, constants, dialogUtils, effectUtils, genericUtils, itemUtils, workflowUtils} from '../../../../../utils.js';
async function attack({trigger: {entity: item}, workflow}) {
    if (!workflow.hitTargets.count || !itemUtils.canUse(item)) return;
    let isUnarmed = constants.unarmedAttacks.includes(genericUtils.getIdentifier(workflow.item));
    if (!isUnarmed) return;
    let immuneEffect = effectUtils.getEffectByIdentifier(workflow.hitTargets.tokens[0].actor, 'debilitatingBarrageImmune');
    if (immuneEffect) return;
    let selection = await dialogUtils.confirmUseItem(item);
    if (!selection) return;
    await workflowUtils.syntheticItemRoll(item, [workflow.hitTargets.tokens[0]], {consumeResources: true, consumeUsage: true});
}
async function use({trigger, workflow}) {
    let damageType = await dialogUtils.selectDamageType(Object.keys(CONFIG.DND5E.damageTypes).filter(i => !['none', 'midi-none'].includes(i)), workflow.item.name, 'CHRISPREMADES.Generic.SelectDamageType');
    if (!damageType) return;
    let sourceEffect = await workflow.activity.effects[0]?.getEffect();
    if (!sourceEffect) return;
    let effectData = genericUtils.duplicate(sourceEffect.toObject());
    effectData.origin = sourceEffect.uuid;
    effectData.duration = itemUtils.convertDuration(workflow.activity);
    if (actorUtils.checkTrait(workflow.targets.tokens[0].actor, 'di', damageType)) return;
    if (actorUtils.checkTrait(workflow.targets.tokens[0].actor, 'dr', damageType)) {
        effectData.system.changes[0].key = 'system.traits.dr.value';
        effectData.system.changes[0].value = '-' + damageType;
    } else {
        effectData.system.changes[0].value = damageType;
    }
    genericUtils.setProperty(effectData, 'flags.chris-premades.debilitatingBarrage.damageType', damageType);
    let immuneEffect = await workflow.activity.effects[1]?.getEffect();
    if (!immuneEffect) return;
    let immuneEffectData = genericUtils.duplicate(immuneEffect.toObject());
    effectData.origin = immuneEffect.uuid;
    await effectUtils.createEffect(workflow.hitTargets.tokens[0].actor, effectData);
    await effectUtils.createEffect(workflow.hitTargets.tokens[0].actor, immuneEffectData);
}
async function hit({trigger, workflow}) {
    if (!workflow.hitTargets.count || !workflow.damageRolls) return;
    let damageTypes = workflowUtils.getDamageTypes(workflow.damageRolls);
    await Promise.all(workflow.hitTargets.tokens.map(async token => {
        let effect = effectUtils.getEffectByIdentifier(token.actor, 'debilitatingBarrageEffect');
        if (!effect) return;
        let damageType = effect.flags['chris-premades']?.debilitatingBarrage?.damageType;
        if (!damageType) return;
        if (!damageTypes.has(damageType)) return;
        await genericUtils.update(effect, {duration: {value: 1, units: 'turns'}, start: {round: game.combat?.round ?? 0, turn: game.combat?.turn ?? 0}});
    }));
}
async function added({trigger: {entity: item}}) {
    let monkItem = itemUtils.getItemByIdentifier(item.actor, 'ki') ?? itemUtils.getItemByIdentifier(item.actor, 'monksFocus');
    if (!monkItem) return;
    let identifier = genericUtils.getIdentifier(monkItem);
    await itemUtils.correctActivityItemConsumption(item, ['use'], identifier);
}
export let debilitatingBarrage = {
    name: 'Debilitating Barrage',
    version: '2.3.0',
    rules: 'legacy',
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
                pass: 'attackRollComplete',
                macro: attack,
                priority: 200
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
export let debilitatingBarrageEffect = {
    name: 'Debilitating Barrage: Effect',
    version: debilitatingBarrage.version,
    rules: debilitatingBarrage.rules,
    midi: {
        actor: [
            {
                pass: 'targetRollFinished',
                macro: hit,
                priority: 50
            }
        ]
    }
};
