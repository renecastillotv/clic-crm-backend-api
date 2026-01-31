/**
 * Servicio para gestionar metas del CRM (gamificación)
 *
 * Tipos de meta por origen:
 * - 'personal': Creada por el usuario para sí mismo
 * - 'asignada': Creada por admin para un usuario específico
 * - 'empresa': Sin usuario_id, aplica a todo el equipo (usuario_id = NULL)
 *
 * El progreso se calcula automáticamente basándose en tipo_meta:
 * - ventas: Cuenta ventas completadas en el período
 * - contactos: Cuenta contactos creados en el período
 * - actividades: Cuenta actividades completadas en el período
 * - cierres: Similar a ventas
 * - propuestas: Cuenta propuestas creadas en el período
 * - propiedades: Cuenta propiedades captadas en el período
 */

import { query } from '../utils/db.js';

export interface Meta {
  id: string;
  tenant_id: string;
  usuario_id?: string | null; // NULL = meta de empresa/equipo
  creado_por_id?: string;
  titulo: string;
  descripcion?: string;
  tipo_meta: 'ventas' | 'contactos' | 'actividades' | 'cierres' | 'propuestas' | 'propiedades';
  metrica: 'cantidad' | 'monto' | 'porcentaje';
  valor_objetivo: number;
  valor_actual: number;
  periodo: 'diario' | 'semanal' | 'mensual' | 'trimestral' | 'anual' | 'personalizado';
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'activa' | 'completada' | 'fallida' | 'cancelada';
  origen: 'personal' | 'asignada' | 'empresa';
  tipo_recompensa?: string;
  descripcion_recompensa?: string;
  monto_recompensa?: number;
  fecha_completada?: string;
  historial_progreso: any[];
  activo: boolean;
  created_at: string;
  updated_at: string;
  // Campos JOIN
  usuario_nombre?: string;
  usuario_apellido?: string;
  creador_nombre?: string;
  creador_apellido?: string;
  // Calculado
  porcentaje_avance?: number;
  // Indica si el progreso es calculado automáticamente
  progreso_automatico?: boolean;
}

/**
 * Calcula el progreso automático de una meta basándose en tipo_meta
 * Consulta las tablas originales en tiempo real (similar a productividad)
 */
async function calcularProgresoAutomatico(
  tenantId: string,
  tipoMeta: string,
  metrica: string,
  fechaInicio: string,
  fechaFin: string,
  usuarioId?: string | null
): Promise<number> {
  const fechaInicioDate = new Date(fechaInicio);
  const fechaFinDate = new Date(fechaFin);
  // Ajustar fecha fin para incluir todo el día
  fechaFinDate.setHours(23, 59, 59, 999);

  let sql = '';
  const params: any[] = [tenantId, fechaInicioDate.toISOString(), fechaFinDate.toISOString()];

  // Si hay usuario_id, filtrar por ese usuario; si no, contar todos (meta de empresa)
  const usuarioFilter = usuarioId ? ` AND {USER_FIELD} = $4` : '';
  if (usuarioId) {
    params.push(usuarioId);
  }

  switch (tipoMeta) {
    case 'ventas':
    case 'cierres':
      // Contar ventas con fecha_cierre en el período y no canceladas
      // (ignoramos el campo completada porque las ventas registradas cuentan como completadas)
      if (metrica === 'monto') {
        sql = `
          SELECT COALESCE(SUM(valor_cierre), 0) as total
          FROM ventas
          WHERE tenant_id = $1
            AND fecha_cierre >= $2 AND fecha_cierre <= $3
            AND cancelada = false
            ${usuarioFilter.replace('{USER_FIELD}', 'usuario_cerrador_id')}
        `;
      } else {
        sql = `
          SELECT COUNT(*) as total
          FROM ventas
          WHERE tenant_id = $1
            AND fecha_cierre >= $2 AND fecha_cierre <= $3
            AND cancelada = false
            ${usuarioFilter.replace('{USER_FIELD}', 'usuario_cerrador_id')}
        `;
      }
      break;

    case 'contactos':
      sql = `
        SELECT COUNT(*) as total
        FROM contactos
        WHERE tenant_id = $1
          AND created_at >= $2 AND created_at <= $3
          ${usuarioFilter.replace('{USER_FIELD}', 'usuario_asignado_id')}
      `;
      break;

    case 'actividades':
      sql = `
        SELECT COUNT(*) as total
        FROM actividades_crm
        WHERE tenant_id = $1
          AND created_at >= $2 AND created_at <= $3
          AND completada = true
          ${usuarioFilter.replace('{USER_FIELD}', 'usuario_id')}
      `;
      break;

    case 'propuestas':
      sql = `
        SELECT COUNT(*) as total
        FROM propuestas
        WHERE tenant_id = $1
          AND created_at >= $2 AND created_at <= $3
          ${usuarioFilter.replace('{USER_FIELD}', 'usuario_creador_id')}
      `;
      break;

    case 'propiedades':
      sql = `
        SELECT COUNT(*) as total
        FROM propiedades
        WHERE tenant_id = $1
          AND created_at >= $2 AND created_at <= $3
          ${usuarioFilter.replace('{USER_FIELD}', 'captador_id')}
      `;
      break;

    default:
      return 0;
  }

  try {
    const result = await query(sql, params);
    return parseFloat(result.rows[0]?.total || 0);
  } catch (error) {
    console.error('Error calculando progreso automático:', error);
    return 0;
  }
}

export interface MetaFiltros {
  tipo_meta?: string;
  estado?: string;
  origen?: string;
  usuario_id?: string;
  periodo?: string;
  page?: number;
  limit?: number;
}

export interface MetasResponse {
  data: Meta[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Obtiene lista de metas con filtros y paginación
 */
export async function getMetas(
  tenantId: string,
  filtros: MetaFiltros = {}
): Promise<MetasResponse> {
  const {
    tipo_meta, estado, origen, usuario_id, periodo,
    page = 1, limit = 20
  } = filtros;

  const offset = (page - 1) * limit;

  let whereClause = 'm.tenant_id = $1 AND m.activo = true';
  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (tipo_meta) {
    whereClause += ` AND m.tipo_meta = $${paramIndex}`;
    params.push(tipo_meta);
    paramIndex++;
  }

  if (estado) {
    whereClause += ` AND m.estado = $${paramIndex}`;
    params.push(estado);
    paramIndex++;
  }

  if (origen) {
    whereClause += ` AND m.origen = $${paramIndex}`;
    params.push(origen);
    paramIndex++;
  }

  if (usuario_id) {
    // Include metas assigned to this user OR empresa metas (visible to all)
    whereClause += ` AND (m.usuario_id = $${paramIndex} OR m.origen = 'empresa')`;
    params.push(usuario_id);
    paramIndex++;
  }

  if (periodo) {
    whereClause += ` AND m.periodo = $${paramIndex}`;
    params.push(periodo);
    paramIndex++;
  }

  // Contar total
  const countSql = `SELECT COUNT(*) as total FROM metas m WHERE ${whereClause}`;
  const countResult = await query(countSql, params);
  const total = parseInt(countResult.rows[0].total);

  // Obtener datos paginados
  const dataSql = `
    SELECT
      m.*,
      u.nombre as usuario_nombre, u.apellido as usuario_apellido,
      c.nombre as creador_nombre, c.apellido as creador_apellido,
      CASE
        WHEN m.valor_objetivo > 0 THEN ROUND((m.valor_actual / m.valor_objetivo * 100)::numeric, 1)
        ELSE 0
      END as porcentaje_avance
    FROM metas m
    LEFT JOIN usuarios u ON m.usuario_id = u.id
    LEFT JOIN usuarios c ON m.creado_por_id = c.id
    WHERE ${whereClause}
    ORDER BY
      CASE m.estado
        WHEN 'activa' THEN 1
        WHEN 'completada' THEN 2
        ELSE 3
      END,
      m.fecha_fin ASC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  params.push(limit, offset);

  const result = await query(dataSql, params);

  // Para metas activas, calcular el progreso automáticamente en tiempo real
  const metasConProgreso = await Promise.all(
    result.rows.map(async (meta: Meta) => {
      if (meta.estado === 'activa') {
        const progresoCalculado = await calcularProgresoAutomatico(
          tenantId,
          meta.tipo_meta,
          meta.metrica,
          meta.fecha_inicio,
          meta.fecha_fin,
          meta.usuario_id
        );

        return {
          ...meta,
          valor_actual: progresoCalculado,
          porcentaje_avance: meta.valor_objetivo > 0
            ? Math.round((progresoCalculado / meta.valor_objetivo) * 1000) / 10
            : 0,
          progreso_automatico: true,
        };
      }
      return { ...meta, progreso_automatico: false };
    })
  );

  return {
    data: metasConProgreso,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Obtiene una meta por ID
 */
export async function getMetaById(
  tenantId: string,
  metaId: string
): Promise<Meta | null> {
  const sql = `
    SELECT
      m.*,
      u.nombre as usuario_nombre, u.apellido as usuario_apellido,
      c.nombre as creador_nombre, c.apellido as creador_apellido,
      CASE
        WHEN m.valor_objetivo > 0 THEN ROUND((m.valor_actual / m.valor_objetivo * 100)::numeric, 1)
        ELSE 0
      END as porcentaje_avance
    FROM metas m
    LEFT JOIN usuarios u ON m.usuario_id = u.id
    LEFT JOIN usuarios c ON m.creado_por_id = c.id
    WHERE m.id = $1 AND m.tenant_id = $2
  `;

  const result = await query(sql, [metaId, tenantId]);
  const meta = result.rows[0] || null;

  if (!meta) return null;

  // Para metas activas, calcular el progreso automáticamente
  if (meta.estado === 'activa') {
    const progresoCalculado = await calcularProgresoAutomatico(
      tenantId,
      meta.tipo_meta,
      meta.metrica,
      meta.fecha_inicio,
      meta.fecha_fin,
      meta.usuario_id
    );

    return {
      ...meta,
      valor_actual: progresoCalculado,
      porcentaje_avance: meta.valor_objetivo > 0
        ? Math.round((progresoCalculado / meta.valor_objetivo) * 1000) / 10
        : 0,
      progreso_automatico: true,
    };
  }

  return { ...meta, progreso_automatico: false };
}

/**
 * Crea una nueva meta
 */
export async function createMeta(
  tenantId: string,
  data: Partial<Meta>
): Promise<Meta> {
  const sql = `
    INSERT INTO metas (
      tenant_id, usuario_id, creado_por_id, titulo, descripcion,
      tipo_meta, metrica, valor_objetivo, valor_actual,
      periodo, fecha_inicio, fecha_fin, estado, origen,
      tipo_recompensa, descripcion_recompensa, monto_recompensa
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9,
      $10, $11, $12, $13, $14,
      $15, $16, $17
    )
    RETURNING *
  `;

  const params = [
    tenantId,
    data.usuario_id || null,
    data.creado_por_id || null,
    data.titulo,
    data.descripcion || null,
    data.tipo_meta || 'ventas',
    data.metrica || 'cantidad',
    data.valor_objetivo || 0,
    data.valor_actual || 0,
    data.periodo || 'mensual',
    data.fecha_inicio,
    data.fecha_fin,
    data.estado || 'activa',
    data.origen || 'personal',
    data.tipo_recompensa || null,
    data.descripcion_recompensa || null,
    data.monto_recompensa || null,
  ];

  const result = await query(sql, params);
  return result.rows[0];
}

/**
 * Actualiza una meta existente
 */
export async function updateMeta(
  tenantId: string,
  metaId: string,
  data: Partial<Meta>
): Promise<Meta | null> {
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  const allowedFields = [
    'titulo', 'descripcion', 'tipo_meta', 'metrica',
    'valor_objetivo', 'valor_actual', 'periodo',
    'fecha_inicio', 'fecha_fin', 'estado', 'origen',
    'tipo_recompensa', 'descripcion_recompensa', 'monto_recompensa',
    'fecha_completada', 'historial_progreso', 'activo'
  ];

  for (const field of allowedFields) {
    if (data[field as keyof Meta] !== undefined) {
      let value = data[field as keyof Meta];

      if (field === 'historial_progreso') {
        value = JSON.stringify(value);
      }

      updates.push(`${field} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  }

  if (updates.length === 0) {
    return getMetaById(tenantId, metaId);
  }

  updates.push(`updated_at = NOW()`);

  const sql = `
    UPDATE metas
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
    RETURNING *
  `;
  params.push(metaId, tenantId);

  const result = await query(sql, params);
  return result.rows[0] || null;
}

/**
 * Actualiza el progreso de una meta
 */
export async function actualizarProgresoMeta(
  tenantId: string,
  metaId: string,
  nuevoValor: number,
  nota?: string
): Promise<Meta | null> {
  // Primero obtenemos la meta actual
  const meta = await getMetaById(tenantId, metaId);
  if (!meta) return null;

  // Agregar al historial
  const historial = meta.historial_progreso || [];
  historial.push({
    fecha: new Date().toISOString(),
    valor_anterior: meta.valor_actual,
    valor_nuevo: nuevoValor,
    nota: nota || null,
  });

  // Determinar si se completó
  const completada = nuevoValor >= meta.valor_objetivo;
  const estado = completada ? 'completada' : meta.estado;
  const fecha_completada = completada ? new Date().toISOString() : meta.fecha_completada;

  const sql = `
    UPDATE metas
    SET
      valor_actual = $1,
      historial_progreso = $2,
      estado = $3,
      fecha_completada = $4,
      updated_at = NOW()
    WHERE id = $5 AND tenant_id = $6
    RETURNING *
  `;

  const result = await query(sql, [
    nuevoValor,
    JSON.stringify(historial),
    estado,
    fecha_completada,
    metaId,
    tenantId,
  ]);

  return result.rows[0] || null;
}

/**
 * Elimina una meta (soft delete)
 */
export async function deleteMeta(
  tenantId: string,
  metaId: string
): Promise<boolean> {
  const sql = `
    UPDATE metas
    SET activo = false, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
    RETURNING id
  `;

  const result = await query(sql, [metaId, tenantId]);
  return result.rows.length > 0;
}

/**
 * Obtiene resumen de metas por usuario
 */
export async function getMetasResumen(tenantId: string, usuarioId?: string): Promise<{
  activas: number;
  completadas: number;
  fallidas: number;
  porcentajeExito: number;
  progresoPromedio: number;
}> {
  let whereClause = 'tenant_id = $1 AND activo = true';
  const params: any[] = [tenantId];

  if (usuarioId) {
    whereClause += ' AND usuario_id = $2';
    params.push(usuarioId);
  }

  const sql = `
    SELECT
      COUNT(*) FILTER (WHERE estado = 'activa') as activas,
      COUNT(*) FILTER (WHERE estado = 'completada') as completadas,
      COUNT(*) FILTER (WHERE estado = 'fallida') as fallidas,
      COALESCE(
        ROUND(
          (COUNT(*) FILTER (WHERE estado = 'completada')::numeric /
           NULLIF(COUNT(*) FILTER (WHERE estado IN ('completada', 'fallida')), 0) * 100)::numeric,
          1
        ),
        0
      ) as porcentaje_exito,
      COALESCE(
        ROUND(
          AVG(
            CASE
              WHEN valor_objetivo > 0 THEN valor_actual / valor_objetivo * 100
              ELSE 0
            END
          )::numeric,
          1
        ),
        0
      ) as progreso_promedio
    FROM metas
    WHERE ${whereClause}
  `;

  const result = await query(sql, params);
  const row = result.rows[0];

  return {
    activas: parseInt(row.activas) || 0,
    completadas: parseInt(row.completadas) || 0,
    fallidas: parseInt(row.fallidas) || 0,
    porcentajeExito: parseFloat(row.porcentaje_exito) || 0,
    progresoPromedio: parseFloat(row.progreso_promedio) || 0,
  };
}
