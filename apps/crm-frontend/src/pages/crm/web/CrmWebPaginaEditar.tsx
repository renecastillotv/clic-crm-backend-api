/**
 * CrmWebPaginaEditar - Editor visual de páginas
 *
 * Permite editar información de la página y agregar/ordenar componentes.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { usePageHeader } from '../../../layouts/CrmLayout';
import {
  getPagina,
  savePagina,
  getComponentesPagina,
  saveComponente,
  deleteComponente,
  ComponenteWeb,
  getCatalogoComponentes,
  getComponenteSchema,
  ComponenteSchema,
} from '../../../services/api';
import { PaginaWeb, TipoPagina, TIPOS_PAGINA } from '../../../types/paginas';
import { TipoComponente, ComponenteDataEstructurado } from '../../../types/componentes';
import DynamicComponentEditor from '../../../components/DynamicComponentEditor';

// Mapeo de iconos de clase CSS a emojis
const ICON_MAP: Record<string, string> = {
  'layout-navbar': '📋',
  'layout-footer': '⬇️',
  'layout-hero': '🎯',
  'grid': '🏘️',
  'file-text': '📄',
  'users': '👥',
  'user': '👤',
  'newspaper': '📰',
  'mail': '📧',
  'search': '🔍',
  'video': '🎥',
  'message-square': '💬'
};

const getIconoEmoji = (icono: string | null | undefined): string => {
  if (!icono) return '📦';
  return ICON_MAP[icono] || icono;
};

export default function CrmWebPaginaEditar() {
  const { paginaId, paginaCodigo, tenantSlug } = useParams<{ paginaId?: string; paginaCodigo?: string; tenantSlug: string }>();
  const { tenantActual } = useAuth();
  const { getToken } = useClerkAuth();
  const navigate = useNavigate();
  const { setPageHeader } = usePageHeader();

  // Base path para navegación dentro del CRM del tenant
  const basePath = `/crm/${tenantSlug || tenantActual?.slug}`;

  // Determinar el identificador: puede ser paginaId o paginaCodigo
  const identificadorPagina = paginaId || paginaCodigo;

  const [pagina, setPagina] = useState<PaginaWeb | null>(null);
  const [componentes, setComponentes] = useState<ComponentePagina[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'componentes' | 'seo'>('info');
  const [showAddComponente, setShowAddComponente] = useState(false);
  const [addModalStep, setAddModalStep] = useState<'selectType' | 'selectImplementation' | 'selectVariant'>('selectType');
  const [selectedTipo, setSelectedTipo] = useState<TipoComponente | null>(null);
  const [selectedVariante, setSelectedVariante] = useState<string | null>(null);
  const [selectedComponente, setSelectedComponente] = useState<any | null>(null); // Componente específico del catálogo
  const [catalogo, setCatalogo] = useState<any[]>([]);

  // Ref para la variante seleccionada (evitar problema de async state updates)
  const selectedVarianteRef = useRef<string | null>(null);

  // Estado para editar componente de página
  const [editingComponente, setEditingComponente] = useState<ComponentePagina | null>(null);
  const [editingDatos, setEditingDatos] = useState<ComponenteDataEstructurado | null>(null);
  const [componenteSchema, setComponenteSchema] = useState<ComponenteSchema | null>(null);

  // Estado para notificaciones de éxito
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auto-dismiss success message after 4 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Helper function to find component in catalog by tipo
  const findComponenteEnCatalogo = useCallback((tipo: string) => {
    return catalogo.find((c: any) => c.tipo === tipo);
  }, [catalogo]);

  // Cargar catálogo de componentes al montar
  useEffect(() => {
    if (!tenantActual?.id) return;

    async function loadCatalogo() {
      try {
        const catalogoData = await getCatalogoComponentes(tenantActual.id);
        console.log('📚 Catálogo de componentes cargado:', catalogoData);
        setCatalogo(catalogoData);
      } catch (err: any) {
        console.error('Error cargando catálogo:', err);
      }
    }

    loadCatalogo();
  }, [tenantActual?.id]);

  // Cargar página y componentes
  useEffect(() => {
    if (!tenantActual?.id || !identificadorPagina) return;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Cargar página usando el identificador (puede ser ID o código)
        const paginaData = await getPagina(tenantActual!.id, identificadorPagina!);
        setPagina(paginaData);

        // Cargar componentes de esta página usando la nueva función
        const componentesData = await getComponentesPagina(tenantActual!.id, identificadorPagina!);
        setComponentes(componentesData);
      } catch (err: any) {
        console.error('Error cargando datos:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [tenantActual?.id, identificadorPagina]);

  // Guardar página
  const handleSavePagina = useCallback(async () => {
    if (!tenantActual?.id || !pagina) return;

    try {
      setSaving(true);
      setError(null);
      const updated = await savePagina(tenantActual.id, pagina);
      setPagina(updated);
    } catch (err: any) {
      console.error('Error guardando página:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [tenantActual?.id, pagina]);

  // Configurar header de la página
  useEffect(() => {
    if (!pagina) return;

    const tipoInfo = TIPOS_PAGINA[pagina.tipoPagina as TipoPagina] || TIPOS_PAGINA.custom;
    
    const handlePreview = () => {
      const slug = pagina.slug === '/' ? '' : pagina.slug;
      window.open(`http://localhost:4321/tenant/${tenantActual?.slug}/${slug}`, '_blank');
    };

    const handleBack = () => {
      navigate(`${basePath}/web/paginas`);
    };

    setPageHeader({
      title: pagina.titulo,
      subtitle: `${tipoInfo.nombre}${pagina.slug ? ` • ${pagina.slug.startsWith('/') ? pagina.slug : `/${pagina.slug}`}` : ''}`,
      backButton: {
        label: 'Volver',
        onClick: handleBack,
      },
      actions: (
        <>
          <button className="btn-secondary" onClick={handlePreview}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Vista previa
          </button>
          <button className="btn-primary" onClick={handleSavePagina} disabled={saving}>
            {saving ? (
              <>
                <svg className="spinner-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Guardando...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
                Guardar
              </>
            )}
          </button>
        </>
      ),
    });
  }, [pagina, saving, setPageHeader, tenantActual?.slug, handleSavePagina]);

  // Seleccionar variante y avanzar al paso de creación
  const handleSelectVariant = async (variante: string, tipo?: TipoComponente) => {
    const tipoAUsar = tipo || selectedTipo;

    console.log('🎯 handleSelectVariant called:', { variante, tipo, tipoAUsar, selectedTipo });

    if (!tenantActual?.id || !tipoAUsar) {
      setError('Error: No se puede seleccionar variante sin tenant o tipo');
      return;
    }

    console.log('✅ Setting selectedVariante to:', variante);
    setSelectedVariante(variante);
    selectedVarianteRef.current = variante; // Actualizar ref inmediatamente

    // Crear el componente directamente sin paso extra
    await createComponentDirectly(tipoAUsar, variante);
  };

  // Obtener implementaciones de un tipo específico
  const getImplementacionesPorTipo = useCallback((tipo: string) => {
    return catalogo.filter((c: any) => c.tipo === tipo && c.disponible !== false);
  }, [catalogo]);

  // Seleccionar tipo de componente (paso 1)
  const handleSelectTipo = async (tipo: TipoComponente) => {
    if (!tenantActual?.id) return;

    // Header y Footer son únicos por tenant, no hay opción
    if (tipo === 'header' || tipo === 'footer') {
      // Estos son globales únicos, no se agregan manualmente a páginas
      setError('El header y footer se configuran globalmente en Secciones');
      return;
    }

    setSelectedTipo(tipo);

    // Ver cuántas implementaciones hay de este tipo
    const implementaciones = getImplementacionesPorTipo(tipo);

    if (implementaciones.length === 1) {
      // Solo hay una implementación, seleccionarla automáticamente
      handleSelectImplementation(implementaciones[0]);
    } else if (implementaciones.length > 1) {
      // Hay múltiples implementaciones, mostrar selector
      setAddModalStep('selectImplementation');
    } else {
      // No hay implementaciones (no debería pasar)
      setError('No hay implementaciones disponibles para este tipo');
    }
  };

  // Seleccionar implementación específica (paso 2 - solo si hay múltiples)
  const handleSelectImplementation = async (componente: any) => {
    setSelectedComponente(componente);
    setSelectedTipo(componente.tipo as TipoComponente);

    // Obtener variantes disponibles del componente
    const variantesDisponibles = componente?.variantes || [];

    // Normalizar variantes
    const variantesNormalizadas = variantesDisponibles.map((v: any) => ({
      id: typeof v === 'string' ? v : (v.codigo || v.id),
      nombre: typeof v === 'string' ? v : (v.nombre || v.codigo || v.id),
      descripcion: typeof v === 'string' ? '' : (v.descripcion || ''),
    }));

    if (variantesNormalizadas.length === 1) {
      const varianteId = variantesNormalizadas[0].id;
      setSelectedVariante(varianteId);
      await handleSelectVariant(varianteId, componente.tipo);
    } else if (variantesNormalizadas.length > 1) {
      setAddModalStep('selectVariant');
    } else {
      setSelectedVariante('default');
      await handleSelectVariant('default', componente.tipo);
    }
  };


  // Crear componente directamente (llamado desde handleSelectVariant)
  const createComponentDirectly = async (tipo: TipoComponente, variante: string) => {
    console.log('📄 createComponentDirectly called:', { tipo, variante });

    if (!tenantActual?.id || !identificadorPagina) {
      setError('Error: No se puede crear componente sin tenant o página');
      return;
    }

    try {
      setSaving(true);

      // Detectar scope automáticamente según reglas:
      // 1. Si tipo = "header" o "footer" → scope="tenant", tipo_pagina=NULL, pagina_id=NULL
      // 2. Si página es CUSTOM → scope="page", tipo_pagina="custom", pagina_id=UUID
      // 3. Si página es SISTEMA → scope="page_type", tipo_pagina=CODIGO, pagina_id=NULL
      let scope: 'tenant' | 'page' | 'page_type';
      let tipo_pagina: string | null = null;
      let pagina_id: string | null = null;

      if (tipo === 'header' || tipo === 'footer') {
        scope = 'tenant';

        // SOLO para header/footer: verificar si ya existe (estos sí deben ser únicos)
        const existingGlobal = componentes.find(
          c => c.tipo === tipo && c.scope === 'tenant'
        );
        if (existingGlobal) {
          const componenteCatalogo = findComponenteEnCatalogo(tipo);
          const componenteNombre = componenteCatalogo?.nombre || tipo;
          throw new Error(
            `Ya existe un ${componenteNombre} global. Solo puede haber uno por tenant.`
          );
        }
      } else if (pagina?.tipoPagina === 'custom') {
        scope = 'page';
        tipo_pagina = 'custom';
        pagina_id = pagina.id || null;
      } else {
        scope = 'page_type';
        tipo_pagina = pagina?.tipoPagina || null;
      }

      console.log('🎯 Scope detectado:', { scope, tipo_pagina, pagina_id });

      const componenteCatalogo = findComponenteEnCatalogo(tipo);

      const datosIniciales: ComponenteDataEstructurado = {
        static_data: {},
        toggles: {},
      };

      // Inicializar con valores por defecto del schema_config del catálogo
      if (componenteCatalogo?.schema_config?.campos) {
        componenteCatalogo.schema_config.campos.forEach((campo: any) => {
          if (campo.default !== undefined) {
            if (campo.tipo === 'boolean') {
              datosIniciales.toggles![campo.nombre] = campo.default;
            } else {
              datosIniciales.static_data[campo.nombre] = campo.default;
            }
          }
        });
      }

      await saveComponente(tenantActual.id, {
        tipo,
        variante,
        datos: datosIniciales,
        activo: true,
        orden: componentes.length + 1,
        paginaId: pagina_id,
        scope,
        tipo_pagina,
      });

      // Recargar componentes de la página
      console.log('🔄 Recargando componentes de la página...');
      const componentesData = await getComponentesPagina(tenantActual.id, identificadorPagina);
      console.log('📦 Componentes recargados:', componentesData.length, 'componentes');
      setComponentes(componentesData);
      closeAddModal();
      setSuccessMessage(`Componente "${componenteCatalogo?.nombre || tipo}" agregado correctamente`);
      console.log('✅ Modal cerrado y componentes actualizados');

      // Abrir automáticamente el editor del componente recién creado
      const componenteCreado = componentesData.find(
        (c) => c.tipo === tipo && c.variante === variante
      ) || componentesData[componentesData.length - 1];

      if (componenteCreado) {
        console.log('✏️ Abriendo editor para el componente recién creado:', componenteCreado.tipo);
        // Usar setTimeout para permitir que el estado se actualice primero
        setTimeout(() => {
          handleEditPageComponent(componenteCreado);
        }, 100);
      }
    } catch (err: any) {
      console.error('Error agregando componente:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Crear componente - detecta automáticamente el scope según el tipo (legacy, usado por botón manual)
  const handleCreateComponent = async () => {
    const varianteToUse = selectedVarianteRef.current || selectedVariante;
    if (!selectedTipo || !varianteToUse) {
      setError('Error: No se ha seleccionado tipo o variante');
      return;
    }
    await createComponentDirectly(selectedTipo, varianteToUse);
  };

  // Cerrar modal y resetear estado
  const closeAddModal = () => {
    setShowAddComponente(false);
    setAddModalStep('selectType');
    setSelectedTipo(null);
    setSelectedVariante(null);
    setSelectedComponente(null);
  };

  // Navegar a editar componente global
  const handleEditGlobalComponent = (componente: ComponentePagina) => {
    // Navegar al editor de secciones con el tipo del componente
    navigate(`${basePath}/web/secciones/${componente.tipo}`);
  };

  // Eliminar componente de la página
  const handleDeleteComponente = async (componente: ComponentePagina) => {
    if (!tenantActual?.id || !componente.id) return;
    if (!confirm('¿Eliminar este componente de la página?')) return;

    try {
      await deleteComponente(tenantActual.id, componente.id);
      setComponentes(componentes.filter((c) => c.id !== componente.id));
    } catch (err: any) {
      console.error('Error eliminando componente:', err);
      setError(err.message);
    }
  };

  // Abrir modal para editar componente de página
  const handleEditPageComponent = async (componente: ComponentePagina) => {
    console.log('🔍 [handleEditPageComponent] Iniciando edición de componente:', componente.tipo);
    console.log('🔍 [handleEditPageComponent] Componente completo:', componente);
    setEditingComponente(componente);
    // Normalizar datos para asegurar estructura correcta
    const datos = componente.datos || { static_data: {}, toggles: {} };
    console.log('🔍 [handleEditPageComponent] Datos del componente:', datos);
    setEditingDatos({
      static_data: datos.static_data || {},
      toggles: datos.toggles || {},
      dynamic_data: datos.dynamic_data,
      styles: datos.styles,
    });

    // Usar camposConfig que viene directamente del componente (incluido en la respuesta de getComponentesPagina)
    const camposConfigFromComponent = (componente as any).camposConfig;
    if (camposConfigFromComponent) {
      console.log('✅ [handleEditPageComponent] Usando camposConfig incluido en el componente');
      console.log('✅ [handleEditPageComponent] Número de campos:', camposConfigFromComponent.campos?.length);
      console.log('✅ [handleEditPageComponent] Número de toggles:', camposConfigFromComponent.toggles?.length);
      setComponenteSchema(camposConfigFromComponent);
    } else {
      // Fallback: Fetch schema del catálogo para este tipo de componente
      try {
        console.log('🔍 [handleEditPageComponent] Fallback: Obteniendo schema para tipo:', componente.tipo);
        const token = await getToken();
        const catalogoComponente = await getComponenteSchema(componente.tipo, token);
        console.log('🔍 [handleEditPageComponent] Schema obtenido:', catalogoComponente);
        if (catalogoComponente) {
          console.log('✅ [handleEditPageComponent] Schema config:', catalogoComponente.schema_config);
          console.log('✅ [handleEditPageComponent] Número de campos:', catalogoComponente.schema_config?.campos?.length);
          setComponenteSchema(catalogoComponente.schema_config);
        } else {
          console.warn('⚠️ [handleEditPageComponent] No hay schema disponible para este componente');
          setComponenteSchema(null);
        }
      } catch (error) {
        console.error('❌ [handleEditPageComponent] Error obteniendo schema:', error);
        setComponenteSchema(null);
      }
    }
  };

  // Guardar cambios del componente de página
  const handleSavePageComponent = async () => {
    if (!tenantActual?.id || !editingComponente?.id || !editingDatos) return;

    try {
      setSaving(true);

      // Determinar paginaId basado en el scope
      const scope = (editingComponente as any).scope || 'page';
      const paginaId = scope === 'page' ? ((editingComponente as any).paginaId || identificadorPagina) : null;

      await saveComponente(tenantActual.id, {
        id: editingComponente.id,
        tipo: editingComponente.tipo,
        variante: editingComponente.variante,
        datos: editingDatos,
        activo: editingComponente.activo,
        orden: editingComponente.orden,
        paginaId,
        scope,
        tipoPagina: (editingComponente as any).tipoPagina,
      });

      // Recargar componentes
      const componentesData = await getComponentesPagina(tenantActual.id, identificadorPagina);
      setComponentes(componentesData);

      // Mostrar notificación de éxito
      const componenteCatalogo = findComponenteEnCatalogo(editingComponente.tipo);
      const componentName = componenteCatalogo?.nombre || editingComponente.tipo;
      setSuccessMessage(`✓ ${componentName} guardado exitosamente`);

      // Cerrar panel
      setEditingComponente(null);
      setEditingDatos(null);
    } catch (err: any) {
      console.error('Error guardando componente:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Actualizar campo del componente editado
  const updateEditingField = (key: string, value: any, isToggle: boolean = false) => {
    if (!editingDatos) return;

    if (isToggle) {
      setEditingDatos({
        ...editingDatos,
        toggles: {
          ...editingDatos.toggles,
          [key]: value,
        },
      });
    } else {
      setEditingDatos({
        ...editingDatos,
        static_data: {
          ...editingDatos.static_data,
          [key]: value,
        },
      });
    }
  };

  // Mover componente
  const handleMoveComponente = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= componentes.length) return;

    const newComponentes = [...componentes];
    [newComponentes[index], newComponentes[newIndex]] = [newComponentes[newIndex], newComponentes[index]];

    // Actualizar orden
    const updates = newComponentes.map((c, i) => ({
      ...c,
      orden: i + 1,
    }));

    setComponentes(updates);

    // Guardar cambios
    if (tenantActual?.id) {
      await Promise.all(updates.map((c) => saveComponente(tenantActual!.id, c)));
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando página...</p>
      </div>
    );
  }

  if (!pagina) {
    return (
      <div className="error-container">
        <h2>Página no encontrada</h2>
        <button className="btn-primary" onClick={() => navigate(`${basePath}/web/paginas`)}>
          Volver a páginas
        </button>
      </div>
    );
  }

  const tipoInfo = TIPOS_PAGINA[pagina.tipoPagina as TipoPagina] || TIPOS_PAGINA.custom;

  return (
    <div className="pagina-editor">
      {/* Error */}
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="editor-tabs">
        <button
          className={`tab ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
          Información
        </button>
        <button
          className={`tab ${activeTab === 'componentes' ? 'active' : ''}`}
          onClick={() => setActiveTab('componentes')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
          Componentes ({componentes.length})
        </button>
        <button
          className={`tab ${activeTab === 'seo' ? 'active' : ''}`}
          onClick={() => setActiveTab('seo')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          SEO
        </button>
      </div>

      {/* Tab Content */}
      <div className="editor-content">
        {/* Info Tab */}
        {activeTab === 'info' && (
          <div className="tab-content">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="titulo">Título de la Página</label>
                <input
                  id="titulo"
                  type="text"
                  value={pagina.titulo}
                  onChange={(e) => setPagina({ ...pagina, titulo: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="slug">URL (slug)</label>
                <div className="slug-input">
                  <span className="slug-prefix">/</span>
                  <input
                    id="slug"
                    type="text"
                    value={pagina.slug}
                    onChange={(e) => setPagina({ ...pagina, slug: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label htmlFor="descripcion">Descripción</label>
                <textarea
                  id="descripcion"
                  value={pagina.descripcion || ''}
                  onChange={(e) => setPagina({ ...pagina, descripcion: e.target.value })}
                  rows={3}
                  placeholder="Descripción breve de la página"
                />
              </div>

              <div className="form-group">
                <label>Estado</label>
                <div className="toggle-group">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={pagina.activa}
                      onChange={(e) => setPagina({ ...pagina, activa: e.target.checked })}
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">Activa</span>
                  </label>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={pagina.publica}
                      onChange={(e) => setPagina({ ...pagina, publica: e.target.checked })}
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">Pública</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="orden">Orden</label>
                <input
                  id="orden"
                  type="number"
                  value={pagina.orden}
                  onChange={(e) => setPagina({ ...pagina, orden: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Componentes Tab - Vista mejorada */}
        {activeTab === 'componentes' && (
          <div className="tab-content">
            <div className="componentes-header-new">
              <div className="header-text">
                <h3>Componentes de la página</h3>
                <p>Haz clic en cualquier componente para editarlo</p>
              </div>
              <button className="btn-primary" onClick={() => setShowAddComponente(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Agregar Componente
              </button>
            </div>

            {/* Vista mejorada con cards clickeables */}
            <div className="componentes-grid-new">
              {componentes.length === 0 ? (
                <div className="empty-componentes-new">
                  <div className="empty-icon-large">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="7" height="7"/>
                      <rect x="14" y="3" width="7" height="7"/>
                      <rect x="14" y="14" width="7" height="7"/>
                      <rect x="3" y="14" width="7" height="7"/>
                    </svg>
                  </div>
                  <h4>No hay componentes en esta página</h4>
                  <p>Comienza agregando tu primer componente para dar vida a esta página</p>
                  <button className="btn-primary" onClick={() => setShowAddComponente(true)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Agregar primer componente
                  </button>
                </div>
              ) : (
                componentes
                  .sort((a, b) => (a.orden || 0) - (b.orden || 0))
                  .map((componente, index) => {
                    const info = findComponenteEnCatalogo(componente.tipo);
                    const isHeaderOrFooter = componente.tipo === 'header' || componente.tipo === 'footer';
                    const isReferencia = componente.esReferencia === true;
                    const isGlobal = isReferencia || isHeaderOrFooter;

                    return (
                      <div
                        key={componente.id}
                        className={`componente-card-new ${isGlobal ? 'global' : 'page'}`}
                        onClick={() => {
                          if (isGlobal) {
                            handleEditGlobalComponent(componente);
                          } else {
                            handleEditPageComponent(componente);
                          }
                        }}
                      >
                        {/* Header de la card */}
                        <div className="card-header-new">
                          <div className="card-order-badge">
                            {isHeaderOrFooter ? (
                              <span className="badge-fixed">FIJO</span>
                            ) : isReferencia ? (
                              <span className="badge-global">GLOBAL</span>
                            ) : (
                              <span className="badge-order">#{index + 1}</span>
                            )}
                          </div>
                          <div className="card-actions-quick" onClick={(e) => e.stopPropagation()}>
                            {!isHeaderOrFooter && !isReferencia && (
                              <>
                                <button
                                  className="quick-action-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveComponente(index, 'up');
                                  }}
                                  disabled={index === 0}
                                  title="Mover arriba"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="18 15 12 9 6 15"/>
                                  </svg>
                                </button>
                                <button
                                  className="quick-action-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveComponente(index, 'down');
                                  }}
                                  disabled={index === componentes.length - 1}
                                  title="Mover abajo"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9"/>
                                  </svg>
                                </button>
                              </>
                            )}
                            {!isHeaderOrFooter && !isReferencia && (
                              <button
                                className="quick-action-btn danger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteComponente(componente);
                                }}
                                title="Eliminar"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6"/>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Contenido de la card */}
                        <div className="card-body-new">
                          <div className="card-icon-large">
                            {getIconoEmoji(info?.icono) || '📦'}
                          </div>
                          <h4 className="card-title-new">
                            {componente.nombre || info?.nombre || componente.tipo}
                          </h4>
                          <div className="card-meta-new">
                            <span className="meta-type">{info?.categoria || 'Componente'}</span>
                            <span className="meta-separator">•</span>
                            <span className="meta-variant">
                              {(() => {
                                if (!componente.variante || componente.variante === 'default') return 'Default';
                                const variantes = info?.variantes || [];
                                const varianteObj = variantes.find((v: any) => {
                                  const codigo = typeof v === 'string' ? v : v.codigo;
                                  return codigo === componente.variante;
                                });
                                if (varianteObj && typeof varianteObj !== 'string') {
                                  return varianteObj.nombre || componente.variante;
                                }
                                return componente.variante;
                              })()}
                            </span>
                          </div>
                          {isGlobal && (
                            <div className="card-warning-new">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                              </svg>
                              {isHeaderOrFooter
                                ? 'Visible en todas las páginas'
                                : 'Componente compartido entre páginas'}
                            </div>
                          )}
                        </div>

                        {/* Footer de la card */}
                        <div className="card-footer-new">
                          <span className={`status-dot ${componente.activo ? 'active' : 'inactive'}`}></span>
                          <span className="status-text">
                            {componente.activo ? 'Activo' : 'Inactivo'}
                          </span>
                          <svg className="edit-indicator" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}

        {/* SEO Tab */}
        {activeTab === 'seo' && (
          <div className="tab-content">
            <div className="form-grid">
              <div className="form-group full-width">
                <label htmlFor="metaTitle">Meta Title</label>
                <input
                  id="metaTitle"
                  type="text"
                  value={pagina.meta?.title || ''}
                  onChange={(e) =>
                    setPagina({
                      ...pagina,
                      meta: { ...pagina.meta, title: e.target.value },
                    })
                  }
                  placeholder="Título para buscadores"
                />
                <span className="input-hint">
                  {(pagina.meta?.title || '').length}/60 caracteres recomendados
                </span>
              </div>

              <div className="form-group full-width">
                <label htmlFor="metaDescription">Meta Description</label>
                <textarea
                  id="metaDescription"
                  value={pagina.meta?.description || ''}
                  onChange={(e) =>
                    setPagina({
                      ...pagina,
                      meta: { ...pagina.meta, description: e.target.value },
                    })
                  }
                  rows={3}
                  placeholder="Descripción para buscadores"
                />
                <span className="input-hint">
                  {(pagina.meta?.description || '').length}/160 caracteres recomendados
                </span>
              </div>

              <div className="form-group full-width">
                <label htmlFor="metaKeywords">Keywords</label>
                <input
                  id="metaKeywords"
                  type="text"
                  value={pagina.meta?.keywords || ''}
                  onChange={(e) =>
                    setPagina({
                      ...pagina,
                      meta: { ...pagina.meta, keywords: e.target.value },
                    })
                  }
                  placeholder="palabra1, palabra2, palabra3"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Agregar Componente - Mejorado con selección de globales */}
      {showAddComponente && (
        <div className="modal-overlay" onClick={closeAddModal}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              {addModalStep === 'selectType' && <h2>Agregar Componente</h2>}
              {addModalStep === 'selectImplementation' && selectedTipo && (
                <>
                  <button className="btn-back-modal" onClick={() => {
                    setAddModalStep('selectType');
                    setSelectedTipo(null);
                    setSelectedComponente(null);
                  }}>
                    ← Volver
                  </button>
                  <h2>Seleccionar {selectedTipo.charAt(0).toUpperCase() + selectedTipo.slice(1)}</h2>
                </>
              )}
              {addModalStep === 'selectVariant' && (
                <>
                  <button className="btn-back-modal" onClick={() => {
                    // Volver al paso anterior correcto
                    const implementaciones = getImplementacionesPorTipo(selectedTipo!);
                    if (implementaciones.length > 1) {
                      setAddModalStep('selectImplementation');
                    } else {
                      setAddModalStep('selectType');
                      setSelectedTipo(null);
                    }
                    setSelectedVariante(null);
                    setSelectedComponente(null);
                  }}>
                    ← Volver
                  </button>
                  <h2>
                    {selectedComponente?.icono && getIconoEmoji(selectedComponente.icono)}{' '}
                    {selectedComponente?.nombre || selectedTipo}
                  </h2>
                </>
              )}
              <button className="modal-close" onClick={closeAddModal}>×</button>
            </div>
            <div className="modal-body">
              {/* Paso 1: Seleccionar tipo de componente (agrupado por tipo) */}
              {addModalStep === 'selectType' && (
                <div className="componentes-grid">
                  {catalogo.length === 0 ? (
                    <p>Cargando componentes disponibles...</p>
                  ) : (
                    (() => {
                      // Agrupar componentes por tipo
                      const tiposUnicos = catalogo
                        .filter((comp: any) => comp.disponible !== false)
                        .reduce((acc: Record<string, any[]>, comp: any) => {
                          if (!acc[comp.tipo]) {
                            acc[comp.tipo] = [];
                          }
                          acc[comp.tipo].push(comp);
                          return acc;
                        }, {});

                      return Object.entries(tiposUnicos).map(([tipo, implementaciones]: [string, any[]]) => {
                        // Usar el primer componente para mostrar info general
                        const primerComp = implementaciones[0];
                        const tieneMultiples = implementaciones.length > 1;

                        return (
                          <button
                            key={`tipo-${tipo}-${primerComp.id}`}
                            className="componente-option"
                            onClick={() => handleSelectTipo(tipo as TipoComponente)}
                          >
                            <span className="option-icon">{getIconoEmoji(primerComp.icono)}</span>
                            <span className="option-name">
                              {tipo.charAt(0).toUpperCase() + tipo.slice(1).replace(/_/g, ' ')}
                            </span>
                            <span className="option-cat">{primerComp.categoria}</span>
                            {tieneMultiples && (
                              <span className="option-count">{implementaciones.length} opciones</span>
                            )}
                          </button>
                        );
                      });
                    })()
                  )}
                </div>
              )}

              {/* Paso 1.5: Seleccionar implementación específica (solo si hay múltiples) */}
              {addModalStep === 'selectImplementation' && selectedTipo && (
                <div className="variant-selector">
                  <p className="variant-hint">
                    Hay múltiples implementaciones de <strong>{selectedTipo}</strong> disponibles.
                    Elige cuál quieres usar:
                  </p>
                  <div className="variantes-grid">
                    {getImplementacionesPorTipo(selectedTipo).map((comp: any, idx: number) => (
                      <button
                        key={comp.id || `${comp.tipo}-${idx}`}
                        className="variante-option"
                        onClick={() => handleSelectImplementation(comp)}
                      >
                        <div className="variante-header">
                          <span className="option-icon">{getIconoEmoji(comp.icono)}</span>
                          <span className="variante-name">{comp.nombre}</span>
                        </div>
                        {comp.descripcion && (
                          <p className="variante-desc">{comp.descripcion}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Paso 2: Seleccionar variante (solo si hay múltiples) */}
              {addModalStep === 'selectVariant' && selectedTipo && (
                <div className="variant-selector">
                  <p className="variant-hint">
                    <strong>{findComponenteEnCatalogo(selectedTipo)?.nombre}</strong> tiene múltiples variantes disponibles.
                    Elige cuál quieres usar para esta sección.
                  </p>
                  <div className="variantes-grid">
                    {(() => {
                      const componenteCatalogo = findComponenteEnCatalogo(selectedTipo);
                      const variantesDisponibles = componenteCatalogo?.variantes || [];
                      
                      return variantesDisponibles.map((variante: any) => {
                        const varianteId = typeof variante === 'string' ? variante : (variante.codigo || variante.id);
                        const varianteNombre = typeof variante === 'string' ? variante : (variante.nombre || variante.codigo || variante.id);
                        const varianteDesc = typeof variante === 'string' ? '' : (variante.descripcion || '');

                        return (
                          <button
                            key={varianteId}
                            className={`variante-option ${selectedVariante === varianteId ? 'selected' : ''}`}
                            onClick={async () => {
                              console.log('🔘 Variante seleccionada:', varianteId);
                              await handleSelectVariant(varianteId);
                            }}
                          >
                            <div className="variante-header">
                              <span className="variante-name">{varianteNombre}</span>
                              {varianteId === 'clic' && (
                                <span className="variante-badge">CLIC Premium</span>
                              )}
                            </div>
                            {varianteDesc && (
                              <p className="variante-desc">{varianteDesc}</p>
                            )}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Panel lateral de edición de componente - Diseño moderno */}
      {editingComponente && editingDatos && (
        <>
          <div className="panel-overlay" onClick={() => { setEditingComponente(null); setEditingDatos(null); }}></div>
          <div className="component-editor-panel">
            {/* Header fijo del panel */}
            <div className="panel-header">
              <div className="panel-header-content">
                <div className="panel-icon">
                  {findComponenteEnCatalogo(editingComponente.tipo)?.icono || '📦'}
                </div>
                <div className="panel-title-group">
                  <h2 className="panel-title">
                    {findComponenteEnCatalogo(editingComponente.tipo)?.nombre || editingComponente.tipo}
                  </h2>
                  <p className="panel-subtitle">
                    {findComponenteEnCatalogo(editingComponente.tipo)?.categoria} • {editingComponente.variante}
                  </p>
                </div>
              </div>
              <button
                className="panel-close-btn"
                onClick={() => { setEditingComponente(null); setEditingDatos(null); }}
                title="Cerrar panel"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Advertencia para componentes globales */}
            {editingComponente.esReferencia && (
              <div className="panel-warning-banner">
                <svg className="warning-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <div className="warning-content">
                  <strong>Componente Global</strong>
                  <p>Los cambios afectarán todas las páginas donde se use este componente</p>
                </div>
              </div>
            )}

            {/* Cuerpo con scroll del panel */}
            <div className="panel-body">
              {/* Sección de variante del componente */}
              {componenteSchema && componenteSchema.variantes && componenteSchema.variantes.length > 1 && (
                <div className="panel-section">
                  <div className="section-header">
                    <h3 className="section-title">Variante del componente</h3>
                    <p className="section-description">Selecciona el estilo y diseño del componente</p>
                  </div>
                  <div className="field-group">
                    <label htmlFor="variante-selector" className="field-label">Variante</label>
                    <select
                      id="variante-selector"
                      className="field-input"
                      value={editingComponente.variante}
                      onChange={(e) => {
                        setEditingComponente({ ...editingComponente, variante: e.target.value });
                      }}
                    >
                      {componenteSchema.variantes.map((variante: any) => (
                        <option key={variante.codigo} value={variante.codigo}>
                          {variante.nombre || variante.codigo}
                        </option>
                      ))}
                    </select>
                    <small className="field-hint">
                      La variante define el diseño y comportamiento del componente
                    </small>
                  </div>
                </div>
              )}

              {/* Dynamic Component Editor - Auto-generates forms based on JSONB data */}
              <DynamicComponentEditor
                datos={editingDatos}
                onChange={setEditingDatos}
                schema={componenteSchema}
                tenantId={tenantActual?.id}
              />

              {/* Sección de estado del componente */}
              <div className="panel-section">
                <div className="section-header">
                  <h3 className="section-title">Estado de visibilidad</h3>
                  <p className="section-description">Controla si este componente está visible en el sitio</p>
                </div>
                <div className="field-group field-toggle">
                  <label className="toggle-switch-modern large">
                    <input
                      type="checkbox"
                      checked={editingComponente.activo ?? true}
                      onChange={(e) => {
                        setEditingComponente({ ...editingComponente, activo: e.target.checked });
                      }}
                    />
                    <span className="toggle-slider-modern"></span>
                    <div className="toggle-content-modern">
                      <span className="toggle-label-modern-main">
                        {editingComponente.activo ? 'Componente Visible' : 'Componente Oculto'}
                      </span>
                      <span className="toggle-label-modern-sub">
                        {editingComponente.activo
                          ? 'El componente se mostrará en la página'
                          : 'El componente está oculto para los visitantes'}
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer fijo con acciones */}
            <div className="panel-footer">
              <button
                className="btn-panel-secondary"
                onClick={() => { setEditingComponente(null); setEditingDatos(null); }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Cancelar
              </button>
              <button
                className="btn-panel-primary"
                onClick={handleSavePageComponent}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    Guardando...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Guardar cambios
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Toast de notificación de éxito */}
      {successMessage && (
        <div className="success-toast">
          <div className="toast-content">
            <svg className="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span className="toast-message">{successMessage}</span>
          </div>
          <button
            className="toast-close"
            onClick={() => setSuccessMessage(null)}
            aria-label="Cerrar notificación"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      <style>{`
        .pagina-editor {
          width: 100%;
        }

        .editor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .btn-back {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          font-size: 0.95rem;
          padding: 8px 12px;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .btn-back:hover {
          color: #1a202c;
          background: #f8fafc;
        }

        .btn-back svg {
          width: 18px;
          height: 18px;
        }

        .header-info h1 {
          margin: 8px 0 4px 0;
          font-size: 1.75rem;
          font-weight: 700;
          color: #0f172a;
        }

        .header-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        .status-info {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.875rem;
          color: #64748b;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #cbd5e1;
        }

        .status-indicator.active {
          background: #22c55e;
        }

        .separator {
          color: #cbd5e1;
        }

        .tipo-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 0.75rem;
          color: white;
        }

        .slug-display {
          color: #64748b;
          font-family: monospace;
          font-size: 0.875rem;
        }

        .header-actions {
          display: flex;
          gap: 12px;
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

        .btn-small.danger:hover {
          background: #dc2626;
        }

        .btn-small.btn-goto-global {
          background: #475569;
          color: #94a3b8;
          font-size: 0.75rem;
          white-space: nowrap;
        }

        .btn-small.btn-goto-global:hover {
          background: #64748b;
          color: #f1f5f9;
        }

        .error-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #fef2f2;
          border: 1px solid #fecaca;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          color: #dc2626;
        }

        .error-banner button {
          background: none;
          border: none;
          color: #dc2626;
          font-size: 1.25rem;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .error-banner button:hover {
          background: #fee2e2;
        }

        .loading-container,
        .error-container {
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

        .editor-tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 24px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 0;
        }

        .tab {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          padding: 12px 20px;
          color: #64748b;
          cursor: pointer;
          border-radius: 8px 8px 0 0;
          transition: all 0.2s;
          font-weight: 500;
          position: relative;
        }

        .tab svg {
          width: 16px;
          height: 16px;
        }

        .tab:hover {
          color: #1a202c;
          background: #f8fafc;
        }

        .tab.active {
          color: #2563eb;
          background: transparent;
        }

        .tab.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: #2563eb;
        }

        .editor-content {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }

        .tab-content {
          min-height: 300px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-group label {
          font-weight: 500;
          color: #1a202c;
          font-size: 0.875rem;
        }

        .form-group input,
        .form-group textarea {
          padding: 12px 16px;
          background: white;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          color: #1a202c;
          font-size: 1rem;
          font-family: inherit;
          transition: all 0.2s;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .slug-input {
          display: flex;
          align-items: center;
          background: white;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          overflow: hidden;
        }

        .slug-prefix {
          padding: 12px;
          color: #64748b;
          background: #f8fafc;
          border-right: 1px solid #e2e8f0;
          font-weight: 500;
        }

        .slug-input input {
          border: none;
          border-radius: 0;
          flex: 1;
        }

        .input-hint {
          font-size: 0.75rem;
          color: #64748b;
        }

        .toggle-group {
          display: flex;
          gap: 24px;
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
          background: #cbd5e1;
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
          background: #2563eb;
        }

        .toggle-switch input:checked + .toggle-slider::before {
          transform: translateX(22px);
        }

        .toggle-label {
          color: #1a202c;
          font-weight: 500;
        }

        .toggle-switch input:checked + .toggle-slider + .toggle-label {
          color: #2563eb;
        }

        /* Componentes Tab */
        .componentes-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .componentes-header h3 {
          margin: 0;
        }

        .empty-componentes {
          text-align: center;
          padding: 40px;
          color: #94a3b8;
        }

        .empty-componentes .hint {
          font-size: 0.875rem;
          color: #64748b;
          margin-bottom: 16px;
        }

        .componentes-preview {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .empty-componentes-inline {
          padding: 24px;
          text-align: center;
          color: #94a3b8;
          border: 2px dashed #334155;
          border-radius: 8px;
          margin: 8px 0;
        }

        .empty-componentes-inline p {
          margin: 0 0 12px 0;
        }

        .componente-item.global {
          background: #eff6ff;
          border-color: #2563eb;
        }

        .global-badge {
          font-size: 0.625rem;
          background: #3b82f6;
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
        }

        .status-badge.global {
          background: #3b82f620;
          color: #60a5fa;
        }

        .hint-text {
          font-size: 0.75rem;
          color: #64748b;
          font-style: italic;
        }

        .componentes-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .componente-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .componente-item:hover {
          border-color: #cbd5e1;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .componente-order {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .order-btn {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          width: 24px;
          height: 24px;
          border-radius: 4px;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }

        .order-btn:hover:not(:disabled) {
          background: #e2e8f0;
          border-color: #cbd5e1;
          color: #1a202c;
        }

        .order-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .componente-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .componente-icon {
          font-size: 1.5rem;
        }

        .componente-name {
          font-weight: 500;
          display: block;
          color: #1a202c;
        }

        .componente-variante {
          font-size: 0.75rem;
          color: #64748b;
          margin-left: 8px;
        }

        .status-badge {
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 0.75rem;
          background: #64748b20;
          color: #64748b;
        }

        .status-badge.active {
          background: #22c55e20;
          color: #22c55e;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal {
          background: white;
          border-radius: 20px;
          width: 100%;
          max-width: 900px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 32px;
          border-bottom: 1px solid #e2e8f0;
          background: linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%);
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .modal-close {
          background: #f1f5f9;
          border: none;
          color: #64748b;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-close:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .modal-body {
          padding: 32px;
        }

        .variant-selector {
          padding: 0;
        }

        .variant-hint {
          margin: 0 0 2rem 0;
          color: #64748b;
          font-size: 0.95rem;
          line-height: 1.6;
          padding: 1rem 1.25rem;
          background: #f8fafc;
          border-radius: 8px;
          border-left: 4px solid #2563eb;
        }

        .variant-hint strong {
          color: #0f172a;
          font-weight: 600;
        }

        .variantes-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
        }

        .variante-option {
          padding: 1rem 1.25rem;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          background: white;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #1a202c;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
        }

        .variante-option:hover {
          border-color: #2563eb;
          background: #eff6ff;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
        }

        .variante-option.selected {
          border-color: #2563eb;
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          box-shadow: 0 4px 12px -2px rgba(37, 99, 235, 0.3);
        }

        .variante-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .variante-name {
          font-weight: 600;
          color: #0f172a;
          text-transform: capitalize;
          font-size: 1rem;
        }

        .variante-badge {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 0.35rem 0.875rem;
          border-radius: 16px;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.025em;
        }

        .variante-desc {
          margin: 0;
          color: #64748b;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .variante-indicator {
          color: #64748b;
          font-weight: normal;
          font-size: 0.9em;
        }

        .variante-indicator-header {
          color: #94a3b8;
          font-weight: normal;
          font-size: 0.9em;
          margin-left: 8px;
        }

        .componentes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
        }

        .componente-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 28px 20px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          color: #0f172a;
          position: relative;
          overflow: hidden;
        }

        .componente-option::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          transform: scaleX(0);
          transition: transform 0.2s;
        }

        .componente-option:hover {
          border-color: #667eea;
          background: #f8fafc;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          transform: translateY(-2px);
        }

        .componente-option:hover::before {
          transform: scaleX(1);
        }

        .option-icon {
          font-size: 3rem;
          line-height: 1;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
        }

        .option-name {
          font-size: 0.9375rem;
          font-weight: 600;
          text-align: center;
          color: #0f172a;
        }

        .option-cat {
          font-size: 0.6875rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 500;
        }

        .option-count {
          font-size: 0.6875rem;
          color: #3b82f6;
          font-weight: 600;
          background: #eff6ff;
          padding: 2px 8px;
          border-radius: 12px;
          margin-top: 4px;
        }

        /* Modal mejorado */
        .modal.modal-wide {
          max-width: 1000px;
        }

        .btn-back-modal {
          background: #f1f5f9;
          border: none;
          color: #64748b;
          cursor: pointer;
          font-size: 0.9rem;
          padding: 8px 16px;
          margin-right: 16px;
          border-radius: 8px;
          transition: all 0.2s;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .btn-back-modal:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .select-global-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .section-title {
          margin-bottom: 16px;
        }

        .section-title h3 {
          margin: 0 0 6px 0;
          font-size: 1.125rem;
          color: #0f172a;
          font-weight: 600;
        }

        .section-title p {
          margin: 0;
          font-size: 0.875rem;
          color: #64748b;
          line-height: 1.5;
        }

        .create-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .create-option-btn {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 24px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          cursor: pointer;
          text-align: left;
          color: #0f172a;
          transition: all 0.2s;
        }

        .create-option-btn:hover {
          border-color: #667eea;
          background: #f8fafc;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .create-option-btn.global:hover {
          border-color: #22c55e;
          background: #22c55e10;
        }

        .create-option-btn.page:hover {
          border-color: #f59e0b;
          background: #f59e0b10;
        }

        .create-option-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .create-icon {
          font-size: 2rem;
        }

        .create-option-btn strong {
          display: block;
          margin-bottom: 4px;
        }

        .create-option-btn small {
          color: #94a3b8;
          font-size: 0.8rem;
        }

        .globales-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .global-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #0f172a;
          border: 2px solid #334155;
          border-radius: 10px;
          cursor: pointer;
          color: #e2e8f0;
          transition: all 0.2s;
        }

        .global-item:hover {
          border-color: #3b82f6;
          background: #3b82f620;
        }

        .global-item:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .global-item-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .global-nombre {
          font-weight: 500;
        }

        .global-variante {
          font-size: 0.75rem;
          color: #64748b;
        }

        .use-btn {
          color: #3b82f6;
          font-weight: 500;
        }

        .no-globales {
          text-align: center;
          padding: 24px;
          background: #0f172a;
          border-radius: 10px;
          color: #94a3b8;
        }

        .no-globales p {
          margin: 0 0 8px 0;
        }

        .no-globales small {
          color: #64748b;
        }

        .loading-inline {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 40px;
          color: #94a3b8;
        }

        .spinner-small {
          width: 24px;
          height: 24px;
          border: 2px solid #334155;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .create-new-container {
          max-width: 500px;
          margin: 0 auto;
        }

        .create-new-container .form-group {
          margin-bottom: 24px;
        }

        .create-new-container .input-hint {
          display: block;
          margin-top: 8px;
          color: #64748b;
        }

        .create-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        /* Modal de edición */
        .edit-modal {
          background: #1e293b;
          border-radius: 16px;
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .edit-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .edit-form .form-group label {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .edit-form .required {
          color: #ef4444;
        }

        .edit-form input,
        .edit-form textarea {
          width: 100%;
          padding: 10px 14px;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 8px;
          color: #f8fafc;
          font-size: 0.9rem;
        }

        .edit-form input:focus,
        .edit-form textarea:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .field-hint {
          display: block;
          margin-top: 6px;
          color: #64748b;
          font-size: 0.8rem;
        }

        .toggle-switch {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }

        .toggle-switch input {
          width: auto;
          height: 24px;
          width: 44px;
          cursor: pointer;
        }

        .toggle-slider {
          display: none;
        }

        .toggle-label {
          color: #94a3b8;
          font-size: 0.9rem;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #334155;
        }

        /* ========== NUEVA INTERFAZ DE COMPONENTES ========== */

        /* Header mejorado */
        .componentes-header-new {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 2px solid #e2e8f0;
        }

        .componentes-header-new .header-text h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #0f172a;
        }

        .componentes-header-new .header-text p {
          margin: 0;
          font-size: 0.875rem;
          color: #64748b;
        }

        /* Grid de componentes */
        .componentes-grid-new {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.25rem;
        }

        /* Empty state mejorado */
        .empty-componentes-new {
          grid-column: 1 / -1;
          text-align: center;
          padding: 4rem 2rem;
          background: #f8fafc;
          border: 2px dashed #cbd5e1;
          border-radius: 16px;
        }

        .empty-icon-large {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 96px;
          height: 96px;
          background: #eff6ff;
          border-radius: 50%;
          margin-bottom: 1.5rem;
        }

        .empty-icon-large svg {
          color: #3b82f6;
        }

        .empty-componentes-new h4 {
          margin: 0 0 0.5rem 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #0f172a;
        }

        .empty-componentes-new p {
          margin: 0 0 1.5rem 0;
          color: #64748b;
          font-size: 0.95rem;
        }

        /* Cards de componentes */
        .componente-card-new {
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          position: relative;
        }

        .componente-card-new:hover {
          border-color: #3b82f6;
          box-shadow: 0 8px 24px rgba(59, 130, 246, 0.12);
          transform: translateY(-2px);
        }

        .componente-card-new.global {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border-color: #93c5fd;
        }

        .componente-card-new.global:hover {
          border-color: #60a5fa;
          box-shadow: 0 8px 24px rgba(96, 165, 250, 0.2);
        }

        /* Header de la card */
        .card-header-new {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.875rem 1rem;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .componente-card-new.global .card-header-new {
          background: rgba(59, 130, 246, 0.08);
          border-bottom-color: #bfdbfe;
        }

        .card-order-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .badge-order {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 32px;
          height: 24px;
          padding: 0 8px;
          background: #e2e8f0;
          color: #475569;
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: 6px;
          letter-spacing: 0.02em;
        }

        .badge-fixed {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.75rem;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          font-size: 0.625rem;
          font-weight: 700;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .badge-global {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.75rem;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          font-size: 0.625rem;
          font-weight: 700;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .card-actions-quick {
          display: flex;
          gap: 0.25rem;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .componente-card-new:hover .card-actions-quick {
          opacity: 1;
        }

        .quick-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          color: #64748b;
        }

        .quick-action-btn:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #0f172a;
        }

        .quick-action-btn.danger:hover:not(:disabled) {
          background: #fef2f2;
          border-color: #fecaca;
          color: #dc2626;
        }

        .quick-action-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        /* Body de la card */
        .card-body-new {
          padding: 1.5rem;
          text-align: center;
          flex: 1;
        }

        .card-icon-large {
          font-size: 3rem;
          margin-bottom: 0.75rem;
          line-height: 1;
        }

        .card-title-new {
          margin: 0 0 0.5rem 0;
          font-size: 1rem;
          font-weight: 600;
          color: #0f172a;
          line-height: 1.4;
        }

        .card-meta-new {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .meta-type {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 500;
        }

        .meta-separator {
          color: #cbd5e1;
          font-size: 0.625rem;
        }

        .meta-variant {
          font-size: 0.75rem;
          color: #3b82f6;
          font-weight: 600;
          text-transform: capitalize;
        }

        .card-warning-new {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.875rem;
          background: #fffbeb;
          border: 1px solid #fed7aa;
          border-radius: 8px;
          font-size: 0.75rem;
          color: #92400e;
          font-weight: 500;
          line-height: 1.4;
        }

        .componente-card-new.global .card-warning-new {
          background: rgba(59, 130, 246, 0.1);
          border-color: #93c5fd;
          color: #1e40af;
        }

        .card-warning-new svg {
          flex-shrink: 0;
        }

        /* Footer de la card */
        .card-footer-new {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.875rem 1rem;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
        }

        .componente-card-new.global .card-footer-new {
          background: rgba(59, 130, 246, 0.06);
          border-top-color: #bfdbfe;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #cbd5e1;
          margin-right: 0.5rem;
          flex-shrink: 0;
        }

        .status-dot.active {
          background: #22c55e;
          box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
        }

        .status-dot.inactive {
          background: #94a3b8;
        }

        .status-text {
          font-size: 0.875rem;
          font-weight: 500;
          color: #475569;
          flex: 1;
        }

        .edit-indicator {
          color: #94a3b8;
          flex-shrink: 0;
          transition: color 0.2s;
        }

        .componente-card-new:hover .edit-indicator {
          color: #3b82f6;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .componentes-grid-new {
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          }
        }

        @media (max-width: 768px) {
          .componentes-header-new {
            flex-direction: column;
            gap: 1rem;
          }

          .componentes-grid-new {
            grid-template-columns: 1fr;
          }

          .card-actions-quick {
            opacity: 1;
          }
        }

        /* ========== PANEL LATERAL DE EDICIÓN ========== */

        /* Overlay semi-transparente */
        .panel-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 999;
          animation: fadeIn 0.25s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        /* Panel lateral deslizable */
        .component-editor-panel {
          position: fixed;
          top: 64px; /* Debajo del header del CRM */
          right: 0;
          width: 720px;
          max-width: 100vw;
          height: calc(100vh - 64px); /* Altura menos el header */
          background: white;
          box-shadow: -8px 0 32px rgba(0, 0, 0, 0.12);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border-top-left-radius: 12px;
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        /* Header del panel */
        .panel-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 1.75rem 2rem;
          border-bottom: 2px solid #e2e8f0;
          background: linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%);
          flex-shrink: 0;
        }

        .panel-header-content {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
          flex: 1;
          min-width: 0;
        }

        .panel-icon {
          font-size: 2.5rem;
          flex-shrink: 0;
          line-height: 1;
        }

        .panel-title-group {
          flex: 1;
          min-width: 0;
        }

        .panel-title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.3;
        }

        .panel-subtitle {
          margin: 0.375rem 0 0 0;
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 500;
        }

        .panel-close-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border: none;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .panel-close-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        /* Banner de advertencia para componentes globales */
        .panel-warning-banner {
          display: flex;
          align-items: flex-start;
          gap: 0.875rem;
          padding: 1.25rem 2rem;
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          border-bottom: 2px solid #fde68a;
          flex-shrink: 0;
        }

        .warning-icon {
          color: #f59e0b;
          flex-shrink: 0;
          margin-top: 0.125rem;
        }

        .warning-content {
          flex: 1;
          min-width: 0;
        }

        .warning-content strong {
          display: block;
          color: #92400e;
          font-size: 0.9375rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }

        .warning-content p {
          margin: 0;
          color: #78350f;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        /* Cuerpo del panel con scroll */
        .panel-body {
          flex: 1;
          overflow-y: auto;
          padding: 2rem;
          background: #fafbfc;
        }

        .panel-body::-webkit-scrollbar {
          width: 10px;
        }

        .panel-body::-webkit-scrollbar-track {
          background: #f1f5f9;
        }

        .panel-body::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 5px;
        }

        .panel-body::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        /* Secciones del panel */
        .panel-section {
          background: white;
          border-radius: 12px;
          padding: 1.75rem;
          margin-bottom: 1.5rem;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }

        .section-header {
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #f1f5f9;
        }

        .section-title {
          margin: 0 0 0.375rem 0;
          font-size: 1.125rem;
          font-weight: 700;
          color: #0f172a;
        }

        .section-description {
          margin: 0;
          font-size: 0.875rem;
          color: #64748b;
          line-height: 1.5;
        }

        /* Campos del formulario */
        .form-fields {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }

        .field-group.field-toggle .field-label-wrapper {
          margin-bottom: 0.375rem;
        }

        .field-label-wrapper {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .field-label {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .field-required {
          color: #ef4444;
          font-size: 1rem;
        }

        .field-description {
          margin: 0;
          font-size: 0.8125rem;
          color: #64748b;
          line-height: 1.5;
        }

        .field-input-wrapper {
          display: flex;
          flex-direction: column;
        }

        /* Inputs estilizados */
        .field-input,
        .field-textarea {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.9375rem;
          color: #0f172a;
          background: white;
          transition: all 0.2s;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .field-input:focus,
        .field-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .field-textarea {
          resize: vertical;
          min-height: 100px;
          line-height: 1.6;
        }

        /* Toggle switches modernos */
        .toggle-switch-modern {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          cursor: pointer;
          padding: 0.75rem;
          border-radius: 8px;
          transition: background 0.2s;
        }

        .toggle-switch-modern:hover {
          background: #f8fafc;
        }

        .toggle-switch-modern input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider-modern {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
          background: #cbd5e1;
          border-radius: 24px;
          transition: all 0.3s;
          flex-shrink: 0;
        }

        .toggle-slider-modern::before {
          content: '';
          position: absolute;
          width: 18px;
          height: 18px;
          left: 3px;
          top: 3px;
          background: white;
          border-radius: 50%;
          transition: all 0.3s;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .toggle-switch-modern input:checked + .toggle-slider-modern {
          background: #3b82f6;
        }

        .toggle-switch-modern input:checked + .toggle-slider-modern::before {
          transform: translateX(20px);
        }

        .toggle-label-modern {
          font-size: 0.9375rem;
          color: #475569;
          font-weight: 500;
        }

        /* Toggle grande para visibilidad */
        .toggle-switch-modern.large {
          padding: 1.25rem;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          background: #fafbfc;
          transition: all 0.2s;
        }

        .toggle-switch-modern.large:hover {
          border-color: #cbd5e1;
          background: white;
        }

        .toggle-switch-modern.large .toggle-slider-modern {
          width: 52px;
          height: 28px;
        }

        .toggle-switch-modern.large .toggle-slider-modern::before {
          width: 22px;
          height: 22px;
        }

        .toggle-switch-modern.large input:checked + .toggle-slider-modern::before {
          transform: translateX(24px);
        }

        .toggle-content-modern {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          flex: 1;
        }

        .toggle-label-modern-main {
          font-size: 1rem;
          font-weight: 600;
          color: #0f172a;
        }

        .toggle-label-modern-sub {
          font-size: 0.8125rem;
          color: #64748b;
          line-height: 1.4;
        }

        /* Footer del panel */
        .panel-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.875rem;
          padding: 1.5rem 2rem;
          border-top: 2px solid #e2e8f0;
          background: white;
          flex-shrink: 0;
          box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.04);
        }

        .btn-panel-secondary,
        .btn-panel-primary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.875rem 1.75rem;
          border: none;
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-panel-secondary {
          background: #f1f5f9;
          color: #475569;
        }

        .btn-panel-secondary:hover {
          background: #e2e8f0;
          color: #1e293b;
        }

        .btn-panel-primary {
          background: #3b82f6;
          color: white;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
        }

        .btn-panel-primary:hover:not(:disabled) {
          background: #2563eb;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.35);
        }

        .btn-panel-primary:disabled {
          background: #94a3b8;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }

        /* Spinner animado */
        .spinner {
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* Responsive del panel */
        @media (max-width: 768px) {
          .component-editor-panel {
            width: 100%;
            max-width: 100%;
          }

          .panel-header {
            padding: 1.25rem 1.5rem;
          }

          .panel-icon {
            font-size: 2rem;
          }

          .panel-title {
            font-size: 1.25rem;
          }

          .panel-body {
            padding: 1.5rem;
          }

          .panel-section {
            padding: 1.25rem;
          }

          .panel-footer {
            padding: 1.25rem 1.5rem;
            flex-wrap: wrap;
          }

          .btn-panel-secondary,
          .btn-panel-primary {
            flex: 1;
            min-width: 140px;
          }
        }

        @media (max-width: 480px) {
          .panel-header {
            padding: 1rem;
          }

          .panel-body {
            padding: 1rem;
          }

          .panel-section {
            padding: 1rem;
          }

          .panel-footer {
            padding: 1rem;
          }

          .btn-panel-secondary,
          .btn-panel-primary {
            width: 100%;
            min-width: auto;
          }
        }

        /* ========== NOTIFICACIÓN DE ÉXITO (TOAST) ========== */

        .success-toast {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          min-width: 320px;
          max-width: 500px;
          padding: 1.125rem 1.5rem;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1);
          z-index: 10000;
          animation: slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideInUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .toast-content {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          flex: 1;
          min-width: 0;
        }

        .toast-icon {
          flex-shrink: 0;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
        }

        .toast-message {
          font-size: 0.9375rem;
          font-weight: 600;
          line-height: 1.4;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .toast-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: none;
          background: rgba(255, 255, 255, 0.15);
          color: white;
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .toast-close:hover {
          background: rgba(255, 255, 255, 0.25);
        }

        /* Responsive del toast */
        @media (max-width: 768px) {
          .success-toast {
            bottom: 1rem;
            right: 1rem;
            left: 1rem;
            min-width: auto;
            max-width: none;
          }
        }

        @media (max-width: 480px) {
          .success-toast {
            padding: 1rem 1.25rem;
          }

          .toast-message {
            font-size: 0.875rem;
          }
        }
      `}</style>
    </div>
  );
}
 

