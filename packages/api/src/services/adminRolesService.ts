/**
 * Servicio para gestión de roles en el panel de administración
 */

import { query, getClient } from '../utils/db.js';

export interface Role {
  id: string;
  nombre: string;
  codigo: string;
  tipo: 'platform' | 'tenant';
  descripcion: string | null;
  activo: boolean;
  visible?: boolean;
  featureRequerido?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleData {
  nombre: string;
  codigo: string;
  tipo: 'platform' | 'tenant';
  descripcion?: string;
  activo?: boolean;
  visible?: boolean;
  featureRequerido?: string | null;
}

export interface UpdateRoleData {
  nombre?: string;
  codigo?: string;
  descripcion?: string;
  activo?: boolean;
  visible?: boolean;
  featureRequerido?: string | null;
}

/**
 * Obtiene todos los roles del sistema (plataforma y sistema para tenants)
 * NO incluye roles privados de tenants específicos
 */
export async function getAllRoles(): Promise<Role[]> {
  try {
    const sql = `
      SELECT 
        id,
        nombre,
        codigo,
        tipo,
        descripcion,
        activo,
        visible,
        feature_requerido as "featureRequerido",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM roles
      WHERE (
        -- Roles de plataforma
        tipo = 'platform'
        OR
        -- Roles de sistema para tenants (creados por la plataforma, tenant_id = NULL)
        (tipo = 'tenant' AND tenant_id IS NULL)
      )
      ORDER BY tipo, nombre
    `;

    const result = await query(sql, []);
    return result.rows;
  } catch (error: any) {
    console.error('Error al obtener roles:', error);
    throw new Error(`Error al obtener roles: ${error.message}`);
  }
}

/**
 * Obtiene un rol por ID
 */
export async function getRoleById(roleId: string): Promise<Role | null> {
  try {
    const sql = `
      SELECT 
        id,
        nombre,
        codigo,
        tipo,
        descripcion,
        activo,
        visible,
        feature_requerido as "featureRequerido",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM roles
      WHERE id = $1
    `;

    const result = await query(sql, [roleId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error: any) {
    console.error('Error al obtener rol:', error);
    throw new Error(`Error al obtener rol: ${error.message}`);
  }
}

/**
 * Crea un nuevo rol
 */
export async function createRole(data: CreateRoleData): Promise<Role> {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Validar que el código no exista
    const existingRole = await client.query(
      `SELECT id FROM roles WHERE codigo = $1`,
      [data.codigo]
    );

    if (existingRole.rows.length > 0) {
      throw new Error(`Ya existe un rol con el código "${data.codigo}"`);
    }

    // Validar tipo
    if (data.tipo !== 'platform' && data.tipo !== 'tenant') {
      throw new Error('El tipo debe ser "platform" o "tenant"');
    }

    // IMPORTANTE: Los roles creados desde el admin de la plataforma siempre tienen tenant_id = NULL
    // - Roles de plataforma (tipo = 'platform'): tenant_id = NULL (no aplica, pero se mantiene NULL)
    // - Roles de sistema para tenants (tipo = 'tenant'): tenant_id = NULL (disponibles para todos los tenants)
    // Los roles privados de tenant se crean desde el CRM del tenant usando createRolTenant()
    const visible = data.visible !== undefined ? data.visible : true;
    const featureRequerido = data.featureRequerido || null;
    
    const insertSql = `
      INSERT INTO roles (nombre, codigo, tipo, descripcion, activo, tenant_id, visible, feature_requerido)
      VALUES ($1, $2, $3, $4, $5, NULL, $6, $7)
      RETURNING 
        id,
        nombre,
        codigo,
        tipo,
        descripcion,
        activo,
        visible,
        feature_requerido as "featureRequerido",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const result = await client.query(insertSql, [
      data.nombre,
      data.codigo,
      data.tipo,
      data.descripcion || null,
      data.activo !== undefined ? data.activo : true,
      visible,
      featureRequerido,
    ]);

    await client.query('COMMIT');

    return result.rows[0];
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error al crear rol:', error);
    throw new Error(error.message || 'Error al crear rol');
  } finally {
    client.release();
  }
}

/**
 * Actualiza un rol existente
 */
export async function updateRole(roleId: string, data: UpdateRoleData): Promise<Role> {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Verificar que el rol existe
    const existingRole = await client.query(
      `SELECT id FROM roles WHERE id = $1`,
      [roleId]
    );

    if (existingRole.rows.length === 0) {
      throw new Error('Rol no encontrado');
    }

    // Si se está cambiando el código, validar que no exista otro con ese código
    if (data.codigo) {
      const codigoExists = await client.query(
        `SELECT id FROM roles WHERE codigo = $1 AND id != $2`,
        [data.codigo, roleId]
      );

      if (codigoExists.rows.length > 0) {
        throw new Error(`Ya existe otro rol con el código "${data.codigo}"`);
      }
    }

    // Construir la query de actualización dinámicamente
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.nombre !== undefined) {
      updates.push(`nombre = $${paramIndex++}`);
      values.push(data.nombre);
    }

    if (data.codigo !== undefined) {
      updates.push(`codigo = $${paramIndex++}`);
      values.push(data.codigo);
    }

    if (data.descripcion !== undefined) {
      updates.push(`descripcion = $${paramIndex++}`);
      values.push(data.descripcion || null);
    }

    if (data.activo !== undefined) {
      updates.push(`activo = $${paramIndex++}`);
      values.push(data.activo);
    }

    if (data.visible !== undefined) {
      updates.push(`visible = $${paramIndex++}`);
      values.push(data.visible);
    }

    if (data.featureRequerido !== undefined) {
      updates.push(`feature_requerido = $${paramIndex++}`);
      values.push(data.featureRequerido || null);
    }

    if (updates.length === 0) {
      throw new Error('No hay campos para actualizar');
    }

    // Agregar updated_at
    updates.push(`updated_at = NOW()`);

    // Agregar el roleId al final para el WHERE
    values.push(roleId);

    const updateSql = `
      UPDATE roles 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id,
        nombre,
        codigo,
        tipo,
        descripcion,
        activo,
        visible,
        feature_requerido as "featureRequerido",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const result = await client.query(updateSql, values);

    if (result.rows.length === 0) {
      throw new Error('Error al actualizar rol');
    }

    await client.query('COMMIT');

    return result.rows[0];
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar rol:', error);
    throw new Error(error.message || 'Error al actualizar rol');
  } finally {
    client.release();
  }
}

/**
 * Elimina un rol (soft delete - marca como inactivo)
 */
export async function deleteRole(roleId: string): Promise<void> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Verificar que el rol existe
    const roleExists = await client.query(
      `SELECT id FROM roles WHERE id = $1`,
      [roleId]
    );

    if (roleExists.rows.length === 0) {
      throw new Error('Rol no encontrado');
    }

    // Verificar si hay usuarios usando este rol
    const usersWithRole = await client.query(
      `SELECT COUNT(*) as count FROM usuarios_roles WHERE rol_id = $1 AND activo = true`,
      [roleId]
    );

    const count = parseInt(usersWithRole.rows[0].count);
    if (count > 0) {
      throw new Error(`No se puede eliminar el rol porque ${count} usuario(s) lo están usando. Primero desasigna el rol de los usuarios.`);
    }

    // Marcar rol como inactivo en lugar de eliminar físicamente
    await client.query(
      `UPDATE roles SET activo = false, updated_at = NOW() WHERE id = $1`,
      [roleId]
    );

    await client.query('COMMIT');
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar rol:', error);
    throw new Error(error.message || 'Error al eliminar rol');
  } finally {
    client.release();
  }
}

