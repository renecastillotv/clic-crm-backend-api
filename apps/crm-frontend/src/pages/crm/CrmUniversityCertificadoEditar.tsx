/**
 * CrmUniversityCertificadoEditar - Página completa para crear/editar certificados
 * Incluye subida de imágenes, vista previa en tiempo real y opciones configurables
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import {
  getUniversityCertificadoById,
  createUniversityCertificado,
  updateUniversityCertificado,
} from '../../services/api';
import SingleImageUploader from '../../components/SingleImageUploader';
import CertificadoVisual, { CertificadoData } from '../../components/CertificadoVisual';
import CertificateTemplateSelector from '../../components/CertificateTemplateSelector';
import { CertificateTemplate, templateToFormValues, certificateTemplates } from '../../data/certificateTemplates';
import { ArrowLeft, Save, Eye, EyeOff, Settings, Palette, FileText, LayoutTemplate } from 'lucide-react';

interface CertificadoFormData {
  nombre: string;
  descripcion: string;
  imagen_template: string | null;
  activo: boolean;
  // Campos personalizados
  logo_empresa: string | null;
  firma_imagen: string | null;
  firma_nombre: string;
  firma_cargo: string;
  sello_imagen: string | null;
  // Opciones de visualización
  mostrar_fecha: boolean;
  mostrar_qr: boolean;
  mostrar_codigo: boolean;
  texto_otorgado: string;
  texto_curso: string;
  // Colores personalizables
  color_fondo: string;
  color_borde: string;
  color_texto_principal: string;
  color_texto_secundario: string;
  color_acento: string;
  // Layout y diseño
  template_id: string | null;
  aspecto: 'horizontal' | 'cuadrado';
  logo_posicion: 'top-center' | 'top-left' | 'top-right' | 'bottom-center';
  logo_tamano: 'small' | 'medium' | 'large';
  firma_posicion: 'bottom-left' | 'bottom-center' | 'bottom-right' | 'dual';
  borde_estilo: 'doble' | 'simple' | 'decorativo' | 'ninguno' | 'esquinas';
  borde_grosor: 'thin' | 'medium' | 'thick';
  fuente_titulo: 'serif' | 'sans-serif' | 'elegant';
  fuente_cuerpo: 'serif' | 'sans-serif';
  mostrar_ornamentos: boolean;
  mostrar_sello: boolean;
  sello_posicion: 'qr-lado' | 'firma-lado' | 'esquina';
}

const defaultForm: CertificadoFormData = {
  nombre: '',
  descripcion: '',
  imagen_template: null,
  activo: true,
  logo_empresa: null,
  firma_imagen: null,
  firma_nombre: '',
  firma_cargo: '',
  sello_imagen: null,
  mostrar_fecha: true,
  mostrar_qr: true,
  mostrar_codigo: true,
  texto_otorgado: 'Otorgado a',
  texto_curso: 'Por haber completado satisfactoriamente el curso',
  // Colores por defecto
  color_fondo: '#ffffff',
  color_borde: '#c9a227',
  color_texto_principal: '#1e3a5f',
  color_texto_secundario: '#64748b',
  color_acento: '#c9a227',
  // Layout por defecto
  template_id: null,
  aspecto: 'horizontal',
  logo_posicion: 'top-center',
  logo_tamano: 'medium',
  firma_posicion: 'bottom-left',
  borde_estilo: 'doble',
  borde_grosor: 'medium',
  fuente_titulo: 'serif',
  fuente_cuerpo: 'sans-serif',
  mostrar_ornamentos: true,
  mostrar_sello: true,
  sello_posicion: 'qr-lado',
};

export default function CrmUniversityCertificadoEditar() {
  const { tenantSlug, certificadoId } = useParams<{ tenantSlug: string; certificadoId?: string }>();
  const { tenantActual } = useAuth();
  const { getToken } = useClerkAuth();
  const { setPageHeader } = usePageHeader();
  const navigate = useNavigate();

  const isNew = !certificadoId || certificadoId === 'nuevo';

  const [form, setForm] = useState<CertificadoFormData>(defaultForm);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'plantilla' | 'general' | 'diseno' | 'opciones'>(isNew ? 'plantilla' : 'general');
  const [showPreview, setShowPreview] = useState(true);

  // Ref para la función de guardado - siempre usa el form actual
  const saveRef = useRef<() => Promise<void>>();

  // Datos de ejemplo para la vista previa
  const previewData: CertificadoData = useMemo(() => ({
    codigo_verificacion: 'ABCD-1234-EFGH',
    nombre_usuario: 'Juan Pérez García',
    nombre_curso: 'Curso de Ejemplo',
    nombre_certificado: form.nombre || 'Certificado de Finalización',
    nombre_empresa: tenantActual?.nombre || 'Mi Empresa',
    fecha_emision: new Date().toISOString(),
    imagen_template: form.imagen_template || undefined,
    logo_empresa: form.logo_empresa || undefined,
    firma_imagen: form.firma_imagen || undefined,
    firma_nombre: form.firma_nombre || undefined,
    firma_cargo: form.firma_cargo || undefined,
    sello_imagen: form.sello_imagen || undefined,
    // Opciones de visualización
    mostrar_fecha: form.mostrar_fecha,
    mostrar_qr: form.mostrar_qr,
    mostrar_codigo: form.mostrar_codigo,
    texto_otorgado: form.texto_otorgado,
    texto_curso: form.texto_curso,
    // Colores personalizables
    color_fondo: form.color_fondo,
    color_borde: form.color_borde,
    color_texto_principal: form.color_texto_principal,
    color_texto_secundario: form.color_texto_secundario,
    color_acento: form.color_acento,
    // Layout y diseño
    template_id: form.template_id || undefined,
    aspecto: form.aspecto,
    logo_posicion: form.logo_posicion,
    logo_tamano: form.logo_tamano,
    firma_posicion: form.firma_posicion,
    borde_estilo: form.borde_estilo,
    borde_grosor: form.borde_grosor,
    fuente_titulo: form.fuente_titulo,
    fuente_cuerpo: form.fuente_cuerpo,
    mostrar_ornamentos: form.mostrar_ornamentos,
    mostrar_sello: form.mostrar_sello,
    sello_posicion: form.sello_posicion,
  }), [form, tenantActual]);

  const loadCertificado = useCallback(async () => {
    if (!tenantActual?.id || isNew) return;

    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const data = await getUniversityCertificadoById(tenantActual.id, certificadoId!, token);

      if (data) {
        const campos = data.campos_personalizados || {};
        setForm({
          nombre: data.nombre || '',
          descripcion: data.descripcion || '',
          imagen_template: data.imagen_template || null,
          activo: data.activo ?? true,
          logo_empresa: campos.logo_empresa || null,
          firma_imagen: campos.firma_imagen || null,
          firma_nombre: campos.firma_nombre || '',
          firma_cargo: campos.firma_cargo || '',
          sello_imagen: campos.sello_imagen || null,
          mostrar_fecha: campos.mostrar_fecha ?? true,
          mostrar_qr: campos.mostrar_qr ?? true,
          mostrar_codigo: campos.mostrar_codigo ?? true,
          texto_otorgado: campos.texto_otorgado || 'Otorgado a',
          texto_curso: campos.texto_curso || 'Por haber completado satisfactoriamente el curso',
          // Colores personalizables
          color_fondo: campos.color_fondo || '#ffffff',
          color_borde: campos.color_borde || '#c9a227',
          color_texto_principal: campos.color_texto_principal || '#1e3a5f',
          color_texto_secundario: campos.color_texto_secundario || '#64748b',
          color_acento: campos.color_acento || '#c9a227',
          // Layout y diseño
          template_id: campos.template_id || null,
          aspecto: campos.aspecto || 'horizontal',
          logo_posicion: campos.logo_posicion || 'top-center',
          logo_tamano: campos.logo_tamano || 'medium',
          firma_posicion: campos.firma_posicion || 'bottom-left',
          borde_estilo: campos.borde_estilo || 'doble',
          borde_grosor: campos.borde_grosor || 'medium',
          fuente_titulo: campos.fuente_titulo || 'serif',
          fuente_cuerpo: campos.fuente_cuerpo || 'sans-serif',
          mostrar_ornamentos: campos.mostrar_ornamentos ?? true,
          mostrar_sello: campos.mostrar_sello ?? true,
          sello_posicion: campos.sello_posicion || 'qr-lado',
        });
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar el certificado');
      console.error('Error cargando certificado:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantActual?.id, certificadoId, isNew, getToken]);

  useEffect(() => {
    loadCertificado();
  }, [loadCertificado]);

  // Actualizar la función de guardado en cada render para que tenga los datos actuales
  saveRef.current = async () => {
    if (!tenantActual?.id) return;

    if (!form.nombre.trim()) {
      alert('El nombre del certificado es requerido');
      return;
    }

    try {
      setSaving(true);
      const token = await getToken();

      const dataToSave = {
        nombre: form.nombre,
        descripcion: form.descripcion || null,
        imagen_template: form.imagen_template || null,
        activo: form.activo,
        campos_personalizados: {
          logo_empresa: form.logo_empresa || null,
          firma_imagen: form.firma_imagen || null,
          firma_nombre: form.firma_nombre || null,
          firma_cargo: form.firma_cargo || null,
          sello_imagen: form.sello_imagen || null,
          mostrar_fecha: form.mostrar_fecha,
          mostrar_qr: form.mostrar_qr,
          mostrar_codigo: form.mostrar_codigo,
          texto_otorgado: form.texto_otorgado || null,
          texto_curso: form.texto_curso || null,
          // Colores personalizables
          color_fondo: form.color_fondo,
          color_borde: form.color_borde,
          color_texto_principal: form.color_texto_principal,
          color_texto_secundario: form.color_texto_secundario,
          color_acento: form.color_acento,
          // Layout y diseño
          template_id: form.template_id,
          aspecto: form.aspecto,
          logo_posicion: form.logo_posicion,
          logo_tamano: form.logo_tamano,
          firma_posicion: form.firma_posicion,
          borde_estilo: form.borde_estilo,
          borde_grosor: form.borde_grosor,
          fuente_titulo: form.fuente_titulo,
          fuente_cuerpo: form.fuente_cuerpo,
          mostrar_ornamentos: form.mostrar_ornamentos,
          mostrar_sello: form.mostrar_sello,
          sello_posicion: form.sello_posicion,
        },
      };

      console.log('=== GUARDANDO CERTIFICADO ===');
      console.log('Form actual:', JSON.stringify(form, null, 2));
      console.log('Data a enviar:', JSON.stringify(dataToSave, null, 2));

      if (isNew) {
        await createUniversityCertificado(tenantActual.id, dataToSave as any, token);
      } else {
        await updateUniversityCertificado(tenantActual.id, certificadoId!, dataToSave as any, token);
      }

      navigate(`/crm/${tenantSlug}/university/certificados`);
    } catch (err: any) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Función estable que llama a saveRef.current
  const handleSave = useCallback(() => {
    saveRef.current?.();
  }, []);

  useEffect(() => {
    setPageHeader({
      title: isNew ? 'Nuevo Certificado' : 'Editar Certificado',
      subtitle: isNew
        ? 'Diseña un certificado profesional para tus estudiantes'
        : `Editando: ${form.nombre || 'Sin nombre'}`,
      actions: (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => navigate(`/crm/${tenantSlug}/university/certificados`)}
            className="btn-secondary"
          >
            <ArrowLeft size={18} />
            Volver
          </button>
          <button
            onClick={handleSave}
            className="btn-primary"
            disabled={saving || !form.nombre.trim()}
          >
            <Save size={18} />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      ),
    });
  }, [setPageHeader, tenantSlug, navigate, isNew, form.nombre, saving]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando certificado...</p>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="certificado-editor-page">
      <div className="editor-layout">
        {/* Panel izquierdo: Formulario */}
        <div className={`editor-form-panel ${!showPreview ? 'expanded' : ''}`}>
          {/* Tabs */}
          <div className="editor-tabs">
            <button
              className={`editor-tab ${activeTab === 'plantilla' ? 'active' : ''}`}
              onClick={() => setActiveTab('plantilla')}
            >
              <LayoutTemplate size={16} />
              Plantilla
            </button>
            <button
              className={`editor-tab ${activeTab === 'general' ? 'active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              <FileText size={16} />
              General
            </button>
            <button
              className={`editor-tab ${activeTab === 'diseno' ? 'active' : ''}`}
              onClick={() => setActiveTab('diseno')}
            >
              <Palette size={16} />
              Diseño
            </button>
            <button
              className={`editor-tab ${activeTab === 'opciones' ? 'active' : ''}`}
              onClick={() => setActiveTab('opciones')}
            >
              <Settings size={16} />
              Opciones
            </button>
          </div>

          <div className="editor-form-content">
            {error && (
              <div className="error-banner">
                {error}
                <button onClick={() => setError(null)}>Cerrar</button>
              </div>
            )}

            {/* Tab: Plantilla */}
            {activeTab === 'plantilla' && (
              <div className="form-section">
                <CertificateTemplateSelector
                  selectedTemplateId={form.template_id || undefined}
                  onSelectTemplate={(template: CertificateTemplate) => {
                    const templateValues = templateToFormValues(template);
                    setForm(prev => ({
                      ...prev,
                      ...templateValues,
                    }));
                    setActiveTab('general');
                  }}
                />
                {form.template_id && (
                  <div className="current-template-info">
                    <p>
                      <strong>Plantilla seleccionada:</strong> {certificateTemplates.find(t => t.id === form.template_id)?.nombre || 'Personalizada'}
                    </p>
                    <button
                      type="button"
                      className="btn-reset-template"
                      onClick={() => setForm(prev => ({
                        ...prev,
                        template_id: null,
                      }))}
                    >
                      Desvincular plantilla (mantener configuracion actual)
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab: General */}
            {activeTab === 'general' && (
              <div className="form-section">
                <div className="form-group">
                  <label>Nombre del Certificado *</label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Ej: Certificado de Finalización, Diploma de Experto"
                  />
                </div>

                <div className="form-group">
                  <label>Descripción</label>
                  <textarea
                    value={form.descripcion}
                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                    placeholder="Describe el certificado y los requisitos para obtenerlo"
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.activo}
                      onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                    />
                    Certificado activo
                  </label>
                  <span className="form-hint">
                    Solo los certificados activos se pueden asignar a cursos
                  </span>
                </div>
              </div>
            )}

            {/* Tab: Diseño */}
            {activeTab === 'diseno' && (
              <div className="form-section">
                <h4 className="section-title">Fondo del Certificado</h4>
                <SingleImageUploader
                  value={form.imagen_template}
                  onChange={(url) => setForm({ ...form, imagen_template: url })}
                  tenantId={tenantActual?.id || ''}
                  folder="certificados"
                  hint="Imagen de fondo (opcional). Se recomienda 900x640px"
                  aspectRatio="16/10"
                  maxWidth={400}
                />

                <div className="section-divider" />

                <h4 className="section-title">Logo de la Empresa</h4>
                <SingleImageUploader
                  value={form.logo_empresa}
                  onChange={(url) => setForm({ ...form, logo_empresa: url })}
                  tenantId={tenantActual?.id || ''}
                  folder="certificados"
                  hint="Logo que aparecerá en la parte superior"
                  maxWidth={200}
                  maxHeight={80}
                />

                <div className="section-divider" />

                <h4 className="section-title">Firma</h4>
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Nombre del Firmante</label>
                    <input
                      type="text"
                      value={form.firma_nombre}
                      onChange={(e) => setForm({ ...form, firma_nombre: e.target.value })}
                      placeholder="Ej: Juan Pérez"
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label>Cargo</label>
                    <input
                      type="text"
                      value={form.firma_cargo}
                      onChange={(e) => setForm({ ...form, firma_cargo: e.target.value })}
                      placeholder="Ej: Director Académico"
                    />
                  </div>
                </div>

                <SingleImageUploader
                  value={form.firma_imagen}
                  onChange={(url) => setForm({ ...form, firma_imagen: url })}
                  tenantId={tenantActual?.id || ''}
                  folder="certificados"
                  label="Imagen de Firma"
                  hint="Imagen de firma manuscrita (PNG con fondo transparente)"
                  maxWidth={200}
                  maxHeight={80}
                />

                <div className="section-divider" />

                <h4 className="section-title">Sello</h4>
                <SingleImageUploader
                  value={form.sello_imagen}
                  onChange={(url) => setForm({ ...form, sello_imagen: url })}
                  tenantId={tenantActual?.id || ''}
                  folder="certificados"
                  hint="Sello o estampa oficial (PNG con transparencia recomendado)"
                  maxWidth={150}
                  maxHeight={150}
                  aspectRatio="1/1"
                />

                <div className="section-divider" />

                <h4 className="section-title">Colores del Certificado</h4>
                <span className="form-hint" style={{ marginBottom: '16px', display: 'block' }}>
                  Personaliza los colores si no usas una imagen de fondo
                </span>

                <div className="color-grid">
                  <div className="color-input-group">
                    <label>Color de Fondo</label>
                    <div className="color-input-wrapper">
                      <input
                        type="color"
                        value={form.color_fondo}
                        onChange={(e) => setForm({ ...form, color_fondo: e.target.value })}
                        className="color-picker"
                      />
                      <input
                        type="text"
                        value={form.color_fondo}
                        onChange={(e) => setForm({ ...form, color_fondo: e.target.value })}
                        className="color-text"
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>

                  <div className="color-input-group">
                    <label>Color de Borde</label>
                    <div className="color-input-wrapper">
                      <input
                        type="color"
                        value={form.color_borde}
                        onChange={(e) => setForm({ ...form, color_borde: e.target.value })}
                        className="color-picker"
                      />
                      <input
                        type="text"
                        value={form.color_borde}
                        onChange={(e) => setForm({ ...form, color_borde: e.target.value })}
                        className="color-text"
                        placeholder="#c9a227"
                      />
                    </div>
                  </div>

                  <div className="color-input-group">
                    <label>Texto Principal</label>
                    <div className="color-input-wrapper">
                      <input
                        type="color"
                        value={form.color_texto_principal}
                        onChange={(e) => setForm({ ...form, color_texto_principal: e.target.value })}
                        className="color-picker"
                      />
                      <input
                        type="text"
                        value={form.color_texto_principal}
                        onChange={(e) => setForm({ ...form, color_texto_principal: e.target.value })}
                        className="color-text"
                        placeholder="#1e3a5f"
                      />
                    </div>
                  </div>

                  <div className="color-input-group">
                    <label>Texto Secundario</label>
                    <div className="color-input-wrapper">
                      <input
                        type="color"
                        value={form.color_texto_secundario}
                        onChange={(e) => setForm({ ...form, color_texto_secundario: e.target.value })}
                        className="color-picker"
                      />
                      <input
                        type="text"
                        value={form.color_texto_secundario}
                        onChange={(e) => setForm({ ...form, color_texto_secundario: e.target.value })}
                        className="color-text"
                        placeholder="#64748b"
                      />
                    </div>
                  </div>

                  <div className="color-input-group">
                    <label>Color de Acento</label>
                    <div className="color-input-wrapper">
                      <input
                        type="color"
                        value={form.color_acento}
                        onChange={(e) => setForm({ ...form, color_acento: e.target.value })}
                        className="color-picker"
                      />
                      <input
                        type="text"
                        value={form.color_acento}
                        onChange={(e) => setForm({ ...form, color_acento: e.target.value })}
                        className="color-text"
                        placeholder="#c9a227"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-reset-colors"
                  onClick={() => setForm({
                    ...form,
                    color_fondo: '#ffffff',
                    color_borde: '#c9a227',
                    color_texto_principal: '#1e3a5f',
                    color_texto_secundario: '#64748b',
                    color_acento: '#c9a227',
                  })}
                >
                  Restaurar colores por defecto
                </button>
              </div>
            )}

            {/* Tab: Opciones */}
            {activeTab === 'opciones' && (
              <div className="form-section">
                <h4 className="section-title">Elementos a Mostrar</h4>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.mostrar_fecha}
                      onChange={(e) => setForm({ ...form, mostrar_fecha: e.target.checked })}
                    />
                    Mostrar fecha de emisión
                  </label>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.mostrar_qr}
                      onChange={(e) => setForm({ ...form, mostrar_qr: e.target.checked })}
                    />
                    Mostrar código QR de verificación
                  </label>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.mostrar_codigo}
                      onChange={(e) => setForm({ ...form, mostrar_codigo: e.target.checked })}
                    />
                    Mostrar código de verificación en texto
                  </label>
                </div>

                <div className="section-divider" />

                <h4 className="section-title">Textos Personalizados</h4>

                <div className="form-group">
                  <label>Texto "Otorgado a"</label>
                  <input
                    type="text"
                    value={form.texto_otorgado}
                    onChange={(e) => setForm({ ...form, texto_otorgado: e.target.value })}
                    placeholder="Otorgado a"
                  />
                  <span className="form-hint">
                    Texto que aparece antes del nombre del estudiante
                  </span>
                </div>

                <div className="form-group">
                  <label>Texto de descripción del curso</label>
                  <input
                    type="text"
                    value={form.texto_curso}
                    onChange={(e) => setForm({ ...form, texto_curso: e.target.value })}
                    placeholder="Por haber completado satisfactoriamente el curso"
                  />
                  <span className="form-hint">
                    Texto que aparece antes del nombre del curso
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Panel derecho: Vista previa */}
        <div className={`editor-preview-panel ${!showPreview ? 'collapsed' : ''}`}>
          <div className="preview-header">
            <h3>Vista Previa</h3>
            <button
              className="btn-toggle-preview"
              onClick={() => setShowPreview(!showPreview)}
              title={showPreview ? 'Ocultar vista previa' : 'Mostrar vista previa'}
            >
              {showPreview ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {showPreview && (
            <div className="preview-content">
              <div className="preview-scale-wrapper">
                <CertificadoVisual
                  data={previewData}
                  modo="compacto"
                />
              </div>
              <p className="preview-note">
                Esta es una vista previa. El certificado final usará los datos reales del estudiante.
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .certificado-editor-page {
    height: calc(100vh - 120px);
    overflow: hidden;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 64px;
    color: #64748b;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #e2e8f0;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 16px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .editor-layout {
    display: flex;
    height: 100%;
    gap: 0;
  }

  /* Panel izquierdo - formulario */
  .editor-form-panel {
    flex: 1;
    min-width: 400px;
    background: white;
    border-right: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: all 0.3s;
  }

  .editor-form-panel.expanded {
    flex: 1;
    width: auto;
    max-width: 100%;
  }

  .editor-tabs {
    display: flex;
    border-bottom: 1px solid #e2e8f0;
    background: #f8fafc;
    flex-shrink: 0;
  }

  .editor-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 14px 12px;
    background: none;
    border: none;
    font-size: 0.875rem;
    font-weight: 500;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s;
    position: relative;
  }

  .editor-tab:hover {
    color: #0f172a;
    background: #f1f5f9;
  }

  .editor-tab.active {
    color: #2563eb;
    background: white;
  }

  .editor-tab.active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 2px;
    background: #2563eb;
  }

  .editor-form-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  .error-banner {
    background: #fef2f2;
    color: #dc2626;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .error-banner button {
    background: none;
    border: none;
    color: #dc2626;
    cursor: pointer;
    font-weight: 500;
  }

  .form-section {
    /* padding: 0; */
  }

  .section-title {
    margin: 0 0 16px 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: #0f172a;
  }

  .section-divider {
    height: 1px;
    background: #e2e8f0;
    margin: 24px 0;
  }

  .form-group {
    margin-bottom: 16px;
  }

  .form-group label {
    display: block;
    margin-bottom: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .form-group input[type="text"],
  .form-group input[type="url"],
  .form-group textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.875rem;
    transition: border-color 0.15s;
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #2563eb;
  }

  .form-hint {
    display: block;
    margin-top: 4px;
    font-size: 0.75rem;
    color: #64748b;
  }

  .form-row {
    display: flex;
    gap: 12px;
  }

  .flex-1 {
    flex: 1;
  }

  .checkbox-label {
    display: flex !important;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: #2563eb;
  }

  /* Color picker styles */
  .color-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    margin-bottom: 16px;
  }

  .color-input-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .color-input-group label {
    font-size: 0.8rem;
    font-weight: 500;
    color: #374151;
  }

  .color-input-wrapper {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .color-picker {
    width: 40px;
    height: 36px;
    padding: 2px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    cursor: pointer;
    background: white;
  }

  .color-picker::-webkit-color-swatch-wrapper {
    padding: 2px;
  }

  .color-picker::-webkit-color-swatch {
    border-radius: 4px;
    border: none;
  }

  .color-text {
    flex: 1;
    padding: 8px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 0.8rem;
    font-family: monospace;
    text-transform: uppercase;
  }

  .color-text:focus {
    outline: none;
    border-color: #2563eb;
  }

  .btn-reset-colors {
    width: 100%;
    padding: 10px 16px;
    background: #f1f5f9;
    color: #64748b;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    margin-top: 8px;
  }

  .btn-reset-colors:hover {
    background: #e2e8f0;
    color: #374151;
  }

  /* Panel derecho - Vista previa */
  .editor-preview-panel {
    flex: 1;
    min-width: 400px;
    background: #1e293b;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: all 0.3s;
  }

  .editor-preview-panel.collapsed {
    flex: 0;
    min-width: 50px;
    width: 50px;
  }

  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    background: #0f172a;
    border-bottom: 1px solid #334155;
    flex-shrink: 0;
  }

  .preview-header h3 {
    margin: 0;
    font-size: 0.85rem;
    color: white;
    font-weight: 500;
  }

  .collapsed .preview-header h3 {
    display: none;
  }

  .btn-toggle-preview {
    width: 28px;
    height: 28px;
    border: none;
    background: #334155;
    color: white;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-toggle-preview:hover {
    background: #475569;
  }

  .preview-content {
    flex: 1;
    padding: 12px;
    overflow: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .preview-scale-wrapper {
    transform: scale(0.65);
    transform-origin: top center;
    flex-shrink: 0;
    margin-bottom: -120px;
  }

  .preview-note {
    margin-top: 8px;
    font-size: 0.7rem;
    color: #94a3b8;
    text-align: center;
    max-width: 300px;
    line-height: 1.3;
  }

  /* Botones */
  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 18px;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-primary:hover:not(:disabled) {
    background: #1d4ed8;
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 18px;
    background: white;
    color: #374151;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-secondary:hover {
    background: #f1f5f9;
  }

  /* Responsive */
  @media (max-width: 1200px) {
    .editor-form-panel {
      width: 380px;
      min-width: 350px;
    }

    .preview-scale-wrapper {
      transform: scale(0.6);
    }
  }

  @media (max-width: 900px) {
    .editor-layout {
      flex-direction: column;
    }

    .editor-form-panel {
      width: 100%;
      min-width: 100%;
      height: 50%;
    }

    .editor-preview-panel {
      height: 50%;
    }

    .editor-preview-panel.collapsed {
      height: 50px;
      flex: none;
    }

    .preview-scale-wrapper {
      transform: scale(0.45);
    }
  }

  /* Template selector info */
  .current-template-info {
    margin-top: 20px;
    padding: 16px;
    background: #f0f9ff;
    border-radius: 8px;
    border: 1px solid #bae6fd;
  }

  .current-template-info p {
    margin: 0 0 12px 0;
    font-size: 0.9rem;
    color: #0369a1;
  }

  .btn-reset-template {
    width: 100%;
    padding: 10px 16px;
    background: white;
    color: #64748b;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-reset-template:hover {
    background: #f1f5f9;
    color: #374151;
  }
`;
