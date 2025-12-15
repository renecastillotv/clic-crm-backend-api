/**
 * fetchComponents.ts
 * 
 * Utilidad para obtener componentes y temas desde la API
 */

import type { ComponenteConfigurado, TemaColores } from '../types/componentes';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3001';

// Función helper para hacer fetch con timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export async function fetchComponentes(
  tenantId: string,
  paginaId?: string
): Promise<ComponenteConfigurado[]> {
  try {
    let url = `${API_URL}/api/tenants/${tenantId}/componentes`;
    if (paginaId) {
      url += `?paginaId=${paginaId}`;
    }
    // Agregar timestamp para evitar caché
    url += `${paginaId ? '&' : '?'}_t=${Date.now()}`;
    
    console.log(`🌐 Fetching componentes: ${url}`);
    const response = await fetchWithTimeout(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    if (!response.ok) {
      throw new Error(`Error al obtener componentes: ${response.status}`);
    }
    const componentes = await response.json();
    console.log(`✅ Componentes obtenidos: ${componentes.length}`);
    return componentes;
  } catch (error) {
    console.error('❌ Error fetching componentes:', error);
    return [];
  }
}

export async function fetchTema(tenantId: string): Promise<TemaColores | null> {
  try {
    const response = await fetchWithTimeout(`${API_URL}/api/tenants/${tenantId}/tema`);
    if (!response.ok) {
      throw new Error('Error al obtener tema');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching tema:', error);
    return null;
  }
}

export async function fetchPagina(tenantId: string, slug: string) {
  try {
    // Usar el endpoint de slug
    const response = await fetch(`${API_URL}/api/tenants/${tenantId}/paginas/slug/${slug}`);
    if (!response.ok) {
      throw new Error('Error al obtener página');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching pagina:', error);
    return null;
  }
}

/**
 * Obtiene una página completa con todos sus componentes y tema
 * Este es el endpoint principal que reemplaza las múltiples llamadas
 * 
 * @param tenantId - ID del tenant
 * @param slug - Slug de la página
 * @returns Página completa con componentes ya filtrados y ordenados
 */
export async function fetchPaginaCompleta(tenantId: string, slug: string) {
  try {
    // Codificar el slug para la URL (especialmente importante para "/")
    const slugEncoded = encodeURIComponent(slug);
    const url = `${API_URL}/api/tenants/${tenantId}/pages/${slugEncoded}?_t=${Date.now()}`;
    console.log(`🌐 Fetching página completa: ${url}`);
    
    const response = await fetchWithTimeout(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Error al obtener página completa: ${response.status}`);
    }
    
    const paginaCompleta = await response.json();
    console.log(`✅ Página completa obtenida: ${paginaCompleta.page.titulo} (${paginaCompleta.components.length} componentes)`);
    return paginaCompleta;
  } catch (error) {
    console.error('❌ Error fetching página completa:', error);
    return null;
  }
}

/**
 * Obtiene una propiedad individual por ID
 * 
 * @param tenantId - ID del tenant
 * @param propertyId - ID de la propiedad
 * @returns Datos de la propiedad
 */
export async function fetchPropiedad(tenantId: string, propertyId: string) {
  try {
    const url = `${API_URL}/api/tenants/${tenantId}/properties/${propertyId}?_t=${Date.now()}`;
    console.log(`🌐 Fetching propiedad: ${url}`);
    
    const response = await fetchWithTimeout(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Error al obtener propiedad: ${response.status}`);
    }
    
    const propiedad = await response.json();
    console.log(`✅ Propiedad obtenida: ${propiedad.titulo}`);
    return propiedad;
  } catch (error) {
    console.error('❌ Error fetching propiedad:', error);
    return null;
  }
}

