/**
 * Servicio de Sistema de Fases
 * 
 * Gestiona la lógica completa del Sistema de Fases:
 * - Configuración de proyectos
 * - Tracking de asesores y sus fases
 * - Asignación automática de leads
 * - Progresión/retroceso de fases
 * - Modo solitario
 * - PRESTIGE y ULTRA
 */

import { query } from '../utils/db';

// ==================== INTERFACES ====================

export interface SistemaFasesProyecto {
  id: string;
  tenant_id: string;
  propiedad_id: string | null;
  porcentaje_comision_asesor: number;
  porcentaje_comision_tenant: number;
  monto_fase_1: number;
  monto_fase_2: number;
  monto_fase_3: number;
  monto_fase_4: number;
  monto_fase_5: number;
  intentos_fase_1: number;
  meses_solitario: number;
  activo: boolean;
  fecha_inicio: Date | null;
  fecha_fin: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface SistemaFasesAsesor {
  id: string;
  tenant_id: string;
  usuario_id: string;
  proyecto_id: string;
  fase_actual: number; // 1-5, 0 = modo solitario
  intentos_usados: number;
  intentos_totales: number;
  en_modo_solitario: boolean;
  fecha_entrada_solitario: Date | null;
  meses_sin_venta_solitario: number;
  prestige: number;
  ventas_fase_5_actuales: number;
  ultra_maximo: number;
  ultra_fecha: Date | null;
  ventas_mes_actual: number;
  mes_tracking: Date | null;
  activo: boolean;
  fecha_ingreso: Date;
  fecha_salida: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface SistemaFasesLead {
  id: string;
  tenant_id: string;
  proyecto_id: string;
  contacto_id: string;
  asesor_id: string | null;
  valor_asignado: number;
  fase_asignacion: number | null;
  fecha_asignacion: Date | null;
  estado: string; // asignado, convertido, perdido, rechazado
  venta_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateProyectoData {
  propiedad_id?: string;
  porcentaje_comision_asesor?: number;
  porcentaje_comision_tenant?: number;
  monto_fase_1?: number;
  monto_fase_2?: number;
  monto_fase_3?: number;
  monto_fase_4?: number;
  monto_fase_5?: number;
  intentos_fase_1?: number;
  meses_solitario?: number;
  fecha_inicio?: Date | string;
  fecha_fin?: Date | string;
}

export interface UpdateProyectoData extends Partial<CreateProyectoData> {
  activo?: boolean;
}

// ==================== FUNCIONES CRUD PROYECTOS ====================

export async function getProyectosByTenant(tenantId: string): Promise<SistemaFasesProyecto[]> {
  const sql = `
    SELECT 
      id,
      tenant_id,
      propiedad_id,
      porcentaje_comision_asesor,
      porcentaje_comision_tenant,
      monto_fase_1,
      monto_fase_2,
      monto_fase_3,
      monto_fase_4,
      monto_fase_5,
      intentos_fase_1,
      meses_solitario,
      activo,
      fecha_inicio,
      fecha_fin,
      created_at,
      updated_at
    FROM sistema_fases_proyectos
    WHERE tenant_id = $1
    ORDER BY created_at DESC
  `;
  
  const result = await query(sql, [tenantId]);
  return result.rows;
}

export async function getProyectoById(tenantId: string, proyectoId: string): Promise<SistemaFasesProyecto | null> {
  const sql = `
    SELECT 
      id,
      tenant_id,
      propiedad_id,
      porcentaje_comision_asesor,
      porcentaje_comision_tenant,
      monto_fase_1,
      monto_fase_2,
      monto_fase_3,
      monto_fase_4,
      monto_fase_5,
      intentos_fase_1,
      meses_solitario,
      activo,
      fecha_inicio,
      fecha_fin,
      created_at,
      updated_at
    FROM sistema_fases_proyectos
    WHERE id = $1 AND tenant_id = $2
  `;
  
  const result = await query(sql, [proyectoId, tenantId]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

export async function createProyecto(tenantId: string, data: CreateProyectoData): Promise<SistemaFasesProyecto> {
  const sql = `
    INSERT INTO sistema_fases_proyectos (
      tenant_id,
      propiedad_id,
      porcentaje_comision_asesor,
      porcentaje_comision_tenant,
      monto_fase_1,
      monto_fase_2,
      monto_fase_3,
      monto_fase_4,
      monto_fase_5,
      intentos_fase_1,
      meses_solitario,
      fecha_inicio,
      fecha_fin
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
    )
    RETURNING *
  `;
  
  const result = await query(sql, [
    tenantId,
    data.propiedad_id || null,
    data.porcentaje_comision_asesor || 50.00,
    data.porcentaje_comision_tenant || 50.00,
    data.monto_fase_1 || 100.00,
    data.monto_fase_2 || 150.00,
    data.monto_fase_3 || 200.00,
    data.monto_fase_4 || 250.00,
    data.monto_fase_5 || 300.00,
    data.intentos_fase_1 || 3,
    data.meses_solitario || 3,
    data.fecha_inicio || null,
    data.fecha_fin || null,
  ]);
  
  return result.rows[0];
}

export async function updateProyecto(
  tenantId: string,
  proyectoId: string,
  data: UpdateProyectoData
): Promise<SistemaFasesProyecto> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.propiedad_id !== undefined) {
    updates.push(`propiedad_id = $${paramIndex++}`);
    values.push(data.propiedad_id || null);
  }
  if (data.porcentaje_comision_asesor !== undefined) {
    updates.push(`porcentaje_comision_asesor = $${paramIndex++}`);
    values.push(data.porcentaje_comision_asesor);
  }
  if (data.porcentaje_comision_tenant !== undefined) {
    updates.push(`porcentaje_comision_tenant = $${paramIndex++}`);
    values.push(data.porcentaje_comision_tenant);
  }
  if (data.monto_fase_1 !== undefined) {
    updates.push(`monto_fase_1 = $${paramIndex++}`);
    values.push(data.monto_fase_1);
  }
  if (data.monto_fase_2 !== undefined) {
    updates.push(`monto_fase_2 = $${paramIndex++}`);
    values.push(data.monto_fase_2);
  }
  if (data.monto_fase_3 !== undefined) {
    updates.push(`monto_fase_3 = $${paramIndex++}`);
    values.push(data.monto_fase_3);
  }
  if (data.monto_fase_4 !== undefined) {
    updates.push(`monto_fase_4 = $${paramIndex++}`);
    values.push(data.monto_fase_4);
  }
  if (data.monto_fase_5 !== undefined) {
    updates.push(`monto_fase_5 = $${paramIndex++}`);
    values.push(data.monto_fase_5);
  }
  if (data.intentos_fase_1 !== undefined) {
    updates.push(`intentos_fase_1 = $${paramIndex++}`);
    values.push(data.intentos_fase_1);
  }
  if (data.meses_solitario !== undefined) {
    updates.push(`meses_solitario = $${paramIndex++}`);
    values.push(data.meses_solitario);
  }
  if (data.activo !== undefined) {
    updates.push(`activo = $${paramIndex++}`);
    values.push(data.activo);
  }
  if (data.fecha_inicio !== undefined) {
    updates.push(`fecha_inicio = $${paramIndex++}`);
    values.push(data.fecha_inicio || null);
  }
  if (data.fecha_fin !== undefined) {
    updates.push(`fecha_fin = $${paramIndex++}`);
    values.push(data.fecha_fin || null);
  }

  if (updates.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  updates.push(`updated_at = NOW()`);
  values.push(proyectoId, tenantId);

  const sql = `
    UPDATE sistema_fases_proyectos
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++}
    RETURNING *
  `;

  const result = await query(sql, values);
  if (result.rows.length === 0) {
    throw new Error('Proyecto no encontrado');
  }

  return result.rows[0];
}

export async function deleteProyecto(tenantId: string, proyectoId: string): Promise<void> {
  const sql = `
    DELETE FROM sistema_fases_proyectos
    WHERE id = $1 AND tenant_id = $2
  `;
  
  await query(sql, [proyectoId, tenantId]);
}

// ==================== FUNCIONES DE ASESORES ====================

export async function getAsesoresByProyecto(
  tenantId: string,
  proyectoId: string
): Promise<SistemaFasesAsesor[]> {
  const sql = `
    SELECT 
      sfa.*,
      u.nombre as usuario_nombre,
      u.apellido as usuario_apellido,
      u.email as usuario_email
    FROM sistema_fases_asesores sfa
    INNER JOIN usuarios u ON sfa.usuario_id = u.id
    WHERE sfa.tenant_id = $1 AND sfa.proyecto_id = $2 AND sfa.activo = true
    ORDER BY sfa.fase_actual DESC, sfa.prestige DESC, sfa.ultra_maximo DESC
  `;
  
  const result = await query(sql, [tenantId, proyectoId]);
  return result.rows;
}

export async function getAsesorByUsuario(
  tenantId: string,
  proyectoId: string,
  usuarioId: string
): Promise<SistemaFasesAsesor | null> {
  const sql = `
    SELECT *
    FROM sistema_fases_asesores
    WHERE tenant_id = $1 AND proyecto_id = $2 AND usuario_id = $3 AND activo = true
  `;
  
  const result = await query(sql, [tenantId, proyectoId, usuarioId]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Obtiene todos los proyectos activos donde está un asesor
 */
export async function getProyectosByAsesor(
  tenantId: string,
  usuarioId: string
): Promise<Array<{ proyecto_id: string; asesor_id: string }>> {
  const sql = `
    SELECT 
      sfa.proyecto_id,
      sfa.id as asesor_id
    FROM sistema_fases_asesores sfa
    INNER JOIN sistema_fases_proyectos sfp ON sfa.proyecto_id = sfp.id
    WHERE sfa.tenant_id = $1 
      AND sfa.usuario_id = $2 
      AND sfa.activo = true
      AND sfp.activo = true
  `;
  
  const result = await query(sql, [tenantId, usuarioId]);
  return result.rows;
}

export async function agregarAsesorAlSistema(
  tenantId: string,
  proyectoId: string,
  usuarioId: string
): Promise<SistemaFasesAsesor> {
  // Verificar que el proyecto existe y está activo
  const proyecto = await getProyectoById(tenantId, proyectoId);
  if (!proyecto || !proyecto.activo) {
    throw new Error('Proyecto no encontrado o inactivo');
  }

  // Verificar si el asesor ya está en el sistema
  const asesorExistente = await getAsesorByUsuario(tenantId, proyectoId, usuarioId);
  if (asesorExistente) {
    throw new Error('El asesor ya está en el sistema');
  }

  // Crear registro del asesor en Fase 1
  const sql = `
    INSERT INTO sistema_fases_asesores (
      tenant_id,
      usuario_id,
      proyecto_id,
      fase_actual,
      intentos_totales,
      mes_tracking
    ) VALUES (
      $1, $2, $3, 1, $4, DATE_TRUNC('month', CURRENT_DATE)
    )
    RETURNING *
  `;

  const result = await query(sql, [
    tenantId,
    usuarioId,
    proyectoId,
    proyecto.intentos_fase_1,
  ]);

  // Registrar en historial
  await registrarCambioFase(result.rows[0].id, 0, 1, 'ingreso_sistema', 'Asesor agregado al sistema');

  return result.rows[0];
}

// ==================== FUNCIONES DE ASIGNACIÓN DE LEADS ====================

/**
 * Asigna un lead del pool a un asesor según su fase actual
 */
export async function asignarLeadAAsesor(
  tenantId: string,
  proyectoId: string,
  contactoId: string,
  asesorId: string
): Promise<SistemaFasesLead> {
  // Obtener información del asesor
  const asesor = await getAsesorByUsuario(tenantId, proyectoId, asesorId);
  if (!asesor || !asesor.activo) {
    throw new Error('Asesor no encontrado o inactivo en el sistema');
  }

  // Obtener proyecto para conocer los montos
  const proyecto = await getProyectoById(tenantId, proyectoId);
  if (!proyecto) {
    throw new Error('Proyecto no encontrado');
  }

  // Determinar el monto según la fase
  let montoAsignado = 0;
  let faseAsignacion = asesor.fase_actual;

  if (asesor.en_modo_solitario) {
    // En modo solitario no recibe inversión
    montoAsignado = 0;
    faseAsignacion = 0;
  } else {
    switch (asesor.fase_actual) {
      case 1:
        montoAsignado = proyecto.monto_fase_1;
        break;
      case 2:
        montoAsignado = proyecto.monto_fase_2;
        break;
      case 3:
        montoAsignado = proyecto.monto_fase_3;
        break;
      case 4:
        montoAsignado = proyecto.monto_fase_4;
        break;
      case 5:
        montoAsignado = proyecto.monto_fase_5;
        break;
      default:
        montoAsignado = 0;
    }
  }

  // Crear registro del lead
  const sql = `
    INSERT INTO sistema_fases_leads (
      tenant_id,
      proyecto_id,
      contacto_id,
      asesor_id,
      valor_asignado,
      fase_asignacion,
      fecha_asignacion,
      estado
    ) VALUES (
      $1, $2, $3, $4, $5, $6, NOW(), 'asignado'
    )
    RETURNING *
  `;

  const result = await query(sql, [
    tenantId,
    proyectoId,
    contactoId,
    asesorId,
    montoAsignado,
    faseAsignacion,
  ]);

  // Marcar el contacto como lead del pool
  await query(
    `UPDATE contactos SET es_lead_pool = true, sistema_fases_proyecto_id = $1 WHERE id = $2`,
    [proyectoId, contactoId]
  );

  return result.rows[0];
}

/**
 * Obtiene los leads asignados a un asesor
 */
export async function getLeadsByAsesor(
  tenantId: string,
  proyectoId: string,
  asesorId: string
): Promise<SistemaFasesLead[]> {
  const sql = `
    SELECT 
      sfl.*,
      c.nombre as contacto_nombre,
      c.apellido as contacto_apellido,
      c.email as contacto_email,
      c.telefono as contacto_telefono
    FROM sistema_fases_leads sfl
    INNER JOIN contactos c ON sfl.contacto_id = c.id
    WHERE sfl.tenant_id = $1 
      AND sfl.proyecto_id = $2 
      AND sfl.asesor_id = $3
    ORDER BY sfl.fecha_asignacion DESC
  `;

  const result = await query(sql, [tenantId, proyectoId, asesorId]);
  return result.rows;
}

// ==================== FUNCIONES DE PROGRESIÓN/RETROCESO ====================

/**
 * Procesa una venta y actualiza la fase del asesor
 * Esta función debe ser llamada cuando se crea una venta con un lead del pool
 */
export async function procesarVenta(
  tenantId: string,
  ventaId: string,
  asesorId: string,
  proyectoId: string
): Promise<void> {
  const asesor = await getAsesorByUsuario(tenantId, proyectoId, asesorId);
  if (!asesor) {
    throw new Error('Asesor no encontrado en el sistema');
  }

  // Obtener el mes actual
  const mesActual = new Date();
  mesActual.setDate(1);
  mesActual.setHours(0, 0, 0, 0);

  // Si cambió de mes, resetear contador y procesar retroceso si aplica
  if (!asesor.mes_tracking || new Date(asesor.mes_tracking).getTime() !== mesActual.getTime()) {
    await procesarCambioDeMes(asesor.id, asesor);
    // Recargar asesor actualizado
    const asesorActualizado = await query(
      `SELECT * FROM sistema_fases_asesores WHERE id = $1`,
      [asesor.id]
    );
    if (asesorActualizado.rows.length > 0) {
      Object.assign(asesor, asesorActualizado.rows[0]);
    }
  }

  // Incrementar ventas del mes
  await query(
    `UPDATE sistema_fases_asesores 
     SET ventas_mes_actual = ventas_mes_actual + 1,
         mes_tracking = DATE_TRUNC('month', CURRENT_DATE),
         updated_at = NOW()
     WHERE id = $1`,
    [asesor.id]
  );

  // Si está en modo solitario y cerró una venta, volver a Fase 1
  if (asesor.en_modo_solitario) {
    await cambiarFase(asesor.id, 0, 1, 'salida_solitario', 'Venta cerrada en modo solitario', ventaId);
    return;
  }

  // Si está en Fase 1, usar un intento
  if (asesor.fase_actual === 1) {
    await query(
      `UPDATE sistema_fases_asesores 
       SET intentos_usados = intentos_usados + 1,
           updated_at = NOW()
       WHERE id = $1`,
      [asesor.id]
    );

    // Si agotó los intentos, pasar a modo solitario
    const asesorActualizado = await query(
      `SELECT * FROM sistema_fases_asesores WHERE id = $1`,
      [asesor.id]
    );
    if (asesorActualizado.rows.length > 0) {
      const intentosUsados = asesorActualizado.rows[0].intentos_usados;
      const intentosTotales = asesorActualizado.rows[0].intentos_totales;
      
      if (intentosUsados >= intentosTotales) {
        await cambiarFase(asesor.id, 1, 0, 'entrada_solitario', 'Intentos agotados en Fase 1', ventaId);
        return;
      }
    }
  }

  // Avanzar de fase si corresponde
  if (asesor.fase_actual < 5) {
    await cambiarFase(asesor.id, asesor.fase_actual, asesor.fase_actual + 1, 'avance', 'Venta cerrada', ventaId);
  } else if (asesor.fase_actual === 5) {
    // En Fase 5, actualizar PRESTIGE y ULTRA
    await actualizarPrestigeYUltra(asesor.id, ventaId);
  }
}

/**
 * Procesa el cambio de mes y retrocede fases si no hubo ventas
 */
async function procesarCambioDeMes(asesorId: string, asesor: SistemaFasesAsesor): Promise<void> {
  // Si no hubo ventas en el mes anterior, retroceder
  if (asesor.ventas_mes_actual === 0 && asesor.fase_actual > 0) {
    if (asesor.fase_actual === 1) {
      // De Fase 1 a Modo Solitario
      await cambiarFase(asesor.id, 1, 0, 'entrada_solitario', 'Sin ventas en el mes', null);
    } else if (asesor.fase_actual > 1) {
      // Retroceder una fase
      await cambiarFase(asesor.id, asesor.fase_actual, asesor.fase_actual - 1, 'retroceso', 'Sin ventas en el mes', null);
    }
  }

  // Si está en modo solitario, incrementar contador
  if (asesor.en_modo_solitario) {
    await query(
      `UPDATE sistema_fases_asesores 
       SET meses_sin_venta_solitario = meses_sin_venta_solitario + 1,
           updated_at = NOW()
       WHERE id = $1`,
      [asesor.id]
    );

    // Verificar si debe salir del sistema o pasar a Connect
    const asesorActualizado = await query(
      `SELECT * FROM sistema_fases_asesores WHERE id = $1`,
      [asesor.id]
    );
    if (asesorActualizado.rows.length > 0) {
      const mesesSinVenta = asesorActualizado.rows[0].meses_sin_venta_solitario;
      const proyecto = await query(
        `SELECT meses_solitario FROM sistema_fases_proyectos WHERE id = $1`,
        [asesor.proyecto_id]
      );
      if (proyecto.rows.length > 0) {
        const mesesPermitidos = proyecto.rows[0].meses_solitario;
        if (mesesSinVenta >= mesesPermitidos) {
          // Aquí se podría implementar la lógica para pasar a Connect o salir
          // Por ahora solo marcamos como inactivo
          await query(
            `UPDATE sistema_fases_asesores SET activo = false, fecha_salida = NOW() WHERE id = $1`,
            [asesor.id]
          );
        }
      }
    }
  }

  // Resetear contador de ventas del mes
  await query(
    `UPDATE sistema_fases_asesores 
     SET ventas_mes_actual = 0,
         mes_tracking = DATE_TRUNC('month', CURRENT_DATE),
         updated_at = NOW()
     WHERE id = $1`,
    [asesor.id]
  );
}

/**
 * Cambia la fase de un asesor
 */
async function cambiarFase(
  asesorId: string,
  faseAnterior: number,
  faseNueva: number,
  tipoCambio: string,
  razon: string,
  ventaId: string | null
): Promise<void> {
  // Actualizar fase
  if (faseNueva === 0) {
    // Entrar a modo solitario
    await query(
      `UPDATE sistema_fases_asesores 
       SET fase_actual = 0,
           en_modo_solitario = true,
           fecha_entrada_solitario = NOW(),
           meses_sin_venta_solitario = 0,
           updated_at = NOW()
       WHERE id = $1`,
      [asesorId]
    );
  } else if (faseAnterior === 0) {
    // Salir de modo solitario
    await query(
      `UPDATE sistema_fases_asesores 
       SET fase_actual = $1,
           en_modo_solitario = false,
           fecha_entrada_solitario = NULL,
           intentos_usados = 0,
           updated_at = NOW()
       WHERE id = $2`,
      [faseNueva, asesorId]
    );
  } else {
    // Cambio normal de fase
    await query(
      `UPDATE sistema_fases_asesores 
       SET fase_actual = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [faseNueva, asesorId]
    );
  }

  // Registrar en historial
  await registrarCambioFase(asesorId, faseAnterior, faseNueva, tipoCambio, razon, ventaId);
}

/**
 * Actualiza PRESTIGE y ULTRA para asesores en Fase 5
 */
async function actualizarPrestigeYUltra(asesorId: string, ventaId: string | null): Promise<void> {
  const asesor = await query(
    `SELECT * FROM sistema_fases_asesores WHERE id = $1`,
    [asesorId]
  );

  if (asesor.rows.length === 0) return;

  const asesorData = asesor.rows[0];
  let nuevoPrestige = asesorData.prestige;
  let nuevasVentasFase5 = asesorData.ventas_fase_5_actuales + 1;
  let nuevoUltra = asesorData.ultra_maximo;
  let nuevaFechaUltra = asesorData.ultra_fecha;

  // Cada 3 ventas en Fase 5 = +1 PRESTIGE
  if (nuevasVentasFase5 >= 3) {
    nuevoPrestige += Math.floor(nuevasVentasFase5 / 3);
    nuevasVentasFase5 = nuevasVentasFase5 % 3;
  }

  // ULTRA: record de ventas máximas en un mes
  const ventasMesActual = asesorData.ventas_mes_actual;
  if (ventasMesActual > nuevoUltra) {
    nuevoUltra = ventasMesActual;
    nuevaFechaUltra = new Date();
  }

  // Actualizar
  await query(
    `UPDATE sistema_fases_asesores 
     SET prestige = $1,
         ventas_fase_5_actuales = $2,
         ultra_maximo = $3,
         ultra_fecha = $4,
         updated_at = NOW()
     WHERE id = $5`,
    [nuevoPrestige, nuevasVentasFase5, nuevoUltra, nuevaFechaUltra, asesorId]
  );

  // Registrar cambio si hubo
  if (nuevoPrestige !== asesorData.prestige || nuevoUltra !== asesorData.ultra_maximo) {
    await query(
      `INSERT INTO sistema_fases_historial (
        asesor_id, fase_anterior, fase_nueva, tipo_cambio, razon, venta_id,
        prestige_anterior, prestige_nuevo, ultra_anterior, ultra_nuevo
      ) VALUES ($1, $2, $2, 'prestige_ultra', 'Actualización de PRESTIGE/ULTRA', $3, $4, $5, $6, $7)`,
      [
        asesorId,
        asesorData.fase_actual,
        ventaId,
        asesorData.prestige,
        nuevoPrestige,
        asesorData.ultra_maximo,
        nuevoUltra,
      ]
    );
  }
}

/**
 * Registra un cambio de fase en el historial
 */
async function registrarCambioFase(
  asesorId: string,
  faseAnterior: number,
  faseNueva: number,
  tipoCambio: string,
  razon: string,
  ventaId: string | null = null
): Promise<void> {
  await query(
    `INSERT INTO sistema_fases_historial (
      asesor_id, fase_anterior, fase_nueva, tipo_cambio, razon, venta_id
    ) VALUES ($1, $2, $3, $4, $5, $6)`,
    [asesorId, faseAnterior, faseNueva, tipoCambio, razon, ventaId]
  );
}

// ==================== FUNCIONES DE ESTADÍSTICAS ====================

export async function getEstadisticasProyecto(
  tenantId: string,
  proyectoId: string
): Promise<any> {
  const sql = `
    SELECT 
      COUNT(DISTINCT sfa.id) as total_asesores,
      COUNT(DISTINCT CASE WHEN sfa.fase_actual = 1 THEN sfa.id END) as asesores_fase_1,
      COUNT(DISTINCT CASE WHEN sfa.fase_actual = 2 THEN sfa.id END) as asesores_fase_2,
      COUNT(DISTINCT CASE WHEN sfa.fase_actual = 3 THEN sfa.id END) as asesores_fase_3,
      COUNT(DISTINCT CASE WHEN sfa.fase_actual = 4 THEN sfa.id END) as asesores_fase_4,
      COUNT(DISTINCT CASE WHEN sfa.fase_actual = 5 THEN sfa.id END) as asesores_fase_5,
      COUNT(DISTINCT CASE WHEN sfa.en_modo_solitario = true THEN sfa.id END) as asesores_solitario,
      COUNT(DISTINCT sfl.id) as total_leads,
      COUNT(DISTINCT CASE WHEN sfl.estado = 'convertido' THEN sfl.id END) as leads_convertidos,
      SUM(sfl.valor_asignado) as inversion_total
    FROM sistema_fases_proyectos sfp
    LEFT JOIN sistema_fases_asesores sfa ON sfp.id = sfa.proyecto_id AND sfa.activo = true
    LEFT JOIN sistema_fases_leads sfl ON sfp.id = sfl.proyecto_id
    WHERE sfp.id = $1 AND sfp.tenant_id = $2
    GROUP BY sfp.id
  `;

  const result = await query(sql, [proyectoId, tenantId]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

