/**
 * Servicio de Administración de Roles y Módulos
 *
 * Gestiona la relación entre roles y módulos (tabla roles_modulos)
 * Permite configurar qué módulos puede ver cada rol y con qué permisos
 */

import { query } from '../utils/db.js';

// Interfaces
export interface Modulo {
  id: string;          // El ID es el código/slug del módulo
  nombre: string;
  descripcion: string | null;
  icono: string | null;
  categoria: string;   // crm, web, admin, tools
  orden: number;
  activo: boolean;
}

export interface RolModulo {
  id: string;
  rolId: string;
  moduloId: string;
  puedeVer: boolean;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
  alcanceVer: 'all' | 'team' | 'own';
  alcanceEditar: 'all' | 'team' | 'own';
  // Datos del módulo (para mostrar en UI)
  moduloNombre?: string;
  moduloDescripcion?: string;
  moduloCategoria?: string;
}

export interface RolModuloInput {
  moduloId: string;
  puedeVer: boolean;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
  alcanceVer?: 'all' | 'team' | 'own';
  alcanceEditar?: 'all' | 'team' | 'own';
}

/**
 * Obtiene todos los módulos del sistema
 */
export async function getAllModulos(): Promise<Modulo[]> {
  const result = await query(`
    SELECT
      id,
      nombre,
      descripcion,
      icono,
      categoria,
      orden,
      activo
    FROM modulos
    ORDER BY categoria ASC, orden ASC, nombre ASC
  `);

  return result.rows.map(row => ({
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    icono: row.icono,
    categoria: row.categoria,
    orden: row.orden,
    activo: row.activo,
  }));
}

/**
 * Obtiene los módulos asignados a un rol específico
 */
export async function getModulosByRol(rolId: string): Promise<RolModulo[]> {
  const result = await query(`
    SELECT
      rm.id,
      rm.rol_id,
      rm.modulo_id,
      rm.puede_ver,
      rm.puede_crear,
      rm.puede_editar,
      rm.puede_eliminar,
      rm.alcance_ver,
      rm.alcance_editar,
      m.nombre as modulo_nombre,
      m.descripcion as modulo_descripcion,
      m.categoria as modulo_categoria
    FROM roles_modulos rm
    JOIN modulos m ON m.id = rm.modulo_id
    WHERE rm.rol_id = $1
    ORDER BY m.categoria ASC, m.orden ASC, m.nombre ASC
  `, [rolId]);

  return result.rows.map(row => ({
    id: row.id,
    rolId: row.rol_id,
    moduloId: row.modulo_id,
    puedeVer: row.puede_ver,
    puedeCrear: row.puede_crear,
    puedeEditar: row.puede_editar,
    puedeEliminar: row.puede_eliminar,
    alcanceVer: row.alcance_ver || 'own',
    alcanceEditar: row.alcance_editar || 'own',
    moduloNombre: row.modulo_nombre,
    moduloDescripcion: row.modulo_descripcion,
    moduloCategoria: row.modulo_categoria,
  }));
}

/**
 * Obtiene la matriz completa de un rol con todos los módulos
 * (incluye módulos sin asignar para mostrar en UI)
 */
export async function getRolModulosMatrix(rolId: string): Promise<{
  rol: { id: string; nombre: string; codigo: string; tipo: string };
  modulos: Array<Modulo & { permisos: RolModulo | null }>;
}> {
  // Obtener info del rol
  const rolResult = await query(`
    SELECT id, nombre, codigo, tipo
    FROM roles
    WHERE id = $1
  `, [rolId]);

  if (rolResult.rows.length === 0) {
    throw new Error('Rol no encontrado');
  }

  const rol = rolResult.rows[0];

  // Obtener todos los módulos con sus permisos para este rol
  const result = await query(`
    SELECT
      m.id,
      m.nombre,
      m.descripcion,
      m.icono,
      m.categoria,
      m.orden,
      m.activo,
      rm.id as permiso_id,
      rm.puede_ver,
      rm.puede_crear,
      rm.puede_editar,
      rm.puede_eliminar,
      rm.alcance_ver,
      rm.alcance_editar
    FROM modulos m
    LEFT JOIN roles_modulos rm ON rm.modulo_id = m.id AND rm.rol_id = $1
    WHERE m.activo = true
    ORDER BY m.categoria ASC, m.orden ASC, m.nombre ASC
  `, [rolId]);

  const modulos = result.rows.map(row => ({
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    icono: row.icono,
    categoria: row.categoria,
    orden: row.orden,
    activo: row.activo,
    permisos: row.permiso_id ? {
      id: row.permiso_id,
      rolId: rolId,
      moduloId: row.id,
      puedeVer: row.puede_ver,
      puedeCrear: row.puede_crear,
      puedeEditar: row.puede_editar,
      puedeEliminar: row.puede_eliminar,
      alcanceVer: row.alcance_ver || 'own',
      alcanceEditar: row.alcance_editar || 'own',
    } : null,
  }));

  return { rol, modulos };
}

/**
 * Actualiza los permisos de un módulo para un rol
 * Si no existe la relación, la crea
 */
export async function updateRolModulo(
  rolId: string,
  moduloId: string,
  permisos: Partial<RolModuloInput>
): Promise<RolModulo> {
  // Verificar que el rol existe
  const rolExists = await query('SELECT id FROM roles WHERE id = $1', [rolId]);
  if (rolExists.rows.length === 0) {
    throw new Error('Rol no encontrado');
  }

  // Verificar que el módulo existe
  const moduloExists = await query('SELECT id FROM modulos WHERE id = $1', [moduloId]);
  if (moduloExists.rows.length === 0) {
    throw new Error('Módulo no encontrado');
  }

  // Buscar si ya existe la relación
  const existing = await query(
    'SELECT id FROM roles_modulos WHERE rol_id = $1 AND modulo_id = $2',
    [rolId, moduloId]
  );

  let result;

  if (existing.rows.length > 0) {
    // Actualizar existente
    result = await query(`
      UPDATE roles_modulos
      SET
        puede_ver = COALESCE($3, puede_ver),
        puede_crear = COALESCE($4, puede_crear),
        puede_editar = COALESCE($5, puede_editar),
        puede_eliminar = COALESCE($6, puede_eliminar),
        alcance_ver = COALESCE($7, alcance_ver),
        alcance_editar = COALESCE($8, alcance_editar),
        updated_at = CURRENT_TIMESTAMP
      WHERE rol_id = $1 AND modulo_id = $2
      RETURNING *
    `, [
      rolId,
      moduloId,
      permisos.puedeVer,
      permisos.puedeCrear,
      permisos.puedeEditar,
      permisos.puedeEliminar,
      permisos.alcanceVer,
      permisos.alcanceEditar,
    ]);
  } else {
    // Crear nuevo
    result = await query(`
      INSERT INTO roles_modulos (
        rol_id, modulo_id,
        puede_ver, puede_crear, puede_editar, puede_eliminar,
        alcance_ver, alcance_editar
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      rolId,
      moduloId,
      permisos.puedeVer ?? false,
      permisos.puedeCrear ?? false,
      permisos.puedeEditar ?? false,
      permisos.puedeEliminar ?? false,
      permisos.alcanceVer ?? 'own',
      permisos.alcanceEditar ?? 'own',
    ]);
  }

  const row = result.rows[0];
  return {
    id: row.id,
    rolId: row.rol_id,
    moduloId: row.modulo_id,
    puedeVer: row.puede_ver,
    puedeCrear: row.puede_crear,
    puedeEditar: row.puede_editar,
    puedeEliminar: row.puede_eliminar,
    alcanceVer: row.alcance_ver || 'own',
    alcanceEditar: row.alcance_editar || 'own',
  };
}

/**
 * Actualiza todos los permisos de módulos para un rol
 * Reemplaza los permisos existentes con los nuevos
 */
export async function updateAllRolModulos(
  rolId: string,
  modulos: RolModuloInput[]
): Promise<RolModulo[]> {
  // Verificar que el rol existe
  const rolExists = await query('SELECT id FROM roles WHERE id = $1', [rolId]);
  if (rolExists.rows.length === 0) {
    throw new Error('Rol no encontrado');
  }

  // Eliminar todos los permisos actuales del rol
  await query('DELETE FROM roles_modulos WHERE rol_id = $1', [rolId]);

  // Insertar los nuevos permisos
  const results: RolModulo[] = [];

  for (const modulo of modulos) {
    // Solo insertar si tiene al menos un permiso activo
    if (modulo.puedeVer || modulo.puedeCrear || modulo.puedeEditar || modulo.puedeEliminar) {
      const result = await query(`
        INSERT INTO roles_modulos (
          rol_id, modulo_id,
          puede_ver, puede_crear, puede_editar, puede_eliminar,
          alcance_ver, alcance_editar
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        rolId,
        modulo.moduloId,
        modulo.puedeVer,
        modulo.puedeCrear,
        modulo.puedeEditar,
        modulo.puedeEliminar,
        modulo.alcanceVer ?? 'own',
        modulo.alcanceEditar ?? 'own',
      ]);

      const row = result.rows[0];
      results.push({
        id: row.id,
        rolId: row.rol_id,
        moduloId: row.modulo_id,
        puedeVer: row.puede_ver,
        puedeCrear: row.puede_crear,
        puedeEditar: row.puede_editar,
        puedeEliminar: row.puede_eliminar,
        alcanceVer: row.alcance_ver || 'own',
        alcanceEditar: row.alcance_editar || 'own',
      });
    }
  }

  return results;
}

/**
 * Elimina un permiso de módulo de un rol
 */
export async function removeModuloFromRol(rolId: string, moduloId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM roles_modulos WHERE rol_id = $1 AND modulo_id = $2',
    [rolId, moduloId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Copia los permisos de un rol a otro
 */
export async function copyRolPermisos(sourceRolId: string, targetRolId: string): Promise<number> {
  // Verificar que ambos roles existen
  const rolesExist = await query(
    'SELECT id FROM roles WHERE id IN ($1, $2)',
    [sourceRolId, targetRolId]
  );
  if (rolesExist.rows.length !== 2) {
    throw new Error('Uno o ambos roles no existen');
  }

  // Eliminar permisos actuales del rol destino
  await query('DELETE FROM roles_modulos WHERE rol_id = $1', [targetRolId]);

  // Copiar permisos del rol origen al destino
  const result = await query(`
    INSERT INTO roles_modulos (
      rol_id, modulo_id,
      puede_ver, puede_crear, puede_editar, puede_eliminar,
      alcance_ver, alcance_editar
    )
    SELECT
      $2, modulo_id,
      puede_ver, puede_crear, puede_editar, puede_eliminar,
      alcance_ver, alcance_editar
    FROM roles_modulos
    WHERE rol_id = $1
  `, [sourceRolId, targetRolId]);

  return result.rowCount ?? 0;
}

/**
 * Obtiene estadísticas de permisos por rol
 */
export async function getRolesModulosStats(): Promise<Array<{
  rolId: string;
  rolNombre: string;
  rolCodigo: string;
  rolTipo: string;
  totalModulos: number;
  modulosConVer: number;
  modulosConCrear: number;
  modulosConEditar: number;
  modulosConEliminar: number;
}>> {
  const result = await query(`
    SELECT
      r.id as rol_id,
      r.nombre as rol_nombre,
      r.codigo as rol_codigo,
      r.tipo as rol_tipo,
      COUNT(rm.id) as total_modulos,
      COUNT(rm.id) FILTER (WHERE rm.puede_ver = true) as modulos_con_ver,
      COUNT(rm.id) FILTER (WHERE rm.puede_crear = true) as modulos_con_crear,
      COUNT(rm.id) FILTER (WHERE rm.puede_editar = true) as modulos_con_editar,
      COUNT(rm.id) FILTER (WHERE rm.puede_eliminar = true) as modulos_con_eliminar
    FROM roles r
    LEFT JOIN roles_modulos rm ON rm.rol_id = r.id
    WHERE r.activo = true
    GROUP BY r.id, r.nombre, r.codigo, r.tipo
    ORDER BY r.tipo, r.nombre
  `);

  return result.rows.map(row => ({
    rolId: row.rol_id,
    rolNombre: row.rol_nombre,
    rolCodigo: row.rol_codigo,
    rolTipo: row.rol_tipo,
    totalModulos: parseInt(row.total_modulos) || 0,
    modulosConVer: parseInt(row.modulos_con_ver) || 0,
    modulosConCrear: parseInt(row.modulos_con_crear) || 0,
    modulosConEditar: parseInt(row.modulos_con_editar) || 0,
    modulosConEliminar: parseInt(row.modulos_con_eliminar) || 0,
  }));
}
