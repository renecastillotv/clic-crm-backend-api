/**
 * AdminRolFieldPermisos - Página para configurar permisos a nivel de campo
 *
 * Permite al Platform Admin configurar qué campos puede ver/editar cada rol
 * en un módulo específico, de forma visual y user-friendly.
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import {
  getRolModulosMatrix,
  updateRolModulos,
  RolModuloInput,
  PermisosCampos,
} from '../../services/api';
import {
  modulosCamposConfig,
  getGruposCampos,
  type CampoConfig,
} from '../../config/modulosCampos';
import { useAuth as useAppAuth } from '../../contexts/AuthContext';

interface RolModuloData {
  moduloId: string;
  moduloNombre: string;
  puedeVer: boolean;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
  alcanceVer: string;
  alcanceEditar: string;
  permisosCampos?: PermisosCampos;
}

interface RolData {
  id: string;
  codigo: string;
  nombre: string;
}

export default function AdminRolFieldPermisos() {
  const { rolId, moduloId } = useParams<{ rolId: string; moduloId: string }>();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { isPlatformAdmin } = useAppAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [rol, setRol] = useState<RolData | null>(null);
  const [moduloData, setModuloData] = useState<RolModuloData | null>(null);

  // Estado de permisos de campos
  const [hiddenFields, setHiddenFields] = useState<Set<string>>(new Set());
  const [readonlyFields, setReadonlyFields] = useState<Set<string>>(new Set());
  const [selectedAutoFilters, setSelectedAutoFilters] = useState<Set<string>>(new Set());
  const [overrideValues, setOverrideValues] = useState<Record<string, string>>({});

  // Obtener configuración del módulo
  const moduloConfig = moduloId ? modulosCamposConfig[moduloId] : undefined;
  const gruposCampos = useMemo(() => {
    if (!moduloId) return new Map<string, CampoConfig[]>();
    return getGruposCampos(moduloId);
  }, [moduloId]);

  // Cargar datos del rol y módulo
  useEffect(() => {
    async function loadData() {
      if (!rolId || !moduloId) return;

      try {
        setLoading(true);
        setError(null);

        const token = await getToken();

        // Cargar datos del rol usando la matriz existente
        const matrixData = await getRolModulosMatrix(rolId, token);
        setRol({
          id: matrixData.rol.id,
          codigo: matrixData.rol.codigo,
          nombre: matrixData.rol.nombre,
        });

        // Buscar el módulo específico
        const modulo = matrixData.modulos.find(m => m.id === moduloId);

        if (!modulo) {
          setError('Este rol no tiene acceso a este módulo');
          return;
        }

        const moduloDataObj: RolModuloData = {
          moduloId: modulo.id,
          moduloNombre: modulo.nombre,
          puedeVer: modulo.permisos?.puedeVer ?? false,
          puedeCrear: modulo.permisos?.puedeCrear ?? false,
          puedeEditar: modulo.permisos?.puedeEditar ?? false,
          puedeEliminar: modulo.permisos?.puedeEliminar ?? false,
          alcanceVer: modulo.permisos?.alcanceVer ?? 'own',
          alcanceEditar: modulo.permisos?.alcanceEditar ?? 'own',
          permisosCampos: modulo.permisos?.permisosCampos,
        };
        setModuloData(moduloDataObj);

        // Inicializar estado desde permisosCampos existentes
        const pc = modulo.permisos?.permisosCampos || {};
        setHiddenFields(new Set(pc.hide || []));
        setReadonlyFields(new Set(pc.readonly || []));

        // Detectar autoFilters seleccionados
        if (pc.autoFilter && moduloConfig?.autoFilters) {
          const selected = new Set<string>();
          for (const af of moduloConfig.autoFilters) {
            const matches = Object.entries(af.valor).every(
              ([key, val]) => pc.autoFilter?.[key] === val
            );
            if (matches) selected.add(af.id);
          }
          setSelectedAutoFilters(selected);
        }

        // Cargar valores de override
        if (pc.override) {
          setOverrideValues(
            Object.fromEntries(
              Object.entries(pc.override).map(([k, v]) => [k, String(v)])
            )
          );
        }

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al cargar datos';
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [rolId, moduloId, moduloConfig, getToken]);

  // Toggle campo oculto
  const toggleHidden = (fieldId: string) => {
    setHiddenFields(prev => {
      const next = new Set(prev);
      if (next.has(fieldId)) {
        next.delete(fieldId);
      } else {
        next.add(fieldId);
        // Si se oculta, quitar de readonly
        readonlyFields.delete(fieldId);
        setReadonlyFields(new Set(readonlyFields));
      }
      return next;
    });
  };

  // Toggle campo solo lectura
  const toggleReadonly = (fieldId: string) => {
    setReadonlyFields(prev => {
      const next = new Set(prev);
      if (next.has(fieldId)) {
        next.delete(fieldId);
      } else {
        next.add(fieldId);
      }
      return next;
    });
  };

  // Toggle autoFilter
  const toggleAutoFilter = (filterId: string) => {
    setSelectedAutoFilters(prev => {
      const next = new Set(prev);
      if (next.has(filterId)) {
        next.delete(filterId);
      } else {
        next.add(filterId);
      }
      return next;
    });
  };

  // Actualizar valor de override
  const updateOverride = (campo: string, value: string) => {
    setOverrideValues(prev => ({
      ...prev,
      [campo]: value,
    }));
  };

  // Guardar cambios
  const handleSave = async () => {
    if (!rolId || !moduloId || !moduloData) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const token = await getToken();

      // Construir objeto permisosCampos
      const permisosCampos: PermisosCampos = {};

      if (hiddenFields.size > 0) {
        permisosCampos.hide = Array.from(hiddenFields);
      }

      if (readonlyFields.size > 0) {
        permisosCampos.readonly = Array.from(readonlyFields);
      }

      // Combinar autoFilters seleccionados
      if (selectedAutoFilters.size > 0 && moduloConfig?.autoFilters) {
        const combinedFilter: Record<string, unknown> = {};
        for (const filterId of selectedAutoFilters) {
          const af = moduloConfig.autoFilters.find(f => f.id === filterId);
          if (af) {
            Object.assign(combinedFilter, af.valor);
          }
        }
        if (Object.keys(combinedFilter).length > 0) {
          permisosCampos.autoFilter = combinedFilter;
        }
      }

      // Agregar overrides con valores no vacíos
      const validOverrides = Object.fromEntries(
        Object.entries(overrideValues).filter(([, v]) => v.trim() !== '')
      );
      if (Object.keys(validOverrides).length > 0) {
        permisosCampos.override = validOverrides;
      }

      // Preparar datos para guardar
      const dataToSave: RolModuloInput[] = [{
        moduloId,
        puedeVer: moduloData.puedeVer,
        puedeCrear: moduloData.puedeCrear,
        puedeEditar: moduloData.puedeEditar,
        puedeEliminar: moduloData.puedeEliminar,
        alcanceVer: moduloData.alcanceVer as 'all' | 'team' | 'own',
        alcanceEditar: moduloData.alcanceEditar as 'all' | 'team' | 'own',
        permisosCampos: Object.keys(permisosCampos).length > 0 ? permisosCampos : undefined,
      }];

      await updateRolModulos(rolId, dataToSave, token);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  // Verificar acceso
  if (!isPlatformAdmin) {
    return (
      <div className="field-perms-page">
        <div className="alert alert-error">No tienes permisos para acceder a esta página</div>
        <style>{styles}</style>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="field-perms-page loading-state">
        <div className="loading-spinner"></div>
        <p>Cargando configuración...</p>
        <style>{styles}</style>
      </div>
    );
  }

  if (!moduloConfig) {
    return (
      <div className="field-perms-page">
        <div className="alert alert-warning">
          Este módulo ({moduloId}) no tiene configuración de campos disponible.
          <br />
          Los campos se pueden agregar en <code>src/config/modulosCampos.ts</code>
        </div>
        <button className="btn-secondary" onClick={() => navigate(-1)}>
          ← Volver
        </button>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="field-perms-page">
      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <button onClick={() => navigate('/admin/roles')}>Roles</button>
        <span className="separator">›</span>
        <button onClick={() => navigate('/admin/roles/permisos')}>
          {rol?.nombre || 'Permisos'}
        </button>
        <span className="separator">›</span>
        <span className="current">Campos: {moduloData?.moduloNombre}</span>
      </nav>

      {/* Header */}
      <div className="page-header">
        <div className="header-info">
          <h1>Permisos de Campos</h1>
          <p className="subtitle">
            Configura qué campos puede ver y editar el rol <strong>{rol?.nombre}</strong> en el módulo <strong>{moduloData?.moduloNombre}</strong>
          </p>
        </div>
        <span className="role-badge">{rol?.codigo}</span>
      </div>

      {/* Messages */}
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">Cambios guardados correctamente</div>}

      {/* Filtros Automáticos */}
      {moduloConfig.autoFilters && moduloConfig.autoFilters.length > 0 && (
        <section className="config-section">
          <div className="section-header">
            <span className="section-icon">🔍</span>
            <h2>Filtros Automáticos</h2>
          </div>
          <p className="section-description">
            Los filtros automáticos limitan qué registros puede ver este rol. Se aplican automáticamente en cada consulta.
          </p>
          <div className="auto-filters-grid">
            {moduloConfig.autoFilters.map((af) => (
              <label key={af.id} className={`filter-card ${selectedAutoFilters.has(af.id) ? 'active' : ''}`}>
                <input
                  type="checkbox"
                  checked={selectedAutoFilters.has(af.id)}
                  onChange={() => toggleAutoFilter(af.id)}
                />
                <div className="filter-content">
                  <span className="filter-label">{af.label}</span>
                  <span className="filter-desc">{af.descripcion}</span>
                </div>
              </label>
            ))}
          </div>
        </section>
      )}

      {/* Overrides (Valores de Reemplazo) */}
      {moduloConfig.overrides && moduloConfig.overrides.length > 0 && (
        <section className="config-section">
          <div className="section-header">
            <span className="section-icon">🔄</span>
            <h2>Valores de Reemplazo</h2>
          </div>
          <p className="section-description">
            Estos valores reemplazan los datos reales. Útil para ocultar información sensible mostrando un valor genérico.
          </p>
          <div className="overrides-grid">
            {moduloConfig.overrides.map((ov) => (
              <div key={ov.campo} className="override-field">
                <label>{ov.label}</label>
                <input
                  type="text"
                  placeholder={ov.placeholder}
                  value={overrideValues[ov.campo] || ''}
                  onChange={(e) => updateOverride(ov.campo, e.target.value)}
                />
                <span className="field-id">Campo: {ov.campo}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Campos por Grupo */}
      <section className="config-section">
        <div className="section-header">
          <span className="section-icon">👁</span>
          <h2>Visibilidad de Campos</h2>
        </div>
        <p className="section-description">
          Configura qué campos puede ver y editar este rol. Los campos ocultos no aparecerán en ninguna parte de la interfaz.
        </p>

        <div className="legend">
          <span className="legend-item legend-hidden">
            <span className="legend-icon">✕</span> Oculto
          </span>
          <span className="legend-item legend-readonly">
            <span className="legend-icon">🔒</span> Solo Lectura
          </span>
          <span className="legend-item legend-visible">
            <span className="legend-icon">✓</span> Visible
          </span>
        </div>

        {Array.from(gruposCampos.entries()).map(([grupo, campos]) => (
          <div key={grupo} className="field-group">
            <div className="group-header">
              <h3>{grupo}</h3>
              <span className="field-count">{campos.length} campos</span>
            </div>
            <div className="fields-grid">
              {campos.map((campo) => (
                <FieldPermissionCard
                  key={campo.id}
                  campo={campo}
                  isHidden={hiddenFields.has(campo.id)}
                  isReadonly={readonlyFields.has(campo.id)}
                  onToggleHidden={() => toggleHidden(campo.id)}
                  onToggleReadonly={() => toggleReadonly(campo.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Botones de Acción */}
      <div className="action-buttons">
        <button className="btn-secondary" onClick={() => navigate(-1)}>
          ← Cancelar
        </button>
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Guardando...' : '💾 Guardar Cambios'}
        </button>
      </div>

      <style>{styles}</style>
    </div>
  );
}

// Componente para cada campo
interface FieldPermissionCardProps {
  campo: CampoConfig;
  isHidden: boolean;
  isReadonly: boolean;
  onToggleHidden: () => void;
  onToggleReadonly: () => void;
}

function FieldPermissionCard({
  campo,
  isHidden,
  isReadonly,
  onToggleHidden,
  onToggleReadonly,
}: FieldPermissionCardProps) {
  return (
    <div
      className={`field-card ${isHidden ? 'hidden-field' : isReadonly ? 'readonly-field' : ''}`}
    >
      <div className="field-info">
        <span className="field-label">{campo.label}</span>
        {campo.descripcion && (
          <span className="field-desc" title={campo.descripcion}>
            {campo.descripcion}
          </span>
        )}
        <code className="field-id">{campo.id}</code>
      </div>
      <div className="field-actions">
        <button
          className={`action-btn ${isHidden ? 'active-hidden' : ''}`}
          onClick={onToggleHidden}
          title={isHidden ? 'Mostrar campo' : 'Ocultar campo'}
        >
          {isHidden ? '✕' : '👁'}
        </button>
        <button
          className={`action-btn ${isReadonly ? 'active-readonly' : ''}`}
          onClick={onToggleReadonly}
          disabled={isHidden}
          title={isReadonly ? 'Permitir edición' : 'Solo lectura'}
        >
          {isReadonly ? '🔒' : '✏️'}
        </button>
      </div>
    </div>
  );
}

const styles = `
  .field-perms-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    gap: 16px;
    color: #64748B;
  }

  .loading-spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #E2E8F0;
    border-top-color: #2563EB;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Breadcrumb */
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 24px;
    font-size: 0.875rem;
  }

  .breadcrumb button {
    background: none;
    border: none;
    color: #2563EB;
    cursor: pointer;
    padding: 0;
    font-size: inherit;
  }

  .breadcrumb button:hover {
    text-decoration: underline;
  }

  .breadcrumb .separator {
    color: #94A3B8;
  }

  .breadcrumb .current {
    color: #64748B;
  }

  /* Header */
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 32px;
    padding: 24px;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
  }

  .header-info h1 {
    margin: 0 0 8px 0;
    font-size: 1.75rem;
    font-weight: 700;
    color: #0F172A;
  }

  .subtitle {
    margin: 0;
    color: #64748B;
  }

  .subtitle strong {
    color: #2563EB;
  }

  .role-badge {
    display: inline-block;
    padding: 6px 16px;
    background: #DBEAFE;
    color: #1E40AF;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  /* Alerts */
  .alert {
    padding: 16px 20px;
    margin-bottom: 24px;
    border-radius: 10px;
    font-weight: 500;
  }

  .alert-error {
    background: #FEF2F2;
    border: 1px solid #FECACA;
    color: #DC2626;
  }

  .alert-success {
    background: #F0FDF4;
    border: 1px solid #BBF7D0;
    color: #16A34A;
  }

  .alert-warning {
    background: #FFFBEB;
    border: 1px solid #FDE68A;
    color: #D97706;
  }

  .alert code {
    background: rgba(0,0,0,0.1);
    padding: 2px 6px;
    border-radius: 4px;
  }

  /* Sections */
  .config-section {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }

  .section-icon {
    font-size: 1.5rem;
  }

  .section-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #0F172A;
  }

  .section-description {
    margin: 0 0 20px 0;
    color: #64748B;
    font-size: 0.9375rem;
  }

  /* Auto Filters */
  .auto-filters-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 12px;
  }

  .filter-card {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    background: #F8FAFC;
    border: 2px solid #E2E8F0;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .filter-card:hover {
    border-color: #94A3B8;
  }

  .filter-card.active {
    background: #EFF6FF;
    border-color: #2563EB;
  }

  .filter-card input[type="checkbox"] {
    width: 20px;
    height: 20px;
    margin-top: 2px;
    accent-color: #2563EB;
  }

  .filter-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .filter-label {
    font-weight: 600;
    color: #0F172A;
  }

  .filter-desc {
    font-size: 0.8125rem;
    color: #64748B;
  }

  /* Overrides */
  .overrides-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }

  .override-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .override-field label {
    font-weight: 600;
    color: #334155;
    font-size: 0.875rem;
  }

  .override-field input {
    padding: 10px 14px;
    border: 1px solid #CBD5E1;
    border-radius: 8px;
    font-size: 0.9375rem;
  }

  .override-field input:focus {
    outline: none;
    border-color: #2563EB;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .override-field .field-id {
    font-size: 0.75rem;
    color: #94A3B8;
  }

  /* Legend */
  .legend {
    display: flex;
    gap: 24px;
    margin-bottom: 20px;
    padding: 12px 16px;
    background: #F8FAFC;
    border-radius: 8px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .legend-icon {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    font-size: 0.75rem;
  }

  .legend-hidden .legend-icon {
    background: #FEE2E2;
    color: #DC2626;
  }

  .legend-readonly .legend-icon {
    background: #FEF3C7;
    color: #D97706;
  }

  .legend-visible .legend-icon {
    background: #D1FAE5;
    color: #059669;
  }

  /* Field Groups */
  .field-group {
    margin-bottom: 24px;
  }

  .field-group:last-child {
    margin-bottom: 0;
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #E2E8F0;
  }

  .group-header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #334155;
  }

  .field-count {
    font-size: 0.75rem;
    color: #64748B;
    background: #F1F5F9;
    padding: 2px 8px;
    border-radius: 4px;
  }

  .fields-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
  }

  /* Field Cards */
  .field-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    transition: all 0.2s;
  }

  .field-card.hidden-field {
    background: #FEF2F2;
    border-color: #FECACA;
  }

  .field-card.readonly-field {
    background: #FFFBEB;
    border-color: #FDE68A;
  }

  .field-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }

  .field-label {
    font-weight: 500;
    color: #0F172A;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .field-desc {
    font-size: 0.75rem;
    color: #64748B;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .field-info .field-id {
    font-size: 0.6875rem;
    color: #94A3B8;
    font-family: monospace;
  }

  .field-actions {
    display: flex;
    gap: 4px;
    margin-left: 12px;
  }

  .action-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #F1F5F9;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .action-btn:hover:not(:disabled) {
    background: #E2E8F0;
  }

  .action-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .action-btn.active-hidden {
    background: #FEE2E2;
    border-color: #FECACA;
    color: #DC2626;
  }

  .action-btn.active-readonly {
    background: #FEF3C7;
    border-color: #FDE68A;
    color: #D97706;
  }

  /* Action Buttons */
  .action-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding-top: 24px;
  }

  .btn-primary {
    display: flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 0.9375rem;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .btn-secondary {
    padding: 12px 24px;
    background: #FFFFFF;
    color: #475569;
    border: 1px solid #CBD5E1;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary:hover {
    background: #F8FAFC;
    border-color: #94A3B8;
  }

  @media (max-width: 768px) {
    .page-header {
      flex-direction: column;
      gap: 16px;
    }

    .fields-grid {
      grid-template-columns: 1fr;
    }

    .action-buttons {
      flex-direction: column-reverse;
    }

    .action-buttons button {
      width: 100%;
    }
  }
`;
