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
    durationSec: 30,
    audioMode: 'silent',
    exportProfiles: [{
      id: 'demo',
      label: 'DEMO',
      watermark: true,
      audioMode: 'muted',
      captions: 'on',
      variablesPath: 'exports/demo-watermark.variables.json',
      renderCommand: 'npx hyperframes render --variables-file exports/demo-watermark.variables.json',
      variables: {exportProfile: 'demo'},
    }],
    checks: {lint: {status: 'passed', errors: 0, warnings: 0}},
  }));

  const catalog = new ProjectCatalog(root).load();
  assert.equal(catalog.sites.length, 1);
  assert.equal(catalog.sites[0].projectCount, 1);
  assert.equal(catalog.projects.length, 1);
  assert.equal(catalog.projects[0].checkStatus, 'passed');
  assert.equal(catalog.projects[0].exportProfiles[0].id, 'demo');
  assert.equal(catalog.projects[0].exportProfiles[0].variables.exportProfile, 'demo');
  assert.equal(catalog.projects[0].exportProfiles[0].watermark, true);
  assert.equal(catalog.projects[0].exportProfiles[0].audioMode, 'muted');
  assert.equal(catalog.projects[0].exportProfiles[0].captions, 'on');
  assert.equal(catalog.projects[0].exportProfiles[0].variablesPath, 'exports/demo-watermark.variables.json');
  assert.match(catalog.projects[0].exportProfiles[0].renderCommand, /variables-file/);
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
