/**
 * CrmWebSeccionEditar - Editor de secciones amigable
 *
 * Diseño pensado para usuarios no técnicos:
 * - Tabs para variantes con vista previa
 * - Formularios visuales sin JSON
 * - Editor de enlaces intuitivo
 * - Todo en español y claro
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getCatalogoComponentes,
  getSeccionesPorTipo,
  saveSeccion,
  activarVariante as apiActivarVariante,
  CatalogoComponente,
  SeccionConfig,
  VarianteInfo,
  CampoConfig,
} from '../../../services/api';

// Componente para editar enlaces de navegación
function EditorEnlaces({
  enlaces,
  onChange,
}: {
  enlaces: Array<{ texto: string; url: string }>;
  onChange: (enlaces: Array<{ texto: string; url: string }>) => void;
}) {
  const addEnlace = () => {
    onChange([...enlaces, { texto: '', url: '' }]);
  };

  const updateEnlace = (index: number, field: 'texto' | 'url', value: string) => {
    const updated = [...enlaces];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeEnlace = (index: number) => {
    onChange(enlaces.filter((_, i) => i !== index));
  };

  const moveEnlace = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === enlaces.length - 1)
    ) {
      return;
    }
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...enlaces];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated);
  };

  return (
    <div className="editor-enlaces">
      {enlaces.length === 0 ? (
        <p className="sin-enlaces">No hay enlaces configurados</p>
      ) : (
        <div className="lista-enlaces">
          {enlaces.map((enlace, index) => (
            <div key={index} className="enlace-item">
              <div className="enlace-orden">
                <button
                  type="button"
                  onClick={() => moveEnlace(index, 'up')}
                  disabled={index === 0}
                  title="Mover arriba"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveEnlace(index, 'down')}
                  disabled={index === enlaces.length - 1}
                  title="Mover abajo"
                >
                  ↓
                </button>
              </div>
              <div className="enlace-campos">
                <input
                  type="text"
                  placeholder="Texto del enlace (ej: Inicio)"
                  value={enlace.texto}
                  onChange={(e) => updateEnlace(index, 'texto', e.target.value)}
                />
                <input
                  type="text"
                  placeholder="URL (ej: /inicio o /propiedades)"
                  value={enlace.url}
                  onChange={(e) => updateEnlace(index, 'url', e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn-eliminar-enlace"
                onClick={() => removeEnlace(index)}
                title="Eliminar enlace"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <button type="button" className="btn-agregar-enlace" onClick={addEnlace}>
        + Agregar enlace
      </button>
    </div>
  );
}

// Componente para editar redes sociales
function EditorRedesSociales({
  redes,
  onChange,
}: {
  redes: Array<{ red: string; url: string }>;
  onChange: (redes: Array<{ red: string; url: string }>) => void;
}) {
  const redesDisponibles = [
    { id: 'facebook', nombre: 'Facebook', placeholder: 'https://facebook.com/tupagina' },
    { id: 'instagram', nombre: 'Instagram', placeholder: 'https://instagram.com/tucuenta' },
    { id: 'twitter', nombre: 'Twitter / X', placeholder: 'https://twitter.com/tucuenta' },
    { id: 'linkedin', nombre: 'LinkedIn', placeholder: 'https://linkedin.com/company/tuempresa' },
    { id: 'youtube', nombre: 'YouTube', placeholder: 'https://youtube.com/@tucanal' },
    { id: 'tiktok', nombre: 'TikTok', placeholder: 'https://tiktok.com/@tucuenta' },
    { id: 'whatsapp', nombre: 'WhatsApp', placeholder: 'https://wa.me/1234567890' },
  ];

  const addRed = () => {
    onChange([...redes, { red: 'facebook', url: '' }]);
  };

  const updateRed = (index: number, field: 'red' | 'url', value: string) => {
    const updated = [...redes];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeRed = (index: number) => {
    onChange(redes.filter((_, i) => i !== index));
  };

  return (
    <div className="editor-redes">
      {redes.length === 0 ? (
        <p className="sin-redes">No hay redes sociales configuradas</p>
      ) : (
        <div className="lista-redes">
          {redes.map((red, index) => {
            const redInfo = redesDisponibles.find((r) => r.id === red.red);
            return (
              <div key={index} className="red-item">
                <select
                  value={red.red}
                  onChange={(e) => updateRed(index, 'red', e.target.value)}
                >
                  {redesDisponibles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder={redInfo?.placeholder || 'URL de tu perfil'}
                  value={red.url}
                  onChange={(e) => updateRed(index, 'url', e.target.value)}
                />
                <button
                  type="button"
                  className="btn-eliminar-red"
                  onClick={() => removeRed(index)}
                  title="Eliminar"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
      <button type="button" className="btn-agregar-red" onClick={addRed}>
        + Agregar red social
      </button>
    </div>
  );
}

// Vista previa del Header
function HeaderPreview({ variante, config }: { variante: string; config: Record<string, any> }) {
  const enlaces = config.links || [];
  const logo = config.logo;
  const mostrarBoton = config.mostrarBotonContacto !== false;
  const textoBoton = config.textoBotonContacto || 'Contactar';

  return (
    <div className="header-preview">
      <div className="preview-container">
        <div className="preview-header">
          <div className="preview-logo">
            {logo ? (
              <img src={logo} alt="Logo" />
            ) : (
              <span className="logo-placeholder">Tu Logo</span>
            )}
          </div>
          <nav className="preview-nav">
            {enlaces.length > 0 ? (
              enlaces.map((e: any, i: number) => (
                <span key={i} className="preview-link">
                  {e.texto || 'Enlace'}
                </span>
              ))
            ) : (
              <>
                <span className="preview-link placeholder">Inicio</span>
                <span className="preview-link placeholder">Propiedades</span>
                <span className="preview-link placeholder">Contacto</span>
              </>
            )}
          </nav>
          {mostrarBoton && (
            <button className="preview-cta">{textoBoton}</button>
          )}
        </div>
      </div>
      <p className="preview-note">Vista previa del header en tu sitio web</p>
    </div>
  );
}

// Vista previa del Footer
function FooterPreview({ variante, config }: { variante: string; config: Record<string, any> }) {
  return (
    <div className="footer-preview">
      <div className="preview-container dark">
        <div className="preview-footer">
          <div className="footer-col">
            {config.logo ? (
              <img src={config.logo} alt="Logo" className="footer-logo" />
            ) : (
              <span className="logo-placeholder">Tu Logo</span>
            )}
            <p className="footer-desc">{config.descripcion || 'Descripción de tu empresa...'}</p>
          </div>
          <div className="footer-col">
            <h4>Enlaces</h4>
            <span>Inicio</span>
            <span>Propiedades</span>
            <span>Contacto</span>
          </div>
          <div className="footer-col">
            <h4>Contacto</h4>
            <span>{config.telefono || 'Tu teléfono'}</span>
            <span>{config.email || 'tu@email.com'}</span>
            <span>{config.direccion || 'Tu dirección'}</span>
          </div>
        </div>
        <div className="footer-bottom">
          {config.copyright || '© 2024 Tu Empresa. Todos los derechos reservados.'}
        </div>
      </div>
      <p className="preview-note">Vista previa del pie de página</p>
    </div>
  );
}

// Vista previa del Hero
function HeroPreview({ variante, config }: { variante: string; config: Record<string, any> }) {
  const varianteLabels: Record<string, string> = {
    default: 'Centrado',
    variant1: 'Dividido (texto izquierda)',
    variant2: 'Con búsqueda',
    variant3: 'Lateral (texto derecha)',
  };

  return (
    <div className="hero-preview">
      <div
        className={`preview-container hero-style ${variante}`}
        style={{
          backgroundImage: config.imagenFondo ? `url(${config.imagenFondo})` : undefined,
        }}
      >
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1>{config.titulo || 'Tu Título Principal'}</h1>
          <p>{config.subtitulo || 'Un subtítulo que describe tu negocio'}</p>
          {config.textoBoton && (
            <button className="hero-btn">{config.textoBoton}</button>
          )}
        </div>
      </div>
      <p className="preview-note">Estilo: {varianteLabels[variante] || variante}</p>
    </div>
  );
}

// Componente genérico de preview
function ComponentPreview({
  tipo,
  variante,
  config,
}: {
  tipo: string;
  variante: string;
  config: Record<string, any>;
}) {
  switch (tipo) {
    case 'header':
      return <HeaderPreview variante={variante} config={config} />;
    case 'footer':
      return <FooterPreview variante={variante} config={config} />;
    case 'hero':
      return <HeroPreview variante={variante} config={config} />;
    default:
      return (
        <div className="generic-preview">
          <div className="preview-placeholder-box">
            <span>Vista previa no disponible</span>
          </div>
        </div>
      );
  }
}

export default function CrmWebSeccionEditar() {
  const { tenantSlug, tipoSeccion } = useParams<{ tenantSlug: string; tipoSeccion: string }>();
  const navigate = useNavigate();
  const { tenantActual } = useAuth();

  const [componente, setComponente] = useState<CatalogoComponente | null>(null);
  const [configuraciones, setConfiguraciones] = useState<Record<string, SeccionConfig>>({});
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<string>('default');
  const [varianteActiva, setVarianteActiva] = useState<string>('default');
  const [configData, setConfigData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Cargar datos
  useEffect(() => {
    async function loadData() {
      if (!tenantActual?.id || !tipoSeccion) return;

      try {
        setLoading(true);
        setError(null);

        const [catalogoData, seccionesData] = await Promise.all([
          getCatalogoComponentes(tenantActual.id),
          getSeccionesPorTipo(tenantActual.id, tipoSeccion),
        ]);

        const comp = catalogoData.find((c) => c.tipo === tipoSeccion);
        if (!comp) {
          setError(`Sección "${tipoSeccion}" no encontrada`);
          return;
        }
        setComponente(comp);

        const configMap: Record<string, SeccionConfig> = {};
        let activeVariant = comp.variantes[0]?.id || 'default';

        seccionesData.forEach((sec) => {
          configMap[sec.variante] = sec;
          if (sec.esActivo) {
            activeVariant = sec.variante;
          }
        });

        setConfiguraciones(configMap);
        setVarianteActiva(activeVariant);
        setVarianteSeleccionada(activeVariant);

        if (configMap[activeVariant]) {
          // Combinar static_data y toggles en un solo objeto
          const datos = configMap[activeVariant].datos || {};
          setConfigData({
            ...(datos.static_data || {}),
            ...(datos.toggles || {}),
          });
        } else {
          setConfigData(getDefaultConfig(comp.camposConfig));
        }
      } catch (err: any) {
        console.error('Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [tenantActual?.id, tipoSeccion]);

  const getDefaultConfig = (campos: CampoConfig[]): Record<string, any> => {
    const defaults: Record<string, any> = {};
    campos.forEach((campo) => {
      if (campo.default !== undefined) {
        defaults[campo.key] = campo.default;
      }
      // Inicializar arrays vacíos
      if (campo.type === 'array') {
        defaults[campo.key] = [];
      }
    });
    return defaults;
  };

  // Combina static_data y toggles en un solo objeto para el formulario
  const combinarDatos = (datos: Record<string, any>): Record<string, any> => {
    return {
      ...(datos.static_data || {}),
      ...(datos.toggles || {}),
    };
  };

  const handleVarianteChange = (varianteId: string) => {
    if (hasChanges) {
      if (!confirm('Tienes cambios sin guardar. ¿Deseas cambiar de variante?')) {
        return;
      }
    }

    setVarianteSeleccionada(varianteId);
    setHasChanges(false);

    if (configuraciones[varianteId]) {
      // Combinar static_data y toggles
      const datos = configuraciones[varianteId].datos || {};
      setConfigData({
        ...(datos.static_data || {}),
        ...(datos.toggles || {}),
      });
    } else {
      setConfigData(getDefaultConfig(componente?.camposConfig || []));
    }
  };

  const handleSave = async () => {
    if (!tenantActual?.id || !componente) return;

    try {
      setSaving(true);
      setError(null);

      const existingConfig = configuraciones[varianteSeleccionada];

      // Separar los campos booleanos para toggles
      const toggleKeys = ['mostrarBotonContacto', 'mostrarBusqueda', 'mostrarMenu'];
      const toggles: Record<string, boolean> = {};
      const staticDataClean: Record<string, any> = {};

      Object.entries(configData).forEach(([key, value]) => {
        if (toggleKeys.includes(key) && typeof value === 'boolean') {
          toggles[key] = value;
        } else {
          staticDataClean[key] = value;
        }
      });

      const seccionToSave: SeccionConfig = {
        id: existingConfig?.id,
        tipo: componente.tipo,
        variante: varianteSeleccionada,
        datos: {
          static_data: staticDataClean,
          toggles: toggles,
        },
        activo: true,
        orden: existingConfig?.orden ?? 0,
        scope: 'tenant',
        configCompleta: true,
        esActivo: true, // Marcar como activo al guardar
      };

      const saved = await saveSeccion(tenantActual.id, seccionToSave);

      setConfiguraciones((prev) => ({
        ...prev,
        [varianteSeleccionada]: saved,
      }));
      setHasChanges(false);
      setSuccessMessage('¡Cambios guardados!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleActivar = async () => {
    if (!tenantActual?.id || !componente) return;

    if (hasChanges) {
      await handleSave();
    }

    try {
      await apiActivarVariante(tenantActual.id, componente.tipo, varianteSeleccionada);

      setVarianteActiva(varianteSeleccionada);
      setConfiguraciones((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((key) => {
          updated[key] = { ...updated[key], esActivo: key === varianteSeleccionada };
        });
        return updated;
      });

      setSuccessMessage('¡Variante activada! Los cambios ya están en tu sitio web.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleConfigChange = (key: string, value: any) => {
    setConfigData((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleBack = () => {
    if (hasChanges && !confirm('Tienes cambios sin guardar. ¿Deseas salir?')) {
      return;
    }
    navigate(`/crm/${tenantSlug}/web/secciones`);
  };

  const getVarianteInfo = (varianteId: string): VarianteInfo | undefined => {
    return componente?.variantes.find((v) => v.id === varianteId);
  };

  // Loading
  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner"></div>
        <p>Cargando...</p>
        <style>{loadingStyles}</style>
      </div>
    );
  }

  if (!componente) {
    return (
      <div className="error-page">
        <h2>Error</h2>
        <p>{error || 'No se encontró la sección'}</p>
        <button onClick={handleBack}>← Volver</button>
        <style>{errorStyles}</style>
      </div>
    );
  }

  const varianteInfo = getVarianteInfo(varianteSeleccionada);
  const tieneMultiplesVariantes = componente.variantes.length > 1;

  return (
    <div className="seccion-editor">
      {/* Header */}
      <header className="editor-header">
        <button className="btn-volver" onClick={handleBack}>
          ← Volver
        </button>
        <div className="editor-titulo">
          <span className="editor-icono">{componente.icono}</span>
          <h1>{componente.nombre}</h1>
        </div>
        <div className="editor-acciones">
          {varianteSeleccionada !== varianteActiva && (
            <button className="btn-activar" onClick={handleActivar}>
              Usar esta variante
            </button>
          )}
          <button
            className="btn-guardar"
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </header>

      {/* Mensajes */}
      {error && (
        <div className="mensaje error">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
      {successMessage && (
        <div className="mensaje success">
          <span>{successMessage}</span>
        </div>
      )}

      {/* Tabs de variantes (solo si hay más de una) */}
      {tieneMultiplesVariantes && (
        <div className="variantes-tabs">
          {componente.variantes.map((variante) => {
            const isActiva = variante.id === varianteActiva;
            const isSelected = variante.id === varianteSeleccionada;

            return (
              <button
                key={variante.id}
                className={`tab ${isSelected ? 'selected' : ''} ${isActiva ? 'activa' : ''}`}
                onClick={() => handleVarianteChange(variante.id)}
              >
                <span className="tab-nombre">{variante.nombre}</span>
                {isActiva && <span className="tab-badge">En uso</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Contenido principal */}
      <div className="editor-contenido">
        {/* Descripción de la variante */}
        {varianteInfo && (
          <p className="variante-descripcion">{varianteInfo.descripcion}</p>
        )}

        {/* Vista previa */}
        <section className="seccion-preview">
          <h2>Vista previa</h2>
          <ComponentPreview
            tipo={componente.tipo}
            variante={varianteSeleccionada}
            config={configData}
          />
        </section>

        {/* Formulario de configuración */}
        <section className="seccion-config">
          <h2>Configuración</h2>

          <div className="config-form">
            {componente.camposConfig.map((campo) => (
              <div key={campo.key} className="campo-grupo">
                {/* Campos de texto */}
                {(campo.type === 'text' || campo.type === 'email') && (
                  <>
                    <label>{campo.label}</label>
                    <input
                      type={campo.type}
                      value={configData[campo.key] || ''}
                      onChange={(e) => handleConfigChange(campo.key, e.target.value)}
                      placeholder={getPlaceholder(campo.key)}
                    />
                  </>
                )}

                {/* Textarea */}
                {campo.type === 'textarea' && (
                  <>
                    <label>{campo.label}</label>
                    <textarea
                      value={configData[campo.key] || ''}
                      onChange={(e) => handleConfigChange(campo.key, e.target.value)}
                      rows={3}
                      placeholder={getPlaceholder(campo.key)}
                    />
                  </>
                )}

                {/* Imagen */}
                {campo.type === 'image' && (
                  <>
                    <label>{campo.label}</label>
                    <div className="campo-imagen">
                      <input
                        type="text"
                        value={configData[campo.key] || ''}
                        onChange={(e) => handleConfigChange(campo.key, e.target.value)}
                        placeholder="Pega aquí la URL de tu imagen"
                      />
                      {configData[campo.key] && (
                        <div className="imagen-preview">
                          <img src={configData[campo.key]} alt="Vista previa" />
                        </div>
                      )}
                      <p className="campo-ayuda">
                        Sube tu imagen a un servicio como Imgur o Cloudinary y pega el enlace aquí
                      </p>
                    </div>
                  </>
                )}

                {/* Toggle/Boolean */}
                {campo.type === 'boolean' && (
                  <div className="campo-toggle">
                    <label className="toggle-label">
                      <span>{campo.label}</span>
                      <div
                        className={`toggle ${configData[campo.key] ? 'activo' : ''}`}
                        onClick={() => handleConfigChange(campo.key, !configData[campo.key])}
                      >
                        <div className="toggle-circle"></div>
                      </div>
                    </label>
                  </div>
                )}

                {/* Number */}
                {campo.type === 'number' && (
                  <>
                    <label>{campo.label}</label>
                    <input
                      type="number"
                      value={configData[campo.key] ?? campo.default ?? ''}
                      onChange={(e) => handleConfigChange(campo.key, parseInt(e.target.value) || 0)}
                    />
                  </>
                )}

                {/* Color */}
                {campo.type === 'color' && (
                  <>
                    <label>{campo.label}</label>
                    <div className="campo-color">
                      <input
                        type="color"
                        value={configData[campo.key] || '#3b82f6'}
                        onChange={(e) => handleConfigChange(campo.key, e.target.value)}
                      />
                      <span>{configData[campo.key] || '#3b82f6'}</span>
                    </div>
                  </>
                )}

                {/* Arrays - Enlaces */}
                {campo.type === 'array' && campo.key === 'links' && (
                  <>
                    <label>{campo.label}</label>
                    <EditorEnlaces
                      enlaces={configData[campo.key] || []}
                      onChange={(value) => handleConfigChange(campo.key, value)}
                    />
                  </>
                )}

                {/* Arrays - Redes Sociales */}
                {campo.type === 'array' && campo.key === 'redesSociales' && (
                  <>
                    <label>{campo.label}</label>
                    <EditorRedesSociales
                      redes={configData[campo.key] || []}
                      onChange={(value) => handleConfigChange(campo.key, value)}
                    />
                  </>
                )}

                {/* Arrays - Columnas de enlaces (footer) */}
                {campo.type === 'array' && campo.key === 'columnas' && (
                  <>
                    <label>{campo.label}</label>
                    <p className="campo-ayuda">
                      Las columnas de enlaces se configurarán en una próxima actualización.
                      Por ahora, los enlaces del menú principal se mostrarán automáticamente.
                    </p>
                  </>
                )}

                {/* Arrays genéricos */}
                {campo.type === 'array' &&
                  !['links', 'redesSociales', 'columnas'].includes(campo.key) && (
                    <>
                      <label>{campo.label}</label>
                      <p className="campo-ayuda">
                        Este campo se configurará en una próxima actualización.
                      </p>
                    </>
                  )}
              </div>
            ))}
          </div>
        </section>
      </div>

      <style>{editorStyles}</style>
    </div>
  );
}

// Función auxiliar para placeholders
function getPlaceholder(key: string): string {
  const placeholders: Record<string, string> = {
    titulo: 'Ej: Encuentra tu hogar ideal',
    subtitulo: 'Ej: Las mejores propiedades de la ciudad',
    descripcion: 'Ej: Somos una inmobiliaria con 20 años de experiencia...',
    textoBoton: 'Ej: Ver propiedades',
    urlBoton: 'Ej: /propiedades',
    textoBotonContacto: 'Ej: Contactar',
    urlBotonContacto: 'Ej: /contacto',
    copyright: 'Ej: © 2024 Tu Inmobiliaria. Todos los derechos reservados.',
    telefono: 'Ej: +1 234 567 890',
    email: 'Ej: contacto@tuinmobiliaria.com',
    direccion: 'Ej: Calle Principal 123, Ciudad',
    logo: 'URL de tu logo',
    logoAlt: 'Nombre de tu empresa (para accesibilidad)',
  };
  return placeholders[key] || '';
}

// Estilos
const loadingStyles = `
  .loading-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px;
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
`;

const errorStyles = `
  .error-page {
    text-align: center;
    padding: 80px;
    color: #f87171;
  }
  .error-page button {
    margin-top: 24px;
    padding: 12px 24px;
    background: #334155;
    border: none;
    border-radius: 8px;
    color: #f1f5f9;
    cursor: pointer;
  }
`;

const editorStyles = `
  .seccion-editor {
    max-width: 1000px;
    margin: 0 auto;
  }

  /* Header */
  .editor-header {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 0;
    border-bottom: 1px solid #334155;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }

  .btn-volver {
    padding: 8px 16px;
    background: transparent;
    border: 1px solid #475569;
    border-radius: 6px;
    color: #94a3b8;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .btn-volver:hover {
    background: #1e293b;
    color: #f1f5f9;
  }

  .editor-titulo {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .editor-icono {
    font-size: 2rem;
  }

  .editor-titulo h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .editor-acciones {
    display: flex;
    gap: 12px;
  }

  .btn-activar {
    padding: 10px 20px;
    background: #22c55e;
    border: none;
    border-radius: 8px;
    color: white;
    cursor: pointer;
    font-weight: 500;
  }

  .btn-activar:hover {
    background: #16a34a;
  }

  .btn-guardar {
    padding: 10px 24px;
    background: #3b82f6;
    border: none;
    border-radius: 8px;
    color: white;
    cursor: pointer;
    font-weight: 500;
  }

  .btn-guardar:hover:not(:disabled) {
    background: #2563eb;
  }

  .btn-guardar:disabled {
    background: #475569;
    cursor: default;
  }

  /* Mensajes */
  .mensaje {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 16px;
  }

  .mensaje.error {
    background: #dc262620;
    border: 1px solid #dc2626;
    color: #fca5a5;
  }

  .mensaje.success {
    background: #22c55e20;
    border: 1px solid #22c55e;
    color: #4ade80;
  }

  .mensaje button {
    background: none;
    border: none;
    color: inherit;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0 4px;
  }

  /* Tabs de variantes */
  .variantes-tabs {
    display: flex;
    gap: 8px;
    padding-bottom: 24px;
    border-bottom: 1px solid #334155;
    margin-bottom: 24px;
    overflow-x: auto;
  }

  .tab {
    padding: 12px 20px;
    background: #1e293b;
    border: 2px solid #334155;
    border-radius: 8px;
    color: #94a3b8;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
    transition: all 0.2s;
  }

  .tab:hover {
    border-color: #475569;
    color: #f1f5f9;
  }

  .tab.selected {
    background: #0f172a;
    border-color: #3b82f6;
    color: #f1f5f9;
  }

  .tab.activa .tab-badge {
    background: #22c55e;
    color: white;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 600;
  }

  .tab-nombre {
    font-weight: 500;
  }

  /* Contenido */
  .editor-contenido {
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .variante-descripcion {
    color: #94a3b8;
    font-size: 1rem;
    margin: 0;
    padding: 16px;
    background: #1e293b;
    border-radius: 8px;
    border-left: 4px solid #3b82f6;
  }

  /* Secciones */
  .seccion-preview,
  .seccion-config {
    background: #1e293b;
    border-radius: 12px;
    padding: 24px;
  }

  .seccion-preview h2,
  .seccion-config h2 {
    margin: 0 0 20px 0;
    font-size: 1.1rem;
    color: #e2e8f0;
    font-weight: 600;
  }

  /* Previews */
  .preview-container {
    background: #f8fafc;
    border-radius: 8px;
    overflow: hidden;
  }

  .preview-container.dark {
    background: #1e293b;
  }

  .preview-note {
    text-align: center;
    color: #64748b;
    font-size: 0.85rem;
    margin: 12px 0 0 0;
  }

  /* Header Preview */
  .preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    background: white;
    color: #1e293b;
  }

  .preview-logo img {
    height: 32px;
    object-fit: contain;
  }

  .logo-placeholder {
    color: #94a3b8;
    font-size: 0.9rem;
    padding: 8px 16px;
    background: #f1f5f9;
    border-radius: 4px;
  }

  .preview-nav {
    display: flex;
    gap: 20px;
  }

  .preview-link {
    color: #475569;
    font-size: 0.9rem;
  }

  .preview-link.placeholder {
    color: #cbd5e1;
  }

  .preview-cta {
    padding: 8px 16px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.85rem;
  }

  /* Footer Preview */
  .preview-footer {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 24px;
    padding: 24px;
    color: #94a3b8;
    font-size: 0.85rem;
  }

  .footer-col {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .footer-col h4 {
    color: #f1f5f9;
    margin: 0 0 8px 0;
    font-size: 0.9rem;
  }

  .footer-logo {
    height: 32px;
    object-fit: contain;
  }

  .footer-desc {
    margin: 0;
    line-height: 1.5;
  }

  .footer-bottom {
    text-align: center;
    padding: 16px;
    border-top: 1px solid #334155;
    color: #64748b;
    font-size: 0.8rem;
  }

  /* Hero Preview */
  .hero-style {
    position: relative;
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-size: cover;
    background-position: center;
    background-color: #1e293b;
  }

  .hero-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
  }

  .hero-content {
    position: relative;
    text-align: center;
    color: white;
    padding: 24px;
  }

  .hero-content h1 {
    margin: 0 0 8px 0;
    font-size: 1.5rem;
  }

  .hero-content p {
    margin: 0 0 16px 0;
    opacity: 0.9;
  }

  .hero-btn {
    padding: 10px 24px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }

  /* Formulario */
  .config-form {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .campo-grupo {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .campo-grupo > label {
    font-weight: 500;
    color: #e2e8f0;
    font-size: 0.95rem;
  }

  .campo-grupo input[type="text"],
  .campo-grupo input[type="email"],
  .campo-grupo input[type="number"],
  .campo-grupo textarea {
    padding: 12px 16px;
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 8px;
    color: #f1f5f9;
    font-size: 1rem;
  }

  .campo-grupo input:focus,
  .campo-grupo textarea:focus {
    outline: none;
    border-color: #3b82f6;
  }

  .campo-grupo input::placeholder,
  .campo-grupo textarea::placeholder {
    color: #64748b;
  }

  .campo-ayuda {
    font-size: 0.85rem;
    color: #64748b;
    margin: 4px 0 0 0;
  }

  /* Imagen */
  .campo-imagen {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .imagen-preview {
    max-width: 200px;
    border-radius: 8px;
    overflow: hidden;
    background: #0f172a;
  }

  .imagen-preview img {
    width: 100%;
    height: auto;
  }

  /* Toggle */
  .campo-toggle {
    padding: 12px 0;
  }

  .toggle-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
  }

  .toggle {
    width: 52px;
    height: 28px;
    background: #475569;
    border-radius: 14px;
    position: relative;
    transition: background 0.2s;
  }

  .toggle.activo {
    background: #3b82f6;
  }

  .toggle-circle {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 22px;
    height: 22px;
    background: white;
    border-radius: 50%;
    transition: transform 0.2s;
  }

  .toggle.activo .toggle-circle {
    transform: translateX(24px);
  }

  /* Color */
  .campo-color {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .campo-color input[type="color"] {
    width: 48px;
    height: 48px;
    padding: 0;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }

  .campo-color span {
    color: #94a3b8;
    font-family: monospace;
  }

  /* Editor de enlaces */
  .editor-enlaces {
    background: #0f172a;
    border-radius: 8px;
    padding: 16px;
  }

  .sin-enlaces {
    color: #64748b;
    text-align: center;
    padding: 20px;
    margin: 0;
  }

  .lista-enlaces {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;
  }

  .enlace-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: #1e293b;
    border-radius: 8px;
  }

  .enlace-orden {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .enlace-orden button {
    width: 28px;
    height: 28px;
    background: #334155;
    border: none;
    border-radius: 4px;
    color: #94a3b8;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .enlace-orden button:hover:not(:disabled) {
    background: #475569;
    color: #f1f5f9;
  }

  .enlace-orden button:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .enlace-campos {
    flex: 1;
    display: flex;
    gap: 12px;
  }

  .enlace-campos input {
    flex: 1;
    padding: 10px 12px;
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 6px;
    color: #f1f5f9;
    font-size: 0.9rem;
  }

  .enlace-campos input:focus {
    outline: none;
    border-color: #3b82f6;
  }

  .btn-eliminar-enlace {
    width: 32px;
    height: 32px;
    background: #dc262640;
    border: none;
    border-radius: 6px;
    color: #f87171;
    cursor: pointer;
    font-size: 1.2rem;
  }

  .btn-eliminar-enlace:hover {
    background: #dc2626;
    color: white;
  }

  .btn-agregar-enlace {
    width: 100%;
    padding: 12px;
    background: transparent;
    border: 2px dashed #334155;
    border-radius: 8px;
    color: #64748b;
    cursor: pointer;
    font-size: 0.95rem;
  }

  .btn-agregar-enlace:hover {
    border-color: #3b82f6;
    color: #3b82f6;
  }

  /* Editor de redes */
  .editor-redes {
    background: #0f172a;
    border-radius: 8px;
    padding: 16px;
  }

  .sin-redes {
    color: #64748b;
    text-align: center;
    padding: 20px;
    margin: 0;
  }

  .lista-redes {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;
  }

  .red-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: #1e293b;
    border-radius: 8px;
  }

  .red-item select {
    padding: 10px 12px;
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 6px;
    color: #f1f5f9;
    font-size: 0.9rem;
    min-width: 140px;
  }

  .red-item input {
    flex: 1;
    padding: 10px 12px;
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 6px;
    color: #f1f5f9;
    font-size: 0.9rem;
  }

  .red-item input:focus,
  .red-item select:focus {
    outline: none;
    border-color: #3b82f6;
  }

  .btn-eliminar-red {
    width: 32px;
    height: 32px;
    background: #dc262640;
    border: none;
    border-radius: 6px;
    color: #f87171;
    cursor: pointer;
    font-size: 1.2rem;
  }

  .btn-eliminar-red:hover {
    background: #dc2626;
    color: white;
  }

  .btn-agregar-red {
    width: 100%;
    padding: 12px;
    background: transparent;
    border: 2px dashed #334155;
    border-radius: 8px;
    color: #64748b;
    cursor: pointer;
    font-size: 0.95rem;
  }

  .btn-agregar-red:hover {
    border-color: #3b82f6;
    color: #3b82f6;
  }

  /* Generic preview placeholder */
  .generic-preview .preview-placeholder-box {
    padding: 60px;
    text-align: center;
    background: #0f172a;
    border-radius: 8px;
    color: #64748b;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .editor-header {
      flex-direction: column;
      align-items: stretch;
    }

    .editor-titulo {
      justify-content: center;
    }

    .editor-acciones {
      justify-content: center;
    }

    .variantes-tabs {
      justify-content: center;
    }

    .preview-header {
      flex-direction: column;
      gap: 12px;
      text-align: center;
    }

    .preview-footer {
      grid-template-columns: 1fr;
    }

    .enlace-campos {
      flex-direction: column;
    }
  }
`;
