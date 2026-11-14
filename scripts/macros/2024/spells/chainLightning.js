import {chainLightning as chainLightningLegacy} from '../../2014/spells/chainLightning.js';
export let chainLightning = {
    name: 'Chain Lightning',
    version: '2.3.0',
    rules: 'modern',
    midi: chainLightningLegacy.midi,
    config: chainLightningLegacy.config,
    hasAnimation: true
};
