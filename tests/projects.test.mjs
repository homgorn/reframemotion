import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ProjectCatalog} from '../packages/core/projects.mjs';

test('ProjectCatalog loads sites and video project manifests', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reframotion-projects-'));
  const siteDir = path.join(root, 'example.com');
  fs.mkdirSync(path.join(siteDir, 'videos'), {recursive: true});
  fs.writeFileSync(path.join(siteDir, 'site.json'), JSON.stringify({id: 'example.com', name: 'Example'}));
  fs.writeFileSync(path.join(siteDir, 'videos', 'launch.json'), JSON.stringify({
    id: 'launch',
    title: 'Launch video',
    status: 'ready',
    approvalStatus: 'review',
    durationSec: 30,
    audioMode: 'silent',
    aspectRatio: 'portrait',
    formats: [{id: 'portrait', label: 'Vertical 9:16', width: 1080, height: 1920}],
    sourceUrls: ['https://example.com/a', 'https://example.com/b'],
    brief: {goal: 'Demo goal', audience: 'Architects'},
    exportProfiles: [{
      id: 'demo',
      label: 'DEMO',
      watermark: true,
      audioMode: 'muted',
      captions: 'on',
      variablesPath: 'exports/demo-watermark.variables.json',
      renderCommand: 'npx hyperframes render --variables-file exports/demo-watermark.variables.json',
      variables: {exportProfile: 'demo'},
      artifacts: [{type: 'render', label: 'Demo render', path: 'outputs/demo.mp4'}],
    }],
    artifacts: [{type: 'text', label: 'Existing file', path: 'outputs/existing.txt'}, {type: 'video', label: 'Missing file', path: 'outputs/missing.mp4'}],
    checks: {lint: {status: 'passed', errors: 0, warnings: 0}},
  }));
  fs.mkdirSync(path.join(root, 'outputs'), {recursive: true});
  fs.writeFileSync(path.join(root, 'outputs', 'existing.txt'), 'ok');

  const catalog = new ProjectCatalog(root, {artifactRoots: [root]}).load();
  assert.equal(catalog.sites.length, 1);
  assert.equal(catalog.sites[0].projectCount, 1);
  assert.equal(catalog.projects.length, 1);
  assert.equal(catalog.projects[0].checkStatus, 'passed');
  assert.equal(catalog.projects[0].approvalStatus, 'review');
  assert.equal(catalog.projects[0].aspectRatio, 'portrait');
  assert.deepEqual(catalog.projects[0].formats[0], {id: 'portrait', label: 'Vertical 9:16', width: 1080, height: 1920});
  assert.deepEqual(catalog.projects[0].sourceUrls, ['https://example.com/a', 'https://example.com/b']);
  assert.equal(catalog.projects[0].brief.goal, 'Demo goal');
  assert.equal(catalog.projects[0].artifacts[0].exists, true);
  assert.equal(catalog.projects[0].artifacts[1].exists, false);
  assert.equal(catalog.projects[0].exportProfiles[0].id, 'demo');
  assert.equal(catalog.projects[0].exportProfiles[0].variables.exportProfile, 'demo');
  assert.equal(catalog.projects[0].exportProfiles[0].watermark, true);
  assert.equal(catalog.projects[0].exportProfiles[0].audioMode, 'muted');
  assert.equal(catalog.projects[0].exportProfiles[0].captions, 'on');
  assert.equal(catalog.projects[0].exportProfiles[0].variablesPath, 'exports/demo-watermark.variables.json');
  assert.match(catalog.projects[0].exportProfiles[0].renderCommand, /variables-file/);
  assert.equal(catalog.projects[0].exportProfiles[0].artifacts[0].exists, false);
  assert.equal(catalog.summary.byAudioMode.silent, 1);
});

test('ProjectCatalog reports pending checks before passed', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reframotion-projects-'));
  const siteDir = path.join(root, 'example.com');
  fs.mkdirSync(path.join(siteDir, 'videos'), {recursive: true});
  fs.writeFileSync(path.join(siteDir, 'site.json'), JSON.stringify({id: 'example.com', name: 'Example'}));
  fs.writeFileSync(path.join(siteDir, 'videos', 'pending.json'), JSON.stringify({
    id: 'pending-video',
    checks: {
      lint: {status: 'passed', errors: 0, warnings: 0},
      inspect: {status: 'pending', errors: 0, warnings: 0},
    },
  }));

  const catalog = new ProjectCatalog(root).load();
  assert.equal(catalog.projects[0].checkStatus, 'pending');
  assert.equal(catalog.summary.byCheckStatus.pending, 1);
});

test('ProjectCatalog rejects unsafe IDs', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reframotion-projects-'));
  const siteDir = path.join(root, 'bad');
  fs.mkdirSync(siteDir, {recursive: true});
  fs.writeFileSync(path.join(siteDir, 'site.json'), JSON.stringify({id: '../bad'}));
  assert.throws(() => new ProjectCatalog(root).load(), /site\.id/);
});
