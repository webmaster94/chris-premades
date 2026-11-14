import {genericUtils, itemUtils} from '../../../../utils.js';
async function use({trigger, workflow}) {
    let monksFocus = itemUtils.getItemByIdentifier(workflow.actor, 'monksFocus');
    if (!monksFocus) return;
    if (monksFocus.system.uses.value > 3) return;
    await genericUtils.update(monksFocus, {'system.uses.spent': monksFocus.system.uses.max - 4});
}
export let perfectFocus = {
    name: 'Perfect Focus',
    version: '2.3.0',
    rules: 'modern',
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
