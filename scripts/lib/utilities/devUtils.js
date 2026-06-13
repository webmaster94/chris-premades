import * as macros from '../../legacyMacros.js';
import {constants, genericUtils} from '../../utils.js';
async function setMacro(entityUuid, key, values = []) {
    if (!key) return;
    let entity = await fromUuid(entityUuid);
    if (!entity) return;
    return await entity.setFlag('chris-premades', 'macros.' + key, values);
}
export async function stripUnusedFlags(key) {
    let gamePack = game.packs.get(key);
    await gamePack.getDocuments();
    for (let i of gamePack.contents) {
        if (!(Object.values(constants.featurePacks).includes(key) || key === 'world.cpr-summons' || key === 'world.cpr-summons-2024')) {
            if (!hasVersionInfo(i)) genericUtils.log('dev', i.name + ' is missing version info!');
        }
        let del = () => new foundry.data.operators.ForcedDeletion();
        let updates = {
            'flags.ddbimporter': del(),
            'flags.itemacro': del(),
            'flags.cf': del(),
            'flags.custom-character-sheet-sections': del(),
            'flags.rest-recovery': del(),
            'flags.exportSource': del(),
            'flags.autoanimations': del(),
            'flags.betterRolls5e': del(),
            'flags.tidy5e-sheet': del(),
            'flags.walledtemplates': del(),
            'flags.templatemacro': del(),
            'flags.spell-class-filter-for-5e': del(),
            'flags.favtab': del(),
            'flags.enhanced-terrain-layer': del(),
            'flags.tidy5e-sheet-kgar': del(),
            'flags.LocknKey': del(),
            'flags.monsterMunch': del(),
            'flags.magicitems': del(),
            system: {
                description: {
                    value: '',
                    chat: ''
                }
            }
        };
        let identifier = i.flags['chris-premades']?.info?.identifier;
        if (identifier) {
            if (macros[identifier]?.config?.find(i => i.value === 'playAnimation')) genericUtils.setProperty(updates, 'flags.chris-premades.info.hasAnimation', true);
        }
        if (key === constants.packs.miscellaneous) delete updates.system.description;
        for (let effect of i.effects.contents) {
            if (effect.description) {
                await genericUtils.update(effect, {description: ''});
                console.log('Removed effect description from ' + i.name);
            }
        }
        await i.update(updates);
    }
}
function hasVersionInfo(item) {
    return !!item.flags['chris-premades']?.info?.version;
}
export async function updateAllCompendiums() {
    let packs = game.packs.filter(i => i.metadata.label.includes('CPR') && i.metadata.packageType === 'world');
    await Promise.all(packs.map(async i => {
        await stripUnusedFlags(i.metadata.id);
    }));
    return 'Done!';
}
export let devUtils = {
    setMacro,
    stripUnusedFlags,
    updateAllCompendiums,
    hasVersionInfo
};
