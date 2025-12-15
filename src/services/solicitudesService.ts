/**
 * Servicio para gestionar solicitudes/pipeline del CRM
 */

import { query } from '../utils/db.js';

export type EtapaPipeline =
  | 'nuevo_lead'
  | 'contactado'
  | 'calificado'
  | 'mostrando'
  | 'negociacion'
  | 'cierre'
  | 'ganado'
  | 'perdido';

export interface PurgeScore {
  power: number;
  urgency: number;
  resources: number;
  genuine: number;
  expectations: number;
  total: number;
}

export interface Solicitud {
  id: string;
  tenant_id: string;
  titulo: string;
  descripcion?: string;
  etapa: EtapaPipeline;
  purge: PurgeScore;
  contacto_id?: string;
  contacto?: {
    id: string;
    nombre: string;
    apellido?: string;
    email?: string;
    telefono?: string;
  };
  propiedad_id?: string;
  usuario_asignado_id?: string;
  presupuesto?: number;
  moneda: string;
  valor_estimado?: number;
  tipo_operacion?: string;
  tipo_propiedad?: string;
  zona_interes?: string;
  recamaras_min?: number;
  banos_min?: number;
  fecha_contacto?: string;
  fecha_cierre_esperada?: string;
  fecha_cierre_real?: string;
  razon_perdida?: string;
  notas?: string;
  etiquetas: string[];
  datos_extra: Record<string, any>;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface SolicitudFiltros {
  etapa?: string;
  etapas?: string[];
  contacto_id?: string;
  usuario_asignado_id?: string;
  busqueda?: string;
  page?: number;
  limit?: number;
}

export interface SolicitudesResponse {
  data: Solicitud[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  porEtapa?: Record<EtapaPipeline, number>;
}

/**
 * Obtiene lista de solicitudes con filtros y paginación
 */
export async function getSolicitudes(
  tenantId: string,
  filtros: SolicitudFiltros = {}
): Promise<SolicitudesResponse> {
  const { etapa, etapas, contacto_id, usuario_asignado_id, busqueda, page = 1, limit = 100 } = filtros;
  const offset = (page - 1) * limit;

  let whereClause = 's.tenant_id = $1 AND s.activo = true';
  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (etapa) {
    whereClause += ` AND s.etapa = $${paramIndex}`;
    params.push(etapa);
    paramIndex++;
  }

  if (etapas && etapas.length > 0) {
    whereClause += ` AND s.etapa = ANY($${paramIndex})`;
    params.push(etapas);
    paramIndex++;
  }

  if (contacto_id) {
    whereClause += ` AND s.contacto_id = $${paramIndex}`;
    params.push(contacto_id);
    paramIndex++;
  }

  if (usuario_asignado_id) {
    whereClause += ` AND s.usuario_asignado_id = $${paramIndex}`;
    params.push(usuario_asignado_id);
    paramIndex++;
  }

  if (busqueda) {
    whereClause += ` AND (
      s.titulo ILIKE $${paramIndex} OR
      s.descripcion ILIKE $${paramIndex} OR
      c.nombre ILIKE $${paramIndex} OR
      c.apellido ILIKE $${paramIndex}
    )`;
    params.push(`%${busqueda}%`);
    paramIndex++;
  }

  // Contar total
  const countSql = `
    SELECT COUNT(*) as total
    FROM solicitudes s
    LEFT JOIN contactos c ON s.contacto_id = c.id
    WHERE ${whereClause}
  `;
  const countResult = await query(countSql, params);
  const total = parseInt(countResult.rows[0].total);

  // Contar por etapa
  const countByEtapaSql = `
    SELECT etapa, COUNT(*) as count
    FROM solicitudes
    WHERE tenant_id = $1 AND activo = true
    GROUP BY etapa
  `;
  const countByEtapaResult = await query(countByEtapaSql, [tenantId]);
  const porEtapa: Record<EtapaPipeline, number> = {
    nuevo_lead: 0,
    contactado: 0,
    calificado: 0,
    mostrando: 0,
    negociacion: 0,
    cierre: 0,
    ganado: 0,
    perdido: 0,
  };
  for (const row of countByEtapaResult.rows) {
    porEtapa[row.etapa as EtapaPipeline] = parseInt(row.count);
  }

  // Obtener datos paginados con JOIN a contactos
  const dataSql = `
    SELECT
      s.id, s.tenant_id, s.titulo, s.descripcion, s.etapa,
      s.purge_power, s.purge_urgency, s.purge_resources, s.purge_genuine, s.purge_expectations,
      s.contacto_id, s.propiedad_id, s.usuario_asignado_id,
      s.presupuesto, s.presupuesto_min, s.presupuesto_max, s.moneda, s.valor_estimado,
      s.tipo_operacion, s.tipo_propiedad, s.zona_interes, s.motivo, s.prioridad,
      s.recamaras_min, s.banos_min,
      s.fecha_contacto, s.fecha_cierre_esperada, s.fecha_cierre_real, s.razon_perdida,
      s.notas, s.etiquetas, s.datos_extra,
      s.activo, s.created_at, s.updated_at,
      c.nombre as contacto_nombre, c.apellido as contacto_apellido,
      c.email as contacto_email, c.telefono as contacto_telefono
    FROM solicitudes s
    LEFT JOIN contactos c ON s.contacto_id = c.id
    WHERE ${whereClause}
    ORDER BY
      CASE s.etapa
        WHEN 'nuevo_lead' THEN 1
        WHEN 'contactado' THEN 2
        WHEN 'calificado' THEN 3
        WHEN 'mostrando' THEN 4
        WHEN 'negociacion' THEN 5
        WHEN 'cierre' THEN 6
        WHEN 'ganado' THEN 7
        WHEN 'perdido' THEN 8
      END,
      s.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  params.push(limit, offset);

  const result = await query(dataSql, params);

  return {
    data: result.rows.map(formatSolicitud),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    porEtapa,
  };
}

/**
 * Obtiene una solicitud por ID
 */
export async function getSolicitudById(
  tenantId: string,
  solicitudId: string
): Promise<Solicitud | null> {
  const sql = `
    SELECT
      s.id, s.tenant_id, s.titulo, s.descripcion, s.etapa,
      s.purge_power, s.purge_urgency, s.purge_resources, s.purge_genuine, s.purge_expectations,
      s.contacto_id, s.propiedad_id, s.usuario_asignado_id,
      s.presupuesto, s.presupuesto_min, s.presupuesto_max, s.moneda, s.valor_estimado,
      s.tipo_operacion, s.tipo_propiedad, s.zona_interes, s.motivo, s.prioridad,
      s.recamaras_min, s.banos_min,
      s.fecha_contacto, s.fecha_cierre_esperada, s.fecha_cierre_real, s.razon_perdida,
      s.notas, s.etiquetas, s.datos_extra,
      s.activo, s.created_at, s.updated_at,
      c.nombre as contacto_nombre, c.apellido as contacto_apellido,
      c.email as contacto_email, c.telefono as contacto_telefono
    FROM solicitudes s
    LEFT JOIN contactos c ON s.contacto_id = c.id
    WHERE s.id = $1 AND s.tenant_id = $2
  `;

  const result = await query(sql, [solicitudId, tenantId]);

  if (result.rows.length === 0) {
    return null;
  }

  return formatSolicitud(result.rows[0]);
}

/**
 * Crea una nueva solicitud
 */
export async function createSolicitud(
  tenantId: string,
  data: Partial<Solicitud>
): Promise<Solicitud> {
  const purge = data.purge || { power: 0, urgency: 0, resources: 0, genuine: 0, expectations: 0, total: 0 };

  const sql = `
    INSERT INTO solicitudes (
      tenant_id, titulo, descripcion, etapa,
      purge_power, purge_urgency, purge_resources, purge_genuine, purge_expectations,
      contacto_id, propiedad_id, usuario_asignado_id,
      presupuesto, moneda, valor_estimado,
      tipo_operacion, tipo_propiedad, zona_interes,
      recamaras_min, banos_min,
      fecha_contacto, fecha_cierre_esperada,
      notas, etiquetas, datos_extra
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
    RETURNING *
  `;

  const params = [
    tenantId,
    data.titulo,
    data.descripcion || null,
    data.etapa || 'nuevo_lead',
    purge.power || 0,
    purge.urgency || 0,
    purge.resources || 0,
    purge.genuine || 0,
    purge.expectations || 0,
    data.contacto_id || null,
    data.propiedad_id || null,
    data.usuario_asignado_id || null,
    data.presupuesto || null,
    data.moneda || 'MXN',
    data.valor_estimado || null,
    data.tipo_operacion || null,
    data.tipo_propiedad || null,
    data.zona_interes || null,
    data.recamaras_min || null,
    data.banos_min || null,
    data.fecha_contacto || null,
    data.fecha_cierre_esperada || null,
    data.notas || null,
    JSON.stringify(data.etiquetas || []),
    JSON.stringify(data.datos_extra || {}),
  ];

  const result = await query(sql, params);
  return formatSolicitud(result.rows[0]);
}

/**
 * Actualiza una solicitud existente
 */
export async function updateSolicitud(
  tenantId: string,
  solicitudId: string,
  data: Partial<Solicitud>
): Promise<Solicitud | null> {
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  const camposActualizables = [
    'titulo', 'descripcion', 'etapa', 'contacto_id', 'propiedad_id',
    'usuario_asignado_id', 'presupuesto', 'presupuesto_min', 'presupuesto_max',
    'moneda', 'valor_estimado', 'tipo_operacion', 'tipo_propiedad', 'zona_interes',
    'motivo', 'recamaras_min', 'banos_min', 'fecha_contacto', 'fecha_cierre_esperada',
    'fecha_cierre_real', 'razon_perdida', 'notas', 'activo', 'prioridad'
  ];

  for (const campo of camposActualizables) {
    if (data[campo as keyof Solicitud] !== undefined) {
      updates.push(`${campo} = $${paramIndex}`);
      params.push(data[campo as keyof Solicitud]);
      paramIndex++;
    }
  }

  // PURGE Score
  if (data.purge) {
    if (data.purge.power !== undefined) {
      updates.push(`purge_power = $${paramIndex}`);
      params.push(data.purge.power);
      paramIndex++;
    }
    if (data.purge.urgency !== undefined) {
      updates.push(`purge_urgency = $${paramIndex}`);
      params.push(data.purge.urgency);
      paramIndex++;
    }
    if (data.purge.resources !== undefined) {
      updates.push(`purge_resources = $${paramIndex}`);
      params.push(data.purge.resources);
      paramIndex++;
    }
    if (data.purge.genuine !== undefined) {
      updates.push(`purge_genuine = $${paramIndex}`);
      params.push(data.purge.genuine);
      paramIndex++;
    }
    if (data.purge.expectations !== undefined) {
      updates.push(`purge_expectations = $${paramIndex}`);
      params.push(data.purge.expectations);
      paramIndex++;
    }
  }

  // Campos JSON
  if (data.etiquetas !== undefined) {
    updates.push(`etiquetas = $${paramIndex}`);
    params.push(JSON.stringify(data.etiquetas));
    paramIndex++;
  }

  if (data.datos_extra !== undefined) {
    updates.push(`datos_extra = $${paramIndex}`);
    params.push(JSON.stringify(data.datos_extra));
    paramIndex++;
  }

  updates.push(`updated_at = NOW()`);

  if (updates.length === 1) {
    return getSolicitudById(tenantId, solicitudId);
  }

  const sql = `
    UPDATE solicitudes
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
    RETURNING *
  `;
  params.push(solicitudId, tenantId);

  const result = await query(sql, params);

  if (result.rows.length === 0) {
    return null;
  }

  return formatSolicitud(result.rows[0]);
}

/**
 * Cambia la etapa de una solicitud
 */
export async function cambiarEtapaSolicitud(
  tenantId: string,
  solicitudId: string,
  nuevaEtapa: EtapaPipeline,
  razonPerdida?: string
): Promise<Solicitud | null> {
  let sql: string;
  const params: any[] = [nuevaEtapa, solicitudId, tenantId];

  if (nuevaEtapa === 'ganado') {
    sql = `
      UPDATE solicitudes
      SET etapa = $1, fecha_cierre_real = NOW(), updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
      RETURNING *
    `;
  } else if (nuevaEtapa === 'perdido') {
    sql = `
      UPDATE solicitudes
      SET etapa = $1, fecha_cierre_real = NOW(), razon_perdida = $4, updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
      RETURNING *
    `;
    params.push(razonPerdida || null);
  } else {
    sql = `
      UPDATE solicitudes
      SET etapa = $1, updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
      RETURNING *
    `;
  }

  const result = await query(sql, params);

  if (result.rows.length === 0) {
    return null;
  }

  return formatSolicitud(result.rows[0]);
}

/**
 * Elimina (desactiva) una solicitud
 */
export async function deleteSolicitud(
  tenantId: string,
  solicitudId: string
): Promise<boolean> {
  const sql = `
    UPDATE solicitudes
    SET activo = false, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
  `;

  const result = await query(sql, [solicitudId, tenantId]);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Formatea una solicitud desde la BD
 */
function formatSolicitud(row: any): Solicitud {
  const purgeTotal =
    (row.purge_power || 0) +
    (row.purge_urgency || 0) +
    (row.purge_resources || 0) +
    (row.purge_genuine || 0) +
    (row.purge_expectations || 0);

  const solicitud: any = {
    id: row.id,
    tenant_id: row.tenant_id,
    titulo: row.titulo,
    descripcion: row.descripcion,
    etapa: row.etapa,
    // PURGE como objeto anidado (compatibilidad)
    purge: {
      power: row.purge_power || 0,
      urgency: row.purge_urgency || 0,
      resources: row.purge_resources || 0,
      genuine: row.purge_genuine || 0,
      expectations: row.purge_expectations || 0,
      total: purgeTotal,
    },
    // PURGE como campos planos (para frontend)
    purge_score: purgeTotal,
    purge_power: row.purge_power || 0,
    purge_urgency: row.purge_urgency || 0,
    purge_resources: row.purge_resources || 0,
    purge_genuine: row.purge_genuine || 0,
    purge_expectations: row.purge_expectations || 0,
    contacto_id: row.contacto_id,
    propiedad_id: row.propiedad_id,
    usuario_asignado_id: row.usuario_asignado_id,
    presupuesto: row.presupuesto ? parseFloat(row.presupuesto) : undefined,
    presupuesto_min: row.presupuesto_min ? parseFloat(row.presupuesto_min) : undefined,
    presupuesto_max: row.presupuesto_max ? parseFloat(row.presupuesto_max) : undefined,
    moneda: row.moneda,
    valor_estimado: row.valor_estimado ? parseFloat(row.valor_estimado) : undefined,
    tipo_operacion: row.tipo_operacion,
    tipo_solicitud: row.tipo_operacion, // alias para frontend
    tipo_propiedad: row.tipo_propiedad,
    zona_interes: row.zona_interes,
    motivo: row.motivo,
    prioridad: row.prioridad,
    recamaras_min: row.recamaras_min,
    banos_min: row.banos_min,
    fecha_contacto: row.fecha_contacto,
    fecha_cierre_esperada: row.fecha_cierre_esperada,
    fecha_cierre_real: row.fecha_cierre_real,
    razon_perdida: row.razon_perdida,
    notas: row.notas,
    etiquetas: typeof row.etiquetas === 'string' ? JSON.parse(row.etiquetas) : (row.etiquetas || []),
    datos_extra: typeof row.datos_extra === 'string' ? JSON.parse(row.datos_extra) : (row.datos_extra || {}),
    activo: row.activo,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  // Añadir datos del contacto en formato plano (para frontend)
  solicitud.contacto_nombre = row.contacto_nombre || null;
  solicitud.contacto_apellido = row.contacto_apellido || null;
  solicitud.contacto_email = row.contacto_email || null;
  solicitud.contacto_telefono = row.contacto_telefono || null;
  solicitud.contacto_foto = null; // La tabla contactos no tiene foto_url

  // También como objeto anidado (compatibilidad)
  if (row.contacto_id && row.contacto_nombre) {
    solicitud.contacto = {
      id: row.contacto_id,
      nombre: row.contacto_nombre,
      apellido: row.contacto_apellido,
      email: row.contacto_email,
      telefono: row.contacto_telefono,
      foto_url: null,
    };
  }

  return solicitud;
}
