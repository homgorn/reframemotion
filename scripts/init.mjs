import fs from 'node:fs';
import path from 'node:path';
import {loadConfig} from '../packages/core/config.mjs';
import {createStore} from '../packages/core/store/index.mjs';
import {TemplateRegistry} from '../packages/core/templates.mjs';

const config = loadConfig();
for (const dir of [config.dataDir, config.outputsDir, config.workDir, config.templatesDir]) fs.mkdirSync(dir, {recursive: true});
if (!fs.existsSync(path.join(config.root, '.env')) && fs.existsSync(path.join(config.root, '.env.example'))) {
  fs.copyFileSync(path.join(config.root, '.env.example'), path.join(config.root, '.env'));
}
const store = await createStore(config);
const registry = new TemplateRegistry(config.templatesDir);
console.log(JSON.stringify({status: 'initialized', dbPath: config.dbPath, templates: registry.list().map((item) => item.id)}, null, 2));
await store.close();
