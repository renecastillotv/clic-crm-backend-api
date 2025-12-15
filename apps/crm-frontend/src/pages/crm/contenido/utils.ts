/**
 * Utilidades compartidas para los editores de contenido
 */

/**
 * Elimina las etiquetas HTML de un string y trunca al límite especificado
 */
export function stripHtml(html: string, maxLength?: number): string {
  if (!html) return '';

  // Remover etiquetas HTML
  const text = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

  // Si no hay límite, devolver todo el texto
  if (!maxLength || text.length <= maxLength) {
    return text;
  }

  // Truncar al límite y agregar elipsis
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Genera un slug a partir de un texto
 */
export function generateSlug(text: string): string {
  if (!text) return '';

  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-z0-9]+/g, '-') // Reemplazar caracteres especiales por guiones
    .replace(/^-+|-+$/g, '') // Remover guiones al inicio y final
    .replace(/-+/g, '-'); // Reemplazar múltiples guiones por uno solo
}

/**
 * Formatea una fecha para mostrar
 */
export function formatDate(date: string | Date, locale: string = 'es'): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;

  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formatea una fecha con hora
 */
export function formatDateTime(date: string | Date, locale: string = 'es'): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;

  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Trunca un texto al número de palabras especificado
 */
export function truncateWords(text: string, maxWords: number): string {
  if (!text) return '';

  const words = text.split(/\s+/);

  if (words.length <= maxWords) {
    return text;
  }

  return words.slice(0, maxWords).join(' ') + '...';
}

/**
 * Capitaliza la primera letra de un texto
 */
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Valida si una URL es válida
 */
export function isValidUrl(url: string): boolean {
  if (!url) return false;

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extrae el ID de un video de YouTube
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/,
    /youtube\.com\/watch\?.*v=([^&\s]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extrae el ID de un video de Vimeo
 */
export function extractVimeoId(url: string): string | null {
  if (!url) return null;

  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Genera una miniatura de YouTube
 */
export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'mq' | 'hq' | 'maxres' = 'hq'): string {
  const qualities: Record<string, string> = {
    default: 'default',
    mq: 'mqdefault',
    hq: 'hqdefault',
    maxres: 'maxresdefault',
  };

  return `https://img.youtube.com/vi/${videoId}/${qualities[quality]}.jpg`;
}
