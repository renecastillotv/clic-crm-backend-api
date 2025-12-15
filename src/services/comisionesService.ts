/**
 * Servicio de Comisiones
 * 
 * Gestiona las comisiones de los usuarios basadas en ventas
 */

import { query } from '../utils/db';

export interface Comision {
  id: string;
  tenant_id: string;
  venta_id: string;
  usuario_id: string;
  monto: number;
  moneda: string;
  porcentaje: number | null;
  estado: string;
  monto_pagado: number;
  fecha_pago: Date | null;
  tipo: string;
  notas: string | null;
  datos_extra: any;
  created_at: Date;
  updated_at: Date;
  
  // Nuevos campos (snapshot de split)
  split_porcentaje_vendedor?: number | null;
  split_porcentaje_owner?: number | null;
  contacto_externo_id?: string | null;
  fecha_entrega_proyecto?: Date | null;
  
  // Relaciones
  venta?: any;
  usuario?: any;
}

export interface CreateComisionData {
  venta_id: string;
  usuario_id: string;
  monto: number;
  moneda?: string;
  porcentaje?: number;
  tipo?: string;
  notas?: string;
  datos_extra?: any;
  // Nuevos campos
  split_porcentaje_vendedor?: number | null;
  split_porcentaje_owner?: number | null;
  contacto_externo_id?: string | null;
  fecha_entrega_proyecto?: Date | string | null;
}

export interface UpdateComisionData {
  estado?: string;
  monto?: number;
  monto_pagado?: number;
  fecha_pago?: Date | string;
  porcentaje?: number;
  moneda?: string;
  notas?: string;
  datos_extra?: any;
}

/**
 * Obtener comisiones de un usuario
 */
export async function getComisionesUsuario(
  tenantId: string,
  usuarioId: string,
  filters?: {
    estado?: string;
    fechaDesde?: Date | string;
    fechaHasta?: Date | string;
    tipo?: string;
  }
): Promise<Comision[]> {
  let sql = `
    SELECT 
      c.*,
      v.numero_venta,
      v.nombre_negocio,
      v.valor_cierre,
      v.moneda as venta_moneda,
      v.fecha_cierre,
      u.nombre as usuario_nombre,
      u.apellido as usuario_apellido,
      t.nombre as tenant_nombre,
      CASE 
        WHEN c.datos_extra->>'split' = 'owner' THEN t.nombre
        ELSE COALESCE(u.nombre || ' ' || u.apellido, u.nombre, u.apellido, 'Usuario')
      END as nombre_display
    FROM comisiones c
    INNER JOIN ventas v ON c.venta_id = v.id
    LEFT JOIN usuarios u ON c.usuario_id = u.id
    LEFT JOIN tenants t ON c.tenant_id = t.id
    WHERE c.tenant_id = $1 AND c.usuario_id = $2
  `;

  const params: any[] = [tenantId, usuarioId];
  let paramIndex = 3;

  if (filters) {
    if (filters.estado) {
      sql += ` AND c.estado = $${paramIndex}`;
      params.push(filters.estado);
      paramIndex++;
    }
    
    if (filters.fechaDesde) {
      sql += ` AND v.fecha_cierre >= $${paramIndex}`;
      params.push(filters.fechaDesde);
      paramIndex++;
    }
    
    if (filters.fechaHasta) {
      sql += ` AND v.fecha_cierre <= $${paramIndex}`;
      params.push(filters.fechaHasta);
      paramIndex++;
    }
    
    if (filters.tipo) {
      sql += ` AND c.tipo = $${paramIndex}`;
      params.push(filters.tipo);
      paramIndex++;
    }
  }

  sql += ` ORDER BY v.fecha_cierre DESC, c.created_at DESC`;

  const result = await query(sql, params);
  
  return result.rows.map(row => ({
    ...row,
    datos_extra: typeof row.datos_extra === 'string' ? JSON.parse(row.datos_extra) : row.datos_extra,
    venta: {
      id: row.venta_id,
      numero_venta: row.numero_venta,
      nombre_negocio: row.nombre_negocio,
      valor_cierre: row.valor_cierre,
      moneda: row.venta_moneda,
      fecha_cierre: row.fecha_cierre,
    },
    usuario: {
      id: row.usuario_id,
      nombre: row.datos_extra?.split === 'owner' ? row.tenant_nombre : (row.usuario_nombre || ''),
      apellido: row.datos_extra?.split === 'owner' ? '' : (row.usuario_apellido || ''),
      nombre_display: row.nombre_display || (row.usuario_nombre || '') + ' ' + (row.usuario_apellido || ''),
    },
  }));
}

/**
 * Obtener todas las comisiones de un tenant
 */
export async function getComisiones(
  tenantId: string,
  filters?: {
    usuarioId?: string;
    usuarioIds?: string[];
    ventaId?: string;
    estado?: string;
    fechaDesde?: Date | string;
    fechaHasta?: Date | string;
    tipo?: string;
    incluirTenant?: boolean;
  }
): Promise<Comision[]> {
  let sql = `
    SELECT 
      c.*,
      v.numero_venta,
      v.nombre_negocio,
      v.valor_cierre,
      v.moneda as venta_moneda,
      v.fecha_cierre,
      u.nombre as usuario_nombre,
      u.apellido as usuario_apellido,
      t.nombre as tenant_nombre,
      CASE 
        WHEN c.datos_extra->>'split' = 'owner' THEN t.nombre
        ELSE COALESCE(u.nombre || ' ' || u.apellido, u.nombre, u.apellido, 'Usuario')
      END as nombre_display
    FROM comisiones c
    INNER JOIN ventas v ON c.venta_id = v.id
    LEFT JOIN usuarios u ON c.usuario_id = u.id
    LEFT JOIN tenants t ON c.tenant_id = t.id
    WHERE c.tenant_id = $1
  `;

  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (filters) {
    // Construir condiciones para filtros de usuario/tenant
    const condicionesUsuario: string[] = [];
    
    // Filtrar por tenant (comisiones con split='owner')
    if (filters.incluirTenant) {
      condicionesUsuario.push(`c.datos_extra->>'split' = 'owner'`);
    }
    
    // Filtrar por múltiples usuarios
    if (filters.usuarioIds && filters.usuarioIds.length > 0) {
      const placeholders = filters.usuarioIds.map((_, i) => `$${paramIndex + i}`).join(', ');
      condicionesUsuario.push(`c.usuario_id IN (${placeholders})`);
      params.push(...filters.usuarioIds);
      paramIndex += filters.usuarioIds.length;
    } else if (filters.usuarioId) {
      condicionesUsuario.push(`c.usuario_id = $${paramIndex}`);
      params.push(filters.usuarioId);
      paramIndex++;
    }
    
    // Si hay condiciones de usuario/tenant, aplicarlas con OR si hay múltiples, o AND si solo hay una
    if (condicionesUsuario.length > 0) {
      if (condicionesUsuario.length === 1) {
        sql += ` AND ${condicionesUsuario[0]}`;
      } else {
        // Si hay múltiples condiciones (incluirTenant + usuarioIds), usar OR
        sql += ` AND (${condicionesUsuario.join(' OR ')})`;
      }
    }
    
    if (filters.ventaId) {
      sql += ` AND c.venta_id = $${paramIndex}`;
      params.push(filters.ventaId);
      paramIndex++;
    }
    
    if (filters.estado) {
      sql += ` AND c.estado = $${paramIndex}`;
      params.push(filters.estado);
      paramIndex++;
    }
    
    if (filters.fechaDesde) {
      sql += ` AND v.fecha_cierre >= $${paramIndex}`;
      params.push(filters.fechaDesde);
      paramIndex++;
    }
    
    if (filters.fechaHasta) {
      sql += ` AND v.fecha_cierre <= $${paramIndex}`;
      params.push(filters.fechaHasta);
      paramIndex++;
    }
    
    if (filters.tipo) {
      sql += ` AND c.tipo = $${paramIndex}`;
      params.push(filters.tipo);
      paramIndex++;
    }
  }

  sql += ` ORDER BY v.fecha_cierre DESC, c.created_at DESC`;

  const result = await query(sql, params);
  
  return result.rows.map(row => ({
    ...row,
    datos_extra: typeof row.datos_extra === 'string' ? JSON.parse(row.datos_extra) : row.datos_extra,
    venta: {
      id: row.venta_id,
      numero_venta: row.numero_venta,
      nombre_negocio: row.nombre_negocio,
      valor_cierre: row.valor_cierre,
      moneda: row.venta_moneda,
      fecha_cierre: row.fecha_cierre,
    },
    usuario: {
      id: row.usuario_id,
      nombre: row.datos_extra?.split === 'owner' ? row.tenant_nombre : (row.usuario_nombre || ''),
      apellido: row.datos_extra?.split === 'owner' ? '' : (row.usuario_apellido || ''),
      nombre_display: row.nombre_display || (row.usuario_nombre || '') + ' ' + (row.usuario_apellido || ''),
    },
  }));
}

/**
 * Obtener una comisión por ID
 */
export async function getComisionById(tenantId: string, comisionId: string): Promise<Comision | null> {
  const sql = `
    SELECT 
      c.*,
      v.numero_venta,
      v.nombre_negocio,
      v.valor_cierre,
      v.moneda as venta_moneda,
      v.fecha_cierre,
      u.nombre as usuario_nombre,
      u.apellido as usuario_apellido,
      t.nombre as tenant_nombre,
      CASE 
        WHEN c.datos_extra->>'split' = 'owner' THEN t.nombre
        ELSE COALESCE(u.nombre || ' ' || u.apellido, u.nombre, u.apellido, 'Usuario')
      END as nombre_display
    FROM comisiones c
    INNER JOIN ventas v ON c.venta_id = v.id
    LEFT JOIN usuarios u ON c.usuario_id = u.id
    LEFT JOIN tenants t ON c.tenant_id = t.id
    WHERE c.id = $1 AND c.tenant_id = $2
  `;

  const result = await query(sql, [comisionId, tenantId]);
  
  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  const datosExtra = typeof row.datos_extra === 'string' ? JSON.parse(row.datos_extra) : row.datos_extra;
  return {
    ...row,
    datos_extra: datosExtra,
    venta: {
      id: row.venta_id,
      numero_venta: row.numero_venta,
      nombre_negocio: row.nombre_negocio,
      valor_cierre: row.valor_cierre,
      moneda: row.venta_moneda,
      fecha_cierre: row.fecha_cierre,
    },
    usuario: {
      id: row.usuario_id,
      nombre: datosExtra?.split === 'owner' ? row.tenant_nombre : (row.usuario_nombre || ''),
      apellido: datosExtra?.split === 'owner' ? '' : (row.usuario_apellido || ''),
      nombre_display: row.nombre_display || (row.usuario_nombre || '') + ' ' + (row.usuario_apellido || ''),
    },
  };
}

/**
 * Obtener el dueño del tenant
 */
async function getTenantOwner(tenantId: string): Promise<string | null> {
  const sql = `
    SELECT usuario_id
    FROM usuarios_tenants
    WHERE tenant_id = $1 AND es_owner = true AND activo = true
    LIMIT 1
  `;
  
  const result = await query(sql, [tenantId]);
  return result.rows.length > 0 ? result.rows[0].usuario_id : null;
}

/**
 * Calcular y crear comisiones automáticamente para una venta
 * Split: 70% vendedor, 30% dueño del tenant
 */
export async function calcularYCrearComisiones(
  tenantId: string,
  ventaId: string,
  montoComisionTotal: number,
  moneda: string,
  porcentajeComision: number,
  usuarioVendedorId: string | null
): Promise<Comision[]> {
  if (!montoComisionTotal || montoComisionTotal <= 0) {
    console.log('⚠️ No se pueden crear comisiones: monto de comisión es 0 o inválido');
    return [];
  }

  // Verificar si ya existen comisiones para esta venta
  const comisionesExistentes = await query(
    `SELECT id FROM comisiones WHERE venta_id = $1 AND tenant_id = $2`,
    [ventaId, tenantId]
  );

  if (comisionesExistentes.rows.length > 0) {
    console.log('⚠️ Ya existen comisiones para esta venta, actualizando en lugar de crear nuevas');
    // Actualizar comisiones existentes en lugar de crear nuevas
    return await actualizarComisionesExistentes(
      tenantId,
      ventaId,
      montoComisionTotal,
      moneda,
      porcentajeComision,
      usuarioVendedorId
    );
  }

  const comisionesCreadas: Comision[] = [];
  const ownerId = await getTenantOwner(tenantId);

  // Comisión para el vendedor (70%) - Guardar snapshot del split
  if (usuarioVendedorId) {
    const montoVendedor = montoComisionTotal * 0.7;
    const comisionVendedor = await createComision(tenantId, {
      venta_id: ventaId,
      usuario_id: usuarioVendedorId,
      monto: montoVendedor,
      moneda: moneda,
      porcentaje: porcentajeComision * 0.7,
      tipo: 'venta',
      datos_extra: {
        split: 'vendedor',
        porcentajeSplit: 70,
        montoTotalComision: montoComisionTotal,
      },
      // Snapshot del split en el momento de la venta
      split_porcentaje_vendedor: 70,
      split_porcentaje_owner: 30,
    });
    comisionesCreadas.push(comisionVendedor);
  }

  // Comisión para el dueño del tenant (30%) - Guardar snapshot del split
  if (ownerId) {
    const montoOwner = montoComisionTotal * 0.3;
    const comisionOwner = await createComision(tenantId, {
      venta_id: ventaId,
      usuario_id: ownerId,
      monto: montoOwner,
      moneda: moneda,
      porcentaje: porcentajeComision * 0.3,
      tipo: 'venta',
      datos_extra: {
        split: 'owner',
        porcentajeSplit: 30,
        montoTotalComision: montoComisionTotal,
      },
      // Snapshot del split en el momento de la venta
      split_porcentaje_vendedor: 70,
      split_porcentaje_owner: 30,
    });
    comisionesCreadas.push(comisionOwner);
  }

  console.log(`✅ Comisiones creadas para venta ${ventaId}: ${comisionesCreadas.length} comisiones`);
  return comisionesCreadas;
}

/**
 * Actualizar comisiones existentes cuando cambia el monto de comisión de la venta
 */
async function actualizarComisionesExistentes(
  tenantId: string,
  ventaId: string,
  montoComisionTotal: number,
  moneda: string,
  porcentajeComision: number,
  usuarioVendedorId: string | null
): Promise<Comision[]> {
  // Obtener comisiones existentes
  const comisionesExistentes = await getComisiones(tenantId, { ventaId });
  const ownerId = await getTenantOwner(tenantId);
  const comisionesActualizadas: Comision[] = [];

  for (const comision of comisionesExistentes) {
    const split = comision.datos_extra?.split;
    let nuevoMonto: number;
    let nuevoPorcentaje: number;

    // Usar el snapshot del split original si existe, si no usar el split actual
    const splitVendedor = comision.split_porcentaje_vendedor ?? (split === 'vendedor' ? 70 : null);
    const splitOwner = comision.split_porcentaje_owner ?? (split === 'owner' ? 30 : null);

    if (split === 'vendedor' && splitVendedor !== null) {
      // Usar el snapshot del split original (puede ser diferente de 70% si cambió después)
      nuevoMonto = montoComisionTotal * (splitVendedor / 100);
      nuevoPorcentaje = porcentajeComision * (splitVendedor / 100);
    } else if (split === 'owner' && splitOwner !== null) {
      // Usar el snapshot del split original (puede ser diferente de 30% si cambió después)
      nuevoMonto = montoComisionTotal * (splitOwner / 100);
      nuevoPorcentaje = porcentajeComision * (splitOwner / 100);
    } else {
      // Si no tiene split definido, mantener el monto proporcional
      const ratio = comision.monto / (comisionesExistentes.reduce((sum, c) => sum + c.monto, 0) || 1);
      nuevoMonto = montoComisionTotal * ratio;
      nuevoPorcentaje = porcentajeComision * ratio;
    }

    // Actualizar la comisión
    const datosExtra = {
      ...comision.datos_extra,
      split: split || (comision.usuario_id === ownerId ? 'owner' : 'vendedor'),
      porcentajeSplit: split === 'vendedor' ? 70 : split === 'owner' ? 30 : (comision.monto / montoComisionTotal) * 100,
      montoTotalComision: montoComisionTotal,
    };

    // Actualizar directamente en la base de datos para incluir monto y porcentaje
    const updateSql = `
      UPDATE comisiones
      SET monto = $1, porcentaje = $2, moneda = $3, datos_extra = $4, updated_at = NOW()
      WHERE id = $5 AND tenant_id = $6
      RETURNING *
    `;
    const updateResult = await query(updateSql, [
      nuevoMonto,
      nuevoPorcentaje,
      moneda,
      JSON.stringify(datosExtra),
      comision.id,
      tenantId
    ]);

    const comisionActualizada = {
      ...updateResult.rows[0],
      datos_extra: typeof updateResult.rows[0].datos_extra === 'string' 
        ? JSON.parse(updateResult.rows[0].datos_extra) 
        : updateResult.rows[0].datos_extra,
      venta: comision.venta,
      usuario: comision.usuario,
    };

    comisionesActualizadas.push(comisionActualizada);
  }

  // Si no existe comisión para el vendedor y hay vendedor, crearla
  if (usuarioVendedorId && !comisionesExistentes.find(c => c.datos_extra?.split === 'vendedor')) {
    const montoVendedor = montoComisionTotal * 0.7;
    const comisionVendedor = await createComision(tenantId, {
      venta_id: ventaId,
      usuario_id: usuarioVendedorId,
      monto: montoVendedor,
      moneda: moneda,
      porcentaje: porcentajeComision * 0.7,
      tipo: 'venta',
      datos_extra: {
        split: 'vendedor',
        porcentajeSplit: 70,
        montoTotalComision: montoComisionTotal,
      },
    });
    comisionesActualizadas.push(comisionVendedor);
  }

  // Si no existe comisión para el owner y hay owner, crearla
  if (ownerId && !comisionesExistentes.find(c => c.datos_extra?.split === 'owner')) {
    const montoOwner = montoComisionTotal * 0.3;
    const comisionOwner = await createComision(tenantId, {
      venta_id: ventaId,
      usuario_id: ownerId,
      monto: montoOwner,
      moneda: moneda,
      porcentaje: porcentajeComision * 0.3,
      tipo: 'venta',
      datos_extra: {
        split: 'owner',
        porcentajeSplit: 30,
        montoTotalComision: montoComisionTotal,
      },
    });
    comisionesActualizadas.push(comisionOwner);
  }

  return comisionesActualizadas;
}

/**
 * Crear una nueva comisión
 */
export async function createComision(tenantId: string, data: CreateComisionData): Promise<Comision> {
  const sql = `
    INSERT INTO comisiones (
      tenant_id, venta_id, usuario_id, monto, moneda, porcentaje, tipo, notas, datos_extra,
      split_porcentaje_vendedor, split_porcentaje_owner, contacto_externo_id, fecha_entrega_proyecto
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
    ) RETURNING *
  `;

  // Convertir fecha_entrega_proyecto a Date si viene como string
  let fechaEntrega: Date | null = null;
  if (data.fecha_entrega_proyecto) {
    fechaEntrega = typeof data.fecha_entrega_proyecto === 'string' 
      ? new Date(data.fecha_entrega_proyecto) 
      : data.fecha_entrega_proyecto;
  }

  const params = [
    tenantId,
    data.venta_id,
    data.usuario_id,
    data.monto,
    data.moneda || 'USD',
    data.porcentaje || null,
    data.tipo || 'venta',
    data.notas || null,
    JSON.stringify(data.datos_extra || {}),
    data.split_porcentaje_vendedor || null,
    data.split_porcentaje_owner || null,
    data.contacto_externo_id || null,
    fechaEntrega,
  ];

  const result = await query(sql, params);
  const comision = result.rows[0];
  
  return {
    ...comision,
    datos_extra: typeof comision.datos_extra === 'string' ? JSON.parse(comision.datos_extra) : comision.datos_extra,
  };
}

/**
 * Actualizar una comisión
 */
export async function updateComision(
  tenantId: string,
  comisionId: string,
  data: UpdateComisionData
): Promise<Comision> {
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  Object.keys(data).forEach((key) => {
    if (key === 'fecha_pago') {
      updates.push(`fecha_pago = $${paramIndex}`);
      params.push(data[key] ? new Date(data[key] as string) : null);
    } else if (key === 'datos_extra') {
      updates.push(`datos_extra = $${paramIndex}`);
      params.push(JSON.stringify(data[key]));
    } else if (data[key as keyof UpdateComisionData] !== undefined) {
      updates.push(`${key} = $${paramIndex}`);
      params.push(data[key as keyof UpdateComisionData]);
    }
    paramIndex++;
  });

  updates.push(`updated_at = NOW()`);
  params.push(comisionId, tenantId);

  const sql = `
    UPDATE comisiones
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
    RETURNING *
  `;

  const result = await query(sql, params);
  
  if (result.rows.length === 0) {
    throw new Error('Comisión no encontrada');
  }

  const comision = result.rows[0];
  return {
    ...comision,
    datos_extra: typeof comision.datos_extra === 'string' ? JSON.parse(comision.datos_extra) : comision.datos_extra,
  };
}

/**
 * Obtener estadísticas de comisiones de un usuario
 */
export async function getEstadisticasComisiones(
  tenantId: string,
  usuarioId: string,
  fechaDesde?: Date | string,
  fechaHasta?: Date | string
): Promise<{
  total: number;
  pagado: number;
  pendiente: number;
  parcial: number;
  cantidad: number;
}> {
  let sql = `
    SELECT 
      COUNT(*) as cantidad,
      COALESCE(SUM(c.monto), 0) as total,
      COALESCE(SUM(CASE WHEN c.estado = 'pagado' THEN c.monto ELSE 0 END), 0) as pagado,
      COALESCE(SUM(CASE WHEN c.estado = 'pendiente' THEN c.monto ELSE 0 END), 0) as pendiente,
      COALESCE(SUM(CASE WHEN c.estado = 'parcial' THEN c.monto ELSE 0 END), 0) as parcial
    FROM comisiones c
    INNER JOIN ventas v ON c.venta_id = v.id
    WHERE c.tenant_id = $1 AND c.usuario_id = $2
  `;

  const params: any[] = [tenantId, usuarioId];
  let paramIndex = 3;

  if (fechaDesde) {
    sql += ` AND v.fecha_cierre >= $${paramIndex}`;
    params.push(fechaDesde);
    paramIndex++;
  }

  if (fechaHasta) {
    sql += ` AND v.fecha_cierre <= $${paramIndex}`;
    params.push(fechaHasta);
    paramIndex++;
  }

  const result = await query(sql, params);
  const row = result.rows[0];

  return {
    cantidad: parseInt(row.cantidad) || 0,
    total: parseFloat(row.total) || 0,
    pagado: parseFloat(row.pagado) || 0,
    pendiente: parseFloat(row.pendiente) || 0,
    parcial: parseFloat(row.parcial) || 0,
  };
}


