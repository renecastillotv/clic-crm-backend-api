/**
 * CrmConfiguracion - Configuración general del tenant
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import {
  getMonedasCatalogo,
  getTenantMonedas,
  setTenantMonedasHabilitadas,
  getTema,
  updateTema,
  DEFAULT_CRM_COLORS,
  type Moneda,
  type TemaColores
} from '../../services/api';
import { DollarSign, X, Check, Star, Building2, ChevronRight, Users, MapPin, List, Palette, RotateCcw } from 'lucide-react';

interface MonedaHabilitada {
  codigo: string;
  esDefault: boolean;
}

export default function CrmConfiguracion() {
  const { tenantActual } = useAuth();
  const { setPageHeader } = usePageHeader();
  const navigate = useNavigate();

  // Estado para modal de monedas
  const [showMonedasModal, setShowMonedasModal] = useState(false);
  const [todasMonedas, setTodasMonedas] = useState<Moneda[]>([]);
  const [monedasHabilitadas, setMonedasHabilitadas] = useState<MonedaHabilitada[]>([]);
  const [loadingMonedas, setLoadingMonedas] = useState(false);
  const [savingMonedas, setSavingMonedas] = useState(false);
  const [monedaDefault, setMonedaDefault] = useState<string>('USD');

  // Estado para modal de colores CRM
  const [showColoresModal, setShowColoresModal] = useState(false);
  const [loadingColores, setLoadingColores] = useState(false);
  const [savingColores, setSavingColores] = useState(false);
  const [previewEnTiempoReal, setPreviewEnTiempoReal] = useState(true);
  const [coloresOriginales, setColoresOriginales] = useState<Partial<TemaColores> | null>(null);
  const [coloresCRM, setColoresCRM] = useState({
    crmPrimary: DEFAULT_CRM_COLORS.crmPrimary,
    sidebarBgStart: DEFAULT_CRM_COLORS.sidebarBgStart,
    sidebarBgEnd: DEFAULT_CRM_COLORS.sidebarBgEnd,
    sidebarText: DEFAULT_CRM_COLORS.sidebarText,
    sidebarTextActive: DEFAULT_CRM_COLORS.sidebarTextActive,
    sidebarHoverBg: DEFAULT_CRM_COLORS.sidebarHoverBg,
    sidebarActiveBg: DEFAULT_CRM_COLORS.sidebarActiveBg,
    sidebarIconColor: DEFAULT_CRM_COLORS.sidebarIconColor,
    sidebarIconActive: DEFAULT_CRM_COLORS.sidebarIconActive,
    sidebarIconCollapsed: DEFAULT_CRM_COLORS.sidebarIconCollapsed,
  });

  // Configurar header de la página
  useEffect(() => {
    setPageHeader({
      title: 'Configuración General',
      subtitle: `Ajustes generales de ${tenantActual?.nombre || 'tu CRM'}`,
    });
  }, [setPageHeader, tenantActual?.nombre]);

  // Cargar monedas cuando se abre el modal
  const abrirModalMonedas = async () => {
    setShowMonedasModal(true);
    setLoadingMonedas(true);

    try {
      // Cargar todas las monedas del catálogo
      const catalogo = await getMonedasCatalogo(true);
      setTodasMonedas(catalogo);

      // Cargar monedas habilitadas del tenant
      if (tenantActual?.id) {
        const habilitadas = await getTenantMonedas(tenantActual.id);

        // Si hay monedas configuradas, usar esas
        if (habilitadas.length > 0 && habilitadas.some(m => m.esDefault !== undefined)) {
          const config = habilitadas.map(m => ({
            codigo: m.codigo,
            esDefault: m.esDefault || false
          }));
          setMonedasHabilitadas(config);
          const defaultMoneda = config.find(m => m.esDefault);
          if (defaultMoneda) {
            setMonedaDefault(defaultMoneda.codigo);
          }
        } else {
          // Si no hay config, USD por defecto
          setMonedasHabilitadas([{ codigo: 'USD', esDefault: true }]);
          setMonedaDefault('USD');
        }
      }
    } catch (error) {
      console.error('Error al cargar monedas:', error);
    } finally {
      setLoadingMonedas(false);
    }
  };

  // Toggle moneda habilitada
  const toggleMoneda = (codigo: string) => {
    setMonedasHabilitadas(prev => {
      const existe = prev.find(m => m.codigo === codigo);
      if (existe) {
        // Si es la única o la default, no permitir deshabilitar
        if (prev.length === 1 || existe.esDefault) {
          return prev;
        }
        return prev.filter(m => m.codigo !== codigo);
      } else {
        return [...prev, { codigo, esDefault: false }];
      }
    });
  };

  // Establecer moneda por defecto
  const setDefault = (codigo: string) => {
    // Primero asegurar que esté habilitada
    setMonedasHabilitadas(prev => {
      const existe = prev.find(m => m.codigo === codigo);
      if (!existe) {
        return [...prev.map(m => ({ ...m, esDefault: false })), { codigo, esDefault: true }];
      }
      return prev.map(m => ({ ...m, esDefault: m.codigo === codigo }));
    });
    setMonedaDefault(codigo);
  };

  // Guardar configuración
  const guardarMonedas = async () => {
    if (!tenantActual?.id) return;

    setSavingMonedas(true);
    try {
      await setTenantMonedasHabilitadas(tenantActual.id, monedasHabilitadas);
      setShowMonedasModal(false);
    } catch (error) {
      console.error('Error al guardar monedas:', error);
      alert('Error al guardar la configuración de monedas');
    } finally {
      setSavingMonedas(false);
    }
  };

  // Aplicar colores al DOM para preview
  const aplicarColoresPreview = (colors: typeof coloresCRM) => {
    // Inyectar un <style> dinámico para sobrescribir las variables CSS
    const styleId = 'crm-dynamic-theme';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = `
      .crm-layout {
        --bg-sidebar: linear-gradient(180deg, ${colors.sidebarBgStart} 0%, ${colors.sidebarBgEnd} 100%) !important;
        --sidebar-text: ${colors.sidebarText} !important;
        --sidebar-text-active: ${colors.sidebarTextActive} !important;
        --sidebar-hover-text: ${colors.sidebarTextActive} !important;
        --sidebar-hover-bg: ${colors.sidebarHoverBg} !important;
        --sidebar-active-bg: ${colors.sidebarActiveBg} !important;
        --sidebar-icon-color: ${colors.sidebarIconColor} !important;
        --sidebar-icon-active: ${colors.sidebarIconActive} !important;
        --sidebar-icon-hover: ${colors.sidebarIconActive} !important;
        --sidebar-icon-collapsed: ${colors.sidebarIconCollapsed} !important;
        --primary: ${colors.crmPrimary} !important;
        --primary-light: ${colors.crmPrimary} !important;
      }

      /* Estilos directos para nav-item (menú principal) */
      .crm-layout .crm-sidebar .nav-item {
        color: ${colors.sidebarText} !important;
      }
      .crm-layout .crm-sidebar .nav-item .nav-icon {
        color: ${colors.sidebarIconColor} !important;
      }
      .crm-layout .crm-sidebar .nav-item:hover {
        background: ${colors.sidebarHoverBg} !important;
        color: ${colors.sidebarTextActive} !important;
      }
      .crm-layout .crm-sidebar .nav-item:hover .nav-icon {
        color: ${colors.sidebarIconActive} !important;
      }
      .crm-layout .crm-sidebar .nav-item.active {
        background: transparent !important;
        color: ${colors.sidebarTextActive} !important;
      }
      .crm-layout .crm-sidebar .nav-item.active::after {
        background: ${colors.sidebarIconActive} !important;
      }
      .crm-layout .crm-sidebar .nav-item.active .nav-icon {
        color: ${colors.sidebarIconActive} !important;
      }

      /* Estilos directos para nav-subitem (subsecciones) */
      .crm-layout .crm-sidebar .nav-subitem {
        color: ${colors.sidebarText} !important;
      }
      .crm-layout .crm-sidebar .nav-subitem:hover {
        background: ${colors.sidebarHoverBg} !important;
        color: ${colors.sidebarTextActive} !important;
      }
      .crm-layout .crm-sidebar .nav-subitem.active {
        background: ${colors.sidebarActiveBg} !important;
        color: ${colors.sidebarTextActive} !important;
      }

      /* Estilos para iconos en modo colapsado */
      .crm-layout .crm-sidebar.collapsed .nav-item .nav-icon {
        color: ${colors.sidebarIconColor} !important;
      }
      .crm-layout .crm-sidebar.collapsed .nav-item:hover .nav-icon {
        color: ${colors.sidebarIconActive} !important;
      }
      .crm-layout .crm-sidebar.collapsed .nav-item.active .nav-icon {
        color: ${colors.sidebarIconCollapsed} !important;
      }
    `;
  };

  // Abrir modal de colores
  const abrirModalColores = async () => {
    setShowColoresModal(true);
    setLoadingColores(true);

    try {
      if (tenantActual?.id) {
        const tema = await getTema(tenantActual.id);
        const coloresActuales = {
          crmPrimary: tema.crmPrimary || DEFAULT_CRM_COLORS.crmPrimary,
          sidebarBgStart: tema.sidebarBgStart || DEFAULT_CRM_COLORS.sidebarBgStart,
          sidebarBgEnd: tema.sidebarBgEnd || DEFAULT_CRM_COLORS.sidebarBgEnd,
          sidebarText: tema.sidebarText || DEFAULT_CRM_COLORS.sidebarText,
          sidebarTextActive: tema.sidebarTextActive || DEFAULT_CRM_COLORS.sidebarTextActive,
          sidebarHoverBg: tema.sidebarHoverBg || DEFAULT_CRM_COLORS.sidebarHoverBg,
          sidebarActiveBg: tema.sidebarActiveBg || DEFAULT_CRM_COLORS.sidebarActiveBg,
          sidebarIconColor: tema.sidebarIconColor || DEFAULT_CRM_COLORS.sidebarIconColor,
          sidebarIconActive: tema.sidebarIconActive || DEFAULT_CRM_COLORS.sidebarIconActive,
          sidebarIconCollapsed: tema.sidebarIconCollapsed || DEFAULT_CRM_COLORS.sidebarIconCollapsed,
        };
        setColoresCRM(coloresActuales);
        setColoresOriginales(tema);
      }
    } catch (error) {
      console.error('Error al cargar colores:', error);
    } finally {
      setLoadingColores(false);
    }
  };

  // Manejar cambio de color
  const handleColorChange = (campo: keyof typeof coloresCRM, valor: string) => {
    const nuevosColores = { ...coloresCRM, [campo]: valor };
    setColoresCRM(nuevosColores);
    if (previewEnTiempoReal) {
      aplicarColoresPreview(nuevosColores);
    }
  };

  // Restaurar valores por defecto
  const restaurarColoresDefault = () => {
    const defaults = {
      crmPrimary: DEFAULT_CRM_COLORS.crmPrimary,
      sidebarBgStart: DEFAULT_CRM_COLORS.sidebarBgStart,
      sidebarBgEnd: DEFAULT_CRM_COLORS.sidebarBgEnd,
      sidebarText: DEFAULT_CRM_COLORS.sidebarText,
      sidebarTextActive: DEFAULT_CRM_COLORS.sidebarTextActive,
      sidebarHoverBg: DEFAULT_CRM_COLORS.sidebarHoverBg,
      sidebarActiveBg: DEFAULT_CRM_COLORS.sidebarActiveBg,
      sidebarIconColor: DEFAULT_CRM_COLORS.sidebarIconColor,
      sidebarIconActive: DEFAULT_CRM_COLORS.sidebarIconActive,
      sidebarIconCollapsed: DEFAULT_CRM_COLORS.sidebarIconCollapsed,
    };
    setColoresCRM(defaults);
    if (previewEnTiempoReal) {
      aplicarColoresPreview(defaults);
    }
  };

  // Cancelar y restaurar colores originales
  const cancelarColores = () => {
    if (coloresOriginales) {
      const originales = {
        crmPrimary: coloresOriginales.crmPrimary || DEFAULT_CRM_COLORS.crmPrimary,
        sidebarBgStart: coloresOriginales.sidebarBgStart || DEFAULT_CRM_COLORS.sidebarBgStart,
        sidebarBgEnd: coloresOriginales.sidebarBgEnd || DEFAULT_CRM_COLORS.sidebarBgEnd,
        sidebarText: coloresOriginales.sidebarText || DEFAULT_CRM_COLORS.sidebarText,
        sidebarTextActive: coloresOriginales.sidebarTextActive || DEFAULT_CRM_COLORS.sidebarTextActive,
        sidebarHoverBg: coloresOriginales.sidebarHoverBg || DEFAULT_CRM_COLORS.sidebarHoverBg,
        sidebarActiveBg: coloresOriginales.sidebarActiveBg || DEFAULT_CRM_COLORS.sidebarActiveBg,
        sidebarIconColor: coloresOriginales.sidebarIconColor || DEFAULT_CRM_COLORS.sidebarIconColor,
        sidebarIconActive: coloresOriginales.sidebarIconActive || DEFAULT_CRM_COLORS.sidebarIconActive,
        sidebarIconCollapsed: coloresOriginales.sidebarIconCollapsed || DEFAULT_CRM_COLORS.sidebarIconCollapsed,
      };
      aplicarColoresPreview(originales);
    }
    setShowColoresModal(false);
  };

  // Guardar colores
  const guardarColores = async () => {
    if (!tenantActual?.id) return;

    setSavingColores(true);
    try {
      // Obtener el tema actual y mezclarlo con los nuevos colores
      const temaActual = coloresOriginales || {};
      const temaActualizado = {
        ...temaActual,
        ...coloresCRM,
      };
      await updateTema(tenantActual.id, temaActualizado as TemaColores);
      setColoresOriginales(temaActualizado);
      setShowColoresModal(false);
    } catch (error) {
      console.error('Error al guardar colores:', error);
      alert('Error al guardar los colores');
    } finally {
      setSavingColores(false);
    }
  };

  return (
    <div className="page">
      <div className="settings-grid">
        {/* Tarjeta de Info del Negocio - Navega a página dedicada */}
        <div
          className="settings-card settings-card-active"
          onClick={() => navigate('negocio')}
        >
          <div className="card-header">
            <div className="card-icon card-icon-primary">
              <Building2 size={24} />
            </div>
            <h3>Información del Negocio</h3>
          </div>
          <p className="card-desc">Logo, datos de contacto, horarios, redes sociales y más</p>
          <div className="card-action">
            <span>Configurar</span>
            <ChevronRight size={18} />
          </div>
        </div>

        {/* Tarjeta de Monedas */}
        <div className="settings-card settings-card-active" onClick={abrirModalMonedas}>
          <div className="card-header">
            <div className="card-icon card-icon-success">
              <DollarSign size={24} />
            </div>
            <h3>Monedas</h3>
          </div>
          <p className="card-desc">Configura las monedas disponibles para tus propiedades</p>
          <div className="card-action">
            <span>Configurar</span>
            <ChevronRight size={18} />
          </div>
        </div>

        {/* Tarjeta de Equipos */}
        <div
          className="settings-card settings-card-active"
          onClick={() => navigate('equipos')}
        >
          <div className="card-header">
            <div className="card-icon card-icon-purple">
              <Users size={24} />
            </div>
            <h3>Equipos de Trabajo</h3>
          </div>
          <p className="card-desc">Organiza tu personal en equipos con líderes y asistentes</p>
          <div className="card-action">
            <span>Configurar</span>
            <ChevronRight size={18} />
          </div>
        </div>

        {/* Tarjeta de Oficinas */}
        <div
          className="settings-card settings-card-active"
          onClick={() => navigate('oficinas')}
        >
          <div className="card-header">
            <div className="card-icon card-icon-orange">
              <MapPin size={24} />
            </div>
            <h3>Oficinas / Franquicias</h3>
          </div>
          <p className="card-desc">Gestiona las oficinas y sus zonas de trabajo</p>
          <div className="card-action">
            <span>Configurar</span>
            <ChevronRight size={18} />
          </div>
        </div>

        {/* Tarjeta de Personalizar Elementos */}
        <div
          className="settings-card settings-card-active"
          onClick={() => navigate('personalizar')}
        >
          <div className="card-header">
            <div className="card-icon card-icon-cyan">
              <List size={24} />
            </div>
            <h3>Personalizar Elementos</h3>
          </div>
          <p className="card-desc">Tipos de propiedad, contacto, actividades, etiquetas y más</p>
          <div className="card-action">
            <span>Configurar</span>
            <ChevronRight size={18} />
          </div>
        </div>

        {/* Tarjeta de Colores del CRM */}
        <div className="settings-card settings-card-active" onClick={abrirModalColores}>
          <div className="card-header">
            <div className="card-icon card-icon-pink">
              <Palette size={24} />
            </div>
            <h3>Colores del CRM</h3>
          </div>
          <p className="card-desc">Personaliza los colores del sidebar y tema del panel</p>
          <div className="card-action">
            <span>Configurar</span>
            <ChevronRight size={18} />
          </div>
        </div>

        <div className="settings-card">
          <div className="card-header">
            <div className="card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </div>
            <h3>Dominio Personalizado</h3>
          </div>
          <p className="card-desc">Configura un dominio propio para tu sitio web inmobiliario</p>
          <span className="card-status">Próximamente</span>
        </div>

        <div className="settings-card">
          <div className="card-header">
            <div className="card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <h3>Notificaciones</h3>
          </div>
          <p className="card-desc">Configura las alertas de email para nuevos leads y mensajes</p>
          <span className="card-status">Próximamente</span>
        </div>

        <div
          className="settings-card settings-card-active"
          onClick={() => navigate('contenido-permisos')}
        >
          <div className="card-header">
            <div className="card-icon card-icon-orange">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <h3>Permisos de Contenido</h3>
          </div>
          <p className="card-desc">Controla qué tipos de contenido pueden crear los usuarios</p>
          <div className="card-action">
            <span>Configurar</span>
            <ChevronRight size={18} />
          </div>
        </div>

        <div className="settings-card">
          <div className="card-header">
            <div className="card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h3>Seguridad</h3>
          </div>
          <p className="card-desc">Permisos de usuarios y configuración de acceso</p>
          <span className="card-status">Próximamente</span>
        </div>
      </div>

      {/* Modal de Configuración de Monedas */}
      {showMonedasModal && (
        <div className="modal-overlay" onClick={() => setShowMonedasModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Configurar Monedas</h2>
              <button className="modal-close" onClick={() => setShowMonedasModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {loadingMonedas ? (
                <div className="loading-state">Cargando monedas...</div>
              ) : (
                <>
                  <p className="modal-desc">
                    Selecciona las monedas que estarán disponibles para publicar propiedades.
                    La moneda marcada con estrella será la predeterminada.
                  </p>

                  <div className="monedas-list">
                    {todasMonedas.map(moneda => {
                      const habilitada = monedasHabilitadas.find(m => m.codigo === moneda.codigo);
                      const esDefault = monedaDefault === moneda.codigo;

                      return (
                        <div
                          key={moneda.codigo}
                          className={`moneda-item ${habilitada ? 'moneda-habilitada' : ''} ${esDefault ? 'moneda-default' : ''}`}
                        >
                          <div className="moneda-info">
                            <span className="moneda-simbolo">{moneda.simbolo}</span>
                            <div className="moneda-details">
                              <span className="moneda-codigo">{moneda.codigo}</span>
                              <span className="moneda-nombre">{moneda.nombre}</span>
                            </div>
                          </div>

                          <div className="moneda-actions">
                            {habilitada && (
                              <button
                                className={`btn-default ${esDefault ? 'is-default' : ''}`}
                                onClick={() => setDefault(moneda.codigo)}
                                title={esDefault ? 'Moneda por defecto' : 'Establecer como predeterminada'}
                              >
                                <Star size={16} fill={esDefault ? 'currentColor' : 'none'} />
                              </button>
                            )}
                            <button
                              className={`btn-toggle ${habilitada ? 'is-enabled' : ''}`}
                              onClick={() => toggleMoneda(moneda.codigo)}
                              disabled={habilitada && (monedasHabilitadas.length === 1 || esDefault)}
                            >
                              {habilitada ? <Check size={16} /> : null}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowMonedasModal(false)}
              >
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={guardarMonedas}
                disabled={savingMonedas || monedasHabilitadas.length === 0}
              >
                {savingMonedas ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuración de Colores CRM */}
      {showColoresModal && (
        <div className="modal-overlay" onClick={cancelarColores}>
          <div className="modal-content modal-colores" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Colores del CRM</h2>
              <button className="modal-close" onClick={cancelarColores}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {loadingColores ? (
                <div className="loading-state">Cargando colores...</div>
              ) : (
                <>
                  <div className="colores-options">
                    <label className="checkbox-option">
                      <input
                        type="checkbox"
                        checked={previewEnTiempoReal}
                        onChange={(e) => setPreviewEnTiempoReal(e.target.checked)}
                      />
                      <span>Vista previa en tiempo real</span>
                    </label>
                    <button className="btn-restore" onClick={restaurarColoresDefault}>
                      <RotateCcw size={14} />
                      Restaurar valores por defecto
                    </button>
                  </div>

                  <div className="colores-section">
                    <h4>Color Principal</h4>
                    <div className="color-picker-row">
                      <label>Color primario del CRM</label>
                      <div className="color-input-group">
                        <input
                          type="color"
                          value={coloresCRM.crmPrimary}
                          onChange={(e) => handleColorChange('crmPrimary', e.target.value)}
                        />
                        <input
                          type="text"
                          value={coloresCRM.crmPrimary}
                          onChange={(e) => handleColorChange('crmPrimary', e.target.value)}
                          className="color-text-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="colores-section">
                    <h4>Gradiente del Sidebar</h4>
                    <div className="color-picker-row">
                      <label>Color inicio (arriba)</label>
                      <div className="color-input-group">
                        <input
                          type="color"
                          value={coloresCRM.sidebarBgStart}
                          onChange={(e) => handleColorChange('sidebarBgStart', e.target.value)}
                        />
                        <input
                          type="text"
                          value={coloresCRM.sidebarBgStart}
                          onChange={(e) => handleColorChange('sidebarBgStart', e.target.value)}
                          className="color-text-input"
                        />
                      </div>
                    </div>
                    <div className="color-picker-row">
                      <label>Color fin (abajo)</label>
                      <div className="color-input-group">
                        <input
                          type="color"
                          value={coloresCRM.sidebarBgEnd}
                          onChange={(e) => handleColorChange('sidebarBgEnd', e.target.value)}
                        />
                        <input
                          type="text"
                          value={coloresCRM.sidebarBgEnd}
                          onChange={(e) => handleColorChange('sidebarBgEnd', e.target.value)}
                          className="color-text-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="colores-section">
                    <h4>Texto del Sidebar</h4>
                    <div className="color-picker-row">
                      <label>Texto normal</label>
                      <div className="color-input-group">
                        <input
                          type="color"
                          value={coloresCRM.sidebarText}
                          onChange={(e) => handleColorChange('sidebarText', e.target.value)}
                        />
                        <input
                          type="text"
                          value={coloresCRM.sidebarText}
                          onChange={(e) => handleColorChange('sidebarText', e.target.value)}
                          className="color-text-input"
                        />
                      </div>
                    </div>
                    <div className="color-picker-row">
                      <label>Texto activo / hover</label>
                      <div className="color-input-group">
                        <input
                          type="color"
                          value={coloresCRM.sidebarTextActive}
                          onChange={(e) => handleColorChange('sidebarTextActive', e.target.value)}
                        />
                        <input
                          type="text"
                          value={coloresCRM.sidebarTextActive}
                          onChange={(e) => handleColorChange('sidebarTextActive', e.target.value)}
                          className="color-text-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="colores-section">
                    <h4>Iconos del Sidebar</h4>
                    <div className="color-picker-row">
                      <label>Iconos normales</label>
                      <div className="color-input-group">
                        <input
                          type="color"
                          value={coloresCRM.sidebarIconColor}
                          onChange={(e) => handleColorChange('sidebarIconColor', e.target.value)}
                        />
                        <input
                          type="text"
                          value={coloresCRM.sidebarIconColor}
                          onChange={(e) => handleColorChange('sidebarIconColor', e.target.value)}
                          className="color-text-input"
                        />
                      </div>
                    </div>
                    <div className="color-picker-row">
                      <label>Iconos activos / hover</label>
                      <div className="color-input-group">
                        <input
                          type="color"
                          value={coloresCRM.sidebarIconActive}
                          onChange={(e) => handleColorChange('sidebarIconActive', e.target.value)}
                        />
                        <input
                          type="text"
                          value={coloresCRM.sidebarIconActive}
                          onChange={(e) => handleColorChange('sidebarIconActive', e.target.value)}
                          className="color-text-input"
                        />
                      </div>
                    </div>
                    <div className="color-picker-row">
                      <label>Iconos (modo colapsado)</label>
                      <div className="color-input-group">
                        <input
                          type="color"
                          value={coloresCRM.sidebarIconCollapsed}
                          onChange={(e) => handleColorChange('sidebarIconCollapsed', e.target.value)}
                        />
                        <input
                          type="text"
                          value={coloresCRM.sidebarIconCollapsed}
                          onChange={(e) => handleColorChange('sidebarIconCollapsed', e.target.value)}
                          className="color-text-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="colores-section">
                    <h4>Fondos de Estado</h4>
                    <p className="section-hint">Estos valores aceptan RGBA para transparencia</p>
                    <div className="color-picker-row">
                      <label>Fondo hover</label>
                      <div className="color-input-group color-input-rgba">
                        <input
                          type="text"
                          value={coloresCRM.sidebarHoverBg}
                          onChange={(e) => handleColorChange('sidebarHoverBg', e.target.value)}
                          className="color-text-input-full"
                          placeholder="rgba(59, 130, 246, 0.18)"
                        />
                      </div>
                    </div>
                    <div className="color-picker-row">
                      <label>Fondo activo</label>
                      <div className="color-input-group color-input-rgba">
                        <input
                          type="text"
                          value={coloresCRM.sidebarActiveBg}
                          onChange={(e) => handleColorChange('sidebarActiveBg', e.target.value)}
                          className="color-text-input-full"
                          placeholder="rgba(59, 130, 246, 0.35)"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={cancelarColores}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={guardarColores}
                disabled={savingColores}
              >
                {savingColores ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .page {
          width: 100%;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }

        .settings-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 24px;
          transition: all 0.2s;
        }

        .settings-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .settings-card-active {
          cursor: pointer;
        }

        .settings-card-active:hover {
          border-color: #2563eb;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .card-icon {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eff6ff;
          color: #2563eb;
          border-radius: 10px;
          flex-shrink: 0;
        }

        .card-icon-success {
          background: #ecfdf5;
          color: #059669;
        }

        .card-icon-purple {
          background: #f3e8ff;
          color: #9333ea;
        }

        .card-icon-orange {
          background: #fff7ed;
          color: #ea580c;
        }

        .card-icon-cyan {
          background: #ecfeff;
          color: #0891b2;
        }

        .card-icon-primary {
          background: #eff6ff;
          color: #2563eb;
        }

        .card-header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #0f172a;
        }

        .card-desc {
          margin: 0 0 16px 0;
          color: #64748b;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .card-status {
          display: inline-block;
          padding: 4px 12px;
          background: #f1f5f9;
          color: #64748b;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .card-button {
          display: inline-block;
          padding: 8px 16px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .card-button:hover {
          background: #1d4ed8;
        }

        .card-action {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #2563eb;
          color: white;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          transition: background 0.2s;
        }

        .settings-card-active:hover .card-action {
          background: #1d4ed8;
        }

        /* Modal styles */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 560px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #0f172a;
        }

        .modal-close {
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          color: #64748b;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .modal-close:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .modal-body {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }

        .modal-desc {
          margin: 0 0 20px 0;
          color: #64748b;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .loading-state {
          text-align: center;
          padding: 40px;
          color: #64748b;
        }

        .monedas-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .moneda-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          transition: all 0.2s;
        }

        .moneda-item:hover {
          background: #f1f5f9;
        }

        .moneda-habilitada {
          background: #ecfdf5;
          border-color: #a7f3d0;
        }

        .moneda-default {
          background: #fef3c7;
          border-color: #fcd34d;
        }

        .moneda-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .moneda-simbolo {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1rem;
          color: #0f172a;
        }

        .moneda-details {
          display: flex;
          flex-direction: column;
        }

        .moneda-codigo {
          font-weight: 600;
          color: #0f172a;
          font-size: 0.9rem;
        }

        .moneda-nombre {
          font-size: 0.8rem;
          color: #64748b;
        }

        .moneda-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-default {
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          color: #94a3b8;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .btn-default:hover {
          color: #f59e0b;
          background: #fef3c7;
        }

        .btn-default.is-default {
          color: #f59e0b;
        }

        .btn-toggle {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          color: #94a3b8;
          transition: all 0.2s;
        }

        .btn-toggle:hover:not(:disabled) {
          border-color: #2563eb;
          color: #2563eb;
        }

        .btn-toggle.is-enabled {
          background: #2563eb;
          border-color: #2563eb;
          color: white;
        }

        .btn-toggle:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #e2e8f0;
        }

        .btn-secondary {
          padding: 10px 20px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .btn-primary {
          padding: 10px 20px;
          background: #2563eb;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Estilos para el icono rosa/pink */
        .card-icon-pink {
          background: #fce7f3;
          color: #db2777;
        }

        /* Modal de colores */
        .modal-colores {
          max-width: 640px;
          max-height: 90vh;
        }

        .modal-colores .modal-body {
          max-height: calc(90vh - 140px);
          overflow-y: auto;
        }

        .colores-options {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e2e8f0;
        }

        .checkbox-option {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 0.875rem;
          color: #475569;
        }

        .checkbox-option input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: #2563eb;
        }

        .btn-restore {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.75rem;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-restore:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
          color: #475569;
        }

        .colores-section {
          margin-bottom: 20px;
        }

        .colores-section h4 {
          margin: 0 0 12px 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: #0f172a;
        }

        .section-hint {
          margin: -8px 0 12px 0;
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .color-picker-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: #f8fafc;
          border-radius: 8px;
          margin-bottom: 8px;
        }

        .color-picker-row label {
          font-size: 0.875rem;
          color: #475569;
        }

        .color-input-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .color-input-group input[type="color"] {
          width: 36px;
          height: 36px;
          padding: 2px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          background: white;
        }

        .color-input-group input[type="color"]:hover {
          border-color: #cbd5e1;
        }

        .color-text-input {
          width: 90px;
          padding: 8px 10px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.8rem;
          font-family: monospace;
          color: #475569;
          background: white;
        }

        .color-text-input:focus {
          outline: none;
          border-color: #2563eb;
        }

        .color-input-rgba {
          flex: 1;
          max-width: 280px;
        }

        .color-text-input-full {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.8rem;
          font-family: monospace;
          color: #475569;
          background: white;
        }

        .color-text-input-full:focus {
          outline: none;
          border-color: #2563eb;
        }
      `}</style>
    </div>
  );
}
