import { Knex } from 'knex';

/**
 * Migración 107: Agregar columna campos_override a tenant_extension_preferencias
 *
 * Esta columna permite que cada tenant personalice los campos de una extensión
 * sin modificar la extensión de sistema original.
 *
 * Por ejemplo: Un tenant puede agregar opciones personalizadas al campo "fuente_lead"
 * de la extensión "lead" sin afectar a otros tenants.
 */
export async function up(knex: Knex): Promise<void> {
  // Verificar si la columna ya existe
  const hasColumn = await knex.schema.hasColumn('tenant_extension_preferencias', 'campos_override');

  if (!hasColumn) {
    await knex.schema.alterTable('tenant_extension_preferencias', (table) => {
      table.jsonb('campos_override').nullable().comment('Schema de campos personalizado por el tenant');
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
    console.log('✅ Agregada columna campos_override a tenant_extension_preferencias');
  } else {
    console.log('⚠️ La columna campos_override ya existe en tenant_extension_preferencias');
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('tenant_extension_preferencias', 'campos_override');

  if (hasColumn) {
    await knex.schema.alterTable('tenant_extension_preferencias', (table) => {
      table.dropColumn('campos_override');
      table.dropColumn('updated_at');
    });
  }
}
