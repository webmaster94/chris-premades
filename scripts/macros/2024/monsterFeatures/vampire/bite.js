import {effectUtils, genericUtils, workflowUtils} from '../../../../utils.js';
async function early({trigger, workflow}) {
    if (!workflow.targets.count) return;
    let conditions = ['grappled', 'incapacitated', 'restrained'];
    let valid = conditions.find(i => effectUtils.getEffectByStatusID(workflow.targets.tokens[0].actor, i));
    let charmed = effectUtils.getEffectByIdentifier(workflow.targets.tokens[0].actor, 'charmPersonEffect');
    if (!valid && !charmed) {
        workflowUtils.removeTargets(workflow, [workflow.targets.tokens[0]]);
        return;
    }
    if (charmed) {
        if (charmed.flags['chris-premades']?.specialDuration?.includes('attackedByAnotherCreature')) return;
        await genericUtils.setFlag(charmed, 'chris-premades', 'specialDuration', ['attackedByAnotherCreature']);
    }
}
export let vampireBite = {
    name: 'Bite (Bat or Vampire Form Only)',
    aliases: ['Bite'],
    monsters: [
        'Vampire'
    ],
    version: '2.3.0',
    rules: 'modern',
    midi: {
        item: [
            {
                pass: 'preambleComplete',
                macro: early,
                priority: 50
            }
        ]
    }
};
