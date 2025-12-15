import { pool } from './src/config/database';

/**
 * Script para verificar tipos de página y rutas que faltan
 */

async function checkRutasFaltantes() {
  console.log('=== VERIFICANDO RUTAS EN tipos_pagina ===\n');
  const client = await pool.connect();

  try {
    // 1. Ver todos los tipos de página con sus rutas
    console.log('1. TIPOS DE PÁGINA ACTUALES:');
    console.log('='.repeat(80));

    const tiposPagina = await client.query(`
      SELECT
        id,
        codigo,
        nombre,
        ruta_patron,
        nivel,
        visible,
        publico
      FROM tipos_pagina
      ORDER BY codigo
    `);

    console.log(`Total tipos: ${tiposPagina.rows.length}\n`);

    for (const tipo of tiposPagina.rows) {
      console.log(`${tipo.codigo.padEnd(40)} | ${tipo.ruta_patron || 'sin ruta'}`);
    }

    // 2. Verificar rutas específicas que el usuario mencionó
    console.log('\n\n2. VERIFICANDO RUTAS SOLICITADAS:');
    console.log('='.repeat(80));

    const rutasSolicitadas = [
      { codigo: 'favoritos', ruta: '/favoritos', descripcion: 'Listar favoritos del usuario' },
      { codigo: 'favoritos_token', ruta: '/favoritos/:token', descripcion: 'Ver selección de favoritos compartida' },
      { codigo: 'propuestas', ruta: '/propuestas', descripcion: 'Listar propuestas del asesor' },
      { codigo: 'propuestas_token', ruta: '/propuestas/:token', descripcion: 'Ver propuesta compartida' },
      { codigo: 'ubicaciones', ruta: '/ubicaciones', descripcion: 'Listar todas las ubicaciones' },
      { codigo: 'tipos_propiedades', ruta: '/tipos-de-propiedades', descripcion: 'Listar todos los tipos de propiedades' },
      { codigo: 'listados_curados', ruta: '/listados-de-propiedades/:slug', descripcion: 'Listados curados con propiedades y contenido' },
    ];

    for (const ruta of rutasSolicitadas) {
      const existe = await client.query(`
        SELECT id, codigo, ruta_patron
        FROM tipos_pagina
        WHERE codigo = $1 OR ruta_patron = $2
      `, [ruta.codigo, ruta.ruta]);

      if (existe.rows.length > 0) {
        console.log(`✅ ${ruta.codigo.padEnd(25)} | ${ruta.ruta.padEnd(35)} | EXISTE`);
      } else {
        console.log(`❌ ${ruta.codigo.padEnd(25)} | ${ruta.ruta.padEnd(35)} | FALTA`);
      }
    }

    // 3. Ver rutas configuradas en tenants_rutas_config
    console.log('\n\n3. RUTAS CONFIGURADAS EN TENANT CLIC:');
    console.log('='.repeat(80));

    const rutasConfig = await client.query(`
      SELECT
        trc.prefijo,
        tp.codigo as tipo_codigo,
        tp.ruta_patron
      FROM tenants_rutas_config trc
      JOIN tenants t ON t.id = trc.tenant_id
      LEFT JOIN tipos_pagina tp ON tp.id = trc.tipo_directorio_id
      WHERE t.slug = 'clic'
      ORDER BY trc.prefijo
    `);

    if (rutasConfig.rows.length > 0) {
      for (const ruta of rutasConfig.rows) {
        console.log(`/${ruta.prefijo.padEnd(30)} -> ${ruta.tipo_codigo || 'NULL'}`);
      }
    } else {
      console.log('NO hay rutas configuradas');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkRutasFaltantes();
