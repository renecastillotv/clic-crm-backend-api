/**
 * Hook para permisos a nivel de campo
 *
 * Permite verificar si un campo, tab o acción específica es visible/editable
 * para el usuario actual en un módulo determinado.
 *
 * Uso:
 *   const { canViewField, canEditField, canViewTab, canExecuteAction } = useFieldPermissions('propiedades');
 *
 *   {canViewField('precio_compra') && <Input label="Precio" ... />}
 *   <Input disabled={!canEditField('estado')} ... />
 *   {canViewTab('financiero') && <Tab label="Financiero">...</Tab>}
 *   {canExecuteAction('eliminar') && <Button>Eliminar</Button>}
 */

import { useMemo } from 'react';
import { useAuth, PermisosCampos } from '../contexts/AuthContext';

interface FieldPermissions {
  /** Can the user see this field? Returns false if field is in 'hide' list */
  canViewField: (fieldId: string) => boolean;
  /** Can the user edit this field? Returns false if in 'hide' or 'readonly' list, or if module doesn't have puedeEditar */
  canEditField: (fieldId: string) => boolean;
  /** Can the user see this tab/section? Returns false if tab is in 'hideTabs' list */
  canViewTab: (tabId: string) => boolean;
  /** Can the user execute this action? Returns false if action is in 'hideActions' list */
  canExecuteAction: (actionId: string) => boolean;
  /** The raw permisos campos data for this module */
  permisosCampos: PermisosCampos;
  /** Whether the user can edit in this module at all */
  puedeEditar: boolean;
  /** Whether the user can delete in this module */
  puedeEliminar: boolean;
}

export function useFieldPermissions(moduloId: string): FieldPermissions {
  const { modulos, isPlatformAdmin } = useAuth();

  return useMemo(() => {
    const modulo = modulos.find(m => m.id === moduloId);

    // Merge permisosCampos from all roles (most restrictive for fields)
    // permisosCampos comes as { rolId: { hide: [...], readonly: [...] } }
    // We need to merge: field is hidden if ANY role hides it (when user has single role)
    // But if user has multiple roles, the LESS restrictive wins (if one role hides, another doesn't = visible)
    // For simplicity with single-role case: just use the merged result from backend
    const rawPermisos = modulo?.permisosCampos || {};

    // Flatten all permisos campos from all roles into a single set
    // Strategy: a field is restricted only if ALL roles restrict it (most permissive wins)
    const allHide = new Set<string>();
    const allReadonly = new Set<string>();
    const allHideTabs = new Set<string>();
    const allHideActions = new Set<string>();

    const rolEntries = Object.values(rawPermisos) as PermisosCampos[];

    if (rolEntries.length === 0) {
      // No field restrictions
    } else if (rolEntries.length === 1) {
      // Single role - just use its restrictions
      const perms = rolEntries[0];
      perms.hide?.forEach(f => allHide.add(f));
      perms.readonly?.forEach(f => allReadonly.add(f));
      perms.hideTabs?.forEach(f => allHideTabs.add(f));
      perms.hideActions?.forEach(f => allHideActions.add(f));
    } else {
      // Multiple roles - field is restricted only if ALL roles restrict it
      // (most permissive wins for multi-role)
      const roleCount = rolEntries.length;

      // Count how many roles hide each field
      const hideCount: Record<string, number> = {};
      const readonlyCount: Record<string, number> = {};
      const hideTabsCount: Record<string, number> = {};
      const hideActionsCount: Record<string, number> = {};

      for (const perms of rolEntries) {
        perms.hide?.forEach(f => { hideCount[f] = (hideCount[f] || 0) + 1; });
        perms.readonly?.forEach(f => { readonlyCount[f] = (readonlyCount[f] || 0) + 1; });
        perms.hideTabs?.forEach(f => { hideTabsCount[f] = (hideTabsCount[f] || 0) + 1; });
        perms.hideActions?.forEach(f => { hideActionsCount[f] = (hideActionsCount[f] || 0) + 1; });
      }

      // Only restrict if ALL roles agree
      Object.entries(hideCount).forEach(([f, count]) => { if (count === roleCount) allHide.add(f); });
      Object.entries(readonlyCount).forEach(([f, count]) => { if (count === roleCount) allReadonly.add(f); });
      Object.entries(hideTabsCount).forEach(([f, count]) => { if (count === roleCount) allHideTabs.add(f); });
      Object.entries(hideActionsCount).forEach(([f, count]) => { if (count === roleCount) allHideActions.add(f); });
    }

    const permisosCampos: PermisosCampos = {
      hide: Array.from(allHide),
      readonly: Array.from(allReadonly),
      hideTabs: Array.from(allHideTabs),
      hideActions: Array.from(allHideActions),
    };

    const puedeEditar = isPlatformAdmin || (modulo?.puedeEditar ?? false);
    const puedeEliminar = isPlatformAdmin || (modulo?.puedeEliminar ?? false);

    return {
      canViewField: (fieldId: string) => {
        if (isPlatformAdmin) return true;
        return !allHide.has(fieldId);
      },
      canEditField: (fieldId: string) => {
        if (isPlatformAdmin) return true;
        if (allHide.has(fieldId)) return false;
        if (allReadonly.has(fieldId)) return false;
        return puedeEditar;
      },
      canViewTab: (tabId: string) => {
        if (isPlatformAdmin) return true;
        return !allHideTabs.has(tabId);
      },
      canExecuteAction: (actionId: string) => {
        if (isPlatformAdmin) return true;
        return !allHideActions.has(actionId);
      },
      permisosCampos,
      puedeEditar,
      puedeEliminar,
    };
  }, [modulos, moduloId, isPlatformAdmin]);
}
