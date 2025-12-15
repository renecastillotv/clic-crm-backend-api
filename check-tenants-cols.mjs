import pg from 'pg';
const client = new pg.Client({
  connectionString: 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function check() {
  await client.connect();
  const result = await client.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'tenants' ORDER BY ordinal_position");
  console.log('Columnas de tenants:');
  result.rows.forEach(r => console.log('  ' + r.column_name + ' (' + r.data_type + ')' + (r.is_nullable === 'YES' ? ' nullable' : '')));
  await client.end();
}
check();
