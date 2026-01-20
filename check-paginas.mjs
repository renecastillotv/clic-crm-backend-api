import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function verifyStructure() {
  try {
    // Ver estructura de componentes_web
    const cols = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'componentes_web'
      ORDER BY ordinal_position
    `);
    console.log('Columnas de componentes_web:');
    cols.rows.forEach(r => console.log('  -', r.column_name, ':', r.data_type));

    // Ver algunos registros
    const compWeb = await pool.query(`
      SELECT * FROM componentes_web
      WHERE tenant_id = 'd43e30b1-61d0-46e5-a760-7595f78dd184'
      LIMIT 3
    `);
    console.log('\nEjemplos componentes_web:');
    compWeb.rows.forEach(r => console.log('  -', JSON.stringify(r, null, 2)));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

verifyStructure();
