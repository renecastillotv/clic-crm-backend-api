import type { Knex } from 'knex';

/**
 * Migración 097: Agregar campo traducciones a propiedades
 *
 * Propósito:
 * - Permitir traducciones de título, descripción y otros campos de propiedades
 * - Complementa el campo slug_traducciones existente
 * - Mantiene consistencia con otras tablas (articulos, videos, testimonios, faqs)
 *
 * Formato del campo traducciones (JSONB):
 * {
 *   "en": {
 *     "titulo": "Luxury Apartment in Downtown",
 *     "descripcion": "Beautiful apartment with ocean views...",
 *     "descripcion_corta": "Luxury apartment with views"
 *   },
 *   "fr": {
 *     "titulo": "Appartement de Luxe au Centre-Ville",
 *     "descripcion": "Bel appartement avec vue sur l'océan...",
 *     "descripcion_corta": "Appartement de luxe avec vue"
 *   }
 * }
 *
 * Lógica de resolución:
 * 1. Si idioma es español ('es'): usar campos base (titulo, descripcion)
 * 2. Si idioma NO es español: usar traducciones[idioma] con fallback a español
 */

export async function up(knex: Knex): Promise<void> {
  console.log('⬆️  Ejecutando migración 097: add_traducciones_propiedades');

  // Verificar si la columna ya existe
  const hasColumn = await knex.schema.hasColumn('propiedades', 'traducciones');

  if (!hasColumn) {
    await knex.schema.alterTable('propiedades', (table) => {
      table.jsonb('traducciones').defaultTo('{}');
    });
    console.log('✅ Campo traducciones agregado a propiedades');
  } else {
    console.log('ℹ️  Campo traducciones ya existe en propiedades');
  }
}

export async function down(knex: Knex): Promise<void> {
  console.log('⬇️  Revirtiendo migración 097');

  const hasColumn = await knex.schema.hasColumn('propiedades', 'traducciones');

  if (hasColumn) {
    await knex.schema.alterTable('propiedades', (table) => {
      table.dropColumn('traducciones');
    });
    console.log('✅ Campo traducciones eliminado de propiedades');
  }
}
