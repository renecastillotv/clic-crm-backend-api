import { Knex } from 'knex';

/**
 * Migración: Crear tabla seo_stats
 *
 * Almacena contenido semántico para SEO asociado a ubicaciones, tipos de propiedad, zonas, etc.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('seo_stats', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');

    // Contenido principal
    table.string('titulo', 255).notNullable();
    table.text('descripcion').nullable();
    table.text('contenido').nullable().comment('Contenido HTML enriquecido para SEO semántico');

    // Asociación
    table.string('tipo_asociacion', 50).notNullable().defaultTo('ubicacion')
      .comment('Tipo: ubicacion, tipo_propiedad, zona, barrio');
    table.string('asociacion_id', 255).nullable().comment('ID o slug de la asociación');
    table.string('asociacion_nombre', 255).nullable().comment('Nombre de referencia');

    // Categorización
    table.uuid('categoria_id').nullable().references('id').inTable('categorias_contenido').onDelete('SET NULL');
    table.jsonb('keywords').defaultTo('[]').comment('Array de keywords');

    // Configuración
    table.string('idioma', 10).defaultTo('es');
    table.boolean('publicado').defaultTo(true);
    table.boolean('destacado').defaultTo(false);
    table.integer('orden').defaultTo(0);

    // Traducciones
    table.jsonb('traducciones').nullable().comment('Traducciones: { en: { titulo, descripcion, contenido }, ... }');

    // Timestamps
    table.timestamps(true, true);
  });

  // Índices
  await knex.schema.alterTable('seo_stats', (table) => {
    table.index('tenant_id', 'idx_seo_stats_tenant');
    table.index('tipo_asociacion', 'idx_seo_stats_tipo');
    table.index('asociacion_id', 'idx_seo_stats_asociacion');
    table.index('publicado', 'idx_seo_stats_publicado');
    table.index('idioma', 'idx_seo_stats_idioma');
  });

  // Índice único para evitar duplicados
  await knex.raw(`
    CREATE UNIQUE INDEX idx_seo_stats_unique_asociacion
    ON seo_stats (tenant_id, tipo_asociacion, asociacion_id, idioma)
    WHERE asociacion_id IS NOT NULL
  `);

  console.log('✅ Migración 113: Tabla seo_stats creada');
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS idx_seo_stats_unique_asociacion');
  await knex.schema.dropTableIfExists('seo_stats');
  console.log('✅ Migración 113: Tabla seo_stats eliminada');
}
