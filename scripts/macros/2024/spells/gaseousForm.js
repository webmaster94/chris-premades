import {upcastTargets} from '../../generic/upcastTargets.js';
export let gaseousForm = {
    version: '2.3.0',
    rules: 'modern',
    midi: {
        item: [
            {
                pass: 'preambleComplete',
                macro: upcastTargets.plusOne,
                priority: 50
            }
        ]
    }
};
