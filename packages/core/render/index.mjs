import fs from 'node:fs';
import path from 'node:path';
import {sanitizeFileName} from '../security.mjs';
import {renderHyperFrames} from './hyperframes.mjs';
import {renderRemotion} from './remotion.mjs';
import {renderMock} from './mock.mjs';
import {renderCommand} from './command.mjs';

const renderers = {hyperframes: renderHyperFrames, remotion: renderRemotion, mock: renderMock, command: renderCommand};

export async function renderJob({job, registry, config, signal}) {
  const manifest = registry.get(job.templateId);
  const engine = job.engine || manifest.engine;
  if (engine !== manifest.engine && manifest.allowedEngines?.includes(engine) !== true) throw new Error(`Template ${manifest.id} does not allow engine ${engine}`);
  const format = job.outputFormat || manifest.outputFormat || (engine === 'mock' ? 'json' : 'mp4');
  const workspace = path.join(config.workDir, job.id);
  const prepared = registry.prepare(job.templateId, job.variables, workspace);
  const batchSegment = job.batchId ? sanitizeFileName(job.batchId) : 'single';
  const outputDir = path.join(config.outputsDir, batchSegment);
  fs.mkdirSync(outputDir, {recursive: true});
  const outputPath = path.join(outputDir, `${sanitizeFileName(job.id)}.${format}`);
  const renderer = renderers[engine];
  if (!renderer) throw new Error(`Renderer is not implemented: ${engine}`);
  try {
    const result = await renderer({job: {...job, outputFormat: format}, prepared, outputPath, config, signal});
    return {...result, engine, format};
  } finally {
    if (process.env.REFRAMOTION_KEEP_WORKSPACES !== 'true') fs.rmSync(workspace, {recursive: true, force: true});
  }
}
