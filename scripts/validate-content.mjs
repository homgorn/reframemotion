import fs from 'node:fs';
import path from 'node:path';
import {validateProjectContent} from '../packages/core/content-review.mjs';

const args = process.argv.slice(2);
const write = args.includes('--write');
const explicit = args.filter((arg) => !arg.startsWith('--'));
const root = process.cwd();
const roots = [root, path.dirname(root)];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function walkProjectFiles() {
  const projectsDir = path.join(root, 'projects');
  const files = [];
  if (!fs.existsSync(projectsDir)) return files;
  for (const site of fs.readdirSync(projectsDir, {withFileTypes: true})) {
    const videosDir = path.join(projectsDir, site.name, 'videos');
    if (!site.isDirectory() || !fs.existsSync(videosDir)) continue;
    for (const entry of fs.readdirSync(videosDir, {withFileTypes: true})) {
      if (entry.isFile() && entry.name.endsWith('.json')) files.push(path.join(videosDir, entry.name));
    }
  }
  return files;
}

function projectFilesFromArgs() {
  if (!explicit.length) return walkProjectFiles();
  return explicit.map((item) => {
    const direct = path.resolve(root, item);
    if (fs.existsSync(direct)) return direct;
    const matches = walkProjectFiles().filter((file) => {
      const manifest = readJson(file);
      return manifest.id === item || file.replaceAll('\\', '/').endsWith(`${item}.json`);
    });
    if (matches.length === 1) return matches[0];
    throw new Error(`Project manifest not found: ${item}`);
  });
}

const files = projectFilesFromArgs();
let failed = 0;
for (const file of files) {
  const manifest = readJson(file);
  const result = validateProjectContent({manifest, manifestPath: file, roots});
  const label = `${manifest.id ?? path.basename(file)} (${path.relative(root, file).replaceAll('\\', '/')})`;
  console.log(`${result.status.toUpperCase()} ${label}: ${result.errors} error(s), ${result.warnings} warning(s)`);
  for (const issue of result.issues.slice(0, 12)) {
    const where = issue.file ? `${path.relative(root, issue.file).replaceAll('\\', '/')}:${issue.line ?? 1}` : 'manifest';
    console.log(`  - ${issue.severity} ${issue.code} ${where}`);
    console.log(`    ${issue.message}`);
    if (issue.excerpt) console.log(`    "${issue.excerpt}"`);
  }
  if (result.issues.length > 12) console.log(`  - ... ${result.issues.length - 12} more issue(s)`);
  if (write) {
    const storedIssues = result.issues.slice(0, 20).map((issue) => ({
      ...issue,
      file: issue.file ? path.relative(root, issue.file).replaceAll('\\', '/') : issue.file,
    }));
    manifest.checks = manifest.checks && typeof manifest.checks === 'object' ? manifest.checks : {};
    manifest.checks.contentReview = {
      status: result.status,
      errors: result.errors,
      warnings: result.warnings,
      reviewedSources: result.reviewedSources,
      issues: storedIssues,
      updatedAt: new Date().toISOString(),
    };
    writeJson(file, manifest);
  }
  if (result.errors) failed += 1;
}
if (failed) process.exitCode = 1;
