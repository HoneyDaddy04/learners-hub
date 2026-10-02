import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './client.js';

// Migrations ship as SQL next to the source; the app always runs from the repo root.
export const migrationsFolder = path.resolve(process.cwd(), 'server/db/migrations');

export async function runMigrations() {
  await migrate(db, { migrationsFolder });
}

// `npm run db:migrate`
if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  runMigrations()
    .then(() => console.log('Migrations applied'))
    .catch((e) => { console.error(e); process.exitCode = 1; })
    .finally(() => pool.end());
}
