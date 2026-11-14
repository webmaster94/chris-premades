import {cunningStrike} from './cunningStrike.js';
export let deviousStrikes = {
    name: 'Devious Strikes',
    version: '2.3.0',
    rules: 'modern',
    midi: {
        actor: [
            {
                pass: 'rollFinished',
                macro: cunningStrike.midi.actor[0].macro,
                priority: 300,
                unique: 'cunningStrikeUse'
            }
        ]
    }
};
