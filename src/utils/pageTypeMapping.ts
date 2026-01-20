/**
 * Mapeo Centralizado de Tipos de Página
 * 
 * Este archivo centraliza todos los mapeos de tipos de página para evitar inconsistencias.
 * Todos los servicios deben usar estas constantes en lugar de hardcodear valores.
 */

/**
 * Tipos de página estándar del sistema
 */
export const STANDARD_PAGE_TYPES = {
  HOMEPAGE: 'homepage',
  LISTADOS_PROPIEDADES: 'listados_propiedades',
  SINGLE_PROPERTY: 'single_property',
  PROPIEDADES_LISTADO: 'propiedades_listado', // Alias de listados_propiedades
  BLOG: 'blog',
  CONTACTO: 'contacto',
  LANDING_PAGE: 'landing_page',
  POLITICAS_PRIVACIDAD: 'politicas_privacidad',
  TERMINOS_CONDICIONES: 'terminos_condiciones',
  CUSTOM: 'custom',
} as const;

/**
 * Mapeo de prefijos a tipos de página para contenido dinámico
 */
export const CONTENT_PREFIX_MAPPING: Record<string, {
  tipoDirectorio: string;
  tipoCategoria: string;
  tipoSingle: string;
}> = {
  'testimonios': {
    tipoDirectorio: 'testimonios_listado',
    tipoCategoria: 'categoria_testimonios',
    tipoSingle: 'testimonios_single',
  },
  'videos': {
    tipoDirectorio: 'videos_listado',
    tipoCategoria: 'videos_categoria',
    tipoSingle: 'videos_single',
  },
  'articulos': {
    tipoDirectorio: 'articulos_listado',
    tipoCategoria: 'articulos_categoria',
    tipoSingle: 'articulos_single',
  },
  'blog': {
    tipoDirectorio: 'articulos_listado',
    tipoCategoria: 'articulos_categoria',
    tipoSingle: 'articulos_single',
  },
  'asesores': {
    tipoDirectorio: 'listado_asesores',
    tipoCategoria: 'categoria_asesores',
    tipoSingle: 'asesor_single',
  },
  'proyectos': {
    tipoDirectorio: 'directorio_proyectos',
    tipoCategoria: 'categoria_proyectos',
    tipoSingle: 'single_proyecto',
  },
  'propiedades': {
    tipoDirectorio: 'propiedades_listado',
    tipoCategoria: 'categoria_propiedades',
    tipoSingle: 'propiedades_single',
  },
  'favoritos': {
    tipoDirectorio: 'favoritos',
    tipoCategoria: 'categoria_favoritos',
    tipoSingle: 'favorito_single',
  },
  'propuestas': {
    tipoDirectorio: 'propuestas',
    tipoCategoria: 'categoria_propuestas',
    tipoSingle: 'propuesta_single',
  },
  'ubicaciones': {
    tipoDirectorio: 'ubicaciones',
    tipoCategoria: 'categoria_ubicaciones',
    tipoSingle: 'ubicacion_single',
  },
  'tipos-de-propiedades': {
    tipoDirectorio: 'tipos_propiedades',
    tipoCategoria: 'categoria_tipos_propiedades',
    tipoSingle: 'tipo_propiedad_single',
  },
  'listados-de-propiedades': {
    tipoDirectorio: 'listados_curados',
    tipoCategoria: 'categoria_listados_curados',
    tipoSingle: 'listado_curado_single',
  },
} as const;

/**
 * Mapeo de tipos de datos dinámicos
 */
export const DYNAMIC_DATA_TYPE_MAPPING: Record<string, string> = {
  // Listas
  'properties': 'propiedades',
  'propiedades': 'propiedades',
  'videos': 'lista_videos',
  'articles': 'lista_articulos',
  'articulos': 'lista_articulos',
  'testimonials': 'lista_testimonios',
  'testimonios': 'lista_testimonios',
  'faqs': 'lista_faqs',
  'agents': 'lista_asesores',
  'asesores': 'lista_asesores',
  'lista_asesores': 'lista_asesores',
  
  // Singles (requieren id en filters o queryParams)
  'property_single': 'propiedad_single',
  'propiedad_single': 'propiedad_single',
  'video_single': 'video_single',
  'article_single': 'articulo_single',
  'articulo_single': 'articulo_single',
  'testimonial_single': 'testimonio_single',
  'testimonio_single': 'testimonio_single',
  'faq_single': 'faq_single',
  'agent_single': 'asesor_single',
  'asesor_single': 'asesor_single',

  // Listas de videos (aliases directos)
  'lista_videos': 'lista_videos',
  'categoria_videos': 'categoria_videos',

  // Listas de artículos (aliases directos)
  'lista_articulos': 'lista_articulos',
  'categoria_articulos': 'categoria_articulos',

  // Listas de testimonios (aliases directos)
  'lista_testimonios': 'lista_testimonios',
  'categoria_testimonios': 'categoria_testimonios',

  // Categorías
  'categorias_videos': 'categorias_videos',
  'categorias_articulos': 'categorias_articulos',
  'categorias_testimonios': 'categorias_testimonios',
  'categorias_asesores': 'categorias_asesores',
  
  // Otros
  'stats': 'stats',
  'estadisticas': 'stats',
  'carrusel_propiedades': 'carrusel_propiedades',
  'carrusel': 'carrusel_propiedades',
  'texto_suelto': 'texto_suelto',
  'texto': 'texto_suelto',
} as const;

/**
 * Tipos de datos dinámicos válidos
 */
export const VALID_DYNAMIC_DATA_TYPES = new Set(Object.keys(DYNAMIC_DATA_TYPE_MAPPING));

/**
 * Valida si un tipo de página es válido
 */
export async function validatePageType(tipoPagina: string): Promise<boolean> {
  // Verificar contra tipos estándar
  const standardTypes = Object.values(STANDARD_PAGE_TYPES);
  if (standardTypes.includes(tipoPagina as any)) {
    return true;
  }

  // Verificar contra mapeo de contenido
  const contentTypes = Object.values(CONTENT_PREFIX_MAPPING).flatMap(m => [
    m.tipoDirectorio,
    m.tipoCategoria,
    m.tipoSingle,
  ]);
  if (contentTypes.includes(tipoPagina)) {
    return true;
  }

  // Verificar en base de datos
  try {
    const { query } = await import('../utils/db.js');
    const result = await query(
      'SELECT codigo FROM tipos_pagina WHERE codigo = $1',
      [tipoPagina]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error validando tipo de página:', error);
    return false;
  }
}

/**
 * Obtiene el tipo de página normalizado
 * Nota: Ya no convertimos entre propiedades_listado y listados_propiedades
 * porque la BD tiene propiedades_listado como tipo canónico
 */
export function normalizePageType(tipoPagina: string): string {
  // Por ahora, retornamos el tipo tal cual
  // La normalización se puede agregar si hay casos específicos que lo requieran
  return tipoPagina;
}

/**
 * Obtiene el tipo de dato dinámico normalizado
 */
export function normalizeDynamicDataType(dataType: string): string {
  return DYNAMIC_DATA_TYPE_MAPPING[dataType] || dataType;
}













