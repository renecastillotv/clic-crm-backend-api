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
 *
 * Las "páginas" se derivan de:
 * 1. tipos_pagina que tienen al menos un componente_web asociado para ese tenant
 * 2. rutas_config_custom del tenant (páginas personalizadas)
 *
 * NO existe tabla paginas_web - las páginas son combinaciones de tipos_pagina + componentes_web
 */
export async function getPaginasByTenant(tenantId: string): Promise<PaginaWebResponse[]> {
  try {
    // Obtener tipos de página que tienen componentes configurados para este tenant
    const sql = `
      SELECT DISTINCT
        tp.id,
        tp.codigo as "tipoPagina",
        tp.nombre as titulo,
        tp.ruta_patron as slug,
        tp.descripcion,
        tp.visible as activa,
        tp.publico as publica,
        tp.nivel as orden,
        tp.created_at as "createdAt",
        tp.updated_at as "updatedAt",
        COUNT(cw.id) as "cantidadComponentes"
      FROM tipos_pagina tp
      LEFT JOIN componentes_web cw ON cw.tipo_pagina_id = tp.id AND cw.tenant_id = $1 AND cw.activo = true
      WHERE tp.visible = true
      GROUP BY tp.id, tp.codigo, tp.nombre, tp.ruta_patron, tp.descripcion, tp.visible, tp.publico, tp.nivel, tp.created_at, tp.updated_at
      ORDER BY tp.nivel ASC, tp.nombre ASC
    `;

    const result = await query(sql, [tenantId]);

    return result.rows.map((row: any) => ({
      id: row.id,
      tenantId: tenantId,
      tipoPagina: row.tipoPagina,
      titulo: row.titulo,
      slug: row.slug || '/',
      descripcion: row.descripcion || undefined,
      contenido: {},
      meta: {},
      publica: row.publica ?? true,
      activa: row.activa ?? true,
      orden: row.orden || 0,
      createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: row.updatedAt ? row.updatedAt.toISOString() : new Date().toISOString(),
      cantidadComponentes: parseInt(row.cantidadComponentes) || 0,
    }));
  } catch (error: any) {
    console.error('Error al obtener páginas:', error);
    throw new Error(`Error al obtener páginas: ${error.message}`);
  }
}

/**
 * Obtiene una página por ID (busca en tipos_pagina)
 * El ID puede ser el UUID del tipo_pagina
 */
export async function getPaginaById(tenantId: string, paginaId: string): Promise<PaginaWebResponse | null> {
  try {
    const sql = `
      SELECT
        tp.id,
        tp.codigo as "tipoPagina",
        tp.nombre as titulo,
        tp.ruta_patron as slug,
        tp.descripcion,
        tp.visible as activa,
        tp.publico as publica,
        tp.nivel as orden,
        tp.created_at as "createdAt",
        tp.updated_at as "updatedAt"
      FROM tipos_pagina tp
      WHERE tp.id = $1
      LIMIT 1
    `;

    const result = await query(sql, [paginaId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      tenantId: tenantId,
      tipoPagina: row.tipoPagina,
      titulo: row.titulo,
      slug: row.slug || '/',
      descripcion: row.descripcion || undefined,
      contenido: {},
      meta: {},
      publica: row.publica ?? true,
      activa: row.activa ?? true,
      orden: row.orden || 0,
      createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: row.updatedAt ? row.updatedAt.toISOString() : new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('Error al obtener página:', error);
    throw new Error(`Error al obtener página: ${error.message}`);
  }
}

/**
 * Obtiene una página por tipo de página (busca en tipos_pagina por codigo)
 * Ejemplo: getPaginaByTipo(tenantId, 'homepage') -> retorna el tipo homepage
 */
export async function getPaginaByTipo(tenantId: string, tipoPagina: string): Promise<PaginaWebResponse | null> {
  try {
    const sql = `
      SELECT
        tp.id,
        tp.codigo as "tipoPagina",
        tp.nombre as titulo,
        tp.ruta_patron as slug,
        tp.descripcion,
        tp.visible as activa,
        tp.publico as publica,
        tp.nivel as orden,
        tp.created_at as "createdAt",
        tp.updated_at as "updatedAt"
      FROM tipos_pagina tp
      WHERE tp.codigo = $1 AND tp.visible = true
      ORDER BY tp.nivel ASC
      LIMIT 1
    `;

    const result = await query(sql, [tipoPagina]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      tenantId: tenantId,
      tipoPagina: row.tipoPagina,
      titulo: row.titulo,
      slug: row.slug || '/',
      descripcion: row.descripcion || undefined,
      contenido: {},
      meta: {},
      publica: row.publica ?? true,
      activa: row.activa ?? true,
      orden: row.orden || 0,
      createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: row.updatedAt ? row.updatedAt.toISOString() : new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('Error al obtener página por tipo:', error);
    throw new Error(`Error al obtener página por tipo: ${error.message}`);
  }
}

/**
 * Obtiene una página por slug (busca en tipos_pagina por ruta_patron)
 * Ejemplo: getPaginaBySlug(tenantId, '/') -> retorna homepage
 *          getPaginaBySlug(tenantId, '/propiedades') -> retorna listados_propiedades
 */
export async function getPaginaBySlug(tenantId: string, slug: string): Promise<PaginaWebResponse | null> {
  try {
    console.log(`🔍 Buscando página por slug: "${slug}" para tenant: ${tenantId}`);

    // Normalizar el slug (quitar slash inicial si existe para comparar)
    const normalizedSlug = slug.startsWith('/') ? slug : `/${slug}`;
    const slugWithoutSlash = slug.startsWith('/') ? slug.slice(1) : slug;

    const sql = `
      SELECT
        tp.id,
        tp.codigo as "tipoPagina",
        tp.nombre as titulo,
        tp.ruta_patron as slug,
        tp.descripcion,
        tp.visible as activa,
        tp.publico as publica,
        tp.nivel as orden,
        tp.created_at as "createdAt",
        tp.updated_at as "updatedAt"
      FROM tipos_pagina tp
      WHERE (tp.ruta_patron = $1 OR tp.ruta_patron = $2 OR tp.ruta_patron = $3)
        AND tp.visible = true
      LIMIT 1
    `;

    const result = await query(sql, [slug, normalizedSlug, slugWithoutSlash]);

    if (result.rows.length === 0) {
      // Debug: Buscar todos los tipos de página para ver qué rutas existen
      const debugSql = `SELECT codigo, nombre, ruta_patron, visible FROM tipos_pagina`;
      const debugResult = await query(debugSql, []);
      console.log(`🔍 Tipos de página disponibles:`, debugResult.rows.map((r: any) => ({
        codigo: r.codigo,
        nombre: r.nombre,
        ruta: r.ruta_patron,
        visible: r.visible
      })));
      console.warn(`⚠️ No se encontró tipo de página con slug "${slug}"`);
      return null;
    }

    console.log(`✅ Página encontrada: ${result.rows[0].titulo} (slug: ${result.rows[0].slug})`);

    const row = result.rows[0];
    return {
      id: row.id,
      tenantId: tenantId,
      tipoPagina: row.tipoPagina,
      titulo: row.titulo,
      slug: row.slug || '/',
      descripcion: row.descripcion || undefined,
      contenido: {},
      meta: {},
      publica: row.publica ?? true,
      activa: row.activa ?? true,
      orden: row.orden || 0,
      createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: row.updatedAt ? row.updatedAt.toISOString() : new Date().toISOString(),
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
 * Las páginas se derivan de tipos_pagina (NO existe tabla paginas_web)
 * Los componentes se obtienen de componentes_web filtrando por tipo_pagina_id
 *
 * @param tenantId - ID del tenant
 * @param slug - Slug de la página (ruta_patron en tipos_pagina)
 * @returns Página completa con componentes ya filtrados y ordenados
 */
export async function getPaginaCompleta(
  tenantId: string,
  slug: string
): Promise<PaginaCompletaResponse> {
  try {
    // 1. Obtener el tipo de página por slug (ruta_patron)
    const pagina = await getPaginaBySlug(tenantId, slug);

    if (!pagina) {
      throw new Error(`Página con slug "${slug}" no encontrada para el tenant ${tenantId}`);
    }

    // 2. Obtener el tema del tenant
    const tema = await getTemaByTenant(tenantId);

    if (!tema) {
      throw new Error(`Tema no encontrado para el tenant ${tenantId}`);
    }

    // 3. Obtener componentes del tenant para este tipo de página
    // Los componentes se vinculan a tipos_pagina mediante tipo_pagina_id
    let componentes: ComponenteWebResponse[] = [];

    try {
      // Intentar usar el nuevo sistema de secciones resueltas
      // pagina.id aquí es el UUID del tipo_pagina
      const seccionesResueltas = await getSeccionesResueltas(
        tenantId,
        pagina.tipoPagina,  // Código del tipo_pagina (ej: listado_asesores)
        pagina.id,          // UUID del tipo_pagina (para componentes específicos)
        true                // includeFallback: usar plantillas_pagina si no hay componentes (para componentes específicos)
      );

      // Convertir secciones al formato de componentes
      componentes = seccionesResueltas.map((seccion) => ({
        id: seccion.id,
        tipo: seccion.tipo,
        variante: seccion.variante,
        datos: seccion.datos as any, // Los datos de secciones ya están formateados
        activo: seccion.activo,
        orden: seccion.orden,
        paginaId: seccion.paginaId || undefined,
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
      (c) => (c.datos?.dynamic_data?.resolved?.length ?? 0) > 0
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

