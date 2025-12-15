/**
 * Migration: Remove duplicate slug_translations column
 *
 * The propiedades table has both `slug_traducciones` and `slug_translations`.
 * We keep `slug_traducciones` for consistency with Spanish naming conventions.
 *
 * This migration:
 * 1. Copies any data from slug_translations to slug_traducciones (if slug_traducciones is empty)
 * 2. Drops the slug_translations column
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Check if the column exists before trying to operate on it
  const hasColumn = await knex.schema.hasColumn('propiedades', 'slug_translations');

  if (!hasColumn) {
    console.log('✅ slug_translations column does not exist, nothing to do');
    return;
  }

  // First, copy any data from slug_translations to slug_traducciones where slug_traducciones is empty
  await knex.raw(`
    UPDATE propiedades
    SET slug_traducciones = slug_translations
    WHERE (slug_traducciones IS NULL OR slug_traducciones = '{}')
      AND slug_translations IS NOT NULL
      AND slug_translations != '{}'
  `);

  // Now drop the duplicate column
  await knex.schema.alterTable('propiedades', (table) => {
    table.dropColumn('slug_translations');
  });

  console.log('✅ Removed duplicate slug_translations column from propiedades');
}

export async function down(knex: Knex): Promise<void> {
  // Re-create the column if needed
  await knex.schema.alterTable('propiedades', (table) => {
    table.jsonb('slug_translations').nullable();
  });

  // Copy data back
  await knex.raw(`
    UPDATE propiedades
    SET slug_translations = slug_traducciones
    WHERE slug_traducciones IS NOT NULL
  `);

  console.log('✅ Recreated slug_translations column');
}
