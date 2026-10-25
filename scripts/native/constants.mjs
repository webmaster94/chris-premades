const packs = {
    legacy: {
        summons: 'chris-premades.CATSummons2014',
        features: 'chris-premades.CATFeatures2014',
        monsterFeatures: 'chris-premades.CATMonsterFeatures2014',
        spells: 'chris-premades.CATSpells2014',
        equipment: 'chris-premades.CATEquipment2014',
        misc: 'chris-premades.CATMisc2014'
    },
    modern: {
        summons: 'chris-premades.CATSummons2024',
        features: 'chris-premades.CATFeatures2024',
        monsterFeatures: 'chris-premades.CATMonsterFeatures2024',
        spells: 'chris-premades.CATSpells2024',
        equipment: 'chris-premades.CATEquipment2024',
        misc: 'chris-premades.CATMisc2024'
    },
    samples: {
        embeddedMacros: 'chris-premades.CATEmbeddedMacroSampleItems'
    },
    misc: {
        automationItems: 'chris-premades.CATAutomationItems'
    }
};
const sangromancyFeatures = [
    'full-blooded',
    'stage-3-boon-sangromancy-specialist',
    'sangromantic-initiate',
    'stolen-power'
];
const darknessAnimationConfig = {
    default: '',
    type: 'select',
    label: 'CHRISPREMADES.Config.DarknessAnimation',
    hint: 'CHRISPREMADES.Config.DarknessAnimationHint',
    category: 'mechanics',
    get options() {
        return [{value: '', label: _loc('DND5E.None')}, ...Object.entries(CONFIG.Canvas.darknessAnimations).map(([value, config]) => ({value, label: config.label}))];
    }
};
export default {
    packs,
    sangromancyFeatures,
    darknessAnimationConfig
};
