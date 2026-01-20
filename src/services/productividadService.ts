/**
 * Servicio de Productividad
 *
 * Sistema de tracking de metas de productividad para asesores.
 *
 * CONCEPTOS:
 * - Metas configurables por tenant (default) y por NIVEL de productividad
 * - Niveles: básico, promedio, experto (personalizables)
 * - Todos los usuarios tienen productividad automática (nivel básico por defecto)
 * - Tracking mensual de: contactos, captaciones, ventas, llamadas, visitas, propuestas
 * - Cálculo ponderado con pesos configurables
 * - Cálculo en tiempo real desde tablas existentes
 */

import { query } from '../utils/db.js';

// ==================== INTERFACES ====================

export interface ConfigProductividad {
  id: string;
  tenant_id: string;
  activo: boolean;
  // Metas por defecto (usadas si nivel no tiene metas propias)
  meta_contactos_mes: number;
  meta_captaciones_mes: number;
  meta_ventas_mes: number;
  meta_llamadas_mes: number;
  meta_visitas_mes: number;
  meta_propuestas_mes: number;
  // Pesos para cálculo ponderado (suman 100%)
  peso_contactos: number;
  peso_captaciones: number;
  peso_ventas: number;
  peso_llamadas: number;
  peso_visitas: number;
  mostrar_ranking: boolean;
  notificar_cumplimiento: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface NivelProductividad {
  id: string;
  tenant_id: string;
  nombre: string;
  codigo: string;
  descripcion: string | null;
  orden: number;
  meta_contactos_mes: number | null;
  meta_captaciones_mes: number | null;
  meta_ventas_mes: number | null;
  meta_llamadas_mes: number | null;
  meta_visitas_mes: number | null;
  meta_propuestas_mes: number | null;
  color: string;
  icono: string | null;
  activo: boolean;
  es_default: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface MetasUsuario {
  id: string;
  tenant_id: string;
  usuario_id: string;
  periodo: string; // YYYY-MM
  meta_contactos: number | null;
  meta_captaciones: number | null;
  meta_ventas: number | null;
  meta_llamadas: number | null;
  meta_visitas: number | null;
  meta_propuestas: number | null;
  notas: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ResumenProductividad {
  usuario_id: string;
  nombre: string;
  apellido: string;
  periodo: string;
  // Contadores reales
  contactos_registrados: number;
  captaciones_registradas: number;
  ventas_cerradas: number;
  llamadas_realizadas: number;
  visitas_realizadas: number;
  propuestas_enviadas: number;
  // Metas
  meta_contactos: number;
  meta_captaciones: number;
  meta_ventas: number;
  meta_llamadas: number;
  meta_visitas: number;
  meta_propuestas: number;
  // Porcentajes de cumplimiento
  pct_contactos: number;
  pct_captaciones: number;
  pct_ventas: number;
  pct_llamadas: number;
  pct_visitas: number;
  pct_propuestas: number;
  pct_global: number;
  // Valores monetarios
  monto_ventas: number;
  monto_comisiones: number;
}

export interface CreateConfigData {
  meta_contactos_mes?: number;
  meta_captaciones_mes?: number;
  meta_ventas_mes?: number;
  meta_llamadas_mes?: number;
  meta_visitas_mes?: number;
  meta_propuestas_mes?: number;
  peso_contactos?: number;
  peso_captaciones?: number;
  peso_ventas?: number;
  peso_llamadas?: number;
  peso_visitas?: number;
  mostrar_ranking?: boolean;
  notificar_cumplimiento?: boolean;
}

// ==================== CONFIGURACIÓN ====================

/**
 * Obtiene la configuración de productividad para un tenant
 */
export async function getConfig(tenantId: string): Promise<ConfigProductividad | null> {
  const sql = `SELECT * FROM config_productividad WHERE tenant_id = $1`;
  const result = await query(sql, [tenantId]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Crea o actualiza la configuración de productividad
 */
export async function upsertConfig(tenantId: string, data: CreateConfigData): Promise<ConfigProductividad> {
  const existing = await getConfig(tenantId);

  if (existing) {
    // Update
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fields = [
      'meta_contactos_mes', 'meta_captaciones_mes', 'meta_ventas_mes',
      'meta_llamadas_mes', 'meta_visitas_mes', 'meta_propuestas_mes',
      'peso_contactos', 'peso_captaciones', 'peso_ventas',
      'peso_llamadas', 'peso_visitas',
      'mostrar_ranking', 'notificar_cumplimiento'
    ];

    for (const field of fields) {
      if ((data as any)[field] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        values.push((data as any)[field]);
      }
    }

    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      values.push(existing.id);

      const sql = `
        UPDATE config_productividad SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      const result = await query(sql, values);
      return result.rows[0];
    }
    return existing;
  } else {
    // Insert
    const sql = `
      INSERT INTO config_productividad (
        tenant_id, activo,
        meta_contactos_mes, meta_captaciones_mes, meta_ventas_mes,
        meta_llamadas_mes, meta_visitas_mes, meta_propuestas_mes,
        peso_contactos, peso_captaciones, peso_ventas, peso_llamadas, peso_visitas,
        mostrar_ranking, notificar_cumplimiento
      ) VALUES ($1, true, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    const result = await query(sql, [
      tenantId,
      data.meta_contactos_mes ?? 30,
      data.meta_captaciones_mes ?? 2,
      data.meta_ventas_mes ?? 1,
      data.meta_llamadas_mes ?? 100,
      data.meta_visitas_mes ?? 20,
      data.meta_propuestas_mes ?? 5,
      data.peso_contactos ?? 20,
      data.peso_captaciones ?? 25,
      data.peso_ventas ?? 30,
      data.peso_llamadas ?? 15,
      data.peso_visitas ?? 10,
      data.mostrar_ranking ?? true,
      data.notificar_cumplimiento ?? true
    ]);
    return result.rows[0];
  }
}

/**
 * Activa o desactiva el sistema de productividad
 */
export async function toggleSistema(tenantId: string, activo: boolean): Promise<ConfigProductividad> {
  const existing = await getConfig(tenantId);

  if (!existing) {
    await upsertConfig(tenantId, {});
  }

  const sql = `
    UPDATE config_productividad
    SET activo = $1, updated_at = NOW()
    WHERE tenant_id = $2
    RETURNING *
  `;
  const result = await query(sql, [activo, tenantId]);
  return result.rows[0];
}

// ==================== METAS POR USUARIO ====================

/**
 * Obtiene las metas personalizadas de un usuario para un período
 */
export async function getMetasUsuario(
  tenantId: string,
  usuarioId: string,
  periodo: string
): Promise<MetasUsuario | null> {
  const sql = `
    SELECT * FROM productividad_metas_usuario
    WHERE tenant_id = $1 AND usuario_id = $2 AND periodo = $3
  `;
  const result = await query(sql, [tenantId, usuarioId, periodo]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Establece metas personalizadas para un usuario
 */
export async function setMetasUsuario(
  tenantId: string,
  usuarioId: string,
  periodo: string,
  metas: {
    meta_contactos?: number;
    meta_captaciones?: number;
    meta_ventas?: number;
    meta_llamadas?: number;
    meta_visitas?: number;
    meta_propuestas?: number;
    notas?: string;
  }
): Promise<MetasUsuario> {
  const sql = `
    INSERT INTO productividad_metas_usuario (
      tenant_id, usuario_id, periodo,
      meta_contactos, meta_captaciones, meta_ventas,
      meta_llamadas, meta_visitas, meta_propuestas, notas
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (tenant_id, usuario_id, periodo)
    DO UPDATE SET
      meta_contactos = COALESCE($4, productividad_metas_usuario.meta_contactos),
      meta_captaciones = COALESCE($5, productividad_metas_usuario.meta_captaciones),
      meta_ventas = COALESCE($6, productividad_metas_usuario.meta_ventas),
      meta_llamadas = COALESCE($7, productividad_metas_usuario.meta_llamadas),
      meta_visitas = COALESCE($8, productividad_metas_usuario.meta_visitas),
      meta_propuestas = COALESCE($9, productividad_metas_usuario.meta_propuestas),
      notas = COALESCE($10, productividad_metas_usuario.notas),
      updated_at = NOW()
    RETURNING *
  `;
  const result = await query(sql, [
    tenantId, usuarioId, periodo,
    metas.meta_contactos || null,
    metas.meta_captaciones || null,
    metas.meta_ventas || null,
    metas.meta_llamadas || null,
    metas.meta_visitas || null,
    metas.meta_propuestas || null,
    metas.notas || null
  ]);
  return result.rows[0];
}

// ==================== CÁLCULO DE PRODUCTIVIDAD ====================

/**
 * Calcula la productividad de un usuario en tiempo real
 */
export async function calcularProductividadUsuario(
  tenantId: string,
  usuarioId: string,
  periodo: string // YYYY-MM
): Promise<ResumenProductividad | null> {
  // Obtener configuración del tenant
  const config = await getConfig(tenantId);
  if (!config || !config.activo) return null;

  // Obtener metas personalizadas (si existen)
  const metasPersonalizadas = await getMetasUsuario(tenantId, usuarioId, periodo);

  // Calcular fechas del período
  const fechaInicio = `${periodo}-01`;
  const fechaFin = new Date(parseInt(periodo.split('-')[0]), parseInt(periodo.split('-')[1]), 0)
    .toISOString().split('T')[0];

  // Consulta para obtener contadores reales
  // NOTA: Usamos tablas reales del sistema:
  // - contactos.usuario_asignado_id para contactos creados/asignados
  // - propiedades.captador_id para captaciones
  // - actividades_crm para actividades (llamadas, visitas)
  // - propuestas (no propuestas_propiedades) para propuestas
  const sql = `
    WITH usuario_info AS (
      SELECT u.id, u.nombre, u.apellido
      FROM usuarios u
      INNER JOIN usuarios_tenants ut ON u.id = ut.usuario_id
      WHERE u.id = $2 AND ut.tenant_id = $1 AND ut.activo = true
    ),
    contactos_count AS (
      SELECT COUNT(*) as total
      FROM contactos
      WHERE tenant_id = $1
        AND usuario_asignado_id = $2
        AND created_at >= $3::date
        AND created_at < ($4::date + interval '1 day')
    ),
    captaciones_count AS (
      SELECT COUNT(*) as total
      FROM propiedades
      WHERE tenant_id = $1
        AND captador_id = $2
        AND created_at >= $3::date
        AND created_at < ($4::date + interval '1 day')
    ),
    ventas_count AS (
      SELECT
        COUNT(*) as total,
        COALESCE(SUM(valor_cierre), 0) as monto_total
      FROM ventas
      WHERE tenant_id = $1
        AND usuario_cerrador_id = $2
        AND fecha_cierre >= $3::date
        AND fecha_cierre <= $4::date
        AND completada = true
        AND cancelada = false
    ),
    llamadas_count AS (
      SELECT COUNT(*) as total
      FROM actividades_crm
      WHERE tenant_id = $1
        AND usuario_id = $2
        AND tipo = 'llamada'
        AND created_at >= $3::date
        AND created_at < ($4::date + interval '1 day')
    ),
    visitas_count AS (
      SELECT COUNT(*) as total
      FROM actividades_crm
      WHERE tenant_id = $1
        AND usuario_id = $2
        AND tipo IN ('visita', 'recorrido', 'reunion')
        AND created_at >= $3::date
        AND created_at < ($4::date + interval '1 day')
    ),
    propuestas_count AS (
      SELECT COUNT(*) as total
      FROM propuestas
      WHERE tenant_id = $1
        AND usuario_creador_id = $2
        AND created_at >= $3::date
        AND created_at < ($4::date + interval '1 day')
    ),
    comisiones_count AS (
      SELECT COALESCE(SUM(monto), 0) as total
      FROM comisiones
      WHERE tenant_id = $1
        AND usuario_id = $2
        AND created_at >= $3::date
        AND created_at < ($4::date + interval '1 day')
    )
    SELECT
      ui.id as usuario_id,
      ui.nombre,
      ui.apellido,
      COALESCE(c.total, 0)::int as contactos_registrados,
      COALESCE(cap.total, 0)::int as captaciones_registradas,
      COALESCE(v.total, 0)::int as ventas_cerradas,
      COALESCE(v.monto_total, 0)::numeric as monto_ventas,
      COALESCE(al.total, 0)::int as llamadas_realizadas,
      COALESCE(av.total, 0)::int as visitas_realizadas,
      COALESCE(p.total, 0)::int as propuestas_enviadas,
      COALESCE(com.total, 0)::numeric as monto_comisiones
    FROM usuario_info ui
    LEFT JOIN contactos_count c ON true
    LEFT JOIN captaciones_count cap ON true
    LEFT JOIN ventas_count v ON true
    LEFT JOIN llamadas_count al ON true
    LEFT JOIN visitas_count av ON true
    LEFT JOIN propuestas_count p ON true
    LEFT JOIN comisiones_count com ON true
  `;

  const result = await query(sql, [tenantId, usuarioId, fechaInicio, fechaFin]);

  if (result.rows.length === 0) return null;

  const datos = result.rows[0];

  // Determinar metas (personalizadas o default del tenant)
  const metaContactos = metasPersonalizadas?.meta_contactos ?? config.meta_contactos_mes;
  const metaCaptaciones = metasPersonalizadas?.meta_captaciones ?? config.meta_captaciones_mes;
  const metaVentas = metasPersonalizadas?.meta_ventas ?? config.meta_ventas_mes;
  const metaLlamadas = metasPersonalizadas?.meta_llamadas ?? config.meta_llamadas_mes;
  const metaVisitas = metasPersonalizadas?.meta_visitas ?? config.meta_visitas_mes;
  const metaPropuestas = metasPersonalizadas?.meta_propuestas ?? config.meta_propuestas_mes;

  // Calcular porcentajes
  const pctContactos = metaContactos > 0 ? Math.round((datos.contactos_registrados / metaContactos) * 100) : 0;
  const pctCaptaciones = metaCaptaciones > 0 ? Math.round((datos.captaciones_registradas / metaCaptaciones) * 100) : 0;
  const pctVentas = metaVentas > 0 ? Math.round((datos.ventas_cerradas / metaVentas) * 100) : 0;
  const pctLlamadas = metaLlamadas > 0 ? Math.round((datos.llamadas_realizadas / metaLlamadas) * 100) : 0;
  const pctVisitas = metaVisitas > 0 ? Math.round((datos.visitas_realizadas / metaVisitas) * 100) : 0;
  const pctPropuestas = metaPropuestas > 0 ? Math.round((datos.propuestas_enviadas / metaPropuestas) * 100) : 0;

  // Promedio global de cumplimiento
  const pctGlobal = Math.round(
    (pctContactos + pctCaptaciones + pctVentas + pctLlamadas + pctVisitas + pctPropuestas) / 6
  );

  return {
    usuario_id: datos.usuario_id,
    nombre: datos.nombre,
    apellido: datos.apellido,
    periodo,
    contactos_registrados: datos.contactos_registrados,
    captaciones_registradas: datos.captaciones_registradas,
    ventas_cerradas: datos.ventas_cerradas,
    llamadas_realizadas: datos.llamadas_realizadas,
    visitas_realizadas: datos.visitas_realizadas,
    propuestas_enviadas: datos.propuestas_enviadas,
    meta_contactos: metaContactos,
    meta_captaciones: metaCaptaciones,
    meta_ventas: metaVentas,
    meta_llamadas: metaLlamadas,
    meta_visitas: metaVisitas,
    meta_propuestas: metaPropuestas,
    pct_contactos: pctContactos,
    pct_captaciones: pctCaptaciones,
    pct_ventas: pctVentas,
    pct_llamadas: pctLlamadas,
    pct_visitas: pctVisitas,
    pct_propuestas: pctPropuestas,
    pct_global: pctGlobal,
    monto_ventas: parseFloat(datos.monto_ventas) || 0,
    monto_comisiones: parseFloat(datos.monto_comisiones) || 0
  };
}

/**
 * Obtiene el resumen de productividad de todos los asesores
 */
export async function getResumenEquipo(
  tenantId: string,
  periodo: string
): Promise<ResumenProductividad[]> {
  // Obtener todos los usuarios activos del tenant
  const usuariosSQL = `
    SELECT u.id
    FROM usuarios u
    INNER JOIN usuarios_tenants ut ON u.id = ut.usuario_id
    WHERE ut.tenant_id = $1 AND ut.activo = true
  `;
  const usuariosResult = await query(usuariosSQL, [tenantId]);

  const resumen: ResumenProductividad[] = [];

  for (const usuario of usuariosResult.rows) {
    const productividad = await calcularProductividadUsuario(tenantId, usuario.id, periodo);
    if (productividad) {
      resumen.push(productividad);
    }
  }

  // Ordenar por porcentaje global de cumplimiento
  resumen.sort((a, b) => b.pct_global - a.pct_global);

  return resumen;
}

/**
 * Obtiene el ranking de productividad
 */
export async function getRankingProductividad(
  tenantId: string,
  periodo: string,
  limite: number = 10
): Promise<ResumenProductividad[]> {
  const resumen = await getResumenEquipo(tenantId, periodo);
  return resumen.slice(0, limite);
}

// ==================== ACTUALIZAR CACHE ====================

/**
 * Actualiza el cache de productividad para un usuario
 * (Se puede llamar después de cada acción relevante)
 */
export async function actualizarCache(
  tenantId: string,
  usuarioId: string,
  periodo: string
): Promise<void> {
  const productividad = await calcularProductividadUsuario(tenantId, usuarioId, periodo);
  if (!productividad) return;

  const sql = `
    INSERT INTO productividad_resumen (
      tenant_id, usuario_id, periodo, tipo_periodo,
      contactos_registrados, captaciones_registradas, ventas_cerradas,
      llamadas_realizadas, visitas_realizadas, propuestas_enviadas,
      monto_ventas, monto_comisiones, pct_cumplimiento, ultimo_calculo
    ) VALUES ($1, $2, $3, 'mensual', $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
    ON CONFLICT (tenant_id, usuario_id, periodo, tipo_periodo, semana)
    DO UPDATE SET
      contactos_registrados = $4,
      captaciones_registradas = $5,
      ventas_cerradas = $6,
      llamadas_realizadas = $7,
      visitas_realizadas = $8,
      propuestas_enviadas = $9,
      monto_ventas = $10,
      monto_comisiones = $11,
      pct_cumplimiento = $12,
      ultimo_calculo = NOW(),
      updated_at = NOW()
  `;

  await query(sql, [
    tenantId,
    usuarioId,
    periodo,
    productividad.contactos_registrados,
    productividad.captaciones_registradas,
    productividad.ventas_cerradas,
    productividad.llamadas_realizadas,
    productividad.visitas_realizadas,
    productividad.propuestas_enviadas,
    productividad.monto_ventas,
    productividad.monto_comisiones,
    productividad.pct_global
  ]);
}

// ==================== ESTADÍSTICAS GLOBALES ====================

/**
 * Obtiene estadísticas globales de productividad del tenant
 */
export async function getEstadisticasGlobales(
  tenantId: string,
  periodo: string
): Promise<{
  total_asesores: number;
  pct_promedio: number;
  asesores_meta_cumplida: number;
  total_contactos: number;
  total_captaciones: number;
  total_ventas: number;
  total_monto_ventas: number;
}> {
  const resumen = await getResumenEquipo(tenantId, periodo);

  if (resumen.length === 0) {
    return {
      total_asesores: 0,
      pct_promedio: 0,
      asesores_meta_cumplida: 0,
      total_contactos: 0,
      total_captaciones: 0,
      total_ventas: 0,
      total_monto_ventas: 0
    };
  }

  const pctPromedio = Math.round(
    resumen.reduce((sum, r) => sum + r.pct_global, 0) / resumen.length
  );

  return {
    total_asesores: resumen.length,
    pct_promedio: pctPromedio,
    asesores_meta_cumplida: resumen.filter(r => r.pct_global >= 100).length,
    total_contactos: resumen.reduce((sum, r) => sum + r.contactos_registrados, 0),
    total_captaciones: resumen.reduce((sum, r) => sum + r.captaciones_registradas, 0),
    total_ventas: resumen.reduce((sum, r) => sum + r.ventas_cerradas, 0),
    total_monto_ventas: resumen.reduce((sum, r) => sum + r.monto_ventas, 0)
  };
}

// ==================== NIVELES DE PRODUCTIVIDAD ====================

/**
 * Obtiene todos los niveles de productividad de un tenant
 */
export async function getNiveles(tenantId: string): Promise<NivelProductividad[]> {
  const sql = `
    SELECT * FROM niveles_productividad
    WHERE tenant_id = $1 AND activo = true
    ORDER BY orden ASC
  `;
  const result = await query(sql, [tenantId]);
  return result.rows;
}

/**
 * Obtiene un nivel por ID
 */
export async function getNivelById(nivelId: string): Promise<NivelProductividad | null> {
  const sql = `SELECT * FROM niveles_productividad WHERE id = $1`;
  const result = await query(sql, [nivelId]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Obtiene el nivel por defecto de un tenant
 */
export async function getNivelDefault(tenantId: string): Promise<NivelProductividad | null> {
  const sql = `
    SELECT * FROM niveles_productividad
    WHERE tenant_id = $1 AND es_default = true AND activo = true
    LIMIT 1
  `;
  const result = await query(sql, [tenantId]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Crea un nuevo nivel de productividad
 */
export async function createNivel(tenantId: string, data: {
  nombre: string;
  codigo: string;
  descripcion?: string;
  orden?: number;
  meta_contactos_mes?: number;
  meta_captaciones_mes?: number;
  meta_ventas_mes?: number;
  meta_llamadas_mes?: number;
  meta_visitas_mes?: number;
  meta_propuestas_mes?: number;
  color?: string;
  es_default?: boolean;
}): Promise<NivelProductividad> {
  const sql = `
    INSERT INTO niveles_productividad (
      tenant_id, nombre, codigo, descripcion, orden,
      meta_contactos_mes, meta_captaciones_mes, meta_ventas_mes,
      meta_llamadas_mes, meta_visitas_mes, meta_propuestas_mes,
      color, es_default, activo
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
    RETURNING *
  `;
  const result = await query(sql, [
    tenantId,
    data.nombre,
    data.codigo,
    data.descripcion || null,
    data.orden || 1,
    data.meta_contactos_mes || null,
    data.meta_captaciones_mes || null,
    data.meta_ventas_mes || null,
    data.meta_llamadas_mes || null,
    data.meta_visitas_mes || null,
    data.meta_propuestas_mes || null,
    data.color || '#6366f1',
    data.es_default || false
  ]);
  return result.rows[0];
}

/**
 * Actualiza un nivel de productividad
 */
export async function updateNivel(nivelId: string, data: Partial<{
  nombre: string;
  descripcion: string;
  orden: number;
  meta_contactos_mes: number;
  meta_captaciones_mes: number;
  meta_ventas_mes: number;
  meta_llamadas_mes: number;
  meta_visitas_mes: number;
  meta_propuestas_mes: number;
  color: string;
  es_default: boolean;
  activo: boolean;
}>): Promise<NivelProductividad | null> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  const fields = [
    'nombre', 'descripcion', 'orden',
    'meta_contactos_mes', 'meta_captaciones_mes', 'meta_ventas_mes',
    'meta_llamadas_mes', 'meta_visitas_mes', 'meta_propuestas_mes',
    'color', 'es_default', 'activo'
  ];

  for (const field of fields) {
    if ((data as any)[field] !== undefined) {
      updates.push(`${field} = $${paramIndex++}`);
      values.push((data as any)[field]);
    }
  }

  if (updates.length === 0) return getNivelById(nivelId);

  updates.push(`updated_at = NOW()`);
  values.push(nivelId);

  const sql = `
    UPDATE niveles_productividad SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;
  const result = await query(sql, values);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Asigna un nivel de productividad a un usuario
 */
export async function asignarNivelUsuario(
  tenantId: string,
  usuarioId: string,
  nivelId: string
): Promise<void> {
  const sql = `
    UPDATE usuarios_tenants
    SET nivel_productividad_id = $1, updated_at = NOW()
    WHERE tenant_id = $2 AND usuario_id = $3
  `;
  await query(sql, [nivelId, tenantId, usuarioId]);
}

/**
 * Obtiene el nivel de productividad de un usuario
 */
export async function getNivelUsuario(
  tenantId: string,
  usuarioId: string
): Promise<NivelProductividad | null> {
  const sql = `
    SELECT np.*
    FROM usuarios_tenants ut
    LEFT JOIN niveles_productividad np ON ut.nivel_productividad_id = np.id
    WHERE ut.tenant_id = $1 AND ut.usuario_id = $2
  `;
  const result = await query(sql, [tenantId, usuarioId]);
  return result.rows.length > 0 && result.rows[0].id ? result.rows[0] : null;
}

/**
 * Obtiene las metas efectivas para un usuario (nivel > config default)
 */
export async function getMetasEfectivasUsuario(
  tenantId: string,
  usuarioId: string
): Promise<{
  meta_contactos: number;
  meta_captaciones: number;
  meta_ventas: number;
  meta_llamadas: number;
  meta_visitas: number;
  meta_propuestas: number;
  nivel: NivelProductividad | null;
}> {
  // Obtener config del tenant
  const config = await getConfig(tenantId);
  if (!config) {
    throw new Error('Configuración de productividad no encontrada');
  }

  // Obtener nivel del usuario
  const nivel = await getNivelUsuario(tenantId, usuarioId);

  // Metas efectivas: nivel > config default
  return {
    meta_contactos: nivel?.meta_contactos_mes ?? config.meta_contactos_mes,
    meta_captaciones: nivel?.meta_captaciones_mes ?? config.meta_captaciones_mes,
    meta_ventas: nivel?.meta_ventas_mes ?? config.meta_ventas_mes,
    meta_llamadas: nivel?.meta_llamadas_mes ?? config.meta_llamadas_mes,
    meta_visitas: nivel?.meta_visitas_mes ?? config.meta_visitas_mes,
    meta_propuestas: nivel?.meta_propuestas_mes ?? config.meta_propuestas_mes,
    nivel
  };
}

/**
 * Obtiene todos los usuarios del tenant con su nivel de productividad
 */
export async function getUsuariosConNivel(tenantId: string): Promise<Array<{
  usuario_id: string;
  nombre: string;
  apellido: string;
  email: string;
  nivel_id: string | null;
  nivel_nombre: string | null;
  nivel_codigo: string | null;
  nivel_color: string | null;
}>> {
  const sql = `
    SELECT
      u.id as usuario_id,
      u.nombre,
      u.apellido,
      u.email,
      np.id as nivel_id,
      np.nombre as nivel_nombre,
      np.codigo as nivel_codigo,
      np.color as nivel_color
    FROM usuarios u
    INNER JOIN usuarios_tenants ut ON u.id = ut.usuario_id
    LEFT JOIN niveles_productividad np ON ut.nivel_productividad_id = np.id
    WHERE ut.tenant_id = $1 AND ut.activo = true
    ORDER BY u.nombre, u.apellido
  `;
  const result = await query(sql, [tenantId]);
  return result.rows;
}
