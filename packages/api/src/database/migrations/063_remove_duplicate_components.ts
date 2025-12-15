import { Knex } from 'knex';

/**
 * Migración 063 - Eliminar componentes duplicados
 *
 * Elimina componentes duplicados manteniendo solo el más reciente
 * basado en tenant_id, scope, tipo, variante, tipo_pagina
 */
export async function up(knex: Knex): Promise<void> {
  console.log('🔄 Eliminando componentes duplicados...\n');

  // Eliminar duplicados manteniendo el más reciente (mayor created_at)
  const result = await knex.raw(`
    DELETE FROM componentes_web
    WHERE id IN (
      SELECT c1.id
      FROM componentes_web c1
      INNER JOIN (
        SELECT
          tenant_id,
          scope,
          tipo,
          variante,
          COALESCE(tipo_pagina, '') as tipo_pagina,
          COALESCE(pagina_id::text, '') as pagina_id,
          MAX(created_at) as max_created
        FROM componentes_web
        GROUP BY tenant_id, scope, tipo, variante, COALESCE(tipo_pagina, ''), COALESCE(pagina_id::text, '')
        HAVING COUNT(*) > 1
      ) c2 ON
        c1.tenant_id = c2.tenant_id
        AND c1.scope = c2.scope
        AND c1.tipo = c2.tipo
        AND c1.variante = c2.variante
        AND COALESCE(c1.tipo_pagina, '') = c2.tipo_pagina
        AND COALESCE(c1.pagina_id::text, '') = c2.pagina_id
        AND c1.created_at < c2.max_created
    )
  `);

  const deletedCount = result.rowCount || 0;
  console.log(`✅ Eliminados ${deletedCount} componentes duplicados\n`);

  // Mostrar resumen por tenant
  console.log('📊 Resumen de componentes por tenant:\n');
  const summary = await knex('componentes_web')
    .select('tenant_id')
    .count('* as count')
    .groupBy('tenant_id');

  for (const row of summary) {
    // Obtener nombre del tenant
    const tenant = await knex('tenants')
      .select('nombre')
      .where('id', row.tenant_id)
      .first();

    console.log(`   ${tenant?.nombre || row.tenant_id}: ${row.count} componentes`);
  }

  console.log('\n✅ Limpieza completada');
}

export async function down(knex: Knex): Promise<void> {
  console.log('⚠️  Esta migración no se puede revertir');
  console.log('   Los componentes eliminados no se pueden recuperar');
}
