import { pool } from './src/config/database';

/**
 * Script para agregar soporte de categorías a testimonios
 * Esto permite URLs como: /testimonios/vendedores/juan-rafael
 */

async function addTestimoniosCategoria() {
  console.log('=== AGREGANDO SOPORTE DE CATEGORÍAS PARA TESTIMONIOS ===\n');
  const client = await pool.connect();

  try {
    // 1. Verificar estado actual
    console.log('1. ESTADO ACTUAL:');
    console.log('='.repeat(60));
    const current = await client.query(`
      SELECT codigo, ruta_patron, nivel
      FROM tipos_pagina
      WHERE codigo LIKE '%testimonio%'
      ORDER BY codigo
    `);
    console.log('Rutas actuales de testimonios:');
    console.table(current.rows);

    // 2. Agregar ruta de categoría
    console.log('\n2. AGREGANDO RUTA DE CATEGORÍA:');
    console.log('='.repeat(60));

    const insertResult = await client.query(`
      INSERT INTO tipos_pagina (
        codigo,
        nombre,
        ruta_patron,
        nivel,
        visible,
        publico,
        alias_rutas
      )
      VALUES (
        'testimonios_categoria',
        'Categoría de Testimonios',
        '/testimonios/categoria/:slug',
        1,
        true,
        true,
        '{}'::jsonb
      )
      ON CONFLICT (codigo) DO UPDATE
      SET
        nombre = EXCLUDED.nombre,
        ruta_patron = EXCLUDED.ruta_patron,
        nivel = EXCLUDED.nivel,
        visible = EXCLUDED.visible,
        publico = EXCLUDED.publico
      RETURNING *
    `);

    console.log('✅ Ruta de categoría agregada:');
    console.table(insertResult.rows);

    // 3. Actualizar nivel de testimonio_single
    console.log('\n3. ACTUALIZANDO NIVEL DE TESTIMONIO_SINGLE:');
    console.log('='.repeat(60));

    const updateResult = await client.query(`
      UPDATE tipos_pagina
      SET nivel = 2
      WHERE codigo = 'testimonio_single'
      RETURNING *
    `);

    console.log('✅ Nivel actualizado:');
    console.table(updateResult.rows);

    // 4. Verificar resultado final
    console.log('\n4. ESTADO FINAL:');
    console.log('='.repeat(60));
    const final = await client.query(`
      SELECT codigo, ruta_patron, nivel
      FROM tipos_pagina
      WHERE codigo LIKE '%testimonio%'
      ORDER BY codigo
    `);
    console.log('Rutas finales de testimonios:');
    console.table(final.rows);

    console.log('\n✅ PROCESO COMPLETADO');
    console.log('\nAhora testimonios soporta URLs como:');
    console.log('  - /testimonios (listado)');
    console.log('  - /testimonios/categoria/vendedores (categoría)');
    console.log('  - /testimonios/vendedores/juan-rafael (single con categoría)');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

addTestimoniosCategoria();
