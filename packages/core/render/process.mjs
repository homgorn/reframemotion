import {spawn} from 'node:child_process';

export function runProcess(command, args, {cwd, env = {}, timeoutMs = 1_800_000, signal} = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {cwd, env: {...process.env, ...env}, stdio: ['ignore', 'pipe', 'pipe'], shell: false});
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
      if (code === 0) finish(null, {code, signal: childSignal, stdout, stderr});
      else finish(new Error(`${command} exited with code ${code}${childSignal ? ` (${childSignal})` : ''}\n${stderr || stdout}`));
    });
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 5000).unref();
      finish(new Error(`${command} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    timer.unref();
  });
}
