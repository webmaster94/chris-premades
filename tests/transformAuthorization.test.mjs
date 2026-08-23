/* eslint-env node */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const repositoryRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const subjectPath = path.join(repositoryRoot, 'scripts/lib/transformAuthorization.js');

async function loadSubject() {
    let context = vm.createContext({console});
    let subject = new vm.SourceTextModule(readFileSync(subjectPath, 'utf8'), {
        context,
        identifier: subjectPath
    });
    await subject.link(() => {
        throw new Error('transformAuthorization.js must remain dependency-free');
    });
    await subject.evaluate();
    return subject.namespace;
}

function request(overrides = {}) {
    return {
        activityOwner: true,
        activityType: 'transform',
        activityUuid: 'Actor.caster.Item.polymorph.Activity.transform',
        allowPolymorphing: true,
        messageActivityUuid: 'Actor.caster.Item.polymorph.Activity.transform',
        messageAuthorId: 'player',
        messageSourceUuid: 'Compendium.dnd5e.actors.Actor.rex',
        messageTargetUuids: ['Actor.target'],
        messageTimestamp: 1_000,
        now: 2_000,
        requestedSourceUuid: 'Compendium.dnd5e.actors.Actor.rex',
        requestedTargetUuid: 'Actor.target',
        userCanCreateActors: true,
        userId: 'player',
        ...overrides
    };
}

test('authorizes an owned Transform message for its recorded target and source', async () => {
    let {authorizeTransformRequest} = await loadSubject();
    let result = authorizeTransformRequest(request());
    assert.equal(result.ok, true);
    assert.equal(result.reason, '');
});

test('rejects a target that was not recorded on the Transform message', async () => {
    let {authorizeTransformRequest} = await loadSubject();
    let result = authorizeTransformRequest(request({requestedTargetUuid: 'Actor.forged'}));
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'target');
});

test('rejects a source that differs from the Transform message', async () => {
    let {authorizeTransformRequest} = await loadSubject();
    let result = authorizeTransformRequest(request({requestedSourceUuid: 'Actor.ancientDragon'}));
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'source');
});

test('rejects another player replaying the Transform message', async () => {
    let {authorizeTransformRequest} = await loadSubject();
    let result = authorizeTransformRequest(request({userId: 'other-player'}));
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'author');
});

test('rejects stale messages and callers without the required Foundry permissions', async () => {
    let {authorizeTransformRequest} = await loadSubject();
    let result = authorizeTransformRequest(request({now: 1_000 + 1_800_001}));
    assert.equal(result.reason, 'expired');
    result = authorizeTransformRequest(request({activityOwner: false}));
    assert.equal(result.reason, 'activity-owner');
    result = authorizeTransformRequest(request({userCanCreateActors: false}));
    assert.equal(result.reason, 'actor-create');
    result = authorizeTransformRequest(request({allowPolymorphing: false}));
    assert.equal(result.reason, 'setting');
});

test('finds only a recent Transform message from the caller for the recorded target and source', async () => {
    let {findTransformMessage} = await loadSubject();
    let valid = {
        activityType: 'transform',
        authorId: 'player',
        id: 'valid',
        sourceUuid: 'Actor.rex',
        targetUuids: ['Actor.target'],
        timestamp: 2_000
    };
    let messages = [
        valid,
        {...valid, authorId: 'other', id: 'other-author'},
        {...valid, id: 'other-target', targetUuids: ['Actor.forged']}
    ];

    assert.equal(findTransformMessage(messages, {
        now: 3_000,
        sourceActorUuid: 'Actor.rex',
        targetActorUuid: 'Actor.target',
        userId: 'player'
    }).id, 'valid');
});
