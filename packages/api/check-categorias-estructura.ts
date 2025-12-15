import { pool } from './src/config/database';

/**
 * Script para revisar la estructura de categorias_contenido
 * y agregar el campo slug_traducciones si no existe
 */

async function checkCategoriasEstructura() {
  console.log('=== REVISANDO ESTRUCTURA DE CATEGORIAS_CONTENIDO ===\n');
  const client = await pool.connect();

  try {
    // 1. Verificar estructura actual
    console.log('1. ESTRUCTURA ACTUAL:');
    console.log('='.repeat(60));

    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'categorias_contenido'
      ORDER BY ordinal_position
    `);

    console.log('Columnas actuales:');
    console.table(columns.rows);

    // 2. Verificar si existe slug_traducciones
    const hasSlugTraducciones = columns.rows.some(col => col.column_name === 'slug_traducciones');

    console.log('\n2. VERIFICACIÓN:');
    console.log('='.repeat(60));
    console.log(`Campo slug_traducciones existe: ${hasSlugTraducciones ? '✅ SÍ' : '❌ NO'}`);

    // 3. Ver algunos registros de ejemplo
    console.log('\n3. REGISTROS DE EJEMPLO:');
    console.log('='.repeat(60));

    const ejemplos = await client.query(`
      SELECT id, nombre, slug, tipo_contenido, activa
      FROM categorias_contenido
      LIMIT 10
    `);

    console.table(ejemplos.rows);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkCategoriasEstructura();
