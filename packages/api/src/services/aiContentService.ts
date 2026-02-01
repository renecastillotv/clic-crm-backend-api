/**
 * Servicio de Generación de Contenido con IA (OpenAI/ChatGPT)
 *
 * Genera contenido SEO-optimizado para:
 * - Artículos de blog
 * - FAQs (Preguntas frecuentes)
 * - SEO Stats (Fragmentos enriquecidos con estadísticas)
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// ==================== INTERFACES ====================

export interface ArticlePrompt {
  tema: string;
  tipoPropiedad?: string;
  operacion?: string;
  ubicacion?: string;
  palabrasClave?: string[];
  tono?: 'profesional' | 'casual' | 'informativo';
  longitud?: 'corto' | 'medio' | 'largo';
}

export interface GeneratedArticle {
  titulo: string;
  slug: string;
  extracto: string;
  contenido: string;
  metaTitulo: string;
  metaDescripcion: string;
  tags: string[];
}

export interface FAQPrompt {
  contexto: string;
  tipoPropiedad?: string;
  operacion?: string;
  ubicacion?: string;
  cantidad?: number;
}

export interface GeneratedFAQ {
  pregunta: string;
  respuesta: string;
}

export interface SeoStatPrompt {
  operaciones: string[];
  nombreUbicacion?: string;
  nombreTipoPropiedad?: string;
  tipoPropiedadIds?: string[];
  ubicacionIds?: string[];
  precioPromedio?: number;
  propiedadesDisponibles?: number;
}

export interface GeneratedSeoStat {
  titulo: string;
  descripcion: string;
  contenido: string;
  slug: string;
  metaTitulo: string;
  metaDescripcion: string;
  keywords: string[];
}

// ==================== HELPERS ====================

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 100);
}

async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<any> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no está configurada');
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Error de OpenAI: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Respuesta vacía de OpenAI');
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new Error('Error al parsear respuesta de OpenAI');
  }
}

// ==================== GENERADORES ====================

/**
 * Genera un artículo completo con IA
 */
export async function generateArticle(params: ArticlePrompt): Promise<GeneratedArticle> {
  const { tema, tipoPropiedad, operacion, ubicacion, palabrasClave, tono = 'profesional', longitud = 'medio' } = params;

  const palabrasTarget = longitud === 'corto' ? 500 : longitud === 'medio' ? 1000 : 1500;

  const systemPrompt = `Eres un escritor experto en bienes raíces para República Dominicana.
Genera contenido SEO-optimizado, profesional y útil para usuarios que buscan comprar o alquilar propiedades.

REGLAS IMPORTANTES:
- Título atractivo con keyword principal (máximo 70 caracteres)
- Extracto enganchante de 150-200 caracteres
- Contenido en HTML con etiquetas h2, h3, ul/li, y párrafos bien estructurados
- Meta título de máximo 60 caracteres
- Meta descripción de máximo 160 caracteres
- 3-5 tags relevantes en español
- Tono: ${tono}
- Longitud aproximada: ${palabrasTarget} palabras
- Incluir datos y consejos prácticos del mercado inmobiliario dominicano
- NO uses markdown, solo HTML válido para el contenido

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "titulo": "string",
  "slug": "string (solo minúsculas, guiones, sin acentos)",
  "extracto": "string",
  "contenido": "string (HTML)",
  "metaTitulo": "string",
  "metaDescripcion": "string",
  "tags": ["string"]
}`;

  let userPrompt = `Genera un artículo sobre: "${tema}"`;

  if (tipoPropiedad) userPrompt += `\nTipo de propiedad: ${tipoPropiedad}`;
  if (operacion) userPrompt += `\nOperación: ${operacion}`;
  if (ubicacion) userPrompt += `\nUbicación: ${ubicacion}`;
  if (palabrasClave?.length) userPrompt += `\nPalabras clave a incluir: ${palabrasClave.join(', ')}`;

  const result = await callOpenAI(systemPrompt, userPrompt);

  // Validar y normalizar respuesta
  return {
    titulo: result.titulo || tema,
    slug: result.slug || slugify(result.titulo || tema),
    extracto: result.extracto || '',
    contenido: result.contenido || '',
    metaTitulo: (result.metaTitulo || result.titulo || tema).substring(0, 60),
    metaDescripcion: (result.metaDescripcion || result.extracto || '').substring(0, 160),
    tags: Array.isArray(result.tags) ? result.tags : []
  };
}

/**
 * Genera un lote de FAQs con IA
 */
export async function generateFAQs(params: FAQPrompt): Promise<GeneratedFAQ[]> {
  const { contexto, tipoPropiedad, operacion, ubicacion, cantidad = 5 } = params;

  const systemPrompt = `Eres un experto en bienes raíces de República Dominicana.
Genera preguntas frecuentes naturales que los usuarios realmente harían, con respuestas útiles y prácticas.

REGLAS IMPORTANTES:
- Las preguntas deben ser naturales y variadas
- Las respuestas deben ser completas pero concisas (100-200 palabras cada una)
- Incluir información práctica: procesos, costos, documentos, tiempos, recomendaciones
- Usar lenguaje claro y profesional
- Contextualizar para el mercado dominicano cuando sea relevante

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "faqs": [
    { "pregunta": "string", "respuesta": "string" }
  ]
}`;

  let userPrompt = `Genera ${cantidad} preguntas frecuentes sobre: "${contexto}"`;

  if (tipoPropiedad) userPrompt += `\nTipo de propiedad: ${tipoPropiedad}`;
  if (operacion) userPrompt += `\nOperación: ${operacion}`;
  if (ubicacion) userPrompt += `\nUbicación: ${ubicacion}`;

  const result = await callOpenAI(systemPrompt, userPrompt);

  // Validar y normalizar respuesta
  if (!Array.isArray(result.faqs)) {
    throw new Error('Formato de respuesta inválido');
  }

  return result.faqs.map((faq: any) => ({
    pregunta: faq.pregunta || '',
    respuesta: faq.respuesta || ''
  })).filter((faq: GeneratedFAQ) => faq.pregunta && faq.respuesta);
}

/**
 * Genera un SEO Stat (fragmento enriquecido) con IA
 */
export async function generateSeoStat(params: SeoStatPrompt): Promise<GeneratedSeoStat> {
  const { operaciones, nombreUbicacion, nombreTipoPropiedad, precioPromedio, propiedadesDisponibles } = params;

  const operacionTexto = operaciones.includes('comprar') && operaciones.includes('alquilar')
    ? 'comprar y alquilar'
    : operaciones.includes('comprar') ? 'comprar' : 'alquilar';

  const systemPrompt = `Eres un experto en marketing inmobiliario y SEO para República Dominicana.
Genera contenido enriquecido con estadísticas y datos relevantes para posicionar páginas de resultados de búsqueda de propiedades.

OBJETIVO: Crear contenido SEO que ayude a posicionar en búsquedas como:
"${operacionTexto} ${nombreTipoPropiedad || 'propiedad'} en ${nombreUbicacion || 'República Dominicana'}"

INCLUIR EN EL CONTENIDO:
- Información sobre precios y tendencias del mercado en la zona
- Ventajas de la ubicación o tipo de propiedad
- Datos relevantes sobre servicios y amenidades cercanas
- Consejos para compradores o inquilinos
- Estadísticas del sector inmobiliario (puedes inventar datos razonables)

FORMATO:
- HTML con secciones claras (h2, h3, p, ul/li)
- Datos presentados de forma atractiva
- Texto natural, profesional y útil
- 300-500 palabras

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "titulo": "string (máximo 70 caracteres)",
  "descripcion": "string (resumen corto 100-150 caracteres)",
  "contenido": "string (HTML)",
  "slug": "string (solo minúsculas, guiones, sin acentos)",
  "metaTitulo": "string (máximo 60 caracteres)",
  "metaDescripcion": "string (máximo 160 caracteres)",
  "keywords": ["string"]
}`;

  let userPrompt = `Genera contenido SEO para página de resultados de propiedades:
- Operación: ${operacionTexto}`;

  if (nombreTipoPropiedad) userPrompt += `\n- Tipo de propiedad: ${nombreTipoPropiedad}`;
  if (nombreUbicacion) userPrompt += `\n- Ubicación: ${nombreUbicacion}`;
  if (precioPromedio) userPrompt += `\n- Precio promedio actual: RD$${precioPromedio.toLocaleString()}`;
  if (propiedadesDisponibles) userPrompt += `\n- Propiedades disponibles: ${propiedadesDisponibles}`;

  const result = await callOpenAI(systemPrompt, userPrompt);

  // Construir título por defecto basado en parámetros
  const defaultTitle = [
    operaciones.includes('comprar') ? 'Comprar' : 'Alquilar',
    nombreTipoPropiedad || 'Propiedades',
    nombreUbicacion ? `en ${nombreUbicacion}` : ''
  ].filter(Boolean).join(' ');

  // Validar y normalizar respuesta
  return {
    titulo: result.titulo || defaultTitle,
    descripcion: result.descripcion || '',
    contenido: result.contenido || '',
    slug: result.slug || slugify(result.titulo || defaultTitle),
    metaTitulo: (result.metaTitulo || result.titulo || defaultTitle).substring(0, 60),
    metaDescripcion: (result.metaDescripcion || result.descripcion || '').substring(0, 160),
    keywords: Array.isArray(result.keywords) ? result.keywords : []
  };
}
