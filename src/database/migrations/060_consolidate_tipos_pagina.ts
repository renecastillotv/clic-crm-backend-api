import { Knex } from 'knex';

/**
 * Migración 060 - Consolidar y limpiar tipos_pagina
 *
 * Elimina duplicados y establece una única fuente de verdad
 * con convención consistente de nomenclatura
 */
export async function up(knex: Knex): Promise<void> {
  console.log('🧹 Consolidando tipos de página...\n');

  // ========================================
  // PASO 1: Eliminar duplicados conservando el preferido
  // ========================================

  const duplicatesToRemove = [
    // Asesores - conservar: listado_asesores, asesor_single
    'single_asesor',
    'directorio_asesores',

    // Videos - conservar: videos_listado, videos_categoria, videos_single
    'video_category',
    'video_single',
    'single_video',
    'directorio_videos',
    'videos', // solo es un alias

    // Artículos - conservar: articulos_listado, articulos_categoria, articulos_single
    'article_category',
    'article_single',
    'articulo_categoria',
    'articulo_single',
    'single_articulo',
    'directorio_articulos', // usar articulos_listado
    'blog', // usar articulos_listado

    // Propiedades - conservar: propiedades_listado, propiedades_single
    'listados_propiedades',
    'single_property',

    // Custom - conservar solo: custom
    'custom_page',

    // Genéricos duplicados - eliminar si no se usan
    'directorio',
    'single',

    // Testimonios duplicados - conservar: testimonios (listado), testimonio_single
    'testimonio_categoria',
    'directorio_testimonios',
    'single_testimonio',
  ];

  console.log(`Eliminando ${duplicatesToRemove.length} tipos de página duplicados...`);

  for (const codigo of duplicatesToRemove) {
    // Verificar si está siendo usado en paginas_web
    const usage = await knex('paginas_web')
      .where('tipo_pagina', codigo)
      .count('* as count')
      .first();

    if (usage && parseInt(usage.count as string) > 0) {
      console.log(`⚠️  ${codigo} está siendo usado en ${usage.count} página(s), OMITIDO`);
    } else {
      await knex('tipos_pagina').where('codigo', codigo).delete();
      console.log(`✅ ${codigo} eliminado`);
    }
  }

  // ========================================
  // PASO 2: Asegurar que existan los tipos estándar consolidados
  // ========================================

  const tiposEstandar = [
    // Páginas principales
    {
      codigo: 'homepage',
      nombre: 'Inicio',
      descripcion: 'Página principal del sitio web',
      categoria: 'principal',
      nivel: 0,
      es_plantilla: false,
      protegida: true,
      ruta_patron: '/',
    },
    {
      codigo: 'contacto',
      nombre: 'Contacto',
      descripcion: 'Formulario de contacto',
      categoria: 'principal',
      nivel: 0,
      es_plantilla: false,
      protegida: true,
      ruta_patron: '/contacto',
    },

    // Propiedades
    {
      codigo: 'propiedades_listado',
      nombre: 'Propiedades',
      descripcion: 'Listado de todas las propiedades',
      categoria: 'propiedades',
      nivel: 0,
      es_plantilla: false,
      protegida: true,
      ruta_patron: '/propiedades',
    },
    {
      codigo: 'propiedades_single',
      nombre: 'Propiedad - Detalle',
      descripcion: 'Página individual de propiedad',
      categoria: 'propiedades',
      nivel: 1,
      es_plantilla: true,
      protegida: true,
      ruta_patron: '/propiedades/:slug',
    },

    // Asesores
    {
      codigo: 'listado_asesores',
      nombre: 'Asesores',
      descripcion: 'Listado de asesores',
      categoria: 'asesores',
      nivel: 0,
      es_plantilla: false,
      protegida: true,
      ruta_patron: '/asesores',
    },
    {
      codigo: 'asesor_single',
      nombre: 'Asesor - Perfil',
      descripcion: 'Página individual de asesor',
      categoria: 'asesores',
      nivel: 1,
      es_plantilla: true,
      protegida: true,
      ruta_patron: '/asesores/:slug',
    },

    // Artículos/Blog
    {
      codigo: 'articulos_listado',
      nombre: 'Artículos',
      descripcion: 'Listado de artículos',
      categoria: 'contenido',
      nivel: 0,
      es_plantilla: false,
      protegida: false,
      ruta_patron: '/articulos',
    },
    {
      codigo: 'articulos_categoria',
      nombre: 'Artículos - Categoría',
      descripcion: 'Artículos de una categoría específica',
      categoria: 'contenido',
      nivel: 1,
      es_plantilla: true,
      protegida: false,
      ruta_patron: '/articulos/categoria/:slug',
    },
    {
      codigo: 'articulos_single',
      nombre: 'Artículo - Detalle',
      descripcion: 'Página individual de artículo',
      categoria: 'contenido',
      nivel: 2,
      es_plantilla: true,
      protegida: false,
      ruta_patron: '/articulos/:slug',
    },

    // Videos
    {
      codigo: 'videos_listado',
      nombre: 'Videos',
      descripcion: 'Listado de videos',
      categoria: 'contenido',
      nivel: 0,
      es_plantilla: false,
      protegida: false,
      ruta_patron: '/videos',
    },
    {
      codigo: 'videos_categoria',
      nombre: 'Videos - Categoría',
      descripcion: 'Videos de una categoría específica',
      categoria: 'contenido',
      nivel: 1,
      es_plantilla: true,
      protegida: false,
      ruta_patron: '/videos/categoria/:slug',
    },
    {
      codigo: 'videos_single',
      nombre: 'Video - Detalle',
      descripcion: 'Página individual de video',
      categoria: 'contenido',
      nivel: 2,
      es_plantilla: true,
      protegida: false,
      ruta_patron: '/videos/:slug',
    },

    // Testimonios
    {
      codigo: 'testimonios',
      nombre: 'Testimonios',
      descripcion: 'Listado de testimonios',
      categoria: 'contenido',
      nivel: 0,
      es_plantilla: false,
      protegida: false,
      ruta_patron: '/testimonios',
    },
    {
      codigo: 'testimonio_single',
      nombre: 'Testimonio - Detalle',
      descripcion: 'Página individual de testimonio',
      categoria: 'contenido',
      nivel: 1,
      es_plantilla: true,
      protegida: false,
      ruta_patron: '/testimonios/:slug',
    },

    // Proyectos
    {
      codigo: 'directorio_proyectos',
      nombre: 'Proyectos',
      descripcion: 'Listado de proyectos',
      categoria: 'proyectos',
      nivel: 0,
      es_plantilla: false,
      protegida: false,
      ruta_patron: '/proyectos',
    },
    {
      codigo: 'single_proyecto',
      nombre: 'Proyecto - Detalle',
      descripcion: 'Página individual de proyecto',
      categoria: 'proyectos',
      nivel: 1,
      es_plantilla: true,
      protegida: false,
      ruta_patron: '/proyectos/:slug',
    },

    // Landing pages
    {
      codigo: 'landing_page',
      nombre: 'Landing Page',
      descripcion: 'Página de aterrizaje genérica',
      categoria: 'marketing',
      nivel: 0,
      es_plantilla: false,
      protegida: false,
      ruta_patron: '/landing/:slug',
    },
    {
      codigo: 'landing_proyecto',
      nombre: 'Landing - Proyecto',
      descripcion: 'Landing page específica de proyecto',
      categoria: 'marketing',
      nivel: 0,
      es_plantilla: false,
      protegida: false,
      ruta_patron: '/landing/proyecto/:slug',
    },
    {
      codigo: 'landing_subpagina',
      nombre: 'Landing - Subpágina',
      descripcion: 'Subpágina de landing',
      categoria: 'marketing',
      nivel: 0,
      es_plantilla: false,
      protegida: false,
      ruta_patron: '/landing/:parent/:slug',
    },

    // Legales
    {
      codigo: 'politicas_privacidad',
      nombre: 'Políticas de Privacidad',
      descripcion: 'Políticas de privacidad del sitio',
      categoria: 'legal',
      nivel: 0,
      es_plantilla: false,
      protegida: false,
      ruta_patron: '/politicas-privacidad',
    },
    {
      codigo: 'terminos_condiciones',
      nombre: 'Términos y Condiciones',
      descripcion: 'Términos y condiciones de uso',
      categoria: 'legal',
      nivel: 0,
      es_plantilla: false,
      protegida: false,
      ruta_patron: '/terminos-condiciones',
    },

    // Custom
    {
      codigo: 'custom',
      nombre: 'Página Personalizada',
      descripcion: 'Página personalizada creada por el usuario',
      categoria: 'custom',
      nivel: 0,
      es_plantilla: false,
      protegida: false,
      ruta_patron: null,
    },
  ];

  console.log('\n✅ Asegurando que existan los tipos estándar consolidados...\n');

  for (const tipo of tiposEstandar) {
    const exists = await knex('tipos_pagina')
      .where('codigo', tipo.codigo)
      .first();

    if (!exists) {
      await knex('tipos_pagina').insert({
        codigo: tipo.codigo,
        nombre: tipo.nombre,
        descripcion: tipo.descripcion,
        categoria: tipo.categoria,
        nivel: tipo.nivel,
        es_plantilla: tipo.es_plantilla,
        protegida: tipo.protegida,
        ruta_patron: tipo.ruta_patron,
        es_estandar: true,
        is_visible_default: true,
      });
      console.log(`✅ Creado: ${tipo.codigo}`);
    } else {
      // Actualizar con los nuevos campos
      await knex('tipos_pagina')
        .where('codigo', tipo.codigo)
        .update({
          categoria: tipo.categoria,
          nivel: tipo.nivel,
          es_plantilla: tipo.es_plantilla,
          protegida: tipo.protegida,
          ruta_patron: tipo.ruta_patron,
        });
      console.log(`↻ Actualizado: ${tipo.codigo}`);
    }
  }

  console.log('\n✅ Consolidación completada');
}

export async function down(knex: Knex): Promise<void> {
  console.log('⚠️  No se puede revertir esta migración de forma segura');
}
