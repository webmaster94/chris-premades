import {compendiumUtils, constants, dialogUtils, effectUtils, errors, genericUtils, itemUtils, socketUtils, tokenUtils, workflowUtils} from '../../../../../utils.js';
async function use({workflow}) {
    let positiveEffectData = {
        name: workflow.item.name + ': ' + genericUtils.translate('CHRISPREMADES.Macros.Mutagencraft.Positive'),
        img: workflow.item.img,
        origin: workflow.item.uuid,
        flags: {
            dae: {
                specialDuration: [
                    'longRest',
                    'shortRest'
                ]
            }
        }
    };
    let negativeEffectData = {
        name: workflow.item.name + ': ' + genericUtils.translate('CHRISPREMADES.Macros.Mutagencraft.Negative'),
        img: workflow.item.img,
        origin: workflow.item.uuid
    };
    let flushData = await compendiumUtils.getItemFromCompendium(constants.featurePacks.classFeatureItems, 'Mutagencraft: Flush Mutagens', {object: true, getDescription: true, translate: 'CHRISPREMADES.Macros.Mutagencraft.Flush', identifier: 'flushMutagens'});
    if (!flushData) {
        errors.missingPackItem();
        return;
    }
    let classLevel = workflow.actor.classes?.['blood-hunter']?.system.levels ?? 0;
    let identifier = genericUtils.getIdentifier(workflow.item);
    switch (identifier) {
        case 'formulaAether':
            positiveEffectData.system = {
                changes: [
                    {
                        key: 'system.attributes.movement.fly',
                        type: 'upgrade',
                        value: 20,
                        priority: 20
                    }
                ]
            };
            negativeEffectData.system = {
                changes: [
                    {
                        key: 'flags.midi-qol.disadvantage.check.str',
                        type: 'custom',
                        value: 1,
                        priority: 20
                    },
                    {
                        key: 'flags.midi-qol.disadvantage.check.dex',
                        type: 'custom',
                        value: 1,
                        priority: 20
                    }
                ]
            };
            positiveEffectData.duration = itemUtils.convertDuration(workflow.activity);
            negativeEffectData.duration = itemUtils.convertDuration(workflow.activity);
            break;
        case 'formulaAlluring':
            positiveEffectData.system = {
                changes: [
                    {
                        key: 'flags.midi-qol.advantage.check.cha',
                        type: 'custom',
                        value: 1,
                        priority: 20
                    }
                ]
            };
            negativeEffectData.system = {
                changes: [
                    {
                        key: 'flags.dnd5e.flags.dnd5e.initiativeDisadv',
                        type: 'custom',
                        value: 1,
                        priority: 20
                    }
                ]
            };
            break;
        case 'formulaCelerity':
            positiveEffectData.system = {
                changes: [
                    {
                        key: 'system.abilities.dex.value',
                        type: 'add',
                        value: classLevel >= 18 ? 5 : (classLevel >= 11 ? 4 : 3),
                        priority: 20
                    }
                ]
            };
            negativeEffectData.system = {
                changes: [
                    {
                        key: 'flags.midi-qol.disadvantage.save.wis',
                        type: 'custom',
                        value: 1,
                        priority: 20
                    }
                ]
            };
            break;
        case 'formulaConversant':
            positiveEffectData.system = {
                changes: [
                    {
                        key: 'flags.midi-qol.advantage.check.int',
                        type: 'custom',
                        value: 1,
                        priority: 20
                    }
                ]
            };
            negativeEffectData.system = {
                changes: [
                    {
                        key: 'flags.midi-qol.disadvantage.check.wis',
                        type: 'custom',
                        value: 1,
                        priority: 20
                    }
                ]
            };
            break;
        case 'formulaCruelty':
            positiveEffectData.system = {changes: []};
            negativeEffectData.system = {
                changes: [
                    {
                        key: 'flags.midi-qol.disadvantage.save.int',
                        type: 'custom',
                        value: 1,
                        priority: 20
                    },
                    {
                        key: 'flags.midi-qol.disadvantage.save.wis',
                        type: 'custom',
                        value: 1,
                        priority: 20
                    },
                    {
                        key: 'flags.midi-qol.disadvantage.save.cha',
                        type: 'custom',
                        value: 1,
                        priority: 20
                    }
                ]
            };
            break;
        case 'formulaDeftness':
            positiveEffectData.system = {
                changes: [
                    {
                        key: 'flags.midi-qol.advantage.check.dex',
                        type: 'custom',
                        value: 1,
                        priority: 20
                    }
                ]
            };
            negativeEffectData.system = {
                changes: [
                    {
                        key: 'flags.midi-qol.disadvantage.check.wis',
                        type: 'custom',
                        value: 1,
                        priority: 20
                    }
                ]
            };
            break;
        case 'formulaEmbers':
            positiveEffectData.system = {
                changes: [
                    {
                        key: 'system.traits.dr.value',
                        type: 'add',
                        value: 'fire',
                        priority: 20
                    }
                ]
            };
            negativeEffectData.system = {
                changes: [
                    {
                        key: 'system.traits.dv.value',
                        type: 'add',
                        value: 'cold',
                        priority: 20
                    }
                ]
            };
            break;
        case 'formulaGelid':
            positiveEffectData.system = {
                changes: [
                    {
                        key: 'system.traits.dr.value',
                        type: 'add',
                        value: 'cold',
                        priority: 20
                    }
                ]
            };
            negativeEffectData.system = {
                changes: [
                    {
                        key: 'system.traits.dv.value',
                        type: 'add',
                        value: 'fire',
                        priority: 20
                    }
                ]
            };
            break;
        case 'formulaImpermeable':
            positiveEffectData.system = {
                changes: [
                    {
                        key: 'system.traits.dr.value',
                        type: 'add',
                        value: 'piercing',
                        priority: 20
                    }
                ]
            };
            negativeEffectData.system = {
                changes: [
                    {
                        key: 'system.traits.dv.value',
                        type: 'add',
                        value: 'slashing',
                        priority: 20
                    }
                ]
            };
            break;
        case 'formulaMobility':
            positiveEffectData.system = {
                changes: [
                    {
                        key: 'system.traits.ci.value',
                        type: 'add',
                        value: 'grappled',
                        priority: 20
                    },
                    {
                        key: 'system.traits.ci.value',
                        type: 'add',
                        value: 'restrained',
                        priority: 20
                    }
                ]
            };
            if (classLevel >= 11) positiveEffectData.system.changes.push(
                {
                    key: 'system.traits.ci.value',
                    type: 'add',
                    value: 'paralyzed',
                    priority: 20
                }
            );
            negativeEffectData.system = {
                changes: [
                    {
                        key: 'flags.midi-qol.disadvantage.check.str',
                        type: 'custom',
                        value: 1,
                        priority: 20
                    }
                ]
            };
            break;
        case 'formulaNighteye':
            positiveEffectData.system = {
                changes: [
                    {
                        key: 'system.attributes.senses.ranges.darkvision',
                        type: 'upgrade',
                        value: (workflow.actor.system.attributes.senses.ranges.darkvision ?? 0) + 60,
                        priority: 30
                    },
                    {
                        key: 'ATL.sight.range',
                        type: 'add',
                        value: (workflow.actor.system.attributes.senses.ranges.darkvision ?? 0) + 60,
                        priority: 20
                    }
                ]
            };
            negativeEffectData.system = {changes: []};
            effectUtils.addMacro(negativeEffectData, 'midi.actor', ['formulaNighteye']);
            effectUtils.addMacro(positiveEffectData, 'skill', ['formulaNighteye']);
            break;
        case 'formulaPercipient':
            positiveEffectData.system = {
                changes: [
                    {
                        key: 'flags.midi-qol.advantage.check.wis',
                        type: 'custom',
                        value: 1,
                        priority: 20
                    }
                ]
            };
            negativeEffectData.system = {
                changes: [
                    {
                        key: 'flags.midi-qol.disadvantage.check.cha',
                        type: 'custom',
                        value: 1,
                        priority: 20
                    }
                ]
            };
            break;
        case 'formulaPotency':
            positiveEffectData.system = {
                changes: [
                    {
                        key: 'system.abilities.str.value',
                        type: 'add',
                        value: classLevel >= 18 ? 5 : (classLevel >= 11 ? 4 : 3),
                        priority: 20
                    }
                ]
            };
            negativeEffectData.system = {
                changes: [
                    {
                        key: 'flags.midi-qol.disadvantage.save.dex',
                        type: 'custom',
                        value: 1,
                        priority: 20
                    }
                ]
            };
            break;
        case 'formulaPrecision':
            positiveEffectData.system = {
                changes: [
                    {
                        key: 'flags.dnd5e.weaponCriticalThreshold',
                        type: 'override',
                        value: 19,
                        priority: 20
                    }
                ]
            };
            negativeEffectData.system = {
                changes: [
                    {
                        key: 'flags.midi-qol.disadvantage.save.str',
                        type: 'custom',
                        value: 1,
                        priority: 20
                    }
                ]
            };
            break;
        case 'formulaRapidity':
            positiveEffectData.system = {
                changes: [
                    {
                        key: 'system.attributes.movement.all',
                        type: 'custom',
                        value: '+' + (classLevel >= 15 ? '15' : '10'),
                        priority: 20
                    }
                ]
            };
            negativeEffectData.system = {
                changes: [
                    {
                        key: 'flags.midi-qol.disadvantage.check.int',
                        type: 'custom',
                        value: 1,
                        priority: 20
                    }
                ]
            };
            break;
        case 'formulaReconstruction':
            positiveEffectData.system = {changes: []};
            effectUtils.addMacro(positiveEffectData, 'combat', ['formulaReconstruction']);
            negativeEffectData.system = {
                changes: [
                    {
                        key: 'system.attributes.movement.all',
                        type: 'custom',
                        value: '-10',
                        priority: 20
                    }
                ]
            };
            positiveEffectData.duration = itemUtils.convertDuration(workflow.activity);
            negativeEffectData.duration = itemUtils.convertDuration(workflow.activity);
            break;
        case 'formulaSagacity':
            positiveEffectData.system = {
                changes: [
                    {
                        key: 'system.abilities.int.value',
                        type: 'add',
                        value: classLevel >= 18 ? 5 : (classLevel >= 11 ? 4 : 3),
                        priority: 20
                    }
                ]
            };
            negativeEffectData.system = {
                changes: [
                    {
                        key: 'flags.midi-qol.disadvantage.save.cha',
                        type: 'custom',
                        value: 1,
                        priority: 20
                    }
                ]
            };
            break;
        case 'formulaShielded':
            positiveEffectData.system = {
                changes: [
                    {
                        key: 'system.traits.dr.value',
                        type: 'add',
                        value: 'slashing',
                        priority: 20
                    }
                ]
            };
            negativeEffectData.system = {
                changes: [
                    {
                        key: 'system.traits.dv.value',
                        type: 'add',
                        value: 'bludgeoning',
                        priority: 20
                    }
                ]
            };
            break;
        case 'formulaUnbreakable':
            positiveEffectData.system = {
                changes: [
                    {
                        key: 'system.traits.dr.value',
                        type: 'add',
                        value: 'bludgeoning',
                        priority: 20
                    }
                ]
            };
            negativeEffectData.system = {
                changes: [
                    {
                        key: 'system.traits.dv.value',
                        type: 'add',
                        value: 'piercing',
                        priority: 20
                    }
                ]
            };
            break;
        case 'formulaVermillion': {
            let feature = itemUtils.getItemByIdentifier(workflow.actor, 'bloodMaledict');
            if (feature) await genericUtils.update(feature, {'system.uses.spent': feature.system.uses.spent - 1});
            positiveEffectData.system = {changes: []};
            negativeEffectData.system = {
                changes: [
                    {
                        key: 'flags.midi-qol.disadvantage.deathSave',
                        type: 'custom',
                        value: 1,
                        priority: 20
                    }
                ]
            };
            break;
        }
    }
    await genericUtils.update(workflow.item, {'system.uses.max': workflow.item.system.uses.max - 1, 'system.uses.spent': 0});
    let flushItem = itemUtils.getItemByIdentifier(workflow.actor, 'flushMutagens');
    if (!flushItem) [flushItem] = await itemUtils.createItems(workflow.actor, [flushData], {favorite: true});
    await effectUtils.createEffect(workflow.actor, positiveEffectData, {parentEntity: flushItem, interdependent: true, identifier, vae: [{type: 'use', name: flushData.name, identifier: 'flushMutagens'}]});
    await effectUtils.createEffect(workflow.actor, negativeEffectData, {parentEntity: flushItem, identifier: identifier + 'Negative'});
}
async function earlyNighteye({trigger: {entity: effect}, workflow}) {
    if (workflow.disadvantage) return;
    if (!workflowUtils.isAttackType(workflow, 'attack')) return;
    if (!workflow.targets.size) return;
    let lightLevelSource = tokenUtils.getLightLevel(workflow.token);
    let lightLevelTarget = tokenUtils.getLightLevel(workflow.targets.first());
    if (lightLevelSource !== 'bright' && lightLevelTarget !== 'bright') return;
    let selection = await dialogUtils.confirm(effect.name, genericUtils.format('CHRISPREMADES.Macros.Mutagencraft.AttackSunlight', {sourceTokenName: workflow.token.name, targetTokenName: workflow.targets.first().name}), {userId: socketUtils.gmID()});
    if (!selection) return;
    workflow.tracker.disadvantage.add(effect.name, effect.name);
}
async function skillNighteye({trigger: {actor, skillId}}) {
    if (skillId !== 'prc') return;
    return {label: genericUtils.format('CHRISPREMADES.Macros.Mutagencraft.SkillSunlight', {actorName: actor.name}), type: 'disadvantage'};
}
async function turnStartReconstruction({trigger: {token}}) {
    let actor = token.actor;
    if (!actor) return;
    let hp = actor.system.attributes.hp;
    if (!hp.value || hp.value >= hp.max / 2) return;
    let healing = actor.system.attributes.prof;
    if (!healing) return;
    let previousHP = hp.value;
    await actor.applyDamage([{type: 'healing', value: healing}]);
    let appliedHealing = actor.system.attributes.hp.value - previousHP;
    if (!appliedHealing) return;
    await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({actor, token}),
        flavor: genericUtils.translate('CHRISPREMADES.Macros.Mutagencraft.ReconstructionHealing'),
        content: '<p><strong>+' + appliedHealing + '</strong> ' + genericUtils.translate('DND5E.HEAL.Type.HealingShort') + '</p>'
    });
}
export let formulas = {
    name: 'Formulas: Generic',
    version: '1.1.0',
    midi: {
        item: [
            {
                pass: 'rollFinished',
                macro: use,
                priority: 50
            }
        ]
    }
};
let version = '1.1.0';
export let formulaAether = {
    name: 'Formulas: Aether',
    version
};
export let formulaAlluring = {
    name: 'Formulas: Alluring',
    version
};
export let formulaCelerity = {
    name: 'Formulas: Celerity',
    version
};
export let formulaConversant = {
    name: 'Formulas: Conversant',
    version
};
export let formulaCruelty = {
    name: 'Formulas: Cruelty',
    version
};
export let formulaDeftness = {
    name: 'Formulas: Deftness',
    version
};
export let formulaEmbers = {
    name: 'Formulas: Embers',
    version
};
export let formulaGelid = {
    name: 'Formulas: Gelid',
    version
};
export let formulaImpermeable = {
    name: 'Formulas: Impermeable',
    version
};
export let formulaMobility = {
    name: 'Formulas: Mobility',
    version
};
export let formulaNighteye = {
    name: 'Formulas: Nighteye',
    version,
    midi: {
        actor: [
            {
                pass: 'preAttackRollConfig',
                macro: earlyNighteye,
                priority: 51
            }
        ]
    },
    skill: [
        {
            pass: 'context',
            macro: skillNighteye,
            priority: 50
        }
    ]
};
export let formulaPercipient = {
    name: 'Formulas: Percipient',
    version
};
export let formulaPotency = {
    name: 'Formulas: Potency',
    version
};
export let formulaPrecision = {
    name: 'Formulas: Precision',
    version
};
export let formulaRapidity = {
    name: 'Formulas: Rapidity',
    version
};
export let formulaReconstruction = {
    name: 'Formulas: Reconstruction',
    version: '1.1.1',
    combat: [
        {
            pass: 'turnStart',
            macro: turnStartReconstruction,
            priority: 50
        }
    ]
};
export let formulaSagacity = {
    name: 'Formulas: Sagacity',
    version
};
export let formulaShielded = {
    name: 'Formulas: Shielded',
    version
};
export let formulaUnbreakable = {
    name: 'Formulas: Unbreakable',
    version
};
export let formulaVermillion = {
    name: 'Formulas: Vermillion',
    version
};
