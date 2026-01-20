/**
 * Servicio de Sistema de Fases (Versión Simplificada)
 *
 * Sistema de gamificación para distribución de leads del pool publicitario.
 *
 * CONCEPTOS:
 * - Los leads del pool se distribuyen proporcionalmente según la fase del asesor
 * - Fase 1 = 100, Fase 2 = 150, Fase 3 = 200, Fase 4 = 250, Fase 5 = 300 (pesos)
 * - Vender = subir de fase, no vender en el mes = bajar de fase
 * - Fase 1 sin venta 3 meses = modo solitario (sin leads del pool)
 * - Ventas de leads del pool = comisión especial (50/50 configurable)
 * - PRESTIGE: cada 3 ventas en Fase 5 = +1 PRESTIGE (permanente)
 * - ULTRA: récord de ventas en un mes (permanente)
 */

import { query } from '../utils/db.js';

// ==================== INTERFACES ====================

export interface ConfigSistemaFases {
  id: string;
  tenant_id: string;
  activo: boolean;
  propiedad_pool_id: string | null;
  comision_asesor_pct: number;
  comision_empresa_pct: number;
  peso_fase_1: number;
  peso_fase_2: number;
  peso_fase_3: number;
  peso_fase_4: number;
  peso_fase_5: number;
  intentos_fase_1: number;
  meses_solitario_max: number;
  created_at: Date;
  updated_at: Date;
}

export interface AsesorFases {
  usuario_id: string;
  tenant_id: string;
  nombre: string;
  apellido: string;
  email: string;
  en_sistema_fases: boolean;
  fase_actual: number;
  en_modo_solitario: boolean;
  intentos_fase_1_usados: number;
  meses_solitario_sin_venta: number;
  prestige: number;
  ventas_fase_5_contador: number;
  ultra_record: number;
  ultra_mes: string | null;
  ventas_mes_actual: number;
  mes_tracking: string | null;
  fecha_ingreso_fases: Date | null;
}

export interface LeadPool {
  id: string;
  tenant_id: string;
  nombre: string;
  apellido: string | null;
  email: string | null;
  telefono: string | null;
  es_lead_pool: boolean;
  origen_lead: string | null;
  lead_asignado_a: string | null;
  fecha_asignacion_lead: Date | null;
  asesor_nombre?: string;
  asesor_apellido?: string;
}

export interface CreateConfigData {
  propiedad_pool_id?: string;
  comision_asesor_pct?: number;
  comision_empresa_pct?: number;
  peso_fase_1?: number;
  peso_fase_2?: number;
  peso_fase_3?: number;
  peso_fase_4?: number;
  peso_fase_5?: number;
  intentos_fase_1?: number;
  meses_solitario_max?: number;
}

// ==================== CONFIGURACIÓN DEL SISTEMA ====================

/**
 * Obtiene la configuración del sistema de fases para un tenant
 */
export async function getConfig(tenantId: string): Promise<ConfigSistemaFases | null> {
  const sql = `
    SELECT * FROM config_sistema_fases WHERE tenant_id = $1
  `;
  const result = await query(sql, [tenantId]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Crea o actualiza la configuración del sistema de fases
 */
export async function upsertConfig(tenantId: string, data: CreateConfigData): Promise<ConfigSistemaFases> {
  const existing = await getConfig(tenantId);

  if (existing) {
    // Update
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fields = [
      'propiedad_pool_id', 'comision_asesor_pct', 'comision_empresa_pct',
      'peso_fase_1', 'peso_fase_2', 'peso_fase_3', 'peso_fase_4', 'peso_fase_5',
      'intentos_fase_1', 'meses_solitario_max'
    ];

    for (const field of fields) {
      if ((data as any)[field] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        values.push((data as any)[field]);
      }
    }

    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      values.push(existing.id);

      const sql = `
        UPDATE config_sistema_fases SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      const result = await query(sql, values);
      return result.rows[0];
    }
    return existing;
  } else {
    // Insert
    const sql = `
      INSERT INTO config_sistema_fases (
        tenant_id, activo, propiedad_pool_id,
        comision_asesor_pct, comision_empresa_pct,
        peso_fase_1, peso_fase_2, peso_fase_3, peso_fase_4, peso_fase_5,
        intentos_fase_1, meses_solitario_max
      ) VALUES (
        $1, true, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      )
      RETURNING *
    `;
    const result = await query(sql, [
      tenantId,
      data.propiedad_pool_id || null,
      data.comision_asesor_pct ?? 50.00,
      data.comision_empresa_pct ?? 50.00,
      data.peso_fase_1 ?? 100,
      data.peso_fase_2 ?? 150,
      data.peso_fase_3 ?? 200,
      data.peso_fase_4 ?? 250,
      data.peso_fase_5 ?? 300,
      data.intentos_fase_1 ?? 3,
      data.meses_solitario_max ?? 3
    ]);
    return result.rows[0];
  }
}

/**
 * Activa o desactiva el sistema de fases
 */
export async function toggleSistema(tenantId: string, activo: boolean): Promise<ConfigSistemaFases> {
  const existing = await getConfig(tenantId);

  if (!existing) {
    // Crear config por defecto si no existe
    await upsertConfig(tenantId, {});
  }

  const sql = `
    UPDATE config_sistema_fases
    SET activo = $1, updated_at = NOW()
    WHERE tenant_id = $2
    RETURNING *
  `;
  const result = await query(sql, [activo, tenantId]);
  return result.rows[0];
}

// ==================== ASESORES EN EL SISTEMA ====================

/**
 * Obtiene todos los asesores con su estado en el sistema de fases
 */
export async function getAsesores(tenantId: string): Promise<AsesorFases[]> {
  const sql = `
    SELECT
      u.id as usuario_id,
      ut.tenant_id,
      u.nombre,
      u.apellido,
      u.email,
      COALESCE(ut.en_sistema_fases, false) as en_sistema_fases,
      COALESCE(ut.fase_actual, 1) as fase_actual,
      COALESCE(ut.en_modo_solitario, false) as en_modo_solitario,
      COALESCE(ut.intentos_fase_1_usados, 0) as intentos_fase_1_usados,
      COALESCE(ut.meses_solitario_sin_venta, 0) as meses_solitario_sin_venta,
      COALESCE(ut.prestige, 0) as prestige,
      COALESCE(ut.ventas_fase_5_contador, 0) as ventas_fase_5_contador,
      COALESCE(ut.ultra_record, 0) as ultra_record,
      ut.ultra_mes,
      COALESCE(ut.ventas_mes_actual, 0) as ventas_mes_actual,
      ut.mes_tracking,
      ut.fecha_ingreso_fases
    FROM usuarios u
    INNER JOIN usuarios_tenants ut ON u.id = ut.usuario_id
    WHERE ut.tenant_id = $1 AND ut.activo = true
    ORDER BY
      ut.en_sistema_fases DESC,
      ut.fase_actual DESC,
      ut.prestige DESC,
      ut.ultra_record DESC,
      u.nombre ASC
  `;
  const result = await query(sql, [tenantId]);
  return result.rows;
}

/**
 * Obtiene asesores que están activamente en el sistema de fases
 */
export async function getAsesoresActivos(tenantId: string): Promise<AsesorFases[]> {
  const sql = `
    SELECT
      u.id as usuario_id,
      ut.tenant_id,
      u.nombre,
      u.apellido,
      u.email,
      ut.en_sistema_fases,
      ut.fase_actual,
      ut.en_modo_solitario,
      ut.intentos_fase_1_usados,
      ut.meses_solitario_sin_venta,
      ut.prestige,
      ut.ventas_fase_5_contador,
      ut.ultra_record,
      ut.ultra_mes,
      ut.ventas_mes_actual,
      ut.mes_tracking,
      ut.fecha_ingreso_fases
    FROM usuarios u
    INNER JOIN usuarios_tenants ut ON u.id = ut.usuario_id
    WHERE ut.tenant_id = $1
      AND ut.activo = true
      AND ut.en_sistema_fases = true
    ORDER BY
      ut.fase_actual DESC,
      ut.prestige DESC
  `;
  const result = await query(sql, [tenantId]);
  return result.rows;
}

/**
 * Agrega un asesor al sistema de fases
 */
export async function agregarAsesor(tenantId: string, usuarioId: string): Promise<AsesorFases> {
  const sql = `
    UPDATE usuarios_tenants
    SET
      en_sistema_fases = true,
      fase_actual = 1,
      en_modo_solitario = false,
      intentos_fase_1_usados = 0,
      meses_solitario_sin_venta = 0,
      ventas_mes_actual = 0,
      mes_tracking = TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
      fecha_ingreso_fases = NOW(),
      updated_at = NOW()
    WHERE tenant_id = $1 AND usuario_id = $2
    RETURNING *
  `;

  await query(sql, [tenantId, usuarioId]);

  // Registrar en historial
  await registrarHistorial(tenantId, usuarioId, null, 1, 'ingreso', 'Ingreso al sistema de fases');

  // Retornar datos completos
  const asesores = await getAsesores(tenantId);
  return asesores.find(a => a.usuario_id === usuarioId)!;
}

/**
 * Remueve un asesor del sistema de fases
 */
export async function removerAsesor(tenantId: string, usuarioId: string): Promise<void> {
  // Obtener fase actual para historial
  const sql1 = `
    SELECT fase_actual FROM usuarios_tenants
    WHERE tenant_id = $1 AND usuario_id = $2
  `;
  const current = await query(sql1, [tenantId, usuarioId]);
  const faseAnterior = current.rows[0]?.fase_actual || 0;

  const sql = `
    UPDATE usuarios_tenants
    SET
      en_sistema_fases = false,
      updated_at = NOW()
    WHERE tenant_id = $1 AND usuario_id = $2
  `;
  await query(sql, [tenantId, usuarioId]);

  await registrarHistorial(tenantId, usuarioId, faseAnterior, 0, 'salida', 'Removido del sistema de fases');
}

// ==================== LEADS DEL POOL ====================

/**
 * Obtiene los leads del pool (contactos marcados como es_lead_pool)
 */
export async function getLeadsPool(tenantId: string, filtros?: {
  asignado?: boolean;
  origen?: string;
}): Promise<LeadPool[]> {
  let sql = `
    SELECT
      c.id,
      c.tenant_id,
      c.nombre,
      c.apellido,
      c.email,
      c.telefono,
      c.es_lead_pool,
      c.origen_lead,
      c.lead_asignado_a,
      c.fecha_asignacion_lead,
      u.nombre as asesor_nombre,
      u.apellido as asesor_apellido
    FROM contactos c
    LEFT JOIN usuarios u ON c.lead_asignado_a = u.id
    WHERE c.tenant_id = $1 AND c.es_lead_pool = true
  `;

  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (filtros?.asignado !== undefined) {
    if (filtros.asignado) {
      sql += ` AND c.lead_asignado_a IS NOT NULL`;
    } else {
      sql += ` AND c.lead_asignado_a IS NULL`;
    }
  }

  if (filtros?.origen) {
    sql += ` AND c.origen_lead = $${paramIndex++}`;
    params.push(filtros.origen);
  }

  sql += ` ORDER BY c.fecha_asignacion_lead DESC NULLS LAST, c.created_at DESC`;

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Marca un contacto como lead del pool
 */
export async function marcarComoLeadPool(
  tenantId: string,
  contactoId: string,
  origen: string = 'pool_fases'
): Promise<void> {
  const sql = `
    UPDATE contactos
    SET
      es_lead_pool = true,
      origen_lead = $1,
      updated_at = NOW()
    WHERE id = $2 AND tenant_id = $3
  `;
  await query(sql, [origen, contactoId, tenantId]);
}

/**
 * Asigna un lead del pool a un asesor
 */
export async function asignarLead(
  tenantId: string,
  contactoId: string,
  usuarioId: string
): Promise<void> {
  const sql = `
    UPDATE contactos
    SET
      lead_asignado_a = $1,
      fecha_asignacion_lead = NOW(),
      updated_at = NOW()
    WHERE id = $2 AND tenant_id = $3 AND es_lead_pool = true
  `;
  await query(sql, [usuarioId, contactoId, tenantId]);
}

/**
 * Distribuye leads automáticamente según pesos de fase
 * Retorna el usuario_id seleccionado para el siguiente lead
 */
export async function seleccionarAsesorParaLead(tenantId: string): Promise<string | null> {
  // Obtener configuración
  const config = await getConfig(tenantId);
  if (!config || !config.activo) return null;

  // Obtener asesores activos no en modo solitario
  const sql = `
    SELECT
      ut.usuario_id,
      ut.fase_actual,
      CASE ut.fase_actual
        WHEN 1 THEN $2
        WHEN 2 THEN $3
        WHEN 3 THEN $4
        WHEN 4 THEN $5
        WHEN 5 THEN $6
        ELSE 0
      END as peso
    FROM usuarios_tenants ut
    WHERE ut.tenant_id = $1
      AND ut.en_sistema_fases = true
      AND ut.en_modo_solitario = false
      AND ut.activo = true
  `;

  const result = await query(sql, [
    tenantId,
    config.peso_fase_1,
    config.peso_fase_2,
    config.peso_fase_3,
    config.peso_fase_4,
    config.peso_fase_5
  ]);

  if (result.rows.length === 0) return null;

  // Distribución proporcional basada en peso
  const totalPeso = result.rows.reduce((sum: number, a: any) => sum + a.peso, 0);
  if (totalPeso === 0) return null;

  const random = Math.random() * totalPeso;
  let acumulado = 0;

  for (const asesor of result.rows) {
    acumulado += asesor.peso;
    if (random <= acumulado) {
      return asesor.usuario_id;
    }
  }

  return result.rows[0].usuario_id;
}

// ==================== PROGRESIÓN DE FASES ====================

/**
 * Procesa una venta y actualiza la fase del asesor
 */
export async function procesarVenta(
  tenantId: string,
  usuarioId: string,
  ventaId: string,
  esLeadPool: boolean = false
): Promise<void> {
  const config = await getConfig(tenantId);
  if (!config) return;

  // Obtener estado actual del asesor
  const sql = `
    SELECT * FROM usuarios_tenants
    WHERE tenant_id = $1 AND usuario_id = $2
  `;
  const result = await query(sql, [tenantId, usuarioId]);
  if (result.rows.length === 0) return;

  const asesor = result.rows[0];
  if (!asesor.en_sistema_fases) return;

  const mesActual = new Date().toISOString().slice(0, 7); // YYYY-MM

  // Verificar cambio de mes
  if (asesor.mes_tracking !== mesActual) {
    await procesarCambioDeMes(tenantId, usuarioId, config);
  }

  // Incrementar ventas del mes
  await query(`
    UPDATE usuarios_tenants
    SET ventas_mes_actual = COALESCE(ventas_mes_actual, 0) + 1,
        mes_tracking = $1,
        updated_at = NOW()
    WHERE tenant_id = $2 AND usuario_id = $3
  `, [mesActual, tenantId, usuarioId]);

  // Recargar datos
  const updated = await query(sql, [tenantId, usuarioId]);
  const asesorActualizado = updated.rows[0];

  // Si está en modo solitario y cerró venta, volver a Fase 1
  if (asesorActualizado.en_modo_solitario) {
    await cambiarFase(tenantId, usuarioId, 0, 1, 'salida_solitario', 'Venta cerrada en modo solitario', ventaId);
    return;
  }

  // Avanzar de fase (máximo 5)
  if (asesorActualizado.fase_actual < 5) {
    await cambiarFase(
      tenantId, usuarioId,
      asesorActualizado.fase_actual,
      asesorActualizado.fase_actual + 1,
      'avance',
      'Venta cerrada',
      ventaId
    );
  } else if (asesorActualizado.fase_actual === 5) {
    // En Fase 5, actualizar PRESTIGE y ULTRA
    await actualizarPrestigeYUltra(tenantId, usuarioId, ventaId);
  }
}

/**
 * Procesa el cambio de mes para un asesor
 */
async function procesarCambioDeMes(
  tenantId: string,
  usuarioId: string,
  config: ConfigSistemaFases
): Promise<void> {
  const sql = `
    SELECT * FROM usuarios_tenants
    WHERE tenant_id = $1 AND usuario_id = $2
  `;
  const result = await query(sql, [tenantId, usuarioId]);
  if (result.rows.length === 0) return;

  const asesor = result.rows[0];

  // Si no hubo ventas en el mes anterior
  if ((asesor.ventas_mes_actual || 0) === 0) {
    if (asesor.en_modo_solitario) {
      // En solitario sin ventas
      const nuevosMeses = (asesor.meses_solitario_sin_venta || 0) + 1;

      if (nuevosMeses >= config.meses_solitario_max) {
        // Sacar del sistema
        await removerAsesor(tenantId, usuarioId);
        return;
      }

      await query(`
        UPDATE usuarios_tenants
        SET meses_solitario_sin_venta = $1, updated_at = NOW()
        WHERE tenant_id = $2 AND usuario_id = $3
      `, [nuevosMeses, tenantId, usuarioId]);

    } else if (asesor.fase_actual === 1) {
      // Fase 1 sin ventas
      const nuevosIntentos = (asesor.intentos_fase_1_usados || 0) + 1;

      if (nuevosIntentos >= config.intentos_fase_1) {
        // Pasar a modo solitario
        await cambiarFase(tenantId, usuarioId, 1, 0, 'entrada_solitario', 'Sin ventas en Fase 1');
      } else {
        await query(`
          UPDATE usuarios_tenants
          SET intentos_fase_1_usados = $1, updated_at = NOW()
          WHERE tenant_id = $2 AND usuario_id = $3
        `, [nuevosIntentos, tenantId, usuarioId]);
      }

    } else if (asesor.fase_actual > 1) {
      // Otras fases: retroceder
      await cambiarFase(
        tenantId, usuarioId,
        asesor.fase_actual,
        asesor.fase_actual - 1,
        'retroceso',
        'Sin ventas en el mes'
      );
    }
  }

  // Resetear contador de ventas del mes
  const mesActual = new Date().toISOString().slice(0, 7);
  await query(`
    UPDATE usuarios_tenants
    SET ventas_mes_actual = 0, mes_tracking = $1, updated_at = NOW()
    WHERE tenant_id = $2 AND usuario_id = $3
  `, [mesActual, tenantId, usuarioId]);
}

/**
 * Cambia la fase de un asesor
 */
async function cambiarFase(
  tenantId: string,
  usuarioId: string,
  faseAnterior: number,
  faseNueva: number,
  tipoCambio: string,
  razon: string,
  ventaId?: string
): Promise<void> {
  if (faseNueva === 0) {
    // Entrar a modo solitario
    await query(`
      UPDATE usuarios_tenants
      SET fase_actual = 0,
          en_modo_solitario = true,
          meses_solitario_sin_venta = 0,
          updated_at = NOW()
      WHERE tenant_id = $1 AND usuario_id = $2
    `, [tenantId, usuarioId]);
  } else if (faseAnterior === 0) {
    // Salir de modo solitario
    await query(`
      UPDATE usuarios_tenants
      SET fase_actual = $1,
          en_modo_solitario = false,
          intentos_fase_1_usados = 0,
          updated_at = NOW()
      WHERE tenant_id = $2 AND usuario_id = $3
    `, [faseNueva, tenantId, usuarioId]);
  } else {
    // Cambio normal
    await query(`
      UPDATE usuarios_tenants
      SET fase_actual = $1, updated_at = NOW()
      WHERE tenant_id = $2 AND usuario_id = $3
    `, [faseNueva, tenantId, usuarioId]);
  }

  await registrarHistorial(tenantId, usuarioId, faseAnterior, faseNueva, tipoCambio, razon, ventaId);
}

/**
 * Actualiza PRESTIGE y ULTRA para asesores en Fase 5
 */
async function actualizarPrestigeYUltra(
  tenantId: string,
  usuarioId: string,
  ventaId: string
): Promise<void> {
  const sql = `SELECT * FROM usuarios_tenants WHERE tenant_id = $1 AND usuario_id = $2`;
  const result = await query(sql, [tenantId, usuarioId]);
  if (result.rows.length === 0) return;

  const asesor = result.rows[0];
  let nuevoPrestige = asesor.prestige || 0;
  let nuevasVentas = (asesor.ventas_fase_5_contador || 0) + 1;
  let nuevoUltra = asesor.ultra_record || 0;
  let nuevoUltraMes = asesor.ultra_mes;

  // Cada 3 ventas en Fase 5 = +1 PRESTIGE
  if (nuevasVentas >= 3) {
    nuevoPrestige += Math.floor(nuevasVentas / 3);
    nuevasVentas = nuevasVentas % 3;
  }

  // ULTRA: récord de ventas en un mes
  const ventasMes = (asesor.ventas_mes_actual || 0) + 1;
  if (ventasMes > nuevoUltra) {
    nuevoUltra = ventasMes;
    nuevoUltraMes = new Date().toISOString().slice(0, 7);
  }

  await query(`
    UPDATE usuarios_tenants
    SET prestige = $1,
        ventas_fase_5_contador = $2,
        ultra_record = $3,
        ultra_mes = $4,
        updated_at = NOW()
    WHERE tenant_id = $5 AND usuario_id = $6
  `, [nuevoPrestige, nuevasVentas, nuevoUltra, nuevoUltraMes, tenantId, usuarioId]);

  // Registrar si hubo cambio
  if (nuevoPrestige !== (asesor.prestige || 0) || nuevoUltra !== (asesor.ultra_record || 0)) {
    await registrarHistorial(
      tenantId, usuarioId, 5, 5,
      nuevoPrestige > (asesor.prestige || 0) ? 'prestige' : 'ultra',
      `PRESTIGE: ${nuevoPrestige}, ULTRA: ${nuevoUltra}`,
      ventaId,
      nuevoPrestige,
      nuevoUltra
    );
  }
}

// ==================== HISTORIAL ====================

/**
 * Registra un cambio en el historial
 */
async function registrarHistorial(
  tenantId: string,
  usuarioId: string,
  faseAnterior: number | null,
  faseNueva: number,
  tipoCambio: string,
  razon: string,
  ventaId?: string,
  prestigeValor?: number,
  ultraValor?: number
): Promise<void> {
  const sql = `
    INSERT INTO sistema_fases_historial (
      tenant_id, usuario_id, fase_anterior, fase_nueva,
      tipo_cambio, razon, venta_id, prestige_valor, ultra_valor
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `;
  await query(sql, [
    tenantId, usuarioId, faseAnterior, faseNueva,
    tipoCambio, razon, ventaId || null, prestigeValor || null, ultraValor || null
  ]);
}

/**
 * Obtiene el historial de un asesor
 */
export async function getHistorialAsesor(
  tenantId: string,
  usuarioId: string,
  limite: number = 50
): Promise<any[]> {
  const sql = `
    SELECT
      h.*,
      v.monto as venta_monto
    FROM sistema_fases_historial h
    LEFT JOIN ventas v ON h.venta_id = v.id
    WHERE h.tenant_id = $1 AND h.usuario_id = $2
    ORDER BY h.created_at DESC
    LIMIT $3
  `;
  const result = await query(sql, [tenantId, usuarioId, limite]);
  return result.rows;
}

// ==================== ESTADÍSTICAS ====================

/**
 * Obtiene estadísticas del sistema de fases
 */
export async function getEstadisticas(tenantId: string): Promise<any> {
  const sql = `
    SELECT
      COUNT(*) FILTER (WHERE ut.en_sistema_fases = true) as total_asesores,
      COUNT(*) FILTER (WHERE ut.en_sistema_fases = true AND ut.fase_actual = 1) as fase_1,
      COUNT(*) FILTER (WHERE ut.en_sistema_fases = true AND ut.fase_actual = 2) as fase_2,
      COUNT(*) FILTER (WHERE ut.en_sistema_fases = true AND ut.fase_actual = 3) as fase_3,
      COUNT(*) FILTER (WHERE ut.en_sistema_fases = true AND ut.fase_actual = 4) as fase_4,
      COUNT(*) FILTER (WHERE ut.en_sistema_fases = true AND ut.fase_actual = 5) as fase_5,
      COUNT(*) FILTER (WHERE ut.en_sistema_fases = true AND ut.en_modo_solitario = true) as modo_solitario,
      SUM(ut.prestige) FILTER (WHERE ut.en_sistema_fases = true) as total_prestige,
      MAX(ut.ultra_record) FILTER (WHERE ut.en_sistema_fases = true) as max_ultra
    FROM usuarios_tenants ut
    WHERE ut.tenant_id = $1 AND ut.activo = true
  `;

  const statsResult = await query(sql, [tenantId]);

  // Leads del pool
  const leadsSQL = `
    SELECT
      COUNT(*) as total_leads,
      COUNT(*) FILTER (WHERE lead_asignado_a IS NOT NULL) as leads_asignados,
      COUNT(*) FILTER (WHERE lead_asignado_a IS NULL) as leads_pendientes
    FROM contactos
    WHERE tenant_id = $1 AND es_lead_pool = true
  `;
  const leadsResult = await query(leadsSQL, [tenantId]);

  return {
    ...statsResult.rows[0],
    ...leadsResult.rows[0]
  };
}

/**
 * Obtiene el ranking de asesores
 */
export async function getRanking(tenantId: string, limite: number = 10): Promise<AsesorFases[]> {
  const sql = `
    SELECT
      u.id as usuario_id,
      ut.tenant_id,
      u.nombre,
      u.apellido,
      u.email,
      ut.fase_actual,
      ut.prestige,
      ut.ultra_record,
      ut.ventas_mes_actual
    FROM usuarios u
    INNER JOIN usuarios_tenants ut ON u.id = ut.usuario_id
    WHERE ut.tenant_id = $1
      AND ut.en_sistema_fases = true
      AND ut.activo = true
    ORDER BY
      ut.prestige DESC,
      ut.fase_actual DESC,
      ut.ultra_record DESC,
      ut.ventas_mes_actual DESC
    LIMIT $2
  `;
  const result = await query(sql, [tenantId, limite]);
  return result.rows;
}
