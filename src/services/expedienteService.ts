import { query } from '../utils/db.js';

// ============================================================
// TIPOS
// ============================================================

/**
 * Categorías válidas para documentos requeridos
 */
export type CategoriaDocumento =
  | 'cierre_venta_lista'
  | 'cierre_venta_proyecto'
  | 'cierre_alquiler'
  | 'captacion_propiedad_lista'
  | 'captacion_proyecto';

/**
 * Documento requerido (configuración del tenant)
 */
export interface DocumentoRequerido {
  id: string;
  tenant_id: string;
  titulo: string;
  descripcion: string | null;
  instrucciones: string | null;
  categoria: CategoriaDocumento;
  tipo: string | null;
  requiere_documento: boolean;
  es_obligatorio: boolean;
  orden_visualizacion: number;
  tipos_archivo_permitidos: string[];
  tamaño_maximo_archivo: number;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Documento subido (instancia de un documento requerido)
 */
export interface DocumentoSubido {
  id: string;
  tenant_id: string;
  venta_id: string;
  requerimiento_id: string;
  titulo: string;
  descripcion: string | null;
  categoria: string;
  tipo: string | null;
  requiere_documento: boolean;
  es_obligatorio: boolean;
  estado: string;
  url_documento: string | null;
  ruta_documento: string | null;
  tipo_archivo: string | null;
  tamaño_archivo: number | null;
  nombre_documento: string | null;
  fecha_subida_documento: Date | null;
  fecha_revision: Date | null;
  subido_por_id: string | null;
  revisado_por_id: string | null;
  notas_revision: string | null;
  comentarios: string | null;
  created_at: Date;
  updated_at: Date;
}

// Aliases para compatibilidad con código existente
export type RequerimientoExpediente = DocumentoRequerido;
export type ItemExpediente = DocumentoSubido;

// ============================================================
// FUNCIONES DE LECTURA
// ============================================================

/**
 * Obtener todos los documentos requeridos del tenant
 */
export async function getDocumentosRequeridos(
  tenantId: string,
  categoria?: CategoriaDocumento
): Promise<DocumentoRequerido[]> {
  let sql = `
    SELECT *
    FROM documentos_requeridos
    WHERE tenant_id = $1
      AND activo = true
  `;
  const params: any[] = [tenantId];

  if (categoria) {
    sql += ` AND categoria = $2`;
    params.push(categoria);
  }

  sql += ` ORDER BY categoria, orden_visualizacion ASC`;

  const result = await query(sql, params);

  return result.rows.map(row => ({
    ...row,
    tipos_archivo_permitidos: typeof row.tipos_archivo_permitidos === 'string'
      ? JSON.parse(row.tipos_archivo_permitidos)
      : row.tipos_archivo_permitidos,
  }));
}

/**
 * Obtener requerimientos de expediente por categoría (legacy - compatibilidad)
 */
export async function getRequerimientosExpediente(
  tenantId: string,
  categoria: CategoriaDocumento | 'cierre_venta' | 'cierre_alquiler' | 'cierre_renta'
): Promise<DocumentoRequerido[]> {
  // Mapear categorías legacy a nuevas
  let categoriaFinal = categoria;
  if (categoria === 'cierre_venta') {
    categoriaFinal = 'cierre_venta_lista';
  } else if (categoria === 'cierre_renta') {
    categoriaFinal = 'cierre_alquiler';
  }

  return getDocumentosRequeridos(tenantId, categoriaFinal as CategoriaDocumento);
}

/**
 * Obtener un documento requerido por ID
 */
export async function getDocumentoRequeridoById(
  tenantId: string,
  documentoId: string
): Promise<DocumentoRequerido | null> {
  const sql = `
    SELECT *
    FROM documentos_requeridos
    WHERE id = $1 AND tenant_id = $2
  `;

  const result = await query(sql, [documentoId, tenantId]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    ...row,
    tipos_archivo_permitidos: typeof row.tipos_archivo_permitidos === 'string'
      ? JSON.parse(row.tipos_archivo_permitidos)
      : row.tipos_archivo_permitidos,
  };
}

/**
 * Obtener documentos subidos de una venta
 */
export async function getDocumentosSubidos(
  tenantId: string,
  ventaId: string
): Promise<DocumentoSubido[]> {
  const sql = `
    SELECT *
    FROM documentos_subidos
    WHERE tenant_id = $1
      AND venta_id = $2
    ORDER BY created_at ASC
  `;

  const result = await query(sql, [tenantId, ventaId]);
  return result.rows;
}

// Alias para compatibilidad
export const getItemsExpediente = getDocumentosSubidos;

// ============================================================
// FUNCIONES CRUD PARA DOCUMENTOS REQUERIDOS
// ============================================================

/**
 * Crear un nuevo documento requerido
 */
export async function createDocumentoRequerido(
  tenantId: string,
  data: {
    titulo: string;
    descripcion?: string;
    instrucciones?: string;
    categoria: CategoriaDocumento;
    tipo?: string;
    requiere_documento?: boolean;
    es_obligatorio?: boolean;
    orden_visualizacion?: number;
    tipos_archivo_permitidos?: string[];
    tamaño_maximo_archivo?: number;
  }
): Promise<DocumentoRequerido> {
  // Obtener el máximo orden actual para esta categoría
  const maxOrdenResult = await query(
    `SELECT COALESCE(MAX(orden_visualizacion), 0) + 10 as next_orden
     FROM documentos_requeridos
     WHERE tenant_id = $1 AND categoria = $2`,
    [tenantId, data.categoria]
  );
  const nextOrden = data.orden_visualizacion ?? maxOrdenResult.rows[0].next_orden;

  const sql = `
    INSERT INTO documentos_requeridos (
      tenant_id, titulo, descripcion, instrucciones,
      categoria, tipo, requiere_documento, es_obligatorio,
      orden_visualizacion, tipos_archivo_permitidos, tamaño_maximo_archivo,
      activo
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true
    ) RETURNING *
  `;

  const result = await query(sql, [
    tenantId,
    data.titulo,
    data.descripcion || null,
    data.instrucciones || null,
    data.categoria,
    data.tipo || null,
    data.requiere_documento ?? true,
    data.es_obligatorio ?? false,
    nextOrden,
    JSON.stringify(data.tipos_archivo_permitidos || ['pdf', 'jpg', 'jpeg', 'png']),
    data.tamaño_maximo_archivo || 10485760, // 10MB default
  ]);

  const row = result.rows[0];
  return {
    ...row,
    tipos_archivo_permitidos: typeof row.tipos_archivo_permitidos === 'string'
      ? JSON.parse(row.tipos_archivo_permitidos)
      : row.tipos_archivo_permitidos,
  };
}

/**
 * Actualizar un documento requerido
 */
export async function updateDocumentoRequerido(
  tenantId: string,
  documentoId: string,
  data: {
    titulo?: string;
    descripcion?: string;
    instrucciones?: string;
    tipo?: string;
    requiere_documento?: boolean;
    es_obligatorio?: boolean;
    orden_visualizacion?: number;
    tipos_archivo_permitidos?: string[];
    tamaño_maximo_archivo?: number;
    activo?: boolean;
  }
): Promise<DocumentoRequerido | null> {
  // Construir query dinámicamente
  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (data.titulo !== undefined) {
    updates.push(`titulo = $${paramCount++}`);
    values.push(data.titulo);
  }
  if (data.descripcion !== undefined) {
    updates.push(`descripcion = $${paramCount++}`);
    values.push(data.descripcion);
  }
  if (data.instrucciones !== undefined) {
    updates.push(`instrucciones = $${paramCount++}`);
    values.push(data.instrucciones);
  }
  if (data.tipo !== undefined) {
    updates.push(`tipo = $${paramCount++}`);
    values.push(data.tipo);
  }
  if (data.requiere_documento !== undefined) {
    updates.push(`requiere_documento = $${paramCount++}`);
    values.push(data.requiere_documento);
  }
  if (data.es_obligatorio !== undefined) {
    updates.push(`es_obligatorio = $${paramCount++}`);
    values.push(data.es_obligatorio);
  }
  if (data.orden_visualizacion !== undefined) {
    updates.push(`orden_visualizacion = $${paramCount++}`);
    values.push(data.orden_visualizacion);
  }
  if (data.tipos_archivo_permitidos !== undefined) {
    updates.push(`tipos_archivo_permitidos = $${paramCount++}`);
    values.push(JSON.stringify(data.tipos_archivo_permitidos));
  }
  if (data.tamaño_maximo_archivo !== undefined) {
    updates.push(`tamaño_maximo_archivo = $${paramCount++}`);
    values.push(data.tamaño_maximo_archivo);
  }
  if (data.activo !== undefined) {
    updates.push(`activo = $${paramCount++}`);
    values.push(data.activo);
  }

  if (updates.length === 0) {
    return getDocumentoRequeridoById(tenantId, documentoId);
  }

  updates.push(`updated_at = NOW()`);
  values.push(documentoId, tenantId);

  const sql = `
    UPDATE documentos_requeridos
    SET ${updates.join(', ')}
    WHERE id = $${paramCount++} AND tenant_id = $${paramCount}
    RETURNING *
  `;

  const result = await query(sql, values);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    ...row,
    tipos_archivo_permitidos: typeof row.tipos_archivo_permitidos === 'string'
      ? JSON.parse(row.tipos_archivo_permitidos)
      : row.tipos_archivo_permitidos,
  };
}

/**
 * Eliminar un documento requerido (soft delete)
 */
export async function deleteDocumentoRequerido(
  tenantId: string,
  documentoId: string
): Promise<boolean> {
  const sql = `
    UPDATE documentos_requeridos
    SET activo = false, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
  `;

  const result = await query(sql, [documentoId, tenantId]);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Reordenar documentos requeridos
 */
export async function reordenarDocumentosRequeridos(
  tenantId: string,
  items: Array<{ id: string; orden: number }>
): Promise<void> {
  for (const item of items) {
    await query(
      `UPDATE documentos_requeridos
       SET orden_visualizacion = $1, updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3`,
      [item.orden, item.id, tenantId]
    );
  }
}

// ============================================================
// FUNCIONES PARA DOCUMENTOS SUBIDOS
// ============================================================

/**
 * Crear o actualizar un documento subido
 */
export async function upsertDocumentoSubido(
  tenantId: string,
  ventaId: string,
  requerimientoId: string,
  itemData: {
    url_documento: string;
    ruta_documento: string;
    tipo_archivo: string;
    tamaño_archivo: number;
    nombre_documento: string;
    subido_por_id?: string;
  }
): Promise<DocumentoSubido> {
  // Obtener el requerimiento para copiar sus datos
  const requerimientoSql = `
    SELECT *
    FROM documentos_requeridos
    WHERE id = $1 AND tenant_id = $2
  `;
  const requerimientoResult = await query(requerimientoSql, [requerimientoId, tenantId]);

  if (requerimientoResult.rows.length === 0) {
    throw new Error('Requerimiento no encontrado');
  }

  const requerimiento = requerimientoResult.rows[0];

  // Verificar si ya existe un item para este requerimiento
  const existingSql = `
    SELECT id
    FROM documentos_subidos
    WHERE venta_id = $1 AND requerimiento_id = $2
  `;
  const existingResult = await query(existingSql, [ventaId, requerimientoId]);

  const itemDataComplete = {
    tenant_id: tenantId,
    venta_id: ventaId,
    requerimiento_id: requerimientoId,
    titulo: requerimiento.titulo,
    descripcion: requerimiento.descripcion,
    categoria: requerimiento.categoria,
    tipo: requerimiento.tipo,
    requiere_documento: requerimiento.requiere_documento,
    es_obligatorio: requerimiento.es_obligatorio,
    estado: 'completado',
    url_documento: itemData.url_documento,
    ruta_documento: itemData.ruta_documento,
    tipo_archivo: itemData.tipo_archivo,
    tamaño_archivo: itemData.tamaño_archivo,
    nombre_documento: itemData.nombre_documento,
    fecha_subida_documento: new Date().toISOString(),
    subido_por_id: itemData.subido_por_id || null,
    updated_at: new Date().toISOString(),
  };

  if (existingResult.rows.length > 0) {
    // Actualizar existente
    const updateSql = `
      UPDATE documentos_subidos
      SET
        url_documento = $1,
        ruta_documento = $2,
        tipo_archivo = $3,
        tamaño_archivo = $4,
        nombre_documento = $5,
        fecha_subida_documento = $6,
        subido_por_id = $7,
        estado = 'completado',
        updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `;
    const updateResult = await query(updateSql, [
      itemDataComplete.url_documento,
      itemDataComplete.ruta_documento,
      itemDataComplete.tipo_archivo,
      itemDataComplete.tamaño_archivo,
      itemDataComplete.nombre_documento,
      itemDataComplete.fecha_subida_documento,
      itemDataComplete.subido_por_id,
      existingResult.rows[0].id,
    ]);
    return updateResult.rows[0];
  } else {
    // Crear nuevo
    const insertSql = `
      INSERT INTO documentos_subidos (
        tenant_id, venta_id, requerimiento_id,
        titulo, descripcion, categoria, tipo,
        requiere_documento, es_obligatorio, estado,
        url_documento, ruta_documento, tipo_archivo,
        tamaño_archivo, nombre_documento,
        fecha_subida_documento, subido_por_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17
      ) RETURNING *
    `;
    const insertResult = await query(insertSql, [
      itemDataComplete.tenant_id,
      itemDataComplete.venta_id,
      itemDataComplete.requerimiento_id,
      itemDataComplete.titulo,
      itemDataComplete.descripcion,
      itemDataComplete.categoria,
      itemDataComplete.tipo,
      itemDataComplete.requiere_documento,
      itemDataComplete.es_obligatorio,
      itemDataComplete.estado,
      itemDataComplete.url_documento,
      itemDataComplete.ruta_documento,
      itemDataComplete.tipo_archivo,
      itemDataComplete.tamaño_archivo,
      itemDataComplete.nombre_documento,
      itemDataComplete.fecha_subida_documento,
      itemDataComplete.subido_por_id,
    ]);
    return insertResult.rows[0];
  }
}

// Alias para compatibilidad
export const upsertItemExpediente = upsertDocumentoSubido;

/**
 * Eliminar un documento subido
 */
export async function deleteDocumentoSubido(
  tenantId: string,
  itemId: string
): Promise<void> {
  const sql = `
    DELETE FROM documentos_subidos
    WHERE id = $1 AND tenant_id = $2
  `;
  await query(sql, [itemId, tenantId]);
}

// Alias para compatibilidad
export const deleteItemExpediente = deleteDocumentoSubido;
