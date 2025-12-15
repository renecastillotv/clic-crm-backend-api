/**
 * Servicio para gestionar CLIC Connect
 * 
 * Permite a tenants gestionar una red de usuarios externos con acceso limitado
 * al CRM e inventario sin afectar estadísticas ni marca del tenant.
 */

import { query, getClient } from '../utils/db.js';
import { createClerkUser, createClerkUserWithoutPassword } from '../middleware/clerkAuth.js';

export interface UsuarioConnect {
  id: string;
  tenantId: string;
  email: string;
  nombre: string;
  apellido: string | null;
  telefono: string | null;
  clerkUserId: string | null;
  activo: boolean;
  fechaRegistro: string;
  ultimoAcceso: string | null;
  configuracion: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  // Stats calculados
  totalContactos?: number;
  totalInteracciones?: number;
  totalPropiedadesVistas?: number;
}

export interface CreateUsuarioConnectData {
  email: string;
  nombre: string;
  apellido?: string;
  telefono?: string;
  clerkUserId?: string;
  configuracion?: Record<string, any>;
  crearCuentaClerk?: boolean;
  password?: string; // Si se proporciona, se crea la cuenta con esta contraseña
  enviarInvitacion?: boolean; // Si es true, se envía invitación por email
}

export interface UpdateUsuarioConnectData {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  activo?: boolean;
  configuracion?: Record<string, any>;
}

export interface ContactoConnect {
  id: string;
  usuarioConnectId: string;
  tenantId: string;
  nombre: string;
  apellido: string | null;
  email: string | null;
  telefono: string | null;
  notas: string | null;
  datosAdicionales: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactoConnectData {
  nombre: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  notas?: string;
  datosAdicionales?: Record<string, any>;
}

/**
 * Obtiene todos los usuarios Connect de un tenant
 */
export async function getUsuariosConnect(tenantId: string): Promise<UsuarioConnect[]> {
  try {
    const sql = `
      SELECT 
        uc.id,
        uc.tenant_id as "tenantId",
        uc.email,
        uc.nombre,
        uc.apellido,
        uc.telefono,
        uc.clerk_user_id as "clerkUserId",
        uc.activo,
        uc.fecha_registro as "fechaRegistro",
        uc.ultimo_acceso as "ultimoAcceso",
        uc.configuracion,
        uc.created_at as "createdAt",
        uc.updated_at as "updatedAt",
        COUNT(DISTINCT cc.id) as "totalContactos",
        COUNT(DISTINCT ic.id) as "totalInteracciones",
        COUNT(DISTINCT pca.id) as "totalPropiedadesVistas"
      FROM usuarios_connect uc
      LEFT JOIN contactos_connect cc ON uc.id = cc.usuario_connect_id
      LEFT JOIN interacciones_connect ic ON uc.id = ic.usuario_connect_id
      LEFT JOIN propiedades_connect_acceso pca ON uc.id = pca.usuario_connect_id AND pca.tipo_acceso = 'vista'
      WHERE uc.tenant_id = $1
      GROUP BY uc.id
      ORDER BY uc.created_at DESC
    `;
    const result = await query(sql, [tenantId]);
    return result.rows.map(row => ({
      ...row,
      totalContactos: parseInt(row.totalContactos, 10),
      totalInteracciones: parseInt(row.totalInteracciones, 10),
      totalPropiedadesVistas: parseInt(row.totalPropiedadesVistas, 10),
    }));
  } catch (error: any) {
    console.error('Error al obtener usuarios Connect:', error);
    throw new Error(`Error al obtener usuarios Connect: ${error.message}`);
  }
}

/**
 * Obtiene un usuario Connect por ID
 */
export async function getUsuarioConnectById(usuarioConnectId: string, tenantId: string): Promise<UsuarioConnect | null> {
  try {
    const sql = `
      SELECT 
        uc.id,
        uc.tenant_id as "tenantId",
        uc.email,
        uc.nombre,
        uc.apellido,
        uc.telefono,
        uc.clerk_user_id as "clerkUserId",
        uc.activo,
        uc.fecha_registro as "fechaRegistro",
        uc.ultimo_acceso as "ultimoAcceso",
        uc.configuracion,
        uc.created_at as "createdAt",
        uc.updated_at as "updatedAt",
        COUNT(DISTINCT cc.id) as "totalContactos",
        COUNT(DISTINCT ic.id) as "totalInteracciones",
        COUNT(DISTINCT pca.id) as "totalPropiedadesVistas"
      FROM usuarios_connect uc
      LEFT JOIN contactos_connect cc ON uc.id = cc.usuario_connect_id
      LEFT JOIN interacciones_connect ic ON uc.id = ic.usuario_connect_id
      LEFT JOIN propiedades_connect_acceso pca ON uc.id = pca.usuario_connect_id AND pca.tipo_acceso = 'vista'
      WHERE uc.id = $1 AND uc.tenant_id = $2
      GROUP BY uc.id
    `;
    const result = await query(sql, [usuarioConnectId, tenantId]);
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      ...row,
      totalContactos: parseInt(row.totalContactos, 10),
      totalInteracciones: parseInt(row.totalInteracciones, 10),
      totalPropiedadesVistas: parseInt(row.totalPropiedadesVistas, 10),
    };
  } catch (error: any) {
    console.error('Error al obtener usuario Connect:', error);
    throw new Error(`Error al obtener usuario Connect: ${error.message}`);
  }
}

/**
 * Crea un nuevo usuario Connect
 */
export async function createUsuarioConnect(
  tenantId: string,
  data: CreateUsuarioConnectData
): Promise<UsuarioConnect> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Verificar que el email no exista ya para este tenant
    const existing = await client.query(
      'SELECT id FROM usuarios_connect WHERE tenant_id = $1 AND email = $2',
      [tenantId, data.email]
    );
    if (existing.rows.length > 0) {
      throw new Error('Ya existe un usuario Connect con este email para este tenant');
    }

    let clerkUserId = data.clerkUserId || null;

    // Si se solicita crear cuenta en Clerk
    if (data.crearCuentaClerk && !clerkUserId) {
      try {
        if (data.enviarInvitacion) {
          // Crear usuario sin contraseña para que Clerk envíe invitación automáticamente
          const clerkUser = await createClerkUserWithoutPassword({
            email: data.email,
            firstName: data.nombre,
            lastName: data.apellido || undefined,
          });
          clerkUserId = clerkUser.id;
        } else if (data.password) {
          // Crear usuario con contraseña proporcionada
          const clerkUser = await createClerkUser({
            email: data.email,
            password: data.password,
            firstName: data.nombre,
            lastName: data.apellido || undefined,
          });
          clerkUserId = clerkUser.id;
        } else {
          // Generar contraseña temporal si no se proporciona ni se solicita invitación
          const password = generateTemporaryPassword();
          const clerkUser = await createClerkUser({
            email: data.email,
            password: password,
            firstName: data.nombre,
            lastName: data.apellido || undefined,
          });
          clerkUserId = clerkUser.id;
        }
      } catch (error: any) {
        console.error('Error al crear usuario en Clerk:', error);
        // No fallar si Clerk falla, pero registrar el error
        // El usuario Connect se crea sin cuenta Clerk y se puede vincular después
      }
    }

    const sql = `
      INSERT INTO usuarios_connect (
        tenant_id, email, nombre, apellido, telefono, clerk_user_id, configuracion
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      RETURNING 
        id, tenant_id as "tenantId", email, nombre, apellido, telefono,
        clerk_user_id as "clerkUserId", activo, fecha_registro as "fechaRegistro",
        ultimo_acceso as "ultimoAcceso", configuracion, created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const values = [
      tenantId,
      data.email,
      data.nombre,
      data.apellido || null,
      data.telefono || null,
      clerkUserId,
      JSON.stringify(data.configuracion || {}),
    ];

    const result = await client.query(sql, values);
    const usuario = result.rows[0];
    
    // Agregar stats iniciales
    usuario.totalContactos = 0;
    usuario.totalInteracciones = 0;
    usuario.totalPropiedadesVistas = 0;

    await client.query('COMMIT');
    return usuario;
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error al crear usuario Connect:', error);
    throw new Error(`Error al crear usuario Connect: ${error.message}`);
  } finally {
    client.release();
  }
}

/**
 * Genera una contraseña temporal segura
 */
function generateTemporaryPassword(): string {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

/**
 * Actualiza un usuario Connect
 */
export async function updateUsuarioConnect(
  usuarioConnectId: string,
  tenantId: string,
  data: UpdateUsuarioConnectData
): Promise<UsuarioConnect> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.nombre !== undefined) {
      updates.push(`nombre = $${paramIndex++}`);
      values.push(data.nombre);
    }
    if (data.apellido !== undefined) {
      updates.push(`apellido = $${paramIndex++}`);
      values.push(data.apellido);
    }
    if (data.telefono !== undefined) {
      updates.push(`telefono = $${paramIndex++}`);
      values.push(data.telefono);
    }
    if (data.activo !== undefined) {
      updates.push(`activo = $${paramIndex++}`);
      values.push(data.activo);
    }
    if (data.configuracion !== undefined) {
      updates.push(`configuracion = $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(data.configuracion));
    }

    if (updates.length === 0) {
      const existing = await getUsuarioConnectById(usuarioConnectId, tenantId);
      if (!existing) {
        throw new Error('Usuario Connect no encontrado');
      }
      return existing;
    }

    updates.push(`updated_at = NOW()`);
    values.push(usuarioConnectId, tenantId);

    const sql = `
      UPDATE usuarios_connect
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
      RETURNING 
        id, tenant_id as "tenantId", email, nombre, apellido, telefono,
        clerk_user_id as "clerkUserId", activo, fecha_registro as "fechaRegistro",
        ultimo_acceso as "ultimoAcceso", configuracion, created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const result = await client.query(sql, values);
    const usuario = result.rows[0];

    // Obtener stats
    const statsResult = await client.query(`
      SELECT 
        COUNT(DISTINCT cc.id) as "totalContactos",
        COUNT(DISTINCT ic.id) as "totalInteracciones",
        COUNT(DISTINCT pca.id) as "totalPropiedadesVistas"
      FROM usuarios_connect uc
      LEFT JOIN contactos_connect cc ON uc.id = cc.usuario_connect_id
      LEFT JOIN interacciones_connect ic ON uc.id = ic.usuario_connect_id
      LEFT JOIN propiedades_connect_acceso pca ON uc.id = pca.usuario_connect_id AND pca.tipo_acceso = 'vista'
      WHERE uc.id = $1
      GROUP BY uc.id
    `, [usuarioConnectId]);

    if (statsResult.rows.length > 0) {
      usuario.totalContactos = parseInt(statsResult.rows[0].totalContactos, 10);
      usuario.totalInteracciones = parseInt(statsResult.rows[0].totalInteracciones, 10);
      usuario.totalPropiedadesVistas = parseInt(statsResult.rows[0].totalPropiedadesVistas, 10);
    } else {
      usuario.totalContactos = 0;
      usuario.totalInteracciones = 0;
      usuario.totalPropiedadesVistas = 0;
    }

    await client.query('COMMIT');
    return usuario;
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar usuario Connect:', error);
    throw new Error(`Error al actualizar usuario Connect: ${error.message}`);
  } finally {
    client.release();
  }
}

/**
 * Elimina un usuario Connect
 */
export async function deleteUsuarioConnect(usuarioConnectId: string, tenantId: string): Promise<void> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const exists = await client.query(
      'SELECT id FROM usuarios_connect WHERE id = $1 AND tenant_id = $2',
      [usuarioConnectId, tenantId]
    );
    if (exists.rows.length === 0) {
      throw new Error('Usuario Connect no encontrado');
    }

    await client.query('DELETE FROM usuarios_connect WHERE id = $1', [usuarioConnectId]);
    await client.query('COMMIT');
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar usuario Connect:', error);
    throw new Error(`Error al eliminar usuario Connect: ${error.message}`);
  } finally {
    client.release();
  }
}

/**
 * Obtiene los contactos de un usuario Connect
 */
export async function getContactosConnect(
  usuarioConnectId: string,
  tenantId: string
): Promise<ContactoConnect[]> {
  try {
    const sql = `
      SELECT 
        cc.id,
        cc.usuario_connect_id as "usuarioConnectId",
        cc.tenant_id as "tenantId",
        cc.nombre,
        cc.apellido,
        cc.email,
        cc.telefono,
        cc.notas,
        cc.datos_adicionales as "datosAdicionales",
        cc.created_at as "createdAt",
        cc.updated_at as "updatedAt"
      FROM contactos_connect cc
      INNER JOIN usuarios_connect uc ON cc.usuario_connect_id = uc.id
      WHERE cc.usuario_connect_id = $1 AND cc.tenant_id = $2
      ORDER BY cc.created_at DESC
    `;
    const result = await query(sql, [usuarioConnectId, tenantId]);
    return result.rows;
  } catch (error: any) {
    console.error('Error al obtener contactos Connect:', error);
    throw new Error(`Error al obtener contactos Connect: ${error.message}`);
  }
}

/**
 * Crea un contacto Connect
 */
export async function createContactoConnect(
  usuarioConnectId: string,
  tenantId: string,
  data: CreateContactoConnectData
): Promise<ContactoConnect> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Verificar que el usuario Connect pertenece al tenant
    const usuarioCheck = await client.query(
      'SELECT id FROM usuarios_connect WHERE id = $1 AND tenant_id = $2',
      [usuarioConnectId, tenantId]
    );
    if (usuarioCheck.rows.length === 0) {
      throw new Error('Usuario Connect no encontrado o no pertenece a este tenant');
    }

    const sql = `
      INSERT INTO contactos_connect (
        usuario_connect_id, tenant_id, nombre, apellido, email, telefono, notas, datos_adicionales
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
      RETURNING 
        id, usuario_connect_id as "usuarioConnectId", tenant_id as "tenantId",
        nombre, apellido, email, telefono, notas, datos_adicionales as "datosAdicionales",
        created_at as "createdAt", updated_at as "updatedAt"
    `;

    const values = [
      usuarioConnectId,
      tenantId,
      data.nombre,
      data.apellido || null,
      data.email || null,
      data.telefono || null,
      data.notas || null,
      JSON.stringify(data.datosAdicionales || {}),
    ];

    const result = await client.query(sql, values);
    const contacto = result.rows[0];

    // Registrar interacción
    await client.query(`
      INSERT INTO interacciones_connect (
        usuario_connect_id, tenant_id, tipo, entidad_tipo, entidad_id, datos
      )
      VALUES ($1, $2, 'contacto_creado', 'contacto', $3, '{}'::jsonb)
    `, [usuarioConnectId, tenantId, contacto.id]);

    await client.query('COMMIT');
    return contacto;
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error al crear contacto Connect:', error);
    throw new Error(`Error al crear contacto Connect: ${error.message}`);
  } finally {
    client.release();
  }
}

