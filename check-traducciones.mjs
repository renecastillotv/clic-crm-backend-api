import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function check() {
  const result = await pool.query('SELECT id, titulo, traducciones FROM videos ORDER BY updated_at DESC LIMIT 5');
  console.log('Últimos 5 videos:');
  result.rows.forEach(r => {
    console.log('---');
    console.log('ID:', r.id);
    console.log('Título:', r.titulo);
    console.log('Traducciones:', JSON.stringify(r.traducciones, null, 2));
  });
  await pool.end();
}

check();
