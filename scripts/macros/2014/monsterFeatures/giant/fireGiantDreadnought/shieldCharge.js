import {effectUtils, genericUtils, templateUtils, tokenUtils} from '../../../../../utils.js';
async function use({trigger, workflow}) {
    if (!workflow.failedSaves.size || !workflow.token || !workflow.template) return;
    let regionDoc = templateUtils.getRegionDoc(workflow.template);
    let templateDoc = regionDoc ? foundry.documents.MeasuredTemplateDocument._fromRegion(regionDoc) : workflow.template;
    let templateAngle = Math.toRadians(templateDoc.direction ?? 0);
    let templateDistance = (templateDoc.distance ?? 0) * canvas.dimensions.distancePixels;
    await Promise.all(workflow.failedSaves.map(async token => {
        let ray = foundry.canvas.geometry.Ray.fromAngle(token.x, token.y, templateAngle, templateDistance);
        await tokenUtils.moveTokenAlongRay(token, ray, 30);
        await effectUtils.applyConditions(token.actor, ['prone']);
    }));
    let ray = foundry.canvas.geometry.Ray.fromAngle(workflow.token.x, workflow.token.y, templateAngle, templateDistance);
    await tokenUtils.moveTokenAlongRay(workflow.token, ray, 30);
}
export let shieldCharge = {
    name: 'Shield Charge',
    version: '1.3.73',
    monster: {
        name: 'Fire Giant Dreadnought'
    },
    rules: 'legacy',
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