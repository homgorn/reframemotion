import {spawn} from 'node:child_process';

const children = [
  spawn(process.execPath, ['apps/api/server.mjs'], {stdio: 'inherit', env: process.env}),
  spawn(process.execPath, ['apps/worker/worker.mjs'], {stdio: 'inherit', env: process.env}),
];
const stop = () => {
  for (const child of children) child.kill('SIGTERM');
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
const results = await Promise.all(children.map((child) => new Promise((resolve) => child.on('exit', (code, signal) => resolve({code, signal})))));
if (results.some((item) => item.code && item.code !== 0)) process.exitCode = 1;
