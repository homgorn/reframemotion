import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { jwt } from 'hono/jwt';

const app = new Hono();

app.use('*', cors());
app.use('*', logger());
app.use('*', prettyJSON());

app.get('/', (c) => c.json({ name: '@hyperframes/api', version: '0.1.0' }));

app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

const PORT = parseInt(process.env.PORT || '3001');

console.log(`🚀 API server on http://localhost:${PORT}`);

export default { port: PORT, fetch: app.fetch };