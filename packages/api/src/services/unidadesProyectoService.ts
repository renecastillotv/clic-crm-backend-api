/**
 * Servicio de Unidades de Proyecto
 *
 * Gestiona el inventario de unidades para proyectos inmobiliarios
 */

import { query } from '../utils/db.js';

// Tipos
export interface UnidadProyecto {
  id: string;
  propiedad_id: string;
  tenant_id: string;
  codigo: string;
  tipologia_id?: string;
  tipologia_nombre?: string;
  habitaciones?: number;
  banos?: number;
  m2?: number;
  precio?: number;
  moneda?: string;
  torre?: string;
  piso?: string;
  nivel?: string;
  estado: 'disponible' | 'reservada' | 'bloqueada' | 'vendida';
  fecha_reserva?: Date;
  fecha_venta?: Date;
  reservado_por?: string;
  vendido_a?: string;
  notas?: string;
  orden?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface DisponibilidadConfig {
  tipo: 'enlace' | 'archivo' | 'inventario';
  enlace_url?: string;
  archivo_url?: string;
  archivo_nombre?: string;
}

export interface EstadisticasUnidades {
  total: number;
  disponibles: number;
  reservadas: number;
  bloqueadas: number;
  vendidas: number;
  porcentaje_vendido: number;
}

// ============ CRUD de Unidades ============

/**
 * Obtiene todas las unidades de un proyecto
 */
export async function getUnidadesByPropiedad(
  tenantId: string,
  propiedadId: string
): Promise<UnidadProyecto[]> {
  const sql = `
    SELECT *
    FROM unidades_proyecto
    WHERE tenant_id = $1 AND propiedad_id = $2
    ORDER BY orden, codigo
  `;

  const result = await query(sql, [tenantId, propiedadId]);
  return result.rows;
}

/**
 * Obtiene una unidad por ID
 */
export async function getUnidadById(
  tenantId: string,
  unidadId: string
): Promise<UnidadProyecto | null> {
  const sql = `
    SELECT *
    FROM unidades_proyecto
    WHERE tenant_id = $1 AND id = $2
  `;

  const result = await query(sql, [tenantId, unidadId]);
  return result.rows[0] || null;
}

/**
 * Crea una nueva unidad
 */
export async function createUnidad(
  tenantId: string,
  propiedadId: string,
  data: Partial<UnidadProyecto>
): Promise<UnidadProyecto> {
  const sql = `
    INSERT INTO unidades_proyecto (
      tenant_id, propiedad_id, codigo, tipologia_id, tipologia_nombre,
      habitaciones, banos, m2, precio, moneda,
      torre, piso, nivel, estado, notas, orden
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *
  `;

  const result = await query(sql, [
    tenantId,
    propiedadId,
    data.codigo,
    data.tipologia_id || null,
    data.tipologia_nombre || null,
    data.habitaciones || null,
    data.banos || null,
    data.m2 || null,
    data.precio || null,
    data.moneda || 'USD',
    data.torre || null,
    data.piso || null,
    data.nivel || null,
    data.estado || 'disponible',
    data.notas || null,
    data.orden || 0
  ]);

  return result.rows[0];
}

/**
 * Actualiza una unidad
 */
export async function updateUnidad(
  tenantId: string,
  unidadId: string,
  data: Partial<UnidadProyecto>
): Promise<UnidadProyecto | null> {
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  const allowedFields = [
    'codigo', 'tipologia_id', 'tipologia_nombre',
    'habitaciones', 'banos', 'm2', 'precio', 'moneda',
    'torre', 'piso', 'nivel', 'estado',
    'fecha_reserva', 'fecha_venta', 'reservado_por', 'vendido_a',
    'notas', 'orden'
  ];

  for (const field of allowedFields) {
    if (data[field as keyof UnidadProyecto] !== undefined) {
      updates.push(`${field} = $${paramIndex}`);
      params.push(data[field as keyof UnidadProyecto]);
      paramIndex++;
    }
  }

  if (updates.length === 0) {
    return getUnidadById(tenantId, unidadId);
  }

  updates.push('updated_at = NOW()');

  const sql = `
    UPDATE unidades_proyecto
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
    RETURNING *
  `;
  params.push(unidadId, tenantId);

  const result = await query(sql, params);
  return result.rows[0] || null;
}

/**
 * Elimina una unidad
 */
export async function deleteUnidad(
  tenantId: string,
  unidadId: string
): Promise<boolean> {
  const sql = `
    DELETE FROM unidades_proyecto
    WHERE id = $1 AND tenant_id = $2
    RETURNING id
  `;

  const result = await query(sql, [unidadId, tenantId]);
  return result.rows.length > 0;
}

/**
 * Elimina todas las unidades de un proyecto
 */
export async function deleteUnidadesByPropiedad(
  tenantId: string,
  propiedadId: string
): Promise<number> {
  const sql = `
    DELETE FROM unidades_proyecto
    WHERE propiedad_id = $1 AND tenant_id = $2
    RETURNING id
  `;

  const result = await query(sql, [propiedadId, tenantId]);
  return result.rows.length;
}

// ============ Operaciones de Estado ============

/**
 * Cambia el estado de una unidad
 */
export async function cambiarEstadoUnidad(
  tenantId: string,
  unidadId: string,
  nuevoEstado: UnidadProyecto['estado'],
  contactoId?: string
): Promise<UnidadProyecto | null> {
  let updateData: Partial<UnidadProyecto> = { estado: nuevoEstado };

  // Actualizar campos de tracking según el estado
  if (nuevoEstado === 'reservada') {
    updateData.fecha_reserva = new Date();
    if (contactoId) updateData.reservado_por = contactoId;
  } else if (nuevoEstado === 'vendida') {
    updateData.fecha_venta = new Date();
    if (contactoId) updateData.vendido_a = contactoId;
  } else if (nuevoEstado === 'disponible') {
    // Limpiar tracking al volver a disponible
    updateData.fecha_reserva = undefined;
    updateData.fecha_venta = undefined;
    updateData.reservado_por = undefined;
    updateData.vendido_a = undefined;
  }

  return updateUnidad(tenantId, unidadId, updateData);
}

/**
 * Cambio masivo de estado
 */
export async function cambiarEstadoMasivo(
  tenantId: string,
  unidadIds: string[],
  nuevoEstado: UnidadProyecto['estado']
): Promise<number> {
  if (unidadIds.length === 0) return 0;

  const placeholders = unidadIds.map((_, i) => `$${i + 3}`).join(', ');

  let fechaField = '';
  if (nuevoEstado === 'reservada') {
    fechaField = ', fecha_reserva = NOW()';
  } else if (nuevoEstado === 'vendida') {
    fechaField = ', fecha_venta = NOW()';
  }

  const sql = `
    UPDATE unidades_proyecto
    SET estado = $1, updated_at = NOW() ${fechaField}
    WHERE tenant_id = $2 AND id IN (${placeholders})
    RETURNING id
  `;

  const result = await query(sql, [nuevoEstado, tenantId, ...unidadIds]);
  return result.rows.length;
}

// ============ Estadísticas ============

/**
 * Obtiene estadísticas de disponibilidad de un proyecto
 */
export async function getEstadisticasProyecto(
  tenantId: string,
  propiedadId: string
): Promise<EstadisticasUnidades> {
  const sql = `
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE estado = 'disponible') as disponibles,
      COUNT(*) FILTER (WHERE estado = 'reservada') as reservadas,
      COUNT(*) FILTER (WHERE estado = 'bloqueada') as bloqueadas,
      COUNT(*) FILTER (WHERE estado = 'vendida') as vendidas
    FROM unidades_proyecto
    WHERE tenant_id = $1 AND propiedad_id = $2
  `;

  const result = await query(sql, [tenantId, propiedadId]);
  const row = result.rows[0];

  const total = parseInt(row.total) || 0;
  const vendidas = parseInt(row.vendidas) || 0;

  return {
    total,
    disponibles: parseInt(row.disponibles) || 0,
    reservadas: parseInt(row.reservadas) || 0,
    bloqueadas: parseInt(row.bloqueadas) || 0,
    vendidas,
    porcentaje_vendido: total > 0 ? Math.round((vendidas / total) * 100) : 0
  };
}

// ============ Import/Export ============

/**
 * Importa unidades desde un array (usado para Excel/CSV)
 */
export async function importarUnidades(
  tenantId: string,
  propiedadId: string,
  unidades: Partial<UnidadProyecto>[],
  modo: 'agregar' | 'reemplazar' = 'agregar'
): Promise<{ creadas: number; actualizadas: number; errores: string[] }> {
  const errores: string[] = [];
  let creadas = 0;
  let actualizadas = 0;

  // Si es reemplazar, primero eliminamos todas
  if (modo === 'reemplazar') {
    await deleteUnidadesByPropiedad(tenantId, propiedadId);
  }

  for (const unidad of unidades) {
    try {
      if (!unidad.codigo) {
        errores.push('Unidad sin código, saltada');
        continue;
      }

      // Verificar si ya existe
      const existente = await query(
        `SELECT id FROM unidades_proyecto WHERE propiedad_id = $1 AND codigo = $2 AND tenant_id = $3`,
        [propiedadId, unidad.codigo, tenantId]
      );

      if (existente.rows.length > 0 && modo === 'agregar') {
        // Actualizar existente
        await updateUnidad(tenantId, existente.rows[0].id, unidad);
        actualizadas++;
      } else {
        // Crear nueva
        await createUnidad(tenantId, propiedadId, unidad);
        creadas++;
      }
    } catch (error: any) {
      errores.push(`Error en unidad ${unidad.codigo}: ${error.message}`);
    }
  }

  return { creadas, actualizadas, errores };
}

/**
 * Exporta unidades a formato para Excel
 */
export async function exportarUnidades(
  tenantId: string,
  propiedadId: string
): Promise<any[]> {
  const unidades = await getUnidadesByPropiedad(tenantId, propiedadId);

  return unidades.map(u => ({
    Código: u.codigo,
    Tipología: u.tipologia_nombre || '',
    Habitaciones: u.habitaciones || '',
    Baños: u.banos || '',
    M2: u.m2 || '',
    Precio: u.precio || '',
    Moneda: u.moneda || 'USD',
    Torre: u.torre || '',
    Piso: u.piso || '',
    Nivel: u.nivel || '',
    Estado: u.estado,
    'Fecha Reserva': u.fecha_reserva ? new Date(u.fecha_reserva).toLocaleDateString() : '',
    'Fecha Venta': u.fecha_venta ? new Date(u.fecha_venta).toLocaleDateString() : '',
    Notas: u.notas || ''
  }));
}

// ============ Configuración de Disponibilidad ============

/**
 * Obtiene la configuración de disponibilidad de una propiedad
 */
export async function getDisponibilidadConfig(
  tenantId: string,
  propiedadId: string
): Promise<DisponibilidadConfig | null> {
  const sql = `
    SELECT disponibilidad_config
    FROM propiedades
    WHERE id = $1 AND tenant_id = $2
  `;

  const result = await query(sql, [propiedadId, tenantId]);
  return result.rows[0]?.disponibilidad_config || null;
}

/**
 * Actualiza la configuración de disponibilidad
 */
export async function updateDisponibilidadConfig(
  tenantId: string,
  propiedadId: string,
  config: DisponibilidadConfig
): Promise<DisponibilidadConfig> {
  const sql = `
    UPDATE propiedades
    SET disponibilidad_config = $1, updated_at = NOW()
    WHERE id = $2 AND tenant_id = $3
    RETURNING disponibilidad_config
  `;

  const result = await query(sql, [JSON.stringify(config), propiedadId, tenantId]);
  return result.rows[0]?.disponibilidad_config;
}
