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

// Helper function para extraer la primera variante de un array de variantes
function extractVariante(variantes: any): string {
  if (!variantes) return 'default';
  const arr = typeof variantes === 'string' ? JSON.parse(variantes) : variantes;
  if (Array.isArray(arr) && arr.length > 0) {
    return arr[0]?.id || arr[0] || 'default';
  }
  return 'default';
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
  componente_key?: string;    // Key del componente para matching
}

/**
 * Obtiene el catálogo de componentes disponibles
 *
 * @param tenantId - ID del tenant (opcional) para filtrar variantes por features
 *
 * Columnas reales de catalogo_componentes:
 * tipo, nombre, descripcion, icono, categoria, campos_config, active, id, variantes, required_features, componente_key
 */
export async function getCatalogoComponentes(tenantId?: string): Promise<CatalogoComponente[]> {
  const sql = `
    SELECT
      id,
      tipo,
      nombre,
      descripcion,
      icono,
      categoria,
      variantes,
      campos_config as "camposConfig",
      active,
      required_features as "requiredFeatures"
    FROM catalogo_componentes
    WHERE active = true
    ORDER BY categoria, tipo
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
    // Parsear variantes y asegurar que sea un array
    let variantes = row.variantes;
    if (typeof variantes === 'string') {
      try {
        variantes = JSON.parse(variantes);
      } catch {
        variantes = [];
      }
    }
    // Asegurar que siempre sea un array
    if (!Array.isArray(variantes)) {
      variantes = [];
    }

    // Filtrar variantes que requieren features si tenantId está presente
    if (tenantId && variantes.length > 0) {
      variantes = variantes.filter((v: any) => {
        // Si la variante requiere un feature, verificar que el tenant lo tenga
        if (v && v.requiresFeature) {
          return tenantFeatures.includes(v.requiresFeature);
        }
        // Si no requiere feature, siempre disponible
        return true;
      });
    }

    return {
      id: row.id, // UUID del componente en el catálogo
      tipo: row.tipo,
      nombre: row.nombre,
      descripcion: row.descripcion,
      icono: row.icono,
      categoria: row.categoria,
      variantes: variantes,
      camposConfig: typeof row.camposConfig === 'string' ? JSON.parse(row.camposConfig) : (row.camposConfig || []),
      esGlobal: false, // Esta columna no existe, usar default
      disponible: row.active,
      orden: 0, // Esta columna no existe, usar default
    };
  });
}

/**
 * Obtiene un componente del catálogo por tipo
 * Retorna el schema_config (campos_config) para el editor dinámico
 */
export async function getComponenteCatalogoPorTipo(tipo: string): Promise<{
  id: string;
  tipo: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  categoria?: string;
  schema_config?: {
    campos?: any[];
    toggles?: any[];
  };
  variantes?: any[];
} | null> {
  const sql = `
    SELECT
      id,
      tipo,
      nombre,
      descripcion,
      icono,
      categoria,
      campos_config,
      variantes
    FROM catalogo_componentes
    WHERE tipo = $1 AND active = true
    LIMIT 1
  `;

  const result = await query(sql, [tipo]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  const camposConfig = typeof row.campos_config === 'string'
    ? JSON.parse(row.campos_config)
    : row.campos_config;

  return {
    id: row.id,
    tipo: row.tipo,
    nombre: row.nombre,
    descripcion: row.descripcion,
    icono: row.icono,
    categoria: row.categoria,
    schema_config: camposConfig,
    variantes: row.variantes,
  };
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
      cc.variantes,
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
  // 1.5 FALLBACK: Si no hay header/footer globales, buscar en homepage
  // Algunos tenants (como CLIC) tienen header/footer con tipo_pagina_id='homepage'
  // en lugar de ser verdaderamente globales (NULL)
  // =========================================================================
  let headerFromHomepage = null;
  let footerFromHomepage = null;

  const hasGlobalHeader = resultGlobales.rows.some((r: any) => r.tipo === 'header');
  const hasGlobalFooter = resultGlobales.rows.some((r: any) => r.tipo === 'footer');

  if (!hasGlobalHeader || !hasGlobalFooter) {
    console.log(`📦 [getSeccionesResueltas] Buscando header/footer en homepage como fallback...`);

    const sqlHomepageFallback = `
      SELECT
        c.id,
        c.tenant_id as "tenantId",
        cc.tipo,
        cc.variantes,
        c.nombre,
        c.datos,
        c.activo,
        c.orden
      FROM componentes_web c
      INNER JOIN catalogo_componentes cc ON c.componente_catalogo_id = cc.id
      INNER JOIN tipos_pagina tp ON c.tipo_pagina_id = tp.id
      WHERE c.tenant_id = $1
        AND c.activo = true
        AND tp.codigo = 'homepage'
        AND cc.tipo IN ('header', 'footer')
    `;

    const resultHomepageFallback = await query(sqlHomepageFallback, [tenantId]);

    if (!hasGlobalHeader) {
      headerFromHomepage = resultHomepageFallback.rows.find((r: any) => r.tipo === 'header');
      if (headerFromHomepage) {
        console.log(`   ✅ Encontrado header en homepage como fallback`);
      }
    }

    if (!hasGlobalFooter) {
      footerFromHomepage = resultHomepageFallback.rows.find((r: any) => r.tipo === 'footer');
      if (footerFromHomepage) {
        console.log(`   ✅ Encontrado footer en homepage como fallback`);
      }
    }
  }

  // =========================================================================
  // 2. Buscar componentes por tipo de pagina (scope='page_type')
  // Estos son componentes con tipo_pagina_id que coincide con el tipo de página
  // =========================================================================
  const sqlPorTipo = `
    SELECT
      c.id,
      c.tenant_id as "tenantId",
      cc.tipo,
      cc.variantes,
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
  // 4. Agregar Header y Footer (globales o de homepage como fallback)
  // =========================================================================
  const header = resultGlobales.rows.find((r: any) => r.tipo === 'header') || headerFromHomepage;
  if (header) {
    componentes.push({
      id: header.id,
      tenantId: header.tenantId,
      tipo: header.tipo,
      variante: extractVariante(header.variantes),
      nombre: header.nombre,
      datos: typeof header.datos === 'string' ? JSON.parse(header.datos) : header.datos,
      activo: true,
      orden: 0,
      scope: 'tenant',
      tipoPagina: null,
      paginaId: null,
    });
  }

  const footer = resultGlobales.rows.find((r: any) => r.tipo === 'footer') || footerFromHomepage;
  if (footer) {
    componentes.push({
      id: footer.id,
      tenantId: footer.tenantId,
      tipo: footer.tipo,
      variante: extractVariante(footer.variantes),
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
        variante: extractVariante(row.variantes),
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
        variante: extractVariante(row.variantes),
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
    // NO hay componentes en BD para este tenant/tipoPagina
    // Buscar en plantillas_pagina los componentes default (solo si includeFallback = true)
    console.log(`⚠️ [getSeccionesResueltas] No hay componentes en BD para ${tipoPagina}`);

    if (includeFallback) {
      console.log(`  📋 Buscando componentes en plantillas_pagina...`);

      // Consultar plantillas_pagina para obtener componentes por defecto
      const sqlPlantillas = `
        SELECT
          pp.id,
          cc.tipo,
          cc.nombre,
          cc.variantes,
          pp.orden,
          pp.datos_default as "datosDefault",
          pp.es_global as "esGlobal"
        FROM plantillas_pagina pp
        INNER JOIN tipos_pagina tp ON pp.tipo_pagina_id = tp.id
        INNER JOIN catalogo_componentes cc ON pp.componente_catalogo_id = cc.id
        WHERE tp.codigo = $1
          AND pp.activo = true
          AND pp.es_global = false
        ORDER BY pp.orden
      `;

      const plantillasResult = await query(sqlPlantillas, [tipoPagina]);

      if (plantillasResult.rows.length > 0) {
        console.log(`  📦 Usando ${plantillasResult.rows.length} componentes de plantillas_pagina`);

        for (const plantilla of plantillasResult.rows) {
          const datosDefault = typeof plantilla.datosDefault === 'string'
            ? JSON.parse(plantilla.datosDefault)
            : plantilla.datosDefault || {};

          componentes.push({
            id: `plantilla-${plantilla.id}-${tipoPagina}`,
            tenantId,
            tipo: plantilla.tipo,
            variante: extractVariante(plantilla.variantes),
            nombre: plantilla.nombre,
            datos: {
              ...datosDefault,
              tipoPagina,
            },
            activo: true,
            orden: plantilla.orden,
            scope: 'page_type',
            tipoPagina,
            paginaId: null,
          });
        }
      } else {
        console.log(`  ⚠️ No hay plantillas definidas para ${tipoPagina}`);
      }
    }

    // =========================================================================
    // FALLBACK PARA PÁGINAS SINGLE: Si aún no hay componentes de contenido
    // y es una página single, crear un componente virtual con el tipo correcto
    // =========================================================================
    const haContentComponent = componentes.some(c =>
      !['header', 'footer'].includes(c.tipo)
    );

    if (!haContentComponent && tipoPagina.endsWith('_single')) {
      console.log(`  📦 [getSeccionesResueltas] Creando componente virtual para página single: ${tipoPagina}`);

      // Mapeo de tipoPagina a tipo de componente y dataType
      const singlePageMappings: Record<string, { tipo: string; dataType: string }> = {
        'asesor_single': { tipo: 'agent_profile', dataType: 'asesor_single' },
        'videos_single': { tipo: 'video_detail', dataType: 'video_single' },
        'articulos_single': { tipo: 'article_detail', dataType: 'articulo_single' },
        'testimonios_single': { tipo: 'testimonial_detail', dataType: 'testimonio_single' },
        'single_testimonio': { tipo: 'testimonial_detail', dataType: 'testimonio_single' },
        'single_articulo': { tipo: 'article_detail', dataType: 'articulo_single' },
        'propiedades_single': { tipo: 'property_detail', dataType: 'propiedad_single' },
        'single_property': { tipo: 'property_detail', dataType: 'propiedad_single' },
      };

      const mapping = singlePageMappings[tipoPagina];
      if (mapping) {
        componentes.push({
          id: `auto-single-${tipoPagina}`,
          tenantId,
          tipo: mapping.tipo,
          variante: 'default',
          nombre: `${tipoPagina} (auto-generado)`,
          datos: {
            tipoPagina,
            dynamic_data: {
              dataType: mapping.dataType,
            },
          },
          activo: true,
          orden: 50, // Entre header (0) y footer (100)
          scope: 'page_type',
          tipoPagina,
          paginaId: null,
        });
        console.log(`  ✅ Componente virtual creado: ${mapping.tipo} con dataType=${mapping.dataType}`);
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
  // Componentes globales = sin tipo_pagina_id (no asignados a ninguna página específica)
  let sql = `
    SELECT
      c.id,
      c.tenant_id as "tenantId",
      cc.tipo,
      cc.variantes,
      c.nombre,
      c.datos,
      c.activo,
      c.orden,
      c.tipo_pagina_id as "tipoPaginaId"
    FROM componentes_web c
    LEFT JOIN catalogo_componentes cc ON c.componente_catalogo_id = cc.id
    WHERE c.tenant_id = $1
      AND c.tipo_pagina_id IS NULL
      AND c.activo = true
  `;

  const params: any[] = [tenantId];

  if (tipo) {
    sql += ` AND cc.tipo = $2`;
    params.push(tipo);
  }

  sql += ` ORDER BY cc.tipo, c.nombre, c.orden ASC`;

  const result = await query(sql, params);

  return result.rows.map((row: any) => ({
    id: row.id,
    tenantId: row.tenantId,
    tipo: row.tipo || 'unknown',
    variante: extractVariante(row.variantes),
    nombre: row.nombre,
    datos: typeof row.datos === 'string' ? JSON.parse(row.datos) : (row.datos || {}),
    activo: row.activo,
    orden: row.orden,
    scope: 'tenant',
    tipoPagina: null,
    paginaId: row.tipoPaginaId,
  }));
}

/**
 * Obtiene los componentes asignados a una página específica
 *
 * ARQUITECTURA ACTUAL:
 * - paginaId es el UUID de tipos_pagina (NO paginas_web que no existe)
 * - Los componentes se vinculan via tipo_pagina_id en componentes_web
 * - El tipo y variante vienen de catalogo_componentes via componente_catalogo_id
 * - Header/Footer globales: tipo_pagina_id IS NULL
 */
export async function getComponentesPagina(
  tenantId: string,
  paginaIdOrCode: string
): Promise<Array<SeccionConfig & { esReferencia: boolean }>> {
  console.log(`📋 getComponentesPagina: tenantId=${tenantId}, paginaIdOrCode=${paginaIdOrCode}`);

  // Determinar si es UUID o código de tipo de página
  let tipoPaginaId: string | null = null;
  if (isValidUUID(paginaIdOrCode)) {
    tipoPaginaId = paginaIdOrCode;
  } else {
    // Es un código, buscar el UUID en tipos_pagina
    const tpResult = await query(
      `SELECT id FROM tipos_pagina WHERE codigo = $1`,
      [paginaIdOrCode]
    );
    if (tpResult.rows.length > 0) {
      tipoPaginaId = tpResult.rows[0].id;
    }
    console.log(`🔄 Código "${paginaIdOrCode}" convertido a tipo_pagina_id: ${tipoPaginaId}`);
  }

  if (!tipoPaginaId) {
    console.warn(`⚠️ No se encontró tipo_pagina para: ${paginaIdOrCode}`);
    // Retornar solo componentes globales (header/footer)
    const globalSql = `
      SELECT
        c.id,
        c.tenant_id as "tenantId",
        cc.tipo,
        cc.variantes,
        cc.campos_config as "camposConfig",
        c.componente_catalogo_id as "componenteCatalogoId",
        c.nombre,
        c.datos,
        c.activo,
        c.orden,
        tp.codigo as "tipoPagina",
        c.tipo_pagina_id as "tipoPaginaId"
      FROM componentes_web c
      LEFT JOIN catalogo_componentes cc ON c.componente_catalogo_id = cc.id
      LEFT JOIN tipos_pagina tp ON c.tipo_pagina_id = tp.id
      WHERE c.tenant_id = $1
        AND c.activo = true
        AND c.tipo_pagina_id IS NULL
        AND cc.tipo IN ('header', 'footer')
      ORDER BY
        CASE WHEN cc.tipo = 'header' THEN 0 ELSE 1 END
    `;
    const globalResult = await query(globalSql, [tenantId]);
    return globalResult.rows.map((row: any) => mapComponenteRow(row));
  }

  // Helper local para mapear filas
  function mapComponenteRow(row: any) {
    let variante = 'default';
    if (row.variantes) {
      const variantes = typeof row.variantes === 'string' ? JSON.parse(row.variantes) : row.variantes;
      if (Array.isArray(variantes) && variantes.length > 0) {
        variante = variantes[0]?.id || variantes[0] || 'default';
      }
    }
    // Parsear camposConfig
    let camposConfig = null;
    if (row.camposConfig) {
      camposConfig = typeof row.camposConfig === 'string' ? JSON.parse(row.camposConfig) : row.camposConfig;
    }
    return {
      id: row.id,
      tenantId: row.tenantId,
      tipo: row.tipo || 'unknown',
      variante,
      nombre: row.nombre,
      datos: typeof row.datos === 'string' ? JSON.parse(row.datos) : (row.datos || {}),
      activo: row.activo,
      orden: row.orden,
      scope: row.tipoPaginaId ? 'page_type' as const : 'tenant' as const,
      tipoPagina: row.tipoPagina,
      paginaId: row.tipoPaginaId,
      esReferencia: false,
      componenteCatalogoId: row.componenteCatalogoId,
      camposConfig,
    };
  }

  // Query usando tipo_pagina_id
  const sql = `
    SELECT
      c.id,
      c.tenant_id as "tenantId",
      cc.tipo,
      cc.variantes,
      cc.campos_config as "camposConfig",
      c.componente_catalogo_id as "componenteCatalogoId",
      c.nombre,
      c.datos,
      c.activo,
      c.orden,
      tp.codigo as "tipoPagina",
      c.tipo_pagina_id as "tipoPaginaId"
    FROM componentes_web c
    LEFT JOIN catalogo_componentes cc ON c.componente_catalogo_id = cc.id
    LEFT JOIN tipos_pagina tp ON c.tipo_pagina_id = tp.id
    WHERE c.tenant_id = $1
      AND c.activo = true
      AND (
        c.tipo_pagina_id = $2  -- Componentes de este tipo de página
        OR (c.tipo_pagina_id IS NULL AND cc.tipo IN ('header', 'footer'))  -- Header/footer globales
      )
    ORDER BY
      CASE WHEN cc.tipo = 'header' THEN 0 ELSE 1 END,
      CASE WHEN cc.tipo = 'footer' THEN 999999 ELSE c.orden END
  `;

  const result = await query(sql, [tenantId, tipoPaginaId]);

  console.log(`✅ getComponentesPagina: ${result.rows.length} componentes encontrados`);
  result.rows.forEach((row: any, idx: number) => {
    console.log(`  [${idx}] ${row.tipo} - tipoPagina: ${row.tipoPagina || 'global'}`);
  });

  return result.rows.map((row: any) => mapComponenteRow(row));
}

/**
 * Agrega un componente a una página asignando tipo_pagina_id
 *
 * ARQUITECTURA ACTUAL:
 * - paginaId es el UUID de tipos_pagina
 * - Se actualiza tipo_pagina_id en el componente existente
 */
export async function agregarComponenteAPagina(
  paginaId: string,
  componenteId: string,
  orden?: number
): Promise<{ id: string }> {
  // Obtener el orden máximo actual de componentes en esta página
  if (orden === undefined) {
    const maxOrden = await query(
      `SELECT COALESCE(MAX(orden), 0) + 1 as next_orden FROM componentes_web WHERE tipo_pagina_id = $1`,
      [paginaId]
    );
    orden = maxOrden.rows[0]?.next_orden || 1;
  }

  // Actualizar el componente para asignarlo a esta página
  const sql = `
    UPDATE componentes_web
    SET tipo_pagina_id = $1, orden = $2, updated_at = NOW()
    WHERE id = $3
    RETURNING id
  `;

  const result = await query(sql, [paginaId, orden, componenteId]);
  return { id: result.rows[0]?.id || componenteId };
}

/**
 * Remueve un componente de una página (quita el tipo_pagina_id)
 */
export async function removerComponenteDePagina(
  paginaId: string,
  componenteId: string
): Promise<void> {
  await query(
    `UPDATE componentes_web SET tipo_pagina_id = NULL, updated_at = NOW() WHERE id = $1 AND tipo_pagina_id = $2`,
    [componenteId, paginaId]
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
      `UPDATE componentes_web SET orden = $1, updated_at = NOW() WHERE id = $2 AND tipo_pagina_id = $3`,
      [item.orden, item.componenteId, paginaId]
    );
  }
}

/**
 * Crea un nuevo componente global reutilizable
 *
 * ARQUITECTURA ACTUAL:
 * - tipo y variante se buscan en catalogo_componentes
 * - Se usa componente_catalogo_id para vincular
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
  // Primero buscar el componente_catalogo_id por tipo
  const catalogoResult = await query(
    `SELECT id FROM catalogo_componentes WHERE tipo = $1 LIMIT 1`,
    [data.tipo]
  );

  if (catalogoResult.rows.length === 0) {
    throw new Error(`Tipo de componente no encontrado en catálogo: ${data.tipo}`);
  }

  const componenteCatalogoId = catalogoResult.rows[0].id;

  const sql = `
    INSERT INTO componentes_web (
      tenant_id, componente_catalogo_id, nombre, datos, activo, orden
    )
    VALUES ($1, $2, $3, $4, true, $5)
    RETURNING
      id,
      tenant_id as "tenantId",
      nombre,
      datos,
      activo,
      orden,
      tipo_pagina_id as "tipoPaginaId"
  `;

  const result = await query(sql, [
    tenantId,
    componenteCatalogoId,
    data.nombre,
    JSON.stringify(data.datos || { static_data: {}, toggles: {} }),
    data.orden || 0
  ]);

  const row = result.rows[0];
  return {
    id: row.id,
    tenantId: row.tenantId,
    tipo: data.tipo,
    variante: data.variante,
    nombre: row.nombre,
    datos: typeof row.datos === 'string' ? JSON.parse(row.datos) : row.datos,
    activo: row.activo,
    orden: row.orden,
    scope: 'tenant',
    tipoPagina: null,
    paginaId: row.tipoPaginaId,
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
      tenant_id, componente_catalogo_id, nombre, datos, activo, orden
    )
    SELECT
      tenant_id, componente_catalogo_id, $2, datos, true, orden + 1
    FROM componentes_web
    WHERE id = $1
    RETURNING
      id,
      tenant_id as "tenantId",
      nombre,
      datos,
      activo,
      orden,
      tipo_pagina_id as "tipoPaginaId",
      componente_catalogo_id as "componenteCatalogoId"
  `;

  const result = await query(sql, [componenteId, nuevoNombre]);
  const row = result.rows[0];

  // Obtener tipo del catálogo
  let tipo = 'unknown';
  let variante = 'default';
  if (row.componenteCatalogoId) {
    const catResult = await query(
      `SELECT tipo, variantes FROM catalogo_componentes WHERE id = $1`,
      [row.componenteCatalogoId]
    );
    if (catResult.rows.length > 0) {
      tipo = catResult.rows[0].tipo;
      const variantes = catResult.rows[0].variantes;
      if (Array.isArray(variantes) && variantes.length > 0) {
        variante = variantes[0]?.id || variantes[0] || 'default';
      }
    }
  }

  return {
    id: row.id,
    tenantId: row.tenantId,
    tipo,
    variante,
    nombre: row.nombre,
    datos: typeof row.datos === 'string' ? JSON.parse(row.datos) : row.datos,
    activo: row.activo,
    orden: row.orden,
    scope: 'tenant',
    tipoPagina: null,
    paginaId: row.tipoPaginaId,
  };
}
