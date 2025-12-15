/**
 * routeResolver.ts
 *
 * Servicio para resolver cualquier URL y devolver la página completa
 * El frontend es "tonto" - solo envía la URL y recibe todo listo para renderizar
 *
 * LÓGICA DE RESOLUCIÓN:
 * 1. Extraer idioma del pathname (/en/, /fr/, /pt/ o español por defecto)
 * 2. Identificar si el primer segmento es un PREFIJO CONOCIDO (testimonios, videos, etc.)
 *    → SÍ: Usar nivel_navegacion del tenant para determinar si es directorio/categoría/single
 *    → NO: Es búsqueda de propiedades, descomponer tags y verificar si último es slug de propiedad
 * 3. Devolver página con datos ya resueltos
 */

// LIMPIEZA: Ya no usamos paginasService, todo va por getSeccionesResueltas
// import { getPaginaCompleta } from './paginasService.js';
import { getPropiedadById } from './propertiesService.js';
import type { PaginaCompletaResponse } from './paginasService.js';
import { query } from '../utils/db.js';
import { CONTENT_PREFIX_MAPPING, STANDARD_PAGE_TYPES, validatePageType, normalizePageType } from '../utils/pageTypeMapping.js';

// Idiomas soportados
const IDIOMAS_SOPORTADOS = ['es', 'en', 'fr', 'pt'];

// ============================================================================
// FUNCIONES PARA PLANTILLAS
// ============================================================================

interface PlantillaComponente {
  codigo: string;
  orden: number;
  configuracion?: Record<string, any>;
}

interface Plantilla {
  id: string;
  codigo: string;
  tipo_pagina: string;
  nombre: string;
  componentes: PlantillaComponente[];
  estilos?: Record<string, any>;
}

/**
 * Obtiene la plantilla por defecto para un tipo de página
 */
async function getPlantillaDefault(tipoPagina: string): Promise<Plantilla | null> {
  const sql = `
    SELECT id, codigo, tipo_pagina, nombre, componentes, estilos
    FROM plantillas_pagina
    WHERE tipo_pagina = $1 AND visible = true
    ORDER BY featured DESC, orden ASC
    LIMIT 1
  `;
  const result = await query(sql, [tipoPagina]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    codigo: row.codigo,
    tipo_pagina: row.tipo_pagina,
    nombre: row.nombre,
    componentes: parseJsonField(row.componentes) || [],
    estilos: parseJsonField(row.estilos) || {},
  };
}

/**
 * Convierte los componentes de una plantilla a formato de renderizado
 */
function plantillaToComponents(plantilla: Plantilla): any[] {
  return plantilla.componentes.map((comp, index) => ({
    id: `plantilla-${plantilla.codigo}-${index}`,
    tipo: comp.codigo.split('-')[0] || comp.codigo, // header-default -> header
    variante: comp.codigo.includes('-') ? comp.codigo.split('-').slice(1).join('-') : 'default',
    datos: comp.configuracion || {},
    orden: comp.orden,
    activo: true,
  }));
}

/**
 * Obtiene el tema del tenant
 */
async function getTenantTheme(tenantId: string): Promise<Record<string, any> | null> {
  const sql = `
    SELECT colores FROM temas_tenant
    WHERE tenant_id = $1 AND activo = true
    LIMIT 1
  `;
  const result = await query(sql, [tenantId]);

  if (result.rows.length === 0) {
    return null;
  }

  return parseJsonField(result.rows[0].colores);
}

// ============================================================================
// INTERFACES
// ============================================================================

interface RutaConfig {
  prefijo: string;
  nivel_navegacion: number;
  alias_idiomas: Record<string, string>;
  habilitado: boolean;
}

interface TagPropiedad {
  slug: string;
  tipo: string;
  valor: string;
  campo_query: string;
  operador: string;
  alias_idiomas: Record<string, string>;
  nombre_idiomas: Record<string, string>;
}

interface RouteResolution {
  tipo: 'contenido' | 'propiedad_single' | 'propiedad_listado' | 'pagina_estatica' | 'homepage';
  prefijo?: string;
  nivel?: number; // 0=directorio, 1=categoría, 2=single
  categoria?: string;
  slug?: string;
  tags?: TagPropiedad[];
  idioma: string;
}

/**
 * Parámetros de tracking extraídos del query string
 */
interface TrackingParams {
  ref?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  [key: string]: string | undefined; // Otros parámetros de tracking
}

/**
 * Resultado de parsear la URL
 */
interface ParsedUrl {
  pathname: string;           // Path limpio sin query string
  tracking: TrackingParams;   // Parámetros de tracking
  queryParams: Record<string, string>; // Todos los query params originales
}

// ============================================================================
// PARSER DE URL CON TRACKING
// ============================================================================

/**
 * Extrae query strings de una URL, separando parámetros de tracking
 * @param fullUrl URL completa que puede incluir query string (ej: "/asesores/juan?ref=123&utm_source=google")
 * @returns Objeto con pathname limpio, tracking params y todos los query params
 */
function parseUrlWithTracking(fullUrl: string): ParsedUrl {
  // Parámetros conocidos de tracking
  const TRACKING_PARAMS = [
    'ref', 'referrer', 'referral',
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'fbclid', 'gclid', 'dclid', 'msclkid', // IDs de click de redes
    'source', 'medium', 'campaign',
    '_ga', '_gl', // Google Analytics
  ];

  let pathname = fullUrl;
  const tracking: TrackingParams = {};
  const queryParams: Record<string, string> = {};

  // Buscar si hay query string
  const queryIndex = fullUrl.indexOf('?');
  if (queryIndex !== -1) {
    pathname = fullUrl.substring(0, queryIndex);
    const queryString = fullUrl.substring(queryIndex + 1);

    // Parsear query params
    if (queryString) {
      const params = queryString.split('&');
      for (const param of params) {
        const [key, value] = param.split('=');
        if (key) {
          const decodedKey = decodeURIComponent(key);
          const decodedValue = value ? decodeURIComponent(value) : '';

          queryParams[decodedKey] = decodedValue;

          // Si es un parámetro de tracking, agregarlo a tracking
          if (TRACKING_PARAMS.includes(decodedKey.toLowerCase())) {
            tracking[decodedKey] = decodedValue;
          }
        }
      }
    }
  }

  // Limpiar pathname
  pathname = pathname || '/';
  if (!pathname.startsWith('/')) {
    pathname = '/' + pathname;
  }

  return {
    pathname,
    tracking,
    queryParams,
  };
}

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

/**
 * Resuelve cualquier URL y devuelve la página completa lista para renderizar
 */
export async function resolveRoute(
  tenantId: string,
  pathname: string
): Promise<PaginaCompletaResponse | null> {
  try {
    console.log(`🔍 [RouteResolver] Resolviendo: ${pathname} para tenant ${tenantId}`);

    // 0. PRIMERO: Extraer query strings (tracking, ref, utm) de la URL
    const { pathname: cleanPathname, tracking, queryParams } = parseUrlWithTracking(pathname);

    if (Object.keys(tracking).length > 0) {
      console.log(`   📊 Tracking params detectados:`, tracking);
    }
    if (Object.keys(queryParams).length > 0) {
      console.log(`   🔗 Query params:`, queryParams);
    }

    // 0.5. Resolver datos de tracking (incluye búsqueda de usuario referidor)
    const trackingData = await resolveTrackingData(tenantId, tracking);

    // 1. Extraer idioma del pathname limpio (sin query string)
    const { idioma, cleanPath } = extractIdioma(cleanPathname);
    const normalizedPath = normalizePath(cleanPath);

    console.log(`🌐 [RouteResolver] Idioma extraído:`, {
      pathnameOriginal: pathname,
      cleanPathname,
      idiomaExtraido: idioma,
      cleanPath,
      normalizedPath
    });

    // 2. Si es homepage, resolver directamente
    if (normalizedPath === '/') {
      const result = await resolveHomepage(tenantId, idioma, trackingData);
      return addTrackingToResponse(result, tracking, queryParams);
    }

    // 3. Parsear segmentos de la URL
    const segmentos = normalizedPath.split('/').filter(Boolean);
    if (segmentos.length === 0) {
      const result = await resolveHomepage(tenantId, idioma, trackingData);
      return addTrackingToResponse(result, tracking, queryParams);
    }

    const primerSegmento = segmentos[0];

    // 4. Obtener configuración de rutas del tenant
    const rutasConfig = await getRutasConfigTenant(tenantId);

    // 5. Buscar si el primer segmento es un prefijo conocido
    const configPrefijo = findPrefijoConfig(primerSegmento, rutasConfig, idioma);

    if (configPrefijo) {
      // Es contenido con prefijo conocido (testimonios, videos, etc.)
      console.log(`   ✅ Prefijo encontrado: ${configPrefijo.prefijo} (nivel: ${configPrefijo.nivel_navegacion})`);
      const result = await resolveContenidoPrefijo(tenantId, configPrefijo, segmentos, idioma, trackingData);
      return addTrackingToResponse(result, tracking, queryParams);
    }

    // 6. No es prefijo conocido → Es búsqueda de propiedades
    console.log(`   🏠 No es prefijo conocido, resolviendo como propiedades`);
    const result = await resolvePropiedades(tenantId, segmentos, idioma, trackingData);
    return addTrackingToResponse(result, tracking, queryParams);

  } catch (error: any) {
    console.error('❌ [RouteResolver] Error:', error);
    console.error('❌ [RouteResolver] Stack:', error.stack);
    throw new Error(`Error al resolver ruta: ${error.message}`);
  }
}

/**
 * Agrega tracking params y query params a la respuesta
 */
function addTrackingToResponse(
  response: PaginaCompletaResponse | null,
  tracking: TrackingParams,
  queryParams: Record<string, string>
): PaginaCompletaResponse | null {
  if (!response) return null;

  return {
    ...response,
    tracking: Object.keys(tracking).length > 0 ? tracking : undefined,
    queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined,
  } as any;
}

// ============================================================================
// EXTRACCIÓN DE IDIOMA
// ============================================================================

function extractIdioma(pathname: string): { idioma: string; cleanPath: string } {
  const match = pathname.match(/^\/([a-z]{2})(\/.*)?$/);
  if (match && IDIOMAS_SOPORTADOS.includes(match[1])) {
    return {
      idioma: match[1],
      cleanPath: match[2] || '/'
    };
  }
  return { idioma: 'es', cleanPath: pathname };
}

function normalizePath(path: string): string {
  let normalized = (path || '/').trim();
  if (!normalized.startsWith('/')) normalized = '/' + normalized;
  normalized = normalized.replace(/\/+/g, '/');
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

// ============================================================================
// CONFIGURACIÓN DE RUTAS DEL TENANT
// ============================================================================

/**
 * Obtiene rutas disponibles desde tipos_pagina (fuente de verdad) y tenants_rutas_config_custom
 * ARQUITECTURA:
 * 1. PRIMERO: tipos_pagina (fuente de verdad con ruta_patron, nivel, alias_rutas)
 * 2. SEGUNDO: tenants_rutas_config_custom (rutas personalizadas del tenant)
 *
 * NOTA: tenants_rutas_config fue OBSOLETA y ELIMINADA - todas las rutas estándar
 * ahora vienen de tipos_pagina.alias_rutas
 */
async function getRutasConfigTenant(tenantId: string): Promise<RutaConfig[]> {
  const rutasMap = new Map<string, RutaConfig>();

  // 1. FUENTE DE VERDAD: tipos_pagina (rutas estándar del sistema)
  const tiposPaginaSql = `
    SELECT
      codigo,
      ruta_patron,
      nivel,
      alias_rutas,
      visible,
      publico
    FROM tipos_pagina
    WHERE visible = true AND publico = true
    ORDER BY codigo ASC
  `;
  const tiposResult = await query(tiposPaginaSql, []);

  // Agrupar por prefijo y detectar si tiene categorías
  for (const tipo of tiposResult.rows) {
    const patron = tipo.ruta_patron || '';
    const match = patron.match(/^\/([^/:]+)/);
    if (!match) continue;

    const prefijo = match[1];

    // Detectar si esta ruta incluye "categoria" como segmento estático
    const tieneCategoria = patron.includes('/categoria/');

    // Calcular nivel basado en:
    // - nivel 0: solo /prefijo
    // - nivel 1: /prefijo/:slug (sin categoria)
    // - nivel 2: /prefijo/categoria/:slug (con categoria)
    let nivelCalculado = 0;
    if (patron === `/${prefijo}`) {
      nivelCalculado = 0; // Solo directorio
    } else if (tieneCategoria) {
      nivelCalculado = 2; // Tiene categorías
    } else if (patron.includes('/:')) {
      nivelCalculado = 1; // Tiene slug pero sin categoría
    }

    const rutaExistente = rutasMap.get(prefijo);
    if (rutaExistente) {
      // Actualizar con el nivel más alto encontrado
      if (nivelCalculado > rutaExistente.nivel_navegacion) {
        rutasMap.set(prefijo, {
          ...rutaExistente,
          nivel_navegacion: nivelCalculado,
        });
      }
    } else {
      rutasMap.set(prefijo, {
        prefijo,
        nivel_navegacion: nivelCalculado,
        alias_idiomas: parseJsonField(tipo.alias_rutas) || {},
        habilitado: true,
      });
    }
  }

  // 2. FALLBACK: tenants_rutas_config_custom (rutas personalizadas del tenant)
  const customSql = `
    SELECT prefijo, nivel_navegacion, alias_idiomas, habilitado
    FROM tenants_rutas_config_custom
    WHERE tenant_id = $1 AND habilitado = true
    ORDER BY orden ASC
  `;
  const customResult = await query(customSql, [tenantId]);

  for (const row of customResult.rows) {
    // Agregar solo si no existe ya (tipos_pagina tiene prioridad)
    if (!rutasMap.has(row.prefijo)) {
      rutasMap.set(row.prefijo, {
        prefijo: row.prefijo,
        nivel_navegacion: row.nivel_navegacion,
        alias_idiomas: parseJsonField(row.alias_idiomas),
        habilitado: row.habilitado,
      });
    }
  }

  return Array.from(rutasMap.values());
}

/**
 * Verifica si un slug corresponde a una categoría existente en categorias_contenido
 * Busca tanto en slug (español por defecto) como en slug_traducciones (otros idiomas)
 *
 * @param tenantId - ID del tenant
 * @param tipoContenido - Tipo de contenido (ej: 'testimonio', 'video', 'articulo')
 * @param slug - Slug a buscar
 * @param idioma - Código de idioma (opcional, por defecto 'es')
 * @returns La categoría encontrada o null
 */
async function findCategoriaBySlug(
  tenantId: string,
  tipoContenido: string,
  slug: string,
  idioma: string = 'es'
): Promise<any | null> {
  try {
    // Buscar categoría por slug en español O en traducciones
    const sql = `
      SELECT id, slug, nombre, tipo, slug_traducciones
      FROM categorias_contenido
      WHERE tenant_id = $1
        AND tipo = $2
        AND activa = true
        AND (
          slug = $3
          OR slug_traducciones ->> $4 = $3
        )
      LIMIT 1
    `;

    const result = await query(sql, [tenantId, tipoContenido, slug, idioma]);

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    return null;
  } catch (error) {
    console.error(`❌ Error buscando categoría ${tipoContenido}/${slug}:`, error);
    return null;
  }
}

/**
 * Busca un usuario referidor por su código de referencia (ref)
 *
 * Mejora arquitectónica: Ahora busca en usuarios_tenants (no solo perfiles_asesor)
 * Esto permite que cualquier tipo de usuario pueda ser referidor:
 * - Asesores (con perfil_asesor)
 * - Clientes VIP
 * - Asesores independientes
 * - Embajadores / Afiliados
 *
 * @param tenantId - ID del tenant
 * @param ref - Código de referencia del usuario
 * @returns Usuario encontrado con toda su información o null
 */
async function findUsuarioByRef(
  tenantId: string,
  ref: string
): Promise<any | null> {
  try {
    const sql = `
      SELECT
        ut.usuario_id,
        ut.tenant_id,
        ut.ref,
        ut.es_owner,
        u.id as usuario_id,
        u.nombre,
        u.apellido,
        u.email,
        pa.id as perfil_asesor_id,
        pa.slug as asesor_slug,
        pa.activo as es_asesor_activo
      FROM usuarios_tenants ut
      INNER JOIN usuarios u ON ut.usuario_id = u.id
      LEFT JOIN perfiles_asesor pa ON pa.usuario_id = u.id AND pa.tenant_id = ut.tenant_id
      WHERE ut.tenant_id = $1
        AND ut.ref = $2
        AND ut.activo = true
      LIMIT 1
    `;

    const result = await query(sql, [tenantId, ref]);

    if (result.rows.length > 0) {
      const usuario = result.rows[0];
      return {
        ...usuario,
        tipo_referidor: usuario.perfil_asesor_id ? 'asesor' : 'otro',
        tiene_perfil_asesor: !!usuario.perfil_asesor_id,
      };
    }

    return null;
  } catch (error) {
    console.error(`❌ Error buscando usuario por ref ${ref}:`, error);
    return null;
  }
}

/**
 * Resuelve la información de tracking incluyendo búsqueda del usuario referidor
 * Esta función centraliza toda la lógica de tracking para evitar duplicación
 */
async function resolveTrackingData(
  tenantId: string,
  tracking: Record<string, string>
): Promise<{
  tracking: Record<string, string>;
  usuarioReferidor: any | null;
}> {
  let usuarioReferidor = null;

  if (tracking && tracking.ref) {
    usuarioReferidor = await findUsuarioByRef(tenantId, tracking.ref);
    if (usuarioReferidor) {
      console.log(`   👤 Usuario referidor encontrado: ${usuarioReferidor.nombre} ${usuarioReferidor.apellido} (ref: ${tracking.ref}, tipo: ${usuarioReferidor.tipo_referidor})`);
    } else {
      console.log(`   ⚠️  Ref ${tracking.ref} no encontrado en usuarios_tenants`);
    }
  }

  return {
    tracking,
    usuarioReferidor,
  };
}

/**
 * Busca si un segmento corresponde a un prefijo configurado (en cualquier idioma)
 */
function findPrefijoConfig(
  segmento: string,
  rutasConfig: RutaConfig[],
  idioma: string
): RutaConfig | null {
  for (const config of rutasConfig) {
    // Comparar con prefijo en español
    if (config.prefijo === segmento) {
      return config;
    }

    // Comparar con alias del idioma actual
    const alias = config.alias_idiomas[idioma];
    if (alias && alias === segmento) {
      return config;
    }

    // Comparar con todos los aliases
    for (const lang of Object.keys(config.alias_idiomas)) {
      if (config.alias_idiomas[lang] === segmento) {
        return config;
      }
    }
  }
  return null;
}

// ============================================================================
// RESOLUCIÓN DE HOMEPAGE
// ============================================================================

async function resolveHomepage(
  tenantId: string,
  idioma: string,
  trackingData: { tracking: Record<string, string>; usuarioReferidor: any | null }
): Promise<PaginaCompletaResponse | null> {
  const { tracking, usuarioReferidor } = trackingData;
  console.log(`   🏠 Resolviendo homepage`);

  // FLUJO LIMPIO: Solo usar getSeccionesResueltas
  const { getSeccionesResueltas } = await import('./seccionesService.js');
  const { resolveDynamicData } = await import('./dynamicDataResolver.js');
  const theme = await getTenantTheme(tenantId);
  const idiomasDisponibles = await getIdiomasDisponiblesTenant(tenantId);

  const tipoPagina = 'homepage';

  // ARQUITECTURA ACTUAL: Los componentes de homepage se obtienen de componentes_web
  // vinculados directamente al tipo_pagina 'homepage' para este tenant.
  // Ya NO se usa paginas_web (tabla obsoleta)
  // NUEVO: Pasamos el idioma para traducir componentes y datos dinámicos
  let secciones = await getSeccionesResueltas(tenantId, tipoPagina, undefined, undefined, idioma);

  // Resolver datos dinámicos para cada componente que tenga dynamic_data
  secciones = await Promise.all(
    secciones.map(async (seccion) => {
      if (seccion.datos?.dynamic_data?.dataType) {
        console.log(`   🔄 Resolviendo dynamic_data para ${seccion.tipo}: ${seccion.datos.dynamic_data.dataType} (idioma: ${idioma})`);
        try {
          // Pasar el idioma al resolver de datos dinámicos
          const resolvedData = await resolveDynamicData(seccion.datos.dynamic_data, tenantId, idioma);
          console.log(`   ✅ Datos resueltos: ${Array.isArray(resolvedData) ? resolvedData.length : 1} elementos`);

          return {
            ...seccion,
            datos: {
              ...seccion.datos,
              dynamic_data: {
                ...seccion.datos.dynamic_data,
                resolved: resolvedData,
              },
            },
          };
        } catch (error) {
          console.error(`   ❌ Error resolviendo dynamic_data para ${seccion.tipo}:`, error);
        }
      }
      return seccion;
    })
  );

  // Si no hay componentes, agregar componente de debug
  const componentsToReturn = secciones.length > 0
    ? secciones.map(s => ({
        id: s.id,
        tipo: s.tipo,
        componente_key: s.componente_key,
        variante: s.variante,
        datos: s.datos,
        activo: s.activo,
        orden: s.orden,
        paginaId: s.paginaId,
        predeterminado: true,
      }))
    : [{
        id: 'debug-fallback-homepage',
        tipo: 'debug',
        variante: 'info',
        datos: {
          title: `🎯 DEBUG - Homepage | Tipo: ${tipoPagina}`,
          subtitle: `Tenant: ${tenantId} | Idioma: ${idioma}${usuarioReferidor ? ` | Ref: ${tracking?.ref} ✅` : ''}`,
          details: {
            tipoPagina: tipoPagina,
            tenantId: tenantId,
            idioma: idioma,
            ref: tracking?.ref || 'N/A',
            referidorEncontrado: usuarioReferidor ? 'Sí' : 'No',
            referidorNombre: usuarioReferidor ? `${usuarioReferidor.nombre} ${usuarioReferidor.apellido}` : 'N/A',
            referidorTipo: usuarioReferidor?.tipo_referidor || 'N/A',
          },
          mensaje: 'No hay componentes configurados para la homepage',
          rawData: JSON.stringify({
            tipo: tipoPagina,
            tenant: tenantId,
            idioma: idioma,
            tracking: tracking || {},
            usuarioReferidor: usuarioReferidor || null,
          }, null, 2),
        },
        activo: true,
        orden: 0,
        predeterminado: true,
      }];

  return {
    page: {
      id: 'homepage',
      tenantId,
      tipoPagina,
      titulo: 'Inicio',
      slug: '/',
      descripcion: 'Página de inicio',
      publica: true,
      activa: true,
    },
    theme: theme || {},
    components: componentsToReturn,
    idioma,
    idiomasDisponibles,
    dynamicPage: true,
  } as any;
}

// ============================================================================
// RESOLUCIÓN DE CONTENIDO CON PREFIJO
// ============================================================================

/**
 * Resuelve contenido cuando el primer segmento es un prefijo conocido
 * Usa nivel_navegacion para determinar qué es cada segmento:
 * - nivel 0: /testimonios/ = directorio (solo listado)
 * - nivel 1: /testimonios/slug = directorio + single
 * - nivel 2: /testimonios/categoria/slug = directorio + categoría + single
 *
 * IMPORTANTE: Los segmentos extra NO causan 404, se guardan como unknownSegments
 * IMPORTANTE: Si un single no existe, se muestra el directorio con el slug como segmento desconocido
 */
async function resolveContenidoPrefijo(
  tenantId: string,
  config: RutaConfig,
  segmentos: string[],
  idioma: string,
  trackingData: { tracking: Record<string, string>; usuarioReferidor: any | null }
): Promise<PaginaCompletaResponse | null> {
  const { tracking, usuarioReferidor } = trackingData;
  const nivel = config.nivel_navegacion;
  const cantidadSegmentos = segmentos.length - 1; // Excluir el prefijo

  console.log(`   Nivel navegación: ${nivel}, Segmentos después de prefijo: ${cantidadSegmentos}`);

  // Determinar qué tipo de página es según nivel y segmentos
  let tipoPagina: 'directorio' | 'categoria' | 'single';
  let categoria: string | null = null;
  let slug: string | null = null;
  let unknownSegments: string[] = [];

  if (cantidadSegmentos === 0) {
    // Solo prefijo: /testimonios/
    tipoPagina = 'directorio';
  } else if (nivel === 0) {
    // Nivel 0: solo directorio, cualquier segmento extra es single
    tipoPagina = 'single';
    slug = segmentos[1];
    // Segmentos extra después del slug se guardan
    if (cantidadSegmentos > 1) {
      unknownSegments = segmentos.slice(2);
    }
  } else if (nivel === 1) {
    // Nivel 1: directorio + single
    // El segundo segmento siempre es el slug
    tipoPagina = cantidadSegmentos >= 1 ? 'single' : 'directorio';
    if (cantidadSegmentos >= 1) {
      slug = segmentos[1];
      // Segmentos extra después del slug se guardan
      if (cantidadSegmentos > 1) {
        unknownSegments = segmentos.slice(2);
      }
    }
  } else if (nivel === 2) {
    // Nivel 2: directorio + categoría + single
    if (cantidadSegmentos === 1) {
      tipoPagina = 'categoria';
      categoria = segmentos[1];
    } else if (cantidadSegmentos >= 2) {
      tipoPagina = 'single';
      categoria = segmentos[1];
      slug = segmentos[2];
      // Segmentos extra después del slug se guardan
      if (cantidadSegmentos > 2) {
        unknownSegments = segmentos.slice(3);
      }
    } else {
      tipoPagina = 'directorio';
    }
  } else {
    // Nivel no reconocido - tratar como directorio con segmentos desconocidos
    tipoPagina = 'directorio';
    unknownSegments = segmentos.slice(1);
  }

  if (unknownSegments.length > 0) {
    console.log(`   ❓ Segmentos extra (guardados): ${unknownSegments.join('/')}`);
  }
  console.log(`   Tipo página: ${tipoPagina}, Categoría: ${categoria}, Slug: ${slug}`);

  // Resolver según el tipo de contenido y nivel
  let result = await resolveContenidoDinamico(
    tenantId,
    config.prefijo,
    tipoPagina,
    categoria,
    slug,
    idioma,
    trackingData
  );

  // Si el single no existe, mantener el tipo single pero con datos vacíos
  // Esto permite ver el tipo de página correcto durante desarrollo
  if (!result && tipoPagina === 'single') {
    console.log(`   ⚠️ Single no encontrado, manteniendo tipo single con datos vacíos`);

    // Mapeo de prefijo a tipo de página single
    // IMPORTANTE: Estos nombres deben coincidir con componentes_web.tipo_pagina
    const mapeoSingle: Record<string, string> = {
      'testimonios': 'single_testimonio',
      'videos': 'videos_single',
      'articulos': 'single_articulo',
      'blog': 'single_articulo',
      'asesores': 'single_asesor',
      'proyectos': 'single_proyecto',
      'propiedades': 'single_property',
    };

    const tipoPaginaCodigo = mapeoSingle[config.prefijo] || `single_${config.prefijo}`;
    const theme = await getTenantTheme(tenantId);
    const idiomasDisponibles = await getIdiomasDisponiblesTenant(tenantId);

    return {
      page: {
        id: `single-${config.prefijo}-${slug}`,
        tenantId,
        tipoPagina: tipoPaginaCodigo,
        titulo: slug?.replace(/-/g, ' ').toUpperCase() || config.prefijo,
        slug: `/${config.prefijo}${categoria ? '/' + categoria : ''}${slug ? '/' + slug : ''}`,
        descripcion: `Página single de ${config.prefijo}`,
        publica: true,
        activa: true,
      },
      theme: theme || {},
      components: [], // Se llenarán por getSeccionesResueltas
      idioma,
      idiomasDisponibles,
      resolvedData: null,
      singleNotFound: slug,
      dynamicPage: true,
    } as any;
  }

  // Agregar segmentos desconocidos a la respuesta
  if (result && unknownSegments.length > 0) {
    return {
      ...result,
      unknownSegments,
    } as any;
  }

  return result;
}

/**
 * Resuelve contenido dinámico (testimonios, videos, artículos, etc.)
 * SIMPLIFICADO: Solo determina el tipoPagina y usa getPaginaCompleta (que ya usa getSeccionesResueltas)
 */
async function resolveContenidoDinamico(
  tenantId: string,
  prefijo: string,
  tipoPagina: 'directorio' | 'categoria' | 'single',
  categoria: string | null,
  slug: string | null,
  idioma: string,
  trackingData: { tracking: Record<string, string>; usuarioReferidor: any | null }
): Promise<PaginaCompletaResponse | null> {
  const { tracking, usuarioReferidor } = trackingData;
  // Mapeo de prefijo a tipos de página específicos
  // tipoCategoria se usa cuando nivel_navegacion=2 y hay 1 segmento (intermedio entre directorio y single)
  // Usar mapeo centralizado
  const config = CONTENT_PREFIX_MAPPING[prefijo];
  if (!config) {
    // Es página estática (contacto, nosotros, etc.)
    return await resolvePaginaEstatica(tenantId, prefijo, idioma);
  }

  // Determinar tipo de página específico según el tipo detectado
  let tipoPaginaCodigo: string;
  if (tipoPagina === 'single') {
    tipoPaginaCodigo = config.tipoSingle;
  } else if (tipoPagina === 'categoria') {
    tipoPaginaCodigo = config.tipoCategoria;
  } else {
    tipoPaginaCodigo = config.tipoDirectorio;
  }

  // DEBUG: Mostrar detección de tipo de página
  console.log(`   🎯 DEBUG TIPO DETECTADO:`);
  console.log(`      - Prefijo: ${prefijo}`);
  console.log(`      - Nivel detectado: ${tipoPagina} (directorio/categoria/single)`);
  console.log(`      - Tipo de página código ANTES de normalizar: ${tipoPaginaCodigo}`);

  // Normalizar y validar tipo de página
  tipoPaginaCodigo = normalizePageType(tipoPaginaCodigo);
  const isValid = await validatePageType(tipoPaginaCodigo);
  if (!isValid) {
    console.warn(`   ⚠️ Tipo de página no válido: ${tipoPaginaCodigo}, usando fallback`);
    tipoPaginaCodigo = STANDARD_PAGE_TYPES.HOMEPAGE;
  }

  console.log(`      - Tipo de página código DESPUÉS de normalizar: ${tipoPaginaCodigo}`);
  console.log(`      - ¿Es válido?: ${isValid ? '✅ SÍ' : '❌ NO (usando fallback)'}`);
  console.log(`   🔍 RESULTADO FINAL: ${tipoPaginaCodigo}`);

  // Construir slug de la página
  const paginaSlug = `/${prefijo}${categoria ? '/' + categoria : ''}${slug ? '/' + slug : ''}`;

  // Obtener tema e idiomas
  const theme = await getTenantTheme(tenantId);
  const idiomasDisponibles = await getIdiomasDisponiblesTenant(tenantId);

  // SIEMPRE usar getSeccionesResueltas con el TIPO DE PÁGINA (tipoPaginaCodigo)
  // getSeccionesResueltas busca componentes por tipo de página (ej: 'videos_directory', 'videos_single', 'asesores_directory')
  const { getSeccionesResueltas } = await import('./seccionesService.js');
  const { resolveDynamicData } = await import('./dynamicDataResolver.js');
  // Páginas dinámicas son sistema, usar tipoPaginaCodigo para buscar componentes
  // NUEVO: Pasamos el idioma para traducir componentes y datos dinámicos
  let secciones = await getSeccionesResueltas(tenantId, tipoPaginaCodigo, undefined, undefined, idioma);

  // Resolver datos dinámicos para cada componente que tenga dynamic_data
  secciones = await Promise.all(
    secciones.map(async (seccion) => {
      if (seccion.datos?.dynamic_data?.dataType) {
        console.log(`   🔄 Resolviendo dynamic_data para ${seccion.tipo}: ${seccion.datos.dynamic_data.dataType}`);
        try {
          // Para páginas single, agregar el slug como filtro
          let dynamicConfig = { ...seccion.datos.dynamic_data };
          if (tipoPagina === 'single' && slug) {
            dynamicConfig = {
              ...dynamicConfig,
              filters: {
                ...(dynamicConfig.filters || {}),
                slug: slug,
                id: slug, // También como id por si el resolver usa id
              },
            };
            console.log(`   📌 Página single: agregando slug=${slug} a filtros`);
          } else if (tipoPagina === 'categoria' && categoria) {
            // Para páginas de categoría, agregar el slug de categoría
            dynamicConfig = {
              ...dynamicConfig,
              filters: {
                ...(dynamicConfig.filters || {}),
                categoria_slug: categoria,
              },
            };
            console.log(`   📌 Página categoría: agregando categoria_slug=${categoria} a filtros`);
          }

          const resolvedData = await resolveDynamicData(
            dynamicConfig,
            tenantId,
            idioma
          );
          console.log(`   ✅ Datos resueltos: ${Array.isArray(resolvedData) ? resolvedData.length : 1} elementos`);
          return {
            ...seccion,
            datos: {
              ...seccion.datos,
              dynamic_data: {
                ...seccion.datos.dynamic_data,
                resolved: resolvedData,
              },
            },
          };
        } catch (error) {
          console.error(`   ❌ Error resolviendo dynamic_data para ${seccion.tipo}:`, error);
        }
      }
      return seccion;
    })
  );

  // Si no hay componentes, agregar componente de debug
  // Verificar si la categoría existe en categorias_contenido
  let categoriaDisplay = 'general';
  let categoriaVerificada = false;

  if (categoria && prefijo) {
    // Mapear prefijo a tipo de contenido para buscar en categorias_contenido
    const tipoContenidoMap: Record<string, string> = {
      'testimonios': 'testimonio',
      'videos': 'video',
      'articulos': 'articulo',
      'asesores': 'asesor',
    };

    const tipoContenido = tipoContenidoMap[prefijo];
    if (tipoContenido) {
      const categoriaEncontrada = await findCategoriaBySlug(tenantId, tipoContenido, categoria, idioma);
      if (categoriaEncontrada) {
        categoriaDisplay = categoriaEncontrada.slug;
        categoriaVerificada = true;
      } else {
        // Categoría no existe, usar "general"
        categoriaDisplay = 'general';
        categoriaVerificada = false;
      }
    } else {
      // Prefijo no mapeado, usar la categoría tal cual
      categoriaDisplay = categoria;
      categoriaVerificada = false;
    }
  }

  const componentsToReturn = secciones.length > 0
    ? secciones.map(s => ({
        id: s.id,
        tipo: s.tipo,
        componente_key: s.componente_key,
        variante: s.variante,
        datos: s.datos,
        activo: s.activo,
        orden: s.orden,
        paginaId: s.paginaId,
        predeterminado: true,
      }))
    : [{
        id: 'debug-fallback',
        tipo: 'debug',
        variante: 'info',
        datos: {
          title: `🎯 DEBUG - Prefijo: ${prefijo} | Nivel: ${tipoPagina} | Tipo: ${tipoPaginaCodigo}`,
          subtitle: `Válido: ${isValid ? '✅ SÍ' : '❌ NO'} | URL: ${paginaSlug} | Categoría: ${categoriaDisplay} ${categoriaVerificada ? '✅' : '(general)'} | Idioma: ${idioma}${usuarioReferidor ? ` | Ref: ${tracking?.ref} ✅` : ''}`,
          details: {
            prefijo: prefijo,
            nivelDetectado: tipoPagina,
            tipoPaginaCodigo: tipoPaginaCodigo,
            esValido: isValid,
            slug: paginaSlug,
            categoria: categoriaDisplay,
            categoriaVerificada: categoriaVerificada ? 'Sí' : 'No (usando general)',
            idioma: idioma,
            slugItem: slug || 'N/A',
            ref: tracking?.ref || 'N/A',
            referidorEncontrado: usuarioReferidor ? 'Sí' : 'No',
            referidorNombre: usuarioReferidor ? `${usuarioReferidor.nombre} ${usuarioReferidor.apellido}` : 'N/A',
            referidorTipo: usuarioReferidor?.tipo_referidor || 'N/A',
          },
          mensaje: 'No hay componentes configurados para este tipo de página',
          rawData: JSON.stringify({
            prefijo,
            nivel: tipoPagina,
            tipo: tipoPaginaCodigo,
            valido: isValid,
            url: paginaSlug,
            categoria: categoriaDisplay,
            item: slug,
            tracking: tracking || {},
            usuarioReferidor: usuarioReferidor || null,
          }, null, 2),
        },
        activo: true,
        orden: 0,
        predeterminado: true,
      }];

  return {
    page: {
      id: `dynamic-${prefijo}-${tipoPagina}`,
      tenantId,
      tipoPagina: tipoPaginaCodigo,
      titulo: prefijo.charAt(0).toUpperCase() + prefijo.slice(1),
      slug: paginaSlug,
      descripcion: `Página de ${prefijo}`,
      publica: true,
      activa: true,
    },
    theme: theme || {},
    components: componentsToReturn,
    idioma,
    idiomasDisponibles,
    dynamicPage: true,
    // Metadata de debug
    _debug: {
      prefijo,
      nivelDetectado: tipoPagina,
      tipoPaginaCodigo,
      esValido: isValid,
      componentesEncontrados: secciones.length,
    },
  } as any;
}

// ============================================================================
// RESOLUCIÓN DE PROPIEDADES
// ============================================================================

/**
 * Resuelve URLs de propiedades descomponiendo tags
 * /comprar/apartamento/distrito-nacional/2-banos/gym/mi-propiedad
 *
 * LÓGICA:
 * 1. Primero verificar si el ÚLTIMO segmento es un slug de propiedad → single property
 * 2. Si no, es un listado y TODOS los segmentos son potenciales filtros
 * 3. Los segmentos no reconocidos como tags se guardan para uso futuro (no generan query)
 */
async function resolvePropiedades(
  tenantId: string,
  segmentos: string[],
  idioma: string,
  trackingData: { tracking: Record<string, string>; usuarioReferidor: any | null }
): Promise<PaginaCompletaResponse | null> {
  const { tracking, usuarioReferidor } = trackingData;
  console.log(`   🏠 Resolviendo propiedades: ${segmentos.join('/')}`);

  // PASO 1: Verificar primero si el último segmento es un slug de propiedad
  const ultimoSegmento = segmentos[segmentos.length - 1];
  const propiedad = await buscarPropiedadPorSlug(tenantId, ultimoSegmento, idioma);

  if (propiedad) {
    console.log(`   ✅ Es single property: ${propiedad.titulo}`);
    // Obtener tags de los segmentos anteriores (sin el último que es el slug)
    const segmentosContexto = segmentos.slice(0, -1);
    const tags = await getTagsPropiedades(tenantId, idioma);
    const tagsContexto: TagPropiedad[] = [];

    for (const segmento of segmentosContexto) {
      const tag = findTagBySlug(segmento, tags, idioma);
      if (tag) {
        tagsContexto.push(tag);
      }
      // Segmentos no reconocidos se ignoran (no afectan single property)
    }

    return await resolveSingleProperty(tenantId, propiedad, tagsContexto, idioma, trackingData);
  }

  // PASO 2: No es propiedad → es listado de propiedades
  console.log(`   📋 Es listado de propiedades con filtros`);

  // Obtener todos los tags
  const tags = await getTagsPropiedades(tenantId, idioma);

  // Clasificar TODOS los segmentos
  const tagsEncontrados: TagPropiedad[] = [];
  const segmentosDesconocidos: string[] = [];

  for (const segmento of segmentos) {
    const tag = findTagBySlug(segmento, tags, idioma);

    if (tag) {
      tagsEncontrados.push(tag);
    } else {
      // Segmento no reconocido como tag → guardarlo para uso futuro
      // NO generar query SQL con este segmento (podría ser ubicación, característica, etc.)
      segmentosDesconocidos.push(segmento);
    }
  }

  console.log(`   🏷️ Tags reconocidos: ${tagsEncontrados.map(t => t.slug).join(', ') || '(ninguno)'}`);
  console.log(`   ❓ Segmentos desconocidos: ${segmentosDesconocidos.join(', ') || '(ninguno)'}`);

  // Por ahora solo usamos los tags reconocidos para filtrar
  // Los segmentos desconocidos se pasarán como metadata para uso futuro
  return await resolvePropertyListing(tenantId, tagsEncontrados, idioma, segmentosDesconocidos, trackingData);
}

async function getTagsPropiedades(tenantId: string, idioma: string): Promise<TagPropiedad[]> {
  const sql = `
    SELECT slug, tipo, valor, campo_query, operador, alias_idiomas, nombre_idiomas
    FROM tags_propiedades
    WHERE (tenant_id = $1 OR tenant_id IS NULL) AND activo = true
    ORDER BY tenant_id NULLS LAST, orden ASC
  `;
  const result = await query(sql, [tenantId]);

  return result.rows.map((row: any) => ({
    slug: row.slug,
    tipo: row.tipo,
    valor: row.valor,
    campo_query: row.campo_query,
    operador: row.operador,
    alias_idiomas: parseJsonField(row.alias_idiomas),
    nombre_idiomas: parseJsonField(row.nombre_idiomas),
  }));
}

function findTagBySlug(segmento: string, tags: TagPropiedad[], idioma: string): TagPropiedad | null {
  for (const tag of tags) {
    // Comparar con slug en español
    if (tag.slug === segmento) return tag;

    // Comparar con alias del idioma
    const alias = tag.alias_idiomas[idioma];
    if (alias && alias === segmento) return tag;

    // Comparar con todos los aliases
    for (const lang of Object.keys(tag.alias_idiomas)) {
      if (tag.alias_idiomas[lang] === segmento) return tag;
    }
  }
  return null;
}

async function buscarPropiedadPorSlug(
  tenantId: string,
  slug: string,
  idioma: string = 'es'
): Promise<any | null> {
  // LÓGICA DE BÚSQUEDA POR SLUG CON TRADUCCIONES:
  // 1. Si idioma es español ('es'): buscar directamente en campo `slug`
  // 2. Si idioma NO es español: buscar en slug_traducciones[idioma] O slug como fallback
  // 3. También permitir búsqueda por ID

  let sql: string;

  if (idioma === 'es') {
    // Español: buscar directamente en slug (o por ID)
    sql = `
      SELECT * FROM propiedades
      WHERE tenant_id = $1 AND (
        slug = $2 OR
        id::text = $2
      ) AND activo = true
      LIMIT 1
    `;
  } else {
    // Otro idioma: buscar en slug_traducciones[idioma] con fallback a slug
    sql = `
      SELECT * FROM propiedades
      WHERE tenant_id = $1 AND (
        slug_traducciones->>'${idioma}' = $2 OR
        slug = $2 OR
        id::text = $2
      ) AND activo = true
      LIMIT 1
    `;
  }

  const result = await query(sql, [tenantId, slug]);

  return result.rows[0] || null;
}

async function resolveSingleProperty(
  tenantId: string,
  propiedad: any,
  tagsContexto: TagPropiedad[],
  idioma: string,
  trackingData: { tracking: Record<string, string>; usuarioReferidor: any | null }
): Promise<PaginaCompletaResponse | null> {
  const { tracking, usuarioReferidor } = trackingData;
  console.log(`   🏠 Resolviendo single property: ${propiedad.titulo}`);

  const tipoPaginaCodigo = normalizePageType(STANDARD_PAGE_TYPES.SINGLE_PROPERTY);
  const theme = await getTenantTheme(tenantId);
  const idiomasDisponibles = await getIdiomasDisponiblesTenant(tenantId);
  const breadcrumbs = buildBreadcrumbs(tagsContexto, idioma);

  // FLUJO LIMPIO: Usar getSeccionesResueltas (igual que resolveContenidoDinamico)
  const { getSeccionesResueltas } = await import('./seccionesService.js');
  const { resolveDynamicData } = await import('./dynamicDataResolver.js');
  // Single property es página de sistema, no necesita paginaId
  let secciones = await getSeccionesResueltas(tenantId, tipoPaginaCodigo, undefined, undefined, idioma);

  // Resolver datos dinámicos para cada componente
  secciones = await Promise.all(
    secciones.map(async (seccion) => {
      if (seccion.datos?.dynamic_data?.dataType) {
        console.log(`   🔄 Resolviendo dynamic_data para ${seccion.tipo}: ${seccion.datos.dynamic_data.dataType}`);
        try {
          // Para single property, agregar el slug como filtro
          const dynamicConfig = {
            ...seccion.datos.dynamic_data,
            idioma, // Pasar idioma para traducciones
            filters: {
              ...(seccion.datos.dynamic_data.filters || {}),
              slug: propiedad.slug,
              id: propiedad.id,
            },
          };

          const resolvedData = await resolveDynamicData(dynamicConfig, tenantId, idioma);
          console.log(`   ✅ Datos resueltos: ${Array.isArray(resolvedData) ? resolvedData.length : 1} elementos`);

          return {
            ...seccion,
            datos: {
              ...seccion.datos,
              dynamic_data: {
                ...seccion.datos.dynamic_data,
                resolved: resolvedData,
              },
            },
          };
        } catch (error) {
          console.error(`   ❌ Error resolviendo dynamic_data para ${seccion.tipo}:`, error);
        }
      }
      return seccion;
    })
  );

  // Si no hay componentes, agregar componente de debug
  const componentsToReturn = secciones.length > 0
    ? secciones.map(s => ({
        id: s.id,
        tipo: s.tipo,
        componente_key: s.componente_key,
        variante: s.variante,
        datos: s.datos,
        activo: s.activo,
        orden: s.orden,
        paginaId: s.paginaId,
        predeterminado: true,
      }))
    : [{
        id: 'debug-fallback-single-property',
        tipo: 'debug',
        variante: 'info',
        datos: {
          title: `🎯 DEBUG - Single Property | Tipo: ${tipoPaginaCodigo}`,
          subtitle: `Propiedad: ${propiedad.titulo} | Idioma: ${idioma}${usuarioReferidor ? ` | Ref: ${tracking?.ref} ✅` : ''}`,
          details: {
            tipoPagina: tipoPaginaCodigo,
            tenantId: tenantId,
            propiedadId: propiedad.id,
            propiedadSlug: propiedad.slug,
            tagsContexto: tagsContexto.map(t => t.slug).join(', '),
            idioma: idioma,
            ref: tracking?.ref || 'N/A',
            referidorEncontrado: usuarioReferidor ? 'Sí' : 'No',
            referidorNombre: usuarioReferidor ? `${usuarioReferidor.nombre} ${usuarioReferidor.apellido}` : 'N/A',
            referidorTipo: usuarioReferidor?.tipo_referidor || 'N/A',
          },
          mensaje: 'No hay componentes configurados para single property',
          rawData: JSON.stringify({
            tipo: tipoPaginaCodigo,
            tenant: tenantId,
            propiedad: {
              id: propiedad.id,
              titulo: propiedad.titulo,
              slug: propiedad.slug,
            },
            tags: tagsContexto,
            idioma: idioma,
            tracking: tracking || {},
            usuarioReferidor: usuarioReferidor || null,
          }, null, 2),
        },
        activo: true,
        orden: 0,
        predeterminado: true,
      }];

  return {
    page: {
      id: `dynamic-property-${propiedad.id}`,
      tenantId,
      tipoPagina: tipoPaginaCodigo,
      titulo: propiedad.titulo,
      slug: propiedad.slug || `/propiedad/${propiedad.id}`,
      descripcion: propiedad.descripcion,
      publica: true,
      activa: true,
    },
    theme: theme || {},
    components: componentsToReturn,
    idioma,
    idiomasDisponibles,
    breadcrumbs,
    filters: tagsContexto,
    dynamicPage: true,
  } as any;
}

async function resolvePropertyListing(
  tenantId: string,
  tags: TagPropiedad[],
  idioma: string,
  segmentosDesconocidos: string[] = [],
  trackingData: { tracking: Record<string, string>; usuarioReferidor: any | null }
): Promise<PaginaCompletaResponse | null> {
  const { tracking, usuarioReferidor } = trackingData;
  console.log(`   📋 Resolviendo listado de propiedades con ${tags.length} filtros`);

  const tipoPaginaCodigo = normalizePageType(STANDARD_PAGE_TYPES.LISTADOS_PROPIEDADES);
  const breadcrumbs = buildBreadcrumbs(tags, idioma);
  const titulo = buildListingTitle(tags, idioma);
  const theme = await getTenantTheme(tenantId);
  const idiomasDisponibles = await getIdiomasDisponiblesTenant(tenantId);

  // FLUJO LIMPIO: Usar getSeccionesResueltas (igual que resolveContenidoDinamico)
  const { getSeccionesResueltas } = await import('./seccionesService.js');
  const { resolveDynamicData } = await import('./dynamicDataResolver.js');
  // Property listing es página de sistema, no necesita paginaId
  let secciones = await getSeccionesResueltas(tenantId, tipoPaginaCodigo, undefined, undefined, idioma);

  // Resolver datos dinámicos para cada componente
  secciones = await Promise.all(
    secciones.map(async (seccion) => {
      if (seccion.datos?.dynamic_data?.dataType) {
        console.log(`   🔄 Resolviendo dynamic_data para ${seccion.tipo}: ${seccion.datos.dynamic_data.dataType}`);
        try {
          // Por ahora SIN filtros, traer todas las propiedades
          // TODO: Implementar filtros por tags después
          const dynamicConfig = { ...seccion.datos.dynamic_data, idioma };
          const resolvedData = await resolveDynamicData(dynamicConfig, tenantId, idioma);
          console.log(`   ✅ Datos resueltos: ${Array.isArray(resolvedData) ? resolvedData.length : 1} elementos`);

          return {
            ...seccion,
            datos: {
              ...seccion.datos,
              dynamic_data: {
                ...seccion.datos.dynamic_data,
                resolved: resolvedData,
              },
              propiedades: resolvedData, // Backward compatibility
              filtros: tags,
            },
          };
        } catch (error) {
          console.error(`   ❌ Error resolviendo dynamic_data para ${seccion.tipo}:`, error);
        }
      }
      return seccion;
    })
  );

  // Si no hay componentes, agregar componente de debug
  const componentsToReturn = secciones.length > 0
    ? secciones.map(s => ({
        id: s.id,
        tipo: s.tipo,
        componente_key: s.componente_key,
        variante: s.variante,
        datos: s.datos,
        activo: s.activo,
        orden: s.orden,
        paginaId: s.paginaId,
        predeterminado: true,
      }))
    : [{
        id: 'debug-fallback-property-listing',
        tipo: 'debug',
        variante: 'info',
        datos: {
          title: `🎯 DEBUG - Property Listing | Tipo: ${tipoPaginaCodigo}`,
          subtitle: `Tenant: ${tenantId} | Filtros: ${tags.length} | Idioma: ${idioma}${usuarioReferidor ? ` | Ref: ${tracking?.ref} ✅` : ''}`,
          details: {
            tipoPagina: tipoPaginaCodigo,
            tenantId: tenantId,
            filtros: tags.map(t => t.slug).join(', '),
            segmentosDesconocidos: segmentosDesconocidos.join(', '),
            idioma: idioma,
            ref: tracking?.ref || 'N/A',
            referidorEncontrado: usuarioReferidor ? 'Sí' : 'No',
            referidorNombre: usuarioReferidor ? `${usuarioReferidor.nombre} ${usuarioReferidor.apellido}` : 'N/A',
            referidorTipo: usuarioReferidor?.tipo_referidor || 'N/A',
          },
          mensaje: 'No hay componentes configurados para listados de propiedades',
          rawData: JSON.stringify({
            tipo: tipoPaginaCodigo,
            tenant: tenantId,
            filtros: tags,
            desconocidos: segmentosDesconocidos,
            idioma: idioma,
            tracking: tracking || {},
            usuarioReferidor: usuarioReferidor || null,
          }, null, 2),
        },
        activo: true,
        orden: 0,
        predeterminado: true,
      }];

  return {
    page: {
      id: `dynamic-listing-${Date.now()}`,
      tenantId,
      tipoPagina: tipoPaginaCodigo,
      titulo,
      slug: '/propiedades',
      descripcion: 'Listado de propiedades',
      publica: true,
      activa: true,
    },
    theme: theme || {},
    components: componentsToReturn,
    idioma,
    idiomasDisponibles,
    breadcrumbs,
    filters: tags,
    unknownSegments: segmentosDesconocidos,
    totalResults: secciones.find(s => s.datos?.dynamic_data?.resolved)?.datos?.dynamic_data?.resolved?.length || 0,
    dynamicPage: true,
  } as any;
}

async function queryPropiedadesByTags(tenantId: string, tags: TagPropiedad[]): Promise<any[]> {
  let sql = `SELECT * FROM propiedades WHERE tenant_id = $1 AND activo = true`;
  const params: any[] = [tenantId];
  let paramIndex = 2;

  for (const tag of tags) {
    if (!tag.campo_query) continue;

    switch (tag.operador) {
      case '=':
        sql += ` AND ${tag.campo_query} = $${paramIndex}`;
        params.push(tag.valor);
        paramIndex++;
        break;
      case '>=':
        sql += ` AND ${tag.campo_query} >= $${paramIndex}`;
        params.push(parseInt(tag.valor));
        paramIndex++;
        break;
      case '<=':
        sql += ` AND ${tag.campo_query} <= $${paramIndex}`;
        params.push(parseInt(tag.valor));
        paramIndex++;
        break;
      case '@>':
        // Para arrays (amenidades)
        sql += ` AND ${tag.campo_query} @> $${paramIndex}::jsonb`;
        params.push(JSON.stringify([tag.valor]));
        paramIndex++;
        break;
      case 'ILIKE':
        sql += ` AND ${tag.campo_query} ILIKE $${paramIndex}`;
        params.push(`%${tag.valor}%`);
        paramIndex++;
        break;
    }
  }

  sql += ` ORDER BY destacada DESC, created_at DESC LIMIT 50`;

  const result = await query(sql, params);
  return result.rows;
}

function buildBreadcrumbs(tags: TagPropiedad[], idioma: string): Array<{ label: string; href: string }> {
  const breadcrumbs: Array<{ label: string; href: string }> = [
    { label: 'Inicio', href: '/' },
  ];

  let path = '';
  for (const tag of tags) {
    const slug = idioma === 'es' ? tag.slug : (tag.alias_idiomas[idioma] || tag.slug);
    const label = tag.nombre_idiomas[idioma] || tag.nombre_idiomas['es'] || tag.slug;
    path += '/' + slug;
    breadcrumbs.push({ label, href: path });
  }

  return breadcrumbs;
}

function buildListingTitle(tags: TagPropiedad[], idioma: string): string {
  if (tags.length === 0) return 'Propiedades';

  const partes: string[] = [];
  for (const tag of tags) {
    const nombre = tag.nombre_idiomas[idioma] || tag.nombre_idiomas['es'] || tag.slug;
    partes.push(nombre);
  }

  return partes.join(' - ');
}

// ============================================================================
// RESOLUCIÓN DE PÁGINAS ESTÁTICAS
// ============================================================================

async function resolvePaginaEstatica(
  tenantId: string,
  slug: string,
  idioma: string
): Promise<PaginaCompletaResponse | null> {
  console.log(`   📄 Resolviendo página estática: ${slug}`);

  // FLUJO LIMPIO: Solo usar getSeccionesResueltas
  const { getSeccionesResueltas } = await import('./seccionesService.js');
  const theme = await getTenantTheme(tenantId);
  const idiomasDisponibles = await getIdiomasDisponiblesTenant(tenantId);

  // Convertir slug a tipoPagina (reemplazar guiones con guiones bajos)
  // Ej: 'nosotros' -> 'nosotros', 'quienes-somos' -> 'quienes_somos'
  const tipoPagina = slug.replace(/-/g, '_');
  // Páginas estáticas son del sistema, buscar componentes por tipo_pagina_id
  const secciones = await getSeccionesResueltas(tenantId, tipoPagina, undefined, undefined, idioma);

  return {
    page: {
      id: `static-${slug}`,
      tenantId,
      tipoPagina,
      titulo: slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' '),
      slug: `/${slug}`,
      descripcion: `Página ${slug}`,
      publica: true,
      activa: true,
    },
    theme: theme || {},
    components: secciones.map(s => ({
      id: s.id,
      tipo: s.tipo,
      componente_key: s.componente_key,
      variante: s.variante,
      datos: s.datos,
      activo: s.activo,
      orden: s.orden,
      paginaId: s.paginaId,
      predeterminado: true,
    })),
    idioma,
    idiomasDisponibles,
    dynamicPage: true,
  } as any;
}


// ============================================================================
// UTILIDADES
// ============================================================================

async function getIdiomasDisponiblesTenant(tenantId: string): Promise<string[]> {
  const sql = `SELECT idiomas_disponibles FROM tenants WHERE id = $1`;
  const result = await query(sql, [tenantId]);
  if (result.rows.length === 0) return ['es'];

  const idiomas = result.rows[0].idiomas_disponibles;
  if (typeof idiomas === 'string') {
    try {
      return JSON.parse(idiomas);
    } catch {
      return ['es'];
    }
  }
  return Array.isArray(idiomas) ? idiomas : ['es'];
}

function parseJsonField(field: any): any {
  if (!field) return {};
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch {
      return {};
    }
  }
  return field;
}
