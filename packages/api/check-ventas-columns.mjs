import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const result = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'ventas'
    AND (column_name LIKE '%externo%' OR column_name LIKE '%referidor%')
    ORDER BY column_name
  `);
  console.log('Columnas relacionadas a externo/referidor:');
  console.log(JSON.stringify(result.rows, null, 2));

  // También ver las foreign keys
  const fks = await pool.query(`
    SELECT
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_name = 'ventas'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND (kcu.column_name LIKE '%externo%' OR kcu.column_name LIKE '%referidor%')
  `);
  console.log('\nForeign Keys:');
  console.log(JSON.stringify(fks.rows, null, 2));

  await pool.end();
}

check();
