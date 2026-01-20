/**
 * SingleImageUploader - Componente para subir una sola imagen
 * Usado para logos, fotos de perfil, firmas, etc.
 */

import { useState, useRef } from 'react';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';

interface SingleImageUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
  tenantId: string;
  folder?: string;
  label?: string;
  hint?: string;
  aspectRatio?: string; // e.g. "16/9", "1/1", "auto"
  maxWidth?: number;
  maxHeight?: number;
  darkPreview?: boolean; // Para logos blancos
  circular?: boolean; // Para avatares
  accept?: string;
}

export default function SingleImageUploader({
  value,
  onChange,
  tenantId,
  folder = 'branding',
  label,
  hint,
  aspectRatio = 'auto',
  maxWidth = 300,
  maxHeight = 200,
  darkPreview = false,
  circular = false,
  accept = 'image/*',
}: SingleImageUploaderProps) {
  const { getToken } = useClerkAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten imágenes');
      return;
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no debe superar 5MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', folder);

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/tenants/${tenantId}/upload/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error al subir imagen');
      }

      const data = await response.json();
      onChange(data.url);
    } catch (err: any) {
      console.error('Error uploading image:', err);
      setError(err.message || 'Error al subir imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleRemove = () => {
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="single-image-uploader">
      {label && <label className="uploader-label">{label}</label>}

      <div
        className={`uploader-area ${dragOver ? 'drag-over' : ''} ${value ? 'has-image' : ''} ${darkPreview ? 'dark-preview' : ''} ${circular ? 'circular' : ''}`}
        style={{
          maxWidth: maxWidth,
          aspectRatio: aspectRatio !== 'auto' ? aspectRatio : undefined,
          maxHeight: aspectRatio === 'auto' ? maxHeight : undefined,
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !value && fileInputRef.current?.click()}
      >
        {uploading ? (
          <div className="uploading-state">
            <Loader2 className="spin" size={32} />
            <span>Subiendo...</span>
          </div>
        ) : value ? (
          <div className="image-preview">
            <img src={value} alt={label || 'Imagen'} />
            <div className="image-actions">
              <button
                type="button"
                className="btn-change"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              >
                Cambiar
              </button>
              <button
                type="button"
                className="btn-remove"
                onClick={(e) => { e.stopPropagation(); handleRemove(); }}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <ImageIcon size={32} />
            <span>Arrastra una imagen o haz clic</span>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          style={{ display: 'none' }}
        />
      </div>

      {hint && <span className="uploader-hint">{hint}</span>}
      {error && <span className="uploader-error">{error}</span>}

      <style>{`
        .single-image-uploader {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .uploader-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .uploader-area {
          border: 2px dashed #e2e8f0;
          border-radius: 12px;
          background: #f8fafc;
          cursor: pointer;
          transition: all 0.2s;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 120px;
        }

        .uploader-area:hover {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .uploader-area.drag-over {
          border-color: #3b82f6;
          background: #dbeafe;
        }

        .uploader-area.has-image {
          border-style: solid;
          cursor: default;
        }

        .uploader-area.dark-preview {
          background: #1e293b;
        }

        .uploader-area.dark-preview:hover {
          background: #334155;
        }

        .uploader-area.circular {
          border-radius: 50%;
          aspect-ratio: 1/1;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: #94a3b8;
          padding: 20px;
          text-align: center;
        }

        .empty-state span {
          font-size: 0.8rem;
        }

        .uploading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: #3b82f6;
        }

        .uploading-state span {
          font-size: 0.85rem;
          font-weight: 500;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .image-preview {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .image-preview img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .circular .image-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .image-actions {
          position: absolute;
          bottom: 8px;
          right: 8px;
          display: flex;
          gap: 6px;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .uploader-area:hover .image-actions {
          opacity: 1;
        }

        .btn-change {
          padding: 6px 12px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          backdrop-filter: blur(4px);
        }

        .btn-change:hover {
          background: rgba(0, 0, 0, 0.85);
        }

        .btn-remove {
          padding: 6px;
          background: rgba(239, 68, 68, 0.9);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-remove:hover {
          background: rgba(220, 38, 38, 1);
        }

        .uploader-hint {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .uploader-error {
          font-size: 0.75rem;
          color: #ef4444;
        }
      `}</style>
    </div>
  );
}
