import {actorUtils} from '../../../../../proxy.mjs';
import {arcaneWardHelper} from './arcaneWard.mjs';
async function sceneDamage({document, targetToken, ditem}) {
    const wardHolder = document.actor;
    if (actorUtils.hasUsedReaction(wardHolder)) return;
    const item = actorUtils.getItemByIdentifier(wardHolder, 'arcane-ward');
    if (!item) return;
    const token = actorUtils.getFirstToken(wardHolder);
    if (!token) return;
    await arcaneWardHelper({document: item, ditem, projectedWard: document, token, targetToken});
}
export const projectedWard = {
    name: 'Projected Ward',
    version: '2.0.0',
    rules: '2014',
    roll: [
        {
            pass: 'sceneDamageComplete',
            macro: sceneDamage,
            priority: 50
        }
    ],
    config: {
        range: {
            default: 30,
            type: 'number',
            label: 'CHRISPREMADES.Config.Range',
            category: 'homebrew'
        }
    }
};
