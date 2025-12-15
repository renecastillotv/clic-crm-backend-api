import { Knex } from 'knex';

/**
 * Migración: Crear Tablas Mock para Datos Dinámicos
 * 
 * Esta migración crea tablas mock para desarrollo/debug que contendrán
 * datos de ejemplo para todos los tipos de datos dinámicos que la API puede devolver.
 * 
 * Estas tablas serán eliminadas cuando se implementen las tablas reales.
 */

export async function up(knex: Knex): Promise<void> {
  // Tabla de estadísticas (stats)
  await knex.schema.createTable('mock_stats', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.jsonb('data').notNullable().defaultTo('{}').comment('Datos de estadísticas en formato JSON');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index('tenant_id', 'idx_mock_stats_tenant');
  });

  // Tabla de categorías de contenidos (categorias_videos, categorias_articulos, categorias_testimonios)
  await knex.schema.createTable('mock_categorias_contenido', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('tipo_contenido', 50).notNullable().comment('Tipo: videos, articulos, testimonios');
    table.string('nombre').notNullable();
    table.string('slug').notNullable();
    table.text('descripcion').nullable();
    table.string('icono', 10).nullable().comment('Emoji o código de icono');
    table.integer('numero_elementos').defaultTo(0).comment('Número de elementos en esta categoría');
    table.jsonb('metadata').defaultTo('{}').comment('Metadata adicional (color, orden, etc.)');
    table.jsonb('traducciones').defaultTo('{}').comment('Traducciones {es: {...}, en: {...}}');
    table.boolean('activa').defaultTo(true);
    table.integer('orden').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index(['tenant_id', 'tipo_contenido'], 'idx_mock_categorias_tenant_tipo');
    table.index(['tenant_id', 'activa'], 'idx_mock_categorias_tenant_activa');
  });

  // Tabla de propiedades (ya existe propiedades, pero creamos mock para desarrollo)
  // Nota: Usaremos la tabla propiedades real si existe, sino usaremos mock

  // Tabla de carruseles de propiedades con configuraciones
  await knex.schema.createTable('mock_carruseles_propiedades', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('nombre').notNullable().comment('Nombre del carrusel (ej: "Perfectos para Airbnb")');
    table.string('slug').notNullable();
    table.jsonb('configuracion').notNullable().defaultTo('{}').comment('Configuración de filtros y criterios');
    table.jsonb('propiedades_ids').defaultTo('[]').comment('IDs de propiedades en este carrusel');
    table.boolean('activo').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index(['tenant_id', 'slug'], 'idx_mock_carruseles_tenant_slug');
  });

  // Tabla de textos sueltos (bloques HTML, descripciones)
  await knex.schema.createTable('mock_textos_sueltos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('clave').notNullable().comment('Clave única para identificar el texto');
    table.string('titulo').nullable();
    table.text('contenido_html').notNullable().comment('Contenido HTML del bloque');
    table.string('tipo').defaultTo('text').comment('Tipo: text, html, markdown');
    table.jsonb('traducciones').defaultTo('{}').comment('Traducciones del contenido');
    table.boolean('activo').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.unique(['tenant_id', 'clave'], 'idx_mock_textos_tenant_clave');
  });

  // Tabla de videos (contenido resumido y single)
  await knex.schema.createTable('mock_videos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('titulo').notNullable();
    table.text('descripcion').nullable();
    table.string('url_video').notNullable().comment('URL del video (YouTube, Vimeo, etc.)');
    table.string('thumbnail_url').nullable();
    table.string('duracion').nullable().comment('Duración en formato MM:SS');
    table.uuid('categoria_id').nullable().references('id').inTable('mock_categorias_contenido').onDelete('SET NULL');
    table.jsonb('metadata').defaultTo('{}').comment('Metadata adicional');
    table.jsonb('traducciones').defaultTo('{}');
    table.boolean('activo').defaultTo(true);
    table.integer('vistas').defaultTo(0);
    table.timestamp('fecha_publicacion').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index(['tenant_id', 'activo'], 'idx_mock_videos_tenant_activo');
    table.index('categoria_id', 'idx_mock_videos_categoria');
  });

  // Tabla de artículos (contenido resumido y single)
  await knex.schema.createTable('mock_articulos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('titulo').notNullable();
    table.text('resumen').nullable();
    table.text('contenido').notNullable();
    table.string('autor').nullable();
    table.string('thumbnail_url').nullable();
    table.uuid('categoria_id').nullable().references('id').inTable('mock_categorias_contenido').onDelete('SET NULL');
    table.jsonb('tags').defaultTo('[]');
    table.jsonb('metadata').defaultTo('{}');
    table.jsonb('traducciones').defaultTo('{}');
    table.boolean('activo').defaultTo(true);
    table.boolean('publicado').defaultTo(true);
    table.integer('vistas').defaultTo(0);
    table.timestamp('fecha_publicacion').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index(['tenant_id', 'activo'], 'idx_mock_articulos_tenant_activo');
    table.index('categoria_id', 'idx_mock_articulos_categoria');
  });

  // Tabla de testimonios (contenido resumido y single)
  await knex.schema.createTable('mock_testimonios', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('nombre_cliente').notNullable();
    table.string('ubicacion').nullable();
    table.text('testimonio').notNullable();
    table.integer('calificacion').defaultTo(5).comment('Calificación de 1 a 5');
    table.string('foto_url').nullable();
    table.string('tipo_propiedad').nullable().comment('Ej: Apartamento, Casa, Local');
    table.uuid('categoria_id').nullable().references('id').inTable('mock_categorias_contenido').onDelete('SET NULL');
    table.jsonb('metadata').defaultTo('{}');
    table.jsonb('traducciones').defaultTo('{}');
    table.boolean('activo').defaultTo(true);
    table.boolean('destacado').defaultTo(false);
    table.timestamp('fecha').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index(['tenant_id', 'activo'], 'idx_mock_testimonios_tenant_activo');
    table.index('categoria_id', 'idx_mock_testimonios_categoria');
  });

  // Tabla de FAQs (contenido resumido y single)
  await knex.schema.createTable('mock_faqs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('pregunta').notNullable();
    table.text('respuesta').notNullable();
    table.string('categoria').nullable();
    table.integer('orden').defaultTo(0);
    table.jsonb('traducciones').defaultTo('{}');
    table.boolean('activo').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index(['tenant_id', 'activo'], 'idx_mock_faqs_tenant_activo');
    table.index(['tenant_id', 'categoria'], 'idx_mock_faqs_tenant_categoria');
  });

  // Tabla de asesores (listado y single)
  await knex.schema.createTable('mock_asesores', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('nombre').notNullable();
    table.string('apellido').notNullable();
    table.string('cargo').nullable().comment('Ej: Agente Inmobiliario, Director de Ventas');
    table.text('biografia').nullable();
    table.string('email').nullable();
    table.string('telefono').nullable();
    table.string('foto_url').nullable();
    table.jsonb('redes_sociales').defaultTo('{}').comment('LinkedIn, Instagram, etc.');
    table.jsonb('especialidades').defaultTo('[]').comment('Array de especialidades');
    table.integer('experiencia_anos').defaultTo(0);
    table.integer('propiedades_vendidas').defaultTo(0);
    table.jsonb('logros').defaultTo('[]');
    table.jsonb('metadata').defaultTo('{}');
    table.jsonb('traducciones').defaultTo('{}');
    table.boolean('activo').defaultTo(true);
    table.boolean('destacado').defaultTo(false);
    table.integer('orden').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index(['tenant_id', 'activo'], 'idx_mock_asesores_tenant_activo');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('mock_asesores');
  await knex.schema.dropTableIfExists('mock_faqs');
  await knex.schema.dropTableIfExists('mock_testimonios');
  await knex.schema.dropTableIfExists('mock_articulos');
  await knex.schema.dropTableIfExists('mock_videos');
  await knex.schema.dropTableIfExists('mock_textos_sueltos');
  await knex.schema.dropTableIfExists('mock_carruseles_propiedades');
  await knex.schema.dropTableIfExists('mock_categorias_contenido');
  await knex.schema.dropTableIfExists('mock_stats');
}

