import {catAuthority} from '../integrations/catAuthority.js';
import {troubleshooter} from '../applications/troubleshooter.js';
import {genericUtils} from '../utils.js';
async function createChatMessage(message, options, userId) {
    let buttonData = message.flags?.['chris-premades']?.button;
    if (!buttonData) return;
    await genericUtils.sleep(100);
    let messageElements = document.querySelectorAll('[data-message-id="' + message.id + '"]');
    if (!messageElements.length) return;
    messageElements.forEach(element => {
        switch (buttonData.type) {
            case 'updateItem': {
                let button = element.querySelector('.chris-update-item');
                if (!button) return;
                button.addEventListener('click', async () => {
                    let item = await fromUuid(buttonData.data.itemUuid);
                    if (!item) return;
                    await catAuthority.open(item);
                    await message.delete();
                });
                break;
            }
            case 'settings': {
                let settingButton = element.querySelector('.chris-settings');
                let ignoreSettingsButton = element.querySelector('.chris-ignoreSettings');
                settingButton.addEventListener('click', () => {
                    troubleshooter.fixSettings(message);
                });
                ignoreSettingsButton.addEventListener('click', () => {
                    troubleshooter.ignoreSettingsWarning(message);
                });
                break;
            }
            case 'moduleIssues': {
                let button = element.querySelector('[type="button"]');
                if (button) button.addEventListener('click', () => {
                    troubleshooter.ignoreModuleIssues(message);
                });
                break;
            }
        }
    });

}
export let chat = {
    createChatMessage
};
