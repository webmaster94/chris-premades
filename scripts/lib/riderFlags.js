// D&D 6.1 uses a field-deletion sentinel when a rider category becomes empty.
export function mergeRiderFlags(item, updates, activityByIdentifier) {
    const oldHidden = item.flags?.['chris-premades']?.hiddenActivities ?? [];
    const hidden = updates.flags?.['chris-premades']?.hiddenActivities ?? oldHidden;
    const ids = identifiers => Array.isArray(identifiers)
        ? identifiers.map(identifier => activityByIdentifier(identifier)?.id).filter(Boolean) : [];
    const oldIds = new Set(ids(oldHidden));
    const system = updates.flags?.dnd5e;
    const incoming = system?.riders;
    const parentDeleted = system && (Object.hasOwn(system, '-=riders') || Object.hasOwn(system, 'riders') && (!incoming || typeof incoming !== 'object'));
    const hasActivity = incoming && typeof incoming === 'object' && Object.hasOwn(incoming, 'activity');
    const existing = item.flags?.dnd5e?.riders?.activity;
    const supplied = hasActivity ? incoming.activity : parentDeleted ? [] : existing;
    const systemIds = Array.isArray(supplied) ? supplied.filter(id => !oldIds.has(id)) : [];
    const merged = [...new Set([...systemIds, ...ids(hidden)])];
    if (!merged.length && parentDeleted) return;
    updates.flags ??= {};
    updates.flags.dnd5e ??= {};
    if (!incoming || typeof incoming !== 'object') updates.flags.dnd5e.riders = {};
    updates.flags.dnd5e.riders.activity = merged;
    if (merged.length) delete updates.flags.dnd5e['-=riders'];
}
