/**
 * Servicio de Contenido Persistente
 *
 * Maneja la separación entre configuración del componente y contenido editable.
 * El contenido persiste cuando se cambia de variante o template.
 */

import { query } from '../utils/db.js';

// ============================================================
// TIPOS
// ============================================================

export interface CampoCatalogo {
  id: string;
  tipo_componente: string;
  variante: string;
  campo: string;
  tipo_campo: string;
  categoria: string;
  etiqueta: string;
  descripcion: string;
  valor_default: string;
  opciones: Record<string, any>;
  orden: number;
  requerido: boolean;
  traducible: boolean;
}

export interface ContenidoCampo {
  id: string;
  componente_id: string;
  campo: string;
  idioma: string;
  valor: string | null;
  valor_json: any;
}

export interface ContenidoMedia {
  id: string;
  componente_id: string;
  campo: string;
  tipo_media: string;
  url: string;
  alt_text: string;
  traducciones_alt: Record<string, string>;
  metadata: Record<string, any>;
  orden: number;
}

// ============================================================
// CATÁLOGO DE CAMPOS
// ============================================================

/**
 * Obtiene los campos definidos para un tipo+variante de componente
 */
export async function getCamposCatalogo(
  tipoComponente: string,
  variante: string = 'default'
): Promise<CampoCatalogo[]> {
  const result = await query(
    `SELECT * FROM catalogo_campos
     WHERE tipo_componente = $1 AND variante = $2 AND activo = true
     ORDER BY orden ASC`,
    [tipoComponente, variante]
  );

  return result.rows.map((row: any) => ({
    ...row,
    opciones: typeof row.opciones === 'string' ? JSON.parse(row.opciones) : row.opciones
  }));
}

/**
 * Obtiene todos los tipos de componentes disponibles
 */
export async function getTiposComponenteDisponibles(): Promise<string[]> {
  const result = await query(
    `SELECT DISTINCT tipo_componente FROM catalogo_campos WHERE activo = true ORDER BY tipo_componente`
  );
  return result.rows.map((row: any) => row.tipo_componente);
}

/**
 * Obtiene las variantes disponibles para un tipo de componente
 */
export async function getVariantesDisponibles(tipoComponente: string): Promise<string[]> {
  const result = await query(
    `SELECT DISTINCT variante FROM catalogo_campos
     WHERE tipo_componente = $1 AND activo = true
     ORDER BY variante`,
    [tipoComponente]
  );
  return result.rows.map((row: any) => row.variante);
}

// ============================================================
// CONTENIDO DE CAMPOS
// ============================================================

/**
 * Obtiene el contenido de un componente en un idioma específico
 */
export async function getContenidoComponente(
  componenteId: string,
  idioma: string = 'es'
): Promise<Record<string, any>> {
  // Obtener campos de texto
  const camposResult = await query(
    `SELECT campo, valor, valor_json FROM contenido_campos
     WHERE componente_id = $1 AND idioma = $2`,
    [componenteId, idioma]
  );

  // Obtener media
  const mediaResult = await query(
    `SELECT campo, url, alt_text, tipo_media, metadata, orden
     FROM contenido_media
     WHERE componente_id = $1
     ORDER BY campo, orden`,
    [componenteId]
  );

  const contenido: Record<string, any> = {};

  // Procesar campos de texto
  for (const row of camposResult.rows) {
    if (row.valor_json) {
      contenido[row.campo] = typeof row.valor_json === 'string'
        ? JSON.parse(row.valor_json)
        : row.valor_json;
    } else {
      contenido[row.campo] = row.valor;
    }
  }

  // Procesar media (agrupar si hay múltiples del mismo campo)
  const mediaByField: Record<string, any[]> = {};
  for (const row of mediaResult.rows) {
    if (!mediaByField[row.campo]) {
      mediaByField[row.campo] = [];
    }
    mediaByField[row.campo].push({
      url: row.url,
      alt: row.alt_text,
      tipo: row.tipo_media,
      metadata: row.metadata
    });
  }

  // Agregar media al contenido
  for (const [campo, items] of Object.entries(mediaByField)) {
    contenido[campo] = items.length === 1 ? items[0].url : items;
  }

  return contenido;
}

/**
 * Obtiene el contenido completo de un componente con fallback a defaults
 */
export async function getContenidoCompletoComponente(
  componenteId: string,
  tipoComponente: string,
  variante: string = 'default',
  idioma: string = 'es'
): Promise<Record<string, any>> {
  // Obtener catálogo de campos para este tipo+variante
  const catalogoCampos = await getCamposCatalogo(tipoComponente, variante);

  // Obtener contenido guardado
  const contenidoGuardado = await getContenidoComponente(componenteId, idioma);

  // Construir contenido final con fallback a defaults
  const contenidoFinal: Record<string, any> = {};

  for (const campoCatalogo of catalogoCampos) {
    const { campo, valor_default, tipo_campo } = campoCatalogo;

    if (contenidoGuardado[campo] !== undefined) {
      contenidoFinal[campo] = contenidoGuardado[campo];
    } else if (valor_default) {
      // Parsear JSON si es necesario
      if (tipo_campo === 'array' || tipo_campo === 'object') {
        try {
          contenidoFinal[campo] = JSON.parse(valor_default);
        } catch {
          contenidoFinal[campo] = valor_default;
        }
      } else {
        contenidoFinal[campo] = valor_default;
      }
    }
  }

  return contenidoFinal;
}

/**
 * Guarda o actualiza un campo de contenido
 */
export async function setContenidoCampo(
  componenteId: string,
  campo: string,
  valor: any,
  idioma: string = 'es',
  actualizadoPor?: string
): Promise<void> {
  const isJson = typeof valor === 'object';

  await query(
    `INSERT INTO contenido_campos (componente_id, campo, idioma, valor, valor_json, actualizado_por)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (componente_id, campo, idioma)
     DO UPDATE SET
       valor = EXCLUDED.valor,
       valor_json = EXCLUDED.valor_json,
       version = contenido_campos.version + 1,
       actualizado_por = EXCLUDED.actualizado_por,
       updated_at = NOW()`,
    [
      componenteId,
      campo,
      idioma,
      isJson ? null : String(valor),
      isJson ? JSON.stringify(valor) : null,
      actualizadoPor || null
    ]
  );
}

/**
 * Guarda múltiples campos de contenido a la vez
 */
export async function setContenidoMultiple(
  componenteId: string,
  contenido: Record<string, any>,
  idioma: string = 'es',
  actualizadoPor?: string
): Promise<void> {
  for (const [campo, valor] of Object.entries(contenido)) {
    await setContenidoCampo(componenteId, campo, valor, idioma, actualizadoPor);
  }
}

// ============================================================
// CONTENIDO MEDIA
// ============================================================

/**
 * Guarda o actualiza una imagen/video
 */
export async function setContenidoMedia(
  componenteId: string,
  campo: string,
  url: string,
  opciones: {
    tipoMedia?: 'image' | 'video' | 'icon';
    altText?: string;
    traduccionesAlt?: Record<string, string>;
    metadata?: Record<string, any>;
    orden?: number;
  } = {}
): Promise<string> {
  const result = await query(
    `INSERT INTO contenido_media (componente_id, campo, tipo_media, url, alt_text, traducciones_alt, metadata, orden)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (componente_id, campo) WHERE orden = $8
     DO UPDATE SET
       url = EXCLUDED.url,
       alt_text = EXCLUDED.alt_text,
       traducciones_alt = EXCLUDED.traducciones_alt,
       metadata = EXCLUDED.metadata,
       updated_at = NOW()
     RETURNING id`,
    [
      componenteId,
      campo,
      opciones.tipoMedia || 'image',
      url,
      opciones.altText || null,
      JSON.stringify(opciones.traduccionesAlt || {}),
      JSON.stringify(opciones.metadata || {}),
      opciones.orden || 0
    ]
  );

  return result.rows[0]?.id;
}

// ============================================================
// INICIALIZACIÓN DE COMPONENTE
// ============================================================

/**
 * Inicializa el contenido de un componente con valores por defecto del catálogo
 */
export async function inicializarContenidoComponente(
  componenteId: string,
  tipoComponente: string,
  variante: string = 'default',
  idioma: string = 'es'
): Promise<void> {
  // Verificar si ya tiene contenido
  const existente = await query(
    `SELECT COUNT(*) as count FROM contenido_campos WHERE componente_id = $1`,
    [componenteId]
  );

  if (parseInt(existente.rows[0].count) > 0) {
    console.log(`Componente ${componenteId} ya tiene contenido, saltando inicialización`);
    return;
  }

  // Obtener campos del catálogo
  const campos = await getCamposCatalogo(tipoComponente, variante);

  // Insertar valores por defecto
  for (const campo of campos) {
    if (campo.valor_default) {
      const isJson = campo.tipo_campo === 'array' || campo.tipo_campo === 'object';

      await query(
        `INSERT INTO contenido_campos (componente_id, campo, idioma, valor, valor_json)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [
          componenteId,
          campo.campo,
          idioma,
          isJson ? null : campo.valor_default,
          isJson ? campo.valor_default : null
        ]
      );
    }

    // Si es campo de imagen con default, crear también en contenido_media
    if (campo.tipo_campo === 'image' && campo.valor_default) {
      await query(
        `INSERT INTO contenido_media (componente_id, campo, tipo_media, url)
         VALUES ($1, $2, 'image', $3)
         ON CONFLICT DO NOTHING`,
        [componenteId, campo.campo, campo.valor_default]
      );
    }
  }

  console.log(`Contenido inicializado para componente ${componenteId} (${tipoComponente}/${variante})`);
}

// ============================================================
// RESOLUCIÓN DE CONTENIDO PARA RENDER
// ============================================================

/**
 * Resuelve todo el contenido necesario para renderizar un componente
 * Combina: contenido guardado + defaults del catálogo
 */
export async function resolverContenidoParaRender(
  componenteId: string,
  tipoComponente: string,
  variante: string = 'default',
  idioma: string = 'es'
): Promise<{
  static_data: Record<string, any>;
  media: Record<string, any>;
  campos_disponibles: CampoCatalogo[];
}> {
  // Obtener campos del catálogo
  const camposCatalogo = await getCamposCatalogo(tipoComponente, variante);

  // Obtener contenido guardado
  const contenidoGuardado = await getContenidoComponente(componenteId, idioma);

  // Separar en static_data y media
  const static_data: Record<string, any> = {};
  const media: Record<string, any> = {};

  for (const campoCatalogo of camposCatalogo) {
    const { campo, valor_default, tipo_campo, categoria } = campoCatalogo;

    // Determinar el valor final
    let valorFinal = contenidoGuardado[campo];

    if (valorFinal === undefined && valor_default) {
      if (tipo_campo === 'array' || tipo_campo === 'object') {
        try {
          valorFinal = JSON.parse(valor_default);
        } catch {
          valorFinal = valor_default;
        }
      } else {
        valorFinal = valor_default;
      }
    }

    // Clasificar por categoría
    if (categoria === 'media' || tipo_campo === 'image' || tipo_campo === 'video') {
      media[campo] = valorFinal;
    } else {
      static_data[campo] = valorFinal;
    }
  }

  return {
    static_data,
    media,
    campos_disponibles: camposCatalogo
  };
}

/**
 * Copia el contenido de un componente a otro (útil al duplicar)
 */
export async function copiarContenido(
  componenteOrigenId: string,
  componenteDestinoId: string
): Promise<void> {
  // Copiar campos
  await query(
    `INSERT INTO contenido_campos (componente_id, campo, idioma, valor, valor_json)
     SELECT $2, campo, idioma, valor, valor_json
     FROM contenido_campos
     WHERE componente_id = $1
     ON CONFLICT DO NOTHING`,
    [componenteOrigenId, componenteDestinoId]
  );

  // Copiar media
  await query(
    `INSERT INTO contenido_media (componente_id, campo, tipo_media, url, alt_text, traducciones_alt, metadata, orden)
     SELECT $2, campo, tipo_media, url, alt_text, traducciones_alt, metadata, orden
     FROM contenido_media
     WHERE componente_id = $1
     ON CONFLICT DO NOTHING`,
    [componenteOrigenId, componenteDestinoId]
  );
}

export default {
  getCamposCatalogo,
  getTiposComponenteDisponibles,
  getVariantesDisponibles,
  getContenidoComponente,
  getContenidoCompletoComponente,
  setContenidoCampo,
  setContenidoMultiple,
  setContenidoMedia,
  inicializarContenidoComponente,
  resolverContenidoParaRender,
  copiarContenido
};
