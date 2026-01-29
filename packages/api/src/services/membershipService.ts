/**
 * Servicio de Membresías
 *
 * Gestiona los tipos de membresía, asignación a tenants, precios de features,
 * y verificación de límites.
 */

import { query } from '../utils/db.js';

// ==================== TIPOS ====================

export interface TipoMembresia {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  precio_base: number;
  moneda: string;
  ciclo_facturacion: string;
  usuarios_incluidos: number;
  propiedades_incluidas: number;
  costo_usuario_adicional: number;
  costo_propiedad_adicional: number;
  permite_pagina_web: boolean;
  permite_subtenants: boolean;
  es_individual: boolean;
  features_incluidos: string[];
  activo: boolean;
  orden: number;
  created_at: Date;
  updated_at: Date;
  // Campos calculados
  tenants_count?: number;
}

export interface CreateTipoMembresiaDTO {
  codigo: string;
  nombre: string;
  descripcion?: string;
  precio_base: number;
  moneda?: string;
  ciclo_facturacion?: string;
  usuarios_incluidos?: number;
  propiedades_incluidas?: number;
  costo_usuario_adicional?: number;
  costo_propiedad_adicional?: number;
  permite_pagina_web?: boolean;
  permite_subtenants?: boolean;
  es_individual?: boolean;
  features_incluidos?: string[];
  orden?: number;
}

export interface UpdateTipoMembresiaDTO extends Partial<CreateTipoMembresiaDTO> {
  activo?: boolean;
}

export interface PrecioFeature {
  id: string;
  feature_id: string;
  feature_name?: string;
  feature_description?: string;
  tipo_membresia_id: string | null;
  tipo_membresia_nombre?: string;
  precio_mensual: number | null;
  precio_unico: number | null;
  moneda: string;
  activo: boolean;
}

export interface LimitesTenant {
  usuarios_incluidos: number;
  propiedades_incluidas: number;
  limite_usuarios_override: number | null;
  limite_propiedades_override: number | null;
  costo_usuario_adicional: number;
  costo_propiedad_adicional: number;
  // Límites efectivos (considerando overrides)
  limite_usuarios_efectivo: number;
  limite_propiedades_efectivo: number;
}

export interface VerificacionLimite {
  permitido: boolean;
  mensaje?: string;
  dentro_del_plan: boolean;
  costo_adicional?: number;
}

// ==================== TIPOS DE MEMBRESÍA ====================

/**
 * Obtener todos los tipos de membresía
 */
export async function getTiposMembresia(incluirInactivos = false): Promise<TipoMembresia[]> {
  const sql = `
    SELECT
      tm.*,
      (SELECT COUNT(*) FROM tenants t WHERE t.tipo_membresia_id = tm.id) as tenants_count
    FROM tipos_membresia tm
    ${incluirInactivos ? '' : 'WHERE tm.activo = true'}
    ORDER BY tm.orden, tm.nombre
  `;

  const result = await query(sql, []);

  return result.rows.map((row) => ({
    ...row,
    precio_base: parseFloat(row.precio_base),
    costo_usuario_adicional: parseFloat(row.costo_usuario_adicional),
    costo_propiedad_adicional: parseFloat(row.costo_propiedad_adicional),
    features_incluidos: row.features_incluidos || [],
    tenants_count: parseInt(row.tenants_count) || 0,
  }));
}

/**
 * Obtener tipo de membresía por ID
 */
export async function getTipoMembresiaById(id: string): Promise<TipoMembresia | null> {
  const sql = `
    SELECT
      tm.*,
      (SELECT COUNT(*) FROM tenants t WHERE t.tipo_membresia_id = tm.id) as tenants_count
    FROM tipos_membresia tm
    WHERE tm.id = $1
  `;

  const result = await query(sql, [id]);

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    ...row,
    precio_base: parseFloat(row.precio_base),
    costo_usuario_adicional: parseFloat(row.costo_usuario_adicional),
    costo_propiedad_adicional: parseFloat(row.costo_propiedad_adicional),
    features_incluidos: row.features_incluidos || [],
    tenants_count: parseInt(row.tenants_count) || 0,
  };
}

/**
 * Obtener tipo de membresía por código
 */
export async function getTipoMembresiaByCodigo(codigo: string): Promise<TipoMembresia | null> {
  const sql = `SELECT * FROM tipos_membresia WHERE codigo = $1`;
  const result = await query(sql, [codigo]);

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    ...row,
    precio_base: parseFloat(row.precio_base),
    costo_usuario_adicional: parseFloat(row.costo_usuario_adicional),
    costo_propiedad_adicional: parseFloat(row.costo_propiedad_adicional),
    features_incluidos: row.features_incluidos || [],
  };
}

/**
 * Crear nuevo tipo de membresía
 */
export async function createTipoMembresia(data: CreateTipoMembresiaDTO): Promise<TipoMembresia> {
  const sql = `
    INSERT INTO tipos_membresia (
      codigo, nombre, descripcion, precio_base, moneda, ciclo_facturacion,
      usuarios_incluidos, propiedades_incluidas, costo_usuario_adicional,
      costo_propiedad_adicional, permite_pagina_web, permite_subtenants,
      es_individual, features_incluidos, orden
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *
  `;

  const result = await query(sql, [
    data.codigo,
    data.nombre,
    data.descripcion || null,
    data.precio_base,
    data.moneda || 'USD',
    data.ciclo_facturacion || 'mensual',
    data.usuarios_incluidos ?? 1,
    data.propiedades_incluidas ?? 0,
    data.costo_usuario_adicional ?? 0,
    data.costo_propiedad_adicional ?? 0,
    data.permite_pagina_web ?? false,
    data.permite_subtenants ?? false,
    data.es_individual ?? false,
    JSON.stringify(data.features_incluidos || []),
    data.orden ?? 0,
  ]);

  const row = result.rows[0];
  return {
    ...row,
    precio_base: parseFloat(row.precio_base),
    costo_usuario_adicional: parseFloat(row.costo_usuario_adicional),
    costo_propiedad_adicional: parseFloat(row.costo_propiedad_adicional),
    features_incluidos: row.features_incluidos || [],
  };
}

/**
 * Actualizar tipo de membresía
 */
export async function updateTipoMembresia(
  id: string,
  data: UpdateTipoMembresiaDTO
): Promise<TipoMembresia | null> {
  // Construir query dinámicamente
  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  const fields: (keyof UpdateTipoMembresiaDTO)[] = [
    'codigo', 'nombre', 'descripcion', 'precio_base', 'moneda', 'ciclo_facturacion',
    'usuarios_incluidos', 'propiedades_incluidas', 'costo_usuario_adicional',
    'costo_propiedad_adicional', 'permite_pagina_web', 'permite_subtenants',
    'es_individual', 'features_incluidos', 'orden', 'activo'
  ];

  for (const field of fields) {
    if (data[field] !== undefined) {
      if (field === 'features_incluidos') {
        updates.push(`${field} = $${paramCount}`);
        values.push(JSON.stringify(data[field]));
      } else {
        updates.push(`${field} = $${paramCount}`);
        values.push(data[field]);
      }
      paramCount++;
    }
  }

  if (updates.length === 0) {
    return getTipoMembresiaById(id);
  }

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const sql = `
    UPDATE tipos_membresia
    SET ${updates.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;

  const result = await query(sql, values);

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    ...row,
    precio_base: parseFloat(row.precio_base),
    costo_usuario_adicional: parseFloat(row.costo_usuario_adicional),
    costo_propiedad_adicional: parseFloat(row.costo_propiedad_adicional),
    features_incluidos: row.features_incluidos || [],
  };
}

/**
 * Eliminar (desactivar) tipo de membresía
 */
export async function deleteTipoMembresia(id: string): Promise<boolean> {
  // Verificar si hay tenants usando este tipo
  const checkSql = `SELECT COUNT(*) as count FROM tenants WHERE tipo_membresia_id = $1`;
  const checkResult = await query(checkSql, [id]);

  if (parseInt(checkResult.rows[0].count) > 0) {
    throw new Error('No se puede eliminar: hay tenants usando este tipo de membresía');
  }

  const sql = `UPDATE tipos_membresia SET activo = false, updated_at = NOW() WHERE id = $1`;
  const result = await query(sql, [id]);

  return (result.rowCount ?? 0) > 0;
}

// ==================== ASIGNACIÓN A TENANTS ====================

/**
 * Asignar membresía a un tenant
 */
export async function asignarMembresiaTenant(
  tenantId: string,
  tipoMembresiaId: string
): Promise<void> {
  const sql = `
    UPDATE tenants
    SET tipo_membresia_id = $1, updated_at = NOW()
    WHERE id = $2
  `;

  await query(sql, [tipoMembresiaId, tenantId]);
  console.log(`✅ Membresía ${tipoMembresiaId} asignada al tenant ${tenantId}`);
}

/**
 * Obtener membresía actual de un tenant
 */
export async function getMembresiaTenant(tenantId: string): Promise<TipoMembresia | null> {
  const sql = `
    SELECT tm.*
    FROM tenants t
    JOIN tipos_membresia tm ON t.tipo_membresia_id = tm.id
    WHERE t.id = $1
  `;

  const result = await query(sql, [tenantId]);

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    ...row,
    precio_base: parseFloat(row.precio_base),
    costo_usuario_adicional: parseFloat(row.costo_usuario_adicional),
    costo_propiedad_adicional: parseFloat(row.costo_propiedad_adicional),
    features_incluidos: row.features_incluidos || [],
  };
}

// ==================== LÍMITES ====================

/**
 * Obtener límites de un tenant (considerando overrides)
 */
export async function getLimitesTenant(tenantId: string): Promise<LimitesTenant> {
  const sql = `
    SELECT
      t.limite_usuarios_override,
      t.limite_propiedades_override,
      COALESCE(tm.usuarios_incluidos, 1) as usuarios_incluidos,
      COALESCE(tm.propiedades_incluidas, 0) as propiedades_incluidas,
      COALESCE(tm.costo_usuario_adicional, 0) as costo_usuario_adicional,
      COALESCE(tm.costo_propiedad_adicional, 0) as costo_propiedad_adicional
    FROM tenants t
    LEFT JOIN tipos_membresia tm ON t.tipo_membresia_id = tm.id
    WHERE t.id = $1
  `;

  const result = await query(sql, [tenantId]);

  if (result.rows.length === 0) {
    // Retornar límites por defecto si no existe el tenant
    return {
      usuarios_incluidos: 1,
      propiedades_incluidas: 0,
      limite_usuarios_override: null,
      limite_propiedades_override: null,
      costo_usuario_adicional: 0,
      costo_propiedad_adicional: 0,
      limite_usuarios_efectivo: 1,
      limite_propiedades_efectivo: 0,
    };
  }

  const row = result.rows[0];

  // Calcular límites efectivos (-1 significa ilimitado)
  const limite_usuarios_efectivo = row.limite_usuarios_override !== null
    ? row.limite_usuarios_override
    : row.usuarios_incluidos;

  const limite_propiedades_efectivo = row.limite_propiedades_override !== null
    ? row.limite_propiedades_override
    : row.propiedades_incluidas;

  return {
    usuarios_incluidos: parseInt(row.usuarios_incluidos),
    propiedades_incluidas: parseInt(row.propiedades_incluidas),
    limite_usuarios_override: row.limite_usuarios_override,
    limite_propiedades_override: row.limite_propiedades_override,
    costo_usuario_adicional: parseFloat(row.costo_usuario_adicional),
    costo_propiedad_adicional: parseFloat(row.costo_propiedad_adicional),
    limite_usuarios_efectivo,
    limite_propiedades_efectivo,
  };
}

/**
 * Establecer límites personalizados (override)
 */
export async function setLimitesOverride(
  tenantId: string,
  limites: { usuarios?: number | null; propiedades?: number | null }
): Promise<void> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (limites.usuarios !== undefined) {
    updates.push(`limite_usuarios_override = $${paramCount}`);
    values.push(limites.usuarios);
    paramCount++;
  }

  if (limites.propiedades !== undefined) {
    updates.push(`limite_propiedades_override = $${paramCount}`);
    values.push(limites.propiedades);
    paramCount++;
  }

  if (updates.length === 0) return;

  updates.push(`updated_at = NOW()`);
  values.push(tenantId);

  const sql = `UPDATE tenants SET ${updates.join(', ')} WHERE id = $${paramCount}`;
  await query(sql, values);

  console.log(`✅ Límites actualizados para tenant ${tenantId}`);
}

/**
 * Verificar si el tenant puede agregar más recursos
 */
export async function verificarLimite(
  tenantId: string,
  tipo: 'usuario' | 'propiedad'
): Promise<VerificacionLimite> {
  // Obtener estado de cuenta del tenant
  const tenantResult = await query(
    `SELECT estado_cuenta FROM tenants WHERE id = $1`,
    [tenantId]
  );

  if (tenantResult.rows.length === 0) {
    return { permitido: false, mensaje: 'Tenant no encontrado', dentro_del_plan: false };
  }

  const estadoCuenta = tenantResult.rows[0].estado_cuenta;

  // Si la cuenta está suspendida, no permitir crear recursos
  if (estadoCuenta === 'suspendido') {
    return {
      permitido: false,
      mensaje: 'Cuenta suspendida por falta de pago. Contacte a soporte.',
      dentro_del_plan: false,
    };
  }

  // Obtener límites y uso actual
  const limites = await getLimitesTenant(tenantId);

  // Obtener uso actual
  const usoResult = await query(
    `SELECT
      (SELECT COUNT(*) FROM usuarios_tenants WHERE tenant_id = $1 AND activo = true) as usuarios_activos,
      (SELECT COUNT(*) FROM propiedades WHERE tenant_id = $1 AND activo = true AND estado_propiedad != 'inactiva') as propiedades_publicadas
    `,
    [tenantId]
  );

  const uso = usoResult.rows[0];
  const usuariosActivos = parseInt(uso.usuarios_activos) || 0;
  const propiedadesPublicadas = parseInt(uso.propiedades_publicadas) || 0;

  if (tipo === 'usuario') {
    const limite = limites.limite_usuarios_efectivo;

    // -1 = ilimitado
    if (limite === -1) {
      return { permitido: true, dentro_del_plan: true };
    }

    // Dentro del plan
    if (usuariosActivos < limite) {
      return { permitido: true, dentro_del_plan: true };
    }

    // Fuera del plan pero puede pagar extra
    if (limites.costo_usuario_adicional > 0) {
      return {
        permitido: true,
        dentro_del_plan: false,
        costo_adicional: limites.costo_usuario_adicional,
        mensaje: `Se aplicará un cargo adicional de $${limites.costo_usuario_adicional}/mes por usuario extra`,
      };
    }

    // Límite alcanzado y no permite extras
    return {
      permitido: false,
      dentro_del_plan: false,
      mensaje: `Has alcanzado el límite de ${limite} usuarios de tu plan`,
    };
  }

  // tipo === 'propiedad'
  const limite = limites.limite_propiedades_efectivo;

  // -1 = ilimitado
  if (limite === -1) {
    return { permitido: true, dentro_del_plan: true };
  }

  // Dentro del plan
  if (propiedadesPublicadas < limite) {
    return { permitido: true, dentro_del_plan: true };
  }

  // Fuera del plan pero puede pagar extra
  if (limites.costo_propiedad_adicional > 0) {
    return {
      permitido: true,
      dentro_del_plan: false,
      costo_adicional: limites.costo_propiedad_adicional,
      mensaje: `Se aplicará un cargo adicional de $${limites.costo_propiedad_adicional}/mes por propiedad extra`,
    };
  }

  // Límite alcanzado y no permite extras
  return {
    permitido: false,
    dentro_del_plan: false,
    mensaje: `Has alcanzado el límite de ${limite} propiedades de tu plan`,
  };
}

// ==================== PRECIOS DE FEATURES ====================

/**
 * Obtener precios de features
 */
export async function getPreciosFeatures(tipoMembresiaId?: string): Promise<PrecioFeature[]> {
  let sql = `
    SELECT
      pf.*,
      f.name as feature_name,
      f.description as feature_description,
      tm.nombre as tipo_membresia_nombre
    FROM precios_features pf
    JOIN features f ON pf.feature_id = f.id
    LEFT JOIN tipos_membresia tm ON pf.tipo_membresia_id = tm.id
    WHERE pf.activo = true
  `;

  const params: any[] = [];

  if (tipoMembresiaId) {
    sql += ` AND (pf.tipo_membresia_id = $1 OR pf.tipo_membresia_id IS NULL)`;
    params.push(tipoMembresiaId);
  }

  sql += ` ORDER BY f.name`;

  const result = await query(sql, params);

  return result.rows.map((row) => ({
    ...row,
    precio_mensual: row.precio_mensual ? parseFloat(row.precio_mensual) : null,
    precio_unico: row.precio_unico ? parseFloat(row.precio_unico) : null,
  }));
}

/**
 * Establecer precio de un feature
 */
export async function setPrecioFeature(
  featureId: string,
  tipoMembresiaId: string | null,
  precioMensual: number | null,
  precioUnico: number | null = null,
  moneda: string = 'USD'
): Promise<PrecioFeature> {
  const sql = `
    INSERT INTO precios_features (feature_id, tipo_membresia_id, precio_mensual, precio_unico, moneda)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (feature_id, tipo_membresia_id)
    DO UPDATE SET
      precio_mensual = $3,
      precio_unico = $4,
      moneda = $5,
      activo = true
    RETURNING *
  `;

  const result = await query(sql, [featureId, tipoMembresiaId, precioMensual, precioUnico, moneda]);

  const row = result.rows[0];
  return {
    ...row,
    precio_mensual: row.precio_mensual ? parseFloat(row.precio_mensual) : null,
    precio_unico: row.precio_unico ? parseFloat(row.precio_unico) : null,
  };
}

/**
 * Eliminar precio de un feature
 */
export async function deletePrecioFeature(featureId: string, tipoMembresiaId: string | null): Promise<boolean> {
  const sql = tipoMembresiaId
    ? `DELETE FROM precios_features WHERE feature_id = $1 AND tipo_membresia_id = $2`
    : `DELETE FROM precios_features WHERE feature_id = $1 AND tipo_membresia_id IS NULL`;

  const params = tipoMembresiaId ? [featureId, tipoMembresiaId] : [featureId];
  const result = await query(sql, params);

  return (result.rowCount ?? 0) > 0;
}

/**
 * Obtener precio de un feature específico para un tipo de membresía
 */
export async function getPrecioFeature(
  featureId: string,
  tipoMembresiaId: string | null
): Promise<{ mensual: number | null; unico: number | null } | null> {
  // Primero buscar precio específico para el tipo de membresía
  let sql = `
    SELECT precio_mensual, precio_unico
    FROM precios_features
    WHERE feature_id = $1 AND tipo_membresia_id = $2 AND activo = true
  `;

  let result = await query(sql, [featureId, tipoMembresiaId]);

  // Si no hay precio específico, buscar precio global (tipo_membresia_id = NULL)
  if (result.rows.length === 0 && tipoMembresiaId) {
    sql = `
      SELECT precio_mensual, precio_unico
      FROM precios_features
      WHERE feature_id = $1 AND tipo_membresia_id IS NULL AND activo = true
    `;
    result = await query(sql, [featureId]);
  }

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    mensual: row.precio_mensual ? parseFloat(row.precio_mensual) : null,
    unico: row.precio_unico ? parseFloat(row.precio_unico) : null,
  };
}

// ==================== ESTADO DE CUENTA ====================

/**
 * Actualizar estado de cuenta de un tenant
 */
export async function actualizarEstadoCuenta(
  tenantId: string,
  estado: 'al_dia' | 'por_vencer' | 'vencido' | 'suspendido'
): Promise<void> {
  const sql = `
    UPDATE tenants
    SET estado_cuenta = $1, updated_at = NOW()
    WHERE id = $2
  `;

  await query(sql, [estado, tenantId]);
  console.log(`✅ Estado de cuenta de tenant ${tenantId} actualizado a: ${estado}`);
}

/**
 * Registrar pago y actualizar estado de cuenta
 */
export async function registrarPago(
  tenantId: string,
  monto: number,
  referencia?: string
): Promise<void> {
  // Actualizar fecha de último pago y saldo
  const sql = `
    UPDATE tenants
    SET
      fecha_ultimo_pago = CURRENT_DATE,
      saldo_pendiente = GREATEST(0, saldo_pendiente - $1),
      estado_cuenta = CASE
        WHEN saldo_pendiente - $1 <= 0 THEN 'al_dia'
        ELSE estado_cuenta
      END,
      updated_at = NOW()
    WHERE id = $2
  `;

  await query(sql, [monto, tenantId]);
  console.log(`✅ Pago de $${monto} registrado para tenant ${tenantId}`);
}

export default {
  // Tipos de membresía
  getTiposMembresia,
  getTipoMembresiaById,
  getTipoMembresiaByCodigo,
  createTipoMembresia,
  updateTipoMembresia,
  deleteTipoMembresia,

  // Asignación a tenants
  asignarMembresiaTenant,
  getMembresiaTenant,

  // Límites
  getLimitesTenant,
  setLimitesOverride,
  verificarLimite,

  // Precios de features
  getPreciosFeatures,
  setPrecioFeature,
  deletePrecioFeature,
  getPrecioFeature,

  // Estado de cuenta
  actualizarEstadoCuenta,
  registrarPago,
};
