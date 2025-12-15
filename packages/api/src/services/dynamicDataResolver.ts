/**
 * dynamicDataResolver.ts
 * 
 * Resuelve datos dinámicos para componentes antes de enviarlos al frontend.
 * Esto permite que componentes como property_list, blog_list, etc. tengan datos reales.
 * 
 * Ahora usa el nuevo servicio centralizado dynamicDataService cuando es posible.
 */

import type { DynamicDataConfig } from '../types/componentes.js';
import { query } from '../utils/db.js';
import { resolveDynamicDataType, DynamicDataParams } from './dynamicDataService.js';

/**
 * Resuelve los datos dinámicos según la configuración del componente
 * 
 * @param config - Configuración de dynamic_data
 * @param tenantId - ID del tenant (para filtrado)
 * @returns Array de datos resueltos
 */
export async function resolveDynamicData(
  config: DynamicDataConfig,
  tenantId: string
): Promise<any[]> {
  // Si no hay configuración, retornar array vacío
  if (!config || (!config.apiEndpoint && !config.dataType)) {
    return [];
  }

  try {
    // Si hay un endpoint personalizado, usarlo directamente
    if (config.apiEndpoint) {
      return await resolveCustomEndpoint(config, tenantId);
    }

    // Si hay dataType, construir endpoint según el tipo
    if (config.dataType) {
      return await resolveByDataType(config, tenantId);
    }

    return [];
  } catch (error: any) {
    console.error('❌ Error al resolver dynamic_data:', error);
    // En caso de error, retornar array vacío para no romper el componente
    return [];
  }
}

/**
 * Resuelve un endpoint personalizado
 */
async function resolveCustomEndpoint(
  config: DynamicDataConfig,
  tenantId: string
): Promise<any[]> {
  // Por ahora, si hay un endpoint personalizado, retornar datos mock
  // TODO: Implementar fetch a endpoint externo si es necesario
  console.warn('⚠️  Endpoint personalizado no implementado:', config.apiEndpoint);
  return [];
}

/**
 * Resuelve datos según el tipo predefinido
 * Ahora usa el nuevo servicio centralizado cuando es posible
 */
async function resolveByDataType(
  config: DynamicDataConfig,
  tenantId: string
): Promise<any[]> {
  const { dataType, pagination, filters, queryParams } = config;
  const page = pagination?.page || 1;
  const limit = pagination?.limit || 10;

  // Mapear tipos antiguos a tipos del nuevo servicio
  const typeMapping: Record<string, string> = {
    'properties': 'propiedades',
    'videos': 'lista_videos',
    'articles': 'lista_articulos',
    'articulos': 'lista_articulos',
    'testimonials': 'lista_testimonios',
    'faqs': 'lista_faqs',
    'agents': 'lista_asesores',
    'ubicaciones': 'popular_locations',
    'locations': 'popular_locations',
  };

  // Si el tipo tiene un mapeo al nuevo servicio, usarlo
  if (typeMapping[dataType]) {
    try {
      const newType = typeMapping[dataType];
      const params: DynamicDataParams = {
        tenantId,
        filters: filters || {},
        pagination: { page, limit },
        queryParams,
      };

      const result = await resolveDynamicDataType(newType, params);
      // Asegurar que siempre retorne un array
      return Array.isArray(result) ? result : [result].filter(Boolean);
    } catch (error: any) {
      console.error(`Error usando nuevo servicio para ${dataType}:`, error);
      // Fallback a funciones antiguas si el nuevo servicio falla
    }
  }

  // Fallback a funciones antiguas para compatibilidad
  switch (dataType) {
    case 'properties':
      return await resolveProperties(tenantId, { page, limit, filters });

    case 'agents':
      return await resolveAgents(tenantId, { page, limit, filters });

    case 'blog':
      return await resolveBlogPosts(tenantId, { page, limit, filters });

    case 'testimonials':
      return await resolveTestimonials(tenantId, { page, limit, filters });

    case 'videos':
      return await resolveVideos(tenantId, { page, limit, filters });

    case 'articles':
    case 'articulos':
      return await resolveArticles(tenantId, { page, limit, filters });

    case 'faqs':
      return await resolveFAQs(tenantId, { page, limit, filters });

    case 'ubicaciones':
    case 'locations':
      return await resolveLocations(tenantId, { page, limit, filters });

    case 'custom':
      // Para custom, intentar usar apiEndpoint o retornar vacío
      if (config.apiEndpoint) {
        return await resolveCustomEndpoint(config, tenantId);
      }
      return [];

    default:
      console.warn(`⚠️  Tipo de dato no reconocido: ${dataType}`);
      return [];
  }
}

/**
 * Resuelve propiedades inmobiliarias
 * TODO: Cuando exista la tabla propiedades, implementar consulta real
 */
async function resolveProperties(
  tenantId: string,
  options: { page: number; limit: number; filters?: Record<string, any> }
): Promise<any[]> {
  try {
    // Intentar consultar tabla si existe
    try {
      const sql = `
        SELECT 
          id,
          titulo,
          descripcion,
          precio,
          ubicacion,
          direccion,
          habitaciones,
          banos,
          metros,
          metros_terreno,
          tipo,
          estado,
          imagenes,
          sector,
          slug
        FROM propiedades
        WHERE tenant_id = $1
        ${options.filters?.destacado ? 'AND destacado = true' : ''}
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const result = await query(sql, [tenantId, options.limit, (options.page - 1) * options.limit]);
      if (result.rows.length > 0) {
        // Normalizar datos
        return result.rows.map((row: any) => ({
          id: row.id,
          titulo: row.titulo,
          precio: row.precio,
          ubicacion: row.ubicacion || row.direccion,
          sector: row.sector,
          imagen: Array.isArray(row.imagenes) ? row.imagenes[0] : (typeof row.imagenes === 'string' ? row.imagenes : null),
          imagenes: Array.isArray(row.imagenes) ? row.imagenes : [],
          habitaciones: row.habitaciones,
          banos: row.banos,
          metros: row.metros || row.metros_terreno,
          tipo: row.tipo,
          slug: row.slug || row.id,
          url: `/propiedades/${row.slug || row.id}`,
        }));
      }
    } catch (tableError: any) {
      console.log(`📋 Tabla propiedades no existe aún o error al consultar`);
    }
    
    // Si no hay tabla o no hay datos, retornar array vacío (el componente mostrará estado vacío)
    return [];
  } catch (error: any) {
    console.error('Error al resolver propiedades:', error);
    return [];
  }
}

/**
 * Resuelve asesores/agentes
 * Ahora usa mock_asesores para datos de desarrollo
 */
async function resolveAgents(
  tenantId: string,
  options: { page: number; limit: number; filters?: Record<string, any> }
): Promise<any[]> {
  try {
    // Intentar usar tabla mock primero
    try {
      const sql = `
        SELECT 
          id, nombre, apellido, cargo, biografia, email, telefono, foto_url,
          redes_sociales, especialidades, experiencia_anos, propiedades_vendidas,
          logros, metadata, traducciones, activo, destacado, orden
        FROM mock_asesores
        WHERE tenant_id = $1 AND activo = true
        ORDER BY destacado DESC, orden ASC, nombre ASC
        LIMIT $2 OFFSET $3
      `;
      const result = await query(sql, [tenantId, options.limit, (options.page - 1) * options.limit]);
      if (result.rows.length > 0) {
        return result.rows.map((row: any) => ({
          ...row,
          nombre: `${row.nombre} ${row.apellido}`,
          foto: row.foto_url,
          especialidad: Array.isArray(row.especialidades) && row.especialidades.length > 0 
            ? row.especialidades[0] 
            : row.cargo,
          especialidades: typeof row.especialidades === 'string' ? JSON.parse(row.especialidades) : row.especialidades,
          redes_sociales: typeof row.redes_sociales === 'string' ? JSON.parse(row.redes_sociales) : row.redes_sociales,
          logros: typeof row.logros === 'string' ? JSON.parse(row.logros) : row.logros,
          metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
        }));
      }
    } catch (mockError: any) {
      console.log(`📋 Tabla mock_asesores no disponible`);
    }

    // Fallback a datos mock hardcodeados si no hay tabla
    console.log(`👤 Resolviendo agentes para tenant ${tenantId} (fallback mock)`);
    return [
      {
        id: '1',
        nombre: 'Juan Pérez',
        email: 'juan@example.com',
        telefono: '+1234567890',
        foto: 'https://placehold.co/200x200/e2e8f0/64748b?text=JP',
        especialidad: 'Venta',
      },
      {
        id: '2',
        nombre: 'María García',
        email: 'maria@example.com',
        telefono: '+1234567891',
        foto: 'https://placehold.co/200x200/e2e8f0/64748b?text=MG',
        especialidad: 'Alquiler',
      },
    ].slice(0, options.limit);
  } catch (error: any) {
    console.error('Error al resolver agentes:', error);
    return [];
  }
}

/**
 * Resuelve posts de blog
 * TODO: Cuando exista la tabla blog_posts, implementar consulta real
 */
async function resolveBlogPosts(
  tenantId: string,
  options: { page: number; limit: number; filters?: Record<string, any> }
): Promise<any[]> {
  try {
    console.log(`📝 Resolviendo blog posts para tenant ${tenantId} (mock)`);
    return [
      {
        id: '1',
        titulo: 'Guía para Comprar tu Primera Casa',
        resumen: 'Consejos útiles para compradores primerizos...',
        fecha: new Date().toISOString(),
        autor: 'Equipo Editorial',
        imagen: 'https://placehold.co/600x400/e2e8f0/64748b?text=Blog+1',
        slug: 'guia-comprar-primera-casa',
      },
      {
        id: '2',
        titulo: 'Tendencias del Mercado Inmobiliario 2024',
        resumen: 'Análisis de las tendencias actuales...',
        fecha: new Date().toISOString(),
        autor: 'Equipo Editorial',
        imagen: 'https://placehold.co/600x400/e2e8f0/64748b?text=Blog+2',
        slug: 'tendencias-mercado-2024',
      },
    ].slice(0, options.limit);
  } catch (error: any) {
    console.error('Error al resolver blog posts:', error);
    return [];
  }
}

/**
 * Resuelve testimonios
 * Ahora usa mock_testimonios para datos de desarrollo
 */
async function resolveTestimonials(
  tenantId: string,
  options: { page: number; limit: number; filters?: Record<string, any> }
): Promise<any[]> {
  try {
    // Intentar usar tabla mock primero
    try {
      const sql = `
        SELECT 
          id, nombre_cliente, ubicacion, testimonio, calificacion, foto_url,
          tipo_propiedad, categoria_id, metadata, traducciones, activo, destacado, fecha
        FROM mock_testimonios
        WHERE tenant_id = $1 AND activo = true
        ORDER BY destacado DESC, fecha DESC
        LIMIT $2 OFFSET $3
      `;
      const result = await query(sql, [tenantId, options.limit, (options.page - 1) * options.limit]);
      if (result.rows.length > 0) {
        return result.rows.map((row: any) => ({
          ...row,
          client_name: row.nombre_cliente,
          client_avatar: row.foto_url,
          client_location: row.ubicacion,
          full_testimonial: row.testimonio,
          rating: row.calificacion,
          transaction_location: row.ubicacion,
          metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
        }));
      }
    } catch (mockError: any) {
      console.log(`📋 Tabla mock_testimonios no disponible`);
    }

    // Intentar consultar tabla real si existe
    try {
      const sql = `
        SELECT 
          id,
          client_name,
          client_avatar,
          client_location,
          client_profession,
          client_verified,
          full_testimonial,
          rating,
          transaction_location
        FROM testimonios
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const result = await query(sql, [tenantId, options.limit, (options.page - 1) * options.limit]);
      if (result.rows.length > 0) {
        return result.rows;
      }
    } catch (tableError: any) {
      console.log(`📋 Tabla testimonios no existe aún`);
    }
    return [];
  } catch (error: any) {
    console.error('Error al resolver testimonios:', error);
    return [];
  }
}

/**
 * Resuelve videos
 * Ahora usa mock_videos para datos de desarrollo
 */
async function resolveVideos(
  tenantId: string,
  options: { page: number; limit: number; filters?: Record<string, any> }
): Promise<any[]> {
  try {
    // Intentar usar tabla mock primero
    try {
      const sql = `
        SELECT 
          id, titulo, descripcion, url_video, thumbnail_url, duracion,
          categoria_id, metadata, traducciones, activo, vistas, fecha_publicacion
        FROM mock_videos
        WHERE tenant_id = $1 AND activo = true
        ORDER BY fecha_publicacion DESC
        LIMIT $2 OFFSET $3
      `;
      const result = await query(sql, [tenantId, options.limit, (options.page - 1) * options.limit]);
      if (result.rows.length > 0) {
        return result.rows.map((row: any) => ({
          ...row,
          videoId: row.id,
          videoSlug: row.id,
          title: row.titulo,
          description: row.descripcion,
          thumbnail: row.thumbnail_url,
          duration: row.duracion,
          views: row.vistas,
          category: row.categoria_id,
          metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
        }));
      }
    } catch (mockError: any) {
      console.log(`📋 Tabla mock_videos no disponible`);
    }

    // Intentar consultar tabla real si existe
    try {
      const sql = `
        SELECT 
          id,
          video_id as "videoId",
          video_slug as "videoSlug",
          title,
          description,
          thumbnail,
          duration,
          views,
          category
        FROM videos
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const result = await query(sql, [tenantId, options.limit, (options.page - 1) * options.limit]);
      if (result.rows.length > 0) {
        return result.rows;
      }
    } catch (tableError: any) {
      console.log(`📋 Tabla videos no existe aún`);
    }
    return [];
  } catch (error: any) {
    console.error('Error al resolver videos:', error);
    return [];
  }
}

/**
 * Resuelve artículos
 * Ahora usa mock_articulos para datos de desarrollo
 */
async function resolveArticles(
  tenantId: string,
  options: { page: number; limit: number; filters?: Record<string, any> }
): Promise<any[]> {
  try {
    // Intentar usar tabla mock primero
    try {
      const sql = `
        SELECT 
          id, titulo, resumen, contenido, autor, thumbnail_url,
          categoria_id, tags, metadata, traducciones, activo, publicado, vistas, fecha_publicacion
        FROM mock_articulos
        WHERE tenant_id = $1 AND activo = true AND publicado = true
        ORDER BY fecha_publicacion DESC
        LIMIT $2 OFFSET $3
      `;
      const result = await query(sql, [tenantId, options.limit, (options.page - 1) * options.limit]);
      if (result.rows.length > 0) {
        return result.rows.map((row: any) => ({
          ...row,
          slug: row.id,
          title: row.titulo,
          excerpt: row.resumen,
          featuredImage: row.thumbnail_url,
          author: row.autor,
          publishedAt: row.fecha_publicacion,
          readTime: null,
          tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags,
          metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
        }));
      }
    } catch (mockError: any) {
      console.log(`📋 Tabla mock_articulos no disponible`);
    }

    // Intentar consultar tabla real si existe
    try {
      const sql = `
        SELECT 
          id,
          slug,
          title,
          excerpt,
          featured_image as "featuredImage",
          author,
          published_at as "publishedAt",
          read_time as "readTime"
        FROM articulos
        WHERE tenant_id = $1
        ORDER BY published_at DESC
        LIMIT $2 OFFSET $3
      `;
      const result = await query(sql, [tenantId, options.limit, (options.page - 1) * options.limit]);
      if (result.rows.length > 0) {
        return result.rows;
      }
    } catch (tableError: any) {
      console.log(`📋 Tabla articulos no existe aún`);
    }
    return [];
  } catch (error: any) {
    console.error('Error al resolver artículos:', error);
    return [];
  }
}

/**
 * Resuelve FAQs
 * Ahora usa mock_faqs para datos de desarrollo
 */
async function resolveFAQs(
  tenantId: string,
  options: { page: number; limit: number; filters?: Record<string, any> }
): Promise<any[]> {
  try {
    // Intentar usar tabla mock primero
    try {
      const sql = `
        SELECT id, pregunta, respuesta, categoria, orden, traducciones, activo
        FROM mock_faqs
        WHERE tenant_id = $1 AND activo = true
        ORDER BY orden ASC, pregunta ASC
        LIMIT $2 OFFSET $3
      `;
      const result = await query(sql, [tenantId, options.limit, (options.page - 1) * options.limit]);
      if (result.rows.length > 0) {
        return result.rows.map((row: any) => ({
          ...row,
          question: row.pregunta,
          answer: row.respuesta,
          category: row.categoria,
          traducciones: typeof row.traducciones === 'string' ? JSON.parse(row.traducciones) : row.traducciones,
        }));
      }
    } catch (mockError: any) {
      console.log(`📋 Tabla mock_faqs no disponible`);
    }

    // Intentar consultar tabla real si existe
    try {
      const sql = `
        SELECT 
          id,
          question,
          answer,
          category
        FROM faqs
        WHERE tenant_id = $1
        ORDER BY orden ASC
        LIMIT $2 OFFSET $3
      `;
      const result = await query(sql, [tenantId, options.limit, (options.page - 1) * options.limit]);
      if (result.rows.length > 0) {
        return result.rows;
      }
    } catch (tableError: any) {
      console.log(`📋 Tabla faqs no existe aún`);
    }
    return [];
  } catch (error: any) {
    console.error('Error al resolver FAQs:', error);
    return [];
  }
}

/**
 * Resuelve ubicaciones populares
 * Por ahora usa datos agrupados de propiedades si existe la tabla
 */
async function resolveLocations(
  tenantId: string,
  options: { page: number; limit: number; filters?: Record<string, any> }
): Promise<any[]> {
  try {
    try {
      const sql = `
        SELECT 
          ubicacion as title,
          sector as nombre,
          COUNT(*) as "propertyCount",
          MIN(precio) as "minPrice"
        FROM propiedades
        WHERE tenant_id = $1
        GROUP BY ubicacion, sector
        ORDER BY COUNT(*) DESC
        LIMIT $2
      `;
      const result = await query(sql, [tenantId, options.limit]);
      if (result.rows.length > 0) {
        return result.rows.map((row: any) => ({
          title: row.title || row.nombre,
          count: row.propertyCount,
          minPrice: row.minPrice,
        }));
      }
    } catch (tableError: any) {
      console.log(`📋 Tabla propiedades no existe aún o no tiene ubicaciones`);
    }
    return [];
  } catch (error: any) {
    console.error('Error al resolver ubicaciones:', error);
    return [];
  }
}


