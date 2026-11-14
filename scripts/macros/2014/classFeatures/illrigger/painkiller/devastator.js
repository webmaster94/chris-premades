import {dialogUtils, effectUtils, genericUtils, workflowUtils} from '../../../../../utils.js';
async function use({trigger, workflow}) {
    if (!workflow.targets.count) return;
    let enemies = new Set(workflow.targets.tokens).filter(token => token.document.disposition != workflow.token.document.disposition);
    if (enemies.size !== 1 && (workflow.targets.count - 1) > workflow.actor.system.attributes.prof) {
        genericUtils.notify('CHRISPREMADES.Macros.Devastator.Message', 'info', {localize: true});
        return;
    }
    let validWeapons = workflow.actor.items.filter(i => i.type === 'weapon' && i.system.equipped);
    if (!validWeapons.length) return;
    let selection = await dialogUtils.selectDocumentDialog(workflow.item.name, 'CHRISPREMADES.Generic.SelectAWeapon', validWeapons, {sortAlphabetical: true});
    if (!selection) return;
    await workflowUtils.specialItemUse(selection, [enemies.first()], workflow.item, {consumeResources: true, consumeUsage: true});
    let sourceEffect = workflow.item.effects.contents?.[0];
    if (!sourceEffect) return;
    let effectData = genericUtils.duplicate(sourceEffect.toObject());
    effectData.duration = {value: 1, units: 'turns'};
    effectData.start = {round: game.combat?.round ?? 0, turn: game.combat?.turn ?? 0};
    effectData.origin = sourceEffect.uuid;
    await Promise.all(workflow.targets.tokens.map(async token => {
        if (token.document.id == workflow.token.document.id || token.document.disposition != workflow.token.document.disposition) return;
        await effectUtils.createEffect(token.actor, effectData);
    }));
}
export let devastator = {
    name: 'Devastator',
    version: '2.3.0',
    rules: 'legacy',
    midi: {
        item: [
            {
                pass: 'rollFinished',
                macro: use,
                priority: 50
            }
        ]
    }
};
