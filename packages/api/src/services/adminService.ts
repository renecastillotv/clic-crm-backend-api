/**
 * Servicio para el panel de administración de la plataforma
 */

import { query } from '../utils/db.js';

export interface AdminStats {
  totalTenants: number;
  activeTenants: number;
  inactiveTenants: number;
  totalUsers: number;
  totalProperties: number;
  recentTenants: Array<{
    id: string;
    nombre: string;
    slug: string;
    activo: boolean;
    createdAt: string;
  }>;
  // Métricas adicionales para Analytics
  platformUsers?: number;
  tenantUsers?: number;
  plansDistribution?: {
    basic: number;
    pro: number;
    premium: number;
  };
}

export interface TenantAdminResponse {
  id: string;
  nombre: string;
  slug: string;
  codigoPais?: string;
  idiomaDefault?: string;
  activo: boolean;
  dominioPersonalizado?: string;
  createdAt: string;
  updatedAt: string;
  // Estadísticas del tenant
  totalUsuarios?: number;
  totalPropiedades?: number;
  totalPaginas?: number;
}

/**
 * Obtiene todas las estadísticas de la plataforma
 */
export async function getAdminStats(): Promise<AdminStats> {
  try {
    // Total de tenants
    const tenantsTotal = await query(
      `SELECT COUNT(*) as count FROM tenants`
    );
    const totalTenants = parseInt(tenantsTotal.rows[0].count);

    // Tenants activos
    const tenantsActivos = await query(
      `SELECT COUNT(*) as count FROM tenants WHERE activo = true`
    );
    const activeTenants = parseInt(tenantsActivos.rows[0].count);
    const inactiveTenants = totalTenants - activeTenants;

    // Total de usuarios (asumiendo que hay una tabla de usuarios)
    // Por ahora retornamos 0 si no existe la tabla
    let totalUsers = 0;
    try {
      const usersResult = await query(`SELECT COUNT(*) as count FROM usuarios`);
      totalUsers = parseInt(usersResult.rows[0].count);
    } catch (error) {
      // Tabla usuarios puede no existir aún
      console.warn('Tabla usuarios no existe aún');
    }

    // Total de propiedades (asumiendo que hay una tabla de propiedades)
    let totalProperties = 0;
    try {
      const propertiesResult = await query(`SELECT COUNT(*) as count FROM propiedades`);
      totalProperties = parseInt(propertiesResult.rows[0].count);
    } catch (error) {
      // Tabla propiedades puede no existir aún
      console.warn('Tabla propiedades no existe aún');
    }

    // Tenants recientes (últimos 5)
    const recentTenantsResult = await query(
      `SELECT id, nombre, slug, activo, created_at as "createdAt"
       FROM tenants
       ORDER BY created_at DESC
       LIMIT 5`
    );

    const recentTenants = recentTenantsResult.rows.map((row: any) => ({
      id: row.id,
      nombre: row.nombre,
      slug: row.slug,
      activo: row.activo,
      createdAt: row.createdAt.toISOString(),
    }));

    // Usuarios platform vs tenant
    let platformUsers = 0;
    let tenantUsers = 0;
    try {
      const platformUsersResult = await query(
        `SELECT COUNT(*) as count FROM usuarios WHERE es_platform_admin = true AND activo = true`
      );
      platformUsers = parseInt(platformUsersResult.rows[0].count);
      
      const tenantUsersResult = await query(
        `SELECT COUNT(DISTINCT usuario_id) as count FROM usuarios_tenants WHERE activo = true`
      );
      tenantUsers = parseInt(tenantUsersResult.rows[0].count);
    } catch (error) {
      // Ignorar si las tablas no existen
    }

    // Distribución por planes (simulado - necesitarías una columna plan en tenants)
    const plansDistribution = {
      basic: 0,
      pro: 0,
      premium: activeTenants, // Por ahora todos los activos son premium
    };

    return {
      totalTenants,
      activeTenants,
      inactiveTenants,
      totalUsers,
      totalProperties,
      recentTenants,
      platformUsers,
      tenantUsers,
      plansDistribution,
    };
  } catch (error: any) {
    console.error('Error al obtener estadísticas de admin:', error);
    throw new Error(`Error al obtener estadísticas: ${error.message}`);
  }
}

/**
 * Obtiene todos los tenants para el panel de administración
 */
export async function getAllTenants(): Promise<TenantAdminResponse[]> {
  try {
    const sql = `
      SELECT 
        t.id,
        t.nombre,
        t.slug,
        t.codigo_pais as "codigoPais",
        t.idioma_default as "idiomaDefault",
        t.activo,
        t.dominio_personalizado as "dominioPersonalizado",
        t.created_at as "createdAt",
        t.updated_at as "updatedAt"
      FROM tenants t
      ORDER BY t.created_at DESC
    `;

    const result = await query(sql, []);

    // Para cada tenant, obtener estadísticas
    const tenantsWithStats = await Promise.all(
      result.rows.map(async (row: any) => {
        const tenantId = row.id;

        // Contar usuarios del tenant (usando la tabla de relación)
        let totalUsuarios = 0;
        try {
          const usersResult = await query(
            `SELECT COUNT(DISTINCT usuario_id) as count FROM usuarios_tenants WHERE tenant_id = $1 AND activo = true`,
            [tenantId]
          );
          totalUsuarios = parseInt(usersResult.rows[0].count);
        } catch (error) {
          // Tabla puede no existir
        }

        // Contar propiedades del tenant
        let totalPropiedades = 0;
        try {
          const propertiesResult = await query(
            `SELECT COUNT(*) as count FROM propiedades WHERE tenant_id = $1`,
            [tenantId]
          );
          totalPropiedades = parseInt(propertiesResult.rows[0].count);
        } catch (error) {
          // Tabla puede no existir
        }

        // Contar páginas del tenant
        let totalPaginas = 0;
        try {
          const paginasResult = await query(
            `SELECT COUNT(*) as count FROM paginas_web WHERE tenant_id = $1`,
            [tenantId]
          );
          totalPaginas = parseInt(paginasResult.rows[0].count);
        } catch (error) {
          // Tabla puede no existir
        }

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
          totalUsuarios,
          totalPropiedades,
          totalPaginas,
        };
      })
    );

    return tenantsWithStats;
  } catch (error: any) {
    console.error('Error al obtener tenants:', error);
    throw new Error(`Error al obtener tenants: ${error.message}`);
  }
}

