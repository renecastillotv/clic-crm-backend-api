/**
 * CrmWebComponentes - Gestión de componentes web reutilizables
 *
 * Permite crear, editar y eliminar componentes globales (headers, footers, etc.)
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { getComponentes, saveComponente, deleteComponente, ComponenteWeb } from '../../../services/api';
import {
  TipoComponente,
  COMPONENTES_DISPONIBLES,
  ComponenteDataEstructurado,
} from '../../../types/componentes';

export default function CrmWebComponentes() {
  const { tenantActual } = useAuth();

  const [componentes, setComponentes] = useState<ComponenteWeb[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedComponente, setSelectedComponente] = useState<ComponenteWeb | null>(null);
  const [saving, setSaving] = useState(false);

  // Formulario nuevo componente
  const [newTipo, setNewTipo] = useState<TipoComponente>('hero');
  const [newVariante, setNewVariante] = useState('default');

  // Cargar componentes globales (sin paginaId)
  useEffect(() => {
    if (!tenantActual?.id) return;

    async function loadComponentes() {
      try {
        setLoading(true);
        setError(null);
        const data = await getComponentes(tenantActual!.id, undefined, true);
        // Filtrar solo componentes globales (sin paginaId)
        const globales = data.filter((c: ComponenteWeb) => !c.paginaId);
        setComponentes(globales);
      } catch (err: any) {
        console.error('Error cargando componentes:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadComponentes();
  }, [tenantActual?.id]);

  // Crear nuevo componente
  const handleCreate = async () => {
    if (!tenantActual?.id) return;

    try {
      setSaving(true);
      const componenteInfo = COMPONENTES_DISPONIBLES[newTipo];

      // Crear datos iniciales estructurados
      const datosIniciales: ComponenteDataEstructurado = {
        static_data: {},
        toggles: {},
      };

      // Añadir valores por defecto de los campos
      componenteInfo.campos.forEach((campo) => {
        if (campo.defaultValue !== undefined) {
          if (campo.type === 'boolean') {
            datosIniciales.toggles![campo.key] = campo.defaultValue;
          } else {
            datosIniciales.static_data[campo.key] = campo.defaultValue;
          }
        }
      });

      const newComponente = await saveComponente(tenantActual.id, {
        tipo: newTipo,
        variante: newVariante,
        datos: datosIniciales,
        activo: true,
        orden: componentes.length + 1,
        paginaId: null,
        predeterminado: componentes.filter((c) => c.tipo === newTipo).length === 0,
      });

      setComponentes([...componentes, newComponente]);
      setShowNewModal(false);
      setNewTipo('hero');
      setNewVariante('default');

      // Abrir editor
      setSelectedComponente(newComponente);
      setShowEditModal(true);
    } catch (err: any) {
      console.error('Error creando componente:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Guardar componente editado
  const handleSave = async () => {
    if (!tenantActual?.id || !selectedComponente) return;

    try {
      setSaving(true);
      const updated = await saveComponente(tenantActual.id, selectedComponente);
      setComponentes(componentes.map((c) => (c.id === updated.id ? updated : c)));
      setShowEditModal(false);
      setSelectedComponente(null);
    } catch (err: any) {
      console.error('Error guardando componente:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Eliminar componente
  const handleDelete = async (componente: ComponenteWeb) => {
    if (!tenantActual?.id || !componente.id) return;
    if (!confirm('¿Estás seguro de eliminar este componente?')) return;

    try {
      await deleteComponente(tenantActual.id, componente.id);
      setComponentes(componentes.filter((c) => c.id !== componente.id));
    } catch (err: any) {
      console.error('Error eliminando componente:', err);
      setError(err.message);
    }
  };

  // Toggle predeterminado
  const handleTogglePredeterminado = async (componente: ComponenteWeb) => {
    if (!tenantActual?.id) return;

    try {
      // Quitar predeterminado de otros del mismo tipo
      const updates = componentes
        .filter((c) => c.tipo === componente.tipo && c.id !== componente.id && c.predeterminado)
        .map((c) => saveComponente(tenantActual!.id, { ...c, predeterminado: false }));

      await Promise.all(updates);

      // Establecer este como predeterminado
      const updated = await saveComponente(tenantActual.id, {
        ...componente,
        predeterminado: true,
      });

      setComponentes(
        componentes.map((c) => {
          if (c.id === updated.id) return updated;
          if (c.tipo === componente.tipo) return { ...c, predeterminado: false };
          return c;
        })
      );
    } catch (err: any) {
      console.error('Error actualizando predeterminado:', err);
      setError(err.message);
    }
  };

  // Actualizar campo del componente seleccionado
  const updateField = (fieldKey: string, value: any, isToggle: boolean = false) => {
    if (!selectedComponente) return;

    const datos = selectedComponente.datos as ComponenteDataEstructurado;
    const newDatos: ComponenteDataEstructurado = {
      ...datos,
      static_data: { ...datos.static_data },
      toggles: { ...datos.toggles },
    };

    if (isToggle) {
      newDatos.toggles![fieldKey] = value;
    } else {
      newDatos.static_data[fieldKey] = value;
    }

    setSelectedComponente({ ...selectedComponente, datos: newDatos });
  };

  // Agrupar componentes por tipo
  const componentesPorTipo = componentes.reduce((acc, comp) => {
    const tipo = comp.tipo as TipoComponente;
    if (!acc[tipo]) acc[tipo] = [];
    acc[tipo].push(comp);
    return acc;
  }, {} as Record<TipoComponente, ComponenteWeb[]>);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando componentes...</p>
      </div>
    );
  }

  return (
    <div className="web-componentes">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Componentes Web</h1>
          <p className="subtitle">Biblioteca de componentes reutilizables</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNewModal(true)}>
          + Nuevo Componente
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Lista de componentes */}
      {componentes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🧩</div>
          <h2>No hay componentes globales</h2>
          <p>Crea componentes reutilizables como headers, footers y más</p>
          <button className="btn-primary" onClick={() => setShowNewModal(true)}>
            Crear primer componente
          </button>
        </div>
      ) : (
        <div className="componentes-sections">
          {Object.entries(componentesPorTipo).map(([tipo, comps]) => {
            const tipoInfo = COMPONENTES_DISPONIBLES[tipo as TipoComponente];
            return (
              <div key={tipo} className="componente-section">
                <h2 className="section-title">
                  <span className="section-icon">{tipoInfo?.icono}</span>
                  {tipoInfo?.nombre || tipo}
                  <span className="section-count">{comps.length}</span>
                </h2>

                <div className="componentes-grid">
                  {comps.map((componente) => (
                    <div
                      key={componente.id}
                      className={`componente-card ${!componente.activo ? 'inactive' : ''} ${
                        componente.predeterminado ? 'default' : ''
                      }`}
                    >
                      <div className="componente-header">
                        <span className="variante-badge">{componente.variante}</span>
                        {componente.predeterminado && (
                          <span className="default-badge">Predeterminado</span>
                        )}
                      </div>

                      <div className="componente-preview">
                        <span className="preview-icon">{tipoInfo?.icono}</span>
                      </div>

                      <div className="componente-info">
                        <span className="componente-orden">Orden: {componente.orden}</span>
                        <span className={`status-badge ${componente.activo ? 'active' : ''}`}>
                          {componente.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>

                      <div className="componente-actions">
                        {!componente.predeterminado && (
                          <button
                            className="btn-small"
                            onClick={() => handleTogglePredeterminado(componente)}
                            title="Hacer predeterminado"
                          >
                            ⭐
                          </button>
                        )}
                        <button
                          className="btn-small"
                          onClick={() => {
                            setSelectedComponente(componente);
                            setShowEditModal(true);
                          }}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-small danger"
                          onClick={() => handleDelete(componente)}
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nuevo Componente */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nuevo Componente</h2>
              <button className="modal-close" onClick={() => setShowNewModal(false)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Tipo de Componente</label>
                <div className="tipo-grid">
                  {Object.values(COMPONENTES_DISPONIBLES).map((info) => (
                    <button
                      key={info.codigo}
                      type="button"
                      className={`tipo-card ${newTipo === info.codigo ? 'selected' : ''}`}
                      onClick={() => {
                        setNewTipo(info.codigo);
                        setNewVariante('default');
                      }}
                    >
                      <span className="tipo-icon">{info.icono}</span>
                      <span className="tipo-name">{info.nombre}</span>
                      <span className="tipo-cat">{info.categoria}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Variante</label>
                <div className="variante-grid">
                  {COMPONENTES_DISPONIBLES[newTipo]?.variantes.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`variante-option ${newVariante === v ? 'selected' : ''}`}
                      onClick={() => setNewVariante(v)}
                    >
                      {v === 'default' ? 'Por defecto' : v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowNewModal(false)}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? 'Creando...' : 'Crear Componente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Componente */}
      {showEditModal && selectedComponente && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                Editar{' '}
                {COMPONENTES_DISPONIBLES[selectedComponente.tipo as TipoComponente]?.nombre ||
                  selectedComponente.tipo}
              </h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="editor-grid">
                {/* Campos del componente */}
                {COMPONENTES_DISPONIBLES[selectedComponente.tipo as TipoComponente]?.campos.map(
                  (campo) => {
                    const datos = selectedComponente.datos as ComponenteDataEstructurado;
                    const value =
                      campo.type === 'boolean'
                        ? datos.toggles?.[campo.key] ?? campo.defaultValue
                        : datos.static_data?.[campo.key] ?? campo.defaultValue ?? '';

                    return (
                      <div key={campo.key} className="form-group">
                        <label htmlFor={campo.key}>
                          {campo.label}
                          {campo.required && <span className="required">*</span>}
                        </label>

                        {campo.type === 'textarea' ? (
                          <textarea
                            id={campo.key}
                            value={value}
                            onChange={(e) => updateField(campo.key, e.target.value)}
                            placeholder={campo.description}
                            rows={3}
                          />
                        ) : campo.type === 'boolean' ? (
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={value}
                              onChange={(e) => updateField(campo.key, e.target.checked, true)}
                            />
                            <span className="toggle-slider"></span>
                            <span className="toggle-label">{value ? 'Sí' : 'No'}</span>
                          </label>
                        ) : campo.type === 'number' ? (
                          <input
                            id={campo.key}
                            type="number"
                            value={value}
                            onChange={(e) => updateField(campo.key, parseInt(e.target.value) || 0)}
                          />
                        ) : (
                          <input
                            id={campo.key}
                            type={campo.type === 'url' ? 'url' : 'text'}
                            value={value}
                            onChange={(e) => updateField(campo.key, e.target.value)}
                            placeholder={campo.description}
                          />
                        )}
                      </div>
                    );
                  }
                )}

                {/* Configuración adicional */}
                <div className="form-group">
                  <label>Estado</label>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={selectedComponente.activo}
                      onChange={(e) =>
                        setSelectedComponente({ ...selectedComponente, activo: e.target.checked })
                      }
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">
                      {selectedComponente.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </label>
                </div>

                <div className="form-group">
                  <label htmlFor="orden">Orden</label>
                  <input
                    id="orden"
                    type="number"
                    value={selectedComponente.orden || 0}
                    onChange={(e) =>
                      setSelectedComponente({
                        ...selectedComponente,
                        orden: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowEditModal(false)}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .web-componentes {
          max-width: 1400px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
        }

        .page-header h1 {
          margin: 0 0 4px 0;
          font-size: 1.75rem;
        }

        .subtitle {
          color: #94a3b8;
          margin: 0;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }

        .btn-primary:hover {
          background: #2563eb;
        }

        .btn-primary:disabled {
          background: #64748b;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #334155;
          color: #f1f5f9;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-secondary:hover {
          background: #475569;
        }

        .btn-small {
          background: #334155;
          border: none;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1rem;
          transition: background 0.2s;
        }

        .btn-small:hover {
          background: #475569;
        }

        .btn-small.danger:hover {
          background: #dc2626;
        }

        .error-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #dc262620;
          border: 1px solid #dc2626;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          color: #fca5a5;
        }

        .error-banner button {
          background: none;
          border: none;
          color: #fca5a5;
          font-size: 1.25rem;
          cursor: pointer;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px;
          color: #94a3b8;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #334155;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-state {
          text-align: center;
          padding: 60px 40px;
          background: #1e293b;
          border-radius: 12px;
          border: 1px solid #334155;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 16px;
        }

        .empty-state h2 {
          margin: 0 0 8px 0;
        }

        .empty-state p {
          color: #94a3b8;
          margin: 0 0 24px 0;
        }

        .componentes-sections {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .componente-section {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 20px;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0 0 20px 0;
          font-size: 1.125rem;
        }

        .section-icon {
          font-size: 1.5rem;
        }

        .section-count {
          background: #334155;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .componentes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
        }

        .componente-card {
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 10px;
          padding: 16px;
          transition: all 0.2s;
        }

        .componente-card:hover {
          border-color: #3b82f6;
        }

        .componente-card.inactive {
          opacity: 0.5;
        }

        .componente-card.default {
          border-color: #eab308;
        }

        .componente-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .variante-badge {
          background: #334155;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .default-badge {
          background: #eab30820;
          color: #eab308;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
        }

        .componente-preview {
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1e293b;
          border-radius: 8px;
          margin-bottom: 12px;
        }

        .preview-icon {
          font-size: 2.5rem;
          opacity: 0.5;
        }

        .componente-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .status-badge {
          padding: 2px 8px;
          border-radius: 4px;
          background: #64748b20;
        }

        .status-badge.active {
          background: #22c55e20;
          color: #22c55e;
        }

        .componente-actions {
          display: flex;
          gap: 8px;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal {
          background: #1e293b;
          border-radius: 16px;
          width: 100%;
          max-width: 700px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-large {
          max-width: 900px;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #334155;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
        }

        .modal-close {
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 4px;
        }

        .modal-body {
          padding: 24px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #334155;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #e2e8f0;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 12px 16px;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 8px;
          color: #f1f5f9;
          font-size: 1rem;
          font-family: inherit;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .required {
          color: #ef4444;
          margin-left: 4px;
        }

        .tipo-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          max-height: 300px;
          overflow-y: auto;
        }

        .tipo-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 16px 8px;
          background: #0f172a;
          border: 2px solid #334155;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
          color: #e2e8f0;
        }

        .tipo-card:hover {
          border-color: #475569;
        }

        .tipo-card.selected {
          border-color: #3b82f6;
          background: #3b82f620;
        }

        .tipo-icon {
          font-size: 1.5rem;
        }

        .tipo-name {
          font-size: 0.75rem;
          font-weight: 500;
          text-align: center;
        }

        .tipo-cat {
          font-size: 0.625rem;
          color: #64748b;
          text-transform: uppercase;
        }

        .variante-grid {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .variante-option {
          padding: 10px 20px;
          background: #0f172a;
          border: 2px solid #334155;
          border-radius: 8px;
          color: #e2e8f0;
          cursor: pointer;
          transition: all 0.2s;
        }

        .variante-option:hover {
          border-color: #475569;
        }

        .variante-option.selected {
          border-color: #3b82f6;
          background: #3b82f620;
        }

        .editor-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .editor-grid .form-group:first-child {
          grid-column: 1 / -1;
        }

        .toggle-switch {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }

        .toggle-switch input {
          display: none;
        }

        .toggle-slider {
          width: 48px;
          height: 26px;
          background: #334155;
          border-radius: 13px;
          position: relative;
          transition: background 0.2s;
        }

        .toggle-slider::before {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          top: 3px;
          left: 3px;
          transition: transform 0.2s;
        }

        .toggle-switch input:checked + .toggle-slider {
          background: #3b82f6;
        }

        .toggle-switch input:checked + .toggle-slider::before {
          transform: translateX(22px);
        }

        .toggle-label {
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
}
