import {randomUUID} from 'node:crypto';

export const newId = (prefix) => `${prefix}_${randomUUID().replaceAll('-', '')}`;
export const nowIso = () => new Date().toISOString();
