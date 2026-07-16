import fs from 'node:fs';
import path from 'node:path';

const roots = ['README.md', 'ROADMAP.md', 'AGENTS.md', 'docs'];
const markdown = [];
const walk = (target) => {
  if (!fs.existsSync(target)) return;
  const stat = fs.statSync(target);
  if (stat.isDirectory()) for (const entry of fs.readdirSync(target)) walk(path.join(target, entry));
  else if (target.endsWith('.md')) markdown.push(target);
};
for (const root of roots) walk(root);
const broken = [];
for (const file of markdown) {
  const content = fs.readFileSync(file, 'utf8');
  for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const link = match[1].split('#')[0];
    if (!link || /^(?:https?:|mailto:|reframotion:)/.test(link)) continue;
    const resolved = path.resolve(path.dirname(file), decodeURIComponent(link));
    if (!fs.existsSync(resolved)) broken.push(`${file}: ${link}`);
  }
}
if (broken.length) {
  console.error(`Broken documentation links:\n${broken.join('\n')}`);
  process.exitCode = 1;
} else console.log(`Documentation links checked: ${markdown.length} files`);
