/**
 * Servicio de Cobros de Ventas
 *
 * Gestiona los cobros que hace la empresa al cliente (sobre la COMISIÓN, no el valor de venta).
 * Cada cobro actualiza automáticamente:
 * - cache_monto_cobrado en ventas (monto total cobrado de la comisión)
 * - cache_porcentaje_cobrado (sobre monto_comision, NO valor_cierre)
 * - cache_comision_disponible (igual a lo cobrado)
 * - monto_habilitado en cada comisión (proporcional)
 * - estado_cobro (pendiente/parcial/cobrado basado en monto_comision)
 */

import { query } from '../utils/db.js';

// Interface compatible con las rutas existentes
export interface RegistrarCobroParams {
  tenantId: string;
  ventaId: string;
  monto: number;
  moneda?: string;
  fechaCobro: string;
  metodoPago?: string | null;
  referencia?: string | null;
  banco?: string | null;
  reciboUrl?: string | null;
  notas?: string | null;
  registradoPorId?: string | null;
}

export interface EditarCobroParams {
  tenantId: string;
  cobroId: string;
  monto?: number;
  moneda?: string;
  fechaCobro?: string;
  metodoPago?: string | null;
  referencia?: string | null;
  banco?: string | null;
  reciboUrl?: string | null;
  notas?: string | null;
  usuarioId?: string | null;
}

export interface CobroVenta {
  id: string;
  tenant_id: string;
  venta_id: string;
  monto: number;
  moneda: string;
  fecha_cobro: string;
  metodo_pago?: string;
  referencia?: string;
  banco?: string;
  recibo_url?: string;
  notas?: string;
  registrado_por_id?: string;
  activo: boolean;
  created_at: string;
}

// Caches actualizados de la venta después de un cobro
export interface VentaCachesActualizados {
  cache_monto_cobrado: number;
  cache_porcentaje_cobrado: number;
  cache_comision_disponible: number;
  cache_monto_pagado_asesores: number;
  estado_cobro: string;
  estado_pagos: string;
}

// Resultado completo del registro de cobro
export interface RegistrarCobroResult {
  cobro: CobroVenta;
  venta_actualizada: VentaCachesActualizados;
}

/**
 * Recalcula todos los caches de una venta
 * IMPORTANTE: Usa monto_comision para calcular porcentaje cobrado (lo que la empresa cobra)
 * @returns Los valores de cache actualizados
 */
async function recalcularCachesVentaInterno(ventaId: string): Promise<VentaCachesActualizados> {
  // Intentar usar la función SQL si existe (para consistencia con triggers)
  try {
    await query('SELECT recalcular_caches_venta($1)', [ventaId]);
  } catch (e) {
    // Si la función no existe, continuamos con el cálculo manual
  }

  // Obtener datos de la venta
  const ventaResult = await query(`
    SELECT valor_cierre, monto_comision FROM ventas WHERE id = $1
  `, [ventaId]);

  if (ventaResult.rows.length === 0) {
    return {
      cache_monto_cobrado: 0,
      cache_porcentaje_cobrado: 0,
      cache_comision_disponible: 0,
      cache_monto_pagado_asesores: 0,
      estado_cobro: 'pendiente',
      estado_pagos: 'pendiente'
    };
  }

  const venta = ventaResult.rows[0];
  const montoComision = parseFloat(venta.monto_comision) || 0;

  // Calcular monto cobrado
  const cobradoResult = await query(`
    SELECT COALESCE(SUM(monto), 0) as total
    FROM ventas_cobros
    WHERE venta_id = $1 AND activo = true
  `, [ventaId]);
  const montoCobrado = parseFloat(cobradoResult.rows[0].total) || 0;

  // Calcular porcentaje cobrado (sobre la COMISIÓN, que es lo que cobra la empresa)
  const porcentajeCobrado = montoComision > 0
    ? Math.min(Math.round((montoCobrado / montoComision) * 10000) / 100, 100)
    : 0;

  // La comisión disponible es igual a lo cobrado (ya que cobramos la comisión directamente)
  const comisionDisponible = montoCobrado;

  // Calcular pagos a asesores
  const pagadoResult = await query(`
    SELECT COALESCE(SUM(p.monto), 0) as total
    FROM pagos_comisiones p
    JOIN comisiones c ON p.comision_id = c.id
    WHERE c.venta_id = $1
      AND (p.activo = true OR p.activo IS NULL)
      AND (c.activo = true OR c.activo IS NULL)
  `, [ventaId]);
  const montoPagado = parseFloat(pagadoResult.rows[0].total) || 0;

  // Total de comisiones de asesores (excluyendo empresa)
  const totalAsesoresResult = await query(`
    SELECT COALESCE(SUM(monto), 0) as total
    FROM comisiones
    WHERE venta_id = $1
      AND (activo = true OR activo IS NULL)
      AND (tipo_participante IS NULL OR tipo_participante != 'empresa')
  `, [ventaId]);
  const totalAsesores = parseFloat(totalAsesoresResult.rows[0].total) || 0;

  // Determinar estados
  // IMPORTANTE: estadoCobro se basa en montoComision (lo que la empresa debe cobrar),
  // NO en valorCierre (el valor total de la venta que va al propietario/desarrollador)
  const estadoCobro = montoCobrado === 0 ? 'pendiente'
    : montoCobrado >= montoComision ? 'cobrado' : 'parcial';

  const estadoPagos = montoPagado === 0 ? 'pendiente'
    : (totalAsesores > 0 && montoPagado >= totalAsesores) ? 'pagado' : 'parcial';

  // Actualizar venta
  await query(`
    UPDATE ventas SET
      cache_monto_cobrado = $2,
      cache_porcentaje_cobrado = $3,
      cache_comision_disponible = $4,
      cache_monto_pagado_asesores = $5,
      estado_cobro = $6,
      estado_pagos = $7,
      updated_at = NOW()
    WHERE id = $1
  `, [ventaId, montoCobrado, porcentajeCobrado, comisionDisponible, montoPagado, estadoCobro, estadoPagos]);

  // Actualizar monto_habilitado en comisiones
  await query(`
    UPDATE comisiones SET
      monto_habilitado = ROUND(($2 / 100.0) * monto, 2),
      updated_at = NOW()
    WHERE venta_id = $1
      AND (activo = true OR activo IS NULL)
  `, [ventaId, porcentajeCobrado]);

  // Retornar los valores actualizados
  return {
    cache_monto_cobrado: montoCobrado,
    cache_porcentaje_cobrado: porcentajeCobrado,
    cache_comision_disponible: comisionDisponible,
    cache_monto_pagado_asesores: montoPagado,
    estado_cobro: estadoCobro,
    estado_pagos: estadoPagos
  };
}

/**
 * Registra un cobro de la empresa al cliente
 * @returns El cobro creado y los valores de cache actualizados de la venta
 */
export async function registrarCobro(params: RegistrarCobroParams): Promise<RegistrarCobroResult> {
  const {
    tenantId,
    ventaId,
    monto,
    moneda,
    fechaCobro,
    metodoPago,
    referencia,
    banco,
    reciboUrl,
    notas,
    registradoPorId
  } = params;

  // 1. Obtener la venta y validar
  const ventaResult = await query(`
    SELECT
      id, valor_cierre, monto_comision, cache_monto_cobrado,
      cancelada, activo, moneda
    FROM ventas
    WHERE id = $1 AND tenant_id = $2
  `, [ventaId, tenantId]);

  if (ventaResult.rows.length === 0) {
    throw new Error('Venta no encontrada');
  }

  const venta = ventaResult.rows[0];

  if (venta.cancelada) {
    throw new Error('No se puede registrar cobro en una venta cancelada');
  }

  if (!venta.activo) {
    throw new Error('La venta no está activa');
  }

  // 2. Validar que el monto no exceda la COMISIÓN de la venta
  // El cobro es sobre la comisión, no sobre el valor total de la venta
  const montoComision = parseFloat(venta.monto_comision) || 0;
  const yaCobrado = parseFloat(venta.cache_monto_cobrado) || 0;
  const pendiente = montoComision - yaCobrado;

  if (monto > pendiente + 0.01) {
    throw new Error(
      `El monto del cobro (${monto}) excede la comisión pendiente (${pendiente.toFixed(2)})`
    );
  }

  // 3. Insertar el cobro
  const insertResult = await query(`
    INSERT INTO ventas_cobros (
      tenant_id, venta_id, monto, moneda, fecha_cobro,
      metodo_pago, referencia, banco, recibo_url, notas,
      registrado_por_id, activo
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
    RETURNING *
  `, [
    tenantId,
    ventaId,
    monto,
    moneda || venta.moneda || 'USD',
    fechaCobro,
    metodoPago || null,
    referencia || null,
    banco || null,
    reciboUrl || null,
    notas || null,
    registradoPorId || null
  ]);

  const cobro = insertResult.rows[0];

  // 4. Recalcular caches y obtener valores actualizados
  const cachesActualizados = await recalcularCachesVentaInterno(ventaId);

  // 5. Registrar en historial
  const porcentajeNuevo = cachesActualizados.cache_porcentaje_cobrado.toFixed(2);

  await registrarHistorial(tenantId, ventaId, 'cobro_registrado', {
    cobro_id: cobro.id,
    monto: monto,
    nuevo_total_cobrado: cachesActualizados.cache_monto_cobrado,
    porcentaje_cobrado: porcentajeNuevo
  }, registradoPorId || undefined);

  console.log(`✅ Cobro registrado: $${monto} (${porcentajeNuevo}% de comisión $${montoComision} cobrada)`);

  return {
    cobro,
    venta_actualizada: cachesActualizados
  };
}

/**
 * Edita un cobro existente
 */
export async function editarCobro(params: EditarCobroParams): Promise<CobroVenta> {
  const {
    tenantId,
    cobroId,
    monto,
    moneda,
    fechaCobro,
    metodoPago,
    referencia,
    banco,
    reciboUrl,
    notas,
    usuarioId
  } = params;

  // 1. Obtener el cobro actual
  const cobroResult = await query(`
    SELECT * FROM ventas_cobros
    WHERE id = $1 AND tenant_id = $2 AND activo = true
  `, [cobroId, tenantId]);

  if (cobroResult.rows.length === 0) {
    throw new Error('Cobro no encontrado');
  }

  const cobroActual = cobroResult.rows[0];
  const ventaId = cobroActual.venta_id;

  // 2. Si cambia el monto, validar contra la COMISIÓN (no valor_cierre)
  if (monto !== undefined && monto !== parseFloat(cobroActual.monto)) {
    const ventaResult = await query(`
      SELECT monto_comision, cache_monto_cobrado FROM ventas
      WHERE id = $1 AND tenant_id = $2
    `, [ventaId, tenantId]);

    const venta = ventaResult.rows[0];
    const montoComision = parseFloat(venta.monto_comision) || 0;
    const yaCobrado = parseFloat(venta.cache_monto_cobrado) || 0;
    const otrosCobros = yaCobrado - parseFloat(cobroActual.monto);
    const pendiente = montoComision - otrosCobros;

    if (monto > pendiente + 0.01) {
      throw new Error(
        `El nuevo monto (${monto}) excede la comisión pendiente de cobro (${pendiente.toFixed(2)})`
      );
    }
  }

  // 3. Actualizar
  const updateResult = await query(`
    UPDATE ventas_cobros SET
      monto = COALESCE($3, monto),
      moneda = COALESCE($4, moneda),
      fecha_cobro = COALESCE($5, fecha_cobro),
      metodo_pago = COALESCE($6, metodo_pago),
      referencia = COALESCE($7, referencia),
      banco = COALESCE($8, banco),
      recibo_url = COALESCE($9, recibo_url),
      notas = COALESCE($10, notas),
      updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
    RETURNING *
  `, [
    cobroId,
    tenantId,
    monto,
    moneda,
    fechaCobro,
    metodoPago,
    referencia,
    banco,
    reciboUrl,
    notas
  ]);

  // 4. Recalcular caches
  await recalcularCachesVentaInterno(ventaId);

  // 5. Registrar en historial
  await registrarHistorial(tenantId, ventaId, 'cobro_editado', {
    cobro_id: cobroId,
    monto_anterior: cobroActual.monto,
    monto_nuevo: monto || cobroActual.monto
  }, usuarioId || undefined);

  return updateResult.rows[0];
}

/**
 * Obtiene los cobros de una venta
 */
export async function getCobrosVenta(tenantId: string, ventaId: string): Promise<CobroVenta[]> {
  const result = await query(`
    SELECT
      vc.*,
      u.nombre as registrado_por_nombre,
      u.apellido as registrado_por_apellido
    FROM ventas_cobros vc
    LEFT JOIN usuarios u ON vc.registrado_por_id = u.id
    WHERE vc.tenant_id = $1 AND vc.venta_id = $2 AND vc.activo = true
    ORDER BY vc.fecha_cobro DESC, vc.created_at DESC
  `, [tenantId, ventaId]);

  return result.rows;
}

/**
 * Cancela un cobro (soft delete)
 */
export async function eliminarCobro(params: {
  tenantId: string;
  cobroId: string;
  usuarioId?: string;
  razon?: string;
}): Promise<void> {
  const { tenantId, cobroId, usuarioId, razon } = params;

  // 1. Obtener el cobro
  const cobroResult = await query(`
    SELECT * FROM ventas_cobros
    WHERE id = $1 AND tenant_id = $2 AND activo = true
  `, [cobroId, tenantId]);

  if (cobroResult.rows.length === 0) {
    throw new Error('Cobro no encontrado o ya eliminado');
  }

  const cobro = cobroResult.rows[0];
  const ventaId = cobro.venta_id;

  // 2. Verificar que no haya pagos que dependan de este cobro
  const ventaResult = await query(`
    SELECT
      v.valor_cierre,
      v.monto_comision,
      v.cache_monto_cobrado,
      v.cache_monto_pagado_asesores
    FROM ventas v
    WHERE v.id = $1 AND v.tenant_id = $2
  `, [ventaId, tenantId]);

  const venta = ventaResult.rows[0];
  const nuevoMontoCobrado = parseFloat(venta.cache_monto_cobrado) - parseFloat(cobro.monto);
  const nuevoPorcentajeCobrado = nuevoMontoCobrado / parseFloat(venta.valor_cierre) * 100;
  const nuevaComisionDisponible = (nuevoPorcentajeCobrado / 100) * parseFloat(venta.monto_comision);

  if (parseFloat(venta.cache_monto_pagado_asesores) > nuevaComisionDisponible + 0.01) {
    throw new Error(
      `No se puede eliminar este cobro porque ya se han pagado comisiones que lo requieren. ` +
      `Pagado a asesores: $${venta.cache_monto_pagado_asesores}, ` +
      `Disponible después de eliminar: $${nuevaComisionDisponible.toFixed(2)}`
    );
  }

  // 3. Marcar como inactivo
  await query(`
    UPDATE ventas_cobros
    SET activo = false, updated_at = NOW()
    WHERE id = $1
  `, [cobroId]);

  // 4. Recalcular caches
  await recalcularCachesVentaInterno(ventaId);

  // 5. Registrar en historial
  await registrarHistorial(tenantId, ventaId, 'cobro_eliminado', {
    cobro_id: cobroId,
    monto: cobro.monto,
    razon: razon || 'Sin especificar'
  }, usuarioId);

  console.log(`⚠️ Cobro eliminado: $${cobro.monto}`);
}

/**
 * Obtiene resumen de cobros para una venta
 */
export async function getResumenCobros(
  tenantId: string,
  ventaId: string
): Promise<{
  valor_cierre: number;
  total_cobrado: number;
  porcentaje_cobrado: number;
  pendiente: number;
  monto_comision: number;
  comision_disponible: number;
  cobros: CobroVenta[];
}> {
  const ventaResult = await query(`
    SELECT
      valor_cierre,
      monto_comision,
      cache_monto_cobrado,
      cache_porcentaje_cobrado,
      COALESCE(cache_comision_disponible, 0) as cache_comision_disponible
    FROM ventas
    WHERE id = $1 AND tenant_id = $2
  `, [ventaId, tenantId]);

  if (ventaResult.rows.length === 0) {
    throw new Error('Venta no encontrada');
  }

  const venta = ventaResult.rows[0];
  const cobros = await getCobrosVenta(tenantId, ventaId);
  const valorCierre = parseFloat(venta.valor_cierre) || 0;
  const totalCobrado = parseFloat(venta.cache_monto_cobrado) || 0;

  return {
    valor_cierre: valorCierre,
    total_cobrado: totalCobrado,
    porcentaje_cobrado: parseFloat(venta.cache_porcentaje_cobrado) || 0,
    pendiente: valorCierre - totalCobrado,
    monto_comision: parseFloat(venta.monto_comision) || 0,
    comision_disponible: parseFloat(venta.cache_comision_disponible) || 0,
    cobros
  };
}

/**
 * Recalcula todos los caches de una venta (función pública)
 */
export async function recalcularCachesVenta(tenantId: string, ventaId: string): Promise<void> {
  const exists = await query(
    'SELECT 1 FROM ventas WHERE id = $1 AND tenant_id = $2',
    [ventaId, tenantId]
  );

  if (exists.rows.length === 0) {
    throw new Error('Venta no encontrada');
  }

  await recalcularCachesVentaInterno(ventaId);
}

/**
 * Recalcula caches de todas las ventas de un tenant
 */
export async function recalcularTodasLasVentas(tenantId: string): Promise<number> {
  const ventas = await query(`
    SELECT id FROM ventas
    WHERE tenant_id = $1 AND activo = true
  `, [tenantId]);

  for (const venta of ventas.rows) {
    await recalcularCachesVentaInterno(venta.id);
  }

  return ventas.rows.length;
}

/**
 * Registra en el historial de la venta
 */
async function registrarHistorial(
  tenantId: string,
  ventaId: string,
  tipoCambio: string,
  datosNuevos: any,
  usuarioId?: string
): Promise<void> {
  try {
    // Verificar que la tabla existe
    const tableExists = await query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'ventas_historial'
    `);

    if (tableExists.rows.length === 0) {
      console.log('⚠️ Tabla ventas_historial no existe, omitiendo registro');
      return;
    }

    let usuarioNombre = null;
    if (usuarioId) {
      const userResult = await query(
        'SELECT nombre, apellido FROM usuarios WHERE id = $1',
        [usuarioId]
      );
      if (userResult.rows.length > 0) {
        usuarioNombre = `${userResult.rows[0].nombre} ${userResult.rows[0].apellido || ''}`.trim();
      }
    }

    let descripcion = '';
    switch (tipoCambio) {
      case 'cobro_registrado':
        descripcion = `Cobro registrado por $${datosNuevos.monto} (${datosNuevos.porcentaje_cobrado}% cobrado)`;
        break;
      case 'cobro_editado':
        descripcion = `Cobro editado: $${datosNuevos.monto_anterior} → $${datosNuevos.monto_nuevo}`;
        break;
      case 'cobro_eliminado':
        descripcion = `Cobro eliminado por $${datosNuevos.monto}. Razón: ${datosNuevos.razon}`;
        break;
      default:
        descripcion = `${tipoCambio}: ${JSON.stringify(datosNuevos)}`;
    }

    await query(`
      INSERT INTO ventas_historial (
        tenant_id, venta_id, tipo_cambio, entidad, entidad_id,
        datos_nuevos, descripcion, usuario_id, usuario_nombre
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      tenantId,
      ventaId,
      tipoCambio,
      'ventas_cobros',
      datosNuevos.cobro_id || null,
      JSON.stringify(datosNuevos),
      descripcion,
      usuarioId || null,
      usuarioNombre
    ]);
  } catch (error) {
    console.error('Error registrando historial:', error);
    // No lanzar error, el historial es secundario
  }
}

// ============================================================
// ADJUNTOS DE COBROS
// ============================================================

export interface CobroAdjunto {
  id: string;
  tenant_id: string;
  cobro_id: string;
  url: string;
  nombre_archivo: string | null;
  tipo_archivo: string | null;
  tamaño_bytes: number | null;
  descripcion: string | null;
  subido_por_id: string | null;
  created_at: string;
  subido_por_nombre?: string;
}

export interface AgregarAdjuntoParams {
  tenantId: string;
  cobroId: string;
  url: string;
  nombreArchivo?: string;
  tipoArchivo?: string;
  tamañoBytes?: number;
  descripcion?: string;
  subidoPorId?: string;
}

/**
 * Agrega un archivo adjunto a un cobro existente
 */
export async function agregarAdjuntoCobro(params: AgregarAdjuntoParams): Promise<CobroAdjunto> {
  const {
    tenantId,
    cobroId,
    url,
    nombreArchivo,
    tipoArchivo,
    tamañoBytes,
    descripcion,
    subidoPorId
  } = params;

  // Verificar que el cobro existe y pertenece al tenant
  const cobroResult = await query(`
    SELECT id, venta_id FROM ventas_cobros
    WHERE id = $1 AND tenant_id = $2 AND activo = true
  `, [cobroId, tenantId]);

  if (cobroResult.rows.length === 0) {
    throw new Error('Cobro no encontrado');
  }

  // Insertar adjunto
  const insertResult = await query(`
    INSERT INTO ventas_cobros_adjuntos (
      tenant_id, cobro_id, url, nombre_archivo, tipo_archivo,
      tamaño_bytes, descripcion, subido_por_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [
    tenantId,
    cobroId,
    url,
    nombreArchivo || null,
    tipoArchivo || null,
    tamañoBytes || null,
    descripcion || null,
    subidoPorId || null
  ]);

  console.log(`✅ Adjunto agregado al cobro ${cobroId}: ${nombreArchivo || url}`);

  return insertResult.rows[0];
}

/**
 * Obtiene los adjuntos de un cobro
 */
export async function getAdjuntosCobro(tenantId: string, cobroId: string): Promise<CobroAdjunto[]> {
  const result = await query(`
    SELECT
      a.*,
      COALESCE(u.nombre || ' ' || u.apellido, '') as subido_por_nombre
    FROM ventas_cobros_adjuntos a
    LEFT JOIN usuarios u ON a.subido_por_id = u.id
    WHERE a.tenant_id = $1 AND a.cobro_id = $2
    ORDER BY a.created_at DESC
  `, [tenantId, cobroId]);

  return result.rows;
}

/**
 * Elimina un adjunto de un cobro
 */
export async function eliminarAdjuntoCobro(
  tenantId: string,
  adjuntoId: string
): Promise<void> {
  const deleteResult = await query(`
    DELETE FROM ventas_cobros_adjuntos
    WHERE id = $1 AND tenant_id = $2
    RETURNING *
  `, [adjuntoId, tenantId]);

  if (deleteResult.rows.length === 0) {
    throw new Error('Adjunto no encontrado');
  }

  console.log(`⚠️ Adjunto eliminado: ${deleteResult.rows[0].nombre_archivo || adjuntoId}`);
}
