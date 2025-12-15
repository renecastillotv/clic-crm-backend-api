import type { Knex } from 'knex';

/**
 * Migración: Tipos de página para propiedades y plantillas
 *
 * Agrega los tipos de página que faltan para el sistema de rutas de propiedades:
 * - propiedades_listado: /comprar, /alquilar, /comprar/apartamento, etc.
 * - propiedades_single: /comprar/apartamento/propiedad-slug
 *
 * También crea plantillas por defecto para cada tipo de página importante.
 */

export async function up(knex: Knex): Promise<void> {
  // =====================================================
  // 1. AGREGAR TIPOS DE PÁGINA PARA PROPIEDADES
  // =====================================================

  const tiposPropiedades = [
    {
      codigo: 'propiedades_listado',
      nombre: 'Listado de Propiedades',
      descripcion: 'Página de listado de propiedades con filtros desde URL (ej: /comprar/apartamento)',
      es_estandar: true,
      requiere_slug: false,
      ruta_patron: '/:operacion?/:tipo?/:ubicacion?',
      nivel: 0,
      fuente_datos: 'propiedades',
      es_plantilla: false,
      protegida: true,
      alias_rutas: JSON.stringify({
        es: 'propiedades',
        en: 'properties',
        fr: 'proprietes',
        pt: 'imoveis',
      }),
      componentes_requeridos: JSON.stringify(['header', 'property_filters', 'property_list', 'footer']),
    },
    {
      codigo: 'propiedades_single',
      nombre: 'Detalle de Propiedad',
      descripcion: 'Página individual de una propiedad',
      es_estandar: true,
      requiere_slug: true,
      ruta_patron: '/:operacion?/:tipo?/:slug',
      ruta_padre: 'propiedades_listado',
      nivel: 1,
      fuente_datos: 'propiedades',
      es_plantilla: true,
      protegida: true,
      parametros: JSON.stringify([
        { nombre: 'slug', posicion: 3, tipo: 'slug', fuente: 'propiedades', campo: 'slug' },
      ]),
      alias_rutas: JSON.stringify({
        es: 'propiedades',
        en: 'properties',
        fr: 'proprietes',
        pt: 'imoveis',
      }),
      componentes_requeridos: JSON.stringify(['header', 'property_detail', 'property_gallery', 'contact_form', 'footer']),
    },
  ];

  for (const tipo of tiposPropiedades) {
    const exists = await knex('tipos_pagina').where('codigo', tipo.codigo).first();
    if (!exists) {
      await knex('tipos_pagina').insert({
        ...tipo,
        configuracion: JSON.stringify({ dynamic: tipo.es_plantilla }),
      });
      console.log(`✅ Tipo ${tipo.codigo} creado`);
    } else {
      await knex('tipos_pagina')
        .where('codigo', tipo.codigo)
        .update({
          ruta_patron: tipo.ruta_patron,
          nivel: tipo.nivel,
          fuente_datos: tipo.fuente_datos,
          es_plantilla: tipo.es_plantilla,
          protegida: tipo.protegida,
          alias_rutas: tipo.alias_rutas,
          componentes_requeridos: tipo.componentes_requeridos,
          updated_at: knex.fn.now(),
        });
      console.log(`✅ Tipo ${tipo.codigo} actualizado`);
    }
  }

  // =====================================================
  // 2. CREAR PLANTILLAS POR DEFECTO
  // =====================================================

  const plantillas = [
    // Plantillas para listado de propiedades
    {
      codigo: 'propiedades_listado_grid',
      tipo_pagina: 'propiedades_listado',
      nombre: 'Listado Grid',
      descripcion: 'Listado de propiedades en formato grid con filtros laterales',
      categoria: 'standard',
      componentes: JSON.stringify([
        { codigo: 'header', orden: 1, configuracion: {} },
        { codigo: 'breadcrumbs', orden: 2, configuracion: {} },
        { codigo: 'property_filters_sidebar', orden: 3, configuracion: { position: 'left' } },
        { codigo: 'property_grid', orden: 4, configuracion: { columns: 3 } },
        { codigo: 'pagination', orden: 5, configuracion: {} },
        { codigo: 'footer', orden: 6, configuracion: {} },
      ]),
      visible: true,
      featured: true,
      es_premium: false,
      orden: 1,
    },
    {
      codigo: 'propiedades_listado_mapa',
      tipo_pagina: 'propiedades_listado',
      nombre: 'Listado con Mapa',
      descripcion: 'Listado de propiedades con mapa interactivo',
      categoria: 'premium',
      componentes: JSON.stringify([
        { codigo: 'header', orden: 1, configuracion: {} },
        { codigo: 'property_map', orden: 2, configuracion: { height: '400px' } },
        { codigo: 'property_filters_horizontal', orden: 3, configuracion: {} },
        { codigo: 'property_list', orden: 4, configuracion: {} },
        { codigo: 'footer', orden: 5, configuracion: {} },
      ]),
      visible: true,
      featured: true,
      es_premium: true,
      orden: 2,
    },
    // Plantillas para detalle de propiedad
    {
      codigo: 'propiedad_detalle_standard',
      tipo_pagina: 'propiedades_single',
      nombre: 'Detalle Estándar',
      descripcion: 'Página de detalle de propiedad con galería y formulario',
      categoria: 'standard',
      componentes: JSON.stringify([
        { codigo: 'header', orden: 1, configuracion: {} },
        { codigo: 'breadcrumbs', orden: 2, configuracion: {} },
        { codigo: 'property_gallery', orden: 3, configuracion: { layout: 'grid' } },
        { codigo: 'property_info', orden: 4, configuracion: {} },
        { codigo: 'property_features', orden: 5, configuracion: {} },
        { codigo: 'property_location', orden: 6, configuracion: { showMap: true } },
        { codigo: 'contact_agent', orden: 7, configuracion: {} },
        { codigo: 'related_properties', orden: 8, configuracion: { limit: 3 } },
        { codigo: 'footer', orden: 9, configuracion: {} },
      ]),
      visible: true,
      featured: true,
      es_premium: false,
      orden: 1,
    },
    {
      codigo: 'propiedad_detalle_luxury',
      tipo_pagina: 'propiedades_single',
      nombre: 'Detalle Luxury',
      descripcion: 'Página de detalle premium con galería fullscreen y tour virtual',
      categoria: 'luxury',
      componentes: JSON.stringify([
        { codigo: 'header_transparent', orden: 1, configuracion: {} },
        { codigo: 'property_hero_fullscreen', orden: 2, configuracion: {} },
        { codigo: 'property_highlights', orden: 3, configuracion: {} },
        { codigo: 'property_gallery_masonry', orden: 4, configuracion: {} },
        { codigo: 'property_virtual_tour', orden: 5, configuracion: {} },
        { codigo: 'property_amenities_icons', orden: 6, configuracion: {} },
        { codigo: 'property_floor_plans', orden: 7, configuracion: {} },
        { codigo: 'property_location_premium', orden: 8, configuracion: {} },
        { codigo: 'contact_form_elegant', orden: 9, configuracion: {} },
        { codigo: 'footer', orden: 10, configuracion: {} },
      ]),
      visible: true,
      featured: true,
      es_premium: true,
      orden: 2,
    },
    // Plantillas para testimonios
    {
      codigo: 'testimonios_grid_default',
      tipo_pagina: 'testimonios',
      nombre: 'Testimonios Grid',
      descripcion: 'Grid de testimonios con cards',
      categoria: 'standard',
      componentes: JSON.stringify([
        { codigo: 'header', orden: 1, configuracion: {} },
        { codigo: 'hero_simple', orden: 2, configuracion: { title: 'Testimonios', subtitle: 'Lo que dicen nuestros clientes' } },
        { codigo: 'testimonials_grid', orden: 3, configuracion: { columns: 3 } },
        { codigo: 'cta_section', orden: 4, configuracion: {} },
        { codigo: 'footer', orden: 5, configuracion: {} },
      ]),
      visible: true,
      featured: true,
      es_premium: false,
      orden: 1,
    },
    {
      codigo: 'testimonio_single_default',
      tipo_pagina: 'testimonio_single',
      nombre: 'Testimonio Detalle',
      descripcion: 'Página individual de testimonio',
      categoria: 'standard',
      componentes: JSON.stringify([
        { codigo: 'header', orden: 1, configuracion: {} },
        { codigo: 'breadcrumbs', orden: 2, configuracion: {} },
        { codigo: 'testimonial_detail', orden: 3, configuracion: {} },
        { codigo: 'related_testimonials', orden: 4, configuracion: { limit: 3 } },
        { codigo: 'footer', orden: 5, configuracion: {} },
      ]),
      visible: true,
      featured: false,
      es_premium: false,
      orden: 1,
    },
    // Plantillas para videos
    {
      codigo: 'videos_gallery_default',
      tipo_pagina: 'videos',
      nombre: 'Galería de Videos',
      descripcion: 'Galería de videos en grid',
      categoria: 'standard',
      componentes: JSON.stringify([
        { codigo: 'header', orden: 1, configuracion: {} },
        { codigo: 'hero_simple', orden: 2, configuracion: { title: 'Videos', subtitle: 'Conoce nuestras propiedades en video' } },
        { codigo: 'video_gallery', orden: 3, configuracion: { columns: 3 } },
        { codigo: 'footer', orden: 4, configuracion: {} },
      ]),
      visible: true,
      featured: true,
      es_premium: false,
      orden: 1,
    },
    {
      codigo: 'video_single_default',
      tipo_pagina: 'video_single',
      nombre: 'Video Detalle',
      descripcion: 'Página individual de video con player',
      categoria: 'standard',
      componentes: JSON.stringify([
        { codigo: 'header', orden: 1, configuracion: {} },
        { codigo: 'breadcrumbs', orden: 2, configuracion: {} },
        { codigo: 'video_player', orden: 3, configuracion: { autoplay: false } },
        { codigo: 'video_info', orden: 4, configuracion: {} },
        { codigo: 'related_videos', orden: 5, configuracion: { limit: 4 } },
        { codigo: 'footer', orden: 6, configuracion: {} },
      ]),
      visible: true,
      featured: false,
      es_premium: false,
      orden: 1,
    },
    // Plantillas para asesores
    {
      codigo: 'asesores_grid_default',
      tipo_pagina: 'listado_asesores',
      nombre: 'Equipo Grid',
      descripcion: 'Grid de asesores/equipo',
      categoria: 'standard',
      componentes: JSON.stringify([
        { codigo: 'header', orden: 1, configuracion: {} },
        { codigo: 'hero_simple', orden: 2, configuracion: { title: 'Nuestro Equipo', subtitle: 'Profesionales a tu servicio' } },
        { codigo: 'team_grid', orden: 3, configuracion: { columns: 4 } },
        { codigo: 'cta_section', orden: 4, configuracion: {} },
        { codigo: 'footer', orden: 5, configuracion: {} },
      ]),
      visible: true,
      featured: true,
      es_premium: false,
      orden: 1,
    },
    {
      codigo: 'asesor_single_default',
      tipo_pagina: 'asesor_single',
      nombre: 'Perfil de Asesor',
      descripcion: 'Página individual de asesor con propiedades',
      categoria: 'standard',
      componentes: JSON.stringify([
        { codigo: 'header', orden: 1, configuracion: {} },
        { codigo: 'breadcrumbs', orden: 2, configuracion: {} },
        { codigo: 'agent_profile', orden: 3, configuracion: {} },
        { codigo: 'agent_properties', orden: 4, configuracion: { limit: 6 } },
        { codigo: 'contact_agent', orden: 5, configuracion: {} },
        { codigo: 'footer', orden: 6, configuracion: {} },
      ]),
      visible: true,
      featured: false,
      es_premium: false,
      orden: 1,
    },
    // Plantillas para blog
    {
      codigo: 'blog_grid_default',
      tipo_pagina: 'blog',
      nombre: 'Blog Grid',
      descripcion: 'Grid de artículos del blog',
      categoria: 'standard',
      componentes: JSON.stringify([
        { codigo: 'header', orden: 1, configuracion: {} },
        { codigo: 'hero_simple', orden: 2, configuracion: { title: 'Blog', subtitle: 'Noticias y consejos inmobiliarios' } },
        { codigo: 'article_featured', orden: 3, configuracion: {} },
        { codigo: 'articles_grid', orden: 4, configuracion: { columns: 3 } },
        { codigo: 'pagination', orden: 5, configuracion: {} },
        { codigo: 'footer', orden: 6, configuracion: {} },
      ]),
      visible: true,
      featured: true,
      es_premium: false,
      orden: 1,
    },
    {
      codigo: 'articulo_single_default',
      tipo_pagina: 'articulo_single',
      nombre: 'Artículo Detalle',
      descripcion: 'Página individual de artículo del blog',
      categoria: 'standard',
      componentes: JSON.stringify([
        { codigo: 'header', orden: 1, configuracion: {} },
        { codigo: 'breadcrumbs', orden: 2, configuracion: {} },
        { codigo: 'article_header', orden: 3, configuracion: {} },
        { codigo: 'article_content', orden: 4, configuracion: {} },
        { codigo: 'article_author', orden: 5, configuracion: {} },
        { codigo: 'related_articles', orden: 6, configuracion: { limit: 3 } },
        { codigo: 'footer', orden: 7, configuracion: {} },
      ]),
      visible: true,
      featured: false,
      es_premium: false,
      orden: 1,
    },
  ];

  for (const plantilla of plantillas) {
    // Verificar que el tipo_pagina existe
    const tipoExiste = await knex('tipos_pagina').where('codigo', plantilla.tipo_pagina).first();
    if (tipoExiste) {
      const existe = await knex('plantillas_pagina').where('codigo', plantilla.codigo).first();
      if (!existe) {
        await knex('plantillas_pagina').insert(plantilla);
        console.log(`  ✓ Plantilla ${plantilla.codigo} creada`);
      }
    } else {
      console.log(`  ⚠️ Tipo ${plantilla.tipo_pagina} no existe, saltando plantilla ${plantilla.codigo}`);
    }
  }

  console.log('✅ Tipos de página y plantillas para propiedades creados');
}

export async function down(knex: Knex): Promise<void> {
  // Eliminar plantillas creadas
  const codigosPlantillas = [
    'propiedades_listado_grid',
    'propiedades_listado_mapa',
    'propiedad_detalle_standard',
    'propiedad_detalle_luxury',
    'testimonios_grid_default',
    'testimonio_single_default',
    'videos_gallery_default',
    'video_single_default',
    'asesores_grid_default',
    'asesor_single_default',
    'blog_grid_default',
    'articulo_single_default',
  ];

  await knex('plantillas_pagina').whereIn('codigo', codigosPlantillas).delete();

  // Eliminar tipos de página creados
  await knex('tipos_pagina').whereIn('codigo', ['propiedades_listado', 'propiedades_single']).delete();

  console.log('✅ Tipos y plantillas de propiedades eliminados');
}
