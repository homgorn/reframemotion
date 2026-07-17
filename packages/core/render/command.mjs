import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';

function runShell(command, {cwd, timeoutMs, signal}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {cwd, stdio: ['ignore', 'pipe', 'pipe'], shell: true});
    let stdout = '';
    let stderr = '';
    let settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      if (error) reject(error); else resolve(result);
    };
    const abort = () => child.kill('SIGTERM');
    signal?.addEventListener('abort', abort, {once: true});
    child.stdout.on('data', (chunk) => { stdout = (stdout + chunk).slice(-200_000); });
    child.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-200_000); });
    child.on('error', (error) => finish(error));
    child.on('close', (code, childSignal) => {
      if (code === 0) finish(null, {stdout, stderr, signal: childSignal});
      else finish(new Error(`Command exited with code ${code}${childSignal ? ` (${childSignal})` : ''}\n${stderr || stdout}`));
    });
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 5000).unref();
      finish(new Error(`Command timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    timer.unref();
  });
}

function resolveExpectedOutput(config, expectedOutputPath) {
  if (!expectedOutputPath) return '';
  const raw = String(expectedOutputPath);
  if (path.isAbsolute(raw)) return raw;
  const candidates = [
    path.resolve(config.root, raw),
    path.resolve(config.root, '..', raw),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}

export async function renderCommand({prepared, outputPath, config, signal}) {
  const {variables} = prepared;
  const command = String(variables.command ?? '').trim();
  if (!command) throw new Error('Command renderer requires variables.command');
  if (variables.trusted !== true) throw new Error('Command renderer only accepts trusted catalog export jobs');
  const result = await runShell(command, {cwd: config.root, timeoutMs: config.renderTimeoutMs, signal});
  const requestedOutput = resolveExpectedOutput(config, variables.expectedOutputPath);
  const metadata = {
    command,
    stdout: result.stdout.slice(-4000),
    stderr: result.stderr.slice(-4000),
    expectedOutputPath: variables.expectedOutputPath ?? '',
  };
  if (requestedOutput && fs.existsSync(requestedOutput)) return {outputPath: requestedOutput, metadata};
  fs.writeFileSync(outputPath, `${JSON.stringify({status: 'completed', ...metadata}, null, 2)}\n`);
  return {outputPath, metadata};
}
