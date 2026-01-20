/**
 * PropiedadDocumentos - Tab Documentos
 * Gestión de documentos y archivos adjuntos de la propiedad
 */

import { useState } from 'react';
import { Propiedad } from '../../../services/api';

interface Props {
  propiedadId: string;
  propiedad: Propiedad;
  onUpdate: (data: Partial<Propiedad>) => Promise<void>;
}

interface Documento {
  id: string;
  nombre: string;
  tipo: string;
  tamanio: number;
  url: string;
  categoria: 'legal' | 'planos' | 'fotos' | 'contratos' | 'otros';
  fecha_subida: string;
}

// Iconos SVG
const Icons = {
  file: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
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
  image: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  ),
  filePlus: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="12" y1="18" x2="12" y2="12"/>
      <line x1="9" y1="15" x2="15" y2="15"/>
    </svg>
  ),
  download: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  trash: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  ),
  eye: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  upload: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  folder: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  pdf: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <text x="6" y="16" fontSize="6" fill="currentColor" stroke="none">PDF</text>
    </svg>
  ),
};

// Categorías de documentos
const CATEGORIAS = {
  legal: { label: 'Documentos Legales', icon: Icons.fileText, color: '#dc2626' },
  planos: { label: 'Planos', icon: Icons.file, color: '#2563eb' },
  fotos: { label: 'Fotografías', icon: Icons.image, color: '#10b981' },
  contratos: { label: 'Contratos', icon: Icons.fileText, color: '#f59e0b' },
  otros: { label: 'Otros', icon: Icons.folder, color: '#6b7280' },
};

// Documentos de ejemplo (simulados)
const mockDocumentos: Documento[] = [
  { id: '1', nombre: 'Escritura_propiedad.pdf', tipo: 'application/pdf', tamanio: 2500000, url: '#', categoria: 'legal', fecha_subida: '2024-01-10' },
  { id: '2', nombre: 'Plano_arquitectonico.dwg', tipo: 'application/dwg', tamanio: 5800000, url: '#', categoria: 'planos', fecha_subida: '2024-01-08' },
  { id: '3', nombre: 'Contrato_exclusividad.pdf', tipo: 'application/pdf', tamanio: 1200000, url: '#', categoria: 'contratos', fecha_subida: '2024-01-05' },
];

export default function PropiedadDocumentos({ propiedadId, propiedad, onUpdate }: Props) {
  const [documentos] = useState<Documento[]>(mockDocumentos);
  const [selectedCategoria, setSelectedCategoria] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getFileIcon = (tipo: string) => {
    if (tipo.includes('pdf')) return Icons.pdf;
    if (tipo.includes('image')) return Icons.image;
    return Icons.file;
  };

  const filteredDocumentos = selectedCategoria
    ? documentos.filter(d => d.categoria === selectedCategoria)
    : documentos;

  const documentosPorCategoria = Object.keys(CATEGORIAS).reduce((acc, cat) => {
    acc[cat] = documentos.filter(d => d.categoria === cat).length;
    return acc;
  }, {} as Record<string, number>);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    // Aquí iría la lógica de subida de archivos
    console.log('Archivos soltados:', e.dataTransfer.files);
  };

  return (
    <div className="propiedad-documentos">
      <div className="docs-grid">
        {/* Columna principal */}
        <div className="main-column">
          {/* Zona de subida */}
          <div
            className={`upload-zone ${dragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="upload-icon">{Icons.upload}</div>
            <div className="upload-text">
              <span className="upload-title">Arrastra archivos aquí</span>
              <span className="upload-subtitle">o haz clic para seleccionar</span>
            </div>
            <input
              type="file"
              multiple
              className="upload-input"
              onChange={(e) => console.log('Archivos seleccionados:', e.target.files)}
            />
          </div>

          {/* Lista de documentos */}
          <div className="section">
            <div className="section-header">
              <h3 className="section-title">
                {Icons.folder}
                <span>Documentos ({filteredDocumentos.length})</span>
              </h3>
              {selectedCategoria && (
                <button
                  className="btn-clear-filter"
                  onClick={() => setSelectedCategoria(null)}
                >
                  Mostrar todos
                </button>
              )}
            </div>

            {filteredDocumentos.length > 0 ? (
              <div className="docs-list">
                {filteredDocumentos.map((doc) => (
                  <div key={doc.id} className="doc-item">
                    <div className={`doc-icon ${doc.categoria}`}>
                      {getFileIcon(doc.tipo)}
                    </div>
                    <div className="doc-info">
                      <div className="doc-name">{doc.nombre}</div>
                      <div className="doc-meta">
                        <span className="doc-size">{formatFileSize(doc.tamanio)}</span>
                        <span className="doc-separator">•</span>
                        <span className="doc-date">{formatDate(doc.fecha_subida)}</span>
                        <span className="doc-separator">•</span>
                        <span
                          className="doc-category"
                          style={{ color: CATEGORIAS[doc.categoria].color }}
                        >
                          {CATEGORIAS[doc.categoria].label}
                        </span>
                      </div>
                    </div>
                    <div className="doc-actions">
                      <button className="btn-action" title="Ver">
                        {Icons.eye}
                      </button>
                      <button className="btn-action" title="Descargar">
                        {Icons.download}
                      </button>
                      <button className="btn-action delete" title="Eliminar">
                        {Icons.trash}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">{Icons.file}</div>
                <p>No hay documentos {selectedCategoria ? `en ${CATEGORIAS[selectedCategoria as keyof typeof CATEGORIAS].label}` : ''}</p>
                <span>Arrastra archivos o haz clic en la zona de subida</span>
              </div>
            )}
          </div>
        </div>

        {/* Columna lateral */}
        <div className="side-column">
          {/* Categorías */}
          <div className="section categories-section">
            <h3 className="section-title">Categorías</h3>
            <div className="categories-list">
              {Object.entries(CATEGORIAS).map(([key, cat]) => (
                <button
                  key={key}
                  className={`category-item ${selectedCategoria === key ? 'active' : ''}`}
                  onClick={() => setSelectedCategoria(selectedCategoria === key ? null : key)}
                >
                  <div className="category-icon" style={{ color: cat.color }}>
                    {cat.icon}
                  </div>
                  <span className="category-name">{cat.label}</span>
                  <span className="category-count">{documentosPorCategoria[key] || 0}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Resumen */}
          <div className="section summary-section">
            <h3 className="section-title">Resumen</h3>
            <div className="summary-stats">
              <div className="summary-item">
                <span className="summary-label">Total documentos</span>
                <span className="summary-value">{documentos.length}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Espacio usado</span>
                <span className="summary-value">
                  {formatFileSize(documentos.reduce((acc, d) => acc + d.tamanio, 0))}
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Último subido</span>
                <span className="summary-value">
                  {documentos.length > 0
                    ? formatDate(documentos.sort((a, b) =>
                        new Date(b.fecha_subida).getTime() - new Date(a.fecha_subida).getTime()
                      )[0].fecha_subida)
                    : 'N/A'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Tipos aceptados */}
          <div className="section info-section">
            <h3 className="section-title">Tipos aceptados</h3>
            <div className="file-types">
              <span className="file-type">PDF</span>
              <span className="file-type">DOC/DOCX</span>
              <span className="file-type">XLS/XLSX</span>
              <span className="file-type">JPG/PNG</span>
              <span className="file-type">DWG</span>
              <span className="file-type">ZIP</span>
            </div>
            <p className="info-text">Tamaño máximo: 50 MB por archivo</p>
          </div>
        </div>
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .propiedad-documentos {
    width: 100%;
  }

  .docs-grid {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 24px;
  }

  @media (max-width: 1024px) {
    .docs-grid {
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

  .btn-clear-filter {
    padding: 6px 12px;
    background: #f1f5f9;
    border: none;
    border-radius: 6px;
    font-size: 0.8rem;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-clear-filter:hover {
    background: #e2e8f0;
    color: #475569;
  }

  /* Upload zone */
  .upload-zone {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    margin-bottom: 24px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border: 2px dashed #cbd5e1;
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .upload-zone:hover, .upload-zone.dragging {
    border-color: #0057FF;
    background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%);
  }

  .upload-zone.dragging {
    border-style: solid;
  }

  .upload-icon {
    color: #0057FF;
    margin-bottom: 16px;
  }

  .upload-text {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .upload-title {
    font-size: 1rem;
    font-weight: 600;
    color: #0f172a;
  }

  .upload-subtitle {
    font-size: 0.85rem;
    color: #64748b;
  }

  .upload-input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }

  /* Documents list */
  .docs-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .doc-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    background: #f8fafc;
    border-radius: 12px;
    transition: all 0.2s;
  }

  .doc-item:hover {
    background: #f1f5f9;
  }

  .doc-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    background: white;
    border: 1px solid #e2e8f0;
  }

  .doc-icon.legal { color: #dc2626; }
  .doc-icon.planos { color: #2563eb; }
  .doc-icon.fotos { color: #10b981; }
  .doc-icon.contratos { color: #f59e0b; }
  .doc-icon.otros { color: #6b7280; }

  .doc-info {
    flex: 1;
    min-width: 0;
  }

  .doc-name {
    font-size: 0.95rem;
    font-weight: 500;
    color: #0f172a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 4px;
  }

  .doc-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.8rem;
    color: #64748b;
  }

  .doc-separator {
    color: #cbd5e1;
  }

  .doc-category {
    font-weight: 500;
  }

  .doc-actions {
    display: flex;
    gap: 4px;
  }

  .btn-action {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-action:hover {
    background: #f1f5f9;
    color: #0057FF;
    border-color: #0057FF;
  }

  .btn-action.delete:hover {
    color: #dc2626;
    border-color: #dc2626;
  }

  /* Empty state */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 48px 24px;
    text-align: center;
  }

  .empty-icon {
    color: #cbd5e1;
    margin-bottom: 16px;
  }

  .empty-state p {
    font-size: 1rem;
    font-weight: 500;
    color: #64748b;
    margin: 0 0 8px 0;
  }

  .empty-state span {
    font-size: 0.85rem;
    color: #94a3b8;
  }

  /* Categories */
  .categories-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .category-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: #f8fafc;
    border: 1px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
    text-align: left;
  }

  .category-item:hover {
    background: #f1f5f9;
  }

  .category-item.active {
    background: #eff6ff;
    border-color: #0057FF;
  }

  .category-icon {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border-radius: 8px;
  }

  .category-name {
    flex: 1;
    font-size: 0.9rem;
    color: #0f172a;
  }

  .category-count {
    padding: 2px 8px;
    background: #e2e8f0;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #64748b;
  }

  .category-item.active .category-count {
    background: #0057FF;
    color: white;
  }

  /* Summary */
  .summary-stats {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .summary-item {
    display: flex;
    justify-content: space-between;
    padding: 12px;
    background: #f8fafc;
    border-radius: 8px;
  }

  .summary-label {
    font-size: 0.85rem;
    color: #64748b;
  }

  .summary-value {
    font-size: 0.85rem;
    font-weight: 600;
    color: #0f172a;
  }

  /* File types */
  .file-types {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }

  .file-type {
    padding: 4px 10px;
    background: #f1f5f9;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 500;
    color: #475569;
  }

  .info-text {
    font-size: 0.8rem;
    color: #94a3b8;
    margin: 0;
  }
`;

