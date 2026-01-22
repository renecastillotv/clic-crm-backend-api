/**
 * AdminTemplatePermisos - Configuración de permisos por template
 * Muestra una matriz de módulos con checkboxes para cada permiso.
 * Permite guardar cambios y propagar a roles existentes.
 */

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getTemplateMatrix,
  updateTemplateModulos,
  propagateTemplateModulo,
  TemplateMatrix,
  TemplateModuloInput,
} from '../../services/api';

interface ModuloRow {
  id: string;
  nombre: string;
  categoria: string;
  orden: number;
  esSubmenu: boolean;
  moduloPadreId: string | null;
  puedeVer: boolean;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
  alcanceVer: 'all' | 'team' | 'own';
  alcanceEditar: 'all' | 'team' | 'own';
}

export default function AdminTemplatePermisos() {
  const { templateId } = useParams<{ templateId: string }>();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [matrix, setMatrix] = useState<TemplateMatrix | null>(null);
  const [modulos, setModulos] = useState<ModuloRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [propagating, setPropagating] = useState<string | null>(null);

  useEffect(() => {
    if (templateId) loadMatrix();
  }, [templateId]);

  const loadMatrix = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) throw new Error('No se pudo obtener el token de autenticación');
      const data = await getTemplateMatrix(templateId!, token);
      setMatrix(data);

      // Convert matrix to editable rows
      const rows: ModuloRow[] = data.modulos.map((m) => ({
        id: m.id,
        nombre: m.nombre,
        categoria: m.categoria,
        orden: m.orden,
        esSubmenu: m.esSubmenu,
        moduloPadreId: m.moduloPadreId,
        puedeVer: m.permisos?.puedeVer ?? false,
        puedeCrear: m.permisos?.puedeCrear ?? false,
        puedeEditar: m.permisos?.puedeEditar ?? false,
        puedeEliminar: m.permisos?.puedeEliminar ?? false,
        alcanceVer: m.permisos?.alcanceVer ?? 'own',
        alcanceEditar: m.permisos?.alcanceEditar ?? 'own',
      }));
      setModulos(rows);
      setHasChanges(false);
    } catch (err: any) {
      setError(err.message || 'Error al cargar permisos');
      console.error('Error cargando matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (moduloId: string, field: keyof ModuloRow, value: any) => {
    setModulos((prev) =>
      prev.map((m) => {
        if (m.id !== moduloId) return m;
        const updated = { ...m, [field]: value };

        // If disabling "ver", disable all other permissions
        if (field === 'puedeVer' && !value) {
          updated.puedeCrear = false;
          updated.puedeEditar = false;
          updated.puedeEliminar = false;
        }

        // If enabling crear/editar/eliminar, enable ver too
        if ((field === 'puedeCrear' || field === 'puedeEditar' || field === 'puedeEliminar') && value) {
          updated.puedeVer = true;
        }

        return updated;
      })
    );
    setHasChanges(true);
    setSuccessMsg(null);
  };

  const handleToggleAll = (field: 'puedeVer' | 'puedeCrear' | 'puedeEditar' | 'puedeEliminar', value: boolean) => {
    setModulos((prev) =>
      prev.map((m) => {
        const updated = { ...m, [field]: value };
        if (field === 'puedeVer' && !value) {
          updated.puedeCrear = false;
          updated.puedeEditar = false;
          updated.puedeEliminar = false;
        }
        if ((field === 'puedeCrear' || field === 'puedeEditar' || field === 'puedeEliminar') && value) {
          updated.puedeVer = true;
        }
        return updated;
      })
    );
    setHasChanges(true);
    setSuccessMsg(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);
      const token = await getToken();
      if (!token) throw new Error('No se pudo obtener el token de autenticación');

      // Only send modules that have at least puedeVer = true
      const modulosToSave: TemplateModuloInput[] = modulos
        .filter((m) => m.puedeVer)
        .map((m) => ({
          moduloId: m.id,
          puedeVer: m.puedeVer,
          puedeCrear: m.puedeCrear,
          puedeEditar: m.puedeEditar,
          puedeEliminar: m.puedeEliminar,
          alcanceVer: m.alcanceVer,
          alcanceEditar: m.alcanceEditar,
        }));

      await updateTemplateModulos(templateId!, modulosToSave, token);
      setHasChanges(false);
      setSuccessMsg('Permisos guardados correctamente');
    } catch (err: any) {
      setError(err.message || 'Error al guardar permisos');
      console.error('Error guardando permisos:', err);
    } finally {
      setSaving(false);
    }
  };

  const handlePropagate = async (moduloId: string) => {
    const modulo = modulos.find((m) => m.id === moduloId);
    if (!modulo) return;

    if (!confirm(`¿Propagar los permisos de "${modulo.nombre}" a todos los roles que heredan de este template?`)) {
      return;
    }

    try {
      setPropagating(moduloId);
      setError(null);
      const token = await getToken();
      if (!token) throw new Error('No se pudo obtener el token de autenticación');

      const result = await propagateTemplateModulo(
        templateId!,
        moduloId,
        {
          moduloId,
          puedeVer: modulo.puedeVer,
          puedeCrear: modulo.puedeCrear,
          puedeEditar: modulo.puedeEditar,
          puedeEliminar: modulo.puedeEliminar,
          alcanceVer: modulo.alcanceVer,
          alcanceEditar: modulo.alcanceEditar,
        },
        token
      );
      setSuccessMsg(`Propagado a ${result.propagatedCount} roles`);
    } catch (err: any) {
      setError(err.message || 'Error al propagar');
      console.error('Error propagando:', err);
    } finally {
      setPropagating(null);
    }
  };

  // Group modules by category with parent-child
  const groupedModulos = useMemo(() => {
    const categorias: Record<string, ModuloRow[]> = {};
    const parents = modulos.filter((m) => !m.esSubmenu);
    const children = modulos.filter((m) => m.esSubmenu);

    // Build ordered list: parent then its children
    const ordered: ModuloRow[] = [];
    for (const parent of parents.sort((a, b) => a.orden - b.orden)) {
      ordered.push(parent);
      const kids = children
        .filter((c) => c.moduloPadreId === parent.id)
        .sort((a, b) => a.orden - b.orden);
      ordered.push(...kids);
    }

    // Group by categoria
    for (const mod of ordered) {
      if (!categorias[mod.categoria]) categorias[mod.categoria] = [];
      categorias[mod.categoria].push(mod);
    }

    return categorias;
  }, [modulos]);

  const categoryLabels: Record<string, string> = {
    crm: 'CRM',
    finanzas: 'Finanzas',
    rendimiento: 'Rendimiento',
    comunicacion: 'Comunicación',
    features: 'Features',
    admin: 'Administración',
  };

  if (loading) {
    return (
      <div className="admin-tpl-permisos-loading">
        <div className="loading-spinner"></div>
        <p>Cargando permisos del template...</p>
        <style>{`
          .admin-tpl-permisos-loading {
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
        `}</style>
      </div>
    );
  }

  if (error && !matrix) {
    return (
      <div className="admin-tpl-permisos-error">
        <div className="error-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3>Error al cargar datos</h3>
        <p>{error}</p>
        <button onClick={loadMatrix} className="retry-btn">Reintentar</button>
        <style>{`
          .admin-tpl-permisos-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            gap: 16px;
            text-align: center;
          }
          .error-icon { color: #EF4444; }
          .retry-btn {
            padding: 10px 24px;
            background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }
          .retry-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
          }
        `}</style>
      </div>
    );
  }

  const enabledCount = modulos.filter((m) => m.puedeVer).length;

  return (
    <div className="admin-tpl-permisos">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/admin/templates')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Volver
          </button>
          <div>
            <h1>Permisos: {matrix?.template.nombre}</h1>
            <p className="page-subtitle">
              Configura los módulos y permisos disponibles para roles basados en este template
              <span className="enabled-count">{enabledCount} módulos habilitados</span>
            </p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={loadMatrix} disabled={saving}>
            Recargar
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="action-error-banner">
          <div className="error-content">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 9V13M12 17H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="error-close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {successMsg && (
        <div className="success-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="success-close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {/* Bulk Actions */}
      <div className="bulk-actions">
        <span className="bulk-label">Acciones masivas:</span>
        <button className="bulk-btn" onClick={() => handleToggleAll('puedeVer', true)}>Todo Ver</button>
        <button className="bulk-btn" onClick={() => handleToggleAll('puedeCrear', true)}>Todo Crear</button>
        <button className="bulk-btn" onClick={() => handleToggleAll('puedeEditar', true)}>Todo Editar</button>
        <button className="bulk-btn" onClick={() => handleToggleAll('puedeEliminar', true)}>Todo Eliminar</button>
        <button className="bulk-btn bulk-btn-danger" onClick={() => handleToggleAll('puedeVer', false)}>Quitar Todo</button>
      </div>

      {/* Permisos Matrix */}
      <div className="matrix-container">
        <table className="permisos-table">
          <thead>
            <tr>
              <th className="col-modulo">Módulo</th>
              <th className="col-check">Ver</th>
              <th className="col-check">Crear</th>
              <th className="col-check">Editar</th>
              <th className="col-check">Eliminar</th>
              <th className="col-alcance">Alcance Ver</th>
              <th className="col-alcance">Alcance Editar</th>
              <th className="col-actions">Propagar</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedModulos).map(([categoria, mods]) => (
              <>
                <tr key={`cat-${categoria}`} className="category-row">
                  <td colSpan={8}>
                    <span className="category-label">{categoryLabels[categoria] || categoria}</span>
                  </td>
                </tr>
                {mods.map((mod) => (
                  <tr key={mod.id} className={`modulo-row ${mod.esSubmenu ? 'submenu-row' : ''} ${mod.puedeVer ? '' : 'row-disabled'}`}>
                    <td className="col-modulo">
                      {mod.esSubmenu && <span className="submenu-indent">└</span>}
                      <span className="modulo-nombre">{mod.nombre}</span>
                      <span className="modulo-id">{mod.id}</span>
                    </td>
                    <td className="col-check">
                      <input
                        type="checkbox"
                        checked={mod.puedeVer}
                        onChange={(e) => handleChange(mod.id, 'puedeVer', e.target.checked)}
                      />
                    </td>
                    <td className="col-check">
                      <input
                        type="checkbox"
                        checked={mod.puedeCrear}
                        onChange={(e) => handleChange(mod.id, 'puedeCrear', e.target.checked)}
                        disabled={!mod.puedeVer}
                      />
                    </td>
                    <td className="col-check">
                      <input
                        type="checkbox"
                        checked={mod.puedeEditar}
                        onChange={(e) => handleChange(mod.id, 'puedeEditar', e.target.checked)}
                        disabled={!mod.puedeVer}
                      />
                    </td>
                    <td className="col-check">
                      <input
                        type="checkbox"
                        checked={mod.puedeEliminar}
                        onChange={(e) => handleChange(mod.id, 'puedeEliminar', e.target.checked)}
                        disabled={!mod.puedeVer}
                      />
                    </td>
                    <td className="col-alcance">
                      <select
                        value={mod.alcanceVer}
                        onChange={(e) => handleChange(mod.id, 'alcanceVer', e.target.value)}
                        disabled={!mod.puedeVer}
                      >
                        <option value="own">Propios</option>
                        <option value="team">Equipo</option>
                        <option value="all">Todos</option>
                      </select>
                    </td>
                    <td className="col-alcance">
                      <select
                        value={mod.alcanceEditar}
                        onChange={(e) => handleChange(mod.id, 'alcanceEditar', e.target.value)}
                        disabled={!mod.puedeEditar}
                      >
                        <option value="own">Propios</option>
                        <option value="team">Equipo</option>
                        <option value="all">Todos</option>
                      </select>
                    </td>
                    <td className="col-actions">
                      {mod.puedeVer && (
                        <button
                          className="propagate-btn"
                          onClick={() => handlePropagate(mod.id)}
                          disabled={propagating === mod.id || hasChanges}
                          title={hasChanges ? 'Guarda primero los cambios' : 'Propagar a roles heredados'}
                        >
                          {propagating === mod.id ? (
                            <span className="propagate-spinner"></span>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <path d="M4 12H20M20 12L14 6M20 12L14 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Unsaved changes indicator */}
      {hasChanges && (
        <div className="unsaved-bar">
          <span>Tienes cambios sin guardar</span>
          <button className="btn-primary-sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      )}

      <style>{`
        .admin-tpl-permisos {
          max-width: 1400px;
          padding-bottom: 80px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          gap: 24px;
        }

        .header-left {
          display: flex;
          gap: 20px;
          align-items: flex-start;
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: 1px solid #E2E8F0;
          padding: 8px 14px;
          border-radius: 8px;
          color: #475569;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          margin-top: 4px;
        }

        .back-btn:hover {
          background: #F8FAFC;
          border-color: #CBD5E1;
          color: #0F172A;
        }

        .page-header h1 {
          margin: 0 0 8px 0;
          font-size: 1.75rem;
          font-weight: 700;
          color: #0F172A;
          letter-spacing: -0.02em;
        }

        .page-subtitle {
          margin: 0;
          color: #64748B;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .enabled-count {
          background: #DBEAFE;
          color: #1E40AF;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .header-actions {
          display: flex;
          gap: 12px;
          flex-shrink: 0;
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .btn-secondary {
          padding: 10px 20px;
          background: #FFFFFF;
          color: #475569;
          border: 1px solid #CBD5E1;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #F8FAFC;
          border-color: #94A3B8;
        }

        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .action-error-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #FEF2F2;
          border: 1px solid #FECACA;
          border-left: 4px solid #DC2626;
          padding: 12px 16px;
          margin-bottom: 16px;
          border-radius: 8px;
          color: #DC2626;
          font-size: 0.875rem;
        }

        .action-error-banner .error-content {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
        }

        .action-error-banner .error-close,
        .success-close {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .action-error-banner .error-close {
          color: #DC2626;
        }

        .action-error-banner .error-close:hover {
          background: rgba(220, 38, 38, 0.1);
        }

        .success-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #F0FDF4;
          border: 1px solid #BBF7D0;
          border-left: 4px solid #16A34A;
          padding: 12px 16px;
          margin-bottom: 16px;
          border-radius: 8px;
          color: #16A34A;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .success-close {
          margin-left: auto;
          color: #16A34A;
        }

        .success-close:hover {
          background: rgba(22, 163, 74, 0.1);
        }

        .bulk-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          padding: 12px 16px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          flex-wrap: wrap;
        }

        .bulk-label {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #475569;
          margin-right: 4px;
        }

        .bulk-btn {
          padding: 5px 12px;
          background: #FFFFFF;
          border: 1px solid #CBD5E1;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 500;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
        }

        .bulk-btn:hover {
          background: #DBEAFE;
          border-color: #93C5FD;
          color: #1E40AF;
        }

        .bulk-btn-danger:hover {
          background: #FEE2E2;
          border-color: #FECACA;
          color: #DC2626;
        }

        .matrix-container {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          overflow-x: auto;
        }

        .permisos-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .permisos-table thead {
          background: #F8FAFC;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .permisos-table th {
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          color: #475569;
          border-bottom: 2px solid #E2E8F0;
          font-size: 0.8125rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          white-space: nowrap;
        }

        .permisos-table td {
          padding: 10px 16px;
          border-bottom: 1px solid #F1F5F9;
          vertical-align: middle;
        }

        .col-modulo {
          min-width: 200px;
        }

        .col-check {
          width: 60px;
          text-align: center !important;
        }

        .col-check input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #2563EB;
        }

        .col-check input[type="checkbox"]:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .col-alcance {
          width: 120px;
        }

        .col-alcance select {
          width: 100%;
          padding: 6px 10px;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          font-size: 0.8125rem;
          color: #334155;
          background: #FFFFFF;
          cursor: pointer;
          transition: all 0.2s;
        }

        .col-alcance select:focus {
          outline: none;
          border-color: #2563EB;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
        }

        .col-alcance select:disabled {
          opacity: 0.3;
          cursor: not-allowed;
          background: #F8FAFC;
        }

        .col-actions {
          width: 60px;
          text-align: center !important;
        }

        .category-row td {
          background: #F1F5F9;
          padding: 8px 16px;
          border-bottom: 1px solid #E2E8F0;
        }

        .category-label {
          font-weight: 700;
          color: #334155;
          font-size: 0.8125rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .modulo-row:hover {
          background: #FAFBFD;
        }

        .submenu-row .col-modulo {
          padding-left: 32px;
        }

        .submenu-indent {
          color: #CBD5E1;
          margin-right: 6px;
          font-family: monospace;
        }

        .modulo-nombre {
          font-weight: 500;
          color: #0F172A;
        }

        .modulo-id {
          margin-left: 8px;
          font-size: 0.7rem;
          color: #94A3B8;
          font-family: 'Courier New', monospace;
        }

        .row-disabled .modulo-nombre {
          color: #94A3B8;
        }

        .row-disabled {
          background: #FAFAFA;
        }

        .propagate-btn {
          width: 28px;
          height: 28px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          color: #64748B;
          padding: 0;
        }

        .propagate-btn:hover:not(:disabled) {
          background: #DBEAFE;
          border-color: #93C5FD;
          color: #1E40AF;
        }

        .propagate-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .propagate-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid #E2E8F0;
          border-top-color: #2563EB;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        .unsaved-bar {
          position: fixed;
          bottom: 0;
          left: 280px;
          right: 0;
          background: #1E293B;
          color: white;
          padding: 14px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 100;
          box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
        }

        .unsaved-bar span {
          font-size: 0.875rem;
          font-weight: 500;
        }

        .btn-primary-sm {
          padding: 8px 20px;
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.8125rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary-sm:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
        }

        .btn-primary-sm:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
