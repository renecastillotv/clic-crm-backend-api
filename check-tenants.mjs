import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function check() {
  const result = await pool.query(`SELECT id, nombre FROM tenants LIMIT 3`);
  console.log('Tenants:');
  result.rows.forEach(r => console.log(`  - ${r.id}: ${r.nombre}`));
  await pool.end();
}

check();
