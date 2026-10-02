import { serve } from '@hono/node-server';
import { app } from './app.js';
import { pool } from './db/client.js';
import { runMigrations } from './db/migrate.js';

// Applying migrations on boot keeps deploys to one step; drizzle skips ones already applied.
if (process.env.MIGRATE_ON_START === 'true') {
  await runMigrations();
  console.log('Migrations applied');
}

const port = Number(process.env.PORT ?? 8080);
const server = serve({ fetch: app.fetch, port }, (info) => console.log(`API listening on :${info.port}`));

// Cloud Run sends SIGTERM before stopping an instance.
process.on('SIGTERM', () => {
  server.close(() => void pool.end().finally(() => process.exit(0)));
});
