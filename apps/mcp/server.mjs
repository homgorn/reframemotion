import readline from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadConfig} from '../../packages/core/config.mjs';
import {assertInside} from '../../packages/core/security.mjs';

const config = loadConfig();
const apiUrl = process.env.REFRAMOTION_API_URL ?? `http://127.0.0.1:${config.port}`;
const apiKey = process.env.REFRAMOTION_API_KEY ?? '';

async function api(method, pathname, body) {
  const response = await fetch(`${apiUrl}${pathname}`, {
    method,
    headers: {'content-type': 'application/json', ...(apiKey ? {authorization: `Bearer ${apiKey}`} : {})},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? `API request failed: ${response.status}`);
  return payload;
}

const toolDefinitions = [
  {name: 'list_templates', description: 'List registered and validated video templates.', inputSchema: {type: 'object', properties: {}}},
  {name: 'create_render_job', description: 'Queue one render job by template ID. Arbitrary HTML is intentionally not accepted.', inputSchema: {type: 'object', required: ['templateId'], properties: {templateId: {type: 'string'}, variables: {type: 'object'}, engine: {type: 'string', enum: ['hyperframes', 'remotion', 'mock']}, outputFormat: {type: 'string'}, priority: {type: 'integer'}}}},
  {name: 'create_render_batch', description: 'Queue multiple render jobs as one batch.', inputSchema: {type: 'object', required: ['name', 'jobs'], properties: {name: {type: 'string'}, jobs: {type: 'array', items: {type: 'object'}}}}},
  {name: 'list_render_jobs', description: 'List render jobs and optionally filter by status.', inputSchema: {type: 'object', properties: {status: {type: 'string'}, limit: {type: 'integer'}}}},
  {name: 'get_render_job', description: 'Get one render job by ID.', inputSchema: {type: 'object', required: ['jobId'], properties: {jobId: {type: 'string'}}}},
  {name: 'cancel_render_job', description: 'Request cancellation of a queued or running job.', inputSchema: {type: 'object', required: ['jobId'], properties: {jobId: {type: 'string'}}}},
  {name: 'retry_render_job', description: 'Retry a failed or cancelled job.', inputSchema: {type: 'object', required: ['jobId'], properties: {jobId: {type: 'string'}}}},
];

const resources = new Map([
  ['reframotion://docs/architecture', 'docs/architecture/overview.md'],
  ['reframotion://docs/roadmap', 'ROADMAP.md'],
  ['reframotion://docs/wiki', 'docs/wiki/README.md'],
  ['reframotion://docs/codex', 'AGENTS.md'],
]);

const okText = (value) => ({content: [{type: 'text', text: JSON.stringify(value, null, 2)}]});

export async function callTool(name, args = {}) {
  switch (name) {
    case 'list_templates': return okText(await api('GET', '/api/templates'));
    case 'create_render_job': return okText(await api('POST', '/api/jobs', args));
    case 'create_render_batch': return okText(await api('POST', '/api/batches', args));
    case 'list_render_jobs': {
      const query = new URLSearchParams();
      if (args.status) query.set('status', args.status);
      if (args.limit) query.set('limit', String(args.limit));
      return okText(await api('GET', `/api/jobs?${query}`));
    }
    case 'get_render_job': return okText(await api('GET', `/api/jobs/${encodeURIComponent(args.jobId)}`));
    case 'cancel_render_job': return okText(await api('POST', `/api/jobs/${encodeURIComponent(args.jobId)}/cancel`));
    case 'retry_render_job': return okText(await api('POST', `/api/jobs/${encodeURIComponent(args.jobId)}/retry`));
    default: throw new Error(`Unknown tool: ${name}`);
  }
}

export async function dispatchMcp(message) {
  const {id, method, params = {}} = message;
  if (method === 'notifications/initialized' || method?.startsWith('notifications/')) return null;
  if (method === 'initialize') return {jsonrpc: '2.0', id, result: {protocolVersion: params.protocolVersion ?? '2025-06-18', capabilities: {tools: {}, resources: {}, prompts: {}}, serverInfo: {name: 'reframotion-mcp', version: '1.0.0'}}};
  if (method === 'ping') return {jsonrpc: '2.0', id, result: {}};
  if (method === 'tools/list') return {jsonrpc: '2.0', id, result: {tools: toolDefinitions}};
  if (method === 'tools/call') return {jsonrpc: '2.0', id, result: await callTool(params.name, params.arguments ?? {})};
  if (method === 'resources/list') return {jsonrpc: '2.0', id, result: {resources: [...resources.keys()].map((uri) => ({uri, name: uri.split('/').at(-1), mimeType: 'text/markdown'}))}};
  if (method === 'resources/read') {
    const relative = resources.get(params.uri);
    if (!relative) throw new Error(`Unknown resource: ${params.uri}`);
    const file = assertInside(config.root, path.join(config.root, relative));
    return {jsonrpc: '2.0', id, result: {contents: [{uri: params.uri, mimeType: 'text/markdown', text: fs.readFileSync(file, 'utf8')}]}};
  }
  if (method === 'prompts/list') return {jsonrpc: '2.0', id, result: {prompts: [{name: 'plan-video-batch', description: 'Create a validated mass-video batch plan from a campaign brief.', arguments: [{name: 'brief', required: true}, {name: 'templateId', required: false}]}]}};
  if (method === 'prompts/get' && params.name === 'plan-video-batch') return {jsonrpc: '2.0', id, result: {description: 'Plan a mass video batch', messages: [{role: 'user', content: {type: 'text', text: `Use ReFrameMotion templates and the project wiki. Convert this brief into a JSON batch. Validate claims, keep one measurable hypothesis per variant, and do not queue renders until the user approves.\n\nBrief:\n${params.arguments?.brief ?? ''}\nPreferred template: ${params.arguments?.templateId ?? 'choose from list_templates'}`}}]}};
  return {jsonrpc: '2.0', id, error: {code: -32601, message: `Method not found: ${method}`}};
}

async function main() {
  const input = readline.createInterface({input: process.stdin, crlfDelay: Infinity});
  for await (const line of input) {
    if (!line.trim()) continue;
    let message;
    try { message = JSON.parse(line); }
    catch (error) { process.stdout.write(`${JSON.stringify({jsonrpc: '2.0', id: null, error: {code: -32700, message: error.message}})}\n`); continue; }
    try {
      const response = await dispatchMcp(message);
      if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
    } catch (error) {
      process.stdout.write(`${JSON.stringify({jsonrpc: '2.0', id: message.id ?? null, error: {code: -32000, message: error.message}})}\n`);
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
