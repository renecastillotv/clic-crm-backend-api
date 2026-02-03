/**
 * DocumentoModal - Modal para agregar documentos con selector de tipo
 */

import { useState } from 'react';

interface DocumentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tipo: string, nombre: string, file: File) => void;
  tiposDisponibles?: string[];
}

const Icons = {
  x: (props?: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  ),
  upload: (props?: any) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
};

const TIPOS_DOCUMENTO = [
  'Garantía Medio Ambiente',
  'Permiso Turismo',
  'Permiso Obras Públicas',
  'Permiso Ayuntamiento',
  'Licencia de Construcción',
  'Evaluación Legal',
  'Fideicomiso',
  'Bono Primera Vivienda',
  'Bono Militar',
  'Contrato de Venta',
  'Escritura',
  'Certificado de Título',
  'Otro',
];

export default function DocumentoModal({ isOpen, onClose, onSubmit, tiposDisponibles }: DocumentoModalProps) {
  const [tipoSeleccionado, setTipoSeleccionado] = useState('');
  const [nombrePersonalizado, setNombrePersonalizado] = useState('');
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const tipos = tiposDisponibles || TIPOS_DOCUMENTO;

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    // Validar tipo de archivo
    const validExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      alert(`Tipo de archivo no válido. Extensiones permitidas: ${validExtensions.join(', ')}`);
      return;
    }

    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('El archivo es demasiado grande. Tamaño máximo: 10MB');
      return;
    }

    setArchivoSeleccionado(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tipoSeleccionado) {
      alert('Por favor selecciona un tipo de documento');
      return;
    }

    if (!archivoSeleccionado) {
      alert('Por favor selecciona un archivo');
      return;
    }

    const nombreFinal = tipoSeleccionado === 'Otro' 
      ? nombrePersonalizado.trim() 
      : tipoSeleccionado;

    if (!nombreFinal) {
      alert('Por favor ingresa un nombre para el documento');
      return;
    }

    onSubmit('adicional', nombreFinal, archivoSeleccionado);
    
    // Reset
    setTipoSeleccionado('');
    setNombrePersonalizado('');
    setArchivoSeleccionado(null);
    onClose();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="documento-modal-overlay" onClick={onClose}>
      <div className="documento-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="documento-modal-header">
          <h2>Agregar Documento</h2>
          <button type="button" className="close-btn" onClick={onClose}>
            <Icons.x />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="documento-modal-form">
          <div className="modal-body">
            {/* Selector de tipo */}
            <div className="form-group full-width">
              <label>Tipo de Documento *</label>
              <select
                value={tipoSeleccionado}
                onChange={(e) => setTipoSeleccionado(e.target.value)}
                required
                style={{
                  padding: '10px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  width: '100%',
                  background: 'white',
                }}
              >
                <option value="">Selecciona un tipo...</option>
                {tipos.map((tipo) => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>
            </div>

            {/* Nombre personalizado si es "Otro" */}
            {tipoSeleccionado === 'Otro' && (
              <div className="form-group full-width">
                <label>Nombre del Documento *</label>
                <input
                  type="text"
                  value={nombrePersonalizado}
                  onChange={(e) => setNombrePersonalizado(e.target.value)}
                  placeholder="Ej: Certificado de Zonificación"
                  required
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    width: '100%',
                  }}
                />
              </div>
            )}

            {/* Selector de archivo */}
            <div className="form-group full-width">
              <label>Archivo *</label>
              {archivoSeleccionado ? (
                <div style={{
                  padding: '12px',
                  background: '#f0fdf4',
                  border: '2px solid #10b981',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{archivoSeleccionado.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                      {formatFileSize(archivoSeleccionado.size)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setArchivoSeleccionado(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc2626',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    <Icons.x />
                  </button>
                </div>
              ) : (
                <div
                  className={`file-drop-zone ${dragActive ? 'drag-active' : ''}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => {
                    const input = document.getElementById('file-input-modal') as HTMLInputElement;
                    input?.click();
                  }}
                >
                  <Icons.upload />
                  <div>
                    <strong>Haz clic para seleccionar</strong> o arrastra el archivo aquí
                    <br />
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      PDF, DOC, DOCX, JPG, PNG (máx. 10MB)
                    </span>
                  </div>
                  <input
                    id="file-input-modal"
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={!tipoSeleccionado || !archivoSeleccionado}>
              Agregar Documento
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .documento-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 20px;
          animation: fadeIn 0.2s;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .documento-modal-content {
          background: white;
          border-radius: 20px;
          width: 100%;
          max-width: min(500px, 90vw);
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .documento-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 28px 32px;
          border-bottom: 2px solid #f1f5f9;
        }

        .documento-modal-header h2 {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 700;
          color: #0f172a;
        }

        .close-btn {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .documento-modal-form {
          padding: 32px;
          display: flex;
          flex-direction: column;
        }

        .modal-body {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 24px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-weight: 600;
          color: #1e293b;
          font-size: 0.9rem;
        }

        .file-drop-zone {
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
          padding: 40px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background: #f8fafc;
        }

        .file-drop-zone:hover,
        .file-drop-zone.drag-active {
          border-color: #6366f1;
          background: #eef2ff;
        }

        .file-drop-zone svg {
          color: #6366f1;
          margin-bottom: 12px;
        }

        .file-drop-zone strong {
          color: #6366f1;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding-top: 24px;
          border-top: 2px solid #f1f5f9;
        }

        .btn-primary {
          background-color: #0f172a;
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #1e293b;
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background-color: #e2e8f0;
          color: #1e293b;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .btn-secondary:hover {
          background-color: #cbd5e1;
        }
      `}</style>
    </div>
  );
}














