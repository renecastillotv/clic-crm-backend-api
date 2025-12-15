import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function check() {
  await client.connect();

  // Check cat_monedas
  const monedas = await client.query('SELECT codigo, nombre, simbolo, tasa_usd FROM cat_monedas ORDER BY orden LIMIT 10');
  console.log('=== cat_monedas (' + monedas.rows.length + '+ registros) ===');
  monedas.rows.forEach(m => console.log(`  ${m.codigo} - ${m.nombre} (${m.simbolo}) - 1 USD = ${m.tasa_usd}`));

  // Check tenants column
  const cols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'monedas_habilitadas'");
  console.log('\n=== tenants.monedas_habilitadas ===');
  console.log(cols.rows.length > 0 ? 'Column exists: ' + cols.rows[0].data_type : 'Column NOT found');

  await client.end();
}

check();
