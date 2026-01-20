/**
 * Script de prueba para inicializar componentes_web de un tenant
 */

import { initComponentesWebTenant, verificarComponentesTenant } from '../services/tenantInitService.js';
import { pool, closePool } from '../config/database.js';

async function main() {
  // ID del tenant "demo" o cualquier otro sin componentes
  const tenantSlug = process.argv[2] || 'demo';

  console.log(`\n${'='.repeat(60)}`);
  console.log(`PRUEBA DE INICIALIZACIÓN DE TENANT: ${tenantSlug}`);
  console.log(`${'='.repeat(60)}\n`);

  const client = await pool.connect();

  try {
    // 1. Buscar el tenant
    const tenantResult = await client.query(
      `SELECT id, nombre, slug FROM tenants WHERE slug = $1`,
      [tenantSlug]
    );

    if (tenantResult.rows.length === 0) {
      console.log(`❌ Tenant "${tenantSlug}" no encontrado`);
      return;
    }

    const tenant = tenantResult.rows[0];
    console.log(`✅ Tenant encontrado: ${tenant.nombre} (${tenant.id})`);

    // 2. Verificar estado actual
    console.log(`\n📋 Verificando estado actual...`);
    const estadoAntes = await verificarComponentesTenant(tenant.id);
    console.log(`   - Componentes existentes: ${estadoAntes.existentes}`);
    console.log(`   - Completo: ${estadoAntes.completo}`);
    console.log(`   - Faltantes: ${estadoAntes.faltantes.length}`);

    if (estadoAntes.faltantes.length > 0 && estadoAntes.faltantes.length <= 10) {
      console.log(`   Primeros faltantes:`);
      for (const f of estadoAntes.faltantes.slice(0, 10)) {
        console.log(`     - ${f.tipoPagina}: ${f.componente}`);
      }
    }

    // 3. Inicializar componentes
    console.log(`\n🔧 Inicializando componentes...`);
    const resultado = await initComponentesWebTenant(tenant.id);

    console.log(`\n📊 Resultado:`);
    console.log(`   - Creados: ${resultado.created}`);
    console.log(`   - Omitidos: ${resultado.skipped}`);

    // 4. Verificar estado después
    console.log(`\n📋 Verificando estado después...`);
    const estadoDespues = await verificarComponentesTenant(tenant.id);
    console.log(`   - Componentes existentes: ${estadoDespues.existentes}`);
    console.log(`   - Completo: ${estadoDespues.completo}`);
    console.log(`   - Faltantes: ${estadoDespues.faltantes.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await closePool();
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('PRUEBA COMPLETADA');
  console.log(`${'='.repeat(60)}\n`);
}

main();
