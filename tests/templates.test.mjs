import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {TemplateRegistry} from '../packages/core/templates.mjs';

test('TemplateRegistry validates variables and prepares a workspace', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reframotion-template-'));
  const template = path.join(root, 'card');
  fs.mkdirSync(template);
  fs.writeFileSync(path.join(template, 'template.json'), JSON.stringify({id:'card',engine:'mock',outputFormat:'json',allowAdditionalVariables:false,variables:{headline:{type:'string',required:true,maxLength:20}},security:{allowRemoteAssets:false}}));
  fs.writeFileSync(path.join(template, 'index.html'), '<h1>{{headline}}</h1>');
  const registry = new TemplateRegistry(root);
  const out = path.join(root, 'out');
  registry.prepare('card', {headline:'Hello & world'}, out);
  assert.equal(fs.readFileSync(path.join(out, 'index.html'), 'utf8'), '<h1>Hello &amp; world</h1>');
  assert.throws(() => registry.validateVariables(registry.get('card'), {headline:'This value is much too long'}), /too long/);
});

test('TemplateRegistry blocks remote assets by default', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reframotion-template-'));
  const template = path.join(root, 'card');
  fs.mkdirSync(template);
  fs.writeFileSync(path.join(template, 'template.json'), JSON.stringify({id:'card',engine:'mock',variables:{},security:{allowRemoteAssets:false}}));
  fs.writeFileSync(path.join(template, 'index.html'), '<img src="https://example.com/a.png">');
  const registry = new TemplateRegistry(root);
  assert.throws(() => registry.prepare('card', {}, path.join(root, 'out')), /Remote assets are disabled/);
});

test('TemplateRegistry copies the pinned GSAP runtime into HyperFrames workspaces', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reframotion-hf-template-'));
  const template = path.join(root, 'templates', 'card');
  const gsap = path.join(root, 'node_modules', 'gsap', 'dist');
  fs.mkdirSync(template, {recursive:true});
  fs.mkdirSync(gsap, {recursive:true});
  fs.writeFileSync(path.join(gsap, 'gsap.min.js'), 'window.gsap={};');
  fs.writeFileSync(path.join(template, 'template.json'), JSON.stringify({id:'card-hf',engine:'hyperframes',outputFormat:'mp4',variables:{},security:{allowRemoteAssets:false}}));
  fs.writeFileSync(path.join(template, 'index.html'), '<script src="assets/gsap.min.js"></script>');
  const registry = new TemplateRegistry(path.join(root, 'templates'));
  const out = path.join(root, 'out');
  registry.prepare('card-hf', {}, out);
  assert.equal(fs.readFileSync(path.join(out, 'assets', 'gsap.min.js'), 'utf8'), 'window.gsap={};');
});

test('TemplateRegistry supports a shared sourceDir with manifest overlays', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reframotion-shared-template-'));
  const shared = path.join(root, 'templates', '_shared', 'base');
  const variant = path.join(root, 'templates', 'variant');
  fs.mkdirSync(shared, {recursive:true});
  fs.mkdirSync(variant, {recursive:true});
  fs.writeFileSync(path.join(shared, 'index.html'), '<h1>{{headline}}</h1>');
  fs.writeFileSync(path.join(shared, 'DESIGN.md'), '# Shared');
  fs.writeFileSync(path.join(variant, 'template.json'), JSON.stringify({id:'variant',engine:'mock',sourceDir:'../_shared/base',outputFormat:'json',allowAdditionalVariables:false,variables:{headline:{type:'string',required:true}},security:{allowRemoteAssets:false}}));
  const registry = new TemplateRegistry(path.join(root, 'templates'));
  const out = path.join(root, 'out');
  registry.prepare('variant', {headline:'Shared works'}, out);
  assert.equal(fs.readFileSync(path.join(out, 'index.html'), 'utf8'), '<h1>Shared works</h1>');
  assert.equal(fs.readFileSync(path.join(out, 'DESIGN.md'), 'utf8'), '# Shared');
});
