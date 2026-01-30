/**
 * Servicio de Comisiones
 * 
 * Gestiona las comisiones de los usuarios basadas en ventas
 */

import { query } from '../utils/db.js';

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

  // Campos de distribución avanzada
  tipo_participante?: string | null;
  escenario?: string | null;
  monto_habilitado?: number | null;
  es_override?: boolean | null;
  snapshot_distribucion?: any;

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
 * Interfaz para participantes de la venta
 */
export interface ParticipantesVenta {
  vendedor_id?: string | null;
  captador_id?: string | null;
  referidor_id?: string | null;           // Usuario referidor (si es del equipo)
  referidor_contacto_id?: string | null;  // Contacto referidor (si es externo)
  referidor_nombre?: string | null;       // Nombre del referidor externo
  vendedor_externo_id?: string | null;    // Contacto del vendedor externo
  vendedor_externo_tipo?: string | null;  // Tipo: 'otra_inmobiliaria', 'independiente', etc.
  vendedor_externo_nombre?: string | null;
}

/**
 * Distribución por defecto de comisiones (suma = 100%)
 *
 * REGLA PRINCIPAL: Si hay asesor externo, toma 50% del total.
 * El 50% restante se divide entre los demás participantes.
 *
 * Sin asesor externo:
 * - Vendedor: 50%
 * - Captador: 15% (si existe)
 * - Referidor: 5% (si existe)
 * - Empresa: el resto hasta 100%
 *
 * Con asesor externo:
 * - Asesor externo: 50%
 * - Del 50% restante:
 *   - Vendedor: 50% del resto = 25% del total
 *   - Captador: 15% del resto = 7.5% del total (si existe)
 *   - Referidor: 5% del resto = 2.5% del total (si existe)
 *   - Empresa: el resto
 */
const DISTRIBUCION_DEFAULT = {
  vendedor: 50,       // Sin asesor externo
  captador: 15,       // Sin asesor externo
  referidor: 5,       // Sin asesor externo
  vendedor_externo: 50, // Asesor externo siempre toma 50% del total
  empresa: 50,        // Base, se ajusta según participantes
};

/**
 * Tipo de participante con soporte para usuarios y contactos
 */
interface ParticipanteDistribucion {
  tipo: string;
  usuarioId?: string | null;
  contactoId?: string | null;
  nombreExterno?: string | null;
  porcentaje: number;
}

/**
 * Verificar si los participantes de la venta cambiaron
 * Compara las comisiones existentes con los nuevos participantes
 */
function verificarCambioParticipantes(
  comisionesExistentes: Comision[],
  nuevosParticipantes: ParticipantesVenta,
  vendedorId: string | null
): boolean {
  // Extraer participantes actuales de las comisiones
  const participantesActuales: Record<string, { usuarioId?: string | null; contactoId?: string | null }> = {};

  for (const comision of comisionesExistentes) {
    const split = comision.datos_extra?.split;
    if (split && split !== 'owner') {
      participantesActuales[split] = {
        usuarioId: comision.usuario_id || null,
        contactoId: comision.contacto_externo_id || null,
      };
    }
  }

  // Construir nuevos participantes
  const nuevos: Record<string, { usuarioId?: string | null; contactoId?: string | null }> = {};

  // Vendedor
  const nuevoVendedorId = nuevosParticipantes.vendedor_id || vendedorId;
  if (nuevoVendedorId) {
    nuevos['vendedor'] = { usuarioId: nuevoVendedorId };
  }

  // Captador
  if (nuevosParticipantes.captador_id) {
    nuevos['captador'] = { usuarioId: nuevosParticipantes.captador_id };
  }

  // Referidor
  if (nuevosParticipantes.referidor_id || nuevosParticipantes.referidor_contacto_id) {
    nuevos['referidor'] = {
      usuarioId: nuevosParticipantes.referidor_id || null,
      contactoId: nuevosParticipantes.referidor_contacto_id || null,
    };
  }

  // Vendedor externo
  if (nuevosParticipantes.vendedor_externo_id || nuevosParticipantes.vendedor_externo_nombre) {
    nuevos['vendedor_externo'] = {
      contactoId: nuevosParticipantes.vendedor_externo_id || null,
    };
  }

  // Comparar: verificar si hay diferencias
  const rolesActuales = Object.keys(participantesActuales).sort();
  const rolesNuevos = Object.keys(nuevos).sort();

  // Si los roles son diferentes, hay cambio
  if (rolesActuales.join(',') !== rolesNuevos.join(',')) {
    console.log('📋 Cambio detectado: roles diferentes', { rolesActuales, rolesNuevos });
    return true;
  }

  // Verificar si los IDs de cada rol cambiaron
  for (const rol of rolesNuevos) {
    const actual = participantesActuales[rol];
    const nuevo = nuevos[rol];

    if (!actual) {
      console.log(`📋 Cambio detectado: nuevo rol ${rol}`);
      return true;
    }

    if (actual.usuarioId !== nuevo.usuarioId || actual.contactoId !== nuevo.contactoId) {
      console.log(`📋 Cambio detectado en ${rol}:`, {
        anterior: { usuarioId: actual.usuarioId, contactoId: actual.contactoId },
        nuevo: { usuarioId: nuevo.usuarioId, contactoId: nuevo.contactoId }
      });
      return true;
    }
  }

  console.log('📋 Sin cambios en participantes');
  return false;
}

/**
 * Calcular y crear comisiones automáticamente para una venta
 * Considera todos los participantes: vendedor, captador, referidor, vendedor externo
 * La distribución suma siempre 100%
 *
 * IMPORTANTE: Un mismo usuario puede tener múltiples roles (ej: vendedor Y captador)
 * En ese caso, se crean comisiones separadas para cada rol.
 */
export async function calcularYCrearComisiones(
  tenantId: string,
  ventaId: string,
  montoComisionTotal: number,
  moneda: string,
  porcentajeComision: number,
  usuarioVendedorId: string | null,
  participantes?: ParticipantesVenta
): Promise<Comision[]> {
  console.log('🔍 calcularYCrearComisiones llamado con:', {
    tenantId,
    ventaId,
    montoComisionTotal,
    moneda,
    porcentajeComision,
    usuarioVendedorId,
    participantes: JSON.stringify(participantes, null, 2)
  });

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
    console.log('⚠️ Ya existen comisiones para esta venta, verificando si cambiaron los participantes...');

    // Obtener comisiones existentes con sus datos
    const comisionesDetalle = await getComisiones(tenantId, { ventaId });

    // Verificar si los participantes cambiaron
    const participantesCambiaron = verificarCambioParticipantes(
      comisionesDetalle,
      participantes || {},
      usuarioVendedorId
    );

    if (participantesCambiaron) {
      console.log('🔄 Los participantes cambiaron, eliminando comisiones antiguas y creando nuevas...');
      // Eliminar comisiones existentes (los participantes cambiaron)
      await query(
        `DELETE FROM comisiones WHERE venta_id = $1 AND tenant_id = $2`,
        [ventaId, tenantId]
      );
      // Continuar con la creación de nuevas comisiones (no retornar aquí)
    } else {
      console.log('✓ Los participantes no cambiaron, solo actualizando montos...');
      return await actualizarComisionesExistentes(
        tenantId,
        ventaId,
        montoComisionTotal,
        moneda,
        porcentajeComision,
        usuarioVendedorId
      );
    }
  }

  const comisionesCreadas: Comision[] = [];
  const ownerId = await getTenantOwner(tenantId);
  console.log('👤 Owner del tenant:', ownerId);

  // Determinar si hay asesor externo (vendedor_externo)
  const hayAsesorExterno = !!(participantes?.vendedor_externo_id || participantes?.vendedor_externo_nombre);

  // Si hay asesor externo, toma 50% y el resto se divide entre los demás
  // Si no hay asesor externo, se usa la distribución normal
  const factorMultiplicador = hayAsesorExterno ? 0.5 : 1.0;

  console.log('🔧 Configuración de distribución:', {
    hayAsesorExterno,
    factorMultiplicador,
    mensaje: hayAsesorExterno
      ? 'Asesor externo toma 50%, resto se divide entre demás participantes'
      : 'Distribución normal sin asesor externo'
  });

  // Calcular distribución dinámica según participantes presentes
  let porcentajeAcumulado = 0;
  const distribucion: ParticipanteDistribucion[] = [];

  // Si hay asesor externo, agregarlo primero con 50%
  if (hayAsesorExterno) {
    console.log('📌 Asesor externo:', {
      vendedor_externo_id: participantes?.vendedor_externo_id,
      vendedor_externo_tipo: participantes?.vendedor_externo_tipo,
      vendedor_externo_nombre: participantes?.vendedor_externo_nombre
    });
    const pctExterno = DISTRIBUCION_DEFAULT.vendedor_externo; // 50%
    distribucion.push({
      tipo: 'vendedor_externo',
      contactoId: participantes?.vendedor_externo_id || null,
      nombreExterno: participantes?.vendedor_externo_nombre || null,
      porcentaje: pctExterno
    });
    porcentajeAcumulado += pctExterno;
    console.log(`  ✓ Agregado asesor externo con ${pctExterno}%`);
  }

  // Vendedor (usuario_cerrador_id)
  // Si hay asesor externo, su porcentaje se reduce a la mitad
  const vendedorId = participantes?.vendedor_id || usuarioVendedorId;
  console.log('📌 Vendedor ID:', vendedorId);
  if (vendedorId) {
    const pctVendedor = DISTRIBUCION_DEFAULT.vendedor * factorMultiplicador;
    distribucion.push({ tipo: 'vendedor', usuarioId: vendedorId, porcentaje: pctVendedor });
    porcentajeAcumulado += pctVendedor;
    console.log(`  ✓ Agregado vendedor: ${vendedorId} con ${pctVendedor}%`);
  }

  // Captador (siempre es usuario del equipo)
  // Si hay asesor externo, su porcentaje se reduce a la mitad
  console.log('📌 Captador ID:', participantes?.captador_id);
  if (participantes?.captador_id) {
    const pctCaptador = DISTRIBUCION_DEFAULT.captador * factorMultiplicador;
    distribucion.push({ tipo: 'captador', usuarioId: participantes.captador_id, porcentaje: pctCaptador });
    porcentajeAcumulado += pctCaptador;
    console.log(`  ✓ Agregado captador: ${participantes.captador_id} con ${pctCaptador}%`);
  }

  // Referidor - puede ser usuario (referidor_id) o contacto externo (referidor_contacto_id)
  // Si hay asesor externo, su porcentaje se reduce a la mitad
  console.log('📌 Referidor:', {
    referidor_id: participantes?.referidor_id,
    referidor_contacto_id: participantes?.referidor_contacto_id,
    referidor_nombre: participantes?.referidor_nombre
  });
  if (participantes?.referidor_id || participantes?.referidor_contacto_id || participantes?.referidor_nombre) {
    const pctReferidor = DISTRIBUCION_DEFAULT.referidor * factorMultiplicador;
    distribucion.push({
      tipo: 'referidor',
      usuarioId: participantes.referidor_id || null,
      contactoId: participantes.referidor_contacto_id || null,
      nombreExterno: participantes.referidor_nombre || null,
      porcentaje: pctReferidor
    });
    porcentajeAcumulado += pctReferidor;
    console.log(`  ✓ Agregado referidor con ${pctReferidor}%`);
  }

  // Empresa (owner) recibe el resto hasta completar 100%
  const porcentajeEmpresa = Math.max(0, 100 - porcentajeAcumulado);
  console.log('📌 Porcentaje empresa:', porcentajeEmpresa);
  if (ownerId && porcentajeEmpresa > 0) {
    distribucion.push({ tipo: 'owner', usuarioId: ownerId, porcentaje: porcentajeEmpresa });
    console.log(`  ✓ Agregado owner: ${ownerId} con ${porcentajeEmpresa}%`);
  }

  console.log('📊 Distribución final:', distribucion.map(d => `${d.tipo}=${d.porcentaje}%`).join(', '));

  // Crear comisiones para cada participante
  // IMPORTANTE: Se crea una comisión por cada rol, incluso si el mismo usuario tiene múltiples roles
  for (const part of distribucion) {
    const monto = (montoComisionTotal * part.porcentaje) / 100;

    // Si es un participante externo (solo contacto, sin usuario), usar el owner como usuario
    // pero marcar que es comisión de un externo
    const usuarioIdParaComision = part.usuarioId || ownerId;

    console.log(`💰 Creando comisión para ${part.tipo}: ${monto} ${moneda} (${part.porcentaje}%)`);

    const comision = await createComision(tenantId, {
      venta_id: ventaId,
      usuario_id: usuarioIdParaComision!,
      monto: monto,
      moneda: moneda,
      porcentaje: (porcentajeComision * part.porcentaje) / 100,
      tipo: 'venta',
      contacto_externo_id: part.contactoId || null,
      datos_extra: {
        split: part.tipo,
        porcentajeSplit: part.porcentaje,
        montoTotalComision: montoComisionTotal,
        esExterno: !part.usuarioId && (part.contactoId || part.nombreExterno) ? true : false,
        nombreExterno: part.nombreExterno || null,
        contactoExternoId: part.contactoId || null,
      },
      split_porcentaje_vendedor: distribucion.find(d => d.tipo === 'vendedor')?.porcentaje || 0,
      split_porcentaje_owner: porcentajeEmpresa,
    });
    comisionesCreadas.push(comision);
  }

  console.log(`✅ Comisiones creadas para venta ${ventaId}: ${comisionesCreadas.length} comisiones, distribución: ${distribucion.map(d => `${d.tipo}=${d.porcentaje}%`).join(', ')}`);
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

// ============================================
// NUEVAS FUNCIONES PARA INTEGRACIÓN CON PLANTILLAS
// ============================================

/**
 * Tipo de participante en una venta
 */
export type TipoParticipante = 'vendedor' | 'captador' | 'mentor' | 'lider' | 'referidor' | 'empresa';

/**
 * Escenario de la venta
 */
export type EscenarioVenta = 'solo_capta' | 'solo_vende' | 'capta_y_vende';

/**
 * Participante de una venta con su distribución
 */
export interface ParticipanteVenta {
  usuarioId: string;
  tipo: TipoParticipante;
  porcentajeOverride?: number; // Si el admin quiere un % diferente al de la plantilla
}

/**
 * Obtener plantilla de comisión de un usuario
 */
async function getPlantillaDeUsuario(tenantId: string, usuarioId: string): Promise<any | null> {
  // Buscar perfil de asesor con plantilla asignada
  const perfilResult = await query(`
    SELECT pa.plantilla_comision_id, c.config, c.nombre as plantilla_nombre, c.id as plantilla_id
    FROM perfiles_asesor pa
    LEFT JOIN catalogos c ON pa.plantilla_comision_id = c.id
    WHERE pa.tenant_id = $1 AND pa.usuario_id = $2
  `, [tenantId, usuarioId]);

  if (perfilResult.rows.length > 0 && perfilResult.rows[0].config) {
    const row = perfilResult.rows[0];
    return {
      id: row.plantilla_id,
      nombre: row.plantilla_nombre,
      config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
    };
  }

  // Si no tiene plantilla asignada, buscar la plantilla por defecto
  const defaultResult = await query(`
    SELECT id, nombre, config
    FROM catalogos
    WHERE tipo = 'plantilla_comision'
      AND es_default = true
      AND (tenant_id IS NULL OR tenant_id = $1)
    ORDER BY tenant_id NULLS LAST
    LIMIT 1
  `, [tenantId]);

  if (defaultResult.rows.length > 0) {
    const row = defaultResult.rows[0];
    return {
      id: row.id,
      nombre: row.nombre,
      config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
    };
  }

  return null;
}

/**
 * Obtener porcentaje de distribución desde una plantilla
 */
function obtenerPorcentajeDePlantilla(
  plantilla: any | null,
  tipoParticipante: TipoParticipante,
  tipoPropiedad: 'propiedad_lista' | 'proyecto',
  escenario: EscenarioVenta
): number {
  if (!plantilla || !plantilla.config || !plantilla.config.distribuciones) {
    // Valores por defecto si no hay plantilla
    const defaultSplits: Record<TipoParticipante, Record<EscenarioVenta, number>> = {
      vendedor: { solo_capta: 0, solo_vende: 50, capta_y_vende: 50 },
      captador: { solo_capta: 20, solo_vende: 0, capta_y_vende: 20 },
      empresa: { solo_capta: 80, solo_vende: 50, capta_y_vende: 30 },
      mentor: { solo_capta: 0, solo_vende: 0, capta_y_vende: 0 },
      lider: { solo_capta: 0, solo_vende: 0, capta_y_vende: 0 },
      referidor: { solo_capta: 0, solo_vende: 0, capta_y_vende: 0 },
    };
    return defaultSplits[tipoParticipante]?.[escenario] || 0;
  }

  const distribuciones = plantilla.config.distribuciones[tipoPropiedad] || plantilla.config.distribuciones.propiedad_lista;
  const escenarioConfig = distribuciones?.[escenario] || distribuciones?.solo_vende;

  // Mapear tipo de participante al nombre en la plantilla
  const mapeoTipos: Record<TipoParticipante, string> = {
    vendedor: 'vendedor',
    captador: 'captador',
    empresa: 'empresa',
    mentor: 'mentor',
    lider: 'lider',
    referidor: 'referidor',
  };

  return escenarioConfig?.[mapeoTipos[tipoParticipante]] || 0;
}

/**
 * Determinar escenario de venta basado en participantes
 */
function determinarEscenario(tieneVendedor: boolean, tieneCaptador: boolean): EscenarioVenta {
  if (tieneVendedor && tieneCaptador) {
    return 'capta_y_vende';
  } else if (tieneCaptador && !tieneVendedor) {
    return 'solo_capta';
  } else {
    return 'solo_vende';
  }
}

/**
 * Calcular y crear comisiones con plantillas
 * Nueva versión que integra el sistema de plantillas
 */
export async function calcularYCrearComisionesConPlantillas(params: {
  tenantId: string;
  ventaId: string;
  montoComisionTotal: number;
  moneda: string;
  participantes: ParticipanteVenta[];
  tipoPropiedad?: 'propiedad_lista' | 'proyecto';
  registradoPorId: string;
  registradoPorNombre?: string;
}): Promise<Comision[]> {
  const {
    tenantId,
    ventaId,
    montoComisionTotal,
    moneda,
    participantes,
    tipoPropiedad = 'propiedad_lista',
    registradoPorId,
    registradoPorNombre,
  } = params;

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
    console.log('⚠️ Ya existen comisiones para esta venta, actualizando');
    // TODO: Implementar actualización con nuevo sistema
    return [];
  }

  // Determinar escenario
  const tieneVendedor = participantes.some(p => p.tipo === 'vendedor');
  const tieneCaptador = participantes.some(p => p.tipo === 'captador');
  const escenario = determinarEscenario(tieneVendedor, tieneCaptador);

  const comisionesCreadas: Comision[] = [];
  let porcentajeAcumulado = 0;

  // Para cada participante, calcular su comisión
  for (const participante of participantes) {
    // Obtener plantilla del usuario
    const plantilla = await getPlantillaDeUsuario(tenantId, participante.usuarioId);

    // Calcular porcentaje (override o plantilla)
    let porcentaje: number;
    let esOverride = false;

    if (participante.porcentajeOverride !== undefined) {
      porcentaje = participante.porcentajeOverride;
      esOverride = true;
    } else {
      porcentaje = obtenerPorcentajeDePlantilla(
        plantilla,
        participante.tipo,
        tipoPropiedad,
        escenario
      );
    }

    const monto = Math.round((montoComisionTotal * porcentaje) / 100 * 100) / 100;
    porcentajeAcumulado += porcentaje;

    // Crear snapshot INMUTABLE
    const snapshot = {
      plantilla_id: plantilla?.id || null,
      plantilla_nombre: plantilla?.nombre || 'Sin plantilla',
      porcentaje_original: porcentaje,
      monto_original: monto,
      tipo_propiedad: tipoPropiedad,
      escenario,
      fecha_snapshot: new Date().toISOString(),
      config_plantilla: plantilla?.config || null,
      es_override: esOverride,
    };

    // Insertar comisión
    const result = await query(`
      INSERT INTO comisiones (
        tenant_id, venta_id, usuario_id, monto, moneda, porcentaje,
        tipo, estado, tipo_participante, escenario,
        snapshot_distribucion, monto_habilitado, es_override,
        datos_extra
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      tenantId,
      ventaId,
      participante.usuarioId,
      monto,
      moneda,
      porcentaje,
      'venta',
      'pendiente',
      participante.tipo,
      escenario,
      JSON.stringify(snapshot),
      0, // monto_habilitado comienza en 0
      esOverride,
      JSON.stringify({ split: participante.tipo, porcentajeSplit: porcentaje }),
    ]);

    comisionesCreadas.push({
      ...result.rows[0],
      snapshot_distribucion: snapshot,
    });
  }

  // Crear comisión de empresa (lo que queda)
  const porcentajeEmpresa = 100 - porcentajeAcumulado;
  if (porcentajeEmpresa > 0) {
    const montoEmpresa = Math.round((montoComisionTotal * porcentajeEmpresa) / 100 * 100) / 100;
    const ownerId = await getTenantOwner(tenantId);

    const snapshotEmpresa = {
      porcentaje_original: porcentajeEmpresa,
      monto_original: montoEmpresa,
      tipo: 'utilidad_empresa',
      fecha_snapshot: new Date().toISOString(),
    };

    const resultEmpresa = await query(`
      INSERT INTO comisiones (
        tenant_id, venta_id, usuario_id, monto, moneda, porcentaje,
        tipo, estado, tipo_participante, escenario,
        snapshot_distribucion, monto_habilitado, es_override,
        datos_extra
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      tenantId,
      ventaId,
      ownerId, // Empresa usa el owner del tenant
      montoEmpresa,
      moneda,
      porcentajeEmpresa,
      'venta',
      'pendiente',
      'empresa',
      escenario,
      JSON.stringify(snapshotEmpresa),
      0,
      false,
      JSON.stringify({ split: 'owner', porcentajeSplit: porcentajeEmpresa }),
    ]);

    comisionesCreadas.push({
      ...resultEmpresa.rows[0],
      snapshot_distribucion: snapshotEmpresa,
    });
  }

  // Registrar en historial
  try {
    const { registrarCambio } = await import('./ventasHistorialService.js');
    await registrarCambio({
      tenantId,
      ventaId,
      tipoCambio: 'distribucion_creada',
      entidad: 'comision',
      datosNuevos: { comisiones: comisionesCreadas.map(c => ({ id: c.id, tipo: c.tipo_participante, porcentaje: c.porcentaje, monto: c.monto })) },
      descripcion: `Distribución creada: ${comisionesCreadas.length} participantes`,
      usuarioId: registradoPorId,
      usuarioNombre: registradoPorNombre,
    });
  } catch (e) {
    console.log('⚠️ No se pudo registrar en historial:', e);
  }

  console.log(`✅ Comisiones con plantillas creadas para venta ${ventaId}: ${comisionesCreadas.length} comisiones`);
  return comisionesCreadas;
}

/**
 * Modificar distribución de comisiones (Admin)
 */
export async function modificarDistribucion(params: {
  tenantId: string;
  ventaId: string;
  nuevaDistribucion: {
    comisionId?: string;
    usuarioId?: string;
    tipoParticipante: TipoParticipante;
    porcentaje: number;
  }[];
  registradoPorId: string;
  registradoPorNombre?: string;
}): Promise<Comision[]> {
  const { tenantId, ventaId, nuevaDistribucion, registradoPorId, registradoPorNombre } = params;

  // Validar que porcentajes sumen 100%
  const totalPorcentaje = nuevaDistribucion.reduce((sum, d) => sum + d.porcentaje, 0);
  if (Math.abs(totalPorcentaje - 100) > 0.01) {
    throw new Error(`Los porcentajes deben sumar 100%. Actual: ${totalPorcentaje}%`);
  }

  // Obtener distribución actual
  const distribucionActual = await getComisiones(tenantId, { ventaId });

  // Obtener venta para recalcular montos
  const ventaResult = await query(
    `SELECT monto_comision, moneda FROM ventas WHERE id = $1 AND tenant_id = $2`,
    [ventaId, tenantId]
  );

  if (ventaResult.rows.length === 0) {
    throw new Error('Venta no encontrada');
  }

  const venta = ventaResult.rows[0];
  const montoComisionTotal = parseFloat(venta.monto_comision);
  const comisionesActualizadas: Comision[] = [];

  // Aplicar cambios
  for (const nueva of nuevaDistribucion) {
    const monto = Math.round((montoComisionTotal * nueva.porcentaje) / 100 * 100) / 100;

    if (nueva.comisionId) {
      // Modificar existente
      await query(`
        UPDATE comisiones SET
          porcentaje = $1,
          monto = $2,
          es_override = true,
          updated_at = NOW()
        WHERE id = $3 AND tenant_id = $4
      `, [nueva.porcentaje, monto, nueva.comisionId, tenantId]);

      const updated = await getComisionById(tenantId, nueva.comisionId);
      if (updated) comisionesActualizadas.push(updated);
    } else if (nueva.usuarioId) {
      // Crear nueva comisión
      const result = await query(`
        INSERT INTO comisiones (
          tenant_id, venta_id, usuario_id, monto, moneda, porcentaje,
          tipo, estado, tipo_participante, es_override,
          snapshot_distribucion, monto_habilitado
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        tenantId,
        ventaId,
        nueva.usuarioId,
        monto,
        venta.moneda || 'USD',
        nueva.porcentaje,
        'venta',
        'pendiente',
        nueva.tipoParticipante,
        true,
        JSON.stringify({
          porcentaje_original: nueva.porcentaje,
          monto_original: monto,
          modificado_manualmente: true,
          fecha_snapshot: new Date().toISOString(),
        }),
        0,
      ]);

      comisionesActualizadas.push(result.rows[0]);
    }
  }

  // Registrar en historial
  try {
    const { registrarCambio } = await import('./ventasHistorialService.js');
    await registrarCambio({
      tenantId,
      ventaId,
      tipoCambio: 'distribucion_modificada',
      entidad: 'comision',
      datosAnteriores: { comisiones: distribucionActual.map(c => ({ id: c.id, tipo: c.tipo_participante, porcentaje: c.porcentaje, monto: c.monto })) },
      datosNuevos: { comisiones: comisionesActualizadas.map(c => ({ id: c.id, tipo: c.tipo_participante, porcentaje: c.porcentaje, monto: c.monto })) },
      descripcion: 'Distribución modificada manualmente',
      usuarioId: registradoPorId,
      usuarioNombre: registradoPorNombre,
    });
  } catch (e) {
    console.log('⚠️ No se pudo registrar en historial:', e);
  }

  return comisionesActualizadas;
}

/**
 * Obtener comisiones de un asesor (vista de asesor)
 */
export async function getMisComisiones(
  tenantId: string,
  usuarioId: string,
  opciones?: {
    estado?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{
  comisiones: any[];
  resumen: {
    totalProyectado: number;
    totalHabilitado: number;
    totalCobrado: number;
    pendienteCobro: number;
  };
}> {
  const { estado, limit = 20, offset = 0 } = opciones || {};

  let whereClause = `c.tenant_id = $1 AND c.usuario_id = $2 AND c.tipo_participante != 'empresa'`;
  const params: any[] = [tenantId, usuarioId];

  if (estado) {
    whereClause += ` AND c.estado = $3`;
    params.push(estado);
  }

  // Obtener comisiones
  const comisionesResult = await query(`
    SELECT
      c.*,
      v.numero_venta,
      v.nombre_negocio,
      v.valor_cierre,
      v.estado_cobro as venta_estado_cobro,
      p.titulo as propiedad_nombre,
      p.imagen_principal as propiedad_imagen
    FROM comisiones c
    JOIN ventas v ON c.venta_id = v.id
    LEFT JOIN propiedades p ON v.propiedad_id = p.id
    WHERE ${whereClause}
    ORDER BY v.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `, [...params, limit, offset]);

  // Obtener resumen
  const resumenResult = await query(`
    SELECT
      COALESCE(SUM(c.monto), 0) as total_proyectado,
      COALESCE(SUM(c.monto_habilitado), 0) as total_habilitado,
      COALESCE(SUM(c.monto_pagado), 0) as total_cobrado
    FROM comisiones c
    WHERE c.tenant_id = $1 AND c.usuario_id = $2 AND c.tipo_participante != 'empresa'
  `, [tenantId, usuarioId]);

  const resumen = resumenResult.rows[0];

  return {
    comisiones: comisionesResult.rows.map(row => ({
      ...row,
      snapshot_distribucion: typeof row.snapshot_distribucion === 'string'
        ? JSON.parse(row.snapshot_distribucion)
        : row.snapshot_distribucion,
      disponible: parseFloat(row.monto_habilitado || 0) - parseFloat(row.monto_pagado || 0),
    })),
    resumen: {
      totalProyectado: parseFloat(resumen.total_proyectado || 0),
      totalHabilitado: parseFloat(resumen.total_habilitado || 0),
      totalCobrado: parseFloat(resumen.total_cobrado || 0),
      pendienteCobro: parseFloat(resumen.total_habilitado || 0) - parseFloat(resumen.total_cobrado || 0),
    },
  };
}


