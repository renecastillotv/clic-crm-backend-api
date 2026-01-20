import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkSchema() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'videos'
      ORDER BY ordinal_position
    `);
    console.log('Columnas de la tabla videos:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema();
