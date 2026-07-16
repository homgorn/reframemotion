import path from 'node:path';
import {timingSafeEqual, createHash} from 'node:crypto';

export function safeEqualText(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function assertInside(baseDir, candidate) {
  const base = path.resolve(baseDir);
  const resolved = path.resolve(candidate);
  const relative = path.relative(base, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`Path escapes allowed root: ${candidate}`);
  return resolved;
}

export function sanitizeFileName(value, fallback = 'output') {
  const cleaned = String(value ?? '').normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return cleaned.slice(0, 96) || fallback;
}

export function stableHash(value) {
  return createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
}
