import { Knex } from 'knex';

/**
 * Migración: Eliminar constraint único que impide agregar componentes
 *
 * El constraint idx_componentes_web_variante_unica impide tener múltiples
 * instancias del mismo componente con la misma variante en una página,
 * lo cual no tiene sentido. Por ejemplo, deberías poder tener 2 grids
 * de propiedades diferentes en la misma página.
 */
export async function up(knex: Knex): Promise<void> {
  console.log('🗑️  Eliminando constraint único restrictivo...');

  await knex.raw(`
    DROP INDEX IF EXISTS idx_componentes_web_variante_unica;
  `);

  console.log('✅ Constraint eliminado - Ahora puedes agregar múltiples componentes del mismo tipo');
}

export async function down(knex: Knex): Promise<void> {
  // Restaurar el constraint (aunque cause problemas)
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
}
