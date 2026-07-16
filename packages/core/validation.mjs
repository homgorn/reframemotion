const statuses = new Set(['queued', 'running', 'succeeded', 'failed', 'cancelled']);
const engines = new Set(['hyperframes', 'remotion', 'mock']);
const formats = new Set(['mp4', 'webm', 'mov', 'gif', 'png', 'json']);

export function asObject(value, name = 'value') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
  return value;
}

export function validateJobInput(raw) {
  const value = asObject(raw, 'job');
  if (typeof value.templateId !== 'string' || !/^[a-z0-9][a-z0-9._-]{1,95}$/i.test(value.templateId)) throw new TypeError('templateId is invalid');
  if (value.variables !== undefined) asObject(value.variables, 'variables');
  if (value.engine !== undefined && !engines.has(value.engine)) throw new TypeError('engine is invalid');
  if (value.outputFormat !== undefined && !formats.has(value.outputFormat)) throw new TypeError('outputFormat is invalid');
  const priority = value.priority === undefined ? 0 : Number(value.priority);
  if (!Number.isInteger(priority) || priority < -100 || priority > 100) throw new TypeError('priority must be an integer between -100 and 100');
  const maxAttempts = value.maxAttempts === undefined ? 2 : Number(value.maxAttempts);
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) throw new TypeError('maxAttempts must be between 1 and 10');
  return {templateId: value.templateId, variables: value.variables ?? {}, engine: value.engine, outputFormat: value.outputFormat, priority, maxAttempts};
}

export function validateBatchInput(raw, maxJobs = 10_000) {
  const value = asObject(raw, 'batch');
  if (typeof value.name !== 'string' || value.name.trim().length < 2 || value.name.length > 160) throw new TypeError('batch name must contain 2-160 characters');
  if (!Array.isArray(value.jobs) || value.jobs.length === 0) throw new TypeError('jobs must be a non-empty array');
  if (value.jobs.length > maxJobs) throw new TypeError(`batch exceeds ${maxJobs} jobs`);
  return {name: value.name.trim(), jobs: value.jobs.map(validateJobInput)};
}

export function validateStatus(value) {
  if (!statuses.has(value)) throw new TypeError('status is invalid');
  return value;
}
