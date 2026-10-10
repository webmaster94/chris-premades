const MAX_TRANSFORM_MESSAGE_AGE = 30 * 60 * 1000;

function getTransformMessageData(message) {
    let activity = message.system?.activity ?? message.flags?.dnd5e?.activity;
    let targets = message.system?.targets ?? message.flags?.dnd5e?.targets ?? [];
    return {
        activityType: activity?.type,
        activityUuid: activity?.uuid,
        authorId: message.author?.id,
        id: message.id,
        sourceUuid: message.getFlag('dnd5e', 'transform.uuid'),
        targetUuids: targets.map(target => target.actor ?? target.uuid).filter(uuid => uuid),
        timestamp: message.timestamp
    };
}

function authorizeTransformRequest(request) {
    if (!request.allowPolymorphing) return {ok: false, reason: 'setting'};
    if (!request.userCanCreateActors) return {ok: false, reason: 'actor-create'};
    if (!request.activityOwner) return {ok: false, reason: 'activity-owner'};
    if (request.activityType !== 'transform') return {ok: false, reason: 'activity-type'};
    if (request.messageAuthorId !== request.userId) return {ok: false, reason: 'author'};
    if (!Number.isFinite(request.messageTimestamp) || request.now - request.messageTimestamp > MAX_TRANSFORM_MESSAGE_AGE) {
        return {ok: false, reason: 'expired'};
    }
    if (request.messageActivityUuid !== request.activityUuid) return {ok: false, reason: 'activity'};
    if (request.messageSourceUuid !== request.requestedSourceUuid) return {ok: false, reason: 'source'};
    if (!request.messageTargetUuids.includes(request.requestedTargetUuid)) return {ok: false, reason: 'target'};
    return {ok: true, reason: ''};
}

function findTransformMessage(messages, {now, sourceActorUuid, targetActorUuid, userId}) {
    return messages.toReversed().find(message => {
        return message.authorId === userId
            && message.activityType === 'transform'
            && message.sourceUuid === sourceActorUuid
            && message.targetUuids.includes(targetActorUuid)
            && Number.isFinite(message.timestamp)
            && now - message.timestamp <= MAX_TRANSFORM_MESSAGE_AGE;
    });
}

export {authorizeTransformRequest, findTransformMessage, getTransformMessageData, MAX_TRANSFORM_MESSAGE_AGE};
