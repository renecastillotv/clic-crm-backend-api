/**
 * translations.ts
 *
 * Utilidades centralizadas para resolver traducciones en todo el sistema.
 * Maneja la lógica de fallback a español cuando no existe traducción.
 *
 * ARQUITECTURA:
 * - Idioma por defecto: 'es' (español)
 * - Idiomas soportados: es, en, fr, pt (extensible)
 * - Formato de traducciones: { "en": { campo1: "...", campo2: "..." }, "fr": { ... } }
 */

// Idioma por defecto del sistema
export const DEFAULT_LANGUAGE = 'es';

// Idiomas soportados (extensible)
export const SUPPORTED_LANGUAGES = ['es', 'en', 'fr', 'pt'];

/**
 * Verifica si un idioma es soportado
 */
export function isLanguageSupported(lang: string): boolean {
  return SUPPORTED_LANGUAGES.includes(lang);
}

/**
 * Normaliza un código de idioma (lowercase, solo primeros 2 caracteres)
 */
export function normalizeLanguage(lang: string | undefined | null): string {
  if (!lang) return DEFAULT_LANGUAGE;
  const normalized = lang.toLowerCase().substring(0, 2);
  return isLanguageSupported(normalized) ? normalized : DEFAULT_LANGUAGE;
}

/**
 * Resuelve un valor traducido de un objeto con traducciones
 *
 * @param baseValue - Valor en español (idioma por defecto)
 * @param traducciones - Objeto de traducciones { "en": { campo: "..." }, ... }
 * @param campo - Nombre del campo a buscar en traducciones
 * @param idioma - Código del idioma solicitado
 * @returns Valor traducido o valor base como fallback
 *
 * @example
 * const titulo = resolveTranslatedField(
 *   propiedad.titulo,
 *   propiedad.traducciones,
 *   'titulo',
 *   'en'
 * );
 */
export function resolveTranslatedField<T>(
  baseValue: T,
  traducciones: Record<string, Record<string, any>> | null | undefined,
  campo: string,
  idioma: string
): T {
  // Si es español o no hay traducciones, retornar valor base
  const lang = normalizeLanguage(idioma);
  if (lang === DEFAULT_LANGUAGE || !traducciones) {
    return baseValue;
  }

  // Buscar traducción
  const traduccion = traducciones[lang];
  if (traduccion && traduccion[campo] !== undefined && traduccion[campo] !== null && traduccion[campo] !== '') {
    return traduccion[campo] as T;
  }

  // Fallback a valor base
  return baseValue;
}

/**
 * Resuelve múltiples campos traducidos de un objeto
 *
 * @param item - Objeto con campos base y traducciones
 * @param campos - Array de nombres de campos a traducir
 * @param idioma - Código del idioma solicitado
 * @returns Objeto con campos traducidos
 *
 * @example
 * const propiedadTraducida = resolveTranslatedObject(
 *   propiedad,
 *   ['titulo', 'descripcion', 'descripcion_corta'],
 *   'en'
 * );
 */
export function resolveTranslatedObject<T extends Record<string, any>>(
  item: T,
  campos: string[],
  idioma: string
): T {
  const lang = normalizeLanguage(idioma);

  // Si es español, retornar objeto sin modificar
  if (lang === DEFAULT_LANGUAGE) {
    return item;
  }

  // Crear copia del objeto
  const result = { ...item };
  const traducciones = item.traducciones as Record<string, Record<string, any>> | undefined;

  // Si no hay traducciones, retornar original
  if (!traducciones) {
    return result;
  }

  // Resolver cada campo
  for (const campo of campos) {
    if (campo in result) {
      result[campo] = resolveTranslatedField(
        result[campo],
        traducciones,
        campo,
        lang
      );
    }
  }

  return result;
}

/**
 * Resuelve traducciones para un array de objetos
 *
 * @param items - Array de objetos a traducir
 * @param campos - Campos a traducir en cada objeto
 * @param idioma - Código del idioma
 * @returns Array con objetos traducidos
 */
export function resolveTranslatedArray<T extends Record<string, any>>(
  items: T[],
  campos: string[],
  idioma: string
): T[] {
  const lang = normalizeLanguage(idioma);

  // Si es español, retornar sin modificar
  if (lang === DEFAULT_LANGUAGE) {
    return items;
  }

  return items.map(item => resolveTranslatedObject(item, campos, lang));
}

/**
 * Campos traducibles por tipo de contenido
 * Esto permite saber qué campos traducir automáticamente
 */
export const TRANSLATABLE_FIELDS: Record<string, string[]> = {
  // Contenido dinámico
  propiedades: ['titulo', 'descripcion', 'descripcion_corta'],
  articulos: ['titulo', 'extracto', 'contenido', 'meta_titulo', 'meta_descripcion'],
  videos: ['titulo', 'descripcion'],
  testimonios: ['titulo', 'contenido'],
  faqs: ['pregunta', 'respuesta'],
  perfiles_asesor: ['biografia', 'especialidades'],
  categorias_contenido: ['nombre', 'descripcion'],
  seo_stats: ['titulo', 'descripcion', 'keywords'],

  // Componentes - campos comunes
  componentes: [
    'titulo', 'subtitulo', 'descripcion', 'textoBoton', 'textoBotonContacto',
    'badgeTexto', 'badgeSubtexto', 'copyright', 'links', 'beneficios',
    'columnas', 'features', 'items'
  ],
};

/**
 * Obtiene los campos traducibles para un tipo de contenido
 */
export function getTranslatableFields(tipo: string): string[] {
  return TRANSLATABLE_FIELDS[tipo] || [];
}

/**
 * Resuelve datos de componente con traducciones
 * Maneja la estructura especial de componentes: { static_data, traducciones, toggles, styles }
 *
 * @param datos - Datos del componente
 * @param idioma - Código del idioma
 * @returns Datos con static_data traducido
 */
export function resolveComponentTranslations(
  datos: Record<string, any> | null | undefined,
  idioma: string
): Record<string, any> {
  if (!datos) {
    console.log(`🔤 [resolveComponentTranslations] Datos vacíos, retornando estructura vacía`);
    return { static_data: {}, toggles: {}, styles: {} };
  }

  const lang = normalizeLanguage(idioma);
  console.log(`🔤 [resolveComponentTranslations] Idioma recibido: ${idioma} → normalizado: ${lang}`);

  // Si es español, retornar sin modificar
  if (lang === DEFAULT_LANGUAGE) {
    console.log(`🔤 [resolveComponentTranslations] Idioma es español, retornando sin cambios`);
    return datos;
  }

  const { static_data = {}, traducciones = {}, toggles = {}, styles = {}, ...rest } = datos;

  console.log(`🔤 [resolveComponentTranslations] Verificando traducciones:`, {
    hasTraducciones: !!traducciones,
    traduccionesKeys: Object.keys(traducciones),
    hasTraduccionLang: !!traducciones[lang],
    staticDataKeys: Object.keys(static_data)
  });

  // Si no hay traducciones para este idioma, retornar original
  if (!traducciones[lang]) {
    console.log(`🔤 [resolveComponentTranslations] No hay traducciones para ${lang}, retornando original`);
    return datos;
  }

  // Mezclar static_data con traducciones del idioma
  const traduccionesIdioma = traducciones[lang];
  const staticDataTraducido = { ...static_data };
  const camposTraducidos: string[] = [];

  // Sobrescribir campos que existan en traducciones
  for (const [key, value] of Object.entries(traduccionesIdioma)) {
    if (value !== undefined && value !== null && value !== '') {
      staticDataTraducido[key] = value;
      camposTraducidos.push(key);
    }
  }

  console.log(`🔤 [resolveComponentTranslations] Traducciones aplicadas:`, {
    camposTraducidos,
    totalCampos: camposTraducidos.length
  });

  return {
    ...rest,
    static_data: staticDataTraducido,
    traducciones, // Mantener traducciones originales por si se necesitan
    toggles,
    styles,
  };
}

/**
 * Helper para crear estructura de traducciones vacía para un componente
 * Útil para el CRM al crear/editar componentes
 */
export function createEmptyTranslations(idiomas: string[] = SUPPORTED_LANGUAGES): Record<string, Record<string, any>> {
  const result: Record<string, Record<string, any>> = {};
  for (const idioma of idiomas) {
    if (idioma !== DEFAULT_LANGUAGE) {
      result[idioma] = {};
    }
  }
  return result;
}

/**
 * Verifica si un objeto tiene traducciones para un idioma específico
 */
export function hasTranslation(
  traducciones: Record<string, any> | null | undefined,
  idioma: string
): boolean {
  if (!traducciones) return false;
  const lang = normalizeLanguage(idioma);
  if (lang === DEFAULT_LANGUAGE) return true;
  return !!traducciones[lang] && Object.keys(traducciones[lang]).length > 0;
}

/**
 * Construye condición SQL para buscar por slug con soporte de traducciones
 *
 * LÓGICA:
 * - Si idioma es español: buscar solo en campo `slug`
 * - Si idioma NO es español: buscar en slug_traducciones[idioma] con fallback a slug
 *
 * @param slugColumn - Nombre de la columna slug (ej: 'slug', 'v.slug')
 * @param slugParam - Placeholder del parámetro ($1, $2, etc.)
 * @param idioma - Código del idioma
 * @returns Condición SQL para WHERE
 *
 * @example
 * // Para español:
 * buildSlugSearchCondition('slug', '$1', 'es')
 * // => "slug = $1"
 *
 * // Para inglés:
 * buildSlugSearchCondition('slug', '$1', 'en')
 * // => "(slug_traducciones->>'en' = $1 OR slug = $1)"
 */
export function buildSlugSearchCondition(
  slugColumn: string,
  slugParam: string,
  idioma: string
): string {
  const lang = normalizeLanguage(idioma);

  // Extraer el prefijo de tabla si existe (ej: 'v.slug' -> 'v.')
  const tablePrefixMatch = slugColumn.match(/^(.+\.)/);
  const tablePrefix = tablePrefixMatch ? tablePrefixMatch[1] : '';

  if (lang === DEFAULT_LANGUAGE) {
    // Español: buscar directamente en slug
    return `${slugColumn} = ${slugParam}`;
  }

  // Otro idioma: buscar en slug_traducciones[idioma] con fallback a slug
  return `(${tablePrefix}slug_traducciones->>'${lang}' = ${slugParam} OR ${slugColumn} = ${slugParam})`;
}
