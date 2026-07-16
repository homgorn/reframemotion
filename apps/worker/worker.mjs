import os from 'node:os';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {loadConfig} from '../../packages/core/config.mjs';
import {createStore} from '../../packages/core/store/index.mjs';
import {TemplateRegistry} from '../../packages/core/templates.mjs';
import {renderJob} from '../../packages/core/render/index.mjs';
import {createLogger} from '../../packages/core/logger.mjs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function processOne({store, registry, config, workerId, logger = createLogger('worker')}) {
  const job = await store.claimNext(workerId);
  if (!job) return false;
  const controller = new AbortController();
  const cancelPoll = setInterval(async () => {
    try {
      const current = await store.getJob(job.id);
      if (current?.cancelRequested) controller.abort(new Error('Cancellation requested'));
    } catch (error) {
      logger.warn('cancel_poll_failed', {jobId: job.id, error: error.message});
    }
  }, Math.min(config.pollIntervalMs, 1000));
  cancelPoll.unref();
  try {
    logger.info('job_started', {jobId: job.id, templateId: job.templateId, attempt: job.attempts});
    const result = await renderJob({job, registry, config, signal: controller.signal});
    const current = await store.getJob(job.id);
    if (current?.cancelRequested) {
      fs.rmSync(result.outputPath, {force: true});
      throw new Error('Job cancelled');
    }
    await store.completeJob(job.id, result.outputPath, {engine: result.engine, format: result.format});
    logger.info('job_succeeded', {jobId: job.id, outputPath: result.outputPath});
  } catch (error) {
    await store.failJob(job.id, error.stack ?? error.message);
    logger.error('job_failed', {jobId: job.id, error: error.stack ?? error.message});
  } finally {
    clearInterval(cancelPoll);
  }
  return true;
}

export async function runWorker({config = loadConfig(), store, registry, once = false, logger = createLogger('worker')} = {}) {
  const ownedStore = store ?? await createStore(config);
  const ownedRegistry = registry ?? new TemplateRegistry(config.templatesDir);
  const staleBefore = new Date(Date.now() - Math.max(config.renderTimeoutMs * 2, 60 * 60 * 1000)).toISOString();
  const recovered = await ownedStore.recoverStaleJobs(staleBefore);
  if (recovered) logger.warn('stale_jobs_recovered', {count: recovered});
  let stopping = false;
  const stop = () => { stopping = true; };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
  const base = `${os.hostname()}-${process.pid}`;
  const loops = Array.from({length: config.workerConcurrency}, (_, index) => (async () => {
    const workerId = `${base}-${index + 1}`;
    do {
      const processed = await processOne({store: ownedStore, registry: ownedRegistry, config, workerId, logger});
      if (once) return;
      if (!processed) await sleep(config.pollIntervalMs);
    } while (!stopping);
  })());
  await Promise.all(loops);
  await ownedStore.close?.();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runWorker({once: process.argv.includes('--once')});
}
