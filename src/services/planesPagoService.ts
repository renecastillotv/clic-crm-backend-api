/**
 * Servicio para gestionar planes de pago del CRM
 * Similar a propuestasService pero para planes de pago
 */

import { query } from '../utils/db.js';
import { randomBytes } from 'crypto';

export type EstadoPlanPago =
  | 'borrador'
  | 'enviado'
  | 'visto'
  | 'aceptado'
  | 'rechazado';

export interface PlanDetalle {
  reserva?: { tipo: 'porcentaje' | 'valor'; valor: number; descripcion?: string };
  separacion?: { tipo: 'porcentaje' | 'valor'; valor: number; descripcion?: string };
  inicial?: { tipo: 'porcentaje' | 'valor'; valor: number; cuotas?: number; descripcion?: string };
  contra_entrega?: { tipo: 'porcentaje' | 'valor'; valor: number; descripcion?: string };
  financiamiento?: {
    tipo: 'bancario' | 'desarrollador' | 'otro';
    porcentaje: number;
    plazo_meses?: number;
    descripcion?: string;
  };
  notas_adicionales?: string;
  valores_calculados?: {
    reserva_monto?: number;
    separacion_monto?: number;
    inicial_monto?: number;
    contra_entrega_monto?: number;
    financiamiento_monto?: number;
  };
}

export interface PlanPago {
  id: string;
  tenant_id: string;
  titulo: string;
  descripcion?: string;
  estado: EstadoPlanPago;
  contacto_id?: string;
  contacto?: {
    id: string;
    nombre: string;
    apellido?: string;
    email?: string;
    telefono?: string;
  };
  solicitud_id?: string;
  solicitud?: {
    id: string;
    titulo: string;
  };
  propiedad_id?: string;
  propiedad?: {
    id: string;
    titulo: string;
    codigo?: string;
    imagen_principal?: string;
    tipo?: string;
    ciudad?: string;
    sector?: string;
    precio?: number;
    moneda?: string;
  };
  unidad_id?: string;
  unidad?: {
    id: string;
    codigo: string;
    tipologia_nombre?: string;
    precio?: number;
    m2?: number;
    habitaciones?: number;
    banos?: number;
  };
  usuario_creador_id?: string;
  usuario_creador?: {
    id: string;
    nombre: string;
    apellido?: string;
    email?: string;
  };
  precio_total: number;
  moneda: string;
  plan_detalle: PlanDetalle;
  condiciones?: string;
  notas_internas?: string;
  url_publica?: string;
  fecha_expiracion?: string;
  fecha_enviada?: string;
  fecha_vista?: string;
  fecha_respuesta?: string;
  veces_vista: number;
  datos_extra: Record<string, any>;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanPagoFiltros {
  estado?: string;
  estados?: string[];
  solicitud_id?: string;
  contacto_id?: string;
  propiedad_id?: string;
  usuario_creador_id?: string;
  busqueda?: string;
  page?: number;
  limit?: number;
}

export interface PlanesPagoResponse {
  data: PlanPago[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  porEstado?: Record<EstadoPlanPago, number>;
}

/**
 * Genera un código único para URL pública
 */
function generarCodigoPublico(): string {
  return randomBytes(8).toString('hex');
}

/**
 * Formatea una fila de la base de datos a PlanPago
 */
function formatPlanPago(row: any): PlanPago {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    titulo: row.titulo,
    descripcion: row.descripcion,
    estado: row.estado,
    contacto_id: row.contacto_id,
    contacto: row.contacto_nombre ? {
      id: row.contacto_id,
      nombre: row.contacto_nombre,
      apellido: row.contacto_apellido,
      email: row.contacto_email,
      telefono: row.contacto_telefono,
    } : undefined,
    solicitud_id: row.solicitud_id,
    solicitud: row.solicitud_titulo ? {
      id: row.solicitud_id,
      titulo: row.solicitud_titulo,
    } : undefined,
    propiedad_id: row.propiedad_id,
    propiedad: row.propiedad_titulo ? {
      id: row.propiedad_id,
      titulo: row.propiedad_titulo,
      codigo: row.propiedad_codigo,
      imagen_principal: row.propiedad_imagen,
      tipo: row.propiedad_tipo,
      ciudad: row.propiedad_ciudad,
      sector: row.propiedad_sector,
      precio: row.propiedad_precio,
      moneda: row.propiedad_moneda,
    } : undefined,
    unidad_id: row.unidad_id,
    unidad: row.unidad_codigo ? {
      id: row.unidad_id,
      codigo: row.unidad_codigo,
      tipologia_nombre: row.unidad_tipologia,
      precio: row.unidad_precio,
      m2: row.unidad_m2,
      habitaciones: row.unidad_habitaciones,
      banos: row.unidad_banos,
    } : undefined,
    usuario_creador_id: row.usuario_creador_id,
    usuario_creador: row.creador_nombre ? {
      id: row.usuario_creador_id,
      nombre: row.creador_nombre,
      apellido: row.creador_apellido,
      email: row.creador_email,
    } : undefined,
    precio_total: parseFloat(row.precio_total) || 0,
    moneda: row.moneda || 'USD',
    plan_detalle: row.plan_detalle || {},
    condiciones: row.condiciones,
    notas_internas: row.notas_internas,
    url_publica: row.url_publica,
    fecha_expiracion: row.fecha_expiracion,
    fecha_enviada: row.fecha_enviada,
    fecha_vista: row.fecha_vista,
    fecha_respuesta: row.fecha_respuesta,
    veces_vista: row.veces_vista || 0,
    datos_extra: row.datos_extra || {},
    activo: row.activo,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Obtiene lista de planes de pago con filtros y paginación
 */
export async function getPlanesPago(
  tenantId: string,
  filtros: PlanPagoFiltros = {}
): Promise<PlanesPagoResponse> {
  const { estado, estados, solicitud_id, contacto_id, propiedad_id, usuario_creador_id, busqueda, page = 1, limit = 50 } = filtros;
  const offset = (page - 1) * limit;

  let whereClause = 'pp.tenant_id = $1 AND pp.activo = true';
  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (estado) {
    whereClause += ` AND pp.estado = $${paramIndex}`;
    params.push(estado);
    paramIndex++;
  }

  if (estados && estados.length > 0) {
    whereClause += ` AND pp.estado = ANY($${paramIndex})`;
    params.push(estados);
    paramIndex++;
  }

  if (solicitud_id) {
    whereClause += ` AND pp.solicitud_id = $${paramIndex}`;
    params.push(solicitud_id);
    paramIndex++;
  }

  if (contacto_id) {
    whereClause += ` AND pp.contacto_id = $${paramIndex}`;
    params.push(contacto_id);
    paramIndex++;
  }

  if (propiedad_id) {
    whereClause += ` AND pp.propiedad_id = $${paramIndex}`;
    params.push(propiedad_id);
    paramIndex++;
  }

  if (usuario_creador_id) {
    whereClause += ` AND pp.usuario_creador_id = $${paramIndex}`;
    params.push(usuario_creador_id);
    paramIndex++;
  }

  if (busqueda) {
    whereClause += ` AND (
      pp.titulo ILIKE $${paramIndex} OR
      pp.descripcion ILIKE $${paramIndex} OR
      c.nombre ILIKE $${paramIndex} OR
      c.apellido ILIKE $${paramIndex} OR
      prop.titulo ILIKE $${paramIndex}
    )`;
    params.push(`%${busqueda}%`);
    paramIndex++;
  }

  // Contar total
  const countSql = `
    SELECT COUNT(*) as total
    FROM planes_pago pp
    LEFT JOIN contactos c ON pp.contacto_id = c.id
    LEFT JOIN propiedades prop ON pp.propiedad_id = prop.id
    WHERE ${whereClause}
  `;
  const countResult = await query(countSql, params);
  const total = parseInt(countResult.rows[0].total);

  // Contar por estado
  const countByEstadoSql = `
    SELECT estado, COUNT(*) as count
    FROM planes_pago
    WHERE tenant_id = $1 AND activo = true
    GROUP BY estado
  `;
  const countByEstadoResult = await query(countByEstadoSql, [tenantId]);
  const porEstado: Record<string, number> = {
    borrador: 0,
    enviado: 0,
    visto: 0,
    aceptado: 0,
    rechazado: 0,
  };
  for (const row of countByEstadoResult.rows) {
    porEstado[row.estado] = parseInt(row.count);
  }

  // Obtener datos con joins
  const dataSql = `
    SELECT
      pp.*,
      c.nombre as contacto_nombre,
      c.apellido as contacto_apellido,
      c.email as contacto_email,
      c.telefono as contacto_telefono,
      s.titulo as solicitud_titulo,
      prop.titulo as propiedad_titulo,
      prop.codigo as propiedad_codigo,
      prop.imagen_principal as propiedad_imagen,
      prop.tipo as propiedad_tipo,
      prop.ciudad as propiedad_ciudad,
      prop.sector as propiedad_sector,
      prop.precio as propiedad_precio,
      prop.moneda as propiedad_moneda,
      u.codigo as unidad_codigo,
      u.tipologia_nombre as unidad_tipologia,
      u.precio as unidad_precio,
      u.m2 as unidad_m2,
      u.habitaciones as unidad_habitaciones,
      u.banos as unidad_banos,
      uc.nombre as creador_nombre,
      uc.apellido as creador_apellido,
      uc.email as creador_email
    FROM planes_pago pp
    LEFT JOIN contactos c ON pp.contacto_id = c.id
    LEFT JOIN solicitudes s ON pp.solicitud_id = s.id
    LEFT JOIN propiedades prop ON pp.propiedad_id = prop.id
    LEFT JOIN unidades_proyecto u ON pp.unidad_id = u.id
    LEFT JOIN usuarios uc ON pp.usuario_creador_id = uc.id
    WHERE ${whereClause}
    ORDER BY pp.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  params.push(limit, offset);

  const result = await query(dataSql, params);

  return {
    data: result.rows.map(formatPlanPago),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    porEstado: porEstado as Record<EstadoPlanPago, number>,
  };
}

/**
 * Obtiene un plan de pago por ID
 */
export async function getPlanPagoById(
  tenantId: string,
  planId: string
): Promise<PlanPago | null> {
  const sql = `
    SELECT
      pp.*,
      c.nombre as contacto_nombre,
      c.apellido as contacto_apellido,
      c.email as contacto_email,
      c.telefono as contacto_telefono,
      s.titulo as solicitud_titulo,
      prop.titulo as propiedad_titulo,
      prop.codigo as propiedad_codigo,
      prop.imagen_principal as propiedad_imagen,
      prop.tipo as propiedad_tipo,
      prop.ciudad as propiedad_ciudad,
      prop.sector as propiedad_sector,
      prop.precio as propiedad_precio,
      prop.moneda as propiedad_moneda,
      u.codigo as unidad_codigo,
      u.tipologia_nombre as unidad_tipologia,
      u.precio as unidad_precio,
      u.m2 as unidad_m2,
      u.habitaciones as unidad_habitaciones,
      u.banos as unidad_banos,
      uc.nombre as creador_nombre,
      uc.apellido as creador_apellido,
      uc.email as creador_email
    FROM planes_pago pp
    LEFT JOIN contactos c ON pp.contacto_id = c.id
    LEFT JOIN solicitudes s ON pp.solicitud_id = s.id
    LEFT JOIN propiedades prop ON pp.propiedad_id = prop.id
    LEFT JOIN unidades_proyecto u ON pp.unidad_id = u.id
    LEFT JOIN usuarios uc ON pp.usuario_creador_id = uc.id
    WHERE pp.id = $1 AND pp.tenant_id = $2
  `;

  const result = await query(sql, [planId, tenantId]);

  if (result.rows.length === 0) {
    return null;
  }

  return formatPlanPago(result.rows[0]);
}

/**
 * Obtiene un plan de pago por URL pública (para vista compartida)
 * Auto-incrementa veces_vista y actualiza fecha_vista
 */
export async function getPlanPagoByUrl(urlPublica: string): Promise<PlanPago | null> {
  // Primero incrementar vistas
  const updateSql = `
    UPDATE planes_pago
    SET
      veces_vista = veces_vista + 1,
      fecha_vista = COALESCE(fecha_vista, NOW()),
      estado = CASE WHEN estado = 'enviado' THEN 'visto' ELSE estado END,
      updated_at = NOW()
    WHERE url_publica = $1 AND activo = true
    RETURNING id, tenant_id
  `;

  const updateResult = await query(updateSql, [urlPublica]);

  if (updateResult.rows.length === 0) {
    return null;
  }

  const { id, tenant_id } = updateResult.rows[0];
  return getPlanPagoById(tenant_id, id);
}

/**
 * Crea un nuevo plan de pago
 */
export async function createPlanPago(
  tenantId: string,
  data: Partial<PlanPago>
): Promise<PlanPago> {
  const urlPublica = generarCodigoPublico();

  const sql = `
    INSERT INTO planes_pago (
      tenant_id, titulo, descripcion, estado,
      contacto_id, solicitud_id, propiedad_id, unidad_id, usuario_creador_id,
      precio_total, moneda, plan_detalle,
      condiciones, notas_internas, url_publica, fecha_expiracion,
      datos_extra
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7, $8, $9,
      $10, $11, $12,
      $13, $14, $15, $16,
      $17
    )
    RETURNING id
  `;

  const result = await query(sql, [
    tenantId,
    data.titulo || 'Plan de Pago',
    data.descripcion || null,
    data.estado || 'borrador',
    data.contacto_id || null,
    data.solicitud_id || null,
    data.propiedad_id || null,
    data.unidad_id || null,
    data.usuario_creador_id || null,
    data.precio_total || 0,
    data.moneda || 'USD',
    JSON.stringify(data.plan_detalle || {}),
    data.condiciones || null,
    data.notas_internas || null,
    urlPublica,
    data.fecha_expiracion || null,
    JSON.stringify(data.datos_extra || {}),
  ]);

  const plan = await getPlanPagoById(tenantId, result.rows[0].id);
  return plan!;
}

/**
 * Actualiza un plan de pago
 */
export async function updatePlanPago(
  tenantId: string,
  planId: string,
  data: Partial<PlanPago>
): Promise<PlanPago | null> {
  const fields: string[] = [];
  const values: any[] = [planId, tenantId];
  let paramIndex = 3;

  if (data.titulo !== undefined) {
    fields.push(`titulo = $${paramIndex}`);
    values.push(data.titulo);
    paramIndex++;
  }

  if (data.descripcion !== undefined) {
    fields.push(`descripcion = $${paramIndex}`);
    values.push(data.descripcion);
    paramIndex++;
  }

  if (data.estado !== undefined) {
    fields.push(`estado = $${paramIndex}`);
    values.push(data.estado);
    paramIndex++;
  }

  if (data.contacto_id !== undefined) {
    fields.push(`contacto_id = $${paramIndex}`);
    values.push(data.contacto_id);
    paramIndex++;
  }

  if (data.solicitud_id !== undefined) {
    fields.push(`solicitud_id = $${paramIndex}`);
    values.push(data.solicitud_id);
    paramIndex++;
  }

  if (data.propiedad_id !== undefined) {
    fields.push(`propiedad_id = $${paramIndex}`);
    values.push(data.propiedad_id);
    paramIndex++;
  }

  if (data.unidad_id !== undefined) {
    fields.push(`unidad_id = $${paramIndex}`);
    values.push(data.unidad_id);
    paramIndex++;
  }

  if (data.precio_total !== undefined) {
    fields.push(`precio_total = $${paramIndex}`);
    values.push(data.precio_total);
    paramIndex++;
  }

  if (data.moneda !== undefined) {
    fields.push(`moneda = $${paramIndex}`);
    values.push(data.moneda);
    paramIndex++;
  }

  if (data.plan_detalle !== undefined) {
    fields.push(`plan_detalle = $${paramIndex}`);
    values.push(JSON.stringify(data.plan_detalle));
    paramIndex++;
  }

  if (data.condiciones !== undefined) {
    fields.push(`condiciones = $${paramIndex}`);
    values.push(data.condiciones);
    paramIndex++;
  }

  if (data.notas_internas !== undefined) {
    fields.push(`notas_internas = $${paramIndex}`);
    values.push(data.notas_internas);
    paramIndex++;
  }

  if (data.fecha_expiracion !== undefined) {
    fields.push(`fecha_expiracion = $${paramIndex}`);
    values.push(data.fecha_expiracion);
    paramIndex++;
  }

  if (data.datos_extra !== undefined) {
    fields.push(`datos_extra = $${paramIndex}`);
    values.push(JSON.stringify(data.datos_extra));
    paramIndex++;
  }

  if (fields.length === 0) {
    return getPlanPagoById(tenantId, planId);
  }

  fields.push(`updated_at = NOW()`);

  const sql = `
    UPDATE planes_pago
    SET ${fields.join(', ')}
    WHERE id = $1 AND tenant_id = $2
    RETURNING id
  `;

  const result = await query(sql, values);

  if (result.rows.length === 0) {
    return null;
  }

  return getPlanPagoById(tenantId, planId);
}

/**
 * Elimina un plan de pago (soft delete)
 */
export async function deletePlanPago(tenantId: string, planId: string): Promise<boolean> {
  const sql = `
    UPDATE planes_pago
    SET activo = false, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
  `;

  const result = await query(sql, [planId, tenantId]);
  return result.rowCount > 0;
}

/**
 * Cambia el estado de un plan de pago
 */
export async function cambiarEstadoPlanPago(
  tenantId: string,
  planId: string,
  nuevoEstado: EstadoPlanPago
): Promise<PlanPago | null> {
  let extraFields = '';

  // Auto-set timestamps based on state
  if (nuevoEstado === 'enviado') {
    extraFields = ', fecha_enviada = COALESCE(fecha_enviada, NOW())';
  } else if (nuevoEstado === 'visto') {
    extraFields = ', fecha_vista = COALESCE(fecha_vista, NOW())';
  } else if (nuevoEstado === 'aceptado' || nuevoEstado === 'rechazado') {
    extraFields = ', fecha_respuesta = COALESCE(fecha_respuesta, NOW())';
  }

  const sql = `
    UPDATE planes_pago
    SET estado = $3, updated_at = NOW()${extraFields}
    WHERE id = $1 AND tenant_id = $2
    RETURNING id
  `;

  const result = await query(sql, [planId, tenantId, nuevoEstado]);

  if (result.rows.length === 0) {
    return null;
  }

  return getPlanPagoById(tenantId, planId);
}

/**
 * Regenera la URL pública de un plan de pago
 */
export async function regenerarUrlPublica(
  tenantId: string,
  planId: string
): Promise<PlanPago | null> {
  const nuevaUrl = generarCodigoPublico();

  const sql = `
    UPDATE planes_pago
    SET url_publica = $3, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
    RETURNING id
  `;

  const result = await query(sql, [planId, tenantId, nuevaUrl]);

  if (result.rows.length === 0) {
    return null;
  }

  return getPlanPagoById(tenantId, planId);
}

/**
 * Calcula los valores monetarios del plan basado en porcentajes
 */
export function calcularValoresPlan(precioTotal: number, planDetalle: PlanDetalle): PlanDetalle['valores_calculados'] {
  const calcularMonto = (item?: { tipo: 'porcentaje' | 'valor'; valor: number }) => {
    if (!item) return undefined;
    if (item.tipo === 'valor') return item.valor;
    return (precioTotal * item.valor) / 100;
  };

  return {
    reserva_monto: calcularMonto(planDetalle.reserva),
    separacion_monto: calcularMonto(planDetalle.separacion),
    inicial_monto: calcularMonto(planDetalle.inicial),
    contra_entrega_monto: calcularMonto(planDetalle.contra_entrega),
    financiamiento_monto: planDetalle.financiamiento
      ? (precioTotal * planDetalle.financiamiento.porcentaje) / 100
      : undefined,
  };
}
