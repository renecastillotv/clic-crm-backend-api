import { pool } from './src/config/database';

async function checkTiposPaginaStructure() {
  console.log('=== ESTRUCTURA DE TIPOS_PAGINA ===\n');
  const client = await pool.connect();

  try {
    // 1. Ver estructura completa
    console.log('1. COLUMNAS DE LA TABLA:');
    console.log('='.repeat(60));
    const estructura = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'tipos_pagina'
      ORDER BY ordinal_position
    `);

    for (const col of estructura.rows) {
      console.log(`  ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} nullable: ${col.is_nullable}`);
    }

    // 2. Ver ejemplos de datos reales
    console.log('\n\n2. EJEMPLOS DE DATOS (testimonios, asesores, videos):');
    console.log('='.repeat(60));
    const ejemplos = await client.query(`
      SELECT *
      FROM tipos_pagina
      WHERE codigo IN ('testimonios', 'testimonio_single',
                       'listado_asesores', 'asesor_single',
                       'videos_listado', 'videos_categoria', 'videos_single')
      ORDER BY codigo
    `);

    for (const row of ejemplos.rows) {
      console.log(`\n${row.codigo}:`);
      for (const [key, value] of Object.entries(row)) {
        if (key !== 'id' && value !== null) {
          const displayValue = typeof value === 'object' ? JSON.stringify(value) : value;
          console.log(`  ${key}: ${displayValue}`);
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTiposPaginaStructure();
