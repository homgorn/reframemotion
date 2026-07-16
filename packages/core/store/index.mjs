import {SqliteStore} from './sqlite.mjs';

export async function createStore(config) {
  const store = new SqliteStore(config.dbPath);
  return store;
}
