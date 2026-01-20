/**
 * dynamicDataService.ts
 * 
 * Servicio centralizado para resolver TODOS los tipos de datos dinámicos
 * que la API puede devolver. Utiliza tablas mock para desarrollo.
 * 
 * Tipos soportados:
 * - stats
 * - categorias (videos, articulos, testimonios)
 * - propiedades
 * - carruseles_propiedades
 * - textos_sueltos
 * - contenidos_resumidos (videos, articulos, testimonios, faqs)
 * - contenido_single (video, articulo, testimonio, faq)
 * - propiedad_single
 * - asesores (listado y single)
 */

import { query } from '../utils/db.js';
import {
  resolveTranslatedObject,
  resolveTranslatedArray,
  getTranslatableFields,
  normalizeLanguage,
  DEFAULT_LANGUAGE,
  buildSlugSearchCondition,
} from '../utils/translations.js';

export interface DynamicDataParams {
  tenantId: string;
  filters?: Record<string, any>;
  pagination?: { page?: number; limit?: number };
  queryParams?: Record<string, any>;
  id?: string; // Para contenido single
  slug?: string; // Para contenido single por slug
  idioma?: string; // Idioma para traducciones
}

/**
 * Resuelve cualquier tipo de dato dinámico según el tipo solicitado
 */
export async function resolveDynamicDataType(
  tipo: string,
  params: DynamicDataParams
): Promise<any> {
  switch (tipo) {
    case 'stats':
      return await resolveStats(params);
    
    case 'categorias_videos':
    case 'categorias_articulos':
    case 'categorias_testimonios':
    case 'videos_por_categoria':  // Alias para categorias_videos
    case 'articulos_por_categoria':  // Alias para categorias_articulos
    case 'testimonios_por_categoria':  // Alias para categorias_testimonios
      // Normalizar el tipo para el resolver
      const tipoCategoria = tipo.startsWith('videos_') ? 'categorias_videos' :
                            tipo.startsWith('articulos_') ? 'categorias_articulos' :
                            tipo.startsWith('testimonios_') ? 'categorias_testimonios' : tipo;
      return await resolveCategorias(params, tipoCategoria);
    
    case 'propiedades':
      return await resolvePropiedades(params);
    
    case 'propiedad_single':
      return await resolvePropiedadSingle(params);
    
    case 'carrusel_propiedades':
      return await resolveCarruselPropiedades(params);
    
    case 'texto_suelto':
      return await resolveTextoSuelto(params);
    
    case 'lista_videos':
      return await resolveListaVideos(params);

    case 'categoria_videos':
      // Videos filtrados por categoría (para página /videos/:categoria)
      // Devuelve objeto con {categoria, items} para que el componente tenga info de la categoría
      return await resolveCategoriaContenido(params, 'video');

    case 'video_single':
      return await resolveVideoSingle(params);

    case 'lista_articulos':
      return await resolveListaArticulos(params);

    case 'categoria_articulos':
      // Artículos filtrados por categoría (para página /articulos/:categoria)
      // Devuelve objeto con {categoria, items} para que el componente tenga info de la categoría
      return await resolveCategoriaContenido(params, 'articulo');

    case 'articulo_single':
      return await resolveArticuloSingle(params);
    
    case 'lista_testimonios':
      return await resolveListaTestimonios(params);

    case 'categoria_testimonios':
      // Testimonios filtrados por categoría (para página /testimonios/:categoria)
      // Devuelve objeto con {categoria, items} para que el componente tenga info de la categoría
      return await resolveCategoriaContenido(params, 'testimonio');

    case 'testimonio_single':
      return await resolveTestimonioSingle(params);
    
    case 'lista_faqs':
      return await resolveListaFAQs(params);
    
    case 'faq_single':
      return await resolveFAQSingle(params);
    
    case 'lista_asesores':
      return await resolveListaAsesores(params);
    
    case 'asesor_single':
      return await resolveAsesorSingle(params);
    
    case 'popular_locations':
    case 'ubicaciones_populares':
      return await resolvePopularLocations(params);
    
    default:
      throw new Error(`Tipo de dato dinámico no soportado: ${tipo}`);
  }
}

/**
 * Resuelve estadísticas del tenant
 */
async function resolveStats(params: DynamicDataParams): Promise<any> {
  const { tenantId } = params;
  
  try {
    const result = await query(
      'SELECT data FROM mock_stats WHERE tenant_id = $1 LIMIT 1',
      [tenantId]
    );
    
    if (result.rows.length === 0) {
      return {};
    }
    
    return result.rows[0].data || {};
  } catch (error: any) {
    console.error('Error resolviendo stats:', error);
    return {};
  }
}

/**
 * Resuelve categorías de contenido (videos, articulos, testimonios)
 * Usa la tabla real: categorias_contenido
 */
async function resolveCategorias(
  params: DynamicDataParams,
  tipoCompleto: string
): Promise<any[]> {
  const { tenantId, filters } = params;

  // Extraer el subtipo y mapear plural a singular
  const tipoContenido = tipoCompleto.replace('categorias_', '');
  const tipoMap: Record<string, string> = {
    'videos': 'video',
    'articulos': 'articulo',
    'testimonios': 'testimonio',
    'faqs': 'faq',
  };
  const tipoTabla = tipoMap[tipoContenido] || tipoContenido;

  // Mapear tipo a tabla de contenido para contar items
  const tablaContenido: Record<string, string> = {
    'video': 'videos',
    'articulo': 'articulos',
    'testimonio': 'testimonios',
    'faq': 'faqs',
  };
  const tabla = tablaContenido[tipoTabla] || `${tipoTabla}s`;

  try {
    // Query con subquery para contar items por categoría
    let sql = `
      SELECT
        c.id, c.nombre, c.slug, c.descripcion, c.icono, c.color, c.orden,
        c.traducciones, c.activa, c.created_at, c.updated_at,
        COALESCE(counts.total, 0)::integer as total_items
      FROM categorias_contenido c
      LEFT JOIN (
        SELECT categoria_id, COUNT(*) as total
        FROM ${tabla}
        WHERE tenant_id = $1 AND publicado = true
        GROUP BY categoria_id
      ) counts ON counts.categoria_id = c.id
      WHERE c.tenant_id = $1 AND c.tipo = $2
    `;
    const queryParams: any[] = [tenantId, tipoTabla];

    if (filters?.activas !== false) {
      sql += ' AND activa = true';
    }

    sql += ' ORDER BY orden ASC, nombre ASC';

    const result = await query(sql, queryParams);
    console.log(`✅ Categorías ${tipoContenido} encontradas: ${result.rows.length}`);

    // Mapear los campos para que coincidan con lo que esperan los componentes
    return result.rows.map(row => ({
      ...row,
      traducciones: typeof row.traducciones === 'string' ? JSON.parse(row.traducciones) : row.traducciones,
      // Campos de conteo con aliases para compatibilidad con componentes
      total: row.total_items,
      total_videos: row.total_items,
      total_articulos: row.total_items,
      total_testimonios: row.total_items,
    }));
  } catch (error: any) {
    console.error(`Error resolviendo categorias_${tipoContenido}:`, error);
    return [];
  }
}

/**
 * Resuelve lista de propiedades
 * Resolver universal: intenta tabla real, si no existe usa datos mock
 * Cuando haya datos reales, solo se cambia esta función
 */
async function resolvePropiedades(params: DynamicDataParams): Promise<any[]> {
  const { tenantId, filters, pagination } = params;
  const page = pagination?.page || 1;
  const limit = pagination?.limit || 20;
  const offset = (page - 1) * limit;
  
  try {
    // Intentar usar tabla real primero
    const hasRealTable = await query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'propiedades'
      )`
    );
    
    if (hasRealTable.rows[0]?.exists) {
      let sql = 'SELECT * FROM propiedades WHERE tenant_id = $1';
      const queryParams: any[] = [tenantId];
      let paramIndex = 2;
      
      if (filters?.activo !== false) {
        sql += ` AND activo = true`;
      }
      
      if (filters?.tipo) {
        sql += ` AND tipo = $${paramIndex++}`;
        queryParams.push(filters.tipo);
      }
      
      if (filters?.destacada) {
        sql += ` AND destacada = true`;
      }

      // Filtro por agente/asesor (para propiedades del asesor)
      // Busca tanto en agente_id como en perfil_asesor_id
      if (filters?.agente_id) {
        sql += ` AND (agente_id = $${paramIndex} OR perfil_asesor_id = $${paramIndex})`;
        paramIndex++;
        queryParams.push(filters.agente_id);
      }

      // Excluir una propiedad específica (para similares)
      if (filters?.exclude_id) {
        sql += ` AND id != $${paramIndex++}`;
        queryParams.push(filters.exclude_id);
      }

      // Filtro por ciudad (para propiedades similares)
      if (filters?.ciudad) {
        sql += ` AND ciudad = $${paramIndex++}`;
        queryParams.push(filters.ciudad);
      }

      // Filtro por operación (venta, alquiler)
      if (filters?.operacion) {
        sql += ` AND operacion = $${paramIndex++}`;
        queryParams.push(filters.operacion);
      }

      sql += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      queryParams.push(limit, offset);
      
      const result = await query(sql, queryParams);
      
      if (result.rows.length > 0) {
        const idioma = normalizeLanguage(params.idioma);
        const camposTraducibles = getTranslatableFields('propiedades');

        // Normalizar datos para que los componentes los entiendan
        return result.rows.map((row: any) => {
          // Manejar imagenes que puede ser array o string JSON
          let imagenesArray: string[] = [];
          if (Array.isArray(row.imagenes)) {
            imagenesArray = row.imagenes;
          } else if (typeof row.imagenes === 'string') {
            try {
              imagenesArray = JSON.parse(row.imagenes);
            } catch {
              imagenesArray = [row.imagenes];
            }
          }

          // Parsear traducciones si es string
          const traducciones = typeof row.traducciones === 'string'
            ? JSON.parse(row.traducciones || '{}')
            : (row.traducciones || {});

          // Aplicar traducciones
          const rowConTraduccion = resolveTranslatedObject(
            { ...row, traducciones },
            camposTraducibles,
            idioma
          );

          // Construir ubicación compuesta
          const ubicacion = [row.sector, row.ciudad, row.provincia].filter(Boolean).join(', ');

          return {
            id: row.id,
            titulo: rowConTraduccion.titulo,
            title: rowConTraduccion.titulo,
            descripcion: rowConTraduccion.descripcion,
            descripcion_corta: rowConTraduccion.descripcion_corta,
            precio: row.precio,
            price: row.precio,
            ubicacion: ubicacion || row.direccion,
            location: ubicacion || row.direccion,
            sector: row.sector,
            ciudad: row.ciudad,
            habitaciones: row.habitaciones,
            bedrooms: row.habitaciones,
            banos: row.banos,
            bathrooms: row.banos,
            metros: row.m2_construccion || row.m2_terreno,
            area: row.m2_construccion || row.m2_terreno,
            m2_construccion: row.m2_construccion,
            m2_terreno: row.m2_terreno,
            tipo: row.tipo,
            type: row.tipo,
            operacion: row.operacion,
            imagen: row.imagen_principal || (imagenesArray.length > 0 ? imagenesArray[0] : null),
            imagenes: imagenesArray,
            slug: row.slug || row.id,
            url: `/propiedades/${row.slug || row.id}`,
            destacada: row.destacada,
            exclusiva: row.exclusiva,
            estado: row.estado_propiedad,
          };
        });
      }
    }
    
    // Fallback: Usar datos mock desde carruseles o datos hardcodeados
    console.log(`🏠 Resolviendo propiedades para tenant ${tenantId} (usando datos mock)`);
    
    // Intentar obtener desde carruseles mock
    try {
      const carruselesResult = await query(
        `SELECT propiedades_ids, configuracion
         FROM mock_carruseles_propiedades
         WHERE tenant_id = $1 AND activo = true
         LIMIT 1`,
        [tenantId]
      );
      
      // Por ahora retornar datos mock hardcodeados
      // Cuando haya datos reales, solo se cambia esta parte
    } catch (carruselError: any) {
      console.log('📋 No se pudieron obtener propiedades desde carruseles mock');
    }
    
    // Datos mock hardcodeados para desarrollo
    return [
      {
        id: 'prop-1',
        titulo: 'Apartamento de Lujo en Zona Premium',
        title: 'Apartamento de Lujo en Zona Premium',
        precio: 285000,
        price: 285000,
        ubicacion: 'Punta Cana',
        location: 'Punta Cana',
        sector: 'Bávaro',
        habitaciones: 3,
        bedrooms: 3,
        banos: 2,
        bathrooms: 2,
        metros: 120,
        area: 120,
        tipo: 'Apartamento',
        type: 'Apartamento',
        imagen: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800',
        imagenes: ['https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800'],
        slug: 'apartamento-lujo-zona-premium',
        url: '/propiedades/apartamento-lujo-zona-premium',
      },
      {
        id: 'prop-2',
        titulo: 'Villa con Piscina y Vista al Mar',
        title: 'Villa con Piscina y Vista al Mar',
        precio: 450000,
        price: 450000,
        ubicacion: 'Bávaro',
        location: 'Bávaro',
        sector: 'Punta Cana',
        habitaciones: 4,
        bedrooms: 4,
        banos: 3,
        bathrooms: 3,
        metros: 250,
        area: 250,
        tipo: 'Villa',
        type: 'Villa',
        imagen: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
        imagenes: ['https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800'],
        slug: 'villa-piscina-vista-mar',
        url: '/propiedades/villa-piscina-vista-mar',
      },
      {
        id: 'prop-3',
        titulo: 'Casa Residencial en Santo Domingo',
        title: 'Casa Residencial en Santo Domingo',
        precio: 195000,
        price: 195000,
        ubicacion: 'Santo Domingo',
        location: 'Santo Domingo',
        sector: 'Naco',
        habitaciones: 3,
        bedrooms: 3,
        banos: 2,
        bathrooms: 2,
        metros: 180,
        area: 180,
        tipo: 'Casa',
        type: 'Casa',
        imagen: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',
        imagenes: ['https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800'],
        slug: 'casa-residencial-santo-domingo',
        url: '/propiedades/casa-residencial-santo-domingo',
      },
    ].slice(0, limit);
  } catch (error: any) {
    console.error('Error resolviendo propiedades:', error);
    return [];
  }
}

/**
 * Resuelve una propiedad single por ID o slug
 * Usa la tabla real: propiedades
 */
async function resolvePropiedadSingle(params: DynamicDataParams): Promise<any | null> {
  const { tenantId, id, filters } = params;
  const propiedadId = id || filters?.id || filters?.slug;

  if (!propiedadId) {
    return null;
  }

  console.log(`🏠 Resolviendo propiedad single: ${propiedadId} para tenant ${tenantId}`);

  try {
    // Buscar por ID (UUID) o por slug
    const result = await query(
      `SELECT * FROM propiedades
       WHERE tenant_id = $2 AND activo = true AND (id::text = $1 OR slug = $1)
       LIMIT 1`,
      [propiedadId, tenantId]
    );

    if (result.rows.length === 0) {
      console.log(`⚠️ Propiedad no encontrada: ${propiedadId}`);
      return null;
    }

    const row = result.rows[0];
    const idioma = normalizeLanguage(params.idioma);
    const camposTraducibles = getTranslatableFields('propiedades');

    // Parsear traducciones si es string
    const traducciones = typeof row.traducciones === 'string'
      ? JSON.parse(row.traducciones || '{}')
      : (row.traducciones || {});

    // Aplicar traducciones
    const rowTraducido = resolveTranslatedObject(
      { ...row, traducciones },
      camposTraducibles,
      idioma
    );

    // Manejar imagenes que puede ser array o string JSON
    let imagenesArray: string[] = [];
    if (Array.isArray(row.imagenes)) {
      imagenesArray = row.imagenes;
    } else if (typeof row.imagenes === 'string') {
      try {
        imagenesArray = JSON.parse(row.imagenes);
      } catch {
        imagenesArray = [row.imagenes];
      }
    }

    // Construir ubicación compuesta
    const ubicacion = [row.sector, row.ciudad, row.provincia].filter(Boolean).join(', ');

    // Normalizar datos para componentes (con traducciones aplicadas)
    const propiedad = {
      id: row.id,
      titulo: rowTraducido.titulo,
      title: rowTraducido.titulo,
      codigo: row.codigo,
      descripcion: rowTraducido.descripcion,
      description: rowTraducido.descripcion,
      descripcion_corta: rowTraducido.descripcion_corta,
      tipo: row.tipo,
      type: row.tipo,
      operacion: row.operacion,
      precio: row.precio,
      price: row.precio,
      precio_anterior: row.precio_anterior,
      moneda: row.moneda,
      currency: row.moneda,
      // Ubicación
      pais: row.pais,
      provincia: row.provincia,
      ciudad: row.ciudad,
      sector: row.sector,
      direccion: row.direccion,
      ubicacion: ubicacion || row.direccion,
      location: ubicacion || row.direccion,
      latitud: row.latitud,
      longitud: row.longitud,
      mostrar_ubicacion_exacta: row.mostrar_ubicacion_exacta,
      // Características
      habitaciones: row.habitaciones,
      bedrooms: row.habitaciones,
      banos: row.banos,
      bathrooms: row.banos,
      medios_banos: row.medios_banos,
      estacionamientos: row.estacionamientos,
      parking: row.estacionamientos,
      m2_construccion: row.m2_construccion,
      m2_terreno: row.m2_terreno,
      metros: row.m2_construccion || row.m2_terreno,
      area: row.m2_construccion || row.m2_terreno,
      antiguedad: row.antiguedad,
      pisos: row.pisos,
      amenidades: typeof row.amenidades === 'string' ? JSON.parse(row.amenidades) : (row.amenidades || []),
      caracteristicas: typeof row.caracteristicas === 'string' ? JSON.parse(row.caracteristicas) : (row.caracteristicas || {}),
      // Imágenes
      imagen_principal: row.imagen_principal || (imagenesArray.length > 0 ? imagenesArray[0] : null),
      imagen: row.imagen_principal || (imagenesArray.length > 0 ? imagenesArray[0] : null),
      imagenes: imagenesArray,
      images: imagenesArray,
      video_url: row.video_url,
      tour_virtual_url: row.tour_virtual_url,
      // Estado
      estado_propiedad: row.estado_propiedad,
      estado: row.estado_propiedad,
      status: row.estado_propiedad,
      destacada: row.destacada,
      featured: row.destacada,
      exclusiva: row.exclusiva,
      exclusive: row.exclusiva,
      // Relaciones
      agente_id: row.agente_id,
      propietario_id: row.propietario_id,
      // SEO
      slug: row.slug,
      url: `/propiedades/${row.slug || row.id}`,
      // Notas
      notas: row.notas,
      // Timestamps
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    console.log(`✅ Propiedad encontrada: ${propiedad.titulo}`);
    return propiedad;
  } catch (error: any) {
    console.error('❌ Error resolviendo propiedad single:', error);
    return null;
  }
}

/**
 * Resuelve carrusel de propiedades con configuración
 */
async function resolveCarruselPropiedades(params: DynamicDataParams): Promise<any[]> {
  const { tenantId, filters } = params;
  
  try {
    let sql = `
      SELECT id, nombre, slug, configuracion, propiedades_ids, activo
      FROM mock_carruseles_propiedades
      WHERE tenant_id = $1
    `;
    const queryParams: any[] = [tenantId];
    
    if (filters?.slug) {
      sql += ' AND slug = $2';
      queryParams.push(filters.slug);
    }
    
    if (filters?.activo !== false) {
      sql += ' AND activo = true';
    }
    
    sql += ' ORDER BY nombre ASC';
    
    const result = await query(sql, queryParams);
    const carruseles = result.rows.map(row => ({
      ...row,
      configuracion: typeof row.configuracion === 'string' 
        ? JSON.parse(row.configuracion) 
        : row.configuracion,
      propiedades_ids: typeof row.propiedades_ids === 'string'
        ? JSON.parse(row.propiedades_ids)
        : row.propiedades_ids,
    }));
    
    // Si se solicitó un carrusel específico y tiene configuración,
    // podemos aplicar esa configuración a las propiedades
    if (filters?.slug && carruseles.length > 0) {
      const carrusel = carruseles[0];
      // Aquí se puede aplicar la lógica de filtrado según la configuración
      // Por ahora retornamos el carrusel con su configuración
    }
    
    return carruseles;
  } catch (error: any) {
    console.error('Error resolviendo carrusel propiedades:', error);
    return [];
  }
}

/**
 * Resuelve texto suelto por clave
 */
async function resolveTextoSuelto(params: DynamicDataParams): Promise<any | null> {
  const { tenantId, filters } = params;
  
  if (!filters?.clave) {
    return null;
  }
  
  try {
    const result = await query(
      `SELECT id, clave, titulo, contenido_html, tipo, traducciones, activo
       FROM mock_textos_sueltos
       WHERE tenant_id = $1 AND clave = $2 AND activo = true
       LIMIT 1`,
      [tenantId, filters.clave]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      ...row,
      traducciones: typeof row.traducciones === 'string' 
        ? JSON.parse(row.traducciones) 
        : row.traducciones,
    };
  } catch (error: any) {
    console.error('Error resolviendo texto suelto:', error);
    return null;
  }
}

/**
 * Resuelve lista de videos
 * Usa la tabla real: videos
 */
async function resolveListaVideos(params: DynamicDataParams): Promise<any[]> {
  const { tenantId, filters, pagination } = params;
  const page = pagination?.page || 1;
  const limit = pagination?.limit || 20;
  const offset = (page - 1) * limit;

  console.log(`🎥 Resolviendo lista de videos para tenant ${tenantId} (página ${page}, límite ${limit})`);

  try {
    let sql = `
      SELECT
        v.id, v.slug, v.titulo, v.descripcion, v.video_url, v.video_id, v.thumbnail,
        v.duracion_segundos, v.categoria_id, v.tags, v.traducciones,
        v.publicado, v.destacado, v.vistas, v.fecha_publicacion, v.orden,
        c.slug as categoria_slug,
        c.nombre as categoria_nombre
      FROM videos v
      LEFT JOIN categorias_contenido c ON v.categoria_id = c.id
      WHERE v.tenant_id = $1
    `;
    const queryParams: any[] = [tenantId];
    let paramIndex = 2;

    if (filters?.publicado !== false) {
      sql += ' AND v.publicado = true';
    }

    if (filters?.categoria_id) {
      sql += ` AND v.categoria_id = $${paramIndex++}`;
      queryParams.push(filters.categoria_id);
    }

    if (filters?.categoria_slug) {
      sql += ` AND c.slug = $${paramIndex++}`;
      queryParams.push(filters.categoria_slug);
    }

    if (filters?.destacado) {
      sql += ' AND v.destacado = true';
    }

    // Filtro por autor (para videos del asesor)
    if (filters?.autor_id) {
      sql += ` AND v.autor_id = $${paramIndex++}`;
      queryParams.push(filters.autor_id);
    }

    // Excluir un video específico (para relacionados)
    if (filters?.exclude_id) {
      sql += ` AND v.id != $${paramIndex++}`;
      queryParams.push(filters.exclude_id);
    }

    sql += ` ORDER BY v.orden ASC, v.fecha_publicacion DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);

    const result = await query(sql, queryParams);
    const idioma = normalizeLanguage(params.idioma);
    const camposTraducibles = getTranslatableFields('videos');

    const videos = result.rows.map(row => {
      // Parsear traducciones
      const traducciones = typeof row.traducciones === 'string'
        ? JSON.parse(row.traducciones || '{}')
        : (row.traducciones || {});

      // Aplicar traducciones
      const rowTraducido = resolveTranslatedObject(
        { ...row, traducciones },
        camposTraducibles,
        idioma
      );

      return {
        id: row.id,
        videoId: row.video_id || row.id,
        slug: row.slug,
        titulo: rowTraducido.titulo,
        title: rowTraducido.titulo,
        descripcion: rowTraducido.descripcion,
        description: rowTraducido.descripcion,
        video_url: row.video_url,
        url: row.video_url,
        thumbnail_url: row.thumbnail,
        thumbnail: row.thumbnail,
        duracion: row.duracion_segundos,
        duration: row.duracion_segundos,
        vistas: row.vistas || 0,
        views: row.vistas || 0,
        categoria_id: row.categoria_id,
        categoria_slug: row.categoria_slug || 'general',
        categoria_nombre: row.categoria_nombre || 'General',
        fecha_publicacion: row.fecha_publicacion,
        destacado: row.destacado,
        tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []),
        traducciones,
      };
    });

    console.log(`✅ Videos resueltos: ${videos.length} videos encontrados (idioma: ${idioma})`);
    return videos;
  } catch (error: any) {
    console.error('❌ Error resolviendo lista videos:', error);
    return [];
  }
}

/**
 * Resuelve video single por ID o slug
 * Usa la tabla real: videos
 * Soporta búsqueda por slug traducido (slug_traducciones)
 */
async function resolveVideoSingle(params: DynamicDataParams): Promise<any | null> {
  const { tenantId, id, filters } = params;
  const videoId = id || filters?.id || filters?.slug;
  const idioma = normalizeLanguage(params.idioma);

  if (!videoId) {
    return null;
  }

  try {
    // Construir condición de búsqueda con soporte de traducciones
    const slugCondition = buildSlugSearchCondition('v.slug', '$1', idioma);

    const result = await query(
      `SELECT
        v.id, v.slug, v.slug_traducciones, v.titulo, v.descripcion, v.video_url, v.video_id, v.thumbnail,
        v.duracion_segundos, v.categoria_id, v.tags, v.traducciones,
        v.publicado, v.destacado, v.vistas, v.fecha_publicacion,
        c.slug as categoria_slug,
        c.nombre as categoria_nombre
      FROM videos v
      LEFT JOIN categorias_contenido c ON v.categoria_id = c.id
      WHERE v.tenant_id = $2 AND v.publicado = true AND (v.id::text = $1 OR ${slugCondition})
      LIMIT 1`,
      [videoId, tenantId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const camposTraducibles = getTranslatableFields('videos');

    // Parsear traducciones
    const traducciones = typeof row.traducciones === 'string'
      ? JSON.parse(row.traducciones || '{}')
      : (row.traducciones || {});

    // Aplicar traducciones al contenido
    const rowTraducido = resolveTranslatedObject(
      { ...row, traducciones },
      camposTraducibles,
      idioma
    );

    return {
      id: row.id,
      videoId: row.video_id || row.id,
      slug: row.slug,
      slug_traducciones: typeof row.slug_traducciones === 'string'
        ? JSON.parse(row.slug_traducciones || '{}')
        : (row.slug_traducciones || {}),
      titulo: rowTraducido.titulo,
      title: rowTraducido.titulo,
      descripcion: rowTraducido.descripcion,
      description: rowTraducido.descripcion,
      video_url: row.video_url,
      url: row.video_url,
      thumbnail_url: row.thumbnail,
      thumbnail: row.thumbnail,
      duracion: row.duracion_segundos,
      duration: row.duracion_segundos,
      vistas: row.vistas || 0,
      views: row.vistas || 0,
      categoria_id: row.categoria_id,
      categoria_slug: row.categoria_slug || 'general',
      categoria_nombre: row.categoria_nombre || 'General',
      fecha_publicacion: row.fecha_publicacion,
      destacado: row.destacado,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []),
      traducciones,
    };
  } catch (error: any) {
    console.error('Error resolviendo video single:', error);
    return null;
  }
}

/**
 * Resuelve lista de artículos
 * Usa la tabla real: articulos
 */
async function resolveListaArticulos(params: DynamicDataParams): Promise<any[]> {
  const { tenantId, filters, pagination } = params;
  const page = pagination?.page || 1;
  const limit = pagination?.limit || 20;
  const offset = (page - 1) * limit;

  console.log(`📝 Resolviendo lista de artículos para tenant ${tenantId} (página ${page}, límite ${limit})`);

  try {
    let sql = `
      SELECT
        a.id, a.slug, a.titulo, a.extracto, a.contenido, a.imagen_principal, a.imagenes,
        a.autor_id, a.autor_nombre, a.autor_foto, a.categoria_id,
        a.meta_titulo, a.meta_descripcion, a.tags, a.traducciones,
        a.publicado, a.destacado, a.vistas, a.fecha_publicacion,
        c.slug as categoria_slug,
        c.nombre as categoria_nombre
      FROM articulos a
      LEFT JOIN categorias_contenido c ON a.categoria_id = c.id
      WHERE a.tenant_id = $1
    `;
    const queryParams: any[] = [tenantId];
    let paramIndex = 2;

    if (filters?.publicado !== false) {
      sql += ' AND a.publicado = true';
    }

    if (filters?.categoria_id) {
      sql += ` AND a.categoria_id = $${paramIndex++}`;
      queryParams.push(filters.categoria_id);
    }

    if (filters?.categoria_slug) {
      sql += ` AND c.slug = $${paramIndex++}`;
      queryParams.push(filters.categoria_slug);
    }

    if (filters?.destacado) {
      sql += ' AND a.destacado = true';
    }

    // Filtro por autor (para artículos del asesor)
    if (filters?.autor_id) {
      sql += ` AND a.autor_id = $${paramIndex++}`;
      queryParams.push(filters.autor_id);
    }

    // Excluir un artículo específico (para relacionados)
    if (filters?.exclude_id) {
      sql += ` AND a.id != $${paramIndex++}`;
      queryParams.push(filters.exclude_id);
    }

    sql += ` ORDER BY a.fecha_publicacion DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);

    const result = await query(sql, queryParams);
    const idioma = normalizeLanguage(params.idioma);
    const camposTraducibles = getTranslatableFields('articulos');

    const articulos = result.rows.map(row => {
      // Parsear traducciones
      const traducciones = typeof row.traducciones === 'string'
        ? JSON.parse(row.traducciones || '{}')
        : (row.traducciones || {});

      // Aplicar traducciones
      const rowTraducido = resolveTranslatedObject(
        { ...row, traducciones },
        camposTraducibles,
        idioma
      );

      return {
        id: row.id,
        slug: row.slug,
        titulo: rowTraducido.titulo,
        title: rowTraducido.titulo,
        extracto: rowTraducido.extracto,
        excerpt: rowTraducido.extracto,
        resumen: rowTraducido.extracto,
        contenido: rowTraducido.contenido,
        content: rowTraducido.contenido,
        imagen_principal: row.imagen_principal,
        featuredImage: row.imagen_principal,
        thumbnail_url: row.imagen_principal,
        imagenes: typeof row.imagenes === 'string' ? JSON.parse(row.imagenes) : (row.imagenes || []),
        autor_id: row.autor_id,
        autor_nombre: row.autor_nombre,
        autor_foto: row.autor_foto,
        autor: row.autor_nombre,
        author: row.autor_nombre,
        categoria_id: row.categoria_id,
        categoria_slug: row.categoria_slug || 'general',
        categoria_nombre: row.categoria_nombre || 'General',
        category: row.categoria_nombre || 'General',
        tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []),
        traducciones,
        publicado: row.publicado,
        destacado: row.destacado,
        vistas: row.vistas || 0,
        fecha_publicacion: row.fecha_publicacion,
        publishedAt: row.fecha_publicacion,
      };
    });

    console.log(`✅ Artículos resueltos: ${articulos.length} artículos encontrados (idioma: ${idioma})`);
    return articulos;
  } catch (error: any) {
    console.error('❌ Error resolviendo lista articulos:', error);
    return [];
  }
}

/**
 * Resuelve artículo single por ID o slug
 * Usa la tabla real: articulos
 * Soporta búsqueda por slug traducido (slug_traducciones)
 */
async function resolveArticuloSingle(params: DynamicDataParams): Promise<any | null> {
  const { tenantId, id, filters } = params;
  const articuloId = id || filters?.id || filters?.slug;
  const idioma = normalizeLanguage(params.idioma);

  if (!articuloId) {
    return null;
  }

  try {
    // Construir condición de búsqueda con soporte de traducciones
    const slugCondition = buildSlugSearchCondition('a.slug', '$1', idioma);

    const result = await query(
      `SELECT
        a.id, a.slug, a.slug_traducciones, a.titulo, a.extracto, a.contenido, a.imagen_principal, a.imagenes,
        a.autor_id, a.autor_nombre, a.autor_foto, a.categoria_id,
        a.meta_titulo, a.meta_descripcion, a.tags, a.traducciones,
        a.publicado, a.destacado, a.vistas, a.fecha_publicacion,
        c.slug as categoria_slug,
        c.nombre as categoria_nombre
      FROM articulos a
      LEFT JOIN categorias_contenido c ON a.categoria_id = c.id
      WHERE a.tenant_id = $2 AND a.publicado = true AND (a.id::text = $1 OR ${slugCondition})
      LIMIT 1`,
      [articuloId, tenantId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const camposTraducibles = getTranslatableFields('articulos');

    // Parsear traducciones
    const traducciones = typeof row.traducciones === 'string'
      ? JSON.parse(row.traducciones || '{}')
      : (row.traducciones || {});

    // Aplicar traducciones al contenido
    const rowTraducido = resolveTranslatedObject(
      { ...row, traducciones },
      camposTraducibles,
      idioma
    );

    return {
      id: row.id,
      slug: row.slug,
      slug_traducciones: typeof row.slug_traducciones === 'string'
        ? JSON.parse(row.slug_traducciones || '{}')
        : (row.slug_traducciones || {}),
      titulo: rowTraducido.titulo,
      title: rowTraducido.titulo,
      extracto: rowTraducido.extracto,
      excerpt: rowTraducido.extracto,
      resumen: rowTraducido.extracto,
      contenido: rowTraducido.contenido,
      content: rowTraducido.contenido,
      imagen_principal: row.imagen_principal,
      featuredImage: row.imagen_principal,
      thumbnail_url: row.imagen_principal,
      imagenes: typeof row.imagenes === 'string' ? JSON.parse(row.imagenes) : (row.imagenes || []),
      autor_id: row.autor_id,
      autor_nombre: row.autor_nombre,
      autor_foto: row.autor_foto,
      autor: row.autor_nombre,
      author: row.autor_nombre,
      categoria_id: row.categoria_id,
      categoria_slug: row.categoria_slug || 'general',
      categoria_nombre: row.categoria_nombre || 'General',
      category: row.categoria_nombre || 'General',
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []),
      traducciones,
      publicado: row.publicado,
      destacado: row.destacado,
      vistas: row.vistas || 0,
      fecha_publicacion: row.fecha_publicacion,
      publishedAt: row.fecha_publicacion,
    };
  } catch (error: any) {
    console.error('Error resolviendo articulo single:', error);
    return null;
  }
}

/**
 * Resuelve contenido de una categoría específica (videos, articulos o testimonios)
 * Devuelve un objeto con la información de la categoría y los items filtrados
 * Soporta búsqueda de categoría por slug traducido (slug_traducciones)
 * @param params - Parámetros de consulta (incluye filters.categoria_slug)
 * @param tipoContenido - 'video', 'articulo' o 'testimonio'
 */
async function resolveCategoriaContenido(
  params: DynamicDataParams,
  tipoContenido: 'video' | 'articulo' | 'testimonio'
): Promise<{ categoria: any; items: any[] }> {
  const { tenantId, filters, pagination } = params;
  const categoriaSlug = filters?.categoria_slug;
  const idioma = normalizeLanguage(params.idioma);

  console.log(`📂 Resolviendo categoría ${tipoContenido} slug=${categoriaSlug} para tenant ${tenantId} (idioma: ${idioma})`);

  // 1. Obtener información de la categoría (con soporte de slug traducido)
  let categoria = null;
  if (categoriaSlug) {
    try {
      // Construir condición de búsqueda con soporte de traducciones
      const slugCondition = buildSlugSearchCondition('slug', '$3', idioma);

      const catResult = await query(
        `SELECT id, nombre, slug, slug_traducciones, descripcion, traducciones, icono, color, orden
         FROM categorias_contenido
         WHERE tenant_id = $1 AND tipo = $2 AND ${slugCondition} AND activa = true
         LIMIT 1`,
        [tenantId, tipoContenido, categoriaSlug]
      );

      if (catResult.rows.length > 0) {
        const row = catResult.rows[0];
        const camposTraducibles = getTranslatableFields('categorias_contenido');

        // Parsear traducciones
        const traducciones = typeof row.traducciones === 'string'
          ? JSON.parse(row.traducciones || '{}')
          : (row.traducciones || {});

        // Aplicar traducciones
        const rowTraducido = resolveTranslatedObject(
          { ...row, traducciones },
          camposTraducibles,
          idioma
        );

        categoria = {
          ...row,
          nombre: rowTraducido.nombre,
          descripcion: rowTraducido.descripcion,
          slug_traducciones: typeof row.slug_traducciones === 'string'
            ? JSON.parse(row.slug_traducciones || '{}')
            : (row.slug_traducciones || {}),
          traducciones,
        };
        console.log(`   ✅ Categoría encontrada: ${categoria.nombre}`);
      } else {
        console.log(`   ⚠️ Categoría no encontrada: ${categoriaSlug}`);
      }
    } catch (error: any) {
      console.error(`   ❌ Error obteniendo categoría:`, error);
    }
  }

  // 2. Obtener los items filtrados por categoría
  // Si encontramos la categoría, usar su ID para filtrar (más preciso que slug)
  const paramsConCategoria = categoria
    ? { ...params, filters: { ...params.filters, categoria_id: categoria.id } }
    : params;

  let items: any[] = [];
  if (tipoContenido === 'video') {
    items = await resolveListaVideos(paramsConCategoria);
  } else if (tipoContenido === 'articulo') {
    items = await resolveListaArticulos(paramsConCategoria);
  } else if (tipoContenido === 'testimonio') {
    items = await resolveListaTestimonios(paramsConCategoria);
  }

  console.log(`   📋 Items encontrados: ${items.length}`);

  // 3. Devolver objeto con categoría e items
  return {
    categoria,
    items,
  };
}

/**
 * Resuelve lista de testimonios
 * Usa la tabla real: testimonios
 */
async function resolveListaTestimonios(params: DynamicDataParams): Promise<any[]> {
  const { tenantId, filters, pagination } = params;
  const page = pagination?.page || 1;
  const limit = pagination?.limit || 20;
  const offset = (page - 1) * limit;

  console.log(`💬 Resolviendo lista de testimonios para tenant ${tenantId}`);

  try {
    let sql = `
      SELECT
        t.id, t.slug, t.cliente_nombre, t.cliente_cargo, t.cliente_empresa,
        t.cliente_foto, t.cliente_ubicacion, t.titulo, t.contenido,
        t.rating, t.propiedad_id, t.categoria_id, t.traducciones,
        t.publicado, t.destacado, t.verificado, t.fuente, t.fecha,
        c.id as categoria_id_full,
        c.slug as categoria_slug,
        c.nombre as categoria_nombre,
        c.slug_traducciones as categoria_slug_traducciones
      FROM testimonios t
      LEFT JOIN categorias_contenido c ON t.categoria_id = c.id
      WHERE t.tenant_id = $1
    `;
    const queryParams: any[] = [tenantId];
    let paramIndex = 2;

    if (filters?.publicado !== false) {
      sql += ' AND t.publicado = true';
    }

    if (filters?.destacado !== undefined) {
      sql += ` AND t.destacado = $${paramIndex++}`;
      queryParams.push(filters.destacado);
    }

    if (filters?.categoria_id) {
      sql += ` AND t.categoria_id = $${paramIndex++}`;
      queryParams.push(filters.categoria_id);
    }

    if (filters?.categoria_slug) {
      sql += ` AND c.slug = $${paramIndex++}`;
      queryParams.push(filters.categoria_slug);
    }

    // Filtro por asesor (para testimonios del asesor)
    if (filters?.asesor_id) {
      sql += ` AND t.asesor_id = $${paramIndex++}`;
      queryParams.push(filters.asesor_id);
    }

    // Excluir un testimonio específico (para relacionados)
    if (filters?.exclude_id) {
      sql += ` AND t.id != $${paramIndex++}`;
      queryParams.push(filters.exclude_id);
    }

    sql += ` ORDER BY t.destacado DESC, t.fecha DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);

    const result = await query(sql, queryParams);
    const idioma = normalizeLanguage(params.idioma);
    console.log(`💬 [resolveListaTestimonios] Idioma recibido: ${params.idioma} → normalizado: ${idioma}`);
    const camposTraducibles = getTranslatableFields('testimonios');

    const testimonios = result.rows.map(row => {
      // Parsear traducciones
      const traducciones = typeof row.traducciones === 'string'
        ? JSON.parse(row.traducciones || '{}')
        : (row.traducciones || {});

      // Aplicar traducciones
      const rowTraducido = resolveTranslatedObject(
        { ...row, traducciones },
        camposTraducibles,
        idioma
      );

      // Parsear slug_traducciones de la categoría
      const categoriaSlugTraducciones = typeof row.categoria_slug_traducciones === 'string'
        ? JSON.parse(row.categoria_slug_traducciones || '{}')
        : (row.categoria_slug_traducciones || {});

      // Construir URL traducida del testimonio (relativa, sin prefijo de tenant)
      // Formato: /testimonios/{categoria_slug}/{testimonial_slug}
      // Con prefijo de idioma si no es español: /{idioma}/testimonios/{categoria_slug}/{testimonial_slug}
      // El frontend agregará el prefijo del tenant usando baseUrl
      let categoriaSlug = row.categoria_slug || 'general';
      if (idioma !== 'es' && categoriaSlugTraducciones[idioma]) {
        categoriaSlug = categoriaSlugTraducciones[idioma];
        console.log(`🔗 [resolveListaTestimonios] URL traducida: categoria slug ${row.categoria_slug} → ${categoriaSlug} (idioma: ${idioma})`);
      }
      
      const urlPath = `/testimonios/${categoriaSlug}/${row.slug}`;
      // URL relativa sin prefijo de tenant - el frontend la completará con baseUrl
      const url = idioma !== 'es' ? `/${idioma}${urlPath}` : urlPath;
      
      console.log(`🔗 [resolveListaTestimonios] URL construida para testimonio ${row.id}: ${url} (relativa, frontend agregará tenant)`);

      return {
        id: row.id,
        slug: row.slug,
        url, // URL ya construida y traducida
        // Campos normalizados para componentes
        nombre_cliente: row.cliente_nombre,
        client_name: row.cliente_nombre,
        cliente_nombre: row.cliente_nombre,
        cargo: row.cliente_cargo,
        empresa: row.cliente_empresa,
        ubicacion: row.cliente_ubicacion,
        client_location: row.cliente_ubicacion,
        foto_url: row.cliente_foto,
        client_avatar: row.cliente_foto,
        titulo: rowTraducido.titulo,
        testimonio: rowTraducido.contenido,
        full_testimonial: rowTraducido.contenido,
        contenido: rowTraducido.contenido,
        calificacion: row.rating,
        rating: row.rating,
        propiedad_id: row.propiedad_id,
        categoria_id: row.categoria_id,
        categoria_slug: row.categoria_slug,
        categoria_nombre: row.categoria_nombre,
        // Incluir objeto categoria completo con slug_traducciones
        categoria: row.categoria_id_full ? {
          id: row.categoria_id_full,
          slug: row.categoria_slug,
          nombre: row.categoria_nombre,
          slug_traducciones: categoriaSlugTraducciones,
        } : null,
        traducciones,
        publicado: row.publicado,
        destacado: row.destacado,
        verificado: row.verificado,
        client_verified: row.verificado,
        fuente: row.fuente,
        fecha: row.fecha,
      };
    });

    console.log(`✅ Testimonios resueltos: ${testimonios.length} encontrados (idioma: ${idioma})`);
    return testimonios;
  } catch (error: any) {
    console.error('❌ Error resolviendo lista testimonios:', error);
    return [];
  }
}

/**
 * Resuelve testimonio single por ID o slug
 * Usa la tabla real: testimonios
 * Soporta búsqueda por slug traducido (slug_traducciones)
 */
async function resolveTestimonioSingle(params: DynamicDataParams): Promise<any | null> {
  const { tenantId, id, filters } = params;
  const testimonioId = id || filters?.id || filters?.slug;
  const idioma = normalizeLanguage(params.idioma);

  if (!testimonioId) {
    return null;
  }

  try {
    // Construir condición de búsqueda con soporte de traducciones
    const slugCondition = buildSlugSearchCondition('t.slug', '$1', idioma);

    const result = await query(
      `SELECT
        t.id, t.slug, t.slug_traducciones, t.cliente_nombre, t.cliente_cargo, t.cliente_empresa,
        t.cliente_foto, t.cliente_ubicacion, t.titulo, t.contenido,
        t.rating, t.propiedad_id, t.categoria_id, t.traducciones,
        t.publicado, t.destacado, t.verificado, t.fuente, t.fecha,
        c.id as categoria_id_full,
        c.slug as categoria_slug,
        c.nombre as categoria_nombre,
        c.slug_traducciones as categoria_slug_traducciones
      FROM testimonios t
      LEFT JOIN categorias_contenido c ON t.categoria_id = c.id
      WHERE t.tenant_id = $2 AND t.publicado = true AND (t.id::text = $1 OR ${slugCondition})
      LIMIT 1`,
      [testimonioId, tenantId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const camposTraducibles = getTranslatableFields('testimonios');

    // Parsear traducciones
    const traducciones = typeof row.traducciones === 'string'
      ? JSON.parse(row.traducciones || '{}')
      : (row.traducciones || {});

    // Aplicar traducciones al contenido
    const rowTraducido = resolveTranslatedObject(
      { ...row, traducciones },
      camposTraducibles,
      idioma
    );

    // Parsear slug_traducciones de la categoría
    const categoriaSlugTraducciones = typeof row.categoria_slug_traducciones === 'string'
      ? JSON.parse(row.categoria_slug_traducciones || '{}')
      : (row.categoria_slug_traducciones || {});

    // Construir URL traducida del testimonio (relativa, sin prefijo de tenant)
    // El frontend agregará el prefijo del tenant usando baseUrl
    let categoriaSlug = row.categoria_slug || 'general';
    if (idioma !== 'es' && categoriaSlugTraducciones[idioma]) {
      categoriaSlug = categoriaSlugTraducciones[idioma];
      console.log(`🔗 [resolveTestimonioSingle] URL traducida: categoria slug ${row.categoria_slug} → ${categoriaSlug} (idioma: ${idioma})`);
    }
    
    const urlPath = `/testimonios/${categoriaSlug}/${row.slug}`;
    // URL relativa sin prefijo de tenant - el frontend la completará con baseUrl
    const url = idioma !== 'es' ? `/${idioma}${urlPath}` : urlPath;
    
    console.log(`🔗 [resolveTestimonioSingle] URL construida para testimonio ${row.id}: ${url} (relativa, frontend agregará tenant)`);

    return {
      id: row.id,
      slug: row.slug,
      slug_traducciones: typeof row.slug_traducciones === 'string'
        ? JSON.parse(row.slug_traducciones || '{}')
        : (row.slug_traducciones || {}),
      url, // URL ya construida y traducida
      nombre_cliente: row.cliente_nombre,
      client_name: row.cliente_nombre,
      cliente_nombre: row.cliente_nombre,
      cargo: row.cliente_cargo,
      empresa: row.cliente_empresa,
      ubicacion: row.cliente_ubicacion,
      client_location: row.cliente_ubicacion,
      foto_url: row.cliente_foto,
      client_avatar: row.cliente_foto,
      titulo: rowTraducido.titulo,
      testimonio: rowTraducido.contenido,
      full_testimonial: rowTraducido.contenido,
      contenido: rowTraducido.contenido,
      calificacion: row.rating,
      rating: row.rating,
      propiedad_id: row.propiedad_id,
      categoria_id: row.categoria_id,
      categoria_slug: row.categoria_slug,
      categoria_nombre: row.categoria_nombre,
      // Incluir objeto categoria completo con slug_traducciones
      categoria: row.categoria_id_full ? {
        id: row.categoria_id_full,
        slug: row.categoria_slug,
        nombre: row.categoria_nombre,
        slug_traducciones: categoriaSlugTraducciones,
      } : null,
      traducciones,
      publicado: row.publicado,
      destacado: row.destacado,
      verificado: row.verificado,
      client_verified: row.verificado,
      fuente: row.fuente,
      fecha: row.fecha,
    };
  } catch (error: any) {
    console.error('Error resolviendo testimonio single:', error);
    return null;
  }
}

/**
 * Resuelve lista de FAQs
 * Usa la tabla real: faqs
 */
async function resolveListaFAQs(params: DynamicDataParams): Promise<any[]> {
  const { tenantId, filters, pagination } = params;
  const page = pagination?.page || 1;
  const limit = pagination?.limit || 50;
  const offset = (page - 1) * limit;

  console.log(`❓ Resolviendo lista de FAQs para tenant ${tenantId}`);

  try {
    let sql = `
      SELECT
        f.id, f.pregunta, f.respuesta, f.contexto, f.categoria_id,
        f.traducciones, f.publicado, f.destacada, f.orden, f.vistas,
        c.slug as categoria_slug,
        c.nombre as categoria_nombre
      FROM faqs f
      LEFT JOIN categorias_contenido c ON f.categoria_id = c.id
      WHERE f.tenant_id = $1
    `;
    const queryParams: any[] = [tenantId];
    let paramIndex = 2;

    if (filters?.publicado !== false) {
      sql += ' AND f.publicado = true';
    }

    if (filters?.contexto) {
      sql += ` AND f.contexto = $${paramIndex++}`;
      queryParams.push(filters.contexto);
    }

    if (filters?.categoria_id) {
      sql += ` AND f.categoria_id = $${paramIndex++}`;
      queryParams.push(filters.categoria_id);
    }

    if (filters?.categoria_slug) {
      sql += ` AND c.slug = $${paramIndex++}`;
      queryParams.push(filters.categoria_slug);
    }

    sql += ` ORDER BY f.orden ASC, f.pregunta ASC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);

    const result = await query(sql, queryParams);
    const idioma = normalizeLanguage(params.idioma);
    const camposTraducibles = getTranslatableFields('faqs');

    const faqs = result.rows.map(row => {
      // Parsear traducciones
      const traducciones = typeof row.traducciones === 'string'
        ? JSON.parse(row.traducciones || '{}')
        : (row.traducciones || {});

      // Aplicar traducciones
      const rowTraducido = resolveTranslatedObject(
        { ...row, traducciones },
        camposTraducibles,
        idioma
      );

      return {
        id: row.id,
        pregunta: rowTraducido.pregunta,
        question: rowTraducido.pregunta,
        respuesta: rowTraducido.respuesta,
        answer: rowTraducido.respuesta,
        contexto: row.contexto,
        categoria: row.contexto, // alias para compatibilidad
        categoria_id: row.categoria_id,
        categoria_slug: row.categoria_slug,
        categoria_nombre: row.categoria_nombre,
        traducciones,
        publicado: row.publicado,
        destacada: row.destacada,
        orden: row.orden,
        vistas: row.vistas || 0,
      };
    });

    console.log(`✅ FAQs resueltas: ${faqs.length} encontradas`);
    return faqs;
  } catch (error: any) {
    console.error('❌ Error resolviendo lista FAQs:', error);
    return [];
  }
}

/**
 * Resuelve FAQ single por ID o slug
 * Usa la tabla real: faqs
 * Soporta búsqueda por slug traducido (slug_traducciones)
 */
async function resolveFAQSingle(params: DynamicDataParams): Promise<any | null> {
  const { tenantId, id, filters } = params;
  const faqId = id || filters?.id || filters?.slug;
  const idioma = normalizeLanguage(params.idioma);

  if (!faqId) {
    return null;
  }

  try {
    // Construir condición de búsqueda con soporte de traducciones
    const slugCondition = buildSlugSearchCondition('f.slug', '$1', idioma);

    const result = await query(
      `SELECT
        f.id, f.slug, f.slug_traducciones, f.pregunta, f.respuesta, f.contexto, f.categoria_id,
        f.traducciones, f.publicado, f.destacada, f.orden, f.vistas,
        c.slug as categoria_slug,
        c.nombre as categoria_nombre
      FROM faqs f
      LEFT JOIN categorias_contenido c ON f.categoria_id = c.id
      WHERE f.tenant_id = $2 AND f.publicado = true AND (f.id::text = $1 OR ${slugCondition})
      LIMIT 1`,
      [faqId, tenantId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const camposTraducibles = getTranslatableFields('faqs');

    // Parsear traducciones
    const traducciones = typeof row.traducciones === 'string'
      ? JSON.parse(row.traducciones || '{}')
      : (row.traducciones || {});

    // Aplicar traducciones al contenido
    const rowTraducido = resolveTranslatedObject(
      { ...row, traducciones },
      camposTraducibles,
      idioma
    );

    return {
      id: row.id,
      slug: row.slug,
      slug_traducciones: typeof row.slug_traducciones === 'string'
        ? JSON.parse(row.slug_traducciones || '{}')
        : (row.slug_traducciones || {}),
      pregunta: rowTraducido.pregunta,
      question: rowTraducido.pregunta,
      respuesta: rowTraducido.respuesta,
      answer: rowTraducido.respuesta,
      contexto: row.contexto,
      categoria: row.contexto,
      categoria_id: row.categoria_id,
      categoria_slug: row.categoria_slug,
      categoria_nombre: row.categoria_nombre,
      traducciones,
      publicado: row.publicado,
      destacada: row.destacada,
      orden: row.orden,
      vistas: row.vistas || 0,
    };
  } catch (error: any) {
    console.error('Error resolviendo FAQ single:', error);
    return null;
  }
}

/**
 * Resuelve lista de asesores desde perfiles_asesor + usuarios + equipos
 */
async function resolveListaAsesores(params: DynamicDataParams): Promise<any[]> {
  const { tenantId, filters, pagination } = params;
  const page = pagination?.page || 1;
  const limit = pagination?.limit || 20;
  const offset = (page - 1) * limit;

  console.log(`👥 Resolviendo lista de asesores para tenant ${tenantId}`);

  try {
    // Query principal con conteo de propiedades activas
    let sql = `
      SELECT
        pa.id,
        pa.slug,
        pa.titulo_profesional as cargo,
        pa.biografia,
        pa.foto_url,
        pa.video_presentacion_url,
        pa.especialidades,
        pa.idiomas,
        pa.zonas,
        pa.tipos_propiedad,
        pa.experiencia_anos,
        pa.rango,
        pa.fecha_inicio,
        pa.split_comision,
        pa.meta_mensual,
        pa.stats,
        pa.redes_sociales,
        pa.whatsapp,
        pa.telefono_directo,
        pa.certificaciones,
        pa.logros,
        pa.activo,
        pa.destacado,
        pa.visible_en_web,
        pa.orden,
        pa.traducciones,
        pa.metadata,
        -- Datos del usuario
        u.id as usuario_id,
        u.nombre,
        u.apellido,
        u.email,
        u.telefono,
        u.avatar_url,
        -- Datos del equipo
        e.id as equipo_id,
        e.nombre as equipo_nombre,
        e.slug as equipo_slug,
        e.zona_principal as equipo_zona,
        -- Conteo real de propiedades activas (por perfil_asesor_id o agente_id=usuario_id)
        COALESCE(prop_count.total, 0)::integer as propiedades_activas_count
      FROM perfiles_asesor pa
      INNER JOIN usuarios u ON pa.usuario_id = u.id
      LEFT JOIN equipos e ON pa.equipo_id = e.id
      LEFT JOIN (
        SELECT
          COALESCE(perfil_asesor_id, agente_id) as asesor_ref,
          COUNT(*) as total
        FROM propiedades
        WHERE tenant_id = $1 AND activo = true
        GROUP BY COALESCE(perfil_asesor_id, agente_id)
      ) prop_count ON prop_count.asesor_ref = pa.id OR prop_count.asesor_ref = u.id
      WHERE pa.tenant_id = $1
    `;
    const queryParams: any[] = [tenantId];
    let paramIndex = 2;

    if (filters?.activo !== false) {
      sql += ' AND pa.activo = true AND pa.visible_en_web = true';
    }

    if (filters?.destacado !== undefined) {
      sql += ` AND pa.destacado = $${paramIndex++}`;
      queryParams.push(filters.destacado);
    }

    if (filters?.equipo_id) {
      sql += ` AND pa.equipo_id = $${paramIndex++}`;
      queryParams.push(filters.equipo_id);
    }

    if (filters?.rango) {
      sql += ` AND pa.rango = $${paramIndex++}`;
      queryParams.push(filters.rango);
    }

    sql += ` ORDER BY pa.destacado DESC, pa.orden ASC, u.nombre ASC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);

    const result = await query(sql, queryParams);

    const asesores = result.rows.map(row => {
      // Extraer stats para propiedades_vendidas (compatibilidad)
      const stats = typeof row.stats === 'string' ? JSON.parse(row.stats) : (row.stats || {});

      // Usar el conteo real de propiedades activas
      const propiedadesActivas = row.propiedades_activas_count || stats.propiedades_activas || 0;

      // Construir URL para el single del asesor
      const url = `/asesores/${row.slug}`;

      return {
        id: row.id,
        slug: row.slug,
        url, // URL al perfil del asesor
        nombre: row.nombre,
        apellido: row.apellido,
        nombre_completo: `${row.nombre} ${row.apellido}`.trim(),
        cargo: row.cargo || 'Asesor Inmobiliario',
        biografia: row.biografia,
        email: row.email,
        telefono: row.telefono_directo || row.telefono,
        whatsapp: row.whatsapp,
        foto_url: row.foto_url || row.avatar_url,
        video_presentacion_url: row.video_presentacion_url,
        redes_sociales: typeof row.redes_sociales === 'string' ? JSON.parse(row.redes_sociales) : row.redes_sociales,
        especialidades: typeof row.especialidades === 'string' ? JSON.parse(row.especialidades) : row.especialidades,
        idiomas: typeof row.idiomas === 'string' ? JSON.parse(row.idiomas) : row.idiomas,
        zonas: typeof row.zonas === 'string' ? JSON.parse(row.zonas) : row.zonas,
        tipos_propiedad: typeof row.tipos_propiedad === 'string' ? JSON.parse(row.tipos_propiedad) : row.tipos_propiedad,
        experiencia_anos: row.experiencia_anos,
        rango: row.rango,
        fecha_inicio: row.fecha_inicio,
        split_comision: row.split_comision,
        meta_mensual: row.meta_mensual,
        stats: stats,
        propiedades_vendidas: stats.propiedades_vendidas || 0,
        propiedades_activas: propiedadesActivas,
        volumen_ventas: stats.volumen_ventas || 0,
        calificacion_promedio: stats.calificacion_promedio || 0,
        total_resenas: stats.total_resenas || 0,
        certificaciones: typeof row.certificaciones === 'string' ? JSON.parse(row.certificaciones) : row.certificaciones,
        logros: typeof row.logros === 'string' ? JSON.parse(row.logros) : row.logros,
        activo: row.activo,
        destacado: row.destacado,
        orden: row.orden,
        // Equipo
        equipo: row.equipo_id ? {
          id: row.equipo_id,
          nombre: row.equipo_nombre,
          slug: row.equipo_slug,
          zona: row.equipo_zona
        } : null,
        // Traducciones y metadata
        traducciones: typeof row.traducciones === 'string' ? JSON.parse(row.traducciones) : row.traducciones,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      };
    });

    console.log(`✅ Asesores resueltos: ${asesores.length} encontrados`);
    return asesores;
  } catch (error: any) {
    console.error('Error resolviendo lista asesores:', error);
    // Fallback a mock_asesores si la tabla real no existe
    return resolveListaAsesoresMock(params);
  }
}

/**
 * Fallback: Resuelve lista de asesores desde mock_asesores (compatibilidad)
 */
async function resolveListaAsesoresMock(params: DynamicDataParams): Promise<any[]> {
  const { tenantId, filters, pagination } = params;
  const page = pagination?.page || 1;
  const limit = pagination?.limit || 20;
  const offset = (page - 1) * limit;

  try {
    let sql = `
      SELECT
        id, nombre, apellido, cargo, biografia, email, telefono, foto_url,
        redes_sociales, especialidades, experiencia_anos, propiedades_vendidas,
        logros, metadata, traducciones, activo, destacado, orden
      FROM mock_asesores
      WHERE tenant_id = $1
    `;
    const queryParams: any[] = [tenantId];
    let paramIndex = 2;

    if (filters?.activo !== false) {
      sql += ' AND activo = true';
    }

    if (filters?.destacado !== undefined) {
      sql += ` AND destacado = $${paramIndex++}`;
      queryParams.push(filters.destacado);
    }

    sql += ` ORDER BY destacado DESC, orden ASC, nombre ASC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);

    const result = await query(sql, queryParams);
    return result.rows.map(row => ({
      ...row,
      redes_sociales: typeof row.redes_sociales === 'string' ? JSON.parse(row.redes_sociales) : row.redes_sociales,
      especialidades: typeof row.especialidades === 'string' ? JSON.parse(row.especialidades) : row.especialidades,
      logros: typeof row.logros === 'string' ? JSON.parse(row.logros) : row.logros,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      traducciones: typeof row.traducciones === 'string' ? JSON.parse(row.traducciones) : row.traducciones,
    }));
  } catch (error: any) {
    console.error('Error resolviendo lista asesores mock:', error);
    return [];
  }
}

/**
 * Resuelve asesor single por ID o slug desde perfiles_asesor + usuarios + equipos
 */
async function resolveAsesorSingle(params: DynamicDataParams): Promise<any | null> {
  const { tenantId, id, slug, filters } = params;

  // Soportar slug desde filters o directamente
  const asesorSlug = slug || filters?.slug;
  const asesorId = id || filters?.id;

  if (!asesorId && !asesorSlug) {
    return null;
  }

  console.log(`👤 Resolviendo asesor single: ${asesorId || asesorSlug}`);

  try {
    // Determinar si buscar por id o slug
    const searchValue = asesorId || asesorSlug;
    const isUUID = searchValue && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchValue);
    const searchField = isUUID ? 'pa.id' : 'pa.slug';

    const result = await query(
      `SELECT
        pa.id,
        pa.slug,
        pa.titulo_profesional as cargo,
        pa.biografia,
        pa.foto_url,
        pa.video_presentacion_url,
        pa.especialidades,
        pa.idiomas,
        pa.zonas,
        pa.tipos_propiedad,
        pa.experiencia_anos,
        pa.rango,
        pa.fecha_inicio,
        pa.split_comision,
        pa.meta_mensual,
        pa.stats,
        pa.redes_sociales,
        pa.whatsapp,
        pa.telefono_directo,
        pa.certificaciones,
        pa.logros,
        pa.activo,
        pa.destacado,
        pa.visible_en_web,
        pa.orden,
        pa.traducciones,
        pa.metadata,
        -- Datos del usuario
        u.id as usuario_id,
        u.nombre,
        u.apellido,
        u.email,
        u.telefono,
        u.avatar_url,
        -- Datos del equipo
        e.id as equipo_id,
        e.nombre as equipo_nombre,
        e.slug as equipo_slug,
        e.zona_principal as equipo_zona,
        e.descripcion as equipo_descripcion,
        -- Conteo real de propiedades activas
        COALESCE(prop_count.total, 0)::integer as propiedades_activas_count
      FROM perfiles_asesor pa
      INNER JOIN usuarios u ON pa.usuario_id = u.id
      LEFT JOIN equipos e ON pa.equipo_id = e.id
      LEFT JOIN (
        SELECT
          COALESCE(perfil_asesor_id, agente_id) as asesor_ref,
          COUNT(*) as total
        FROM propiedades
        WHERE tenant_id = $2 AND activo = true
        GROUP BY COALESCE(perfil_asesor_id, agente_id)
      ) prop_count ON prop_count.asesor_ref = pa.id OR prop_count.asesor_ref = u.id
      WHERE (${searchField} = $1 OR pa.slug = $1) AND pa.tenant_id = $2 AND pa.activo = true
      LIMIT 1`,
      [searchValue, tenantId]
    );

    if (result.rows.length === 0) {
      console.log(`⚠️ Asesor no encontrado en perfiles_asesor, intentando mock...`);
      // Fallback a mock_asesores
      return resolveAsesorSingleMock(params);
    }

    const row = result.rows[0];
    const stats = typeof row.stats === 'string' ? JSON.parse(row.stats) : (row.stats || {});

    // Usar el conteo real de propiedades activas
    const propiedadesActivas = row.propiedades_activas_count || stats.propiedades_activas || 0;

    // Construir URL del perfil
    const url = `/asesores/${row.slug}`;

    console.log(`✅ Asesor encontrado: ${row.nombre} ${row.apellido} (${row.slug})`);

    return {
      id: row.id,
      slug: row.slug,
      url, // URL al perfil del asesor
      usuario_id: row.usuario_id,
      nombre: row.nombre,
      apellido: row.apellido,
      nombre_completo: `${row.nombre} ${row.apellido}`.trim(),
      cargo: row.cargo || 'Asesor Inmobiliario',
      biografia: row.biografia,
      email: row.email,
      telefono: row.telefono_directo || row.telefono,
      whatsapp: row.whatsapp,
      foto_url: row.foto_url || row.avatar_url,
      video_presentacion_url: row.video_presentacion_url,
      redes_sociales: typeof row.redes_sociales === 'string' ? JSON.parse(row.redes_sociales) : row.redes_sociales,
      especialidades: typeof row.especialidades === 'string' ? JSON.parse(row.especialidades) : row.especialidades,
      idiomas: typeof row.idiomas === 'string' ? JSON.parse(row.idiomas) : row.idiomas,
      zonas: typeof row.zonas === 'string' ? JSON.parse(row.zonas) : row.zonas,
      tipos_propiedad: typeof row.tipos_propiedad === 'string' ? JSON.parse(row.tipos_propiedad) : row.tipos_propiedad,
      experiencia_anos: row.experiencia_anos,
      rango: row.rango,
      fecha_inicio: row.fecha_inicio,
      split_comision: row.split_comision,
      meta_mensual: row.meta_mensual,
      stats: stats,
      propiedades_vendidas: stats.propiedades_vendidas || 0,
      propiedades_activas: propiedadesActivas,
      volumen_ventas: stats.volumen_ventas || 0,
      calificacion_promedio: stats.calificacion_promedio || 0,
      total_resenas: stats.total_resenas || 0,
      certificaciones: typeof row.certificaciones === 'string' ? JSON.parse(row.certificaciones) : row.certificaciones,
      logros: typeof row.logros === 'string' ? JSON.parse(row.logros) : row.logros,
      activo: row.activo,
      destacado: row.destacado,
      orden: row.orden,
      // Equipo
      equipo: row.equipo_id ? {
        id: row.equipo_id,
        nombre: row.equipo_nombre,
        slug: row.equipo_slug,
        zona: row.equipo_zona,
        descripcion: row.equipo_descripcion
      } : null,
      // Traducciones y metadata
      traducciones: typeof row.traducciones === 'string' ? JSON.parse(row.traducciones) : row.traducciones,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
    };
  } catch (error: any) {
    console.error('Error resolviendo asesor single:', error);
    // Fallback a mock_asesores
    return resolveAsesorSingleMock(params);
  }
}

/**
 * Fallback: Resuelve asesor single desde mock_asesores (compatibilidad)
 */
async function resolveAsesorSingleMock(params: DynamicDataParams): Promise<any | null> {
  const { tenantId, id } = params;

  if (!id) {
    return null;
  }

  try {
    const result = await query(
      `SELECT
        id, nombre, apellido, cargo, biografia, email, telefono, foto_url,
        redes_sociales, especialidades, experiencia_anos, propiedades_vendidas,
        logros, metadata, traducciones, activo, destacado, orden
      FROM mock_asesores
      WHERE id = $1 AND tenant_id = $2 AND activo = true
      LIMIT 1`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      ...row,
      redes_sociales: typeof row.redes_sociales === 'string' ? JSON.parse(row.redes_sociales) : row.redes_sociales,
      especialidades: typeof row.especialidades === 'string' ? JSON.parse(row.especialidades) : row.especialidades,
      logros: typeof row.logros === 'string' ? JSON.parse(row.logros) : row.logros,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      traducciones: typeof row.traducciones === 'string' ? JSON.parse(row.traducciones) : row.traducciones,
    };
  } catch (error: any) {
    console.error('Error resolviendo asesor single mock:', error);
    return null;
  }
}

/**
 * Resuelve ubicaciones populares
 * Usa datos mock de carruseles o agrupa datos de propiedades si existen
 */
async function resolvePopularLocations(params: DynamicDataParams): Promise<any[]> {
  const { tenantId, filters, pagination } = params;
  const page = pagination?.page || 1;
  const limit = pagination?.limit || 12;
  const offset = (page - 1) * limit;
  
  try {
    // Primero intentar obtener ubicaciones desde carruseles mock (tienen configuraciones de zonas)
    try {
      const carruselesResult = await query(
        `SELECT nombre, slug, configuracion, propiedades_ids
         FROM mock_carruseles_propiedades
         WHERE tenant_id = $1 AND activo = true
         ORDER BY nombre ASC
         LIMIT $2 OFFSET $3`,
        [tenantId, limit, offset]
      );
      
      if (carruselesResult.rows.length > 0) {
        return carruselesResult.rows.map((row: any) => {
          const config = typeof row.configuracion === 'string' 
            ? JSON.parse(row.configuracion) 
            : row.configuracion;
          
          // Extraer zonas de la configuración
          const zonas = config.zonas || [];
          const ubicacion = zonas.length > 0 ? zonas[0] : row.nombre;
          
          return {
            id: row.slug || row.nombre,
            title: row.nombre,
            nombre: row.nombre,
            slug: row.slug,
            count: Array.isArray(row.propiedades_ids) ? row.propiedades_ids.length : 0,
            propertyCount: Array.isArray(row.propiedades_ids) ? row.propiedades_ids.length : 0,
            minPrice: config.precio_min || config.precio_max || null,
            precio_minimo: config.precio_min || config.precio_max || null,
            url: `/propiedades?carrusel=${row.slug}`,
            image: null, // Se puede agregar imagen si se necesita
          };
        });
      }
    } catch (carruselError: any) {
      console.log('📋 No se pudieron obtener ubicaciones desde carruseles mock');
    }
    
    // Fallback: Intentar obtener desde tabla propiedades real si existe
    try {
      const hasRealTable = await query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'propiedades'
        )`
      );
      
      if (hasRealTable.rows[0]?.exists) {
        const sql = `
          SELECT 
            COALESCE(ubicacion, sector) as title,
            sector as nombre,
            COUNT(*) as "propertyCount",
            MIN(precio) as "minPrice"
          FROM propiedades
          WHERE tenant_id = $1 AND activa = true
          GROUP BY COALESCE(ubicacion, sector), sector
          HAVING COUNT(*) > 0
          ORDER BY COUNT(*) DESC
          LIMIT $2
        `;
        const result = await query(sql, [tenantId, limit]);
        
        if (result.rows.length > 0) {
          return result.rows.map((row: any) => ({
            id: row.nombre || row.title,
            title: row.title || row.nombre,
            nombre: row.nombre || row.title,
            count: parseInt(row.propertyCount) || 0,
            propertyCount: parseInt(row.propertyCount) || 0,
            minPrice: row.minPrice || null,
            precio_minimo: row.minPrice || null,
            url: `/propiedades?ubicacion=${encodeURIComponent(row.nombre || row.title)}`,
            image: null,
          }));
        }
      }
    } catch (tableError: any) {
      console.log('📋 Tabla propiedades no existe aún o error al consultar');
    }
    
    // Fallback final: Datos mock hardcodeados
    console.log(`📍 Resolviendo ubicaciones populares para tenant ${tenantId} (fallback mock)`);
    return [
      {
        id: 'puntacana',
        title: 'Punta Cana',
        nombre: 'Punta Cana',
        count: 45,
        propertyCount: 45,
        minPrice: 150000,
        precio_minimo: 150000,
        url: '/propiedades?ubicacion=puntacana',
        image: null,
      },
      {
        id: 'bavaro',
        title: 'Bávaro',
        nombre: 'Bávaro',
        count: 32,
        propertyCount: 32,
        minPrice: 120000,
        precio_minimo: 120000,
        url: '/propiedades?ubicacion=bavaro',
        image: null,
      },
      {
        id: 'santo-domingo',
        title: 'Santo Domingo',
        nombre: 'Santo Domingo',
        count: 78,
        propertyCount: 78,
        minPrice: 80000,
        precio_minimo: 80000,
        url: '/propiedades?ubicacion=santo-domingo',
        image: null,
      },
      {
        id: 'santiago',
        title: 'Santiago',
        nombre: 'Santiago',
        count: 28,
        propertyCount: 28,
        minPrice: 95000,
        precio_minimo: 95000,
        url: '/propiedades?ubicacion=santiago',
        image: null,
      },
    ].slice(0, limit);
  } catch (error: any) {
    console.error('Error resolviendo ubicaciones populares:', error);
    return [];
  }
}

