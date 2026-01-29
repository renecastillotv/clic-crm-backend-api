/**
 * Servicio de Tracking de Uso
 *
 * Monitorea el uso de recursos por tenant en tiempo real.
 * Registra eventos para auditoría y facturación.
 */

import { query } from '../utils/db.js';
import { getLimitesTenant, getMembresiaTenant } from './membershipService.js';

// ==================== TIPOS ====================

export interface UsoTenant {
  id: string;
  tenant_id: string;
  usuarios_activos: number;
  propiedades_activas: number;
  propiedades_publicadas: number;
  usuarios_max_periodo: number;
  propiedades_max_periodo: number;
  features_activos: FeatureActivo[];
  periodo_inicio: Date;
  periodo_fin: Date;
  costo_base_periodo: number;
  costo_usuarios_extra: number;
  costo_propiedades_extra: number;
  costo_features_extra: number;
  costo_total_periodo: number;
}

export interface FeatureActivo {
  feature_id: string;
  nombre: string;
  fecha_activacion: string;
  precio_mensual: number;
}

export interface HistorialUsoEntry {
  id: string;
  tenant_id: string;
  tipo_evento: string;
  recurso_tipo: string | null;
  recurso_id: string | null;
  recurso_nombre: string | null;
  usuarios_activos: number | null;
  propiedades_activas: number | null;
  propiedades_publicadas: number | null;
  es_cobrable: boolean;
  costo_impacto: number;
  moneda: string;
  datos_extra: Record<string, any>;
  usuario_ejecutor_id: string | null;
  created_at: Date;
}

export interface CostosPeriodo {
  costo_base: number;
  usuarios_incluidos: number;
  usuarios_activos: number;
  usuarios_extra: number;
  costo_usuarios_extra: number;
  propiedades_incluidas: number;
  propiedades_publicadas: number;
  propiedades_extra: number;
  costo_propiedades_extra: number;
  features_extra: FeatureActivo[];
  costo_features_extra: number;
  subtotal: number;
  moneda: string;
}

// ==================== GESTIÓN DE PERÍODOS ====================

/**
 * Obtener o crear el registro de uso del período actual
 */
export async function getOrCreateUsoPeriodo(tenantId: string): Promise<UsoTenant> {
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

  // Buscar período existente
  let result = await query(
    `SELECT * FROM uso_tenant
     WHERE tenant_id = $1
       AND periodo_inicio <= $2
       AND periodo_fin >= $2`,
    [tenantId, hoy.toISOString().split('T')[0]]
  );

  if (result.rows.length > 0) {
    return parseUsoTenant(result.rows[0]);
  }

  // Crear nuevo período
  const insertResult = await query(
    `INSERT INTO uso_tenant (
      tenant_id, periodo_inicio, periodo_fin,
      usuarios_activos, propiedades_activas, propiedades_publicadas,
      usuarios_max_periodo, propiedades_max_periodo
    )
    VALUES ($1, $2, $3, 0, 0, 0, 0, 0)
    RETURNING *`,
    [tenantId, inicioMes.toISOString().split('T')[0], finMes.toISOString().split('T')[0]]
  );

  // Sincronizar contadores iniciales
  await recalcularContadores(tenantId);

  // Obtener el registro actualizado
  result = await query(`SELECT * FROM uso_tenant WHERE id = $1`, [insertResult.rows[0].id]);
  return parseUsoTenant(result.rows[0]);
}

/**
 * Parsear registro de uso_tenant
 */
function parseUsoTenant(row: any): UsoTenant {
  return {
    ...row,
    costo_base_periodo: parseFloat(row.costo_base_periodo) || 0,
    costo_usuarios_extra: parseFloat(row.costo_usuarios_extra) || 0,
    costo_propiedades_extra: parseFloat(row.costo_propiedades_extra) || 0,
    costo_features_extra: parseFloat(row.costo_features_extra) || 0,
    costo_total_periodo: parseFloat(row.costo_total_periodo) || 0,
    features_activos: row.features_activos || [],
  };
}

// ==================== REGISTRO DE EVENTOS ====================

/**
 * Registrar evento de uso y actualizar contadores
 */
async function registrarEvento(
  tenantId: string,
  tipoEvento: string,
  recursoTipo: string | null,
  recursoId: string | null,
  recursoNombre: string | null,
  datosExtra: Record<string, any> = {},
  usuarioEjecutorId: string | null = null
): Promise<void> {
  // Obtener contadores actuales
  const contadores = await getContadoresActuales(tenantId);

  // Verificar si genera costo adicional
  const limites = await getLimitesTenant(tenantId);
  let esCobrable = false;
  let costoImpacto = 0;

  if (tipoEvento === 'usuario_creado' && contadores.usuarios > limites.limite_usuarios_efectivo) {
    esCobrable = true;
    costoImpacto = limites.costo_usuario_adicional;
  } else if (
    (tipoEvento === 'propiedad_publicada' || tipoEvento === 'propiedad_creada') &&
    contadores.propiedadesPublicadas > limites.limite_propiedades_efectivo
  ) {
    esCobrable = true;
    costoImpacto = limites.costo_propiedad_adicional;
  }

  // Insertar en historial
  await query(
    `INSERT INTO historial_uso (
      tenant_id, tipo_evento, recurso_tipo, recurso_id, recurso_nombre,
      usuarios_activos, propiedades_activas, propiedades_publicadas,
      es_cobrable, costo_impacto, datos_extra, usuario_ejecutor_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      tenantId,
      tipoEvento,
      recursoTipo,
      recursoId,
      recursoNombre,
      contadores.usuarios,
      contadores.propiedades,
      contadores.propiedadesPublicadas,
      esCobrable,
      costoImpacto,
      JSON.stringify(datosExtra),
      usuarioEjecutorId,
    ]
  );

  // Actualizar uso_tenant
  await actualizarUsoPeriodo(tenantId, contadores);
}

/**
 * Obtener contadores actuales del tenant
 */
async function getContadoresActuales(tenantId: string): Promise<{
  usuarios: number;
  propiedades: number;
  propiedadesPublicadas: number;
}> {
  const result = await query(
    `SELECT
      (SELECT COUNT(*) FROM usuarios_tenants WHERE tenant_id = $1 AND activo = true) as usuarios,
      (SELECT COUNT(*) FROM propiedades WHERE tenant_id = $1 AND activo = true) as propiedades,
      (SELECT COUNT(*) FROM propiedades WHERE tenant_id = $1 AND activo = true AND estado_propiedad != 'inactiva') as propiedades_publicadas
    `,
    [tenantId]
  );

  return {
    usuarios: parseInt(result.rows[0].usuarios) || 0,
    propiedades: parseInt(result.rows[0].propiedades) || 0,
    propiedadesPublicadas: parseInt(result.rows[0].propiedades_publicadas) || 0,
  };
}

/**
 * Actualizar registro de uso del período
 */
async function actualizarUsoPeriodo(
  tenantId: string,
  contadores: { usuarios: number; propiedades: number; propiedadesPublicadas: number }
): Promise<void> {
  const uso = await getOrCreateUsoPeriodo(tenantId);

  // Actualizar contadores y máximos
  await query(
    `UPDATE uso_tenant
     SET
       usuarios_activos = $1,
       propiedades_activas = $2,
       propiedades_publicadas = $3,
       usuarios_max_periodo = GREATEST(usuarios_max_periodo, $1),
       propiedades_max_periodo = GREATEST(propiedades_max_periodo, $3),
       updated_at = NOW()
     WHERE id = $4`,
    [contadores.usuarios, contadores.propiedades, contadores.propiedadesPublicadas, uso.id]
  );
}

// ==================== FUNCIONES DE REGISTRO ====================

/**
 * Registrar creación de usuario
 */
export async function registrarUsuarioCreado(
  tenantId: string,
  usuarioId: string,
  nombreUsuario?: string,
  usuarioEjecutorId?: string
): Promise<void> {
  await registrarEvento(
    tenantId,
    'usuario_creado',
    'usuario',
    usuarioId,
    nombreUsuario || null,
    {},
    usuarioEjecutorId || null
  );
  console.log(`📊 Tracking: Usuario ${usuarioId} creado en tenant ${tenantId}`);
}

/**
 * Registrar eliminación de usuario
 */
export async function registrarUsuarioEliminado(
  tenantId: string,
  usuarioId: string,
  nombreUsuario?: string,
  usuarioEjecutorId?: string
): Promise<void> {
  await registrarEvento(
    tenantId,
    'usuario_eliminado',
    'usuario',
    usuarioId,
    nombreUsuario || null,
    {},
    usuarioEjecutorId || null
  );
  console.log(`📊 Tracking: Usuario ${usuarioId} eliminado de tenant ${tenantId}`);
}

/**
 * Registrar creación de propiedad
 */
export async function registrarPropiedadCreada(
  tenantId: string,
  propiedadId: string,
  titulo?: string,
  usuarioEjecutorId?: string
): Promise<void> {
  await registrarEvento(
    tenantId,
    'propiedad_creada',
    'propiedad',
    propiedadId,
    titulo || null,
    {},
    usuarioEjecutorId || null
  );
  console.log(`📊 Tracking: Propiedad ${propiedadId} creada en tenant ${tenantId}`);
}

/**
 * Registrar eliminación de propiedad
 */
export async function registrarPropiedadEliminada(
  tenantId: string,
  propiedadId: string,
  titulo?: string,
  usuarioEjecutorId?: string
): Promise<void> {
  await registrarEvento(
    tenantId,
    'propiedad_eliminada',
    'propiedad',
    propiedadId,
    titulo || null,
    {},
    usuarioEjecutorId || null
  );
  console.log(`📊 Tracking: Propiedad ${propiedadId} eliminada de tenant ${tenantId}`);
}

/**
 * Registrar publicación de propiedad
 */
export async function registrarPropiedadPublicada(
  tenantId: string,
  propiedadId: string,
  titulo?: string,
  usuarioEjecutorId?: string
): Promise<void> {
  await registrarEvento(
    tenantId,
    'propiedad_publicada',
    'propiedad',
    propiedadId,
    titulo || null,
    {},
    usuarioEjecutorId || null
  );
  console.log(`📊 Tracking: Propiedad ${propiedadId} publicada en tenant ${tenantId}`);
}

/**
 * Registrar despublicación de propiedad
 */
export async function registrarPropiedadDespublicada(
  tenantId: string,
  propiedadId: string,
  titulo?: string,
  usuarioEjecutorId?: string
): Promise<void> {
  await registrarEvento(
    tenantId,
    'propiedad_despublicada',
    'propiedad',
    propiedadId,
    titulo || null,
    {},
    usuarioEjecutorId || null
  );
  console.log(`📊 Tracking: Propiedad ${propiedadId} despublicada en tenant ${tenantId}`);
}

/**
 * Registrar activación de feature
 */
export async function registrarFeatureActivado(
  tenantId: string,
  featureId: string,
  featureName?: string,
  precioMensual?: number,
  usuarioEjecutorId?: string
): Promise<void> {
  await registrarEvento(
    tenantId,
    'feature_activado',
    'feature',
    featureId,
    featureName || null,
    { precio_mensual: precioMensual },
    usuarioEjecutorId || null
  );

  // Agregar a features_activos en uso_tenant
  if (precioMensual && precioMensual > 0) {
    const uso = await getOrCreateUsoPeriodo(tenantId);
    const featuresActivos = uso.features_activos || [];

    // Verificar si ya está activo
    if (!featuresActivos.some((f) => f.feature_id === featureId)) {
      featuresActivos.push({
        feature_id: featureId,
        nombre: featureName || featureId,
        fecha_activacion: new Date().toISOString(),
        precio_mensual: precioMensual,
      });

      await query(
        `UPDATE uso_tenant SET features_activos = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(featuresActivos), uso.id]
      );
    }
  }

  console.log(`📊 Tracking: Feature ${featureId} activado en tenant ${tenantId}`);
}

/**
 * Registrar desactivación de feature
 */
export async function registrarFeatureDesactivado(
  tenantId: string,
  featureId: string,
  featureName?: string,
  usuarioEjecutorId?: string
): Promise<void> {
  await registrarEvento(
    tenantId,
    'feature_desactivado',
    'feature',
    featureId,
    featureName || null,
    {},
    usuarioEjecutorId || null
  );

  // Quitar de features_activos en uso_tenant
  const uso = await getOrCreateUsoPeriodo(tenantId);
  const featuresActivos = (uso.features_activos || []).filter((f) => f.feature_id !== featureId);

  await query(
    `UPDATE uso_tenant SET features_activos = $1, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(featuresActivos), uso.id]
  );

  console.log(`📊 Tracking: Feature ${featureId} desactivado en tenant ${tenantId}`);
}

// ==================== CONSULTAS ====================

/**
 * Obtener uso actual de un tenant
 */
export async function getUsoTenant(tenantId: string): Promise<UsoTenant | null> {
  const result = await query(
    `SELECT * FROM uso_tenant
     WHERE tenant_id = $1
     ORDER BY periodo_inicio DESC
     LIMIT 1`,
    [tenantId]
  );

  if (result.rows.length === 0) {
    // Crear período actual si no existe
    return await getOrCreateUsoPeriodo(tenantId);
  }

  return parseUsoTenant(result.rows[0]);
}

/**
 * Obtener historial de uso
 */
export async function getHistorialUso(
  tenantId: string,
  filtros?: {
    tipo_evento?: string;
    fecha_desde?: Date;
    fecha_hasta?: Date;
    limit?: number;
    offset?: number;
  }
): Promise<{ data: HistorialUsoEntry[]; total: number }> {
  let sql = `SELECT * FROM historial_uso WHERE tenant_id = $1`;
  let countSql = `SELECT COUNT(*) as total FROM historial_uso WHERE tenant_id = $1`;
  const params: any[] = [tenantId];
  let paramCount = 2;

  if (filtros?.tipo_evento) {
    sql += ` AND tipo_evento = $${paramCount}`;
    countSql += ` AND tipo_evento = $${paramCount}`;
    params.push(filtros.tipo_evento);
    paramCount++;
  }

  if (filtros?.fecha_desde) {
    sql += ` AND created_at >= $${paramCount}`;
    countSql += ` AND created_at >= $${paramCount}`;
    params.push(filtros.fecha_desde);
    paramCount++;
  }

  if (filtros?.fecha_hasta) {
    sql += ` AND created_at <= $${paramCount}`;
    countSql += ` AND created_at <= $${paramCount}`;
    params.push(filtros.fecha_hasta);
    paramCount++;
  }

  sql += ` ORDER BY created_at DESC`;

  const limit = filtros?.limit || 50;
  const offset = filtros?.offset || 0;
  sql += ` LIMIT ${limit} OFFSET ${offset}`;

  const [dataResult, countResult] = await Promise.all([
    query(sql, params),
    query(countSql, params.slice(0, paramCount - 1)),
  ]);

  return {
    data: dataResult.rows.map((row) => ({
      ...row,
      costo_impacto: parseFloat(row.costo_impacto) || 0,
      datos_extra: row.datos_extra || {},
    })),
    total: parseInt(countResult.rows[0].total) || 0,
  };
}

/**
 * Recalcular contadores del tenant (sincronización)
 */
export async function recalcularContadores(tenantId: string): Promise<UsoTenant> {
  const contadores = await getContadoresActuales(tenantId);
  const uso = await getOrCreateUsoPeriodo(tenantId);

  await query(
    `UPDATE uso_tenant
     SET
       usuarios_activos = $1,
       propiedades_activas = $2,
       propiedades_publicadas = $3,
       usuarios_max_periodo = GREATEST(usuarios_max_periodo, $1),
       propiedades_max_periodo = GREATEST(propiedades_max_periodo, $3),
       updated_at = NOW()
     WHERE id = $4`,
    [contadores.usuarios, contadores.propiedades, contadores.propiedadesPublicadas, uso.id]
  );

  console.log(`📊 Contadores recalculados para tenant ${tenantId}:`, contadores);

  return await getUsoTenant(tenantId) as UsoTenant;
}

/**
 * Calcular costos del período actual
 */
export async function calcularCostosPeriodo(tenantId: string): Promise<CostosPeriodo> {
  const uso = await getUsoTenant(tenantId);
  const membresia = await getMembresiaTenant(tenantId);

  if (!uso || !membresia) {
    return {
      costo_base: 0,
      usuarios_incluidos: 0,
      usuarios_activos: 0,
      usuarios_extra: 0,
      costo_usuarios_extra: 0,
      propiedades_incluidas: 0,
      propiedades_publicadas: 0,
      propiedades_extra: 0,
      costo_propiedades_extra: 0,
      features_extra: [],
      costo_features_extra: 0,
      subtotal: 0,
      moneda: 'USD',
    };
  }

  // Costo base
  const costo_base = membresia.precio_base;

  // Usuarios extra (basado en el máximo del período)
  const usuarios_extra = Math.max(0, uso.usuarios_max_periodo - membresia.usuarios_incluidos);
  const costo_usuarios_extra = usuarios_extra * membresia.costo_usuario_adicional;

  // Propiedades extra (basado en el máximo del período)
  const propiedades_extra = Math.max(0, uso.propiedades_max_periodo - membresia.propiedades_incluidas);
  const costo_propiedades_extra = propiedades_extra * membresia.costo_propiedad_adicional;

  // Features extra
  const features_extra = uso.features_activos || [];
  const costo_features_extra = features_extra.reduce((sum, f) => sum + (f.precio_mensual || 0), 0);

  // Subtotal
  const subtotal = costo_base + costo_usuarios_extra + costo_propiedades_extra + costo_features_extra;

  // Actualizar uso_tenant con los costos calculados
  await query(
    `UPDATE uso_tenant
     SET
       costo_base_periodo = $1,
       costo_usuarios_extra = $2,
       costo_propiedades_extra = $3,
       costo_features_extra = $4,
       costo_total_periodo = $5,
       updated_at = NOW()
     WHERE id = $6`,
    [costo_base, costo_usuarios_extra, costo_propiedades_extra, costo_features_extra, subtotal, uso.id]
  );

  return {
    costo_base,
    usuarios_incluidos: membresia.usuarios_incluidos,
    usuarios_activos: uso.usuarios_max_periodo,
    usuarios_extra,
    costo_usuarios_extra,
    propiedades_incluidas: membresia.propiedades_incluidas,
    propiedades_publicadas: uso.propiedades_max_periodo,
    propiedades_extra,
    costo_propiedades_extra,
    features_extra,
    costo_features_extra,
    subtotal,
    moneda: membresia.moneda,
  };
}

/**
 * Obtener resumen de uso de todos los tenants (para admin)
 */
export async function getResumenUsoTodos(filtros?: {
  estado_cuenta?: string;
  tipo_membresia_id?: string;
}): Promise<
  Array<{
    tenant_id: string;
    tenant_nombre: string;
    tipo_membresia: string | null;
    estado_cuenta: string;
    usuarios_activos: number;
    propiedades_publicadas: number;
    costo_total_periodo: number;
  }>
> {
  let sql = `
    SELECT
      t.id as tenant_id,
      t.nombre as tenant_nombre,
      tm.nombre as tipo_membresia,
      t.estado_cuenta,
      COALESCE(ut.usuarios_activos, 0) as usuarios_activos,
      COALESCE(ut.propiedades_publicadas, 0) as propiedades_publicadas,
      COALESCE(ut.costo_total_periodo, 0) as costo_total_periodo
    FROM tenants t
    LEFT JOIN tipos_membresia tm ON t.tipo_membresia_id = tm.id
    LEFT JOIN uso_tenant ut ON t.id = ut.tenant_id
      AND ut.periodo_inicio <= CURRENT_DATE
      AND ut.periodo_fin >= CURRENT_DATE
    WHERE t.activo = true
  `;

  const params: any[] = [];
  let paramCount = 1;

  if (filtros?.estado_cuenta) {
    sql += ` AND t.estado_cuenta = $${paramCount}`;
    params.push(filtros.estado_cuenta);
    paramCount++;
  }

  if (filtros?.tipo_membresia_id) {
    sql += ` AND t.tipo_membresia_id = $${paramCount}`;
    params.push(filtros.tipo_membresia_id);
    paramCount++;
  }

  sql += ` ORDER BY ut.costo_total_periodo DESC NULLS LAST, t.nombre`;

  const result = await query(sql, params);

  return result.rows.map((row) => ({
    ...row,
    usuarios_activos: parseInt(row.usuarios_activos) || 0,
    propiedades_publicadas: parseInt(row.propiedades_publicadas) || 0,
    costo_total_periodo: parseFloat(row.costo_total_periodo) || 0,
  }));
}

export default {
  // Gestión de períodos
  getOrCreateUsoPeriodo,

  // Registro de eventos
  registrarUsuarioCreado,
  registrarUsuarioEliminado,
  registrarPropiedadCreada,
  registrarPropiedadEliminada,
  registrarPropiedadPublicada,
  registrarPropiedadDespublicada,
  registrarFeatureActivado,
  registrarFeatureDesactivado,

  // Consultas
  getUsoTenant,
  getHistorialUso,
  recalcularContadores,
  calcularCostosPeriodo,
  getResumenUsoTodos,
};
