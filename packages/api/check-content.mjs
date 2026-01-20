import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function check() {
  const result = await pool.query('SELECT tipo, nombre, campos_config FROM catalogo_componentes WHERE tipo = $1', ['content']);
  if (result.rows.length > 0) {
    console.log('Componente content:');
    console.log('  Nombre:', result.rows[0].nombre);
    const config = result.rows[0].campos_config;
    console.log('  Campos:', config.campos ? config.campos.length : 0);
    console.log('  Toggles:', config.toggles ? config.toggles.length : 0);
  } else {
    console.log('No existe componente content');
  }
  await pool.end();
}
check();
