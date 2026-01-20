/**
 * Service para gestionar Plantillas de Comisión
 *
 * Las plantillas definen cómo se distribuyen las comisiones entre:
 * - Captador
 * - Vendedor
 * - Empresa
 *
 * Según el tipo de propiedad (lista vs proyecto) y escenario
 * (solo capta, solo vende, capta y vende).
 */

import { query } from '../utils/db.js';

// ============================================
// Interfaces
// ============================================

export interface DistribucionEscenario {
  captador: number;
  vendedor: number;
  empresa: number;
}

export interface DistribucionesTipoPropiedad {
  solo_capta: DistribucionEscenario;
  solo_vende: DistribucionEscenario;
  capta_y_vende: DistribucionEscenario;
}

export interface FeePrevio {
  rol: string;
  porcentaje: number;
  descripcion: string;
  aplica_a?: string[];
}

export interface DistribucionEmpresaItem {
  rol: string;
  tipo: 'porcentaje' | 'fijo';
  valor: number;
  moneda?: string;
  descripcion: string;
}

export interface PlantillaComisionConfig {
  distribuciones: {
    propiedad_lista: DistribucionesTipoPropiedad;
    proyecto: DistribucionesTipoPropiedad;
  };
  fees_previos: FeePrevio[];
  distribucion_empresa?: DistribucionEmpresaItem[];
  roles_aplicables: string[];
  es_personal: boolean;
  usuario_id?: string;
  fee_referidor?: {
    tipo: 'porcentaje' | 'fijo';
    valor: number;
    descripcion: string;
  };
}

export interface PlantillaComision {
  id: string;
  tenant_id: string | null;
  tipo: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  icono: string | null;
  color: string | null;
  orden: number;
  activo: boolean;
  es_default: boolean;
  config: PlantillaComisionConfig;
  created_at: Date;
  updated_at: Date;
}

export interface DistribucionEmpresaConfig {
  distribuciones: DistribucionEmpresaItem[];
  nota?: string;
}

// ============================================
// Funciones de Plantillas de Comisión
// ============================================

/**
 * Obtiene todas las plantillas de comisión disponibles para un tenant
 * Incluye plantillas globales (tenant_id = null) y del tenant específico
 * Si existe una copia local de una plantilla global, solo muestra la local
 */
export async function getPlantillasComision(tenantId: string): Promise<PlantillaComision[]> {
  // Obtener todas las plantillas (globales y del tenant)
  const result = await query<PlantillaComision>(`
    SELECT *
    FROM catalogos
    WHERE tipo = 'plantilla_comision'
      AND activo = true
      AND (tenant_id IS NULL OR tenant_id = $1)
    ORDER BY orden ASC
  `, [tenantId]);

  // Filtrar para que si hay una local con el mismo código que una global, solo mostrar la local
  const plantillasMap = new Map<string, PlantillaComision>();

  for (const p of result.rows) {
    const parsed = {
      ...p,
      config: typeof p.config === 'string' ? JSON.parse(p.config as string) : p.config
    };

    // Si ya existe una con este código, priorizar la del tenant (no global)
    const existing = plantillasMap.get(p.codigo);
    if (!existing) {
      plantillasMap.set(p.codigo, parsed);
    } else if (p.tenant_id !== null && existing.tenant_id === null) {
      // La nueva es local y la existente es global, reemplazar
      plantillasMap.set(p.codigo, parsed);
    }
    // Si la nueva es global y ya existe una local, no hacer nada (mantener la local)
  }

  // Ordenar por orden
  return Array.from(plantillasMap.values()).sort((a, b) => a.orden - b.orden);
}

/**
 * Obtiene una plantilla específica por ID
 */
export async function getPlantillaById(tenantId: string, plantillaId: string): Promise<PlantillaComision | null> {
  const result = await query<PlantillaComision>(`
    SELECT *
    FROM catalogos
    WHERE id = $1
      AND tipo = 'plantilla_comision'
      AND (tenant_id IS NULL OR tenant_id = $2)
  `, [plantillaId, tenantId]);

  if (result.rows.length === 0) return null;

  const plantilla = result.rows[0];
  return {
    ...plantilla,
    config: typeof plantilla.config === 'string' ? JSON.parse(plantilla.config as string) : plantilla.config
  };
}

/**
 * Obtiene una plantilla por código
 */
export async function getPlantillaByCodigo(tenantId: string, codigo: string): Promise<PlantillaComision | null> {
  // Primero buscar en plantillas del tenant
  let result = await query<PlantillaComision>(`
    SELECT *
    FROM catalogos
    WHERE codigo = $1
      AND tipo = 'plantilla_comision'
      AND tenant_id = $2
      AND activo = true
  `, [codigo, tenantId]);

  // Si no hay, buscar en globales
  if (result.rows.length === 0) {
    result = await query<PlantillaComision>(`
      SELECT *
      FROM catalogos
      WHERE codigo = $1
        AND tipo = 'plantilla_comision'
        AND tenant_id IS NULL
        AND activo = true
    `, [codigo]);
  }

  if (result.rows.length === 0) return null;

  const plantilla = result.rows[0];
  return {
    ...plantilla,
    config: typeof plantilla.config === 'string' ? JSON.parse(plantilla.config as string) : plantilla.config
  };
}

/**
 * Crea una nueva plantilla de comisión para un tenant
 */
export async function createPlantillaComision(
  tenantId: string,
  data: {
    codigo: string;
    nombre: string;
    descripcion?: string;
    icono?: string;
    color?: string;
    config: PlantillaComisionConfig;
  }
): Promise<PlantillaComision> {
  // Obtener el siguiente orden
  const maxOrdenResult = await query<{ max: number }>(`
    SELECT COALESCE(MAX(orden), 0) as max
    FROM catalogos
    WHERE tipo = 'plantilla_comision'
      AND (tenant_id IS NULL OR tenant_id = $1)
  `, [tenantId]);

  const nextOrden = (maxOrdenResult.rows[0]?.max || 0) + 1;

  const result = await query<PlantillaComision>(`
    INSERT INTO catalogos (tenant_id, tipo, codigo, nombre, descripcion, icono, color, orden, activo, es_default, config)
    VALUES ($1, 'plantilla_comision', $2, $3, $4, $5, $6, $7, true, false, $8)
    RETURNING *
  `, [
    tenantId,
    data.codigo,
    data.nombre,
    data.descripcion || null,
    data.icono || 'Percent',
    data.color || '#6366f1',
    nextOrden,
    JSON.stringify(data.config)
  ]);

  return {
    ...result.rows[0],
    config: data.config
  };
}

/**
 * Actualiza una plantilla de comisión
 * Si es una plantilla global, crea una copia local para el tenant
 */
export async function updatePlantillaComision(
  tenantId: string,
  plantillaId: string,
  data: Partial<{
    nombre: string;
    descripcion: string;
    icono: string;
    color: string;
    activo: boolean;
    config: PlantillaComisionConfig;
  }>
): Promise<PlantillaComision | null> {
  // Buscar la plantilla original
  const existingResult = await query<PlantillaComision>(`
    SELECT * FROM catalogos
    WHERE id = $1 AND tipo = 'plantilla_comision'
  `, [plantillaId]);

  if (existingResult.rows.length === 0) {
    throw new Error('Plantilla no encontrada');
  }

  const existing = existingResult.rows[0];

  // Si es una plantilla global, crear una copia local para el tenant
  if (existing.tenant_id === null) {
    // Verificar si ya existe una copia local con el mismo código
    const localCopy = await query<PlantillaComision>(`
      SELECT * FROM catalogos
      WHERE codigo = $1 AND tipo = 'plantilla_comision' AND tenant_id = $2
    `, [existing.codigo, tenantId]);

    if (localCopy.rows.length > 0) {
      // Ya existe una copia local, actualizar esa
      return updateLocalPlantilla(localCopy.rows[0].id, data);
    }

    // Crear una copia local con los nuevos valores
    const newConfig = data.config || (typeof existing.config === 'string'
      ? JSON.parse(existing.config as string)
      : existing.config);

    const result = await query<PlantillaComision>(`
      INSERT INTO catalogos (
        tenant_id, tipo, codigo, nombre, descripcion, icono, color, orden, activo, es_default, config
      ) VALUES ($1, 'plantilla_comision', $2, $3, $4, $5, $6, $7, true, $8, $9)
      RETURNING *
    `, [
      tenantId,
      existing.codigo,
      data.nombre || existing.nombre,
      data.descripcion !== undefined ? data.descripcion : existing.descripcion,
      data.icono || existing.icono,
      data.color || existing.color,
      existing.orden,
      existing.es_default,
      JSON.stringify(newConfig)
    ]);

    const plantilla = result.rows[0];
    return {
      ...plantilla,
      config: typeof plantilla.config === 'string' ? JSON.parse(plantilla.config as string) : plantilla.config
    };
  }

  // Es una plantilla local, verificar que pertenece al tenant
  if (existing.tenant_id !== tenantId) {
    throw new Error('No tiene permisos para modificar esta plantilla');
  }

  return updateLocalPlantilla(plantillaId, data);
}

/**
 * Actualiza una plantilla local (helper interno)
 */
async function updateLocalPlantilla(
  plantillaId: string,
  data: Partial<{
    nombre: string;
    descripcion: string;
    icono: string;
    color: string;
    activo: boolean;
    config: PlantillaComisionConfig;
  }>
): Promise<PlantillaComision> {
  // Construir la query de actualización dinámicamente
  const updates: string[] = ['updated_at = NOW()'];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.nombre !== undefined) {
    updates.push(`nombre = $${paramIndex++}`);
    values.push(data.nombre);
  }
  if (data.descripcion !== undefined) {
    updates.push(`descripcion = $${paramIndex++}`);
    values.push(data.descripcion);
  }
  if (data.icono !== undefined) {
    updates.push(`icono = $${paramIndex++}`);
    values.push(data.icono);
  }
  if (data.color !== undefined) {
    updates.push(`color = $${paramIndex++}`);
    values.push(data.color);
  }
  if (data.activo !== undefined) {
    updates.push(`activo = $${paramIndex++}`);
    values.push(data.activo);
  }
  if (data.config !== undefined) {
    updates.push(`config = $${paramIndex++}`);
    values.push(JSON.stringify(data.config));
  }

  values.push(plantillaId);

  const result = await query<PlantillaComision>(`
    UPDATE catalogos
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `, values);

  const plantilla = result.rows[0];
  return {
    ...plantilla,
    config: typeof plantilla.config === 'string' ? JSON.parse(plantilla.config as string) : plantilla.config
  };
}

/**
 * Elimina una plantilla de comisión
 * Solo puede eliminar plantillas del tenant (no globales)
 */
export async function deletePlantillaComision(tenantId: string, plantillaId: string): Promise<boolean> {
  // Verificar que la plantilla pertenece al tenant
  const existing = await query(`
    SELECT id FROM catalogos
    WHERE id = $1 AND tipo = 'plantilla_comision' AND tenant_id = $2
  `, [plantillaId, tenantId]);

  if (existing.rows.length === 0) {
    throw new Error('Plantilla no encontrada o no tiene permisos para eliminarla');
  }

  // Verificar que no está siendo usada por ningún perfil
  const perfilesUsando = await query<{ count: string }>(`
    SELECT COUNT(*) as count FROM perfiles_asesor
    WHERE plantilla_comision_id = $1
  `, [plantillaId]);

  if (parseInt(perfilesUsando.rows[0]?.count || '0') > 0) {
    throw new Error('No se puede eliminar la plantilla porque está siendo usada por uno o más asesores');
  }

  await query('DELETE FROM catalogos WHERE id = $1', [plantillaId]);

  return true;
}

/**
 * Crea una plantilla personalizada para un usuario específico
 */
export async function createPlantillaPersonalizada(
  tenantId: string,
  usuarioId: string,
  nombreUsuario: string,
  config: PlantillaComisionConfig
): Promise<PlantillaComision> {
  // Generar código único
  const codigo = `personal_${usuarioId.substring(0, 8)}`;

  const configPersonal: PlantillaComisionConfig = {
    ...config,
    es_personal: true,
    usuario_id: usuarioId
  };

  return createPlantillaComision(tenantId, {
    codigo,
    nombre: `Plan Personal - ${nombreUsuario}`,
    descripcion: `Plantilla de comisión personalizada para ${nombreUsuario}`,
    icono: 'UserCog',
    color: '#ec4899',
    config: configPersonal
  });
}

// ============================================
// Funciones de Distribución Interna de Empresa
// ============================================

/**
 * Obtiene la configuración de distribución interna de empresa
 */
export async function getDistribucionEmpresa(tenantId: string): Promise<DistribucionEmpresaConfig | null> {
  // Buscar primero en tenant
  let result = await query<{ config: DistribucionEmpresaConfig | string }>(`
    SELECT config FROM catalogos
    WHERE tipo = 'distribucion_empresa' AND tenant_id = $1 AND activo = true
  `, [tenantId]);

  // Si no hay, buscar en global
  if (result.rows.length === 0) {
    result = await query<{ config: DistribucionEmpresaConfig | string }>(`
      SELECT config FROM catalogos
      WHERE tipo = 'distribucion_empresa' AND tenant_id IS NULL AND activo = true
    `);
  }

  if (result.rows.length === 0) return null;

  const config = result.rows[0].config;
  return typeof config === 'string' ? JSON.parse(config) : config;
}

/**
 * Actualiza o crea la configuración de distribución interna de empresa para un tenant
 */
export async function updateDistribucionEmpresa(
  tenantId: string,
  distribuciones: DistribucionEmpresaItem[]
): Promise<DistribucionEmpresaConfig> {
  const config: DistribucionEmpresaConfig = {
    distribuciones,
    nota: 'Los porcentajes se aplican sobre la parte de empresa. El resto es utilidad neta.'
  };

  // Verificar si ya existe para el tenant
  const existing = await query<{ id: string }>(`
    SELECT id FROM catalogos
    WHERE tipo = 'distribucion_empresa' AND tenant_id = $1
  `, [tenantId]);

  if (existing.rows.length > 0) {
    await query(`
      UPDATE catalogos
      SET config = $1, updated_at = NOW()
      WHERE id = $2
    `, [JSON.stringify(config), existing.rows[0].id]);
  } else {
    await query(`
      INSERT INTO catalogos (tenant_id, tipo, codigo, nombre, descripcion, orden, activo, es_default, config)
      VALUES ($1, 'distribucion_empresa', 'custom', 'Distribución Interna de Empresa',
        'Configuración personalizada de distribución interna', 1, true, false, $2)
    `, [tenantId, JSON.stringify(config)]);
  }

  return config;
}

// ============================================
// Funciones de Asignación a Perfiles
// ============================================

/**
 * Asigna una plantilla de comisión a un perfil de asesor
 */
export async function asignarPlantillaAPerfil(
  tenantId: string,
  perfilId: string,
  plantillaId: string
): Promise<void> {
  // Verificar que la plantilla es accesible para el tenant
  const plantilla = await getPlantillaById(tenantId, plantillaId);
  if (!plantilla) {
    throw new Error('Plantilla no encontrada');
  }

  await query(`
    UPDATE perfiles_asesor
    SET plantilla_comision_id = $1, updated_at = NOW()
    WHERE id = $2 AND tenant_id = $3
  `, [plantillaId, perfilId, tenantId]);
}

/**
 * Obtiene la plantilla de comisión asignada a un perfil
 */
export async function getPlantillaDePerfil(tenantId: string, perfilId: string): Promise<PlantillaComision | null> {
  const result = await query<{ plantilla_comision_id: string | null }>(`
    SELECT plantilla_comision_id FROM perfiles_asesor
    WHERE id = $1 AND tenant_id = $2
  `, [perfilId, tenantId]);

  if (result.rows.length === 0 || !result.rows[0].plantilla_comision_id) {
    // Retornar la plantilla por defecto
    return getPlantillaDefault(tenantId);
  }

  return getPlantillaById(tenantId, result.rows[0].plantilla_comision_id);
}

/**
 * Obtiene la plantilla por defecto para un tenant
 */
export async function getPlantillaDefault(tenantId: string): Promise<PlantillaComision | null> {
  // Buscar primero en plantillas del tenant
  let result = await query<PlantillaComision>(`
    SELECT * FROM catalogos
    WHERE tipo = 'plantilla_comision' AND tenant_id = $1 AND es_default = true AND activo = true
  `, [tenantId]);

  // Si no hay, buscar en globales
  if (result.rows.length === 0) {
    result = await query<PlantillaComision>(`
      SELECT * FROM catalogos
      WHERE tipo = 'plantilla_comision' AND tenant_id IS NULL AND es_default = true AND activo = true
    `);
  }

  if (result.rows.length === 0) return null;

  const plantilla = result.rows[0];
  return {
    ...plantilla,
    config: typeof plantilla.config === 'string' ? JSON.parse(plantilla.config as string) : plantilla.config
  };
}

// ============================================
// Funciones de Cálculo de Comisiones
// ============================================

export interface CalculoComisionInput {
  montoComision: number;
  tipoPropiedad: 'propiedad_lista' | 'proyecto';
  escenario: 'solo_capta' | 'solo_vende' | 'capta_y_vende';
  plantilla: PlantillaComision;
  feesAdicionales?: FeePrevio[];
}

export interface CalculoComisionResult {
  montoOriginal: number;
  feesPrevios: { rol: string; monto: number; porcentaje: number }[];
  montoBaseDistribucion: number;
  distribucion: {
    captador: { porcentaje: number; monto: number };
    vendedor: { porcentaje: number; monto: number };
    empresa: { porcentaje: number; monto: number };
  };
  snapshot: PlantillaComisionConfig;
}

/**
 * Calcula la distribución de una comisión según la plantilla
 */
export function calcularDistribucionComision(input: CalculoComisionInput): CalculoComisionResult {
  const { montoComision, tipoPropiedad, escenario, plantilla, feesAdicionales = [] } = input;

  // 1. Calcular fees previos
  const feesPrevios: { rol: string; monto: number; porcentaje: number }[] = [];
  let totalFees = 0;

  const allFees = [...plantilla.config.fees_previos, ...feesAdicionales];

  for (const fee of allFees) {
    const montoFee = (montoComision * fee.porcentaje) / 100;
    feesPrevios.push({
      rol: fee.rol,
      monto: montoFee,
      porcentaje: fee.porcentaje
    });
    totalFees += montoFee;
  }

  // 2. Calcular monto base para distribución
  const montoBaseDistribucion = montoComision - totalFees;

  // 3. Obtener porcentajes según tipo y escenario
  const distribucionConfig = plantilla.config.distribuciones[tipoPropiedad][escenario];

  // 4. Calcular montos
  const distribucion = {
    captador: {
      porcentaje: distribucionConfig.captador,
      monto: (montoBaseDistribucion * distribucionConfig.captador) / 100
    },
    vendedor: {
      porcentaje: distribucionConfig.vendedor,
      monto: (montoBaseDistribucion * distribucionConfig.vendedor) / 100
    },
    empresa: {
      porcentaje: distribucionConfig.empresa,
      monto: (montoBaseDistribucion * distribucionConfig.empresa) / 100
    }
  };

  return {
    montoOriginal: montoComision,
    feesPrevios,
    montoBaseDistribucion,
    distribucion,
    snapshot: plantilla.config
  };
}

/**
 * Genera un snapshot de la distribución para guardar en la comisión
 */
export function generarSnapshotComision(
  calculo: CalculoComisionResult,
  plantillaNombre: string
): Record<string, any> {
  return {
    plantilla_nombre: plantillaNombre,
    plantilla_config: calculo.snapshot,
    calculo: {
      monto_original: calculo.montoOriginal,
      fees_previos: calculo.feesPrevios,
      monto_base: calculo.montoBaseDistribucion,
      distribucion: calculo.distribucion
    },
    fecha_snapshot: new Date().toISOString()
  };
}
