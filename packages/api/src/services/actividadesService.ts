/**
 * Servicio para gestionar actividades del CRM (Módulo Seguimiento)
 * Tipos: llamada, email, reunion, visita, tarea, whatsapp, seguimiento
 * Estados: pendiente, en_progreso, completada, cancelada
 * Prioridades: baja, normal, alta, urgente
 */

import { query } from '../utils/db.js';

export type TipoActividad =
  | 'llamada'
  | 'email'
  | 'reunion'
  | 'visita'
  | 'tarea'
  | 'whatsapp'
  | 'seguimiento';

export type EstadoActividad = 'pendiente' | 'en_progreso' | 'completada' | 'cancelada';
export type Prioridad = 'baja' | 'normal' | 'alta' | 'urgente';

export interface ActividadCrm {
  id: string;
  tenant_id: string;
  tipo: TipoActividad;
  titulo: string;
  descripcion?: string;
  contacto_id?: string;
  solicitud_id?: string;
  propuesta_id?: string;
  usuario_id?: string;
  // Campos de fecha
  fecha_actividad?: string;
  fecha_programada?: string;
  fecha_recordatorio?: string;
  fecha_completada?: string;
  // Estado y prioridad
  estado: EstadoActividad;
  prioridad: Prioridad;
  completada: boolean; // Mantener por compatibilidad
  nota_completacion?: string;
  // Metadata
  metadata: Record<string, any>;
  datos_extra: Record<string, any>;
  // Timestamps
  created_at: string;
  updated_at: string;
  // Datos de relaciones (JOINs)
  contacto_nombre?: string;
  contacto_apellido?: string;
  contacto_email?: string;
  solicitud_titulo?: string;
  usuario_nombre?: string;
  usuario_apellido?: string;
}

export interface ActividadFiltros {
  tipo?: string;
  estado?: EstadoActividad;
  prioridad?: Prioridad;
  contacto_id?: string;
  solicitud_id?: string;
  propuesta_id?: string;
  completada?: boolean;
  busqueda?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  page?: number;
  limit?: number;
}

export interface ActividadesResponse {
  data: ActividadCrm[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats?: {
    porTipo: Record<TipoActividad, number>;
    porEstado: Record<EstadoActividad, number>;
    esteMes: number;
    esteAno: number;
    completadas: number;
  };
}

/**
 * Obtiene lista de actividades con filtros y paginación
 */
export async function getActividades(
  tenantId: string,
  filtros: ActividadFiltros = {}
): Promise<ActividadesResponse> {
  const {
    tipo,
    estado,
    prioridad,
    contacto_id,
    solicitud_id,
    propuesta_id,
    completada,
    busqueda,
    fecha_desde,
    fecha_hasta,
    page = 1,
    limit = 50
  } = filtros;
  const offset = (page - 1) * limit;

  let whereClause = 'a.tenant_id = $1';
  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (tipo) {
    whereClause += ` AND a.tipo = $${paramIndex}`;
    params.push(tipo);
    paramIndex++;
  }

  if (estado) {
    whereClause += ` AND a.estado = $${paramIndex}`;
    params.push(estado);
    paramIndex++;
  }

  if (prioridad) {
    whereClause += ` AND a.prioridad = $${paramIndex}`;
    params.push(prioridad);
    paramIndex++;
  }

  if (contacto_id) {
    whereClause += ` AND a.contacto_id = $${paramIndex}`;
    params.push(contacto_id);
    paramIndex++;
  }

  if (solicitud_id) {
    whereClause += ` AND a.solicitud_id = $${paramIndex}`;
    params.push(solicitud_id);
    paramIndex++;
  }

  if (propuesta_id) {
    whereClause += ` AND a.propuesta_id = $${paramIndex}`;
    params.push(propuesta_id);
    paramIndex++;
  }

  // Compatibilidad con el campo boolean completada
  if (completada !== undefined) {
    if (completada) {
      whereClause += ` AND a.estado = 'completada'`;
    } else {
      whereClause += ` AND a.estado != 'completada'`;
    }
  }

  if (fecha_desde) {
    whereClause += ` AND COALESCE(a.fecha_programada, a.fecha_actividad) >= $${paramIndex}`;
    params.push(fecha_desde);
    paramIndex++;
  }

  if (fecha_hasta) {
    whereClause += ` AND COALESCE(a.fecha_programada, a.fecha_actividad) <= $${paramIndex}`;
    params.push(fecha_hasta);
    paramIndex++;
  }

  if (busqueda) {
    whereClause += ` AND (
      a.titulo ILIKE $${paramIndex} OR
      a.descripcion ILIKE $${paramIndex} OR
      c.nombre ILIKE $${paramIndex} OR
      c.apellido ILIKE $${paramIndex}
    )`;
    params.push(`%${busqueda}%`);
    paramIndex++;
  }

  // Query principal con joins
  const dataQuery = `
    SELECT
      a.*,
      c.nombre as contacto_nombre,
      c.apellido as contacto_apellido,
      c.email as contacto_email,
      s.titulo as solicitud_titulo,
      u.nombre as usuario_nombre,
      u.apellido as usuario_apellido
    FROM actividades_crm a
    LEFT JOIN contactos c ON a.contacto_id = c.id
    LEFT JOIN solicitudes s ON a.solicitud_id = s.id
    LEFT JOIN usuarios u ON a.usuario_id = u.id
    WHERE ${whereClause}
    ORDER BY
      CASE a.estado
        WHEN 'pendiente' THEN 1
        WHEN 'en_progreso' THEN 2
        WHEN 'completada' THEN 3
        WHEN 'cancelada' THEN 4
      END,
      CASE a.prioridad
        WHEN 'urgente' THEN 1
        WHEN 'alta' THEN 2
        WHEN 'normal' THEN 3
        WHEN 'baja' THEN 4
      END,
      COALESCE(a.fecha_programada, a.fecha_actividad) ASC NULLS LAST,
      a.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  params.push(limit, offset);

  // Query de conteo
  const countParams = params.slice(0, -2);
  const countQuery = `
    SELECT COUNT(*) as total
    FROM actividades_crm a
    LEFT JOIN contactos c ON a.contacto_id = c.id
    WHERE ${whereClause}
  `;

  // Query para estadísticas
  const statsQuery = `
    SELECT
      tipo,
      estado,
      COUNT(*) as count,
      COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)) as este_mes,
      COUNT(*) FILTER (WHERE created_at >= date_trunc('year', CURRENT_DATE)) as este_ano
    FROM actividades_crm
    WHERE tenant_id = $1
    GROUP BY tipo, estado
  `;

  const [dataResult, countResult, statsResult] = await Promise.all([
    query(dataQuery, params),
    query(countQuery, countParams),
    query(statsQuery, [tenantId])
  ]);

  const total = parseInt(countResult.rows[0]?.total || '0');

  // Procesar estadísticas
  const porTipo: Record<string, number> = {};
  const porEstado: Record<string, number> = {};
  let esteMes = 0;
  let esteAno = 0;
  let completadas = 0;

  statsResult.rows.forEach((row: any) => {
    const count = parseInt(row.count);
    porTipo[row.tipo] = (porTipo[row.tipo] || 0) + count;
    porEstado[row.estado] = (porEstado[row.estado] || 0) + count;
    esteMes += parseInt(row.este_mes || '0');
    esteAno += parseInt(row.este_ano || '0');
    if (row.estado === 'completada') {
      completadas += count;
    }
  });

  return {
    data: dataResult.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    stats: {
      porTipo: porTipo as Record<TipoActividad, number>,
      porEstado: porEstado as Record<EstadoActividad, number>,
      esteMes,
      esteAno,
      completadas
    }
  };
}

/**
 * Obtiene una actividad por ID
 */
export async function getActividadById(
  tenantId: string,
  actividadId: string
): Promise<ActividadCrm | null> {
  const result = await query(
    `SELECT
      a.*,
      c.nombre as contacto_nombre,
      c.apellido as contacto_apellido,
      c.email as contacto_email,
      s.titulo as solicitud_titulo,
      u.nombre as usuario_nombre,
      u.apellido as usuario_apellido
    FROM actividades_crm a
    LEFT JOIN contactos c ON a.contacto_id = c.id
    LEFT JOIN solicitudes s ON a.solicitud_id = s.id
    LEFT JOIN usuarios u ON a.usuario_id = u.id
    WHERE a.id = $1 AND a.tenant_id = $2`,
    [actividadId, tenantId]
  );
  return result.rows[0] || null;
}

/**
 * Crea una nueva actividad
 */
export async function createActividad(
  tenantId: string,
  data: Partial<ActividadCrm>
): Promise<ActividadCrm> {
  const {
    tipo = 'tarea',
    titulo,
    descripcion,
    contacto_id,
    solicitud_id,
    propuesta_id,
    usuario_id,
    fecha_actividad,
    fecha_programada,
    fecha_recordatorio,
    estado = 'pendiente',
    prioridad = 'normal',
    metadata = {},
    datos_extra = {}
  } = data;

  // Determinar completada basado en estado
  const completada = estado === 'completada';
  const fechaCompletada = completada ? new Date().toISOString() : null;

  const result = await query(
    `INSERT INTO actividades_crm (
      tenant_id, tipo, titulo, descripcion, contacto_id, solicitud_id,
      propuesta_id, usuario_id, fecha_actividad, fecha_programada, fecha_recordatorio,
      estado, prioridad, completada, fecha_completada, metadata, datos_extra
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING *`,
    [
      tenantId,
      tipo,
      titulo,
      descripcion || null,
      contacto_id && contacto_id.trim() !== '' ? contacto_id : null,
      solicitud_id && solicitud_id.trim() !== '' ? solicitud_id : null,
      propuesta_id && propuesta_id.trim() !== '' ? propuesta_id : null,
      usuario_id && usuario_id.trim() !== '' ? usuario_id : null,
      fecha_actividad || new Date().toISOString(),
      fecha_programada || fecha_actividad || null,
      fecha_recordatorio || null,
      estado,
      prioridad,
      completada,
      fechaCompletada,
      JSON.stringify(metadata),
      JSON.stringify(datos_extra)
    ]
  );

  return result.rows[0];
}

/**
 * Actualiza una actividad
 */
export async function updateActividad(
  tenantId: string,
  actividadId: string,
  data: Partial<ActividadCrm>
): Promise<ActividadCrm | null> {
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  const allowedFields = [
    'tipo', 'titulo', 'descripcion', 'contacto_id', 'solicitud_id',
    'propuesta_id', 'usuario_id', 'fecha_actividad', 'fecha_programada',
    'fecha_recordatorio', 'estado', 'prioridad', 'nota_completacion',
    'metadata', 'datos_extra'
  ];

  // Campos que son UUIDs y deben ser null si están vacíos
  const uuidFields = ['contacto_id', 'solicitud_id', 'propuesta_id', 'usuario_id'];

  for (const field of allowedFields) {
    if (data[field as keyof ActividadCrm] !== undefined) {
      updates.push(`${field} = $${paramIndex}`);
      let value = data[field as keyof ActividadCrm];

      // Convertir strings vacíos a null para campos UUID
      if (uuidFields.includes(field) && value === '') {
        value = null;
      }

      if ((field === 'datos_extra' || field === 'metadata') && typeof value === 'object') {
        value = JSON.stringify(value);
      }
      params.push(value);
      paramIndex++;
    }
  }

  // Si se cambia el estado a 'completada', actualizar campos relacionados
  if (data.estado === 'completada') {
    updates.push(`completada = true`);
    updates.push(`fecha_completada = NOW()`);
  } else if (data.estado) {
    updates.push(`completada = false`);
    updates.push(`fecha_completada = NULL`);
  }

  if (updates.length === 0) {
    return getActividadById(tenantId, actividadId);
  }

  updates.push(`updated_at = NOW()`);
  params.push(actividadId, tenantId);

  const result = await query(
    `UPDATE actividades_crm
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
     RETURNING *`,
    params
  );

  return result.rows[0] || null;
}

/**
 * Cambia el estado de una actividad
 */
export async function cambiarEstadoActividad(
  tenantId: string,
  actividadId: string,
  nuevoEstado: EstadoActividad,
  nota?: string
): Promise<ActividadCrm | null> {
  const updates: Partial<ActividadCrm> = { estado: nuevoEstado };

  if (nuevoEstado === 'completada' && nota) {
    updates.nota_completacion = nota;
  }

  return updateActividad(tenantId, actividadId, updates);
}

/**
 * Marca una actividad como completada con nota opcional
 */
export async function completarActividad(
  tenantId: string,
  actividadId: string,
  completada: boolean = true,
  nota?: string
): Promise<ActividadCrm | null> {
  const estado: EstadoActividad = completada ? 'completada' : 'pendiente';
  return cambiarEstadoActividad(tenantId, actividadId, estado, nota);
}

/**
 * Elimina una actividad
 */
export async function deleteActividad(
  tenantId: string,
  actividadId: string
): Promise<boolean> {
  const result = await query(
    'DELETE FROM actividades_crm WHERE id = $1 AND tenant_id = $2',
    [actividadId, tenantId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Obtiene actividades de un contacto
 */
export async function getActividadesByContacto(
  tenantId: string,
  contactoId: string,
  limit: number = 20
): Promise<ActividadCrm[]> {
  const result = await query(
    `SELECT
      a.*,
      u.nombre as usuario_nombre,
      u.apellido as usuario_apellido
    FROM actividades_crm a
    LEFT JOIN usuarios u ON a.usuario_id = u.id
    WHERE a.tenant_id = $1 AND a.contacto_id = $2
    ORDER BY
      CASE a.estado WHEN 'pendiente' THEN 1 WHEN 'en_progreso' THEN 2 ELSE 3 END,
      COALESCE(a.fecha_programada, a.fecha_actividad) DESC
    LIMIT $3`,
    [tenantId, contactoId, limit]
  );
  return result.rows;
}

/**
 * Obtiene actividades de una solicitud
 */
export async function getActividadesBySolicitud(
  tenantId: string,
  solicitudId: string,
  limit: number = 20
): Promise<ActividadCrm[]> {
  const result = await query(
    `SELECT
      a.*,
      c.nombre as contacto_nombre,
      c.apellido as contacto_apellido,
      u.nombre as usuario_nombre,
      u.apellido as usuario_apellido
    FROM actividades_crm a
    LEFT JOIN contactos c ON a.contacto_id = c.id
    LEFT JOIN usuarios u ON a.usuario_id = u.id
    WHERE a.tenant_id = $1 AND a.solicitud_id = $2
    ORDER BY
      CASE a.estado WHEN 'pendiente' THEN 1 WHEN 'en_progreso' THEN 2 ELSE 3 END,
      COALESCE(a.fecha_programada, a.fecha_actividad) DESC
    LIMIT $3`,
    [tenantId, solicitudId, limit]
  );
  return result.rows;
}

/**
 * Obtiene actividades pendientes (no completadas)
 */
export async function getActividadesPendientes(
  tenantId: string,
  usuarioId?: string,
  limit: number = 20
): Promise<ActividadCrm[]> {
  let queryStr = `
    SELECT
      a.*,
      c.nombre as contacto_nombre,
      c.apellido as contacto_apellido,
      s.titulo as solicitud_titulo
    FROM actividades_crm a
    LEFT JOIN contactos c ON a.contacto_id = c.id
    LEFT JOIN solicitudes s ON a.solicitud_id = s.id
    WHERE a.tenant_id = $1
      AND a.estado IN ('pendiente', 'en_progreso')
  `;
  const params: any[] = [tenantId];

  if (usuarioId) {
    queryStr += ` AND a.usuario_id = $2`;
    params.push(usuarioId);
  }

  queryStr += `
    ORDER BY
      CASE a.prioridad WHEN 'urgente' THEN 1 WHEN 'alta' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
      COALESCE(a.fecha_programada, a.fecha_actividad) ASC NULLS LAST
    LIMIT $${params.length + 1}
  `;
  params.push(limit);

  const result = await query(queryStr, params);
  return result.rows;
}

/**
 * Obtiene estadísticas de actividades
 */
export async function getActividadesStats(tenantId: string): Promise<{
  total: number;
  pendientes: number;
  enProgreso: number;
  completadas: number;
  canceladas: number;
  esteMes: number;
  esteAno: number;
  porTipo: Record<TipoActividad, number>;
}> {
  const result = await query(
    `SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE estado = 'pendiente') as pendientes,
      COUNT(*) FILTER (WHERE estado = 'en_progreso') as en_progreso,
      COUNT(*) FILTER (WHERE estado = 'completada') as completadas,
      COUNT(*) FILTER (WHERE estado = 'cancelada') as canceladas,
      COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)) as este_mes,
      COUNT(*) FILTER (WHERE created_at >= date_trunc('year', CURRENT_DATE)) as este_ano
    FROM actividades_crm
    WHERE tenant_id = $1`,
    [tenantId]
  );

  const tiposResult = await query(
    `SELECT tipo, COUNT(*) as count
    FROM actividades_crm
    WHERE tenant_id = $1
    GROUP BY tipo`,
    [tenantId]
  );

  const porTipo: Record<string, number> = {};
  tiposResult.rows.forEach((row: any) => {
    porTipo[row.tipo] = parseInt(row.count);
  });

  const stats = result.rows[0];
  return {
    total: parseInt(stats.total || '0'),
    pendientes: parseInt(stats.pendientes || '0'),
    enProgreso: parseInt(stats.en_progreso || '0'),
    completadas: parseInt(stats.completadas || '0'),
    canceladas: parseInt(stats.canceladas || '0'),
    esteMes: parseInt(stats.este_mes || '0'),
    esteAno: parseInt(stats.este_ano || '0'),
    porTipo: porTipo as Record<TipoActividad, number>
  };
}
