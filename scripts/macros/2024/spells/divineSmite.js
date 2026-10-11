import {activityUtils, actorUtils, combatUtils, constants, dialogUtils, effectUtils, genericUtils, itemUtils, workflowUtils} from '../../../utils.js';
import {attackRiders} from '../../../lib/attackRiders.js';
async function hit(args) {
    await attackRiders.run(args.workflow, 'divineSmite', () => applyDamage(args));
}
async function manual(args) {
    return await attackRiders.manual(args, 'divineSmite', {modern: true});
}
async function applyDamage({trigger, workflow}) {
    if (!workflow.hitTargets.size || workflowUtils.getActionType(workflow) != 'mwak') return;
    let feature = trigger.entity;
    if (workflow.actor.type === 'npc' && feature.type === 'feat' && genericUtils.getIdentifier(feature) === 'divineSmite' && attackRiders.itemDamage(feature)) {
        if (!attackRiders.available(feature, workflow, 'divineSmite')) return;
        let selection = await dialogUtils.confirm(feature.name, genericUtils.format('CHRISPREMADES.Dialog.Use', {itemName: feature.name}));
        if (!selection) return;
        await workflowUtils.bonusDamage(workflow, attackRiders.itemDamage(feature), {damageType: itemUtils.getConfig(feature, 'damageType')});
        await attackRiders.applied(workflow, 'divineSmite');
        await attackRiders.spendUse(feature, {inCombatOnly: false});
        await feature.displayCard();
        return;
    }
    if (actorUtils.hasUsedBonusAction(workflow.actor)) return;
    if (!attackRiders.ownTurn(workflow.token)) return;
    let identifiers = [
        'divineSmite',
        'searingSmite',
        'thunderousSmite',
        'wrathfulSmite',
        'shiningSmite',
        'blindingSmite',
        'staggeringSmite',
        'banishingSmite',
        'wiltingSmite'
    ];
    let spells = actorUtils.getCastableSpells(workflow.actor).filter(i => identifiers.includes(genericUtils.getIdentifier(i)));
    // A granted free cast can remain available without slots, and slots remain usable after the free cast is spent.
    for (let item of workflow.actor.items) {
        if (item.type !== 'spell' || genericUtils.getIdentifier(item) !== 'divineSmite' || spells.includes(item)) continue;
        if (!attackRiders.hasUses(item) || (item.system.method === 'spell' && !item.system.prepared)) continue;
        if (attackRiders.linkedSmite(item) || (['spell', 'pact'].includes(item.system.method) && attackRiders.spellSlots(workflow.actor).some(([, slot]) => slot.level >= item.system.level))) spells.push(item);
    }
    spells.sort((a, b) => a.system.level - b.system.level);
    if (!spells.length) return;
    let selection = await dialogUtils.selectDocumentDialog(workflow.item.name, 'CHRISPREMADES.Macros.DivineSmite.Context', spells, {addNoneDocument: true});
    if (!selection) return;
    let identifier = genericUtils.getIdentifier(selection);
    let target = attackRiders.hitTarget(workflow);
    if (identifier === 'divineSmite') {
        let smite = await attackRiders.smiteFormula(selection, workflow.actor, target, {modern: true});
        if (!smite) return;
        let formula = smite.formula;
        if (workflow.actor.system.bonuses?.spell?.all?.damage) formula += ' + @bonuses.spell.all.damage';
        let refund = await attackRiders.consumeSmite(selection, workflow.actor, smite);
        try {
            await workflowUtils.bonusDamage(workflow, formula, {damageType: itemUtils.getConfig(selection, 'damageType')});
        } catch (error) {
            await refund();
            throw error;
        }
        await attackRiders.applied(workflow, 'divineSmite');
        await actorUtils.setBonusActionUsed(workflow.actor);
        await selection.displayCard();
        return;
    }
    let diceSize;
    let formula = '';
    let spellWorkflow;
    if (identifier === 'wiltingSmite') {
        let max = itemUtils.getConfig(selection, 'baseDiceNumber');
        if (!max) return;
        let hitDieSelection = await dialogUtils.selectHitDie(workflow.actor, selection.name, '', {max, sangromancy: true});
        if (!hitDieSelection) return;
        let total = 0;
        for (let i of hitDieSelection) {
            if (!i.amount) continue;
            if (i.document.type === 'class') {
                formula += formula.length ? ' + ' + i.amount + i.document.system.hd.denomination : i.amount + i.document.system.hd.denomination;
            } else {
                let dieSize = itemUtils.getConfig(i.document, 'diceSize');
                if (!dieSize) continue;
                formula += formula.length ? ' + ' + i.amount + dieSize : i.amount + dieSize;
            }
            total += i.amount;
        }
        if (total != max) return;
        spellWorkflow = await workflowUtils.completeItemUse(selection, undefined, {targetUuids: [target.document.uuid]});
        if (!spellWorkflow || spellWorkflow.aborted) return;
        for (let i of hitDieSelection) {
            if (!i.amount) continue;
            if (i.document.type === 'class') {
                await genericUtils.update(i.document, {'system.hd.spent': i.document.system.hd.spent + i.amount});
            } else {
                await genericUtils.update(i.document, {'system.uses.spent': i.document.system.uses.spent + i.amount});
            }
        }
    } else {
        diceSize = itemUtils.getConfig(selection, 'diceSize');
    }
    if (!spellWorkflow) spellWorkflow = await workflowUtils.completeItemUse(selection, undefined, {targetUuids: [target.document.uuid], cprRiderCard: true});
    if (!spellWorkflow || spellWorkflow.aborted) return;
    let damageType = itemUtils.getConfig(selection, 'damageType');
    let diceNumber = itemUtils.getConfig(selection, 'baseDiceNumber');
    if (identifier === 'divineSmite') {
        let creatureTypes = itemUtils.getConfig(selection, 'creatureTypes');
        if (creatureTypes.includes(actorUtils.typeOrRace(target.actor))) diceNumber += 1;
    } else if (identifier === 'banishingSmite') {
        let effectData = {
            name: selection.name,
            img: selection.img,
            duration: {
                seconds: 1
            },
            origin: selection.uuid,
            flags: {
                'chris-premades': {
                    banishingSmite: {
                        workflowId: workflow.id
                    }
                }
            }
        };
        await effectUtils.createEffect(workflow.actor, effectData, {identifier: 'banishingSmiteEffect', animate: false});
    }
    if (!formula) formula = ((workflowUtils.getCastLevel(spellWorkflow) - spellWorkflow.castData.baseLevel) + diceNumber) + diceSize;
    if (workflow.actor.system.bonuses?.spell?.all?.damage) formula += ' + @bonuses.spell.all.damage';
    await workflowUtils.bonusDamage(workflow, formula, {damageType});
    await attackRiders.applied(workflow, 'divineSmite');
}
async function complete({trigger, workflow}) {
    let effect = effectUtils.getEffectByIdentifier(workflow.actor, 'banishingSmiteEffect');
    if (!effect) return;
    let workflowId = effect.flags['chris-premades']?.banishingSmite?.workflowId;
    if (!workflowId) return;
    if (workflow.id != workflowId) return;
    let item = await effectUtils.getOriginItem(effect);
    if (!item) return;
    let requiredHP = itemUtils.getConfig(item, 'hp');
    await genericUtils.remove(effect);
    let target = attackRiders.hitTarget(workflow);
    if (!target || target.actor.system.attributes.hp.value > requiredHP) return;
    let activity = activityUtils.getActivityByIdentifier(item, 'banish', {strict: true});
    if (!activity) return;
    await workflowUtils.syntheticActivityRoll(activity, [target]);
}
export let divineSmite = {
    name: 'Divine Smite',
    version: '1.1.14',
    rules: 'modern',
    midi: {
        item: [{pass: 'preTargeting', macro: manual, priority: 50}],
        actor: [
            {
                pass: 'damageRollComplete',
                macro: hit,
                priority: 200,
                unique: 'divineSmite'
            },
            {
                pass: 'rollFinished',
                macro: complete,
                priority: 200,
                unique: 'divineSmiteComplete'
            }
        ]
    },
    config: [
        {
            value: 'creatureTypes',
            label: 'CHRISPREMADES.Macros.DivineSmite.CreatureTypes',
            type: 'select-many',
            default: ['undead', 'fiend'],
            options: constants.creatureTypeOptions,
            category: 'homebrew',
            homebrew: true
        },
        {
            value: 'damageType',
            label: 'CHRISPREMADES.Config.DamageType',
            type: 'select',
            default: 'radiant',
            category: 'homebrew',
            homebrew: true,
            options: constants.damageTypeOptions
        },
        {
            value: 'diceSize',
            label: 'CHRISPREMADES.Config.DiceSize',
            type: 'select',
            default: 'd8',
            options: constants.diceSizeOptions,
            category: 'homebrew',
            homebrew: true
        },
        {
            value: 'baseDiceNumber',
            label: 'CHRISPREMADES.Config.BaseDiceNumber',
            type: 'number',
            default: 2,
            category: 'homebrew',
            homebrew: true
        }
    ]
};
