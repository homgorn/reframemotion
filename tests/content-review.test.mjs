import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {validateProjectContent} from '../packages/core/content-review.mjs';

test('content review rejects internal production language in client narration', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reframotion-content-'));
  const source = path.join(root, 'videos', 'bad');
  fs.mkdirSync(source, {recursive: true});
  fs.writeFileSync(path.join(source, 'SCRIPT.md'), [
    'Этот ролик собран при помощи HyperFrames.',
    'На следующей странице сайта показываем скриншот и процесс рендера.',
    'Оставьте заявку на расчет проекта.',
  ].join('\n'));
  const manifest = {id: 'bad', audioMode: 'voice', durationSec: 30, sourcePath: 'videos/bad'};

  const result = validateProjectContent({manifest, roots: [root]});
  assert.equal(result.status, 'failed');
  assert.ok(result.issues.some((issue) => issue.code === 'internal_process_in_client_voice'));
  assert.ok(result.issues.some((issue) => issue.code === 'website_meta_in_client_voice'));
});

test('content review accepts client-first sales narration', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reframotion-content-'));
  const source = path.join(root, 'videos', 'good');
  fs.mkdirSync(source, {recursive: true});
  fs.writeFileSync(path.join(source, 'SCRIPT.md'), [
    'РОСПАН помогает закрывать стены и потолки коммерческих объектов быстрее и аккуратнее.',
    'Панели подходят для общественных пространств, офисов и проектов с требованиями к надежности.',
    'Оставьте заявку, чтобы получить образцы и расчет под ваш объект.',
  ].join('\n'));
  fs.writeFileSync(path.join(source, 'PRONUNCIATION.md'), 'РОСПАН: ударение на второй слог.');
  const manifest = {id: 'good', audioMode: 'voice', durationSec: 60, sourcePath: 'videos/good'};

  const result = validateProjectContent({manifest, roots: [root]});
  assert.equal(result.status, 'passed');
  assert.equal(result.errors, 0);
});
