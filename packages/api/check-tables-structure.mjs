import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkTables() {
  const client = await pool.connect();
  try {
    // 1. Listar tablas relevantes
    console.log('=== TABLAS RELEVANTES ===\n');
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND (
        table_name LIKE '%categoria%' OR
        table_name LIKE '%amenidad%' OR
        table_name LIKE '%estado%' OR
        table_name LIKE '%operacion%' OR
        table_name LIKE '%tipo%' OR
        table_name = 'catalogos'
      )
      ORDER BY table_name
    `);
    tables.rows.forEach(row => console.log('  -', row.table_name));

    // 2. Ver estructura de categorias_propiedades
    console.log('\n=== CATEGORIAS_PROPIEDADES ===');
    const catProps = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'categorias_propiedades'
      ORDER BY ordinal_position
    `);
    if (catProps.rows.length > 0) {
      catProps.rows.forEach(row => console.log(`  ${row.column_name}: ${row.data_type}`));
      const catData = await client.query('SELECT * FROM categorias_propiedades LIMIT 5');
      console.log('  Datos:', catData.rows.length, 'registros');
      if (catData.rows.length > 0) console.log('  Ejemplo:', catData.rows[0]);
    } else {
      console.log('  (tabla no existe)');
    }

    // 3. Ver estructura de amenidades
    console.log('\n=== AMENIDADES ===');
    const amenidades = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'amenidades'
      ORDER BY ordinal_position
    `);
    if (amenidades.rows.length > 0) {
      amenidades.rows.forEach(row => console.log(`  ${row.column_name}: ${row.data_type}`));
      const amenData = await client.query('SELECT * FROM amenidades LIMIT 5');
      console.log('  Datos:', amenData.rows.length, 'registros');
      if (amenData.rows.length > 0) console.log('  Ejemplo:', amenData.rows[0]);
    } else {
      console.log('  (tabla no existe)');
    }

    // 4. Ver estructura de estados_venta
    console.log('\n=== ESTADOS_VENTA ===');
    const estados = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'estados_venta'
      ORDER BY ordinal_position
    `);
    if (estados.rows.length > 0) {
      estados.rows.forEach(row => console.log(`  ${row.column_name}: ${row.data_type}`));
      const estadosData = await client.query('SELECT * FROM estados_venta');
      console.log('  Datos:', estadosData.rows.length, 'registros');
      estadosData.rows.forEach(row => console.log('    -', row.nombre || row.codigo));
    } else {
      console.log('  (tabla no existe)');
    }

    // 5. Ver estructura de operaciones
    console.log('\n=== OPERACIONES ===');
    const operaciones = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'operaciones'
      ORDER BY ordinal_position
    `);
    if (operaciones.rows.length > 0) {
      operaciones.rows.forEach(row => console.log(`  ${row.column_name}: ${row.data_type}`));
      const opData = await client.query('SELECT * FROM operaciones LIMIT 5');
      console.log('  Datos:', opData.rows.length, 'registros');
      if (opData.rows.length > 0) console.log('  Ejemplo:', opData.rows[0]);
    } else {
      console.log('  (tabla no existe)');
    }

    // 6. Ver tipos_operacion
    console.log('\n=== TIPOS_OPERACION ===');
    const tiposOp = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'tipos_operacion'
      ORDER BY ordinal_position
    `);
    if (tiposOp.rows.length > 0) {
      tiposOp.rows.forEach(row => console.log(`  ${row.column_name}: ${row.data_type}`));
      const tiposOpData = await client.query('SELECT * FROM tipos_operacion');
      console.log('  Datos:', tiposOpData.rows.length, 'registros');
    } else {
      console.log('  (tabla no existe)');
    }

    // 7. Ver tipos_venta
    console.log('\n=== TIPOS_VENTA ===');
    const tiposVenta = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'tipos_venta'
      ORDER BY ordinal_position
    `);
    if (tiposVenta.rows.length > 0) {
      tiposVenta.rows.forEach(row => console.log(`  ${row.column_name}: ${row.data_type}`));
      const tiposVentaData = await client.query('SELECT * FROM tipos_venta');
      console.log('  Datos:', tiposVentaData.rows.length, 'registros');
    } else {
      console.log('  (tabla no existe)');
    }

    // 8. Ver catalogos (nueva tabla)
    console.log('\n=== CATALOGOS (NUEVA) ===');
    const catalogos = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'catalogos'
      ORDER BY ordinal_position
    `);
    if (catalogos.rows.length > 0) {
      catalogos.rows.forEach(row => console.log(`  ${row.column_name}: ${row.data_type}`));
      const catCount = await client.query('SELECT tipo, COUNT(*) as count FROM catalogos GROUP BY tipo ORDER BY tipo');
      console.log('  Conteo por tipo:');
      catCount.rows.forEach(row => console.log(`    - ${row.tipo}: ${row.count}`));
    } else {
      console.log('  (tabla no existe)');
    }

    // 9. Ver relaciones con propiedades
    console.log('\n=== RELACIONES CON PROPIEDADES ===');
    const propCols = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'propiedades'
      AND (column_name LIKE '%tipo%' OR column_name LIKE '%categoria%' OR column_name LIKE '%operacion%')
    `);
    propCols.rows.forEach(row => console.log('  -', row.column_name));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTables();
