import type { Knex } from 'knex';

/**
 * Migración 093: Agregar campo slug_traducciones a propiedades
 *
 * Propósito:
 * - Permitir slugs traducidos para propiedades en diferentes idiomas
 * - Mantener compatibilidad con el campo slug existente (español por defecto)
 * - Mejorar la búsqueda de propiedades single por idioma
 *
 * Formato del campo slug_traducciones (JSONB):
 * {
 *   "en": "luxury-apartment-downtown",
 *   "pt": "apartamento-luxo-centro",
 *   "fr": "appartement-luxe-centre-ville"
 * }
 *
 * Lógica de búsqueda:
 * 1. Si idioma es español ('es'): buscar directamente en campo `slug`
 * 2. Si idioma NO es español: buscar en slug_traducciones[idioma]
 * 3. Si no encuentra: usar `slug` como fallback
 */

export async function up(knex: Knex): Promise<void> {
  console.log('⬆️  Ejecutando migración 093: add_slug_traducciones_propiedades');

  // Agregar campo slug_traducciones a propiedades
  await knex.schema.alterTable('propiedades', (table) => {
    table.jsonb('slug_traducciones').defaultTo('{}');
  });

  console.log('✅ Campo slug_traducciones agregado a propiedades');
}

export async function down(knex: Knex): Promise<void> {
  console.log('⬇️  Revirtiendo migración 093');

  // Eliminar campo slug_traducciones
  await knex.schema.alterTable('propiedades', (table) => {
    table.dropColumn('slug_traducciones');
  });

  console.log('✅ Migración 093 revertida');
}
