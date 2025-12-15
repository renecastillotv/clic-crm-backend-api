import { Knex } from 'knex';

/**
 * Migración 006 - Agregar clerk_id a usuarios
 *
 * Agrega el campo clerk_id para vincular con Clerk Auth
 * El password_hash será NULL para usuarios OAuth
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('usuarios', (table) => {
    table.string('clerk_id', 255).nullable().unique().comment('ID único de Clerk');
    table.string('avatar_url', 500).nullable().comment('URL del avatar');
    table.string('telefono', 20).nullable().comment('Teléfono del usuario');

    table.index('clerk_id', 'idx_usuarios_clerk_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('usuarios', (table) => {
    table.dropIndex('clerk_id', 'idx_usuarios_clerk_id');
    table.dropColumn('clerk_id');
    table.dropColumn('avatar_url');
    table.dropColumn('telefono');
  });
}
