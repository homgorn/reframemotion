import fs from 'node:fs';
import path from 'node:path';
import {runProcess} from './process.mjs';

export async function renderRemotion({prepared, outputPath, config, signal}) {
  const {manifest, directory, variables} = prepared;
  if (!manifest.remotion?.compositionId) throw new Error('Remotion template requires remotion.compositionId');
  const propsPath = path.join(directory, '.reframotion-props.json');
  fs.writeFileSync(propsPath, JSON.stringify(variables));
  const prefix = config.remotionBin === 'npx' ? ['remotion'] : [];
  const args = [...prefix, 'render'];
  if (manifest.remotion.entryPoint) args.push(manifest.remotion.entryPoint);
  args.push(manifest.remotion.compositionId, outputPath, '--props', propsPath);
  if (manifest.render?.codec) args.push('--codec', manifest.render.codec);
  const result = await runProcess(config.remotionBin, args, {cwd: directory, timeoutMs: config.renderTimeoutMs, signal});
  if (!fs.existsSync(outputPath)) throw new Error('Remotion finished without creating the requested output');
  return {outputPath, metadata: {stdout: result.stdout.slice(-4000)}};
}
