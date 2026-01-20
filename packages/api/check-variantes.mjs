import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function check() {
  try {
    const result = await pool.query(`SELECT tipo, variantes FROM catalogo_componentes WHERE variantes IS NOT NULL LIMIT 5`);
    console.log('Variantes en catalogo_componentes:');
    result.rows.forEach(row => {
      console.log('\n', row.tipo, ':');
      console.log('  tipo:', typeof row.variantes);
      console.log('  isArray:', Array.isArray(row.variantes));
      console.log('  valor:', JSON.stringify(row.variantes).slice(0, 300));
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

check();
