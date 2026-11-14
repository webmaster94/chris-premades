import {upcastTargets} from '../../generic/upcastTargets.js';
export let bane = {
    name: 'Bane',
    version: '2.3.0',
    rules: 'modern',
    midi: {
        item: [
            {
                pass: 'preambleComplete',
                macro: upcastTargets.plusThree,
                priority: 50
            }
        ]
    }
};
