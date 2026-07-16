import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import {loadConfig} from '../packages/core/config.mjs';
import {TemplateRegistry} from '../packages/core/templates.mjs';

const config = loadConfig();
const checks = [];
const command = (name, args = ['--version'], required = true) => {
  const result = spawnSync(name, args, {encoding: 'utf8'});
  checks.push({name, ok: result.status === 0, required, detail: (result.stdout || result.stderr || '').trim().split('\n')[0] || `exit ${result.status}`});
};
checks.push({name: 'node', ok: Number(process.versions.node.split('.')[0]) >= 22, required: true, detail: process.version});
command('ffmpeg', ['-version']);
command(config.hyperframesBin, ['--version'], false);
command(config.remotionBin, ['--no-install', 'remotion', '--version'], false);
try {
  fs.accessSync(config.dataDir, fs.constants.W_OK);
  checks.push({name: 'data-directory', ok: true, required: true, detail: config.dataDir});
} catch (error) { checks.push({name: 'data-directory', ok: false, required: true, detail: error.message}); }
try {
  const templates = new TemplateRegistry(config.templatesDir).list();
  checks.push({name: 'templates', ok: templates.length > 0, required: true, detail: `${templates.length} registered`});
} catch (error) { checks.push({name: 'templates', ok: false, required: true, detail: error.message}); }
console.table(checks);
if (checks.some((check) => check.required && !check.ok)) process.exitCode = 1;
