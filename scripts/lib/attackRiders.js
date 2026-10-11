import {activityUtils, actorUtils, combatUtils, dialogUtils, genericUtils, itemUtils, rollUtils, workflowUtils} from '../utils.js';

const recentHits = new Map();
const usedTurns = new Map();
const pendingManual = new Set();
const MAX_AGE = 2 * 60 * 1000;

function hitTarget(workflow) {
    if (workflow.hitTargets?.size !== 1) return;
    return workflow.hitTargets.values().next().value;
}

function rollType(workflow) {
    let options = workflow.attackRoll?.options ?? {};
    if (Number.isFinite(options.advantageMode)) {
        return options.advantageMode > 0 ? 'advantage' : options.advantageMode < 0 ? 'disadvantage' : 'normal';
    }
    let useRoll = options.advantage !== undefined || options.disadvantage !== undefined;
    let advantage = useRoll ? options.advantage : workflow.advantage;
    let disadvantage = useRoll ? options.disadvantage : workflow.disadvantage;
    return advantage && !disadvantage ? 'advantage' : disadvantage && !advantage ? 'disadvantage' : 'normal';
}

function hasLimitedUses(item) {
    return !!item.system.hasLimitedUses || !!String(item.system.uses?.max ?? '').trim();
}

function hasUses(item) {
    if (!hasLimitedUses(item)) return true;
    let uses = item.system.uses;
    let value = uses?.value ?? (Number(uses?.max) - (uses?.spent ?? 0));
    return Number.isFinite(Number(value)) && Number(value) > 0;
}

function turnKey(actor) {
    if (!combatUtils.inCombat()) return;
    return [actor.uuid, game.combat.id, game.combat.round, game.combat.turn].join(':');
}

function riderState(workflow, identifier) {
    workflow['chris-premades'] ??= {};
    workflow['chris-premades'].attackRiders ??= {};
    return workflow['chris-premades'].attackRiders[identifier] ??= {};
}

function available(item, workflow, identifier) {
    if (!hasUses(item)) return false;
    if (riderState(workflow, identifier).applied) return false;
    let key = turnKey(workflow.actor);
    return identifier !== 'sneakAttack' || (!usedTurns.has(key) && (!key || workflow.actor.flags?.['chris-premades']?.attackRiders?.sneakAttackTurn !== key));
}

async function spendUse(item, {inCombatOnly = true} = {}) {
    if (hasLimitedUses(item) && (!inCombatOnly || combatUtils.inCombat())) {
        await genericUtils.update(item, {'system.uses.spent': (item.system.uses.spent ?? 0) + 1});
    }
}

async function applied(workflow, identifier) {
    riderState(workflow, identifier).applied = true;
    if (identifier === 'sneakAttack') {
        let key = turnKey(workflow.actor);
        if (key) {
            usedTurns.set(key, true);
            await genericUtils.setFlag(workflow.actor, 'chris-premades', 'attackRiders.sneakAttackTurn', key);
        }
        if (usedTurns.size > 512) usedTurns.delete(usedTurns.keys().next().value);
    }
}

async function run(workflow, identifier, callback) {
    let target = hitTarget(workflow);
    if (!target || !workflow.item || workflow.activity?.type !== 'attack') return;
    recentHits.set(workflow.actor.uuid, {workflow, target, time: Date.now()});
    if (recentHits.size > 128) recentHits.delete(recentHits.keys().next().value);
    let state = riderState(workflow, identifier);
    if (state.applied || state.pending || pendingManual.has(workflow.actor.uuid + ':' + identifier)) return;
    state.pending = true;
    try {
        await callback();
    } finally {
        state.pending = false;
    }
}

function partFormula(part) {
    if (Array.isArray(part)) return part[0];
    if (part.custom?.enabled) return part.custom.formula;
    let dice = Number(part.number) > 0 && Number(part.denomination) > 0 ? part.number + 'd' + part.denomination : '';
    return [dice, part.bonus].filter(value => value).join(' + ');
}

function itemDamage(item) {
    let activities = Array.from(item.system.activities ?? []);
    let activity = activities.find(activity => activity.type === 'damage');
    let parts = activity?.damage?.parts ?? item.system.damage?.parts ?? [];
    return parts.map(partFormula).filter(formula => formula).join(' + ');
}

function itemDamageType(item) {
    let activity = Array.from(item.system.activities ?? []).find(activity => activity.type === 'damage');
    let parts = activity?.damage?.parts ?? item.system.damage?.parts ?? [];
    let types = new Set(parts.flatMap(part => Array.isArray(part) ? [part[1]] : Array.from(part.types ?? [])));
    if (types.size === 1) return types.values().next().value;
}

async function ensureManualActivity(item) {
    if (!item.actor || item.system.activities?.size || !game.user.isGM) return;
    let identifiers = item.flags['chris-premades']?.macros?.midi?.actor ?? [];
    if (!identifiers.some(identifier => ['divineSmite', 'sneakAttack'].includes(identifier))) return;
    await genericUtils.update(item, {
        'system.activities.cprManualRider00': {
            _id: 'cprManualRider00', type: 'utility', name: genericUtils.translate('CHRISPREMADES.Macros.AttackRider.ManualDamage'),
            activation: {type: 'special'}, target: {prompt: false}, consumption: {spellSlot: false, targets: []}
        }
    });
}

async function ready() {
    if (!game.user.isGM || (game.users.activeGM && game.users.activeGM.id !== game.user.id)) return;
    for (let actor of game.actors) {
        for (let item of actor.items) await ensureManualActivity(item);
    }
    Hooks.on('createItem', item => ensureManualActivity(item));
    Hooks.on('createActor', async actor => {
        for (let item of actor.items) await ensureManualActivity(item);
    });
    Hooks.on('createToken', async token => {
        if (token.actorLink || !token.actor) return;
        for (let item of token.actor.items) await ensureManualActivity(item);
    });
    Hooks.on('canvasReady', async canvas => {
        for (let token of canvas.tokens.placeables) {
            if (token.document.actorLink || !token.actor) continue;
            for (let item of token.actor.items) await ensureManualActivity(item);
        }
    });
}

function sneakFormula(item, actor, {modern = false} = {}) {
    let formula = itemUtils.getConfig(item, 'formula');
    if (typeof formula === 'string' && formula.trim()) return formula;
    let classIdentifier = modern ? itemUtils.getConfig(item, 'classIdentifier') : 'rogue';
    let scaleIdentifier = modern ? itemUtils.getConfig(item, 'scaleIdentifier') : 'sneak-attack';
    let scale = actor.system.scale?.[classIdentifier]?.[scaleIdentifier];
    if (scale?.number > 0 && scale.faces > 0) return scale.number + 'd' + scale.faces;
    if (actor.type === 'npc') {
        formula = itemDamage(item);
        if (formula) return formula;
        let cr = Number(actor.system.details?.cr);
        if (Number.isFinite(cr) && cr > 0) return Math.ceil(cr / 2) + 'd6';
    }
}

function ownTurn(token) {
    if (!combatUtils.inCombat()) return true;
    let current = combatUtils.getCurrentCombatantToken();
    return !!current && (current === token || current.document?.uuid === token?.document?.uuid);
}

function spellSlots(actor) {
    return Object.entries(actor.system.spells ?? {}).filter(([key, slot]) => {
        return key !== 'spell0' && slot.value > 0 && (slot.level ?? Number(key.replace('spell', ''))) > 0;
    });
}

function linkedSmite(item) {
    let linked = item.system.linkedActivity;
    return linked && linked.canUse !== false && activityUtils.canUse(linked) ? linked : undefined;
}

async function smiteFormula(item, actor, target, {modern = false} = {}) {
    let slot, formula, linked;
    if (actor.type === 'npc' && item.type === 'feat' && itemDamage(item)) return {formula: itemDamage(item)};
    let method = item.system.method;
    let canSpendSlots = !modern || ['spell', 'pact'].includes(method);
    let free = modern ? linkedSmite(item) : undefined;
    if (free) {
        let buttons = [[free.item.name, 'free']];
        if (canSpendSlots && spellSlots(actor).some(([, slot]) => slot.level >= item.system.level)) buttons.push(['CHRISPREMADES.Macros.AttackRider.UseSpellSlot', 'slot']);
        buttons.push(['CHRISPREMADES.Generic.No', false]);
        let selection = await dialogUtils.buttonDialog(item.name, 'CHRISPREMADES.Macros.DivineSmite.Context', buttons);
        if (!selection) return;
        if (selection === 'free') linked = free;
    }
    if (linked || (modern && ['innate', 'atwill'].includes(method) && !item.system.linkedActivity)) {
        formula = itemUtils.getConfig(item, 'baseDiceNumber') + itemUtils.getConfig(item, 'diceSize');
    } else if (canSpendSlots && spellSlots(actor).length) {
        slot = await dialogUtils.selectSpellSlot(actor, item.name, genericUtils.format('CHRISPREMADES.Dialog.Use', {itemName: item.name}), {no: true, minLevel: modern ? item.system.level : 1});
        if (!slot) return;
        let level = actor.system.spells[slot === 'pact' ? 'pact' : 'spell' + slot]?.level ?? Number(slot);
        let count = modern ? level + itemUtils.getConfig(item, 'baseDiceNumber') - (item.system.level ?? 1) : Math.min(level + 1, 5);
        formula = count + (modern ? itemUtils.getConfig(item, 'diceSize') : 'd8');
    } else if (actor.type === 'npc') {
        formula = itemDamage(item);
    }
    if (!formula) {
        genericUtils.notify('CHRISPREMADES.Macros.AttackRider.NoSmiteResource', 'warn');
        return;
    }
    let types = modern ? itemUtils.getConfig(item, 'creatureTypes') : ['undead', 'fiend'];
    if (types.includes(actorUtils.typeOrRace(target.actor))) {
        let die = modern ? itemUtils.getConfig(item, 'diceSize') : 'd8';
        let match = formula.match(/^(\d+)(d\d+)$/);
        formula = match?.[2] === die ? (Number(match[1]) + 1) + die : formula + ' + 1' + die;
    }
    return {formula, slot, linked};
}

async function consumeSmite(item, actor, smite) {
    if (smite.linked) {
        let message = {};
        let result = await smite.linked.consume({consume: {action: false, resources: true, spellSlot: false}, scaling: 0}, message);
        if (!result) throw new Error('Smite resource consumption was cancelled.');
        return async () => {
            let deltas = message.data?.system?.deltas;
            if (deltas) await smite.linked.refund(deltas);
        };
    }
    if (smite.slot) {
        let key = smite.slot === 'pact' ? 'pact' : 'spell' + smite.slot;
        if (!(actor.system.spells[key]?.value > 0)) throw new Error('The selected Smite spell slot is no longer available.');
        await consumeSlot(actor, smite.slot);
        return async () => genericUtils.update(actor, {['system.spells.' + key + '.value']: actor.system.spells[key].value + 1});
    }
    await spendUse(item, {inCombatOnly: false});
    return async () => {
        if (hasLimitedUses(item)) await genericUtils.update(item, {'system.uses.spent': Math.max(0, (item.system.uses.spent ?? 0) - 1)});
    };
}

async function consumeSlot(actor, slot) {
    if (!slot) return;
    let key = slot === 'pact' ? 'pact' : 'spell' + slot;
    await genericUtils.update(actor, {['system.spells.' + key + '.value']: actor.system.spells[key].value - 1});
}

async function manual({trigger: {entity: item}, actor, token, config = {}}, identifier, {modern = false} = {}) {
    if (config.midiOptions?.cprRiderCard) return;
    let selected = Array.from(game.user.targets ?? []);
    let recent = recentHits.get(actor.uuid);
    if (recent && Date.now() - recent.time > MAX_AGE) recent = undefined;
    if (selected.length > 1 || (!selected.length && !recent)) {
        genericUtils.notify('CHRISPREMADES.Macros.AttackRider.SelectTarget', 'warn');
        return true;
    }
    let target = selected[0] ?? recent.target;
    if (recent?.target.document.uuid !== target.document.uuid) recent = undefined;
    let workflow = recent?.workflow ?? {actor};
    let pendingKey = actor.uuid + ':' + identifier;
    if (pendingManual.has(pendingKey) || riderState(workflow, identifier).pending || !available(item, workflow, identifier)) {
        genericUtils.notify('CHRISPREMADES.Macros.AttackRider.AlreadyUsed', 'warn');
        return true;
    }
    let needsBonusAction = identifier === 'divineSmite' && modern && item.type === 'spell';
    if (needsBonusAction && (actorUtils.hasUsedBonusAction(actor) || !ownTurn(token))) {
        genericUtils.notify('CHRISPREMADES.Macros.AttackRider.BonusAction', 'warn');
        return true;
    }
    let state = riderState(workflow, identifier);
    state.pending = true;
    pendingManual.add(pendingKey);
    let refund, damageApplied = false;
    try {
        let confirmed = await dialogUtils.confirm(item.name, genericUtils.format('CHRISPREMADES.Macros.AttackRider.ManualConfirm', {name: item.name, target: target.name ?? target.actor.name}));
        if (!confirmed) return true;
        let smite, formula, damageType;
        if (identifier === 'sneakAttack') {
            formula = sneakFormula(item, actor, {modern});
            damageType = recent?.workflow.defaultDamageType ?? itemDamageType(item);
            if (!damageType) damageType = await dialogUtils.selectDamageType(Object.keys(CONFIG.DND5E.damageTypes), item.name, 'CHRISPREMADES.Config.DamageType');
            if (!damageType) return true;
        } else {
            smite = await smiteFormula(item, actor, target, {modern});
            formula = smite?.formula;
            damageType = itemUtils.getConfig(item, 'damageType');
        }
        if (!formula) {
            if (identifier === 'sneakAttack') genericUtils.notify('CHRISPREMADES.Macros.SneakAttack.Scale', 'warn');
            return true;
        }
        let critical = recent ? !!recent.workflow.isCritical : await dialogUtils.confirm(item.name, 'CHRISPREMADES.Macros.AttackRider.Critical');
        if (critical === undefined || critical === null) return true;
        if (critical) formula = await rollUtils.getCriticalFormula(formula, actor.getRollData());
        if (smite) refund = await consumeSmite(item, actor, smite);
        let itemData = {
            _id: genericUtils.randomID(),
            name: item.name, img: item.img, type: 'feat',
            system: {
                activities: {
                    cprRiderDamage00: {
                        _id: 'cprRiderDamage00', type: 'damage', name: item.name,
                        activation: {type: 'special'},
                        target: {affects: {type: 'creature', count: '1'}, prompt: false},
                        damage: {critical: {allow: false}, parts: [{custom: {enabled: true, formula}, types: [damageType]}]},
                        consumption: {spellSlot: false, targets: []}
                    }
                }
            }
        };
        let result = await workflowUtils.syntheticItemDataRoll(itemData, actor, [target], {
            killAnim: true,
            options: {workflowOptions: {fastForwardDamage: true, fastForwardAttack: true}}
        });
        if (!result || result.aborted || !result.damageRolls?.length) return true;
        damageApplied = true;
        await applied(workflow, identifier);
        if (!smite) await spendUse(item);
        if (needsBonusAction) await actorUtils.setBonusActionUsed(actor);
        return true;
    } finally {
        state.pending = false;
        pendingManual.delete(pendingKey);
        if (refund && !damageApplied) await refund();
    }
}

export const attackRiders = {hitTarget, rollType, hasLimitedUses, hasUses, available, spendUse, applied, run, itemDamage, sneakFormula, ownTurn, spellSlots, linkedSmite, smiteFormula, consumeSlot, consumeSmite, manual, ready};
