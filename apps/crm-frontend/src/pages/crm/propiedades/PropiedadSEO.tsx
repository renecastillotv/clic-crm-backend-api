/**
 * PropiedadSEO - Tab SEO
 * Configuración SEO para la propiedad: meta title, description, slug, keywords
 */

import { useState, useEffect } from 'react';
import { Propiedad } from '../../../services/api';

interface Props {
  propiedadId: string;
  propiedad: Propiedad;
  onUpdate: (data: Partial<Propiedad>) => Promise<void>;
}

// Iconos SVG
const Icons = {
  edit: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  save: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
  ),
  x: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  search: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  link: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  ),
  eye: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  check: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  alertTriangle: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  copy: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  ),
  refresh: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 4 23 10 17 10"/>
      <polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  ),
};

export default function PropiedadSEO({ propiedadId, propiedad, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Estados para edición - extendemos Propiedad para incluir campos SEO que podrían existir
  const propiedadExtendida = propiedad as Propiedad & {
    seo_title?: string;
    seo_description?: string;
    seo_keywords?: string[];
  };

  const [seoTitle, setSeoTitle] = useState(propiedadExtendida.seo_title || propiedad.titulo || '');
  const [seoDescription, setSeoDescription] = useState(propiedadExtendida.seo_description || propiedad.descripcion?.substring(0, 160) || '');
  const [slug, setSlug] = useState(propiedad.slug || '');
  const [keywords, setKeywords] = useState<string[]>(propiedadExtendida.seo_keywords || []);
  const [newKeyword, setNewKeyword] = useState('');

  // Actualizar estados cuando cambie la propiedad
  useEffect(() => {
    setSeoTitle(propiedadExtendida.seo_title || propiedad.titulo || '');
    setSeoDescription(propiedadExtendida.seo_description || propiedad.descripcion?.substring(0, 160) || '');
    setSlug(propiedad.slug || '');
    setKeywords(propiedadExtendida.seo_keywords || []);
  }, [propiedad]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({
        slug,
        // Los campos SEO se guardarían en el backend si existieran
        // seo_title: seoTitle,
        // seo_description: seoDescription,
        // seo_keywords: keywords,
      } as Partial<Propiedad>);
      setEditing(false);
    } catch (error) {
      console.error('Error guardando SEO:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSeoTitle(propiedadExtendida.seo_title || propiedad.titulo || '');
    setSeoDescription(propiedadExtendida.seo_description || propiedad.descripcion?.substring(0, 160) || '');
    setSlug(propiedad.slug || '');
    setKeywords(propiedadExtendida.seo_keywords || []);
    setEditing(false);
  };

  const generateSlug = () => {
    const newSlug = (propiedad.titulo || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    setSlug(newSlug + '-' + propiedad.codigo?.toLowerCase());
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const copyUrl = async () => {
    const url = `${window.location.origin}/propiedad/${slug || propiedad.codigo}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Validaciones
  const titleLength = seoTitle.length;
  const descriptionLength = seoDescription.length;
  const isTitleOptimal = titleLength >= 30 && titleLength <= 60;
  const isDescriptionOptimal = descriptionLength >= 120 && descriptionLength <= 160;

  // URL de preview
  const previewUrl = slug || propiedad.codigo || 'propiedad';

  return (
    <div className="propiedad-seo">
      <div className="seo-grid">
        {/* Panel principal */}
        <div className="main-panel">
          {/* Preview de Google */}
          <div className="section google-preview">
            <div className="section-header">
              <h3 className="section-title">
                {Icons.search}
                <span>Vista previa en Google</span>
              </h3>
            </div>
            <div className="google-result">
              <div className="google-url">
                tudominio.com › propiedad › {previewUrl}
              </div>
              <div className="google-title">
                {seoTitle || propiedad.titulo || 'Título de la propiedad'}
              </div>
              <div className="google-description">
                {seoDescription || propiedad.descripcion?.substring(0, 160) || 'Descripción de la propiedad que aparecerá en los resultados de búsqueda...'}
              </div>
            </div>
          </div>

          {/* Formulario SEO */}
          <div className="section">
            <div className="section-header">
              <h3 className="section-title">Configuración SEO</h3>
              {!editing && (
                <button className="btn-edit" onClick={() => setEditing(true)}>
                  {Icons.edit}
                  Editar
                </button>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                Meta Title
                <span className={`char-counter ${isTitleOptimal ? 'optimal' : titleLength > 60 ? 'warning' : ''}`}>
                  {titleLength}/60
                </span>
              </label>
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                disabled={!editing}
                placeholder="Título optimizado para buscadores"
                className={`form-input ${!isTitleOptimal && titleLength > 0 ? 'has-warning' : ''}`}
              />
              <div className="field-hint">
                {isTitleOptimal ? (
                  <span className="hint-success">{Icons.check} Longitud óptima</span>
                ) : titleLength < 30 ? (
                  <span className="hint-warning">{Icons.alertTriangle} Título muy corto (mínimo 30 caracteres)</span>
                ) : titleLength > 60 ? (
                  <span className="hint-warning">{Icons.alertTriangle} Título muy largo (máximo 60 caracteres)</span>
                ) : null}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Meta Description
                <span className={`char-counter ${isDescriptionOptimal ? 'optimal' : descriptionLength > 160 ? 'warning' : ''}`}>
                  {descriptionLength}/160
                </span>
              </label>
              <textarea
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                disabled={!editing}
                placeholder="Descripción que aparecerá en los resultados de búsqueda"
                rows={3}
                className={`form-textarea ${!isDescriptionOptimal && descriptionLength > 0 ? 'has-warning' : ''}`}
              />
              <div className="field-hint">
                {isDescriptionOptimal ? (
                  <span className="hint-success">{Icons.check} Longitud óptima</span>
                ) : descriptionLength < 120 ? (
                  <span className="hint-warning">{Icons.alertTriangle} Descripción muy corta (mínimo 120 caracteres)</span>
                ) : descriptionLength > 160 ? (
                  <span className="hint-warning">{Icons.alertTriangle} Descripción muy larga (máximo 160 caracteres)</span>
                ) : null}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                URL Slug
              </label>
              <div className="slug-input-group">
                <span className="slug-prefix">tudominio.com/propiedad/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  disabled={!editing}
                  placeholder="url-amigable"
                  className="form-input slug-input"
                />
                {editing && (
                  <button
                    type="button"
                    className="btn-generate"
                    onClick={generateSlug}
                    title="Generar slug automático"
                  >
                    {Icons.refresh}
                  </button>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Palabras clave</label>
              <div className="keywords-container">
                {keywords.map((keyword, idx) => (
                  <span key={idx} className="keyword-tag">
                    {keyword}
                    {editing && (
                      <button
                        type="button"
                        className="keyword-remove"
                        onClick={() => removeKeyword(keyword)}
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
                {editing && (
                  <div className="keyword-input-group">
                    <input
                      type="text"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                      placeholder="Agregar palabra clave..."
                      className="keyword-input"
                    />
                    <button
                      type="button"
                      className="btn-add-keyword"
                      onClick={addKeyword}
                      disabled={!newKeyword.trim()}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>

            {editing && (
              <div className="form-actions">
                <button className="btn-cancel" onClick={handleCancel} disabled={saving}>
                  {Icons.x}
                  Cancelar
                </button>
                <button className="btn-save" onClick={handleSave} disabled={saving}>
                  {Icons.save}
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Panel lateral */}
        <div className="side-panel">
          {/* URL de la propiedad */}
          <div className="section url-section">
            <h3 className="section-title">
              {Icons.link}
              <span>URL de la propiedad</span>
            </h3>
            <div className="url-display">
              <code>/propiedad/{previewUrl}</code>
              <button className="btn-copy" onClick={copyUrl} title="Copiar URL">
                {copied ? Icons.check : Icons.copy}
              </button>
            </div>
            <a
              href={`/propiedad/${previewUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-preview"
            >
              {Icons.eye}
              Ver página pública
            </a>
          </div>

          {/* Checklist SEO */}
          <div className="section checklist-section">
            <h3 className="section-title">Checklist SEO</h3>
            <div className="checklist">
              <div className={`checklist-item ${seoTitle ? 'complete' : ''}`}>
                <span className="checklist-icon">{seoTitle ? '✓' : '○'}</span>
                <span>Meta Title configurado</span>
              </div>
              <div className={`checklist-item ${isTitleOptimal ? 'complete' : ''}`}>
                <span className="checklist-icon">{isTitleOptimal ? '✓' : '○'}</span>
                <span>Title con longitud óptima</span>
              </div>
              <div className={`checklist-item ${seoDescription ? 'complete' : ''}`}>
                <span className="checklist-icon">{seoDescription ? '✓' : '○'}</span>
                <span>Meta Description configurada</span>
              </div>
              <div className={`checklist-item ${isDescriptionOptimal ? 'complete' : ''}`}>
                <span className="checklist-icon">{isDescriptionOptimal ? '✓' : '○'}</span>
                <span>Description con longitud óptima</span>
              </div>
              <div className={`checklist-item ${slug ? 'complete' : ''}`}>
                <span className="checklist-icon">{slug ? '✓' : '○'}</span>
                <span>URL slug personalizado</span>
              </div>
              <div className={`checklist-item ${propiedad.imagen_principal ? 'complete' : ''}`}>
                <span className="checklist-icon">{propiedad.imagen_principal ? '✓' : '○'}</span>
                <span>Imagen principal configurada</span>
              </div>
              <div className={`checklist-item ${keywords.length >= 3 ? 'complete' : ''}`}>
                <span className="checklist-icon">{keywords.length >= 3 ? '✓' : '○'}</span>
                <span>Al menos 3 palabras clave</span>
              </div>
            </div>

            <div className="seo-score">
              <div className="score-label">Puntuación SEO</div>
              <div className="score-bar">
                <div
                  className="score-fill"
                  style={{
                    width: `${Math.min(100, (
                      (seoTitle ? 15 : 0) +
                      (isTitleOptimal ? 15 : 0) +
                      (seoDescription ? 15 : 0) +
                      (isDescriptionOptimal ? 15 : 0) +
                      (slug ? 15 : 0) +
                      (propiedad.imagen_principal ? 15 : 0) +
                      (keywords.length >= 3 ? 10 : keywords.length * 3)
                    ))}%`
                  }}
                />
              </div>
              <div className="score-value">
                {Math.min(100, (
                  (seoTitle ? 15 : 0) +
                  (isTitleOptimal ? 15 : 0) +
                  (seoDescription ? 15 : 0) +
                  (isDescriptionOptimal ? 15 : 0) +
                  (slug ? 15 : 0) +
                  (propiedad.imagen_principal ? 15 : 0) +
                  (keywords.length >= 3 ? 10 : keywords.length * 3)
                ))}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .propiedad-seo {
    width: 100%;
  }

  .seo-grid {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 24px;
  }

  @media (max-width: 1024px) {
    .seo-grid {
      grid-template-columns: 1fr;
    }
  }

  .section {
    background: white;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
    border: 1px solid #e2e8f0;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1rem;
    font-weight: 600;
    color: #0f172a;
    margin: 0;
  }

  .section-title svg {
    color: #0057FF;
  }

  /* Google Preview */
  .google-preview {
    background: #f8fafc;
  }

  .google-result {
    padding: 16px;
    background: white;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
  }

  .google-url {
    font-size: 0.8rem;
    color: #006621;
    margin-bottom: 4px;
  }

  .google-title {
    font-size: 1.1rem;
    color: #1a0dab;
    font-weight: 400;
    margin-bottom: 4px;
    cursor: pointer;
  }

  .google-title:hover {
    text-decoration: underline;
  }

  .google-description {
    font-size: 0.85rem;
    color: #545454;
    line-height: 1.5;
  }

  /* Form */
  .form-group {
    margin-bottom: 20px;
  }

  .form-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
    font-weight: 500;
    color: #475569;
    margin-bottom: 8px;
  }

  .char-counter {
    font-size: 0.75rem;
    font-weight: 400;
    color: #94a3b8;
  }

  .char-counter.optimal {
    color: #10B981;
  }

  .char-counter.warning {
    color: #f59e0b;
  }

  .form-input, .form-textarea {
    width: 100%;
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.9rem;
    font-family: inherit;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .form-input:focus, .form-textarea:focus {
    outline: none;
    border-color: #0057FF;
    box-shadow: 0 0 0 3px rgba(0, 87, 255, 0.1);
  }

  .form-input:disabled, .form-textarea:disabled {
    background: #f8fafc;
    color: #475569;
    cursor: default;
  }

  .form-input.has-warning, .form-textarea.has-warning {
    border-color: #f59e0b;
  }

  .form-textarea {
    resize: vertical;
    line-height: 1.5;
  }

  .field-hint {
    margin-top: 6px;
    font-size: 0.75rem;
  }

  .hint-success {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #10B981;
  }

  .hint-warning {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #f59e0b;
  }

  /* Slug input */
  .slug-input-group {
    display: flex;
    align-items: center;
    gap: 0;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
  }

  .slug-prefix {
    padding: 12px;
    font-size: 0.85rem;
    color: #64748b;
    background: #f1f5f9;
    border-right: 1px solid #e2e8f0;
    white-space: nowrap;
  }

  .slug-input {
    flex: 1;
    border: none;
    border-radius: 0;
    background: transparent;
  }

  .slug-input:focus {
    box-shadow: none;
  }

  .btn-generate {
    padding: 12px;
    background: transparent;
    border: none;
    color: #64748b;
    cursor: pointer;
    transition: color 0.2s;
  }

  .btn-generate:hover {
    color: #0057FF;
  }

  /* Keywords */
  .keywords-container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 12px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    min-height: 48px;
  }

  .keyword-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: #e0e7ff;
    color: #4f46e5;
    border-radius: 16px;
    font-size: 0.8rem;
    font-weight: 500;
  }

  .keyword-remove {
    background: none;
    border: none;
    color: #4f46e5;
    cursor: pointer;
    font-size: 1rem;
    padding: 0 2px;
    opacity: 0.7;
  }

  .keyword-remove:hover {
    opacity: 1;
  }

  .keyword-input-group {
    display: flex;
    gap: 4px;
  }

  .keyword-input {
    padding: 4px 8px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 0.8rem;
    width: 150px;
  }

  .btn-add-keyword {
    padding: 4px 10px;
    background: #0057FF;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1rem;
  }

  .btn-add-keyword:disabled {
    background: #cbd5e1;
    cursor: not-allowed;
  }

  /* Form actions */
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid #e2e8f0;
  }

  .btn-edit, .btn-cancel, .btn-save {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .btn-edit {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    color: #64748b;
  }

  .btn-edit:hover {
    background: #f1f5f9;
    color: #475569;
  }

  .btn-cancel {
    background: #f1f5f9;
    color: #64748b;
  }

  .btn-cancel:hover {
    background: #e2e8f0;
  }

  .btn-save {
    background: #0057FF;
    color: white;
  }

  .btn-save:hover {
    background: #0046cc;
  }

  .btn-save:disabled, .btn-cancel:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Side panel */
  .url-section {
    background: #f0fdf4;
    border-color: #bbf7d0;
  }

  .url-display {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: white;
    border-radius: 8px;
    margin-bottom: 12px;
  }

  .url-display code {
    flex: 1;
    font-size: 0.85rem;
    color: #166534;
    word-break: break-all;
  }

  .btn-copy {
    padding: 6px;
    background: transparent;
    border: none;
    color: #166534;
    cursor: pointer;
    border-radius: 4px;
    transition: background 0.2s;
  }

  .btn-copy:hover {
    background: #dcfce7;
  }

  .btn-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px;
    background: #166534;
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 500;
    transition: background 0.2s;
  }

  .btn-preview:hover {
    background: #14532d;
  }

  /* Checklist */
  .checklist-section {
    background: #f8fafc;
  }

  .checklist {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 20px;
  }

  .checklist-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: white;
    border-radius: 6px;
    font-size: 0.85rem;
    color: #94a3b8;
  }

  .checklist-item.complete {
    color: #10B981;
  }

  .checklist-icon {
    font-size: 0.9rem;
  }

  /* SEO Score */
  .seo-score {
    padding: 16px;
    background: white;
    border-radius: 8px;
  }

  .score-label {
    font-size: 0.85rem;
    font-weight: 500;
    color: #475569;
    margin-bottom: 8px;
  }

  .score-bar {
    height: 8px;
    background: #e2e8f0;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 8px;
  }

  .score-fill {
    height: 100%;
    background: linear-gradient(90deg, #10B981, #0057FF);
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .score-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #0f172a;
    text-align: center;
  }
`;

