import { pool } from './src/config/database';

async function checkMigrations() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT name, migration_time
      FROM knex_migrations
      WHERE name LIKE '%037%'
      ORDER BY id
    `);

    console.log('Migration 037 status:', res.rows.length > 0 ? 'EXECUTED' : 'NOT EXECUTED');
    if (res.rows.length > 0) {
      console.log('Details:', res.rows);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkMigrations();
