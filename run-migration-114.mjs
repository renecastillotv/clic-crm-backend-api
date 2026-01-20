import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Ejecutando migración 114: Refactorizar seo_stats...');

    // Verificar si las columnas ya existen
    const checkColumns = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'seo_stats' AND column_name = 'operaciones'
    `);

    if (checkColumns.rows.length > 0) {
      console.log('La migración ya fue ejecutada (columna operaciones existe)');
      return;
    }

    // Agregar nuevas columnas de arrays
    console.log('Agregando columnas de arrays...');
    await client.query(`
      ALTER TABLE seo_stats
      ADD COLUMN IF NOT EXISTS operaciones TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS tipo_propiedad_ids UUID[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS ubicacion_ids UUID[] DEFAULT '{}'
    `);
    console.log('✓ Columnas de arrays agregadas');

    // Verificar si existen las columnas obsoletas antes de eliminarlas
    const checkOldColumns = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'seo_stats' AND column_name = 'tipo_asociacion'
    `);

    if (checkOldColumns.rows.length > 0) {
      console.log('Eliminando columnas obsoletas...');
      await client.query(`
        ALTER TABLE seo_stats
        DROP COLUMN IF EXISTS tipo_asociacion,
        DROP COLUMN IF EXISTS asociacion_id,
        DROP COLUMN IF EXISTS asociacion_nombre,
        DROP COLUMN IF EXISTS idioma
      `);
      console.log('✓ Columnas obsoletas eliminadas');
    }

    // Crear índices GIN para búsqueda eficiente en arrays
    console.log('Creando índices GIN...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_seo_stats_operaciones ON seo_stats USING GIN (operaciones)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_seo_stats_tipo_propiedad_ids ON seo_stats USING GIN (tipo_propiedad_ids)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_seo_stats_ubicacion_ids ON seo_stats USING GIN (ubicacion_ids)`);
    console.log('✓ Índices GIN creados');

    // Eliminar índices obsoletos
    console.log('Eliminando índices obsoletos...');
    await client.query(`DROP INDEX IF EXISTS idx_seo_stats_tipo`);
    await client.query(`DROP INDEX IF EXISTS idx_seo_stats_asociacion`);
    await client.query(`DROP INDEX IF EXISTS idx_seo_stats_idioma`);
    await client.query(`DROP INDEX IF EXISTS idx_seo_stats_unique_asociacion`);
    console.log('✓ Índices obsoletos eliminados');

    console.log('✅ Migración 114 completada exitosamente');

    // Mostrar estructura final
    const columns = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'seo_stats'
      ORDER BY ordinal_position
    `);
    console.log('\nEstructura final de seo_stats:');
    columns.rows.forEach(c => {
      console.log(`  - ${c.column_name}: ${c.data_type}${c.column_default ? ` (default: ${c.column_default})` : ''}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
