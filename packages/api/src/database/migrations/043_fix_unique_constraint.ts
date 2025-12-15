import { Knex } from 'knex';

/**
 * Migración - Fix unique constraint para componentes_web
 *
 * El constraint actual no incluye tipo_pagina, lo cual impide tener
 * el mismo tipo+variante para diferentes tipos de página.
 *
 * Cambiamos el constraint de:
 *   (tenant_id, tipo, variante, scope, pagina_id)
 * a:
 *   (tenant_id, tipo, variante, scope, tipo_pagina, pagina_id)
 */
export async function up(knex: Knex): Promise<void> {
  // Eliminar constraint actual
  await knex.raw(`
    DROP INDEX IF EXISTS idx_componentes_web_variante_unica;
  `);

  // Crear nuevo constraint que incluye tipo_pagina
  await knex.raw(`
    CREATE UNIQUE INDEX idx_componentes_web_variante_unica
    ON componentes_web(
      tenant_id,
      tipo,
      variante,
      scope,
      COALESCE(tipo_pagina, ''),
      COALESCE(pagina_id, '00000000-0000-0000-0000-000000000000')
    );
  `);

  console.log('✅ Constraint único actualizado para incluir tipo_pagina');
}

export async function down(knex: Knex): Promise<void> {
  // Restaurar constraint original
  await knex.raw(`
    DROP INDEX IF EXISTS idx_componentes_web_variante_unica;
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX idx_componentes_web_variante_unica
    ON componentes_web(tenant_id, tipo, variante, scope, COALESCE(pagina_id, '00000000-0000-0000-0000-000000000000'));
  `);
}
