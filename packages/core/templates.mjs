import fs from 'node:fs';
import path from 'node:path';
import {assertInside, stableHash} from './security.mjs';

const TEXT_EXTENSIONS = new Set(['.html', '.css', '.js', '.mjs', '.cjs', '.json', '.md', '.txt', '.svg', '.xml', '.csv']);

function getNested(object, dotted) {
  return dotted.split('.').reduce((value, key) => value?.[key], object);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
}

function validateVariable(name, rule, value) {
  if (value === undefined || value === null) {
    if (rule.required && rule.default === undefined) throw new TypeError(`Variable ${name} is required`);
    return rule.default;
  }
  if (rule.type === 'string') {
    if (typeof value !== 'string') throw new TypeError(`Variable ${name} must be a string`);
    if (rule.minLength !== undefined && value.length < rule.minLength) throw new TypeError(`Variable ${name} is too short`);
    if (rule.maxLength !== undefined && value.length > rule.maxLength) throw new TypeError(`Variable ${name} is too long`);
    if (rule.pattern && !new RegExp(rule.pattern, 'u').test(value)) throw new TypeError(`Variable ${name} does not match its pattern`);
  } else if (rule.type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`Variable ${name} must be a finite number`);
    if (rule.minimum !== undefined && value < rule.minimum) throw new TypeError(`Variable ${name} is below minimum`);
    if (rule.maximum !== undefined && value > rule.maximum) throw new TypeError(`Variable ${name} is above maximum`);
  } else if (rule.type === 'boolean') {
    if (typeof value !== 'boolean') throw new TypeError(`Variable ${name} must be boolean`);
  } else if (rule.type === 'array') {
    if (!Array.isArray(value)) throw new TypeError(`Variable ${name} must be an array`);
    if (rule.maxItems !== undefined && value.length > rule.maxItems) throw new TypeError(`Variable ${name} has too many items`);
  } else if (rule.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`Variable ${name} must be an object`);
  } else throw new TypeError(`Variable ${name} has unsupported type ${rule.type}`);
  if (rule.enum && !rule.enum.includes(value)) throw new TypeError(`Variable ${name} is not in the allowed enum`);
  return value;
}

function walk(root) {
  const files = [];
  if (!fs.existsSync(root)) return files;
  for (const entry of fs.readdirSync(root, {withFileTypes: true})) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

export class TemplateRegistry {
  constructor(templatesDir) {
    this.templatesDir = path.resolve(templatesDir);
    this.cache = new Map();
    this.reload();
  }

  reload() {
    this.cache.clear();
    for (const file of walk(this.templatesDir).filter((candidate) => path.basename(candidate) === 'template.json')) {
      const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!manifest.id || !/^[a-z0-9][a-z0-9._-]{1,95}$/i.test(manifest.id)) throw new Error(`Invalid template id in ${file}`);
      if (!['hyperframes', 'remotion', 'mock', 'command'].includes(manifest.engine)) throw new Error(`Invalid engine in ${file}`);
      if (this.cache.has(manifest.id)) throw new Error(`Duplicate template id: ${manifest.id}`);
      const directory = assertInside(this.templatesDir, path.dirname(file));
      this.cache.set(manifest.id, {...manifest, directory, manifestPath: file, revision: stableHash(fs.readFileSync(file))});
    }
    return this.list();
  }

  list() {
    return [...this.cache.values()].map(({directory, manifestPath, ...manifest}) => manifest).sort((a, b) => a.id.localeCompare(b.id));
  }

  get(id) {
    const manifest = this.cache.get(id);
    if (!manifest) throw new Error(`Unknown template: ${id}`);
    return manifest;
  }

  validateVariables(manifest, input = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('variables must be an object');
    const rules = manifest.variables ?? {};
    if (manifest.allowAdditionalVariables === false) {
      for (const key of Object.keys(input)) if (!(key in rules)) throw new TypeError(`Variable ${key} is not allowed`);
    }
    const result = {...input};
    for (const [name, rule] of Object.entries(rules)) {
      const value = validateVariable(name, rule, input[name]);
      if (value !== undefined) result[name] = value;
    }
    return result;
  }

  prepare(templateId, variables, targetDir) {
    const manifest = this.get(templateId);
    const resolved = this.validateVariables(manifest, variables);
    fs.rmSync(targetDir, {recursive: true, force: true});
    fs.mkdirSync(targetDir, {recursive: true});
    const copyOptions = {recursive: true, filter: (source) => !source.includes(`${path.sep}node_modules${path.sep}`)};
    if (manifest.sourceDir) {
      const sourceDir = assertInside(this.templatesDir, path.resolve(manifest.directory, manifest.sourceDir));
      if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) throw new Error(`Template sourceDir does not exist: ${manifest.sourceDir}`);
      fs.cpSync(sourceDir, targetDir, copyOptions);
    }
    fs.cpSync(manifest.directory, targetDir, copyOptions);
    const rawPlaceholders = /\{\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}\}/g;
    const escapedPlaceholders = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;
    for (const file of walk(targetDir)) {
      const extension = path.extname(file).toLowerCase();
      if (!TEXT_EXTENSIONS.has(extension)) continue;
      if (path.basename(file) === 'template.json') continue;
      const original = fs.readFileSync(file, 'utf8');
      const resolveValue = (key) => {
        const value = getNested(resolved, key);
        if (value === undefined) throw new TypeError(`Template placeholder ${key} has no value`);
        return typeof value === 'string' ? value : JSON.stringify(value);
      };
      const withRaw = original.replace(rawPlaceholders, (match, key) => resolveValue(key));
      const replaced = withRaw.replace(escapedPlaceholders, (match, key) => {
        const value = resolveValue(key);
        return extension === '.html' || extension === '.svg' || extension === '.xml' ? escapeHtml(value) : value;
      });
      if (manifest.security?.allowRemoteAssets !== true && /https?:\/\//i.test(replaced)) {
        throw new Error(`Remote assets are disabled for template ${templateId}: ${path.relative(targetDir, file)}`);
      }
      fs.writeFileSync(file, replaced);
    }
    if (manifest.engine === 'hyperframes') {
      const targetGsap = path.join(targetDir, 'assets', 'gsap.min.js');
      if (!fs.existsSync(targetGsap)) {
        const sourceGsap = path.resolve(this.templatesDir, '..', 'node_modules', 'gsap', 'dist', 'gsap.min.js');
        if (!fs.existsSync(sourceGsap)) throw new Error('Pinned GSAP runtime is missing. Run npm ci before preparing HyperFrames templates.');
        fs.mkdirSync(path.dirname(targetGsap), {recursive: true});
        fs.copyFileSync(sourceGsap, targetGsap);
      }
    }
    fs.writeFileSync(path.join(targetDir, '.reframotion-input.json'), `${JSON.stringify({templateId, variables: resolved}, null, 2)}\n`);
    return {manifest, variables: resolved, directory: targetDir};
  }
}
