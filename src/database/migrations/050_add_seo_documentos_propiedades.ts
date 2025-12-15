import { Knex } from 'knex';

/**
 * Migración: Agregar campos SEO y documentos a propiedades
 * 
 * Agrega campos necesarios para:
 * - SEO: meta_title, meta_description, keywords, tags
 * - Documentos: documentos (JSONB array)
 * - Campos adicionales de proyecto: tipologias, planes_pago, etapas, beneficios, garantias
 * - Relaciones: captador_id, cocaptadores_ids, desarrollador_id, correo_reporte
 * - Publicación: publicada
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('propiedades', (table) => {
    // SEO
    table.string('meta_title', 255).nullable().comment('Meta título para SEO');
    table.text('meta_description').nullable().comment('Meta descripción para SEO');
    table.jsonb('keywords').defaultTo('[]').comment('Keywords para SEO');
    table.jsonb('tags').defaultTo('[]').comment('Tags de la propiedad');
    
    // Documentos
    table.jsonb('documentos').defaultTo('[]').comment('Array de documentos relacionados');
    
    // Campos de proyecto
    table.jsonb('tipologias').defaultTo('[]').comment('Tipologías del proyecto');
    table.jsonb('planes_pago').nullable().comment('Planes de pago del proyecto');
    table.jsonb('etapas').defaultTo('[]').comment('Etapas del proyecto');
    table.jsonb('beneficios').defaultTo('[]').comment('Beneficios del proyecto');
    table.jsonb('garantias').defaultTo('[]').comment('Garantías del proyecto');
    
    // Relaciones adicionales
    table.uuid('captador_id').nullable().references('id').inTable('usuarios').onDelete('SET NULL')
      .comment('Usuario que captó la propiedad');
    table.jsonb('cocaptadores_ids').defaultTo('[]').comment('Array de IDs de co-captadores');
    table.uuid('desarrollador_id').nullable().references('id').inTable('contactos').onDelete('SET NULL')
      .comment('Desarrollador del proyecto');
    table.string('correo_reporte', 255).nullable().comment('Correo para reportes');
    
    // Publicación
    table.boolean('publicada').defaultTo(false).comment('Si la propiedad está publicada');
  });

  // Índices
  await knex.schema.alterTable('propiedades', (table) => {
    table.index('captador_id', 'idx_propiedades_captador');
    table.index('desarrollador_id', 'idx_propiedades_desarrollador');
    table.index('publicada', 'idx_propiedades_publicada');
  });

  console.log('✅ Migración 050: Campos SEO y documentos agregados a propiedades');
}

export async function down(knex: Knex): Promise<void> {
  // Eliminar índices
  await knex.raw(`DROP INDEX IF EXISTS idx_propiedades_captador;`);
  await knex.raw(`DROP INDEX IF EXISTS idx_propiedades_desarrollador;`);
  await knex.raw(`DROP INDEX IF EXISTS idx_propiedades_publicada;`);

  // Eliminar columnas
  await knex.schema.alterTable('propiedades', (table) => {
    // SEO
    table.dropColumn('meta_title');
    table.dropColumn('meta_description');
    table.dropColumn('keywords');
    table.dropColumn('tags');
    
    // Documentos
    table.dropColumn('documentos');
    
    // Campos de proyecto
    table.dropColumn('tipologias');
    table.dropColumn('planes_pago');
    table.dropColumn('etapas');
    table.dropColumn('beneficios');
    table.dropColumn('garantias');
    
    // Relaciones adicionales
    table.dropColumn('captador_id');
    table.dropColumn('cocaptadores_ids');
    table.dropColumn('desarrollador_id');
    table.dropColumn('correo_reporte');
    
    // Publicación
    table.dropColumn('publicada');
  });

  console.log('✅ Migración 050: Campos SEO y documentos eliminados de propiedades');
}













