/**
 * PaginaEditor - Editor de componentes de página
 * Compatible con nueva arquitectura (migraciones 073-077)
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import { apiFetch } from '../../services/api';
import ComponenteConfigModal from '../../components/ComponenteConfigModal';
import {
  ArrowLeft,
  Plus,
  Edit,
  Eye,
  EyeOff,
  GripVertical,
  Trash2,
  RefreshCw,
  Loader2,
  Save,
  Layers,
  X,
} from 'lucide-react';
import './PaginaEditor.css';

// ============================================================
// TYPES
// ============================================================

interface ComponenteAsignado {
  relacion_id: string;
  tipo: string;
  variante: string;
  orden: number;
  activo: boolean;
  default_data: Record<string, any>;
  config_override: Record<string, any>;
  datos_finales: Record<string, any>;
}

interface ComponenteDisponible {
  id: string;
  tipo: string;
  variante: string;
  scope: 'global' | 'tenant';
  default_data: Record<string, any>;
}

interface PaginaData {
  id: string;
  slug: string;
  titulo: string;
  es_personalizada: boolean;
  tipo_pagina_id: string;
  tipo_codigo: string;
  tipo_nombre: string;
}

interface EditorData {
  pagina: PaginaData;
  componentes_asignados: ComponenteAsignado[];
  componentes_disponibles: ComponenteDisponible[];
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function PaginaEditor() {
  const { paginaId, tipoPaginaCodigo } = useParams<{ paginaId?: string; tipoPaginaCodigo?: string }>();
  const navigate = useNavigate();
  const { getToken } = useClerkAuth();
  const { tenantActual } = useAuth();
  const { setPageHeader } = usePageHeader();

  const [editorData, setEditorData] = useState<EditorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Estado para drag & drop
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [componentes, setComponentes] = useState<ComponenteAsignado[]>([]);
  const [ordenCambiado, setOrdenCambiado] = useState(false);

  // Estado para modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [componenteEditando, setComponenteEditando] = useState<ComponenteAsignado | null>(null);

  useEffect(() => {
    if (editorData) {
      const title = tipoPaginaCodigo
        ? `Editando ${editorData.pagina.tipo_nombre || tipoPaginaCodigo}`
        : `Editar: ${editorData.pagina.titulo}`;

      const description = tipoPaginaCodigo
        ? `Arrastra para cambiar orden, edita componentes existentes o agrega nuevos`
        : `Gestiona los componentes de esta página`;

      setPageHeader({
        title,
        description,
        actions: (
          <button
            onClick={() => navigate(`/crm/${tenantActual?.slug}/web/paginas`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f9fafb';
              e.currentTarget.style.borderColor = '#d1d5db';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.borderColor = '#e5e7eb';
            }}
          >
            <ArrowLeft size={16} />
            Volver
          </button>
        )
      });
    }
  }, [editorData, setPageHeader, tipoPaginaCodigo, navigate, tenantActual]);

  useEffect(() => {
    if (tenantActual?.id && (paginaId || tipoPaginaCodigo)) {
      cargarEditor();
    }
  }, [tenantActual, paginaId, tipoPaginaCodigo]);

  useEffect(() => {
    if (editorData) {
      setComponentes(editorData.componentes_asignados);
    }
  }, [editorData]);

  const cargarEditor = async () => {
    if (!tenantActual?.id) return;
    if (!paginaId && !tipoPaginaCodigo) return;

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();

      // Si viene tipoPaginaCodigo, usar endpoint por código
      // Si viene paginaId, usar endpoint por ID
      const endpoint = tipoPaginaCodigo
        ? `/tenants/${tenantActual.id}/tipos-pagina/${tipoPaginaCodigo}/editor`
        : `/tenants/${tenantActual.id}/paginas/${paginaId}/editor`;

      const response = await apiFetch(endpoint, {}, token);
      const data = await response.json();

      if (data.success) {
        setEditorData(data.data);
      } else {
        setError(data.error || 'Error al cargar editor');
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar editor');
    } finally {
      setLoading(false);
    }
  };

  const toggleActivo = async (relacionId: string, activoActual: boolean) => {
    if (!tenantActual?.id || !paginaId) return;

    try {
      const token = await getToken();
      const response = await apiFetch(
        `/tenants/${tenantActual.id}/paginas/${paginaId}/componentes/${relacionId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ activo: !activoActual }),
        },
        token
      );
      const data = await response.json();

      if (data.success) {
        // Actualizar localmente
        setComponentes((prev) =>
          prev.map((comp) =>
            comp.relacion_id === relacionId
              ? { ...comp, activo: !activoActual }
              : comp
          )
        );
      } else {
        alert(data.error || 'Error al cambiar estado');
      }
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado');
    }
  };

  const eliminarComponente = async (relacionId: string) => {
    if (!tenantActual?.id || !paginaId) return;
    if (!confirm('¿Eliminar este componente de la página?')) return;

    try {
      const token = await getToken();
      const response = await apiFetch(
        `/tenants/${tenantActual.id}/paginas/${paginaId}/componentes/${relacionId}`,
        {
          method: 'DELETE',
        },
        token
      );
      const data = await response.json();

      if (data.success) {
        setComponentes((prev) =>
          prev.filter((comp) => comp.relacion_id !== relacionId)
        );
      } else {
        alert(data.error || 'Error al eliminar componente');
      }
    } catch (err: any) {
      alert(err.message || 'Error al eliminar componente');
    }
  };

  const guardarOrden = async () => {
    if (!tenantActual?.id) return;

    setSaving(true);

    try {
      const token = await getToken();
      const ordenNuevo = componentes.map((comp, index) => ({
        id: comp.id,
        orden: index,
      }));

      let endpoint: string;
      if (tipoPaginaCodigo) {
        // Endpoint para tipo de página
        endpoint = `/tenants/${tenantActual.id}/tipos-pagina/${tipoPaginaCodigo}/componentes/reordenar`;
      } else if (paginaId) {
        // Endpoint para página individual (todavía no implementado, pero dejamos la estructura)
        endpoint = `/tenants/${tenantActual.id}/paginas/${paginaId}/componentes/reordenar`;
      } else {
        alert('No se puede guardar el orden');
        setSaving(false);
        return;
      }

      const response = await apiFetch(
        endpoint,
        {
          method: 'POST',
          body: JSON.stringify({ orden: ordenNuevo }),
        },
        token
      );
      const data = await response.json();

      if (data.success) {
        alert('Orden guardado correctamente');
        setDraggedIndex(null);
        setOrdenCambiado(false);
      } else {
        alert(data.error || 'Error al guardar orden');
      }
    } catch (err: any) {
      alert(err.message || 'Error al guardar orden');
    } finally {
      setSaving(false);
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newComponentes = [...componentes];
    const draggedItem = newComponentes[draggedIndex];
    newComponentes.splice(draggedIndex, 1);
    newComponentes.splice(index, 0, draggedItem);

    setComponentes(newComponentes);
    setDraggedIndex(index);
    setOrdenCambiado(true);
  };

  const handleDragEnd = () => {
    // No resetear draggedIndex aquí, mantenerlo para mostrar el botón de guardar
  };

  const abrirConfigModal = (componente: ComponenteAsignado) => {
    setComponenteEditando(componente);
    setShowConfigModal(true);
  };

  if (loading) {
    return (
      <div className="pagina-editor-loading">
        <Loader2 className="pagina-editor-loading-icon" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="pagina-editor-error">
        <p>{error}</p>
        <button
          onClick={cargarEditor}
          className="pagina-editor-error-button"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!editorData) {
    return (
      <div className="pagina-editor-empty">
        <p>No se encontró la página</p>
      </div>
    );
  }

  const { pagina } = editorData;

  // Si estamos viendo por tipo de página (primer paso simplificado)
  if (tipoPaginaCodigo) {
    return (
      <div className="pagina-editor-container">
        {/* Listado de componentes asignados */}
        <div className="pagina-editor-section">
          <div style={{
            background: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            padding: '1rem'
          }}>
              {componentes.length === 0 ? (
                <div style={{
                  padding: '3rem 2rem',
                  textAlign: 'center',
                  color: '#6b7280'
                }}>
                  <p style={{ marginBottom: '0.5rem', fontWeight: '500' }}>
                    No hay componentes asignados
                  </p>
                  <p style={{ fontSize: '0.875rem' }}>
                    Este tipo de página aún no tiene componentes configurados
                  </p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    style={{
                      marginTop: '1rem',
                      padding: '8px 16px',
                      background: '#6366f1',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Plus size={16} />
                    Agregar Primer Componente
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                      Arrastra para reordenar • {componentes.length} componentes
                    </p>
                    <button
                      onClick={() => setShowAddModal(true)}
                      style={{
                        padding: '6px 12px',
                        background: '#6366f1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.8125rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Plus size={14} />
                      Agregar Componente
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {componentes.map((comp, index) => (
                      <div
                        key={comp.id}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        style={{
                          padding: '1rem',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: comp.activo ? '#ffffff' : '#f9fafb',
                          cursor: draggedIndex === index ? 'grabbing' : 'grab',
                          opacity: draggedIndex === index ? 0.5 : 1,
                          transition: 'opacity 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                          <GripVertical size={20} style={{ color: '#9ca3af', flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                              <h4 style={{ fontSize: '0.9375rem', fontWeight: '600', margin: 0 }}>
                                {comp.nombre || comp.componente_nombre}
                              </h4>
                              <span style={{
                                padding: '2px 8px',
                                background: '#f1f5f9',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                color: '#64748b'
                              }}>
                                {comp.componente_tipo}
                              </span>
                              {!comp.activo && (
                                <span style={{
                                  padding: '2px 8px',
                                  background: '#fee2e2',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: '500',
                                  color: '#991b1b'
                                }}>
                                  Inactivo
                                </span>
                              )}
                            </div>
                            {comp.componente_descripcion && (
                              <p style={{
                                margin: 0,
                                fontSize: '0.8125rem',
                                color: '#6b7280'
                              }}>
                                {comp.componente_descripcion}
                              </p>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            padding: '4px 10px',
                            background: '#eff6ff',
                            borderRadius: '6px',
                            fontSize: '0.8125rem',
                            fontWeight: '600',
                            color: '#1e40af'
                          }}>
                            Orden: {index}
                          </span>
                          <button
                            onClick={() => {
                              setComponenteEditando(comp);
                              setShowConfigModal(true);
                            }}
                            style={{
                              padding: '6px 12px',
                              background: '#6366f1',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.8125rem',
                              fontWeight: '500',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#4f46e5'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#6366f1'}
                          >
                            <Edit size={14} />
                            Editar
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('¿Eliminar este componente?')) {
                                eliminarComponente(comp.id);
                              }
                            }}
                            style={{
                              padding: '6px 12px',
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.8125rem',
                              fontWeight: '500',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
                          >
                            <Trash2 size={14} />
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {ordenCambiado && (
                    <button
                      onClick={guardarOrden}
                      disabled={saving}
                      style={{
                        marginTop: '1rem',
                        padding: '8px 16px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        opacity: saving ? 0.6 : 1
                      }}
                    >
                      {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
                      {saving ? 'Guardando...' : 'Guardar Orden'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

        {/* Modal de agregar componente */}
        {showAddModal && (
          <ModalAgregarComponente
            componentes={editorData.componentes_disponibles}
            onClose={() => setShowAddModal(false)}
            onAgregar={async (tipo, variante) => {
              if (!tenantActual?.id || !tipoPaginaCodigo) return;

              try {
                const token = await getToken();
                // Encontrar el ID del componente basado en tipo y variante
                const componente = editorData.componentes_disponibles.find(
                  (c) => c.tipo === tipo && c.variante === variante
                );

                if (!componente) {
                  alert('Componente no encontrado');
                  return;
                }

                const response = await apiFetch(
                  `/tenants/${tenantActual.id}/tipos-pagina/${tipoPaginaCodigo}/componentes`,
                  {
                    method: 'POST',
                    body: JSON.stringify({ componente_id: componente.id }),
                  },
                  token
                );
                const data = await response.json();

                if (data.success) {
                  setShowAddModal(false);
                  cargarEditor();
                } else {
                  alert(data.error || 'Error al agregar componente');
                }
              } catch (err: any) {
                alert(err.message || 'Error al agregar componente');
              }
            }}
          />
        )}

        {/* Modal de edición de componente */}
        {showConfigModal && componenteEditando && (
          <ComponenteEditorModal
            componente={componenteEditando}
            onClose={() => {
              setShowConfigModal(false);
              setComponenteEditando(null);
            }}
            onSave={async (datosActualizados) => {
              if (!tenantActual?.id || !componenteEditando?.id) return;

              try {
                // Reconstruir la estructura datos con static_data
                // IMPORTANTE: Preservar campos que no están en campos_config
                const datosOriginales = componenteEditando.datos || {};
                const staticDataOriginal = datosOriginales.static_data || {};

                // Mezclar los datos actualizados con los datos originales (para preservar campos no editables)
                const staticDataNuevo = {
                  ...staticDataOriginal, // Preservar TODOS los campos originales
                  ...datosActualizados,  // Sobrescribir solo los campos editados
                };

                const datosNuevos = {
                  ...datosOriginales,
                  static_data: staticDataNuevo,
                };

                console.log('💾 Guardando cambios:', {
                  componenteId: componenteEditando.id,
                  datosNuevos,
                  camposEditados: Object.keys(datosActualizados),
                });

                const token = await getToken();
                const response = await apiFetch(
                  `/tenants/${tenantActual.id}/componentes/${componenteEditando.id}`,
                  {
                    method: 'PUT',
                    body: JSON.stringify({ datos: datosNuevos }),
                  },
                  token
                );

                const data = await response.json();

                if (!response.ok) {
                  throw new Error(data.error || 'Error al guardar');
                }

                console.log('✅ Componente guardado:', data);
                setShowConfigModal(false);
                setComponenteEditando(null);
                // Recargar datos
                cargarEditor();
              } catch (err: any) {
                console.error('❌ Error al guardar:', err);
                alert(`Error al guardar: ${err.message}`);
              }
            }}
          />
        )}
      </div>
    );
  }

  // Vista normal para páginas individuales
  return (
    <div className="pagina-editor-container">
      {/* Header */}
      <div className="pagina-editor-header">
        <div className="pagina-editor-header-top">
          <div className="pagina-editor-header-info">
            <h1>{pagina.titulo}</h1>
            <div className="pagina-editor-header-meta">
              <span>
                <ArrowLeft size={14} />
                /{pagina.slug}
              </span>
              <span>•</span>
              <span>{pagina.tipo_nombre}</span>
              {pagina.es_personalizada && (
                <>
                  <span>•</span>
                  <span className="pagina-editor-badge">Personalizada</span>
                </>
              )}
            </div>
          </div>
          <div className="pagina-editor-header-actions">
            <button
              onClick={() => navigate(`/crm/${tenantActual?.slug}/web`)}
              className="pagina-editor-btn pagina-editor-btn-secondary"
            >
              <ArrowLeft size={16} />
              Volver
            </button>
            <button
              onClick={() => window.open(`/${pagina.slug}`, '_blank')}
              className="pagina-editor-btn pagina-editor-btn-secondary"
            >
              <Eye size={16} />
              Ver Página
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="pagina-editor-btn pagina-editor-btn-primary"
            >
              <Plus size={16} />
              Agregar Componente
            </button>
          </div>
        </div>
      </div>

      {/* Componentes */}
      <div className="pagina-editor-section">
        <div className="pagina-editor-section-header">
          <div className="pagina-editor-section-title">
            <Layers size={20} />
            <div>
              <h2>Componentes de la Página</h2>
              <p className="pagina-editor-section-subtitle">
                Arrastra para reordenar • {componentes.length} componentes
              </p>
            </div>
          </div>
          <button
            onClick={guardarOrden}
            disabled={saving}
            className="pagina-editor-btn pagina-editor-btn-primary"
          >
            {saving ? (
              <Loader2 size={16} className="pagina-editor-loading-icon" />
            ) : (
              <Save size={16} />
            )}
            Guardar Orden
          </button>
        </div>

        {/* Lista de componentes */}
        <div className="pagina-editor-componentes-list">
          {componentes.length === 0 ? (
            <div className="pagina-editor-empty">
              <div className="pagina-editor-empty-icon">
                <Layers />
              </div>
              <h3>No hay componentes asignados</h3>
              <p>Comienza agregando componentes para construir tu página</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="pagina-editor-btn pagina-editor-btn-primary"
              >
                <Plus size={16} />
                Agregar Primer Componente
              </button>
            </div>
          ) : (
            componentes.map((componente, index) => (
              <div
                key={componente.relacion_id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`pagina-editor-componente-item ${
                  draggedIndex === index ? 'dragging' : ''
                } ${!componente.activo ? 'opacity-50' : ''}`}
              >
                {/* Drag handle */}
                <div className="pagina-editor-componente-drag-handle">
                  <GripVertical size={20} />
                </div>

                {/* Info del componente */}
                <div className="pagina-editor-componente-info">
                  <div className="pagina-editor-componente-title">
                    {componente.tipo}
                    <span className="pagina-editor-componente-tipo-badge">
                      {componente.variante}
                    </span>
                    {!componente.activo && (
                      <span className="pagina-editor-componente-tipo-badge" style={{background: 'var(--premium-error-light)', color: 'var(--premium-error)'}}>
                        Inactivo
                      </span>
                    )}
                  </div>
                  <div className="pagina-editor-componente-meta">
                    <span>Orden: {index}</span>
                    <span>•</span>
                    <span>
                      {Object.keys(componente.config_override || {}).length > 0
                        ? 'Configurado'
                        : 'Usando datos por defecto'}
                    </span>
                  </div>
                </div>

                {/* Acciones */}
                <div className="pagina-editor-componente-actions">
                  <button
                    onClick={() => toggleActivo(componente.relacion_id, componente.activo)}
                    className="pagina-editor-btn-icon"
                    title={componente.activo ? 'Desactivar' : 'Activar'}
                  >
                    {componente.activo ? (
                      <Eye size={16} />
                    ) : (
                      <EyeOff size={16} />
                    )}
                  </button>
                  <button
                    onClick={() => abrirConfigModal(componente)}
                    className="pagina-editor-btn pagina-editor-btn-secondary"
                  >
                    <Edit size={16} />
                    Configurar
                  </button>
                  <button
                    onClick={() => eliminarComponente(componente.relacion_id)}
                    className="pagina-editor-btn-icon danger"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modales */}
      {showAddModal && (
        <ModalAgregarComponente
          componentes={editorData.componentes_disponibles}
          onClose={() => setShowAddModal(false)}
          onAgregar={async (tipo, variante) => {
            if (!tenantActual?.id || !paginaId) return;

            try {
              const token = await getToken();
              // Encontrar el ID del componente basado en tipo y variante
              const componente = editorData.componentes_disponibles.find(
                (c) => c.tipo === tipo && c.variante === variante
              );

              if (!componente) {
                alert('Componente no encontrado');
                return;
              }

              const response = await apiFetch(
                `/tenants/${tenantActual.id}/paginas/${paginaId}/componentes`,
                {
                  method: 'POST',
                  body: JSON.stringify({ componente_id: componente.id }),
                },
                token
              );
              const data = await response.json();

              if (data.success) {
                setShowAddModal(false);
                cargarEditor();
              } else {
                alert(data.error || 'Error al agregar componente');
              }
            } catch (err: any) {
              alert(err.message || 'Error al agregar componente');
            }
          }}
        />
      )}

      {showConfigModal && componenteEditando && (
        <ComponenteConfigModal
          componente={componenteEditando}
          onClose={() => {
            setShowConfigModal(false);
            setComponenteEditando(null);
          }}
          onGuardar={async (relacionId, configOverride) => {
            if (!tenantActual?.id || !paginaId) return;

            const token = await getToken();
            const response = await apiFetch(
              `/tenants/${tenantActual.id}/paginas/${paginaId}/componentes/${relacionId}`,
              {
                method: 'PATCH',
                body: JSON.stringify({ config_override: configOverride }),
              },
              token
            );
            const data = await response.json();

            if (data.success) {
              cargarEditor();
            } else {
              throw new Error(data.error || 'Error al guardar configuración');
            }
          }}
          onCambiarVariante={async (relacionId, nuevaVariante) => {
            if (!tenantActual?.id || !paginaId) return;

            const token = await getToken();
            const response = await apiFetch(
              `/tenants/${tenantActual.id}/paginas/${paginaId}/componentes/${relacionId}/cambiar-variante`,
              {
                method: 'POST',
                body: JSON.stringify({ nueva_variante: nuevaVariante }),
              },
              token
            );
            const data = await response.json();

            if (data.success) {
              cargarEditor();
            } else {
              throw new Error(data.error || 'Error al cambiar variante');
            }
          }}
          variantesDisponibles={
            editorData.componentes_disponibles
              .filter((c) => c.tipo === componenteEditando.tipo)
              .map((c) => ({ variante: c.variante, scope: c.scope }))
          }
        />
      )}
    </div>
  );
}

// ============================================================
// MODAL AGREGAR COMPONENTE
// ============================================================

interface ModalAgregarComponenteProps {
  componentes: ComponenteDisponible[];
  onClose: () => void;
  onAgregar: (tipo: string, variante: string) => void;
}

function ModalAgregarComponente({
  componentes,
  onClose,
  onAgregar,
}: ModalAgregarComponenteProps) {
  const [tipoSeleccionado, setTipoSeleccionado] = useState<string>('');
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<string>('');

  // Agrupar componentes por tipo
  const componentesPorTipo = componentes.reduce((acc, comp) => {
    if (!acc[comp.tipo]) {
      acc[comp.tipo] = [];
    }
    acc[comp.tipo].push(comp);
    return acc;
  }, {} as Record<string, ComponenteDisponible[]>);

  const tipos = Object.keys(componentesPorTipo).sort();
  const variantes = tipoSeleccionado ? componentesPorTipo[tipoSeleccionado] : [];

  return (
    <div className="pagina-editor-modal-overlay">
      <div className="pagina-editor-modal">
        {/* Header */}
        <div className="pagina-editor-modal-header">
          <h3>Agregar Componente</h3>
          <p>Selecciona el tipo y variante del componente</p>
        </div>

        {/* Content */}
        <div className="pagina-editor-modal-content">
          {/* Selector de tipo */}
          <div className="pagina-editor-form-group">
            <label className="pagina-editor-form-label">
              Tipo de Componente
            </label>
            <select
              value={tipoSeleccionado}
              onChange={(e) => {
                setTipoSeleccionado(e.target.value);
                setVarianteSeleccionada('');
              }}
              className="pagina-editor-form-select"
            >
              <option value="">Selecciona un tipo...</option>
              {tipos.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo} ({componentesPorTipo[tipo].length} variantes)
                </option>
              ))}
            </select>
          </div>

          {/* Selector de variante */}
          {tipoSeleccionado && (
            <div className="pagina-editor-form-group">
              <label className="pagina-editor-form-label">
                Variante
              </label>
              <div className="pagina-editor-variante-grid">
                {variantes.map((comp) => (
                  <button
                    key={comp.id}
                    onClick={() => setVarianteSeleccionada(comp.variante)}
                    className={`pagina-editor-variante-card ${
                      varianteSeleccionada === comp.variante ? 'selected' : ''
                    }`}
                  >
                    <h4>{comp.variante}</h4>
                    <p>Scope: {comp.scope}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pagina-editor-modal-footer">
          <button
            onClick={onClose}
            className="pagina-editor-btn pagina-editor-btn-secondary"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (tipoSeleccionado && varianteSeleccionada) {
                onAgregar(tipoSeleccionado, varianteSeleccionada);
              }
            }}
            disabled={!tipoSeleccionado || !varianteSeleccionada}
            className="pagina-editor-btn pagina-editor-btn-primary"
          >
            Agregar Componente
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE MODAL EDITOR
// ============================================================

interface ComponenteEditorModalProps {
  componente: any;
  onClose: () => void;
  onSave: (datos: any) => Promise<void>;
}

function ComponenteEditorModal({ componente, onClose, onSave }: ComponenteEditorModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    // Inicializar formData con los valores actuales + valores por defecto de campos_config
    const camposConfig = componente.campos_config || [];
    const datosActuales = componente.datos || {};

    // Los valores reales están en datos.static_data
    const staticData = datosActuales.static_data || {};

    console.log('🔍 ComponenteEditorModal - Debug:', {
      componente_nombre: componente.nombre || componente.componente_nombre,
      campos_config: camposConfig,
      datos_actuales: datosActuales,
      static_data: staticData
    });

    const initialData: Record<string, any> = {};
    camposConfig.forEach((campo: any) => {
      // Soportar tanto 'key' como 'clave' para compatibilidad
      const key = campo.key || campo.clave;
      const tipo = (campo.type || campo.tipo || '').toLowerCase();

      console.log(`  📋 Campo: "${key}" | Tipo: "${tipo}" | Valor en static_data:`, staticData[key]);

      // Priorizar el valor actual (en static_data), luego el default, luego vacío/null según tipo
      if (staticData[key] !== undefined) {
        initialData[key] = staticData[key];
      } else if (campo.valor_default !== undefined && campo.valor_default !== null) {
        initialData[key] = campo.valor_default;
      } else if (campo.defaultValue !== undefined && campo.defaultValue !== null) {
        initialData[key] = campo.defaultValue;
      } else {
        // Valores por defecto según tipo
        if (tipo === 'boolean' || tipo === 'checkbox') {
          initialData[key] = false;
        } else if (tipo === 'numero' || tipo === 'number') {
          initialData[key] = 0;
        } else {
          initialData[key] = '';
        }
      }
    });

    setFormData(initialData);
  }, [componente]);

  const handleFieldChange = (clave: string, valor: any) => {
    setFormData(prev => ({
      ...prev,
      [clave]: valor
    }));
  };

  const handleGuardar = async () => {
    setError('');
    try {
      // Validar campos requeridos
      const camposConfig = componente.campos_config || [];
      for (const campo of camposConfig) {
        const key = campo.key || campo.clave;
        const required = campo.required || campo.requerido;

        if (required) {
          const valor = formData[key];
          if (valor === undefined || valor === null || valor === '') {
            setError(`El campo "${campo.label || key}" es requerido`);
            return;
          }
        }
      }

      setGuardando(true);
      await onSave(formData);
    } catch (err: any) {
      setError(err.message || 'Error al guardar los datos');
    } finally {
      setGuardando(false);
    }
  };

  const renderField = (campo: any) => {
    // Soportar tanto el formato nuevo (key, type, required) como el antiguo (clave, tipo, requerido)
    const key = campo.key || campo.clave;
    const label = campo.label;
    const type = campo.type || campo.tipo;
    const required = campo.required || campo.requerido;
    const options = campo.options || campo.opciones;

    const valor = formData[key];
    const tipoNormalizado = (type || 'text').toLowerCase();

    const labelElement = (
      <label style={{
        display: 'block',
        marginBottom: '0.5rem',
        fontSize: '0.875rem',
        fontWeight: '500',
        color: '#374151'
      }}>
        {label || key}
        {required && <span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span>}
      </label>
    );

    const inputStyles = {
      width: '100%',
      padding: '0.5rem 0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '0.875rem'
    };

    // Textarea
    if (tipoNormalizado === 'textarea') {
      return (
        <div key={key} style={{ marginBottom: '1rem' }}>
          {labelElement}
          <textarea
            value={valor || ''}
            onChange={(e) => handleFieldChange(key, e.target.value)}
            style={{
              ...inputStyles,
              minHeight: '100px',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
        </div>
      );
    }

    // Number
    if (tipoNormalizado === 'numero' || tipoNormalizado === 'number') {
      return (
        <div key={key} style={{ marginBottom: '1rem' }}>
          {labelElement}
          <input
            type="number"
            value={valor || 0}
            onChange={(e) => handleFieldChange(key, parseFloat(e.target.value) || 0)}
            style={inputStyles}
          />
        </div>
      );
    }

    // Boolean / Checkbox
    if (tipoNormalizado === 'boolean' || tipoNormalizado === 'checkbox') {
      return (
        <div key={key} style={{ marginBottom: '1rem' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={!!valor}
              onChange={(e) => handleFieldChange(key, e.target.checked)}
              style={{
                width: '16px',
                height: '16px',
                cursor: 'pointer'
              }}
            />
            {label || key}
            {required && <span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span>}
          </label>
        </div>
      );
    }

    // Select
    if (tipoNormalizado === 'select') {
      return (
        <div key={key} style={{ marginBottom: '1rem' }}>
          {labelElement}
          <select
            value={valor || ''}
            onChange={(e) => handleFieldChange(key, e.target.value)}
            style={{
              ...inputStyles,
              cursor: 'pointer'
            }}
          >
            <option value="">Seleccionar...</option>
            {(options || []).map((opcion: any) => (
              <option key={opcion.value || opcion} value={opcion.value || opcion}>
                {opcion.label || opcion}
              </option>
            ))}
          </select>
        </div>
      );
    }

    // Color
    if (tipoNormalizado === 'color') {
      return (
        <div key={key} style={{ marginBottom: '1rem' }}>
          {labelElement}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="color"
              value={valor || '#000000'}
              onChange={(e) => handleFieldChange(key, e.target.value)}
              style={{
                width: '60px',
                height: '38px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            />
            <input
              type="text"
              value={valor || '#000000'}
              onChange={(e) => handleFieldChange(key, e.target.value)}
              style={{
                ...inputStyles,
                width: 'auto',
                flex: 1
              }}
              placeholder="#000000"
            />
          </div>
        </div>
      );
    }

    // URL
    if (tipoNormalizado === 'url') {
      return (
        <div key={key} style={{ marginBottom: '1rem' }}>
          {labelElement}
          <input
            type="url"
            value={valor || ''}
            onChange={(e) => handleFieldChange(key, e.target.value)}
            style={inputStyles}
            placeholder="https://ejemplo.com"
          />
        </div>
      );
    }

    // Image - similar to URL but with image preview
    if (tipoNormalizado === 'image') {
      return (
        <div key={key} style={{ marginBottom: '1rem' }}>
          {labelElement}
          <input
            type="url"
            value={valor || ''}
            onChange={(e) => handleFieldChange(key, e.target.value)}
            style={inputStyles}
            placeholder="https://ejemplo.com/imagen.jpg"
          />
          {valor && (
            <div style={{ marginTop: '0.5rem' }}>
              <img
                src={valor}
                alt="Preview"
                style={{
                  maxWidth: '200px',
                  maxHeight: '150px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db'
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      );
    }

    // Text (default)
    return (
      <div key={key} style={{ marginBottom: '1rem' }}>
        {labelElement}
        <input
          type="text"
          value={valor || ''}
          onChange={(e) => handleFieldChange(key, e.target.value)}
          style={inputStyles}
        />
      </div>
    );
  };

  const camposConfig = componente.campos_config || [];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '800px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
              Editar Componente
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
              {componente.nombre || componente.componente_nombre}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              color: '#6b7280',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{
          padding: '1.5rem',
          flex: 1,
          overflow: 'auto'
        }}>
          {error && (
            <div style={{
              padding: '0.75rem',
              background: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              marginBottom: '1rem',
              color: '#991b1b',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          {camposConfig.length === 0 ? (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '0.875rem'
            }}>
              <p style={{ marginBottom: '0.5rem', fontWeight: '500' }}>
                No hay configuración de campos disponible
              </p>
              <p style={{ fontSize: '0.8125rem' }}>
                Este componente no tiene campos configurados para editar.
              </p>
            </div>
          ) : (
            <div>
              {camposConfig.map((campo: any) => renderField(campo))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1.5rem',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            disabled={guardando}
            style={{
              padding: '0.5rem 1rem',
              background: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              cursor: guardando ? 'not-allowed' : 'pointer',
              opacity: guardando ? 0.5 : 1
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando || camposConfig.length === 0}
            style={{
              padding: '0.5rem 1.5rem',
              background: '#6366f1',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'white',
              cursor: (guardando || camposConfig.length === 0) ? 'not-allowed' : 'pointer',
              opacity: (guardando || camposConfig.length === 0) ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {guardando ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Guardando...
              </>
            ) : (
              <>
                <Save size={16} />
                Guardar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
