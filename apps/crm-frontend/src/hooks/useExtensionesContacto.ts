/**
 * Hook para manejar extensiones de contacto dinámicas
 *
 * Carga las extensiones disponibles desde el catálogo y las extensiones
 * asignadas a un contacto específico.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface CampoSchema {
  campo: string;
  label: string;
  tipo: string;
  opciones?: string[];
  requerido?: boolean;
  orden: number;
}

export interface ExtensionCatalogo {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  color?: string;
  campos_schema: CampoSchema[];
  orden: number;
  activo: boolean;
  es_sistema: boolean;
  activo_tenant?: boolean;
  origen: 'sistema' | 'custom';
}

export interface ExtensionContacto {
  id: string;
  extension_id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  color?: string;
  campos_schema: CampoSchema[];
  datos: Record<string, any>;
  activo: boolean;
}

interface UseExtensionesContactoResult {
  // Extensiones disponibles en el catálogo (activas para el tenant)
  extensionesDisponibles: ExtensionCatalogo[];
  // Extensiones asignadas al contacto actual
  extensionesContacto: ExtensionContacto[];
  // Estado de carga
  loading: boolean;
  loadingContacto: boolean;
  // Errores
  error: string | null;
  // Acciones
  recargarCatalogo: () => Promise<void>;
  recargarExtensionesContacto: (contactoId: string) => Promise<void>;
  agregarExtension: (contactoId: string, extensionId: string, datos?: Record<string, any>) => Promise<ExtensionContacto | null>;
  actualizarExtension: (contactoId: string, extensionId: string, datos: Record<string, any>) => Promise<ExtensionContacto | null>;
  eliminarExtension: (contactoId: string, extensionId: string) => Promise<boolean>;
  // Helper para obtener config por código
  getExtensionPorCodigo: (codigo: string) => ExtensionCatalogo | undefined;
}

export function useExtensionesContacto(contactoId?: string): UseExtensionesContactoResult {
  const { tenantActual } = useAuth();

  const [extensionesDisponibles, setExtensionesDisponibles] = useState<ExtensionCatalogo[]>([]);
  const [extensionesContacto, setExtensionesContacto] = useState<ExtensionContacto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingContacto, setLoadingContacto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar catálogo de extensiones disponibles
  const recargarCatalogo = useCallback(async () => {
    if (!tenantActual?.id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_URL}/tenants/${tenantActual.id}/extensiones-contacto?activo=true`
      );

      if (!response.ok) {
        throw new Error('Error al cargar extensiones');
      }

      const data = await response.json();
      setExtensionesDisponibles(data.items || []);
    } catch (err: any) {
      console.error('Error cargando catálogo de extensiones:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantActual?.id]);

  // Cargar extensiones del contacto
  const recargarExtensionesContacto = useCallback(async (cId: string) => {
    if (!tenantActual?.id || !cId) return;

    try {
      setLoadingContacto(true);
      setError(null);

      const response = await fetch(
        `${API_URL}/tenants/${tenantActual.id}/contactos/${cId}/extensiones`
      );

      if (!response.ok) {
        throw new Error('Error al cargar extensiones del contacto');
      }

      const data = await response.json();
      setExtensionesContacto(data.extensiones || []);
    } catch (err: any) {
      console.error('Error cargando extensiones del contacto:', err);
      setError(err.message);
    } finally {
      setLoadingContacto(false);
    }
  }, [tenantActual?.id]);

  // Agregar extensión a un contacto
  const agregarExtension = useCallback(async (
    cId: string,
    extensionId: string,
    datos: Record<string, any> = {}
  ): Promise<ExtensionContacto | null> => {
    if (!tenantActual?.id) return null;

    try {
      setError(null);

      const response = await fetch(
        `${API_URL}/tenants/${tenantActual.id}/contactos/${cId}/extensiones`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ extension_id: extensionId, datos }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al agregar extensión');
      }

      const data = await response.json();

      // Actualizar lista local
      setExtensionesContacto(prev => [...prev, data.extension]);

      return data.extension;
    } catch (err: any) {
      console.error('Error agregando extensión:', err);
      setError(err.message);
      return null;
    }
  }, [tenantActual?.id]);

  // Actualizar datos de una extensión
  const actualizarExtension = useCallback(async (
    cId: string,
    extensionId: string,
    datos: Record<string, any>
  ): Promise<ExtensionContacto | null> => {
    if (!tenantActual?.id) return null;

    try {
      setError(null);

      const response = await fetch(
        `${API_URL}/tenants/${tenantActual.id}/contactos/${cId}/extensiones/${extensionId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ datos }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar extensión');
      }

      const data = await response.json();

      // Actualizar lista local
      setExtensionesContacto(prev =>
        prev.map(ext => ext.extension_id === extensionId ? data.extension : ext)
      );

      return data.extension;
    } catch (err: any) {
      console.error('Error actualizando extensión:', err);
      setError(err.message);
      return null;
    }
  }, [tenantActual?.id]);

  // Eliminar extensión de un contacto
  const eliminarExtension = useCallback(async (
    cId: string,
    extensionId: string
  ): Promise<boolean> => {
    if (!tenantActual?.id) return false;

    try {
      setError(null);

      const response = await fetch(
        `${API_URL}/tenants/${tenantActual.id}/contactos/${cId}/extensiones/${extensionId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar extensión');
      }

      // Actualizar lista local
      setExtensionesContacto(prev =>
        prev.filter(ext => ext.extension_id !== extensionId)
      );

      return true;
    } catch (err: any) {
      console.error('Error eliminando extensión:', err);
      setError(err.message);
      return false;
    }
  }, [tenantActual?.id]);

  // Helper para obtener extensión por código
  const getExtensionPorCodigo = useCallback((codigo: string) => {
    return extensionesDisponibles.find(ext => ext.codigo === codigo);
  }, [extensionesDisponibles]);

  // Cargar catálogo al montar
  useEffect(() => {
    recargarCatalogo();
  }, [recargarCatalogo]);

  // Cargar extensiones del contacto cuando cambie el ID
  useEffect(() => {
    if (contactoId) {
      recargarExtensionesContacto(contactoId);
    }
  }, [contactoId, recargarExtensionesContacto]);

  return {
    extensionesDisponibles,
    extensionesContacto,
    loading,
    loadingContacto,
    error,
    recargarCatalogo,
    recargarExtensionesContacto,
    agregarExtension,
    actualizarExtension,
    eliminarExtension,
    getExtensionPorCodigo,
  };
}

/**
 * Mapea el tipo de campo del schema a un input type
 */
export function getInputType(tipo: string): string {
  switch (tipo) {
    case 'number':
    case 'currency':
    case 'percentage':
      return 'number';
    case 'date':
      return 'date';
    case 'url':
      return 'url';
    case 'boolean':
      return 'checkbox';
    case 'select':
      return 'select';
    default:
      return 'text';
  }
}

/**
 * Formatea un valor según su tipo
 */
export function formatValue(value: any, tipo: string): string {
  if (value === null || value === undefined) return '';

  switch (tipo) {
    case 'currency':
      return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);
    case 'percentage':
      return `${value}%`;
    case 'date':
      if (!value) return '';
      return new Date(value).toLocaleDateString('es-DO');
    case 'boolean':
      return value ? 'Sí' : 'No';
    default:
      return String(value);
  }
}
