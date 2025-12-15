/**
 * Script para limpiar duplicados en la tabla tipos_pagina
 * y mantener solo los tipos de página únicos y válidos
 */

import { query } from '../utils/db.js';

async function cleanDuplicates() {
  console.log('🧹 Limpiando duplicados en tipos_pagina...\n');

  try {
    // 1. Ver todos los tipos de página actuales
    console.log('1️⃣ Listando todos los tipos de página actuales...');
    const allTypes = await query(
      `SELECT codigo, nombre, es_estandar, created_at
       FROM tipos_pagina
       ORDER BY codigo`
    );

    console.log(`\n📊 Total de tipos de página: ${allTypes.rows.length}`);
    console.log('\nCódigos encontrados:');
    allTypes.rows.forEach((t: any, i: number) => {
      console.log(`  ${i + 1}. ${t.codigo} - ${t.nombre} (${t.es_estandar ? 'estándar' : 'custom'})`);
    });
    console.log('');

    // 2. Buscar duplicados por nombre similar
    console.log('2️⃣ Buscando duplicados potenciales...\n');

    const duplicatesCheck = [
      { search: '%asesor%', group: 'asesores' },
      { search: '%video%', group: 'videos' },
      { search: '%article%', group: 'articulos' },
      { search: '%propiedad%', group: 'propiedades' },
      { search: '%property%', group: 'propiedades' },
    ];

    for (const check of duplicatesCheck) {
      const results = await query(
        `SELECT codigo, nombre FROM tipos_pagina WHERE codigo ILIKE $1 OR nombre ILIKE $1 ORDER BY codigo`,
        [check.search]
      );

      if (results.rows.length > 0) {
        console.log(`\n📌 Grupo "${check.group}":`);
        results.rows.forEach((r: any) => {
          console.log(`   - ${r.codigo}: ${r.nombre}`);
        });
      }
    }

    console.log('\n');
    console.log('3️⃣ Análisis completado. Para eliminar duplicados, revisa manualmente los códigos listados arriba.');
    console.log('');
    console.log('💡 Recomendación: Los tipos de página deberían tener códigos únicos y descriptivos.');
    console.log('   Por ejemplo, para asesores:');
    console.log('   - listado_asesores (página índice)');
    console.log('   - asesor_single (plantilla dinámica)');
    console.log('');
    console.log('   NO: single_asesor, asesor_index, etc.');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

cleanDuplicates();
