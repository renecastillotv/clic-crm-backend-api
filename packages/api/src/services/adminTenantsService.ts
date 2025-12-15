/**
 * Servicio para gestión de tenants en el panel de administración
 */

import { query, getClient } from '../utils/db.js';
import bcrypt from 'bcrypt';
import { createTemaDefault } from './componentesService.js';
import { Feature } from './adminFeaturesService.js';
import type { PoolClient } from 'pg';

// NOTA: Las rutas estándar ahora se definen globalmente en tipos_pagina.alias_rutas
// La tabla tenants_rutas_config fue OBSOLETA y eliminada
// Ver routeResolver.ts -> getRutasConfigTenant() para la arquitectura actual

export interface CreateTenantData {
  nombre: string;
  slug: string;
  codigoPais?: string;
  idiomaDefault?: string;
  idiomasDisponibles?: string[];
  activo?: boolean;
  configuracion?: Record<string, any>;
  plan?: string;
  dominioPersonalizado?: string | null;
}

export interface CreateTenantWithAdminData extends CreateTenantData {
  adminUser: {
    email: string;
    password: string;
    nombre: string;
    apellido: string;
  };
}

export interface UpdateTenantData {
  nombre?: string;
  slug?: string;
  codigoPais?: string;
  idiomaDefault?: string;
  idiomasDisponibles?: string[];
  activo?: boolean;
  configuracion?: Record<string, any>;
}

// OBSOLETA: insertRutasEstandarTenant fue eliminada
// Las rutas estándar ahora se obtienen de tipos_pagina.alias_rutas (global)
// No es necesario insertar rutas por tenant

/**
 * Páginas base que todo tenant debe tener
 * Cada página tiene un tipo específico y una plantilla por defecto
 */
const PAGINAS_BASE = [
  // Homepage - obligatoria
  {
    tipo_pagina: 'homepage',
    titulo: 'Inicio',
    slug: '/',
    plantilla_codigo: 'homepage_default',
    orden: 1,
  },
  // Contacto
  {
    tipo_pagina: 'contacto',
    titulo: 'Contacto',
    slug: 'contacto',
    plantilla_codigo: 'contacto_default',
    orden: 10,
  },
  // Directorios
  {
    tipo_pagina: 'directorio_asesores',
    titulo: 'Nuestros Asesores',
    slug: 'asesores',
    plantilla_codigo: 'directorio_asesores_default',
    orden: 20,
  },
  {
    tipo_pagina: 'directorio_articulos',
    titulo: 'Blog',
    slug: 'blog',
    plantilla_codigo: 'directorio_articulos_default',
    orden: 21,
  },
  {
    tipo_pagina: 'directorio_testimonios',
    titulo: 'Testimonios',
    slug: 'testimonios',
    plantilla_codigo: 'directorio_testimonios_default',
    orden: 22,
  },
  {
    tipo_pagina: 'directorio_videos',
    titulo: 'Videos',
    slug: 'videos',
    plantilla_codigo: 'directorio_videos_default',
    orden: 23,
  },
  // Propiedades
  {
    tipo_pagina: 'propiedades_listado',
    titulo: 'Propiedades',
    slug: 'propiedades',
    plantilla_codigo: 'propiedades_listado_grid',
    orden: 5,
  },
];

/**
 * Inserta las páginas base para un tenant nuevo
 * Usa las plantillas por defecto del catálogo
 */
export async function insertPaginasBaseTenant(
  tenantId: string,
  clientOrNull?: PoolClient | null
): Promise<void> {
  const executeQuery = clientOrNull
    ? (sql: string, params: any[]) => clientOrNull.query(sql, params)
    : (sql: string, params: any[]) => query(sql, params);

  for (const pagina of PAGINAS_BASE) {
    // Verificar si ya existe esta página para el tenant
    const existing = await executeQuery(
      `SELECT id FROM paginas_web WHERE tenant_id = $1 AND slug = $2`,
      [tenantId, pagina.slug]
    );

    if (existing.rows.length === 0) {
      // Buscar la plantilla
      const plantillaResult = await executeQuery(
        `SELECT id, componentes, estilos FROM plantillas_pagina WHERE codigo = $1`,
        [pagina.plantilla_codigo]
      );

      const plantillaId = plantillaResult.rows.length > 0 ? plantillaResult.rows[0].id : null;

      // Insertar la página
      await executeQuery(
        `INSERT INTO paginas_web (
          tenant_id, tipo_pagina, titulo, slug, plantilla_id,
          publica, activa, orden, contenido, meta
        )
        VALUES ($1, $2, $3, $4, $5, true, true, $6, '{}', '{}')`,
        [tenantId, pagina.tipo_pagina, pagina.titulo, pagina.slug, plantillaId, pagina.orden]
      );

      console.log(`  ✓ Página ${pagina.slug} creada (tipo: ${pagina.tipo_pagina})`);
    }
  }

  console.log(`✅ Páginas base insertadas para tenant ${tenantId}`);
}

/**
 * Crea un nuevo tenant
 */
export async function createTenant(data: CreateTenantData) {
  try {
    // Validar que el slug no exista
    const existingTenant = await query(
      `SELECT id FROM tenants WHERE slug = $1`,
      [data.slug]
    );

    if (existingTenant.rows.length > 0) {
      throw new Error(`Ya existe un tenant con el slug "${data.slug}"`);
    }

    // Preparar datos para inserción
    const tenantData: any = {
      nombre: data.nombre,
      slug: data.slug,
      idioma_default: data.idiomaDefault || 'es',
      idiomas_disponibles: JSON.stringify(data.idiomasDisponibles || ['es', 'en']),
      configuracion: JSON.stringify(data.configuracion || {}),
      activo: data.activo !== undefined ? data.activo : true,
      plan: data.plan || 'basic',
      dominio_personalizado: data.dominioPersonalizado || null,
    };

    if (data.codigoPais && data.codigoPais.trim()) {
      // Verificar que el país exista (requerido por foreign key)
      const paisExists = await query(
        `SELECT codigo FROM paises WHERE codigo = $1`,
        [data.codigoPais.trim().toUpperCase()]
      );
      if (paisExists.rows.length === 0) {
        throw new Error(`El código de país "${data.codigoPais}" no existe en la base de datos. Por favor selecciona un país de la lista.`);
      }
      tenantData.codigo_pais = data.codigoPais.trim().toUpperCase();
    }

    // Validar dominio personalizado si se proporciona
    if (data.dominioPersonalizado) {
      const domainExists = await query(
        `SELECT id FROM tenants WHERE dominio_personalizado = $1`,
        [data.dominioPersonalizado]
      );
      if (domainExists.rows.length > 0) {
        throw new Error(`Ya existe un tenant con el dominio "${data.dominioPersonalizado}"`);
      }
    }

    // Insertar tenant
    const insertSql = `
      INSERT INTO tenants (
        nombre, slug, codigo_pais, idioma_default, 
        idiomas_disponibles, configuracion, activo, plan, dominio_personalizado
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING 
        id, nombre, slug, codigo_pais as "codigoPais",
        idioma_default as "idiomaDefault", activo, plan,
        dominio_personalizado as "dominioPersonalizado",
        created_at as "createdAt", updated_at as "updatedAt"
    `;

    const result = await query(insertSql, [
      tenantData.nombre,
      tenantData.slug,
      tenantData.codigo_pais || null,
      tenantData.idioma_default,
      tenantData.idiomas_disponibles,
      tenantData.configuracion,
      tenantData.activo,
      tenantData.plan,
      tenantData.dominio_personalizado,
    ]);

    const tenant = result.rows[0];

    // Crear tema por defecto para el tenant
    await createTemaDefault(tenant.id, tenantData.nombre);

    // NOTA: Las rutas estándar ya no se insertan por tenant
    // Se obtienen de tipos_pagina.alias_rutas (fuente global)

    // Insertar páginas base para el tenant
    await insertPaginasBaseTenant(tenant.id);

    return tenant;
  } catch (error: any) {
    console.error('Error al crear tenant:', error);
    throw new Error(error.message || 'Error al crear tenant');
  }
}

/**
 * Actualiza un tenant existente
 */
export async function updateTenant(tenantId: string, data: UpdateTenantData) {
  try {
    // Verificar que el tenant existe
    const existingTenant = await query(
      `SELECT id FROM tenants WHERE id = $1`,
      [tenantId]
    );

    if (existingTenant.rows.length === 0) {
      throw new Error('Tenant no encontrado');
    }

    // Si se está cambiando el slug, validar que no exista otro con ese slug
    if (data.slug) {
      const slugExists = await query(
        `SELECT id FROM tenants WHERE slug = $1 AND id != $2`,
        [data.slug, tenantId]
      );

      if (slugExists.rows.length > 0) {
        throw new Error(`Ya existe otro tenant con el slug "${data.slug}"`);
      }
    }

    // Construir la query de actualización dinámicamente
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.nombre !== undefined) {
      updates.push(`nombre = $${paramIndex++}`);
      values.push(data.nombre);
    }

    if (data.slug !== undefined) {
      updates.push(`slug = $${paramIndex++}`);
      values.push(data.slug);
    }

    if (data.codigoPais !== undefined) {
      if (data.codigoPais && data.codigoPais.trim()) {
        // Normalizar el código de país (mayúsculas, sin espacios)
        const codigoPaisNormalizado = data.codigoPais.trim().toUpperCase();
        // Verificar que el país exista (requerido por foreign key)
        const paisExists = await query(
          `SELECT codigo FROM paises WHERE codigo = $1`,
          [codigoPaisNormalizado]
        );
        if (paisExists.rows.length === 0) {
          throw new Error(`El código de país "${codigoPaisNormalizado}" no existe en la base de datos. Por favor selecciona un país de la lista.`);
        }
        updates.push(`codigo_pais = $${paramIndex++}`);
        values.push(codigoPaisNormalizado);
      } else {
        updates.push(`codigo_pais = $${paramIndex++}`);
        values.push(null);
      }
    }

    if (data.idiomaDefault !== undefined) {
      updates.push(`idioma_default = $${paramIndex++}`);
      values.push(data.idiomaDefault);
    }

    if (data.idiomasDisponibles !== undefined) {
      updates.push(`idiomas_disponibles = $${paramIndex++}`);
      values.push(JSON.stringify(data.idiomasDisponibles));
    }

    if (data.configuracion !== undefined) {
      updates.push(`configuracion = $${paramIndex++}`);
      values.push(JSON.stringify(data.configuracion));
    }

    if (data.activo !== undefined) {
      updates.push(`activo = $${paramIndex++}`);
      values.push(data.activo);
    }

    if (data.plan !== undefined) {
      updates.push(`plan = $${paramIndex++}`);
      values.push(data.plan);
    }

    if (data.dominioPersonalizado !== undefined) {
      if (data.dominioPersonalizado && data.dominioPersonalizado.trim()) {
        // Verificar que el dominio no esté en uso por otro tenant
        const dominioExists = await query(
          `SELECT id FROM tenants WHERE dominio_personalizado = $1 AND id != $2`,
          [data.dominioPersonalizado.trim(), tenantId]
        );
        if (dominioExists.rows.length > 0) {
          throw new Error(`Ya existe otro tenant con el dominio "${data.dominioPersonalizado}"`);
        }
        updates.push(`dominio_personalizado = $${paramIndex++}`);
        values.push(data.dominioPersonalizado.trim());
      } else {
        updates.push(`dominio_personalizado = $${paramIndex++}`);
        values.push(null);
      }
    }

    // El slug NO se puede actualizar después de crear el tenant
    if (data.slug !== undefined) {
      // Ignorar el slug - no permitir cambios
      console.warn('Intento de actualizar slug ignorado - el slug es inmutable');
    }

    if (updates.length === 0) {
      throw new Error('No hay campos para actualizar');
    }

    // Agregar updated_at
    updates.push(`updated_at = NOW()`);

    // Agregar el tenantId al final para el WHERE
    values.push(tenantId);

    const updateSql = `
      UPDATE tenants 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id, nombre, slug, codigo_pais as "codigoPais",
        idioma_default as "idiomaDefault", activo, plan, dominio_personalizado as "dominioPersonalizado",
        created_at as "createdAt", updated_at as "updatedAt"
    `;

    const result = await query(updateSql, values);

    if (result.rows.length === 0) {
      throw new Error('Error al actualizar tenant');
    }

    return result.rows[0];
  } catch (error: any) {
    console.error('Error al actualizar tenant:', error);
    throw new Error(error.message || 'Error al actualizar tenant');
  }
}

/**
 * Obtiene un tenant por ID
 */
export async function getTenantById(tenantId: string) {
  try {
    const sql = `
      SELECT 
        id, nombre, slug, codigo_pais as "codigoPais",
        idioma_default as "idiomaDefault", 
        idiomas_disponibles as "idiomasDisponibles",
        configuracion, activo, plan, dominio_personalizado as "dominioPersonalizado",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM tenants
      WHERE id = $1
    `;

    const result = await query(sql, [tenantId]);

    if (result.rows.length === 0) {
      throw new Error('Tenant no encontrado');
    }

    const tenant = result.rows[0];
    
    // Parsear JSON fields
    if (typeof tenant.idiomasDisponibles === 'string') {
      tenant.idiomasDisponibles = JSON.parse(tenant.idiomasDisponibles);
    }
    if (typeof tenant.configuracion === 'string') {
      tenant.configuracion = JSON.parse(tenant.configuracion);
    }

    return tenant;
  } catch (error: any) {
    console.error('Error al obtener tenant:', error);
    throw new Error(error.message || 'Error al obtener tenant');
  }
}

/**
 * Crea un nuevo tenant con su usuario administrador en una transacción
 */
export async function createTenantWithAdmin(data: CreateTenantWithAdminData) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // 1. Validar que el slug no exista
    const existingTenant = await client.query(
      `SELECT id FROM tenants WHERE slug = $1`,
      [data.slug]
    );

    if (existingTenant.rows.length > 0) {
      throw new Error(`Ya existe un tenant con el slug "${data.slug}"`);
    }

    // 2. Validar que el email del admin no exista
    const existingUser = await client.query(
      `SELECT id FROM usuarios WHERE email = $1`,
      [data.adminUser.email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error(`Ya existe un usuario con el email "${data.adminUser.email}"`);
    }

    // 3. Validar dominio personalizado si se proporciona
    if (data.dominioPersonalizado) {
      const domainExists = await client.query(
        `SELECT id FROM tenants WHERE dominio_personalizado = $1`,
        [data.dominioPersonalizado]
      );
      if (domainExists.rows.length > 0) {
        throw new Error(`Ya existe un tenant con el dominio "${data.dominioPersonalizado}"`);
      }
    }

    // 4. Validar país si se proporciona
    if (data.codigoPais && data.codigoPais.trim()) {
      const paisExists = await client.query(
        `SELECT codigo FROM paises WHERE codigo = $1`,
        [data.codigoPais.trim().toUpperCase()]
      );
      if (paisExists.rows.length === 0) {
        throw new Error(`El código de país "${data.codigoPais}" no existe`);
      }
    }

    // 5. Crear el tenant
    const tenantInsertSql = `
      INSERT INTO tenants (
        nombre, slug, codigo_pais, idioma_default, 
        idiomas_disponibles, configuracion, activo, plan, dominio_personalizado
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, nombre, slug, plan, dominio_personalizado as "dominioPersonalizado"
    `;

    const tenantResult = await client.query(tenantInsertSql, [
      data.nombre,
      data.slug,
      data.codigoPais?.trim().toUpperCase() || null,
      data.idiomaDefault || 'es',
      JSON.stringify(data.idiomasDisponibles || ['es', 'en']),
      JSON.stringify(data.configuracion || {}),
      data.activo !== undefined ? data.activo : true,
      data.plan || 'basic',
      data.dominioPersonalizado || null,
    ]);

    const tenant = tenantResult.rows[0];

    // 6. Hash de la contraseña del admin
    const passwordHash = await bcrypt.hash(data.adminUser.password, 10);

    // 7. Crear el usuario admin
    const userInsertSql = `
      INSERT INTO usuarios (
        email, password_hash, nombre, apellido, es_platform_admin, activo
      )
      VALUES ($1, $2, $3, $4, false, true)
      RETURNING id, email, nombre, apellido
    `;

    const userResult = await client.query(userInsertSql, [
      data.adminUser.email,
      passwordHash,
      data.adminUser.nombre,
      data.adminUser.apellido,
    ]);

    const adminUser = userResult.rows[0];

    // 8. Obtener el rol "tenant_owner"
    const roleResult = await client.query(
      `SELECT id FROM roles WHERE codigo = 'tenant_owner' AND tipo = 'tenant' LIMIT 1`
    );

    if (roleResult.rows.length === 0) {
      throw new Error('No se encontró el rol tenant_owner');
    }

    const tenantOwnerRoleId = roleResult.rows[0].id;

    // 9. Asociar usuario con tenant como owner (sin rol_id, eso va en usuarios_roles)
    await client.query(
      `INSERT INTO usuarios_tenants (usuario_id, tenant_id, es_owner, activo)
       VALUES ($1, $2, true, true)`,
      [adminUser.id, tenant.id]
    );

    // 10. Asignar rol al usuario en la tabla usuarios_roles
    await client.query(
      `INSERT INTO usuarios_roles (usuario_id, tenant_id, rol_id, activo, asignado_en)
       VALUES ($1, $2, $3, true, NOW())`,
      [adminUser.id, tenant.id, tenantOwnerRoleId]
    );

    // 11. Crear tema por defecto
    const temaColores = JSON.stringify({
      primary: '#667eea',
      secondary: '#764ba2',
      accent: '#f56565',
      background: '#ffffff',
      text: '#1a202c',
      textSecondary: '#718096',
      border: '#e2e8f0',
      success: '#48bb78',
      warning: '#ed8936',
      error: '#f56565',
    });

    await client.query(
      `INSERT INTO temas_tenant (tenant_id, nombre, colores, activo)
       VALUES ($1, $2, $3, true)`,
      [tenant.id, `Tema ${data.nombre}`, temaColores]
    );

    // 12. Las rutas estándar ya no se insertan por tenant
    // Se obtienen de tipos_pagina.alias_rutas (fuente global)

    // 13. Insertar páginas base para el tenant
    await insertPaginasBaseTenant(tenant.id, client);

    await client.query('COMMIT');

    return {
      tenant: {
        id: tenant.id,
        nombre: tenant.nombre,
        slug: tenant.slug,
        plan: tenant.plan,
        dominioPersonalizado: tenant.dominioPersonalizado,
      },
      adminUser: {
        id: adminUser.id,
        email: adminUser.email,
        nombre: adminUser.nombre,
        apellido: adminUser.apellido,
      },
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error al crear tenant con admin:', error);
    throw new Error(error.message || 'Error al crear tenant con usuario administrador');
  } finally {
    client.release();
  }
}

/**
 * Obtiene los features habilitados para un tenant
 * Incluye features del plan y features manualmente habilitados
 */
export async function getTenantFeatures(tenantId: string): Promise<Feature[]> {
  try {
    // Primero obtener el plan del tenant
    const tenantResult = await query(
      `SELECT plan FROM tenants WHERE id = $1`,
      [tenantId]
    );
    
    if (tenantResult.rows.length === 0) {
      throw new Error('Tenant no encontrado');
    }
    
    const plan = tenantResult.rows[0].plan || 'basic';
    
    // Obtener features disponibles para el plan o features manualmente habilitados
    const sql = `
      SELECT DISTINCT
        f.id,
        f.name,
        f.description,
        f.icon,
        f.category,
        f.is_public as "isPublic",
        f.is_premium as "isPremium",
        f.available_in_plans as "availableInPlans",
        f.created_at as "createdAt",
        f.updated_at as "updatedAt",
        CASE WHEN tf.id IS NOT NULL THEN true ELSE false END as "enabled"
      FROM features f
      LEFT JOIN tenants_features tf ON f.id = tf.feature_id AND tf.tenant_id = $1
      WHERE 
        f.is_public = true 
        OR $2 = ANY(f.available_in_plans::text[])
        OR tf.id IS NOT NULL
      ORDER BY f.name ASC
    `;
    
    const result = await query(sql, [tenantId, plan]);
    return result.rows;
  } catch (error: any) {
    console.error('Error al obtener features del tenant:', error);
    throw new Error(`Error al obtener features del tenant: ${error.message}`);
  }
}

/**
 * Obtiene todos los features disponibles con información de si están habilitados para el tenant
 */
export async function getAllFeaturesWithTenantStatus(tenantId: string): Promise<(Feature & { enabled: boolean })[]> {
  try {
    const sql = `
      SELECT
        f.id,
        f.name,
        f.description,
        f.icon,
        f.category,
        f.is_public as "isPublic",
        f.is_premium as "isPremium",
        f.available_in_plans as "availableInPlans",
        f.created_at as "createdAt",
        f.updated_at as "updatedAt",
        CASE
          WHEN tf.id IS NOT NULL THEN true
          WHEN t.plan = ANY(
            SELECT jsonb_array_elements_text(f.available_in_plans)::text
          ) THEN true
          ELSE false
        END as enabled
      FROM features f
      LEFT JOIN tenants t ON t.id = $1
      LEFT JOIN tenants_features tf ON f.id = tf.feature_id AND tf.tenant_id = $1
      ORDER BY f.name ASC
    `;

    const result = await query(sql, [tenantId]);
    return result.rows;
  } catch (error: any) {
    console.error('Error al obtener features con estado del tenant:', error);
    throw new Error(`Error al obtener features: ${error.message}`);
  }
}

/**
 * Habilita un feature para un tenant
 */
export async function enableFeatureForTenant(tenantId: string, featureId: string): Promise<void> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    
    // Verificar que el tenant existe
    const tenantExists = await client.query('SELECT id FROM tenants WHERE id = $1', [tenantId]);
    if (tenantExists.rows.length === 0) {
      throw new Error('Tenant no encontrado');
    }
    
    // Verificar que el feature existe
    const featureExists = await client.query('SELECT id FROM features WHERE id = $1', [featureId]);
    if (featureExists.rows.length === 0) {
      throw new Error('Feature no encontrado');
    }
    
    // Verificar si ya está habilitado
    const alreadyEnabled = await client.query(
      'SELECT id FROM tenants_features WHERE tenant_id = $1 AND feature_id = $2',
      [tenantId, featureId]
    );
    
    if (alreadyEnabled.rows.length > 0) {
      // Ya está habilitado, no hacer nada
      await client.query('COMMIT');
      return;
    }
    
    // Habilitar el feature
    await client.query(
      'INSERT INTO tenants_features (tenant_id, feature_id) VALUES ($1, $2)',
      [tenantId, featureId]
    );
    
    await client.query('COMMIT');
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error al habilitar feature para tenant:', error);
    throw new Error(`Error al habilitar feature: ${error.message}`);
  } finally {
    client.release();
  }
}

/**
 * Deshabilita un feature para un tenant
 */
export async function disableFeatureForTenant(tenantId: string, featureId: string): Promise<void> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    
    // Eliminar la relación
    await client.query(
      'DELETE FROM tenants_features WHERE tenant_id = $1 AND feature_id = $2',
      [tenantId, featureId]
    );
    
    await client.query('COMMIT');
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error al deshabilitar feature para tenant:', error);
    throw new Error(`Error al deshabilitar feature: ${error.message}`);
  } finally {
    client.release();
  }
}

/**
 * Activa o desactiva un tenant
 */
export async function toggleTenantStatus(tenantId: string, activo: boolean): Promise<void> {
  try {
    const result = await query(
      `UPDATE tenants SET activo = $1, updated_at = NOW() WHERE id = $2 RETURNING id`,
      [activo, tenantId]
    );

    if (result.rows.length === 0) {
      throw new Error('Tenant no encontrado');
    }
  } catch (error: any) {
    console.error('Error al cambiar estado del tenant:', error);
    throw new Error(error.message || 'Error al cambiar estado del tenant');
  }
}

/**
 * Elimina un tenant (soft delete - marca como inactivo)
 */
export async function deleteTenant(tenantId: string): Promise<void> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Marcar tenant como inactivo en lugar de eliminar físicamente
    await client.query(
      `UPDATE tenants SET activo = false, updated_at = NOW() WHERE id = $1`,
      [tenantId]
    );

    // También desactivar todas las relaciones del tenant
    await client.query(
      `UPDATE usuarios_tenants SET activo = false WHERE tenant_id = $1`,
      [tenantId]
    );

    await client.query('COMMIT');
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar tenant:', error);
    throw new Error(error.message || 'Error al eliminar tenant');
  } finally {
    client.release();
  }
}

