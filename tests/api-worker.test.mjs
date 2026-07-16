import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {loadConfig} from '../packages/core/config.mjs';
import {createApiServer} from '../apps/api/server.mjs';
import {processOne} from '../apps/worker/worker.mjs';

test('API queues a job and worker produces an artifact', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reframotion-e2e-'));
  const templates = path.join(root, 'templates', 'demo-card');
  fs.mkdirSync(templates, {recursive:true});
  fs.writeFileSync(path.join(templates, 'template.json'), JSON.stringify({id:'demo-card',engine:'mock',outputFormat:'json',allowAdditionalVariables:false,variables:{headline:{type:'string',required:true}},security:{allowRemoteAssets:false}}));
  fs.writeFileSync(path.join(templates, 'README.md'), '{{headline}}');
  const config = loadConfig({root, templatesDir:path.join(root,'templates'), dataDir:path.join(root,'data'), port:0, apiKey:'test-key'});
  const instance = await createApiServer({config});
  await new Promise((resolve) => instance.server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => instance.server.close(resolve)));
  const port = instance.server.address().port;
  const response = await fetch(`http://127.0.0.1:${port}/api/jobs`, {method:'POST',headers:{authorization:'Bearer test-key','content-type':'application/json'},body:JSON.stringify({templateId:'demo-card',variables:{headline:'Hello'}})});
  assert.equal(response.status, 202);
  const created = await response.json();
  assert.equal(created.job.status, 'queued');
  assert.equal(await processOne({store:instance.store,registry:instance.registry,config,workerId:'test-worker'}), true);
  const finished = await instance.store.getJob(created.job.id);
  assert.equal(finished.status, 'succeeded');
  assert.equal(fs.existsSync(finished.outputPath), true);
});
