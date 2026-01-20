/**
 * Servicio para gestionar propuestas comerciales del CRM
 */

import { query } from '../utils/db.js';
import { randomBytes } from 'crypto';

export type EstadoPropuesta =
  | 'borrador'
  | 'enviada'
  | 'vista'
  | 'aceptada'
  | 'rechazada'
  | 'expirada';

export interface PropuestaPropiedadResumen {
  id: string;
  propiedad_id: string;
  titulo: string;
  codigo?: string;
  codigo_publico?: number;
  precio?: number;
  moneda?: string;
  imagen_principal?: string;
  imagenes?: string[];
  tipo?: string;
  operacion?: string;
  ciudad?: string;
  sector?: string;
  habitaciones?: number;
  banos?: number;
  m2_construccion?: number;
  m2_terreno?: number;
  estacionamientos?: number;
  descripcion?: string;
  destacada?: boolean;
  orden: number;
  notas?: string;
  precio_especial?: number;
  // Proyecto
  is_project?: boolean;
  planes_pago?: any;
  garantias?: string[];
  beneficios?: string[];
  tipologias?: any[];
  etapas?: any[];
  // Amenidades
  amenidades?: string[];
  // Comisiones
  comision?: string;
  comision_nota?: string;
  red_global_comision?: number;
  // Campos para Red Global
  tenant_id?: string;
  tenant_nombre?: string;
  tenant_info_negocio?: any;
  red_global?: boolean;
  // Datos del captador
  captador_id?: string;
  captador_nombre?: string;
  captador_apellido?: string;
  captador_avatar?: string;
  captador_email?: string;
  captador_telefono?: string;
  // Fechas
  created_at?: string;
  updated_at?: string;
}

export interface Propuesta {
  id: string;
  tenant_id: string;
  titulo: string;
  descripcion?: string;
  estado: EstadoPropuesta;
  solicitud_id?: string;
  contacto_id?: string;
  contacto?: {
    id: string;
    nombre: string;
    apellido?: string;
    email?: string;
  };
  propiedad_id?: string; // Mantener por compatibilidad
  propiedades?: PropuestaPropiedadResumen[]; // Nuevo: array de propiedades
  propiedades_count?: number; // Conteo rápido para listados
  solicitud_titulo?: string; // Título de la solicitud para listados
  usuario_creador_id?: string;
  precio_propuesto?: number;
  moneda: string;
  comision_porcentaje?: number;
  comision_monto?: number;
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

export interface PropuestaFiltros {
  estado?: string;
  estados?: string[];
  solicitud_id?: string;
  contacto_id?: string;
  usuario_creador_id?: string;
  busqueda?: string;
  page?: number;
  limit?: number;
}

export interface PropuestasResponse {
  data: Propuesta[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  porEstado?: Record<EstadoPropuesta, number>;
}

/**
 * Genera un código único para URL pública
 */
function generarCodigoPublico(): string {
  return randomBytes(8).toString('hex');
}

/**
 * Obtiene lista de propuestas con filtros y paginación
 */
export async function getPropuestas(
  tenantId: string,
  filtros: PropuestaFiltros = {}
): Promise<PropuestasResponse> {
  const { estado, estados, solicitud_id, contacto_id, usuario_creador_id, busqueda, page = 1, limit = 50 } = filtros;
  const offset = (page - 1) * limit;

  let whereClause = 'p.tenant_id = $1 AND p.activo = true';
  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (estado) {
    whereClause += ` AND p.estado = $${paramIndex}`;
    params.push(estado);
    paramIndex++;
  }

  if (estados && estados.length > 0) {
    whereClause += ` AND p.estado = ANY($${paramIndex})`;
    params.push(estados);
    paramIndex++;
  }

  if (solicitud_id) {
    whereClause += ` AND p.solicitud_id = $${paramIndex}`;
    params.push(solicitud_id);
    paramIndex++;
  }

  if (contacto_id) {
    whereClause += ` AND p.contacto_id = $${paramIndex}`;
    params.push(contacto_id);
    paramIndex++;
  }

  if (usuario_creador_id) {
    whereClause += ` AND p.usuario_creador_id = $${paramIndex}`;
    params.push(usuario_creador_id);
    paramIndex++;
  }

  if (busqueda) {
    whereClause += ` AND (
      p.titulo ILIKE $${paramIndex} OR
      p.descripcion ILIKE $${paramIndex} OR
      c.nombre ILIKE $${paramIndex} OR
      c.apellido ILIKE $${paramIndex}
    )`;
    params.push(`%${busqueda}%`);
    paramIndex++;
  }

  // Contar total
  const countSql = `
    SELECT COUNT(*) as total
    FROM propuestas p
    LEFT JOIN contactos c ON p.contacto_id = c.id
    WHERE ${whereClause}
  `;
  const countResult = await query(countSql, params);
  const total = parseInt(countResult.rows[0].total);

  // Contar por estado
  const countByEstadoSql = `
    SELECT estado, COUNT(*) as count
    FROM propuestas
    WHERE tenant_id = $1 AND activo = true
    GROUP BY estado
  `;
  const countByEstadoResult = await query(countByEstadoSql, [tenantId]);
  const porEstado: Record<EstadoPropuesta, number> = {
    borrador: 0,
    enviada: 0,
    vista: 0,
    aceptada: 0,
    rechazada: 0,
    expirada: 0,
  };
  for (const row of countByEstadoResult.rows) {
    porEstado[row.estado as EstadoPropuesta] = parseInt(row.count);
  }

  // Obtener datos paginados con JOIN a contactos, solicitudes y conteo de propiedades
  const dataSql = `
    SELECT
      p.id, p.tenant_id, p.titulo, p.descripcion, p.estado,
      p.solicitud_id, p.contacto_id, p.propiedad_id, p.usuario_creador_id,
      p.precio_propuesto, p.moneda, p.comision_porcentaje, p.comision_monto,
      p.condiciones, p.notas_internas, p.url_publica,
      p.fecha_expiracion, p.fecha_enviada, p.fecha_vista, p.fecha_respuesta,
      p.veces_vista, p.datos_extra,
      p.activo, p.created_at, p.updated_at,
      c.nombre as contacto_nombre, c.apellido as contacto_apellido,
      c.email as contacto_email,
      s.titulo as solicitud_titulo,
      COALESCE(pp_count.propiedades_count, 0) as propiedades_count
    FROM propuestas p
    LEFT JOIN contactos c ON p.contacto_id = c.id
    LEFT JOIN solicitudes s ON p.solicitud_id = s.id
    LEFT JOIN (
      SELECT propuesta_id, COUNT(*) as propiedades_count
      FROM propuestas_propiedades
      GROUP BY propuesta_id
    ) pp_count ON p.id = pp_count.propuesta_id
    WHERE ${whereClause}
    ORDER BY
      CASE p.estado
        WHEN 'borrador' THEN 1
        WHEN 'enviada' THEN 2
        WHEN 'vista' THEN 3
        WHEN 'aceptada' THEN 4
        WHEN 'rechazada' THEN 5
        WHEN 'expirada' THEN 6
      END,
      p.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  params.push(limit, offset);

  const result = await query(dataSql, params);

  return {
    data: result.rows.map(formatPropuesta),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    porEstado,
  };
}

/**
 * Obtiene una propuesta por ID (incluye propiedades)
 */
export async function getPropuestaById(
  tenantId: string,
  propuestaId: string
): Promise<Propuesta | null> {
  const sql = `
    SELECT
      p.id, p.tenant_id, p.titulo, p.descripcion, p.estado,
      p.solicitud_id, p.contacto_id, p.propiedad_id, p.usuario_creador_id,
      p.precio_propuesto, p.moneda, p.comision_porcentaje, p.comision_monto,
      p.condiciones, p.notas_internas, p.url_publica,
      p.fecha_expiracion, p.fecha_enviada, p.fecha_vista, p.fecha_respuesta,
      p.veces_vista, p.datos_extra,
      p.activo, p.created_at, p.updated_at,
      c.nombre as contacto_nombre, c.apellido as contacto_apellido,
      c.email as contacto_email,
      s.titulo as solicitud_titulo
    FROM propuestas p
    LEFT JOIN contactos c ON p.contacto_id = c.id
    LEFT JOIN solicitudes s ON p.solicitud_id = s.id
    WHERE p.id = $1 AND p.tenant_id = $2
  `;

  const result = await query(sql, [propuestaId, tenantId]);

  if (result.rows.length === 0) {
    return null;
  }

  // Usar formatPropuestaConPropiedades para incluir las propiedades
  return formatPropuestaConPropiedades(result.rows[0]);
}

/**
 * Obtiene una propuesta por URL pública
 */
export async function getPropuestaByUrl(
  urlPublica: string
): Promise<Propuesta | null> {
  const sql = `
    SELECT
      p.id, p.tenant_id, p.titulo, p.descripcion, p.estado,
      p.solicitud_id, p.contacto_id, p.propiedad_id, p.usuario_creador_id,
      p.precio_propuesto, p.moneda, p.comision_porcentaje, p.comision_monto,
      p.condiciones, p.notas_internas, p.url_publica,
      p.fecha_expiracion, p.fecha_enviada, p.fecha_vista, p.fecha_respuesta,
      p.veces_vista, p.datos_extra,
      p.activo, p.created_at, p.updated_at,
      c.nombre as contacto_nombre, c.apellido as contacto_apellido,
      c.email as contacto_email
    FROM propuestas p
    LEFT JOIN contactos c ON p.contacto_id = c.id
    WHERE p.url_publica = $1 AND p.activo = true
  `;

  const result = await query(sql, [urlPublica]);

  if (result.rows.length === 0) {
    return null;
  }

  // Actualizar contador de vistas si no está en estado borrador
  const propuesta = result.rows[0];
  if (propuesta.estado !== 'borrador') {
    await query(`
      UPDATE propuestas
      SET veces_vista = veces_vista + 1,
          fecha_vista = COALESCE(fecha_vista, NOW()),
          estado = CASE WHEN estado = 'enviada' THEN 'vista' ELSE estado END,
          updated_at = NOW()
      WHERE id = $1
    `, [propuesta.id]);
  }

  return formatPropuesta(propuesta);
}

/**
 * Crea una nueva propuesta
 * Acepta propiedad_ids como array para crear propuesta con múltiples propiedades
 */
export async function createPropuesta(
  tenantId: string,
  data: Partial<Propuesta> & { propiedad_ids?: string[] }
): Promise<Propuesta> {
  const urlPublica = generarCodigoPublico();

  const sql = `
    INSERT INTO propuestas (
      tenant_id, titulo, descripcion, estado,
      solicitud_id, contacto_id, propiedad_id, usuario_creador_id,
      precio_propuesto, moneda, comision_porcentaje, comision_monto,
      condiciones, notas_internas, url_publica,
      fecha_expiracion, datos_extra
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING *
  `;

  const params = [
    tenantId,
    data.titulo,
    data.descripcion || null,
    data.estado || 'borrador',
    data.solicitud_id || null,
    data.contacto_id || null,
    data.propiedad_id || null, // Mantener por compatibilidad
    data.usuario_creador_id || null,
    data.precio_propuesto || null,
    data.moneda || 'USD',
    data.comision_porcentaje || null,
    data.comision_monto || null,
    data.condiciones || null,
    data.notas_internas || null,
    urlPublica,
    data.fecha_expiracion || null,
    JSON.stringify(data.datos_extra || {}),
  ];

  const result = await query(sql, params);
  const propuesta = formatPropuesta(result.rows[0]);

  // Si se proporcionaron propiedad_ids, sincronizar propiedades
  if (data.propiedad_ids && data.propiedad_ids.length > 0) {
    propuesta.propiedades = await sincronizarPropiedadesPropuesta(propuesta.id, data.propiedad_ids);
  } else {
    propuesta.propiedades = [];
  }

  return propuesta;
}

/**
 * Actualiza una propuesta existente
 * Acepta propiedad_ids como array para sincronizar propiedades
 */
export async function updatePropuesta(
  tenantId: string,
  propuestaId: string,
  data: Partial<Propuesta> & { propiedad_ids?: string[] }
): Promise<Propuesta | null> {
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  const camposActualizables = [
    'titulo', 'descripcion', 'estado',
    'solicitud_id', 'contacto_id', 'propiedad_id', 'usuario_creador_id',
    'precio_propuesto', 'moneda', 'comision_porcentaje', 'comision_monto',
    'condiciones', 'notas_internas', 'fecha_expiracion', 'activo'
  ];

  for (const campo of camposActualizables) {
    if (data[campo as keyof Propuesta] !== undefined) {
      updates.push(`${campo} = $${paramIndex}`);
      params.push(data[campo as keyof Propuesta]);
      paramIndex++;
    }
  }

  // Campos JSON
  if (data.datos_extra !== undefined) {
    updates.push(`datos_extra = $${paramIndex}`);
    params.push(JSON.stringify(data.datos_extra));
    paramIndex++;
  }

  updates.push(`updated_at = NOW()`);

  if (updates.length === 1 && !data.propiedad_ids) {
    return getPropuestaById(tenantId, propuestaId);
  }

  let propuesta: Propuesta | null = null;

  if (updates.length > 1) {
    const sql = `
      UPDATE propuestas
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
      RETURNING *
    `;
    params.push(propuestaId, tenantId);

    const result = await query(sql, params);

    if (result.rows.length === 0) {
      return null;
    }

    propuesta = formatPropuesta(result.rows[0]);
  } else {
    // No hay campos para actualizar, solo obtener la propuesta existente
    propuesta = await getPropuestaById(tenantId, propuestaId);
    if (!propuesta) return null;
  }

  // Si se proporcionaron propiedad_ids, sincronizar propiedades
  if (data.propiedad_ids !== undefined) {
    propuesta.propiedades = await sincronizarPropiedadesPropuesta(propuestaId, data.propiedad_ids);
  } else {
    propuesta.propiedades = await getPropiedadesDePropuesta(propuestaId);
  }

  return propuesta;
}

/**
 * Cambia el estado de una propuesta
 */
export async function cambiarEstadoPropuesta(
  tenantId: string,
  propuestaId: string,
  nuevoEstado: EstadoPropuesta
): Promise<Propuesta | null> {
  let sql: string;
  const params: any[] = [nuevoEstado, propuestaId, tenantId];

  if (nuevoEstado === 'enviada') {
    sql = `
      UPDATE propuestas
      SET estado = $1, fecha_enviada = NOW(), updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
      RETURNING *
    `;
  } else if (nuevoEstado === 'aceptada' || nuevoEstado === 'rechazada') {
    sql = `
      UPDATE propuestas
      SET estado = $1, fecha_respuesta = NOW(), updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
      RETURNING *
    `;
  } else {
    sql = `
      UPDATE propuestas
      SET estado = $1, updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
      RETURNING *
    `;
  }

  const result = await query(sql, params);

  if (result.rows.length === 0) {
    return null;
  }

  return formatPropuesta(result.rows[0]);
}

/**
 * Elimina (desactiva) una propuesta
 */
export async function deletePropuesta(
  tenantId: string,
  propuestaId: string
): Promise<boolean> {
  const sql = `
    UPDATE propuestas
    SET activo = false, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
  `;

  const result = await query(sql, [propuestaId, tenantId]);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Regenera la URL pública de una propuesta
 */
export async function regenerarUrlPublica(
  tenantId: string,
  propuestaId: string
): Promise<Propuesta | null> {
  const nuevaUrl = generarCodigoPublico();

  const sql = `
    UPDATE propuestas
    SET url_publica = $1, updated_at = NOW()
    WHERE id = $2 AND tenant_id = $3
    RETURNING *
  `;

  const result = await query(sql, [nuevaUrl, propuestaId, tenantId]);

  if (result.rows.length === 0) {
    return null;
  }

  return formatPropuesta(result.rows[0]);
}

/**
 * Obtiene las propiedades asociadas a una propuesta
 */
export async function getPropiedadesDePropuesta(propuestaId: string): Promise<PropuestaPropiedadResumen[]> {
  const sql = `
    SELECT
      pp.id,
      pp.propiedad_id,
      pp.orden,
      pp.notas,
      pp.precio_especial,
      p.titulo,
      p.codigo,
      p.codigo_publico,
      p.precio,
      p.moneda,
      p.imagen_principal,
      p.imagenes,
      p.tipo,
      p.operacion,
      p.ciudad,
      p.sector,
      p.habitaciones,
      p.banos,
      p.m2_construccion,
      p.m2_terreno,
      p.estacionamientos,
      p.descripcion,
      p.destacada,
      p.is_project,
      p.planes_pago,
      p.garantias,
      p.beneficios,
      p.tipologias,
      p.etapas,
      p.amenidades,
      p.comision,
      p.comision_nota,
      p.red_global_comision,
      p.tenant_id,
      p.red_global,
      p.captador_id,
      p.created_at as propiedad_created_at,
      p.updated_at as propiedad_updated_at,
      t.nombre as tenant_nombre,
      t.info_negocio as tenant_info_negocio,
      cap.nombre as captador_nombre,
      cap.apellido as captador_apellido,
      cap.avatar_url as captador_avatar,
      cap.email as captador_email,
      cap.telefono as captador_telefono
    FROM propuestas_propiedades pp
    JOIN propiedades p ON pp.propiedad_id = p.id
    LEFT JOIN tenants t ON p.tenant_id = t.id
    LEFT JOIN usuarios cap ON p.captador_id = cap.id
    WHERE pp.propuesta_id = $1
    ORDER BY pp.orden ASC, pp.created_at ASC
  `;

  const result = await query(sql, [propuestaId]);

  return result.rows.map(row => ({
    id: row.id,
    propiedad_id: row.propiedad_id,
    titulo: row.titulo,
    codigo: row.codigo,
    codigo_publico: row.codigo_publico,
    precio: row.precio ? parseFloat(row.precio) : undefined,
    moneda: row.moneda,
    imagen_principal: row.imagen_principal,
    imagenes: typeof row.imagenes === 'string' ? JSON.parse(row.imagenes) : (row.imagenes || []),
    tipo: row.tipo,
    operacion: row.operacion,
    ciudad: row.ciudad,
    sector: row.sector,
    habitaciones: row.habitaciones,
    banos: row.banos,
    m2_construccion: row.m2_construccion ? parseFloat(row.m2_construccion) : undefined,
    m2_terreno: row.m2_terreno ? parseFloat(row.m2_terreno) : undefined,
    estacionamientos: row.estacionamientos,
    descripcion: row.descripcion,
    destacada: row.destacada,
    orden: row.orden || 0,
    notas: row.notas,
    precio_especial: row.precio_especial ? parseFloat(row.precio_especial) : undefined,
    // Proyecto
    is_project: row.is_project,
    planes_pago: typeof row.planes_pago === 'string' ? JSON.parse(row.planes_pago) : row.planes_pago,
    garantias: typeof row.garantias === 'string' ? JSON.parse(row.garantias) : (row.garantias || []),
    beneficios: typeof row.beneficios === 'string' ? JSON.parse(row.beneficios) : (row.beneficios || []),
    tipologias: typeof row.tipologias === 'string' ? JSON.parse(row.tipologias) : (row.tipologias || []),
    etapas: typeof row.etapas === 'string' ? JSON.parse(row.etapas) : (row.etapas || []),
    // Amenidades
    amenidades: typeof row.amenidades === 'string' ? JSON.parse(row.amenidades) : (row.amenidades || []),
    // Comisiones
    comision: row.comision,
    comision_nota: row.comision_nota,
    red_global_comision: row.red_global_comision ? parseFloat(row.red_global_comision) : undefined,
    // Campos para Red Global
    tenant_id: row.tenant_id,
    tenant_nombre: row.tenant_nombre,
    tenant_info_negocio: typeof row.tenant_info_negocio === 'string' ? JSON.parse(row.tenant_info_negocio) : (row.tenant_info_negocio || {}),
    red_global: row.red_global,
    // Datos del captador
    captador_id: row.captador_id,
    captador_nombre: row.captador_nombre,
    captador_apellido: row.captador_apellido,
    captador_avatar: row.captador_avatar,
    captador_email: row.captador_email,
    captador_telefono: row.captador_telefono,
    // Fechas
    created_at: row.propiedad_created_at,
    updated_at: row.propiedad_updated_at,
  }));
}

/**
 * Sincroniza las propiedades de una propuesta
 */
export async function sincronizarPropiedadesPropuesta(
  propuestaId: string,
  propiedadIds: string[]
): Promise<PropuestaPropiedadResumen[]> {
  // Eliminar propiedades existentes
  await query(`DELETE FROM propuestas_propiedades WHERE propuesta_id = $1`, [propuestaId]);

  // Insertar nuevas propiedades con orden
  if (propiedadIds.length > 0) {
    const values = propiedadIds.map((id, index) => `($1, $${index + 2}, ${index})`).join(', ');
    const params = [propuestaId, ...propiedadIds];
    await query(
      `INSERT INTO propuestas_propiedades (propuesta_id, propiedad_id, orden) VALUES ${values}`,
      params
    );
  }

  return getPropiedadesDePropuesta(propuestaId);
}

/**
 * Agrega una propiedad a una propuesta
 */
export async function agregarPropiedadAPropuesta(
  propuestaId: string,
  propiedadId: string,
  notas?: string,
  precioEspecial?: number
): Promise<PropuestaPropiedadResumen[]> {
  // Obtener el máximo orden actual
  const maxOrden = await query(
    `SELECT COALESCE(MAX(orden), -1) + 1 as next_orden FROM propuestas_propiedades WHERE propuesta_id = $1`,
    [propuestaId]
  );
  const orden = maxOrden.rows[0].next_orden;

  await query(
    `INSERT INTO propuestas_propiedades (propuesta_id, propiedad_id, orden, notas, precio_especial)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (propuesta_id, propiedad_id) DO UPDATE SET
       notas = COALESCE(EXCLUDED.notas, propuestas_propiedades.notas),
       precio_especial = COALESCE(EXCLUDED.precio_especial, propuestas_propiedades.precio_especial)`,
    [propuestaId, propiedadId, orden, notas || null, precioEspecial || null]
  );

  return getPropiedadesDePropuesta(propuestaId);
}

/**
 * Elimina una propiedad de una propuesta
 */
export async function eliminarPropiedadDePropuesta(
  propuestaId: string,
  propiedadId: string
): Promise<PropuestaPropiedadResumen[]> {
  await query(
    `DELETE FROM propuestas_propiedades WHERE propuesta_id = $1 AND propiedad_id = $2`,
    [propuestaId, propiedadId]
  );

  return getPropiedadesDePropuesta(propuestaId);
}

/**
 * Formatea una propuesta desde la BD
 */
function formatPropuesta(row: any): Propuesta {
  const propuesta: Propuesta = {
    id: row.id,
    tenant_id: row.tenant_id,
    titulo: row.titulo,
    descripcion: row.descripcion,
    estado: row.estado,
    solicitud_id: row.solicitud_id,
    contacto_id: row.contacto_id,
    propiedad_id: row.propiedad_id,
    usuario_creador_id: row.usuario_creador_id,
    precio_propuesto: row.precio_propuesto ? parseFloat(row.precio_propuesto) : undefined,
    moneda: row.moneda,
    comision_porcentaje: row.comision_porcentaje ? parseFloat(row.comision_porcentaje) : undefined,
    comision_monto: row.comision_monto ? parseFloat(row.comision_monto) : undefined,
    condiciones: row.condiciones,
    notas_internas: row.notas_internas,
    url_publica: row.url_publica,
    fecha_expiracion: row.fecha_expiracion,
    fecha_enviada: row.fecha_enviada,
    fecha_vista: row.fecha_vista,
    fecha_respuesta: row.fecha_respuesta,
    veces_vista: row.veces_vista || 0,
    datos_extra: typeof row.datos_extra === 'string' ? JSON.parse(row.datos_extra) : (row.datos_extra || {}),
    activo: row.activo,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  // Añadir datos del contacto si existen
  if (row.contacto_id && row.contacto_nombre) {
    propuesta.contacto = {
      id: row.contacto_id,
      nombre: row.contacto_nombre,
      apellido: row.contacto_apellido,
      email: row.contacto_email,
    };
  }

  // Añadir solicitud_titulo si existe
  if (row.solicitud_titulo) {
    propuesta.solicitud_titulo = row.solicitud_titulo;
  }

  // Añadir propiedades_count si existe
  if (row.propiedades_count !== undefined) {
    propuesta.propiedades_count = parseInt(row.propiedades_count) || 0;
  }

  return propuesta;
}

/**
 * Formatea una propuesta con sus propiedades
 */
async function formatPropuestaConPropiedades(row: any): Promise<Propuesta> {
  const propuesta = formatPropuesta(row);
  propuesta.propiedades = await getPropiedadesDePropuesta(row.id);
  return propuesta;
}
