import {dataUtils} from '../../../../proxy.mjs';
async function modifyRage({data}) {
    const effect = data.effectData;
    if (!effect) return;
    const specialDuration = effect.flags.cat?.specialDuration?.map(d => d === 'incapacitated' ? 'unconscious' : d);
    const removeMacros = [{
        type: 'combat',
        macros: [{identifier: 'keepRage'}]
    }];
    return dataUtils.buildEffectData(effect, {removeMacros, specialDuration});
}
export const persistentRage = {
    name: 'Persistent Rage',
    version: '2.0.2',
    rules: 'all',
    called: [
        {
            pass: 'actorPreCreateRageEffect',
            macro: modifyRage,
            priority: 200
        }
    ]
};
