import {Crosshairs} from './crosshairs.js';
import {animationUtils, effectUtils, genericUtils} from '../utils.js';
import {crosshairUtils} from './utilities/crosshairUtils.js';
import {teleportPrompt} from './teleportPrompt.js';
export class Teleport {
    constructor(tokens, controllingToken, options) {
        this.tokens = Array.isArray(tokens) ? tokens : [tokens];
        this.controllingToken = controllingToken ?? this.tokens[0];
        this.tokenTexture = this.tokens[0].document.texture.src;
        this.options = options ?? {};
        this.updates = options?.updates ?? {};
    }
    static async group(tokens, controllingToken, options = {animation: 'none', isSynchronous: true, crosshairsConfig: {}, callbacks: {}, range: 100, updates: {}, minimizeSheet: true, centerpoint: null}) {
        genericUtils.setProperty(options, 'isGroup', true);
        let teleport = new Teleport(tokens, controllingToken, options);
        teleport.tokenTexture = controllingToken.document.texture.src;
        return await teleport.go(teleport.crosshairsConfig, options.minimizeSheet);
    }
    static async target(target, controllingToken, options = {animation: 'none', crosshairsConfig: {}, callbacks: {}, range: 100, updates: {}, minimizeSheet: true, centerpoint: null}) {
        let teleport = new Teleport(target, controllingToken, options);
        return await teleport.go(teleport.crosshairsConfigTarget, options.minimizeSheet);
    }
    async go(crosshairsConfig, minimizeSheet = true) {
        const sheet = this.controllingToken.actor?.sheet;
        const restoreSheet = sheet?.rendered && minimizeSheet;
        if (restoreSheet) await sheet.minimize();
        let prompt, crosshair, cancelled = false;
        if (globalThis.document) {
            prompt = teleportPrompt(
                this.options.title ?? genericUtils.translate('CHRISPREMADES.Teleport.Title'),
                genericUtils.format('CHRISPREMADES.Teleport.Destination', {name: this.tokens.map(token => token.name ?? token.document.name).join(', ')}),
                () => {
                    cancelled = true;
                    if (crosshair?.inFlight) {
                        crosshair.cancelled = true;
                        crosshair.inFlight = false;
                        crosshair.clearHandlers?.();
                        crosshair._clearHandlers?.();
                    }
                    prompt.close();
                }
            );
        }
        const callbacks = this.options.callbacks ?? {};
        let aimOptions = {
            token: this.controllingToken,
            maxRange: this.options.range,
            crosshairsConfig,
            drawBoundries: true,
            customCallbacks: {...callbacks, show: async preview => {
                crosshair = preview;
                if (cancelled) {
                    preview.cancelled = true;
                    preview.inFlight = false;
                    preview.clearHandlers?.();
                    preview._clearHandlers?.();
                    return;
                }
                await callbacks.show?.(preview);
            }},
            validityFunctions: this.options?.validityFunctions
        };
        if (this.options.centerpoint) aimOptions.centerpoint = this.options.centerpoint;
        try {
            this.template = await crosshairUtils.aimCrosshair(aimOptions);
            if (this.template && !this.template.cancelled && !cancelled && this.template.valid !== false) {
                this.options.isGroup ? await this._moveGroup() : await this._move();
            } else if (this.template?.valid === false && !this.template.cancelled) {
                genericUtils.notify('CHRISPREMADES.Teleport.Invalid', 'warn');
            }
            return this.template;
        } finally {
            await prompt?.close();
            if (restoreSheet) await sheet.maximize();
        }
    }
    async _move() {
        let tok = this.tokens[0];
        let position = {
            rotation: this.template.direction,
            x: this.template.x - tok.w / 2,
            y: this.template.y - tok.h / 2
        };
        if (tok.actor) {
            let grappled = effectUtils.getEffectByStatusID(tok.actor, 'grappled');
            if (grappled) await genericUtils.remove(grappled);
        }
        await animationUtils.teleportEffects[this.options?.animation ?? 'default'].pre(tok.document, position);
        let update = genericUtils.collapseObjects(this.updates, position, {_id: tok.id});
        await genericUtils.updateEmbeddedDocuments(canvas.scene, 'Token', [update], {isPaste: true});
        await animationUtils.teleportEffects[this.options?.animation ?? 'default'].post(tok.document, position);
    }
    async _moveGroup() {
        if (this.options?.isSynchronous === false) {
            await this._nonSync();
        } else {
            await this._sync();
        }
    }
    async _nonSync() {
        await Promise.all(this.tokens.map(async tok => {
            if (tok.actor) {
                let grappled = effectUtils.getEffectByStatusID(tok.actor, 'grappled');
                if (grappled) await genericUtils.remove(grappled);
            }
            let position = this.getCoords(tok);
            await animationUtils.teleportEffects[this.options?.animation ?? 'default'].pre(tok.document, position);
            let update = genericUtils.collapseObjects(this.updates, position, {_id: tok.id});
            await genericUtils.updateEmbeddedDocuments(canvas.scene, 'Token', [update], {isPaste: true});
            await animationUtils.teleportEffects[this.options?.animation ?? 'default'].post(tok.document, position);
        }));
    }
    async _sync() {
        let positions = this.tokens.map(tok => this.getCoords(tok));
        await Promise.all(this.tokens.map(async tok => {
            if (tok.actor) {
                let grappled = effectUtils.getEffectByStatusID(tok.actor, 'grappled');
                if (grappled) await genericUtils.remove(grappled);
            }
        }));
        await Promise.all(this.tokens.map(async (tok, ind) => await animationUtils.teleportEffects[this.options?.animation ?? 'default'].pre(tok.document, positions[ind])));
        let updates = this.tokens.map((tok, ind) => genericUtils.collapseObjects(this.updates, {_id: tok.id}, positions[ind]));
        await genericUtils.updateEmbeddedDocuments(canvas.scene, 'Token', updates, {isPaste: true});
        await Promise.all(this.tokens.map(async (tok, ind) => await animationUtils.teleportEffects[this.options?.animation ?? 'default'].post(tok.document, positions[ind])));
    }
    getCoords(token) {
        let difference = {
            x: this.controllingToken.x - token.x, 
            y: this.controllingToken.y - token.y
        };
        let update = {
            rotation: this.template.direction,
            x: this.coords.selected.x - difference.x,
            y: this.coords.selected.y - difference.y
        };
        return update;
    }
    get crosshairsConfig() {
        let config = {
            size: canvas.grid.distance * this.controllingToken.document.width / 2,
            icon: this.tokenTexture,
            resolution: ((this.updates?.token?.width ?? this.controllingToken.document.width)% 2) ? 1 : -1
        };
        return genericUtils.collapseObjects(Crosshairs.defaultCrosshairsConfig(), config, this.options?.crosshairsConfig ?? {});
    }
    get crosshairsConfigTarget() {
        let config = {
            size: canvas.grid.distance * this.tokens[0].document.width / 2,
            icon: this.tokenTexture,
            resolution: ((this.updates?.token?.width ?? this.tokens[0].document.width) % 2) ? 1 : -1
        };
        return genericUtils.collapseObjects(Crosshairs.defaultCrosshairsConfig(), config, this.options?.crosshairsConfig ?? {});
    }
    get coords() {
        return {
            original: {
                x: this.controllingToken.x,
                y: this.controllingToken.y
            },
            selected: {
                x: this?.template?.x - (this.controllingToken.w / 2),
                y: this?.template?.y - (this.controllingToken.h / 2)
            }
        };
    }
}
