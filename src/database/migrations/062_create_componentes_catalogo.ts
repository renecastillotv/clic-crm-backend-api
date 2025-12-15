import { Knex } from 'knex';

/**
 * Migración: Catálogo de Componentes Estándar
 *
 * Crea la tabla master de componentes del sistema con todas sus variantes
 * y esquemas de configuración. Esto permite:
 * - Separar componentes del sistema vs personalizados
 * - Definir esquemas de config para cada componente
 * - Controlar qué componentes están disponibles según plan
 */
export async function up(knex: Knex): Promise<void> {
  // 1. Crear tabla de catálogo de componentes
  await knex.schema.createTable('componentes_catalogo', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('codigo', 100).unique().notNullable().comment('Código único (ej: header, hero, property_grid)');
    table.string('nombre', 200).notNullable().comment('Nombre legible (ej: Header, Hero, Grid de Propiedades)');
    table.string('categoria', 50).notNullable().comment('Categoría: layout, content, forms, media, crm');
    table.text('descripcion').nullable().comment('Descripción del componente');

    // Variantes disponibles
    table.jsonb('variantes').defaultTo('[]').comment('Array de variantes: [{codigo: "default", nombre: "Estándar"}]');

    // Schema de configuración (define los campos que acepta)
    table.jsonb('schema_config').defaultTo('{}').comment('Schema de configuración: {campos: [{nombre, tipo, requerido, default}]}');

    // Control de acceso
    table.string('plan_minimo', 20).nullable().comment('Plan mínimo requerido: basic, pro, premium');
    table.string('feature_requerido', 100).nullable().comment('Feature requerido para usar este componente');

    // Metadata
    table.boolean('es_sistema').defaultTo(true).comment('Si es componente del sistema (no editable)');
    table.boolean('activo').defaultTo(true);
    table.integer('orden').defaultTo(0).comment('Orden de visualización en el catálogo');
    table.string('icono', 50).nullable().comment('Icono para UI');
    table.jsonb('tags').defaultTo('[]').comment('Tags para búsqueda');

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Índices
    table.index('categoria', 'idx_componentes_catalogo_categoria');
    table.index('plan_minimo', 'idx_componentes_catalogo_plan');
    table.index('activo', 'idx_componentes_catalogo_activo');
  });

  console.log('✅ Tabla componentes_catalogo creada');

  // 2. Poblar con componentes estándar
  const componentesCatalogo = [
    // === LAYOUT ===
    {
      codigo: 'header',
      nombre: 'Header',
      categoria: 'layout',
      descripcion: 'Encabezado del sitio con logo, menú de navegación y acciones',
      variantes: [
        { codigo: 'default', nombre: 'Estándar' },
        { codigo: 'transparent', nombre: 'Transparente' },
        { codigo: 'centered', nombre: 'Centrado' },
        { codigo: 'minimal', nombre: 'Minimalista' },
      ],
      schema_config: {
        campos: [
          { nombre: 'logo_url', tipo: 'text', requerido: false, default: '' },
          { nombre: 'mostrar_busqueda', tipo: 'boolean', requerido: false, default: false },
          { nombre: 'mostrar_idiomas', tipo: 'boolean', requerido: false, default: false },
          { nombre: 'texto_cta', tipo: 'text', requerido: false, default: 'Contactar' },
          { nombre: 'url_cta', tipo: 'text', requerido: false, default: '/contacto' },
        ]
      },
      plan_minimo: null,
      es_sistema: true,
      orden: 1,
      icono: 'layout-navbar',
      tags: ['navegacion', 'menu', 'logo'],
    },
    {
      codigo: 'footer',
      nombre: 'Footer',
      categoria: 'layout',
      descripcion: 'Pie de página con enlaces, información de contacto y redes sociales',
      variantes: [
        { codigo: 'default', nombre: 'Estándar' },
        { codigo: 'minimal', nombre: 'Minimalista' },
        { codigo: 'columns', nombre: 'Columnas' },
      ],
      schema_config: {
        campos: [
          { nombre: 'texto_copyright', tipo: 'text', requerido: false, default: '' },
          { nombre: 'mostrar_redes_sociales', tipo: 'boolean', requerido: false, default: true },
          { nombre: 'columnas', tipo: 'number', requerido: false, default: 3 },
        ]
      },
      plan_minimo: null,
      es_sistema: true,
      orden: 2,
      icono: 'layout-footer',
      tags: ['footer', 'pie', 'redes sociales'],
    },

    // === CONTENT - HEROES ===
    {
      codigo: 'hero',
      nombre: 'Hero Section',
      categoria: 'content',
      descripcion: 'Sección hero con título, descripción e imagen de fondo',
      variantes: [
        { codigo: 'default', nombre: 'Estándar' },
        { codigo: 'centered', nombre: 'Centrado' },
        { codigo: 'split', nombre: 'Dividido' },
        { codigo: 'video', nombre: 'Con Video' },
        { codigo: 'search', nombre: 'Con Buscador' },
      ],
      schema_config: {
        campos: [
          { nombre: 'titulo', tipo: 'text', requerido: true, default: '' },
          { nombre: 'subtitulo', tipo: 'text', requerido: false, default: '' },
          { nombre: 'imagen_fondo', tipo: 'text', requerido: false, default: '' },
          { nombre: 'altura', tipo: 'select', opciones: ['small', 'medium', 'large', 'fullscreen'], default: 'large' },
          { nombre: 'alineacion', tipo: 'select', opciones: ['left', 'center', 'right'], default: 'center' },
          { nombre: 'overlay_opacity', tipo: 'number', requerido: false, default: 0.5 },
        ]
      },
      plan_minimo: null,
      es_sistema: true,
      orden: 10,
      icono: 'layout-hero',
      tags: ['hero', 'banner', 'portada'],
    },

    // === CONTENT - PROPIEDADES ===
    {
      codigo: 'property_grid',
      nombre: 'Grid de Propiedades',
      categoria: 'content',
      descripcion: 'Grid de tarjetas de propiedades con filtros',
      variantes: [
        { codigo: 'default', nombre: 'Estándar' },
        { codigo: 'masonry', nombre: 'Masonry' },
        { codigo: 'list', nombre: 'Lista' },
      ],
      schema_config: {
        campos: [
          { nombre: 'columnas', tipo: 'number', requerido: false, default: 3 },
          { nombre: 'mostrar_filtros', tipo: 'boolean', requerido: false, default: true },
          { nombre: 'items_por_pagina', tipo: 'number', requerido: false, default: 12 },
          { nombre: 'ordenamiento_default', tipo: 'select', opciones: ['recientes', 'precio_asc', 'precio_desc'], default: 'recientes' },
        ]
      },
      plan_minimo: null,
      es_sistema: true,
      orden: 20,
      icono: 'grid',
      tags: ['propiedades', 'inmuebles', 'grid'],
    },
    {
      codigo: 'property_detail',
      nombre: 'Detalle de Propiedad',
      categoria: 'content',
      descripcion: 'Vista detallada de una propiedad con galería y características',
      variantes: [
        { codigo: 'default', nombre: 'Estándar' },
        { codigo: 'luxury', nombre: 'Lujo' },
      ],
      schema_config: {
        campos: [
          { nombre: 'mostrar_mapa', tipo: 'boolean', requerido: false, default: true },
          { nombre: 'mostrar_similares', tipo: 'boolean', requerido: false, default: true },
          { nombre: 'tipo_galeria', tipo: 'select', opciones: ['carousel', 'grid', 'fullscreen'], default: 'carousel' },
        ]
      },
      plan_minimo: null,
      es_sistema: true,
      orden: 21,
      icono: 'file-text',
      tags: ['propiedad', 'detalle', 'inmueble'],
    },

    // === CONTENT - TEAM ===
    {
      codigo: 'team_grid',
      nombre: 'Grid de Asesores',
      categoria: 'content',
      descripcion: 'Grid de tarjetas del equipo de asesores',
      variantes: [
        { codigo: 'default', nombre: 'Estándar' },
        { codigo: 'cards', nombre: 'Tarjetas' },
        { codigo: 'minimal', nombre: 'Minimalista' },
      ],
      schema_config: {
        campos: [
          { nombre: 'columnas', tipo: 'number', requerido: false, default: 3 },
          { nombre: 'mostrar_contacto', tipo: 'boolean', requerido: false, default: true },
          { nombre: 'mostrar_especialidad', tipo: 'boolean', requerido: false, default: true },
        ]
      },
      plan_minimo: null,
      es_sistema: true,
      orden: 30,
      icono: 'users',
      tags: ['asesores', 'equipo', 'team'],
    },
    {
      codigo: 'agent_profile',
      nombre: 'Perfil de Asesor',
      categoria: 'content',
      descripcion: 'Perfil detallado de un asesor con bio y propiedades',
      variantes: [
        { codigo: 'default', nombre: 'Estándar' },
      ],
      schema_config: {
        campos: [
          { nombre: 'mostrar_propiedades', tipo: 'boolean', requerido: false, default: true },
          { nombre: 'mostrar_testimonios', tipo: 'boolean', requerido: false, default: true },
        ]
      },
      plan_minimo: null,
      es_sistema: true,
      orden: 31,
      icono: 'user',
      tags: ['asesor', 'perfil', 'agente'],
    },

    // === CONTENT - BLOG ===
    {
      codigo: 'article_grid',
      nombre: 'Grid de Artículos',
      categoria: 'content',
      descripcion: 'Grid de artículos de blog',
      variantes: [
        { codigo: 'default', nombre: 'Estándar' },
        { codigo: 'featured', nombre: 'Con Destacado' },
      ],
      schema_config: {
        campos: [
          { nombre: 'columnas', tipo: 'number', requerido: false, default: 3 },
          { nombre: 'items_por_pagina', tipo: 'number', requerido: false, default: 9 },
        ]
      },
      plan_minimo: null,
      es_sistema: true,
      orden: 40,
      icono: 'newspaper',
      tags: ['blog', 'articulos', 'noticias'],
    },
    {
      codigo: 'article_detail',
      nombre: 'Detalle de Artículo',
      categoria: 'content',
      descripcion: 'Vista detallada de un artículo de blog',
      variantes: [
        { codigo: 'default', nombre: 'Estándar' },
      ],
      schema_config: {
        campos: [
          { nombre: 'mostrar_autor', tipo: 'boolean', requerido: false, default: true },
          { nombre: 'mostrar_relacionados', tipo: 'boolean', requerido: false, default: true },
        ]
      },
      plan_minimo: null,
      es_sistema: true,
      orden: 41,
      icono: 'file-text',
      tags: ['articulo', 'blog', 'post'],
    },

    // === FORMS ===
    {
      codigo: 'contact_form',
      nombre: 'Formulario de Contacto',
      categoria: 'forms',
      descripcion: 'Formulario de contacto con validación',
      variantes: [
        { codigo: 'default', nombre: 'Estándar' },
        { codigo: 'inline', nombre: 'Inline' },
      ],
      schema_config: {
        campos: [
          { nombre: 'titulo', tipo: 'text', requerido: false, default: 'Contáctanos' },
          { nombre: 'mostrar_telefono', tipo: 'boolean', requerido: false, default: true },
          { nombre: 'mensaje_exito', tipo: 'text', requerido: false, default: 'Mensaje enviado con éxito' },
        ]
      },
      plan_minimo: null,
      es_sistema: true,
      orden: 50,
      icono: 'mail',
      tags: ['contacto', 'formulario', 'form'],
    },
    {
      codigo: 'search_box',
      nombre: 'Buscador de Propiedades',
      categoria: 'forms',
      descripcion: 'Buscador avanzado de propiedades con filtros',
      variantes: [
        { codigo: 'default', nombre: 'Estándar' },
        { codigo: 'advanced', nombre: 'Avanzado' },
        { codigo: 'minimal', nombre: 'Minimalista' },
      ],
      schema_config: {
        campos: [
          { nombre: 'mostrar_tipo', tipo: 'boolean', requerido: false, default: true },
          { nombre: 'mostrar_precio', tipo: 'boolean', requerido: false, default: true },
          { nombre: 'mostrar_ubicacion', tipo: 'boolean', requerido: false, default: true },
          { nombre: 'mostrar_habitaciones', tipo: 'boolean', requerido: false, default: true },
        ]
      },
      plan_minimo: null,
      es_sistema: true,
      orden: 51,
      icono: 'search',
      tags: ['buscador', 'search', 'filtros'],
    },

    // === MEDIA ===
    {
      codigo: 'video_gallery',
      nombre: 'Galería de Videos',
      categoria: 'media',
      descripcion: 'Galería de videos con thumbnails',
      variantes: [
        { codigo: 'default', nombre: 'Estándar' },
        { codigo: 'grid', nombre: 'Grid' },
      ],
      schema_config: {
        campos: [
          { nombre: 'columnas', tipo: 'number', requerido: false, default: 3 },
          { nombre: 'autoplay', tipo: 'boolean', requerido: false, default: false },
        ]
      },
      plan_minimo: 'pro',
      feature_requerido: 'videos',
      es_sistema: true,
      orden: 60,
      icono: 'video',
      tags: ['videos', 'galeria', 'multimedia'],
    },

    // === CRM ===
    {
      codigo: 'testimonials_grid',
      nombre: 'Grid de Testimonios',
      categoria: 'content',
      descripcion: 'Grid de testimonios de clientes',
      variantes: [
        { codigo: 'default', nombre: 'Estándar' },
        { codigo: 'carousel', nombre: 'Carrusel' },
      ],
      schema_config: {
        campos: [
          { nombre: 'columnas', tipo: 'number', requerido: false, default: 3 },
          { nombre: 'mostrar_foto', tipo: 'boolean', requerido: false, default: true },
          { nombre: 'mostrar_rating', tipo: 'boolean', requerido: false, default: true },
        ]
      },
      plan_minimo: 'pro',
      es_sistema: true,
      orden: 70,
      icono: 'message-square',
      tags: ['testimonios', 'reviews', 'opiniones'],
    },
  ];

  for (const componente of componentesCatalogo) {
    await knex('componentes_catalogo').insert({
      codigo: componente.codigo,
      nombre: componente.nombre,
      categoria: componente.categoria,
      descripcion: componente.descripcion,
      variantes: JSON.stringify(componente.variantes),
      schema_config: JSON.stringify(componente.schema_config),
      plan_minimo: componente.plan_minimo,
      feature_requerido: componente.feature_requerido,
      es_sistema: componente.es_sistema,
      orden: componente.orden,
      icono: componente.icono,
      tags: JSON.stringify(componente.tags),
    });
    console.log(`✅ Componente ${componente.codigo} creado en catálogo`);
  }

  console.log(`\n✅ ${componentesCatalogo.length} componentes agregados al catálogo`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('componentes_catalogo');
  console.log('❌ Tabla componentes_catalogo eliminada');
}
