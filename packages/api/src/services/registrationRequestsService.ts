/**
 * Service para gestionar solicitudes de registro de tenants
 *
 * Maneja diferentes tipos de solicitudes:
 * - usuario: Solicitud básica de acceso
 * - asesor: Solicitud para unirse como asesor
 * - independiente: Solicitud para ser agente independiente
 * - propietario: Solicitud de propietario (para portales)
 */

import { query } from '../utils/db.js';

export interface RegistrationRequest {
  id: string;
  tenant_id: string;
  tipo_solicitud: string;
  estado: 'pendiente' | 'visto' | 'aprobado' | 'rechazado';
  nombre: string;
  apellido?: string;
  email: string;
  telefono?: string;
  datos_formulario: Record<string, any>;
  accion_tomada?: string;
  usuario_creado_id?: string;
  notas_admin?: string;
  revisado_por?: string;
  fecha_revision?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRegistrationRequestInput {
  nombre: string;
  apellido?: string;
  email: string;
  telefono?: string;
  tipo_solicitud?: string;
  datos_formulario?: Record<string, any>;
}

export interface UpdateRegistrationRequestInput {
  estado?: 'pendiente' | 'visto' | 'aprobado' | 'rechazado';
  accion_tomada?: string;
  usuario_creado_id?: string;
  notas_admin?: string;
}

/**
 * Crear una nueva solicitud de registro
 */
export async function createRegistrationRequest(
  tenantId: string,
  data: CreateRegistrationRequestInput
): Promise<RegistrationRequest> {
  const sql = `
    INSERT INTO tenant_registration_requests (
      tenant_id,
      tipo_solicitud,
      nombre,
      apellido,
      email,
      telefono,
      datos_formulario
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;

  const result = await query(sql, [
    tenantId,
    data.tipo_solicitud || 'usuario',
    data.nombre,
    data.apellido || null,
    data.email.toLowerCase(),
    data.telefono || null,
    JSON.stringify(data.datos_formulario || {}),
  ]);

  return result.rows[0];
}

/**
 * Obtener solicitudes de un tenant con filtros opcionales
 */
export async function getRegistrationRequests(
  tenantId: string,
  filters?: {
    estado?: string;
    tipo_solicitud?: string;
    busqueda?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ requests: RegistrationRequest[]; total: number }> {
  const conditions = ['tenant_id = $1'];
  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (filters?.estado) {
    conditions.push(`estado = $${paramIndex}`);
    params.push(filters.estado);
    paramIndex++;
  }

  if (filters?.tipo_solicitud) {
    conditions.push(`tipo_solicitud = $${paramIndex}`);
    params.push(filters.tipo_solicitud);
    paramIndex++;
  }

  // Search by name or motivacion
  if (filters?.busqueda) {
    const searchTerm = `%${filters.busqueda}%`;
    conditions.push(`(
      nombre ILIKE $${paramIndex} OR
      apellido ILIKE $${paramIndex} OR
      COALESCE(datos_formulario->>'motivacion', '') ILIKE $${paramIndex}
    )`);
    params.push(searchTerm);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  // Count total
  const countResult = await query(
    `SELECT COUNT(*) FROM tenant_registration_requests WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get paginated results
  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;

  const sql = `
    SELECT * FROM tenant_registration_requests
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  const result = await query(sql, [...params, limit, offset]);

  return {
    requests: result.rows,
    total,
  };
}

/**
 * Obtener una solicitud por ID
 */
export async function getRegistrationRequestById(
  requestId: string,
  tenantId: string
): Promise<RegistrationRequest | null> {
  const sql = `
    SELECT * FROM tenant_registration_requests
    WHERE id = $1 AND tenant_id = $2
  `;

  const result = await query(sql, [requestId, tenantId]);
  return result.rows[0] || null;
}

/**
 * Actualizar una solicitud (cambiar estado, agregar notas, etc.)
 */
export async function updateRegistrationRequest(
  requestId: string,
  tenantId: string,
  userId: string,
  data: UpdateRegistrationRequestInput
): Promise<RegistrationRequest | null> {
  const updates: string[] = ['updated_at = NOW()'];
  const params: any[] = [];
  let paramIndex = 1;

  if (data.estado !== undefined) {
    updates.push(`estado = $${paramIndex}`);
    params.push(data.estado);
    paramIndex++;

    // Si cambia de estado, registrar quién y cuándo
    if (data.estado !== 'pendiente') {
      updates.push(`revisado_por = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
      updates.push(`fecha_revision = NOW()`);
    }
  }

  if (data.accion_tomada !== undefined) {
    updates.push(`accion_tomada = $${paramIndex}`);
    params.push(data.accion_tomada);
    paramIndex++;
  }

  if (data.usuario_creado_id !== undefined) {
    updates.push(`usuario_creado_id = $${paramIndex}`);
    params.push(data.usuario_creado_id);
    paramIndex++;
  }

  if (data.notas_admin !== undefined) {
    updates.push(`notas_admin = $${paramIndex}`);
    params.push(data.notas_admin);
    paramIndex++;
  }

  const sql = `
    UPDATE tenant_registration_requests
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
    RETURNING *
  `;

  params.push(requestId, tenantId);
  const result = await query(sql, params);
  return result.rows[0] || null;
}

/**
 * Marcar solicitud como vista
 */
export async function markAsViewed(
  requestId: string,
  tenantId: string,
  userId: string
): Promise<RegistrationRequest | null> {
  const sql = `
    UPDATE tenant_registration_requests
    SET estado = 'visto',
        revisado_por = $1,
        fecha_revision = NOW(),
        updated_at = NOW()
    WHERE id = $2 AND tenant_id = $3 AND estado = 'pendiente'
    RETURNING *
  `;

  const result = await query(sql, [userId, requestId, tenantId]);
  return result.rows[0] || null;
}

/**
 * Verificar si ya existe una solicitud pendiente con el mismo email
 */
export async function checkDuplicateRequest(
  tenantId: string,
  email: string,
  tipoSolicitud?: string
): Promise<RegistrationRequest | null> {
  let sql = `
    SELECT * FROM tenant_registration_requests
    WHERE tenant_id = $1
      AND email = $2
      AND estado IN ('pendiente', 'visto')
  `;
  const params: any[] = [tenantId, email.toLowerCase()];

  if (tipoSolicitud) {
    sql += ` AND tipo_solicitud = $3`;
    params.push(tipoSolicitud);
  }

  const result = await query(sql, params);
  return result.rows[0] || null;
}

/**
 * Obtener conteo de solicitudes por estado
 */
export async function getRequestsCountByStatus(
  tenantId: string
): Promise<Record<string, number>> {
  const sql = `
    SELECT estado, COUNT(*) as count
    FROM tenant_registration_requests
    WHERE tenant_id = $1
    GROUP BY estado
  `;

  const result = await query(sql, [tenantId]);

  const counts: Record<string, number> = {
    pendiente: 0,
    visto: 0,
    aprobado: 0,
    rechazado: 0,
  };

  for (const row of result.rows) {
    counts[row.estado] = parseInt(row.count, 10);
  }

  return counts;
}

/**
 * Eliminar una solicitud
 */
export async function deleteRegistrationRequest(
  requestId: string,
  tenantId: string
): Promise<boolean> {
  const sql = `
    DELETE FROM tenant_registration_requests
    WHERE id = $1 AND tenant_id = $2
  `;

  const result = await query(sql, [requestId, tenantId]);
  return (result.rowCount ?? 0) > 0;
}
