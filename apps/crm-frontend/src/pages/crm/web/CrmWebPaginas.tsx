/**
 * CrmWebPaginas - Gestión de páginas web del tenant
 *
 * Sistema de tabs para separar:
 * - Páginas Estándar: Todas las páginas definidas en tipos_pagina (sistema)
 * - Páginas Personalizadas: Páginas custom creadas por el usuario
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { usePageHeader } from '../../../layouts/CrmLayout';
import { getPaginas, savePagina, getPlantillasParaTenant, PlantillaPagina, TipoPaginaConPlantillas, getTiposPaginaParaTenant, getAllTiposPagina } from '../../../services/api';
import { PaginaWeb, TipoPagina, TIPOS_PAGINA, TipoPaginaInfo } from '../../../types/paginas';

interface TipoPaginaEstandar {
  id: string;
  codigo: string;
  nombre: string;
  ruta_patron: string;
  nivel: number;
  visible: boolean;
  publico: boolean;
  descripcion?: string;
  tieneComponentes: boolean;
  cantidadComponentes: number;
}

interface PaginaConHijos extends PaginaWeb {
  hijos: PaginaConHijos[];
  tipoInfo: TipoPaginaInfo;
  esEstandar: boolean;
}

type ModalStep = 'tipo' | 'plantilla' | 'detalles';
type TabView = 'estandar' | 'personalizadas';

// Prefijos de rutas estándar (basados en adminTenantsService.ts)
const RUTAS_ESTANDAR = [
  '',  // Homepage (slug vacío o '/')
  '/',  // Homepage (slug con barra)
  'contacto',
  'politicas-de-privacidad',
  'politicas-privacidad',
  'terminos-y-condiciones',
  'terminos-condiciones',
  'vende-con-nosotros',
  'asesores',
  'blog',
  'articulos',  // Alias de blog
  'proyectos',
  'testimonios',
  'videos',
  'propiedades',
  'propiedad',  // Singular de propiedades
  'nosotros',
  'servicios',
  '_template',  // Todos los templates son del sistema
];

export default function CrmWebPaginas() {
  const { tenantActual } = useAuth();
  const navigate = useNavigate();
  const { setPageHeader } = usePageHeader();

  const [paginas, setPaginas] = useState<PaginaWeb[]>([]);
  const [tiposPaginaEstandar, setTiposPaginaEstandar] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTipos, setLoadingTipos] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabView>('estandar');

  // Modal state
  const [modalStep, setModalStep] = useState<ModalStep>('tipo');
  const [newPageType, setNewPageType] = useState<TipoPagina>('custom');
  const [selectedPlantilla, setSelectedPlantilla] = useState<PlantillaPagina | null>(null);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');
  const [creating, setCreating] = useState(false);

  // Plantillas del backend
  const [tiposPaginaDB, setTiposPaginaDB] = useState<TipoPaginaConPlantillas[]>([]);
  const [plantillasDisponibles, setPlantillasDisponibles] = useState<PlantillaPagina[]>([]);
  const [loadingPlantillas, setLoadingPlantillas] = useState(false);

  // Configurar header
  useEffect(() => {
    setPageHeader({
      title: 'Páginas Web',
      subtitle: 'Gestiona y personaliza las páginas de tu sitio inmobiliario',
      actions: (
        <button className="btn-header-primary" onClick={() => openNewModal()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nueva Página
        </button>
      ),
    });
  }, [setPageHeader]);

  // Cargar páginas
  useEffect(() => {
    if (!tenantActual?.id) return;

    async function loadPaginas() {
      try {
        setLoading(true);
        setError(null);
        const data = await getPaginas(tenantActual!.id);
        setPaginas(data);
      } catch (err: any) {
        console.error('Error cargando páginas:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadPaginas();
  }, [tenantActual?.id]);

  // Cargar tipos de página
  useEffect(() => {
    if (!tenantActual?.id) return;

    async function loadTiposPagina() {
      try {
        const tipos = await getTiposPaginaParaTenant(tenantActual!.id);
        setTiposPaginaDB(tipos);
      } catch (err) {
        console.error('Error cargando tipos de página:', err);
      }
    }

    loadTiposPagina();
  }, [tenantActual?.id]);

  // Cargar todos los tipos de página estándar
  useEffect(() => {
    async function loadTiposPaginaEstandar() {
      try {
        setLoadingTipos(true);
        const tipos = await getAllTiposPagina();

        // Enriquecer con información de si tiene componentes configurados
        const tiposEnriquecidos = tipos.map((tipo: any) => {
          // Verificar si alguna página usa este tipo
          const paginaConTipo = paginas.find(p => p.tipoPagina === tipo.codigo);
          return {
            ...tipo,
            tieneComponentes: false, // TODO: obtener del backend
            cantidadComponentes: 0,  // TODO: obtener del backend
          };
        });

        setTiposPaginaEstandar(tiposEnriquecidos);
      } catch (err) {
        console.error('Error cargando tipos de página estándar:', err);
      } finally {
        setLoadingTipos(false);
      }
    }

    loadTiposPaginaEstandar();
  }, [paginas]);

  // Organizar tipos de página por jerarquía
  const tiposPaginaJerarquicos = useMemo(() => {
    if (!tiposPaginaEstandar.length) return [];

    // Crear un mapa de códigos a tipos
    const mapaCodeToTipo: Record<string, any> = {};
    tiposPaginaEstandar.forEach(tipo => {
      mapaCodeToTipo[tipo.codigo] = {
        ...tipo,
        hijos: []
      };
    });

    // Construir jerarquía
    const raices: any[] = [];

    tiposPaginaEstandar.forEach(tipo => {
      const tipoConHijos = mapaCodeToTipo[tipo.codigo];

      if (tipo.nivel === 0) {
        raices.push(tipoConHijos);
      } else {
        // Buscar padre basándose en el patrón de ruta
        // Por ejemplo: "videos-categoria" tiene padre "videos"
        const codigoPadre = tipo.codigo.split('-')[0];
        const padre = mapaCodeToTipo[codigoPadre];
        if (padre) {
          padre.hijos.push(tipoConHijos);
        } else {
          // Si no tiene padre, es raíz
          raices.push(tipoConHijos);
        }
      }
    });

    return raices;
  }, [tiposPaginaEstandar]);

  // Determinar si una página es estándar usando el campo 'origen' de la BD
  const isPaginaEstandar = (pagina: any): boolean => {
    // Si tiene el campo 'origen', usarlo directamente
    if (pagina.origen) {
      return pagina.origen === 'sistema';
    }

    // Fallback: verificar si el slug coincide con alguna ruta estándar (compatibilidad)
    const slug = pagina.slug.replace(/^\//, ''); // Remover barra inicial
    return RUTAS_ESTANDAR.some(rutaEst => {
      return slug === rutaEst || slug.startsWith(`${rutaEst}/`);
    });
  };

  // Separar páginas por tipo
  const { paginasEstandar, paginasPersonalizadas } = useMemo(() => {
    const estandar: PaginaWeb[] = [];
    const personalizadas: PaginaWeb[] = [];

    paginas.forEach(p => {
      if (isPaginaEstandar(p)) {
        estandar.push(p);
      } else {
        personalizadas.push(p);
      }
    });

    return { paginasEstandar: estandar, paginasPersonalizadas: personalizadas };
  }, [paginas]);

  // Organizar páginas en estructura jerárquica
  const organizarPaginasJerarquicas = (listaPaginas: PaginaWeb[]) => {
    const result: PaginaConHijos[] = [];
    const mapaPorTipo = new Map<TipoPagina, PaginaWeb>();

    listaPaginas.forEach(p => {
      mapaPorTipo.set(p.tipoPagina as TipoPagina, p);
    });

    const paginasNivel0 = listaPaginas.filter(p => {
      const tipoInfo = TIPOS_PAGINA[p.tipoPagina as TipoPagina];
      return tipoInfo && tipoInfo.nivel === 0;
    });

    paginasNivel0.sort((a, b) => a.orden - b.orden);

    paginasNivel0.forEach(padre => {
      const tipoInfo = TIPOS_PAGINA[padre.tipoPagina as TipoPagina];
      const paginaConHijos: PaginaConHijos = {
        ...padre,
        tipoInfo,
        hijos: [],
        esEstandar: isPaginaEstandar(padre),
      };

      Object.values(TIPOS_PAGINA).forEach(tipo => {
        if (tipo.rutaPadre === padre.tipoPagina) {
          const paginaHijo = listaPaginas.find(p => p.tipoPagina === tipo.codigo);
          if (paginaHijo) {
            const hijoConHijos: PaginaConHijos = {
              ...paginaHijo,
              tipoInfo: tipo,
              hijos: [],
              esEstandar: isPaginaEstandar(paginaHijo),
            };

            Object.values(TIPOS_PAGINA).forEach(tipoNieto => {
              if (tipoNieto.rutaPadre === tipo.codigo) {
                const paginaNieto = listaPaginas.find(p => p.tipoPagina === tipoNieto.codigo);
                if (paginaNieto) {
                  hijoConHijos.hijos.push({
                    ...paginaNieto,
                    tipoInfo: tipoNieto,
                    hijos: [],
                    esEstandar: isPaginaEstandar(paginaNieto),
                  });
                }
              }
            });

            paginaConHijos.hijos.push(hijoConHijos);
          }
        }
      });

      result.push(paginaConHijos);
    });

    return result;
  };

  const paginasEstandarJerarquicas = useMemo(() => organizarPaginasJerarquicas(paginasEstandar), [paginasEstandar]);
  const paginasPersonalizadasJerarquicas = useMemo(() => organizarPaginasJerarquicas(paginasPersonalizadas), [paginasPersonalizadas]);

  // Abrir modal
  const openNewModal = () => {
    setModalStep('tipo');
    setNewPageType('custom');
    setSelectedPlantilla(null);
    setNewPageTitle('');
    setNewPageSlug('');
    setPlantillasDisponibles([]);
    setShowNewModal(true);
  };

  const closeModal = () => {
    setShowNewModal(false);
    setModalStep('tipo');
    setNewPageType('custom');
    setSelectedPlantilla(null);
    setNewPageTitle('');
    setNewPageSlug('');
  };

  const handleSelectTipo = async (tipo: TipoPagina) => {
    setNewPageType(tipo);
    if (!tenantActual?.id) return;

    try {
      setLoadingPlantillas(true);
      const plantillas = await getPlantillasParaTenant(tenantActual.id, tipo);
      setPlantillasDisponibles(plantillas);

      if (plantillas.length > 0) {
        setModalStep('plantilla');
      } else {
        setModalStep('detalles');
      }
    } catch (err) {
      console.error('Error cargando plantillas:', err);
      setModalStep('detalles');
    } finally {
      setLoadingPlantillas(false);
    }
  };

  const handleSelectPlantilla = (plantilla: PlantillaPagina | null) => {
    setSelectedPlantilla(plantilla);
    setModalStep('detalles');
  };

  const handleBack = () => {
    if (modalStep === 'detalles') {
      if (plantillasDisponibles.length > 0) {
        setModalStep('plantilla');
      } else {
        setModalStep('tipo');
      }
    } else if (modalStep === 'plantilla') {
      setModalStep('tipo');
    }
  };

  const toggleGroup = (paginaId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(paginaId)) {
        next.delete(paginaId);
      } else {
        next.add(paginaId);
      }
      return next;
    });
  };

  const togglePageStatus = async (pagina: PaginaWeb, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!tenantActual?.id) return;

    try {
      setUpdatingStatus(pagina.id);
      await savePagina(tenantActual.id, {
        ...pagina,
        activa: !pagina.activa,
      });

      setPaginas(prev =>
        prev.map(p => (p.id === pagina.id ? { ...p, activa: !p.activa } : p))
      );
    } catch (err: any) {
      console.error('Error actualizando estado:', err);
      setError(err.message);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleCreatePage = async () => {
    if (!tenantActual?.id || !newPageTitle.trim()) return;

    try {
      setCreating(true);
      const tipoPaginaInfo = TIPOS_PAGINA[newPageType];
      const slug = tipoPaginaInfo?.requiereSlug
        ? (newPageSlug || generateSlug(newPageTitle))
        : generateSlug(newPageTitle);

      const newPage = await savePagina(tenantActual.id, {
        tipoPagina: newPageType,
        titulo: newPageTitle,
        slug,
        descripcion: '',
        contenido: selectedPlantilla?.configuracionDefault || {},
        meta: {},
        publica: true,
        activa: true,
        orden: paginas.length + 1,
        plantillaId: selectedPlantilla?.id || null,
      });

      setPaginas([...paginas, newPage]);
      closeModal();

      // Cambiar a tab personalizada si es custom
      if (newPageType === 'custom') {
        setActiveTab('personalizadas');
      }

      navigate(`${newPage.id}`);
    } catch (err: any) {
      console.error('Error creando página:', err);
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const tiposDisponibles = useMemo(() => {
    if (tiposPaginaDB.length > 0) {
      return tiposPaginaDB
        .filter(t => t.nivel === 0 && !t.esPlantilla && !t.protegida)
        .map(t => ({
          ...t,
          ...(TIPOS_PAGINA[t.codigo as TipoPagina] || {}),
          cantidadPlantillas: t.cantidadPlantillas,
        }));
    }

    return Object.values(TIPOS_PAGINA)
      .filter(t => t.nivel === 0 && !t.esPlantilla && !t.protegida)
      .map(t => ({ ...t, cantidadPlantillas: 0 }));
  }, [tiposPaginaDB]);

  // Renderizar fila de página
  // Renderizar tipo de página (para tab estándar)
  const renderTipoPaginaRow = (tipo: any, nivel: number = 0) => {
    const tieneHijos = tipo.hijos && tipo.hijos.length > 0;
    const isExpanded = expandedGroups.has(tipo.codigo);

    return (
      <div key={tipo.codigo} className="pagina-group">
        <div
          className={`pagina-row tipo-row nivel-${nivel} ${tieneHijos ? 'tiene-hijos' : ''}`}
          onClick={() => tieneHijos ? toggleGroup(tipo.codigo) : navigate(`/crm/${tenantActual?.slug}/${tipo.codigo}`)}
        >
          <div className="col-expand">
            {tieneHijos && (
              <button
                className={`btn-expand ${isExpanded ? 'expanded' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleGroup(tipo.codigo);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            )}
          </div>

          <div className="col-nombre">
            <div className="pagina-nombre-group">
              <span className="pagina-nombre">{tipo.nombre}</span>
              <span className="pagina-tipo">Tipo de Página del Sistema</span>
            </div>
          </div>

          <div className="col-url">
            <span className="pagina-url">
              {tipo.ruta_patron || '/'}
            </span>
          </div>

          <div className="col-nivel">
            <span className="badge">Nivel {tipo.nivel}</span>
          </div>

          <div className="col-estado">
            <div className="status-badges">
              {tipo.visible && (
                <span className="badge badge-success">Visible</span>
              )}
              {tipo.publico && (
                <span className="badge badge-info">Público</span>
              )}
              {!tipo.visible && (
                <span className="badge badge-gray">Oculto</span>
              )}
              {!tipo.publico && (
                <span className="badge badge-warning">Privado</span>
              )}
            </div>
          </div>

          <div className="col-acciones">
            <button
              className="btn-icon"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/crm/${tenantActual?.slug}/${tipo.codigo}`);
              }}
              title="Ver detalles"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </div>

        {tieneHijos && isExpanded && (
          <div className="pagina-hijos">
            {tipo.hijos.map((hijo: any) => renderTipoPaginaRow(hijo, nivel + 1))}
          </div>
        )}
      </div>
    );
  };

  // Renderizar página (para tab personalizada)
  const renderPaginaRow = (pagina: PaginaConHijos, nivel: number = 0) => {
    const tieneHijos = pagina.hijos.length > 0;
    const isExpanded = expandedGroups.has(pagina.id);
    const isUpdating = updatingStatus === pagina.id;

    return (
      <div key={pagina.id} className="pagina-group">
        <div
          className={`pagina-row nivel-${nivel} ${tieneHijos ? 'tiene-hijos' : ''}`}
          onClick={() => tieneHijos ? toggleGroup(pagina.id) : navigate(`${pagina.id}`)}
        >
          <div className="col-expand">
            {tieneHijos && (
              <button
                className={`btn-expand ${isExpanded ? 'expanded' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleGroup(pagina.id);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            )}
          </div>

          <div className="col-nombre">
            <div className="pagina-nombre-group">
              <span className="pagina-nombre">{pagina.titulo}</span>
              <span className="pagina-tipo">{pagina.tipoInfo.nombre}</span>
            </div>
          </div>

          <div className="col-url">
            <span className="pagina-url">
              {pagina.tipoInfo.esPlantilla
                ? pagina.tipoInfo.rutaPatron
                : pagina.slug.startsWith('/') ? pagina.slug : `/${pagina.slug}`}
            </span>
          </div>

          <div className="col-fecha">
            <span className="pagina-fecha">{formatDate(pagina.createdAt)}</span>
          </div>

          <div className="col-estado">
            <button
              className={`btn-toggle ${pagina.activa ? 'activa' : 'inactiva'} ${isUpdating ? 'updating' : ''}`}
              onClick={(e) => togglePageStatus(pagina, e)}
              disabled={isUpdating || pagina.tipoInfo.protegida}
              title={pagina.tipoInfo.protegida ? 'Página protegida - no se puede desactivar' : (pagina.activa ? 'Desactivar' : 'Activar')}
            >
              <span className="toggle-track">
                <span className="toggle-thumb"/>
              </span>
              <span className="toggle-label">{pagina.activa ? 'Activa' : 'Inactiva'}</span>
            </button>
          </div>

          <div className="col-acciones">
            <button
              className="btn-editar"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`${pagina.id}`);
              }}
              title="Editar página"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          </div>
        </div>

        {tieneHijos && isExpanded && (
          <div className="pagina-hijos">
            {pagina.hijos.map(hijo => renderPaginaRow(hijo, nivel + 1))}
          </div>
        )}
      </div>
    );
  };

  // Renderizar contenido del modal
  const renderModalContent = () => {
    switch (modalStep) {
      case 'tipo':
        return (
          <>
            <div className="modal-header">
              <div>
                <h2>Crear Nueva Página</h2>
                <p className="modal-subtitle">Paso 1: Selecciona el tipo de página</p>
              </div>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            <div className="modal-body">
              <div className="form-section">
                <label className="form-label">Tipo de Página</label>
                <p className="form-help">Selecciona el tipo de contenido que tendrá tu página</p>

                <div className="tipo-grid">
                  {tiposDisponibles.map((tipo) => (
                    <button
                      key={tipo.codigo}
                      type="button"
                      className={`tipo-card ${newPageType === tipo.codigo ? 'selected' : ''}`}
                      onClick={() => handleSelectTipo(tipo.codigo as TipoPagina)}
                      disabled={loadingPlantillas}
                    >
                      <div className="tipo-card-icon" style={{ backgroundColor: tipo.color || '#6366f1' }}>
                        {tipo.icono || '📄'}
                      </div>
                      <div className="tipo-card-content">
                        <span className="tipo-card-name">{tipo.nombre}</span>
                        <span className="tipo-card-desc">{tipo.descripcion}</span>
                        {tipo.cantidadPlantillas > 0 && (
                          <span className="tipo-card-badge">{tipo.cantidadPlantillas} plantillas</span>
                        )}
                      </div>
                      {loadingPlantillas && newPageType === tipo.codigo && (
                        <div className="tipo-card-loading">
                          <div className="mini-spinner" />
                        </div>
                      )}
                    </button>
                  ))}

                  <button
                    type="button"
                    className={`tipo-card ${newPageType === 'custom' ? 'selected' : ''}`}
                    onClick={() => handleSelectTipo('custom')}
                    disabled={loadingPlantillas}
                  >
                    <div className="tipo-card-icon" style={{ backgroundColor: TIPOS_PAGINA.custom?.color || '#805ad5' }}>
                      {TIPOS_PAGINA.custom?.icono || '✨'}
                    </div>
                    <div className="tipo-card-content">
                      <span className="tipo-card-name">{TIPOS_PAGINA.custom?.nombre || 'Personalizada'}</span>
                      <span className="tipo-card-desc">Crea una página desde cero con diseño libre</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </>
        );

      case 'plantilla':
        return (
          <>
            <div className="modal-header">
              <div>
                <h2>Elegir Plantilla</h2>
                <p className="modal-subtitle">Paso 2: Selecciona una plantilla para {TIPOS_PAGINA[newPageType]?.nombre || newPageType}</p>
              </div>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            <div className="modal-body">
              <div className="form-section">
                <label className="form-label">Plantillas Disponibles</label>
                <p className="form-help">Elige una plantilla prediseñada o empieza desde cero</p>

                <div className="plantilla-grid">
                  <button
                    type="button"
                    className={`plantilla-card ${!selectedPlantilla ? 'selected' : ''}`}
                    onClick={() => handleSelectPlantilla(null)}
                  >
                    <div className="plantilla-preview plantilla-blank">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <line x1="12" y1="8" x2="12" y2="16"/>
                        <line x1="8" y1="12" x2="16" y2="12"/>
                      </svg>
                    </div>
                    <div className="plantilla-info">
                      <span className="plantilla-name">Desde cero</span>
                      <span className="plantilla-desc">Diseño completamente personalizado</span>
                    </div>
                    {!selectedPlantilla && (
                      <div className="plantilla-check">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                    )}
                  </button>

                  {plantillasDisponibles.map((plantilla) => (
                    <button
                      key={plantilla.id}
                      type="button"
                      className={`plantilla-card ${selectedPlantilla?.id === plantilla.id ? 'selected' : ''} ${plantilla.esPremium ? 'premium' : ''}`}
                      onClick={() => handleSelectPlantilla(plantilla)}
                    >
                      <div className="plantilla-preview">
                        {plantilla.previewImage ? (
                          <img src={plantilla.previewImage} alt={plantilla.nombre} />
                        ) : (
                          <div className="plantilla-placeholder" style={{ background: `linear-gradient(135deg, ${TIPOS_PAGINA[newPageType]?.color || '#6366f1'}22, ${TIPOS_PAGINA[newPageType]?.color || '#6366f1'}44)` }}>
                            <span>{plantilla.nombre.charAt(0)}</span>
                          </div>
                        )}
                        {plantilla.featured && (
                          <span className="plantilla-featured-badge">Destacada</span>
                        )}
                        {plantilla.esPremium && (
                          <span className="plantilla-premium-badge">Premium</span>
                        )}
                      </div>
                      <div className="plantilla-info">
                        <span className="plantilla-name">{plantilla.nombre}</span>
                        <span className="plantilla-desc">{plantilla.descripcion || plantilla.categoria}</span>
                      </div>
                      {selectedPlantilla?.id === plantilla.id && (
                        <div className="plantilla-check">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={handleBack}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                Volver
              </button>
              <button className="btn-primary" onClick={() => setModalStep('detalles')}>
                Continuar
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>
          </>
        );

      case 'detalles':
        const tipoInfo = TIPOS_PAGINA[newPageType];
        return (
          <>
            <div className="modal-header">
              <div>
                <h2>Detalles de la Página</h2>
                <p className="modal-subtitle">Paso final: Configura los detalles básicos</p>
              </div>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            <div className="modal-body">
              <div className="selection-summary">
                <div className="summary-item">
                  <span className="summary-label">Tipo:</span>
                  <span className="summary-value">
                    <span className="summary-icon" style={{ backgroundColor: tipoInfo?.color || '#6366f1' }}>
                      {tipoInfo?.icono || '📄'}
                    </span>
                    {tipoInfo?.nombre || newPageType}
                  </span>
                </div>
                {selectedPlantilla && (
                  <div className="summary-item">
                    <span className="summary-label">Plantilla:</span>
                    <span className="summary-value">{selectedPlantilla.nombre}</span>
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label htmlFor="titulo" className="form-label">Título de la Página *</label>
                  <input
                    id="titulo"
                    type="text"
                    className="form-input"
                    value={newPageTitle}
                    onChange={(e) => {
                      setNewPageTitle(e.target.value);
                      if (!newPageSlug) {
                        setNewPageSlug(generateSlug(e.target.value));
                      }
                    }}
                    placeholder="Ej: Sobre Nosotros, Nuestro Equipo..."
                    autoFocus
                  />
                </div>
              </div>

              {tipoInfo?.requiereSlug && (
                <div className="form-group">
                  <label htmlFor="slug" className="form-label">URL de la Página</label>
                  <div className="input-with-prefix">
                    <span className="input-prefix">/</span>
                    <input
                      id="slug"
                      type="text"
                      className="form-input"
                      value={newPageSlug}
                      onChange={(e) => setNewPageSlug(generateSlug(e.target.value))}
                      placeholder="sobre-nosotros"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={handleBack}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                Volver
              </button>
              <button
                className="btn-primary"
                onClick={handleCreatePage}
                disabled={!newPageTitle.trim() || creating}
              >
                {creating ? 'Creando...' : 'Crear Página'}
              </button>
            </div>
          </>
        );
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"/>
        <p>Cargando páginas...</p>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="paginas-container">
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-container">
        <button
          className={`tab ${activeTab === 'estandar' ? 'active' : ''}`}
          onClick={() => setActiveTab('estandar')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
          <span>Páginas Estándar</span>
          <span className="tab-badge">{tiposPaginaEstandar.length}</span>
        </button>
        <button
          className={`tab ${activeTab === 'personalizadas' ? 'active' : ''}`}
          onClick={() => setActiveTab('personalizadas')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <span>Páginas Personalizadas</span>
          <span className="tab-badge tab-badge-custom">{paginasPersonalizadas.length}</span>
        </button>
      </div>

      {/* Contenido del tab activo */}
      <div className="tab-content">
        {activeTab === 'estandar' ? (
          <>
            {loadingTipos ? (
              <div className="loading-state">
                <p>Cargando tipos de página...</p>
              </div>
            ) : tiposPaginaEstandar.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                  </svg>
                </div>
                <h3>No hay tipos de página registrados</h3>
                <p>Los tipos de página del sistema aparecerán aquí</p>
              </div>
            ) : (
              <div className="paginas-table">
                <div className="table-header">
                  <div className="col-expand"/>
                  <div className="col-nombre">Nombre</div>
                  <div className="col-url">Ruta Patrón</div>
                  <div className="col-nivel">Nivel</div>
                  <div className="col-estado">Estado</div>
                  <div className="col-acciones"/>
                </div>
                <div className="table-body">
                  {tiposPaginaJerarquicos.map(tipo => renderTipoPaginaRow(tipo))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {paginasPersonalizadasJerarquicas.length === 0 ? (
              <div className="empty-state empty-state-custom">
                <div className="empty-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <h3>Crea tu primera página personalizada</h3>
                <p>Las páginas personalizadas te permiten crear contenido único sin límites. Landing pages, promociones especiales, lo que necesites.</p>
                <button className="btn-primary" onClick={openNewModal}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Crear Página Personalizada
                </button>
              </div>
            ) : (
              <div className="paginas-table">
                <div className="table-header">
                  <div className="col-expand"/>
                  <div className="col-nombre">Página</div>
                  <div className="col-url">URL</div>
                  <div className="col-fecha">Fecha</div>
                  <div className="col-estado">Estado</div>
                  <div className="col-acciones"/>
                </div>
                <div className="table-body">
                  {paginasPersonalizadasJerarquicas.map(pagina => renderPaginaRow(pagina))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Nueva Página */}
      {showNewModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            {renderModalContent()}
          </div>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .paginas-container {
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
  }

  /* Feature Banner */
  .feature-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 24px 28px;
    border-radius: 16px;
    margin-bottom: 24px;
    color: white;
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.25);
  }

  .feature-content {
    display: flex;
    gap: 20px;
    align-items: center;
    flex: 1;
  }

  .feature-icon {
    width: 56px;
    height: 56px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(10px);
  }

  .feature-text h3 {
    margin: 0 0 6px 0;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .feature-text p {
    margin: 0;
    font-size: 0.9375rem;
    opacity: 0.95;
    line-height: 1.5;
  }

  .feature-stats {
    display: flex;
    gap: 24px;
    align-items: center;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    line-height: 1;
  }

  .stat-label {
    font-size: 0.75rem;
    opacity: 0.9;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stat-divider {
    width: 1px;
    height: 40px;
    background: rgba(255, 255, 255, 0.3);
  }

  /* Tabs */
  .tabs-container {
    display: flex;
    gap: 8px;
    background: white;
    padding: 6px;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    margin-bottom: 20px;
  }

  .tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 12px 20px;
    background: transparent;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    font-size: 0.9375rem;
    color: #64748b;
    transition: all 0.2s;
  }

  .tab:hover {
    background: #f8fafc;
    color: #0f172a;
  }

  .tab.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  }

  .tab svg {
    flex-shrink: 0;
  }

  .tab-badge {
    padding: 2px 8px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 10px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .tab:not(.active) .tab-badge {
    background: #e2e8f0;
    color: #64748b;
  }

  .tab-badge-custom {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: white;
  }

  .tab:not(.active) .tab-badge-custom {
    background: #fef3c7;
    color: #d97706;
  }

  /* Tab Content */
  .tab-content {
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Loading */
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px;
    color: #64748b;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e2e8f0;
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 20px;
  }

  .mini-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #e2e8f0;
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Error Banner */
  .error-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fef2f2;
    border: 1px solid #fecaca;
    padding: 14px 18px;
    border-radius: 10px;
    margin-bottom: 20px;
    color: #dc2626;
  }

  .error-banner button {
    background: none;
    border: none;
    color: #dc2626;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0 8px;
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 80px 40px;
    background: white;
    border-radius: 16px;
    border: 2px dashed #e2e8f0;
  }

  .empty-state-custom {
    border-color: #fbbf24;
    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  }

  .empty-icon {
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f8fafc;
    border-radius: 50%;
    color: #94a3b8;
    margin: 0 auto 24px;
  }

  .empty-state-custom .empty-icon {
    background: #fef3c7;
    color: #f59e0b;
  }

  .empty-state h3 {
    margin: 0 0 12px 0;
    color: #0f172a;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .empty-state p {
    color: #64748b;
    margin: 0 0 28px 0;
    font-size: 0.9375rem;
    max-width: 480px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.6;
  }

  /* Tabla */
  .paginas-table {
    background: white;
    border-radius: 16px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .table-header {
    display: flex;
    align-items: center;
    background: linear-gradient(to bottom, #fafbfc, #f8fafc);
    border-bottom: 1px solid #e2e8f0;
    padding: 14px 20px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .pagina-group {
    border-bottom: 1px solid #f1f5f9;
  }

  .pagina-group:last-child {
    border-bottom: none;
  }

  .pagina-row {
    display: flex;
    align-items: center;
    padding: 16px 20px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .pagina-row:hover {
    background: linear-gradient(to right, #fafbfc, #f8fafc);
  }

  .pagina-row.nivel-1 {
    padding-left: 60px;
    background: #fafbfc;
  }

  .pagina-row.nivel-2 {
    padding-left: 100px;
    background: #f5f7f9;
  }

  .pagina-hijos {
    border-top: 1px solid #f1f5f9;
  }

  /* Columnas */
  .col-expand { width: 40px; flex-shrink: 0; }
  .col-nombre { flex: 2; min-width: 200px; }
  .col-url { flex: 1.5; min-width: 160px; }
  .col-fecha { width: 110px; flex-shrink: 0; }
  .col-nivel { width: 100px; flex-shrink: 0; }
  .col-estado { width: 180px; flex-shrink: 0; }
  .col-acciones { width: 60px; flex-shrink: 0; display: flex; justify-content: flex-end; }

  .btn-expand {
    background: none;
    border: none;
    padding: 6px;
    cursor: pointer;
    color: #64748b;
    border-radius: 6px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-expand:hover {
    background: #e2e8f0;
    color: #0f172a;
  }

  .btn-expand.expanded {
    transform: rotate(90deg);
  }

  .pagina-nombre-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .pagina-nombre {
    font-weight: 600;
    color: #0f172a;
    font-size: 0.9375rem;
  }

  .pagina-tipo {
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .pagina-url {
    font-family: ui-monospace, 'SF Mono', 'Cascadia Code', 'Roboto Mono', monospace;
    font-size: 0.8125rem;
    color: #6366f1;
    background: #eef2ff;
    padding: 5px 10px;
    border-radius: 6px;
    font-weight: 500;
  }

  .pagina-fecha {
    font-size: 0.8125rem;
    color: #64748b;
  }

  .btn-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    transition: opacity 0.15s;
  }

  .btn-toggle:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .btn-toggle.updating {
    opacity: 0.5;
  }

  .toggle-track {
    width: 40px;
    height: 22px;
    background: #cbd5e1;
    border-radius: 11px;
    position: relative;
    transition: background 0.2s;
  }

  .btn-toggle.activa .toggle-track {
    background: #22c55e;
  }

  .toggle-thumb {
    width: 18px;
    height: 18px;
    background: white;
    border-radius: 50%;
    position: absolute;
    top: 2px;
    left: 2px;
    transition: transform 0.2s;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }

  .btn-toggle.activa .toggle-thumb {
    transform: translateX(18px);
  }

  .toggle-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: #64748b;
  }

  .btn-toggle.activa .toggle-label {
    color: #22c55e;
  }

  /* Badges de estado */
  .status-badges {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .badge {
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .badge-success {
    background: #d1fae5;
    color: #065f46;
  }

  .badge-info {
    background: #dbeafe;
    color: #1e40af;
  }

  .badge-warning {
    background: #fef3c7;
    color: #92400e;
  }

  .badge-gray {
    background: #f1f5f9;
    color: #64748b;
  }

  .btn-icon {
    background: none;
    border: none;
    padding: 8px;
    cursor: pointer;
    color: #64748b;
    border-radius: 8px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-icon:hover {
    background: #eef2ff;
    color: #6366f1;
  }

  .table-row {
    display: flex;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #f1f5f9;
    transition: background 0.2s;
  }

  .table-row:hover {
    background: #fafbfc;
  }

  .table-row:last-child {
    border-bottom: none;
  }

  .btn-editar {
    background: none;
    border: none;
    padding: 8px;
    cursor: pointer;
    color: #64748b;
    border-radius: 8px;
    transition: all 0.2s;
  }

  .btn-editar:hover {
    background: #eef2ff;
    color: #6366f1;
  }

  /* Botones */
  .btn-primary {
    display: flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.9375rem;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }

  .btn-primary:disabled {
    background: #94a3b8;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .btn-secondary {
    display: flex;
    align-items: center;
    gap: 8px;
    background: white;
    color: #475569;
    border: 2px solid #e2e8f0;
    padding: 10px 22px;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 500;
    font-size: 0.9375rem;
    transition: all 0.2s;
  }

  .btn-secondary:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
  }

  .btn-header-primary {
    display: flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.9375rem;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  }

  .btn-header-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
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
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  }

  .modal-large {
    max-width: 900px;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 28px 32px 20px;
    border-bottom: 1px solid #e2e8f0;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: #0f172a;
    font-weight: 700;
  }

  .modal-subtitle {
    margin: 6px 0 0 0;
    font-size: 0.9375rem;
    color: #64748b;
  }

  .modal-close {
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 1.75rem;
    cursor: pointer;
    padding: 4px 8px;
    line-height: 1;
    border-radius: 6px;
    transition: all 0.2s;
  }

  .modal-close:hover {
    color: #0f172a;
    background: #f1f5f9;
  }

  .modal-body {
    padding: 28px 32px;
  }

  .modal-footer {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 20px 32px 28px;
    border-top: 1px solid #e2e8f0;
  }

  /* Formulario */
  .form-section {
    margin-bottom: 28px;
  }

  .form-label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: #0f172a;
    font-size: 0.9375rem;
  }

  .form-help {
    margin: 0 0 16px 0;
    font-size: 0.875rem;
    color: #64748b;
    line-height: 1.5;
  }

  .form-row {
    display: flex;
    gap: 16px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group:last-child {
    margin-bottom: 0;
  }

  .flex-1 {
    flex: 1;
  }

  .form-input {
    width: 100%;
    padding: 12px 16px;
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 10px;
    color: #0f172a;
    font-size: 0.9375rem;
    transition: all 0.2s;
  }

  .form-input:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
  }

  .input-with-prefix {
    display: flex;
    align-items: center;
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 10px;
    overflow: hidden;
    transition: all 0.2s;
  }

  .input-with-prefix:focus-within {
    border-color: #6366f1;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
  }

  .input-prefix {
    padding: 12px 0 12px 16px;
    color: #64748b;
    font-size: 0.9375rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .input-with-prefix .form-input {
    border: none;
    padding-left: 4px;
    flex: 1;
  }

  .input-with-prefix .form-input:focus {
    box-shadow: none;
  }

  /* Grid de tipos */
  .tipo-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }

  .tipo-card {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 16px;
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
    position: relative;
  }

  .tipo-card:hover {
    border-color: #cbd5e1;
    background: #fafbfc;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .tipo-card.selected {
    border-color: #6366f1;
    background: #eef2ff;
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.2);
  }

  .tipo-card:disabled {
    opacity: 0.7;
    cursor: wait;
  }

  .tipo-card-icon {
    width: 46px;
    height: 46px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.375rem;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .tipo-card-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .tipo-card-name {
    font-weight: 600;
    color: #0f172a;
    font-size: 0.9375rem;
  }

  .tipo-card-desc {
    font-size: 0.8125rem;
    color: #64748b;
    line-height: 1.4;
  }

  .tipo-card-badge {
    display: inline-block;
    margin-top: 6px;
    padding: 3px 10px;
    background: #dbeafe;
    color: #1d4ed8;
    font-size: 0.6875rem;
    font-weight: 600;
    border-radius: 10px;
  }

  .tipo-card-loading {
    position: absolute;
    top: 12px;
    right: 12px;
  }

  /* Grid de plantillas */
  .plantilla-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 18px;
  }

  .plantilla-card {
    display: flex;
    flex-direction: column;
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 14px;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }

  .plantilla-card:hover {
    border-color: #cbd5e1;
    box-shadow: 0 8px 16px rgba(0,0,0,0.12);
    transform: translateY(-4px);
  }

  .plantilla-card.selected {
    border-color: #6366f1;
  }

  .plantilla-card.premium {
    border-color: #f59e0b;
  }

  .plantilla-preview {
    height: 140px;
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }

  .plantilla-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .plantilla-blank {
    color: #cbd5e1;
  }

  .plantilla-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    font-weight: 700;
    color: rgba(0,0,0,0.1);
  }

  .plantilla-featured-badge, .plantilla-premium-badge {
    position: absolute;
    top: 10px;
    padding: 4px 10px;
    font-size: 0.625rem;
    font-weight: 700;
    border-radius: 6px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .plantilla-featured-badge {
    left: 10px;
    background: #6366f1;
    color: white;
  }

  .plantilla-premium-badge {
    right: 10px;
    background: #f59e0b;
    color: white;
  }

  .plantilla-info {
    padding: 14px;
  }

  .plantilla-name {
    display: block;
    font-weight: 600;
    color: #0f172a;
    font-size: 0.9375rem;
    margin-bottom: 4px;
  }

  .plantilla-desc {
    font-size: 0.8125rem;
    color: #64748b;
    line-height: 1.4;
  }

  .plantilla-check {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 28px;
    height: 28px;
    background: #6366f1;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    z-index: 1;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
  }

  /* Resumen de selección */
  .selection-summary {
    display: flex;
    gap: 28px;
    padding: 20px;
    background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
    border-radius: 12px;
    margin-bottom: 28px;
    border: 1px solid #e2e8f0;
  }

  .summary-item {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .summary-label {
    font-size: 0.75rem;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
  }

  .summary-value {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
    color: #0f172a;
    font-size: 0.9375rem;
  }

  .summary-icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9375rem;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  }

  @media (max-width: 1024px) {
    .feature-banner {
      flex-direction: column;
      gap: 20px;
    }

    .feature-stats {
      width: 100%;
      justify-content: center;
    }
  }

  @media (max-width: 768px) {
    .tipo-grid {
      grid-template-columns: 1fr;
    }

    .plantilla-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .form-row {
      flex-direction: column;
    }

    .selection-summary {
      flex-direction: column;
      gap: 16px;
    }

    .tabs-container {
      flex-direction: column;
    }

    .tab {
      justify-content: flex-start;
    }
  }
`;
