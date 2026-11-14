import constants from '../native/constants.mjs';
import {genericActionsHooks} from '../native/macros/all/actions/genericActions.mjs';
import {environmentHooks} from '../native/macros/generic/environment.mjs';
import {selectDamageTypeHooks} from '../native/macros/generic/selectDamageType.mjs';
import {skipDNDPrompt} from '../macros/2014/monsterFeatures/generic/chooseDamageType.js';

// Register before init; the native module entry point would register a second catalog.
export function registerNativeHooks() {
    Hooks.on('createActiveEffect', genericActionsHooks.createActiveEffect);
    Hooks.on('createToken', environmentHooks.createToken);
    Hooks.on('dnd5e.preRollDamageV2', selectDamageTypeHooks.preRollDamage);
    Hooks.on('dnd5e.preRollDamageV2', skipDNDPrompt);
    Hooks.once('init', () => {
        const key = 'CHRISPREMADES.Macros.Generic.Firearm.';
        CONFIG.DND5E.weaponTypes.firearm = key + 'Type';
        CONFIG.DND5E.weaponTypeMap.firearm = 'ranged';
        CONFIG.DND5E.weaponProficiencies.firearm = key + 'Proficiency';
        CONFIG.DND5E.weaponProficienciesMap.firearm = 'firearm';
        for (const property of constants.firearmProperties) {
            CONFIG.DND5E.itemProperties[property] = {label: key + 'Properties.' + property.capitalize()};
            CONFIG.DND5E.validProperties.weapon.add(property);
        }
        for (const [item, uuid] of Object.entries(constants.firearmBaseItems)) CONFIG.DND5E.weaponIds[item] = 'Compendium.' + uuid;
    });
}
