import {constants} from '../../../utils.js';
export let sangromanticInitiate = {
    name: 'Sangromantic Initiate',
    version: '2.3.0',
    rules: 'modern',
    config: [
        {
            value: 'diceSize',
            label: 'CHRISPREMADES.Config.DiceSize',
            type: 'select',
            default: 'd12',
            options: constants.diceSizeOptions,
            category: 'homebrew',
            homebrew: true
        }
    ]
};
