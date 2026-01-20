/**
 * API functions para Documentos Requeridos
 *
 * Este archivo contiene las funciones CRUD para gestionar los documentos
 * requeridos del tenant (expediente de ventas, alquileres, captaciones).
 */

import { apiFetch } from './api';

// ============================================================
// TIPOS
// ============================================================

/**
 * Categorías válidas para documentos requeridos
 */
export type CategoriaDocumento =
  | 'cierre_venta_lista'
  | 'cierre_venta_proyecto'
  | 'cierre_alquiler'
  | 'captacion_propiedad_lista'
  | 'captacion_proyecto';

/**
 * Documento requerido (configuración del tenant)
 */
export interface DocumentoRequerido {
  id: string;
  tenant_id: string;
  titulo: string;
  descripcion: string | null;
  instrucciones: string | null;
  categoria: CategoriaDocumento;
  tipo: string | null;
  requiere_documento: boolean;
  es_obligatorio: boolean;
  orden_visualizacion: number;
  tipos_archivo_permitidos: string[];
  tamaño_maximo_archivo: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Labels para las categorías
 */
export const CATEGORIA_LABELS: Record<CategoriaDocumento, string> = {
  cierre_venta_lista: 'Ventas Propiedades Listas',
  cierre_venta_proyecto: 'Ventas Proyectos',
  cierre_alquiler: 'Alquileres',
  captacion_propiedad_lista: 'Captación Propiedades',
  captacion_proyecto: 'Captación Proyectos',
};

/**
 * Categorías para cierre de operaciones
 */
export const CATEGORIAS_CIERRE: CategoriaDocumento[] = [
  'cierre_venta_lista',
  'cierre_venta_proyecto',
  'cierre_alquiler',
];

/**
 * Tipos de archivo comunes
 */
export const TIPOS_ARCHIVO_COMUNES = [
  { value: 'pdf', label: 'PDF' },
  { value: 'jpg', label: 'JPG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
  { value: 'doc', label: 'DOC' },
  { value: 'docx', label: 'DOCX' },
  { value: 'xls', label: 'XLS' },
  { value: 'xlsx', label: 'XLSX' },
];

/**
 * Formatear tamaño de archivo
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============================================================
// FUNCIONES CRUD
// ============================================================

/**
 * Obtiene todos los documentos requeridos del tenant
 */
export async function getDocumentosRequeridos(
  tenantId: string,
  categoria?: CategoriaDocumento
): Promise<DocumentoRequerido[]> {
  const params = categoria ? `?categoria=${categoria}` : '';
  const response = await apiFetch(`/tenants/${tenantId}/documentos-requeridos${params}`);
  return response.json();
}

/**
 * Crear nuevo documento requerido
 */
export async function createDocumentoRequerido(
  tenantId: string,
  data: {
    titulo: string;
    descripcion?: string;
    instrucciones?: string;
    categoria: CategoriaDocumento;
    tipo?: string;
    requiere_documento?: boolean;
    es_obligatorio?: boolean;
    orden_visualizacion?: number;
    tipos_archivo_permitidos?: string[];
    tamaño_maximo_archivo?: number;
  }
): Promise<DocumentoRequerido> {
  const response = await apiFetch(`/tenants/${tenantId}/documentos-requeridos`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

/**
 * Actualizar documento requerido
 */
export async function updateDocumentoRequerido(
  tenantId: string,
  documentoId: string,
  data: Partial<{
    titulo: string;
    descripcion: string;
    instrucciones: string;
    tipo: string;
    requiere_documento: boolean;
    es_obligatorio: boolean;
    orden_visualizacion: number;
    tipos_archivo_permitidos: string[];
    tamaño_maximo_archivo: number;
    activo: boolean;
  }>
): Promise<DocumentoRequerido> {
  const response = await apiFetch(`/tenants/${tenantId}/documentos-requeridos/${documentoId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.json();
}

/**
 * Eliminar documento requerido (soft delete)
 */
export async function deleteDocumentoRequerido(
  tenantId: string,
  documentoId: string
): Promise<{ success: boolean }> {
  const response = await apiFetch(`/tenants/${tenantId}/documentos-requeridos/${documentoId}`, {
    method: 'DELETE',
  });
  return response.json();
}

/**
 * Reordenar documentos requeridos
 */
export async function reordenarDocumentosRequeridos(
  tenantId: string,
  items: Array<{ id: string; orden: number }>
): Promise<{ success: boolean }> {
  const response = await apiFetch(`/tenants/${tenantId}/documentos-requeridos/reordenar`, {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
  return response.json();
}
