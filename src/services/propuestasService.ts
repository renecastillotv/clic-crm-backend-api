/**
 * Servicio para gestionar propuestas comerciales del CRM
 */

import { query } from '../utils/db.js';
import { randomBytes } from 'crypto';

export type EstadoPropuesta =
  | 'borrador'
  | 'enviada'
  | 'vista'
  | 'aceptada'
  | 'rechazada'
  | 'expirada';

export interface Propuesta {
  id: string;
  tenant_id: string;
  titulo: string;
  descripcion?: string;
  estado: EstadoPropuesta;
  solicitud_id?: string;
  contacto_id?: string;
  contacto?: {
    id: string;
    nombre: string;
    apellido?: string;
    email?: string;
  };
  propiedad_id?: string;
  usuario_creador_id?: string;
  precio_propuesto?: number;
  moneda: string;
  comision_porcentaje?: number;
  comision_monto?: number;
  condiciones?: string;
  notas_internas?: string;
  url_publica?: string;
  fecha_expiracion?: string;
  fecha_enviada?: string;
  fecha_vista?: string;
  fecha_respuesta?: string;
  veces_vista: number;
  datos_extra: Record<string, any>;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface PropuestaFiltros {
  estado?: string;
  estados?: string[];
  solicitud_id?: string;
  contacto_id?: string;
  usuario_creador_id?: string;
  busqueda?: string;
  page?: number;
  limit?: number;
}

export interface PropuestasResponse {
  data: Propuesta[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  porEstado?: Record<EstadoPropuesta, number>;
}

/**
 * Genera un código único para URL pública
 */
function generarCodigoPublico(): string {
  return randomBytes(8).toString('hex');
}

/**
 * Obtiene lista de propuestas con filtros y paginación
 */
export async function getPropuestas(
  tenantId: string,
  filtros: PropuestaFiltros = {}
): Promise<PropuestasResponse> {
  const { estado, estados, solicitud_id, contacto_id, usuario_creador_id, busqueda, page = 1, limit = 50 } = filtros;
  const offset = (page - 1) * limit;

  let whereClause = 'p.tenant_id = $1 AND p.activo = true';
  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (estado) {
    whereClause += ` AND p.estado = $${paramIndex}`;
    params.push(estado);
    paramIndex++;
  }

  if (estados && estados.length > 0) {
    whereClause += ` AND p.estado = ANY($${paramIndex})`;
    params.push(estados);
    paramIndex++;
  }

  if (solicitud_id) {
    whereClause += ` AND p.solicitud_id = $${paramIndex}`;
    params.push(solicitud_id);
    paramIndex++;
  }

  if (contacto_id) {
    whereClause += ` AND p.contacto_id = $${paramIndex}`;
    params.push(contacto_id);
    paramIndex++;
  }

  if (usuario_creador_id) {
    whereClause += ` AND p.usuario_creador_id = $${paramIndex}`;
    params.push(usuario_creador_id);
    paramIndex++;
  }

  if (busqueda) {
    whereClause += ` AND (
      p.titulo ILIKE $${paramIndex} OR
      p.descripcion ILIKE $${paramIndex} OR
      c.nombre ILIKE $${paramIndex} OR
      c.apellido ILIKE $${paramIndex}
    )`;
    params.push(`%${busqueda}%`);
    paramIndex++;
  }

  // Contar total
  const countSql = `
    SELECT COUNT(*) as total
    FROM propuestas p
    LEFT JOIN contactos c ON p.contacto_id = c.id
    WHERE ${whereClause}
  `;
  const countResult = await query(countSql, params);
  const total = parseInt(countResult.rows[0].total);

  // Contar por estado
  const countByEstadoSql = `
    SELECT estado, COUNT(*) as count
    FROM propuestas
    WHERE tenant_id = $1 AND activo = true
    GROUP BY estado
  `;
  const countByEstadoResult = await query(countByEstadoSql, [tenantId]);
  const porEstado: Record<EstadoPropuesta, number> = {
    borrador: 0,
    enviada: 0,
    vista: 0,
    aceptada: 0,
    rechazada: 0,
    expirada: 0,
  };
  for (const row of countByEstadoResult.rows) {
    porEstado[row.estado as EstadoPropuesta] = parseInt(row.count);
  }

  // Obtener datos paginados con JOIN a contactos
  const dataSql = `
    SELECT
      p.id, p.tenant_id, p.titulo, p.descripcion, p.estado,
      p.solicitud_id, p.contacto_id, p.propiedad_id, p.usuario_creador_id,
      p.precio_propuesto, p.moneda, p.comision_porcentaje, p.comision_monto,
      p.condiciones, p.notas_internas, p.url_publica,
      p.fecha_expiracion, p.fecha_enviada, p.fecha_vista, p.fecha_respuesta,
      p.veces_vista, p.datos_extra,
      p.activo, p.created_at, p.updated_at,
      c.nombre as contacto_nombre, c.apellido as contacto_apellido,
      c.email as contacto_email
    FROM propuestas p
    LEFT JOIN contactos c ON p.contacto_id = c.id
    WHERE ${whereClause}
    ORDER BY
      CASE p.estado
        WHEN 'borrador' THEN 1
        WHEN 'enviada' THEN 2
        WHEN 'vista' THEN 3
        WHEN 'aceptada' THEN 4
        WHEN 'rechazada' THEN 5
        WHEN 'expirada' THEN 6
      END,
      p.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  params.push(limit, offset);

  const result = await query(dataSql, params);

  return {
    data: result.rows.map(formatPropuesta),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    porEstado,
  };
}

/**
 * Obtiene una propuesta por ID
 */
export async function getPropuestaById(
  tenantId: string,
  propuestaId: string
): Promise<Propuesta | null> {
  const sql = `
    SELECT
      p.id, p.tenant_id, p.titulo, p.descripcion, p.estado,
      p.solicitud_id, p.contacto_id, p.propiedad_id, p.usuario_creador_id,
      p.precio_propuesto, p.moneda, p.comision_porcentaje, p.comision_monto,
      p.condiciones, p.notas_internas, p.url_publica,
      p.fecha_expiracion, p.fecha_enviada, p.fecha_vista, p.fecha_respuesta,
      p.veces_vista, p.datos_extra,
      p.activo, p.created_at, p.updated_at,
      c.nombre as contacto_nombre, c.apellido as contacto_apellido,
      c.email as contacto_email
    FROM propuestas p
    LEFT JOIN contactos c ON p.contacto_id = c.id
    WHERE p.id = $1 AND p.tenant_id = $2
  `;

  const result = await query(sql, [propuestaId, tenantId]);

  if (result.rows.length === 0) {
    return null;
  }

  return formatPropuesta(result.rows[0]);
}

/**
 * Obtiene una propuesta por URL pública
 */
export async function getPropuestaByUrl(
  urlPublica: string
): Promise<Propuesta | null> {
  const sql = `
    SELECT
      p.id, p.tenant_id, p.titulo, p.descripcion, p.estado,
      p.solicitud_id, p.contacto_id, p.propiedad_id, p.usuario_creador_id,
      p.precio_propuesto, p.moneda, p.comision_porcentaje, p.comision_monto,
      p.condiciones, p.notas_internas, p.url_publica,
      p.fecha_expiracion, p.fecha_enviada, p.fecha_vista, p.fecha_respuesta,
      p.veces_vista, p.datos_extra,
      p.activo, p.created_at, p.updated_at,
      c.nombre as contacto_nombre, c.apellido as contacto_apellido,
      c.email as contacto_email
    FROM propuestas p
    LEFT JOIN contactos c ON p.contacto_id = c.id
    WHERE p.url_publica = $1 AND p.activo = true
  `;

  const result = await query(sql, [urlPublica]);

  if (result.rows.length === 0) {
    return null;
  }

  // Actualizar contador de vistas si no está en estado borrador
  const propuesta = result.rows[0];
  if (propuesta.estado !== 'borrador') {
    await query(`
      UPDATE propuestas
      SET veces_vista = veces_vista + 1,
          fecha_vista = COALESCE(fecha_vista, NOW()),
          estado = CASE WHEN estado = 'enviada' THEN 'vista' ELSE estado END,
          updated_at = NOW()
      WHERE id = $1
    `, [propuesta.id]);
  }

  return formatPropuesta(propuesta);
}

/**
 * Crea una nueva propuesta
 */
export async function createPropuesta(
  tenantId: string,
  data: Partial<Propuesta>
): Promise<Propuesta> {
  const urlPublica = generarCodigoPublico();

  const sql = `
    INSERT INTO propuestas (
      tenant_id, titulo, descripcion, estado,
      solicitud_id, contacto_id, propiedad_id, usuario_creador_id,
      precio_propuesto, moneda, comision_porcentaje, comision_monto,
      condiciones, notas_internas, url_publica,
      fecha_expiracion, datos_extra
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING *
  `;

  const params = [
    tenantId,
    data.titulo,
    data.descripcion || null,
    data.estado || 'borrador',
    data.solicitud_id || null,
    data.contacto_id || null,
    data.propiedad_id || null,
    data.usuario_creador_id || null,
    data.precio_propuesto || null,
    data.moneda || 'MXN',
    data.comision_porcentaje || null,
    data.comision_monto || null,
    data.condiciones || null,
    data.notas_internas || null,
    urlPublica,
    data.fecha_expiracion || null,
    JSON.stringify(data.datos_extra || {}),
  ];

  const result = await query(sql, params);
  return formatPropuesta(result.rows[0]);
}

/**
 * Actualiza una propuesta existente
 */
export async function updatePropuesta(
  tenantId: string,
  propuestaId: string,
  data: Partial<Propuesta>
): Promise<Propuesta | null> {
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  const camposActualizables = [
    'titulo', 'descripcion', 'estado',
    'solicitud_id', 'contacto_id', 'propiedad_id',
    'precio_propuesto', 'moneda', 'comision_porcentaje', 'comision_monto',
    'condiciones', 'notas_internas', 'fecha_expiracion', 'activo'
  ];

  for (const campo of camposActualizables) {
    if (data[campo as keyof Propuesta] !== undefined) {
      updates.push(`${campo} = $${paramIndex}`);
      params.push(data[campo as keyof Propuesta]);
      paramIndex++;
    }
  }

  // Campos JSON
  if (data.datos_extra !== undefined) {
    updates.push(`datos_extra = $${paramIndex}`);
    params.push(JSON.stringify(data.datos_extra));
    paramIndex++;
  }

  updates.push(`updated_at = NOW()`);

  if (updates.length === 1) {
    return getPropuestaById(tenantId, propuestaId);
  }

  const sql = `
    UPDATE propuestas
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
    RETURNING *
  `;
  params.push(propuestaId, tenantId);

  const result = await query(sql, params);

  if (result.rows.length === 0) {
    return null;
  }

  return formatPropuesta(result.rows[0]);
}

/**
 * Cambia el estado de una propuesta
 */
export async function cambiarEstadoPropuesta(
  tenantId: string,
  propuestaId: string,
  nuevoEstado: EstadoPropuesta
): Promise<Propuesta | null> {
  let sql: string;
  const params: any[] = [nuevoEstado, propuestaId, tenantId];

  if (nuevoEstado === 'enviada') {
    sql = `
      UPDATE propuestas
      SET estado = $1, fecha_enviada = NOW(), updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
      RETURNING *
    `;
  } else if (nuevoEstado === 'aceptada' || nuevoEstado === 'rechazada') {
    sql = `
      UPDATE propuestas
      SET estado = $1, fecha_respuesta = NOW(), updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
      RETURNING *
    `;
  } else {
    sql = `
      UPDATE propuestas
      SET estado = $1, updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
      RETURNING *
    `;
  }

  const result = await query(sql, params);

  if (result.rows.length === 0) {
    return null;
  }

  return formatPropuesta(result.rows[0]);
}

/**
 * Elimina (desactiva) una propuesta
 */
export async function deletePropuesta(
  tenantId: string,
  propuestaId: string
): Promise<boolean> {
  const sql = `
    UPDATE propuestas
    SET activo = false, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
  `;

  const result = await query(sql, [propuestaId, tenantId]);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Regenera la URL pública de una propuesta
 */
export async function regenerarUrlPublica(
  tenantId: string,
  propuestaId: string
): Promise<Propuesta | null> {
  const nuevaUrl = generarCodigoPublico();

  const sql = `
    UPDATE propuestas
    SET url_publica = $1, updated_at = NOW()
    WHERE id = $2 AND tenant_id = $3
    RETURNING *
  `;

  const result = await query(sql, [nuevaUrl, propuestaId, tenantId]);

  if (result.rows.length === 0) {
    return null;
  }

  return formatPropuesta(result.rows[0]);
}

/**
 * Formatea una propuesta desde la BD
 */
function formatPropuesta(row: any): Propuesta {
  const propuesta: Propuesta = {
    id: row.id,
    tenant_id: row.tenant_id,
    titulo: row.titulo,
    descripcion: row.descripcion,
    estado: row.estado,
    solicitud_id: row.solicitud_id,
    contacto_id: row.contacto_id,
    propiedad_id: row.propiedad_id,
    usuario_creador_id: row.usuario_creador_id,
    precio_propuesto: row.precio_propuesto ? parseFloat(row.precio_propuesto) : undefined,
    moneda: row.moneda,
    comision_porcentaje: row.comision_porcentaje ? parseFloat(row.comision_porcentaje) : undefined,
    comision_monto: row.comision_monto ? parseFloat(row.comision_monto) : undefined,
    condiciones: row.condiciones,
    notas_internas: row.notas_internas,
    url_publica: row.url_publica,
    fecha_expiracion: row.fecha_expiracion,
    fecha_enviada: row.fecha_enviada,
    fecha_vista: row.fecha_vista,
    fecha_respuesta: row.fecha_respuesta,
    veces_vista: row.veces_vista || 0,
    datos_extra: typeof row.datos_extra === 'string' ? JSON.parse(row.datos_extra) : (row.datos_extra || {}),
    activo: row.activo,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  // Añadir datos del contacto si existen
  if (row.contacto_id && row.contacto_nombre) {
    propuesta.contacto = {
      id: row.contacto_id,
      nombre: row.contacto_nombre,
      apellido: row.contacto_apellido,
      email: row.contacto_email,
    };
  }

  return propuesta;
}
