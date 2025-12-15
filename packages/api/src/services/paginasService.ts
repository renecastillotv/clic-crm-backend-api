/**
 * Servicio para gestionar páginas web
 */

import { query } from '../utils/db.js';
import { getComponentesByTenant, getTemaByTenant } from './componentesService.js';
import type { ComponenteWebResponse } from './componentesService.js';
import { resolveDynamicData } from './dynamicDataResolver.js';
import { getSeccionesResueltas } from './seccionesService.js';

export interface PaginaWebResponse {
  id: string;
  tenantId: string;
  tipoPagina: string;
  titulo: string;
  slug: string;
  descripcion?: string;
  contenido: Record<string, any>;
  meta: Record<string, any>;
  publica: boolean;
  activa: boolean;
  orden: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Obtiene todas las páginas de un tenant
 */
export async function getPaginasByTenant(tenantId: string): Promise<PaginaWebResponse[]> {
  try {
    const sql = `
      SELECT 
        id,
        tenant_id as "tenantId",
        tipo_pagina as "tipoPagina",
        titulo,
        slug,
        descripcion,
        contenido,
        meta,
        publica,
        activa,
        orden,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM paginas_web
      WHERE tenant_id = $1
      ORDER BY orden ASC, created_at ASC
    `;
    
    const result = await query(sql, [tenantId]);
    
    return result.rows.map((row: any) => ({
      id: row.id,
      tenantId: row.tenantId,
      tipoPagina: row.tipoPagina,
      titulo: row.titulo,
      slug: row.slug,
      descripcion: row.descripcion || undefined,
      contenido: typeof row.contenido === 'string' ? JSON.parse(row.contenido) : row.contenido,
      meta: typeof row.meta === 'string' ? JSON.parse(row.meta) : row.meta,
      publica: row.publica,
      activa: row.activa,
      orden: row.orden,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  } catch (error: any) {
    console.error('Error al obtener páginas:', error);
    throw new Error(`Error al obtener páginas: ${error.message}`);
  }
}

/**
 * Crea o actualiza una página
 */
// Función helper para validar UUID
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function savePagina(
  tenantId: string,
  pagina: {
    id?: string;
    tipoPagina: string;
    titulo: string;
    slug: string;
    descripcion?: string;
    contenido?: Record<string, any>;
    meta?: Record<string, any>;
    publica?: boolean;
    activa?: boolean;
    orden?: number;
  }
): Promise<PaginaWebResponse> {
  try {
    const contenidoJson = JSON.stringify(pagina.contenido || {});
    const metaJson = JSON.stringify(pagina.meta || {});
    const publica = pagina.publica !== undefined ? pagina.publica : true;
    const activa = pagina.activa !== undefined ? pagina.activa : true;
    const orden = pagina.orden !== undefined ? pagina.orden : 0;

    // Validar que si viene un ID, sea un UUID válido
    // Si no es válido, tratarlo como página nueva (no incluir ID)
    const tieneIdValido = pagina.id && isValidUUID(pagina.id);
    const paginaId = tieneIdValido ? pagina.id : undefined;

    if (paginaId) {
      // Actualizar página existente
      const sql = `
        UPDATE paginas_web
        SET 
          tipo_pagina = $1,
          titulo = $2,
          slug = $3,
          descripcion = $4,
          contenido = $5,
          meta = $6,
          publica = $7,
          activa = $8,
          orden = $9,
          updated_at = NOW()
        WHERE id = $10 AND tenant_id = $11
        RETURNING 
          id,
          tenant_id as "tenantId",
          tipo_pagina as "tipoPagina",
          titulo,
          slug,
          descripcion,
          contenido,
          meta,
          publica,
          activa,
          orden,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const result = await query(sql, [
        pagina.tipoPagina,
        pagina.titulo,
        pagina.slug,
        pagina.descripcion || null,
        contenidoJson,
        metaJson,
        publica,
        activa,
        orden,
        paginaId,
        tenantId,
      ]);

      if (result.rows.length === 0) {
        throw new Error('Página no encontrada o no pertenece al tenant');
      }

      const row = result.rows[0];
      return {
        id: row.id,
        tenantId: row.tenantId,
        tipoPagina: row.tipoPagina,
        titulo: row.titulo,
        slug: row.slug,
        descripcion: row.descripcion || undefined,
        contenido: typeof row.contenido === 'string' ? JSON.parse(row.contenido) : row.contenido,
        meta: typeof row.meta === 'string' ? JSON.parse(row.meta) : row.meta,
        publica: row.publica,
        activa: row.activa,
        orden: row.orden,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      };
    } else {
      // Crear nueva página
      const sql = `
        INSERT INTO paginas_web (
          tenant_id,
          tipo_pagina,
          titulo,
          slug,
          descripcion,
          contenido,
          meta,
          publica,
          activa,
          orden
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING 
          id,
          tenant_id as "tenantId",
          tipo_pagina as "tipoPagina",
          titulo,
          slug,
          descripcion,
          contenido,
          meta,
          publica,
          activa,
          orden,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const result = await query(sql, [
        tenantId,
        pagina.tipoPagina,
        pagina.titulo,
        pagina.slug,
        pagina.descripcion || null,
        contenidoJson,
        metaJson,
        publica,
        activa,
        orden,
      ]);

      const row = result.rows[0];
      return {
        id: row.id,
        tenantId: row.tenantId,
        tipoPagina: row.tipoPagina,
        titulo: row.titulo,
        slug: row.slug,
        descripcion: row.descripcion || undefined,
        contenido: typeof row.contenido === 'string' ? JSON.parse(row.contenido) : row.contenido,
        meta: typeof row.meta === 'string' ? JSON.parse(row.meta) : row.meta,
        publica: row.publica,
        activa: row.activa,
        orden: row.orden,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      };
    }
  } catch (error: any) {
    console.error('Error al guardar página:', error);
    throw new Error(`Error al guardar página: ${error.message}`);
  }
}

/**
 * Obtiene una página por ID
 */
export async function getPaginaById(tenantId: string, paginaId: string): Promise<PaginaWebResponse | null> {
  try {
    const sql = `
      SELECT 
        id,
        tenant_id as "tenantId",
        tipo_pagina as "tipoPagina",
        titulo,
        slug,
        descripcion,
        contenido,
        meta,
        publica,
        activa,
        orden,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM paginas_web
      WHERE id = $1 AND tenant_id = $2
      LIMIT 1
    `;
    
    const result = await query(sql, [paginaId, tenantId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      tenantId: row.tenantId,
      tipoPagina: row.tipoPagina,
      titulo: row.titulo,
      slug: row.slug,
      descripcion: row.descripcion || undefined,
      contenido: typeof row.contenido === 'string' ? JSON.parse(row.contenido) : row.contenido,
      meta: typeof row.meta === 'string' ? JSON.parse(row.meta) : row.meta,
      publica: row.publica,
      activa: row.activa,
      orden: row.orden,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  } catch (error: any) {
    console.error('Error al obtener página:', error);
    throw new Error(`Error al obtener página: ${error.message}`);
  }
}

/**
 * Obtiene una página por tipo de página (para páginas dinámicas como single_property)
 */
export async function getPaginaByTipo(tenantId: string, tipoPagina: string): Promise<PaginaWebResponse | null> {
  try {
    const sql = `
      SELECT 
        id,
        tenant_id as "tenantId",
        tipo_pagina as "tipoPagina",
        titulo,
        slug,
        descripcion,
        contenido,
        meta,
        publica,
        activa,
        orden,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM paginas_web
      WHERE tenant_id = $1 AND tipo_pagina = $2 AND activa = true
      ORDER BY orden ASC
      LIMIT 1
    `;
    
    const result = await query(sql, [tenantId, tipoPagina]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      tenantId: row.tenantId,
      tipoPagina: row.tipoPagina,
      titulo: row.titulo,
      slug: row.slug,
      descripcion: row.descripcion || undefined,
      contenido: typeof row.contenido === 'string' ? JSON.parse(row.contenido) : row.contenido,
      meta: typeof row.meta === 'string' ? JSON.parse(row.meta) : row.meta,
      publica: row.publica,
      activa: row.activa,
      orden: row.orden,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  } catch (error: any) {
    console.error('Error al obtener página por tipo:', error);
    throw new Error(`Error al obtener página por tipo: ${error.message}`);
  }
}

/**
 * Obtiene una página por slug
 */
export async function getPaginaBySlug(tenantId: string, slug: string): Promise<PaginaWebResponse | null> {
  try {
    console.log(`🔍 Buscando página por slug: "${slug}" para tenant: ${tenantId}`);
    
    const sql = `
      SELECT 
        id,
        tenant_id as "tenantId",
        tipo_pagina as "tipoPagina",
        titulo,
        slug,
        descripcion,
        contenido,
        meta,
        publica,
        activa,
        orden,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM paginas_web
      WHERE tenant_id = $1 AND slug = $2 AND activa = true
      LIMIT 1
    `;
    
    const result = await query(sql, [tenantId, slug]);
    
    if (result.rows.length === 0) {
      // Debug: Buscar todas las páginas de este tenant para ver qué slugs existen
      const debugSql = `SELECT slug, titulo, activa, tipo_pagina FROM paginas_web WHERE tenant_id = $1`;
      const debugResult = await query(debugSql, [tenantId]);
      console.log(`🔍 Páginas encontradas para tenant ${tenantId}:`, debugResult.rows.map((r: any) => ({
        slug: r.slug,
        titulo: r.titulo,
        activa: r.activa,
        tipo: r.tipo_pagina
      })));
      console.warn(`⚠️ No se encontró página activa con slug "${slug}" para tenant ${tenantId}`);
      return null;
    }
    
    console.log(`✅ Página encontrada: ${result.rows[0].titulo} (slug: ${result.rows[0].slug}, activa: ${result.rows[0].activa})`);
    
    const row = result.rows[0];
    return {
      id: row.id,
      tenantId: row.tenantId,
      tipoPagina: row.tipoPagina,
      titulo: row.titulo,
      slug: row.slug,
      descripcion: row.descripcion || undefined,
      contenido: typeof row.contenido === 'string' ? JSON.parse(row.contenido) : row.contenido,
      meta: typeof row.meta === 'string' ? JSON.parse(row.meta) : row.meta,
      publica: row.publica,
      activa: row.activa,
      orden: row.orden,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  } catch (error: any) {
    console.error('Error al obtener página por slug:', error);
    throw new Error(`Error al obtener página por slug: ${error.message}`);
  }
}

/**
 * Interfaz para respuesta completa de página
 */
export interface PaginaCompletaResponse {
  page: PaginaWebResponse;
  theme: Record<string, string>;
  components: ComponenteWebResponse[];
}

/**
 * Obtiene una página completa con todos sus componentes y tema
 * Este es el endpoint principal que el frontend debe usar
 * 
 * @param tenantId - ID del tenant
 * @param slug - Slug de la página
 * @returns Página completa con componentes ya filtrados y ordenados
 */
export async function getPaginaCompleta(
  tenantId: string,
  slug: string
): Promise<PaginaCompletaResponse> {
  try {
    // 1. Obtener la página
    const pagina = await getPaginaBySlug(tenantId, slug);

    if (!pagina) {
      throw new Error(`Página con slug "${slug}" no encontrada para el tenant ${tenantId}`);
    }

    // 2. Obtener el tema del tenant
    const tema = await getTemaByTenant(tenantId);

    if (!tema) {
      throw new Error(`Tema no encontrado para el tenant ${tenantId}`);
    }

    // 3. Obtener secciones usando el nuevo sistema de herencia
    // Prioridad: página específica > tipo de página > configuración global del tenant
    let componentes: ComponenteWebResponse[] = [];

    try {
      // Intentar usar el nuevo sistema de secciones resueltas
      const seccionesResueltas = await getSeccionesResueltas(
        tenantId,
        pagina.id,
        pagina.tipoPagina
      );

      // Convertir secciones al formato de componentes
      componentes = seccionesResueltas.map((seccion) => ({
        id: seccion.id,
        tipo: seccion.tipo,
        variante: seccion.variante,
        datos: seccion.datos,
        activo: seccion.activo,
        orden: seccion.orden,
        paginaId: seccion.paginaId,
        predeterminado: true,
      }));

      console.log(`📋 Secciones resueltas con herencia: ${componentes.length}`);
    } catch (error) {
      // Fallback al sistema anterior si falla
      console.warn('⚠️ Fallback a sistema anterior de componentes:', error);
      componentes = await getComponentesByTenant(
        tenantId,
        pagina.id,
        true
      );
    }

    // 4. Resolver datos dinámicos para cada componente que los tenga
    componentes = await Promise.all(
      componentes.map(async (componente) => {
        // Si el componente tiene dynamic_data, resolverlo
        if (componente.datos?.dynamic_data) {
          const resolvedData = await resolveDynamicData(
            componente.datos.dynamic_data,
            tenantId
          );

          // Agregar datos resueltos al componente
          return {
            ...componente,
            datos: {
              ...componente.datos,
              dynamic_data: {
                ...componente.datos.dynamic_data,
                resolved: resolvedData,
              },
            },
          };
        }

        return componente;
      })
    );

    // Los componentes ya vienen:
    // - Con herencia aplicada (página > tipo_página > tenant)
    // - Ordenados por orden ASC
    // - Solo activos (activo = true)
    // - Con datos dinámicos resueltos (si aplica)

    console.log(`✅ Página completa obtenida: ${pagina.titulo}`);
    console.log(`   - Componentes: ${componentes.length}`);
    console.log(`   - Tema: ${Object.keys(tema).length} colores`);

    const componentesConDinamicos = componentes.filter(
      (c) => c.datos?.dynamic_data?.resolved?.length > 0
    );
    if (componentesConDinamicos.length > 0) {
      console.log(`   - Componentes con datos dinámicos: ${componentesConDinamicos.length}`);
    }

    return {
      page: pagina,
      theme: tema,
      components: componentes,
    };
  } catch (error: any) {
    console.error('Error al obtener página completa:', error);
    throw new Error(`Error al obtener página completa: ${error.message}`);
  }
}

