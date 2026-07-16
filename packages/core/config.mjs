import path from 'node:path';
import fs from 'node:fs';

const int = (value, fallback, min = 1) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= min ? parsed : fallback;
};

export function loadConfig(overrides = {}) {
  const root = path.resolve(overrides.root ?? process.env.REFRAMOTION_ROOT ?? process.cwd());
  const dataDir = path.resolve(root, overrides.dataDir ?? process.env.REFRAMOTION_DATA_DIR ?? 'data');
  const templatesDir = path.resolve(root, overrides.templatesDir ?? process.env.REFRAMOTION_TEMPLATES_DIR ?? 'templates');
  const projectsDir = path.resolve(root, overrides.projectsDir ?? process.env.REFRAMOTION_PROJECTS_DIR ?? 'projects');
  const config = {
    root,
    host: overrides.host ?? process.env.HOST ?? '127.0.0.1',
    port: int(overrides.port ?? process.env.PORT, 8787, 0),
    dataDir,
    templatesDir,
    projectsDir,
    dbPath: path.resolve(dataDir, overrides.dbPath ?? process.env.REFRAMOTION_DB_PATH ?? 'reframemotion.sqlite'),
    outputsDir: path.resolve(dataDir, 'outputs'),
    workDir: path.resolve(dataDir, 'work'),
    apiKey: overrides.apiKey ?? process.env.REFRAMOTION_API_KEY ?? '',
    maxBodyBytes: int(overrides.maxBodyBytes ?? process.env.REFRAMOTION_MAX_BODY_BYTES, 5 * 1024 * 1024),
    maxBatchJobs: int(overrides.maxBatchJobs ?? process.env.REFRAMOTION_MAX_BATCH_JOBS, 10_000),
    workerConcurrency: int(overrides.workerConcurrency ?? process.env.REFRAMOTION_WORKER_CONCURRENCY, 1),
    pollIntervalMs: int(overrides.pollIntervalMs ?? process.env.REFRAMOTION_POLL_INTERVAL_MS, 1000),
    renderTimeoutMs: int(overrides.renderTimeoutMs ?? process.env.REFRAMOTION_RENDER_TIMEOUT_MS, 30 * 60 * 1000),
    hyperframesBin: overrides.hyperframesBin ?? process.env.REFRAMOTION_HYPERFRAMES_BIN ?? 'hyperframes',
    remotionBin: overrides.remotionBin ?? process.env.REFRAMOTION_REMOTION_BIN ?? 'npx',
    nodeEnv: overrides.nodeEnv ?? process.env.NODE_ENV ?? 'development',
  };
  if (config.nodeEnv === 'production' && config.apiKey.length < 24) {
    throw new Error('REFRAMOTION_API_KEY must contain at least 24 characters in production');
  }
  for (const dir of [config.dataDir, config.outputsDir, config.workDir]) fs.mkdirSync(dir, {recursive: true});
  return config;
}
