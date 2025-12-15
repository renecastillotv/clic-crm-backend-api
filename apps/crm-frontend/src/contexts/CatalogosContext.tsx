/**
 * CatalogosContext - Contexto para gestionar catálogos del tenant
 *
 * Proporciona acceso a todos los catálogos configurables:
 * - Tipos de contacto
 * - Tipos de actividad
 * - Etiquetas de propiedad
 * - Tipos de documento
 * - Especialidades de asesor
 * - Tipos de asesor (con % comisión)
 *
 * NOTA: Tipos de propiedad y operación se manejan en tablas separadas
 * (categorias_propiedades y operaciones) con soporte multi-tenant via tenant_id
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Tipos de catálogo disponibles
export type TipoCatalogo =
  | 'tipo_contacto'
  | 'tipo_actividad'
  | 'etiqueta_propiedad'
  | 'tipo_documento'
  | 'especialidad_asesor'
  | 'tipo_asesor';

export interface ItemCatalogo {
  id: string;
  tenant_id: string | null;
  tipo: TipoCatalogo;
  codigo: string;
  nombre: string;
  nombre_plural: string | null;
  descripcion: string | null;
  icono: string | null;
  color: string | null;
  orden: number;
  activo: boolean;
  es_default: boolean;
  config: Record<string, any> | null;
  traducciones: Record<string, any> | null;
  metadata: Record<string, any> | null;
  origen: 'global' | 'tenant';
}

interface CatalogosContextType {
  // Estado
  catalogos: Record<TipoCatalogo, ItemCatalogo[]>;
  isLoading: boolean;
  error: string | null;

  // Getters por tipo
  tiposContacto: ItemCatalogo[];
  tiposActividad: ItemCatalogo[];
  etiquetasPropiedad: ItemCatalogo[];
  tiposDocumento: ItemCatalogo[];
  especialidadesAsesor: ItemCatalogo[];
  tiposAsesor: ItemCatalogo[];

  // Helpers
  getItemByCodigo: (tipo: TipoCatalogo, codigo: string) => ItemCatalogo | undefined;
  getItemById: (id: string) => ItemCatalogo | undefined;
  getDefaultItem: (tipo: TipoCatalogo) => ItemCatalogo | undefined;

  // Acciones
  refetch: () => Promise<void>;
  createItem: (data: Partial<ItemCatalogo>) => Promise<ItemCatalogo>;
  updateItem: (id: string, data: Partial<ItemCatalogo>) => Promise<ItemCatalogo>;
  deleteItem: (id: string) => Promise<void>;
  toggleItem: (tipo: TipoCatalogo, codigo: string, activo: boolean) => Promise<ItemCatalogo>;
}

const CatalogosContext = createContext<CatalogosContextType | undefined>(undefined);

export function CatalogosProvider({ children }: { children: ReactNode }) {
  const { tenantActual } = useAuth();
  const [catalogos, setCatalogos] = useState<Record<TipoCatalogo, ItemCatalogo[]>>({
    tipo_contacto: [],
    tipo_actividad: [],
    etiqueta_propiedad: [],
    tipo_documento: [],
    especialidad_asesor: [],
    tipo_asesor: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar catálogos cuando cambia el tenant
  const fetchCatalogos = useCallback(async () => {
    if (!tenantActual?.id) {
      setCatalogos({
        tipo_contacto: [],
        tipo_actividad: [],
        etiqueta_propiedad: [],
        tipo_documento: [],
        especialidad_asesor: [],
        tipo_asesor: [],
      });
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Cargar todos los items (activos e inactivos) para la gestión de catálogos
      const response = await fetch(`${API_URL}/tenants/${tenantActual.id}/catalogos?activo=false`);
      if (!response.ok) {
        throw new Error('Error al cargar catálogos');
      }

      const data = await response.json();
      setCatalogos({
        tipo_contacto: data.catalogos.tipo_contacto || [],
        tipo_actividad: data.catalogos.tipo_actividad || [],
        etiqueta_propiedad: data.catalogos.etiqueta_propiedad || [],
        tipo_documento: data.catalogos.tipo_documento || [],
        especialidad_asesor: data.catalogos.especialidad_asesor || [],
        tipo_asesor: data.catalogos.tipo_asesor || [],
      });
    } catch (err: any) {
      console.error('Error fetching catalogos:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [tenantActual?.id]);

  useEffect(() => {
    fetchCatalogos();
  }, [fetchCatalogos]);

  // Helpers
  const getItemByCodigo = useCallback((tipo: TipoCatalogo, codigo: string): ItemCatalogo | undefined => {
    return catalogos[tipo]?.find(item => item.codigo === codigo);
  }, [catalogos]);

  const getItemById = useCallback((id: string): ItemCatalogo | undefined => {
    for (const tipo of Object.keys(catalogos) as TipoCatalogo[]) {
      const item = catalogos[tipo].find(i => i.id === id);
      if (item) return item;
    }
    return undefined;
  }, [catalogos]);

  const getDefaultItem = useCallback((tipo: TipoCatalogo): ItemCatalogo | undefined => {
    return catalogos[tipo]?.find(item => item.es_default) || catalogos[tipo]?.[0];
  }, [catalogos]);

  // Acciones CRUD
  const createItem = useCallback(async (data: Partial<ItemCatalogo>): Promise<ItemCatalogo> => {
    if (!tenantActual?.id) throw new Error('No hay tenant seleccionado');

    const response = await fetch(`${API_URL}/tenants/${tenantActual.id}/catalogos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Error al crear catálogo');
    }

    const result = await response.json();
    await fetchCatalogos(); // Refrescar
    return result.catalogo;
  }, [tenantActual?.id, fetchCatalogos]);

  const updateItem = useCallback(async (id: string, data: Partial<ItemCatalogo>): Promise<ItemCatalogo> => {
    if (!tenantActual?.id) throw new Error('No hay tenant seleccionado');

    const response = await fetch(`${API_URL}/tenants/${tenantActual.id}/catalogos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Error al actualizar catálogo');
    }

    const result = await response.json();
    await fetchCatalogos(); // Refrescar
    return result.catalogo;
  }, [tenantActual?.id, fetchCatalogos]);

  const deleteItem = useCallback(async (id: string): Promise<void> => {
    if (!tenantActual?.id) throw new Error('No hay tenant seleccionado');

    const response = await fetch(`${API_URL}/tenants/${tenantActual.id}/catalogos/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Error al eliminar catálogo');
    }

    await fetchCatalogos(); // Refrescar
  }, [tenantActual?.id, fetchCatalogos]);

  const toggleItem = useCallback(async (tipo: TipoCatalogo, codigo: string, activo: boolean): Promise<ItemCatalogo> => {
    if (!tenantActual?.id) throw new Error('No hay tenant seleccionado');

    const response = await fetch(`${API_URL}/tenants/${tenantActual.id}/catalogos/${tipo}/toggle/${codigo}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Error al toggle catálogo');
    }

    const result = await response.json();
    await fetchCatalogos(); // Refrescar
    return result.catalogo;
  }, [tenantActual?.id, fetchCatalogos]);

  const value: CatalogosContextType = {
    catalogos,
    isLoading,
    error,

    // Getters
    tiposContacto: catalogos.tipo_contacto,
    tiposActividad: catalogos.tipo_actividad,
    etiquetasPropiedad: catalogos.etiqueta_propiedad,
    tiposDocumento: catalogos.tipo_documento,
    especialidadesAsesor: catalogos.especialidad_asesor,
    tiposAsesor: catalogos.tipo_asesor,

    // Helpers
    getItemByCodigo,
    getItemById,
    getDefaultItem,

    // Acciones
    refetch: fetchCatalogos,
    createItem,
    updateItem,
    deleteItem,
    toggleItem,
  };

  return (
    <CatalogosContext.Provider value={value}>
      {children}
    </CatalogosContext.Provider>
  );
}

export function useCatalogos() {
  const context = useContext(CatalogosContext);
  if (context === undefined) {
    throw new Error('useCatalogos debe usarse dentro de un CatalogosProvider');
  }
  return context;
}

// Hook específico para un tipo de catálogo
export function useCatalogo(tipo: TipoCatalogo) {
  const { catalogos, getItemByCodigo, getDefaultItem, createItem, updateItem, deleteItem, toggleItem, isLoading, error } = useCatalogos();

  return {
    items: catalogos[tipo],
    getItemByCodigo: (codigo: string) => getItemByCodigo(tipo, codigo),
    getDefaultItem: () => getDefaultItem(tipo),
    createItem: (data: Partial<ItemCatalogo>) => createItem({ ...data, tipo }),
    updateItem,
    deleteItem,
    toggleItem: (codigo: string, activo: boolean) => toggleItem(tipo, codigo, activo),
    isLoading,
    error,
  };
}
