import {compilePack} from '@foundryvtt/foundryvtt-cli';
import {readFile} from 'node:fs/promises';
const manifest = JSON.parse(await readFile(new URL('../module-template.json', import.meta.url), 'utf8'));
for (const pack of manifest.packs) {
    const folder = pack.path.split('/').at(-1);
    await compilePack('./packData/' + folder, './packs/' + folder, {log: true});
}
