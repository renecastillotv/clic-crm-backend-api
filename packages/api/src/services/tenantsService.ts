/**
 * Servicio para gestionar tenants
 */

import { query } from '../utils/db.js';

export interface TenantResponse {
  id: string;
  nombre: string;
  slug: string;
  codigoPais?: string;
  idiomaDefault?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  dominioPersonalizado?: string; // Dominio personalizado (ej: inmobiliariadeltenant.com)
}

/**
 * Obtiene un tenant por su slug
 */
export async function getTenantBySlug(slug: string): Promise<TenantResponse | null> {
  try {
    console.log(`   🔎 SQL: Buscando tenant con slug = "${slug}"`);
    const sql = `
      SELECT 
        id,
        nombre,
        slug,
        codigo_pais as "codigoPais",
        idioma_default as "idiomaDefault",
        activo,
        dominio_personalizado as "dominioPersonalizado",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM tenants
      WHERE slug = $1 AND activo = true
      LIMIT 1
    `;
    
    const result = await query(sql, [slug]);
    console.log(`   📊 Resultados encontrados: ${result.rows.length}`);
    
    if (result.rows.length === 0) {
      // Debug: Buscar todos los tenants para ver qué slugs existen
      const debugSql = `SELECT slug, nombre, activo FROM tenants`;
      const debugResult = await query(debugSql, []);
      console.log(`   🔍 Tenants disponibles en BD:`, debugResult.rows.map((r: any) => ({ slug: r.slug, nombre: r.nombre, activo: r.activo })));
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      nombre: row.nombre,
      slug: row.slug,
      codigoPais: row.codigoPais || undefined,
      idiomaDefault: row.idiomaDefault || undefined,
      activo: row.activo,
      dominioPersonalizado: row.dominioPersonalizado || undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  } catch (error: any) {
    console.error('Error al obtener tenant por slug:', error);
    throw new Error(`Error al obtener tenant por slug: ${error.message}`);
  }
}

/**
 * Obtiene un tenant por su dominio personalizado
 */
export async function getTenantByDomain(domain: string): Promise<TenantResponse | null> {
  try {
    console.log(`   🔎 SQL: Buscando tenant con dominio = "${domain}"`);
    const sql = `
      SELECT 
        id,
        nombre,
        slug,
        codigo_pais as "codigoPais",
        idioma_default as "idiomaDefault",
        activo,
        dominio_personalizado as "dominioPersonalizado",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM tenants
      WHERE dominio_personalizado = $1 AND activo = true
      LIMIT 1
    `;
    
    const result = await query(sql, [domain]);
    console.log(`   📊 Resultados encontrados: ${result.rows.length}`);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      nombre: row.nombre,
      slug: row.slug,
      codigoPais: row.codigoPais || undefined,
      idiomaDefault: row.idiomaDefault || undefined,
      activo: row.activo,
      dominioPersonalizado: row.dominioPersonalizado || undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  } catch (error: any) {
    console.error('Error al obtener tenant por dominio:', error);
    throw new Error(`Error al obtener tenant por dominio: ${error.message}`);
  }
}

/**
 * Detecta el tenant desde un hostname (subdominio o dominio personalizado)
 * 
 * Ejemplos:
 * - demo.dominiosaas.com → busca tenant con slug "demo"
 * - inmobiliariadeltenant.com → busca tenant con dominio_personalizado "inmobiliariadeltenant.com"
 * 
 * @param hostname - Hostname completo (ej: "demo.dominiosaas.com" o "inmobiliariadeltenant.com")
 * @param baseDomain - Dominio base de la plataforma (ej: "dominiosaas.com")
 * @returns Tenant encontrado o null
 */
export async function getTenantByHostname(
  hostname: string,
  baseDomain: string = 'dominiosaas.com'
): Promise<TenantResponse | null> {
  try {
    console.log(`🔍 Detectando tenant desde hostname: "${hostname}" (baseDomain: "${baseDomain}")`);
    
    // Caso 1: Si termina con el dominio base, es un subdominio
    // Ejemplo: demo.dominiosaas.com → subdominio = "demo"
    if (hostname.endsWith(`.${baseDomain}`)) {
      const subdomain = hostname.replace(`.${baseDomain}`, '').toLowerCase();
      console.log(`   📌 Detectado como subdominio: "${subdomain}"`);
      return await getTenantBySlug(subdomain);
    }
    
    // Caso 2: Si es igual al dominio base, no es un tenant específico
    // Ejemplo: dominiosaas.com → no es un tenant
    if (hostname === baseDomain) {
      console.log(`   ⚠️ Hostname es el dominio base, no es un tenant específico`);
      return null;
    }
    
    // Caso 3: Es un dominio personalizado
    // Ejemplo: inmobiliariadeltenant.com → buscar por dominio_personalizado
    console.log(`   📌 Detectado como dominio personalizado: "${hostname}"`);
    return await getTenantByDomain(hostname);
  } catch (error: any) {
    console.error('Error al detectar tenant por hostname:', error);
    throw new Error(`Error al detectar tenant por hostname: ${error.message}`);
  }
}

/**
 * Obtiene un tenant por su ID (para compatibilidad)
 */
export async function getTenantById(tenantId: string): Promise<TenantResponse | null> {
  try {
    const sql = `
      SELECT 
        id,
        nombre,
        slug,
        codigo_pais as "codigoPais",
        idioma_default as "idiomaDefault",
        activo,
        dominio_personalizado as "dominioPersonalizado",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM tenants
      WHERE id = $1 AND activo = true
      LIMIT 1
    `;
    
    const result = await query(sql, [tenantId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      nombre: row.nombre,
      slug: row.slug,
      codigoPais: row.codigoPais || undefined,
      idiomaDefault: row.idiomaDefault || undefined,
      activo: row.activo,
      dominioPersonalizado: row.dominioPersonalizado || undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  } catch (error: any) {
    console.error('Error al obtener tenant por ID:', error);
    throw new Error(`Error al obtener tenant por ID: ${error.message}`);
  }
}

/**
 * Verifica si un identificador es un UUID o un slug
 */
export function isUUID(identifier: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(identifier);
}

/**
 * Obtiene un tenant por ID o slug (auto-detecta)
 */
export async function getTenantByIdOrSlug(identifier: string): Promise<TenantResponse | null> {
  console.log(`🔍 Buscando tenant: "${identifier}"`);
  const isUUIDFormat = isUUID(identifier);
  console.log(`   ¿Es UUID? ${isUUIDFormat}`);
  
  if (isUUIDFormat) {
    console.log(`   Buscando por ID...`);
    const tenant = await getTenantById(identifier);
    if (tenant) {
      console.log(`   ✅ Tenant encontrado por ID: ${tenant.slug}`);
    } else {
      console.log(`   ❌ Tenant no encontrado por ID`);
    }
    return tenant;
  } else {
    console.log(`   Buscando por slug...`);
    const tenant = await getTenantBySlug(identifier);
    if (tenant) {
      console.log(`   ✅ Tenant encontrado por slug: ${tenant.slug} (ID: ${tenant.id})`);
    } else {
      console.log(`   ❌ Tenant no encontrado por slug: "${identifier}"`);
    }
    return tenant;
  }
}

/**
 * Interfaz para configuración de comisiones del tenant
 */
export interface TenantComisionConfig {
  red_global_comision_default: string | null;
  connect_comision_default: string | null;
}

/**
 * Obtiene la configuración de comisiones por defecto de un tenant
 */
export async function getTenantComisionConfig(tenantId: string): Promise<TenantComisionConfig> {
  try {
    const sql = `
      SELECT
        red_global_comision_default,
        connect_comision_default
      FROM tenants
      WHERE id = $1 AND activo = true
      LIMIT 1
    `;

    const result = await query(sql, [tenantId]);

    if (result.rows.length === 0) {
      return {
        red_global_comision_default: null,
        connect_comision_default: null
      };
    }

    const row = result.rows[0];
    return {
      red_global_comision_default: row.red_global_comision_default || null,
      connect_comision_default: row.connect_comision_default || null
    };
  } catch (error: any) {
    console.error('Error al obtener configuración de comisiones del tenant:', error);
    return {
      red_global_comision_default: null,
      connect_comision_default: null
    };
  }
}
