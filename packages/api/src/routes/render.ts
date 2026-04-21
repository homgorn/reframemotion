import { Hono } from 'hono';
import { z } from 'zod';
import { jwt } from 'hono/jwt';

const renderRoutes = new Hono();

const renderSchema = z.object({
  compositionHtml: z.string().min(1),
  variables: z.record(z.unknown()).optional(),
  outputFormat: z.enum(['mp4', 'webm']).default('mp4'),
  quality: z.enum(['draft', 'standard', 'high']).default('draft'),
});

renderRoutes.post('/', jwt(), async (c) => {
  const body = await c.req.json();
  const result = renderSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: 'Validation failed', details: result.error }, 400);
  }

  const jobId = crypto.randomUUID();

  return c.json({
    jobId,
    status: 'queued',
    message: 'Job submitted to queue',
  });
});

renderRoutes.get('/:id', jwt(), (c) => {
  const id = c.req.param('id');

  return c.json({
    jobId: id,
    status: 'processing',
    progress: 0,
  });
});

export { renderRoutes };