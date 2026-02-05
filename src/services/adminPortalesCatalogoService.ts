import { query } from '../utils/db.js';

export interface PortalCatalogo {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  logo_url: string | null;
  icono: string | null;
  color: string;
  roles_auto_activo: string[];
  activo: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePortalCatalogoData {
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  logo_url?: string | null;
  icono?: string | null;
  color?: string;
  roles_auto_activo?: string[];
  activo?: boolean;
  orden?: number;
}

export interface UpdatePortalCatalogoData {
  codigo?: string;
  nombre?: string;
  descripcion?: string | null;
  logo_url?: string | null;
  icono?: string | null;
  color?: string;
  roles_auto_activo?: string[];
  activo?: boolean;
  orden?: number;
}

export interface PortalesCatalogoFilters {
  activo?: boolean;
  search?: string;
}

/** Lista portales con filtros opcionales (admin) */
export async function getPortalesCatalogo(filters?: PortalesCatalogoFilters): Promise<PortalCatalogo[]> {
  let sql = 'SELECT * FROM portales_catalogo WHERE 1=1';
  const params: any[] = [];
  let idx = 1;

  if (filters?.activo !== undefined) {
    sql += ` AND activo = $${idx++}`;
    params.push(filters.activo);
  }
  if (filters?.search) {
    sql += ` AND (nombre ILIKE $${idx} OR codigo ILIKE $${idx} OR descripcion ILIKE $${idx})`;
    params.push(`%${filters.search}%`);
    idx++;
  }

  sql += ' ORDER BY orden ASC, nombre ASC';
  const result = await query(sql, params);
  return result.rows;
}

/** Solo portales activos (público) */
export async function getPortalesCatalogoActivos(): Promise<PortalCatalogo[]> {
  const result = await query(
    'SELECT * FROM portales_catalogo WHERE activo = true ORDER BY orden ASC, nombre ASC'
  );
  return result.rows;
}

/** Obtener por ID */
export async function getPortalCatalogoById(id: string): Promise<PortalCatalogo | null> {
  const result = await query('SELECT * FROM portales_catalogo WHERE id = $1', [id]);
  return result.rows[0] || null;
}

/** Crear portal */
export async function createPortalCatalogo(data: CreatePortalCatalogoData): Promise<PortalCatalogo> {
  const existing = await query('SELECT id FROM portales_catalogo WHERE codigo = $1', [data.codigo]);
  if (existing.rows.length > 0) {
    throw new Error(`Ya existe un portal con el código "${data.codigo}"`);
  }

  const result = await query(
    `INSERT INTO portales_catalogo (codigo, nombre, descripcion, logo_url, icono, color, roles_auto_activo, activo, orden)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      data.codigo,
      data.nombre,
      data.descripcion || null,
      data.logo_url || null,
      data.icono || null,
      data.color || '#3b82f6',
      data.roles_auto_activo || [],
      data.activo !== undefined ? data.activo : true,
      data.orden !== undefined ? data.orden : 0,
    ]
  );
  return result.rows[0];
}

/** Actualizar portal */
export async function updatePortalCatalogo(id: string, data: UpdatePortalCatalogoData): Promise<PortalCatalogo> {
  const existing = await getPortalCatalogoById(id);
  if (!existing) throw new Error('Portal no encontrado');

  if (data.codigo && data.codigo !== existing.codigo) {
    const dup = await query('SELECT id FROM portales_catalogo WHERE codigo = $1 AND id != $2', [data.codigo, id]);
    if (dup.rows.length > 0) throw new Error(`Ya existe un portal con el código "${data.codigo}"`);
  }

  const fields: string[] = [];
  const params: any[] = [];
  let idx = 1;

  const set = (field: string, value: any) => {
    fields.push(`${field} = $${idx++}`);
    params.push(value);
  };

  if (data.codigo !== undefined) set('codigo', data.codigo);
  if (data.nombre !== undefined) set('nombre', data.nombre);
  if (data.descripcion !== undefined) set('descripcion', data.descripcion);
  if (data.logo_url !== undefined) set('logo_url', data.logo_url);
  if (data.icono !== undefined) set('icono', data.icono);
  if (data.color !== undefined) set('color', data.color);
  if (data.roles_auto_activo !== undefined) set('roles_auto_activo', data.roles_auto_activo);
  if (data.activo !== undefined) set('activo', data.activo);
  if (data.orden !== undefined) set('orden', data.orden);

  if (fields.length === 0) return existing;

  fields.push(`updated_at = NOW()`);
  params.push(id);

  const result = await query(
    `UPDATE portales_catalogo SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  return result.rows[0];
}

/** Eliminar portal */
export async function deletePortalCatalogo(id: string): Promise<boolean> {
  const result = await query('DELETE FROM portales_catalogo WHERE id = $1 RETURNING id', [id]);
  return result.rows.length > 0;
}

/** Toggle activo */
export async function togglePortalCatalogoStatus(id: string, activo: boolean): Promise<PortalCatalogo> {
  const result = await query(
    'UPDATE portales_catalogo SET activo = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [activo, id]
  );
  if (result.rows.length === 0) throw new Error('Portal no encontrado');
  return result.rows[0];
}
