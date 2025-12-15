import knex from 'knex';
import { up } from './src/database/migrations/104_create_monedas_catalog.ts';

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function run() {
  try {
    console.log('Running migration 104...');
    await up(db);
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await db.destroy();
  }
}

run();
