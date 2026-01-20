/**
 * Servicio para gestionar catálogos de propiedades
 * - Amenidades
 * - Operaciones (venta, alquiler, etc.)
 * - Categorías de propiedades (apartamento, casa, etc.)
 */

import { query } from '../utils/db.js';

// ============================================
// INTERFACES
// ============================================

export interface Amenidad {
  id: string;
  codigo: string;
  nombre: string;
  icono: string | null;
  categoria: string | null;
  traducciones: Record<string, any>;
  activo: boolean;
  orden: number;
  tenant_id?: string | null;
  origen?: 'sistema' | 'tenant';
}

export interface Operacion {
  id: string;
  slug: string;
  nombre: string;
  icono: string | null;
  color: string | null;
  descripcion: string | null;
  traducciones: Record<string, any>;
  slugTraducciones: Record<string, string>;
  activo: boolean;
  orden: number;
}

export interface CategoriaPropiedad {
  id: string;
  slug: string;
  nombre: string;
  icono: string | null;
  color: string | null;
  descripcion: string | null;
  traducciones: Record<string, any>;
  slugTraducciones: Record<string, string>;
  activo: boolean;
  orden: number;
}

// ============================================
// AMENIDADES
// ============================================

/**
 * Obtiene todas las amenidades activas
 * Si se pasa tenantId, incluye amenidades globales (tenant_id IS NULL) + las del tenant
 */
export async function getAmenidades(soloActivas = true, tenantId?: string): Promise<Amenidad[]> {
  try {
    let whereClause = '';
    const params: any[] = [];

    if (tenantId) {
      // Amenidades globales (sistema) + amenidades del tenant específico
      whereClause = 'WHERE (tenant_id IS NULL OR tenant_id = $1)';
      params.push(tenantId);
      if (soloActivas) {
        whereClause += ' AND activo = true';
      }
    } else {
      // Solo amenidades globales (para compatibilidad)
      whereClause = soloActivas ? 'WHERE activo = true AND tenant_id IS NULL' : 'WHERE tenant_id IS NULL';
    }

    const sql = `
      SELECT
        id,
        codigo,
        nombre,
        icono,
        categoria,
        traducciones,
        activo,
        orden,
        tenant_id,
        CASE WHEN tenant_id IS NULL THEN 'sistema' ELSE 'tenant' END as origen
      FROM amenidades
      ${whereClause}
      ORDER BY categoria, orden, nombre
    `;

    const result = await query(sql, params);
    return result.rows.map((row: any) => ({
      id: row.id,
      codigo: row.codigo,
      nombre: row.nombre,
      icono: row.icono,
      categoria: row.categoria,
      traducciones: row.traducciones || {},
      activo: row.activo,
      orden: row.orden,
      tenant_id: row.tenant_id,
      origen: row.origen
    }));
  } catch (error: any) {
    console.error('Error al obtener amenidades:', error);
    throw new Error(`Error al obtener amenidades: ${error.message}`);
  }
}

/**
 * Obtiene amenidades agrupadas por categoría
 * Si se pasa tenantId, incluye amenidades globales + las del tenant
 */
export async function getAmenidadesPorCategoria(soloActivas = true, tenantId?: string): Promise<Record<string, Amenidad[]>> {
  const amenidades = await getAmenidades(soloActivas, tenantId);

  return amenidades.reduce((acc, amenidad) => {
    const categoria = amenidad.categoria || 'otros';
    if (!acc[categoria]) {
      acc[categoria] = [];
    }
    acc[categoria].push(amenidad);
    return acc;
  }, {} as Record<string, Amenidad[]>);
}

/**
 * Obtiene las categorías únicas de amenidades
 */
export async function getCategoriasAmenidades(): Promise<string[]> {
  try {
    const sql = `
      SELECT DISTINCT categoria
      FROM amenidades
      WHERE categoria IS NOT NULL
      ORDER BY categoria
    `;
    const result = await query(sql);
    return result.rows.map((row: any) => row.categoria);
  } catch (error: any) {
    console.error('Error al obtener categorías de amenidades:', error);
    throw new Error(`Error al obtener categorías de amenidades: ${error.message}`);
  }
}

/**
 * Crea una nueva amenidad para un tenant específico
 * Por defecto se crea como inactiva (pendiente de aprobación)
 */
export async function createAmenidadTenant(
  tenantId: string,
  data: {
    nombre: string;
    icono?: string;
    categoria?: string;
    traducciones?: Record<string, string>;
  }
): Promise<Amenidad> {
  try {
    // Generar código único basado en el nombre
    const codigo = `custom_${data.nombre.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}_${Date.now().toString(36)}`;

    const sql = `
      INSERT INTO amenidades (id, tenant_id, codigo, nombre, icono, categoria, traducciones, activo, orden, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, false, 999, NOW(), NOW())
      RETURNING id, codigo, nombre, icono, categoria, traducciones, activo, orden, tenant_id
    `;

    const result = await query(sql, [
      tenantId,
      codigo,
      data.nombre,
      data.icono || null,
      data.categoria || 'personalizadas',
      data.traducciones ? JSON.stringify(data.traducciones) : null
    ]);

    const row = result.rows[0];
    return {
      id: row.id,
      codigo: row.codigo,
      nombre: row.nombre,
      icono: row.icono,
      categoria: row.categoria,
      traducciones: row.traducciones || {},
      activo: row.activo,
      orden: row.orden,
      tenant_id: row.tenant_id,
      origen: 'tenant'
    };
  } catch (error: any) {
    console.error('Error al crear amenidad:', error);
    throw new Error(`Error al crear amenidad: ${error.message}`);
  }
}

/**
 * Obtiene todas las amenidades de un tenant (incluyendo inactivas) para administración
 */
export async function getAmenidadesTenant(tenantId: string): Promise<Amenidad[]> {
  try {
    const sql = `
      SELECT
        id,
        codigo,
        nombre,
        icono,
        categoria,
        traducciones,
        activo,
        orden,
        tenant_id,
        created_at,
        updated_at
      FROM amenidades
      WHERE tenant_id = $1
      ORDER BY activo DESC, categoria, orden, nombre
    `;

    const result = await query(sql, [tenantId]);
    return result.rows.map((row: any) => ({
      id: row.id,
      codigo: row.codigo,
      nombre: row.nombre,
      icono: row.icono,
      categoria: row.categoria,
      traducciones: row.traducciones || {},
      activo: row.activo,
      orden: row.orden,
      tenant_id: row.tenant_id,
      origen: 'tenant' as const,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
  } catch (error: any) {
    console.error('Error al obtener amenidades del tenant:', error);
    throw new Error(`Error al obtener amenidades del tenant: ${error.message}`);
  }
}

/**
 * Actualiza una amenidad de un tenant
 */
export async function updateAmenidadTenant(
  tenantId: string,
  amenidadId: string,
  data: {
    nombre?: string;
    icono?: string;
    categoria?: string;
    traducciones?: Record<string, string>;
    activo?: boolean;
  }
): Promise<Amenidad | null> {
  try {
    // Construir SET dinámico solo con campos proporcionados
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.nombre !== undefined) {
      updates.push(`nombre = $${paramIndex++}`);
      values.push(data.nombre);
    }
    if (data.icono !== undefined) {
      updates.push(`icono = $${paramIndex++}`);
      values.push(data.icono);
    }
    if (data.categoria !== undefined) {
      updates.push(`categoria = $${paramIndex++}`);
      values.push(data.categoria);
    }
    if (data.traducciones !== undefined) {
      updates.push(`traducciones = $${paramIndex++}`);
      values.push(JSON.stringify(data.traducciones));
    }
    if (data.activo !== undefined) {
      updates.push(`activo = $${paramIndex++}`);
      values.push(data.activo);
    }

    if (updates.length === 0) {
      throw new Error('No hay campos para actualizar');
    }

    updates.push(`updated_at = NOW()`);

    // Agregar tenant_id y amenidad_id al final
    values.push(tenantId);
    values.push(amenidadId);

    const sql = `
      UPDATE amenidades
      SET ${updates.join(', ')}
      WHERE tenant_id = $${paramIndex++} AND id = $${paramIndex}
      RETURNING id, codigo, nombre, icono, categoria, traducciones, activo, orden, tenant_id
    `;

    const result = await query(sql, values);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      codigo: row.codigo,
      nombre: row.nombre,
      icono: row.icono,
      categoria: row.categoria,
      traducciones: row.traducciones || {},
      activo: row.activo,
      orden: row.orden,
      tenant_id: row.tenant_id,
      origen: 'tenant'
    };
  } catch (error: any) {
    console.error('Error al actualizar amenidad:', error);
    throw new Error(`Error al actualizar amenidad: ${error.message}`);
  }
}

/**
 * Elimina una amenidad de un tenant
 */
export async function deleteAmenidadTenant(tenantId: string, amenidadId: string): Promise<boolean> {
  try {
    const sql = `
      DELETE FROM amenidades
      WHERE tenant_id = $1 AND id = $2
    `;

    const result = await query(sql, [tenantId, amenidadId]);
    return (result.rowCount ?? 0) > 0;
  } catch (error: any) {
    console.error('Error al eliminar amenidad:', error);
    throw new Error(`Error al eliminar amenidad: ${error.message}`);
  }
}

/**
 * Obtiene una amenidad por código
 */
export async function getAmenidadByCodigo(codigo: string): Promise<Amenidad | null> {
  try {
    const sql = `
      SELECT id, codigo, nombre, icono, categoria, traducciones, activo, orden
      FROM amenidades
      WHERE codigo = $1
    `;
    const result = await query(sql, [codigo]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      codigo: row.codigo,
      nombre: row.nombre,
      icono: row.icono,
      categoria: row.categoria,
      traducciones: row.traducciones || {},
      activo: row.activo,
      orden: row.orden
    };
  } catch (error: any) {
    console.error('Error al obtener amenidad:', error);
    throw new Error(`Error al obtener amenidad: ${error.message}`);
  }
}

// ============================================
// OPERACIONES
// ============================================

/**
 * Obtiene todas las operaciones (venta, alquiler, etc.)
 */
export async function getOperaciones(soloActivas = true): Promise<Operacion[]> {
  try {
    const whereClause = soloActivas ? 'WHERE activo = true' : '';
    const sql = `
      SELECT
        id,
        slug,
        nombre,
        icono,
        color,
        descripcion,
        traducciones,
        slug_traducciones as "slugTraducciones",
        activo,
        orden
      FROM operaciones
      ${whereClause}
      ORDER BY orden, nombre
    `;

    const result = await query(sql, []);
    return result.rows.map((row: any) => ({
      id: row.id,
      slug: row.slug,
      nombre: row.nombre,
      icono: row.icono,
      color: row.color,
      descripcion: row.descripcion,
      traducciones: row.traducciones || {},
      slugTraducciones: row.slugTraducciones || {},
      activo: row.activo,
      orden: row.orden
    }));
  } catch (error: any) {
    console.error('Error al obtener operaciones:', error);
    throw new Error(`Error al obtener operaciones: ${error.message}`);
  }
}

/**
 * Obtiene una operación por slug
 */
export async function getOperacionBySlug(slug: string): Promise<Operacion | null> {
  try {
    const sql = `
      SELECT
        id, slug, nombre, icono, color, descripcion,
        traducciones, slug_traducciones as "slugTraducciones",
        activo, orden
      FROM operaciones
      WHERE slug = $1
    `;
    const result = await query(sql, [slug]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      slug: row.slug,
      nombre: row.nombre,
      icono: row.icono,
      color: row.color,
      descripcion: row.descripcion,
      traducciones: row.traducciones || {},
      slugTraducciones: row.slugTraducciones || {},
      activo: row.activo,
      orden: row.orden
    };
  } catch (error: any) {
    console.error('Error al obtener operación:', error);
    throw new Error(`Error al obtener operación: ${error.message}`);
  }
}

/**
 * Busca operación por slug traducido
 */
export async function getOperacionBySlugTraducido(slugTraducido: string, idioma: string): Promise<Operacion | null> {
  try {
    const sql = `
      SELECT
        id, slug, nombre, icono, color, descripcion,
        traducciones, slug_traducciones as "slugTraducciones",
        activo, orden
      FROM operaciones
      WHERE slug_traducciones->>$1 = $2
    `;
    const result = await query(sql, [idioma, slugTraducido]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      slug: row.slug,
      nombre: row.nombre,
      icono: row.icono,
      color: row.color,
      descripcion: row.descripcion,
      traducciones: row.traducciones || {},
      slugTraducciones: row.slugTraducciones || {},
      activo: row.activo,
      orden: row.orden
    };
  } catch (error: any) {
    console.error('Error al buscar operación por slug traducido:', error);
    throw new Error(`Error al buscar operación: ${error.message}`);
  }
}

// ============================================
// CATEGORÍAS DE PROPIEDADES
// ============================================

/**
 * Obtiene todas las categorías de propiedades
 */
export async function getCategoriasPropiedades(soloActivas = true): Promise<CategoriaPropiedad[]> {
  try {
    const whereClause = soloActivas ? 'WHERE activo = true' : '';
    const sql = `
      SELECT
        id,
        slug,
        nombre,
        icono,
        color,
        descripcion,
        traducciones,
        slug_traducciones as "slugTraducciones",
        activo,
        orden
      FROM categorias_propiedades
      ${whereClause}
      ORDER BY orden, nombre
    `;

    const result = await query(sql, []);
    return result.rows.map((row: any) => ({
      id: row.id,
      slug: row.slug,
      nombre: row.nombre,
      icono: row.icono,
      color: row.color,
      descripcion: row.descripcion,
      traducciones: row.traducciones || {},
      slugTraducciones: row.slugTraducciones || {},
      activo: row.activo,
      orden: row.orden
    }));
  } catch (error: any) {
    console.error('Error al obtener categorías de propiedades:', error);
    throw new Error(`Error al obtener categorías: ${error.message}`);
  }
}

/**
 * Obtiene una categoría por slug
 */
export async function getCategoriaBySlug(slug: string): Promise<CategoriaPropiedad | null> {
  try {
    const sql = `
      SELECT
        id, slug, nombre, icono, color, descripcion,
        traducciones, slug_traducciones as "slugTraducciones",
        activo, orden
      FROM categorias_propiedades
      WHERE slug = $1
    `;
    const result = await query(sql, [slug]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      slug: row.slug,
      nombre: row.nombre,
      icono: row.icono,
      color: row.color,
      descripcion: row.descripcion,
      traducciones: row.traducciones || {},
      slugTraducciones: row.slugTraducciones || {},
      activo: row.activo,
      orden: row.orden
    };
  } catch (error: any) {
    console.error('Error al obtener categoría:', error);
    throw new Error(`Error al obtener categoría: ${error.message}`);
  }
}

/**
 * Busca categoría por slug traducido
 */
export async function getCategoriaBySlugTraducido(slugTraducido: string, idioma: string): Promise<CategoriaPropiedad | null> {
  try {
    const sql = `
      SELECT
        id, slug, nombre, icono, color, descripcion,
        traducciones, slug_traducciones as "slugTraducciones",
        activo, orden
      FROM categorias_propiedades
      WHERE slug_traducciones->>$1 = $2
    `;
    const result = await query(sql, [idioma, slugTraducido]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      slug: row.slug,
      nombre: row.nombre,
      icono: row.icono,
      color: row.color,
      descripcion: row.descripcion,
      traducciones: row.traducciones || {},
      slugTraducciones: row.slugTraducciones || {},
      activo: row.activo,
      orden: row.orden
    };
  } catch (error: any) {
    console.error('Error al buscar categoría por slug traducido:', error);
    throw new Error(`Error al buscar categoría: ${error.message}`);
  }
}

// ============================================
// MONEDAS
// ============================================

export interface Moneda {
  codigo: string;
  nombre: string;
  nombreEn: string | null;
  simbolo: string;
  tasaUsd: number;
  decimales: number;
  formato: string;
  orden: number;
  activo: boolean;
  esDefault?: boolean;
}

export interface TenantMoneda {
  id: string;
  tenantId: string;
  monedaCodigo: string;
  esDefault: boolean;
  orden: number;
  activo: boolean;
  moneda?: Moneda;
}

/**
 * Obtiene todas las monedas del catálogo
 */
export async function getMonedas(soloActivas = true): Promise<Moneda[]> {
  try {
    const whereClause = soloActivas ? 'WHERE activo = true' : '';
    const sql = `
      SELECT
        codigo,
        nombre,
        nombre_en as "nombreEn",
        simbolo,
        tasa_usd as "tasaUsd",
        decimales,
        formato,
        orden,
        activo
      FROM cat_monedas
      ${whereClause}
      ORDER BY orden, nombre
    `;

    const result = await query(sql, []);
    return result.rows;
  } catch (error: any) {
    console.error('Error al obtener monedas:', error);
    throw new Error(`Error al obtener monedas: ${error.message}`);
  }
}

/**
 * Obtiene una moneda por código
 */
export async function getMonedaByCodigo(codigo: string): Promise<Moneda | null> {
  try {
    const sql = `
      SELECT
        codigo,
        nombre,
        nombre_en as "nombreEn",
        simbolo,
        tasa_usd as "tasaUsd",
        decimales,
        formato,
        orden,
        activo
      FROM cat_monedas
      WHERE codigo = $1
    `;
    const result = await query(sql, [codigo]);
    if (result.rows.length === 0) return null;
    return result.rows[0];
  } catch (error: any) {
    console.error('Error al obtener moneda:', error);
    throw new Error(`Error al obtener moneda: ${error.message}`);
  }
}

/**
 * Obtiene las monedas habilitadas para un tenant
 * Si no tiene monedas configuradas, devuelve solo USD por defecto
 * Las monedas habilitadas se guardan en tenants.monedas_habilitadas como JSON:
 * [{ codigo: "USD", esDefault: true }, { codigo: "DOP" }]
 */
export async function getTenantMonedas(tenantId: string): Promise<Moneda[]> {
  try {
    // Obtener las monedas habilitadas del tenant
    const tenantSql = `SELECT monedas_habilitadas FROM tenants WHERE id = $1`;
    const tenantResult = await query(tenantSql, [tenantId]);

    if (tenantResult.rows.length === 0) {
      // Tenant no encontrado, devolver solo USD
      const usd = await getMonedaByCodigo('USD');
      return usd ? [{ ...usd, esDefault: true }] : [];
    }

    const monedasHabilitadas = tenantResult.rows[0].monedas_habilitadas;

    // Si no tiene monedas configuradas, devolver solo USD por defecto
    if (!monedasHabilitadas || !Array.isArray(monedasHabilitadas) || monedasHabilitadas.length === 0) {
      const usd = await getMonedaByCodigo('USD');
      return usd ? [{ ...usd, esDefault: true }] : [];
    }

    // Obtener los códigos habilitados
    const codigosHabilitados = monedasHabilitadas.map((m: any) => m.codigo);
    const placeholders = codigosHabilitados.map((_: any, i: number) => `$${i + 1}`).join(', ');

    // Obtener las monedas del catálogo que están habilitadas
    const sql = `
      SELECT
        codigo,
        nombre,
        nombre_en as "nombreEn",
        simbolo,
        tasa_usd as "tasaUsd",
        decimales,
        formato,
        orden,
        activo
      FROM cat_monedas
      WHERE codigo IN (${placeholders}) AND activo = true
      ORDER BY orden, nombre
    `;

    const result = await query(sql, codigosHabilitados);

    // Agregar el campo esDefault de la configuración del tenant
    return result.rows.map((moneda: any) => {
      const config = monedasHabilitadas.find((m: any) => m.codigo === moneda.codigo);
      return {
        ...moneda,
        esDefault: config?.esDefault || false
      };
    }).sort((a: any, b: any) => {
      // Ordenar por esDefault primero, luego por orden del catálogo
      if (a.esDefault && !b.esDefault) return -1;
      if (!a.esDefault && b.esDefault) return 1;
      return a.orden - b.orden;
    });
  } catch (error: any) {
    console.error('Error al obtener monedas del tenant:', error);
    throw new Error(`Error al obtener monedas del tenant: ${error.message}`);
  }
}

/**
 * Configura las monedas habilitadas para un tenant
 * Guarda en el campo JSON monedas_habilitadas
 */
export async function setTenantMonedas(
  tenantId: string,
  monedas: Array<{ codigo: string; esDefault?: boolean; orden?: number }>
): Promise<void> {
  try {
    const monedasJson = JSON.stringify(monedas);
    await query(
      `UPDATE tenants SET monedas_habilitadas = $1::jsonb, updated_at = NOW() WHERE id = $2`,
      [monedasJson, tenantId]
    );
  } catch (error: any) {
    console.error('Error al configurar monedas del tenant:', error);
    throw new Error(`Error al configurar monedas: ${error.message}`);
  }
}

/**
 * Convierte un monto de una moneda a otra usando USD como base
 * @param monto - Monto a convertir
 * @param monedaOrigen - Código de la moneda origen
 * @param monedaDestino - Código de la moneda destino
 * @returns Monto convertido
 */
export async function convertirMoneda(
  monto: number,
  monedaOrigen: string,
  monedaDestino: string
): Promise<number> {
  try {
    if (monedaOrigen === monedaDestino) return monto;

    const [origen, destino] = await Promise.all([
      getMonedaByCodigo(monedaOrigen),
      getMonedaByCodigo(monedaDestino)
    ]);

    if (!origen || !destino) {
      throw new Error(`Moneda no encontrada: ${!origen ? monedaOrigen : monedaDestino}`);
    }

    // Convertir origen a USD, luego USD a destino
    // Si tasaUsd = 58.50 para DOP, significa 1 USD = 58.50 DOP
    // Entonces: monto_en_usd = monto_dop / 58.50
    // monto_destino = monto_en_usd * tasa_destino
    const montoEnUsd = monto / origen.tasaUsd;
    const montoDestino = montoEnUsd * destino.tasaUsd;

    return Number(montoDestino.toFixed(destino.decimales));
  } catch (error: any) {
    console.error('Error al convertir moneda:', error);
    throw new Error(`Error al convertir moneda: ${error.message}`);
  }
}

// ============================================
// HELPERS PARA TRADUCCIONES
// ============================================

/**
 * Obtiene el nombre traducido de una operación
 */
export function getNombreOperacionTraducido(operacion: Operacion, idioma: string): string {
  if (idioma === 'es') return operacion.nombre;
  return operacion.traducciones?.[idioma]?.nombre || operacion.nombre;
}

/**
 * Obtiene el nombre traducido de una categoría
 */
export function getNombreCategoriaTraducido(categoria: CategoriaPropiedad, idioma: string): string {
  if (idioma === 'es') return categoria.nombre;
  return categoria.traducciones?.[idioma]?.nombre || categoria.nombre;
}

/**
 * Obtiene el nombre traducido de una amenidad
 */
export function getNombreAmenidadTraducido(amenidad: Amenidad, idioma: string): string {
  if (idioma === 'es') return amenidad.nombre;
  return amenidad.traducciones?.[idioma]?.nombre || amenidad.nombre;
}
