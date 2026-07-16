import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const roots = ['apps', 'packages', 'scripts', 'tests'];
const files = [];
const walk = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(?:mjs|js|cjs)$/.test(entry.name)) files.push(full);
  }
};
for (const root of roots) walk(root);
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {encoding: 'utf8'});
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exitCode = 1;
  }
}
console.log(`Syntax checked: ${files.length} files`);
