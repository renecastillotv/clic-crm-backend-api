/**
 * Servicio para gestionar propiedades del CRM inmobiliario
 */

import { query } from '../utils/db.js';
import { generateMultiLanguageSlugs, translatePropertyContent, generateShortDescription } from './translationService.js';
import { syncTagsForProperty } from './tagsSyncService.js';
import {
  registrarPropiedadCreada,
  registrarPropiedadEliminada,
  registrarPropiedadPublicada,
  registrarPropiedadDespublicada,
} from './usageTrackingService.js';

/**
 * Busca el perfil_asesor_id basado en el usuario_id (captador)
 * Un usuario puede tener un perfil de asesor vinculado
 */
async function getPerfilAsesorByUsuarioId(usuarioId: string | null): Promise<string | null> {
  if (!usuarioId) return null;

  const sql = `
    SELECT id FROM perfiles_asesor
    WHERE usuario_id = $1 AND activo = true
    LIMIT 1
  `;

  const result = await query(sql, [usuarioId]);
  return result.rows[0]?.id || null;
}

export interface Propiedad {
  id: string;
  tenant_id: string;
  titulo: string;
  codigo?: string;
  codigo_publico?: number; // Código secuencial automático para uso externo (1001, 1002, etc.)
  descripcion?: string;
  tipo: 'casa' | 'departamento' | 'terreno' | 'oficina' | 'local' | 'bodega';
  operacion: 'venta' | 'renta' | 'traspaso';
  precio?: number;
  precio_anterior?: number;
  moneda: string;
  pais?: string;
  provincia?: string;
  ciudad?: string;
  sector?: string;
  direccion?: string;
  latitud?: number;
  longitud?: number;
  mostrar_ubicacion_exacta?: boolean;
  ubicacion_id?: string;
  precio_min?: number;
  precio_max?: number;
  m2_min?: number;
  m2_max?: number;
  habitaciones_min?: number;
  habitaciones_max?: number;
  banos_min?: number;
  banos_max?: number;
  parqueos_min?: number;
  parqueos_max?: number;
  habitaciones?: number;
  banos?: number;
  medios_banos?: number;
  estacionamientos?: number;
  m2_construccion?: number;
  m2_terreno?: number;
  antiguedad?: number;
  pisos?: number;
  amenidades: string[];
  caracteristicas: Record<string, any>;
  imagen_principal?: string;
  imagenes: string[];
  video_url?: string;
  tour_virtual_url?: string;
  estado_propiedad: 'disponible' | 'reservada' | 'vendida' | 'rentada' | 'inactiva';
  destacada: boolean;
  exclusiva: boolean;
  is_project?: boolean;
  etiquetas: string[]; // Códigos de etiquetas del catálogo
  agente_id?: string;
  perfil_asesor_id?: string;
  propietario_id?: string;
  slug?: string;
  notas?: string;
  // SEO
  meta_title?: string;
  meta_description?: string;
  keywords?: string[];
  tags?: string[];
  // Documentos
  documentos?: Array<{
    id: string;
    tipo: string;
    nombre: string;
    url: string;
    fecha_subida?: string;
  }>;
  // Proyecto
  tipologias?: Array<any>;
  planes_pago?: any;
  etapas?: Array<any>;
  beneficios?: string[];
  garantias?: string[];
  // Relaciones adicionales
  captador_id?: string;
  cocaptadores_ids?: string[];
  desarrollador_id?: string;
  correo_reporte?: string;
  // Publicación
  publicada?: boolean;
  activo: boolean;
  short_description?: string;
  traducciones?: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Campos JOIN
  agente_nombre?: string;
  agente_apellido?: string;
  propietario_nombre?: string;
  propietario_apellido?: string;
}

export interface PropiedadFiltros {
  tipo?: string;
  operacion?: string;
  estado_propiedad?: string;
  ciudad?: string;
  precio_min?: number;
  precio_max?: number;
  habitaciones_min?: number;
  banos_min?: number;
  m2_min?: number;
  m2_max?: number;
  destacada?: boolean;
  busqueda?: string;
  agente_id?: string;
  include_red_global?: boolean;
  connect?: boolean;  // Filter for CLIC Connect properties
  page?: number;
  limit?: number;
}

export interface PropiedadesResponse {
  data: Propiedad[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Obtiene lista de propiedades con filtros y paginación
 */
export async function getPropiedades(
  tenantId: string,
  filtros: PropiedadFiltros = {}
): Promise<PropiedadesResponse> {
  const {
    tipo, operacion, estado_propiedad, ciudad,
    precio_min, precio_max, habitaciones_min, banos_min,
    m2_min, m2_max, destacada, busqueda, agente_id,
    include_red_global, connect,
    page = 1, limit = 24
  } = filtros;

  const offset = (page - 1) * limit;

  // Si include_red_global es true, incluir propiedades del tenant O propiedades marcadas como red_global
  let whereClause = include_red_global
    ? '(p.tenant_id = $1 OR p.red_global = true) AND p.activo = true'
    : 'p.tenant_id = $1 AND p.activo = true';
  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (tipo) {
    whereClause += ` AND p.tipo = $${paramIndex}`;
    params.push(tipo);
    paramIndex++;
  }

  if (operacion) {
    whereClause += ` AND p.operacion = $${paramIndex}`;
    params.push(operacion);
    paramIndex++;
  }

  if (estado_propiedad) {
    whereClause += ` AND p.estado_propiedad = $${paramIndex}`;
    params.push(estado_propiedad);
    paramIndex++;
  }

  if (ciudad) {
    whereClause += ` AND p.ciudad ILIKE $${paramIndex}`;
    params.push(`%${ciudad}%`);
    paramIndex++;
  }

  if (precio_min !== undefined) {
    whereClause += ` AND p.precio >= $${paramIndex}`;
    params.push(precio_min);
    paramIndex++;
  }

  if (precio_max !== undefined) {
    whereClause += ` AND p.precio <= $${paramIndex}`;
    params.push(precio_max);
    paramIndex++;
  }

  if (habitaciones_min !== undefined) {
    whereClause += ` AND p.habitaciones >= $${paramIndex}`;
    params.push(habitaciones_min);
    paramIndex++;
  }

  if (banos_min !== undefined) {
    whereClause += ` AND p.banos >= $${paramIndex}`;
    params.push(banos_min);
    paramIndex++;
  }

  if (m2_min !== undefined) {
    whereClause += ` AND p.m2_construccion >= $${paramIndex}`;
    params.push(m2_min);
    paramIndex++;
  }

  if (m2_max !== undefined) {
    whereClause += ` AND p.m2_construccion <= $${paramIndex}`;
    params.push(m2_max);
    paramIndex++;
  }

  if (destacada !== undefined) {
    whereClause += ` AND p.destacada = $${paramIndex}`;
    params.push(destacada);
    paramIndex++;
  }

  if (agente_id) {
    whereClause += ` AND p.agente_id = $${paramIndex}`;
    params.push(agente_id);
    paramIndex++;
  }

  // Filter for CLIC Connect properties (autoFilter from permisosCampos)
  if (connect !== undefined) {
    whereClause += ` AND p.connect = $${paramIndex}`;
    params.push(connect);
    paramIndex++;
  }

  if (busqueda) {
    // Si la búsqueda es solo números, también buscar en codigo_publico
    const isNumeric = /^\d+$/.test(busqueda.trim());
    if (isNumeric) {
      whereClause += ` AND (
        p.titulo ILIKE $${paramIndex} OR
        p.codigo ILIKE $${paramIndex} OR
        p.descripcion ILIKE $${paramIndex} OR
        p.ciudad ILIKE $${paramIndex} OR
        p.provincia ILIKE $${paramIndex} OR
        p.sector ILIKE $${paramIndex} OR
        p.direccion ILIKE $${paramIndex} OR
        p.codigo_publico = $${paramIndex + 1}
      )`;
      params.push(`%${busqueda}%`, parseInt(busqueda.trim()));
      paramIndex += 2;
    } else {
      whereClause += ` AND (
        p.titulo ILIKE $${paramIndex} OR
        p.codigo ILIKE $${paramIndex} OR
        p.descripcion ILIKE $${paramIndex} OR
        p.ciudad ILIKE $${paramIndex} OR
        p.provincia ILIKE $${paramIndex} OR
        p.sector ILIKE $${paramIndex} OR
        p.direccion ILIKE $${paramIndex}
      )`;
      params.push(`%${busqueda}%`);
      paramIndex++;
    }
  }

  // Contar total
  const countSql = `SELECT COUNT(*) as total FROM propiedades p WHERE ${whereClause}`;
  const countResult = await query(countSql, params);
  const total = parseInt(countResult.rows[0].total);

  // Obtener datos paginados
  const dataSql = `
    SELECT
      p.id, p.tenant_id, p.titulo, p.codigo, p.codigo_publico, p.descripcion,
      p.tipo, p.operacion, p.precio, p.precio_anterior, p.moneda,
      p.precio_venta, p.precio_alquiler, p.maintenance,
      p.pais, p.provincia, p.ciudad, p.sector, p.direccion,
      p.latitud, p.longitud, p.mostrar_ubicacion_exacta, p.ubicacion_id,
      p.precio_min, p.precio_max, p.m2_min, p.m2_max,
      p.habitaciones_min, p.habitaciones_max, p.banos_min, p.banos_max,
      p.parqueos_min, p.parqueos_max,
      p.habitaciones, p.banos, p.medios_banos, p.estacionamientos,
      p.m2_construccion, p.m2_terreno, p.antiguedad, p.pisos,
      p.floor_level, p.year_built, p.condition, p.is_furnished,
      p.amenidades, p.caracteristicas,
      p.imagen_principal, p.imagenes, p.video_url, p.tour_virtual_url,
      p.estado_propiedad, p.destacada, p.exclusiva, p.etiquetas, p.is_project, p.featured_until,
      p.agente_id, p.propietario_id, p.slug, p.notas, p.short_description, p.perfil_asesor_id,
      p.meta_title, p.meta_description, p.keywords, p.tags,
      p.documentos, p.tipologias, p.planes_pago, p.etapas, p.beneficios, p.garantias,
      p.captador_id, p.cocaptadores_ids, p.desarrollador_id, p.correo_reporte, p.publicada,
      p.share_commission, p.slug_traducciones, p.traducciones,
      p.red_global, p.red_global_comision, p.red_afiliados, p.red_afiliados_terminos, p.red_afiliados_comision,
      p.connect, p.connect_terminos, p.connect_comision, p.portales, p.nombre_privado,
      p.comision, p.comision_nota, p.disponibilidad_config,
      p.activo, p.created_at, p.updated_at,
      u.nombre as agente_nombre, u.apellido as agente_apellido,
      c.nombre as propietario_nombre, c.apellido as propietario_apellido,
      cap.nombre as captador_nombre, cap.apellido as captador_apellido, cap.avatar_url as captador_avatar,
      cap.email as captador_email, cap.telefono as captador_telefono,
      t.nombre as tenant_nombre, t.info_negocio as tenant_info_negocio
    FROM propiedades p
    LEFT JOIN usuarios u ON p.agente_id = u.id
    LEFT JOIN contactos c ON p.propietario_id = c.id
    LEFT JOIN usuarios cap ON p.captador_id = cap.id
    LEFT JOIN tenants t ON p.tenant_id = t.id
    WHERE ${whereClause}
    ORDER BY p.destacada DESC, p.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  params.push(limit, offset);

  const result = await query(dataSql, params);

  // Parsear campos JSONB que pueden venir como strings
  const parsedRows = result.rows.map(row => ({
    ...row,
    amenidades: typeof row.amenidades === 'string' ? JSON.parse(row.amenidades) : (row.amenidades || []),
    imagenes: typeof row.imagenes === 'string' ? JSON.parse(row.imagenes) : (row.imagenes || []),
    caracteristicas: typeof row.caracteristicas === 'string' ? JSON.parse(row.caracteristicas) : (row.caracteristicas || {}),
    keywords: typeof row.keywords === 'string' ? JSON.parse(row.keywords) : (row.keywords || []),
    tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []),
    documentos: typeof row.documentos === 'string' ? JSON.parse(row.documentos) : (row.documentos || []),
    tipologias: typeof row.tipologias === 'string' ? JSON.parse(row.tipologias) : (row.tipologias || []),
    planes_pago: typeof row.planes_pago === 'string' ? JSON.parse(row.planes_pago) : row.planes_pago,
    etapas: typeof row.etapas === 'string' ? JSON.parse(row.etapas) : (row.etapas || []),
    beneficios: typeof row.beneficios === 'string' ? JSON.parse(row.beneficios) : (row.beneficios || []),
    garantias: typeof row.garantias === 'string' ? JSON.parse(row.garantias) : (row.garantias || []),
    cocaptadores_ids: typeof row.cocaptadores_ids === 'string' ? JSON.parse(row.cocaptadores_ids) : (row.cocaptadores_ids || []),
    slug_traducciones: typeof row.slug_traducciones === 'string' ? JSON.parse(row.slug_traducciones) : (row.slug_traducciones || {}),
    traducciones: typeof row.traducciones === 'string' ? JSON.parse(row.traducciones) : (row.traducciones || {}),
    portales: typeof row.portales === 'string' ? JSON.parse(row.portales) : (row.portales || {}),
    etiquetas: typeof row.etiquetas === 'string' ? JSON.parse(row.etiquetas) : (row.etiquetas || []),
    tenant_info_negocio: typeof row.tenant_info_negocio === 'string' ? JSON.parse(row.tenant_info_negocio) : (row.tenant_info_negocio || {}),
    disponibilidad_config: typeof row.disponibilidad_config === 'string' ? JSON.parse(row.disponibilidad_config) : row.disponibilidad_config,
  }));

  return {
    data: parsedRows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Obtiene una propiedad por ID
 */
export async function getPropiedadById(
  tenantId: string,
  propiedadId: string
): Promise<Propiedad | null> {
  const sql = `
    SELECT
      p.id, p.tenant_id, p.titulo, p.codigo, p.codigo_publico, p.descripcion,
      p.tipo, p.operacion, p.precio, p.precio_anterior, p.moneda,
      p.precio_venta, p.precio_alquiler, p.maintenance,
      p.pais, p.provincia, p.ciudad, p.sector, p.direccion,
      p.latitud, p.longitud, p.mostrar_ubicacion_exacta, p.ubicacion_id,
      p.precio_min, p.precio_max, p.m2_min, p.m2_max,
      p.habitaciones_min, p.habitaciones_max, p.banos_min, p.banos_max,
      p.parqueos_min, p.parqueos_max,
      p.habitaciones, p.banos, p.medios_banos, p.estacionamientos,
      p.m2_construccion, p.m2_terreno, p.antiguedad, p.pisos,
      p.floor_level, p.year_built, p.condition, p.is_furnished,
      p.amenidades, p.caracteristicas,
      p.imagen_principal, p.imagenes, p.video_url, p.tour_virtual_url,
      p.estado_propiedad, p.destacada, p.exclusiva, p.etiquetas, p.is_project, p.featured_until,
      p.agente_id, p.propietario_id, p.slug, p.notas, p.short_description, p.perfil_asesor_id,
      p.meta_title, p.meta_description, p.keywords, p.tags,
      p.documentos, p.tipologias, p.planes_pago, p.etapas, p.beneficios, p.garantias,
      p.captador_id, p.cocaptadores_ids, p.desarrollador_id, p.correo_reporte, p.publicada,
      p.share_commission, p.slug_traducciones, p.traducciones,
      p.red_global, p.red_global_comision, p.red_afiliados, p.red_afiliados_terminos, p.red_afiliados_comision,
      p.connect, p.connect_terminos, p.connect_comision, p.portales, p.nombre_privado,
      p.comision, p.comision_nota, p.disponibilidad_config,
      p.activo, p.created_at, p.updated_at,
      u.nombre as agente_nombre, u.apellido as agente_apellido,
      c.nombre as propietario_nombre, c.apellido as propietario_apellido,
      cap.nombre as captador_nombre, cap.apellido as captador_apellido, cap.avatar_url as captador_avatar,
      cap.email as captador_email, cap.telefono as captador_telefono,
      -- Datos del desarrollador (si es proyecto y tiene desarrollador_id vinculado)
      dev.nombre as desarrollador_nombre, dev.apellido as desarrollador_apellido,
      dev.email as desarrollador_email, dev.telefono as desarrollador_telefono,
      dev.empresa as desarrollador_empresa
    FROM propiedades p
    LEFT JOIN usuarios u ON p.agente_id = u.id
    LEFT JOIN contactos c ON p.propietario_id = c.id
    LEFT JOIN usuarios cap ON p.captador_id = cap.id
    LEFT JOIN contactos dev ON p.desarrollador_id = dev.id
    WHERE p.id = $1 AND p.tenant_id = $2
  `;

  const result = await query(sql, [propiedadId, tenantId]);
  if (!result.rows[0]) return null;

  // Parsear campos JSONB que pueden venir como strings
  const row = result.rows[0];
  return {
    ...row,
    amenidades: typeof row.amenidades === 'string' ? JSON.parse(row.amenidades) : (row.amenidades || []),
    imagenes: typeof row.imagenes === 'string' ? JSON.parse(row.imagenes) : (row.imagenes || []),
    caracteristicas: typeof row.caracteristicas === 'string' ? JSON.parse(row.caracteristicas) : (row.caracteristicas || {}),
    keywords: typeof row.keywords === 'string' ? JSON.parse(row.keywords) : (row.keywords || []),
    tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []),
    documentos: typeof row.documentos === 'string' ? JSON.parse(row.documentos) : (row.documentos || []),
    tipologias: typeof row.tipologias === 'string' ? JSON.parse(row.tipologias) : (row.tipologias || []),
    planes_pago: typeof row.planes_pago === 'string' ? JSON.parse(row.planes_pago) : row.planes_pago,
    etapas: typeof row.etapas === 'string' ? JSON.parse(row.etapas) : (row.etapas || []),
    beneficios: typeof row.beneficios === 'string' ? JSON.parse(row.beneficios) : (row.beneficios || []),
    garantias: typeof row.garantias === 'string' ? JSON.parse(row.garantias) : (row.garantias || []),
    cocaptadores_ids: typeof row.cocaptadores_ids === 'string' ? JSON.parse(row.cocaptadores_ids) : (row.cocaptadores_ids || []),
    slug_traducciones: typeof row.slug_traducciones === 'string' ? JSON.parse(row.slug_traducciones) : (row.slug_traducciones || {}),
    traducciones: typeof row.traducciones === 'string' ? JSON.parse(row.traducciones) : (row.traducciones || {}),
    portales: typeof row.portales === 'string' ? JSON.parse(row.portales) : (row.portales || {}),
    etiquetas: typeof row.etiquetas === 'string' ? JSON.parse(row.etiquetas) : (row.etiquetas || []),
  };
}

/**
 * Crea una nueva propiedad
 */
export async function createPropiedad(
  tenantId: string,
  data: Partial<Propiedad> & {
    precio_venta?: number;
    precio_alquiler?: number;
    maintenance?: number;
    is_furnished?: boolean;
    floor_level?: number;
    year_built?: number;
    condition?: number;
    share_commission?: number;
    short_description?: string;
    slug_traducciones?: Record<string, string>;
    traducciones?: Record<string, any>;
    perfil_asesor_id?: string;
    featured_until?: string;
  }
): Promise<Propiedad> {
  // Sincronizar agente_id y perfil_asesor_id basándose en captador_id
  const captadorId = data.captador_id || null;
  const agenteId = captadorId; // Deprecado: agente_id = captador_id
  const perfilAsesorId = await getPerfilAsesorByUsuarioId(captadorId);

  // Generar slugs multi-idioma automáticamente si no se proporcionan
  let slug = data.slug;
  let slugTraducciones = data.slug_traducciones || {};

  if (!slug && data.titulo) {
    console.log('🔗 Generando slugs multi-idioma para:', data.titulo);
    const slugsGenerados = await generateMultiLanguageSlugs(data.titulo, tenantId);
    slug = slugsGenerados.slug;
    slugTraducciones = { ...slugTraducciones, ...slugsGenerados.slug_traducciones };
    console.log('✅ Slugs generados:', { slug, slugTraducciones });
  }

  // Generar short_description automáticamente si no se proporciona
  let shortDescription = data.short_description;
  if (!shortDescription && data.titulo) {
    try {
      console.log('📝 Generando short_description automáticamente...');
      shortDescription = await generateShortDescription(
        data.titulo,
        data.descripcion,
        {
          habitaciones: data.habitaciones ? parseInt(String(data.habitaciones)) : undefined,
          banos: data.banos ? parseInt(String(data.banos)) : undefined,
          m2: data.m2_construccion ? parseInt(String(data.m2_construccion)) : undefined,
          ubicacion: [data.sector, data.ciudad].filter(Boolean).join(', ') || undefined,
        }
      );
      console.log('✅ Short description generada:', shortDescription?.substring(0, 50) + '...');
    } catch (error) {
      console.error('⚠️ Error generando short_description:', error);
    }
  }

  // Generar traducciones de contenido si hay descripción
  let traducciones = data.traducciones || {};
  if (data.titulo && Object.keys(traducciones).length === 0) {
    try {
      console.log('🌍 Generando traducciones de contenido...');
      traducciones = await translatePropertyContent({
        titulo: data.titulo,
        descripcion: data.descripcion,
        short_description: shortDescription,
        meta_title: data.meta_title,
        meta_description: data.meta_description,
      }, tenantId);
      console.log('✅ Traducciones generadas para idiomas:', Object.keys(traducciones));
    } catch (error) {
      console.error('⚠️ Error generando traducciones:', error);
      // Continuar sin traducciones
    }
  }

  const sql = `
    INSERT INTO propiedades (
      tenant_id, titulo, codigo, descripcion, tipo, operacion,
      precio, precio_anterior, moneda, precio_venta, precio_alquiler, maintenance,
      pais, provincia, ciudad, sector, direccion,
      latitud, longitud, mostrar_ubicacion_exacta, ubicacion_id,
      precio_min, precio_max, m2_min, m2_max,
      habitaciones_min, habitaciones_max, banos_min, banos_max, parqueos_min, parqueos_max,
      habitaciones, banos, medios_banos, estacionamientos,
      m2_construccion, m2_terreno, antiguedad, pisos,
      floor_level, year_built, condition, is_furnished,
      amenidades, caracteristicas,
      imagen_principal, imagenes, video_url, tour_virtual_url,
      estado_propiedad, destacada, exclusiva, is_project,
      agente_id, propietario_id, slug, notas, short_description,
      meta_title, meta_description, keywords, tags,
      documentos, tipologias, planes_pago, etapas, beneficios, garantias,
      captador_id, cocaptadores_ids, desarrollador_id, correo_reporte, publicada,
      share_commission, slug_traducciones, traducciones, perfil_asesor_id, featured_until
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11, $12,
      $13, $14, $15, $16, $17,
      $18, $19, $20, $21,
      $22, $23, $24, $25,
      $26, $27, $28, $29, $30, $31,
      $32, $33, $34, $35,
      $36, $37, $38, $39,
      $40, $41, $42, $43,
      $44, $45,
      $46, $47, $48, $49,
      $50, $51, $52, $53,
      $54, $55, $56, $57, $58,
      $59, $60, $61, $62,
      $63, $64, $65, $66, $67, $68,
      $69, $70, $71, $72, $73,
      $74, $75, $76, $77, $78
    )
    RETURNING *
  `;

  const params = [
    tenantId,
    data.titulo,
    data.codigo || null,
    data.descripcion || null,
    data.tipo || 'casa',
    data.operacion || 'venta',
    // Precios
    data.precio || null,
    data.precio_anterior || null,
    data.moneda || 'USD',
    data.precio_venta || null,
    data.precio_alquiler || null,
    data.maintenance || null,
    // Ubicación
    data.pais || 'República Dominicana',
    data.provincia || null,
    data.ciudad || null,
    data.sector || null,
    data.direccion || null,
    data.latitud || null,
    data.longitud || null,
    data.mostrar_ubicacion_exacta !== undefined ? data.mostrar_ubicacion_exacta : true,
    data.ubicacion_id || null,
    // Rangos para proyectos
    data.precio_min || null,
    data.precio_max || null,
    data.m2_min || null,
    data.m2_max || null,
    data.habitaciones_min || null,
    data.habitaciones_max || null,
    data.banos_min || null,
    data.banos_max || null,
    data.parqueos_min || null,
    data.parqueos_max || null,
    // Características básicas
    data.habitaciones || null,
    data.banos || null,
    data.medios_banos || null,
    data.estacionamientos || null,
    data.m2_construccion || null,
    data.m2_terreno || null,
    data.antiguedad || null,
    data.pisos || null,
    // Características adicionales
    data.floor_level || null,
    data.year_built || null,
    data.condition || null,
    data.is_furnished || false,
    // Arrays y objetos
    JSON.stringify(data.amenidades || []),
    JSON.stringify(data.caracteristicas || {}),
    // Multimedia
    data.imagen_principal || null,
    JSON.stringify(data.imagenes || []),
    data.video_url || null,
    data.tour_virtual_url || null,
    // Estado
    data.estado_propiedad || 'disponible',
    data.destacada || false,
    data.exclusiva || false,
    data.is_project || false,
    // Relaciones (agente_id sincronizado con captador_id)
    agenteId,
    data.propietario_id || null,
    slug || null, // Slug generado automáticamente
    data.notas || null,
    shortDescription || null, // Short description generada automáticamente
    // SEO
    data.meta_title || null,
    data.meta_description || null,
    JSON.stringify(Array.isArray(data.keywords) ? data.keywords : []),
    JSON.stringify(Array.isArray(data.tags) ? data.tags : []),
    // Documentos y proyecto
    JSON.stringify(Array.isArray(data.documentos) ? data.documentos : []),
    JSON.stringify(data.tipologias || []),
    data.planes_pago ? JSON.stringify(data.planes_pago) : null,
    JSON.stringify(data.etapas || []),
    JSON.stringify(data.beneficios || []),
    JSON.stringify(data.garantias || []),
    // Asignaciones
    captadorId,
    JSON.stringify(data.cocaptadores_ids || []),
    data.desarrollador_id || null,
    data.correo_reporte || null,
    data.publicada !== undefined ? data.publicada : false,
    // Campos adicionales
    data.share_commission || null,
    JSON.stringify(slugTraducciones), // Slugs traducidos generados automáticamente
    JSON.stringify(traducciones), // Traducciones de contenido generadas automáticamente
    perfilAsesorId, // Sincronizado automáticamente desde captador_id
    data.featured_until || null,
  ];

  console.log('💾 createPropiedad - Ejecutando INSERT con', params.length, 'parámetros');
  console.log('💾 createPropiedad - imagen_principal:', data.imagen_principal);
  console.log('💾 createPropiedad - imagenes:', data.imagenes);
  console.log('💾 createPropiedad - documentos:', data.documentos);
  
  const result = await query(sql, params);
  const row = result.rows[0];
  
  console.log('✅ createPropiedad - Propiedad creada, ID:', row.id);
  console.log('✅ createPropiedad - imagen_principal retornada:', row.imagen_principal);
  console.log('✅ createPropiedad - imagenes retornadas (tipo):', typeof row.imagenes, Array.isArray(row.imagenes));
  
  // Parsear campos JSONB que pueden venir como strings
  const parsed = {
    ...row,
    amenidades: typeof row.amenidades === 'string' ? JSON.parse(row.amenidades) : (row.amenidades || []),
    imagenes: typeof row.imagenes === 'string' ? JSON.parse(row.imagenes) : (row.imagenes || []),
    caracteristicas: typeof row.caracteristicas === 'string' ? JSON.parse(row.caracteristicas) : (row.caracteristicas || {}),
    keywords: typeof row.keywords === 'string' ? JSON.parse(row.keywords) : (row.keywords || []),
    tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []),
    documentos: typeof row.documentos === 'string' ? JSON.parse(row.documentos) : (row.documentos || []),
    tipologias: typeof row.tipologias === 'string' ? JSON.parse(row.tipologias) : (row.tipologias || []),
    planes_pago: typeof row.planes_pago === 'string' ? JSON.parse(row.planes_pago) : row.planes_pago,
    etapas: typeof row.etapas === 'string' ? JSON.parse(row.etapas) : (row.etapas || []),
    beneficios: typeof row.beneficios === 'string' ? JSON.parse(row.beneficios) : (row.beneficios || []),
    garantias: typeof row.garantias === 'string' ? JSON.parse(row.garantias) : (row.garantias || []),
    cocaptadores_ids: typeof row.cocaptadores_ids === 'string' ? JSON.parse(row.cocaptadores_ids) : (row.cocaptadores_ids || []),
  };
  
  console.log('✅ createPropiedad - imagenes parseadas:', parsed.imagenes?.length || 0);
  console.log('✅ createPropiedad - documentos parseados:', parsed.documentos?.length || 0);

  // Sincronizar tags automáticamente (en background, no bloquea)
  syncTagsForProperty(parsed.id, tenantId).then(result => {
    console.log(`🏷️ Tags sincronizados para propiedad ${parsed.id}: ${result.tags_asignados} tags`);
  }).catch(err => {
    console.error(`⚠️ Error sincronizando tags para propiedad ${parsed.id}:`, err);
  });

  // Registrar evento de tracking para facturación
  try {
    await registrarPropiedadCreada(tenantId, parsed.id, data.titulo || undefined);
    // Si la propiedad se crea ya publicada, registrar también el evento de publicación
    if (data.estado_propiedad && data.estado_propiedad !== 'inactiva') {
      await registrarPropiedadPublicada(tenantId, parsed.id, data.titulo || undefined);
    }
  } catch (trackingError) {
    console.error('⚠️ Error registrando tracking de propiedad:', trackingError);
    // No fallar la operación por error de tracking
  }

  return parsed;
}

/**
 * Actualiza una propiedad existente
 */
export async function updatePropiedad(
  tenantId: string,
  propiedadId: string,
  data: Partial<Propiedad>
): Promise<Propiedad | null> {
  // Obtener estado actual para tracking de cambios de publicación
  let estadoAnterior: string | null = null;
  let tituloPropiedad: string | null = null;
  if (data.estado_propiedad !== undefined) {
    const currentResult = await query(
      `SELECT estado_propiedad, titulo FROM propiedades WHERE id = $1 AND tenant_id = $2`,
      [propiedadId, tenantId]
    );
    if (currentResult.rows[0]) {
      estadoAnterior = currentResult.rows[0].estado_propiedad;
      tituloPropiedad = currentResult.rows[0].titulo;
    }
  }

  // Si se actualiza captador_id, sincronizar agente_id y perfil_asesor_id
  if (data.captador_id !== undefined) {
    data.agente_id = data.captador_id; // Deprecado: mantener sincronizado
    data.perfil_asesor_id = await getPerfilAsesorByUsuarioId(data.captador_id) || undefined;
  }

  // Construir SET clause dinámicamente
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  const allowedFields = [
    'titulo', 'codigo', 'descripcion', 'tipo', 'operacion',
    'precio', 'precio_anterior', 'moneda', 'precio_venta', 'precio_alquiler', 'maintenance',
    // Ubicación
    'pais', 'provincia', 'ciudad', 'sector', 'direccion',
    'latitud', 'longitud', 'mostrar_ubicacion_exacta', 'ubicacion_id',
    // Rangos para proyectos
    'precio_min', 'precio_max', 'm2_min', 'm2_max',
    'habitaciones_min', 'habitaciones_max', 'banos_min', 'banos_max',
    'parqueos_min', 'parqueos_max',
    // Características
    'habitaciones', 'banos', 'medios_banos', 'estacionamientos',
    'm2_construccion', 'm2_terreno', 'antiguedad', 'pisos',
    'floor_level', 'year_built', 'condition', 'is_furnished',
    'amenidades', 'caracteristicas',
    // Multimedia
    'imagen_principal', 'imagenes', 'video_url', 'tour_virtual_url',
    // Estado y configuración
    'estado_propiedad', 'destacada', 'exclusiva', 'etiquetas', 'is_project', 'featured_until',
    // Relaciones
    'agente_id', 'propietario_id', 'slug', 'notas', 'activo', 'short_description', 'perfil_asesor_id',
    // SEO
    'meta_title', 'meta_description', 'keywords', 'tags',
    // Documentos y proyecto
    'documentos', 'tipologias', 'planes_pago', 'etapas', 'beneficios', 'garantias',
    // Asignaciones
    'captador_id', 'cocaptadores_ids', 'desarrollador_id', 'correo_reporte', 'publicada',
    // Campos adicionales
    'share_commission', 'slug_traducciones', 'traducciones',
    // Portales y Redes
    'red_global', 'red_global_comision', 'red_afiliados', 'red_afiliados_terminos', 'red_afiliados_comision',
    'connect', 'connect_terminos', 'connect_comision', 'portales',
    // Nombre privado
    'nombre_privado',
    // Comisión
    'comision', 'comision_nota'
  ];

  // Campos que necesitan ser serializados como JSON
  const jsonFields = [
    'amenidades', 'imagenes', 'keywords', 'tags',
    'documentos', 'tipologias', 'etapas', 'beneficios',
    'garantias', 'cocaptadores_ids', 'caracteristicas',
    'planes_pago', 'slug_traducciones', 'traducciones', 'portales', 'etiquetas'
  ];

  for (const field of allowedFields) {
    if (data[field as keyof Propiedad] !== undefined) {
      let value = data[field as keyof Propiedad];

      // Convertir arrays/objetos a JSON
      if (jsonFields.includes(field)) {
        value = JSON.stringify(value);
      }

      updates.push(`${field} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  }

  if (updates.length === 0) {
    return getPropiedadById(tenantId, propiedadId);
  }

  updates.push(`updated_at = NOW()`);

  const sql = `
    UPDATE propiedades
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
    RETURNING *
  `;
  params.push(propiedadId, tenantId);

  const result = await query(sql, params);
  if (!result.rows[0]) {
    return null;
  }

  // Parsear campos JSONB que pueden venir como strings
  const row = result.rows[0];

  const parsed = {
    ...row,
    amenidades: typeof row.amenidades === 'string' ? JSON.parse(row.amenidades) : (row.amenidades || []),
    imagenes: typeof row.imagenes === 'string' ? JSON.parse(row.imagenes) : (row.imagenes || []),
    caracteristicas: typeof row.caracteristicas === 'string' ? JSON.parse(row.caracteristicas) : (row.caracteristicas || {}),
    keywords: typeof row.keywords === 'string' ? JSON.parse(row.keywords) : (row.keywords || []),
    tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []),
    documentos: typeof row.documentos === 'string' ? JSON.parse(row.documentos) : (row.documentos || []),
    tipologias: typeof row.tipologias === 'string' ? JSON.parse(row.tipologias) : (row.tipologias || []),
    planes_pago: typeof row.planes_pago === 'string' ? JSON.parse(row.planes_pago) : row.planes_pago,
    etapas: typeof row.etapas === 'string' ? JSON.parse(row.etapas) : (row.etapas || []),
    beneficios: typeof row.beneficios === 'string' ? JSON.parse(row.beneficios) : (row.beneficios || []),
    garantias: typeof row.garantias === 'string' ? JSON.parse(row.garantias) : (row.garantias || []),
    cocaptadores_ids: typeof row.cocaptadores_ids === 'string' ? JSON.parse(row.cocaptadores_ids) : (row.cocaptadores_ids || []),
  };

  // Sincronizar tags automáticamente (en background, no bloquea)
  syncTagsForProperty(propiedadId, tenantId).then(result => {
    console.log(`🏷️ Tags sincronizados para propiedad ${propiedadId}: ${result.tags_asignados} tags`);
  }).catch(err => {
    console.error(`⚠️ Error sincronizando tags para propiedad ${propiedadId}:`, err);
  });

  // Registrar eventos de tracking para cambios de publicación
  if (data.estado_propiedad !== undefined && estadoAnterior !== null) {
    try {
      const titulo = tituloPropiedad || data.titulo || undefined;
      const eraPublicada = estadoAnterior !== 'inactiva';
      const esPublicada = data.estado_propiedad !== 'inactiva';

      if (!eraPublicada && esPublicada) {
        // Se publicó
        await registrarPropiedadPublicada(tenantId, propiedadId, titulo);
      } else if (eraPublicada && !esPublicada) {
        // Se despublicó
        await registrarPropiedadDespublicada(tenantId, propiedadId, titulo);
      }
    } catch (trackingError) {
      console.error('⚠️ Error registrando tracking de cambio de estado:', trackingError);
      // No fallar la operación por error de tracking
    }
  }

  return parsed;
}

/**
 * Elimina una propiedad (soft delete)
 */
export async function deletePropiedad(
  tenantId: string,
  propiedadId: string
): Promise<boolean> {
  // Obtener título y estado antes de eliminar para tracking
  const currentResult = await query(
    `SELECT titulo, estado_propiedad FROM propiedades WHERE id = $1 AND tenant_id = $2`,
    [propiedadId, tenantId]
  );
  const propiedadInfo = currentResult.rows[0];

  const sql = `
    UPDATE propiedades
    SET activo = false, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
    RETURNING id
  `;

  const result = await query(sql, [propiedadId, tenantId]);
  const eliminada = result.rows.length > 0;

  // Registrar eventos de tracking
  if (eliminada && propiedadInfo) {
    try {
      // Si estaba publicada, registrar despublicación primero
      if (propiedadInfo.estado_propiedad !== 'inactiva') {
        await registrarPropiedadDespublicada(tenantId, propiedadId, propiedadInfo.titulo);
      }
      // Registrar eliminación
      await registrarPropiedadEliminada(tenantId, propiedadId, propiedadInfo.titulo);
    } catch (trackingError) {
      console.error('⚠️ Error registrando tracking de propiedad eliminada:', trackingError);
      // No fallar la operación por error de tracking
    }
  }

  return eliminada;
}

/**
 * Obtiene estadísticas de propiedades
 */
export async function getPropiedadesStats(
  tenantId: string,
  agenteId?: string | null,
  autoFilter?: Record<string, any>
): Promise<{
  total: number;
  disponibles: number;
  reservadas: number;
  vendidas: number;
  porTipo: Record<string, number>;
  porOperacion: Record<string, number>;
}> {
  const params: any[] = [tenantId];
  let paramIndex = 2;

  let ownerFilter = '';
  if (agenteId) {
    ownerFilter = ` AND (captador_id = $${paramIndex} OR agente_id = $${paramIndex})`;
    params.push(agenteId);
    paramIndex++;
  }

  // Build autoFilter conditions (e.g., connect = true)
  let autoFilterClause = '';
  if (autoFilter) {
    for (const [key, value] of Object.entries(autoFilter)) {
      if (value !== undefined) {
        autoFilterClause += ` AND ${key} = $${paramIndex}`;
        params.push(value);
        paramIndex++;
      }
    }
  }

  const whereClause = `tenant_id = $1 AND activo = true${ownerFilter}${autoFilterClause}`;

  const statsSql = `
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE estado_propiedad = 'disponible') as disponibles,
      COUNT(*) FILTER (WHERE estado_propiedad = 'reservada') as reservadas,
      COUNT(*) FILTER (WHERE estado_propiedad IN ('vendida', 'rentada')) as vendidas
    FROM propiedades
    WHERE ${whereClause}
  `;

  const tipoSql = `
    SELECT tipo, COUNT(*) as count
    FROM propiedades
    WHERE ${whereClause}
    GROUP BY tipo
  `;

  const operacionSql = `
    SELECT operacion, COUNT(*) as count
    FROM propiedades
    WHERE ${whereClause}
    GROUP BY operacion
  `;

  const [statsResult, tipoResult, operacionResult] = await Promise.all([
    query(statsSql, params),
    query(tipoSql, params),
    query(operacionSql, params),
  ]);

  const stats = statsResult.rows[0];

  const porTipo: Record<string, number> = {};
  for (const row of tipoResult.rows) {
    porTipo[row.tipo] = parseInt(row.count);
  }

  const porOperacion: Record<string, number> = {};
  for (const row of operacionResult.rows) {
    porOperacion[row.operacion] = parseInt(row.count);
  }

  return {
    total: parseInt(stats.total),
    disponibles: parseInt(stats.disponibles),
    reservadas: parseInt(stats.reservadas),
    vendidas: parseInt(stats.vendidas),
    porTipo,
    porOperacion,
  };
}

/**
 * Regenera los slugs de una propiedad existente
 * ADVERTENCIA: Esto puede afectar el SEO si la propiedad ya está indexada
 */
export async function regeneratePropiedadSlugs(
  tenantId: string,
  propiedadId: string,
  options?: {
    forceRegenerate?: boolean; // Si es true, regenera aunque esté publicada
    nuevoTitulo?: string; // Opcional: usar un nuevo título
  }
): Promise<{
  success: boolean;
  slug: string;
  slug_traducciones: Record<string, string>;
  warning?: string;
}> {
  // Obtener la propiedad actual
  const propiedad = await getPropiedadById(tenantId, propiedadId);

  if (!propiedad) {
    throw new Error('Propiedad no encontrada');
  }

  // Advertencia si está publicada y no se fuerza
  let warning: string | undefined;
  if (propiedad.publicada && !options?.forceRegenerate) {
    warning = 'Esta propiedad está publicada. Cambiar el slug puede afectar el posicionamiento SEO.';
  }

  // Usar nuevo título o el existente
  const titulo = options?.nuevoTitulo || propiedad.titulo;

  // Generar nuevos slugs
  console.log('🔄 Regenerando slugs para propiedad:', propiedadId);
  const { slug, slug_traducciones } = await generateMultiLanguageSlugs(titulo, tenantId, propiedadId);

  // Regenerar traducciones de contenido
  let traducciones = propiedad.traducciones || {};
  try {
    traducciones = await translatePropertyContent({
      titulo,
      descripcion: propiedad.descripcion,
      short_description: propiedad.short_description,
      meta_title: propiedad.meta_title,
      meta_description: propiedad.meta_description,
    }, tenantId);
  } catch (error) {
    console.error('Error regenerando traducciones:', error);
  }

  // Actualizar en base de datos
  const sql = `
    UPDATE propiedades
    SET slug = $1, slug_traducciones = $2, traducciones = $3, updated_at = NOW()
    WHERE id = $4 AND tenant_id = $5
    RETURNING slug, slug_traducciones
  `;

  await query(sql, [
    slug,
    JSON.stringify(slug_traducciones),
    JSON.stringify(traducciones),
    propiedadId,
    tenantId,
  ]);

  console.log('✅ Slugs regenerados:', { slug, slug_traducciones });

  return {
    success: true,
    slug,
    slug_traducciones,
    warning,
  };
}
