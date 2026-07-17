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

test('API exposes the site and video project catalog', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reframotion-api-catalog-'));
  const templates = path.join(root, 'templates', 'demo-card');
  const exportTemplate = path.join(root, 'templates', 'project-export-command');
  const site = path.join(root, 'projects', 'example.com');
  fs.mkdirSync(templates, {recursive:true});
  fs.mkdirSync(exportTemplate, {recursive:true});
  fs.mkdirSync(path.join(site, 'videos'), {recursive:true});
  fs.writeFileSync(path.join(templates, 'template.json'), JSON.stringify({id:'demo-card',engine:'mock',outputFormat:'json',variables:{},security:{allowRemoteAssets:false}}));
  fs.writeFileSync(path.join(exportTemplate, 'template.json'), JSON.stringify({id:'project-export-command',engine:'command',outputFormat:'json',variables:{trusted:{type:'boolean',required:true},siteId:{type:'string',required:true},projectId:{type:'string',required:true},profileId:{type:'string',required:true},label:{type:'string',default:''},command:{type:'string',required:true},expectedOutputPath:{type:'string',default:''}},security:{trustedCatalogOnly:true}}));
  fs.writeFileSync(path.join(site, 'site.json'), JSON.stringify({id:'example.com',name:'Example'}));
  fs.writeFileSync(path.join(site, 'videos', 'launch.json'), JSON.stringify({
    id:'launch',
    title:'Launch',
    status:'ready',
    audioMode:'silent',
    sourcePath:'videos/launch',
    approvalStatus:'draft',
    sourceUrls:['https://example.com/one'],
    brief:{goal:'Approval demo'},
    exportProfiles:[{
      id:'demo',
      label:'DEMO',
      watermark:true,
      audioMode:'muted',
      captions:'on',
      variablesPath:'exports/demo-watermark.variables.json',
      renderCommand:`node -e "require('fs').writeFileSync('data/outputs/export-demo.txt','ok')"`,
      variables:{exportProfile:'demo',captions:'on'},
      artifacts:[{type:'render',label:'Demo MP4',path:'videos/launch/renders/demo.mp4'}],
    }],
  }));
  const config = loadConfig({root, templatesDir:path.join(root,'templates'), projectsDir:path.join(root,'projects'), dataDir:path.join(root,'data'), port:0});
  const instance = await createApiServer({config});
  await new Promise((resolve) => instance.server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => instance.server.close(resolve)));
  const port = instance.server.address().port;
  const response = await fetch(`http://127.0.0.1:${port}/api/catalog`);
  assert.equal(response.status, 200);
  const catalog = await response.json();
  assert.equal(catalog.sites[0].id, 'example.com');
  assert.equal(catalog.projects[0].id, 'launch');
  assert.equal(catalog.projects[0].exportProfiles[0].id, 'demo');

  const exportResponse = await fetch(`http://127.0.0.1:${port}/api/projects/example.com/launch/exports`, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({profileId:'demo'})});
  assert.equal(exportResponse.status, 202);
  const planned = await exportResponse.json();
  assert.equal(planned.exportRequest.profileId, 'demo');
  assert.equal(planned.exportRequest.variables.captions, 'on');
  assert.equal(planned.exportRequest.watermark, true);
  assert.equal(planned.exportRequest.audioMode, 'muted');
  assert.equal(planned.exportRequest.captions, 'on');
  assert.equal(planned.exportRequest.variablesPath, 'exports/demo-watermark.variables.json');
  assert.match(planned.exportRequest.renderCommand, /writeFileSync/);

  const queueResponse = await fetch(`http://127.0.0.1:${port}/api/projects/example.com/launch/exports`, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({profileId:'demo', action:'queue'})});
  assert.equal(queueResponse.status, 202);
  const queued = await queueResponse.json();
  assert.equal(queued.exportRequest.status, 'queued');
  assert.equal(queued.job.templateId, 'project-export-command');
  assert.equal(queued.job.engine, 'command');
  assert.equal(queued.job.variables.projectId, 'launch');
  assert.equal(await processOne({store:instance.store,registry:instance.registry,config,workerId:'export-worker'}), true);
  const exportJob = await instance.store.getJob(queued.job.id);
  assert.equal(exportJob.status, 'succeeded');
  assert.equal(fs.existsSync(path.join(root, 'data', 'outputs', 'export-demo.txt')), true);

  const approvalResponse = await fetch(`http://127.0.0.1:${port}/api/projects/example.com/launch/approval`, {method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({approvalStatus:'approved'})});
  assert.equal(approvalResponse.status, 200);
  const approved = await approvalResponse.json();
  assert.equal(approved.project.approvalStatus, 'approved');

  const briefResponse = await fetch(`http://127.0.0.1:${port}/api/project-briefs`, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({siteId:'new-site.ru',domain:'new-site.ru',title:'New site video',sourceUrls:['https://new-site.ru/','https://new-site.ru/about'],prompt:'Сделать 90 секунд про продукт',durationSec:90,audioMode:'voice',aspectRatio:'square'})});
  assert.equal(briefResponse.status, 201);
  const brief = await briefResponse.json();
  assert.match(brief.draft.path, /projects\/_drafts\//);
  assert.equal(brief.draft.manifest.brief.prompt, 'Сделать 90 секунд про продукт');
  assert.equal(brief.draft.manifest.sourceUrls.length, 2);
  assert.equal(brief.draft.manifest.aspectRatio, 'square');
  assert.deepEqual(brief.draft.manifest.formats[0], {id:'square',label:'Square 1:1',width:1080,height:1080});
});

test('dashboard assets are not cached across deploys', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reframotion-api-static-'));
  const templates = path.join(root, 'templates', 'demo-card');
  fs.mkdirSync(templates, {recursive:true});
  fs.writeFileSync(path.join(templates, 'template.json'), JSON.stringify({id:'demo-card',engine:'mock',outputFormat:'json',variables:{},security:{allowRemoteAssets:false}}));
  const config = loadConfig({root, templatesDir:path.join(root,'templates'), dataDir:path.join(root,'data'), port:0});
  const instance = await createApiServer({config});
  await new Promise((resolve) => instance.server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => instance.server.close(resolve)));
  const port = instance.server.address().port;
  const response = await fetch(`http://127.0.0.1:${port}/dashboard/app.js`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-cache');
});
