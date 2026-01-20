import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function check() {
  const result = await pool.query(`
    SELECT id, tipo, nombre, componente_key, campos_config
    FROM catalogo_componentes
    WHERE tipo = 'hero'
    ORDER BY nombre
  `);

  console.log('=== Componentes Hero en catalogo_componentes ===\n');
  for (const row of result.rows) {
    console.log('ID:', row.id);
    console.log('Nombre:', row.nombre);
    console.log('Tipo:', row.tipo);
    console.log('Key:', row.componente_key);
    const campos = row.campos_config?.campos || [];
    console.log('Campos:', campos.length);
    console.log('---');
  }

  await pool.end();
}
check();
