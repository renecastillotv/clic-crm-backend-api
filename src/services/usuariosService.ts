/**
 * Servicio de Usuarios
 *
 * Gestiona usuarios, sincronización con Clerk y roles.
 */

import { query } from '../utils/db.js';
import { createClerkUser, createClerkUserWithoutPassword, deactivateClerkUser, reactivateClerkUser } from '../middleware/clerkAuth.js';
import { v4 as uuidv4 } from 'uuid';

export interface Usuario {
  id: string;
  email: string;
  nombre: string | null;
  apellido: string | null;
  clerkId: string | null;
  avatarUrl: string | null;
  telefono: string | null;
  esPlatformAdmin: boolean;
  activo: boolean;
  ultimoAcceso: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsuarioConRoles extends Usuario {
  // Campos extendidos del perfil
  direccion?: string | null;
  ciudad?: string | null;
  estado?: string | null;
  codigoPostal?: string | null;
  pais?: string | null;
  empresa?: string | null;
  cargo?: string | null;
  departamento?: string | null;
  // Tenants y roles
  tenants: {
    id: string;
    nombre: string;
    slug: string;
    esOwner: boolean;
    roles: {
      id: string;
      codigo: string;
      nombre: string;
      color: string | null;
    }[];
  }[];
}

/**
 * Obtener usuario por email
 */
export async function getUsuarioByEmail(email: string): Promise<Usuario | null> {
  const sql = `
    SELECT
      id,
      email,
      nombre,
      apellido,
      clerk_id as "clerkId",
      avatar_url as "avatarUrl",
      telefono,
      es_platform_admin as "esPlatformAdmin",
      activo,
      ultimo_acceso as "ultimoAcceso",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM usuarios
    WHERE email = $1
  `;

  const result = await query(sql, [email]);
  return result.rows[0] || null;
}

/**
 * Obtener usuario por Clerk ID
 */
export async function getUsuarioByClerkId(clerkId: string): Promise<Usuario | null> {
  const sql = `
    SELECT
      id,
      email,
      nombre,
      apellido,
      clerk_id as "clerkId",
      avatar_url as "avatarUrl",
      telefono,
      es_platform_admin as "esPlatformAdmin",
      activo,
      ultimo_acceso as "ultimoAcceso",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM usuarios
    WHERE clerk_id = $1
  `;

  const result = await query(sql, [clerkId]);
  return result.rows[0] || null;
}

/**
 * Obtener usuario con todos sus tenants y roles
 */
export async function getUsuarioConRoles(usuarioId: string): Promise<UsuarioConRoles | null> {
  // Obtener usuario con campos extendidos
  const usuarioSql = `
    SELECT
      id,
      email,
      nombre,
      apellido,
      clerk_id as "clerkId",
      avatar_url as "avatarUrl",
      telefono,
      direccion,
      ciudad,
      estado,
      codigo_postal as "codigoPostal",
      pais,
      empresa,
      cargo,
      departamento,
      es_platform_admin as "esPlatformAdmin",
      activo,
      ultimo_acceso as "ultimoAcceso",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM usuarios
    WHERE id = $1
  `;

  const usuarioResult = await query(usuarioSql, [usuarioId]);
  if (usuarioResult.rows.length === 0) {
    return null;
  }

  const usuario = usuarioResult.rows[0];

  // Obtener tenants del usuario
  const tenantsSql = `
    SELECT
      t.id,
      t.nombre,
      t.slug,
      ut.es_owner as "esOwner"
    FROM usuarios_tenants ut
    JOIN tenants t ON ut.tenant_id = t.id
    WHERE ut.usuario_id = $1 AND ut.activo = true AND t.activo = true
  `;

  const tenantsResult = await query(tenantsSql, [usuarioId]);

  // Obtener roles por cada tenant
  const tenants = await Promise.all(
    tenantsResult.rows.map(async (tenant: any) => {
      const rolesSql = `
        SELECT
          r.id,
          r.codigo,
          r.nombre,
          r.color
        FROM usuarios_roles ur
        JOIN roles r ON ur.rol_id = r.id
        WHERE ur.usuario_id = $1
          AND ur.tenant_id = $2
          AND ur.activo = true
      `;

      const rolesResult = await query(rolesSql, [usuarioId, tenant.id]);

      return {
        ...tenant,
        roles: rolesResult.rows,
      };
    })
  );

  // Obtener roles de plataforma (sin tenant)
  const platformRolesSql = `
    SELECT
      r.id,
      r.codigo,
      r.nombre,
      r.color
    FROM usuarios_roles ur
    JOIN roles r ON ur.rol_id = r.id
    WHERE ur.usuario_id = $1
      AND ur.tenant_id IS NULL
      AND ur.activo = true
  `;

  const platformRolesResult = await query(platformRolesSql, [usuarioId]);

  return {
    ...usuario,
    tenants,
    platformRoles: platformRolesResult.rows,
  } as UsuarioConRoles;
}

/**
 * Crear o actualizar usuario desde Clerk
 */
export async function syncUsuarioFromClerk(data: {
  clerkId: string;
  email: string;
  nombre?: string;
  apellido?: string;
  avatarUrl?: string;
}): Promise<Usuario> {
  // Buscar si existe por clerk_id o email
  let usuario = await getUsuarioByClerkId(data.clerkId);

  if (!usuario) {
    usuario = await getUsuarioByEmail(data.email);
  }

  if (usuario) {
    // Actualizar usuario existente
    const updateSql = `
      UPDATE usuarios SET
        clerk_id = $1,
        nombre = COALESCE($2, nombre),
        apellido = COALESCE($3, apellido),
        avatar_url = COALESCE($4, avatar_url),
        ultimo_acceso = NOW(),
        updated_at = NOW()
      WHERE id = $5
      RETURNING
        id,
        email,
        nombre,
        apellido,
        clerk_id as "clerkId",
        avatar_url as "avatarUrl",
        telefono,
        es_platform_admin as "esPlatformAdmin",
        activo,
        ultimo_acceso as "ultimoAcceso",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const result = await query(updateSql, [
      data.clerkId,
      data.nombre,
      data.apellido,
      data.avatarUrl,
      usuario.id,
    ]);

    return result.rows[0];
  } else {
    // Crear nuevo usuario
    const insertSql = `
      INSERT INTO usuarios (email, clerk_id, nombre, apellido, avatar_url, activo, ultimo_acceso)
      VALUES ($1, $2, $3, $4, $5, true, NOW())
      RETURNING
        id,
        email,
        nombre,
        apellido,
        clerk_id as "clerkId",
        avatar_url as "avatarUrl",
        telefono,
        es_platform_admin as "esPlatformAdmin",
        activo,
        ultimo_acceso as "ultimoAcceso",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const result = await query(insertSql, [
      data.email,
      data.clerkId,
      data.nombre,
      data.apellido,
      data.avatarUrl,
    ]);

    return result.rows[0];
  }
}

/**
 * Actualizar perfil del usuario (datos básicos y extendidos)
 */
export async function updateUsuarioPerfil(
  usuarioId: string,
  data: {
    nombre?: string;
    apellido?: string;
    telefono?: string;
    avatarUrl?: string;
    direccion?: string;
    ciudad?: string;
    estado?: string;
    codigoPostal?: string;
    pais?: string;
    empresa?: string;
    cargo?: string;
    departamento?: string;
  }
): Promise<Usuario> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.nombre !== undefined) {
    updates.push(`nombre = $${paramIndex++}`);
    values.push(data.nombre || null);
  }
  if (data.apellido !== undefined) {
    updates.push(`apellido = $${paramIndex++}`);
    values.push(data.apellido || null);
  }
  if (data.telefono !== undefined) {
    updates.push(`telefono = $${paramIndex++}`);
    values.push(data.telefono || null);
  }
  if (data.avatarUrl !== undefined) {
    updates.push(`avatar_url = $${paramIndex++}`);
    values.push(data.avatarUrl || null);
  }
  if (data.direccion !== undefined) {
    updates.push(`direccion = $${paramIndex++}`);
    values.push(data.direccion || null);
  }
  if (data.ciudad !== undefined) {
    updates.push(`ciudad = $${paramIndex++}`);
    values.push(data.ciudad || null);
  }
  if (data.estado !== undefined) {
    updates.push(`estado = $${paramIndex++}`);
    values.push(data.estado || null);
  }
  if (data.codigoPostal !== undefined) {
    updates.push(`codigo_postal = $${paramIndex++}`);
    values.push(data.codigoPostal || null);
  }
  if (data.pais !== undefined) {
    updates.push(`pais = $${paramIndex++}`);
    values.push(data.pais || null);
  }
  if (data.empresa !== undefined) {
    updates.push(`empresa = $${paramIndex++}`);
    values.push(data.empresa || null);
  }
  if (data.cargo !== undefined) {
    updates.push(`cargo = $${paramIndex++}`);
    values.push(data.cargo || null);
  }
  if (data.departamento !== undefined) {
    updates.push(`departamento = $${paramIndex++}`);
    values.push(data.departamento || null);
  }

  if (updates.length === 0) {
    // No hay nada que actualizar, devolver usuario actual
    const current = await query(
      `SELECT id, email, nombre, apellido, clerk_id as "clerkId", avatar_url as "avatarUrl",
       telefono, es_platform_admin as "esPlatformAdmin", activo,
       ultimo_acceso as "ultimoAcceso", created_at as "createdAt", updated_at as "updatedAt"
       FROM usuarios WHERE id = $1`,
      [usuarioId]
    );
    return current.rows[0];
  }

  updates.push(`updated_at = NOW()`);
  values.push(usuarioId);

  const sql = `
    UPDATE usuarios SET
      ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING
      id,
      email,
      nombre,
      apellido,
      clerk_id as "clerkId",
      avatar_url as "avatarUrl",
      telefono,
      es_platform_admin as "esPlatformAdmin",
      activo,
      ultimo_acceso as "ultimoAcceso",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `;

  const result = await query(sql, values);
  return result.rows[0];
}

/**
 * Obtener módulos accesibles para un usuario en un tenant
 */
export async function getModulosAccesibles(
  usuarioId: string,
  tenantId: string
): Promise<any[]> {
  const sql = `
    SELECT DISTINCT
      m.id,
      m.nombre,
      m.descripcion,
      m.icono,
      m.categoria,
      m.orden,
      rm.puede_ver as "puedeVer",
      rm.puede_crear as "puedeCrear",
      rm.puede_editar as "puedeEditar",
      rm.puede_eliminar as "puedeEliminar",
      rm.alcance_ver as "alcanceVer",
      rm.alcance_editar as "alcanceEditar"
    FROM usuarios_roles ur
    JOIN roles_modulos rm ON ur.rol_id = rm.rol_id
    JOIN modulos m ON rm.modulo_id = m.id
    WHERE ur.usuario_id = $1
      AND (ur.tenant_id = $2 OR ur.tenant_id IS NULL)
      AND ur.activo = true
      AND rm.puede_ver = true
      AND m.activo = true
    ORDER BY m.categoria, m.orden
  `;

  const result = await query(sql, [usuarioId, tenantId]);
  return result.rows;
}

/**
 * Verificar si usuario tiene permiso específico
 */
export async function tienePermiso(
  usuarioId: string,
  tenantId: string | null,
  moduloId: string,
  accion: 'ver' | 'crear' | 'editar' | 'eliminar'
): Promise<{ permitido: boolean; alcance: string }> {
  const columnaPermiso = `puede_${accion === 'ver' ? 'ver' : accion}`;
  const columnaAlcance = accion === 'ver' ? 'alcance_ver' : 'alcance_editar';

  const sql = `
    SELECT
      rm.${columnaPermiso} as permitido,
      rm.${columnaAlcance} as alcance
    FROM usuarios_roles ur
    JOIN roles_modulos rm ON ur.rol_id = rm.rol_id
    WHERE ur.usuario_id = $1
      AND (ur.tenant_id = $2 OR ur.tenant_id IS NULL)
      AND rm.modulo_id = $3
      AND ur.activo = true
      AND rm.${columnaPermiso} = true
    LIMIT 1
  `;

  const result = await query(sql, [usuarioId, tenantId, moduloId]);

  if (result.rows.length === 0) {
    return { permitido: false, alcance: 'none' };
  }

  return {
    permitido: result.rows[0].permitido,
    alcance: result.rows[0].alcance,
  };
}

/**
 * Obtener todos los usuarios de un tenant
 */
export interface UsuarioTenant {
  id: string;
  email: string;
  nombre: string | null;
  apellido: string | null;
  avatarUrl: string | null;
  telefono: string | null;
  esOwner: boolean;
  activo: boolean;
  roles: {
    id: string;
    codigo: string;
    nombre: string;
    color: string | null;
  }[];
  ultimoAcceso: Date | null;
  createdAt: Date;
  // Campos extendidos
  cedula?: string | null;
  fechaNacimiento?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  estado?: string | null;
  codigoPostal?: string | null;
  pais?: string | null;
  empresa?: string | null;
  cargo?: string | null;
  departamento?: string | null;
  notas?: string | null;
  datosExtra?: Record<string, any>;
  tiposUsuario?: string[];
  documentos?: UsuarioDocumento[];
}

export interface UsuarioDocumento {
  id: string;
  tenantId: string;
  usuarioId: string;
  nombre: string;
  tipo: 'cedula' | 'contrato' | 'certificado' | 'foto' | 'otro';
  descripcion?: string | null;
  nombreArchivo: string;
  rutaArchivo: string;
  tipoMime?: string | null;
  tamanioBytes?: number | null;
  metadata?: Record<string, any>;
  esPublico: boolean;
  subidoPorId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getUsuariosByTenant(tenantId: string): Promise<UsuarioTenant[]> {
  const sql = `
    SELECT
      u.id,
      u.email,
      u.nombre,
      u.apellido,
      u.avatar_url as "avatarUrl",
      u.telefono,
      u.cedula,
      u.fecha_nacimiento as "fechaNacimiento",
      u.direccion,
      u.ciudad,
      u.estado,
      u.codigo_postal as "codigoPostal",
      u.pais,
      u.empresa,
      u.cargo,
      u.departamento,
      u.notas,
      u.datos_extra as "datosExtra",
      u.tipos_usuario as "tiposUsuario",
      ut.es_owner as "esOwner",
      ut.activo,
      u.ultimo_acceso as "ultimoAcceso",
      ut.created_at as "createdAt"
    FROM usuarios_tenants ut
    JOIN usuarios u ON ut.usuario_id = u.id
    WHERE ut.tenant_id = $1
      AND ut.activo = true
      AND u.activo = true
    ORDER BY ut.created_at DESC
  `;

  const result = await query(sql, [tenantId]);
  const usuarios = result.rows;

  // Obtener roles para cada usuario
  const usuariosConRoles = await Promise.all(
    usuarios.map(async (usuario: any) => {
      const rolesSql = `
        SELECT
          r.id,
          r.codigo,
          r.nombre,
          r.color
        FROM usuarios_roles ur
        JOIN roles r ON ur.rol_id = r.id
        WHERE ur.usuario_id = $1
          AND ur.tenant_id = $2
          AND ur.activo = true
          AND r.tipo = 'tenant'
      `;

      const rolesResult = await query(rolesSql, [usuario.id, tenantId]);
      return {
        ...usuario,
        roles: rolesResult.rows,
        datosExtra: typeof usuario.datosExtra === 'string' ? JSON.parse(usuario.datosExtra) : (usuario.datosExtra || {}),
        tiposUsuario: typeof usuario.tiposUsuario === 'string' ? JSON.parse(usuario.tiposUsuario) : (usuario.tiposUsuario || []),
      };
    })
  );

  return usuariosConRoles;
}

/**
 * Obtener un usuario específico de un tenant
 */
export async function getUsuarioTenantById(
  tenantId: string,
  usuarioId: string
): Promise<UsuarioTenant | null> {
  const sql = `
    SELECT
      u.id,
      u.email,
      u.nombre,
      u.apellido,
      u.avatar_url as "avatarUrl",
      u.telefono,
      u.cedula,
      u.fecha_nacimiento as "fechaNacimiento",
      u.direccion,
      u.ciudad,
      u.estado,
      u.codigo_postal as "codigoPostal",
      u.pais,
      u.empresa,
      u.cargo,
      u.departamento,
      u.notas,
      u.datos_extra as "datosExtra",
      u.tipos_usuario as "tiposUsuario",
      ut.es_owner as "esOwner",
      ut.activo,
      u.ultimo_acceso as "ultimoAcceso",
      ut.created_at as "createdAt"
    FROM usuarios_tenants ut
    JOIN usuarios u ON ut.usuario_id = u.id
    WHERE ut.tenant_id = $1 AND ut.usuario_id = $2
  `;

  const result = await query(sql, [tenantId, usuarioId]);
  if (result.rows.length === 0) {
    return null;
  }

  const usuario = result.rows[0];

  // Obtener roles
  const rolesSql = `
    SELECT
      r.id,
      r.codigo,
      r.nombre,
      r.color
    FROM usuarios_roles ur
    JOIN roles r ON ur.rol_id = r.id
    WHERE ur.usuario_id = $1
      AND ur.tenant_id = $2
      AND ur.activo = true
      AND r.tipo = 'tenant'
  `;

  const rolesResult = await query(rolesSql, [usuarioId, tenantId]);
  
  // Obtener documentos
  const documentosSql = `
    SELECT
      id,
      tenant_id as "tenantId",
      usuario_id as "usuarioId",
      nombre,
      tipo,
      descripcion,
      nombre_archivo as "nombreArchivo",
      ruta_archivo as "rutaArchivo",
      tipo_mime as "tipoMime",
      tamanio_bytes as "tamanioBytes",
      metadata,
      es_publico as "esPublico",
      subido_por_id as "subidoPorId",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM usuarios_documentos
    WHERE tenant_id = $1 AND usuario_id = $2
    ORDER BY created_at DESC
  `;
  const documentosResult = await query(documentosSql, [tenantId, usuarioId]);
  
  return {
    ...usuario,
    roles: rolesResult.rows,
    datosExtra: typeof usuario.datosExtra === 'string' ? JSON.parse(usuario.datosExtra) : (usuario.datosExtra || {}),
    tiposUsuario: typeof usuario.tiposUsuario === 'string' ? JSON.parse(usuario.tiposUsuario) : (usuario.tiposUsuario || []),
    documentos: documentosResult.rows.map((doc: any) => ({
      ...doc,
      metadata: typeof doc.metadata === 'string' ? JSON.parse(doc.metadata) : (doc.metadata || {}),
    })),
  };
}

/**
 * Agregar usuario a un tenant
 */
export async function agregarUsuarioATenant(
  tenantId: string,
  data: {
    email: string;
    password?: string; // Contraseña temporal opcional - si se proporciona, el usuario puede loguearse inmediatamente
    nombre?: string;
    apellido?: string;
    telefono?: string;
    rolIds?: string[];
    esOwner?: boolean;
    cedula?: string;
    fechaNacimiento?: string;
    direccion?: string;
    ciudad?: string;
    estado?: string;
    codigoPostal?: string;
    pais?: string;
    empresa?: string;
    cargo?: string;
    departamento?: string;
    notas?: string;
    datosExtra?: Record<string, any>;
    tiposUsuario?: string[];
  }
): Promise<UsuarioTenant> {
  // Buscar o crear usuario por email
  let usuario = await getUsuarioByEmail(data.email);

  if (!usuario) {
    // Crear nuevo usuario CON Clerk ID (bidireccionalidad)
    let clerkId: string | null = null;

    try {
      console.log(`🔄 Creando usuario en Clerk: ${data.email}`);

      if (data.password && data.password.trim()) {
        // Si se proporciona contraseña, crear usuario con contraseña (puede loguearse inmediatamente)
        const clerkUser = await createClerkUser({
          email: data.email,
          password: data.password,
          firstName: data.nombre,
          lastName: data.apellido,
        });
        clerkId = clerkUser.id;
        console.log(`✅ Usuario creado en Clerk CON contraseña: ${data.email} (ID: ${clerkId})`);
      } else {
        // Sin contraseña - recibirá email para configurar
        const clerkUser = await createClerkUserWithoutPassword({
          email: data.email,
          firstName: data.nombre,
          lastName: data.apellido,
        });
        clerkId = clerkUser.id;
        console.log(`✅ Usuario creado en Clerk SIN contraseña: ${data.email} (ID: ${clerkId})`);
      }
    } catch (clerkError: any) {
      // Si falla Clerk, verificar si el usuario ya existe en Clerk
      console.error(`⚠️ Error creando usuario en Clerk: ${clerkError.message}`);
      // Continuamos sin clerk_id - el usuario podrá sincronizarse después
    }

    const insertSql = `
      INSERT INTO usuarios (
        email, nombre, apellido, telefono, clerk_id,
        cedula, fecha_nacimiento, direccion, ciudad, estado, codigo_postal, pais,
        empresa, cargo, departamento, notas, datos_extra, tipos_usuario,
        activo
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, true)
      RETURNING
        id,
        email,
        nombre,
        apellido,
        clerk_id as "clerkId",
        avatar_url as "avatarUrl",
        telefono,
        es_platform_admin as "esPlatformAdmin",
        activo,
        ultimo_acceso as "ultimoAcceso",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const result = await query(insertSql, [
      data.email,
      data.nombre || null,
      data.apellido || null,
      data.telefono || null,
      clerkId, // Ahora incluimos el clerk_id
      data.cedula || null,
      data.fechaNacimiento || null,
      data.direccion || null,
      data.ciudad || null,
      data.estado || null,
      data.codigoPostal || null,
      data.pais || null,
      data.empresa || null,
      data.cargo || null,
      data.departamento || null,
      data.notas || null,
      data.datosExtra ? JSON.stringify(data.datosExtra) : '{}',
      data.tiposUsuario ? JSON.stringify(data.tiposUsuario) : '[]',
    ]);
    usuario = result.rows[0];
  }

  if (!usuario) {
    throw new Error(`No se pudo crear o encontrar el usuario con email: ${data.email}`);
  }

  // Verificar si ya está en el tenant
  const checkSql = `
    SELECT * FROM usuarios_tenants
    WHERE usuario_id = $1 AND tenant_id = $2
  `;
  const checkResult = await query(checkSql, [usuario.id, tenantId]);

  if (checkResult.rows.length > 0) {
    // Actualizar relación existente
    const updateSql = `
      UPDATE usuarios_tenants SET
        es_owner = COALESCE($1, es_owner),
        activo = true,
        updated_at = NOW()
      WHERE usuario_id = $2 AND tenant_id = $3
    `;
    await query(updateSql, [data.esOwner || false, usuario.id, tenantId]);
  } else {
    // Crear nueva relación
    const insertSql = `
      INSERT INTO usuarios_tenants (usuario_id, tenant_id, es_owner, activo)
      VALUES ($1, $2, $3, true)
    `;
    await query(insertSql, [usuario.id, tenantId, data.esOwner || false]);
  }

  // Asignar roles si se proporcionan
  if (data.rolIds && data.rolIds.length > 0) {
    // Eliminar roles actuales del tenant
    await query(
      `DELETE FROM usuarios_roles WHERE usuario_id = $1 AND tenant_id = $2`,
      [usuario.id, tenantId]
    );

    // Insertar nuevos roles
    let tieneRolAsesor = false;
    for (const rolId of data.rolIds) {
      await query(
        `INSERT INTO usuarios_roles (usuario_id, tenant_id, rol_id, activo)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (usuario_id, tenant_id, rol_id) DO UPDATE SET activo = true`,
        [usuario.id, tenantId, rolId]
      );

      // Verificar si es rol de asesor
      const rolInfo = await query(`SELECT nombre FROM roles WHERE id = $1`, [rolId]);
      const rolNombre = rolInfo.rows[0]?.nombre?.toLowerCase() || '';
      if (rolNombre.includes('asesor')) {
        tieneRolAsesor = true;
      }
    }

    // Si tiene rol de asesor, crear perfil automáticamente
    if (tieneRolAsesor) {
      const perfilExiste = await query(
        `SELECT id FROM perfiles_asesor WHERE usuario_id = $1 AND tenant_id = $2`,
        [usuario.id, tenantId]
      );

      if (perfilExiste.rows.length === 0) {
        const nombre = data.nombre || usuario.nombre || 'asesor';
        const apellido = data.apellido || usuario.apellido || '';
        const slug = `${nombre.toLowerCase()}-${apellido.toLowerCase()}`
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
          .substring(0, 100);

        await query(
          `INSERT INTO perfiles_asesor (
            id, tenant_id, usuario_id, slug, titulo_profesional,
            whatsapp, activo, visible_en_web, destacado, orden, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, 'Asesor Inmobiliario', $5, true, true, false, 0, NOW(), NOW())`,
          [uuidv4(), tenantId, usuario.id, slug, data.telefono || null]
        );
        console.log(`✅ Perfil de asesor creado automáticamente para ${data.email} en tenant ${tenantId}`);
      } else {
        // Reactivar perfil existente
        await query(
          `UPDATE perfiles_asesor SET activo = true, visible_en_web = true, updated_at = NOW()
           WHERE usuario_id = $1 AND tenant_id = $2`,
          [usuario.id, tenantId]
        );
        console.log(`✅ Perfil de asesor reactivado para ${data.email} en tenant ${tenantId}`);
      }
    }
  }

  // Retornar usuario con roles
  const usuarioCompleto = await getUsuarioTenantById(tenantId, usuario.id);
  if (!usuarioCompleto) {
    throw new Error('Error al obtener usuario después de agregarlo');
  }
  return usuarioCompleto;
}

/**
 * Actualizar usuario en un tenant
 */
export async function actualizarUsuarioTenant(
  tenantId: string,
  usuarioId: string,
  data: {
    nombre?: string;
    apellido?: string;
    telefono?: string;
    rolIds?: string[];
    esOwner?: boolean;
    activo?: boolean;
    // Campos extendidos
    cedula?: string;
    fechaNacimiento?: string;
    direccion?: string;
    ciudad?: string;
    estado?: string;
    codigoPostal?: string;
    pais?: string;
    empresa?: string;
    cargo?: string;
    departamento?: string;
    notas?: string;
    datosExtra?: Record<string, any>;
    tiposUsuario?: string[];
  }
): Promise<UsuarioTenant> {
  // Actualizar datos del usuario (básicos y extendidos)
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.nombre !== undefined) {
    updates.push(`nombre = $${paramIndex++}`);
    values.push(data.nombre || null);
  }
  if (data.apellido !== undefined) {
    updates.push(`apellido = $${paramIndex++}`);
    values.push(data.apellido || null);
  }
  if (data.telefono !== undefined) {
    updates.push(`telefono = $${paramIndex++}`);
    values.push(data.telefono || null);
  }
  if (data.cedula !== undefined) {
    updates.push(`cedula = $${paramIndex++}`);
    values.push(data.cedula || null);
  }
  if (data.fechaNacimiento !== undefined) {
    updates.push(`fecha_nacimiento = $${paramIndex++}`);
    values.push(data.fechaNacimiento || null);
  }
  if (data.direccion !== undefined) {
    updates.push(`direccion = $${paramIndex++}`);
    values.push(data.direccion || null);
  }
  if (data.ciudad !== undefined) {
    updates.push(`ciudad = $${paramIndex++}`);
    values.push(data.ciudad || null);
  }
  if (data.estado !== undefined) {
    updates.push(`estado = $${paramIndex++}`);
    values.push(data.estado || null);
  }
  if (data.codigoPostal !== undefined) {
    updates.push(`codigo_postal = $${paramIndex++}`);
    values.push(data.codigoPostal || null);
  }
  if (data.pais !== undefined) {
    updates.push(`pais = $${paramIndex++}`);
    values.push(data.pais || null);
  }
  if (data.empresa !== undefined) {
    updates.push(`empresa = $${paramIndex++}`);
    values.push(data.empresa || null);
  }
  if (data.cargo !== undefined) {
    updates.push(`cargo = $${paramIndex++}`);
    values.push(data.cargo || null);
  }
  if (data.departamento !== undefined) {
    updates.push(`departamento = $${paramIndex++}`);
    values.push(data.departamento || null);
  }
  if (data.notas !== undefined) {
    updates.push(`notas = $${paramIndex++}`);
    values.push(data.notas || null);
  }
  if (data.datosExtra !== undefined) {
    updates.push(`datos_extra = $${paramIndex++}`);
    values.push(JSON.stringify(data.datosExtra));
  }
  if (data.tiposUsuario !== undefined) {
    updates.push(`tipos_usuario = $${paramIndex++}`);
    values.push(JSON.stringify(data.tiposUsuario));
  }

  if (updates.length > 0) {
    updates.push(`updated_at = NOW()`);
    values.push(usuarioId);
    const updateUsuarioSql = `
      UPDATE usuarios SET
        ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `;
    await query(updateUsuarioSql, values);
  }

  // Actualizar relación tenant-usuario
  if (data.esOwner !== undefined || data.activo !== undefined) {
    const updateRelacionSql = `
      UPDATE usuarios_tenants SET
        es_owner = COALESCE($1, es_owner),
        activo = COALESCE($2, activo),
        updated_at = NOW()
      WHERE usuario_id = $3 AND tenant_id = $4
    `;
    await query(updateRelacionSql, [
      data.esOwner,
      data.activo,
      usuarioId,
      tenantId,
    ]);
  }

  // Actualizar roles si se proporcionan
  if (data.rolIds !== undefined) {
    // Verificar si tenía rol de asesor antes
    const rolesAnteriores = await query(
      `SELECT r.nombre FROM usuarios_roles ur
       JOIN roles r ON ur.rol_id = r.id
       WHERE ur.usuario_id = $1 AND ur.tenant_id = $2 AND ur.activo = true`,
      [usuarioId, tenantId]
    );
    const teniaRolAsesor = rolesAnteriores.rows.some(
      (r: any) => r.nombre?.toLowerCase().includes('asesor')
    );

    // Eliminar roles actuales del tenant
    await query(
      `DELETE FROM usuarios_roles WHERE usuario_id = $1 AND tenant_id = $2`,
      [usuarioId, tenantId]
    );

    // Insertar nuevos roles y verificar si tiene rol de asesor
    let tieneRolAsesor = false;
    if (data.rolIds.length > 0) {
      for (const rolId of data.rolIds) {
        await query(
          `INSERT INTO usuarios_roles (usuario_id, tenant_id, rol_id, activo)
           VALUES ($1, $2, $3, true)
           ON CONFLICT (usuario_id, tenant_id, rol_id) DO UPDATE SET activo = true`,
          [usuarioId, tenantId, rolId]
        );

        // Verificar si es rol de asesor
        const rolInfo = await query(`SELECT nombre FROM roles WHERE id = $1`, [rolId]);
        const rolNombre = rolInfo.rows[0]?.nombre?.toLowerCase() || '';
        if (rolNombre.includes('asesor')) {
          tieneRolAsesor = true;
        }
      }
    }

    // Manejar perfil de asesor según cambios de rol
    if (tieneRolAsesor && !teniaRolAsesor) {
      // Se agregó rol de asesor - crear o reactivar perfil
      const perfilExiste = await query(
        `SELECT id FROM perfiles_asesor WHERE usuario_id = $1 AND tenant_id = $2`,
        [usuarioId, tenantId]
      );

      if (perfilExiste.rows.length === 0) {
        // Obtener datos del usuario
        const userData = await query(
          `SELECT nombre, apellido, telefono FROM usuarios WHERE id = $1`,
          [usuarioId]
        );
        const user = userData.rows[0];
        const nombre = data.nombre || user?.nombre || 'asesor';
        const apellido = data.apellido || user?.apellido || '';
        const slug = `${nombre.toLowerCase()}-${apellido.toLowerCase()}`
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
          .substring(0, 100);

        await query(
          `INSERT INTO perfiles_asesor (
            id, tenant_id, usuario_id, slug, titulo_profesional,
            whatsapp, activo, visible_en_web, destacado, orden, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, 'Asesor Inmobiliario', $5, true, true, false, 0, NOW(), NOW())`,
          [uuidv4(), tenantId, usuarioId, slug, data.telefono || user?.telefono || null]
        );
        console.log(`✅ Perfil de asesor creado para usuario ${usuarioId} en tenant ${tenantId}`);
      } else {
        await query(
          `UPDATE perfiles_asesor SET activo = true, visible_en_web = true, updated_at = NOW()
           WHERE usuario_id = $1 AND tenant_id = $2`,
          [usuarioId, tenantId]
        );
        console.log(`✅ Perfil de asesor reactivado para usuario ${usuarioId} en tenant ${tenantId}`);
      }
    } else if (!tieneRolAsesor && teniaRolAsesor) {
      // Se quitó rol de asesor - desactivar perfil
      await query(
        `UPDATE perfiles_asesor SET activo = false, visible_en_web = false, updated_at = NOW()
         WHERE usuario_id = $1 AND tenant_id = $2`,
        [usuarioId, tenantId]
      );
      console.log(`⚠️ Perfil de asesor desactivado para usuario ${usuarioId} en tenant ${tenantId}`);
    }
  }

  // Retornar usuario actualizado
  const usuarioCompleto = await getUsuarioTenantById(tenantId, usuarioId);
  if (!usuarioCompleto) {
    throw new Error('Error al obtener usuario después de actualizarlo');
  }
  return usuarioCompleto;
}

/**
 * Desactivar usuario de un tenant (soft delete)
 * - Marca como inactivo en usuarios_tenants
 * - Desactiva perfil de asesor
 * - Si no tiene otros tenants activos, desactiva en Clerk (ban) y en usuarios
 * - Reasigna propiedades y contactos al usuario especificado o al owner del tenant
 *
 * NO elimina nada - mantiene trazabilidad de ventas, pagos, etc.
 */
export async function eliminarUsuarioDeTenant(
  tenantId: string,
  usuarioId: string,
  reasignarA?: string // ID del usuario al que reasignar propiedades/contactos (opcional)
): Promise<boolean> {
  // Obtener información del usuario
  const usuarioResult = await query(
    `SELECT clerk_id, email FROM usuarios WHERE id = $1`,
    [usuarioId]
  );
  const usuario = usuarioResult.rows[0];

  if (!usuario) {
    throw new Error('Usuario no encontrado');
  }

  console.log(`🔄 Desactivando usuario ${usuario.email} del tenant ${tenantId}...`);

  // 1. Marcar como inactivo en usuarios_tenants (soft delete)
  const updateResult = await query(
    `UPDATE usuarios_tenants
     SET activo = false, updated_at = NOW()
     WHERE usuario_id = $1 AND tenant_id = $2`,
    [usuarioId, tenantId]
  );

  // 2. Desactivar perfil de asesor si existe
  await query(
    `UPDATE perfiles_asesor
     SET activo = false, visible_en_web = false, updated_at = NOW()
     WHERE usuario_id = $1 AND tenant_id = $2`,
    [usuarioId, tenantId]
  );

  // 3. Determinar usuario para reasignación (el especificado o el owner del tenant)
  let usuarioReasignacion = reasignarA;
  if (!usuarioReasignacion) {
    // Buscar el owner del tenant o el primer admin activo
    const ownerResult = await query(
      `SELECT ut.usuario_id
       FROM usuarios_tenants ut
       WHERE ut.tenant_id = $1
         AND ut.activo = true
         AND ut.es_owner = true
         AND ut.usuario_id != $2
       LIMIT 1`,
      [tenantId, usuarioId]
    );

    if (ownerResult.rows.length > 0) {
      usuarioReasignacion = ownerResult.rows[0].usuario_id;
    }
  }

  // 4. Reasignar propiedades asignadas al usuario
  if (usuarioReasignacion) {
    // Reasignar propiedades donde el usuario es asesor asignado
    const propiedadesActualizadas = await query(
      `UPDATE propiedades
       SET asesor_asignado_id = $1, updated_at = NOW()
       WHERE tenant_id = $2 AND asesor_asignado_id = $3
       RETURNING id`,
      [usuarioReasignacion, tenantId, usuarioId]
    );

    if (propiedadesActualizadas.rows.length > 0) {
      console.log(`   ✅ ${propiedadesActualizadas.rows.length} propiedades reasignadas`);
    }

    // Reasignar contactos/leads asignados al usuario
    const contactosActualizados = await query(
      `UPDATE contactos
       SET asesor_asignado_id = $1, updated_at = NOW()
       WHERE tenant_id = $2 AND asesor_asignado_id = $3
       RETURNING id`,
      [usuarioReasignacion, tenantId, usuarioId]
    );

    if (contactosActualizados.rows.length > 0) {
      console.log(`   ✅ ${contactosActualizados.rows.length} contactos reasignados`);
    }
  } else {
    console.log(`   ⚠️ No se encontró usuario para reasignación, propiedades y contactos quedan sin asesor asignado`);

    // Quitar asignación (null) en lugar de dejar huérfanos
    await query(
      `UPDATE propiedades
       SET asesor_asignado_id = NULL, updated_at = NOW()
       WHERE tenant_id = $1 AND asesor_asignado_id = $2`,
      [tenantId, usuarioId]
    );

    await query(
      `UPDATE contactos
       SET asesor_asignado_id = NULL, updated_at = NOW()
       WHERE tenant_id = $1 AND asesor_asignado_id = $2`,
      [tenantId, usuarioId]
    );
  }

  // 5. Verificar si el usuario tiene otros tenants ACTIVOS
  const otrosTenants = await query(
    `SELECT COUNT(*) as count
     FROM usuarios_tenants
     WHERE usuario_id = $1 AND activo = true`,
    [usuarioId]
  );
  const tieneOtrosTenants = parseInt(otrosTenants.rows[0].count) > 0;

  // 6. Si no tiene otros tenants activos, desactivar en Clerk y en usuarios
  if (!tieneOtrosTenants) {
    console.log(`   🔒 Usuario ${usuario.email} no tiene otros tenants activos, desactivando completamente...`);

    // Desactivar (ban) en Clerk si tiene clerk_id
    if (usuario.clerk_id) {
      try {
        await deactivateClerkUser(usuario.clerk_id);
        console.log(`   ✅ Usuario baneado en Clerk: ${usuario.email}`);
      } catch (clerkError: any) {
        console.error(`   ⚠️ Error desactivando en Clerk: ${clerkError.message}`);
      }
    }

    // Marcar como inactivo en la tabla usuarios
    await query(
      `UPDATE usuarios SET activo = false, updated_at = NOW() WHERE id = $1`,
      [usuarioId]
    );

    console.log(`   ✅ Usuario marcado como inactivo en BD: ${usuario.email}`);
  } else {
    console.log(`   ℹ️ Usuario ${usuario.email} tiene otros tenants activos, solo se desactivó de este tenant`);
  }

  console.log(`✅ Usuario ${usuario.email} desactivado correctamente del tenant`);

  return (updateResult.rowCount ?? 0) > 0;
}

/**
 * Reactivar usuario en un tenant
 */
export async function reactivarUsuarioEnTenant(
  tenantId: string,
  usuarioId: string
): Promise<boolean> {
  // Obtener información del usuario
  const usuarioResult = await query(
    `SELECT clerk_id, email, activo FROM usuarios WHERE id = $1`,
    [usuarioId]
  );
  const usuario = usuarioResult.rows[0];

  if (!usuario) {
    throw new Error('Usuario no encontrado');
  }

  console.log(`🔄 Reactivando usuario ${usuario.email} en tenant ${tenantId}...`);

  // 1. Reactivar en usuarios_tenants
  const updateResult = await query(
    `UPDATE usuarios_tenants
     SET activo = true, updated_at = NOW()
     WHERE usuario_id = $1 AND tenant_id = $2`,
    [usuarioId, tenantId]
  );

  // 2. Reactivar usuario global si estaba inactivo
  if (!usuario.activo) {
    await query(
      `UPDATE usuarios SET activo = true, updated_at = NOW() WHERE id = $1`,
      [usuarioId]
    );

    // Reactivar en Clerk (quitar ban) si tiene clerk_id
    if (usuario.clerk_id) {
      try {
        await reactivateClerkUser(usuario.clerk_id);
        console.log(`   ✅ Usuario desbaneado en Clerk: ${usuario.email}`);
      } catch (clerkError: any) {
        console.error(`   ⚠️ Error reactivando en Clerk: ${clerkError.message}`);
      }
    }
  }

  console.log(`✅ Usuario ${usuario.email} reactivado en tenant`);

  return (updateResult.rowCount ?? 0) > 0;
}

/**
 * Obtener roles disponibles para un tenant
 */
export async function getRolesByTenant(tenantId: string): Promise<any[]> {
  // Obtener roles disponibles para un tenant específico:
  // 1. Roles de sistema para tenants (tipo = 'tenant', tenant_id = NULL) - creados por la plataforma, disponibles para todos
  // 2. Roles privados del tenant (tipo = 'tenant', tenant_id = <tenant_id>) - creados por este tenant, solo para él
  // NO incluir roles privados de otros tenants
  // Filtrar por visibilidad y features requeridos
  
  console.log(`📋 [getRolesByTenant] Buscando roles para Tenant ID: ${tenantId}`);
  
  // Validar que tenantId sea un UUID válido
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(tenantId)) {
    console.error(`❌ [getRolesByTenant] Tenant ID no es un UUID válido: ${tenantId}`);
    throw new Error(`Tenant ID inválido: ${tenantId}`);
  }
  
  try {
    // Obtener features del tenant
    const { getTenantFeatures } = await import('./tenantFeaturesService.js');
    const tenantFeatures = await getTenantFeatures(tenantId);
    console.log(`   🔍 Features del tenant: ${tenantFeatures.join(', ') || 'ninguno'}`);
    
    // Construir la consulta SQL con filtros de visibilidad y features
    let sql: string;
    let params: any[] = [tenantId];
    
    if (tenantFeatures.length > 0) {
      // Si el tenant tiene features, filtrar roles que no requieren feature o que requieren uno de los features del tenant
      sql = `
        SELECT
          id,
          codigo,
          nombre,
          descripcion,
          color,
          activo,
          tenant_id as "tenantId",
          es_protegido as "esProtegido",
          tipo,
          visible,
          feature_requerido as "featureRequerido"
        FROM roles
        WHERE activo = true
          AND tipo = 'tenant'
          AND (
            -- Roles de sistema para tenants (creados por la plataforma, disponibles para todos)
            tenant_id IS NULL
            OR
            -- Roles privados del tenant específico (creados por este tenant)
            tenant_id = $1::uuid
          )
          AND (
            -- Solo mostrar roles visibles
            visible = true
          )
          AND (
            -- Si no requiere feature, siempre visible
            feature_requerido IS NULL
            OR
            -- Si requiere feature, verificar que el tenant lo tenga
            feature_requerido = ANY($2::text[])
          )
        ORDER BY 
          CASE WHEN tenant_id IS NULL THEN 0 ELSE 1 END,
          nombre ASC
      `;
      params.push(tenantFeatures);
    } else {
      // Si el tenant no tiene features, solo mostrar roles que no requieren feature
      sql = `
        SELECT
          id,
          codigo,
          nombre,
          descripcion,
          color,
          activo,
          tenant_id as "tenantId",
          es_protegido as "esProtegido",
          tipo,
          visible,
          feature_requerido as "featureRequerido"
        FROM roles
        WHERE activo = true
          AND tipo = 'tenant'
          AND (
            -- Roles de sistema para tenants (creados por la plataforma, disponibles para todos)
            tenant_id IS NULL
            OR
            -- Roles privados del tenant específico (creados por este tenant)
            tenant_id = $1::uuid
          )
          AND (
            -- Solo mostrar roles visibles
            visible = true
          )
          AND (
            -- Solo roles que no requieren feature
            feature_requerido IS NULL
          )
        ORDER BY 
          CASE WHEN tenant_id IS NULL THEN 0 ELSE 1 END,
          nombre ASC
      `;
    }

    const result = await query(sql, params);
    
    console.log(`   ✅ Total roles encontrados para tenant ${tenantId}: ${result.rows.length}`);
    if (result.rows.length > 0) {
      result.rows.forEach((rol: any, idx: number) => {
        const tipoRol = rol.tenantId ? 'privado del tenant' : 'sistema para tenants';
        const featureInfo = rol.featureRequerido ? ` (requiere: ${rol.featureRequerido})` : '';
        console.log(`   [${idx + 1}] ${rol.nombre || 'Sin nombre'} (${rol.codigo || 'Sin código'}) - ${tipoRol}${featureInfo}`);
      });
    }
    
    return result.rows;
  } catch (error: any) {
    console.error(`❌ [getRolesByTenant] Error al obtener roles para tenant ${tenantId}:`, error);
    console.error(`   Stack trace:`, error.stack);
    throw new Error(`Error al obtener roles: ${error.message}`);
  }
}

/**
 * Crear un nuevo rol para un tenant
 */
export async function createRolTenant(tenantId: string, rolData: {
  nombre: string;
  codigo: string;
  descripcion?: string;
  color?: string;
  visible?: boolean;
  featureRequerido?: string | null;
}): Promise<any> {
  // Verificar que el código no exista para este tenant específico
  // El código debe ser único por tenant (no globalmente)
  const checkSql = `
    SELECT id FROM roles 
    WHERE codigo = $1 AND (tenant_id = $2 OR tenant_id IS NULL)
  `;
  const checkResult = await query(checkSql, [rolData.codigo, tenantId]);
  
  if (checkResult.rows.length > 0) {
    throw new Error('Ya existe un rol con este código en este tenant o en el sistema');
  }

  const visible = rolData.visible !== undefined ? rolData.visible : true;
  const featureRequerido = rolData.featureRequerido || null;

  const sql = `
    INSERT INTO roles (nombre, codigo, descripcion, tipo, color, activo, tenant_id, es_protegido, visible, feature_requerido)
    VALUES ($1, $2, $3, 'tenant', $4, true, $5, false, $6, $7)
    RETURNING id, codigo, nombre, descripcion, color, activo, tenant_id as "tenantId", es_protegido as "esProtegido", visible, feature_requerido as "featureRequerido"
  `;

  const result = await query(sql, [
    rolData.nombre,
    rolData.codigo,
    rolData.descripcion || null,
    rolData.color || null,
    tenantId, // Asociar el rol al tenant específico
    visible,
    featureRequerido,
  ]);

  return result.rows[0];
}

/**
 * Actualizar un rol del tenant
 */
export async function updateRolTenant(tenantId: string, rolId: string, rolData: {
  nombre?: string;
  descripcion?: string;
  color?: string;
  activo?: boolean;
  visible?: boolean;
  featureRequerido?: string | null;
}): Promise<any> {
  // Verificar que el rol existe y pertenece a este tenant específico
  // No permitir actualizar roles del sistema (tenant_id IS NULL) ni roles de otros tenants
  const checkSql = `
    SELECT id, es_protegido, tenant_id 
    FROM roles 
    WHERE id = $1 AND tipo = 'tenant' AND tenant_id = $2
  `;
  const checkResult = await query(checkSql, [rolId, tenantId]);
  
  if (checkResult.rows.length === 0) {
    throw new Error('Rol no encontrado o no pertenece a este tenant');
  }

  const rol = checkResult.rows[0];
  
  // No permitir modificar roles protegidos del sistema
  if (rol.es_protegido) {
    throw new Error('No se puede modificar un rol protegido del sistema');
  }

  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (rolData.nombre !== undefined) {
    updates.push(`nombre = $${paramIndex++}`);
    values.push(rolData.nombre);
  }
  if (rolData.descripcion !== undefined) {
    updates.push(`descripcion = $${paramIndex++}`);
    values.push(rolData.descripcion || null);
  }
  if (rolData.color !== undefined) {
    updates.push(`color = $${paramIndex++}`);
    values.push(rolData.color || null);
  }
  if (rolData.activo !== undefined) {
    updates.push(`activo = $${paramIndex++}`);
    values.push(rolData.activo);
  }
  if (rolData.visible !== undefined) {
    updates.push(`visible = $${paramIndex++}`);
    values.push(rolData.visible);
  }
  if (rolData.featureRequerido !== undefined) {
    updates.push(`feature_requerido = $${paramIndex++}`);
    values.push(rolData.featureRequerido || null);
  }

  if (updates.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  updates.push(`updated_at = NOW()`);
  values.push(rolId);

  const sql = `
    UPDATE roles
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
    RETURNING id, codigo, nombre, descripcion, color, activo, tenant_id as "tenantId", es_protegido as "esProtegido", visible, feature_requerido as "featureRequerido"
  `;

  values.push(tenantId); // Agregar tenant_id para asegurar que solo se actualice el rol del tenant correcto
  const result = await query(sql, values);
  
  if (result.rows.length === 0) {
    throw new Error('Rol no encontrado o no pertenece a este tenant');
  }
  
  return result.rows[0];
}

/**
 * Obtener el conteo de usuarios con un rol específico en un tenant
 */
export async function getUsuariosCountByRol(tenantId: string, rolId: string): Promise<number> {
  const sql = `
    SELECT COUNT(*)::int as count
    FROM usuarios_roles ur
    WHERE ur.rol_id = $1 AND ur.tenant_id = $2 AND ur.activo = true
  `;
  const result = await query(sql, [rolId, tenantId]);
  return result.rows[0]?.count || 0;
}

/**
 * Eliminar un rol del tenant
 * Ahora permite eliminar roles aunque tengan usuarios asignados
 */
export async function deleteRolTenant(tenantId: string, rolId: string): Promise<boolean> {
  console.log(`🗑️ [deleteRolTenant] Intentando eliminar rol ${rolId} del tenant ${tenantId}`);
  
  // Verificar que el rol existe y pertenece a este tenant específico
  const checkSql = `
    SELECT id, codigo, es_protegido, tenant_id, nombre
    FROM roles 
    WHERE id = $1 AND tipo = 'tenant' AND tenant_id = $2
  `;
  const checkResult = await query(checkSql, [rolId, tenantId]);
  
  if (checkResult.rows.length === 0) {
    console.log(`❌ [deleteRolTenant] Rol ${rolId} no encontrado o no pertenece al tenant ${tenantId}`);
    throw new Error('Rol no encontrado o no pertenece a este tenant');
  }

  const rol = checkResult.rows[0];
  console.log(`✅ [deleteRolTenant] Rol encontrado: ${rol.nombre} (${rol.codigo})`);
  
  // No permitir eliminar roles protegidos o del sistema
  if (rol.es_protegido || rol.tenant_id === null) {
    console.log(`❌ [deleteRolTenant] Rol protegido o del sistema, no se puede eliminar`);
    throw new Error('No se puede eliminar un rol protegido del sistema');
  }

  // Obtener conteo de usuarios (solo para logging, no bloqueamos)
  const count = await getUsuariosCountByRol(tenantId, rolId);
  console.log(`🔍 [deleteRolTenant] Usuarios con este rol: ${count}`);
  
  if (count > 0) {
    console.log(`⚠️ [deleteRolTenant] Advertencia: ${count} usuario(s) tienen este rol asignado. Se eliminará de todos los usuarios.`);
  }

  // Eliminar el rol (esto también eliminará las relaciones en usuarios_roles por cascada si está configurado)
  // Si no hay cascada, primero eliminamos las relaciones
  const deleteUsuariosRolesSql = `
    DELETE FROM usuarios_roles
    WHERE rol_id = $1 AND tenant_id = $2
  `;
  await query(deleteUsuariosRolesSql, [rolId, tenantId]);
  console.log(`✅ [deleteRolTenant] Relaciones de usuarios eliminadas`);

  // Eliminar el rol
  const sql = `DELETE FROM roles WHERE id = $1`;
  await query(sql, [rolId]);
  console.log(`✅ [deleteRolTenant] Rol eliminado correctamente`);

  return true;
}

/**
 * Obtener un rol específico del tenant
 */
export async function getRolTenantById(tenantId: string, rolId: string): Promise<any | null> {
  const sql = `
    SELECT
      id,
      codigo,
      nombre,
      descripcion,
      color,
      activo,
      tenant_id as "tenantId",
      es_protegido as "esProtegido"
    FROM roles
    WHERE id = $1 
      AND tipo = 'tenant'
      AND (
        -- Rol del sistema (disponible para todos los tenants)
        (tenant_id IS NULL)
        OR
        -- Rol personalizado del tenant específico
        tenant_id = $2
      )
  `;

  const result = await query(sql, [rolId, tenantId]);
  return result.rows[0] || null;
}

// ==================== FUNCIONES DE DOCUMENTOS ====================

/**
 * Obtener documentos de un usuario
 */
export async function getDocumentosUsuario(
  tenantId: string,
  usuarioId: string
): Promise<UsuarioDocumento[]> {
  const sql = `
    SELECT
      id,
      tenant_id as "tenantId",
      usuario_id as "usuarioId",
      nombre,
      tipo,
      descripcion,
      nombre_archivo as "nombreArchivo",
      ruta_archivo as "rutaArchivo",
      tipo_mime as "tipoMime",
      tamanio_bytes as "tamanioBytes",
      metadata,
      es_publico as "esPublico",
      subido_por_id as "subidoPorId",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM usuarios_documentos
    WHERE tenant_id = $1 AND usuario_id = $2
    ORDER BY created_at DESC
  `;

  const result = await query(sql, [tenantId, usuarioId]);
  return result.rows.map((doc: any) => ({
    ...doc,
    metadata: typeof doc.metadata === 'string' ? JSON.parse(doc.metadata) : (doc.metadata || {}),
  }));
}

/**
 * Crear documento para un usuario
 */
export async function crearDocumentoUsuario(
  tenantId: string,
  usuarioId: string,
  data: {
    nombre: string;
    tipo: 'cedula' | 'contrato' | 'certificado' | 'foto' | 'otro';
    descripcion?: string;
    nombreArchivo: string;
    rutaArchivo: string;
    tipoMime?: string;
    tamanioBytes?: number;
    metadata?: Record<string, any>;
    esPublico?: boolean;
    subidoPorId?: string;
  }
): Promise<UsuarioDocumento> {
  const sql = `
    INSERT INTO usuarios_documentos (
      tenant_id, usuario_id, nombre, tipo, descripcion,
      nombre_archivo, ruta_archivo, tipo_mime, tamanio_bytes,
      metadata, es_publico, subido_por_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING
      id,
      tenant_id as "tenantId",
      usuario_id as "usuarioId",
      nombre,
      tipo,
      descripcion,
      nombre_archivo as "nombreArchivo",
      ruta_archivo as "rutaArchivo",
      tipo_mime as "tipoMime",
      tamanio_bytes as "tamanioBytes",
      metadata,
      es_publico as "esPublico",
      subido_por_id as "subidoPorId",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `;

  const result = await query(sql, [
    tenantId,
    usuarioId,
    data.nombre,
    data.tipo,
    data.descripcion || null,
    data.nombreArchivo,
    data.rutaArchivo,
    data.tipoMime || null,
    data.tamanioBytes || null,
    data.metadata ? JSON.stringify(data.metadata) : '{}',
    data.esPublico || false,
    data.subidoPorId || null,
  ]);

  const doc = result.rows[0];
  return {
    ...doc,
    metadata: typeof doc.metadata === 'string' ? JSON.parse(doc.metadata) : (doc.metadata || {}),
  };
}

/**
 * Eliminar documento de un usuario
 */
export async function eliminarDocumentoUsuario(
  tenantId: string,
  documentoId: string
): Promise<boolean> {
  const sql = `
    DELETE FROM usuarios_documentos
    WHERE id = $1 AND tenant_id = $2
  `;

  const result = await query(sql, [documentoId, tenantId]);
  return (result.rowCount ?? 0) > 0;
}

// ==================== FUNCIONES DE PERFIL ASESOR ====================

/**
 * Obtener perfil de asesor por usuario y tenant
 */
export async function getPerfilAsesor(
  usuarioId: string,
  tenantId: string
): Promise<any | null> {
  const sql = `
    SELECT
      id,
      tenant_id as "tenantId",
      usuario_id as "usuarioId",
      slug,
      titulo_profesional as "tituloProfesional",
      biografia,
      foto_url as "fotoUrl",
      video_presentacion_url as "videoPresentacionUrl",
      especialidades,
      idiomas,
      zonas,
      tipos_propiedad as "tiposPropiedad",
      experiencia_anos as "experienciaAnos",
      rango,
      fecha_inicio as "fechaInicio",
      equipo_id as "equipoId",
      split_comision as "splitComision",
      meta_mensual as "metaMensual",
      stats,
      redes_sociales as "redesSociales",
      whatsapp,
      telefono_directo as "telefonoDirecto",
      certificaciones,
      logros,
      activo,
      destacado,
      visible_en_web as "visibleEnWeb",
      orden,
      traducciones,
      metadata,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM perfiles_asesor
    WHERE usuario_id = $1 AND tenant_id = $2
  `;

  const result = await query(sql, [usuarioId, tenantId]);
  if (result.rows.length === 0) {
    return null;
  }

  const perfil = result.rows[0];
  return {
    ...perfil,
    especialidades: typeof perfil.especialidades === 'string' ? JSON.parse(perfil.especialidades) : (perfil.especialidades || []),
    idiomas: typeof perfil.idiomas === 'string' ? JSON.parse(perfil.idiomas) : (perfil.idiomas || ['es']),
    zonas: typeof perfil.zonas === 'string' ? JSON.parse(perfil.zonas) : (perfil.zonas || []),
    tiposPropiedad: typeof perfil.tiposPropiedad === 'string' ? JSON.parse(perfil.tiposPropiedad) : (perfil.tiposPropiedad || []),
    stats: typeof perfil.stats === 'string' ? JSON.parse(perfil.stats) : (perfil.stats || {}),
    redesSociales: typeof perfil.redesSociales === 'string' ? JSON.parse(perfil.redesSociales) : (perfil.redesSociales || {}),
    certificaciones: typeof perfil.certificaciones === 'string' ? JSON.parse(perfil.certificaciones) : (perfil.certificaciones || []),
    logros: typeof perfil.logros === 'string' ? JSON.parse(perfil.logros) : (perfil.logros || []),
    traducciones: typeof perfil.traducciones === 'string' ? JSON.parse(perfil.traducciones) : (perfil.traducciones || {}),
    metadata: typeof perfil.metadata === 'string' ? JSON.parse(perfil.metadata) : (perfil.metadata || {}),
  };
}

/**
 * Actualizar o crear perfil de asesor
 */
export async function upsertPerfilAsesor(
  usuarioId: string,
  tenantId: string,
  data: {
    biografia?: string;
    especialidades?: string | string[];
    idiomas?: string | string[];
    zonas?: string | string[];
    tiposPropiedad?: string | string[];
    experienciaAnos?: number | string;
    licencia?: string;
    redesSociales?: Record<string, string>;
    tituloProfesional?: string;
    whatsapp?: string;
    telefonoDirecto?: string;
  }
): Promise<any> {
  // Verificar si ya existe el perfil
  const existingPerfil = await getPerfilAsesor(usuarioId, tenantId);

  // Helper para convertir string o array a array
  const toArray = (value: string | string[] | undefined): string[] => {
    if (!value) return [];
    if (typeof value === 'string') {
      // Si viene como string separado por comas
      return value.split(',').map(e => e.trim()).filter(Boolean);
    }
    return Array.isArray(value) ? value : [];
  };

  // Preparar campos como arrays
  const especialidadesArray = toArray(data.especialidades);
  const idiomasArray = toArray(data.idiomas);
  const zonasArray = toArray(data.zonas);
  const tiposPropiedadArray = toArray(data.tiposPropiedad);

  // Convertir años de experiencia a número
  const experienciaAnos = data.experienciaAnos
    ? parseInt(String(data.experienciaAnos).replace(/\D/g, ''), 10) || 0
    : 0;

  if (existingPerfil) {
    // Actualizar perfil existente
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.biografia !== undefined) {
      updates.push(`biografia = $${paramIndex++}`);
      values.push(data.biografia || null);
    }
    if (data.especialidades !== undefined) {
      updates.push(`especialidades = $${paramIndex++}`);
      values.push(JSON.stringify(especialidadesArray));
    }
    if (data.idiomas !== undefined) {
      updates.push(`idiomas = $${paramIndex++}`);
      values.push(JSON.stringify(idiomasArray));
    }
    if (data.zonas !== undefined) {
      updates.push(`zonas = $${paramIndex++}`);
      values.push(JSON.stringify(zonasArray));
    }
    if (data.tiposPropiedad !== undefined) {
      updates.push(`tipos_propiedad = $${paramIndex++}`);
      values.push(JSON.stringify(tiposPropiedadArray));
    }
    if (data.experienciaAnos !== undefined) {
      updates.push(`experiencia_anos = $${paramIndex++}`);
      values.push(experienciaAnos);
    }
    if (data.redesSociales !== undefined) {
      // Merge con redes sociales existentes
      const mergedRedes = {
        ...existingPerfil.redesSociales,
        ...data.redesSociales,
      };
      updates.push(`redes_sociales = $${paramIndex++}`);
      values.push(JSON.stringify(mergedRedes));
    }
    if (data.tituloProfesional !== undefined) {
      updates.push(`titulo_profesional = $${paramIndex++}`);
      values.push(data.tituloProfesional || null);
    }
    if (data.whatsapp !== undefined) {
      updates.push(`whatsapp = $${paramIndex++}`);
      values.push(data.whatsapp || null);
    }
    if (data.telefonoDirecto !== undefined) {
      updates.push(`telefono_directo = $${paramIndex++}`);
      values.push(data.telefonoDirecto || null);
    }
    // Guardar licencia en metadata
    if (data.licencia !== undefined) {
      const newMetadata = {
        ...existingPerfil.metadata,
        licencia: data.licencia,
      };
      updates.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(newMetadata));
    }

    if (updates.length === 0) {
      return existingPerfil;
    }

    updates.push(`updated_at = NOW()`);
    values.push(usuarioId);
    values.push(tenantId);

    const sql = `
      UPDATE perfiles_asesor SET
        ${updates.join(', ')}
      WHERE usuario_id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
      RETURNING id
    `;

    await query(sql, values);
    return await getPerfilAsesor(usuarioId, tenantId);
  } else {
    // Crear nuevo perfil de asesor
    // Generar slug basado en el usuario
    const usuarioResult = await query(
      `SELECT nombre, apellido, email FROM usuarios WHERE id = $1`,
      [usuarioId]
    );
    const usuario = usuarioResult.rows[0];
    const baseSlug = usuario.nombre && usuario.apellido
      ? `${usuario.nombre}-${usuario.apellido}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      : usuario.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Asegurar que el slug sea único
    const slugCheckResult = await query(
      `SELECT COUNT(*) as count FROM perfiles_asesor WHERE tenant_id = $1 AND slug LIKE $2`,
      [tenantId, `${baseSlug}%`]
    );
    const count = parseInt(slugCheckResult.rows[0].count, 10);
    const slug = count > 0 ? `${baseSlug}-${count + 1}` : baseSlug;

    const sql = `
      INSERT INTO perfiles_asesor (
        tenant_id, usuario_id, slug, biografia, especialidades,
        idiomas, zonas, tipos_propiedad,
        experiencia_anos, redes_sociales, titulo_profesional,
        whatsapp, telefono_directo, metadata, activo, visible_en_web
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, true)
      RETURNING id
    `;

    await query(sql, [
      tenantId,
      usuarioId,
      slug,
      data.biografia || null,
      JSON.stringify(especialidadesArray),
      JSON.stringify(idiomasArray.length > 0 ? idiomasArray : ['es']),
      JSON.stringify(zonasArray),
      JSON.stringify(tiposPropiedadArray),
      experienciaAnos,
      JSON.stringify(data.redesSociales || {}),
      data.tituloProfesional || null,
      data.whatsapp || null,
      data.telefonoDirecto || null,
      JSON.stringify({ licencia: data.licencia || null }),
    ]);

    return await getPerfilAsesor(usuarioId, tenantId);
  }
}