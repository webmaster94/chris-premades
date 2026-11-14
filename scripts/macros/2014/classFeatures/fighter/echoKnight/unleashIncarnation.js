import { attack } from './manifestEcho.js';
export let unleashIncarnation = {
    name: 'Unleash Incarnation',
    version: '2.3.0',
    midi: {
        item: [
            {
                pass: 'rollFinished',
                macro: attack,
                priority: 50
            }
        ]
    }
};
