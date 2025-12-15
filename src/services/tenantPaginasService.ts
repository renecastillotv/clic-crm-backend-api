import { query } from '../utils/db.js';

/**
 * Servicio para gestionar páginas activas y disponibles por tenant
 */

export interface PaginaActiva {
  id: string;
  tenant_id: string;
  tipo_pagina: string;
  is_visible: boolean;
  is_enabled: boolean;
  variante_activa: string;
  configuracion_variantes: any;
  last_activated_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface PaginaDisponible {
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  plan_minimo?: string;
  is_visible: boolean;
  is_enabled: boolean;
  variante_activa?: string;
  ruta_patron?: string;
  nivel: number;
  es_plantilla: boolean;
  protegida: boolean;
}

/**
 * Obtener todas las páginas disponibles para un tenant
 */
export async function getPaginasDisponiblesParaTenant(tenantId: string): Promise<PaginaDisponible[]> {
  const sql = `
    SELECT
      tp.codigo,
      tp.nombre,
      tp.descripcion,
      tp.categoria,
      tp.plan_minimo,
      tp.ruta_patron,
      tp.nivel,
      tp.es_plantilla,
      tp.protegida,
      COALESCE(tpa.is_visible, tp.is_visible_default, true) as is_visible,
      COALESCE(tpa.is_enabled, false) as is_enabled,
      tpa.variante_activa
    FROM tipos_pagina tp
    LEFT JOIN tenant_paginas_activas tpa
      ON tpa.tipo_pagina = tp.codigo AND tpa.tenant_id = $1
    WHERE tp.es_estandar = true
    ORDER BY
      CASE WHEN tp.codigo = 'homepage' THEN 0 ELSE 1 END,
      tp.categoria DESC,
      tp.nivel,
      tp.codigo
  `;

  const result = await query(sql, [tenantId]);
  return result.rows;
}

/**
 * Obtener páginas visibles según el plan del tenant
 */
export async function getPaginasVisiblesParaTenant(tenantId: string): Promise<PaginaDisponible[]> {
  const paginas = await getPaginasDisponiblesParaTenant(tenantId);
  return paginas.filter(p => p.is_visible);
}

/**
 * Obtener páginas habilitadas por el usuario
 */
export async function getPaginasHabilitadasParaTenant(tenantId: string): Promise<PaginaDisponible[]> {
  const paginas = await getPaginasDisponiblesParaTenant(tenantId);
  return paginas.filter(p => p.is_visible && p.is_enabled);
}

/**
 * Activar una página para un tenant
 */
export async function activarPaginaParaTenant(
  tenantId: string,
  tipoPagina: string,
  variante: string = 'default'
): Promise<PaginaActiva> {
  // Verificar que la página esté visible para el tenant
  const disponibles = await getPaginasDisponiblesParaTenant(tenantId);
  const pagina = disponibles.find(p => p.codigo === tipoPagina);

  if (!pagina) {
    throw new Error(`Tipo de página ${tipoPagina} no existe`);
  }

  if (!pagina.is_visible) {
    throw new Error(`Página ${tipoPagina} no disponible en tu plan actual`);
  }

  // Insertar o actualizar en tenant_paginas_activas
  const sql = `
    INSERT INTO tenant_paginas_activas (
      tenant_id, tipo_pagina, is_visible, is_enabled, variante_activa, last_activated_at
    ) VALUES ($1, $2, true, true, $3, NOW())
    ON CONFLICT (tenant_id, tipo_pagina)
    DO UPDATE SET
      is_enabled = true,
      variante_activa = $3,
      last_activated_at = NOW(),
      updated_at = NOW()
    RETURNING *
  `;

  const result = await query(sql, [tenantId, tipoPagina, variante]);
  return result.rows[0];
}

/**
 * Desactivar una página para un tenant
 */
export async function desactivarPaginaParaTenant(
  tenantId: string,
  tipoPagina: string
): Promise<void> {
  // Verificar si la página está protegida
  const tipoResult = await query(
    'SELECT protegida FROM tipos_pagina WHERE codigo = $1',
    [tipoPagina]
  );

  if (tipoResult.rows[0]?.protegida) {
    throw new Error(`No se puede desactivar la página ${tipoPagina} porque es una página protegida del sistema`);
  }

  const sql = `
    UPDATE tenant_paginas_activas
    SET is_enabled = false, updated_at = NOW()
    WHERE tenant_id = $1 AND tipo_pagina = $2
  `;

  await query(sql, [tenantId, tipoPagina]);
}

/**
 * Cambiar variante activa de una página
 */
export async function cambiarVariantePagina(
  tenantId: string,
  tipoPagina: string,
  nuevaVariante: string
): Promise<PaginaActiva> {
  // Guardar la configuración actual en configuracion_variantes
  const actual = await query(
    'SELECT variante_activa, configuracion_variantes FROM tenant_paginas_activas WHERE tenant_id = $1 AND tipo_pagina = $2',
    [tenantId, tipoPagina]
  );

  if (actual.rows.length === 0) {
    throw new Error('Página no activa para este tenant');
  }

  const { variante_activa, configuracion_variantes } = actual.rows[0];
  const configs = configuracion_variantes || {};

  // TODO: Aquí deberíamos obtener la config actual de paginas_variantes_config
  // y guardarla en configuracion_variantes[variante_activa]
  // Por ahora dejamos el objeto como está

  const sql = `
    UPDATE tenant_paginas_activas
    SET variante_activa = $3, updated_at = NOW()
    WHERE tenant_id = $1 AND tipo_pagina = $2
    RETURNING *
  `;

  const result = await query(sql, [tenantId, tipoPagina, nuevaVariante]);
  return result.rows[0];
}

/**
 * Actualizar páginas disponibles cuando cambia el plan de un tenant
 */
export async function actualizarPaginasDisponiblesPorPlan(
  tenantId: string,
  planNuevo: string
): Promise<void> {
  // Jerarquía de planes
  const jerarquiaPlanes = ['basic', 'pro', 'premium', 'enterprise'];
  const nivelPlan = jerarquiaPlanes.indexOf(planNuevo);

  if (nivelPlan === -1) {
    throw new Error(`Plan no válido: ${planNuevo}`);
  }

  // Obtener todos los tipos de página
  const tiposResult = await query('SELECT codigo, plan_minimo FROM tipos_pagina WHERE es_estandar = true');

  for (const tipo of tiposResult.rows) {
    const nivelRequerido = tipo.plan_minimo
      ? jerarquiaPlanes.indexOf(tipo.plan_minimo)
      : 0;

    const isVisible = nivelPlan >= nivelRequerido;

    // Actualizar o crear registro
    await query(
      `INSERT INTO tenant_paginas_activas (tenant_id, tipo_pagina, is_visible, is_enabled)
       VALUES ($1, $2, $3, false)
       ON CONFLICT (tenant_id, tipo_pagina)
       DO UPDATE SET is_visible = $3, updated_at = NOW()`,
      [tenantId, tipo.codigo, isVisible]
    );
  }
}

/**
 * Inicializar páginas para un nuevo tenant
 */
export async function inicializarPaginasParaTenant(
  tenantId: string,
  plan: string = 'basic'
): Promise<void> {
  // Crear registros en tenant_paginas_activas para todas las páginas
  await actualizarPaginasDisponiblesPorPlan(tenantId, plan);

  console.log(`✅ Páginas inicializadas para tenant ${tenantId} con plan ${plan}`);
}

/**
 * Obtener estadísticas de páginas de un tenant
 */
export async function getEstadisticasPaginasTenant(tenantId: string): Promise<{
  total_disponibles: number;
  total_visibles: number;
  total_habilitadas: number;
  por_categoria: { [key: string]: number };
}> {
  const disponibles = await getPaginasDisponiblesParaTenant(tenantId);

  const stats = {
    total_disponibles: disponibles.length,
    total_visibles: disponibles.filter(p => p.is_visible).length,
    total_habilitadas: disponibles.filter(p => p.is_enabled).length,
    por_categoria: {} as { [key: string]: number },
  };

  // Contar por categoría
  for (const pagina of disponibles) {
    if (!stats.por_categoria[pagina.categoria]) {
      stats.por_categoria[pagina.categoria] = 0;
    }
    if (pagina.is_visible && pagina.is_enabled) {
      stats.por_categoria[pagina.categoria]++;
    }
  }

  return stats;
}

/**
 * Verificar si un tenant puede activar una página
 */
export async function tenantPuedeActivarPagina(
  tenantId: string,
  tipoPagina: string
): Promise<{ puede: boolean; razon?: string }> {
  const disponibles = await getPaginasDisponiblesParaTenant(tenantId);
  const pagina = disponibles.find(p => p.codigo === tipoPagina);

  if (!pagina) {
    return { puede: false, razon: 'Tipo de página no existe' };
  }

  if (!pagina.is_visible) {
    return {
      puede: false,
      razon: `Esta página requiere el plan ${pagina.plan_minimo || 'superior'}. Actualiza tu plan para acceder a ella.`,
    };
  }

  return { puede: true };
}

/**
 * Obtener configuración guardada de todas las variantes de una página
 */
export async function getConfiguracionesVariantes(
  tenantId: string,
  tipoPagina: string
): Promise<any> {
  const result = await query(
    'SELECT configuracion_variantes FROM tenant_paginas_activas WHERE tenant_id = $1 AND tipo_pagina = $2',
    [tenantId, tipoPagina]
  );

  return result.rows[0]?.configuracion_variantes || {};
}

/**
 * Guardar configuración de una variante
 */
export async function guardarConfiguracionVariante(
  tenantId: string,
  tipoPagina: string,
  variante: string,
  configuracion: any
): Promise<void> {
  // Obtener configuraciones existentes
  const configs = await getConfiguracionesVariantes(tenantId, tipoPagina);
  configs[variante] = configuracion;

  await query(
    `UPDATE tenant_paginas_activas
     SET configuracion_variantes = $3, updated_at = NOW()
     WHERE tenant_id = $1 AND tipo_pagina = $2`,
    [tenantId, tipoPagina, JSON.stringify(configs)]
  );
}
