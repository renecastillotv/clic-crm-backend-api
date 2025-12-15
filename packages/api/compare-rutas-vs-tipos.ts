import { pool } from './src/config/database';

async function compareRutasVsTipos() {
  console.log('=== Comparando tenants_rutas_config vs tipos_pagina ===\n');
  const client = await pool.connect();

  try {
    // 1. Ver cómo están las rutas en tenants_rutas_config
    console.log('1. TENANTS_RUTAS_CONFIG (lo que acabamos de poblar):');
    console.log('=' .repeat(60));
    const rutas = await client.query(`
      SELECT prefijo, nivel_navegacion, alias_idiomas, habilitado
      FROM tenants_rutas_config
      WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'clic' LIMIT 1)
      ORDER BY prefijo
    `);

    for (const ruta of rutas.rows) {
      console.log(`  ${ruta.prefijo}`);
      console.log(`    - nivel_navegacion: ${ruta.nivel_navegacion}`);
      console.log(`    - alias_idiomas: ${JSON.stringify(ruta.alias_idiomas)}`);
      console.log(`    - habilitado: ${ruta.habilitado}`);
    }

    // 2. Ver cómo están los tipos_pagina con TODA su información
    console.log('\n\n2. TIPOS_PAGINA (la fuente de verdad):');
    console.log('=' .repeat(60));
    const tipos = await client.query(`
      SELECT
        codigo,
        nombre,
        patron,
        nivel_navegacion,
        alias_idiomas,
        requiere_autenticacion,
        es_dinamica,
        categoria
      FROM tipos_pagina
      WHERE codigo IN ('testimonios', 'listado_asesores', 'asesor_single', 'testimonio_single',
                       'videos_listado', 'videos_categoria', 'videos_single',
                       'directorio_articulos', 'articulos_categoria', 'single_articulo',
                       'contacto', 'politicas_privacidad', 'terminos_condiciones')
      ORDER BY codigo
    `);

    for (const tipo of tipos.rows) {
      console.log(`\n  ${tipo.codigo}`);
      console.log(`    - nombre: ${tipo.nombre}`);
      console.log(`    - patron: ${tipo.patron}`);
      console.log(`    - nivel_navegacion: ${tipo.nivel_navegacion}`);
      console.log(`    - alias_idiomas: ${JSON.stringify(tipo.alias_idiomas)}`);
      console.log(`    - es_dinamica: ${tipo.es_dinamica}`);
      console.log(`    - categoria: ${tipo.categoria}`);
    }

    // 3. Mostrar la estructura de tipos_pagina para entender TODOS los campos
    console.log('\n\n3. ESTRUCTURA COMPLETA DE TIPOS_PAGINA:');
    console.log('=' .repeat(60));
    const estructura = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'tipos_pagina'
      ORDER BY ordinal_position
    `);

    for (const col of estructura.rows) {
      console.log(`  ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    }

    // 4. Análisis: ¿Qué información falta para usar tipos_pagina como única fuente?
    console.log('\n\n4. ANÁLISIS:');
    console.log('=' .repeat(60));
    console.log('Para usar tipos_pagina como única fuente necesitamos:');
    console.log('  - patron: Para matchear URLs (ej: "/testimonios", "/testimonios/:slug")');
    console.log('  - nivel_navegacion: Para saber si es directorio(0/1) o single(2)');
    console.log('  - Capacidad de diferenciar: directorio vs categoria vs single');
    console.log('\nVerificando si tipos_pagina tiene esta info...\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

compareRutasVsTipos();
