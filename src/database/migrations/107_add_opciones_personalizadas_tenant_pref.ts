import { Knex } from 'knex';

/**
 * Migración 107: Agregar opciones_personalizadas a tenant_extension_preferencias
 *
 * Esta migración agrega soporte para que los tenants puedan personalizar
 * las opciones de campos select en extensiones de sistema.
 *
 * Ejemplo de uso:
 * - La extensión "Lead" tiene un campo "fuente" con opciones predeterminadas
 * - Un tenant puede agregar sus propias fuentes de leads
 * - Las opciones personalizadas se guardan en esta columna como JSONB
 *
 * Estructura del campo opciones_personalizadas:
 * {
 *   "fuente": ["Web", "Referido", "Facebook", "Instagram", "Mi fuente custom"],
 *   "otro_campo": ["opcion1", "opcion2"]
 * }
 */
export async function up(knex: Knex): Promise<void> {
  // Agregar columna opciones_personalizadas
  await knex.schema.alterTable('tenant_extension_preferencias', (table) => {
    table.jsonb('opciones_personalizadas').nullable().defaultTo('{}');
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  console.log('✅ Columna opciones_personalizadas agregada a tenant_extension_preferencias');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('tenant_extension_preferencias', (table) => {
    table.dropColumn('opciones_personalizadas');
    table.dropColumn('updated_at');
  });
}
