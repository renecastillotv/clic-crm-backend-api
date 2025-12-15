/**
 * Translation & Slug Service
 * Handles translations using Google Translate API and slug generation
 */

import { query } from '../utils/db.js';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// Idiomas soportados con sus nombres
const SUPPORTED_LANGUAGES: Record<string, string> = {
  es: 'Spanish',
  en: 'English',
  fr: 'French',
  pt: 'Portuguese',
  de: 'German',
  it: 'Italian',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ru: 'Russian',
  ar: 'Arabic',
};

// ============================================
// GOOGLE TRANSLATE API
// ============================================

/**
 * Traduce texto usando Google Translate API
 */
export async function translateWithGoogle(
  text: string,
  targetLanguage: string,
  sourceLanguage: string = 'es'
): Promise<string> {
  if (!GOOGLE_API_KEY) {
    console.warn('⚠️ GOOGLE_API_KEY not configured - returning original text');
    return text;
  }

  if (!text || text.trim() === '') {
    return '';
  }

  // Si el idioma destino es igual al origen, retornar el texto original
  if (targetLanguage === sourceLanguage) {
    return text;
  }

  try {
    const url = new URL('https://translation.googleapis.com/language/translate/v2');
    url.searchParams.append('key', GOOGLE_API_KEY);
    url.searchParams.append('q', text);
    url.searchParams.append('target', targetLanguage);
    url.searchParams.append('source', sourceLanguage);
    url.searchParams.append('format', 'text');

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Translate API error:', response.status, errorText);
      throw new Error(`Google Translate API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.data?.translations?.[0]?.translatedText) {
      throw new Error('No translation returned from Google Translate');
    }

    return data.data.translations[0].translatedText;
  } catch (error) {
    console.error('Error translating with Google:', error);
    // En caso de error, retornar el texto original
    return text;
  }
}

// ============================================
// SLUG GENERATION
// ============================================

/**
 * Convierte un texto a slug (URL-friendly)
 * Ejemplo: "Casa de Playa en Punta Cana" -> "casa-de-playa-en-punta-cana"
 */
export function textToSlug(text: string): string {
  if (!text) return '';

  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '') // Solo letras, números, espacios y guiones
    .replace(/\s+/g, '-') // Espacios a guiones
    .replace(/-+/g, '-') // Múltiples guiones a uno
    .replace(/^-|-$/g, '') // Remover guiones al inicio/final
    .substring(0, 100); // Limitar longitud
}

/**
 * Genera un slug único verificando duplicados en la base de datos
 * Si existe, agrega sufijo numérico (-2, -3, etc.)
 */
export async function generateUniqueSlug(
  baseSlug: string,
  tenantId: string,
  excludeId?: string,
  language: string = 'es'
): Promise<string> {
  if (!baseSlug) {
    baseSlug = 'propiedad';
  }

  let slug = baseSlug;
  let counter = 1;
  let isUnique = false;

  while (!isUnique) {
    // Buscar si existe el slug (en el campo slug principal o en slug_traducciones)
    let sql: string;
    let params: any[];

    if (language === 'es') {
      // Para español, verificar el campo slug principal
      sql = `
        SELECT id FROM propiedades
        WHERE tenant_id = $1 AND slug = $2 AND activo = true
        ${excludeId ? 'AND id != $3' : ''}
        LIMIT 1
      `;
      params = excludeId ? [tenantId, slug, excludeId] : [tenantId, slug];
    } else {
      // Para otros idiomas, verificar en slug_traducciones
      sql = `
        SELECT id FROM propiedades
        WHERE tenant_id = $1
        AND slug_traducciones->>$2 = $3
        AND activo = true
        ${excludeId ? 'AND id != $4' : ''}
        LIMIT 1
      `;
      params = excludeId
        ? [tenantId, language, slug, excludeId]
        : [tenantId, language, slug];
    }

    const result = await query(sql, params);

    if (result.rows.length === 0) {
      isUnique = true;
    } else {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    // Prevenir loop infinito
    if (counter > 100) {
      slug = `${baseSlug}-${Date.now()}`;
      isUnique = true;
    }
  }

  return slug;
}

// ============================================
// MULTI-LANGUAGE SLUG GENERATION
// ============================================

export interface SlugTraducciones {
  [language: string]: string;
}

/**
 * Obtiene los idiomas disponibles de un tenant
 */
export async function getTenantLanguages(tenantId: string): Promise<string[]> {
  const sql = `
    SELECT idiomas_disponibles FROM tenants WHERE id = $1
  `;
  const result = await query(sql, [tenantId]);

  if (!result.rows[0]?.idiomas_disponibles) {
    return ['es']; // Default a español
  }

  return result.rows[0].idiomas_disponibles;
}

/**
 * Genera slugs para todos los idiomas del tenant
 * @param titulo - Título en español (idioma base)
 * @param tenantId - ID del tenant
 * @param excludeId - ID de propiedad a excluir (para updates)
 * @returns Object con slug principal y slug_traducciones
 */
export async function generateMultiLanguageSlugs(
  titulo: string,
  tenantId: string,
  excludeId?: string
): Promise<{ slug: string; slug_traducciones: SlugTraducciones }> {
  // Obtener idiomas del tenant
  const languages = await getTenantLanguages(tenantId);

  // Generar slug base en español
  const baseSlugEs = textToSlug(titulo);
  const slugEs = await generateUniqueSlug(baseSlugEs, tenantId, excludeId, 'es');

  // Objeto para traducciones de slug
  const slugTraducciones: SlugTraducciones = {};

  // Generar slugs para cada idioma (excepto español que es el principal)
  for (const lang of languages) {
    if (lang === 'es') continue;

    try {
      // Traducir el título al idioma destino
      const tituloTraducido = await translateWithGoogle(titulo, lang, 'es');

      // Generar slug del título traducido
      const baseSlugLang = textToSlug(tituloTraducido);

      // Verificar unicidad para este idioma
      const slugLang = await generateUniqueSlug(baseSlugLang, tenantId, excludeId, lang);

      slugTraducciones[lang] = slugLang;

      console.log(`🌍 Slug ${lang}: "${titulo}" → "${tituloTraducido}" → "${slugLang}"`);
    } catch (error) {
      console.error(`Error generating slug for ${lang}:`, error);
      // Fallback: usar el slug español
      slugTraducciones[lang] = slugEs;
    }
  }

  return {
    slug: slugEs,
    slug_traducciones: slugTraducciones,
  };
}

/**
 * Regenera los slugs de una propiedad existente
 * Útil cuando se cambia el título o se quiere actualizar traducciones
 */
export async function regeneratePropertySlugs(
  propiedadId: string,
  tenantId: string,
  nuevoTitulo?: string
): Promise<{ slug: string; slug_traducciones: SlugTraducciones }> {
  // Si no se proporciona nuevo título, obtener el actual
  let titulo = nuevoTitulo;

  if (!titulo) {
    const sql = 'SELECT titulo FROM propiedades WHERE id = $1 AND tenant_id = $2';
    const result = await query(sql, [propiedadId, tenantId]);

    if (!result.rows[0]) {
      throw new Error('Propiedad no encontrada');
    }

    titulo = result.rows[0].titulo;
  }

  // Generar nuevos slugs excluyendo esta propiedad
  return generateMultiLanguageSlugs(titulo, tenantId, propiedadId);
}

// ============================================
// CONTENT TRANSLATION
// ============================================

export interface PropiedadTraducciones {
  [language: string]: {
    titulo?: string;
    descripcion?: string;
    short_description?: string;
    meta_title?: string;
    meta_description?: string;
  };
}

/**
 * Traduce el contenido de una propiedad a todos los idiomas del tenant
 */
export async function translatePropertyContent(
  content: {
    titulo: string;
    descripcion?: string;
    short_description?: string;
    meta_title?: string;
    meta_description?: string;
  },
  tenantId: string
): Promise<PropiedadTraducciones> {
  const languages = await getTenantLanguages(tenantId);
  const traducciones: PropiedadTraducciones = {};

  for (const lang of languages) {
    if (lang === 'es') continue; // El español es el idioma base

    traducciones[lang] = {};

    try {
      if (content.titulo) {
        traducciones[lang].titulo = await translateWithGoogle(content.titulo, lang, 'es');
      }

      if (content.descripcion) {
        traducciones[lang].descripcion = await translateWithGoogle(content.descripcion, lang, 'es');
      }

      if (content.short_description) {
        traducciones[lang].short_description = await translateWithGoogle(content.short_description, lang, 'es');
      }

      if (content.meta_title) {
        traducciones[lang].meta_title = await translateWithGoogle(content.meta_title, lang, 'es');
      }

      if (content.meta_description) {
        traducciones[lang].meta_description = await translateWithGoogle(content.meta_description, lang, 'es');
      }

      console.log(`🌍 Translated content to ${lang}`);
    } catch (error) {
      console.error(`Error translating content to ${lang}:`, error);
    }
  }

  return traducciones;
}

// ============================================
// SHORT DESCRIPTION GENERATION
// ============================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Genera una descripción corta impactante para una propiedad
 * Usa OpenAI si está disponible, si no, extrae de la descripción
 */
export async function generateShortDescription(
  titulo: string,
  descripcion: string | undefined,
  caracteristicas?: {
    habitaciones?: number;
    banos?: number;
    m2?: number;
    ubicacion?: string;
  }
): Promise<string> {
  // Si hay OpenAI configurado, usar IA para generar
  if (OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `Eres un experto en copywriting inmobiliario. Genera descripciones cortas, impactantes y persuasivas para propiedades.
              Las descripciones deben:
              - Tener máximo 200 caracteres
              - Ser en español
              - Destacar los puntos más atractivos
              - Crear urgencia o deseo
              - Ser profesionales pero cercanas`
            },
            {
              role: 'user',
              content: `Genera una descripción corta para esta propiedad:

Título: ${titulo}
${descripcion ? `Descripción: ${descripcion.substring(0, 500)}` : ''}
${caracteristicas?.habitaciones ? `Habitaciones: ${caracteristicas.habitaciones}` : ''}
${caracteristicas?.banos ? `Baños: ${caracteristicas.banos}` : ''}
${caracteristicas?.m2 ? `Metros cuadrados: ${caracteristicas.m2}` : ''}
${caracteristicas?.ubicacion ? `Ubicación: ${caracteristicas.ubicacion}` : ''}

Responde SOLO con la descripción corta, sin comillas ni explicaciones.`
            }
          ],
          max_tokens: 100,
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const shortDesc = data.choices?.[0]?.message?.content?.trim();
        if (shortDesc) {
          console.log('✨ Short description generada con OpenAI');
          return shortDesc.substring(0, 200);
        }
      }
    } catch (error) {
      console.error('Error generando short_description con OpenAI:', error);
    }
  }

  // Fallback: extraer de la descripción o generar básica
  if (descripcion) {
    // Limpiar HTML si existe
    const textoLimpio = descripcion
      .replace(/<[^>]*>/g, '') // Remover tags HTML
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Tomar las primeras oraciones hasta 200 caracteres
    const oraciones = textoLimpio.split(/[.!?]+/);
    let resumen = '';
    for (const oracion of oraciones) {
      if ((resumen + oracion).length <= 195) {
        resumen += (resumen ? '. ' : '') + oracion.trim();
      } else {
        break;
      }
    }

    if (resumen) {
      return resumen.substring(0, 197) + (resumen.length > 197 ? '...' : '');
    }
  }

  // Último fallback: usar el título
  return titulo.substring(0, 200);
}

// ============================================
// EXPORTS
// ============================================

export {
  SUPPORTED_LANGUAGES,
};
