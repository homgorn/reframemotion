import fs from 'node:fs';
import path from 'node:path';

const idPattern = /^[a-z0-9][a-z0-9._-]{1,120}$/;

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`Invalid JSON in ${file}: ${error.message}`);
  }
}

function requireId(value, label) {
  if (typeof value !== 'string' || !idPattern.test(value)) {
    throw new TypeError(`${label} must match ${idPattern}`);
  }
  return value;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function summarizeChecks(checks = {}) {
  const entries = Object.entries(checks).filter(([, value]) => value && typeof value === 'object');
  const failures = entries.filter(([, value]) => value.status === 'failed' || value.errors > 0);
  const pending = entries.filter(([, value]) => ['pending', 'running'].includes(value.status));
  const warnings = entries.filter(([, value]) => value.warnings > 0);
  if (failures.length) return 'failed';
  if (pending.length) return 'pending';
  if (warnings.length) return 'warning';
  if (entries.length) return 'passed';
  return 'unknown';
}

export class ProjectCatalog {
  constructor(projectsDir) {
    this.projectsDir = path.resolve(projectsDir);
  }

  load() {
    if (!fs.existsSync(this.projectsDir)) return {sites: [], projects: [], summary: this.summary([])};
    const sites = [];
    const projects = [];
    const siteDirs = fs.readdirSync(this.projectsDir, {withFileTypes: true})
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of siteDirs) {
      const siteDir = path.join(this.projectsDir, entry.name);
      const siteFile = path.join(siteDir, 'site.json');
      if (!fs.existsSync(siteFile)) continue;
      const site = this.normalizeSite(readJson(siteFile), entry.name, siteDir);
      sites.push(site);
      const videosDir = path.join(siteDir, 'videos');
      if (!fs.existsSync(videosDir)) continue;
      const files = fs.readdirSync(videosDir, {withFileTypes: true})
        .filter((file) => file.isFile() && file.name.endsWith('.json'))
        .sort((a, b) => a.name.localeCompare(b.name));
      for (const file of files) {
        projects.push(this.normalizeProject(readJson(path.join(videosDir, file.name)), site, file.name));
      }
    }
    return {sites: sites.map((site) => ({...site, projectCount: projects.filter((project) => project.siteId === site.id).length})), projects, summary: this.summary(projects)};
  }

  normalizeSite(raw, fallbackId, siteDir) {
    const id = requireId(raw.id ?? fallbackId, 'site.id');
    return {
      id,
      name: String(raw.name ?? id),
      domain: String(raw.domain ?? id),
      client: raw.client ? String(raw.client) : '',
      status: raw.status ?? 'active',
      tags: asArray(raw.tags).map(String),
      factsFile: raw.factsFile ? String(raw.factsFile) : '',
      notes: raw.notes ? String(raw.notes) : '',
      path: path.relative(this.projectsDir, siteDir).replaceAll('\\', '/'),
    };
  }

  normalizeProject(raw, site, filename) {
    const id = requireId(raw.id ?? filename.replace(/\.json$/i, ''), 'project.id');
    const checks = raw.checks && typeof raw.checks === 'object' ? raw.checks : {};
    return {
      id,
      siteId: site.id,
      siteName: site.name,
      title: String(raw.title ?? id),
      kind: String(raw.kind ?? 'video'),
      status: String(raw.status ?? 'planned'),
      engine: String(raw.engine ?? ''),
      templateId: String(raw.templateId ?? ''),
      durationSec: Number.isFinite(Number(raw.durationSec)) ? Number(raw.durationSec) : null,
      audioMode: String(raw.audioMode ?? 'unspecified'),
      sourcePath: raw.sourcePath ? String(raw.sourcePath) : '',
      previewUrl: raw.previewUrl ? String(raw.previewUrl) : '',
      batchId: raw.batchId ? String(raw.batchId) : '',
      tags: asArray(raw.tags).map(String),
      artifacts: asArray(raw.artifacts).map((artifact) => ({
        type: String(artifact.type ?? 'file'),
        path: String(artifact.path ?? ''),
        label: String(artifact.label ?? artifact.type ?? 'artifact'),
      })),
      checks,
      checkStatus: summarizeChecks(checks),
      updatedAt: raw.updatedAt ? String(raw.updatedAt) : '',
    };
  }

  summary(projects) {
    const byStatus = {};
    const byCheckStatus = {};
    const byAudioMode = {};
    for (const project of projects) {
      byStatus[project.status] = (byStatus[project.status] ?? 0) + 1;
      byCheckStatus[project.checkStatus] = (byCheckStatus[project.checkStatus] ?? 0) + 1;
      byAudioMode[project.audioMode] = (byAudioMode[project.audioMode] ?? 0) + 1;
    }
    return {totalProjects: projects.length, byStatus, byCheckStatus, byAudioMode};
  }
}
