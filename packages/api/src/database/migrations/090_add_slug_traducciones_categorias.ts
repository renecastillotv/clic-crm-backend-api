import type { Knex } from 'knex';

/**
 * Migración 090: Agregar campo slug_traducciones a categorias_contenido
 *
 * Propósito:
 * - Permitir slugs traducidos para categorías en diferentes idiomas
 * - Mantener compatibilidad con el campo slug existente (español por defecto)
 *
 * Formato del campo slug_traducciones (JSONB):
 * {
 *   "en": "sellers",
 *   "pt": "vendedores",
 *   "fr": "vendeurs"
 * }
 */

export async function up(knex: Knex): Promise<void> {
  console.log('⬆️  Ejecutando migración 090: add_slug_traducciones_categorias');

  //  Agregar campo slug_traducciones a categorias_contenido
  await knex.schema.alterTable('categorias_contenido', (table) => {
    table.jsonb('slug_traducciones').defaultTo('{}');
  });

  console.log('✅ Campo slug_traducciones agregado a categorias_contenido');
}

export async function down(knex: Knex): Promise<void> {
  console.log('⬇️  Revirtiendo migración 090');

  // Eliminar campo slug_traducciones
  await knex.schema.alterTable('categorias_contenido', (table) => {
    table.dropColumn('slug_traducciones');
  });

  console.log('✅ Migración 090 revertida');
}
