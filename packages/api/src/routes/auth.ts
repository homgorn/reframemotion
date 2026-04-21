import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import { z } from 'zod';

const authRoutes = new Hono();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

authRoutes.post('/login', async (c) => {
  const body = await c.req.json();
  const result = loginSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: 'Invalid credentials' }, 400);
  }

  const token = await jwt.sign(
    { sub: result.data.email,iat: Math.floor(Date.now() / 1000) },
    process.env.JWT_SECRET || 'dev-secret-change-in-production'
  );

  return c.json({ token, token_type: 'Bearer' });
});

authRoutes.post('/register', async (c) => {
  const body = await c.req.json();
  const result = loginSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: 'Invalid data' }, 400);
  }

  return c.json({ message: 'Registration not implemented yet' }, 501);
});

export { authRoutes };