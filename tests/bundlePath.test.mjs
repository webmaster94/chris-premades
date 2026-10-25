/* eslint-env node */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';

const bootstrap = readFileSync(new URL('../scripts/bundlePath.js', import.meta.url), 'utf8');
for (const prefix of ['', '/tabletop']) {
    test('bundled CAT helpers load from CPR with route prefix ' + JSON.stringify(prefix), () => {
        const context = vm.createContext({
            __webpack_public_path__: '/modules/sequencer/dist/',
            foundry: {utils: {getRoute: route => prefix + '/' + route.replace(/\/$/, '')}}
        });
        vm.runInContext(bootstrap, context);
        assert.equal(context.__webpack_public_path__ + '561.main.js', prefix + '/modules/chris-premades/dist/561.main.js');
    });
}
