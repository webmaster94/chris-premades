import {actorUtils, constants, dialogUtils, genericUtils, itemUtils, workflowUtils} from '../../../../utils.js';
import {attackRiders} from '../../../../lib/attackRiders.js';
async function damage(args) {
    await attackRiders.run(args.workflow, 'divineSmite', () => applyDamage(args));
}
async function manual(args) {
    return await attackRiders.manual(args, 'divineSmite');
}
async function applyDamage({trigger: {entity: item}, workflow}) {
    if (workflow.hitTargets.size !== 1) return;
    if (!itemUtils.getConfig(item, 'allowUnarmed') && constants.unarmedAttacks.includes(genericUtils.getIdentifier(workflow.item))) return;
    let validTypes = ['mwak'];
    if (itemUtils.getConfig(item, 'allowRanged')) {
        validTypes.push('rwak');
    }
    if (!validTypes.includes(workflowUtils.getActionType(workflow))) return;
    if (!attackRiders.available(item, workflow, 'divineSmite')) return;
    if (workflow.actor.type === 'npc' && attackRiders.itemDamage(item)) {
        let selection = await dialogUtils.confirm(item.name, genericUtils.format('CHRISPREMADES.Dialog.Use', {itemName: item.name}));
        if (!selection) return;
        await workflowUtils.bonusDamage(workflow, attackRiders.itemDamage(item), {damageType: itemUtils.getConfig(item, 'damageType')});
        await attackRiders.applied(workflow, 'divineSmite');
        await attackRiders.spendUse(item, {inCombatOnly: false});
        await item.displayCard();
        return;
    }
    if (!attackRiders.spellSlots(workflow.actor).length) return;
    let selection = await dialogUtils.selectSpellSlot(workflow.actor, workflow.item.name, genericUtils.format('CHRISPREMADES.Dialog.Use', {itemName: item.name}), {no: true});
    if (!selection) return;
    let numDice;
    if (selection === 'pact') {
        await genericUtils.update(workflow.actor, {'system.spells.pact.value': workflow.actor.system.spells.pact.value - 1});
        numDice = Math.min(workflow.actor.system.spells.pact.level + 1, 5);
    } else {
        await genericUtils.update(workflow.actor, {['system.spells.spell' + selection + '.value']: workflow.actor.system.spells['spell' + selection].value - 1});
        numDice = Math.min(Number(selection) + 1, 5);
    }
    let targetActor = attackRiders.hitTarget(workflow).actor;
    if (['undead', 'fiend'].includes(actorUtils.typeOrRace(targetActor))) numDice += 1;
    let damageType = itemUtils.getConfig(item, 'damageType');
    let bonusDamageFormula = numDice + 'd8';
    await workflowUtils.bonusDamage(workflow, bonusDamageFormula, {damageType});
    await attackRiders.applied(workflow, 'divineSmite');
    await item.displayCard();
}
export let divineSmite = {
    name: 'Divine Smite',
    version: '1.1.0',
    midi: {
        item: [{pass: 'preTargeting', macro: manual, priority: 50}],
        actor: [
            {
                pass: 'damageRollComplete',
                macro: damage,
                priority: 50
            }
        ]
    },
    config: [
        {
            value: 'damageType',
            label: 'CHRISPREMADES.Config.DamageType',
            type: 'select',
            default: 'radiant',
            options: constants.damageTypeOptions,
            homebrew: true,
            category: 'homebrew'
        },
        {
            value: 'allowUnarmed',
            label: 'CHRISPREMADES.Macros.DivineSmite.Unarmed',
            type: 'checkbox',
            default: false,
            category: 'homebrew',
            homebrew: true
        },
        {
            value: 'allowRanged',
            label: 'CHRISPREMADES.Macros.DivineSmite.Ranged',
            type: 'checkbox',
            default: false,
            category: 'homebrew',
            homebrew: true
        }
    ]
};
