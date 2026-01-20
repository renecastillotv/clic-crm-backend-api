import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function check() {
  try {
    // Check if tables exist
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('equipos', 'oficinas')
    `);
    console.log('Tables found:', tables.rows.map(r => r.table_name));

    // Check equipos columns
    const equiposCols = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'equipos'
    `);
    console.log('\nEquipos columns:', equiposCols.rows.map(r => r.column_name));

    // Check oficinas columns
    const oficinasCols = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'oficinas'
    `);
    console.log('\nOficinas columns:', oficinasCols.rows.map(r => r.column_name));

    await pool.end();
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
check();
