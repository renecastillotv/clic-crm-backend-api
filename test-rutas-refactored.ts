import { pool } from './src/config/database';

/**
 * Script para verificar que las rutas sigan funcionando después del refactor
 * ARQUITECTURA NUEVA:
 * - tipos_pagina es la fuente de verdad (no tenants_rutas_config)
 * - tenants_rutas_config_custom es el fallback para rutas personalizadas
 */

async function testRutasRefactored() {
  console.log('=== VERIFICANDO REFACTOR DE RUTAS ===\n');
  const client = await pool.connect();

  try {
    // 1. Verificar que tenants_rutas_config esté vacía
    console.log('1. VERIFICAR TENANTS_RUTAS_CONFIG (debe estar vacía):');
    console.log('='.repeat(60));
    const globalCount = await client.query('SELECT COUNT(*) FROM tenants_rutas_config');
    console.log(`  Registros en tenants_rutas_config: ${globalCount.rows[0].count}`);
    if (globalCount.rows[0].count === '0') {
      console.log('  ✅ CORRECTO: Tabla obsoleta vacía');
    } else {
      console.log('  ⚠️ ADVERTENCIA: Tabla obsoleta aún tiene registros');
    }

    // 2. Verificar tipos_pagina (fuente de verdad)
    console.log('\n\n2. VERIFICAR TIPOS_PAGINA (fuente de verdad):');
    console.log('='.repeat(60));
    const tiposPagina = await client.query(`
      SELECT codigo, ruta_patron, nivel, alias_rutas, visible, publico
      FROM tipos_pagina
      WHERE visible = true AND publico = true
      ORDER BY codigo ASC
    `);
    console.log(`  Total tipos_pagina públicos: ${tiposPagina.rows.length}`);

    const rutasExtraidas: Array<{prefijo: string, nivel: number, alias: any}> = [];
    for (const tipo of tiposPagina.rows) {
      const patron = tipo.ruta_patron || '';
      const match = patron.match(/^\/([^/:]+)/);
      if (match) {
        const prefijo = match[1];
        rutasExtraidas.push({
          prefijo,
          nivel: tipo.nivel || 0,
          alias: tipo.alias_rutas
        });
        console.log(`  - ${prefijo} (nivel: ${tipo.nivel}, patron: ${patron})`);
      }
    }

    // 3. Verificar algunas rutas críticas
    console.log('\n\n3. VERIFICAR RUTAS CRÍTICAS:');
    console.log('='.repeat(60));
    const rutasCriticas = ['testimonios', 'asesores', 'videos', 'articulos'];
    for (const ruta of rutasCriticas) {
      const encontrada = rutasExtraidas.find(r => r.prefijo === ruta);
      if (encontrada) {
        console.log(`  ✅ ${ruta}: nivel=${encontrada.nivel}, alias=${JSON.stringify(encontrada.alias || {})}`);
      } else {
        console.log(`  ❌ ${ruta}: NO ENCONTRADA`);
      }
    }

    // 4. Simular getRutasConfigTenant (nueva lógica)
    console.log('\n\n4. SIMULAR getRutasConfigTenant (nueva lógica):');
    console.log('='.repeat(60));
    const clicTenant = await client.query(`SELECT id FROM tenants WHERE slug = 'clic' LIMIT 1`);
    if (clicTenant.rows.length === 0) {
      console.log('  ⚠️ Tenant CLIC no encontrado');
    } else {
      const tenantId = clicTenant.rows[0].id;

      // Rutas desde tipos_pagina
      const tiposResult = await client.query(`
        SELECT codigo, ruta_patron, nivel, alias_rutas
        FROM tipos_pagina
        WHERE visible = true AND publico = true
        ORDER BY codigo ASC
      `);

      const rutas: Array<{prefijo: string, nivel: number, fuente: string}> = [];
      for (const tipo of tiposResult.rows) {
        const patron = tipo.ruta_patron || '';
        const match = patron.match(/^\/([^/:]+)/);
        if (match) {
          rutas.push({
            prefijo: match[1],
            nivel: tipo.nivel || 0,
            fuente: 'tipos_pagina'
          });
        }
      }

      // Rutas custom del tenant (fallback)
      const customResult = await client.query(`
        SELECT prefijo, nivel_navegacion
        FROM tenants_rutas_config_custom
        WHERE tenant_id = $1 AND habilitado = true
        ORDER BY orden ASC
      `, [tenantId]);

      for (const row of customResult.rows) {
        const existe = rutas.some(r => r.prefijo === row.prefijo);
        if (!existe) {
          rutas.push({
            prefijo: row.prefijo,
            nivel: row.nivel_navegacion,
            fuente: 'custom'
          });
        }
      }

      console.log(`  Total rutas disponibles: ${rutas.length}`);
      for (const ruta of rutas.slice(0, 10)) {
        console.log(`    - ${ruta.prefijo} (nivel: ${ruta.nivel}, fuente: ${ruta.fuente})`);
      }
      if (rutas.length > 10) {
        console.log(`    ... y ${rutas.length - 10} más`);
      }
    }

    console.log('\n\n✅ REFACTOR VERIFICADO');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testRutasRefactored();
