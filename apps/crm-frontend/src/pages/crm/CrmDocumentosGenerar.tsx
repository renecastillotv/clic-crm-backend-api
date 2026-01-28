/**
 * CrmDocumentosGenerar - Wizard para generar documentos desde plantillas
 *
 * Pasos:
 * 1. Seleccionar plantilla
 * 2. Seleccionar contacto (opcional)
 * 3. Seleccionar propiedad (opcional)
 * 4. Revisar/editar datos
 * 5. Generar y descargar
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import { apiFetch } from '../../utils/api';
import {
  FileText,
  ChevronRight,
  ChevronLeft,
  Check,
  User,
  Building,
  Eye,
  Download,
  Loader2,
  Search,
  X,
  AlertCircle,
  FileSignature,
  Home,
  Key,
  CheckCircle2,
  FolderOpen,
} from 'lucide-react';

// ==================== INTERFACES ====================

interface PlantillaDocumento {
  id: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  campos_requeridos: CampoPlantilla[];
  requiere_firma: boolean;
}

interface CampoPlantilla {
  nombre: string;
  label: string;
  tipo: 'text' | 'number' | 'date' | 'currency' | 'textarea' | 'select';
  fuente?: string;
  opciones?: string[];
  requerido?: boolean;
  valorDefault?: string;
}

interface Contacto {
  id: string;
  nombre: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  empresa?: string;
}

interface Propiedad {
  id: string;
  titulo: string;
  codigo?: string;
  tipo?: string;
  direccion?: string;
  precio_venta?: number;
  precio_alquiler?: number;
}

interface PreviewResult {
  html: string;
  datos: Record<string, any>;
}

interface GenerarResult {
  documento_id: string;
  nombre: string;
  url_documento: string;
  html_renderizado: string;
}

const CATEGORIAS = [
  { value: 'captacion', label: 'Captación', icon: <Home size={16} /> },
  { value: 'venta', label: 'Venta', icon: <FileSignature size={16} /> },
  { value: 'alquiler', label: 'Alquiler', icon: <Key size={16} /> },
  { value: 'legal', label: 'Legal', icon: <FileText size={16} /> },
  { value: 'kyc', label: 'KYC', icon: <CheckCircle2 size={16} /> },
  { value: 'otro', label: 'Otro', icon: <FolderOpen size={16} /> },
];

// ==================== COMPONENT ====================

export default function CrmDocumentosGenerar() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [searchParams] = useSearchParams();
  const { tenantActual } = useAuth();
  const { getToken } = useClerkAuth();
  const { setPageHeader } = usePageHeader();
  const navigate = useNavigate();

  // Wizard state
  const [paso, setPaso] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Plantilla
  const [plantillas, setPlantillas] = useState<PlantillaDocumento[]>([]);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<PlantillaDocumento | null>(null);
  const [categoriaFiltro, setCategoriaFiltro] = useState('');

  // Step 2: Contacto
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [contactoSeleccionado, setContactoSeleccionado] = useState<Contacto | null>(null);
  const [busquedaContacto, setBusquedaContacto] = useState('');
  const [loadingContactos, setLoadingContactos] = useState(false);

  // Step 3: Propiedad
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [propiedadSeleccionada, setPropiedadSeleccionada] = useState<Propiedad | null>(null);
  const [busquedaPropiedad, setBusquedaPropiedad] = useState('');
  const [loadingPropiedades, setLoadingPropiedades] = useState(false);

  // Step 4: Datos adicionales
  const [datosAdicionales, setDatosAdicionales] = useState<Record<string, string>>({});

  // Step 5: Preview & Generate
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [resultado, setResultado] = useState<GenerarResult | null>(null);

  // ==================== DATA LOADING ====================

  const loadPlantillas = useCallback(async () => {
    if (!tenantActual?.id) return;

    try {
      setLoading(true);
      const token = await getToken();
      let url = `/tenants/${tenantActual.id}/documentos/plantillas?activo=true&es_publica=true`;
      if (categoriaFiltro) {
        url += `&categoria=${categoriaFiltro}`;
      }
      const res = await apiFetch(url, {}, token);
      const data = await res.json();
      setPlantillas(data);
    } catch (err: any) {
      console.error('Error cargando plantillas:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantActual?.id, getToken, categoriaFiltro]);

  useEffect(() => {
    loadPlantillas();
  }, [loadPlantillas]);

  // Pre-select plantilla from URL params
  useEffect(() => {
    const plantillaId = searchParams.get('plantilla');
    if (plantillaId && plantillas.length > 0) {
      const plantilla = plantillas.find(p => p.id === plantillaId);
      if (plantilla) {
        setPlantillaSeleccionada(plantilla);
        setPaso(2);
      }
    }
  }, [searchParams, plantillas]);

  const searchContactos = useCallback(async (query: string) => {
    if (!tenantActual?.id || query.length < 2) {
      setContactos([]);
      return;
    }

    try {
      setLoadingContactos(true);
      const token = await getToken();
      const res = await apiFetch(
        `/tenants/${tenantActual.id}/contactos?busqueda=${encodeURIComponent(query)}&limit=10`,
        {},
        token
      );
      const data = await res.json();
      setContactos(data.data || []);
    } catch (err) {
      console.error('Error buscando contactos:', err);
    } finally {
      setLoadingContactos(false);
    }
  }, [tenantActual?.id, getToken]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (busquedaContacto) {
        searchContactos(busquedaContacto);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [busquedaContacto, searchContactos]);

  const searchPropiedades = useCallback(async (query: string) => {
    if (!tenantActual?.id) return;

    try {
      setLoadingPropiedades(true);
      const token = await getToken();
      let url = `/tenants/${tenantActual.id}/propiedades?limit=10&estado=disponible`;
      if (query) {
        url += `&busqueda=${encodeURIComponent(query)}`;
      }
      const res = await apiFetch(url, {}, token);
      const data = await res.json();
      setPropiedades(data.data || []);
    } catch (err) {
      console.error('Error buscando propiedades:', err);
    } finally {
      setLoadingPropiedades(false);
    }
  }, [tenantActual?.id, getToken]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (paso === 3) {
        searchPropiedades(busquedaPropiedad);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [busquedaPropiedad, searchPropiedades, paso]);

  // ==================== PAGE HEADER ====================

  useEffect(() => {
    setPageHeader({
      title: 'Generar Documento',
      subtitle: resultado
        ? 'Documento generado exitosamente'
        : `Paso ${paso} de 5`,
    });
  }, [setPageHeader, paso, resultado]);

  // ==================== HANDLERS ====================

  const handleNext = async () => {
    if (paso === 4) {
      // Load preview
      await loadPreview();
    }
    setPaso(paso + 1);
  };

  const handleBack = () => {
    if (paso === 5 && resultado) {
      setResultado(null);
    }
    setPaso(paso - 1);
  };

  const loadPreview = async () => {
    if (!tenantActual?.id || !plantillaSeleccionada) return;

    try {
      setLoadingPreview(true);
      const token = await getToken();
      const res = await apiFetch(
        `/tenants/${tenantActual.id}/documentos/previsualizar`,
        {
          method: 'POST',
          body: JSON.stringify({
            plantilla_id: plantillaSeleccionada.id,
            contacto_id: contactoSeleccionado?.id,
            propiedad_id: propiedadSeleccionada?.id,
            datos_adicionales: datosAdicionales,
          }),
        },
        token
      );
      const data = await res.json();
      setPreview(data);
    } catch (err: any) {
      console.error('Error cargando preview:', err);
      alert('Error al cargar vista previa: ' + err.message);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleGenerar = async () => {
    if (!tenantActual?.id || !plantillaSeleccionada) return;

    try {
      setGenerating(true);
      const token = await getToken();
      const res = await apiFetch(
        `/tenants/${tenantActual.id}/documentos/generar`,
        {
          method: 'POST',
          body: JSON.stringify({
            plantilla_id: plantillaSeleccionada.id,
            contacto_id: contactoSeleccionado?.id,
            propiedad_id: propiedadSeleccionada?.id,
            datos_adicionales: datosAdicionales,
          }),
        },
        token
      );
      const data = await res.json();
      setResultado(data);
    } catch (err: any) {
      console.error('Error generando documento:', err);
      alert('Error al generar documento: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const canProceed = () => {
    switch (paso) {
      case 1:
        return !!plantillaSeleccionada;
      case 2:
        return true; // Contacto es opcional
      case 3:
        return true; // Propiedad es opcional
      case 4:
        return true; // Datos adicionales son opcionales
      case 5:
        return true;
      default:
        return false;
    }
  };

  // ==================== RENDER ====================

  const getCategoriaIcon = (cat: string) => {
    return CATEGORIAS.find(c => c.value === cat)?.icon || <FileText size={16} />;
  };

  return (
    <div className="generar-wizard">
      {/* Progress Steps */}
      <div className="wizard-steps">
        {[
          { num: 1, label: 'Plantilla' },
          { num: 2, label: 'Contacto' },
          { num: 3, label: 'Propiedad' },
          { num: 4, label: 'Datos' },
          { num: 5, label: 'Generar' },
        ].map((step) => (
          <div
            key={step.num}
            className={`wizard-step ${paso === step.num ? 'active' : ''} ${paso > step.num ? 'completed' : ''}`}
          >
            <div className="step-number">
              {paso > step.num ? <Check size={16} /> : step.num}
            </div>
            <span className="step-label">{step.label}</span>
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="wizard-content">
        {/* Step 1: Seleccionar Plantilla */}
        {paso === 1 && (
          <div className="step-plantilla">
            <h2>Selecciona una plantilla</h2>

            <div className="filter-bar">
              <select
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
              >
                <option value="">Todas las categorías</option>
                {CATEGORIAS.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="loading-state">
                <Loader2 className="spin" size={24} />
                <span>Cargando plantillas...</span>
              </div>
            ) : plantillas.length === 0 ? (
              <div className="empty-state">
                <FileText size={48} />
                <p>No hay plantillas disponibles</p>
              </div>
            ) : (
              <div className="plantillas-grid">
                {plantillas.map(plantilla => (
                  <div
                    key={plantilla.id}
                    className={`plantilla-option ${plantillaSeleccionada?.id === plantilla.id ? 'selected' : ''}`}
                    onClick={() => setPlantillaSeleccionada(plantilla)}
                  >
                    <div className="plantilla-icon">
                      {getCategoriaIcon(plantilla.categoria)}
                    </div>
                    <div className="plantilla-info">
                      <h4>{plantilla.nombre}</h4>
                      {plantilla.descripcion && <p>{plantilla.descripcion}</p>}
                      <div className="plantilla-meta">
                        <span className="badge">{plantilla.categoria}</span>
                        {plantilla.requiere_firma && (
                          <span className="badge badge-info">Requiere firma</span>
                        )}
                      </div>
                    </div>
                    {plantillaSeleccionada?.id === plantilla.id && (
                      <div className="selected-check">
                        <Check size={20} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Seleccionar Contacto */}
        {paso === 2 && (
          <div className="step-contacto">
            <h2>Selecciona un contacto (opcional)</h2>
            <p className="step-hint">
              Los datos del contacto se usarán para completar automáticamente los campos de la plantilla.
            </p>

            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Buscar contacto por nombre, email o teléfono..."
                value={busquedaContacto}
                onChange={(e) => setBusquedaContacto(e.target.value)}
              />
              {busquedaContacto && (
                <button onClick={() => { setBusquedaContacto(''); setContactos([]); }}>
                  <X size={16} />
                </button>
              )}
            </div>

            {contactoSeleccionado && (
              <div className="selected-item">
                <User size={20} />
                <div className="item-info">
                  <strong>{contactoSeleccionado.nombre} {contactoSeleccionado.apellido}</strong>
                  <span>{contactoSeleccionado.email || contactoSeleccionado.telefono}</span>
                </div>
                <button onClick={() => setContactoSeleccionado(null)} className="remove-btn">
                  <X size={18} />
                </button>
              </div>
            )}

            {loadingContactos ? (
              <div className="loading-state">
                <Loader2 className="spin" size={20} />
                <span>Buscando...</span>
              </div>
            ) : contactos.length > 0 ? (
              <div className="results-list">
                {contactos.map(contacto => (
                  <div
                    key={contacto.id}
                    className={`result-item ${contactoSeleccionado?.id === contacto.id ? 'selected' : ''}`}
                    onClick={() => setContactoSeleccionado(contacto)}
                  >
                    <User size={18} />
                    <div className="item-info">
                      <strong>{contacto.nombre} {contacto.apellido}</strong>
                      <span>{contacto.email || contacto.telefono}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : busquedaContacto.length >= 2 ? (
              <div className="empty-state small">
                <p>No se encontraron contactos</p>
              </div>
            ) : null}
          </div>
        )}

        {/* Step 3: Seleccionar Propiedad */}
        {paso === 3 && (
          <div className="step-propiedad">
            <h2>Selecciona una propiedad (opcional)</h2>
            <p className="step-hint">
              Si el documento está relacionado con una propiedad, selecciónala para completar los datos automáticamente.
            </p>

            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Buscar propiedad por código, título o dirección..."
                value={busquedaPropiedad}
                onChange={(e) => setBusquedaPropiedad(e.target.value)}
              />
              {busquedaPropiedad && (
                <button onClick={() => setBusquedaPropiedad('')}>
                  <X size={16} />
                </button>
              )}
            </div>

            {propiedadSeleccionada && (
              <div className="selected-item">
                <Building size={20} />
                <div className="item-info">
                  <strong>{propiedadSeleccionada.titulo}</strong>
                  <span>{propiedadSeleccionada.codigo} - {propiedadSeleccionada.direccion}</span>
                </div>
                <button onClick={() => setPropiedadSeleccionada(null)} className="remove-btn">
                  <X size={18} />
                </button>
              </div>
            )}

            {loadingPropiedades ? (
              <div className="loading-state">
                <Loader2 className="spin" size={20} />
                <span>Buscando...</span>
              </div>
            ) : propiedades.length > 0 ? (
              <div className="results-list">
                {propiedades.map(propiedad => (
                  <div
                    key={propiedad.id}
                    className={`result-item ${propiedadSeleccionada?.id === propiedad.id ? 'selected' : ''}`}
                    onClick={() => setPropiedadSeleccionada(propiedad)}
                  >
                    <Building size={18} />
                    <div className="item-info">
                      <strong>{propiedad.titulo}</strong>
                      <span>{propiedad.codigo} - {propiedad.tipo}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* Step 4: Datos Adicionales */}
        {paso === 4 && plantillaSeleccionada && (
          <div className="step-datos">
            <h2>Completa los datos adicionales</h2>
            <p className="step-hint">
              Algunos campos se completarán automáticamente con los datos del contacto y propiedad seleccionados.
              Puedes modificarlos o agregar información adicional.
            </p>

            {plantillaSeleccionada.campos_requeridos.length === 0 ? (
              <div className="empty-state small">
                <p>Esta plantilla no requiere datos adicionales.</p>
              </div>
            ) : (
              <div className="campos-form">
                {plantillaSeleccionada.campos_requeridos.map(campo => (
                  <div key={campo.nombre} className="form-group">
                    <label>
                      {campo.label}
                      {campo.requerido && <span className="required">*</span>}
                      {campo.fuente && (
                        <span className="fuente-hint">Auto: {campo.fuente}</span>
                      )}
                    </label>
                    {campo.tipo === 'textarea' ? (
                      <textarea
                        value={datosAdicionales[campo.nombre] || campo.valorDefault || ''}
                        onChange={(e) => setDatosAdicionales({
                          ...datosAdicionales,
                          [campo.nombre]: e.target.value,
                        })}
                        rows={3}
                      />
                    ) : campo.tipo === 'select' && campo.opciones ? (
                      <select
                        value={datosAdicionales[campo.nombre] || campo.valorDefault || ''}
                        onChange={(e) => setDatosAdicionales({
                          ...datosAdicionales,
                          [campo.nombre]: e.target.value,
                        })}
                      >
                        <option value="">Seleccionar...</option>
                        {campo.opciones.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={campo.tipo === 'date' ? 'date' : campo.tipo === 'number' || campo.tipo === 'currency' ? 'number' : 'text'}
                        value={datosAdicionales[campo.nombre] || campo.valorDefault || ''}
                        onChange={(e) => setDatosAdicionales({
                          ...datosAdicionales,
                          [campo.nombre]: e.target.value,
                        })}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 5: Preview & Generate */}
        {paso === 5 && (
          <div className="step-preview">
            {resultado ? (
              <div className="resultado-exito">
                <div className="success-icon">
                  <Check size={48} />
                </div>
                <h2>Documento generado exitosamente</h2>
                <p>{resultado.nombre}</p>

                <div className="resultado-actions">
                  <a
                    href={resultado.url_documento}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                  >
                    <Download size={18} />
                    Descargar PDF
                  </a>
                  <button
                    onClick={() => navigate(`/crm/${tenantSlug}/documentos/biblioteca`)}
                    className="btn-secondary"
                  >
                    Ir a Documentos
                  </button>
                  <button
                    onClick={() => {
                      setResultado(null);
                      setPlantillaSeleccionada(null);
                      setContactoSeleccionado(null);
                      setPropiedadSeleccionada(null);
                      setDatosAdicionales({});
                      setPreview(null);
                      setPaso(1);
                    }}
                    className="btn-ghost"
                  >
                    Generar otro documento
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2>Vista previa del documento</h2>

                <div className="preview-summary">
                  <div className="summary-item">
                    <FileText size={18} />
                    <span><strong>Plantilla:</strong> {plantillaSeleccionada?.nombre}</span>
                  </div>
                  {contactoSeleccionado && (
                    <div className="summary-item">
                      <User size={18} />
                      <span><strong>Contacto:</strong> {contactoSeleccionado.nombre} {contactoSeleccionado.apellido}</span>
                    </div>
                  )}
                  {propiedadSeleccionada && (
                    <div className="summary-item">
                      <Building size={18} />
                      <span><strong>Propiedad:</strong> {propiedadSeleccionada.titulo}</span>
                    </div>
                  )}
                </div>

                {loadingPreview ? (
                  <div className="loading-state">
                    <Loader2 className="spin" size={24} />
                    <span>Generando vista previa...</span>
                  </div>
                ) : preview ? (
                  <div className="preview-frame">
                    <iframe
                      srcDoc={`
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <style>
                            body { font-family: Arial, sans-serif; padding: 20px; margin: 0; }
                          </style>
                        </head>
                        <body>${preview.html}</body>
                        </html>
                      `}
                      title="Preview"
                    />
                  </div>
                ) : (
                  <div className="empty-state">
                    <AlertCircle size={48} />
                    <p>No se pudo cargar la vista previa</p>
                    <button onClick={loadPreview} className="btn-secondary">
                      Reintentar
                    </button>
                  </div>
                )}

                <div className="generate-actions">
                  <button
                    onClick={handleGenerar}
                    disabled={generating || !preview}
                    className="btn-primary btn-large"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="spin" size={20} />
                        Generando...
                      </>
                    ) : (
                      <>
                        <FileText size={20} />
                        Generar Documento
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      {!resultado && (
        <div className="wizard-nav">
          <button
            onClick={handleBack}
            disabled={paso === 1}
            className="btn-ghost"
          >
            <ChevronLeft size={18} />
            Anterior
          </button>

          {paso < 5 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="btn-primary"
            >
              Siguiente
              <ChevronRight size={18} />
            </button>
          ) : null}
        </div>
      )}

      <style>{`
        .generar-wizard {
          max-width: 900px;
          margin: 0 auto;
        }

        .wizard-steps {
          display: flex;
          justify-content: space-between;
          margin-bottom: 32px;
          padding: 0 20px;
        }

        .wizard-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          flex: 1;
          position: relative;
        }

        .wizard-step:not(:last-child)::after {
          content: '';
          position: absolute;
          top: 16px;
          left: 60%;
          width: 80%;
          height: 2px;
          background: var(--border-color);
        }

        .wizard-step.completed:not(:last-child)::after {
          background: var(--primary-500);
        }

        .step-number {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          background: var(--bg-secondary);
          color: var(--text-secondary);
          border: 2px solid var(--border-color);
          position: relative;
          z-index: 1;
        }

        .wizard-step.active .step-number {
          background: var(--primary-500);
          color: white;
          border-color: var(--primary-500);
        }

        .wizard-step.completed .step-number {
          background: var(--primary-500);
          color: white;
          border-color: var(--primary-500);
        }

        .step-label {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .wizard-step.active .step-label {
          color: var(--text-primary);
          font-weight: 500;
        }

        .wizard-content {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 32px;
          min-height: 400px;
        }

        .wizard-content h2 {
          margin: 0 0 8px;
          font-size: 20px;
        }

        .step-hint {
          color: var(--text-secondary);
          margin-bottom: 24px;
        }

        .filter-bar {
          margin-bottom: 20px;
        }

        .filter-bar select {
          padding: 8px 12px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--bg-primary);
        }

        .plantillas-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .plantilla-option {
          display: flex;
          gap: 12px;
          padding: 16px;
          border: 2px solid var(--border-color);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.15s;
          position: relative;
        }

        .plantilla-option:hover {
          border-color: var(--primary-200);
        }

        .plantilla-option.selected {
          border-color: var(--primary-500);
          background: var(--primary-50);
        }

        .plantilla-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background: var(--bg-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .plantilla-info {
          flex: 1;
          min-width: 0;
        }

        .plantilla-info h4 {
          margin: 0 0 4px;
          font-size: 15px;
        }

        .plantilla-info p {
          margin: 0 0 8px;
          font-size: 13px;
          color: var(--text-secondary);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .plantilla-meta {
          display: flex;
          gap: 8px;
        }

        .selected-check {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--primary-500);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .search-box input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: 14px;
        }

        .search-box button {
          padding: 4px;
          border: none;
          background: transparent;
          cursor: pointer;
          color: var(--text-secondary);
        }

        .selected-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: var(--primary-50);
          border: 1px solid var(--primary-200);
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .selected-item .item-info {
          flex: 1;
        }

        .selected-item .item-info strong {
          display: block;
        }

        .selected-item .item-info span {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .remove-btn {
          padding: 6px;
          border: none;
          background: transparent;
          cursor: pointer;
          color: var(--text-secondary);
          border-radius: 4px;
        }

        .remove-btn:hover {
          background: var(--error-50);
          color: var(--error-500);
        }

        .results-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 300px;
          overflow-y: auto;
        }

        .result-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .result-item:hover {
          background: var(--bg-secondary);
        }

        .result-item.selected {
          border-color: var(--primary-500);
          background: var(--primary-50);
        }

        .result-item .item-info {
          flex: 1;
        }

        .result-item .item-info strong {
          display: block;
          font-size: 14px;
        }

        .result-item .item-info span {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .campos-form {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .form-group label .required {
          color: var(--error-500);
          margin-left: 4px;
        }

        .fuente-hint {
          font-size: 11px;
          color: var(--primary-500);
          margin-left: 8px;
          font-weight: normal;
        }

        .preview-summary {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
          margin-bottom: 24px;
          padding: 16px;
          background: var(--bg-secondary);
          border-radius: 8px;
        }

        .summary-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .preview-frame {
          border: 1px solid var(--border-color);
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 24px;
        }

        .preview-frame iframe {
          width: 100%;
          height: 500px;
          border: none;
          background: white;
        }

        .generate-actions {
          display: flex;
          justify-content: center;
        }

        .btn-large {
          padding: 14px 28px;
          font-size: 16px;
        }

        .resultado-exito {
          text-align: center;
          padding: 40px 20px;
        }

        .success-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: var(--success-100);
          color: var(--success-600);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }

        .resultado-exito h2 {
          color: var(--success-600);
        }

        .resultado-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-top: 32px;
          flex-wrap: wrap;
        }

        .wizard-nav {
          display: flex;
          justify-content: space-between;
          margin-top: 24px;
        }

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 40px;
          color: var(--text-secondary);
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: var(--text-secondary);
        }

        .empty-state.small {
          padding: 20px;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 600px) {
          .wizard-steps {
            padding: 0;
          }

          .step-label {
            display: none;
          }

          .wizard-content {
            padding: 20px;
          }

          .plantillas-grid,
          .campos-form {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
