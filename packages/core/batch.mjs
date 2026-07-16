import {validateJobInput} from './validation.mjs';

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (char !== '\r') field += char;
  }
  if (quoted) throw new TypeError('CSV contains an unclosed quoted field');
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((item) => item.some((cell) => cell.trim() !== ''));
}

export function jobsFromCsv(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new TypeError('CSV must include a header and at least one job');
  const headers = rows[0].map((value) => value.trim());
  for (const name of ['template_id', 'variables_json']) if (!headers.includes(name)) throw new TypeError(`CSV header is missing ${name}`);
  return rows.slice(1).map((cells, index) => {
    const record = Object.fromEntries(headers.map((header, i) => [header, cells[i] ?? '']));
    let variables;
    try { variables = JSON.parse(record.variables_json || '{}'); }
    catch (error) { throw new TypeError(`Row ${index + 2}: variables_json is invalid JSON: ${error.message}`); }
    return validateJobInput({
      templateId: record.template_id,
      engine: record.engine || undefined,
      outputFormat: record.output_format || undefined,
      priority: record.priority === '' ? undefined : Number(record.priority),
      maxAttempts: record.max_attempts === '' ? undefined : Number(record.max_attempts),
      variables,
    });
  });
}

export function jobsFromJson(text) {
  let parsed;
  try { parsed = JSON.parse(text); }
  catch (error) { throw new TypeError(`JSON is invalid: ${error.message}`); }
  const jobs = Array.isArray(parsed) ? parsed : parsed.jobs;
  if (!Array.isArray(jobs)) throw new TypeError('JSON must be an array or an object with a jobs array');
  return jobs.map(validateJobInput);
}
