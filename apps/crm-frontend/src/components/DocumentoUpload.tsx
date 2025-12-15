/**
 * DocumentoUpload - Componente para subir y gestionar documentos
 */

import { useState } from 'react';
import { Upload, File, X, Loader } from 'lucide-react';

interface Documento {
  id: string;
  tipo: string;
  nombre: string;
  url: string;
  fecha_subida?: string;
}

interface DocumentoUploadProps {
  tipo: string;
  label: string;
  documento?: Documento;
  onUpload: (file: File) => void;
  onRemove: () => void;
  tenantId?: string;
  accept?: string;
}

export default function DocumentoUpload({
  tipo,
  label,
  documento,
  onUpload,
  onRemove,
  tenantId,
  accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png',
}: DocumentoUploadProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (file: File) => {
    if (!file) return;

    // Validar tipo de archivo
    const validExtensions = accept.split(',').map(ext => ext.trim().toLowerCase());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      alert(`Tipo de archivo no válido. Extensiones permitidas: ${accept}`);
      return;
    }

    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('El archivo es demasiado grande. Tamaño máximo: 10MB');
      return;
    }

    // Llamar a onUpload (el archivo se guardará en memoria y se subirá al guardar)
    onUpload(file);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="documento-upload-container">
      <style>{`
        .documento-upload-container {
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
          padding: 20px;
          background: #f8fafc;
          transition: all 0.2s;
        }

        .documento-upload-container.drag-active {
          border-color: #6366f1;
          background: #eef2ff;
        }

        .documento-upload-container.has-document {
          border-color: #10b981;
          background: #f0fdf4;
        }

        .documento-label {
          display: block;
          font-weight: 600;
          color: #1e293b;
          font-size: 0.9rem;
          margin-bottom: 12px;
        }

        .documento-upload-area {
          position: relative;
          min-height: 120px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .documento-upload-area:hover {
          opacity: 0.8;
        }

        .documento-icon {
          color: #6366f1;
        }

        .documento-upload-text {
          text-align: center;
          color: #64748b;
          font-size: 0.875rem;
        }

        .documento-upload-text strong {
          color: #6366f1;
          font-weight: 600;
        }

        .documento-file-info {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: white;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          width: 100%;
        }

        .documento-file-icon {
          color: #6366f1;
          flex-shrink: 0;
        }

        .documento-file-details {
          flex: 1;
          min-width: 0;
        }

        .documento-file-name {
          font-weight: 600;
          color: #1e293b;
          font-size: 0.9rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .documento-file-size {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 2px;
        }

        .documento-remove-btn {
          background: none;
          border: none;
          color: #dc2626;
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .documento-remove-btn:hover {
          background: #fee2e2;
        }

        .documento-upload-input {
          display: none;
        }

        .documento-loading {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #6366f1;
          font-size: 0.875rem;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #e2e8f0;
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <label className="documento-label">{label}</label>

      {documento ? (
        <div className="documento-file-info">
          <File className="documento-file-icon w-5 h-5" />
          <div className="documento-file-details">
            <div className="documento-file-name">{documento.nombre}</div>
            {documento.fecha_subida && (
              <div className="documento-file-size">
                {documento.url.startsWith('blob:') ? 'Pendiente de subir' : `Subido: ${new Date(documento.fecha_subida).toLocaleDateString('es-ES')}`}
              </div>
            )}
          </div>
          <button
            type="button"
            className="documento-remove-btn"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            title="Eliminar documento"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          className={`documento-upload-area ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => {
            const input = document.getElementById(`file-input-${tipo}`) as HTMLInputElement;
            input?.click();
          }}
        >
          <Upload className="documento-icon w-8 h-8" />
          <div className="documento-upload-text">
            <strong>Haz clic para subir</strong> o arrastra el archivo aquí
            <br />
            <span style={{ fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
              Formatos: PDF, DOC, DOCX, JPG, PNG (máx. 10MB)
            </span>
          </div>
          <input
            id={`file-input-${tipo}`}
            type="file"
            className="documento-upload-input"
            accept={accept}
            onChange={handleInputChange}
          />
        </div>
      )}
    </div>
  );
}

