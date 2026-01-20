import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function check() {
  try {
    // Check if info_negocio or similar table exists
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND (table_name LIKE '%info%' OR table_name LIKE '%negocio%' OR table_name = 'tenants')
    `);
    console.log('Tables found:', tables.rows.map(r => r.table_name));

    // Check tenants columns - maybe info is stored there
    const tenantCols = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'tenants'
    `);
    console.log('\nTenants columns:', tenantCols.rows.map(r => r.column_name));

    await pool.end();
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
check();
