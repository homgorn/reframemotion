const $ = (selector) => document.querySelector(selector);
const keyInput = $('#api-key');
keyInput.value = localStorage.getItem('reframotionApiKey') ?? '';

let catalogState = {sites: [], projects: [], summary: {}};

function headers() {
  const key = keyInput.value.trim();
  return {'content-type': 'application/json', ...(key ? {authorization: `Bearer ${key}`} : {})};
}

async function request(path, options = {}) {
  const response = await fetch(path, {...options, headers: {...headers(), ...(options.headers ?? {})}});
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? `HTTP ${response.status}`);
  return payload;
}

function toast(message, error = false) {
  const el = $('#toast');
  el.textContent = message;
  el.style.borderColor = error ? 'var(--danger)' : 'var(--line)';
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3600);
}

function escape(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
}

function date(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

function seconds(value) {
  if (value === null || value === undefined) return '—';
  const total = Number(value);
  const minutes = Math.floor(total / 60);
  const sec = Math.round(total % 60).toString().padStart(2, '0');
  return `${minutes}:${sec}`;
}

function pill(value, className = '') {
  return `<span class="status ${escape(className || value)}">${escape(value)}</span>`;
}

async function loadTemplates() {
  const {templates} = await request('/api/templates');
  $('#template').innerHTML = templates.map((t) => `<option value="${escape(t.id)}">${escape(t.name ?? t.id)} · ${escape(t.engine)}</option>`).join('');
}

async function loadCatalog() {
  catalogState = await request('/api/catalog');
  renderCatalog();
}

function renderCatalog() {
  const selectedSite = $('#site-filter').value;
  const projects = selectedSite ? catalogState.projects.filter((project) => project.siteId === selectedSite) : catalogState.projects;
  const summary = catalogState.summary ?? {};
  const checkSummary = summary.byCheckStatus ?? {};

  $('#catalog-summary').innerHTML = [
    ['Сайтов', catalogState.sites.length],
    ['Проектов', summary.totalProjects ?? projects.length],
    ['Проверено', checkSummary.passed ?? 0],
    ['Нужны правки', (checkSummary.failed ?? 0) + (checkSummary.warning ?? 0)],
  ].map(([name, value]) => `<div class="mini-stat"><b>${escape(value)}</b><span>${escape(name)}</span></div>`).join('');

  $('#site-filter').innerHTML = '<option value="">Все сайты</option>' + catalogState.sites
    .map((site) => `<option value="${escape(site.id)}"${site.id === selectedSite ? ' selected' : ''}>${escape(site.name)} · ${escape(site.projectCount)} видео</option>`)
    .join('');

  $('#sites').innerHTML = catalogState.sites.map((site) => `<article class="site-card">
    <div>${pill(site.status)}<h3>${escape(site.name)}</h3><p>${escape(site.domain)}</p></div>
    <b>${escape(site.projectCount)}</b>
    <small>${escape(site.tags.join(', '))}</small>
  </article>`).join('');

  $('#projects').innerHTML = projects.map((project) => {
    const artifacts = project.artifacts.map((artifact) => `<code title="${escape(artifact.path)}">${escape(artifact.label)}</code>`).join(' ');
    const preview = project.previewUrl ? `<a href="${escape(project.previewUrl)}" target="_blank" rel="noreferrer">preview</a>` : '—';
    return `<tr>
      <td>${escape(project.siteName)}<br><code>${escape(project.siteId)}</code></td>
      <td><strong>${escape(project.title)}</strong><br><code>${escape(project.id)}</code></td>
      <td>${pill(project.status)}</td>
      <td>${pill(project.checkStatus)}<br><code>${escape(Object.keys(project.checks ?? {}).join(' / ') || 'no checks')}</code></td>
      <td>${escape(project.audioMode)}</td>
      <td>${seconds(project.durationSec)}</td>
      <td>${preview}<div class="artifact-list">${artifacts}</div></td>
    </tr>`;
  }).join('');
}

async function loadState() {
  const [{jobs}, {batches}, health] = await Promise.all([request('/api/jobs?limit=150'), request('/api/batches?limit=60'), request('/api/health')]);
  const counts = health.stats.jobs ?? {};
  $('#stats').innerHTML = [['В очереди', counts.queued ?? 0], ['В работе', counts.running ?? 0], ['Готово', counts.succeeded ?? 0], ['Ошибки', counts.failed ?? 0]]
    .map(([name, value]) => `<div class="stat"><b>${value}</b><span>${name}</span></div>`).join('');
  $('#jobs').innerHTML = jobs.map((job) => `<tr>
    <td>${pill(job.status)}</td><td><code>${escape(job.id)}</code></td><td>${escape(job.templateId)}</td><td>${escape(job.engine)}</td><td>${job.attempts}/${job.maxAttempts}</td><td>${date(job.createdAt)}</td>
    <td>${job.outputPath ? `<code>${escape(job.outputPath)}</code>` : job.error ? `<span title="${escape(job.error)}">${escape(job.error.slice(0, 90))}</span>` : '—'}</td>
    <td>${['queued', 'running'].includes(job.status) ? `<button data-action="cancel" data-id="${job.id}">Отмена</button>` : ''}${['failed', 'cancelled'].includes(job.status) ? `<button data-action="retry" data-id="${job.id}">Повтор</button>` : ''}</td></tr>`).join('');
  $('#batches').innerHTML = batches.map((batch) => `<div class="batch"><span class="status ${escape(batch.status)}">${escape(batch.status)}</span><h3>${escape(batch.name)}</h3><p>${batch.totalJobs} заданий</p><code>${escape(batch.id)}</code></div>`).join('');
}

$('#save-key').addEventListener('click', () => {
  localStorage.setItem('reframotionApiKey', keyInput.value.trim());
  toast('API key сохранен в этом браузере');
  loadAll();
});

$('#site-filter').addEventListener('change', renderCatalog);
$('#refresh-catalog').addEventListener('click', () => loadCatalog().catch((e) => toast(e.message, true)));

$('#create-job').addEventListener('click', async () => {
  try {
    const variables = JSON.parse($('#variables').value || '{}');
    const payload = {templateId: $('#template').value, variables, outputFormat: $('#format').value, priority: Number($('#priority').value)};
    const {job} = await request('/api/jobs', {method: 'POST', body: JSON.stringify(payload)});
    toast(`Задание создано: ${job.id}`);
    await loadState();
  } catch (error) {
    toast(error.message, true);
  }
});

$('#create-batch').addEventListener('click', async () => {
  try {
    const payload = {name: $('#batch-name').value, format: $('#batch-format').value, content: $('#batch-content').value};
    const {batch} = await request('/api/batches/import', {method: 'POST', body: JSON.stringify(payload)});
    toast(`Партия создана: ${batch.id}`);
    await loadState();
  } catch (error) {
    toast(error.message, true);
  }
});

$('#jobs').addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  try {
    await request(`/api/jobs/${button.dataset.id}/${button.dataset.action}`, {method: 'POST'});
    await loadState();
  } catch (error) {
    toast(error.message, true);
  }
});

$('#refresh').addEventListener('click', () => loadState().catch((e) => toast(e.message, true)));

async function loadAll() {
  await Promise.all([
    loadCatalog().catch((error) => toast(`Каталог: ${error.message}`, true)),
    loadTemplates().catch((error) => toast(`Шаблоны: ${error.message}`, true)),
    loadState().catch((error) => toast(`Очередь: ${error.message}`, true)),
  ]);
}

loadAll();
setInterval(() => loadState().catch(() => {}), 3000);
