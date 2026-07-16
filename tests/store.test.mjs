import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {SqliteStore} from '../packages/core/store/sqlite.mjs';

test('SQLite store manages the job lifecycle and batch counts', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reframotion-store-'));
  const store = new SqliteStore(path.join(dir, 'db.sqlite'));
  const batch = await store.createBatch('Test batch', [{templateId:'demo-card',engine:'mock',outputFormat:'json',variables:{headline:'A'},priority:0,maxAttempts:2}]);
  assert.equal(batch.totalJobs, 1);
  const job = await store.claimNext('worker-1');
  assert.equal(job.status, 'running');
  assert.equal(job.attempts, 1);
  await store.completeJob(job.id, '/tmp/output.json');
  assert.equal((await store.getJob(job.id)).status, 'succeeded');
  assert.equal((await store.getBatch(batch.id)).status, 'succeeded');
  await store.close();
});

test('failed jobs are requeued until maxAttempts', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reframotion-retry-'));
  const store = new SqliteStore(path.join(dir, 'db.sqlite'));
  const created = await store.createJob({templateId:'demo-card',engine:'mock',outputFormat:'json',variables:{headline:'A'},priority:0,maxAttempts:2});
  const first = await store.claimNext('worker');
  await store.failJob(first.id, 'boom');
  assert.equal((await store.getJob(created.id)).status, 'queued');
  const second = await store.claimNext('worker');
  await store.failJob(second.id, 'boom again');
  assert.equal((await store.getJob(created.id)).status, 'failed');
  await store.retryJob(created.id);
  assert.equal((await store.getJob(created.id)).status, 'queued');
  await store.close();
});
