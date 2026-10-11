export function teleportPrompt(title, step, cancel) {
    const panel = document.createElement('aside');
    panel.className = 'cpr-teleport-prompt';
    panel.setAttribute('role', 'status');
    panel.setAttribute('aria-live', 'polite');
    const name = document.createElement('strong');
    name.textContent = title;
    const label = document.createElement('span');
    label.textContent = step;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = '×';
    button.setAttribute('aria-label', game.i18n.localize('Cancel'));
    button.addEventListener('click', cancel);
    panel.append(name, label, button);
    document.body.append(panel);
    const hotbar = document.getElementById('hotbar')?.getBoundingClientRect();
    if (hotbar?.width > hotbar?.height) panel.style.bottom = Math.max(20, window.innerHeight - hotbar.top + 12) + 'px';
    const keydown = event => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopImmediatePropagation();
        cancel();
    };
    window.addEventListener('keydown', keydown, true);
    return {close: () => {window.removeEventListener('keydown', keydown, true); panel.remove();}};
}
