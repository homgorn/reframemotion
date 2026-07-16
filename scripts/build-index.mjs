import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {TemplateRegistry} from '../packages/core/templates.mjs';

const check = process.argv.includes('--check');
const hash = (buffer) => createHash('sha256').update(buffer).digest('hex');
const files = [];
function walk(target) {
  if (!fs.existsSync(target)) return;
  const stat = fs.statSync(target);
  if (stat.isDirectory()) for (const entry of fs.readdirSync(target).sort()) walk(path.join(target, entry));
  else if (target.endsWith('.md')) {
    const content = fs.readFileSync(target);
    const firstHeading = content.toString('utf8').match(/^#\s+(.+)$/m)?.[1] ?? path.basename(target);
    files.push({path: target.replaceAll('\\','/'), title: firstHeading, sha256: hash(content), bytes: content.length});
  }
}
for (const root of ['README.md','AGENTS.md','ROADMAP.md','SECURITY.md','docs']) walk(root);
const registry = new TemplateRegistry('templates');
const templateIndex = registry.list().map((item) => ({id:item.id,name:item.name ?? item.id,engine:item.engine,outputFormat:item.outputFormat ?? null,revision:item.revision,tags:item.tags ?? [],variables:Object.keys(item.variables ?? {})}));
const memory = `${JSON.stringify({version:'1.0.0',statusDate:'2026-07-16',documents:files})}\n`;
const templates = `${JSON.stringify({version:'1.0.0',statusDate:'2026-07-16',templates:templateIndex})}\n`;
const targets = [['docs/memory/manifest.json',memory],['templates/template-index.json',templates]];
let mismatch = false;
for (const [file, content] of targets) {
  if (check) {
    if (!fs.existsSync(file) || fs.readFileSync(file,'utf8') !== content) { console.error(`Index is stale: ${file}`); mismatch = true; }
  } else { fs.writeFileSync(file, content); console.log(`Wrote ${file}`); }
}
if (mismatch) process.exitCode = 1;
