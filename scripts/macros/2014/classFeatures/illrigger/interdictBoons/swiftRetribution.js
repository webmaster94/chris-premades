import {dialogUtils, effectUtils, workflowUtils} from '../../../../../utils.js';
async function use({trigger, workflow}) {
    if (!workflow.targets.count) return;
    let balefulInterdictEffect = effectUtils.getAllEffectsByIdentifier(workflow.targets.tokens[0].actor, 'balefulInterdictEffect').find(effect => {
        let originItem = effectUtils.getOriginItemSync(effect);
        if (originItem.actor.id === workflow.actor.id) return true;
    });
    if (!balefulInterdictEffect) return;
    let validWeapons = workflow.actor.items.filter(i => i.type === 'weapon' && i.system.equipped);
    if (!validWeapons.length) return;
    let selection = await dialogUtils.selectDocumentDialog(workflow.item.name, 'CHRISPREMADES.Generic.SelectAWeapon', validWeapons, {sortAlphabetical: true});
    if (!selection) return;
    await workflowUtils.specialItemUse(selection, Array.from(workflow.targets.tokens), workflow.item, {consumeResources: true, consumeUsage: true});
}
export let interdictBoonSwiftRetribution = {
    name: 'Interdict Boons: Swift Retribution (Passive)',
    aliases: ['Swift Retribution', 'Interdict Boons: Swift Retribution'],
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
