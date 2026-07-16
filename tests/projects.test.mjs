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
    checks: {lint: {status: 'passed', errors: 0, warnings: 0}},
  }));

  const catalog = new ProjectCatalog(root).load();
  assert.equal(catalog.sites.length, 1);
  assert.equal(catalog.sites[0].projectCount, 1);
  assert.equal(catalog.projects.length, 1);
  assert.equal(catalog.projects[0].checkStatus, 'passed');
  assert.equal(catalog.summary.byAudioMode.silent, 1);
});

test('ProjectCatalog rejects unsafe IDs', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reframotion-projects-'));
  const siteDir = path.join(root, 'bad');
  fs.mkdirSync(siteDir, {recursive: true});
  fs.writeFileSync(path.join(siteDir, 'site.json'), JSON.stringify({id: '../bad'}));
  assert.throws(() => new ProjectCatalog(root).load(), /site\.id/);
});
