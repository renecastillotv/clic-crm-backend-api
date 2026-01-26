/**
 * Social Copy Service
 *
 * Uses OpenAI to generate social media copy for property listings.
 * Generates 3 variations with different tones: professional, emotional, urgent.
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ==================== TYPES ====================

export interface PropertyForCopy {
  titulo: string;
  descripcion?: string;
  tipo: string;
  operacion: string;
  precio?: number;
  moneda?: string;
  ciudad?: string;
  sector?: string;
  habitaciones?: number;
  banos?: number;
  m2_construccion?: number;
  amenidades?: string[];
}

export interface CopySuggestion {
  tone: string;
  text: string;
  hashtags: string[];
}

// ==================== GENERATE ====================

/**
 * Generates 3 social media copy suggestions for a property.
 * Uses OpenAI gpt-4o-mini for fast, cheap generation.
 */
export async function generateSocialCopy(property: PropertyForCopy): Promise<CopySuggestion[]> {
  if (!OPENAI_API_KEY) {
    return getFallbackCopy(property);
  }

  try {
    const propertyContext = buildPropertyContext(property);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Eres un experto en copywriting inmobiliario y marketing en redes sociales para Mexico y Latinoamerica.
Generas textos atractivos para publicaciones de propiedades en Facebook e Instagram.

REGLAS:
- Textos en español
- Maximo 400 caracteres por texto (sin contar hashtags)
- Incluye emojis relevantes pero sin exceso (2-4 por texto)
- Los hashtags deben ser relevantes para inmobiliaria y la ubicacion
- No uses comillas al inicio/final del texto
- Genera exactamente 3 variaciones con estos tonos:
  1. "profesional": lenguaje formal, enfocado en caracteristicas y datos
  2. "emocional": enfocado en el estilo de vida y lo que se siente vivir ahi
  3. "urgente": con sentido de oportunidad, escasez o accion inmediata

Responde en JSON con este formato exacto:
{
  "suggestions": [
    { "tone": "profesional", "text": "...", "hashtags": ["#hashtag1", "#hashtag2", ...] },
    { "tone": "emocional", "text": "...", "hashtags": ["#hashtag1", "#hashtag2", ...] },
    { "tone": "urgente", "text": "...", "hashtags": ["#hashtag1", "#hashtag2", ...] }
  ]
}`,
          },
          {
            role: 'user',
            content: `Genera 3 copys para esta propiedad:\n\n${propertyContext}`,
          },
        ],
        max_tokens: 800,
        temperature: 0.8,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      console.error('[Social Copy] OpenAI API error:', response.status);
      return getFallbackCopy(property);
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return getFallbackCopy(property);
    }

    const parsed = JSON.parse(content);
    const suggestions: CopySuggestion[] = (parsed.suggestions || []).map((s: any) => ({
      tone: s.tone || 'profesional',
      text: (s.text || '').substring(0, 500),
      hashtags: Array.isArray(s.hashtags) ? s.hashtags.slice(0, 10) : [],
    }));

    return suggestions.length > 0 ? suggestions : getFallbackCopy(property);
  } catch (error) {
    console.error('[Social Copy] Error generating copy:', error);
    return getFallbackCopy(property);
  }
}

// ==================== HELPERS ====================

function buildPropertyContext(p: PropertyForCopy): string {
  const lines: string[] = [];
  lines.push(`Titulo: ${p.titulo}`);
  if (p.tipo) lines.push(`Tipo: ${p.tipo}`);
  if (p.operacion) lines.push(`Operacion: ${p.operacion}`);
  if (p.precio) lines.push(`Precio: ${p.moneda || 'USD'} ${p.precio.toLocaleString()}`);
  if (p.ciudad) lines.push(`Ciudad: ${p.ciudad}`);
  if (p.sector) lines.push(`Zona: ${p.sector}`);
  if (p.habitaciones) lines.push(`Habitaciones: ${p.habitaciones}`);
  if (p.banos) lines.push(`Banos: ${p.banos}`);
  if (p.m2_construccion) lines.push(`Construccion: ${p.m2_construccion} m2`);
  if (p.amenidades && p.amenidades.length > 0) {
    lines.push(`Amenidades: ${p.amenidades.slice(0, 10).join(', ')}`);
  }
  if (p.descripcion) {
    lines.push(`Descripcion: ${p.descripcion.replace(/<[^>]*>/g, '').substring(0, 300)}`);
  }
  return lines.join('\n');
}

function getFallbackCopy(p: PropertyForCopy): CopySuggestion[] {
  const precio = p.precio ? `${p.moneda || 'USD'} ${p.precio.toLocaleString()}` : '';
  const ubicacion = p.ciudad || '';

  return [
    {
      tone: 'profesional',
      text: `${p.titulo}${precio ? ` | ${precio}` : ''}${ubicacion ? ` en ${ubicacion}` : ''}. ${p.habitaciones ? `${p.habitaciones} hab` : ''}${p.banos ? `, ${p.banos} banos` : ''}${p.m2_construccion ? `, ${p.m2_construccion} m2` : ''}. Contactanos para mas informacion.`,
      hashtags: ['#inmobiliaria', '#propiedad', ubicacion ? `#${ubicacion.replace(/\s/g, '')}` : '#bienes_raices'].filter(Boolean),
    },
    {
      tone: 'emocional',
      text: `Imagina vivir en ${p.titulo}${ubicacion ? ` en ${ubicacion}` : ''}. Tu nuevo hogar te espera. Contactanos hoy.`,
      hashtags: ['#hogar', '#vivienda', '#suenos', ubicacion ? `#${ubicacion.replace(/\s/g, '')}` : ''].filter(Boolean),
    },
    {
      tone: 'urgente',
      text: `OPORTUNIDAD: ${p.titulo}${precio ? ` a solo ${precio}` : ''}. No dejes pasar esta oportunidad. Disponibilidad limitada.`,
      hashtags: ['#oportunidad', '#inmobiliaria', '#disponible', ubicacion ? `#${ubicacion.replace(/\s/g, '')}` : ''].filter(Boolean),
    },
  ];
}
