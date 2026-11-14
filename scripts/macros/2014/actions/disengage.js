import {disengage as modernDisengage} from '../../2024/actions/disengage.js';
export let disengage = {
    name: 'Disengage',
    version: '2.3.0',
    midi: modernDisengage.midi,
    config: modernDisengage.config,
    hasAnimation: true
};
