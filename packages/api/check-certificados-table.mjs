import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL;
const isLocal = dbUrl?.includes('localhost') || dbUrl?.includes('127.0.0.1');

const pool = new Pool({
  connectionString: dbUrl,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

async function check() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'university_certificados_emitidos'
      ORDER BY ordinal_position
    `);
    console.log('Columnas en university_certificados_emitidos:');
    result.rows.forEach(r => console.log('  -', r.column_name, '('+r.data_type+')', r.is_nullable === 'NO' ? 'NOT NULL' : 'nullable'));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

check();
