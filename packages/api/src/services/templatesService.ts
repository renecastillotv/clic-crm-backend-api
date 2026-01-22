/**
 * Servicio de Templates de Roles
 *
 * Gestiona los templates de rol (tabla roles_templates) y sus permisos por módulo.
 * Los templates definen el techo máximo de permisos que un tenant puede asignar.
 */

import { query } from '../utils/db.js';

// Interfaces
export interface RolTemplate {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  icono: string | null;
  color: string | null;
  esActivo: boolean;
  visibleParaTenants: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateModulo {
  id: string;
  templateId: string;
  moduloId: string;
  puedeVer: boolean;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
  alcanceVer: 'all' | 'team' | 'own';
  alcanceEditar: 'all' | 'team' | 'own';
  permisosCampos: Record<string, any>;
  // Datos del módulo (para UI)
  moduloNombre?: string;
  moduloCategoria?: string;
  moduloOrden?: number;
  moduloEsSubmenu?: boolean;
  moduloPadreId?: string | null;
}

export interface TemplateModuloInput {
  moduloId: string;
  puedeVer: boolean;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
  alcanceVer?: 'all' | 'team' | 'own';
  alcanceEditar?: 'all' | 'team' | 'own';
  permisosCampos?: Record<string, any>;
}

export interface CreateTemplateInput {
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  icono?: string;
  color?: string;
  visibleParaTenants?: boolean;
}

// ============ CRUD Templates ============

/**
 * Obtener todos los templates
 */
export async function getAllTemplates(): Promise<RolTemplate[]> {
  const result = await query(`
    SELECT id, codigo, nombre, descripcion, categoria, icono, color,
           es_activo, visible_para_tenants, created_at, updated_at
    FROM roles_templates
    ORDER BY categoria, nombre
  `);

  return result.rows.map(mapTemplate);
}

/**
 * Obtener template por ID
 */
export async function getTemplateById(id: string): Promise<RolTemplate | null> {
  const result = await query(
    'SELECT * FROM roles_templates WHERE id = $1',
    [id]
  );
  return result.rows.length > 0 ? mapTemplate(result.rows[0]) : null;
}

/**
 * Crear un nuevo template
 */
export async function createTemplate(data: CreateTemplateInput): Promise<RolTemplate> {
  // Verificar código único
  const existing = await query(
    'SELECT id FROM roles_templates WHERE codigo = $1',
    [data.codigo]
  );
  if (existing.rows.length > 0) {
    throw new Error(`Ya existe un template con código "${data.codigo}"`);
  }

  const result = await query(`
    INSERT INTO roles_templates (codigo, nombre, descripcion, categoria, icono, color, visible_para_tenants)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [
    data.codigo,
    data.nombre,
    data.descripcion || null,
    data.categoria || 'operacional',
    data.icono || null,
    data.color || null,
    data.visibleParaTenants !== false,
  ]);

  return mapTemplate(result.rows[0]);
}

/**
 * Actualizar un template
 */
export async function updateTemplate(id: string, data: Partial<CreateTemplateInput>): Promise<RolTemplate> {
  const existing = await query('SELECT id FROM roles_templates WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    throw new Error('Template no encontrado');
  }

  const result = await query(`
    UPDATE roles_templates SET
      nombre = COALESCE($2, nombre),
      descripcion = COALESCE($3, descripcion),
      categoria = COALESCE($4, categoria),
      icono = COALESCE($5, icono),
      color = COALESCE($6, color),
      visible_para_tenants = COALESCE($7, visible_para_tenants),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `, [
    id,
    data.nombre,
    data.descripcion,
    data.categoria,
    data.icono,
    data.color,
    data.visibleParaTenants,
  ]);

  return mapTemplate(result.rows[0]);
}

/**
 * Activar/desactivar un template
 */
export async function toggleTemplate(id: string, esActivo: boolean): Promise<RolTemplate> {
  const result = await query(`
    UPDATE roles_templates SET es_activo = $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `, [id, esActivo]);

  if (result.rows.length === 0) {
    throw new Error('Template no encontrado');
  }
  return mapTemplate(result.rows[0]);
}

/**
 * Eliminar un template (solo si no tiene roles asociados)
 */
export async function deleteTemplate(id: string): Promise<boolean> {
  // Verificar si hay roles usando este template
  const rolesUsing = await query(
    'SELECT COUNT(*) as count FROM roles WHERE template_id = $1',
    [id]
  );
  if (parseInt(rolesUsing.rows[0].count) > 0) {
    throw new Error('No se puede eliminar: hay roles usando este template');
  }

  const result = await query('DELETE FROM roles_templates WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

// ============ Template Módulos ============

/**
 * Obtener módulos de un template con datos del módulo
 */
export async function getTemplateModulos(templateId: string): Promise<TemplateModulo[]> {
  const result = await query(`
    SELECT
      rtm.id,
      rtm.template_id,
      rtm.modulo_id,
      rtm.puede_ver,
      rtm.puede_crear,
      rtm.puede_editar,
      rtm.puede_eliminar,
      rtm.alcance_ver,
      rtm.alcance_editar,
      rtm.permisos_campos,
      m.nombre as modulo_nombre,
      m.categoria as modulo_categoria,
      m.orden as modulo_orden,
      m.es_submenu as modulo_es_submenu,
      m.modulo_padre_id
    FROM roles_templates_modulos rtm
    JOIN modulos m ON m.id = rtm.modulo_id
    WHERE rtm.template_id = $1
    ORDER BY m.categoria, m.orden
  `, [templateId]);

  return result.rows.map(mapTemplateModulo);
}

/**
 * Obtener la matriz completa de un template (todos los módulos, con permisos asignados o null)
 */
export async function getTemplateMatrix(templateId: string): Promise<{
  template: RolTemplate;
  modulos: Array<{
    id: string;
    nombre: string;
    categoria: string;
    orden: number;
    esSubmenu: boolean;
    moduloPadreId: string | null;
    permisos: TemplateModulo | null;
  }>;
}> {
  const template = await getTemplateById(templateId);
  if (!template) {
    throw new Error('Template no encontrado');
  }

  const result = await query(`
    SELECT
      m.id,
      m.nombre,
      m.categoria,
      m.orden,
      m.es_submenu,
      m.modulo_padre_id,
      rtm.id as permiso_id,
      rtm.puede_ver,
      rtm.puede_crear,
      rtm.puede_editar,
      rtm.puede_eliminar,
      rtm.alcance_ver,
      rtm.alcance_editar,
      rtm.permisos_campos
    FROM modulos m
    LEFT JOIN roles_templates_modulos rtm ON rtm.modulo_id = m.id AND rtm.template_id = $1
    WHERE m.activo = true
    ORDER BY m.categoria, m.orden
  `, [templateId]);

  const modulos = result.rows.map(row => ({
    id: row.id,
    nombre: row.nombre,
    categoria: row.categoria,
    orden: row.orden,
    esSubmenu: row.es_submenu,
    moduloPadreId: row.modulo_padre_id,
    permisos: row.permiso_id ? {
      id: row.permiso_id,
      templateId,
      moduloId: row.id,
      puedeVer: row.puede_ver,
      puedeCrear: row.puede_crear,
      puedeEditar: row.puede_editar,
      puedeEliminar: row.puede_eliminar,
      alcanceVer: row.alcance_ver || 'own',
      alcanceEditar: row.alcance_editar || 'own',
      permisosCampos: row.permisos_campos || {},
    } : null,
  }));

  return { template, modulos };
}

/**
 * Agregar o actualizar un módulo en un template
 */
export async function upsertTemplateModulo(
  templateId: string,
  data: TemplateModuloInput
): Promise<TemplateModulo> {
  const result = await query(`
    INSERT INTO roles_templates_modulos (
      template_id, modulo_id,
      puede_ver, puede_crear, puede_editar, puede_eliminar,
      alcance_ver, alcance_editar, permisos_campos
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (template_id, modulo_id) DO UPDATE SET
      puede_ver = EXCLUDED.puede_ver,
      puede_crear = EXCLUDED.puede_crear,
      puede_editar = EXCLUDED.puede_editar,
      puede_eliminar = EXCLUDED.puede_eliminar,
      alcance_ver = EXCLUDED.alcance_ver,
      alcance_editar = EXCLUDED.alcance_editar,
      permisos_campos = EXCLUDED.permisos_campos,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `, [
    templateId,
    data.moduloId,
    data.puedeVer,
    data.puedeCrear,
    data.puedeEditar,
    data.puedeEliminar,
    data.alcanceVer || 'own',
    data.alcanceEditar || 'own',
    JSON.stringify(data.permisosCampos || {}),
  ]);

  return mapTemplateModulo(result.rows[0]);
}

/**
 * Eliminar un módulo de un template
 */
export async function removeTemplateModulo(templateId: string, moduloId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM roles_templates_modulos WHERE template_id = $1 AND modulo_id = $2',
    [templateId, moduloId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Actualizar todos los módulos de un template (reemplaza los existentes)
 */
export async function updateAllTemplateModulos(
  templateId: string,
  modulos: TemplateModuloInput[]
): Promise<TemplateModulo[]> {
  // Eliminar existentes
  await query('DELETE FROM roles_templates_modulos WHERE template_id = $1', [templateId]);

  // Insertar nuevos
  const results: TemplateModulo[] = [];
  for (const mod of modulos) {
    if (mod.puedeVer || mod.puedeCrear || mod.puedeEditar || mod.puedeEliminar) {
      const result = await upsertTemplateModulo(templateId, mod);
      results.push(result);
    }
  }

  return results;
}

// ============ Propagación ============

/**
 * Propagar un módulo nuevo a todos los roles basados en un template
 * Solo afecta roles con hereda_nuevos_modulos = true
 */
export async function propagateModuloToRoles(
  templateId: string,
  moduloId: string,
  permisos: Partial<TemplateModuloInput>
): Promise<number> {
  // Obtener roles que heredan de este template
  const rolesResult = await query(`
    SELECT r.id, r.tenant_id
    FROM roles r
    WHERE r.template_id = $1
      AND r.hereda_nuevos_modulos = true
      AND r.activo = true
  `, [templateId]);

  let count = 0;
  const tenantsAfectados = new Set<string>();

  for (const rol of rolesResult.rows) {
    // Insertar solo si no existe ya (ON CONFLICT DO NOTHING)
    const insertResult = await query(`
      INSERT INTO roles_modulos (
        rol_id, modulo_id,
        puede_ver, puede_crear, puede_editar, puede_eliminar,
        alcance_ver, alcance_editar, permisos_campos
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (rol_id, modulo_id) DO NOTHING
    `, [
      rol.id,
      moduloId,
      permisos.puedeVer ?? false,
      permisos.puedeCrear ?? false,
      permisos.puedeEditar ?? false,
      permisos.puedeEliminar ?? false,
      permisos.alcanceVer || 'own',
      permisos.alcanceEditar || 'own',
      JSON.stringify(permisos.permisosCampos || {}),
    ]);

    if ((insertResult.rowCount ?? 0) > 0) {
      count++;
      if (rol.tenant_id) {
        tenantsAfectados.add(rol.tenant_id);
      }
    }
  }

  // Invalidar caché de tenants afectados
  for (const tenantId of tenantsAfectados) {
    await query(`
      INSERT INTO permisos_version (tenant_id, version, updated_at)
      VALUES ($1, 1, CURRENT_TIMESTAMP)
      ON CONFLICT (tenant_id)
      DO UPDATE SET version = permisos_version.version + 1, updated_at = CURRENT_TIMESTAMP
    `, [tenantId]);
  }

  return count;
}

/**
 * Validar que los permisos de un rol no excedan los del template
 */
export async function validateRolPermissions(
  templateId: string,
  moduloId: string,
  permisos: Partial<TemplateModuloInput>
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Obtener permisos del template para este módulo
  const templatePerm = await query(`
    SELECT puede_ver, puede_crear, puede_editar, puede_eliminar, alcance_ver, alcance_editar
    FROM roles_templates_modulos
    WHERE template_id = $1 AND modulo_id = $2
  `, [templateId, moduloId]);

  if (templatePerm.rows.length === 0) {
    errors.push(`Módulo "${moduloId}" no está permitido por el template`);
    return { valid: false, errors };
  }

  const template = templatePerm.rows[0];

  if (permisos.puedeCrear && !template.puede_crear) {
    errors.push(`Permiso "crear" no permitido por el template para "${moduloId}"`);
  }
  if (permisos.puedeEditar && !template.puede_editar) {
    errors.push(`Permiso "editar" no permitido por el template para "${moduloId}"`);
  }
  if (permisos.puedeEliminar && !template.puede_eliminar) {
    errors.push(`Permiso "eliminar" no permitido por el template para "${moduloId}"`);
  }

  // Validar alcance (no puede ser más permisivo)
  const alcancePriority: Record<string, number> = { own: 0, team: 1, all: 2 };
  if (permisos.alcanceVer && alcancePriority[permisos.alcanceVer] > alcancePriority[template.alcance_ver || 'own']) {
    errors.push(`Alcance de ver "${permisos.alcanceVer}" excede al template "${template.alcance_ver}"`);
  }
  if (permisos.alcanceEditar && alcancePriority[permisos.alcanceEditar] > alcancePriority[template.alcance_editar || 'own']) {
    errors.push(`Alcance de editar "${permisos.alcanceEditar}" excede al template "${template.alcance_editar}"`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Obtener estadísticas de templates (cuántos roles usan cada uno)
 */
export async function getTemplatesStats(): Promise<Array<RolTemplate & { totalRoles: number; totalTenants: number }>> {
  const result = await query(`
    SELECT
      rt.*,
      COUNT(DISTINCT r.id) as total_roles,
      COUNT(DISTINCT r.tenant_id) as total_tenants
    FROM roles_templates rt
    LEFT JOIN roles r ON r.template_id = rt.id AND r.activo = true
    GROUP BY rt.id
    ORDER BY rt.categoria, rt.nombre
  `);

  return result.rows.map(row => ({
    ...mapTemplate(row),
    totalRoles: parseInt(row.total_roles) || 0,
    totalTenants: parseInt(row.total_tenants) || 0,
  }));
}

// ============ Helpers ============

function mapTemplate(row: any): RolTemplate {
  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    descripcion: row.descripcion,
    categoria: row.categoria,
    icono: row.icono,
    color: row.color,
    esActivo: row.es_activo,
    visibleParaTenants: row.visible_para_tenants,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTemplateModulo(row: any): TemplateModulo {
  return {
    id: row.id,
    templateId: row.template_id,
    moduloId: row.modulo_id,
    puedeVer: row.puede_ver,
    puedeCrear: row.puede_crear,
    puedeEditar: row.puede_editar,
    puedeEliminar: row.puede_eliminar,
    alcanceVer: row.alcance_ver || 'own',
    alcanceEditar: row.alcance_editar || 'own',
    permisosCampos: row.permisos_campos || {},
    moduloNombre: row.modulo_nombre,
    moduloCategoria: row.modulo_categoria,
    moduloOrden: row.modulo_orden,
    moduloEsSubmenu: row.modulo_es_submenu,
    moduloPadreId: row.modulo_padre_id,
  };
}
