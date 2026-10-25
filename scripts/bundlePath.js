/* global __webpack_public_path__: writable */
// Foundry loads module scripts together; webpack's automatic path can pick another module.
// getRoute also preserves a configured reverse-proxy route prefix.
__webpack_public_path__ = foundry.utils.getRoute('modules/chris-premades/dist') + '/';
