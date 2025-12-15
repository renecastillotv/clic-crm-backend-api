/**
 * CrmFaqEditor - Editor de FAQs
 *
 * Página para crear/editar preguntas frecuentes
 * Layout de dos columnas para mejor aprovechamiento del espacio
 * - Selector de categorías visual
 * - Soporte multi-idioma (traducciones)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { usePageHeader } from '../../../layouts/CrmLayout';
import {
  getFaq,
  createFaq,
  updateFaq,
  getCategoriasContenido,
  CategoriaContenido,
} from '../../../services/api';
import { useIdiomas } from '../../../services/idiomas';
import { contenidoStyles } from './sharedStyles';

const Icons = {
  back: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  save: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  question: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  folder: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  settings: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  translate: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/></svg>,
  tag: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
};

// Contextos disponibles para FAQs
const CONTEXTOS = [
  { value: '', label: 'General', description: 'Aplica a todos los contextos' },
  { value: 'compra', label: 'Compra', description: 'Para compradores' },
  { value: 'venta', label: 'Venta', description: 'Para vendedores' },
  { value: 'alquiler', label: 'Alquiler', description: 'Para inquilinos/arrendadores' },
  { value: 'inversion', label: 'Inversión', description: 'Para inversionistas' },
  { value: 'legal', label: 'Legal', description: 'Aspectos legales' },
  { value: 'financiamiento', label: 'Financiamiento', description: 'Créditos y pagos' },
];


interface Traducciones {
  [idioma: string]: {
    pregunta?: string;
    respuesta?: string;
  };
}

export default function CrmFaqEditor() {
  const { tenantSlug, id } = useParams<{ tenantSlug: string; id?: string }>();
  const navigate = useNavigate();
  const { tenantActual } = useAuth();
  const { setPageHeader } = usePageHeader();
  const { idiomas } = useIdiomas(tenantActual?.id);

  const isEditing = id && id !== 'nuevo';

  const [categorias, setCategorias] = useState<CategoriaContenido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Idioma activo para traducciones
  const [idiomaActivo, setIdiomaActivo] = useState('es');

  const [formData, setFormData] = useState({
    idioma: 'es',
    pregunta: '',
    respuesta: '',
    categoriaId: '',
    contexto: '',
    publicado: true,
    destacada: false,
    orden: 0,
  });

  // Traducciones separadas del form principal
  const [traducciones, setTraducciones] = useState<Traducciones>({});

  // Ref para mantener handleSave actualizado
  const handleSaveRef = useRef<() => void>(() => {});

  // Header - usa el ref para evitar stale closure
  useEffect(() => {
    setPageHeader({
      title: isEditing ? 'Editar FAQ' : 'Nueva FAQ',
      subtitle: isEditing ? 'Actualiza la pregunta frecuente' : 'Crea una nueva pregunta frecuente',
      actions: (
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => navigate(`/crm/${tenantSlug}/contenido?tab=faqs`)} className="btn-secondary">
            {Icons.back}
            <span>Volver</span>
          </button>
          <button onClick={() => handleSaveRef.current()} className="btn-primary" disabled={saving}>
            {Icons.save}
            <span>{saving ? 'Guardando...' : 'Guardar'}</span>
          </button>
        </div>
      ),
    });
  }, [setPageHeader, isEditing, saving, tenantSlug, navigate]);

  // Cargar datos
  useEffect(() => {
    if (!tenantActual?.id) return;
    loadInitialData();
  }, [tenantActual?.id, id]);

  const loadInitialData = async () => {
    if (!tenantActual?.id) return;
    setLoading(true);
    setError(null);

    try {
      const categoriasData = await getCategoriasContenido(tenantActual.id, 'faq');
      setCategorias(categoriasData);

      if (isEditing && id) {
        const faq = await getFaq(tenantActual.id, id);
        setFormData({
          idioma: faq.idioma,
          pregunta: faq.pregunta,
          respuesta: faq.respuesta,
          categoriaId: faq.categoriaId || '',
          contexto: faq.contexto || '',
          publicado: faq.publicado,
          destacada: faq.destacada,
          orden: faq.orden,
        });
        // Cargar traducciones existentes
        if (faq.traducciones) {
          setTraducciones(faq.traducciones as Traducciones);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  // Actualizar traducción de un idioma específico
  const handleTraduccionChange = (idioma: string, campo: 'pregunta' | 'respuesta', valor: string) => {
    setTraducciones(prev => ({
      ...prev,
      [idioma]: {
        ...prev[idioma],
        [campo]: valor,
      },
    }));
  };

  const handleSave = useCallback(async () => {
    if (!tenantActual?.id || !formData.pregunta || !formData.respuesta) {
      setError('Pregunta y respuesta son requeridas');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Limpiar traducciones vacías
      const traduccionesLimpias: Traducciones = {};
      Object.entries(traducciones).forEach(([idioma, contenido]) => {
        if (contenido.pregunta || contenido.respuesta) {
          traduccionesLimpias[idioma] = contenido;
        }
      });

      const faqData = {
        ...formData,
        categoriaId: formData.categoriaId || undefined,
        contexto: formData.contexto || undefined,
        traducciones: Object.keys(traduccionesLimpias).length > 0 ? traduccionesLimpias : undefined,
      };

      if (isEditing && id) {
        await updateFaq(tenantActual.id, id, faqData);
      } else {
        await createFaq(tenantActual.id, faqData);
      }

      navigate(`/crm/${tenantSlug}/contenido?tab=faqs`);
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }, [tenantActual?.id, formData, traducciones, isEditing, id, tenantSlug, navigate]);

  // Mantener el ref actualizado con la última versión de handleSave
  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  if (loading) {
    return (
      <div className="page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando...</p>
        </div>
        <style>{contenidoStyles}</style>
      </div>
    );
  }

  return (
    <div className="page editor-page">
      <style>{contenidoStyles}</style>
      <style>{`
        .editor-page {
          width: 100%;
          padding-bottom: 40px;
        }

        .editor-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 24px;
        }

        @media (max-width: 1024px) {
          .editor-grid {
            grid-template-columns: 1fr;
          }
        }

        .editor-main {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .editor-sidebar {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .editor-section {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
        }

        .editor-section h4 {
          margin: 0 0 16px 0;
          font-size: 0.95rem;
          font-weight: 600;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .editor-section h4 svg {
          color: #64748b;
        }

        /* Idioma tabs */
        .idioma-tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 16px;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 0;
        }

        .idioma-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          background: transparent;
          border: none;
          border-bottom: 3px solid transparent;
          margin-bottom: -2px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          color: #64748b;
          transition: all 0.2s;
        }

        .idioma-tab:hover {
          color: #3b82f6;
        }

        .idioma-tab.active {
          color: #3b82f6;
          border-bottom-color: #3b82f6;
        }

        .idioma-tab .flag {
          font-size: 1.1rem;
        }

        .idioma-tab .has-content {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
        }

        .traduccion-fields {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* Categoria selector visual */
        .categoria-selector {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .categoria-option {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.85rem;
          color: #64748b;
        }

        .categoria-option:hover {
          border-color: #cbd5e1;
        }

        .categoria-option.selected {
          border-color: #3b82f6;
          background: #eff6ff;
          color: #1d4ed8;
        }

        .categoria-option .cat-color {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        /* Contexto selector */
        .contexto-selector {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .contexto-option {
          display: flex;
          flex-direction: column;
          padding: 12px;
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .contexto-option:hover {
          border-color: #cbd5e1;
          background: white;
        }

        .contexto-option.selected {
          border-color: #8b5cf6;
          background: #f5f3ff;
        }

        .contexto-option .contexto-label {
          font-weight: 600;
          font-size: 0.85rem;
          color: #374151;
        }

        .contexto-option.selected .contexto-label {
          color: #7c3aed;
        }

        .contexto-option .contexto-desc {
          font-size: 0.75rem;
          color: #94a3b8;
          margin-top: 2px;
        }

        .contexto-option.selected .contexto-desc {
          color: #a78bfa;
        }

        /* Estado grid horizontal */
        .estado-grid {
          display: flex;
          gap: 12px;
          align-items: stretch;
        }

        .estado-grid .toggle-card {
          flex: 1;
          margin-bottom: 0;
        }

        .estado-grid .orden-section {
          flex-shrink: 0;
        }

        /* Toggle Cards mejorados */
        .toggle-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.25s ease;
          margin-bottom: 10px;
        }

        .toggle-card:last-child {
          margin-bottom: 0;
        }

        .toggle-card:hover {
          border-color: #cbd5e1;
        }

        .toggle-card.active {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-color: transparent;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
        }

        .toggle-card.active.warning {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);
        }

        .toggle-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .toggle-title {
          font-weight: 600;
          font-size: 0.9rem;
          color: #374151;
        }

        .toggle-card.active .toggle-title {
          color: white;
        }

        .toggle-subtitle {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .toggle-card.active .toggle-subtitle {
          color: rgba(255, 255, 255, 0.8);
        }

        .toggle-switch {
          width: 44px;
          height: 24px;
          border-radius: 12px;
          background: #cbd5e1;
          position: relative;
          transition: all 0.25s ease;
          flex-shrink: 0;
        }

        .toggle-card.active .toggle-switch {
          background: rgba(255, 255, 255, 0.3);
        }

        .toggle-switch::after {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          top: 2px;
          left: 2px;
          transition: all 0.25s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .toggle-card.active .toggle-switch::after {
          left: 22px;
        }

        /* Orden input */
        .orden-section {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
        }

        .orden-section label {
          font-size: 0.85rem;
          font-weight: 500;
          color: #64748b;
        }

        .orden-section input {
          width: 80px;
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.9rem;
          text-align: center;
        }

        .orden-section input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .btn-secondary {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          color: #475569;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-secondary:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }
      `}</style>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="editor-grid">
        {/* Columna Principal */}
        <div className="editor-main">
          {/* Pregunta y Respuesta con traducciones */}
          <div className="editor-section">
            <h4>{Icons.question} Pregunta y Respuesta</h4>

            {/* Tabs de idioma */}
            <div className="idioma-tabs">
              {idiomas.map(idioma => {
                const tieneContenido = idioma.code === 'es'
                  ? formData.pregunta || formData.respuesta
                  : traducciones[idioma.code]?.pregunta || traducciones[idioma.code]?.respuesta;
                return (
                  <button
                    key={idioma.code}
                    type="button"
                    className={`idioma-tab ${idiomaActivo === idioma.code ? 'active' : ''}`}
                    onClick={() => setIdiomaActivo(idioma.code)}
                  >
                    <span className="flag">{idioma.flagEmoji}</span>
                    <span>{idioma.labelNativo}</span>
                    {tieneContenido && <span className="has-content" />}
                  </button>
                );
              })}
            </div>

            {/* Campos según idioma activo */}
            <div className="traduccion-fields">
              {idiomaActivo === 'es' ? (
                <>
                  <div className="form-group">
                    <label>Pregunta *</label>
                    <input
                      type="text"
                      value={formData.pregunta}
                      onChange={(e) => setFormData({ ...formData, pregunta: e.target.value })}
                      placeholder="¿Cuál es la pregunta?"
                    />
                  </div>
                  <div className="form-group">
                    <label>Respuesta *</label>
                    <textarea
                      value={formData.respuesta}
                      onChange={(e) => setFormData({ ...formData, respuesta: e.target.value })}
                      placeholder="Respuesta completa..."
                      rows={6}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>Pregunta en {idiomas.find(i => i.code === idiomaActivo)?.labelNativo}</label>
                    <input
                      type="text"
                      value={traducciones[idiomaActivo]?.pregunta || ''}
                      onChange={(e) => handleTraduccionChange(idiomaActivo, 'pregunta', e.target.value)}
                      placeholder={`Traducción de la pregunta en ${idiomas.find(i => i.code === idiomaActivo)?.labelNativo}`}
                    />
                  </div>
                  <div className="form-group">
                    <label>Respuesta en {idiomas.find(i => i.code === idiomaActivo)?.labelNativo}</label>
                    <textarea
                      value={traducciones[idiomaActivo]?.respuesta || ''}
                      onChange={(e) => handleTraduccionChange(idiomaActivo, 'respuesta', e.target.value)}
                      placeholder={`Traducción de la respuesta en ${idiomas.find(i => i.code === idiomaActivo)?.labelNativo}`}
                      rows={6}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Estado - movido aquí para aprovechar espacio */}
          <div className="editor-section">
            <h4>{Icons.settings} Estado</h4>
            <div className="estado-grid">
              <div
                className={`toggle-card ${formData.publicado ? 'active' : ''}`}
                onClick={() => setFormData({ ...formData, publicado: !formData.publicado })}
              >
                <div className="toggle-content">
                  <span className="toggle-title">{formData.publicado ? 'Publicado' : 'Borrador'}</span>
                  <span className="toggle-subtitle">{formData.publicado ? 'Visible en el sitio' : 'Solo visible en el CRM'}</span>
                </div>
                <div className="toggle-switch" />
              </div>
              <div
                className={`toggle-card warning ${formData.destacada ? 'active' : ''}`}
                onClick={() => setFormData({ ...formData, destacada: !formData.destacada })}
              >
                <div className="toggle-content">
                  <span className="toggle-title">{formData.destacada ? 'Destacada' : 'Normal'}</span>
                  <span className="toggle-subtitle">{formData.destacada ? 'Aparece primero' : 'Orden normal'}</span>
                </div>
                <div className="toggle-switch" />
              </div>
              <div className="orden-section">
                <label>Orden:</label>
                <input
                  type="number"
                  value={formData.orden}
                  onChange={(e) => setFormData({ ...formData, orden: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="editor-sidebar">
          {/* Categoría */}
          <div className="editor-section">
            <h4>{Icons.folder} Categoría</h4>
            <div className="categoria-selector">
              <div
                className={`categoria-option ${!formData.categoriaId ? 'selected' : ''}`}
                onClick={() => setFormData({ ...formData, categoriaId: '' })}
              >
                Sin categoría
              </div>
              {categorias.map(cat => (
                <div
                  key={cat.id}
                  className={`categoria-option ${formData.categoriaId === cat.id ? 'selected' : ''}`}
                  onClick={() => setFormData({ ...formData, categoriaId: cat.id })}
                >
                  {cat.color && <span className="cat-color" style={{ background: cat.color }} />}
                  {cat.nombre}
                </div>
              ))}
            </div>
          </div>

          {/* Contexto */}
          <div className="editor-section">
            <h4>{Icons.tag} Contexto</h4>
            <div className="contexto-selector">
              {CONTEXTOS.map(ctx => (
                <div
                  key={ctx.value}
                  className={`contexto-option ${formData.contexto === ctx.value ? 'selected' : ''}`}
                  onClick={() => setFormData({ ...formData, contexto: ctx.value })}
                >
                  <span className="contexto-label">{ctx.label}</span>
                  <span className="contexto-desc">{ctx.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
