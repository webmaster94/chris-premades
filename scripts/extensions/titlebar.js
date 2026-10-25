import {genericUtils} from '../utils.js';
export async function copyUuid(app, [elem], option) {
    let button = elem.closest('.window-header').querySelector('button.header-control.fa-solid.fa-passport.icon');
    if (!button) return;
    button.addEventListener('click', () => console.log(app.document));
}
export async function renderCompendium(app, html, data) {
    let closeButton = html.querySelector('.window-header .header-control[data-action="close"]');
    if (!closeButton) return;
    let existingButton = html.querySelector('.document-id-link');
    if (existingButton) return;
    let button = document.createElement('a');
    button.classList.add('document-id-link');
    button.dataset.tooltip = 'CHRISPREMADES.HeaderButtons.PackId.Tooltip';
    button.dataset.tooltipDirection = 'UP';
    button.addEventListener('click', () => {
        try {
            let id = data.collection.metadata.id;
            game.clipboard.copyPlainText(id);
            genericUtils.notify(genericUtils.format('DOCUMENT.IdCopiedClipboard', {id: id, type: 'id', label: genericUtils.translate('PACKAGE.TagCompendium')}), 'info', {localize: false});
            if (genericUtils.getCPRSetting('devTools')) console.log(game.packs.get(id));
        } catch (error) { /* empty */ }
    });
    let icon = document.createElement('i');
    icon.setAttribute('class', 'fa-solid fa-passport');
    button.append(icon);
    closeButton.before(button);
}
