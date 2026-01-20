/**
 * Geocoding Service
 * Integración con Google Places y Geocoding API para:
 * - Autocompletar direcciones
 * - Obtener coordenadas desde direcciones
 * - Desglosar direcciones en componentes
 */

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
  console.warn('⚠️ GOOGLE_API_KEY not configured - Geocoding features will be limited');
}

// Tipos para respuestas de Google API
interface GoogleApiResponse {
  status: string;
  error_message?: string;
  predictions?: PlacePrediction[];
  result?: any;
  results?: any[];
}

// Tipos para los resultados de Google
export interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  types: string[];
}

export interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export interface GeocodedAddress {
  formatted_address: string;
  place_id: string;
  // Coordenadas
  lat: number;
  lng: number;
  // Componentes desglosados
  pais?: string;
  pais_code?: string;
  provincia?: string;
  ciudad?: string;
  sector?: string;
  zona?: string;
  direccion?: string;
  codigo_postal?: string;
  // Datos adicionales
  types: string[];
}

// ============================================
// AUTOCOMPLETE - Sugerencias de direcciones
// ============================================

/**
 * Obtiene sugerencias de direcciones mientras el usuario escribe
 * @param input - Texto parcial de la dirección
 * @param sessionToken - Token de sesión para agrupar requests (reduce costos)
 * @param countryRestriction - Código de país para filtrar (ej: 'do' para República Dominicana)
 */
export async function getPlaceAutocomplete(
  input: string,
  sessionToken?: string,
  countryRestriction?: string
): Promise<PlacePrediction[]> {
  if (!GOOGLE_API_KEY) {
    console.warn('GOOGLE_API_KEY not configured');
    return [];
  }

  if (!input || input.length < 3) {
    return [];
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.append('input', input);
    url.searchParams.append('key', GOOGLE_API_KEY);
    url.searchParams.append('types', 'address');
    url.searchParams.append('language', 'es');

    if (sessionToken) {
      url.searchParams.append('sessiontoken', sessionToken);
    }

    if (countryRestriction) {
      url.searchParams.append('components', `country:${countryRestriction}`);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.statusText}`);
    }

    const data = await response.json() as GoogleApiResponse;

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data.status, data.error_message);
      return [];
    }

    return data.predictions || [];
  } catch (error) {
    console.error('Error in getPlaceAutocomplete:', error);
    return [];
  }
}

// ============================================
// PLACE DETAILS - Obtener detalles de un lugar
// ============================================

/**
 * Obtiene los detalles completos de un lugar por su place_id
 * @param placeId - ID del lugar de Google Places
 * @param sessionToken - Token de sesión (importante para facturación)
 */
export async function getPlaceDetails(
  placeId: string,
  sessionToken?: string
): Promise<GeocodedAddress | null> {
  if (!GOOGLE_API_KEY) {
    console.warn('GOOGLE_API_KEY not configured');
    return null;
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.append('place_id', placeId);
    url.searchParams.append('key', GOOGLE_API_KEY);
    url.searchParams.append('language', 'es');
    url.searchParams.append('fields', 'formatted_address,geometry,address_components,types');

    if (sessionToken) {
      url.searchParams.append('sessiontoken', sessionToken);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.statusText}`);
    }

    const data = await response.json() as GoogleApiResponse;

    if (data.status !== 'OK') {
      console.error('Google Places API error:', data.status, data.error_message);
      return null;
    }

    const result = data.result;
    const components = result.address_components as AddressComponent[];

    // Extraer componentes de la dirección
    const address = parseAddressComponents(components);

    return {
      formatted_address: result.formatted_address,
      place_id: placeId,
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      ...address,
      types: result.types || [],
    };
  } catch (error) {
    console.error('Error in getPlaceDetails:', error);
    return null;
  }
}

// ============================================
// GEOCODING - Convertir dirección a coordenadas
// ============================================

/**
 * Convierte una dirección de texto a coordenadas y componentes
 * @param address - Dirección completa en texto
 */
export async function geocodeAddress(address: string): Promise<GeocodedAddress | null> {
  if (!GOOGLE_API_KEY) {
    console.warn('GOOGLE_API_KEY not configured');
    return null;
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.append('address', address);
    url.searchParams.append('key', GOOGLE_API_KEY);
    url.searchParams.append('language', 'es');

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Google Geocoding API error: ${response.statusText}`);
    }

    const data = await response.json() as GoogleApiResponse;

    if (data.status !== 'OK') {
      if (data.status === 'ZERO_RESULTS') {
        return null;
      }
      console.error('Google Geocoding API error:', data.status, data.error_message);
      return null;
    }

    const result = data.results[0];
    const components = result.address_components as AddressComponent[];
    const parsedAddress = parseAddressComponents(components);

    return {
      formatted_address: result.formatted_address,
      place_id: result.place_id,
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      ...parsedAddress,
      types: result.types || [],
    };
  } catch (error) {
    console.error('Error in geocodeAddress:', error);
    return null;
  }
}

// ============================================
// REVERSE GEOCODING - Convertir coordenadas a dirección
// ============================================

/**
 * Convierte coordenadas a una dirección
 * @param lat - Latitud
 * @param lng - Longitud
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GeocodedAddress | null> {
  if (!GOOGLE_API_KEY) {
    console.warn('GOOGLE_API_KEY not configured');
    return null;
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.append('latlng', `${lat},${lng}`);
    url.searchParams.append('key', GOOGLE_API_KEY);
    url.searchParams.append('language', 'es');

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Google Geocoding API error: ${response.statusText}`);
    }

    const data = await response.json() as GoogleApiResponse;

    if (data.status !== 'OK') {
      console.error('Google Geocoding API error:', data.status, data.error_message);
      return null;
    }

    const result = data.results[0];
    const components = result.address_components as AddressComponent[];
    const parsedAddress = parseAddressComponents(components);

    return {
      formatted_address: result.formatted_address,
      place_id: result.place_id,
      lat,
      lng,
      ...parsedAddress,
      types: result.types || [],
    };
  } catch (error) {
    console.error('Error in reverseGeocode:', error);
    return null;
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Parsea los componentes de dirección de Google a nuestro formato
 */
function parseAddressComponents(components: AddressComponent[]): Partial<GeocodedAddress> {
  const result: Partial<GeocodedAddress> = {};

  for (const component of components) {
    const types = component.types;

    // País
    if (types.includes('country')) {
      result.pais = component.long_name;
      result.pais_code = component.short_name;
    }

    // Provincia/Estado/Región
    if (types.includes('administrative_area_level_1')) {
      result.provincia = component.long_name;
    }

    // Ciudad/Municipio
    if (types.includes('locality') || types.includes('administrative_area_level_2')) {
      if (!result.ciudad) {
        result.ciudad = component.long_name;
      }
    }

    // Sector/Barrio/Colonia
    if (types.includes('sublocality') || types.includes('sublocality_level_1') ||
        types.includes('neighborhood')) {
      result.sector = component.long_name;
    }

    // Zona más específica
    if (types.includes('sublocality_level_2') || types.includes('sublocality_level_3')) {
      result.zona = component.long_name;
    }

    // Código postal
    if (types.includes('postal_code')) {
      result.codigo_postal = component.long_name;
    }

    // Dirección (calle y número)
    if (types.includes('route')) {
      result.direccion = component.long_name;
    }

    // Número de calle
    if (types.includes('street_number')) {
      result.direccion = result.direccion
        ? `${result.direccion} ${component.long_name}`
        : component.long_name;
    }
  }

  return result;
}

/**
 * Genera un token de sesión único para agrupar requests de autocomplete
 * Esto reduce costos ya que Google cobra por sesión, no por request
 */
export function generateSessionToken(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}
