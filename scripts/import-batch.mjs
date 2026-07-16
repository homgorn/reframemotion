import fs from 'node:fs';
import {loadConfig} from '../packages/core/config.mjs';
import {createStore} from '../packages/core/store/index.mjs';
import {TemplateRegistry} from '../packages/core/templates.mjs';
import {jobsFromCsv, jobsFromJson} from '../packages/core/batch.mjs';

const file = process.argv[2];
const name = process.argv[3] ?? `Imported ${new Date().toISOString()}`;
if (!file) throw new Error('Usage: npm run import:batch -- <file.csv|file.json> [batch name]');
const config = loadConfig();
const registry = new TemplateRegistry(config.templatesDir);
const content = fs.readFileSync(file, 'utf8');
const jobs = file.toLowerCase().endsWith('.csv') ? jobsFromCsv(content) : jobsFromJson(content);
if (jobs.length > config.maxBatchJobs) throw new Error(`Batch exceeds ${config.maxBatchJobs} jobs`);
const normalized = jobs.map((job) => {
  const manifest = registry.get(job.templateId);
  return {...job, variables: registry.validateVariables(manifest, job.variables), engine: job.engine ?? manifest.engine, outputFormat: job.outputFormat ?? manifest.outputFormat ?? 'mp4'};
});
const store = await createStore(config);
const batch = await store.createBatch(name, normalized);
console.log(JSON.stringify(batch, null, 2));
await store.close();
