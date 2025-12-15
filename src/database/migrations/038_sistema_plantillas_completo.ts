import type { Knex } from 'knex';

/**
 * Migración: Sistema Completo de Plantillas y Versioning
 *
 * Este sistema permite:
 * 1. Tipos de página específicos (directorio_testimonios, single_asesor, etc.)
 * 2. Plantillas/variantes para cada tipo (20 variantes de homepage, etc.)
 * 3. Versioning de configuraciones (Navidad 2024, Original, Verano 2025)
 * 4. El usuario puede cambiar entre versiones sin perder datos
 *
 * Estructura:
 * - tipos_pagina: Define qué tipos existen (homepage, single_asesor, directorio_videos)
 * - plantillas_pagina: Variantes visuales de cada tipo (homepage_luxury, homepage_modern)
 * - paginas_web: Instancia de una página del tenant
 * - paginas_configuraciones: Historial de versiones/configuraciones de una página
 */

export async function up(knex: Knex): Promise<void> {
  // =====================================================
  // 1. TABLA: paginas_configuraciones (Versioning)
  // =====================================================

  const hasConfigTable = await knex.schema.hasTable('paginas_configuraciones');
  if (!hasConfigTable) {
    await knex.schema.createTable('paginas_configuraciones', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('pagina_id').notNullable().references('id').inTable('paginas_web').onDelete('CASCADE');

      // Nombre de la configuración (ej: "Original", "Navidad 2024", "Verano 2025")
      table.string('nombre', 100).notNullable();

      // Solo una puede estar activa por página
      table.boolean('es_activa').defaultTo(false);

      // Referencia a la plantilla base usada
      table.uuid('plantilla_id').references('id').inTable('plantillas_pagina').onDelete('SET NULL');

      // Snapshot completo de componentes con sus datos (estáticos y dinámicos)
      // Formato: [{ tipo, variante, orden, datos, esPersonalizado }]
      table.jsonb('componentes').defaultTo('[]');

      // Metadatos de la página para esta configuración
      table.jsonb('meta').defaultTo('{}');

      // Auditoría
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      // Índices
      table.index('pagina_id');
      table.index('es_activa');
    });

    // Índice único: solo una configuración activa por página
    await knex.raw(`
      CREATE UNIQUE INDEX idx_paginas_config_activa_unica
      ON paginas_configuraciones (pagina_id)
      WHERE es_activa = true
    `);

    console.log('✅ Tabla paginas_configuraciones creada');
  }

  // =====================================================
  // 2. AGREGAR configuracion_activa_id a paginas_web
  // =====================================================

  const hasConfigActiva = await knex.schema.hasColumn('paginas_web', 'configuracion_activa_id');
  if (!hasConfigActiva) {
    await knex.schema.alterTable('paginas_web', (table) => {
      table.uuid('configuracion_activa_id')
        .references('id').inTable('paginas_configuraciones')
        .onDelete('SET NULL')
        .comment('Configuración actualmente activa para esta página');
    });
    console.log('✅ Campo configuracion_activa_id agregado a paginas_web');
  }

  // =====================================================
  // 3. TIPOS DE PÁGINA ESPECÍFICOS (Opción B)
  // =====================================================

  const tiposPagina = [
    // === PÁGINAS PRINCIPALES (ya existen, solo actualizamos) ===
    {
      codigo: 'homepage',
      nombre: 'Homepage',
      descripcion: 'Página principal del sitio',
      es_estandar: true,
      nivel: 0,
      protegida: true,
    },
    {
      codigo: 'listados_propiedades',
      nombre: 'Listado de Propiedades',
      descripcion: 'Página de búsqueda/listado de propiedades con filtros',
      es_estandar: true,
      nivel: 0,
      fuente_datos: 'propiedades',
      protegida: true,
    },
    {
      codigo: 'single_property',
      nombre: 'Detalle de Propiedad',
      descripcion: 'Página individual de una propiedad',
      es_estandar: true,
      nivel: 1,
      fuente_datos: 'propiedades',
      es_plantilla: true,
      protegida: true,
    },
    {
      codigo: 'contacto',
      nombre: 'Contacto',
      descripcion: 'Página de contacto',
      es_estandar: true,
      nivel: 0,
      protegida: true,
    },

    // === ASESORES ===
    {
      codigo: 'directorio_asesores',
      nombre: 'Directorio de Asesores',
      descripcion: 'Listado de todos los asesores/agentes',
      es_estandar: true,
      nivel: 0,
      fuente_datos: 'asesores',
      protegida: false,
    },
    {
      codigo: 'single_asesor',
      nombre: 'Perfil de Asesor',
      descripcion: 'Página individual de un asesor',
      es_estandar: true,
      nivel: 1,
      fuente_datos: 'asesores',
      es_plantilla: true,
      protegida: false,
    },

    // === BLOG/ARTÍCULOS ===
    {
      codigo: 'directorio_articulos',
      nombre: 'Blog / Artículos',
      descripcion: 'Listado de artículos del blog',
      es_estandar: true,
      nivel: 0,
      fuente_datos: 'articulos',
      protegida: false,
    },
    {
      codigo: 'single_articulo',
      nombre: 'Artículo Individual',
      descripcion: 'Página de un artículo del blog',
      es_estandar: true,
      nivel: 1,
      fuente_datos: 'articulos',
      es_plantilla: true,
      protegida: false,
    },

    // === TESTIMONIOS ===
    {
      codigo: 'directorio_testimonios',
      nombre: 'Testimonios',
      descripcion: 'Listado de testimonios de clientes',
      es_estandar: true,
      nivel: 0,
      fuente_datos: 'testimonios',
      protegida: false,
    },
    {
      codigo: 'single_testimonio',
      nombre: 'Testimonio Individual',
      descripcion: 'Página de un testimonio específico',
      es_estandar: true,
      nivel: 1,
      fuente_datos: 'testimonios',
      es_plantilla: true,
      protegida: false,
    },

    // === VIDEOS ===
    {
      codigo: 'directorio_videos',
      nombre: 'Galería de Videos',
      descripcion: 'Listado de videos',
      es_estandar: true,
      nivel: 0,
      fuente_datos: 'videos',
      protegida: false,
    },
    {
      codigo: 'single_video',
      nombre: 'Video Individual',
      descripcion: 'Página de un video específico',
      es_estandar: true,
      nivel: 1,
      fuente_datos: 'videos',
      es_plantilla: true,
      protegida: false,
    },

    // === PROYECTOS ===
    {
      codigo: 'directorio_proyectos',
      nombre: 'Proyectos',
      descripcion: 'Listado de proyectos inmobiliarios',
      es_estandar: true,
      nivel: 0,
      fuente_datos: 'proyectos',
      protegida: false,
    },
    {
      codigo: 'single_proyecto',
      nombre: 'Proyecto Individual',
      descripcion: 'Página de un proyecto específico',
      es_estandar: true,
      nivel: 1,
      fuente_datos: 'proyectos',
      es_plantilla: true,
      protegida: false,
    },

    // === PÁGINAS GENÉRICAS (fallback) ===
    {
      codigo: 'custom_page',
      nombre: 'Página Personalizada',
      descripcion: 'Página estática sin niveles',
      es_estandar: true,
      nivel: 0,
      protegida: false,
    },
    {
      codigo: 'directorio',
      nombre: 'Directorio Genérico',
      descripcion: 'Listado genérico (fallback para nuevos tipos)',
      es_estandar: true,
      nivel: 0,
      protegida: false,
    },
    {
      codigo: 'single',
      nombre: 'Single Genérico',
      descripcion: 'Página individual genérica (fallback)',
      es_estandar: true,
      nivel: 1,
      es_plantilla: true,
      protegida: false,
    },
  ];

  for (const tipo of tiposPagina) {
    const exists = await knex('tipos_pagina').where('codigo', tipo.codigo).first();
    if (!exists) {
      await knex('tipos_pagina').insert({
        codigo: tipo.codigo,
        nombre: tipo.nombre,
        descripcion: tipo.descripcion,
        es_estandar: tipo.es_estandar,
        requiere_slug: tipo.nivel === 1,
        configuracion: JSON.stringify({}),
        nivel: tipo.nivel,
        fuente_datos: tipo.fuente_datos || null,
        es_plantilla: tipo.es_plantilla || false,
        protegida: tipo.protegida,
      });
      console.log(`  ✓ Tipo ${tipo.codigo} creado`);
    }
  }

  // =====================================================
  // 4. PLANTILLAS POR DEFECTO PARA CADA TIPO
  // =====================================================

  const plantillas = [
    // === HOMEPAGE ===
    {
      codigo: 'homepage_default',
      tipo_pagina: 'homepage',
      nombre: 'Homepage Estándar',
      descripcion: 'Diseño estándar con hero, propiedades destacadas y CTA',
      categoria: 'standard',
      componentes: [
        { codigo: 'header', orden: 1 },
        { codigo: 'hero', orden: 2 },
        { codigo: 'property_featured', orden: 3 },
        { codigo: 'services', orden: 4 },
        { codigo: 'testimonials_carousel', orden: 5 },
        { codigo: 'cta', orden: 6 },
        { codigo: 'footer', orden: 7 },
      ],
      featured: true,
      orden: 1,
    },
    {
      codigo: 'homepage_luxury',
      tipo_pagina: 'homepage',
      nombre: 'Homepage Luxury',
      descripcion: 'Diseño elegante para inmobiliarias premium',
      categoria: 'luxury',
      componentes: [
        { codigo: 'header_transparent', orden: 1 },
        { codigo: 'hero_fullscreen', orden: 2 },
        { codigo: 'stats_animated', orden: 3 },
        { codigo: 'property_carousel_luxury', orden: 4 },
        { codigo: 'about_elegant', orden: 5 },
        { codigo: 'testimonials_elegant', orden: 6 },
        { codigo: 'footer_luxury', orden: 7 },
      ],
      es_premium: true,
      orden: 2,
    },
    {
      codigo: 'homepage_modern',
      tipo_pagina: 'homepage',
      nombre: 'Homepage Moderna',
      descripcion: 'Diseño minimalista y contemporáneo',
      categoria: 'modern',
      componentes: [
        { codigo: 'header', orden: 1 },
        { codigo: 'hero_split', orden: 2 },
        { codigo: 'search_bar', orden: 3 },
        { codigo: 'property_grid', orden: 4 },
        { codigo: 'features_icons', orden: 5 },
        { codigo: 'footer', orden: 6 },
      ],
      orden: 3,
    },

    // === LISTADO PROPIEDADES ===
    {
      codigo: 'listado_propiedades_default',
      tipo_pagina: 'listados_propiedades',
      nombre: 'Listado Grid con Filtros',
      descripcion: 'Grid de propiedades con filtros laterales',
      categoria: 'standard',
      componentes: [
        { codigo: 'header', orden: 1 },
        { codigo: 'breadcrumbs', orden: 2 },
        { codigo: 'filters_sidebar', orden: 3 },
        { codigo: 'property_grid', orden: 4 },
        { codigo: 'pagination', orden: 5 },
        { codigo: 'footer', orden: 6 },
      ],
      featured: true,
      orden: 1,
    },
    {
      codigo: 'listado_propiedades_mapa',
      tipo_pagina: 'listados_propiedades',
      nombre: 'Listado con Mapa',
      descripcion: 'Listado con mapa interactivo',
      categoria: 'premium',
      componentes: [
        { codigo: 'header', orden: 1 },
        { codigo: 'search_bar_horizontal', orden: 2 },
        { codigo: 'map_properties', orden: 3 },
        { codigo: 'property_list_compact', orden: 4 },
        { codigo: 'footer', orden: 5 },
      ],
      es_premium: true,
      orden: 2,
    },

    // === SINGLE PROPERTY ===
    {
      codigo: 'single_property_default',
      tipo_pagina: 'single_property',
      nombre: 'Detalle Propiedad Estándar',
      descripcion: 'Galería, info, características y formulario',
      categoria: 'standard',
      componentes: [
        { codigo: 'header', orden: 1 },
        { codigo: 'breadcrumbs', orden: 2 },
        { codigo: 'property_gallery', orden: 3 },
        { codigo: 'property_info', orden: 4 },
        { codigo: 'property_features', orden: 5 },
        { codigo: 'property_location', orden: 6 },
        { codigo: 'contact_agent', orden: 7 },
        { codigo: 'related_properties', orden: 8 },
        { codigo: 'footer', orden: 9 },
      ],
      featured: true,
      orden: 1,
    },
    {
      codigo: 'single_property_luxury',
      tipo_pagina: 'single_property',
      nombre: 'Detalle Propiedad Luxury',
      descripcion: 'Galería fullscreen, tour virtual, diseño premium',
      categoria: 'luxury',
      componentes: [
        { codigo: 'header_transparent', orden: 1 },
        { codigo: 'property_hero_fullscreen', orden: 2 },
        { codigo: 'property_highlights', orden: 3 },
        { codigo: 'property_gallery_masonry', orden: 4 },
        { codigo: 'property_virtual_tour', orden: 5 },
        { codigo: 'property_amenities', orden: 6 },
        { codigo: 'property_floor_plans', orden: 7 },
        { codigo: 'property_location_premium', orden: 8 },
        { codigo: 'contact_form_elegant', orden: 9 },
        { codigo: 'footer', orden: 10 },
      ],
      es_premium: true,
      orden: 2,
    },

    // === CONTACTO ===
    {
      codigo: 'contacto_default',
      tipo_pagina: 'contacto',
      nombre: 'Contacto Estándar',
      descripcion: 'Formulario, mapa y datos de contacto',
      categoria: 'standard',
      componentes: [
        { codigo: 'header', orden: 1 },
        { codigo: 'hero_simple', orden: 2, configuracion: { titulo: 'Contáctanos' } },
        { codigo: 'contact_form', orden: 3 },
        { codigo: 'contact_info', orden: 4 },
        { codigo: 'map', orden: 5 },
        { codigo: 'footer', orden: 6 },
      ],
      featured: true,
      orden: 1,
    },

    // === ASESORES ===
    {
      codigo: 'directorio_asesores_default',
      tipo_pagina: 'directorio_asesores',
      nombre: 'Equipo Grid',
      descripcion: 'Grid de asesores con cards',
      categoria: 'standard',
      componentes: [
        { codigo: 'header', orden: 1 },
        { codigo: 'hero_simple', orden: 2, configuracion: { titulo: 'Nuestro Equipo' } },
        { codigo: 'team_grid', orden: 3 },
        { codigo: 'cta', orden: 4 },
        { codigo: 'footer', orden: 5 },
      ],
      featured: true,
      orden: 1,
    },
    {
      codigo: 'single_asesor_default',
      tipo_pagina: 'single_asesor',
      nombre: 'Perfil de Asesor',
      descripcion: 'Bio, propiedades y formulario de contacto',
      categoria: 'standard',
      componentes: [
        { codigo: 'header', orden: 1 },
        { codigo: 'breadcrumbs', orden: 2 },
        { codigo: 'agent_hero', orden: 3 },
        { codigo: 'agent_bio', orden: 4 },
        { codigo: 'agent_properties', orden: 5 },
        { codigo: 'contact_agent', orden: 6 },
        { codigo: 'footer', orden: 7 },
      ],
      featured: true,
      orden: 1,
    },

    // === BLOG ===
    {
      codigo: 'directorio_articulos_default',
      tipo_pagina: 'directorio_articulos',
      nombre: 'Blog Grid',
      descripcion: 'Grid de artículos con destacado',
      categoria: 'standard',
      componentes: [
        { codigo: 'header', orden: 1 },
        { codigo: 'hero_simple', orden: 2, configuracion: { titulo: 'Blog' } },
        { codigo: 'article_featured', orden: 3 },
        { codigo: 'articles_grid', orden: 4 },
        { codigo: 'pagination', orden: 5 },
        { codigo: 'footer', orden: 6 },
      ],
      featured: true,
      orden: 1,
    },
    {
      codigo: 'single_articulo_default',
      tipo_pagina: 'single_articulo',
      nombre: 'Artículo Detalle',
      descripcion: 'Contenido del artículo con autor y relacionados',
      categoria: 'standard',
      componentes: [
        { codigo: 'header', orden: 1 },
        { codigo: 'breadcrumbs', orden: 2 },
        { codigo: 'article_header', orden: 3 },
        { codigo: 'article_content', orden: 4 },
        { codigo: 'article_author', orden: 5 },
        { codigo: 'related_articles', orden: 6 },
        { codigo: 'footer', orden: 7 },
      ],
      featured: true,
      orden: 1,
    },

    // === TESTIMONIOS ===
    {
      codigo: 'directorio_testimonios_default',
      tipo_pagina: 'directorio_testimonios',
      nombre: 'Testimonios Grid',
      descripcion: 'Grid de testimonios con estrellas',
      categoria: 'standard',
      componentes: [
        { codigo: 'header', orden: 1 },
        { codigo: 'hero_simple', orden: 2, configuracion: { titulo: 'Testimonios' } },
        { codigo: 'testimonials_grid', orden: 3 },
        { codigo: 'cta', orden: 4 },
        { codigo: 'footer', orden: 5 },
      ],
      featured: true,
      orden: 1,
    },
    {
      codigo: 'single_testimonio_default',
      tipo_pagina: 'single_testimonio',
      nombre: 'Testimonio Detalle',
      descripcion: 'Testimonio completo con foto y detalles',
      categoria: 'standard',
      componentes: [
        { codigo: 'header', orden: 1 },
        { codigo: 'breadcrumbs', orden: 2 },
        { codigo: 'testimonial_detail', orden: 3 },
        { codigo: 'related_testimonials', orden: 4 },
        { codigo: 'footer', orden: 5 },
      ],
      featured: true,
      orden: 1,
    },

    // === VIDEOS ===
    {
      codigo: 'directorio_videos_default',
      tipo_pagina: 'directorio_videos',
      nombre: 'Galería de Videos',
      descripcion: 'Grid de videos con thumbnails',
      categoria: 'standard',
      componentes: [
        { codigo: 'header', orden: 1 },
        { codigo: 'hero_simple', orden: 2, configuracion: { titulo: 'Videos' } },
        { codigo: 'video_gallery', orden: 3 },
        { codigo: 'footer', orden: 4 },
      ],
      featured: true,
      orden: 1,
    },
    {
      codigo: 'single_video_default',
      tipo_pagina: 'single_video',
      nombre: 'Video Player',
      descripcion: 'Player con descripción y videos relacionados',
      categoria: 'standard',
      componentes: [
        { codigo: 'header', orden: 1 },
        { codigo: 'breadcrumbs', orden: 2 },
        { codigo: 'video_player', orden: 3 },
        { codigo: 'video_info', orden: 4 },
        { codigo: 'related_videos', orden: 5 },
        { codigo: 'footer', orden: 6 },
      ],
      featured: true,
      orden: 1,
    },

    // === PROYECTOS ===
    {
      codigo: 'directorio_proyectos_default',
      tipo_pagina: 'directorio_proyectos',
      nombre: 'Proyectos Grid',
      descripcion: 'Grid de proyectos inmobiliarios',
      categoria: 'standard',
      componentes: [
        { codigo: 'header', orden: 1 },
        { codigo: 'hero_simple', orden: 2, configuracion: { titulo: 'Proyectos' } },
        { codigo: 'projects_grid', orden: 3 },
        { codigo: 'footer', orden: 4 },
      ],
      featured: true,
      orden: 1,
    },
    {
      codigo: 'single_proyecto_default',
      tipo_pagina: 'single_proyecto',
      nombre: 'Proyecto Detalle',
      descripcion: 'Landing page de proyecto con galería y unidades',
      categoria: 'standard',
      componentes: [
        { codigo: 'header', orden: 1 },
        { codigo: 'project_hero', orden: 2 },
        { codigo: 'project_info', orden: 3 },
        { codigo: 'project_gallery', orden: 4 },
        { codigo: 'project_units', orden: 5 },
        { codigo: 'project_location', orden: 6 },
        { codigo: 'contact_form', orden: 7 },
        { codigo: 'footer', orden: 8 },
      ],
      featured: true,
      orden: 1,
    },

    // === GENÉRICOS (fallback) ===
    {
      codigo: 'custom_page_default',
      tipo_pagina: 'custom_page',
      nombre: 'Página Personalizada',
      descripcion: 'Página estática básica',
      categoria: 'standard',
      componentes: [
        { codigo: 'header', orden: 1 },
        { codigo: 'hero_simple', orden: 2 },
        { codigo: 'text_content', orden: 3 },
        { codigo: 'footer', orden: 4 },
      ],
      featured: true,
      orden: 1,
    },
    {
      codigo: 'directorio_default',
      tipo_pagina: 'directorio',
      nombre: 'Directorio Genérico',
      descripcion: 'Listado genérico de contenido',
      categoria: 'standard',
      componentes: [
        { codigo: 'header', orden: 1 },
        { codigo: 'hero_simple', orden: 2 },
        { codigo: 'content_grid', orden: 3 },
        { codigo: 'pagination', orden: 4 },
        { codigo: 'footer', orden: 5 },
      ],
      featured: true,
      orden: 1,
    },
    {
      codigo: 'single_default',
      tipo_pagina: 'single',
      nombre: 'Single Genérico',
      descripcion: 'Página individual genérica',
      categoria: 'standard',
      componentes: [
        { codigo: 'header', orden: 1 },
        { codigo: 'breadcrumbs', orden: 2 },
        { codigo: 'content_detail', orden: 3 },
        { codigo: 'related_content', orden: 4 },
        { codigo: 'footer', orden: 5 },
      ],
      featured: true,
      orden: 1,
    },
  ];

  for (const plantilla of plantillas) {
    const tipoExiste = await knex('tipos_pagina').where('codigo', plantilla.tipo_pagina).first();
    if (tipoExiste) {
      const existe = await knex('plantillas_pagina').where('codigo', plantilla.codigo).first();
      if (!existe) {
        await knex('plantillas_pagina').insert({
          codigo: plantilla.codigo,
          tipo_pagina: plantilla.tipo_pagina,
          nombre: plantilla.nombre,
          descripcion: plantilla.descripcion,
          categoria: plantilla.categoria,
          componentes: JSON.stringify(plantilla.componentes),
          visible: true,
          featured: plantilla.featured || false,
          es_premium: plantilla.es_premium || false,
          orden: plantilla.orden,
        });
        console.log(`  ✓ Plantilla ${plantilla.codigo} creada`);
      }
    }
  }

  console.log('✅ Sistema de plantillas y versioning completado');
}

export async function down(knex: Knex): Promise<void> {
  // Quitar referencia en paginas_web
  const hasConfigActiva = await knex.schema.hasColumn('paginas_web', 'configuracion_activa_id');
  if (hasConfigActiva) {
    await knex.schema.alterTable('paginas_web', (table) => {
      table.dropColumn('configuracion_activa_id');
    });
  }

  // Eliminar tabla de configuraciones
  await knex.schema.dropTableIfExists('paginas_configuraciones');

  // Eliminar plantillas creadas
  const codigosPlantillas = [
    'homepage_default', 'homepage_luxury', 'homepage_modern',
    'listado_propiedades_default', 'listado_propiedades_mapa',
    'single_property_default', 'single_property_luxury',
    'contacto_default',
    'directorio_asesores_default', 'single_asesor_default',
    'directorio_articulos_default', 'single_articulo_default',
    'directorio_testimonios_default', 'single_testimonio_default',
    'directorio_videos_default', 'single_video_default',
    'directorio_proyectos_default', 'single_proyecto_default',
    'custom_page_default', 'directorio_default', 'single_default',
  ];
  await knex('plantillas_pagina').whereIn('codigo', codigosPlantillas).delete();

  // Eliminar tipos de página nuevos
  const tiposNuevos = [
    'directorio_asesores', 'single_asesor',
    'directorio_articulos', 'single_articulo',
    'directorio_testimonios', 'single_testimonio',
    'directorio_videos', 'single_video',
    'directorio_proyectos', 'single_proyecto',
    'custom_page', 'directorio', 'single',
  ];
  await knex('tipos_pagina').whereIn('codigo', tiposNuevos).delete();

  console.log('✅ Migración revertida');
}
