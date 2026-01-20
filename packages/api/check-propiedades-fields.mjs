import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkFields() {
  const client = await pool.connect();
  try {
    // Verificar columnas de propiedades
    console.log('=== Columnas de propiedades relacionadas ===\n');
    const cols = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'propiedades'
      ORDER BY column_name
    `);

    const relevantCols = cols.rows.filter(r =>
      ['amenidades', 'etapas', 'tipologias', 'created_at', 'updated_at', 'fecha_publicacion',
       'reserva', 'separacion', 'inicial', 'contra_entrega', 'planes_pago', 'amenidades_ids'].includes(r.column_name)
    );

    console.log('Columnas encontradas:');
    relevantCols.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));

    // Ver si hay tabla de amenidades
    console.log('\n=== Tabla de amenidades ===');
    const amenidades = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'amenidades'
      ORDER BY column_name
    `);
    console.log('Columnas de amenidades:');
    amenidades.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));

    // Ver si hay tabla de etapas
    console.log('\n=== Tabla de etapas ===');
    const etapas = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'etapas'
      ORDER BY column_name
    `);
    console.log('Columnas de etapas:');
    etapas.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));

    // Ver si hay tabla de tipologias
    console.log('\n=== Tabla de tipologias ===');
    const tipologias = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'tipologias'
      ORDER BY column_name
    `);
    console.log('Columnas de tipologias:');
    tipologias.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));

    // Ver ejemplo de una propiedad
    console.log('\n=== Ejemplo de propiedad con is_project ===');
    const ejemplo = await client.query(`
      SELECT id, titulo, amenidades_ids, planes_pago, is_project, created_at, updated_at
      FROM propiedades
      WHERE is_project = true
      LIMIT 1
    `);
    if (ejemplo.rows.length > 0) {
      console.log(JSON.stringify(ejemplo.rows[0], null, 2));
    } else {
      console.log('No hay proyectos');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkFields();
