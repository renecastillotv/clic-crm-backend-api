/**
 * Servicio para gestionar contactos del CRM
 */

import { query } from '../utils/db.js';

export interface Contacto {
  id: string;
  tenant_id: string;
  nombre: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  telefono_secundario?: string;
  whatsapp?: string;
  tipo: 'lead' | 'cliente' | 'asesor' | 'desarrollador' | 'referidor' | 'propietario' | 'vendedor';
  tipos_contacto: string[]; // Array de extensiones/tipos
  empresa?: string;
  cargo?: string;
  origen?: string;
  favorito: boolean;
  notas?: string;
  etiquetas: string[];
  datos_extra: Record<string, any>;
  usuario_asignado_id?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactoFiltros {
  tipo?: string;
  favorito?: boolean;
  busqueda?: string;
  usuario_asignado_id?: string;
  page?: number;
  limit?: number;
}

export interface ContactosResponse {
  data: Contacto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Obtiene lista de contactos con filtros y paginación
 */
export async function getContactos(
  tenantId: string,
  filtros: ContactoFiltros = {}
): Promise<ContactosResponse> {
  const { tipo, favorito, busqueda, usuario_asignado_id, page = 1, limit = 50 } = filtros;
  const offset = (page - 1) * limit;

  let whereClause = 'tenant_id = $1 AND activo = true';
  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (tipo) {
    whereClause += ` AND tipo = $${paramIndex}`;
    params.push(tipo);
    paramIndex++;
  }

  if (favorito !== undefined) {
    whereClause += ` AND favorito = $${paramIndex}`;
    params.push(favorito);
    paramIndex++;
  }

  if (usuario_asignado_id) {
    whereClause += ` AND usuario_asignado_id = $${paramIndex}`;
    params.push(usuario_asignado_id);
    paramIndex++;
  }

  if (busqueda) {
    whereClause += ` AND (
      nombre ILIKE $${paramIndex} OR
      apellido ILIKE $${paramIndex} OR
      email ILIKE $${paramIndex} OR
      telefono ILIKE $${paramIndex} OR
      empresa ILIKE $${paramIndex}
    )`;
    params.push(`%${busqueda}%`);
    paramIndex++;
  }

  // Contar total
  const countSql = `SELECT COUNT(*) as total FROM contactos WHERE ${whereClause}`;
  const countResult = await query(countSql, params);
  const total = parseInt(countResult.rows[0].total);

  // Obtener datos paginados
  const dataSql = `
    SELECT
      id, tenant_id, nombre, apellido, email, telefono, telefono_secundario,
      whatsapp, tipo, tipos_contacto, empresa, cargo, origen, favorito, notas, etiquetas,
      datos_extra, usuario_asignado_id, activo, created_at, updated_at
    FROM contactos
    WHERE ${whereClause}
    ORDER BY favorito DESC, nombre ASC, apellido ASC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  params.push(limit, offset);

  const result = await query(dataSql, params);

  return {
    data: result.rows.map(formatContacto),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Obtiene un contacto por ID
 */
export async function getContactoById(
  tenantId: string,
  contactoId: string
): Promise<Contacto | null> {
  const sql = `
    SELECT
      id, tenant_id, nombre, apellido, email, telefono, telefono_secundario,
      whatsapp, tipo, tipos_contacto, empresa, cargo, origen, favorito, notas, etiquetas,
      datos_extra, usuario_asignado_id, activo, created_at, updated_at
    FROM contactos
    WHERE id = $1 AND tenant_id = $2
  `;

  const result = await query(sql, [contactoId, tenantId]);

  if (result.rows.length === 0) {
    return null;
  }

  return formatContacto(result.rows[0]);
}

/**
 * Crea un nuevo contacto
 */
export async function createContacto(
  tenantId: string,
  data: Partial<Contacto>
): Promise<Contacto> {
  const sql = `
    INSERT INTO contactos (
      tenant_id, nombre, apellido, email, telefono, telefono_secundario,
      whatsapp, tipo, tipos_contacto, empresa, cargo, origen, favorito, notas, etiquetas,
      datos_extra, usuario_asignado_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING *
  `;

  // Si se pasa tipos_contacto, usarlo; si no, crear array con el tipo principal
  const tiposContacto = data.tipos_contacto || (data.tipo ? [data.tipo] : ['lead']);

  const params = [
    tenantId,
    data.nombre,
    data.apellido || null,
    data.email || null,
    data.telefono || null,
    data.telefono_secundario || null,
    data.whatsapp || null,
    data.tipo || 'lead',
    JSON.stringify(tiposContacto),
    data.empresa || null,
    data.cargo || null,
    data.origen || null,
    data.favorito || false,
    data.notas || null,
    JSON.stringify(data.etiquetas || []),
    JSON.stringify(data.datos_extra || {}),
    data.usuario_asignado_id || null,
  ];

  const result = await query(sql, params);
  return formatContacto(result.rows[0]);
}

/**
 * Actualiza un contacto existente
 */
export async function updateContacto(
  tenantId: string,
  contactoId: string,
  data: Partial<Contacto>
): Promise<Contacto | null> {
  // Construir SET dinámico solo con los campos que se actualizan
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  const camposActualizables = [
    'nombre', 'apellido', 'email', 'telefono', 'telefono_secundario',
    'whatsapp', 'tipo', 'empresa', 'cargo', 'origen', 'favorito',
    'notas', 'usuario_asignado_id', 'activo'
  ];

  for (const campo of camposActualizables) {
    if (data[campo as keyof Contacto] !== undefined) {
      updates.push(`${campo} = $${paramIndex}`);
      params.push(data[campo as keyof Contacto]);
      paramIndex++;
    }
  }

  // Campos JSON
  if (data.tipos_contacto !== undefined) {
    updates.push(`tipos_contacto = $${paramIndex}`);
    params.push(JSON.stringify(data.tipos_contacto));
    paramIndex++;
  }

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
    // Solo updated_at, nada que actualizar
    return getContactoById(tenantId, contactoId);
  }

  const sql = `
    UPDATE contactos
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
    RETURNING *
  `;
  params.push(contactoId, tenantId);

  const result = await query(sql, params);

  if (result.rows.length === 0) {
    return null;
  }

  return formatContacto(result.rows[0]);
}

/**
 * Elimina (desactiva) un contacto
 */
export async function deleteContacto(
  tenantId: string,
  contactoId: string
): Promise<boolean> {
  const sql = `
    UPDATE contactos
    SET activo = false, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
  `;

  const result = await query(sql, [contactoId, tenantId]);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Alterna el estado de favorito
 */
export async function toggleContactoFavorito(
  tenantId: string,
  contactoId: string
): Promise<Contacto | null> {
  const sql = `
    UPDATE contactos
    SET favorito = NOT favorito, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
    RETURNING *
  `;

  const result = await query(sql, [contactoId, tenantId]);

  if (result.rows.length === 0) {
    return null;
  }

  return formatContacto(result.rows[0]);
}

/**
 * Formatea un contacto desde la BD
 */
function formatContacto(row: any): Contacto {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    nombre: row.nombre,
    apellido: row.apellido,
    email: row.email,
    telefono: row.telefono,
    telefono_secundario: row.telefono_secundario,
    whatsapp: row.whatsapp,
    tipo: row.tipo,
    tipos_contacto: typeof row.tipos_contacto === 'string' ? JSON.parse(row.tipos_contacto) : (row.tipos_contacto || []),
    empresa: row.empresa,
    cargo: row.cargo,
    origen: row.origen,
    favorito: row.favorito,
    notas: row.notas,
    etiquetas: typeof row.etiquetas === 'string' ? JSON.parse(row.etiquetas) : (row.etiquetas || []),
    datos_extra: typeof row.datos_extra === 'string' ? JSON.parse(row.datos_extra) : (row.datos_extra || {}),
    usuario_asignado_id: row.usuario_asignado_id,
    activo: row.activo,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ==================== RELACIONES ENTRE CONTACTOS ====================

export interface ContactoRelacion {
  id: string;
  tenant_id: string;
  contacto_origen_id: string;
  contacto_destino_id: string;
  tipo_relacion: string;
  notas?: string;
  created_at: string;
  updated_at: string;
  // Datos del contacto relacionado (cuando se hace JOIN)
  contacto_relacionado?: Partial<Contacto>;
}

/**
 * Obtiene las relaciones de un contacto
 */
export async function getRelacionesContacto(
  tenantId: string,
  contactoId: string
): Promise<ContactoRelacion[]> {
  const sql = `
    SELECT
      cr.id, cr.tenant_id, cr.contacto_origen_id, cr.contacto_destino_id,
      cr.tipo_relacion, cr.notas, cr.created_at, cr.updated_at,
      c.id as rel_id, c.nombre as rel_nombre, c.apellido as rel_apellido,
      c.email as rel_email, c.telefono as rel_telefono, c.empresa as rel_empresa
    FROM contactos_relaciones cr
    JOIN contactos c ON (
      CASE
        WHEN cr.contacto_origen_id = $2 THEN c.id = cr.contacto_destino_id
        ELSE c.id = cr.contacto_origen_id
      END
    )
    WHERE cr.tenant_id = $1
      AND (cr.contacto_origen_id = $2 OR cr.contacto_destino_id = $2)
    ORDER BY cr.created_at DESC
  `;

  const result = await query(sql, [tenantId, contactoId]);

  return result.rows.map((row: any) => ({
    id: row.id,
    tenant_id: row.tenant_id,
    contacto_origen_id: row.contacto_origen_id,
    contacto_destino_id: row.contacto_destino_id,
    tipo_relacion: row.tipo_relacion,
    notas: row.notas,
    created_at: row.created_at,
    updated_at: row.updated_at,
    contacto_relacionado: {
      id: row.rel_id,
      nombre: row.rel_nombre,
      apellido: row.rel_apellido,
      email: row.rel_email,
      telefono: row.rel_telefono,
      empresa: row.rel_empresa,
    },
  }));
}

/**
 * Crea una relación entre dos contactos
 */
export async function createRelacionContacto(
  tenantId: string,
  data: {
    contacto_origen_id: string;
    contacto_destino_id: string;
    tipo_relacion: string;
    notas?: string;
  }
): Promise<ContactoRelacion> {
  const sql = `
    INSERT INTO contactos_relaciones (
      tenant_id, contacto_origen_id, contacto_destino_id, tipo_relacion, notas
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const result = await query(sql, [
    tenantId,
    data.contacto_origen_id,
    data.contacto_destino_id,
    data.tipo_relacion,
    data.notas || null,
  ]);

  return result.rows[0];
}

/**
 * Elimina una relación entre contactos
 */
export async function deleteRelacionContacto(
  tenantId: string,
  relacionId: string
): Promise<boolean> {
  const sql = `
    DELETE FROM contactos_relaciones
    WHERE id = $1 AND tenant_id = $2
  `;

  const result = await query(sql, [relacionId, tenantId]);
  return (result.rowCount ?? 0) > 0;
}
