/**
 * PropiedadContenido - Tab Contenido
 * Maneja descripciones extendidas, video, tour virtual y contenido multimedia
 */

import { useState } from 'react';
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
  video: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="23 7 16 12 23 17 23 7"/>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
  ),
  globe: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  fileText: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  link: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  ),
  play: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  ),
};

export default function PropiedadContenido({ propiedadId, propiedad, onUpdate }: Props) {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Estados para edición
  const [descripcion, setDescripcion] = useState(propiedad.descripcion || '');
  const [videoUrl, setVideoUrl] = useState(propiedad.video_url || '');
  const [tourUrl, setTourUrl] = useState(propiedad.tour_virtual_url || '');
  const [notas, setNotas] = useState(propiedad.notas || '');

  const handleSave = async (field: string) => {
    setSaving(true);
    try {
      const updateData: Partial<Propiedad> = {};
      switch (field) {
        case 'descripcion':
          updateData.descripcion = descripcion;
          break;
        case 'video':
          updateData.video_url = videoUrl;
          break;
        case 'tour':
          updateData.tour_virtual_url = tourUrl;
          break;
        case 'notas':
          updateData.notas = notas;
          break;
      }
      await onUpdate(updateData);
      setEditingSection(null);
    } catch (error) {
      console.error('Error guardando:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = (field: string) => {
    switch (field) {
      case 'descripcion':
        setDescripcion(propiedad.descripcion || '');
        break;
      case 'video':
        setVideoUrl(propiedad.video_url || '');
        break;
      case 'tour':
        setTourUrl(propiedad.tour_virtual_url || '');
        break;
      case 'notas':
        setNotas(propiedad.notas || '');
        break;
    }
    setEditingSection(null);
  };

  // Extraer ID de video de YouTube
  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  const youtubeId = getYouTubeId(propiedad.video_url || '');

  return (
    <div className="propiedad-contenido">
      {/* Grid de dos columnas */}
      <div className="content-grid">
        {/* Columna principal */}
        <div className="main-column">
          {/* Descripción */}
          <div className="section">
            <div className="section-header">
              <h3 className="section-title">
                {Icons.fileText}
                <span>Descripción de la propiedad</span>
              </h3>
              {editingSection !== 'descripcion' && (
                <button
                  className="btn-edit"
                  onClick={() => setEditingSection('descripcion')}
                >
                  {Icons.edit}
                  Editar
                </button>
              )}
            </div>

            {editingSection === 'descripcion' ? (
              <div className="edit-form">
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Escribe una descripción detallada de la propiedad..."
                  rows={10}
                  className="textarea-large"
                />
                <div className="char-count">{descripcion.length} caracteres</div>
                <div className="edit-actions">
                  <button
                    className="btn-cancel"
                    onClick={() => handleCancel('descripcion')}
                    disabled={saving}
                  >
                    {Icons.x}
                    Cancelar
                  </button>
                  <button
                    className="btn-save"
                    onClick={() => handleSave('descripcion')}
                    disabled={saving}
                  >
                    {Icons.save}
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="content-display">
                {propiedad.descripcion ? (
                  <p className="description-text">{propiedad.descripcion}</p>
                ) : (
                  <p className="empty-text">No hay descripción. Haz clic en "Editar" para agregar una.</p>
                )}
              </div>
            )}
          </div>

          {/* Video */}
          <div className="section">
            <div className="section-header">
              <h3 className="section-title">
                {Icons.video}
                <span>Video de la propiedad</span>
              </h3>
              {editingSection !== 'video' && (
                <button
                  className="btn-edit"
                  onClick={() => setEditingSection('video')}
                >
                  {Icons.edit}
                  {propiedad.video_url ? 'Editar' : 'Agregar'}
                </button>
              )}
            </div>

            {editingSection === 'video' ? (
              <div className="edit-form">
                <div className="input-group">
                  <span className="input-icon">{Icons.link}</span>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="input-with-icon"
                  />
                </div>
                <p className="input-hint">Soporta videos de YouTube, Vimeo y enlaces directos.</p>
                <div className="edit-actions">
                  <button
                    className="btn-cancel"
                    onClick={() => handleCancel('video')}
                    disabled={saving}
                  >
                    {Icons.x}
                    Cancelar
                  </button>
                  <button
                    className="btn-save"
                    onClick={() => handleSave('video')}
                    disabled={saving}
                  >
                    {Icons.save}
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="content-display">
                {youtubeId ? (
                  <div className="video-preview">
                    <iframe
                      src={`https://www.youtube.com/embed/${youtubeId}`}
                      title="Video de la propiedad"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : propiedad.video_url ? (
                  <div className="video-link">
                    <a href={propiedad.video_url} target="_blank" rel="noopener noreferrer">
                      {Icons.video}
                      Ver video externo
                    </a>
                  </div>
                ) : (
                  <div className="empty-state-small">
                    <div className="empty-icon">{Icons.video}</div>
                    <p>No hay video. Agrega un enlace de YouTube o Vimeo.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tour Virtual */}
          <div className="section">
            <div className="section-header">
              <h3 className="section-title">
                {Icons.globe}
                <span>Tour Virtual / 360°</span>
              </h3>
              {editingSection !== 'tour' && (
                <button
                  className="btn-edit"
                  onClick={() => setEditingSection('tour')}
                >
                  {Icons.edit}
                  {propiedad.tour_virtual_url ? 'Editar' : 'Agregar'}
                </button>
              )}
            </div>

            {editingSection === 'tour' ? (
              <div className="edit-form">
                <div className="input-group">
                  <span className="input-icon">{Icons.link}</span>
                  <input
                    type="url"
                    value={tourUrl}
                    onChange={(e) => setTourUrl(e.target.value)}
                    placeholder="https://my.matterport.com/show/?m=..."
                    className="input-with-icon"
                  />
                </div>
                <p className="input-hint">Soporta Matterport, 3DVista, Kuula y otros servicios de tour virtual.</p>
                <div className="edit-actions">
                  <button
                    className="btn-cancel"
                    onClick={() => handleCancel('tour')}
                    disabled={saving}
                  >
                    {Icons.x}
                    Cancelar
                  </button>
                  <button
                    className="btn-save"
                    onClick={() => handleSave('tour')}
                    disabled={saving}
                  >
                    {Icons.save}
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="content-display">
                {propiedad.tour_virtual_url ? (
                  <div className="tour-preview">
                    <iframe
                      src={propiedad.tour_virtual_url}
                      title="Tour Virtual"
                      frameBorder="0"
                      allowFullScreen
                    />
                    <a
                      href={propiedad.tour_virtual_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tour-fullscreen-link"
                    >
                      Abrir en pantalla completa
                    </a>
                  </div>
                ) : (
                  <div className="empty-state-small">
                    <div className="empty-icon">{Icons.globe}</div>
                    <p>No hay tour virtual. Agrega un enlace de Matterport u otro servicio.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Columna lateral */}
        <div className="side-column">
          {/* Notas internas */}
          <div className="section notes-section">
            <div className="section-header">
              <h3 className="section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <span>Notas internas</span>
              </h3>
              {editingSection !== 'notas' && (
                <button
                  className="btn-edit"
                  onClick={() => setEditingSection('notas')}
                >
                  {Icons.edit}
                </button>
              )}
            </div>

            {editingSection === 'notas' ? (
              <div className="edit-form">
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Notas privadas sobre esta propiedad..."
                  rows={6}
                />
                <div className="edit-actions">
                  <button
                    className="btn-cancel btn-small"
                    onClick={() => handleCancel('notas')}
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  <button
                    className="btn-save btn-small"
                    onClick={() => handleSave('notas')}
                    disabled={saving}
                  >
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="notes-content">
                {propiedad.notas ? (
                  <p>{propiedad.notas}</p>
                ) : (
                  <p className="empty-text">Sin notas internas</p>
                )}
              </div>
            )}
          </div>

          {/* Resumen de contenido */}
          <div className="section summary-section">
            <h3 className="section-title">Resumen de contenido</h3>
            <div className="summary-list">
              <div className={`summary-item ${propiedad.descripcion ? 'complete' : ''}`}>
                <span className="summary-icon">
                  {propiedad.descripcion ? '✓' : '○'}
                </span>
                <span>Descripción</span>
              </div>
              <div className={`summary-item ${propiedad.video_url ? 'complete' : ''}`}>
                <span className="summary-icon">
                  {propiedad.video_url ? '✓' : '○'}
                </span>
                <span>Video</span>
              </div>
              <div className={`summary-item ${propiedad.tour_virtual_url ? 'complete' : ''}`}>
                <span className="summary-icon">
                  {propiedad.tour_virtual_url ? '✓' : '○'}
                </span>
                <span>Tour Virtual</span>
              </div>
              <div className={`summary-item ${(propiedad.imagenes?.length || 0) > 0 ? 'complete' : ''}`}>
                <span className="summary-icon">
                  {(propiedad.imagenes?.length || 0) > 0 ? '✓' : '○'}
                </span>
                <span>Imágenes ({propiedad.imagenes?.length || 0})</span>
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
  .propiedad-contenido {
    width: 100%;
  }

  .content-grid {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 24px;
  }

  @media (max-width: 1024px) {
    .content-grid {
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
    margin-bottom: 16px;
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

  .btn-edit {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 500;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-edit:hover {
    background: #f1f5f9;
    color: #475569;
    border-color: #cbd5e1;
  }

  .edit-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  textarea {
    width: 100%;
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.9rem;
    font-family: inherit;
    resize: vertical;
    line-height: 1.6;
  }

  textarea:focus {
    outline: none;
    border-color: #0057FF;
    box-shadow: 0 0 0 3px rgba(0, 87, 255, 0.1);
  }

  .textarea-large {
    min-height: 200px;
  }

  .char-count {
    font-size: 0.75rem;
    color: #94a3b8;
    text-align: right;
  }

  .input-group {
    position: relative;
    display: flex;
    align-items: center;
  }

  .input-icon {
    position: absolute;
    left: 12px;
    color: #94a3b8;
  }

  .input-with-icon {
    width: 100%;
    padding: 12px 12px 12px 40px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.9rem;
  }

  .input-with-icon:focus {
    outline: none;
    border-color: #0057FF;
    box-shadow: 0 0 0 3px rgba(0, 87, 255, 0.1);
  }

  .input-hint {
    font-size: 0.75rem;
    color: #94a3b8;
    margin: 0;
  }

  .edit-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 8px;
  }

  .btn-cancel, .btn-save {
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

  .btn-small {
    padding: 6px 12px;
    font-size: 0.8rem;
  }

  .content-display {
    color: #475569;
  }

  .description-text {
    line-height: 1.7;
    white-space: pre-wrap;
    margin: 0;
  }

  .empty-text {
    color: #94a3b8;
    font-style: italic;
    margin: 0;
  }

  .empty-state-small {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32px;
    background: #f8fafc;
    border-radius: 8px;
    text-align: center;
  }

  .empty-state-small .empty-icon {
    color: #cbd5e1;
    margin-bottom: 12px;
  }

  .empty-state-small p {
    color: #94a3b8;
    font-size: 0.9rem;
    margin: 0;
  }

  .video-preview {
    position: relative;
    padding-bottom: 56.25%;
    height: 0;
    overflow: hidden;
    border-radius: 8px;
    background: #0f172a;
  }

  .video-preview iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .video-link {
    display: flex;
    justify-content: center;
    padding: 24px;
    background: #f8fafc;
    border-radius: 8px;
  }

  .video-link a {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    background: #0057FF;
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 500;
    transition: background 0.2s;
  }

  .video-link a:hover {
    background: #0046cc;
  }

  .tour-preview {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .tour-preview iframe {
    width: 100%;
    height: 400px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
  }

  .tour-fullscreen-link {
    align-self: flex-end;
    font-size: 0.8rem;
    color: #0057FF;
    text-decoration: none;
  }

  .tour-fullscreen-link:hover {
    text-decoration: underline;
  }

  /* Sidebar sections */
  .notes-section {
    background: #fffbeb;
    border-color: #fde68a;
  }

  .notes-content {
    color: #92400e;
    font-size: 0.9rem;
    line-height: 1.6;
  }

  .notes-content p {
    margin: 0;
  }

  .summary-section {
    background: #f8fafc;
  }

  .summary-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .summary-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: white;
    border-radius: 6px;
    font-size: 0.9rem;
    color: #94a3b8;
  }

  .summary-item.complete {
    color: #10B981;
  }

  .summary-icon {
    font-size: 0.85rem;
  }
`;

