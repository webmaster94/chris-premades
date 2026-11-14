import {fightingStyleUnarmedFighting as unarmedFightingLegacy, fightingStyleUnarmedFightingUnarmedStrike as unarmedFightingUnarmedStrikeLegacy} from '../../../legacyMacros.js';
export let unarmedFighting = {
    ...unarmedFightingLegacy,
    version: '2.3.0',
    rules: 'modern'
};
export let unarmedFightingUnarmedStrike = {
    ...unarmedFightingUnarmedStrikeLegacy,
    version: '2.3.0',
    rules: unarmedFighting.rules
};
