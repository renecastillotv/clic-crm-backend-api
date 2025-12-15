import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function main() {
  const client = await pool.connect();
  try {
    // Ver estructura de la tabla amenidades
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'amenidades'
      ORDER BY ordinal_position
    `);
    console.log('=== Estructura de tabla amenidades ===');
    res.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type} (nullable: ${r.is_nullable})`));

    // Contar amenidades
    const count = await client.query('SELECT COUNT(*) FROM amenidades');
    console.log('\nTotal amenidades:', count.rows[0].count);

    // Ver si existe tenant_id
    const hasTenant = res.rows.some(r => r.column_name === 'tenant_id');
    console.log('\nTiene tenant_id:', hasTenant);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
