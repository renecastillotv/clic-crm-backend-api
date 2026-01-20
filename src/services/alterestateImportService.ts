/**
 * Servicio de Importación desde Alterestate
 *
 * Conecta con la API de Alterestate para importar propiedades
 * y sincronizarlas con nuestra base de datos local.
 */

import { query } from '../utils/db.js';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

// Tipo para respuestas de la API de Alterestate
interface AlterestateApiResponse {
  results?: AlterestateProperty[];
  data?: AlterestateProperty[] | AlterestateProperty;
  next?: string | null;
  count?: number;
}

export interface AlterestateCredentials {
  apiKey: string;
  isActive: boolean;
}

export interface AlterestateProperty {
  cid: number;
  uid: string;
  slug: string;
  name: string;
  short_description?: string;
  description?: string;

  // Precios - Alterestate usa estos campos específicos
  sale_price?: number;
  rent_price?: number;
  rental_price?: number;          // Precio alquiler temporal
  furnished_price?: number;       // Precio alquiler amueblado
  furnished_sale_price?: number;  // Precio venta amueblado
  maintenance_fee?: number;       // Cuota mantenimiento
  currency_sale?: string;
  currency_rent?: string;
  currency_rental?: string;
  currency_furnished?: string;

  // Precios para proyectos
  price?: number;                 // Precio genérico
  price_from?: number;            // Precio desde (proyectos)
  min_price?: number;             // Precio mínimo (proyectos)
  max_price?: number;             // Precio máximo (proyectos)

  // Precios en USD (convertidos)
  us_saleprice?: number;
  us_rentprice?: number;
  us_rentalprice?: number;
  us_furnished?: number;

  // Tipo y operación
  category?: { id: number; name: string; name_en?: string };
  listing_type?: Array<{ id: number; listing: string }>;
  status?: string;
  forSale?: boolean;
  forRent?: boolean;
  forRental?: boolean;

  // Características
  room?: number;
  bathroom?: number;
  half_bathrooms?: number;
  parkinglot?: number;
  property_area?: number;
  property_area_measurer?: string;
  terrain_area?: number;
  terrain_area_measurer?: string;
  condition?: string;
  year_construction?: number;     // Año construcción
  floor_level?: number;           // Nivel del piso
  total_floors?: number;          // Total de pisos

  // Rangos para proyectos (min/max)
  room_min?: number;
  room_max?: number;
  rooms_min?: number;
  rooms_max?: number;
  bathroom_min?: number;
  bathroom_max?: number;
  bathrooms_min?: number;
  bathrooms_max?: number;
  parkinglot_min?: number;
  parkinglot_max?: number;
  parking_min?: number;
  parking_max?: number;
  property_area_min?: number;
  property_area_max?: number;
  area_min?: number;
  area_max?: number;
  terrain_area_min?: number;
  terrain_area_max?: number;

  // Ubicación
  province?: string;
  city?: string;
  city_id?: number;
  sector?: string;
  sector_id?: number;
  lat_long?: boolean;

  // Flags
  featured?: boolean;
  exclusive?: boolean;
  is_project_v2?: boolean;
  furnished?: boolean;
  masterbroker?: boolean;
  show_on_website?: boolean;
  show_on_propertybank?: boolean;

  // Comisión
  share_comision?: number;

  // Multimedia
  featured_image?: string;
  gallery_image?: any[];          // Array de imágenes
  virtual_tour?: string;
  youtubeiframe?: string;
  mapiframe?: string;

  // Parent con imágenes en diferentes tamaños
  parent?: {
    slug: string;
    uid: string;
    cid: number;
    featured_image?: string;
    featured_image_medium?: string;
    featured_image_thumb?: string;
    featured_image_original?: string;
  };

  // Agentes - pueden ser strings (listado) u objetos (detalle)
  agents?: any[];
  amenities?: string[];
  tags?: string[];

  // URLs
  external_route?: string;

  // Timestamps
  timestamp?: string;
  delivery_date?: string;

  // Cualquier campo adicional
  [key: string]: any;
}

export interface ImportResult {
  success: number;
  failed: number;
  skipped: number;
  errors: Array<{ cid: number; error: string }>;
  imported: Array<{ id: string; titulo: string; cid: number }>;
}

export interface SyncResult {
  created: number;
  updated: number;
  unchanged: number;
  failed: number;
  changes: Array<{ cid: number; action: string; changes?: any[] }>;
  errors: Array<{ cid: number; error: string }>;
}

export interface AnalysisResult {
  totalCount: number;
  sampleProperty: AlterestateProperty | null;
  fieldCoverage: Record<string, any>;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const ALTERESTATE_API_BASE = 'https://secure.alterestate.com/api/v1';
const MAX_PAGES = 100; // Límite de seguridad para paginación

// Mapeo de tipos de propiedad
const PROPERTY_TYPE_MAP: Record<string, string> = {
  'Apartamentos': 'apartamento',
  'Apartamento': 'apartamento',
  'Casas': 'casa',
  'Casa': 'casa',
  'Villas': 'villa',
  'Villa': 'villa',
  'Oficinas': 'oficina',
  'Oficina': 'oficina',
  'Locales': 'local',
  'Local': 'local',
  'Terrenos': 'terreno',
  'Terreno': 'terreno',
  'Penthouse': 'penthouse',
  'Townhouse': 'townhouse',
  'Bodega': 'bodega',
  'Bodegas': 'bodega',
  'Solar': 'solar',
  'Finca': 'finca',
  'Nave Industrial': 'nave_industrial',
  'Proyecto': 'proyecto',
};

// Mapeo de operaciones
const OPERATION_MAP: Record<string, string> = {
  'Venta': 'venta',
  'Alquiler': 'renta',
  'Renta': 'renta',
};

// Mapeo de estados
const STATUS_MAP: Record<string, string> = {
  '1': 'disponible',
  'active': 'disponible',
  'sold': 'vendida',
  'rented': 'rentada',
  'inactive': 'inactiva',
  '0': 'inactiva',
};

// ============================================================================
// FUNCIONES DE CONEXIÓN A API
// ============================================================================

/**
 * Obtiene las credenciales de Alterestate para un tenant
 */
export async function getAlterestateCredentials(tenantId: string): Promise<AlterestateCredentials | null> {
  const sql = `
    SELECT alterestate_api_key_encrypted, alterestate_connected
    FROM tenant_api_credentials
    WHERE tenant_id = $1
      AND alterestate_connected = true
    LIMIT 1
  `;

  const result = await query(sql, [tenantId]);

  if (result.rows.length === 0 || !result.rows[0].alterestate_api_key_encrypted) {
    return null;
  }

  return {
    apiKey: result.rows[0].alterestate_api_key_encrypted,
    isActive: result.rows[0].alterestate_connected,
  };
}

/**
 * Obtiene headers de autenticación para Alterestate
 */
function getHeaders(apiKey: string): Record<string, string> {
  return {
    'aetoken': apiKey,
    'Content-Type': 'application/json',
  };
}

/**
 * Obtiene todas las propiedades de Alterestate con paginación automática
 */
export async function fetchAllProperties(apiKey: string): Promise<AlterestateProperty[]> {
  const headers = getHeaders(apiKey);
  let properties: AlterestateProperty[] = [];
  let currentUrl: string | null = `${ALTERESTATE_API_BASE}/properties/filter/`;
  let pageCount = 0;

  console.log('🔄 Fetching all properties from Alterestate...');

  while (currentUrl && pageCount < MAX_PAGES) {
    pageCount++;
    console.log(`📄 Fetching page ${pageCount}...`);

    const response = await fetch(currentUrl, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Alterestate API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as AlterestateApiResponse;
    const pageProperties = data.results || data.data || [];

    properties = properties.concat(pageProperties);
    console.log(`  ✅ Page ${pageCount}: ${pageProperties.length} properties (total: ${properties.length})`);

    // Siguiente página
    currentUrl = data.next || null;
  }

  console.log(`📦 Total properties fetched: ${properties.length}`);
  return properties;
}

/**
 * Obtiene una propiedad específica por CID
 */
export async function fetchPropertyByCid(apiKey: string, cid: number): Promise<AlterestateProperty | null> {
  const headers = getHeaders(apiKey);

  // Primero buscar en la lista para obtener el slug
  const listUrl = `${ALTERESTATE_API_BASE}/properties/filter/`;
  const listResponse = await fetch(listUrl, { headers });

  if (!listResponse.ok) {
    throw new Error(`Error fetching property list: ${listResponse.statusText}`);
  }

  const listData = await listResponse.json() as AlterestateApiResponse;
  const properties = listData.results || listData.data || [];
  const found = properties.find((p: AlterestateProperty) => p.cid === cid);

  if (!found) {
    return null;
  }

  // Obtener detalle completo
  return fetchPropertyDetail(apiKey, found.slug, found);
}

/**
 * Obtiene el detalle completo de una propiedad
 */
export async function fetchPropertyDetail(
  apiKey: string,
  slug: string,
  summaryData?: AlterestateProperty
): Promise<AlterestateProperty> {
  const headers = getHeaders(apiKey);
  const detailUrl = `${ALTERESTATE_API_BASE}/properties/view/${slug}/`;

  const response = await fetch(detailUrl, { headers });

  if (!response.ok) {
    console.log(`⚠️ Could not fetch detail for ${slug}, using summary data`);
    return summaryData || {} as AlterestateProperty;
  }

  const data = await response.json() as AlterestateApiResponse;
  const detail = data.data || data;

  // Debug completo: ver TODOS los campos que trae el detalle
  console.log(`  🔍 Detail response keys: ${Object.keys(detail).join(', ')}`);

  // Log campos importantes para debugging
  const importantFields = [
    'photos', 'gallery_image', 'images', 'gallery',
    'province', 'city', 'sector', 'address', 'neighborhood', 'zip_code',
    'share_comision', 'comision', 'commission',
    'captador', 'owner', 'listing_agent', 'created_by', 'agents',
    'rent_price', 'rent_price_furnished', 'furnished_rent_price',
    'latitude', 'longitude', 'lat', 'lng', 'geo'
  ];

  importantFields.forEach(field => {
    if (detail[field] !== undefined && detail[field] !== null) {
      const value = typeof detail[field] === 'object'
        ? JSON.stringify(detail[field]).substring(0, 150)
        : detail[field];
      console.log(`  📋 ${field}: ${value}`);
    }
  });

  // Combinar datos de summary y detail, priorizando detail para campos de imágenes
  const detailAny = detail as any;
  return {
    ...summaryData,
    ...detail,
    // Asegurar que photos se tome del detalle si existe
    photos: detailAny.photos || detailAny.images || detailAny.gallery || summaryData?.photos,
    gallery_image: detailAny.gallery_image || summaryData?.gallery_image,
  };
}

// ============================================================================
// FUNCIONES DE TRANSFORMACIÓN
// ============================================================================

/**
 * Mapea el tipo de propiedad de Alterestate a nuestro sistema
 */
function mapPropertyType(alterestateType: string): string {
  return PROPERTY_TYPE_MAP[alterestateType] || alterestateType.toLowerCase();
}

/**
 * Mapea la operación de Alterestate a nuestro sistema
 */
function mapOperation(listingTypes: Array<{ listing: string }> | undefined): string {
  if (!listingTypes || listingTypes.length === 0) {
    return 'venta';
  }

  const operations = listingTypes.map(lt => OPERATION_MAP[lt.listing] || lt.listing.toLowerCase());

  if (operations.includes('venta') && operations.includes('renta')) {
    return 'venta'; // Por defecto venta si ambos
  }

  return operations[0] || 'venta';
}

/**
 * Mapea el estado de Alterestate a nuestro sistema
 */
function mapStatus(alterestateStatus: string | undefined): string {
  if (!alterestateStatus) return 'disponible';
  return STATUS_MAP[alterestateStatus.toLowerCase()] || 'disponible';
}

/**
 * Genera un slug único
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Extrae URL de un objeto de foto con diferentes formatos posibles
 */
function extractPhotoUrl(photo: any): string | null {
  if (!photo) return null;
  if (typeof photo === 'string') return photo;
  // Diferentes formatos posibles de Alterestate
  return photo.url || photo.src || photo.image || photo.path || photo.original || photo.full || null;
}

/**
 * Normaliza una URL de imagen para comparación (elimina parámetros de query y trailing slashes)
 */
function normalizeImageUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Retornar solo el pathname sin query params
    return parsed.origin + parsed.pathname.replace(/\/+$/, '');
  } catch {
    // Si no es una URL válida, solo limpiar trailing slashes
    return url.replace(/\/+$/, '').split('?')[0];
  }
}

/**
 * Verifica si una URL ya existe en el array (comparando versiones normalizadas)
 */
function imageUrlExists(images: string[], url: string): boolean {
  const normalizedUrl = normalizeImageUrl(url);
  return images.some(existingUrl => normalizeImageUrl(existingUrl) === normalizedUrl);
}

/**
 * Procesa las imágenes de galería (SIN incluir featured_image para evitar duplicados)
 * La featured_image se guarda por separado en imagen_principal
 */
function processGalleryImages(
  featuredImage: string | undefined,
  galleryImage: string | string[] | undefined,
  photos: Array<{ url: string } | string> | any[] | undefined
): string[] {
  const images: string[] = [];

  console.log('  🔍 processGalleryImages input:');
  console.log(`    - featuredImage: ${featuredImage ? 'yes' : 'no'}`);
  console.log(`    - galleryImage type: ${typeof galleryImage}, isArray: ${Array.isArray(galleryImage)}`);
  console.log(`    - photos type: ${typeof photos}, isArray: ${Array.isArray(photos)}, length: ${photos?.length || 0}`);

  // NO agregar featured_image aquí - se guarda por separado en imagen_principal
  // Solo la usamos para excluirla de la galería y evitar duplicados
  const featuredNormalized = featuredImage ? normalizeImageUrl(featuredImage) : null;

  // Procesar gallery_image (puede ser string, array de strings, o array de objetos)
  if (galleryImage) {
    let galleryItems: any[];

    if (Array.isArray(galleryImage)) {
      galleryItems = galleryImage;
    } else if (typeof galleryImage === 'string') {
      // Podría ser JSON string o comma-separated
      try {
        const parsed = JSON.parse(galleryImage);
        galleryItems = Array.isArray(parsed) ? parsed : [galleryImage];
      } catch {
        galleryItems = galleryImage.split(',').map(img => img.trim());
      }
    } else {
      galleryItems = [];
    }

    galleryItems.forEach(img => {
      const url = extractPhotoUrl(img);
      if (url) {
        // Excluir si es igual a la featured_image
        const normalized = normalizeImageUrl(url);
        if (normalized !== featuredNormalized && !imageUrlExists(images, url)) {
          images.push(url);
        }
      }
    });
  }

  // Procesar photos del detalle
  if (photos && Array.isArray(photos)) {
    photos.forEach(photo => {
      const url = extractPhotoUrl(photo);
      if (url) {
        // Excluir si es igual a la featured_image
        const normalized = normalizeImageUrl(url);
        if (normalized !== featuredNormalized && !imageUrlExists(images, url)) {
          images.push(url);
        }
      }
    });
  }

  console.log(`  📸 Total gallery images (excluding featured): ${images.length}`);

  return images;
}

/**
 * Transforma una propiedad de Alterestate a nuestro formato
 */
export function transformProperty(
  property: AlterestateProperty,
  tenantId: string
): Record<string, any> {
  const categoryName = property.category?.name || '';
  const slug = property.slug || generateSlug(property.name);

  // Usar imagen original de mejor calidad si está disponible
  const imagenPrincipal = property.parent?.featured_image_original
    || property.featured_image
    || null;

  const images = processGalleryImages(
    imagenPrincipal,
    property.gallery_image,
    undefined // No hay campo photos separado
  );

  // Determinar operación basado en flags y listing_type
  let operacion = mapOperation(property.listing_type);
  if (property.forRent || property.forRental) {
    operacion = 'renta';
  } else if (property.forSale) {
    operacion = 'venta';
  }

  // Determinar el precio correcto según la operación
  // furnished_price = precio alquiler amueblado
  // rent_price = precio alquiler sin amueblar
  // rental_price = precio alquiler temporal
  // sale_price = precio venta
  // price_from / min_price = precio desde (proyectos)
  // price = precio genérico
  let precioAlquiler = property.rent_price || property.rental_price || null;

  // Si está amueblado y tiene furnished_price, usar ese como precio de alquiler
  if (property.furnished && property.furnished_price) {
    precioAlquiler = property.furnished_price;
  }

  // Para proyectos, pueden usar price_from, min_price o price en lugar de sale_price
  let precioVenta = property.sale_price || null;
  let precioMin = property.min_price || property.price_from || null;
  let precioMax = property.max_price || null;

  if (property.is_project_v2) {
    // Debug: mostrar TODOS los campos numéricos del proyecto
    console.log(`  💰 Proyecto "${property.name}" - campos numéricos:`);
    Object.entries(property).forEach(([key, value]) => {
      if (typeof value === 'number' && value !== 0) {
        console.log(`    ${key}: ${value}`);
      }
    });

    // Los proyectos suelen tener "precio desde" en lugar de sale_price
    if (!precioVenta) {
      precioVenta = precioMin || property.price || null;
    }
  }

  // Fallback a price genérico si no hay sale_price
  if (!precioVenta) {
    precioVenta = property.price || null;
  }

  // Mapear rangos de características para proyectos
  const habMin = property.room_min || property.rooms_min || null;
  const habMax = property.room_max || property.rooms_max || null;
  const banosMin = property.bathroom_min || property.bathrooms_min || null;
  const banosMax = property.bathroom_max || property.bathrooms_max || null;
  const parqueosMin = property.parkinglot_min || property.parking_min || null;
  const parqueosMax = property.parkinglot_max || property.parking_max || null;
  const m2Min = property.property_area_min || property.area_min || null;
  const m2Max = property.property_area_max || property.area_max || null;

  // Extraer nombre del agente del primer agente en la lista
  let agenteName = null;
  if (property.agents && property.agents.length > 0) {
    const firstAgent = property.agents[0];
    if (typeof firstAgent === 'string') {
      agenteName = firstAgent;
    } else if (typeof firstAgent === 'object') {
      agenteName = firstAgent.full_name || `${firstAgent.first_name || ''} ${firstAgent.last_name || ''}`.trim() || null;
    }
  }

  // URL del video de YouTube
  let videoUrl = null;
  if (property.youtubeiframe) {
    // Extraer URL del iframe si es necesario
    const match = property.youtubeiframe.match(/src="([^"]+)"/);
    videoUrl = match ? match[1] : property.youtubeiframe;
  }

  // Construir etapas con delivery_date si es proyecto
  let etapas: any[] = [];
  if (property.is_project_v2 && property.delivery_date) {
    etapas = [{
      nombre: 'Entrega',
      fecha_entrega: property.delivery_date,
      estado: 'pendiente',
    }];
  }

  // Mapear condition de Alterestate a integer (1-5)
  // Alterestate puede usar strings como "new", "excellent", "good", etc.
  let conditionValue: number | null = null;
  if (property.condition) {
    const conditionMap: Record<string, number> = {
      'new': 5,
      'nuevo': 5,
      'excellent': 4,
      'excelente': 4,
      'good': 3,
      'bueno': 3,
      'fair': 2,
      'regular': 2,
      'poor': 1,
      'malo': 1,
    };
    const condLower = property.condition.toLowerCase();
    conditionValue = conditionMap[condLower] || null;
  }

  return {
    tenant_id: tenantId,

    // Identificadores externos
    external_id: property.cid?.toString(),
    external_source: 'alterestate',
    external_url: property.external_route || null,

    // Datos básicos
    titulo: property.name,
    codigo: `AE-${property.cid}`,
    descripcion: property.description || property.short_description || null,
    slug: slug,

    // Tipo y operación
    tipo: mapPropertyType(categoryName),
    operacion: operacion,
    estado_propiedad: mapStatus(property.status),

    // Precios
    precio: precioVenta || precioAlquiler || precioMin || null,
    precio_venta: precioVenta,
    precio_alquiler: precioAlquiler,
    precio_min: precioMin,
    precio_max: precioMax,
    moneda: property.currency_sale || property.currency_rent || property.currency_furnished || 'USD',
    maintenance: property.maintenance_fee || null,

    // Características físicas
    habitaciones: property.room || habMin || null,
    banos: property.bathroom || banosMin || null,
    medios_banos: property.half_bathrooms || null,
    estacionamientos: property.parkinglot || parqueosMin || null,
    m2_construccion: property.property_area || m2Min || null,
    m2_terreno: property.terrain_area || null,
    floor_level: property.floor_level || null,
    pisos: property.total_floors || null,
    year_built: property.year_construction || null,
    condition: conditionValue,

    // Rangos (para proyectos)
    habitaciones_min: habMin,
    habitaciones_max: habMax,
    banos_min: banosMin,
    banos_max: banosMax,
    parqueos_min: parqueosMin,
    parqueos_max: parqueosMax,
    m2_min: m2Min,
    m2_max: m2Max,

    // Ubicación
    pais: 'República Dominicana',
    provincia: property.province || null,
    ciudad: property.city || null,
    sector: property.sector || null,

    // Flags
    destacada: property.featured || false,
    exclusiva: property.exclusive || false,
    is_project: property.is_project_v2 || false,
    is_furnished: property.furnished || false,

    // Red global (Property Bank de Alterestate)
    red_global: property.show_on_propertybank || false,
    share_commission: property.share_comision || null,

    // Multimedia
    imagen_principal: imagenPrincipal || (images.length > 0 ? images[0] : null),
    imagenes: JSON.stringify(images),
    video_url: videoUrl,
    tour_virtual_url: property.virtual_tour || null,

    // Amenidades y tags
    amenidades: JSON.stringify(property.amenities || []),
    tags: JSON.stringify(property.tags || []),

    // Etapas (para proyectos)
    etapas: JSON.stringify(etapas),

    // Características adicionales (guardamos lo extra para referencia)
    caracteristicas: JSON.stringify({
      agente_nombre: agenteName,
      agents: property.agents || [],
      condition_original: property.condition || null,
      furnished_price: property.furnished_price || null,
      rental_price: property.rental_price || null,
      masterbroker: property.masterbroker || false,
      delivery_date: property.delivery_date || null,
    }),

    // Estado
    activo: true,
    publicada: mapStatus(property.status) === 'disponible',
  };
}

// ============================================================================
// FUNCIONES DE IMPORTACIÓN
// ============================================================================

/**
 * Verifica si una propiedad ya existe en la base de datos
 */
async function propertyExists(tenantId: string, externalId: string): Promise<string | null> {
  const sql = `
    SELECT id FROM propiedades
    WHERE tenant_id = $1
      AND external_id = $2
      AND external_source = 'alterestate'
    LIMIT 1
  `;

  const result = await query(sql, [tenantId, externalId]);
  return result.rows[0]?.id || null;
}

/**
 * Extrae el nombre del agente de diferentes formatos posibles
 */
function extractAgentName(agent: any): string | null {
  if (!agent) return null;

  // Si es string, usarlo directamente
  if (typeof agent === 'string') {
    return agent.trim() || null;
  }

  // Si es objeto, buscar propiedades comunes de nombre
  if (typeof agent === 'object') {
    const name = agent.name || agent.nombre || agent.full_name || agent.fullName ||
      (agent.first_name && agent.last_name ? `${agent.first_name} ${agent.last_name}` : null) ||
      (agent.firstName && agent.lastName ? `${agent.firstName} ${agent.lastName}` : null);
    return name ? String(name).trim() : null;
  }

  return null;
}

/**
 * Busca o crea un usuario por nombre (para asignar como agente)
 */
async function findOrCreateAgent(tenantId: string, agentInput: any): Promise<string | null> {
  const agentName = extractAgentName(agentInput);
  if (!agentName) return null;

  // Buscar usuario existente por nombre (usando la tabla de relación usuarios_tenants)
  const searchSql = `
    SELECT u.id
    FROM usuarios u
    INNER JOIN usuarios_tenants ut ON u.id = ut.usuario_id
    WHERE ut.tenant_id = $1
      AND ut.activo = true
      AND u.activo = true
      AND (u.nombre ILIKE $2 OR CONCAT(u.nombre, ' ', u.apellido) ILIKE $2)
    LIMIT 1
  `;

  const result = await query(searchSql, [tenantId, `%${agentName}%`]);

  if (result.rows.length > 0) {
    return result.rows[0].id;
  }

  // No crear usuario automáticamente, solo retornar null
  console.log(`⚠️ Agent not found: ${agentName}`);
  return null;
}

/**
 * Importa una sola propiedad a la base de datos
 */
async function importSingleProperty(
  property: AlterestateProperty,
  tenantId: string,
  apiKey: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const externalId = property.cid?.toString();

    // Verificar si ya existe
    const existingId = await propertyExists(tenantId, externalId);
    if (existingId) {
      return { success: false, error: 'Property already exists' };
    }

    // SIEMPRE obtener detalle completo para tener todas las fotos
    // El listado solo trae featured_image, pero el detalle trae photos[] completo
    let fullProperty = property;
    if (property.slug) {
      try {
        console.log(`📸 Fetching full detail for photos: ${property.slug}`);
        fullProperty = await fetchPropertyDetail(apiKey, property.slug, property);

        // Debug: mostrar cuántas fotos se encontraron
        const photoCount = fullProperty.photos?.length || 0;
        const galleryCount = Array.isArray(fullProperty.gallery_image)
          ? fullProperty.gallery_image.length
          : (fullProperty.gallery_image ? 1 : 0);
        console.log(`  📷 Photos found: ${photoCount} from photos[], ${galleryCount} from gallery_image`);
      } catch (e) {
        console.log(`⚠️ Could not fetch detail for ${property.slug}, using summary`);
      }
    }

    // Transformar datos
    const propertyData = transformProperty(fullProperty, tenantId);

    // Buscar agente si existe
    if (fullProperty.agents && fullProperty.agents.length > 0) {
      const agentId = await findOrCreateAgent(tenantId, fullProperty.agents[0]);
      if (agentId) {
        propertyData.agente_id = agentId;
      }
    }

    // Construir query de inserción
    const columns = Object.keys(propertyData);
    const values = Object.values(propertyData);
    const placeholders = columns.map((_, i) => `$${i + 1}`);

    const insertSql = `
      INSERT INTO propiedades (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING id, titulo
    `;

    // Debug: log query para ver qué se está enviando
    console.log('📝 Insert columns:', columns.join(', '));

    const result = await query(insertSql, values);

    return {
      success: true,
      id: result.rows[0].id,
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Importa múltiples propiedades (modo batch)
 */
export async function importProperties(
  tenantId: string,
  apiKey: string,
  options: {
    limit?: number;
    cid?: number;
  } = {}
): Promise<ImportResult> {
  const { limit = 10, cid } = options;

  const result: ImportResult = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    imported: [],
  };

  let properties: AlterestateProperty[];

  if (cid) {
    // Importar una sola propiedad
    const property = await fetchPropertyByCid(apiKey, cid);
    if (!property) {
      result.errors.push({ cid, error: 'Property not found in Alterestate' });
      result.failed = 1;
      return result;
    }
    properties = [property];
  } else {
    // Obtener todas y limitar
    const allProperties = await fetchAllProperties(apiKey);
    properties = allProperties.slice(0, limit);
  }

  console.log(`📥 Starting import of ${properties.length} properties...`);

  for (const property of properties) {
    console.log(`\n📦 Importing: ${property.name} (CID: ${property.cid})`);

    const importResult = await importSingleProperty(property, tenantId, apiKey);

    if (importResult.success) {
      result.success++;
      result.imported.push({
        id: importResult.id!,
        titulo: property.name,
        cid: property.cid,
      });
      console.log(`✅ Imported: ${property.name}`);
    } else if (importResult.error === 'Property already exists') {
      result.skipped++;
      console.log(`⏭️ Skipped (exists): ${property.name}`);
    } else {
      result.failed++;
      result.errors.push({
        cid: property.cid,
        error: importResult.error || 'Unknown error',
      });
      console.log(`❌ Failed: ${property.name} - ${importResult.error}`);
    }
  }

  console.log(`\n📊 Import completed: ${result.success} success, ${result.skipped} skipped, ${result.failed} failed`);

  return result;
}

/**
 * Sincroniza propiedades (actualiza existentes, crea nuevas)
 */
export async function syncProperties(
  tenantId: string,
  apiKey: string,
  options: {
    limit?: number;
  } = {}
): Promise<SyncResult> {
  const { limit = 10 } = options;

  const result: SyncResult = {
    created: 0,
    updated: 0,
    unchanged: 0,
    failed: 0,
    changes: [],
    errors: [],
  };

  const allProperties = await fetchAllProperties(apiKey);
  const properties = allProperties.slice(0, limit);

  console.log(`🔄 Starting sync of ${properties.length} properties...`);

  for (const property of properties) {
    console.log(`\n🔄 Syncing: ${property.name} (CID: ${property.cid})`);

    try {
      const externalId = property.cid?.toString();
      const existingId = await propertyExists(tenantId, externalId);

      // SIEMPRE obtener detalle completo para tener todas las fotos
      let fullProperty = property;
      if (property.slug) {
        try {
          console.log(`📸 Fetching full detail for photos: ${property.slug}`);
          fullProperty = await fetchPropertyDetail(apiKey, property.slug, property);

          // Debug: mostrar cuántas fotos se encontraron
          const photoCount = fullProperty.photos?.length || 0;
          const galleryCount = Array.isArray(fullProperty.gallery_image)
            ? fullProperty.gallery_image.length
            : (fullProperty.gallery_image ? 1 : 0);
          console.log(`  📷 Photos found: ${photoCount} from photos[], ${galleryCount} from gallery_image`);
        } catch (e) {
          console.log(`⚠️ Could not fetch detail, using summary`);
        }
      }

      const propertyData = transformProperty(fullProperty, tenantId);

      // Buscar agente
      if (fullProperty.agents && fullProperty.agents.length > 0) {
        const agentId = await findOrCreateAgent(tenantId, fullProperty.agents[0]);
        if (agentId) {
          propertyData.agente_id = agentId;
        }
      }

      if (!existingId) {
        // Crear nueva
        const columns = Object.keys(propertyData);
        const values = Object.values(propertyData);
        const placeholders = columns.map((_, i) => `$${i + 1}`);

        const insertSql = `
          INSERT INTO propiedades (${columns.join(', ')})
          VALUES (${placeholders.join(', ')})
          RETURNING id
        `;

        await query(insertSql, values);
        result.created++;
        result.changes.push({ cid: property.cid, action: 'created' });
        console.log(`✨ Created: ${property.name}`);

      } else {
        // Actualizar existente
        const updateColumns = Object.keys(propertyData)
          .filter(col => col !== 'tenant_id') // No actualizar tenant_id
          .map((col, i) => `${col} = $${i + 1}`);

        const updateValues = Object.entries(propertyData)
          .filter(([col]) => col !== 'tenant_id')
          .map(([, val]) => val);

        updateValues.push(existingId); // Para el WHERE

        const updateSql = `
          UPDATE propiedades
          SET ${updateColumns.join(', ')}, updated_at = NOW()
          WHERE id = $${updateValues.length}
        `;

        await query(updateSql, updateValues);
        result.updated++;
        result.changes.push({ cid: property.cid, action: 'updated' });
        console.log(`🔄 Updated: ${property.name}`);
      }

    } catch (error: any) {
      result.failed++;
      result.errors.push({
        cid: property.cid,
        error: error.message,
      });
      console.log(`❌ Failed: ${property.name} - ${error.message}`);
    }
  }

  console.log(`\n📊 Sync completed: ${result.created} created, ${result.updated} updated, ${result.failed} failed`);

  return result;
}

/**
 * Analiza las propiedades disponibles sin importar
 */
export async function analyzeProperties(
  tenantId: string,
  apiKey: string
): Promise<AnalysisResult> {
  const properties = await fetchAllProperties(apiKey);

  // Obtener detalle de la primera propiedad como muestra
  let sampleProperty = null;
  if (properties.length > 0) {
    try {
      sampleProperty = await fetchPropertyDetail(apiKey, properties[0].slug, properties[0]);
    } catch (e) {
      sampleProperty = properties[0];
    }
  }

  // Calcular cobertura de campos
  const fieldCoverage: Record<string, number> = {};
  const fieldsToCheck = [
    'name', 'description', 'sale_price', 'rent_price', 'category',
    'room', 'bathroom', 'parkinglot', 'property_area', 'terrain_area',
    'province', 'city', 'sector', 'address', 'latitude', 'longitude',
    'featured_image', 'gallery_image', 'agents', 'amenities'
  ];

  for (const field of fieldsToCheck) {
    const count = properties.filter((p: any) => p[field] != null && p[field] !== '').length;
    fieldCoverage[field] = Math.round((count / properties.length) * 100);
  }

  return {
    totalCount: properties.length,
    sampleProperty,
    fieldCoverage,
  };
}

/**
 * Verifica la conexión con Alterestate
 */
export async function testConnection(apiKey: string): Promise<{ success: boolean; message: string; count?: number }> {
  try {
    const headers = getHeaders(apiKey);
    const response = await fetch(`${ALTERESTATE_API_BASE}/properties/filter/`, { headers });

    if (!response.ok) {
      return {
        success: false,
        message: `API Error: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json() as AlterestateApiResponse;
    const count = data.count || (data.results || data.data || []).length;

    return {
      success: true,
      message: 'Connection successful',
      count,
    };

  } catch (error: any) {
    return {
      success: false,
      message: `Connection failed: ${error.message}`,
    };
  }
}
