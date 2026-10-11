import {Crosshairs} from '../crosshairs.js';
import {genericUtils} from '../../utils.js';
async function aimCrosshair({token, maxRange, crosshairsConfig, centerpoint, drawBoundries = true, customCallbacks, trackDistance = true, fudgeDistance = 0, validityFunctions = []}) {
    let distance = 0;
    let widthAdjust = 0;
    if (maxRange) maxRange = Number(maxRange);
    if (!centerpoint) {
        let actualHalf = token.document.width / 2;
        widthAdjust += canvas.grid.distance * Math.floor(actualHalf);
        if (!fudgeDistance && (widthAdjust !== actualHalf * canvas.grid.distance)) {
            fudgeDistance = 2.5;
        }
        fudgeDistance += widthAdjust;
    }
    centerpoint = centerpoint ?? token.center;
    let drawing;
    let container;
    let marker, activeCrosshair;
    let valid = true;
    const validate = position => {
        distance = Math.max(0, canvas.grid.measurePath([centerpoint, position]).distance.toNearest(0.01) - widthAdjust);
        return !token.checkCollision(position, {origin: token.center, type: 'move', mode: 'any'}) && (!maxRange || distance <= maxRange) && validityFunctions.every(check => check(position));
    };
    let checkDistance = async (crosshairs) => {
        activeCrosshair = crosshairs;
        marker = new PIXI.Graphics();
        marker.eventMode = 'none';
        canvas.controls.addChild(marker);
        if (maxRange && drawBoundries) {
            let radius = (canvas.grid.size * ((maxRange + fudgeDistance + widthAdjust) / canvas.grid.distance));
            drawing = new PIXI.Graphics();
            drawing.lineStyle(5, 0xffffff);
            drawing.drawCircle(centerpoint.x, centerpoint.y, radius);
            drawing.tint = 0x32cd32;
            container = new PIXI.Container();
            container.addChild(drawing);
            canvas.controls.addChild(container);
        }
        while (crosshairs.inFlight) {
            await genericUtils.sleep(100);
            if (!crosshairs.inFlight || crosshairs._destroyed) break;
            if (trackDistance) {
                valid = validate(crosshairs);
                const radius = ((crosshairsConfig?.size ?? canvas.grid.distance * token.document.width / 2) / canvas.grid.distance) * canvas.grid.size;
                marker.clear().lineStyle(6, 0x101820, 0.9).drawCircle(0, 0, radius)
                    .lineStyle(3, valid ? 0x6ccbd9 : 0xe65e64, 1).drawCircle(0, 0, radius);
                marker.position.set(crosshairs.x, crosshairs.y);
                // Below checks if token can see place wants to move thing to - sort of
                if (!valid) {
                    crosshairs.icon = 'icons/svg/hazard.svg';
                    if (drawing) drawing.tint = 0xff0000;
                    valid = false;
                } else {
                    crosshairs.icon = crosshairsConfig?.icon ?? Crosshairs.defaultCrosshairsConfig().icon;
                    if (drawing) drawing.tint = 0x32cd32;
                    valid = true;
                }
                crosshairs.draw();
                crosshairs.label = distance + '/' + maxRange + 'ft.';
            }
        }
    };
    let callbacks = {
        ...(customCallbacks ?? {}),
        show: async crosshairs => {
            const tracking = checkDistance(crosshairs);
            await customCallbacks?.show?.(crosshairs);
            await tracking;
        }
    };
    let options = {};
    if (trackDistance) options.label = '0ft';
    options = {
        ...options,
        ...crosshairsConfig
    };
    if (token?.document.rotation) options.direction = token.document.rotation;
    if (!maxRange) return await Crosshairs.showCrosshairs(options);
    const guardClick = event => {
        if (event.target?.id !== 'board' || event.button !== 0 || !activeCrosshair?.inFlight) return;
        const rect = canvas.app.view.getBoundingClientRect();
        const screen = new PIXI.Point((event.clientX - rect.left) * canvas.app.screen.width / rect.width, (event.clientY - rect.top) * canvas.app.screen.height / rect.height);
        const point = Crosshairs.getSnappedPosition(canvas.stage.worldTransform.applyInverse(screen), activeCrosshair.resolution);
        if (activeCrosshair.document.shapes) {
            const shapes = foundry.utils.deepClone(activeCrosshair.document.shapes);
            shapes[0].x = point.x;
            shapes[0].y = point.y;
            activeCrosshair.document.updateSource({shapes});
        } else activeCrosshair.document.updateSource(point);
        activeCrosshair.refresh();
        if (validate(point)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
    };
    globalThis.window?.addEventListener('pointerdown', guardClick, true);
    try {
        let result = await Crosshairs.showCrosshairs(options, callbacks);
        if (!result.cancelled) valid = validate(result);
        return {...result, valid};
    } finally {
        drawing?.destroy();
        container?.destroy();
        marker?.destroy();
        globalThis.window?.removeEventListener('pointerdown', guardClick, true);
    }
}
export let crosshairUtils = {
    aimCrosshair
};
