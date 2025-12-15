import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('=== MIGRACIÓN: Agregar tenant_id y limpiar tablas ===\n');

    await client.query('BEGIN');

    // 1. Agregar tenant_id a categorias_propiedades
    console.log('1. Agregando tenant_id a categorias_propiedades...');
    const catHasTenant = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'categorias_propiedades' AND column_name = 'tenant_id'
    `);
    if (catHasTenant.rows.length === 0) {
      await client.query(`
        ALTER TABLE categorias_propiedades
        ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE
      `);
      console.log('   ✓ tenant_id agregado a categorias_propiedades');
    } else {
      console.log('   - tenant_id ya existe en categorias_propiedades');
    }

    // 2. Agregar tenant_id a operaciones
    console.log('2. Agregando tenant_id a operaciones...');
    const opHasTenant = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'operaciones' AND column_name = 'tenant_id'
    `);
    if (opHasTenant.rows.length === 0) {
      await client.query(`
        ALTER TABLE operaciones
        ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE
      `);
      console.log('   ✓ tenant_id agregado a operaciones');
    } else {
      console.log('   - tenant_id ya existe en operaciones');
    }

    // 3. Agregar tenant_id a amenidades
    console.log('3. Agregando tenant_id a amenidades...');
    const amenHasTenant = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'amenidades' AND column_name = 'tenant_id'
    `);
    if (amenHasTenant.rows.length === 0) {
      await client.query(`
        ALTER TABLE amenidades
        ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE
      `);
      console.log('   ✓ tenant_id agregado a amenidades');
    } else {
      console.log('   - tenant_id ya existe en amenidades');
    }

    // 4. Eliminar tablas tipos_operacion y tipos_venta
    console.log('4. Eliminando tabla tipos_operacion...');
    await client.query('DROP TABLE IF EXISTS tipos_operacion CASCADE');
    console.log('   ✓ tipos_operacion eliminada');

    console.log('5. Eliminando tabla tipos_venta...');
    await client.query('DROP TABLE IF EXISTS tipos_venta CASCADE');
    console.log('   ✓ tipos_venta eliminada');

    // 6. Limpiar catalogos de tipo_propiedad y tipo_operacion
    console.log('6. Limpiando catalogos de tipo_propiedad y tipo_operacion...');
    const deleted = await client.query(`
      DELETE FROM catalogos
      WHERE tipo IN ('tipo_propiedad', 'tipo_operacion')
      RETURNING id
    `);
    console.log(`   ✓ ${deleted.rowCount} registros eliminados de catalogos`);

    await client.query('COMMIT');
    console.log('\n=== MIGRACIÓN COMPLETADA EXITOSAMENTE ===');

    // Mostrar estado final
    console.log('\n=== ESTADO FINAL ===');

    const catCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'categorias_propiedades'
      ORDER BY ordinal_position
    `);
    console.log('\ncategorias_propiedades columnas:', catCols.rows.map(r => r.column_name).join(', '));

    const opCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'operaciones'
      ORDER BY ordinal_position
    `);
    console.log('operaciones columnas:', opCols.rows.map(r => r.column_name).join(', '));

    const amenCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'amenidades'
      ORDER BY ordinal_position
    `);
    console.log('amenidades columnas:', amenCols.rows.map(r => r.column_name).join(', '));

    const catalogosTipos = await client.query(`
      SELECT tipo, COUNT(*) as count FROM catalogos GROUP BY tipo ORDER BY tipo
    `);
    console.log('\ncatalogos por tipo:');
    catalogosTipos.rows.forEach(r => console.log(`  - ${r.tipo}: ${r.count}`));

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ ERROR EN MIGRACIÓN:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
