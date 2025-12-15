import { query } from '../utils/db';

export interface RequerimientoExpediente {
  id: string;
  tenant_id: string;
  titulo: string;
  descripcion: string | null;
  instrucciones: string | null;
  categoria: string;
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

export interface ItemExpediente {
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

/**
 * Obtener requerimientos de expediente por categoría
 */
export async function getRequerimientosExpediente(
  tenantId: string,
  categoria: 'cierre_venta' | 'cierre_alquiler' | 'cierre_renta'
): Promise<RequerimientoExpediente[]> {
  const sql = `
    SELECT *
    FROM ventas_expediente_requerimientos
    WHERE tenant_id = $1
      AND categoria = $2
      AND activo = true
    ORDER BY orden_visualizacion ASC
  `;

  const result = await query(sql, [tenantId, categoria]);

  return result.rows.map(row => ({
    ...row,
    tipos_archivo_permitidos: typeof row.tipos_archivo_permitidos === 'string'
      ? JSON.parse(row.tipos_archivo_permitidos)
      : row.tipos_archivo_permitidos,
  }));
}

/**
 * Obtener items de expediente de una venta
 */
export async function getItemsExpediente(
  tenantId: string,
  ventaId: string
): Promise<ItemExpediente[]> {
  const sql = `
    SELECT *
    FROM ventas_expediente_items
    WHERE tenant_id = $1
      AND venta_id = $2
    ORDER BY created_at ASC
  `;

  const result = await query(sql, [tenantId, ventaId]);
  return result.rows;
}

/**
 * Crear o actualizar un item de expediente
 */
export async function upsertItemExpediente(
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
): Promise<ItemExpediente> {
  // Primero obtener el requerimiento para copiar sus datos
  const requerimientoSql = `
    SELECT *
    FROM ventas_expediente_requerimientos
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
    FROM ventas_expediente_items
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
      UPDATE ventas_expediente_items
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
      INSERT INTO ventas_expediente_items (
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

/**
 * Eliminar un item de expediente
 */
export async function deleteItemExpediente(
  tenantId: string,
  itemId: string
): Promise<void> {
  const sql = `
    DELETE FROM ventas_expediente_items
    WHERE id = $1 AND tenant_id = $2
  `;
  await query(sql, [itemId, tenantId]);
}













