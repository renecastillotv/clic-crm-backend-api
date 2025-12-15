/**
 * Run migration 100: Add nombre_privado to propiedades
 */

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function main() {
  const client = await pool.connect();

  try {
    // Verificar si la columna ya existe
    const checkColumn = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'propiedades' AND column_name = 'nombre_privado'
    `);

    if (checkColumn.rows.length === 0) {
      await client.query(`
        ALTER TABLE propiedades
        ADD COLUMN nombre_privado VARCHAR(255)
      `);
      console.log('Added nombre_privado column to propiedades table');
    } else {
      console.log('Column nombre_privado already exists');
    }

    // Verificar
    const verify = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'propiedades' AND column_name = 'nombre_privado'
    `);
    console.log('Verification:', verify.rows);

    console.log('\nDone!');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
