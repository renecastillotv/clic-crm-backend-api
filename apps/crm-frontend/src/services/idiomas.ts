/**
 * Servicio y hook para gestionar idiomas en el CRM
 */

import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Interfaz para la configuración de idiomas
 */
export interface IdiomaConfig {
  code: string;
  label: string;
  labelNativo: string;
  flag: string;
  flagEmoji: string;
  activo: boolean;
}

/**
 * Idiomas por defecto en caso de que falle la carga desde el API
 */
export const IDIOMAS_DEFAULT: IdiomaConfig[] = [
  {
    code: 'es',
    label: 'Spanish',
    labelNativo: 'Español',
    flag: 'ES',
    flagEmoji: '🇪🇸',
    activo: true,
  },
  {
    code: 'en',
    label: 'English',
    labelNativo: 'English',
    flag: 'US',
    flagEmoji: '🇺🇸',
    activo: true,
  },
  {
    code: 'fr',
    label: 'French',
    labelNativo: 'Français',
    flag: 'FR',
    flagEmoji: '🇫🇷',
    activo: true,
  },
  {
    code: 'pt',
    label: 'Portuguese',
    labelNativo: 'Português',
    flag: 'BR',
    flagEmoji: '🇧🇷',
    activo: true,
  },
];

/**
 * Obtiene todos los idiomas disponibles en el sistema
 */
export async function getIdiomasSistema(): Promise<IdiomaConfig[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/tenants/idiomas/sistema`);
    if (!response.ok) {
      console.warn('Error al obtener idiomas del sistema, usando valores por defecto');
      return IDIOMAS_DEFAULT;
    }
    return response.json();
  } catch (error) {
    console.warn('Error de conexión al obtener idiomas, usando valores por defecto:', error);
    return IDIOMAS_DEFAULT;
  }
}

/**
 * Obtiene los idiomas habilitados para un tenant específico
 */
export async function getIdiomasTenant(tenantId: string): Promise<IdiomaConfig[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}/idiomas`);
    if (!response.ok) {
      console.warn('Error al obtener idiomas del tenant, usando valores por defecto');
      return IDIOMAS_DEFAULT;
    }
    return response.json();
  } catch (error) {
    console.warn('Error de conexión al obtener idiomas del tenant, usando valores por defecto:', error);
    return IDIOMAS_DEFAULT;
  }
}

/**
 * Hook para obtener los idiomas de un tenant
 * @param tenantId - ID del tenant
 * @returns { idiomas, loading, error }
 */
export function useIdiomas(tenantId: string | undefined) {
  const [idiomas, setIdiomas] = useState<IdiomaConfig[]>(IDIOMAS_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setIdiomas(IDIOMAS_DEFAULT);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchIdiomas = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getIdiomasTenant(tenantId);
        if (!cancelled) {
          setIdiomas(data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message);
          setIdiomas(IDIOMAS_DEFAULT);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchIdiomas();

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  return { idiomas, loading, error };
}

/**
 * Hook para obtener todos los idiomas del sistema
 * @returns { idiomas, loading, error }
 */
export function useIdiomasSistema() {
  const [idiomas, setIdiomas] = useState<IdiomaConfig[]>(IDIOMAS_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchIdiomas = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getIdiomasSistema();
        if (!cancelled) {
          setIdiomas(data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message);
          setIdiomas(IDIOMAS_DEFAULT);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchIdiomas();

    return () => {
      cancelled = true;
    };
  }, []);

  return { idiomas, loading, error };
}
