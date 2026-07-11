import {genericUtils, itemUtils} from '../utils.js';

let keys = [
    'aaAutorec-melee',
    'aaAutorec-range',
    'aaAutorec-ontoken',
    'aaAutorec-templatefx',
    'aaAutorec-aura',
    'aaAutorec-preset',
    'aaAutorec-aefx'
];
function getAutoRec(name) {
    if (!game.modules.get('autoanimations')?.active) return;
    return keys.map(i => {
        if (!game.settings.settings.has('autoanimations.' + i)) return;
        let entries = game.settings.get('autoanimations', i);
        if (!Array.isArray(entries)) return;
        return entries.find(j => {
            return j.label.toLowerCase().includes(name.toLowerCase());
        });
    }).find(k => k);
}
function renderItemSheet(app, element, options) {
    if (!game.modules.get('autoanimations')?.active) return;
    let elem = element?.[0] ?? element;
    if (!elem) return;
    let root = app?.element ?? elem.closest?.('.application, .window-app') ?? elem;
    let isTidy = root?.classList?.contains?.('tidy5e-sheet') || root?.querySelector?.('.tidy5e-sheet');
    let headerButton;
    if (isTidy) {
        headerButton = root.querySelector('menu.controls-dropdown i.fa-biohazard');
    } else {
        headerButton = root.querySelector('button.header-control.aaItemSettings, a.header-button.aaItemSettings, .header-control.aaItemSettings');
    }
    if (!headerButton) return;
    let object = app.object;
    if (!object) return;
    let autoRec = getAutoRec(app.object.name);
    let isEnabled = object.flags?.autoanimations?.isEnabled ?? true;
    let isCustomized = object.flags?.autoanimations?.isCustomized ?? false;
    let color;
    if (!isEnabled && !autoRec && !isCustomized) {
        color = 'red';
    } else if (isEnabled && isCustomized && !autoRec) {
        color = 'green';
    } else if (isEnabled && isCustomized && autoRec) {
        color = 'dodgerblue';
    } else if (isEnabled && !isCustomized && autoRec) {
        color = 'orchid';
    } else if (!isEnabled && autoRec) {
        color = 'yellow';
    } else if (isEnabled && !autoRec) {
        color = 'orange';
    } else return;
    headerButton.style.color = color;
}
function preDataSanitize(handler, data) {
    let shouldCPRAnimate = handler.item?.flags?.['chris-premades']?.info?.hasAnimation && itemUtils.getConfig(handler.item, 'playAnimation');
    if (shouldCPRAnimate) {
        if (genericUtils.getCPRSetting('automatedAnimationSounds')) {
            if (!data.soundOnly?.sound?.enable) {
                let sound = data.primary?.sound?.enable 
                    ? data.primary.sound 
                    : data.secondary?.sound?.enable
                        ? data.secondary.sound
                        : null;
                if (sound) genericUtils.setProperty(data, 'soundOnly.sound', sound);
            }
        }
        Hooks.once('aa.preAnimationStart', (sanitizedData) => {
            sanitizedData.macro = false;
            sanitizedData.primary = false;
            sanitizedData.secondary = false;
            sanitizedData.sourceFX = false;
            sanitizedData.tokenFX = false;
        });
    }
}
export let automatedAnimations = {
    renderItemSheet,
    preDataSanitize
};
