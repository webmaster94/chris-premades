#!/usr/bin/env node

import {readFileSync, readdirSync, statSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

const modeTypes = new Map([
    [0, 'custom'],
    [1, 'multiply'],
    [2, 'add'],
    [3, 'downgrade'],
    [4, 'upgrade'],
    [5, 'override']
]);

// DAE 14 on dnd5e 5.x registers source/target-relative expiry events and
// migrates these five legacy special durations to duration.expiry.
const specialDurationExpiry = new Map([
    ['turnStart', 'targetStart'],
    ['turnEnd', 'targetEnd'],
    ['turnStartSource', 'sourceStart'],
    ['turnEndSource', 'sourceEnd'],
    ['combatEnd', 'combatEnd']
]);

const write = process.argv.includes('--write');
const requestedRoots = process.argv.slice(2).filter(argument => argument !== '--write');
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const roots = requestedRoots.length ? requestedRoots.map(root => resolve(root)) : [scriptDirectory];

const stats = {
    filesScanned: 0,
    filesChanged: 0,
    effects: 0,
    rootChangesMoved: 0,
    changeModesConverted: 0,
    changePhasesAdded: 0,
    durationsCanonicalized: 0,
    combinedDurationsResolved: 0,
    startsCanonicalized: 0,
    expiryValuesAdded: 0,
    expiredFlagsAdded: 0,
    specialDurationsMigrated: 0,
    specialMappings: {},
    errors: []
};

function walkFiles(path, files = []) {
    const stat = statSync(path);
    if (stat.isDirectory()) {
        for (const entry of readdirSync(path)) walkFiles(join(path, entry), files);
    } else if (path.endsWith('.json')) {
        files.push(path);
    }
    return files;
}

function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
}

function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isActiveEffect(value, parentKey) {
    if (!isObject(value) || parentKey !== 'effects') return false;
    if (typeof value._key === 'string' && value._key.includes('.effects!')) return true;
    if (typeof value.name !== 'string') return false;
    return hasOwn(value, 'changes')
        || Array.isArray(value.system?.changes)
        || hasOwn(value, 'duration')
        || hasOwn(value, 'transfer')
        || hasOwn(value, 'statuses')
        || isObject(value.flags?.dae);
}

function error(file, path, message) {
    stats.errors.push(`${file}:${path} ${message}`);
}

function mappedMode(mode) {
    const number = Number(mode);
    if (!Number.isInteger(number)) return undefined;
    return modeTypes.get(number) ?? `custom.${number}`;
}

function migrateChanges(effect, file, path) {
    if (!isObject(effect.system)) effect.system = {};
    if (hasOwn(effect, 'changes')) {
        if (!Array.isArray(effect.changes)) {
            error(file, path, 'root changes is not an array');
            return;
        }
        if (Array.isArray(effect.system.changes) && effect.system.changes.length
            && JSON.stringify(effect.system.changes) !== JSON.stringify(effect.changes)) {
            error(file, path, 'root changes conflicts with system.changes');
            return;
        }
        effect.system.changes = effect.changes;
        delete effect.changes;
        stats.rootChangesMoved++;
    }
    effect.system.changes ??= [];
    if (!Array.isArray(effect.system.changes)) {
        error(file, path, 'system.changes is not an array');
        return;
    }
    for (const [index, change] of effect.system.changes.entries()) {
        if (!isObject(change)) {
            error(file, `${path}.system.changes[${index}]`, 'change is not an object');
            continue;
        }
        if (hasOwn(change, 'mode')) {
            const type = mappedMode(change.mode);
            if (!type) {
                error(file, `${path}.system.changes[${index}]`, `unsupported mode ${JSON.stringify(change.mode)}`);
            } else if (change.type && change.type !== type) {
                error(file, `${path}.system.changes[${index}]`, `mode/type conflict ${change.mode}/${change.type}`);
            } else {
                change.type = type;
                delete change.mode;
                stats.changeModesConverted++;
            }
        }
        if (typeof change.type !== 'string' || !change.type.length) {
            error(file, `${path}.system.changes[${index}]`, 'missing string type');
        }
        if (!hasOwn(change, 'phase')) {
            change.phase = 'initial';
            stats.changePhasesAdded++;
        }
    }
}

function chooseLegacyDuration(duration, file, path) {
    const seconds = duration.seconds;
    const rounds = duration.rounds;
    const turns = duration.turns;
    const positive = [rounds, turns].filter(value => Number.isFinite(value) && value > 0);
    // Legacy DAE commonly serialized a one-round duration as rounds: 1,
    // turns: 1. v14 cannot combine units; rounds is the preserving choice.
    if (positive.length > 1) stats.combinedDurationsResolved++;
    if (Number.isFinite(seconds)) return {value: seconds, units: 'seconds'};
    if (Number.isFinite(rounds) && rounds > 0) return {value: rounds, units: 'rounds'};
    if (Number.isFinite(turns)) return {value: turns, units: 'turns'};
    if (Number.isFinite(rounds)) return {value: rounds, units: 'rounds'};
    return {value: null, units: 'seconds'};
}

function migrateSpecialDurations(effect, file, path) {
    const specialDurations = effect.flags?.dae?.specialDuration;
    if (specialDurations === undefined) return undefined;
    if (!Array.isArray(specialDurations)) {
        error(file, `${path}.flags.dae.specialDuration`, 'specialDuration is not an array');
        return undefined;
    }
    const deprecated = specialDurations.filter(duration => specialDurationExpiry.has(duration));
    const expiries = [...new Set(deprecated.map(duration => specialDurationExpiry.get(duration)))];
    if (expiries.length > 1) {
        error(file, `${path}.flags.dae.specialDuration`, `multiple native expiry events ${expiries.join(', ')}`);
        return undefined;
    }
    if (!deprecated.length) return undefined;
    effect.flags.dae.specialDuration = specialDurations.filter(duration => !specialDurationExpiry.has(duration));
    for (const duration of deprecated) {
        const mapping = `${duration}->${specialDurationExpiry.get(duration)}`;
        stats.specialMappings[mapping] = (stats.specialMappings[mapping] ?? 0) + 1;
        stats.specialDurationsMigrated++;
    }
    return expiries[0];
}

function migrateDuration(effect, file, path, mappedExpiry) {
    const original = isObject(effect.duration) ? effect.duration : {};
    const legacyKeys = ['seconds', 'rounds', 'turns', 'startTime', 'combat', 'startRound', 'startTurn'];
    const isLegacy = legacyKeys.some(key => hasOwn(original, key));
    const duration = {};
    if (hasOwn(original, 'value') && hasOwn(original, 'units')) {
        duration.value = original.value;
        duration.units = original.units;
    } else {
        Object.assign(duration, chooseLegacyDuration(original, file, `${path}.duration`));
    }
    duration.expiry = mappedExpiry ?? (hasOwn(original, 'expiry')
        ? original.expiry
        : (typeof duration.value === 'number' ? 'turnStart' : null));
    duration.expired = hasOwn(original, 'expired') ? Boolean(original.expired) : false;
    effect.duration = duration;
    if (isLegacy || JSON.stringify(original) !== JSON.stringify(duration)) stats.durationsCanonicalized++;
    if (!hasOwn(original, 'expiry') || mappedExpiry !== undefined) stats.expiryValuesAdded++;
    if (!hasOwn(original, 'expired')) stats.expiredFlagsAdded++;

    // Pack source must never preserve a runtime combat/world-time origin.
    // Foundry stamps start when an effect instance is created on an Actor.
    if (!hasOwn(effect, 'start') || effect.start !== null) {
        effect.start = null;
        stats.startsCanonicalized++;
    }
}

function validateEffect(effect, file, path) {
    if (hasOwn(effect, 'changes')) error(file, path, 'legacy root changes remains');
    if (!Array.isArray(effect.system?.changes)) error(file, path, 'canonical system.changes missing');
    for (const [index, change] of (effect.system?.changes ?? []).entries()) {
        if (hasOwn(change, 'mode')) error(file, `${path}.system.changes[${index}]`, 'legacy numeric mode remains');
        if (typeof change.type !== 'string') error(file, `${path}.system.changes[${index}]`, 'string type missing');
        if (typeof change.phase !== 'string') error(file, `${path}.system.changes[${index}]`, 'phase missing');
    }
    for (const key of ['seconds', 'rounds', 'turns', 'startTime', 'combat', 'startRound', 'startTurn']) {
        if (hasOwn(effect.duration ?? {}, key)) error(file, `${path}.duration`, `legacy ${key} remains`);
    }
    if (!hasOwn(effect.duration ?? {}, 'value') || !hasOwn(effect.duration ?? {}, 'units')
        || !hasOwn(effect.duration ?? {}, 'expiry') || !hasOwn(effect.duration ?? {}, 'expired')) {
        error(file, `${path}.duration`, 'canonical duration fields missing');
    }
    if (!hasOwn(effect, 'start')) error(file, path, 'canonical start field missing');
    const remaining = effect.flags?.dae?.specialDuration?.filter(duration => specialDurationExpiry.has(duration)) ?? [];
    if (remaining.length) error(file, `${path}.flags.dae.specialDuration`, `deprecated entries remain: ${remaining.join(', ')}`);
}

function migrateTree(value, file, path = '$', parentKey) {
    if (Array.isArray(value)) {
        value.forEach((entry, index) => migrateTree(entry, file, `${path}[${index}]`, parentKey));
        return;
    }
    if (!isObject(value)) return;
    if (isActiveEffect(value, parentKey)) {
        stats.effects++;
        migrateChanges(value, file, path);
        const mappedExpiry = migrateSpecialDurations(value, file, path);
        migrateDuration(value, file, path, mappedExpiry);
        validateEffect(value, file, path);
    }
    for (const [key, child] of Object.entries(value)) migrateTree(child, file, `${path}.${key}`, key);
}

const pendingWrites = [];
for (const root of roots) {
    for (const file of walkFiles(root)) {
        stats.filesScanned++;
        const before = readFileSync(file, 'utf8');
        let data;
        try {
            data = JSON.parse(before);
        } catch (parseError) {
            error(file, '$', `invalid JSON: ${parseError.message}`);
            continue;
        }
        const semanticBefore = JSON.stringify(data);
        migrateTree(data, file);
        const eol = before.includes('\r\n') ? '\r\n' : '\n';
        const after = `${JSON.stringify(data, null, 2)}\n`.replaceAll('\n', eol);
        if (JSON.stringify(data) !== semanticBefore) {
            stats.filesChanged++;
            pendingWrites.push({file, after});
        }
    }
}

if (stats.errors.length) {
    console.error(stats.errors.join('\n'));
    console.error(`errors: ${stats.errors.length}`);
    process.exit(1);
}

if (write) {
    for (const {file, after} of pendingWrites) writeFileSync(file, after);
}

console.log(JSON.stringify({...stats, mode: write ? 'write' : 'audit'}, null, 2));
