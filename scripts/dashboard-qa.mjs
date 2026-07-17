import {spawn} from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'docs', 'operations', 'screenshots');
const REPORT = path.join(ROOT, 'docs', 'operations', 'dashboard-ui-qa-2026-07-17.md');
const PROJECT_ID = 'rospan-vertical-2min-conversion';
const SITE_ID = 'rospan.ru';

fs.mkdirSync(OUT_DIR, {recursive: true});

function verbose(message) {
  if (process.env.REFRAMOTION_QA_VERBOSE) console.error(`[dashboard-qa] ${message}`);
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error('Chrome or Edge executable was not found. Set CHROME_PATH to run dashboard QA.');
  return found;
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const {port} = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function waitForJson(url, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

async function cdpConnect(port, pageUrl, chromeProcess) {
  let chromeExit = null;
  chromeProcess?.once?.('exit', (code, signal) => {
    chromeExit = {code, signal};
  });
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (chromeExit) throw new Error(`Chrome exited before DevTools was ready: ${JSON.stringify(chromeExit)}`);
    try {
      await waitForJson(`http://127.0.0.1:${port}/json/version`, 1000);
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  if (chromeExit) throw new Error(`Chrome exited before DevTools was ready: ${JSON.stringify(chromeExit)}`);
  await waitForJson(`http://127.0.0.1:${port}/json/version`, 1000);
  const response = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(pageUrl)}`, {method: 'PUT'});
  if (!response.ok) throw new Error(`Could not create Chrome target: HTTP ${response.status}`);
  const target = await response.json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, {once: true});
    socket.addEventListener('error', reject, {once: true});
  });

  let id = 0;
  const pending = new Map();
  const events = [];
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const {resolve, reject} = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(`${message.error.message}: ${message.error.data ?? ''}`));
      else resolve(message.result ?? {});
      return;
    }
    events.push(message);
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const callId = ++id;
    pending.set(callId, {resolve, reject});
    socket.send(JSON.stringify({id: callId, method, params}));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');
  return {socket, send, events};
}

async function evaluate(cdp, expression, options = {}) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
    ...options,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? 'Runtime evaluation failed');
  }
  return result.result?.value;
}

function jsString(value) {
  return JSON.stringify(String(value));
}

async function waitFor(cdp, expression, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await evaluate(cdp, expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function click(cdp, selector) {
  await evaluate(cdp, `(() => {
    const el = document.querySelector(${jsString(selector)});
    if (!el) throw new Error('Missing selector: ${selector}');
    el.scrollIntoView({block: 'center', inline: 'center'});
    el.click();
    return true;
  })()`);
}

async function fill(cdp, selector, value) {
  await evaluate(cdp, `(() => {
    const el = document.querySelector(${jsString(selector)});
    if (!el) throw new Error('Missing selector: ${selector}');
    el.value = ${jsString(value)};
    el.dispatchEvent(new Event('input', {bubbles: true}));
    el.dispatchEvent(new Event('change', {bubbles: true}));
    return true;
  })()`);
}

async function select(cdp, selector, value) {
  await evaluate(cdp, `(() => {
    const el = document.querySelector(${jsString(selector)});
    if (!el) throw new Error('Missing selector: ${selector}');
    el.value = ${jsString(value)};
    el.dispatchEvent(new Event('change', {bubbles: true}));
    return true;
  })()`);
}

async function screenshot(cdp, name) {
  const {data} = await cdp.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: true});
  const file = path.join(OUT_DIR, name);
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
  return file;
}

async function setViewport(cdp, width, height, mobile = false) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
  });
  await cdp.send('Emulation.setVisibleSize', {width, height});
}

async function readApi(port, route, options = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${route}`, {
    headers: {'content-type': 'application/json', ...(options.headers ?? {})},
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${route}: ${payload.error ?? response.status}`);
  return payload;
}

function markdownPath(file) {
  return path.relative(ROOT, file).replaceAll('\\', '/');
}

function copyDirectory(source, destination) {
  fs.mkdirSync(destination, {recursive: true});
  for (const entry of fs.readdirSync(source, {withFileTypes: true})) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

function removeQaDrafts(projectsDir) {
  const draftsDir = path.join(projectsDir, '_drafts');
  const removed = [];
  if (!fs.existsSync(draftsDir)) return removed;
  for (const file of fs.readdirSync(draftsDir)) {
    if (file.startsWith('qa-dashboard.test__')) {
      fs.rmSync(path.join(draftsDir, file), {force: true});
      removed.push(file);
    }
  }
  if (!fs.readdirSync(draftsDir).length) fs.rmSync(draftsDir, {recursive: true, force: true});
  return removed;
}

async function main() {
  verbose('starting');
  const apiTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'reframotion-dashboard-qa-'));
  const qaProjectsDir = path.join(apiTemp, 'projects');
  verbose(`copying projects to ${qaProjectsDir}`);
  copyDirectory(path.join(ROOT, 'projects'), qaProjectsDir);
  const apiPort = await freePort();
  verbose(`starting api on ${apiPort}`);
  const apiProcess = spawn(process.execPath, ['apps/api/server.mjs'], {
    cwd: ROOT,
    stdio: 'ignore',
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(apiPort),
      REFRAMOTION_ROOT: ROOT,
      REFRAMOTION_DATA_DIR: path.join(apiTemp, 'data'),
      REFRAMOTION_PROJECTS_DIR: qaProjectsDir,
    },
  });
  await waitForJson(`http://127.0.0.1:${apiPort}/api/health`, 30000);
  verbose('api healthy');

  const chromePort = await freePort();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reframotion-chrome-'));
  verbose(`starting chrome on ${chromePort}`);
  const chrome = spawn(findChrome(), [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${chromePort}`,
    `--user-data-dir=${userDataDir}`,
    '--window-size=1440,1100',
    `http://127.0.0.1:${apiPort}/`,
  ], {stdio: 'ignore'});

  const results = [];
  let cdp;
  try {
    verbose('connecting cdp');
    cdp = await cdpConnect(chromePort, `http://127.0.0.1:${apiPort}/`, chrome);
    verbose('cdp connected');
    await setViewport(cdp, 1440, 1100);
    await waitFor(cdp, `document.body.innerText.includes('Каталог сайтов и видео') && document.querySelectorAll('#projects tr').length > 0`);
    verbose('initial loaded');
    results.push(['initial load', 'passed']);
    const desktopShot = await screenshot(cdp, 'dashboard-qa-01-desktop-catalog.png');

    await fill(cdp, '#api-key', 'qa-local-key');
    await click(cdp, '#save-key');
    await waitFor(cdp, `localStorage.getItem('reframotionApiKey') === 'qa-local-key'`);
    results.push(['save API key button', 'passed']);

    await click(cdp, '#refresh-catalog');
    await waitFor(cdp, `document.body.innerText.includes('${PROJECT_ID}')`);
    results.push(['refresh catalog button', 'passed']);

    await select(cdp, '#site-filter', SITE_ID);
    await select(cdp, '#check-filter', 'passed');
    await select(cdp, '#audio-filter', 'voice+music');
    await select(cdp, '#sort-projects', 'duration-asc');
    await fill(cdp, '#catalog-search', 'vertical 9:16');
    await waitFor(cdp, `document.body.innerText.includes('${PROJECT_ID}') && !document.body.innerText.includes('Ничего не найдено')`);
    const filteredShot = await screenshot(cdp, 'dashboard-qa-02-filters-search.png');
    results.push(['site/check/audio/sort/search controls', 'passed']);

    await fill(cdp, '#catalog-search', PROJECT_ID);
    await waitFor(cdp, `document.querySelector('button[data-profile="demo_watermark"]') !== null`);
    await click(cdp, 'button[data-profile="demo_watermark"][data-export-action="plan"]');
    await waitFor(cdp, `!document.querySelector('#export-result').hidden && document.querySelector('#export-result').innerText.includes('demo_watermark')`);
    const exportPlanShot = await screenshot(cdp, 'dashboard-qa-03-export-plan.png');
    results.push(['DEMO export plan button', 'passed']);

    await click(cdp, 'button[data-profile="demo_watermark"][data-export-action="queue"]');
    await waitFor(cdp, `document.querySelector('#export-result').innerText.includes('queued') || document.body.innerText.includes('Экспорт поставлен')`);
    results.push(['DEMO export queue button', 'passed']);

    const originalApproval = await evaluate(cdp, `document.querySelector('.approval-select[data-project="${PROJECT_ID}"]').value`);
    await select(cdp, `.approval-select[data-project="${PROJECT_ID}"]`, 'approved');
    await waitFor(cdp, `document.querySelector('.approval-select[data-project="${PROJECT_ID}"]').value === 'approved'`);
    await select(cdp, `.approval-select[data-project="${PROJECT_ID}"]`, originalApproval);
    await waitFor(cdp, `document.querySelector('.approval-select[data-project="${PROJECT_ID}"]').value === ${jsString(originalApproval)}`);
    results.push(['approval select change and restore', 'passed']);

    await fill(cdp, '#brief-site', 'qa-dashboard.test');
    await fill(cdp, '#brief-title', 'QA vertical brief');
    await fill(cdp, '#brief-urls', 'https://qa-dashboard.test/\\nhttps://qa-dashboard.test/projects');
    await fill(cdp, '#brief-duration', '45');
    await select(cdp, '#brief-audio', 'silent');
    await select(cdp, '#brief-format', 'portrait');
    await fill(cdp, '#brief-prompt', 'QA: вертикальный ролик без звука, субтитры и CTA.');
    await click(cdp, '#create-brief');
    await waitFor(cdp, `document.querySelector('#export-result').innerText.includes('qa-dashboard.test')`);
    const briefShot = await screenshot(cdp, 'dashboard-qa-04-brief-created.png');
    results.push(['create draft brief button', 'passed']);

    await select(cdp, '#format', 'json');
    await fill(cdp, '#variables', '{"headline":"QA dashboard job","subtitle":"Button click"}');
    await fill(cdp, '#priority', '3');
    await click(cdp, '#create-job');
    await waitFor(cdp, `document.body.innerText.includes('demo-card') && document.querySelector('#jobs button[data-action="cancel"]')`);
    results.push(['create single job button', 'passed']);

    await fill(cdp, '#batch-name', 'QA dashboard batch');
    await select(cdp, '#batch-format', 'json');
    await fill(cdp, '#batch-content', '[{"templateId":"demo-card","variables":{"headline":"QA batch","subtitle":"Import"},"engine":"mock","outputFormat":"json"}]');
    await click(cdp, '#create-batch');
    await waitFor(cdp, `document.body.innerText.includes('QA dashboard batch')`);
    results.push(['batch import button', 'passed']);

    await click(cdp, '#refresh');
    await waitFor(cdp, `document.querySelector('#jobs tr') !== null`);
    results.push(['refresh jobs button', 'passed']);

    await click(cdp, '#jobs button[data-action="cancel"]');
    await waitFor(cdp, `document.querySelector('#jobs button[data-action="retry"]') !== null`);
    results.push(['cancel queued job button', 'passed']);

    await click(cdp, '#jobs button[data-action="retry"]');
    await waitFor(cdp, `document.querySelector('#jobs button[data-action="cancel"]') !== null`);
    const queueShot = await screenshot(cdp, 'dashboard-qa-05-queue-batch-actions.png');
    results.push(['retry cancelled job button', 'passed']);

    await setViewport(cdp, 390, 900, false);
    await cdp.send('Page.reload', {ignoreCache: true});
    await waitFor(cdp, `document.body.innerText.includes('Каталог сайтов и видео')`, 30000);
    await waitFor(cdp, `document.querySelector('#project-cards') && getComputedStyle(document.querySelector('#project-cards')).display !== 'none' && document.querySelector('#project-cards').innerText.includes('${PROJECT_ID}')`, 30000);
    await evaluate(cdp, `window.scrollTo(0, 0)`);
    const mobileShot = await screenshot(cdp, 'dashboard-qa-06-mobile-cards.png');
    results.push(['mobile project cards layout', 'passed']);

    const catalog = await readApi(apiPort, '/api/catalog');
    verbose('api catalog checked');
    const project = catalog.projects.find((item) => item.id === PROJECT_ID);
    if (!project || project.status !== 'rendered' || project.checkStatus !== 'passed') {
      throw new Error(`${PROJECT_ID} is not rendered/passed in API catalog`);
    }
    if (!project.artifacts.some((artifact) => artifact.type === 'render' && artifact.exists)) {
      throw new Error(`${PROJECT_ID} has no existing render artifact in API catalog`);
    }
    results.push(['API catalog rendered/passed/final MP4 evidence', 'passed']);
    const removedDrafts = removeQaDrafts(qaProjectsDir);
    results.push([`QA draft cleanup (${removedDrafts.length} file(s))`, 'passed']);

    const report = [
      '# Dashboard UI QA — 2026-07-17',
      '',
      'Automated Chrome DevTools smoke test for the local ReFrameMotion dashboard.',
      '',
      'API URL: ephemeral local test server',
      `Project under review: ${SITE_ID}/${PROJECT_ID}`,
      '',
      '## Click Coverage',
      '',
      ...results.map(([name, status]) => `- ${status === 'passed' ? 'PASS' : 'FAIL'}: ${name}`),
      '',
      '## Screenshots',
      '',
      `- Desktop catalog: ${markdownPath(desktopShot)}`,
      `- Filters/search: ${markdownPath(filteredShot)}`,
      `- Export plan: ${markdownPath(exportPlanShot)}`,
      `- Draft brief: ${markdownPath(briefShot)}`,
      `- Queue and batch actions: ${markdownPath(queueShot)}`,
      `- Mobile cards: ${markdownPath(mobileShot)}`,
      '',
      '## Notes',
      '',
      '- The test uses isolated temporary copies of the SQLite data directory and project catalog.',
      '- Draft brief creation and approval changes mutate only the temporary project catalog copy.',
      '- Export queue is tested by creating a queued command job only; the worker is not started by this QA script.',
      '',
    ].join('\n');
    fs.writeFileSync(REPORT, report);
    verbose('report written');

    console.log(JSON.stringify({
      status: 'passed',
      report: markdownPath(REPORT),
      screenshots: [desktopShot, filteredShot, exportPlanShot, briefShot, queueShot, mobileShot].map(markdownPath),
      checks: results,
    }, null, 2));
  } finally {
    verbose('cleanup');
    cdp?.socket?.close();
    chrome.kill();
    await Promise.race([
      new Promise((resolve) => chrome.once('exit', resolve)),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
    apiProcess.kill();
    await Promise.race([
      new Promise((resolve) => apiProcess.once('exit', resolve)),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
    removeQaDrafts(qaProjectsDir);
    for (const dir of [apiTemp, userDataDir]) {
      try {
        fs.rmSync(dir, {recursive: true, force: true, maxRetries: 5, retryDelay: 250});
      } catch (error) {
        if (process.env.REFRAMOTION_QA_VERBOSE) console.warn(`cleanup warning: ${error.message}`);
      }
    }
  }
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exit(1);
});
