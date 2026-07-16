import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {newId, nowIso} from '../ids.mjs';

const schemaPath = fileURLToPath(new URL('./schema.sql', import.meta.url));
const parseJson = (value, fallback = {}) => {
  try { return JSON.parse(value); } catch { return fallback; }
};
const mapJob = (row) => row ? ({
  id: row.id,
  batchId: row.batch_id,
  templateId: row.template_id,
  engine: row.engine,
  outputFormat: row.output_format,
  variables: parseJson(row.variables_json),
  status: row.status,
  priority: row.priority,
  attempts: row.attempts,
  maxAttempts: row.max_attempts,
  cancelRequested: Boolean(row.cancel_requested),
  claimedBy: row.claimed_by,
  outputPath: row.output_path,
  error: row.error,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  startedAt: row.started_at,
  finishedAt: row.finished_at,
}) : null;
const mapBatch = (row) => row ? ({
  id: row.id,
  name: row.name,
  status: row.status,
  totalJobs: row.total_jobs,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
}) : null;

export class SqliteStore {
  constructor(dbPath) {
    fs.mkdirSync(path.dirname(dbPath), {recursive: true});
    this.db = new DatabaseSync(dbPath);
    this.db.exec(fs.readFileSync(schemaPath, 'utf8'));
  }

  async close() { this.db.close(); }

  async appendEvent({jobId = null, batchId = null, type, payload = {}}) {
    this.db.prepare('INSERT INTO events(job_id,batch_id,type,payload_json,created_at) VALUES(?,?,?,?,?)')
      .run(jobId, batchId, type, JSON.stringify(payload), nowIso());
  }

  async createJob(input, batchId = null) {
    const id = newId('job');
    const now = nowIso();
    this.db.prepare(`INSERT INTO jobs(
      id,batch_id,template_id,engine,output_format,variables_json,status,priority,attempts,max_attempts,cancel_requested,created_at,updated_at
    ) VALUES(?,?,?,?,?,?, 'queued', ?,0,?,0,?,?)`).run(
      id, batchId, input.templateId, input.engine, input.outputFormat, JSON.stringify(input.variables ?? {}), input.priority ?? 0, input.maxAttempts ?? 2, now, now,
    );
    await this.appendEvent({jobId: id, batchId, type: 'job.created', payload: {templateId: input.templateId}});
    return this.getJob(id);
  }

  async createBatch(name, jobs) {
    const id = newId('batch');
    const now = nowIso();
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.prepare('INSERT INTO batches(id,name,status,total_jobs,created_at,updated_at) VALUES(?,?,\'queued\',?,?,?)')
        .run(id, name, jobs.length, now, now);
      const insert = this.db.prepare(`INSERT INTO jobs(
        id,batch_id,template_id,engine,output_format,variables_json,status,priority,attempts,max_attempts,cancel_requested,created_at,updated_at
      ) VALUES(?,?,?,?,?,?, 'queued', ?,0,?,0,?,?)`);
      for (const job of jobs) {
        insert.run(newId('job'), id, job.templateId, job.engine, job.outputFormat, JSON.stringify(job.variables ?? {}), job.priority ?? 0, job.maxAttempts ?? 2, now, now);
      }
      this.db.prepare('INSERT INTO events(batch_id,type,payload_json,created_at) VALUES(?,?,?,?)')
        .run(id, 'batch.created', JSON.stringify({totalJobs: jobs.length}), now);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
    return this.getBatch(id);
  }

  async getJob(id) { return mapJob(this.db.prepare('SELECT * FROM jobs WHERE id=?').get(id)); }

  async listJobs({limit = 100, offset = 0, status, batchId} = {}) {
    const conditions = [];
    const params = [];
    if (status) { conditions.push('status=?'); params.push(status); }
    if (batchId) { conditions.push('batch_id=?'); params.push(batchId); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return this.db.prepare(`SELECT * FROM jobs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset).map(mapJob);
  }

  async getBatch(id) {
    const batch = mapBatch(this.db.prepare('SELECT * FROM batches WHERE id=?').get(id));
    if (!batch) return null;
    const counts = this.db.prepare('SELECT status,COUNT(*) AS count FROM jobs WHERE batch_id=? GROUP BY status').all(id);
    batch.counts = Object.fromEntries(counts.map((row) => [row.status, row.count]));
    return batch;
  }

  async listBatches({limit = 100, offset = 0} = {}) {
    return this.db.prepare('SELECT * FROM batches ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset).map(mapBatch);
  }

  async refreshBatch(batchId) {
    if (!batchId) return;
    const rows = this.db.prepare('SELECT status,COUNT(*) AS count FROM jobs WHERE batch_id=? GROUP BY status').all(batchId);
    const counts = Object.fromEntries(rows.map((row) => [row.status, row.count]));
    let status = 'succeeded';
    if ((counts.running ?? 0) > 0) status = 'running';
    else if ((counts.queued ?? 0) > 0) status = 'queued';
    else if ((counts.failed ?? 0) > 0) status = 'failed';
    else if ((counts.cancelled ?? 0) > 0 && (counts.succeeded ?? 0) === 0) status = 'cancelled';
    this.db.prepare('UPDATE batches SET status=?,updated_at=? WHERE id=?').run(status, nowIso(), batchId);
  }

  async claimNext(workerId) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const row = this.db.prepare(`SELECT * FROM jobs
        WHERE status='queued' AND cancel_requested=0
        ORDER BY priority DESC, created_at ASC LIMIT 1`).get();
      if (!row) { this.db.exec('COMMIT'); return null; }
      const now = nowIso();
      this.db.prepare(`UPDATE jobs SET status='running',claimed_by=?,attempts=attempts+1,started_at=COALESCE(started_at,?),updated_at=? WHERE id=?`)
        .run(workerId, now, now, row.id);
      this.db.exec('COMMIT');
      await this.appendEvent({jobId: row.id, batchId: row.batch_id, type: 'job.started', payload: {workerId}});
      await this.refreshBatch(row.batch_id);
      return this.getJob(row.id);
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  async completeJob(id, outputPath, metadata = {}) {
    const job = await this.getJob(id);
    if (!job) throw new Error(`Job not found: ${id}`);
    const now = nowIso();
    this.db.prepare(`UPDATE jobs SET status='succeeded',output_path=?,error=NULL,finished_at=?,updated_at=? WHERE id=?`)
      .run(outputPath, now, now, id);
    await this.appendEvent({jobId: id, batchId: job.batchId, type: 'job.succeeded', payload: {outputPath, ...metadata}});
    await this.refreshBatch(job.batchId);
    return this.getJob(id);
  }

  async failJob(id, errorMessage) {
    const job = await this.getJob(id);
    if (!job) throw new Error(`Job not found: ${id}`);
    const retry = !job.cancelRequested && job.attempts < job.maxAttempts;
    const status = job.cancelRequested ? 'cancelled' : retry ? 'queued' : 'failed';
    const now = nowIso();
    this.db.prepare(`UPDATE jobs SET status=?,error=?,claimed_by=NULL,finished_at=?,updated_at=? WHERE id=?`)
      .run(status, String(errorMessage).slice(0, 8000), retry ? null : now, now, id);
    await this.appendEvent({jobId: id, batchId: job.batchId, type: retry ? 'job.retry_queued' : `job.${status}`, payload: {error: String(errorMessage)}});
    await this.refreshBatch(job.batchId);
    return this.getJob(id);
  }

  async cancelJob(id) {
    const job = await this.getJob(id);
    if (!job) return null;
    const terminal = ['succeeded', 'failed', 'cancelled'].includes(job.status);
    if (!terminal) {
      const nextStatus = job.status === 'queued' ? 'cancelled' : job.status;
      const now = nowIso();
      this.db.prepare('UPDATE jobs SET cancel_requested=1,status=?,finished_at=CASE WHEN ?=\'cancelled\' THEN ? ELSE finished_at END,updated_at=? WHERE id=?')
        .run(nextStatus, nextStatus, now, now, id);
      await this.appendEvent({jobId: id, batchId: job.batchId, type: 'job.cancel_requested'});
      await this.refreshBatch(job.batchId);
    }
    return this.getJob(id);
  }

  async retryJob(id) {
    const job = await this.getJob(id);
    if (!job) return null;
    if (!['failed', 'cancelled'].includes(job.status)) throw new Error('Only failed or cancelled jobs can be retried');
    const now = nowIso();
    this.db.prepare(`UPDATE jobs SET status='queued',cancel_requested=0,error=NULL,claimed_by=NULL,finished_at=NULL,updated_at=? WHERE id=?`).run(now, id);
    await this.appendEvent({jobId: id, batchId: job.batchId, type: 'job.manual_retry'});
    await this.refreshBatch(job.batchId);
    return this.getJob(id);
  }

  async recoverStaleJobs(olderThanIso) {
    const rows = this.db.prepare(`SELECT id,batch_id FROM jobs WHERE status='running' AND updated_at<?`).all(olderThanIso);
    for (const row of rows) {
      this.db.prepare(`UPDATE jobs SET status='queued',claimed_by=NULL,error='Recovered stale job',updated_at=? WHERE id=?`).run(nowIso(), row.id);
      await this.appendEvent({jobId: row.id, batchId: row.batch_id, type: 'job.recovered'});
      await this.refreshBatch(row.batch_id);
    }
    return rows.length;
  }

  async listEvents({after = 0, limit = 200} = {}) {
    return this.db.prepare('SELECT * FROM events WHERE id>? ORDER BY id ASC LIMIT ?').all(after, limit).map((row) => ({
      id: row.id, jobId: row.job_id, batchId: row.batch_id, type: row.type, payload: parseJson(row.payload_json), createdAt: row.created_at,
    }));
  }

  async stats() {
    const jobs = this.db.prepare('SELECT status,COUNT(*) AS count FROM jobs GROUP BY status').all();
    const batches = this.db.prepare('SELECT status,COUNT(*) AS count FROM batches GROUP BY status').all();
    return {jobs: Object.fromEntries(jobs.map((r) => [r.status, r.count])), batches: Object.fromEntries(batches.map((r) => [r.status, r.count]))};
  }
}
