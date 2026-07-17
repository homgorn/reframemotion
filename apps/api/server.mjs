import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadConfig} from '../../packages/core/config.mjs';
import {createStore} from '../../packages/core/store/index.mjs';
import {TemplateRegistry} from '../../packages/core/templates.mjs';
import {validateJobInput, validateBatchInput, validateStatus} from '../../packages/core/validation.mjs';
import {jobsFromCsv, jobsFromJson} from '../../packages/core/batch.mjs';
import {json, text, readJson} from '../../packages/core/http.mjs';
import {safeEqualText, assertInside} from '../../packages/core/security.mjs';
import {createLogger} from '../../packages/core/logger.mjs';
import {ProjectCatalog} from '../../packages/core/projects.mjs';

const dashboardDir = fileURLToPath(new URL('../dashboard/public/', import.meta.url));
const mime = new Map([['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'], ['.css', 'text/css; charset=utf-8'], ['.svg', 'image/svg+xml']]);

function normalizeJob(registry, raw) {
  const input = validateJobInput(raw);
  const manifest = registry.get(input.templateId);
  const variables = registry.validateVariables(manifest, input.variables);
  const engine = input.engine ?? manifest.engine;
  if (engine !== manifest.engine && manifest.allowedEngines?.includes(engine) !== true) throw new TypeError(`Template does not allow engine ${engine}`);
  return {...input, variables, engine, outputFormat: input.outputFormat ?? manifest.outputFormat ?? (engine === 'mock' ? 'json' : 'mp4')};
}

function findCatalogProject(projectCatalog, siteId, projectId) {
  const catalog = projectCatalog.load();
  const project = catalog.projects.find((item) => item.siteId === siteId && item.id === projectId);
  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }
  return project;
}

function authenticate(req, config) {
  if (!config.apiKey) return true;
  const header = req.headers.authorization ?? '';
  return header.startsWith('Bearer ') && safeEqualText(header.slice(7), config.apiKey);
}

async function serveStatic(reqPath, res) {
  const relative = reqPath === '/' || reqPath === '/dashboard' ? 'index.html' : reqPath.replace(/^\/dashboard\/?/, '');
  let file;
  try { file = assertInside(dashboardDir, path.join(dashboardDir, relative)); }
  catch { return false; }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return false;
  const data = fs.readFileSync(file);
  res.writeHead(200, {'content-type': mime.get(path.extname(file)) ?? 'application/octet-stream', 'content-length': data.length, 'cache-control': 'no-cache'});
  res.end(data);
  return true;
}

export async function createApiServer({config = loadConfig(), store, registry, logger = createLogger('api')} = {}) {
  const ownedStore = store ?? await createStore(config);
  const ownedRegistry = registry ?? new TemplateRegistry(config.templatesDir);
  const projectCatalog = new ProjectCatalog(config.projectsDir);

  const server = http.createServer(async (req, res) => {
    const requestId = crypto.randomUUID();
    res.setHeader('x-request-id', requestId);
    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    try {
      if (!url.pathname.startsWith('/api/')) {
        if (await serveStatic(url.pathname, res)) return;
        return text(res, 404, 'Not found');
      }
      if (url.pathname !== '/api/health' && !authenticate(req, config)) return json(res, 401, {error: 'Unauthorized', requestId});

      if (req.method === 'GET' && url.pathname === '/api/health') {
        return json(res, 200, {status: 'ok', version: '1.0.0', time: new Date().toISOString(), stats: await ownedStore.stats()});
      }
      if (req.method === 'GET' && url.pathname === '/api/templates') {
        return json(res, 200, {templates: ownedRegistry.list()});
      }
      if (req.method === 'GET' && url.pathname === '/api/catalog') {
        return json(res, 200, projectCatalog.load());
      }
      if (req.method === 'GET' && url.pathname === '/api/sites') {
        const catalog = projectCatalog.load();
        return json(res, 200, {sites: catalog.sites, summary: catalog.summary});
      }
      if (req.method === 'GET' && url.pathname === '/api/projects') {
        const catalog = projectCatalog.load();
        const siteId = url.searchParams.get('siteId');
        const projects = siteId ? catalog.projects.filter((project) => project.siteId === siteId) : catalog.projects;
        return json(res, 200, {projects, summary: catalog.summary});
      }
      const projectExport = url.pathname.match(/^\/api\/projects\/([^/]+)\/([^/]+)\/exports$/);
      if (req.method === 'POST' && projectExport) {
        const body = await readJson(req, config.maxBodyBytes);
        const siteId = decodeURIComponent(projectExport[1]);
        const projectId = decodeURIComponent(projectExport[2]);
        const project = findCatalogProject(projectCatalog, siteId, projectId);
        const profileId = String(body.profileId ?? '');
        const profile = project.exportProfiles.find((item) => item.id === profileId);
        if (!profile) throw new TypeError(`Unknown export profile: ${profileId}`);
        return json(res, 202, {
          exportRequest: {
            id: crypto.randomUUID(),
            status: 'planned',
            siteId,
            projectId,
            profileId: profile.id,
            label: profile.label,
            description: profile.description,
            sourcePath: project.sourcePath,
            outputSuffix: profile.outputSuffix,
            watermark: profile.watermark,
            audioMode: profile.audioMode,
            captions: profile.captions,
            variables: profile.variables,
            variablesPath: profile.variablesPath,
            renderCommand: profile.renderCommand,
            approvalRequired: profile.approvalRequired,
            artifacts: profile.artifacts,
          },
        });
      }
      if (req.method === 'POST' && url.pathname === '/api/templates/reload') {
        return json(res, 200, {templates: ownedRegistry.reload()});
      }
      if (req.method === 'GET' && url.pathname === '/api/jobs') {
        const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 500);
        const offset = Number(url.searchParams.get('offset') ?? 0);
        const status = url.searchParams.get('status') || undefined;
        if (status) validateStatus(status);
        return json(res, 200, {jobs: await ownedStore.listJobs({limit, offset, status, batchId: url.searchParams.get('batchId') || undefined})});
      }
      if (req.method === 'POST' && url.pathname === '/api/jobs') {
        const body = await readJson(req, config.maxBodyBytes);
        return json(res, 202, {job: await ownedStore.createJob(normalizeJob(ownedRegistry, body))});
      }
      const jobMatch = url.pathname.match(/^\/api\/jobs\/([^/]+)$/);
      if (req.method === 'GET' && jobMatch) {
        const job = await ownedStore.getJob(jobMatch[1]);
        return job ? json(res, 200, {job}) : json(res, 404, {error: 'Job not found'});
      }
      const jobAction = url.pathname.match(/^\/api\/jobs\/([^/]+)\/(cancel|retry)$/);
      if (req.method === 'POST' && jobAction) {
        const job = jobAction[2] === 'cancel' ? await ownedStore.cancelJob(jobAction[1]) : await ownedStore.retryJob(jobAction[1]);
        return job ? json(res, 200, {job}) : json(res, 404, {error: 'Job not found'});
      }
      if (req.method === 'GET' && url.pathname === '/api/batches') {
        return json(res, 200, {batches: await ownedStore.listBatches({limit: Math.min(Number(url.searchParams.get('limit') ?? 100), 500)})});
      }
      if (req.method === 'POST' && url.pathname === '/api/batches') {
        const body = validateBatchInput(await readJson(req, config.maxBodyBytes), config.maxBatchJobs);
        const jobs = body.jobs.map((job) => normalizeJob(ownedRegistry, job));
        return json(res, 202, {batch: await ownedStore.createBatch(body.name, jobs)});
      }
      if (req.method === 'POST' && url.pathname === '/api/batches/import') {
        const body = await readJson(req, config.maxBodyBytes);
        if (typeof body.name !== 'string' || typeof body.content !== 'string') throw new TypeError('name and content are required');
        const jobs = body.format === 'csv' ? jobsFromCsv(body.content) : body.format === 'json' ? jobsFromJson(body.content) : (() => { throw new TypeError('format must be csv or json'); })();
        if (jobs.length > config.maxBatchJobs) throw new TypeError(`batch exceeds ${config.maxBatchJobs} jobs`);
        const normalized = jobs.map((job) => normalizeJob(ownedRegistry, job));
        return json(res, 202, {batch: await ownedStore.createBatch(body.name.trim(), normalized)});
      }
      const batchMatch = url.pathname.match(/^\/api\/batches\/([^/]+)$/);
      if (req.method === 'GET' && batchMatch) {
        const batch = await ownedStore.getBatch(batchMatch[1]);
        return batch ? json(res, 200, {batch, jobs: await ownedStore.listJobs({batchId: batch.id, limit: 500})}) : json(res, 404, {error: 'Batch not found'});
      }
      if (req.method === 'GET' && url.pathname === '/api/events') {
        return json(res, 200, {events: await ownedStore.listEvents({after: Number(url.searchParams.get('after') ?? 0), limit: Math.min(Number(url.searchParams.get('limit') ?? 200), 1000)})});
      }
      return json(res, 404, {error: 'Route not found', requestId});
    } catch (error) {
      const status = error.statusCode ?? (error instanceof TypeError ? 400 : 500);
      logger.error('request_failed', {requestId, method: req.method, path: url.pathname, error: error.stack ?? error.message});
      return json(res, status, {error: status === 500 ? 'Internal server error' : error.message, requestId});
    }
  });

  server.on('close', () => ownedStore.close?.());
  return {server, store: ownedStore, registry: ownedRegistry, config};
}

export async function startApi(options = {}) {
  const instance = await createApiServer(options);
  await new Promise((resolve, reject) => {
    instance.server.once('error', reject);
    instance.server.listen(instance.config.port, instance.config.host, resolve);
  });
  const address = instance.server.address();
  instance.logger?.info?.('started', {address});
  return instance;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const logger = createLogger('api');
  const instance = await startApi({logger});
  const address = instance.server.address();
  logger.info('api_started', {url: `http://${instance.config.host}:${address.port}`});
  const stop = () => instance.server.close(() => process.exit(0));
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}
