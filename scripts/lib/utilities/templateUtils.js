import {genericUtils, tokenUtils} from '../../utils.js';
// v14: placed templates are Region documents (flags.core.MeasuredTemplate). The MeasuredTemplate
// document/placeable survives only as a deprecated shim (previews still use it). Every helper here
// accepts a MeasuredTemplateDocument, a RegionDocument, a placeable, or a UUID string.
function getRegionDoc(template) {
    if (!template) return undefined;
    let doc = template;
    if (typeof doc === 'string') doc = fromUuidSync(doc, {strict: false});
    if (!doc) return undefined;
    if (doc.documentName === 'Region') return doc;
    if (doc.document) doc = doc.document;
    let scene = doc.parent ?? canvas.scene;
    return scene?.regions?.get(doc.id ?? doc._id);
}
// Old MeasuredTemplate UUIDs and their backing Region share the document id but not the UUID string.
function normalizeTemplateUuid(uuid) {
    return uuid?.replace('.MeasuredTemplate.', '.Region.');
}
function getPosition(template) {
    let regionDoc = getRegionDoc(template);
    if (regionDoc) {
        let shape = regionDoc.shapes?.at?.(0);
        return {x: shape?.x ?? 0, y: shape?.y ?? 0};
    }
    return {x: template?.x ?? 0, y: template?.y ?? 0};
}
// Boundary-inclusive containment: Region/Clipper treats the boundary as outside, old shape.contains
// did not — tolerance 1px restores v13 targeting parity (midi-qol uses the same value).
function regionContainsPoint(regionDoc, point) {
    return regionDoc.polygonTree.testPoint(point, 1);
}
function tokenInElevationBand(regionDoc, tokenDocument) {
    let {bottom, top} = regionDoc.elevation ?? {};
    let elevation = tokenDocument.elevation ?? 0;
    return (bottom ?? -Infinity) <= elevation && elevation <= (top ?? Infinity);
}
function getTokensInShape(shape, scene, {x: offsetX, y: offsetY}={x: 0, y: 0}) {
    let tokens = new Set();
    if (!shape && !scene) return tokens;
    let sceneTokens = scene.tokens;
    for (let token of sceneTokens) {
        let pointCollisions = tokenUtils.getTokenCenterPoints(token)
            .map(i => ({x: i.x - offsetX, y: i.y - offsetY}))
            .filter(i => shape.contains(i.x, i.y));
        for (let point of pointCollisions) {
            if (shape.getBounds().pointIsOn(point)) continue;
            tokens.add(token.object);
            break;
        }
    }
    return tokens;
}
function getTokensInTemplate(template) {
    let regionDoc = getRegionDoc(template);
    if (regionDoc) {
        let tokens = new Set();
        let scene = regionDoc.parent;
        if (!scene) return tokens;
        for (let token of scene.tokens) {
            if (!tokenInElevationBand(regionDoc, token)) continue;
            if (tokenUtils.getTokenCenterPoints(token).some(p => regionContainsPoint(regionDoc, p))) tokens.add(token.object);
        }
        return tokens;
    }
    // Preview templates have no backing Region yet — fall back to the placeable's shape
    return getTokensInShape(template?.object?.shape, template?.parent ?? template?.document?.parent, getPosition(template));
}
function getTemplatesInToken(token) {
    let templates = new Set();
    let scene = token?.document?.parent;
    if (!scene) return templates;
    let pointsToTest = tokenUtils.getTokenCenterPoints(token.document);
    for (let region of scene.regions) {
        if (!genericUtils.isTemplateRegion(region)) continue;
        if (!tokenInElevationBand(region, token.document)) continue;
        if (pointsToTest.some(i => regionContainsPoint(region, i))) templates.add(region);
    }
    return templates;
}
function findGrids(A, B, template) {
    let locations = new Set();
    let regionDoc = getRegionDoc(template);
    let scene = regionDoc?.parent ?? template.parent;
    if (!scene) return locations;
    let containsPoint;
    if (regionDoc) {
        containsPoint = point => regionContainsPoint(regionDoc, point);
    } else if (template.object?.shape) {
        containsPoint = point => template.object.shape.contains(point.x - template.object.center.x, point.y - template.object.center.y);
    } else return locations;
    let ray = new foundry.canvas.geometry.Ray(A, B);
    if (!ray.distance) return locations;
    let gridCenter = scene.grid.size / 2;
    let spacer = scene.grid.type === CONST.GRID_TYPES.SQUARE ? 1.41 : 1;
    let nMax = Math.max(Math.floor(ray.distance / (spacer * Math.min(scene.grid.sizeX, scene.grid.sizeY))), 1);
    let tMax = Array.fromRange(nMax + 1).map(t => t / nMax);
    let prior = null;
    for (let [i, t] of tMax.entries()) {
        let [r0, c0] = (i === 0) ? [null, null] : prior;
        let {i: r1, j: c1} = scene.grid.getOffset(ray.project(t));
        if (r0 === r1 && c0 === c1) continue;
        let {x: x1, y: y1} = scene.grid.getTopLeftPoint({i: r1, j: c1});
        if (containsPoint({x: x1 + gridCenter, y: y1 + gridCenter})) locations.add({x: x1, y: y1});
        prior = [r1, c1];
        if (i === 0) continue;
        if (!scene.grid.testAdjacency({i: r0, j: c0}, {i: r1, j: c1})) {
            let th = tMax[i - 1] + (0.5 / nMax);
            let {x: xh, y: yh} = scene.grid.getTopLeftPoint(ray.project(th));
            if (containsPoint({x: xh + gridCenter, y: yh + gridCenter})) locations.add({x: xh, y: yh});
        }
    }
    return locations;
}
function getCastData(template) {
    return template.flags['chris-premades']?.castData;
}
function getCastLevel(template) {
    return getCastData(template)?.castLevel;
}
function getBaseLevel(template) {
    return getCastData(template)?.baseLevel;
}
async function setCastData(template, data) {
    await template.setFlag('chris-premades', 'castData', data);
}
async function setCastLevel(template, level) {
    let data = getCastData(template) ?? {};
    data.castLevel = level;
    await setCastData(template, data);
}
async function setBaseLevel(template, level) {
    let data = getCastData(template) ?? {};
    data.baseLevel = level;
    await setCastData(template, data);
}
function getSaveDC(template) {
    return getCastData(template)?.saveDC;
}
async function setSaveDC(template, dc) {
    let data = getCastData(template) ?? {};
    data.saveDC = dc;
    await setCastData(template, data);
}
function getName(template) {
    return template.flags['chris-premades']?.template?.name ?? genericUtils.translate('CHRISPREMADES.Template.UnknownTemplate');
}
async function setName(template, name) {
    await template.setFlag('chris-premades', 'template.name', name);
}
async function placeTemplate(templateData, returnTokens=false) {
    let templateDoc = new CONFIG.MeasuredTemplate.documentClass(templateData, {parent: canvas.scene});
    let previewTemplate = new game.dnd5e.canvas.AbilityTemplate(templateDoc);
    let template = false;
    try {
        [template] = await previewTemplate.drawPreview();
    } catch (error) {/* Why does this throw an error when a template isn't placed by the user? */}
    // v14: the created doc is a shim proxy — hand back the backing Region so flags/uuids stay consistent
    if (template) template = getRegionDoc(template) ?? template;
    if (!returnTokens) return template;
    if (!template) return {template: null, tokens: []};
    await genericUtils.sleep(100);
    let tokens = getTokensInTemplate(template);
    return {template, tokens};
}
function rayIntersectsTemplate(templateDoc, ray) {
    return getIntersections(templateDoc, ray.A, ray.B, true);
}
function getRegionIntersections(regionDoc, A, B, boolOnly = false) {
    let totalIntersections = [];
    for (let shape of regionDoc.polygons) {
        if (shape.segmentIntersections) {
            let intersections = shape.segmentIntersections(A, B);
            if (boolOnly && intersections.length) return true;
            totalIntersections.push(...intersections);
            continue;
        }
        let points = shape.points;
        for (let i = 0; i < points.length; i += 2) {
            let currCoord = {x: points[i], y: points[i + 1]};
            let nextCoord = {x: points[(i + 2) % points.length], y: points[(i + 3) % points.length]};
            if (foundry.utils.lineSegmentIntersects(A, B, currCoord, nextCoord)) {
                if (boolOnly) return true;
                totalIntersections.push(foundry.utils.lineLineIntersection(A, B, currCoord, nextCoord));
            }
        }
    }
    if (boolOnly) return totalIntersections.length > 0;
    return totalIntersections;
}
function getIntersections(templateObj, A, B, boolOnly = false) {
    let regionDoc = getRegionDoc(templateObj);
    if (regionDoc) return getRegionIntersections(regionDoc, A, B, boolOnly);
    if (templateObj.shape.segmentIntersections) {
        let adjustedA = {
            x: A.x - templateObj.center.x,
            y: A.y - templateObj.center.y
        };
        let adjustedB = {
            x: B.x - templateObj.center.x,
            y: B.y - templateObj.center.y
        };
        let intersections = templateObj.shape.segmentIntersections(adjustedA, adjustedB);
        if (boolOnly) return intersections.length;
        return intersections.map(i => ({x: i.x + templateObj.center.x, y: i.y + templateObj.center.y}));
    }
    let intersections = [];
    let points = templateObj.shape.points;
    for (let i = 0; i < points.length; i += 2) {
        let currCoord = {
            x: points[i] + templateObj.center.x,
            y: points[i + 1] + templateObj.center.y
        };
        let nextCoord = {
            x: points[(i + 2) % points.length] + templateObj.center.x,
            y: points[(i + 3) % points.length] + templateObj.center.y
        };
        if (foundry.utils.lineSegmentIntersects(A, B, currCoord, nextCoord)) {
            if (boolOnly) return true;
            intersections.push(foundry.utils.lineLineIntersection(A, B, currCoord, nextCoord));
        }
    }
    if (boolOnly) return false;
    return intersections;
}
async function getSourceActor(template) {
    return (await fromUuid(template.flags.dnd5e?.origin))?.parent;
}
function getAbsolutePolygons(template) {
    let regionDoc = getRegionDoc(template);
    if (regionDoc) return regionDoc.polygons.map(p => p instanceof PIXI.Polygon ? p : p.toPolygon());
    let shape = template.object?.shape;
    if (!shape) return [];
    let polygon = (shape.type === PIXI.SHAPES.POLY ? shape : shape.toPolygon()).clone();
    for (let i = 0; i < polygon.points.length; i++) {
        if (i % 2) polygon.points[i] += template.y;
        else polygon.points[i] += template.x;
    }
    return [polygon];
}
function overlap(template1, template2) {
    let polygons1 = getAbsolutePolygons(template1);
    let polygons2 = getAbsolutePolygons(template2);
    for (let shape1 of polygons1) {
        for (let shape2 of polygons2) {
            if (shape1.intersectPolygon(shape2).points.length > 0) return true;
        }
    }
    return false;
}
async function attachToTemplate(template, uuidsToAttach) {
    let currAttached = template.flags?.['chris-premades']?.attached?.attachedEntityUuids ?? [];
    await genericUtils.update(template, {
        flags: {
            'chris-premades': {
                attached: {
                    attachedEntityUuids: currAttached.concat(...uuidsToAttach)
                }
            }
        }
    });
}
export let templateUtils = {
    getRegionDoc,
    normalizeTemplateUuid,
    getPosition,
    getTokensInShape,
    getTokensInTemplate,
    getTemplatesInToken,
    findGrids,
    getCastData,
    getCastLevel,
    getBaseLevel,
    setCastData,
    setCastLevel,
    setBaseLevel,
    getSaveDC,
    setSaveDC,
    getName,
    setName,
    placeTemplate,
    rayIntersectsTemplate,
    getIntersections,
    getSourceActor,
    overlap,
    attachToTemplate
};
