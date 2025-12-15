import type { Knex } from 'knex';

/**
 * Migración 098: Agregar campo slug_traducciones a tablas de contenido
 *
 * Propósito:
 * - Permitir URLs traducidas para contenidos en diferentes idiomas
 * - Ej: /en/testimonials/sellers/luxury-home-experience (en lugar de /testimonios/vendedores/experiencia-casa-lujo)
 *
 * Tablas afectadas:
 * - videos
 * - articulos
 * - testimonios
 * - faqs
 *
 * Formato del campo slug_traducciones (JSONB):
 * {
 *   "en": "luxury-home-experience",
 *   "fr": "experience-maison-luxe",
 *   "pt": "experiencia-casa-luxo"
 * }
 *
 * Lógica de búsqueda:
 * 1. Si idioma es español ('es'): buscar directamente en campo `slug`
 * 2. Si idioma NO es español: buscar en slug_traducciones[idioma] con fallback a slug
 */

const TABLES = ['videos', 'articulos', 'testimonios', 'faqs'];

export async function up(knex: Knex): Promise<void> {
  console.log('⬆️  Ejecutando migración 098: add_slug_traducciones_contenidos');

  for (const table of TABLES) {
    const hasColumn = await knex.schema.hasColumn(table, 'slug_traducciones');

    if (!hasColumn) {
      await knex.schema.alterTable(table, (t) => {
        t.jsonb('slug_traducciones').defaultTo('{}');
      });
      console.log(`✅ Campo slug_traducciones agregado a ${table}`);
    } else {
      console.log(`ℹ️  Campo slug_traducciones ya existe en ${table}`);
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  console.log('⬇️  Revirtiendo migración 098');

  for (const table of TABLES) {
    const hasColumn = await knex.schema.hasColumn(table, 'slug_traducciones');

    if (hasColumn) {
      await knex.schema.alterTable(table, (t) => {
        t.dropColumn('slug_traducciones');
      });
      console.log(`✅ Campo slug_traducciones eliminado de ${table}`);
    }
  }
}
