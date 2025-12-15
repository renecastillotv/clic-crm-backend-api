import { Knex } from 'knex';

/**
 * Migración - Páginas Web para Tenants
 * 
 * Crea la estructura para gestionar páginas web de cada tenant
 */
export async function up(knex: Knex): Promise<void> {
  // Tabla de tipos de página
  await knex.schema.createTable('tipos_pagina', (table) => {
    table.string('codigo', 50).primary().comment('Código único del tipo de página');
    table.string('nombre', 100).notNullable().comment('Nombre del tipo de página');
    table.text('descripcion').nullable();
    table.boolean('es_estandar').defaultTo(true).comment('Si es una página estándar del sistema');
    table.boolean('requiere_slug').defaultTo(true).comment('Si requiere slug único');
    table.jsonb('configuracion').defaultTo('{}').comment('Configuración específica del tipo');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Tabla de páginas web
  await knex.schema.createTable('paginas_web', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('tipo_pagina', 50).notNullable().references('codigo').inTable('tipos_pagina');
    table.string('variante', 50).defaultTo('default').comment('Variante del layout (default, variant1, variant2, etc.)');
    table.string('titulo').notNullable().comment('Título de la página');
    table.string('slug').notNullable().comment('Slug único para la URL');
    table.text('descripcion').nullable().comment('Descripción/Meta descripción');
    table.jsonb('contenido').defaultTo('{}').comment('Contenido de la página (estructura flexible)');
    table.jsonb('meta').defaultTo('{}').comment('Meta tags y SEO');
    table.boolean('publica').defaultTo(true).comment('Si la página es pública');
    table.boolean('activa').defaultTo(true);
    table.integer('orden').defaultTo(0).comment('Orden de visualización');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Índices
    table.unique(['tenant_id', 'slug'], 'idx_paginas_web_tenant_slug');
    table.index('tenant_id', 'idx_paginas_web_tenant');
    table.index('tipo_pagina', 'idx_paginas_web_tipo');
    table.index(['tipo_pagina', 'variante'], 'idx_paginas_web_tipo_variante');
    table.index('activa', 'idx_paginas_web_activa');
  });

  // Insertar tipos de página estándar
  await knex('tipos_pagina').insert([
    {
      codigo: 'homepage',
      nombre: 'Homepage',
      descripcion: 'Página principal del sitio web',
      es_estandar: true,
      requiere_slug: false,
      configuracion: JSON.stringify({ default_slug: '/' }),
    },
    {
      codigo: 'listados_propiedades',
      nombre: 'Listados de Propiedades',
      descripcion: 'Página que muestra el listado de todas las propiedades',
      es_estandar: true,
      requiere_slug: true,
      configuracion: JSON.stringify({ default_slug: 'propiedades' }),
    },
    {
      codigo: 'single_property',
      nombre: 'Propiedad Individual',
      descripcion: 'Página para mostrar una propiedad específica',
      es_estandar: true,
      requiere_slug: true,
      configuracion: JSON.stringify({ dynamic: true, requires_property_id: true }),
    },
    {
      codigo: 'blog',
      nombre: 'Blog',
      descripcion: 'Página de blog con listado de artículos',
      es_estandar: true,
      requiere_slug: true,
      configuracion: JSON.stringify({ default_slug: 'blog' }),
    },
    {
      codigo: 'contacto',
      nombre: 'Contacto',
      descripcion: 'Página de contacto',
      es_estandar: true,
      requiere_slug: true,
      configuracion: JSON.stringify({ default_slug: 'contacto' }),
    },
    {
      codigo: 'landing_page',
      nombre: 'Landing Page',
      descripcion: 'Página de aterrizaje personalizada',
      es_estandar: true,
      requiere_slug: true,
      configuracion: JSON.stringify({ default_slug: 'landing' }),
    },
    {
      codigo: 'politicas_privacidad',
      nombre: 'Políticas de Privacidad',
      descripcion: 'Página de políticas de privacidad',
      es_estandar: true,
      requiere_slug: true,
      configuracion: JSON.stringify({ default_slug: 'politicas-privacidad' }),
    },
    {
      codigo: 'terminos_condiciones',
      nombre: 'Términos y Condiciones',
      descripcion: 'Página de términos y condiciones',
      es_estandar: true,
      requiere_slug: true,
      configuracion: JSON.stringify({ default_slug: 'terminos-condiciones' }),
    },
    {
      codigo: 'custom',
      nombre: 'Página Personalizada',
      descripcion: 'Página personalizada creada por el usuario',
      es_estandar: false,
      requiere_slug: true,
      configuracion: JSON.stringify({}),
    },
    {
      codigo: 'video_category',
      nombre: 'Categoría de Videos',
      descripcion: 'Página DINÁMICA que muestra videos de cualquier categoría. Se reutiliza para todas las categorías según la URL (/videos/[categoria])',
      es_estandar: true,
      requiere_slug: false, // No requiere slug porque es dinámica
      configuracion: JSON.stringify({ 
        dynamic: true, 
        is_template: true,
        route_pattern: '/videos/:categoria',
        requires_category_slug: true,
        default_slug: 'videos-categoria' // Slug interno para identificar la plantilla
      }),
    },
    {
      codigo: 'video_single',
      nombre: 'Video Individual',
      descripcion: 'Página DINÁMICA que muestra cualquier video. Se reutiliza para todos los videos según la URL (/videos/[categoria]/[video])',
      es_estandar: true,
      requiere_slug: false, // No requiere slug porque es dinámica
      configuracion: JSON.stringify({ 
        dynamic: true,
        is_template: true,
        route_pattern: '/videos/:categoria/:video',
        requires_category_slug: true,
        requires_video_slug: true,
        default_slug: 'video-single', // Slug interno para identificar la plantilla
        protected: true // No se puede eliminar
      }),
    },
    {
      codigo: 'listado_asesores',
      nombre: 'Listado de Asesores',
      descripcion: 'Página que muestra el listado de todos los asesores',
      es_estandar: true,
      requiere_slug: true,
      configuracion: JSON.stringify({ 
        default_slug: 'asesores',
        protected: true // No se puede eliminar
      }),
    },
    {
      codigo: 'asesor_single',
      nombre: 'Asesor Individual',
      descripcion: 'Página DINÁMICA que muestra cualquier asesor. Se reutiliza para todos los asesores según la URL (/asesores/[asesor-slug])',
      es_estandar: true,
      requiere_slug: false, // No requiere slug porque es dinámica
      configuracion: JSON.stringify({ 
        dynamic: true,
        is_template: true,
        route_pattern: '/asesores/:asesor',
        requires_asesor_slug: true,
        default_slug: 'asesor-single', // Slug interno para identificar la plantilla
        protected: true // No se puede eliminar
      }),
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('paginas_web');
  await knex.schema.dropTableIfExists('tipos_pagina');
}



