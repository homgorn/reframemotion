import fs from 'node:fs';
import {runProcess} from './process.mjs';

export async function renderHyperFrames({job, prepared, outputPath, config, signal}) {
  const {manifest, directory} = prepared;
  if (manifest.render?.lint !== false) await runProcess(config.hyperframesBin, ['lint'], {cwd: directory, timeoutMs: config.renderTimeoutMs, signal});
  if ((manifest.render?.check ?? manifest.render?.validate ?? true) !== false) await runProcess(config.hyperframesBin, ['check'], {cwd: directory, timeoutMs: config.renderTimeoutMs, signal});
  const args = ['render', '--output', outputPath, '--quality', manifest.render?.quality ?? 'standard'];
  const fps = manifest.render?.fps;
  if (fps) args.push('--fps', String(fps));
  if (job.outputFormat && job.outputFormat !== 'mp4') args.push('--format', job.outputFormat);
  const result = await runProcess(config.hyperframesBin, args, {cwd: directory, timeoutMs: config.renderTimeoutMs, signal});
  if (!fs.existsSync(outputPath)) throw new Error('HyperFrames finished without creating the requested output');
  return {outputPath, metadata: {stdout: result.stdout.slice(-4000)}};
}
