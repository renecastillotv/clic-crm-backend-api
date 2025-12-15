/**
 * seccionesService.ts
 *
 * Servicio para gestionar la configuración de secciones por tenant.
 *
 * MODELO DE DATOS (v2):
 * - Cada tenant puede tener MÚLTIPLES configuraciones para un tipo de componente
 * - Cada variante tiene su PROPIA configuración guardada independientemente
 * - Solo UNA variante por tipo está marcada como "activa" (es_activo=true)
 * - La configuración de cada variante persiste incluso cuando no está activa
 *
 * Conceptos clave:
 * - scope='tenant': Configuración global del tenant (se aplica a todas las páginas)
 * - scope='page_type': Configuración por tipo de página (single_property, property_list, etc.)
 * - scope='page': Configuración específica para una página individual
 * - es_activo: Indica qué variante se usa actualmente para renderizar
 *
 * Herencia: página específica > tipo de página > tenant global
 */

import { query } from '../utils/db.js';

// Helper function para validar UUIDs
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Tipos para variantes del catálogo (ahora incluyen descripción)
export interface VarianteInfo {
  id: string;
  nombre: string;
  descripcion: string;
}

export interface CatalogoComponente {
  tipo: string;
  nombre: string;
  descripcion: string | null;
  icono: string | null;
  categoria: string;
  variantes: VarianteInfo[];  // Ahora es array de objetos con id, nombre, descripcion
  camposConfig: CampoConfig[];
  esGlobal: boolean;
  disponible: boolean;
  orden: number;
}

export interface CampoConfig {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  default?: any;
}

export interface SeccionConfig {
  id: string;
  tenantId: string;
  tipo: string;
  variante: string;
  nombre?: string | null;     // Nombre identificador del componente (ej: "CTA Ventas", "Hero Principal")
  datos: Record<string, any>;
  activo: boolean;
  orden: number;
  scope: 'tenant' | 'page_type' | 'page';
  tipoPagina: string | null;
  paginaId: string | null;
  esActivo?: boolean;         // Si esta variante es la activa para renderizar
  configCompleta?: boolean;   // Si tiene todos los campos requeridos llenos
}

/**
 * Obtiene el catálogo de componentes disponibles
 *
 * @param tenantId - ID del tenant (opcional) para filtrar variantes por features
 */
export async function getCatalogoComponentes(tenantId?: string): Promise<CatalogoComponente[]> {
  const sql = `
    SELECT
      tipo,
      nombre,
      descripcion,
      icono,
      categoria,
      variantes,
      campos_config as "camposConfig",
      es_global as "esGlobal",
      disponible,
      orden
    FROM catalogo_componentes
    WHERE disponible = true
    ORDER BY categoria, orden
  `;

  const result = await query(sql, []);

  // Importar servicio de features dinámicamente para evitar dependencias circulares
  let tenantFeatures: string[] = [];
  if (tenantId) {
    try {
      const { getTenantFeatures } = await import('./tenantFeaturesService.js');
      tenantFeatures = await getTenantFeatures(tenantId);
    } catch (error) {
      console.warn('No se pudieron cargar features del tenant:', error);
    }
  }

  return result.rows.map((row: any) => {
    let variantes = typeof row.variantes === 'string' ? JSON.parse(row.variantes) : row.variantes;
    
    // Filtrar variantes que requieren features si tenantId está presente
    if (tenantId) {
      variantes = variantes.filter((v: any) => {
        // Si la variante requiere un feature, verificar que el tenant lo tenga
        if (v.requiresFeature) {
          return tenantFeatures.includes(v.requiresFeature);
        }
        // Si no requiere feature, siempre disponible
        return true;
      });
    }

    return {
      tipo: row.tipo,
      nombre: row.nombre,
      descripcion: row.descripcion,
      icono: row.icono,
      categoria: row.categoria,
      variantes,
      camposConfig: typeof row.camposConfig === 'string' ? JSON.parse(row.camposConfig) : row.camposConfig,
      esGlobal: row.esGlobal,
      disponible: row.disponible,
      orden: row.orden,
    };
  });
}

/**
 * Obtiene las secciones configuradas de un tenant (scope='tenant')
 * NOTA: Ahora retorna TODAS las configuraciones de variantes, no solo la activa
 * Para obtener solo la activa, usar getSeccionActivaPorTipo
 */
export async function getSeccionesTenant(tenantId: string): Promise<SeccionConfig[]> {
  const sql = `
    SELECT
      id,
      tenant_id as "tenantId",
      tipo,
      variante,
      nombre,
      datos,
      activo,
      orden,
      scope,
      tipo_pagina as "tipoPagina",
      pagina_id as "paginaId",
      COALESCE(es_activo, false) as "esActivo",
      COALESCE(config_completa, false) as "configCompleta"
    FROM componentes_web
    WHERE tenant_id = $1 AND scope = 'tenant'
    ORDER BY tipo, es_activo DESC, orden ASC
  `;

  const result = await query(sql, [tenantId]);

  return result.rows.map((row: any) => ({
    id: row.id,
    tenantId: row.tenantId,
    tipo: row.tipo,
    variante: row.variante,
    nombre: row.nombre,
    datos: typeof row.datos === 'string' ? JSON.parse(row.datos) : row.datos,
    activo: row.activo,
    orden: row.orden,
    scope: row.scope,
    tipoPagina: row.tipoPagina,
    paginaId: row.paginaId,
    esActivo: row.esActivo,
    configCompleta: row.configCompleta,
  }));
}

/**
 * Obtiene TODAS las configuraciones de variantes para un tipo específico
 * Útil para la UI de edición donde se muestran todas las variantes
 */
export async function getSeccionesPorTipo(
  tenantId: string,
  tipo: string,
  scope: 'tenant' | 'page_type' | 'page' = 'tenant'
): Promise<SeccionConfig[]> {
  const sql = `
    SELECT
      id,
      tenant_id as "tenantId",
      tipo,
      variante,
      datos,
      activo,
      orden,
      scope,
      tipo_pagina as "tipoPagina",
      pagina_id as "paginaId",
      COALESCE(es_activo, false) as "esActivo",
      COALESCE(config_completa, false) as "configCompleta"
    FROM componentes_web
    WHERE tenant_id = $1 AND tipo = $2 AND scope = $3
    ORDER BY es_activo DESC, variante ASC
  `;

  const result = await query(sql, [tenantId, tipo, scope]);

  return result.rows.map((row: any) => ({
    id: row.id,
    tenantId: row.tenantId,
    tipo: row.tipo,
    variante: row.variante,
    datos: typeof row.datos === 'string' ? JSON.parse(row.datos) : row.datos,
    activo: row.activo,
    orden: row.orden,
    scope: row.scope,
    tipoPagina: row.tipoPagina,
    paginaId: row.paginaId,
    esActivo: row.esActivo,
    configCompleta: row.configCompleta,
  }));
}

/**
 * Obtiene solo las secciones ACTIVAS (una por tipo)
 * Útil para el renderizado del sitio web
 */
export async function getSeccionesActivas(tenantId: string): Promise<SeccionConfig[]> {
  const sql = `
    SELECT
      id,
      tenant_id as "tenantId",
      tipo,
      variante,
      datos,
      activo,
      orden,
      scope,
      tipo_pagina as "tipoPagina",
      pagina_id as "paginaId",
      COALESCE(es_activo, false) as "esActivo",
      COALESCE(config_completa, false) as "configCompleta"
    FROM componentes_web
    WHERE tenant_id = $1 AND scope = 'tenant' AND es_activo = true
    ORDER BY orden ASC
  `;

  const result = await query(sql, [tenantId]);

  return result.rows.map((row: any) => ({
    id: row.id,
    tenantId: row.tenantId,
    tipo: row.tipo,
    variante: row.variante,
    datos: typeof row.datos === 'string' ? JSON.parse(row.datos) : row.datos,
    activo: row.activo,
    orden: row.orden,
    scope: row.scope,
    tipoPagina: row.tipoPagina,
    paginaId: row.paginaId,
    esActivo: row.esActivo,
    configCompleta: row.configCompleta,
  }));
}

/**
 * Obtiene las secciones por tipo de página (scope='page_type')
 */
export async function getSeccionesPorTipoPagina(
  tenantId: string,
  tipoPagina: string
): Promise<SeccionConfig[]> {
  const sql = `
    SELECT
      id,
      tenant_id as "tenantId",
      tipo,
      variante,
      datos,
      activo,
      orden,
      scope,
      tipo_pagina as "tipoPagina",
      pagina_id as "paginaId"
    FROM componentes_web
    WHERE tenant_id = $1 AND scope = 'page_type' AND tipo_pagina = $2
    ORDER BY orden ASC
  `;

  const result = await query(sql, [tenantId, tipoPagina]);

  return result.rows.map((row: any) => ({
    id: row.id,
    tenantId: row.tenantId,
    tipo: row.tipo,
    variante: row.variante,
    datos: typeof row.datos === 'string' ? JSON.parse(row.datos) : row.datos,
    activo: row.activo,
    orden: row.orden,
    scope: row.scope,
    tipoPagina: row.tipoPagina,
    paginaId: row.paginaId,
  }));
}

/**
 * Guarda/actualiza una configuración de variante para un tenant
 *
 * NUEVO COMPORTAMIENTO:
 * - Busca si ya existe config para ese (tenant, tipo, variante, scope)
 * - Si existe, actualiza los datos
 * - Si no existe, crea nueva
 * - esActivo se maneja por separado con activarVariante()
 */
export async function saveSeccionTenant(
  tenantId: string,
  seccion: {
    id?: string;
    tipo: string;
    variante: string;
    datos?: Record<string, any>;
    activo?: boolean;
    orden?: number;
    scope?: 'tenant' | 'page_type' | 'page';
    tipoPagina?: string;
    paginaId?: string;
    esActivo?: boolean;
    configCompleta?: boolean;
  }
): Promise<SeccionConfig> {
  const datos = JSON.stringify(seccion.datos || {});
  const scope = seccion.scope || 'tenant';
  const activo = seccion.activo !== undefined ? seccion.activo : true;
  const orden = seccion.orden !== undefined ? seccion.orden : 0;
  const configCompleta = seccion.configCompleta !== undefined ? seccion.configCompleta : false;

  // Primero buscar si ya existe una config para esta variante
  const existingCheck = await query(`
    SELECT id FROM componentes_web
    WHERE tenant_id = $1 AND tipo = $2 AND variante = $3 AND scope = $4
    AND (pagina_id IS NOT DISTINCT FROM $5)
  `, [tenantId, seccion.tipo, seccion.variante, scope, seccion.paginaId || null]);

  const existingId = seccion.id || (existingCheck.rows.length > 0 ? existingCheck.rows[0].id : null);

  if (existingId) {
    // Actualizar existente
    const sql = `
      UPDATE componentes_web
      SET
        datos = $1,
        activo = $2,
        orden = $3,
        config_completa = $4,
        updated_at = NOW()
      WHERE id = $5 AND tenant_id = $6
      RETURNING
        id,
        tenant_id as "tenantId",
        tipo,
        variante,
        datos,
        activo,
        orden,
        scope,
        tipo_pagina as "tipoPagina",
        pagina_id as "paginaId",
        COALESCE(es_activo, false) as "esActivo",
        COALESCE(config_completa, false) as "configCompleta"
    `;

    const result = await query(sql, [
      datos,
      activo,
      orden,
      configCompleta,
      existingId,
      tenantId,
    ]);

    const row = result.rows[0];
    return {
      id: row.id,
      tenantId: row.tenantId,
      tipo: row.tipo,
      variante: row.variante,
      datos: typeof row.datos === 'string' ? JSON.parse(row.datos) : row.datos,
      activo: row.activo,
      orden: row.orden,
      scope: row.scope,
      tipoPagina: row.tipoPagina,
      paginaId: row.paginaId,
      esActivo: row.esActivo,
      configCompleta: row.configCompleta,
    };
  } else {
    // Crear nuevo - verificar si es la primera de su tipo (entonces será activa)
    const countExisting = await query(`
      SELECT COUNT(*) as count FROM componentes_web
      WHERE tenant_id = $1 AND tipo = $2 AND scope = $3
    `, [tenantId, seccion.tipo, scope]);

    const esActivo = countExisting.rows[0].count === '0' || seccion.esActivo === true;

    const sql = `
      INSERT INTO componentes_web (
        tenant_id, tipo, variante, datos, activo, orden, scope,
        tipo_pagina, pagina_id, es_activo, config_completa
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING
        id,
        tenant_id as "tenantId",
        tipo,
        variante,
        datos,
        activo,
        orden,
        scope,
        tipo_pagina as "tipoPagina",
        pagina_id as "paginaId",
        COALESCE(es_activo, false) as "esActivo",
        COALESCE(config_completa, false) as "configCompleta"
    `;

    const result = await query(sql, [
      tenantId,
      seccion.tipo,
      seccion.variante,
      datos,
      activo,
      orden,
      scope,
      seccion.tipoPagina || null,
      seccion.paginaId || null,
      esActivo,
      configCompleta,
    ]);

    const row = result.rows[0];
    return {
      id: row.id,
      tenantId: row.tenantId,
      tipo: row.tipo,
      variante: row.variante,
      datos: typeof row.datos === 'string' ? JSON.parse(row.datos) : row.datos,
      activo: row.activo,
      orden: row.orden,
      scope: row.scope,
      tipoPagina: row.tipoPagina,
      paginaId: row.paginaId,
      esActivo: row.esActivo,
      configCompleta: row.configCompleta,
    };
  }
}

/**
 * Activa una variante específica para un tipo de componente
 * Desactiva todas las demás variantes del mismo tipo
 */
export async function activarVariante(
  tenantId: string,
  tipo: string,
  variante: string,
  scope: 'tenant' | 'page_type' | 'page' = 'tenant'
): Promise<void> {
  // Desactivar todas las variantes de este tipo
  await query(`
    UPDATE componentes_web
    SET es_activo = false
    WHERE tenant_id = $1 AND tipo = $2 AND scope = $3
  `, [tenantId, tipo, scope]);

  // Activar la variante seleccionada
  await query(`
    UPDATE componentes_web
    SET es_activo = true
    WHERE tenant_id = $1 AND tipo = $2 AND variante = $3 AND scope = $4
  `, [tenantId, tipo, variante, scope]);
}

/**
 * Elimina una sección
 */
export async function deleteSeccion(tenantId: string, seccionId: string): Promise<boolean> {
  const sql = `DELETE FROM componentes_web WHERE id = $1 AND tenant_id = $2`;
  const result = await query(sql, [seccionId, tenantId]);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Obtiene las secciones para una página
 *
 * PRIORIDAD DE BUSQUEDA:
 * 1. Componentes globales (header, footer) con scope='tenant'
 * 2. Componentes por tipo de pagina con scope='page_type' AND tipo_pagina=$tipoPagina
 * 3. Si no hay componentes en BD para el tipo de pagina, usa fallback (hero simple)
 */
export async function getSeccionesResueltas(
  tenantId: string,
  tipoPagina: string,
  paginaId?: string,
  includeFallback: boolean = false,
  idioma?: string
): Promise<SeccionConfig[]> {
  // =========================================================================
  // 1. Buscar header y footer globales del tenant (scope='tenant')
  // Estos son componentes sin tipo_pagina_id ni tenant_rutas_config_custom_id
  // =========================================================================
  const sqlGlobales = `
    SELECT
      c.id,
      c.tenant_id as "tenantId",
      cc.tipo,
      cc.variante,
      c.nombre,
      c.datos,
      c.activo,
      c.orden,
      NULL as "scope",
      NULL as "tipoPagina",
      NULL as "paginaId"
    FROM componentes_web c
    INNER JOIN catalogo_componentes cc ON c.componente_catalogo_id = cc.id
    WHERE c.tenant_id = $1
      AND c.activo = true
      AND c.tipo_pagina_id IS NULL
      AND c.tenant_rutas_config_custom_id IS NULL
      AND cc.tipo IN ('header', 'footer')
  `;

  const resultGlobales = await query(sqlGlobales, [tenantId]);

  // =========================================================================
  // 2. Buscar componentes por tipo de pagina (scope='page_type')
  // Estos son componentes con tipo_pagina_id que coincide con el tipo de página
  // =========================================================================
  const sqlPorTipo = `
    SELECT
      c.id,
      c.tenant_id as "tenantId",
      cc.tipo,
      cc.variante,
      c.nombre,
      c.datos,
      c.activo,
      c.orden,
      'page_type' as "scope",
      tp.codigo as "tipoPagina",
      NULL as "paginaId"
    FROM componentes_web c
    INNER JOIN catalogo_componentes cc ON c.componente_catalogo_id = cc.id
    INNER JOIN tipos_pagina tp ON c.tipo_pagina_id = tp.id
    WHERE c.tenant_id = $1
      AND c.activo = true
      AND c.tipo_pagina_id IS NOT NULL
      AND tp.codigo = $2
    ORDER BY c.orden ASC
  `;

  const resultPorTipo = await query(sqlPorTipo, [tenantId, tipoPagina]);

  // =========================================================================
  // 3. Buscar componentes específicos de la página (scope='page')
  // Estos son componentes con tenant_rutas_config_custom_id
  // NOTA: La migración 086 eliminó pagina_id, así que esto ya no se usa
  // =========================================================================
  // Solo ejecutar query de scope='page' si paginaId está presente
  // Solo las páginas custom tienen componentes con scope='page'
  let resultPorPagina = { rows: [] };
  // TODO: Implementar lógica para componentes custom si es necesario
  // Por ahora, no hay soporte para componentes específicos de página

  console.log(`📦 [getSeccionesResueltas] Encontrados:
    - ${resultGlobales.rows.length} globales (tenant)
    - ${resultPorTipo.rows.length} por tipo (${tipoPagina})
    - ${resultPorPagina.rows.length} específicos de página`);

  const componentes: SeccionConfig[] = [];

  // =========================================================================
  // 4. Agregar Header y Footer (globales)
  // =========================================================================
  const header = resultGlobales.rows.find((r: any) => r.tipo === 'header');
  if (header) {
    componentes.push({
      id: header.id,
      tenantId: header.tenantId,
      tipo: header.tipo,
      variante: header.variante || 'default',
      nombre: header.nombre,
      datos: typeof header.datos === 'string' ? JSON.parse(header.datos) : header.datos,
      activo: true,
      orden: 0,
      scope: 'tenant',
      tipoPagina: null,
      paginaId: null,
    });
  }
  
  const footer = resultGlobales.rows.find((r: any) => r.tipo === 'footer');
  if (footer) {
    componentes.push({
      id: footer.id,
      tenantId: footer.tenantId,
      tipo: footer.tipo,
      variante: footer.variante || 'default',
      nombre: footer.nombre,
      datos: typeof footer.datos === 'string' ? JSON.parse(footer.datos) : footer.datos,
      activo: true,
      orden: 999,
      scope: 'tenant',
      tipoPagina: null,
      paginaId: null,
    });
  }

  // =========================================================================
  // 4. Agregar componentes de la pagina (de BD o fallback)
  // =========================================================================
  if (resultPorTipo.rows.length > 0) {
    // HAY componentes en BD para este tipo de pagina - usarlos
    console.log(`📦 [getSeccionesResueltas] Usando ${resultPorTipo.rows.length} componentes de BD para ${tipoPagina}`);

    // Mapeo de tipos de componente a su dataType por defecto
    const componenteDataTypeDefaults: Record<string, string> = {
      'team_grid': 'lista_asesores',
      'video_gallery': 'lista_videos',
      'video_grid': 'lista_videos',
      'article_grid': 'lista_articulos',
      'testimonial_grid': 'lista_testimonios',
      'property_grid': 'lista_propiedades',
      // Componentes single
      'agent_profile': 'asesor_single',
      'property_detail': 'propiedad_single',
      'article_detail': 'articulo_single',
      'video_detail': 'video_single',
      'testimonial_detail': 'testimonio_single',
    };

    for (const row of resultPorTipo.rows) {
      const datos = typeof row.datos === 'string' ? JSON.parse(row.datos) : row.datos;

      // Si el componente necesita dynamic_data y no lo tiene, inyectarlo
      const defaultDataType = componenteDataTypeDefaults[row.tipo];
      if (defaultDataType && !datos.dynamic_data?.dataType) {
        datos.dynamic_data = {
          ...(datos.dynamic_data || {}),
          dataType: defaultDataType,
        };
        console.log(`   📦 Inyectando dynamic_data.dataType=${defaultDataType} para ${row.tipo}`);
      }

      componentes.push({
        id: row.id,
        tenantId: row.tenantId,
        tipo: row.tipo,
        variante: row.variante || 'default',
        nombre: row.nombre,
        datos: {
          ...datos,
          tipoPagina, // Inyectar contexto
        },
        activo: true,
        orden: row.orden,
        scope: 'page_type',
        tipoPagina: row.tipoPagina,
        paginaId: null, // Ya no existe pagina_id
      });
    }

    // Agregar componentes específicos de la página (scope='page')
    console.log(`📦 [getSeccionesResueltas] Agregando ${resultPorPagina.rows.length} componentes específicos de página`);
    for (const row of resultPorPagina.rows) {
      const datos = typeof row.datos === 'string' ? JSON.parse(row.datos) : row.datos;

      // Si el componente necesita dynamic_data y no lo tiene, inyectarlo
      const defaultDataType = componenteDataTypeDefaults[row.tipo];
      if (defaultDataType && !datos.dynamic_data?.dataType) {
        datos.dynamic_data = {
          ...(datos.dynamic_data || {}),
          dataType: defaultDataType,
        };
        console.log(`   📦 Inyectando dynamic_data.dataType=${defaultDataType} para ${row.tipo}`);
      }

      componentes.push({
        id: row.id,
        tenantId: row.tenantId,
        tipo: row.tipo,
        variante: row.variante || 'default',
        nombre: row.nombre,
        datos: {
          ...datos,
          tipoPagina, // Inyectar contexto
        },
        activo: true,
        orden: row.orden,
        scope: 'page',
        tipoPagina: row.tipoPagina,
        paginaId: null, // Ya no existe pagina_id
      });
    }
  } else {
    // NO hay componentes en BD - usar fallback según el tipo de página
    console.log(`⚠️ [getSeccionesResueltas] No hay componentes en BD para ${tipoPagina}, usando fallback mejorado`);

    // Mapeo de tipos de página a sus componentes específicos
    const fallbackComponentesPorTipo: Record<string, Array<{tipo: string, variante: string, orden: number}>> = {
      homepage: [
        { tipo: 'hero', variante: 'default', orden: 1 },
        { tipo: 'features', variante: 'default', orden: 2 },
        { tipo: 'testimonials', variante: 'default', orden: 3 },
      ],
      listados_propiedades: [
        { tipo: 'hero', variante: 'simple', orden: 1 },
        { tipo: 'property_grid', variante: 'default', orden: 2 },
      ],
      directorio_asesores: [
        { tipo: 'hero', variante: 'simple', orden: 1 },
        { tipo: 'team_grid', variante: 'default', orden: 2, dataType: 'lista_asesores' },
      ],
      directorio_articulos: [
        { tipo: 'hero', variante: 'simple', orden: 1 },
        { tipo: 'article_grid', variante: 'default', orden: 2 },
      ],
      contacto: [
        { tipo: 'hero', variante: 'simple', orden: 1 },
        { tipo: 'contact_info', variante: 'default', orden: 2 },
        { tipo: 'contact_form', variante: 'default', orden: 3 },
      ],
      single_property: [
        { tipo: 'property_detail', variante: 'default', orden: 1 },
      ],
      single_asesor: [
        { tipo: 'agent_profile', variante: 'default', orden: 1, dataType: 'asesor_single' },
      ],
      single_articulo: [
        { tipo: 'article_detail', variante: 'default', orden: 1 },
      ],
      testimonios: [
        { tipo: 'testimonial_hero', variante: 'default', orden: 1, dataType: 'categorias_testimonios' },
        { tipo: 'testimonial_grid', variante: 'default', orden: 2, dataType: 'lista_testimonios' },
      ],
      directorio_testimonios: [
        { tipo: 'testimonial_hero', variante: 'default', orden: 1, dataType: 'categorias_testimonios' },
        { tipo: 'testimonial_grid', variante: 'default', orden: 2, dataType: 'lista_testimonios' },
      ],
      categoria_testimonios: [
        { tipo: 'testimonial_category', variante: 'default', orden: 1, dataType: 'categoria_testimonios' },
      ],
      single_testimonio: [
        { tipo: 'testimonial_detail', variante: 'default', orden: 1, dataType: 'testimonio_single' },
      ],
      videos: [
        { tipo: 'video_hero', variante: 'default', orden: 1, dataType: 'categorias_videos' },
        { tipo: 'video_gallery', variante: 'default', orden: 2, dataType: 'lista_videos' },
      ],
      videos_listado: [
        { tipo: 'video_hero', variante: 'default', orden: 1, dataType: 'categorias_videos' },
        { tipo: 'video_gallery', variante: 'default', orden: 2, dataType: 'lista_videos' },
      ],
      videos_categoria: [
        { tipo: 'video_category', variante: 'default', orden: 1, dataType: 'categoria_videos' },
      ],
      videos_single: [
        { tipo: 'video_detail', variante: 'default', orden: 1, dataType: 'video_single' },
      ],
      single_video: [
        { tipo: 'video_detail', variante: 'default', orden: 1, dataType: 'video_single' },
      ],
      // Artículos - similar a videos
      articulos_listado: [
        { tipo: 'article_hero', variante: 'default', orden: 1, dataType: 'categorias_articulos' },
        { tipo: 'article_grid', variante: 'default', orden: 2, dataType: 'lista_articulos' },
      ],
      categoria_articulos: [
        { tipo: 'article_category', variante: 'default', orden: 1, dataType: 'categoria_articulos' },
      ],
      articulos_single: [
        { tipo: 'article_detail', variante: 'default', orden: 1, dataType: 'articulo_single' },
      ],
    };

    // Obtener los componentes fallback para este tipo de página (solo si includeFallback = true)
    if (includeFallback) {
      const fallbackComponentes = fallbackComponentesPorTipo[tipoPagina] || [
        { tipo: 'hero', variante: 'simple', orden: 1 },
      ];

      // Crear componentes de fallback
      for (const fallback of fallbackComponentes) {
      const tituloFormateado = tipoPagina
        .replace(/_/g, ' ')
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      // Construir datos con dynamic_data si el fallback tiene dataType
      const datos: Record<string, any> = {
        static_data: {
          titulo: tituloFormateado,
          subtitulo: '',
        },
        tipoPagina,
      };

      // Si el fallback tiene dataType, agregar dynamic_data
      if ((fallback as any).dataType) {
        datos.dynamic_data = {
          dataType: (fallback as any).dataType,
        };
      }

      componentes.push({
        id: `${fallback.tipo}-fallback-${paginaId}-${fallback.orden}`,
        tenantId,
        tipo: fallback.tipo,
        variante: fallback.variante,
        nombre: `${fallback.tipo} ${tipoPagina}`,
        datos,
        activo: true,
        orden: fallback.orden,
        scope: 'page',
        tipoPagina,
        paginaId,
      });
    }
  }
  }

  return componentes;
}

/**
 * Inicializa las secciones por defecto para un nuevo tenant
 */
export async function initSeccionesPorDefecto(tenantId: string): Promise<void> {
  // Verificar si ya tiene secciones
  const existing = await getSeccionesTenant(tenantId);
  if (existing.length > 0) {
    console.log(`Tenant ${tenantId} ya tiene secciones configuradas`);
    return;
  }

  // Crear secciones por defecto
  const seccionesPorDefecto = [
    { tipo: 'header', variante: 'default', orden: 0, datos: {} },
    { tipo: 'footer', variante: 'default', orden: 100, datos: {} },
    { tipo: 'property_card', variante: 'default', orden: 50, datos: {} },
  ];

  for (const seccion of seccionesPorDefecto) {
    await saveSeccionTenant(tenantId, {
      ...seccion,
      scope: 'tenant',
    });
  }

  console.log(`✅ Secciones por defecto creadas para tenant ${tenantId}`);
}

// =============================================================================
// SISTEMA DE COMPONENTES GLOBALES REUTILIZABLES
// =============================================================================

/**
 * Obtiene todos los componentes globales de un tenant (para reutilización)
 * Incluye todos los tipos excepto los que se filtren
 */
export async function getComponentesGlobales(
  tenantId: string,
  tipo?: string
): Promise<SeccionConfig[]> {
  let sql = `
    SELECT
      id,
      tenant_id as "tenantId",
      tipo,
      variante,
      nombre,
      datos,
      activo,
      orden,
      scope,
      tipo_pagina as "tipoPagina",
      pagina_id as "paginaId",
      COALESCE(es_activo, true) as "esActivo"
    FROM componentes_web
    WHERE tenant_id = $1
      AND scope = 'tenant'
      AND activo = true
  `;

  const params: any[] = [tenantId];

  if (tipo) {
    sql += ` AND tipo = $2`;
    params.push(tipo);
  }

  sql += ` ORDER BY tipo, nombre, orden ASC`;

  const result = await query(sql, params);

  return result.rows.map((row: any) => ({
    id: row.id,
    tenantId: row.tenantId,
    tipo: row.tipo,
    variante: row.variante,
    nombre: row.nombre,
    datos: typeof row.datos === 'string' ? JSON.parse(row.datos) : row.datos,
    activo: row.activo,
    orden: row.orden,
    scope: row.scope,
    tipoPagina: row.tipoPagina,
    paginaId: row.paginaId,
    esActivo: row.esActivo,
  }));
}

/**
 * Obtiene los componentes asignados a una página específica
 * Incluye tanto referencias a componentes globales como componentes propios de la página
 */
export async function getComponentesPagina(
  tenantId: string,
  paginaId: string
): Promise<Array<SeccionConfig & { esReferencia: boolean }>> {
  console.log(`📋 getComponentesPagina: tenantId=${tenantId}, paginaId=${paginaId}`);
  
  // Usar la misma lógica que getSeccionesResueltas para consistencia
  // pero adaptada para devolver también esReferencia

  const sql = `
    WITH
    -- 1. Componentes globales únicos del tenant (header, footer siempre aplican)
    componentes_globales_unicos AS (
    SELECT
      c.id,
      c.tenant_id as "tenantId",
        c.tipo,
        c.variante,
      c.nombre,
      c.datos,
      c.activo,
        CASE 
          WHEN c.tipo = 'header' THEN -1000
          WHEN c.tipo = 'footer' THEN 9999
          ELSE c.orden
        END as orden,
        c.scope,
        c.tipo_pagina as "tipoPagina",
        c.pagina_id as "paginaId",
        false as "esReferencia",
        3 as prioridad  -- Globales tienen menor prioridad
      FROM componentes_web c
      WHERE c.tenant_id = $1
        AND c.activo = true
        AND c.scope = 'tenant'
        AND c.tipo IN ('header', 'footer')
    ),
    -- 2. Componentes asignados a esta página específicamente (via paginas_componentes)
    componentes_pagina_ref AS (
      SELECT
        c.id,
        c.tenant_id as "tenantId",
        c.tipo,
        c.variante,
        c.nombre,
        c.datos,
        c.activo,
        pc.orden,  -- Usar orden de la relación
        c.scope,
        c.tipo_pagina as "tipoPagina",
        c.pagina_id as "paginaId",
        true as "esReferencia",
        1 as prioridad  -- Referencias tienen mayor prioridad
    FROM paginas_componentes pc
    INNER JOIN componentes_web c ON c.id = pc.componente_id
      WHERE pc.pagina_id = $2
        AND pc.activo = true  -- La relación debe estar activa
        AND c.activo = true   -- El componente debe estar activo
    ),
    -- 3. Componentes específicos de esta página (scope='page')
    componentes_pagina_especificos AS (
      SELECT
        c.id,
        c.tenant_id as "tenantId",
        c.tipo,
        c.variante,
        c.nombre,
        c.datos,
        c.activo,
        c.orden,
        c.scope,
        c.tipo_pagina as "tipoPagina",
        c.pagina_id as "paginaId",
        false as "esReferencia",
        2 as prioridad  -- Específicos tienen prioridad media
      FROM componentes_web c
      WHERE c.tenant_id = $1
        AND c.pagina_id = $2
      AND c.activo = true
        AND c.scope = 'page'
    ),
    -- Unión de todas las fuentes
    todos_componentes AS (
      SELECT * FROM componentes_globales_unicos
      UNION ALL
      SELECT * FROM componentes_pagina_ref
      UNION ALL
      SELECT * FROM componentes_pagina_especificos
    ),
    -- Para header/footer: si hay una referencia o específico, usar ese; sino usar el global
    -- Para otros tipos: incluir todos (puede haber múltiples del mismo tipo en una página)
    componentes_filtrados AS (
      SELECT DISTINCT ON (
        CASE
          WHEN tipo IN ('header', 'footer') THEN tipo  -- Solo un header/footer por página
          ELSE id::text  -- Otros componentes: todos son únicos por ID (convertir a text)
        END
      )
        id,
        "tenantId",
        tipo,
        variante,
        nombre,
        datos,
        activo,
        orden,
        scope,
        "tipoPagina",
        "paginaId",
        "esReferencia"
      FROM todos_componentes
      ORDER BY
        CASE
          WHEN tipo IN ('header', 'footer') THEN tipo
          ELSE id::text
        END,
        prioridad ASC,  -- Prioridad: referencias > específicos > globales
        orden ASC
    )
    SELECT 
      id,
      "tenantId",
      tipo,
      variante,
      nombre,
      datos,
      activo,
      orden,
      scope,
      "tipoPagina",
      "paginaId",
      "esReferencia"
    FROM componentes_filtrados
    ORDER BY 
      CASE WHEN tipo = 'header' THEN 0 ELSE 1 END,
      CASE WHEN tipo = 'footer' THEN 999999 ELSE orden END
  `;

  const result = await query(sql, [tenantId, paginaId]);

  console.log(`✅ getComponentesPagina: ${result.rows.length} componentes encontrados`);
  result.rows.forEach((row: any, idx: number) => {
    console.log(`  [${idx}] ${row.tipo} (${row.variante}) - scope: ${row.scope}, esReferencia: ${row.esReferencia}`);
  });

  const mapRow = (row: any) => ({
    id: row.id,
    tenantId: row.tenantId,
    tipo: row.tipo,
    variante: row.variante,
    nombre: row.nombre,
    datos: typeof row.datos === 'string' ? JSON.parse(row.datos) : row.datos,
    activo: row.activo,
    orden: row.orden,
    scope: row.scope,
    tipoPagina: row.tipoPagina,
    paginaId: row.paginaId,
    esReferencia: row.esReferencia || false,
  });

  return result.rows.map(mapRow);
}

/**
 * Agrega un componente global existente a una página (crea referencia)
 */
export async function agregarComponenteAPagina(
  paginaId: string,
  componenteId: string,
  orden?: number
): Promise<{ id: string }> {
  // Obtener el orden máximo actual
  if (orden === undefined) {
    const maxOrden = await query(
      `SELECT COALESCE(MAX(orden), 0) + 1 as next_orden FROM paginas_componentes WHERE pagina_id = $1`,
      [paginaId]
    );
    orden = maxOrden.rows[0]?.next_orden || 1;
  }

  const sql = `
    INSERT INTO paginas_componentes (pagina_id, componente_id, orden, activo)
    VALUES ($1, $2, $3, true)
    ON CONFLICT (pagina_id, componente_id) DO UPDATE SET orden = $3, activo = true
    RETURNING id
  `;

  const result = await query(sql, [paginaId, componenteId, orden]);
  return { id: result.rows[0].id };
}

/**
 * Remueve un componente de una página (solo elimina la referencia, no el componente)
 */
export async function removerComponenteDePagina(
  paginaId: string,
  componenteId: string
): Promise<void> {
  await query(
    `DELETE FROM paginas_componentes WHERE pagina_id = $1 AND componente_id = $2`,
    [paginaId, componenteId]
  );
}

/**
 * Actualiza el orden de los componentes en una página
 */
export async function reordenarComponentesPagina(
  paginaId: string,
  ordenComponentes: Array<{ componenteId: string; orden: number }>
): Promise<void> {
  for (const item of ordenComponentes) {
    await query(
      `UPDATE paginas_componentes SET orden = $1 WHERE pagina_id = $2 AND componente_id = $3`,
      [item.orden, paginaId, item.componenteId]
    );
  }
}

/**
 * Crea un nuevo componente global reutilizable
 */
export async function crearComponenteGlobal(
  tenantId: string,
  data: {
    tipo: string;
    variante: string;
    nombre: string;
    datos?: Record<string, any>;
    orden?: number;
  }
): Promise<SeccionConfig> {
  const sql = `
    INSERT INTO componentes_web (
      tenant_id, tipo, variante, nombre, datos, scope, activo, es_activo, orden
    )
    VALUES ($1, $2, $3, $4, $5, 'tenant', true, true, $6)
    RETURNING
      id,
      tenant_id as "tenantId",
      tipo,
      variante,
      nombre,
      datos,
      activo,
      orden,
      scope,
      tipo_pagina as "tipoPagina",
      pagina_id as "paginaId",
      es_activo as "esActivo"
  `;

  const result = await query(sql, [
    tenantId,
    data.tipo,
    data.variante,
    data.nombre,
    JSON.stringify(data.datos || { static_data: {}, toggles: {} }),
    data.orden || 0
  ]);

  const row = result.rows[0];
  return {
    id: row.id,
    tenantId: row.tenantId,
    tipo: row.tipo,
    variante: row.variante,
    nombre: row.nombre,
    datos: typeof row.datos === 'string' ? JSON.parse(row.datos) : row.datos,
    activo: row.activo,
    orden: row.orden,
    scope: row.scope,
    tipoPagina: row.tipoPagina,
    paginaId: row.paginaId,
    esActivo: row.esActivo,
  };
}

/**
 * Actualiza el nombre de un componente global
 */
export async function actualizarNombreComponente(
  componenteId: string,
  nombre: string
): Promise<void> {
  await query(
    `UPDATE componentes_web SET nombre = $1, updated_at = NOW() WHERE id = $2`,
    [nombre, componenteId]
  );
}

/**
 * Duplica un componente global con un nuevo nombre
 */
export async function duplicarComponenteGlobal(
  componenteId: string,
  nuevoNombre: string
): Promise<SeccionConfig> {
  const sql = `
      INSERT INTO componentes_web (
      tenant_id, tipo, variante, nombre, datos, scope, activo, es_activo, orden
      )
      SELECT
      tenant_id, tipo, variante, $2, datos, scope, true, false, orden + 1
      FROM componentes_web
      WHERE id = $1
    RETURNING
      id,
      tenant_id as "tenantId",
      tipo,
      variante,
      nombre,
      datos,
      activo,
      orden,
      scope,
      tipo_pagina as "tipoPagina",
      pagina_id as "paginaId",
      es_activo as "esActivo"
  `;

  const result = await query(sql, [componenteId, nuevoNombre]);
  const row = result.rows[0];

  return {
    id: row.id,
    tenantId: row.tenantId,
    tipo: row.tipo,
    variante: row.variante,
    nombre: row.nombre,
    datos: typeof row.datos === 'string' ? JSON.parse(row.datos) : row.datos,
    activo: row.activo,
    orden: row.orden,
    scope: row.scope,
    tipoPagina: row.tipoPagina,
    paginaId: row.paginaId,
    esActivo: row.esActivo,
  };
}
