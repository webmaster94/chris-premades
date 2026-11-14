import {activityUtils, automationUtils, compendiumUtils} from '../../proxy.mjs';

async function added({document}) {
    const config = automationUtils.getGenericConfigValues(document, 'chris-premades-native', 'correctSpellLink', ['activity', 'identifier', 'packIds']);
    const activity = document.system.activities.get(config.activity);
    if (!activity || !document.actor) return;
    let spell = document.actor.items.find(item => item.type === 'spell' && item.system.identifier === config.identifier);
    if (!spell) {
        for (const pack of config.packIds ?? []) {
            spell = await compendiumUtils.getDocumentByIdentifier(pack, config.identifier);
            if (spell) break;
        }
    }
    if (spell) await activityUtils.correctSpellLink(activity, spell);
}

export const correctSpellLink = {
    rules: 'all', generic: true, documents: ['Item'],
    item: [{pass: 'medkit', macro: added, priority: 50}]
};
