import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function check() {
  const result = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'tenants'
    ORDER BY ordinal_position
  `);
  console.log('Columnas de tenants:');
  result.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

  // Ver ejemplo de configuracion
  const tenant = await pool.query(`SELECT id, nombre, configuracion FROM tenants LIMIT 1`);
  if (tenant.rows.length > 0) {
    console.log('\nEjemplo de tenant:');
    console.log('  configuracion:', JSON.stringify(tenant.rows[0].configuracion, null, 2));
  }

  await pool.end();
}

check();
