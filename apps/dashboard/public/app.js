const $ = (selector) => document.querySelector(selector);
const keyInput = $('#api-key');
keyInput.value = localStorage.getItem('reframotionApiKey') ?? '';

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
function escape(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
function date(value) { return value ? new Date(value).toLocaleString() : '—'; }

async function loadTemplates() {
  const {templates} = await request('/api/templates');
  $('#template').innerHTML = templates.map((t) => `<option value="${escape(t.id)}">${escape(t.name ?? t.id)} · ${escape(t.engine)}</option>`).join('');
}
async function loadState() {
  const [{jobs}, {batches}, health] = await Promise.all([request('/api/jobs?limit=150'), request('/api/batches?limit=60'), request('/api/health')]);
  const counts = health.stats.jobs ?? {};
  $('#stats').innerHTML = [['В очереди',counts.queued??0],['В работе',counts.running??0],['Готово',counts.succeeded??0],['Ошибки',counts.failed??0]].map(([name,value])=>`<div class="stat"><b>${value}</b><span>${name}</span></div>`).join('');
  $('#jobs').innerHTML = jobs.map((job) => `<tr>
    <td><span class="status ${escape(job.status)}">${escape(job.status)}</span></td><td><code>${escape(job.id)}</code></td><td>${escape(job.templateId)}</td><td>${escape(job.engine)}</td><td>${job.attempts}/${job.maxAttempts}</td><td>${date(job.createdAt)}</td>
    <td>${job.outputPath ? `<code>${escape(job.outputPath)}</code>` : job.error ? `<span title="${escape(job.error)}">${escape(job.error.slice(0,90))}</span>` : '—'}</td>
    <td>${['queued','running'].includes(job.status)?`<button data-action="cancel" data-id="${job.id}">Отмена</button>`:''}${['failed','cancelled'].includes(job.status)?`<button data-action="retry" data-id="${job.id}">Повтор</button>`:''}</td></tr>`).join('');
  $('#batches').innerHTML = batches.map((batch) => `<div class="batch"><span class="status ${escape(batch.status)}">${escape(batch.status)}</span><h3>${escape(batch.name)}</h3><p>${batch.totalJobs} заданий</p><code>${escape(batch.id)}</code></div>`).join('');
}

$('#save-key').addEventListener('click', () => { localStorage.setItem('reframotionApiKey', keyInput.value.trim()); toast('API key сохранен в этом браузере'); loadAll(); });
$('#create-job').addEventListener('click', async () => {
  try {
    const variables = JSON.parse($('#variables').value || '{}');
    const payload = {templateId: $('#template').value, variables, outputFormat: $('#format').value, priority: Number($('#priority').value)};
    const {job} = await request('/api/jobs', {method: 'POST', body: JSON.stringify(payload)});
    toast(`Задание создано: ${job.id}`); await loadState();
  } catch (error) { toast(error.message, true); }
});
$('#create-batch').addEventListener('click', async () => {
  try {
    const payload = {name: $('#batch-name').value, format: $('#batch-format').value, content: $('#batch-content').value};
    const {batch} = await request('/api/batches/import', {method: 'POST', body: JSON.stringify(payload)});
    toast(`Партия создана: ${batch.id}`); await loadState();
  } catch (error) { toast(error.message, true); }
});
$('#jobs').addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]'); if (!button) return;
  try { await request(`/api/jobs/${button.dataset.id}/${button.dataset.action}`, {method: 'POST'}); await loadState(); }
  catch (error) { toast(error.message, true); }
});
$('#refresh').addEventListener('click', () => loadState().catch((e) => toast(e.message, true)));
async function loadAll(){ try { await Promise.all([loadTemplates(), loadState()]); } catch(error){ toast(error.message,true); } }
loadAll();
setInterval(() => loadState().catch(()=>{}), 3000);
