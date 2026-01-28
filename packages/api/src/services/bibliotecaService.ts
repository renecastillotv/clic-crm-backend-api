/**
 * Servicio para gestionar la Biblioteca de la Empresa
 * - Categorías de documentos
 * - Documentos compartidos (políticas, manuales, etc.)
 * - Historial de versiones
 * - Confirmaciones de lectura para documentos obligatorios
 * - Favoritos de usuarios
 */

import { query } from '../utils/db.js';

// ==================== INTERFACES ====================

export interface BibliotecaCategoria {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  color?: string;
  orden: number;
  activo: boolean;
  created_at: string;
  created_by_id?: string;
  // Computed
  documentos_count?: number;
}

export interface BibliotecaDocumento {
  id: string;
  tenant_id: string;
  categoria_id?: string;
  titulo: string;
  descripcion?: string;
  url_documento: string;
  tipo_archivo?: string;
  tamano_archivo?: number;
  version: number;
  version_notas?: string;
  es_obligatorio: boolean;
  fecha_vigencia?: string;
  orden: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
  created_by_id?: string;
  updated_by_id?: string;
  // Relations
  categoria?: BibliotecaCategoria;
  // Computed
  confirmado?: boolean;
  es_favorito?: boolean;
}

export interface BibliotecaVersion {
  id: string;
  documento_id: string;
  version: number;
  url_documento: string;
  notas?: string;
  created_at: string;
  created_by_id?: string;
}

export interface BibliotecaConfirmacion {
  id: string;
  tenant_id: string;
  documento_id: string;
  usuario_id: string;
  version_confirmada: number;
  fecha_confirmacion: string;
  ip_address?: string;
}

// ==================== CATEGORÍAS ====================

export async function getCategorias(tenantId: string): Promise<BibliotecaCategoria[]> {
  const sql = `
    SELECT
      bc.*,
      COUNT(bd.id) FILTER (WHERE bd.activo = true) as documentos_count
    FROM biblioteca_categorias bc
    LEFT JOIN biblioteca_documentos bd ON bd.categoria_id = bc.id
    WHERE bc.tenant_id = $1 AND bc.activo = true
    GROUP BY bc.id
    ORDER BY bc.orden ASC, bc.nombre ASC
  `;

  const result = await query(sql, [tenantId]);
  return result.rows.map((row: any) => ({
    ...row,
    documentos_count: parseInt(row.documentos_count) || 0,
  }));
}

export async function getCategoriaById(
  tenantId: string,
  categoriaId: string
): Promise<BibliotecaCategoria | null> {
  const sql = `
    SELECT * FROM biblioteca_categorias
    WHERE id = $1 AND tenant_id = $2
  `;

  const result = await query(sql, [categoriaId, tenantId]);
  return result.rows[0] || null;
}

export async function createCategoria(
  tenantId: string,
  data: Partial<BibliotecaCategoria>,
  createdById?: string
): Promise<BibliotecaCategoria> {
  const sql = `
    INSERT INTO biblioteca_categorias (
      tenant_id, nombre, descripcion, icono, color, orden, created_by_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;

  const result = await query(sql, [
    tenantId,
    data.nombre,
    data.descripcion || null,
    data.icono || null,
    data.color || null,
    data.orden || 0,
    createdById || null,
  ]);

  return result.rows[0];
}

export async function updateCategoria(
  tenantId: string,
  categoriaId: string,
  data: Partial<BibliotecaCategoria>
): Promise<BibliotecaCategoria | null> {
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  const camposActualizables = ['nombre', 'descripcion', 'icono', 'color', 'orden', 'activo'];

  for (const campo of camposActualizables) {
    if (data[campo as keyof BibliotecaCategoria] !== undefined) {
      updates.push(`${campo} = $${paramIndex}`);
      params.push(data[campo as keyof BibliotecaCategoria]);
      paramIndex++;
    }
  }

  if (updates.length === 0) {
    return getCategoriaById(tenantId, categoriaId);
  }

  const sql = `
    UPDATE biblioteca_categorias
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
    RETURNING *
  `;
  params.push(categoriaId, tenantId);

  const result = await query(sql, params);
  return result.rows[0] || null;
}

export async function deleteCategoria(
  tenantId: string,
  categoriaId: string
): Promise<boolean> {
  // Soft delete
  const sql = `
    UPDATE biblioteca_categorias
    SET activo = false
    WHERE id = $1 AND tenant_id = $2
  `;

  const result = await query(sql, [categoriaId, tenantId]);
  return (result.rowCount ?? 0) > 0;
}

// ==================== DOCUMENTOS ====================

export interface DocumentosFiltros {
  categoria_id?: string;
  es_obligatorio?: boolean;
  busqueda?: string;
  page?: number;
  limit?: number;
}

export interface DocumentosResponse {
  data: BibliotecaDocumento[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getDocumentos(
  tenantId: string,
  usuarioId: string,
  filtros: DocumentosFiltros = {}
): Promise<DocumentosResponse> {
  const { categoria_id, es_obligatorio, busqueda, page = 1, limit = 50 } = filtros;
  const offset = (page - 1) * limit;

  let whereClause = 'bd.tenant_id = $1 AND bd.activo = true';
  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (categoria_id) {
    whereClause += ` AND bd.categoria_id = $${paramIndex}`;
    params.push(categoria_id);
    paramIndex++;
  }

  if (es_obligatorio !== undefined) {
    whereClause += ` AND bd.es_obligatorio = $${paramIndex}`;
    params.push(es_obligatorio);
    paramIndex++;
  }

  if (busqueda) {
    whereClause += ` AND (bd.titulo ILIKE $${paramIndex} OR bd.descripcion ILIKE $${paramIndex})`;
    params.push(`%${busqueda}%`);
    paramIndex++;
  }

  // Count total
  const countSql = `SELECT COUNT(*) as total FROM biblioteca_documentos bd WHERE ${whereClause}`;
  const countResult = await query(countSql, params);
  const total = parseInt(countResult.rows[0].total);

  // Get data with category, confirmation status, and favorite status
  const dataSql = `
    SELECT
      bd.*,
      bc.nombre as categoria_nombre,
      bc.icono as categoria_icono,
      bc.color as categoria_color,
      CASE WHEN bconf.id IS NOT NULL AND bconf.version_confirmada = bd.version THEN true ELSE false END as confirmado,
      CASE WHEN bf.documento_id IS NOT NULL THEN true ELSE false END as es_favorito
    FROM biblioteca_documentos bd
    LEFT JOIN biblioteca_categorias bc ON bc.id = bd.categoria_id
    LEFT JOIN biblioteca_confirmaciones bconf ON bconf.documento_id = bd.id AND bconf.usuario_id = $${paramIndex}
    LEFT JOIN biblioteca_favoritos bf ON bf.documento_id = bd.id AND bf.usuario_id = $${paramIndex}
    WHERE ${whereClause}
    ORDER BY bd.orden ASC, bd.titulo ASC
    LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
  `;
  params.push(usuarioId, limit, offset);

  const result = await query(dataSql, params);

  return {
    data: result.rows.map(formatDocumento),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getDocumentoById(
  tenantId: string,
  documentoId: string,
  usuarioId?: string
): Promise<BibliotecaDocumento | null> {
  const sql = `
    SELECT
      bd.*,
      bc.nombre as categoria_nombre,
      bc.icono as categoria_icono,
      bc.color as categoria_color
      ${usuarioId ? `,
      CASE WHEN bconf.id IS NOT NULL AND bconf.version_confirmada = bd.version THEN true ELSE false END as confirmado,
      CASE WHEN bf.documento_id IS NOT NULL THEN true ELSE false END as es_favorito
      ` : ''}
    FROM biblioteca_documentos bd
    LEFT JOIN biblioteca_categorias bc ON bc.id = bd.categoria_id
    ${usuarioId ? `
    LEFT JOIN biblioteca_confirmaciones bconf ON bconf.documento_id = bd.id AND bconf.usuario_id = $3
    LEFT JOIN biblioteca_favoritos bf ON bf.documento_id = bd.id AND bf.usuario_id = $3
    ` : ''}
    WHERE bd.id = $1 AND bd.tenant_id = $2
  `;

  const params = usuarioId ? [documentoId, tenantId, usuarioId] : [documentoId, tenantId];
  const result = await query(sql, params);

  if (result.rows.length === 0) {
    return null;
  }

  return formatDocumento(result.rows[0]);
}

export async function createDocumento(
  tenantId: string,
  data: Partial<BibliotecaDocumento>,
  createdById?: string
): Promise<BibliotecaDocumento> {
  const sql = `
    INSERT INTO biblioteca_documentos (
      tenant_id, categoria_id, titulo, descripcion, url_documento,
      tipo_archivo, tamano_archivo, version, version_notas,
      es_obligatorio, fecha_vigencia, orden, created_by_id, updated_by_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
    RETURNING *
  `;

  const result = await query(sql, [
    tenantId,
    data.categoria_id || null,
    data.titulo,
    data.descripcion || null,
    data.url_documento,
    data.tipo_archivo || null,
    data.tamano_archivo || null,
    1, // Initial version
    data.version_notas || null,
    data.es_obligatorio || false,
    data.fecha_vigencia || null,
    data.orden || 0,
    createdById || null,
  ]);

  return formatDocumento(result.rows[0]);
}

export async function updateDocumento(
  tenantId: string,
  documentoId: string,
  data: Partial<BibliotecaDocumento>,
  updatedById?: string
): Promise<BibliotecaDocumento | null> {
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  const camposActualizables = [
    'categoria_id', 'titulo', 'descripcion', 'url_documento',
    'tipo_archivo', 'tamano_archivo', 'version_notas',
    'es_obligatorio', 'fecha_vigencia', 'orden', 'activo'
  ];

  for (const campo of camposActualizables) {
    if (data[campo as keyof BibliotecaDocumento] !== undefined) {
      updates.push(`${campo} = $${paramIndex}`);
      params.push(data[campo as keyof BibliotecaDocumento]);
      paramIndex++;
    }
  }

  updates.push(`updated_at = NOW()`);

  if (updatedById) {
    updates.push(`updated_by_id = $${paramIndex}`);
    params.push(updatedById);
    paramIndex++;
  }

  if (updates.length === 1) {
    return getDocumentoById(tenantId, documentoId);
  }

  const sql = `
    UPDATE biblioteca_documentos
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
    RETURNING *
  `;
  params.push(documentoId, tenantId);

  const result = await query(sql, params);
  return result.rows[0] ? formatDocumento(result.rows[0]) : null;
}

export async function deleteDocumento(
  tenantId: string,
  documentoId: string
): Promise<boolean> {
  // Soft delete
  const sql = `
    UPDATE biblioteca_documentos
    SET activo = false, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
  `;

  const result = await query(sql, [documentoId, tenantId]);
  return (result.rowCount ?? 0) > 0;
}

// ==================== VERSIONES ====================

export async function createVersion(
  documentoId: string,
  data: {
    url_documento: string;
    notas?: string;
  },
  createdById?: string
): Promise<BibliotecaVersion> {
  // Get current version
  const currentDoc = await query(
    'SELECT version FROM biblioteca_documentos WHERE id = $1',
    [documentoId]
  );

  if (currentDoc.rows.length === 0) {
    throw new Error('Documento no encontrado');
  }

  const newVersion = currentDoc.rows[0].version + 1;

  // Start transaction
  // Save old version to history
  await query(`
    INSERT INTO biblioteca_versiones (documento_id, version, url_documento, notas, created_by_id)
    SELECT id, version, url_documento, version_notas, $2
    FROM biblioteca_documentos WHERE id = $1
  `, [documentoId, createdById || null]);

  // Update document with new version
  const updateSql = `
    UPDATE biblioteca_documentos
    SET version = $1, url_documento = $2, version_notas = $3, updated_at = NOW(), updated_by_id = $4
    WHERE id = $5
    RETURNING *
  `;

  await query(updateSql, [
    newVersion,
    data.url_documento,
    data.notas || null,
    createdById || null,
    documentoId,
  ]);

  // Return the new version entry
  const versionResult = await query(
    'SELECT * FROM biblioteca_versiones WHERE documento_id = $1 ORDER BY version DESC LIMIT 1',
    [documentoId]
  );

  return versionResult.rows[0];
}

export async function getVersiones(documentoId: string): Promise<BibliotecaVersion[]> {
  const sql = `
    SELECT * FROM biblioteca_versiones
    WHERE documento_id = $1
    ORDER BY version DESC
  `;

  const result = await query(sql, [documentoId]);
  return result.rows;
}

// ==================== CONFIRMACIONES ====================

export async function confirmarLectura(
  tenantId: string,
  documentoId: string,
  usuarioId: string,
  ipAddress?: string
): Promise<BibliotecaConfirmacion> {
  // Get current document version
  const docResult = await query(
    'SELECT version FROM biblioteca_documentos WHERE id = $1 AND tenant_id = $2',
    [documentoId, tenantId]
  );

  if (docResult.rows.length === 0) {
    throw new Error('Documento no encontrado');
  }

  const version = docResult.rows[0].version;

  // Upsert confirmation
  const sql = `
    INSERT INTO biblioteca_confirmaciones (tenant_id, documento_id, usuario_id, version_confirmada, ip_address)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (documento_id, usuario_id, version_confirmada)
    DO UPDATE SET fecha_confirmacion = NOW(), ip_address = $5
    RETURNING *
  `;

  const result = await query(sql, [tenantId, documentoId, usuarioId, version, ipAddress || null]);
  return result.rows[0];
}

export async function getConfirmaciones(
  tenantId: string,
  documentoId: string
): Promise<BibliotecaConfirmacion[]> {
  const sql = `
    SELECT bc.*, u.nombre as usuario_nombre, u.apellido as usuario_apellido
    FROM biblioteca_confirmaciones bc
    JOIN usuarios u ON u.id = bc.usuario_id
    WHERE bc.documento_id = $1 AND bc.tenant_id = $2
    ORDER BY bc.fecha_confirmacion DESC
  `;

  const result = await query(sql, [documentoId, tenantId]);
  return result.rows;
}

export async function getDocumentosPendientes(
  tenantId: string,
  usuarioId: string
): Promise<BibliotecaDocumento[]> {
  const sql = `
    SELECT bd.*
    FROM biblioteca_documentos bd
    LEFT JOIN biblioteca_confirmaciones bc
      ON bc.documento_id = bd.id
      AND bc.usuario_id = $2
      AND bc.version_confirmada = bd.version
    WHERE bd.tenant_id = $1
      AND bd.activo = true
      AND bd.es_obligatorio = true
      AND bc.id IS NULL
    ORDER BY bd.titulo ASC
  `;

  const result = await query(sql, [tenantId, usuarioId]);
  return result.rows.map(formatDocumento);
}

// ==================== FAVORITOS ====================

export async function toggleFavorito(
  documentoId: string,
  usuarioId: string
): Promise<boolean> {
  // Check if exists
  const existsResult = await query(
    'SELECT 1 FROM biblioteca_favoritos WHERE documento_id = $1 AND usuario_id = $2',
    [documentoId, usuarioId]
  );

  if (existsResult.rows.length > 0) {
    // Remove favorite
    await query(
      'DELETE FROM biblioteca_favoritos WHERE documento_id = $1 AND usuario_id = $2',
      [documentoId, usuarioId]
    );
    return false;
  } else {
    // Add favorite
    await query(
      'INSERT INTO biblioteca_favoritos (documento_id, usuario_id) VALUES ($1, $2)',
      [documentoId, usuarioId]
    );
    return true;
  }
}

export async function getFavoritos(
  tenantId: string,
  usuarioId: string
): Promise<BibliotecaDocumento[]> {
  const sql = `
    SELECT bd.*, true as es_favorito,
      bc.nombre as categoria_nombre,
      bc.icono as categoria_icono,
      bc.color as categoria_color,
      CASE WHEN bconf.id IS NOT NULL AND bconf.version_confirmada = bd.version THEN true ELSE false END as confirmado
    FROM biblioteca_documentos bd
    JOIN biblioteca_favoritos bf ON bf.documento_id = bd.id AND bf.usuario_id = $2
    LEFT JOIN biblioteca_categorias bc ON bc.id = bd.categoria_id
    LEFT JOIN biblioteca_confirmaciones bconf ON bconf.documento_id = bd.id AND bconf.usuario_id = $2
    WHERE bd.tenant_id = $1 AND bd.activo = true
    ORDER BY bd.titulo ASC
  `;

  const result = await query(sql, [tenantId, usuarioId]);
  return result.rows.map(formatDocumento);
}

// ==================== HELPERS ====================

function formatDocumento(row: any): BibliotecaDocumento {
  const doc: BibliotecaDocumento = {
    id: row.id,
    tenant_id: row.tenant_id,
    categoria_id: row.categoria_id,
    titulo: row.titulo,
    descripcion: row.descripcion,
    url_documento: row.url_documento,
    tipo_archivo: row.tipo_archivo,
    tamano_archivo: row.tamano_archivo,
    version: row.version,
    version_notas: row.version_notas,
    es_obligatorio: row.es_obligatorio,
    fecha_vigencia: row.fecha_vigencia,
    orden: row.orden,
    activo: row.activo,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by_id: row.created_by_id,
    updated_by_id: row.updated_by_id,
    confirmado: row.confirmado,
    es_favorito: row.es_favorito,
  };

  // Add category relation if joined
  if (row.categoria_nombre) {
    doc.categoria = {
      id: row.categoria_id,
      tenant_id: row.tenant_id,
      nombre: row.categoria_nombre,
      icono: row.categoria_icono,
      color: row.categoria_color,
      orden: 0,
      activo: true,
      created_at: '',
    };
  }

  return doc;
}

// ==================== SEED DEFAULT CATEGORIES ====================

export async function seedDefaultCategorias(tenantId: string, createdById?: string): Promise<void> {
  const defaultCategorias = [
    { nombre: 'Políticas', icono: 'Shield', color: '#3B82F6', orden: 1 },
    { nombre: 'Manuales', icono: 'BookOpen', color: '#10B981', orden: 2 },
    { nombre: 'Contratos', icono: 'FileText', color: '#F59E0B', orden: 3 },
    { nombre: 'Formularios', icono: 'ClipboardList', color: '#8B5CF6', orden: 4 },
    { nombre: 'Comunicados', icono: 'Megaphone', color: '#EC4899', orden: 5 },
    { nombre: 'Otros', icono: 'Folder', color: '#6B7280', orden: 6 },
  ];

  for (const cat of defaultCategorias) {
    await query(`
      INSERT INTO biblioteca_categorias (tenant_id, nombre, icono, color, orden, created_by_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING
    `, [tenantId, cat.nombre, cat.icono, cat.color, cat.orden, createdById || null]);
  }
}
