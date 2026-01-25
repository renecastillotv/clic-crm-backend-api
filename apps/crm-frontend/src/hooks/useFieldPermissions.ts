/**
 * Hook para permisos a nivel de campo
 *
 * Permite verificar si un campo específico es visible/editable
 * para el usuario actual en un módulo determinado.
 *
 * Uso:
 *   const { canViewField, canEditField, isFieldReadonly, getReplacedField, getOverrideValue } = useFieldPermissions('propiedades');
 *
 *   {canViewField('precio_compra') && <Input label="Precio" ... />}
 *   <Input disabled={!canEditField('estado')} ... />
 *
 * El backend ya aplica los filtros y transformaciones (autoFilter, override),
 * pero el frontend puede usar este hook para:
 * - Ocultar campos en la UI (hide)
 * - Deshabilitar edición de campos (readonly)
 * - Mostrar campos alternativos (replace)
 */

import { useMemo } from 'react';
import { useAuth, PermisosCampos } from '../contexts/AuthContext';

interface FieldPermissions {
  /** Can the user see this field? Returns false if field is in 'hide' list */
  canViewField: (fieldId: string) => boolean;
  /** Can the user edit this field? Returns false if in 'hide' or 'readonly' list, or if module doesn't have puedeEditar */
  canEditField: (fieldId: string) => boolean;
  /** Is this field readonly (visible but not editable)? */
  isFieldReadonly: (fieldId: string) => boolean;
  /** Get the replacement field if configured (e.g., show connect_comision instead of comision) */
  getReplacedField: (fieldId: string) => string | undefined;
  /** Get the override value if configured (for showing generic/fixed values) */
  getOverrideValue: (fieldId: string) => any | undefined;
  /** Check if a field matches a hide pattern (supports wildcards like "propietario_*") */
  isFieldHidden: (fieldId: string) => boolean;
  /** The raw permisos campos data for this module */
  permisosCampos: PermisosCampos | undefined;
  /** Whether the user can edit in this module at all */
  puedeEditar: boolean;
  /** Whether the user can delete in this module */
  puedeEliminar: boolean;
}

/**
 * Check if a field matches a hide pattern (supports wildcards like "propietario_*")
 */
function matchesPattern(fieldId: string, pattern: string): boolean {
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1);
    return fieldId.startsWith(prefix);
  }
  return fieldId === pattern;
}

export function useFieldPermissions(moduloId: string): FieldPermissions {
  const { modulos, isPlatformAdmin, getPermisosCampos } = useAuth();

  return useMemo(() => {
    const modulo = modulos.find(m => m.id === moduloId);
    const permisosCampos = getPermisosCampos(moduloId);

    const puedeEditar = isPlatformAdmin || (modulo?.puedeEditar ?? false);
    const puedeEliminar = isPlatformAdmin || (modulo?.puedeEliminar ?? false);

    const hidePatterns = permisosCampos?.hide || [];
    const readonlyFields = permisosCampos?.readonly || [];
    const replaceMap = permisosCampos?.replace || {};
    const overrideMap = permisosCampos?.override || {};

    const isFieldHidden = (fieldId: string): boolean => {
      if (isPlatformAdmin) return false;
      return hidePatterns.some(pattern => matchesPattern(fieldId, pattern));
    };

    return {
      canViewField: (fieldId: string) => {
        if (isPlatformAdmin) return true;
        return !isFieldHidden(fieldId);
      },

      canEditField: (fieldId: string) => {
        if (isPlatformAdmin) return true;
        if (isFieldHidden(fieldId)) return false;
        if (readonlyFields.includes(fieldId)) return false;
        return puedeEditar;
      },

      isFieldReadonly: (fieldId: string) => {
        if (isPlatformAdmin) return false;
        return readonlyFields.includes(fieldId);
      },

      getReplacedField: (fieldId: string) => {
        if (isPlatformAdmin) return undefined;
        return replaceMap[fieldId];
      },

      getOverrideValue: (fieldId: string) => {
        if (isPlatformAdmin) return undefined;
        return overrideMap[fieldId];
      },

      isFieldHidden,
      permisosCampos,
      puedeEditar,
      puedeEliminar,
    };
  }, [modulos, moduloId, isPlatformAdmin, getPermisosCampos]);
}
