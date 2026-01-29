/**
 * Servicio de Cálculo de Facturación
 *
 * Calcula facturas, genera facturas automáticas, proyecta costos
 * y gestiona estados de cuenta de tenants.
 */

import { query, getClient } from '../utils/db.js';
import { getMembresiaTenant, getLimitesTenant, actualizarEstadoCuenta } from './membershipService.js';
import { getUsoTenant, calcularCostosPeriodo, getOrCreateUsoPeriodo, CostosPeriodo, FeatureActivo } from './usageTrackingService.js';

// ==================== TIPOS ====================

export interface CalculoFactura {
  tenant_id: string;
  tenant_nombre: string;
  tipo_membresia_id: string | null;
  tipo_membresia_nombre: string | null;
  periodo: {
    inicio: string;
    fin: string;
  };
  // Desglose base
  costo_base: number;
  // Usuarios
  usuarios_incluidos: number;
  usuarios_activos: number;
  usuarios_max_periodo: number;
  usuarios_extra: number;
  costo_usuario_adicional: number;
  costo_usuarios_extra: number;
  // Propiedades
  propiedades_incluidas: number;
  propiedades_publicadas: number;
  propiedades_max_periodo: number;
  propiedades_extra: number;
  costo_propiedad_adicional: number;
  costo_propiedades_extra: number;
  // Features
  features_extra: FeatureActivo[];
  costo_features_extra: number;
  // Totales
  subtotal: number;
  descuento: number;
  descuento_porcentaje: number;
  descripcion_descuento: string | null;
  total: number;
  moneda: string;
}

export interface ProyeccionCosto {
  tenant_id: string;
  costo_actual: number;
  costo_proyectado: number;
  moneda: string;
  desglose: {
    base: number;
    usuarios_extra: number;
    propiedades_extra: number;
    features: number;
  };
  tendencia: 'estable' | 'subiendo' | 'bajando';
  nota?: string;
}

export interface EstadoCuenta {
  tenant_id: string;
  tenant_nombre: string;
  estado: 'al_dia' | 'por_vencer' | 'vencido' | 'suspendido';
  saldo_pendiente: number;
  fecha_ultimo_pago: string | null;
  facturas_pendientes: number;
  facturas_vencidas: number;
  proxima_factura?: {
    monto_estimado: number;
    fecha_emision: string;
  };
}

export interface FacturaGenerada {
  id: string;
  numero_factura: string;
  tenant_id: string;
  monto: number;
  moneda: string;
  estado: string;
  fecha_emision: string;
  fecha_vencimiento: string;
}

// ==================== CÁLCULO DE FACTURA ====================

/**
 * Calcula la factura de un tenant para un período dado
 */
export async function calcularFacturaTenant(
  tenantId: string,
  periodo?: { inicio: Date; fin: Date }
): Promise<CalculoFactura> {
  // Obtener info del tenant
  const tenantResult = await query(
    `SELECT
      t.id, t.nombre, t.tipo_membresia_id, t.descuento_porcentaje,
      tm.nombre as tipo_membresia_nombre, tm.precio_base, tm.moneda,
      tm.usuarios_incluidos, tm.propiedades_incluidas,
      tm.costo_usuario_adicional, tm.costo_propiedad_adicional
    FROM tenants t
    LEFT JOIN tipos_membresia tm ON t.tipo_membresia_id = tm.id
    WHERE t.id = $1`,
    [tenantId]
  );

  if (tenantResult.rows.length === 0) {
    throw new Error('Tenant no encontrado');
  }

  const tenant = tenantResult.rows[0];

  // Obtener o crear uso del período
  const uso = await getOrCreateUsoPeriodo(tenantId);

  // Calcular costos del período
  const costos = await calcularCostosPeriodo(tenantId);

  // Aplicar descuento si existe
  const descuentoPorcentaje = parseFloat(tenant.descuento_porcentaje) || 0;
  const descuento = (costos.subtotal * descuentoPorcentaje) / 100;
  const total = costos.subtotal - descuento;

  return {
    tenant_id: tenantId,
    tenant_nombre: tenant.nombre,
    tipo_membresia_id: tenant.tipo_membresia_id,
    tipo_membresia_nombre: tenant.tipo_membresia_nombre,
    periodo: {
      inicio: uso.periodo_inicio.toISOString().split('T')[0],
      fin: uso.periodo_fin.toISOString().split('T')[0],
    },
    // Desglose base
    costo_base: costos.costo_base,
    // Usuarios
    usuarios_incluidos: costos.usuarios_incluidos,
    usuarios_activos: costos.usuarios_activos,
    usuarios_max_periodo: costos.usuarios_activos, // uso.usuarios_max_periodo
    usuarios_extra: costos.usuarios_extra,
    costo_usuario_adicional: parseFloat(tenant.costo_usuario_adicional) || 0,
    costo_usuarios_extra: costos.costo_usuarios_extra,
    // Propiedades
    propiedades_incluidas: costos.propiedades_incluidas,
    propiedades_publicadas: costos.propiedades_publicadas,
    propiedades_max_periodo: costos.propiedades_publicadas, // uso.propiedades_max_periodo
    propiedades_extra: costos.propiedades_extra,
    costo_propiedad_adicional: parseFloat(tenant.costo_propiedad_adicional) || 0,
    costo_propiedades_extra: costos.costo_propiedades_extra,
    // Features
    features_extra: costos.features_extra,
    costo_features_extra: costos.costo_features_extra,
    // Totales
    subtotal: costos.subtotal,
    descuento,
    descuento_porcentaje: descuentoPorcentaje,
    descripcion_descuento: descuentoPorcentaje > 0 ? `Descuento cliente: ${descuentoPorcentaje}%` : null,
    total,
    moneda: costos.moneda,
  };
}

// ==================== GENERACIÓN DE FACTURAS ====================

/**
 * Genera una factura para un tenant basado en el período actual
 */
export async function generarFactura(
  tenantId: string,
  opciones?: {
    fecha_vencimiento?: Date;
    notas?: string;
    forzar?: boolean;
  }
): Promise<FacturaGenerada> {
  const calculo = await calcularFacturaTenant(tenantId);

  // Verificar si ya existe factura para este período (a menos que se fuerce)
  if (!opciones?.forzar) {
    const existeResult = await query(
      `SELECT id FROM facturas
       WHERE tenant_id = $1
       AND fecha_emision >= $2
       AND fecha_emision <= $3`,
      [tenantId, calculo.periodo.inicio, calculo.periodo.fin]
    );

    if (existeResult.rows.length > 0) {
      throw new Error('Ya existe una factura para este período');
    }
  }

  // Generar número de factura
  const numeroFactura = await generarNumeroFactura();

  // Fecha de vencimiento (por defecto 15 días después de emisión)
  const fechaEmision = new Date();
  const fechaVencimiento = opciones?.fecha_vencimiento || new Date(fechaEmision.getTime() + 15 * 24 * 60 * 60 * 1000);

  // Obtener uso del período
  const uso = await getUsoTenant(tenantId);

  // Insertar factura
  const insertResult = await query(
    `INSERT INTO facturas (
      tenant_id, numero_factura, plan, monto, moneda, estado,
      fecha_emision, fecha_vencimiento, detalles, notas,
      tipo_membresia_id, uso_tenant_id,
      costo_base, costo_usuarios_extra, cantidad_usuarios_extra,
      costo_propiedades_extra, cantidad_propiedades_extra,
      costo_features, features_facturados,
      descuento, descripcion_descuento, subtotal
    ) VALUES (
      $1, $2, $3, $4, $5, 'pendiente',
      $6, $7, $8, $9,
      $10, $11,
      $12, $13, $14,
      $15, $16,
      $17, $18,
      $19, $20, $21
    ) RETURNING id, numero_factura, tenant_id, monto, moneda, estado, fecha_emision, fecha_vencimiento`,
    [
      tenantId,
      numeroFactura,
      calculo.tipo_membresia_nombre || 'Sin plan',
      calculo.total,
      calculo.moneda,
      fechaEmision.toISOString(),
      fechaVencimiento.toISOString(),
      JSON.stringify({
        periodo: calculo.periodo,
        desglose: {
          base: calculo.costo_base,
          usuarios: {
            incluidos: calculo.usuarios_incluidos,
            activos: calculo.usuarios_activos,
            extra: calculo.usuarios_extra,
            costo: calculo.costo_usuarios_extra,
          },
          propiedades: {
            incluidas: calculo.propiedades_incluidas,
            publicadas: calculo.propiedades_publicadas,
            extra: calculo.propiedades_extra,
            costo: calculo.costo_propiedades_extra,
          },
          features: calculo.features_extra,
        },
      }),
      opciones?.notas || null,
      calculo.tipo_membresia_id,
      uso?.id || null,
      calculo.costo_base,
      calculo.costo_usuarios_extra,
      calculo.usuarios_extra,
      calculo.costo_propiedades_extra,
      calculo.propiedades_extra,
      calculo.costo_features_extra,
      JSON.stringify(calculo.features_extra),
      calculo.descuento,
      calculo.descripcion_descuento,
      calculo.subtotal,
    ]
  );

  // Actualizar saldo pendiente del tenant
  await query(
    `UPDATE tenants SET saldo_pendiente = saldo_pendiente + $1, updated_at = NOW() WHERE id = $2`,
    [calculo.total, tenantId]
  );

  console.log(`📄 Factura ${numeroFactura} generada para tenant ${tenantId}: $${calculo.total} ${calculo.moneda}`);

  return insertResult.rows[0];
}

/**
 * Genera un número de factura único
 */
async function generarNumeroFactura(): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');

  // Obtener el último número de factura del mes
  const result = await query(
    `SELECT numero_factura FROM facturas
     WHERE numero_factura LIKE $1
     ORDER BY numero_factura DESC LIMIT 1`,
    [`FAC-${year}${month}-%`]
  );

  let secuencia = 1;
  if (result.rows.length > 0) {
    const ultimoNumero = result.rows[0].numero_factura;
    const ultimaSecuencia = parseInt(ultimoNumero.split('-')[2], 10);
    secuencia = ultimaSecuencia + 1;
  }

  return `FAC-${year}${month}-${String(secuencia).padStart(4, '0')}`;
}

// ==================== PROYECCIONES ====================

/**
 * Proyecta el costo mensual de un tenant basado en uso actual
 */
export async function proyectarCostoMensual(tenantId: string): Promise<ProyeccionCosto> {
  const calculo = await calcularFacturaTenant(tenantId);

  // Obtener factura del mes anterior para comparar
  const mesAnterior = new Date();
  mesAnterior.setMonth(mesAnterior.getMonth() - 1);

  const facturaAnteriorResult = await query(
    `SELECT monto FROM facturas
     WHERE tenant_id = $1
     AND EXTRACT(MONTH FROM fecha_emision) = $2
     AND EXTRACT(YEAR FROM fecha_emision) = $3
     ORDER BY fecha_emision DESC LIMIT 1`,
    [tenantId, mesAnterior.getMonth() + 1, mesAnterior.getFullYear()]
  );

  let tendencia: 'estable' | 'subiendo' | 'bajando' = 'estable';
  let nota: string | undefined;

  if (facturaAnteriorResult.rows.length > 0) {
    const montoAnterior = parseFloat(facturaAnteriorResult.rows[0].monto);
    const diferencia = calculo.total - montoAnterior;
    const porcentajeCambio = (diferencia / montoAnterior) * 100;

    if (porcentajeCambio > 5) {
      tendencia = 'subiendo';
      nota = `Incremento del ${porcentajeCambio.toFixed(1)}% vs mes anterior`;
    } else if (porcentajeCambio < -5) {
      tendencia = 'bajando';
      nota = `Reducción del ${Math.abs(porcentajeCambio).toFixed(1)}% vs mes anterior`;
    }
  }

  return {
    tenant_id: tenantId,
    costo_actual: calculo.total,
    costo_proyectado: calculo.total, // En este caso es igual ya que es el mes actual
    moneda: calculo.moneda,
    desglose: {
      base: calculo.costo_base,
      usuarios_extra: calculo.costo_usuarios_extra,
      propiedades_extra: calculo.costo_propiedades_extra,
      features: calculo.costo_features_extra,
    },
    tendencia,
    nota,
  };
}

// ==================== ESTADO DE CUENTA ====================

/**
 * Obtiene el estado de cuenta de un tenant
 */
export async function getEstadoCuenta(tenantId: string): Promise<EstadoCuenta> {
  // Obtener info del tenant
  const tenantResult = await query(
    `SELECT
      t.id, t.nombre, t.estado_cuenta, t.saldo_pendiente, t.fecha_ultimo_pago
    FROM tenants t
    WHERE t.id = $1`,
    [tenantId]
  );

  if (tenantResult.rows.length === 0) {
    throw new Error('Tenant no encontrado');
  }

  const tenant = tenantResult.rows[0];

  // Contar facturas pendientes y vencidas
  const facturasResult = await query(
    `SELECT
      COUNT(*) FILTER (WHERE estado = 'pendiente') as pendientes,
      COUNT(*) FILTER (WHERE estado = 'vencida') as vencidas
    FROM facturas
    WHERE tenant_id = $1`,
    [tenantId]
  );

  const facturas = facturasResult.rows[0];

  // Calcular próxima factura estimada
  let proximaFactura: EstadoCuenta['proxima_factura'];
  try {
    const calculo = await calcularFacturaTenant(tenantId);
    const proximaEmision = new Date();
    proximaEmision.setMonth(proximaEmision.getMonth() + 1);
    proximaEmision.setDate(1);

    proximaFactura = {
      monto_estimado: calculo.total,
      fecha_emision: proximaEmision.toISOString().split('T')[0],
    };
  } catch {
    // Si no se puede calcular, no incluir
  }

  return {
    tenant_id: tenantId,
    tenant_nombre: tenant.nombre,
    estado: tenant.estado_cuenta,
    saldo_pendiente: parseFloat(tenant.saldo_pendiente) || 0,
    fecha_ultimo_pago: tenant.fecha_ultimo_pago,
    facturas_pendientes: parseInt(facturas.pendientes) || 0,
    facturas_vencidas: parseInt(facturas.vencidas) || 0,
    proxima_factura: proximaFactura,
  };
}

/**
 * Verifica y actualiza el estado de cuenta basado en facturas
 */
export async function verificarYActualizarEstadoCuenta(tenantId: string): Promise<string> {
  // Obtener facturas vencidas
  const facturasResult = await query(
    `SELECT
      COUNT(*) FILTER (WHERE estado = 'vencida') as vencidas,
      MAX(fecha_vencimiento) FILTER (WHERE estado = 'vencida') as fecha_vencimiento_mas_antigua
    FROM facturas
    WHERE tenant_id = $1 AND estado IN ('pendiente', 'vencida')`,
    [tenantId]
  );

  const facturas = facturasResult.rows[0];
  const facturasVencidas = parseInt(facturas.vencidas) || 0;

  let nuevoEstado: 'al_dia' | 'por_vencer' | 'vencido' | 'suspendido' = 'al_dia';

  if (facturasVencidas > 0) {
    // Verificar cuánto tiempo ha pasado desde el vencimiento
    if (facturas.fecha_vencimiento_mas_antigua) {
      const fechaVencimiento = new Date(facturas.fecha_vencimiento_mas_antigua);
      const diasVencido = Math.floor((Date.now() - fechaVencimiento.getTime()) / (1000 * 60 * 60 * 24));

      if (diasVencido > 30) {
        nuevoEstado = 'suspendido';
      } else {
        nuevoEstado = 'vencido';
      }
    } else {
      nuevoEstado = 'vencido';
    }
  } else {
    // Verificar si hay facturas por vencer en los próximos 7 días
    const proximasResult = await query(
      `SELECT COUNT(*) as count FROM facturas
       WHERE tenant_id = $1
       AND estado = 'pendiente'
       AND fecha_vencimiento <= CURRENT_DATE + INTERVAL '7 days'`,
      [tenantId]
    );

    if (parseInt(proximasResult.rows[0].count) > 0) {
      nuevoEstado = 'por_vencer';
    }
  }

  // Actualizar estado
  await actualizarEstadoCuenta(tenantId, nuevoEstado);

  return nuevoEstado;
}

// ==================== GESTIÓN DE PAGOS ====================

/**
 * Registra un pago y actualiza facturas
 */
export async function registrarPago(
  tenantId: string,
  monto: number,
  opciones?: {
    factura_id?: string;
    metodo_pago?: string;
    referencia_pago?: string;
    notas?: string;
  }
): Promise<{
  monto_aplicado: number;
  facturas_pagadas: string[];
  saldo_restante: number;
}> {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    let montoRestante = monto;
    const facturasPagadas: string[] = [];

    // Si se especifica una factura, pagar esa primero
    if (opciones?.factura_id) {
      const facturaResult = await client.query(
        `SELECT id, monto, estado FROM facturas WHERE id = $1 AND tenant_id = $2`,
        [opciones.factura_id, tenantId]
      );

      if (facturaResult.rows.length > 0) {
        const factura = facturaResult.rows[0];
        const montoFactura = parseFloat(factura.monto);

        if (montoRestante >= montoFactura) {
          // Pagar factura completa
          await client.query(
            `UPDATE facturas SET
              estado = 'pagada',
              fecha_pago = NOW(),
              metodo_pago = $1,
              referencia_pago = $2
            WHERE id = $3`,
            [opciones.metodo_pago || null, opciones.referencia_pago || null, factura.id]
          );
          facturasPagadas.push(factura.id);
          montoRestante -= montoFactura;
        }
      }
    }

    // Pagar facturas pendientes/vencidas en orden de antigüedad
    if (montoRestante > 0) {
      const facturasResult = await client.query(
        `SELECT id, monto FROM facturas
         WHERE tenant_id = $1 AND estado IN ('pendiente', 'vencida')
         ORDER BY fecha_vencimiento ASC`,
        [tenantId]
      );

      for (const factura of facturasResult.rows) {
        if (montoRestante <= 0) break;

        const montoFactura = parseFloat(factura.monto);

        if (montoRestante >= montoFactura) {
          await client.query(
            `UPDATE facturas SET
              estado = 'pagada',
              fecha_pago = NOW(),
              metodo_pago = $1,
              referencia_pago = $2
            WHERE id = $3`,
            [opciones?.metodo_pago || null, opciones?.referencia_pago || null, factura.id]
          );
          facturasPagadas.push(factura.id);
          montoRestante -= montoFactura;
        }
      }
    }

    // Actualizar saldo del tenant
    const montoAplicado = monto - montoRestante;
    await client.query(
      `UPDATE tenants SET
        saldo_pendiente = GREATEST(0, saldo_pendiente - $1),
        fecha_ultimo_pago = CURRENT_DATE,
        updated_at = NOW()
      WHERE id = $2`,
      [montoAplicado, tenantId]
    );

    await client.query('COMMIT');

    // Verificar y actualizar estado de cuenta
    await verificarYActualizarEstadoCuenta(tenantId);

    console.log(`💰 Pago de $${monto} procesado para tenant ${tenantId}. Facturas pagadas: ${facturasPagadas.length}`);

    return {
      monto_aplicado: montoAplicado,
      facturas_pagadas: facturasPagadas,
      saldo_restante: montoRestante,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Cambia el estado de una factura
 */
export async function cambiarEstadoFactura(
  facturaId: string,
  nuevoEstado: 'pendiente' | 'pagada' | 'vencida' | 'cancelada',
  opciones?: {
    metodo_pago?: string;
    referencia_pago?: string;
    notas?: string;
  }
): Promise<void> {
  const updates: string[] = ['estado = $1', 'updated_at = NOW()'];
  const values: any[] = [nuevoEstado];
  let paramCount = 2;

  if (nuevoEstado === 'pagada') {
    updates.push(`fecha_pago = NOW()`);
    if (opciones?.metodo_pago) {
      updates.push(`metodo_pago = $${paramCount}`);
      values.push(opciones.metodo_pago);
      paramCount++;
    }
    if (opciones?.referencia_pago) {
      updates.push(`referencia_pago = $${paramCount}`);
      values.push(opciones.referencia_pago);
      paramCount++;
    }
  }

  if (opciones?.notas) {
    updates.push(`notas = COALESCE(notas, '') || E'\\n' || $${paramCount}`);
    values.push(opciones.notas);
    paramCount++;
  }

  values.push(facturaId);

  const sql = `UPDATE facturas SET ${updates.join(', ')} WHERE id = $${paramCount}`;
  await query(sql, values);

  // Si se pagó, actualizar saldo del tenant
  if (nuevoEstado === 'pagada') {
    const facturaResult = await query(
      `SELECT tenant_id, monto FROM facturas WHERE id = $1`,
      [facturaId]
    );

    if (facturaResult.rows.length > 0) {
      const { tenant_id, monto } = facturaResult.rows[0];
      await query(
        `UPDATE tenants SET
          saldo_pendiente = GREATEST(0, saldo_pendiente - $1),
          fecha_ultimo_pago = CURRENT_DATE,
          updated_at = NOW()
        WHERE id = $2`,
        [parseFloat(monto), tenant_id]
      );

      // Actualizar estado de cuenta
      await verificarYActualizarEstadoCuenta(tenant_id);
    }
  }

  console.log(`📄 Estado de factura ${facturaId} cambiado a: ${nuevoEstado}`);
}

// ==================== REPORTES ====================

/**
 * Obtiene un resumen de facturación de todos los tenants
 */
export async function getResumenFacturacion(filtros?: {
  mes?: number;
  anio?: number;
  estado?: string;
}): Promise<{
  total_facturado: number;
  total_cobrado: number;
  total_pendiente: number;
  total_vencido: number;
  moneda: string;
  por_estado: { estado: string; cantidad: number; monto: number }[];
  por_membresia: { tipo: string; cantidad: number; monto: number }[];
}> {
  const mes = filtros?.mes || new Date().getMonth() + 1;
  const anio = filtros?.anio || new Date().getFullYear();

  let sql = `
    SELECT
      COALESCE(SUM(monto), 0) as total_facturado,
      COALESCE(SUM(monto) FILTER (WHERE estado = 'pagada'), 0) as total_cobrado,
      COALESCE(SUM(monto) FILTER (WHERE estado = 'pendiente'), 0) as total_pendiente,
      COALESCE(SUM(monto) FILTER (WHERE estado = 'vencida'), 0) as total_vencido
    FROM facturas
    WHERE EXTRACT(MONTH FROM fecha_emision) = $1
    AND EXTRACT(YEAR FROM fecha_emision) = $2
  `;

  const params: any[] = [mes, anio];

  if (filtros?.estado) {
    sql += ` AND estado = $3`;
    params.push(filtros.estado);
  }

  const totalesResult = await query(sql, params);
  const totales = totalesResult.rows[0];

  // Por estado
  const porEstadoResult = await query(
    `SELECT estado, COUNT(*) as cantidad, COALESCE(SUM(monto), 0) as monto
     FROM facturas
     WHERE EXTRACT(MONTH FROM fecha_emision) = $1
     AND EXTRACT(YEAR FROM fecha_emision) = $2
     GROUP BY estado`,
    [mes, anio]
  );

  // Por tipo de membresía
  const porMembresiaResult = await query(
    `SELECT
      COALESCE(tm.nombre, 'Sin membresía') as tipo,
      COUNT(*) as cantidad,
      COALESCE(SUM(f.monto), 0) as monto
    FROM facturas f
    LEFT JOIN tipos_membresia tm ON f.tipo_membresia_id = tm.id
    WHERE EXTRACT(MONTH FROM f.fecha_emision) = $1
    AND EXTRACT(YEAR FROM f.fecha_emision) = $2
    GROUP BY tm.nombre`,
    [mes, anio]
  );

  return {
    total_facturado: parseFloat(totales.total_facturado) || 0,
    total_cobrado: parseFloat(totales.total_cobrado) || 0,
    total_pendiente: parseFloat(totales.total_pendiente) || 0,
    total_vencido: parseFloat(totales.total_vencido) || 0,
    moneda: 'USD',
    por_estado: porEstadoResult.rows.map((r) => ({
      estado: r.estado,
      cantidad: parseInt(r.cantidad),
      monto: parseFloat(r.monto),
    })),
    por_membresia: porMembresiaResult.rows.map((r) => ({
      tipo: r.tipo,
      cantidad: parseInt(r.cantidad),
      monto: parseFloat(r.monto),
    })),
  };
}

/**
 * Obtiene factura por ID con detalles completos
 */
export async function getFacturaDetallada(facturaId: string): Promise<any> {
  const result = await query(
    `SELECT
      f.*,
      t.nombre as tenant_nombre,
      tm.nombre as tipo_membresia_nombre
    FROM facturas f
    JOIN tenants t ON f.tenant_id = t.id
    LEFT JOIN tipos_membresia tm ON f.tipo_membresia_id = tm.id
    WHERE f.id = $1`,
    [facturaId]
  );

  if (result.rows.length === 0) {
    throw new Error('Factura no encontrada');
  }

  const factura = result.rows[0];

  return {
    ...factura,
    monto: parseFloat(factura.monto),
    costo_base: parseFloat(factura.costo_base) || 0,
    costo_usuarios_extra: parseFloat(factura.costo_usuarios_extra) || 0,
    costo_propiedades_extra: parseFloat(factura.costo_propiedades_extra) || 0,
    costo_features: parseFloat(factura.costo_features) || 0,
    descuento: parseFloat(factura.descuento) || 0,
    subtotal: parseFloat(factura.subtotal) || 0,
    features_facturados: factura.features_facturados || [],
  };
}

export default {
  // Cálculo
  calcularFacturaTenant,

  // Generación
  generarFactura,

  // Proyecciones
  proyectarCostoMensual,

  // Estado de cuenta
  getEstadoCuenta,
  verificarYActualizarEstadoCuenta,

  // Pagos
  registrarPago,
  cambiarEstadoFactura,

  // Reportes
  getResumenFacturacion,
  getFacturaDetallada,
};
