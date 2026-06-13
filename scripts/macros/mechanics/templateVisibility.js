import {genericUtils, templateUtils, tokenUtils, workflowUtils} from '../../utils.js';
async function check(workflow) {
    if (!workflow.item || !workflow.token || !workflow.targets.size || !workflow.activity) return;
    if (!workflowUtils.isAttackType(workflow, 'attack')) return;
    let target = workflow.targets.first();
    let source = workflow.token;
    let templates = source.scene.regions.filter(template => {
        if (!genericUtils.isTemplateRegion(template)) return false;
        if (!template.flags['chris-premades']?.template?.visibility?.obscured) return false;
        let testRay = new foundry.canvas.geometry.Ray(source.center, target.center);
        return templateUtils.rayIntersectsTemplate(template, testRay);
    });
    templates.push(...templateUtils.getTemplatesInToken(source));
    templates.push(...templateUtils.getTemplatesInToken(target));
    templates = Array.from(new Set(templates));
    templates = templates.filter(i => i.flags['chris-premades']?.template?.visibility);
    if (!templates.length) return;
    let sourceSenses = source.actor.system.attributes.senses.ranges ?? {};
    let targetSenses = target.actor.system.attributes.senses.ranges ?? {};
    let sourceMD = source.actor.flags['chris-premades']?.senses?.magicalDarkness ?? 0;
    let targetMD = target.actor.flags['chris-premades']?.senses?.magicalDarkness ?? 0;
    let distance = tokenUtils.getDistance(source, target);
    templates.forEach(template => {
        let flagData = template.flags['chris-premades'].template.visibility;
        let canSeeTokens = flagData.canSeeTokens ?? [];
        let sourceCanSeeTarget = ((flagData.magicalDarkness && distance <= sourceMD) || ((sourceSenses.tremorsense ?? 0) >= distance) || ((sourceSenses.blindsight ?? 0) >= distance) || ((sourceSenses.truesight ?? 0) >= distance) || (canSeeTokens.includes(source.document.uuid)));
        let targetCanSeeSource = ((flagData.magicalDarkness && distance <= targetMD) || ((targetSenses.tremorsense ?? 0) >= distance) || ((targetSenses.blindsight ?? 0) >= distance) || ((targetSenses.truesight ?? 0) >= distance) || (canSeeTokens.includes(target.document.uuid)));
        let templateName = templateUtils.getName(template);
        if (!targetCanSeeSource) {
            workflow.tracker.advantage.add(templateName, genericUtils.translate('CHRISPREMADES.Template.TargetCantSeeAttacker'));
        }
        if (!sourceCanSeeTarget) {
            workflow.flankingAdvantage = false;
            workflow.tracker.disadvantage.add(templateName, genericUtils.translate('CHRISPREMADES.Template.AttackerCantSeeTarget'));
        }
    });
}
export let templateVisibility = {
    check
};
