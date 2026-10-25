// CAT owns automation selection, status, versions, application and bulk updates.
// These delegates preserve the public CPR utility entry points used by world macros.
export const catAuthority = {
    status(item) { return cat.utils.automationUtils.getAutomationStatus(item); },
    version(item) { return cat.utils.documentUtils.getVersion(item); },
    source(item) { return cat.utils.documentUtils.getSource(item); },
    async update(item, options) { return await cat.utils.automationUtils.updateItem(item, options); },
    async updateActor(actor) {
        for (const item of actor.items) {
            if (!cat.utils.automationUtils.getAppliedOrPreferredAutomation(item)) continue;
            if (cat.utils.automationUtils.isUpToDate(item)) continue;
            await cat.utils.automationUtils.updateItem(item);
        }
    },
    open(document) {
        const Application = cat.applications[document.documentName + 'Medkit'];
        if (!Application) return;
        return new Application({document}).render(true);
    }
};
