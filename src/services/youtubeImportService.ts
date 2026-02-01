/**
 * Servicio de Importación de YouTube
 *
 * Permite importar información de videos y canales de YouTube
 * usando la YouTube Data API v3.
 *
 * NOTA: Requiere una API Key de YouTube configurada en YOUTUBE_API_KEY
 */

// Interface para la información de un video de YouTube
export interface YouTubeVideoInfo {
  videoId: string;
  titulo: string;
  descripcion: string;
  thumbnailUrl: string;
  thumbnailUrlHq: string;
  duracion: string; // ISO 8601 duration (PT4M13S)
  duracionSegundos: number;
  fechaPublicacion: string;
  canal: {
    id: string;
    nombre: string;
    thumbnailUrl?: string;
  };
  estadisticas?: {
    vistas: number;
    likes: number;
    comentarios: number;
  };
  tags?: string[];
  categoriaId?: string;
}

// Interface para información de un canal de YouTube
export interface YouTubeChannelInfo {
  channelId: string;
  nombre: string;
  descripcion: string;
  thumbnailUrl: string;
  customUrl?: string;
  subscriberCount?: number;
  videoCount?: number;
  viewCount?: number;
}

// Interface para video en lista de canal
export interface YouTubeChannelVideo {
  videoId: string;
  titulo: string;
  descripcion: string;
  thumbnailUrl: string;
  fechaPublicacion: string;
}

// Acepta YOUTUBE_API_KEY o GOOGLE_API_KEY (la misma key funciona para ambos)
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * Extrae el video ID de una URL de YouTube
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // Solo el ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extrae el channel ID de una URL de YouTube
 */
export function extractChannelId(url: string): { type: 'id' | 'username' | 'handle'; value: string } | null {
  // Channel ID directo (UC...)
  const channelIdMatch = url.match(/(?:youtube\.com\/channel\/)([a-zA-Z0-9_-]+)/);
  if (channelIdMatch) {
    return { type: 'id', value: channelIdMatch[1] };
  }

  // Username (/user/...)
  const usernameMatch = url.match(/(?:youtube\.com\/user\/)([a-zA-Z0-9_-]+)/);
  if (usernameMatch) {
    return { type: 'username', value: usernameMatch[1] };
  }

  // Handle (@...)
  const handleMatch = url.match(/(?:youtube\.com\/@)([a-zA-Z0-9_-]+)/);
  if (handleMatch) {
    return { type: 'handle', value: handleMatch[1] };
  }

  // Custom URL (/c/...)
  const customMatch = url.match(/(?:youtube\.com\/c\/)([a-zA-Z0-9_-]+)/);
  if (customMatch) {
    return { type: 'handle', value: customMatch[1] };
  }

  // Solo el ID
  if (/^UC[a-zA-Z0-9_-]{22}$/.test(url)) {
    return { type: 'id', value: url };
  }

  return null;
}

/**
 * Convierte duración ISO 8601 a segundos
 */
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Obtiene información de un video de YouTube
 */
export async function getVideoInfo(videoIdOrUrl: string): Promise<YouTubeVideoInfo> {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY no está configurada en las variables de entorno');
  }

  const videoId = extractVideoId(videoIdOrUrl) || videoIdOrUrl;

  const url = `${YOUTUBE_API_BASE}/videos?` + new URLSearchParams({
    part: 'snippet,contentDetails,statistics',
    id: videoId,
    key: YOUTUBE_API_KEY,
  });

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json() as { error?: { message?: string } };
    throw new Error(error.error?.message || 'Error al obtener información del video');
  }

  const data = await response.json() as { items?: any[] };

  if (!data.items || data.items.length === 0) {
    throw new Error('Video no encontrado');
  }

  const video = data.items[0];
  const snippet = video.snippet;
  const contentDetails = video.contentDetails;
  const statistics = video.statistics;

  return {
    videoId,
    titulo: snippet.title,
    descripcion: snippet.description || '',
    thumbnailUrl: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
    thumbnailUrlHq: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || '',
    duracion: contentDetails.duration,
    duracionSegundos: parseDuration(contentDetails.duration),
    fechaPublicacion: snippet.publishedAt,
    canal: {
      id: snippet.channelId,
      nombre: snippet.channelTitle,
    },
    estadisticas: statistics ? {
      vistas: parseInt(statistics.viewCount || '0', 10),
      likes: parseInt(statistics.likeCount || '0', 10),
      comentarios: parseInt(statistics.commentCount || '0', 10),
    } : undefined,
    tags: snippet.tags,
    categoriaId: snippet.categoryId,
  };
}

/**
 * Obtiene información de un canal de YouTube
 */
export async function getChannelInfo(channelIdOrUrl: string): Promise<YouTubeChannelInfo> {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY no está configurada en las variables de entorno');
  }

  const extracted = extractChannelId(channelIdOrUrl);

  let channelId: string;

  if (!extracted) {
    // Intentar usar como ID directo
    channelId = channelIdOrUrl;
  } else if (extracted.type === 'id') {
    channelId = extracted.value;
  } else {
    // Buscar el canal por username o handle
    const searchUrl = `${YOUTUBE_API_BASE}/search?` + new URLSearchParams({
      part: 'snippet',
      q: extracted.value,
      type: 'channel',
      maxResults: '1',
      key: YOUTUBE_API_KEY,
    });

    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json() as { items?: any[] };

    if (!searchData.items || searchData.items.length === 0) {
      throw new Error('Canal no encontrado');
    }

    channelId = searchData.items[0].snippet.channelId;
  }

  const url = `${YOUTUBE_API_BASE}/channels?` + new URLSearchParams({
    part: 'snippet,statistics,contentDetails',
    id: channelId,
    key: YOUTUBE_API_KEY,
  });

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json() as { error?: { message?: string } };
    throw new Error(error.error?.message || 'Error al obtener información del canal');
  }

  const data = await response.json() as { items?: any[] };

  if (!data.items || data.items.length === 0) {
    throw new Error('Canal no encontrado');
  }

  const channel = data.items[0];
  const snippet = channel.snippet;
  const statistics = channel.statistics;

  return {
    channelId: channel.id,
    nombre: snippet.title,
    descripcion: snippet.description || '',
    thumbnailUrl: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
    customUrl: snippet.customUrl,
    subscriberCount: statistics?.hiddenSubscriberCount ? undefined : parseInt(statistics?.subscriberCount || '0', 10),
    videoCount: parseInt(statistics?.videoCount || '0', 10),
    viewCount: parseInt(statistics?.viewCount || '0', 10),
  };
}

/**
 * Obtiene los videos de un canal de YouTube
 */
export async function getChannelVideos(
  channelIdOrUrl: string,
  maxResults: number = 50,
  pageToken?: string
): Promise<{ videos: YouTubeChannelVideo[]; nextPageToken?: string; totalResults: number }> {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY no está configurada en las variables de entorno');
  }

  // Primero obtener info del canal para el uploads playlist ID
  const channelInfo = await getChannelInfo(channelIdOrUrl);

  // Obtener el playlist ID de uploads del canal
  const channelUrl = `${YOUTUBE_API_BASE}/channels?` + new URLSearchParams({
    part: 'contentDetails',
    id: channelInfo.channelId,
    key: YOUTUBE_API_KEY,
  });

  const channelResponse = await fetch(channelUrl);
  const channelData = await channelResponse.json() as { items?: any[] };

  if (!channelData.items || channelData.items.length === 0) {
    throw new Error('No se pudo obtener el playlist de uploads del canal');
  }

  const uploadsPlaylistId = channelData.items[0].contentDetails?.relatedPlaylists?.uploads;

  if (!uploadsPlaylistId) {
    throw new Error('El canal no tiene videos públicos');
  }

  // Obtener videos del playlist de uploads
  const params: Record<string, string> = {
    part: 'snippet',
    playlistId: uploadsPlaylistId,
    maxResults: Math.min(maxResults, 50).toString(),
    key: YOUTUBE_API_KEY,
  };

  if (pageToken) {
    params.pageToken = pageToken;
  }

  const videosUrl = `${YOUTUBE_API_BASE}/playlistItems?` + new URLSearchParams(params);
  const videosResponse = await fetch(videosUrl);

  if (!videosResponse.ok) {
    const error = await videosResponse.json() as { error?: { message?: string } };
    throw new Error(error.error?.message || 'Error al obtener videos del canal');
  }

  const videosData = await videosResponse.json() as { items?: any[]; nextPageToken?: string; pageInfo?: { totalResults?: number } };

  const videos: YouTubeChannelVideo[] = (videosData.items || []).map((item: any) => ({
    videoId: item.snippet.resourceId.videoId,
    titulo: item.snippet.title,
    descripcion: item.snippet.description || '',
    thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
    fechaPublicacion: item.snippet.publishedAt,
  }));

  return {
    videos,
    nextPageToken: videosData.nextPageToken,
    totalResults: videosData.pageInfo?.totalResults || videos.length,
  };
}

/**
 * Mapea un video de YouTube a los campos del modelo Video de contenido
 */
export function mapYouTubeVideoToContent(youtubeVideo: YouTubeVideoInfo): {
  titulo: string;
  descripcion: string;
  url: string;
  youtube_id: string;
  thumbnail_url: string;
  duracion: number;
  fuente: string;
} {
  return {
    titulo: youtubeVideo.titulo,
    descripcion: youtubeVideo.descripcion,
    url: `https://www.youtube.com/watch?v=${youtubeVideo.videoId}`,
    youtube_id: youtubeVideo.videoId,
    thumbnail_url: youtubeVideo.thumbnailUrlHq || youtubeVideo.thumbnailUrl,
    duracion: youtubeVideo.duracionSegundos,
    fuente: 'youtube',
  };
}
