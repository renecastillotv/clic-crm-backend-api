import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  // Verificar si la tabla existe
  const tableCheck = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = 'ventas_expediente_requerimientos'
    );
  `);

  console.log('¿Tabla existe?:', tableCheck.rows[0].exists);

  if (tableCheck.rows[0].exists) {
    // Contar registros por tenant
    const counts = await pool.query(`
      SELECT tenant_id, categoria, COUNT(*) as total
      FROM ventas_expediente_requerimientos
      WHERE activo = true
      GROUP BY tenant_id, categoria
      ORDER BY tenant_id, categoria
    `);
    console.log('\nRegistros por tenant y categoría:');
    console.log(JSON.stringify(counts.rows, null, 2));

    // Ver algunos ejemplos
    const examples = await pool.query(`
      SELECT titulo, categoria, es_obligatorio
      FROM ventas_expediente_requerimientos
      WHERE activo = true
      LIMIT 10
    `);
    console.log('\nEjemplos de requerimientos:');
    console.log(JSON.stringify(examples.rows, null, 2));
  }

  await pool.end();
}

check();
