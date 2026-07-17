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

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean).map(String))].sort((a, b) => a.localeCompare(b));
}

function setOptions(select, options, current, fallbackLabel) {
  select.innerHTML = `<option value="">${escape(fallbackLabel)}</option>` + options
    .map((value) => `<option value="${escape(value)}"${value === current ? ' selected' : ''}>${escape(value)}</option>`)
    .join('');
}

function projectSearchText(project) {
  return [
    project.siteName,
    project.siteId,
    project.title,
    project.id,
    project.status,
    project.audioMode,
    project.aspectRatio,
    project.formats?.map((format) => `${format.label} ${format.width} ${format.height}`).join(' ') ?? '',
    project.checkStatus,
    project.approvalStatus,
    project.tags.join(' '),
    project.sourceUrls?.join(' ') ?? '',
    Object.values(project.brief ?? {}).join(' '),
    project.artifacts.map((artifact) => `${artifact.label} ${artifact.path}`).join(' '),
  ].join(' ').toLowerCase();
}

function renderExportProfiles(project) {
  if (!project.exportProfiles?.length) return '';
  const buttons = project.exportProfiles.map((profile) => `<span class="export-profile"><button class="export-action" data-export-action="plan" data-site="${escape(project.siteId)}" data-project="${escape(project.id)}" data-profile="${escape(profile.id)}" title="${escape(profile.description)}">${escape(profile.label)}</button><button class="export-run" data-export-action="queue" data-site="${escape(project.siteId)}" data-project="${escape(project.id)}" data-profile="${escape(profile.id)}" title="Поставить этот экспорт в очередь">▶</button></span>`).join('');
  return `<div class="export-actions">${buttons}</div>`;
}

function renderApproval(project) {
  const current = project.approvalStatus || 'draft';
  return `<select class="approval-select" data-site="${escape(project.siteId)}" data-project="${escape(project.id)}">
    ${['draft', 'review', 'approved', 'final', 'rejected'].map((status) => `<option value="${status}"${status === current ? ' selected' : ''}>${status}</option>`).join('')}
  </select>`;
}

function renderArtifacts(project) {
  return project.artifacts.map((artifact) => `<code class="artifact ${artifact.exists ? 'exists' : 'missing'}" title="${escape(artifact.path)}">${escape(artifact.exists ? '✓ ' : '× ')}${escape(artifact.label)}</code>`).join(' ');
}

function formatLabel(project) {
  const format = project.formats?.[0];
  if (format?.width && format?.height) return `${format.label} · ${format.width}x${format.height}`;
  return project.aspectRatio || 'landscape';
}

function projectActions(project) {
  const preview = project.previewUrl ? `<a href="${escape(project.previewUrl)}" target="_blank" rel="noreferrer">preview</a>` : '—';
  return `${preview}${renderExportProfiles(project)}<div class="artifact-list">${renderArtifacts(project)}</div>`;
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
  const selectedCheck = $('#check-filter').value;
  const selectedAudio = $('#audio-filter').value;
  const search = $('#catalog-search').value.trim().toLowerCase();
  const sortMode = $('#sort-projects').value;
  const projects = catalogState.projects.filter((project) => {
    if (selectedSite && project.siteId !== selectedSite) return false;
    if (selectedCheck && project.checkStatus !== selectedCheck) return false;
    if (selectedAudio && project.audioMode !== selectedAudio) return false;
    if (search && !projectSearchText(project).includes(search)) return false;
    return true;
  }).sort((a, b) => {
    if (sortMode === 'duration-desc') return (b.durationSec ?? -1) - (a.durationSec ?? -1);
    if (sortMode === 'duration-asc') return (a.durationSec ?? Infinity) - (b.durationSec ?? Infinity);
    if (sortMode === 'title-asc') return a.title.localeCompare(b.title);
    return String(b.updatedAt).localeCompare(String(a.updatedAt)) || b.id.localeCompare(a.id);
  });
  const summary = catalogState.summary ?? {};
  const checkSummary = summary.byCheckStatus ?? {};

  $('#catalog-summary').innerHTML = [
    ['Сайтов', catalogState.sites.length],
    ['Проектов', summary.totalProjects ?? projects.length],
    ['На экране', projects.length],
    ['Без замечаний', checkSummary.passed ?? 0],
    ['С замечаниями', (checkSummary.failed ?? 0) + (checkSummary.warning ?? 0) + (checkSummary.pending ?? 0)],
  ].map(([name, value]) => `<div class="mini-stat"><b>${escape(value)}</b><span>${escape(name)}</span></div>`).join('');

  $('#site-filter').innerHTML = '<option value="">Все сайты</option>' + catalogState.sites
    .map((site) => `<option value="${escape(site.id)}"${site.id === selectedSite ? ' selected' : ''}>${escape(site.name)} · ${escape(site.projectCount)} видео</option>`)
    .join('');

  setOptions($('#check-filter'), uniqueSorted(catalogState.projects.map((project) => project.checkStatus)), selectedCheck, 'Все проверки');
  setOptions($('#audio-filter'), uniqueSorted(catalogState.projects.map((project) => project.audioMode)), selectedAudio, 'Любой звук');

  $('#sites').innerHTML = catalogState.sites.map((site) => `<article class="site-card">
    <div>${pill(site.status)}<h3>${escape(site.name)}</h3><p>${escape(site.domain)}</p></div>
    <b>${escape(site.projectCount)}</b>
    <small>${escape(site.tags.join(', '))}</small>
  </article>`).join('');

  const rows = projects.length ? projects.map((project) => `<tr>
      <td>${escape(project.siteName)}<br><code>${escape(project.siteId)}</code></td>
      <td><strong>${escape(project.title)}</strong><br><code>${escape(project.id)}</code><br><span class="muted-line">${escape(formatLabel(project))}</span></td>
      <td>${pill(project.status)}</td>
      <td>${renderApproval(project)}</td>
      <td>${pill(project.checkStatus)}<br><code>${escape(Object.keys(project.checks ?? {}).join(' / ') || 'no checks')}</code></td>
      <td>${escape(project.audioMode)}</td>
      <td>${seconds(project.durationSec)}</td>
      <td>${projectActions(project)}</td>
    </tr>`).join('') : '<tr><td colspan="8">Ничего не найдено по текущим фильтрам.</td></tr>';
  $('#projects').innerHTML = rows;
  $('#project-cards').innerHTML = projects.length ? projects.map((project) => `<article class="project-card">
    <div class="project-card-head"><div><strong>${escape(project.title)}</strong><code>${escape(project.id)}</code></div>${pill(project.status)}</div>
    <div class="project-meta"><span>${escape(project.siteName)}</span><span>${escape(project.audioMode)}</span><span>${seconds(project.durationSec)}</span><span>${escape(formatLabel(project))}</span></div>
    <div>${renderApproval(project)}</div>
    <div class="project-card-checks">${pill(project.checkStatus)} <code>${escape(Object.keys(project.checks ?? {}).join(' / ') || 'no checks')}</code></div>
    ${project.sourceUrls?.length ? `<details><summary>Ссылки: ${escape(project.sourceUrls.length)}</summary><pre>${escape(project.sourceUrls.join('\n'))}</pre></details>` : ''}
    ${project.brief && Object.keys(project.brief).length ? `<details><summary>Brief</summary><pre>${escape(JSON.stringify(project.brief, null, 2))}</pre></details>` : ''}
    <div>${projectActions(project)}</div>
  </article>`).join('') : '<div class="empty-card">Ничего не найдено по текущим фильтрам.</div>';
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
$('#check-filter').addEventListener('change', renderCatalog);
$('#audio-filter').addEventListener('change', renderCatalog);
$('#sort-projects').addEventListener('change', renderCatalog);
$('#catalog-search').addEventListener('input', renderCatalog);
$('#refresh-catalog').addEventListener('click', () => loadCatalog().catch((e) => toast(e.message, true)));

$('#create-brief').addEventListener('click', async () => {
  try {
    const sourceUrls = $('#brief-urls').value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const payload = {
      siteId: $('#brief-site').value.trim(),
      title: $('#brief-title').value.trim(),
      sourceUrls,
      prompt: $('#brief-prompt').value.trim(),
      durationSec: Number($('#brief-duration').value),
      audioMode: $('#brief-audio').value,
      aspectRatio: $('#brief-format').value,
    };
    const {draft} = await request('/api/project-briefs', {method: 'POST', body: JSON.stringify(payload)});
    $('#export-result').hidden = false;
    $('#export-result').textContent = JSON.stringify(draft, null, 2);
    toast(`Draft brief сохранен: ${draft.path}`);
    await loadCatalog();
  } catch (error) {
    toast(error.message, true);
  }
});

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

$('#projects').addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-profile]');
  if (!button) return;
  try {
    const {exportRequest} = await request(`/api/projects/${encodeURIComponent(button.dataset.site)}/${encodeURIComponent(button.dataset.project)}/exports`, {
      method: 'POST',
      body: JSON.stringify({profileId: button.dataset.profile, action: button.dataset.exportAction}),
    });
    const output = JSON.stringify(exportRequest, null, 2);
    $('#export-result').hidden = false;
    $('#export-result').textContent = output;
    await navigator.clipboard?.writeText(output).catch(() => {});
    toast(button.dataset.exportAction === 'queue' ? `Экспорт поставлен в очередь: ${exportRequest.label}` : `Экспорт-профиль подготовлен: ${exportRequest.label}`);
    await loadState();
  } catch (error) {
    toast(error.message, true);
  }
});

$('#project-cards').addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-profile]');
  if (!button) return;
  try {
    const {exportRequest} = await request(`/api/projects/${encodeURIComponent(button.dataset.site)}/${encodeURIComponent(button.dataset.project)}/exports`, {
      method: 'POST',
      body: JSON.stringify({profileId: button.dataset.profile, action: button.dataset.exportAction}),
    });
    $('#export-result').hidden = false;
    $('#export-result').textContent = JSON.stringify(exportRequest, null, 2);
    toast(button.dataset.exportAction === 'queue' ? `Экспорт поставлен в очередь: ${exportRequest.label}` : `Экспорт-профиль подготовлен: ${exportRequest.label}`);
    await loadState();
  } catch (error) {
    toast(error.message, true);
  }
});

async function updateApproval(select) {
  const {project} = await request(`/api/projects/${encodeURIComponent(select.dataset.site)}/${encodeURIComponent(select.dataset.project)}/approval`, {
    method: 'PATCH',
    body: JSON.stringify({approvalStatus: select.value}),
  });
  toast(`Approval обновлен: ${project.title} → ${project.approvalStatus}`);
  await loadCatalog();
}

document.addEventListener('change', (event) => {
  const select = event.target.closest('.approval-select');
  if (!select) return;
  updateApproval(select).catch((error) => toast(error.message, true));
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
