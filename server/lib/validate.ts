import type { Context } from 'hono';
import { z } from 'zod';
import { badRequest, notFound } from './errors.js';

/** Parse a JSON body against a schema; a ZodError becomes a 400 in the app error handler. */
export async function body<T extends z.ZodTypeAny>(c: Context, schema: T): Promise<z.infer<T>> {
  const raw = await c.req.json().catch(() => {
    throw badRequest('Request body must be JSON');
  });
  return schema.parse(raw);
}

const uuid = z.string().uuid();

/** A route id that is not a uuid can never match a row, so treat it as not found. */
export function idParam(c: Context, name = 'id'): string {
  const v = c.req.param(name);
  if (!uuid.safeParse(v).success) throw notFound();
  return v as string;
}
