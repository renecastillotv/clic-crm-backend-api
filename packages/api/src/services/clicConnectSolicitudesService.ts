import { query, getClient } from '../utils/db.js';

/**
 * Servicio para gestionar solicitudes CLIC Connect
 */

export interface JoinRequest {
  id: string;
  tenantId: string;
  email: string;
  nombre: string;
  apellido: string | null;
  telefono: string | null;
  codigoReferido: string | null;
  anosExperiencia: number | null;
  especializacion: string | null;
  agenciaActual: string | null;
  motivacion: string | null;
  estado: 'pending' | 'approved' | 'rejected';
  revisadoPor: string | null;
  revisadoAt: string | null;
  notasRevision: string | null;
  createdAt: string;
  updatedAt: string;
  referidor?: {
    nombre: string | null;
    apellido: string | null;
    email: string;
  } | null;
  revisor?: {
    nombre: string | null;
    apellido: string | null;
    email: string;
  } | null;
}

export interface CreateJoinRequestData {
  email: string;
  nombre: string;
  apellido?: string;
  telefono?: string;
  codigoReferido?: string;
  anosExperiencia?: number;
  especializacion?: string;
  agenciaActual?: string;
  motivacion?: string;
}

export interface UpgradeRequest {
  id: string;
  tenantId: string;
  usuarioId: string;
  tipoSolicitud: 'create_new_tenant' | 'return_to_tenant';
  razon: string;
  nombreTenantPropuesto: string | null;
  planPropuesto: string | null;
  tamanoEquipoEstimado: number | null;
  tenantOriginalId: string | null;
  propiedadesAMigrar: number;
  propiedadesPublicadas: number;
  propiedadesCaptacion: number;
  propiedadesRechazadas: number;
  tarifaSetup: number;
  tarifaSetupPagada: boolean;
  estado: 'pending' | 'approved' | 'rejected';
  revisadoPor: string | null;
  revisadoAt: string | null;
  notasRevision: string | null;
  createdAt: string;
  updatedAt: string;
  usuario?: {
    nombre: string | null;
    apellido: string | null;
    email: string;
  };
  revisor?: {
    nombre: string | null;
    apellido: string | null;
    email: string;
  } | null;
}

export interface CreateUpgradeRequestData {
  tipoSolicitud: 'create_new_tenant' | 'return_to_tenant';
  razon: string;
  nombreTenantPropuesto?: string;
  planPropuesto?: string;
  tamanoEquipoEstimado?: number;
  tenantOriginalId?: string;
  propiedadesAMigrar?: number;
  propiedadesPublicadas?: number;
  propiedadesCaptacion?: number;
  propiedadesRechazadas?: number;
  tarifaSetup?: number;
}

/**
 * Obtiene todas las solicitudes de unirse a CLIC Connect
 */
export async function getJoinRequests(tenantId: string): Promise<JoinRequest[]> {
  const sql = `
    SELECT 
      jr.*,
      u_referidor.nombre as referidor_nombre,
      u_referidor.apellido as referidor_apellido,
      u_referidor.email as referidor_email,
      u_revisor.nombre as revisor_nombre,
      u_revisor.apellido as revisor_apellido,
      u_revisor.email as revisor_email
    FROM clic_connect_join_requests jr
    LEFT JOIN usuarios u_referidor ON u_referidor.id = (
      SELECT ut.usuario_id 
      FROM usuarios_tenants ut
      JOIN usuarios u ON u.id = ut.usuario_id
      WHERE u.email = jr.codigo_referido AND ut.tenant_id = jr.tenant_id
      LIMIT 1
    )
    LEFT JOIN usuarios u_revisor ON u_revisor.id = jr.revisado_por
    WHERE jr.tenant_id = $1
    ORDER BY jr.created_at DESC
  `;
  const result = await query(sql, [tenantId]);
  
  return result.rows.map(formatJoinRequest);
}

/**
 * Obtiene una solicitud de unirse por ID
 */
export async function getJoinRequestById(tenantId: string, requestId: string): Promise<JoinRequest | null> {
  const sql = `
    SELECT 
      jr.*,
      u_referidor.nombre as referidor_nombre,
      u_referidor.apellido as referidor_apellido,
      u_referidor.email as referidor_email,
      u_revisor.nombre as revisor_nombre,
      u_revisor.apellido as revisor_apellido,
      u_revisor.email as revisor_email
    FROM clic_connect_join_requests jr
    LEFT JOIN usuarios u_referidor ON u_referidor.id = (
      SELECT ut.usuario_id 
      FROM usuarios_tenants ut
      JOIN usuarios u ON u.id = ut.usuario_id
      WHERE u.email = jr.codigo_referido AND ut.tenant_id = jr.tenant_id
      LIMIT 1
    )
    LEFT JOIN usuarios u_revisor ON u_revisor.id = jr.revisado_por
    WHERE jr.id = $1 AND jr.tenant_id = $2
  `;
  const result = await query(sql, [requestId, tenantId]);
  
  if (result.rows.length === 0) return null;
  return formatJoinRequest(result.rows[0]);
}

/**
 * Crea una nueva solicitud de unirse
 */
export async function createJoinRequest(tenantId: string, data: CreateJoinRequestData): Promise<JoinRequest> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    
    const sql = `
      INSERT INTO clic_connect_join_requests (
        tenant_id, email, nombre, apellido, telefono, codigo_referido,
        anos_experiencia, especializacion, agencia_actual, motivacion
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const values = [
      tenantId,
      data.email,
      data.nombre,
      data.apellido || null,
      data.telefono || null,
      data.codigoReferido || null,
      data.anosExperiencia || null,
      data.especializacion || null,
      data.agenciaActual || null,
      data.motivacion || null,
    ];
    
    const result = await client.query(sql, values);
    await client.query('COMMIT');
    
    return formatJoinRequest(result.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    throw new Error(`Error al crear solicitud: ${error.message}`);
  } finally {
    client.release();
  }
}

/**
 * Aprueba una solicitud de unirse
 */
export async function approveJoinRequest(
  tenantId: string,
  requestId: string,
  revisadoPor: string,
  notasRevision?: string
): Promise<JoinRequest> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    
    // Obtener la solicitud
    const request = await getJoinRequestById(tenantId, requestId);
    if (!request) {
      throw new Error('Solicitud no encontrada');
    }
    
    if (request.estado !== 'pending') {
      throw new Error('La solicitud ya fue procesada');
    }
    
    // TODO: Aquí se debería crear el usuario y asignarle el rol connect
    // Por ahora solo marcamos como aprobada
    
    const sql = `
      UPDATE clic_connect_join_requests
      SET 
        estado = 'approved',
        revisado_por = $1,
        revisado_at = NOW(),
        notas_revision = $2,
        updated_at = NOW()
      WHERE id = $3 AND tenant_id = $4
      RETURNING *
    `;
    
    const result = await client.query(sql, [revisadoPor, notasRevision || null, requestId, tenantId]);
    await client.query('COMMIT');
    
    return formatJoinRequest(result.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    throw new Error(`Error al aprobar solicitud: ${error.message}`);
  } finally {
    client.release();
  }
}

/**
 * Rechaza una solicitud de unirse
 */
export async function rejectJoinRequest(
  tenantId: string,
  requestId: string,
  revisadoPor: string,
  notasRevision: string
): Promise<JoinRequest> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    
    const sql = `
      UPDATE clic_connect_join_requests
      SET 
        estado = 'rejected',
        revisado_por = $1,
        revisado_at = NOW(),
        notas_revision = $2,
        updated_at = NOW()
      WHERE id = $3 AND tenant_id = $4
      RETURNING *
    `;
    
    const result = await client.query(sql, [revisadoPor, notasRevision, requestId, tenantId]);
    await client.query('COMMIT');
    
    return formatJoinRequest(result.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    throw new Error(`Error al rechazar solicitud: ${error.message}`);
  } finally {
    client.release();
  }
}

/**
 * Obtiene todas las solicitudes de upgrade
 */
export async function getUpgradeRequests(tenantId: string): Promise<UpgradeRequest[]> {
  const sql = `
    SELECT 
      ur.*,
      u_usuario.nombre as usuario_nombre,
      u_usuario.apellido as usuario_apellido,
      u_usuario.email as usuario_email,
      u_revisor.nombre as revisor_nombre,
      u_revisor.apellido as revisor_apellido,
      u_revisor.email as revisor_email
    FROM clic_connect_upgrade_requests ur
    JOIN usuarios u_usuario ON u_usuario.id = ur.usuario_id
    LEFT JOIN usuarios u_revisor ON u_revisor.id = ur.revisado_por
    WHERE ur.tenant_id = $1
    ORDER BY ur.created_at DESC
  `;
  const result = await query(sql, [tenantId]);
  
  return result.rows.map(formatUpgradeRequest);
}

/**
 * Obtiene una solicitud de upgrade por ID
 */
export async function getUpgradeRequestById(tenantId: string, requestId: string): Promise<UpgradeRequest | null> {
  const sql = `
    SELECT 
      ur.*,
      u_usuario.nombre as usuario_nombre,
      u_usuario.apellido as usuario_apellido,
      u_usuario.email as usuario_email,
      u_revisor.nombre as revisor_nombre,
      u_revisor.apellido as revisor_apellido,
      u_revisor.email as revisor_email
    FROM clic_connect_upgrade_requests ur
    JOIN usuarios u_usuario ON u_usuario.id = ur.usuario_id
    LEFT JOIN usuarios u_revisor ON u_revisor.id = ur.revisado_por
    WHERE ur.id = $1 AND ur.tenant_id = $2
  `;
  const result = await query(sql, [requestId, tenantId]);
  
  if (result.rows.length === 0) return null;
  return formatUpgradeRequest(result.rows[0]);
}

/**
 * Crea una nueva solicitud de upgrade
 */
export async function createUpgradeRequest(
  tenantId: string,
  usuarioId: string,
  data: CreateUpgradeRequestData
): Promise<UpgradeRequest> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    
    const sql = `
      INSERT INTO clic_connect_upgrade_requests (
        tenant_id, usuario_id, tipo_solicitud, razon,
        nombre_tenant_propuesto, plan_propuesto, tamano_equipo_estimado,
        tenant_original_id, propiedades_a_migrar, propiedades_publicadas,
        propiedades_captacion, propiedades_rechazadas, tarifa_setup
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    
    const values = [
      tenantId,
      usuarioId,
      data.tipoSolicitud,
      data.razon,
      data.nombreTenantPropuesto || null,
      data.planPropuesto || null,
      data.tamanoEquipoEstimado || null,
      data.tenantOriginalId || null,
      data.propiedadesAMigrar || 0,
      data.propiedadesPublicadas || 0,
      data.propiedadesCaptacion || 0,
      data.propiedadesRechazadas || 0,
      data.tarifaSetup || 0,
    ];
    
    const result = await client.query(sql, values);
    await client.query('COMMIT');
    
    return formatUpgradeRequest(result.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    throw new Error(`Error al crear solicitud de upgrade: ${error.message}`);
  } finally {
    client.release();
  }
}

/**
 * Aprueba una solicitud de upgrade
 */
export async function approveUpgradeRequest(
  tenantId: string,
  requestId: string,
  revisadoPor: string,
  notasRevision?: string
): Promise<UpgradeRequest> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    
    const request = await getUpgradeRequestById(tenantId, requestId);
    if (!request) {
      throw new Error('Solicitud no encontrada');
    }
    
    if (request.estado !== 'pending') {
      throw new Error('La solicitud ya fue procesada');
    }
    
    // TODO: Implementar lógica de aprobación según tipo_solicitud
    // - create_new_tenant: crear nuevo tenant y migrar propiedades
    // - return_to_tenant: mover usuario de vuelta al tenant original
    
    const sql = `
      UPDATE clic_connect_upgrade_requests
      SET 
        estado = 'approved',
        revisado_por = $1,
        revisado_at = NOW(),
        notas_revision = $2,
        updated_at = NOW()
      WHERE id = $3 AND tenant_id = $4
      RETURNING *
    `;
    
    const result = await client.query(sql, [revisadoPor, notasRevision || null, requestId, tenantId]);
    await client.query('COMMIT');
    
    return formatUpgradeRequest(result.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    throw new Error(`Error al aprobar solicitud: ${error.message}`);
  } finally {
    client.release();
  }
}

/**
 * Rechaza una solicitud de upgrade
 */
export async function rejectUpgradeRequest(
  tenantId: string,
  requestId: string,
  revisadoPor: string,
  notasRevision: string
): Promise<UpgradeRequest> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    
    const sql = `
      UPDATE clic_connect_upgrade_requests
      SET 
        estado = 'rejected',
        revisado_por = $1,
        revisado_at = NOW(),
        notas_revision = $2,
        updated_at = NOW()
      WHERE id = $3 AND tenant_id = $4
      RETURNING *
    `;
    
    const result = await client.query(sql, [revisadoPor, notasRevision, requestId, tenantId]);
    await client.query('COMMIT');
    
    return formatUpgradeRequest(result.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    throw new Error(`Error al rechazar solicitud: ${error.message}`);
  } finally {
    client.release();
  }
}

/**
 * Formatea una solicitud de unirse desde la BD
 */
function formatJoinRequest(row: any): JoinRequest {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    email: row.email,
    nombre: row.nombre,
    apellido: row.apellido,
    telefono: row.telefono,
    codigoReferido: row.codigo_referido,
    anosExperiencia: row.anos_experiencia,
    especializacion: row.especializacion,
    agenciaActual: row.agencia_actual,
    motivacion: row.motivacion,
    estado: row.estado,
    revisadoPor: row.revisado_por,
    revisadoAt: row.revisado_at,
    notasRevision: row.notas_revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    referidor: row.referidor_nombre || row.referidor_email ? {
      nombre: row.referidor_nombre,
      apellido: row.referidor_apellido,
      email: row.referidor_email,
    } : null,
    revisor: row.revisor_nombre || row.revisor_email ? {
      nombre: row.revisor_nombre,
      apellido: row.revisor_apellido,
      email: row.revisor_email,
    } : null,
  };
}

/**
 * Formatea una solicitud de upgrade desde la BD
 */
function formatUpgradeRequest(row: any): UpgradeRequest {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    usuarioId: row.usuario_id,
    tipoSolicitud: row.tipo_solicitud,
    razon: row.razon,
    nombreTenantPropuesto: row.nombre_tenant_propuesto,
    planPropuesto: row.plan_propuesto,
    tamanoEquipoEstimado: row.tamano_equipo_estimado,
    tenantOriginalId: row.tenant_original_id,
    propiedadesAMigrar: parseInt(row.propiedades_a_migrar, 10),
    propiedadesPublicadas: parseInt(row.propiedades_publicadas, 10),
    propiedadesCaptacion: parseInt(row.propiedades_captacion, 10),
    propiedadesRechazadas: parseInt(row.propiedades_rechazadas, 10),
    tarifaSetup: parseFloat(row.tarifa_setup),
    tarifaSetupPagada: row.tarifa_setup_pagada,
    estado: row.estado,
    revisadoPor: row.revisado_por,
    revisadoAt: row.revisado_at,
    notasRevision: row.notas_revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    usuario: {
      nombre: row.usuario_nombre,
      apellido: row.usuario_apellido,
      email: row.usuario_email,
    },
    revisor: row.revisor_nombre || row.revisor_email ? {
      nombre: row.revisor_nombre,
      apellido: row.revisor_apellido,
      email: row.revisor_email,
    } : null,
  };
}












