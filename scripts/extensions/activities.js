import {activityUtils, actorUtils, genericUtils} from '../utils.js';
import {mergeRiderFlags} from '../lib/riderFlags.js';
function flagAllRiders(item, updates) {
    const expanded = foundry.utils.expandObject(updates);
    mergeRiderFlags(item, expanded, identifier => activityUtils.getActivityByIdentifier(item, identifier));
    for (const key of Object.keys(updates)) if (key.startsWith('flags.')) delete updates[key];
    if (expanded.flags) updates.flags = expanded.flags;
}
function cssTweak(value) {
    if (value) {
        let el = document.createElement('style');
        el.id = 'cpr-activity-css-tweak';
        el.innerText = `
        .dnd5e2.application.activity {
            display: grid;
            grid-template-rows: 100px 1fr;
            grid-template-columns: 1fr;
            min-width: 900px;

            .sheet-tabs {
                display: none !important;
            }
            .hint {
                display: none !important;
            }
            .tab {
                display: inline-block;
                width: 100%;
                padding-bottom: 3px;
            }
            .window-content {
                display: grid;
                grid-template-rows: 1fr;
                grid-template-columns: [identity] 1fr [activation] 1fr [effect] 1fr;
            }
            .window-header {
                grid-column: 1 / 2;
            }
            .tab[data-tab="identity"] {
                grid-column: identity;
                grid-row: 1 / 2;
                nav.tabs {
                    display: none !important;
                }
            }
            .tab[data-tab="activation"] {
                grid-column: activation;
                grid-row: 1 / 3;
                nav.tabs {
                    display: none !important;
                }
            }
            .tab[data-tab="effect"] {
                grid-column: effect;
                grid-row: 1 / 3;
                nav.tabs {
                    display: none !important;
                }
            }
            .tab[data-tab="midi-qol"] {
                grid-column: identity;
                grid-row: 2 / 3;
                nav.tabs {
                    display: none !important;
                }
            }
        }`;
        document.querySelector('head').appendChild(el);
    }
    else document.querySelector('#cpr-activity-css-tweak').remove();
}
function canUsePatch(wrapped, ...args) {
    let cprRiders = genericUtils.getProperty(this.item, 'flags.chris-premades.hiddenActivities') ?? [];
    if (cprRiders.length) {
        let identifier = activityUtils.getIdentifier(this);
        if (identifier && cprRiders.includes(identifier))  {
            return true;
        } else {
            return wrapped(args);
        }
    } else {
        return wrapped(args);
    }
}
function patchCanUse() {
    let classNames = [
        'Attack',
        'Cast',
        'Check',
        'Damage',
        'Enchant',
        'Forward',
        'Heal',
        'Order',
        'Save',
        'Summon',
        'Transform',
        'Utility'
    ];
    genericUtils.log('dev', 'Activities Can Use Patched!');
    for (let i of classNames) {
        libWrapper.register('chris-premades', 'dnd5e.documents.activity.' + i + 'Activity.prototype.canUse', canUsePatch, 'MIXED');
    }
}
async function transformIntoPatch(wrapped, source, settings, options = {}) {
    if (game.user.isGM || this.isOwner) return wrapped(source, settings, options);
    let result = await actorUtils.polymorphFromActivity(this, source, options);
    if (!result.handled) return wrapped(source, settings, options);
    return result.tokens;
}
function patchTransformInto() {
    genericUtils.log('dev', 'Transform Activity GM Delegation Patched!');
    libWrapper.register(
        'chris-premades',
        'CONFIG.Actor.documentClass.prototype.transformInto',
        transformIntoPatch,
        'WRAPPER'
    );
}
export let activities = {
    flagAllRiders,
    cssTweak,
    patchCanUse,
    patchTransformInto
};
