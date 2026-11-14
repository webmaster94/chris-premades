import {Teleport} from '../../../../../lib/teleport.js';
import {animationUtils, constants, dialogUtils, effectUtils, genericUtils, itemUtils} from '../../../../../utils.js';
async function early({trigger, workflow}) {
    let effect = effectUtils.getEffectByIdentifier(workflow.actor, 'rage');
    if (effect) return;
    genericUtils.notify('CHRISPREMADES.Macros.BranchesOfTheTree.Rage');
    workflow.aborted = true;
}
async function use({trigger, workflow}) {
    if (!workflow.failedSaves.count) return;
    let animation = itemUtils.getConfig(workflow.item, 'animation');
    if (animationUtils.jb2aCheck() === 'free' && animation != 'none') animation = 'mistyStep';
    let range = itemUtils.getConfig(workflow.item, 'range');
    await Teleport.target(workflow.failedSaves.tokens[0], workflow.token, {animation, range});
    if (workflow.token.document.disposition === workflow.failedSaves.tokens[0].document.disposition) return;
    let effect = workflow.item.effects.contents?.[0];
    if (!effect) return;
    let effectData = genericUtils.duplicate(effect.toObject());
    delete effectData._id;
    effectData.duration = itemUtils.convertDuration(workflow.activity);
    await effectUtils.createEffect(workflow.failedSaves.tokens[0].actor, effectData);
}
export let branchesOfTheTree = {
    name: 'Branches of the Tree',
    version: '2.3.0',
    rules: 'modern',
    midi: {
        item: [
            {
                pass: 'preambleComplete',
                macro: early,
                priority: 50
            },
            {
                pass: 'rollFinished',
                macro: use,
                priority: 50
            }
        ]
    },
    config: [
        {
            value: 'animation',
            label: 'CHRISPREMADES.Config.Animation',
            type: 'select',
            default: 'hiddenPaths',
            category: 'animation',
            options: constants.teleportOptions
        },
        {
            value: 'range',
            label: 'CHRISPREMADES.Config.Range',
            type: 'number',
            default: 5,
            category: 'homebrew',
            homebrew: true
        }
    ]
};
