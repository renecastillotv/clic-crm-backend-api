/**
 * Servicio para gestión de usuarios en el panel de administración
 */

import { query, getClient } from '../utils/db.js';
import bcrypt from 'bcrypt';
import { createClerkUser, updateClerkUser } from '../middleware/clerkAuth.js';

export interface AdminUser {
  id: string;
  email: string;
  nombre: string | null;
  apellido: string | null;
  avatarUrl: string | null;
  esPlatformAdmin: boolean;
  activo: boolean;
  ultimoAcceso: string | null;
  createdAt: string;
  updatedAt: string;
  // Relaciones
  tenants: Array<{
    tenantId: string;
    tenantNombre: string;
    tenantSlug: string;
    rolNombre: string;
    esOwner: boolean;
  }>;
  roles: Array<{
    rolId: string;
    rolNombre: string;
    rolTipo: string;
    tenantId: string | null;
  }>;
}

/**
 * Obtiene todos los usuarios para el panel de administración
 */
export async function getAllUsers(): Promise<AdminUser[]> {
  try {
    const sql = `
      SELECT 
        u.id,
        u.email,
        u.nombre,
        u.apellido,
        u.avatar_url as "avatarUrl",
        u.es_platform_admin as "esPlatformAdmin",
        u.activo,
        u.ultimo_acceso as "ultimoAcceso",
        u.created_at as "createdAt",
        u.updated_at as "updatedAt"
      FROM usuarios u
      ORDER BY u.created_at DESC
    `;

    const result = await query(sql, []);

    // Para cada usuario, obtener sus tenants y roles
    const usersWithRelations = await Promise.all(
      result.rows.map(async (row: any) => {
        const userId = row.id;

        // Obtener tenants asociados (desde usuarios_tenants)
        const tenantsSql = `
          SELECT DISTINCT
            ut.tenant_id as "tenantId",
            t.nombre as "tenantNombre",
            t.slug as "tenantSlug",
            ut.es_owner as "esOwner"
          FROM usuarios_tenants ut
          INNER JOIN tenants t ON t.id = ut.tenant_id
          WHERE ut.usuario_id = $1 AND ut.activo = true
        `;

        const tenantsResult = await query(tenantsSql, [userId]);
        
        // Obtener roles por cada tenant
        const tenants = await Promise.all(
          tenantsResult.rows.map(async (tenantRow: any) => {
            const rolesInTenantSql = `
              SELECT r.nombre
              FROM usuarios_roles ur
              INNER JOIN roles r ON r.id = ur.rol_id
              WHERE ur.usuario_id = $1 
                AND ur.tenant_id = $2 
                AND ur.activo = true
              LIMIT 1
            `;
            const rolesResult = await query(rolesInTenantSql, [userId, tenantRow.tenantId]);
            
            return {
              tenantId: tenantRow.tenantId,
              tenantNombre: tenantRow.tenantNombre,
              tenantSlug: tenantRow.tenantSlug,
              rolNombre: rolesResult.rows[0]?.nombre || 'Sin rol',
              esOwner: tenantRow.esOwner,
            };
          })
        );

        // Obtener roles del usuario
        const rolesSql = `
          SELECT 
            r.id as "rolId",
            r.nombre as "rolNombre",
            r.tipo as "rolTipo",
            ur.tenant_id as "tenantId"
          FROM usuarios_roles ur
          INNER JOIN roles r ON r.id = ur.rol_id
          WHERE ur.usuario_id = $1 AND ur.activo = true
        `;

        const rolesResult = await query(rolesSql, [userId]);
        let roles = rolesResult.rows.map((r: any) => ({
          rolId: r.rolId,
          rolNombre: r.rolNombre || 'Sin rol',
          rolTipo: r.rolTipo || 'tenant',
          tenantId: r.tenantId,
        }));

        // Si es platform admin pero no tiene rol explícito, agregar rol platform
        if (row.esPlatformAdmin && !roles.some((r: any) => r.rolTipo === 'platform')) {
          roles.unshift({
            rolId: '',
            rolNombre: 'Platform Admin',
            rolTipo: 'platform',
            tenantId: null,
          });
        }

        return {
          id: row.id,
          email: row.email,
          nombre: row.nombre,
          apellido: row.apellido,
          avatarUrl: row.avatarUrl || null,
          esPlatformAdmin: row.esPlatformAdmin,
          activo: row.activo,
          ultimoAcceso: row.ultimoAcceso ? row.ultimoAcceso.toISOString() : null,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
          tenants,
          roles,
        };
      })
    );

    return usersWithRelations;
  } catch (error: any) {
    console.error('Error al obtener usuarios:', error);
    throw new Error(`Error al obtener usuarios: ${error.message}`);
  }
}

/**
 * Obtiene las estadísticas de usuarios para el panel admin
 */
export async function getUserStats(): Promise<{
  total: number;
  platformAdmins: number;
  active: number;
  totalByTenant: Record<string, number>;
}> {
  try {
    // Total de usuarios
    const totalResult = await query(`SELECT COUNT(*) as count FROM usuarios`);
    const total = parseInt(totalResult.rows[0].count);

    // Platform admins
    const platformAdminsResult = await query(
      `SELECT COUNT(*) as count FROM usuarios WHERE es_platform_admin = true`
    );
    const platformAdmins = parseInt(platformAdminsResult.rows[0].count);

    // Activos
    const activeResult = await query(
      `SELECT COUNT(*) as count FROM usuarios WHERE activo = true`
    );
    const active = parseInt(activeResult.rows[0].count);

    // Por tenant (conteo)
    const tenantsResult = await query(
      `SELECT 
        tenant_id,
        COUNT(DISTINCT usuario_id) as count
      FROM usuarios_tenants
      WHERE activo = true
      GROUP BY tenant_id`
    );

    const totalByTenant: Record<string, number> = {};
    tenantsResult.rows.forEach((row: any) => {
      totalByTenant[row.tenant_id] = parseInt(row.count);
    });

    return {
      total,
      platformAdmins,
      active,
      totalByTenant,
    };
  } catch (error: any) {
    console.error('Error al obtener estadísticas de usuarios:', error);
    throw new Error(`Error al obtener estadísticas: ${error.message}`);
  }
}

export interface CreateUserData {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  codigoPais?: string;
  idiomaPreferido?: string;
  esPlatformAdmin?: boolean;
  activo?: boolean;
  tenantIds?: string[]; // IDs de tenants a los que se asignará el usuario
  roleIds?: { tenantId: string; roleId: string }[]; // Roles por tenant
}

export interface UpdateUserData {
  email?: string; // Permite cambiar el email
  nombre?: string;
  apellido?: string;
  codigoPais?: string;
  idiomaPreferido?: string;
  esPlatformAdmin?: boolean;
  activo?: boolean;
  password?: string; // Opcional, solo se actualiza si se proporciona
  tenantIds?: string[]; // Lista de tenant IDs para asignar al usuario
  roleIds?: { tenantId: string | null; roleId: string }[]; // Lista de roles a asignar
}

/**
 * Obtiene un usuario por ID con sus relaciones
 */
export async function getUserById(userId: string): Promise<AdminUser & { codigoPais?: string; idiomaPreferido?: string } | null> {
  try {
    const sql = `
      SELECT 
        u.id,
        u.email,
        u.nombre,
        u.apellido,
        u.avatar_url as "avatarUrl",
        u.codigo_pais as "codigoPais",
        u.idioma_preferido as "idiomaPreferido",
        u.es_platform_admin as "esPlatformAdmin",
        u.activo,
        u.ultimo_acceso as "ultimoAcceso",
        u.created_at as "createdAt",
        u.updated_at as "updatedAt"
      FROM usuarios u
      WHERE u.id = $1
    `;

    const result = await query(sql, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const userIdValue = row.id;

    // Obtener tenants asociados
    const tenantsSql = `
      SELECT DISTINCT
        ut.tenant_id as "tenantId",
        t.nombre as "tenantNombre",
        t.slug as "tenantSlug",
        ut.es_owner as "esOwner"
      FROM usuarios_tenants ut
      INNER JOIN tenants t ON t.id = ut.tenant_id
      WHERE ut.usuario_id = $1 AND ut.activo = true
    `;

    const tenantsResult = await query(tenantsSql, [userIdValue]);
    
    // Obtener roles por cada tenant
    const tenants = await Promise.all(
      tenantsResult.rows.map(async (tenantRow: any) => {
        const rolesInTenantSql = `
          SELECT r.nombre
          FROM usuarios_roles ur
          INNER JOIN roles r ON r.id = ur.rol_id
          WHERE ur.usuario_id = $1 
            AND ur.tenant_id = $2 
            AND ur.activo = true
          LIMIT 1
        `;
        const rolesResult = await query(rolesInTenantSql, [userIdValue, tenantRow.tenantId]);
        
        return {
          tenantId: tenantRow.tenantId,
          tenantNombre: tenantRow.tenantNombre,
          tenantSlug: tenantRow.tenantSlug,
          rolNombre: rolesResult.rows[0]?.nombre || 'Sin rol',
          esOwner: tenantRow.esOwner,
        };
      })
    );

    // Obtener roles del usuario
    const rolesSql = `
      SELECT 
        r.id as "rolId",
        r.nombre as "rolNombre",
        r.tipo as "rolTipo",
        ur.tenant_id as "tenantId"
      FROM usuarios_roles ur
      INNER JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = $1 AND ur.activo = true
    `;

    const rolesResult = await query(rolesSql, [userIdValue]);
    let roles = rolesResult.rows.map((r: any) => ({
      rolId: r.rolId,
      rolNombre: r.rolNombre || 'Sin rol',
      rolTipo: r.rolTipo || 'tenant',
      tenantId: r.tenantId,
    }));

    // Si es platform admin pero no tiene rol explícito, agregar rol platform
    if (row.esPlatformAdmin && !roles.some((r: any) => r.rolTipo === 'platform')) {
      roles.unshift({
        rolId: '',
        rolNombre: 'Platform Admin',
        rolTipo: 'platform',
        tenantId: null,
      });
    }

    return {
      id: row.id,
      email: row.email,
      nombre: row.nombre,
      apellido: row.apellido,
      avatarUrl: row.avatarUrl || null,
      codigoPais: row.codigoPais || undefined,
      idiomaPreferido: row.idiomaPreferido || undefined,
      esPlatformAdmin: row.esPlatformAdmin,
      activo: row.activo,
      ultimoAcceso: row.ultimoAcceso ? row.ultimoAcceso.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      tenants,
      roles,
    };
  } catch (error: any) {
    console.error('Error al obtener usuario:', error);
    throw new Error(`Error al obtener usuario: ${error.message}`);
  }
}

/**
 * Crea un nuevo usuario
 */
export async function createUser(data: CreateUserData): Promise<AdminUser> {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Validar que el email no exista
    const existingUser = await client.query(
      `SELECT id FROM usuarios WHERE email = $1`,
      [data.email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error(`Ya existe un usuario con el email "${data.email}"`);
    }

    // Validar país si se proporciona
    if (data.codigoPais && data.codigoPais.trim()) {
      const paisExists = await client.query(
        `SELECT codigo FROM paises WHERE codigo = $1`,
        [data.codigoPais.trim().toUpperCase()]
      );
      if (paisExists.rows.length === 0) {
        throw new Error(`El código de país "${data.codigoPais}" no existe`);
      }
    }

    // 1. Primero crear el usuario en Clerk
    let clerkUser;
    try {
      clerkUser = await createClerkUser({
        email: data.email,
        password: data.password,
        firstName: data.nombre,
        lastName: data.apellido,
      });
    } catch (error: any) {
      throw new Error(`Error al crear usuario en Clerk: ${error.message}`);
    }

    // 2. Hash de la contraseña para nuestra BD (aunque usaremos Clerk para auth)
    const passwordHash = await bcrypt.hash(data.password, 10);

    // 3. Crear el usuario en nuestra BD con clerk_id
    const insertUserSql = `
      INSERT INTO usuarios (
        email, password_hash, nombre, apellido, clerk_id,
        codigo_pais, idioma_preferido, es_platform_admin, activo
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, email, nombre, apellido, es_platform_admin as "esPlatformAdmin", activo, created_at as "createdAt", updated_at as "updatedAt"
    `;

    const userResult = await client.query(insertUserSql, [
      data.email,
      passwordHash,
      data.nombre,
      data.apellido,
      clerkUser.id, // clerk_id
      data.codigoPais?.trim().toUpperCase() || null,
      data.idiomaPreferido || 'es',
      data.esPlatformAdmin || false,
      data.activo !== undefined ? data.activo : true,
    ]);

    const newUser = userResult.rows[0];

    // Si se proporcionaron tenants, asignarlos
    if (data.tenantIds && data.tenantIds.length > 0) {
      for (const tenantId of data.tenantIds) {
        // Verificar que el tenant existe
        const tenantExists = await client.query(
          `SELECT id FROM tenants WHERE id = $1`,
          [tenantId]
        );
        if (tenantExists.rows.length === 0) {
          continue; // Skip si el tenant no existe
        }

        // Crear relación usuario-tenant
        await client.query(
          `INSERT INTO usuarios_tenants (usuario_id, tenant_id, es_owner, activo)
           VALUES ($1, $2, false, true)
           ON CONFLICT (usuario_id, tenant_id) DO NOTHING`,
          [newUser.id, tenantId]
        );
      }
    }

    // Si se proporcionaron roles, asignarlos
    if (data.roleIds && data.roleIds.length > 0) {
      for (const { tenantId, roleId } of data.roleIds) {
        // Verificar que el rol existe
        const roleExists = await client.query(
          `SELECT id FROM roles WHERE id = $1`,
          [roleId]
        );
        if (roleExists.rows.length === 0) {
          continue; // Skip si el rol no existe
        }

        // Asignar rol
        await client.query(
          `INSERT INTO usuarios_roles (usuario_id, tenant_id, rol_id, activo, asignado_en)
           VALUES ($1, $2, $3, true, NOW())
           ON CONFLICT (usuario_id, tenant_id, rol_id) DO UPDATE SET activo = true`,
          [newUser.id, tenantId || null, roleId]
        );
      }
    }

    await client.query('COMMIT');

    // Obtener el usuario completo con relaciones
    const fullUser = await getUserById(newUser.id);
    if (!fullUser) {
      throw new Error('Error al obtener el usuario creado');
    }

    return fullUser;
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error al crear usuario:', error);
    throw new Error(error.message || 'Error al crear usuario');
  } finally {
    client.release();
  }
}

/**
 * Actualiza un usuario existente
 */
export async function updateUser(userId: string, data: UpdateUserData): Promise<AdminUser> {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Verificar que el usuario existe y obtener clerk_id
    const userExists = await client.query(
      `SELECT id, clerk_id, email FROM usuarios WHERE id = $1`,
      [userId]
    );

    if (userExists.rows.length === 0) {
      throw new Error('Usuario no encontrado');
    }

    const existingUser = userExists.rows[0];
    const clerkId = existingUser.clerk_id;

    // Si se quiere cambiar el email, verificar que no exista otro usuario con ese email
    if (data.email && data.email !== existingUser.email) {
      const emailExists = await client.query(
        `SELECT id FROM usuarios WHERE email = $1 AND id != $2`,
        [data.email, userId]
      );
      if (emailExists.rows.length > 0) {
        throw new Error(`Ya existe otro usuario con el email "${data.email}"`);
      }
    }

    // Si el usuario tiene clerk_id, actualizar también en Clerk
    if (clerkId) {
      try {
        const clerkUpdateData: any = {};
        if (data.email) clerkUpdateData.email = data.email;
        if (data.nombre !== undefined) clerkUpdateData.firstName = data.nombre;
        if (data.apellido !== undefined) clerkUpdateData.lastName = data.apellido;
        if (data.password) clerkUpdateData.password = data.password;

        if (Object.keys(clerkUpdateData).length > 0) {
          await updateClerkUser(clerkId, clerkUpdateData);
        }
      } catch (error: any) {
        console.error('Error al actualizar usuario en Clerk:', error);
        // Continuar con la actualización en BD aunque falle Clerk
      }
    }

    // Construir la query de actualización dinámicamente
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.email !== undefined && data.email !== existingUser.email) {
      updates.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }

    if (data.nombre !== undefined) {
      updates.push(`nombre = $${paramIndex++}`);
      values.push(data.nombre);
    }

    if (data.apellido !== undefined) {
      updates.push(`apellido = $${paramIndex++}`);
      values.push(data.apellido);
    }

    if (data.codigoPais !== undefined) {
      if (data.codigoPais && data.codigoPais.trim()) {
        // Validar que el país existe
        const paisExists = await client.query(
          `SELECT codigo FROM paises WHERE codigo = $1`,
          [data.codigoPais.trim().toUpperCase()]
        );
        if (paisExists.rows.length === 0) {
          throw new Error(`El código de país "${data.codigoPais}" no existe`);
        }
        updates.push(`codigo_pais = $${paramIndex++}`);
        values.push(data.codigoPais.trim().toUpperCase());
      } else {
        updates.push(`codigo_pais = $${paramIndex++}`);
        values.push(null);
      }
    }

    if (data.idiomaPreferido !== undefined) {
      updates.push(`idioma_preferido = $${paramIndex++}`);
      values.push(data.idiomaPreferido);
    }

    if (data.esPlatformAdmin !== undefined) {
      updates.push(`es_platform_admin = $${paramIndex++}`);
      values.push(data.esPlatformAdmin);
    }

    if (data.activo !== undefined) {
      updates.push(`activo = $${paramIndex++}`);
      values.push(data.activo);
    }

    if (data.password !== undefined && data.password.trim()) {
      const passwordHash = await bcrypt.hash(data.password, 10);
      updates.push(`password_hash = $${paramIndex++}`);
      values.push(passwordHash);
    }

    if (updates.length === 0) {
      throw new Error('No hay campos para actualizar');
    }

    // Agregar updated_at
    updates.push(`updated_at = NOW()`);

    // Agregar el userId al final para el WHERE
    values.push(userId);

    const updateSql = `
      UPDATE usuarios 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `;

    await client.query(updateSql, values);

    // Si se proporcionaron tenants, actualizarlos
    if (data.tenantIds !== undefined) {
      // Primero desactivar todos los tenants actuales
      await client.query(
        `UPDATE usuarios_tenants SET activo = false WHERE usuario_id = $1`,
        [userId]
      );

      // Luego activar/crear los nuevos tenants
      if (data.tenantIds.length > 0) {
        for (const tenantId of data.tenantIds) {
          // Verificar que el tenant existe
          const tenantExists = await client.query(
            `SELECT id FROM tenants WHERE id = $1`,
            [tenantId]
          );
          if (tenantExists.rows.length === 0) {
            continue; // Skip si el tenant no existe
          }

          // Crear o reactivar relación usuario-tenant
          await client.query(
            `INSERT INTO usuarios_tenants (usuario_id, tenant_id, es_owner, activo)
             VALUES ($1, $2, false, true)
             ON CONFLICT (usuario_id, tenant_id) DO UPDATE SET activo = true`,
            [userId, tenantId]
          );
        }
      }
    }

    // Si se proporcionaron roles, actualizarlos
    if (data.roleIds !== undefined) {
      // Primero desactivar todos los roles actuales
      await client.query(
        `UPDATE usuarios_roles SET activo = false WHERE usuario_id = $1`,
        [userId]
      );

      // Luego activar/crear los nuevos roles
      if (data.roleIds.length > 0) {
        for (const { tenantId, roleId } of data.roleIds) {
          // Verificar que el rol existe
          const roleExists = await client.query(
            `SELECT id FROM roles WHERE id = $1`,
            [roleId]
          );
          if (roleExists.rows.length === 0) {
            continue; // Skip si el rol no existe
          }

          // Si es un rol de tenant, asegurar que el usuario esté asociado al tenant
          if (tenantId) {
            const tenantExists = await client.query(
              `SELECT id FROM tenants WHERE id = $1`,
              [tenantId]
            );
            if (tenantExists.rows.length > 0) {
              await client.query(
                `INSERT INTO usuarios_tenants (usuario_id, tenant_id, es_owner, activo)
                 VALUES ($1, $2, false, true)
                 ON CONFLICT (usuario_id, tenant_id) DO UPDATE SET activo = true`,
                [userId, tenantId]
              );
            }
          }

          // Asignar o reactivar rol
          await client.query(
            `INSERT INTO usuarios_roles (usuario_id, tenant_id, rol_id, activo, asignado_en)
             VALUES ($1, $2, $3, true, NOW())
             ON CONFLICT (usuario_id, tenant_id, rol_id) DO UPDATE SET activo = true, asignado_en = NOW()`,
            [userId, tenantId || null, roleId]
          );
        }
      }
    }

    await client.query('COMMIT');

    // Obtener el usuario completo con relaciones
    const updatedUser = await getUserById(userId);
    if (!updatedUser) {
      throw new Error('Error al obtener el usuario actualizado');
    }

    return updatedUser;
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar usuario:', error);
    throw new Error(error.message || 'Error al actualizar usuario');
  } finally {
    client.release();
  }
}

export interface Role {
  id: string;
  nombre: string;
  codigo: string;
  tipo: 'platform' | 'tenant';
  descripcion: string | null;
}

/**
 * Obtiene todos los roles disponibles
 */
export async function getAllRoles(): Promise<Role[]> {
  try {
    const sql = `
      SELECT 
        id,
        nombre,
        codigo,
        tipo,
        descripcion
      FROM roles
      WHERE activo = true
        AND (
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
 * Activa o desactiva un usuario
 */
export async function toggleUserStatus(userId: string, activo: boolean): Promise<void> {
  try {
    const result = await query(
      `UPDATE usuarios SET activo = $1, updated_at = NOW() WHERE id = $2 RETURNING id`,
      [activo, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Usuario no encontrado');
    }
  } catch (error: any) {
    console.error('Error al cambiar estado del usuario:', error);
    throw new Error(error.message || 'Error al cambiar estado del usuario');
  }
}

/**
 * Elimina un usuario (soft delete - marca como inactivo)
 */
export async function deleteUser(userId: string): Promise<void> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Marcar usuario como inactivo
    await client.query(
      `UPDATE usuarios SET activo = false, updated_at = NOW() WHERE id = $1`,
      [userId]
    );

    // Desactivar todas las relaciones del usuario
    await client.query(
      `UPDATE usuarios_tenants SET activo = false WHERE usuario_id = $1`,
      [userId]
    );

    await client.query(
      `UPDATE usuarios_roles SET activo = false WHERE usuario_id = $1`,
      [userId]
    );

    await client.query('COMMIT');
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar usuario:', error);
    throw new Error(error.message || 'Error al eliminar usuario');
  } finally {
    client.release();
  }
}

/**
 * Asigna un rol a un usuario en un tenant específico
 */
export async function assignRoleToUser(
  userId: string,
  tenantId: string | null,
  roleId: string
): Promise<void> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Verificar que el usuario existe
    const userExists = await client.query('SELECT id FROM usuarios WHERE id = $1', [userId]);
    if (userExists.rows.length === 0) {
      throw new Error('Usuario no encontrado');
    }

    // Verificar que el rol existe
    const roleExists = await client.query('SELECT id FROM roles WHERE id = $1', [roleId]);
    if (roleExists.rows.length === 0) {
      throw new Error('Rol no encontrado');
    }

    // Si es un rol de tenant, verificar que el tenant existe
    if (tenantId) {
      const tenantExists = await client.query('SELECT id FROM tenants WHERE id = $1', [tenantId]);
      if (tenantExists.rows.length === 0) {
        throw new Error('Tenant no encontrado');
      }

      // Asegurar que el usuario esté asociado al tenant
      await client.query(
        `INSERT INTO usuarios_tenants (usuario_id, tenant_id, es_owner, activo)
         VALUES ($1, $2, false, true)
         ON CONFLICT (usuario_id, tenant_id) DO UPDATE SET activo = true`,
        [userId, tenantId]
      );
    }

    // Asignar el rol (o reactivarlo si ya existe)
    await client.query(
      `INSERT INTO usuarios_roles (usuario_id, tenant_id, rol_id, activo, asignado_en)
       VALUES ($1, $2, $3, true, NOW())
       ON CONFLICT (usuario_id, tenant_id, rol_id) 
       DO UPDATE SET activo = true, asignado_en = NOW()`,
      [userId, tenantId || null, roleId]
    );

    await client.query('COMMIT');
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error al asignar rol:', error);
    throw new Error(error.message || 'Error al asignar rol');
  } finally {
    client.release();
  }
}

/**
 * Desasigna un rol de un usuario en un tenant específico
 */
export async function unassignRoleFromUser(
  userId: string,
  tenantId: string | null,
  roleId: string
): Promise<void> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Desactivar el rol (soft delete)
    await client.query(
      `UPDATE usuarios_roles 
       SET activo = false 
       WHERE usuario_id = $1 AND tenant_id = $2 AND rol_id = $3`,
      [userId, tenantId || null, roleId]
    );

    await client.query('COMMIT');
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error al desasignar rol:', error);
    throw new Error(error.message || 'Error al desasignar rol');
  } finally {
    client.release();
  }
}

