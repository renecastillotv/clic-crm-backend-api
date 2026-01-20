import { Knex } from 'knex';

/**
 * Migración 111: Corregir constraint de componentes_web
 *
 * El constraint anterior requería XOR (exactamente uno de tipo_pagina_id o tenant_rutas_config_custom_id).
 * Pero los componentes globales (header, footer) necesitan que AMBOS sean NULL.
 *
 * Nuevo constraint:
 * - Ambos NULL: Componente global (header, footer)
 * - tipo_pagina_id definido: Componente de tipo de página estándar
 * - tenant_rutas_config_custom_id definido: Componente de ruta custom
 * - Ambos definidos: NO permitido
 */
export async function up(knex: Knex): Promise<void> {
  console.log('🔧 Corrigiendo constraint de componentes_web...\n');

  // 1. Eliminar constraint anterior
  await knex.raw(`
    ALTER TABLE componentes_web
    DROP CONSTRAINT IF EXISTS chk_componentes_web_tipo_or_custom
  `);
  console.log('  ✅ Constraint anterior eliminado');

  // 2. Agregar nuevo constraint que permite ambos NULL (para globales)
  await knex.raw(`
    ALTER TABLE componentes_web
    ADD CONSTRAINT chk_componentes_web_tipo_or_custom_or_global
    CHECK (
      -- Ambos NULL: componente global (header, footer)
      (tipo_pagina_id IS NULL AND tenant_rutas_config_custom_id IS NULL) OR
      -- Solo tipo_pagina_id: componente de página estándar
      (tipo_pagina_id IS NOT NULL AND tenant_rutas_config_custom_id IS NULL) OR
      -- Solo tenant_rutas_config_custom_id: componente de ruta custom
      (tipo_pagina_id IS NULL AND tenant_rutas_config_custom_id IS NOT NULL)
      -- Nota: ambos NOT NULL NO está permitido
    )
  `);
  console.log('  ✅ Nuevo constraint agregado (permite globales con ambos NULL)');

  console.log('\n✅ Migración 111 completada');
  console.log('   Ahora componentes_web permite:');
  console.log('   • Ambos NULL: componentes globales (header, footer)');
  console.log('   • Solo tipo_pagina_id: componentes de página estándar');
  console.log('   • Solo tenant_rutas_config_custom_id: componentes de ruta custom\n');
}

export async function down(knex: Knex): Promise<void> {
  console.log('⏪ Revirtiendo constraint de componentes_web...\n');

  // Eliminar constraint nuevo
  await knex.raw(`
    ALTER TABLE componentes_web
    DROP CONSTRAINT IF EXISTS chk_componentes_web_tipo_or_custom_or_global
  `);

  // Restaurar constraint anterior (XOR)
  await knex.raw(`
    ALTER TABLE componentes_web
    ADD CONSTRAINT chk_componentes_web_tipo_or_custom
    CHECK (
      (tipo_pagina_id IS NOT NULL AND tenant_rutas_config_custom_id IS NULL) OR
      (tipo_pagina_id IS NULL AND tenant_rutas_config_custom_id IS NOT NULL)
    )
  `);

  console.log('✅ Rollback completado\n');
}
