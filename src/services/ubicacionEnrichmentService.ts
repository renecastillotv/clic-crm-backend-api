/**
 * Ubicacion Enrichment Service
 * Servicio para enriquecer ubicaciones con OpenAI
 * Llena campos vacíos: descripcion, tagline, lugares_cercanos, servicios, etc.
 */

import { query } from '../utils/db.js';

// Tipo para los datos de enriquecimiento
export interface UbicacionEnrichmentData {
  tagline?: string;
  descripcion?: string;
  descripcion_corta?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string[];
  lugares_cercanos?: {
    tipo: string;
    nombre: string;
    distancia?: string;
  }[];
  servicios?: string[];
  traducciones?: {
    en?: {
      nombre?: string;
      tagline?: string;
      descripcion?: string;
      descripcion_corta?: string;
      meta_title?: string;
      meta_description?: string;
    };
  };
}

export interface UbicacionForEnrichment {
  id: string;
  tipo: string;
  nombre: string;
  slug: string;
  parent_nombre?: string;
  grandparent_nombre?: string;
  latitud?: number;
  longitud?: number;
  // Campos actuales (para no sobrescribir si ya tienen valor)
  tagline?: string;
  descripcion?: string;
  descripcion_corta?: string;
  lugares_cercanos?: any;
  servicios?: string[];
}

/**
 * Obtener ubicaciones que necesitan enriquecimiento
 * Prioriza por tipo: sectores primero, luego ciudades, provincias
 */
export async function getUbicacionesPendientesEnrichment(options: {
  tipo?: string;
  limit?: number;
  onlyEmpty?: boolean;
}): Promise<UbicacionForEnrichment[]> {
  const { tipo, limit = 10, onlyEmpty = true } = options;

  let whereClause = 'u.activo = true';

  if (tipo) {
    whereClause += ` AND u.tipo = '${tipo}'`;
  }

  if (onlyEmpty) {
    // Solo ubicaciones con campos importantes vacíos
    whereClause += ` AND (
      u.descripcion IS NULL
      OR u.tagline IS NULL
      OR u.lugares_cercanos IS NULL
      OR jsonb_array_length(COALESCE(u.lugares_cercanos, '[]'::jsonb)) = 0
    )`;
  }

  const sql = `
    SELECT
      u.id,
      u.tipo,
      u.nombre,
      u.slug,
      p.nombre as parent_nombre,
      gp.nombre as grandparent_nombre,
      u.latitud,
      u.longitud,
      u.tagline,
      u.descripcion,
      u.descripcion_corta,
      u.lugares_cercanos,
      u.servicios
    FROM ubicaciones u
    LEFT JOIN ubicaciones p ON u.parent_id = p.id
    LEFT JOIN ubicaciones gp ON p.parent_id = gp.id
    WHERE ${whereClause}
    ORDER BY
      CASE u.tipo
        WHEN 'sector' THEN 1
        WHEN 'ciudad' THEN 2
        WHEN 'provincia' THEN 3
        ELSE 4
      END,
      u.nombre
    LIMIT $1
  `;

  const result = await query(sql, [limit]);
  return result.rows;
}

/**
 * Generar el prompt para OpenAI basado en el tipo de ubicación
 */
export function generateEnrichmentPrompt(ubicacion: UbicacionForEnrichment): string {
  const fullName = [
    ubicacion.nombre,
    ubicacion.parent_nombre,
    ubicacion.grandparent_nombre
  ].filter(Boolean).join(', ');

  const coordsInfo = ubicacion.latitud && ubicacion.longitud
    ? `Coordenadas: ${ubicacion.latitud}, ${ubicacion.longitud}`
    : '';

  const tipoDescripcion = {
    sector: 'barrio o sector residencial',
    ciudad: 'ciudad o municipio',
    provincia: 'provincia o estado',
    pais: 'país'
  }[ubicacion.tipo] || 'ubicación';

  return `Genera información SEO y descriptiva para este ${tipoDescripcion} de República Dominicana para un portal inmobiliario.

UBICACIÓN: ${fullName}
TIPO: ${ubicacion.tipo}
${coordsInfo}

Responde SOLO en formato JSON con esta estructura exacta:
{
  "tagline": "Frase corta y atractiva (máx 60 caracteres) que destaque la ubicación para compradores/arrendatarios",
  "descripcion_corta": "Descripción breve (100-150 caracteres) resaltando ventajas para vivir o invertir",
  "descripcion": "Descripción detallada (200-400 palabras) sobre la zona: ambiente, tipo de residentes, seguridad, transporte, comercio, vida nocturna, etc.",
  "meta_title": "Título SEO para página de propiedades en esta zona (50-60 caracteres)",
  "meta_description": "Meta descripción SEO (150-160 caracteres)",
  "meta_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "lugares_cercanos": [
    {"tipo": "supermercado", "nombre": "Nombre Real del Lugar"},
    {"tipo": "centro_comercial", "nombre": "Nombre del Mall"},
    {"tipo": "hospital", "nombre": "Nombre del Hospital"},
    {"tipo": "escuela", "nombre": "Nombre del Colegio"},
    {"tipo": "restaurante", "nombre": "Zona de restaurantes"}
  ],
  "servicios": ["categoria1", "categoria2", "categoria3"],
  "traducciones": {
    "en": {
      "tagline": "English tagline",
      "descripcion_corta": "Brief English description",
      "descripcion": "Full English description",
      "meta_title": "English SEO title",
      "meta_description": "English meta description"
    }
  }
}

IMPORTANTE:
- Usa nombres REALES de lugares cercanos (supermercados, colegios, hospitales reales de la zona)
- Los servicios deben ser categorías generales: residencial, comercial, turismo, playa, etc.
- El tono debe ser profesional pero atractivo para compradores de bienes raíces
- Incluye información relevante para el mercado inmobiliario
- Si no conoces lugares específicos de la zona, omite el array lugares_cercanos`;
}

/**
 * Actualizar una ubicación con datos de enriquecimiento
 * Solo actualiza campos que estaban vacíos (no sobrescribe datos existentes)
 */
export async function updateUbicacionEnrichment(
  ubicacionId: string,
  data: UbicacionEnrichmentData,
  overwrite = false
): Promise<boolean> {
  // Obtener datos actuales
  const current = await query(
    'SELECT tagline, descripcion, descripcion_corta, meta_title, meta_description, meta_keywords, lugares_cercanos, servicios, traducciones FROM ubicaciones WHERE id = $1',
    [ubicacionId]
  );

  if (!current.rows[0]) return false;

  const existing = current.rows[0];
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  // Campos de texto simples
  const textFields = ['tagline', 'descripcion', 'descripcion_corta', 'meta_title', 'meta_description'];
  for (const field of textFields) {
    if (data[field as keyof UbicacionEnrichmentData] && (overwrite || !existing[field])) {
      updates.push(`${field} = $${paramIndex++}`);
      params.push(data[field as keyof UbicacionEnrichmentData]);
    }
  }

  // Campos JSONB
  const jsonFields = ['meta_keywords', 'lugares_cercanos', 'servicios'];
  for (const field of jsonFields) {
    const value = data[field as keyof UbicacionEnrichmentData];
    if (value && (overwrite || !existing[field] || (Array.isArray(existing[field]) && existing[field].length === 0))) {
      updates.push(`${field} = $${paramIndex++}`);
      params.push(JSON.stringify(value));
    }
  }

  // Traducciones (merge con existentes)
  if (data.traducciones) {
    const existingTrad = existing.traducciones || {};
    const mergedTrad = { ...existingTrad, ...data.traducciones };
    updates.push(`traducciones = $${paramIndex++}`);
    params.push(JSON.stringify(mergedTrad));
  }

  if (updates.length === 0) return false;

  updates.push(`updated_at = NOW()`);
  params.push(ubicacionId);

  const sql = `UPDATE ubicaciones SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
  const result = await query(sql, params);

  return (result.rowCount ?? 0) > 0;
}

/**
 * Obtener estadísticas de enriquecimiento
 */
export async function getEnrichmentStats(): Promise<{
  total: number;
  conDescripcion: number;
  conTagline: number;
  conLugares: number;
  conServicios: number;
  porTipo: { tipo: string; total: number; enriquecidos: number }[];
}> {
  const stats = await query(`
    SELECT
      tipo,
      COUNT(*) as total,
      COUNT(descripcion) as con_descripcion,
      COUNT(tagline) as con_tagline,
      COUNT(CASE WHEN jsonb_array_length(COALESCE(lugares_cercanos, '[]'::jsonb)) > 0 THEN 1 END) as con_lugares,
      COUNT(CASE WHEN jsonb_array_length(COALESCE(servicios, '[]'::jsonb)) > 0 THEN 1 END) as con_servicios
    FROM ubicaciones
    WHERE activo = true
    GROUP BY tipo
  `);

  const totals = stats.rows.reduce((acc, row) => ({
    total: acc.total + parseInt(row.total),
    conDescripcion: acc.conDescripcion + parseInt(row.con_descripcion),
    conTagline: acc.conTagline + parseInt(row.con_tagline),
    conLugares: acc.conLugares + parseInt(row.con_lugares),
    conServicios: acc.conServicios + parseInt(row.con_servicios),
  }), { total: 0, conDescripcion: 0, conTagline: 0, conLugares: 0, conServicios: 0 });

  return {
    ...totals,
    porTipo: stats.rows.map(row => ({
      tipo: row.tipo,
      total: parseInt(row.total),
      enriquecidos: parseInt(row.con_descripcion),
    })),
  };
}

/**
 * Marcar ubicación como procesada (para evitar reprocesar)
 */
export async function markAsProcessed(ubicacionId: string): Promise<void> {
  await query(`
    UPDATE ubicaciones
    SET stats = COALESCE(stats, '{}'::jsonb) || '{"enrichment_processed_at": "${new Date().toISOString()}"}'::jsonb
    WHERE id = $1
  `, [ubicacionId]);
}

/**
 * Ejemplo de script para enriquecer ubicaciones con OpenAI
 * Este sería llamado desde un cron job o manualmente
 */
export const enrichmentScriptExample = `
// Ejemplo de uso del servicio de enriquecimiento

import OpenAI from 'openai';
import {
  getUbicacionesPendientesEnrichment,
  generateEnrichmentPrompt,
  updateUbicacionEnrichment,
  markAsProcessed,
  getEnrichmentStats
} from './ubicacionEnrichmentService.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function enrichUbicaciones() {
  // Obtener estadísticas actuales
  const statsBefore = await getEnrichmentStats();
  console.log('Estadísticas antes:', statsBefore);

  // Obtener ubicaciones pendientes (sectores primero)
  const pendientes = await getUbicacionesPendientesEnrichment({
    tipo: 'sector',
    limit: 5,
    onlyEmpty: true
  });

  console.log(\`Procesando \${pendientes.length} ubicaciones...\`);

  for (const ubicacion of pendientes) {
    try {
      console.log(\`\\nEnriqueciendo: \${ubicacion.nombre} (\${ubicacion.tipo})\`);

      // Generar prompt
      const prompt = generateEnrichmentPrompt(ubicacion);

      // Llamar a OpenAI
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en bienes raíces de República Dominicana. Genera contenido SEO preciso y atractivo para un portal inmobiliario.'
          },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      // Parsear respuesta
      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.error('  Sin respuesta de OpenAI');
        continue;
      }

      const enrichmentData = JSON.parse(content);

      // Actualizar en base de datos
      const updated = await updateUbicacionEnrichment(ubicacion.id, enrichmentData);
      if (updated) {
        console.log('  ✓ Actualizado correctamente');
        await markAsProcessed(ubicacion.id);
      } else {
        console.log('  ⚠ No se actualizó (posiblemente ya tenía datos)');
      }

      // Pausa para no exceder rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(\`  Error procesando \${ubicacion.nombre}:\`, error);
    }
  }

  // Estadísticas finales
  const statsAfter = await getEnrichmentStats();
  console.log('\\nEstadísticas después:', statsAfter);
}

enrichUbicaciones().catch(console.error);
`;
