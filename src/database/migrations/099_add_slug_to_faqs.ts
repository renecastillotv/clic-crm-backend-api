import type { Knex } from 'knex';

/**
 * Migración 099: Agregar campo slug a faqs
 *
 * Propósito:
 * - Permitir acceso a FAQs por URL amigable (slug) además de por ID
 * - Mantener consistencia con otras tablas de contenido (videos, articulos, testimonios)
 * - Habilitar URLs traducidas junto con slug_traducciones
 */

export async function up(knex: Knex): Promise<void> {
  console.log('⬆️  Ejecutando migración 099: add_slug_to_faqs');

  const hasColumn = await knex.schema.hasColumn('faqs', 'slug');

  if (!hasColumn) {
    await knex.schema.alterTable('faqs', (table) => {
      table.string('slug', 255);
    });
    console.log('✅ Campo slug agregado a faqs');
  } else {
    console.log('ℹ️  Campo slug ya existe en faqs');
  }
}

export async function down(knex: Knex): Promise<void> {
  console.log('⬇️  Revirtiendo migración 099');

  const hasColumn = await knex.schema.hasColumn('faqs', 'slug');

  if (hasColumn) {
    await knex.schema.alterTable('faqs', (table) => {
      table.dropColumn('slug');
    });
    console.log('✅ Campo slug eliminado de faqs');
  }
}
