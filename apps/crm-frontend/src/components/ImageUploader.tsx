/**
 * ImageUploader - Componente moderno para gestionar imágenes de propiedades
 * 
 * Características:
 * - Drag and drop para reordenar imágenes
 * - Carrusel cuando hay muchas imágenes
 * - Carga diferida: guarda en memoria primero, sube solo al guardar
 * - Generación de thumbnails
 * - UI/UX moderna y elegante
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';

export interface ImageMetadata {
  alt: string;
  title: string;
}

export interface PendingImage {
  id: string;
  file: File;
  preview: string; // URL blob para preview
  thumbnail?: string; // URL blob para thumbnail
  metadata: ImageMetadata;
  isMain: boolean;
  uploaded?: boolean; // Si ya fue subida a R2
  url?: string; // URL final en R2 (si ya fue subida)
  key?: string; // Key en R2
}

interface ImageUploaderProps {
  tenantId: string;
  mainImage?: string;
  images?: string[];
  onMainImageChange?: (url: string) => void;
  onImagesChange?: (urls: string[]) => void;
  onImagesDataChange?: (images: PendingImage[]) => void;
  maxImages?: number;
  folder?: string;
  propertyTitle?: string;
  propertyCode?: string;
  // Nueva prop para obtener imágenes directamente
  getImagesRef?: React.MutableRefObject<(() => PendingImage[]) | null>;
}

const Icons = {
  upload: (props?: any) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  x: (props?: any) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  star: (props?: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  loader: (props?: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" y1="2" x2="12" y2="6"/>
      <line x1="12" y1="18" x2="12" y2="22"/>
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
      <line x1="2" y1="12" x2="6" y2="12"/>
      <line x1="18" y1="12" x2="22" y2="12"/>
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
    </svg>
  ),
  grip: (props?: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="9" cy="12" r="1"/>
      <circle cx="9" cy="5" r="1"/>
      <circle cx="9" cy="19" r="1"/>
      <circle cx="15" cy="12" r="1"/>
      <circle cx="15" cy="5" r="1"/>
      <circle cx="15" cy="19" r="1"/>
    </svg>
  ),
  chevronLeft: (props?: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  chevronRight: (props?: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  image: (props?: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  ),
  check: (props?: any) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
};

// Generar thumbnail desde un File
async function generateThumbnail(file: File, maxSize: number = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          reject(new Error('No se pudo crear contexto del canvas'));
        }
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ImageUploader({
  tenantId,
  mainImage = '',
  images = [],
  onMainImageChange,
  onImagesChange,
  onImagesDataChange,
  maxImages = 50,
  folder = 'propiedades',
  propertyTitle = '',
  propertyCode = '',
  getImagesRef,
}: ImageUploaderProps) {
  const { getToken } = useClerkAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  // Inicializar estado solo una vez con las props iniciales
  const [pendingImages, setPendingImages] = useState<PendingImage[]>(() => {
    const existing: PendingImage[] = [];
    if (mainImage) {
      existing.push({
        id: `existing-${mainImage}`,
        file: new File([], 'existing-main.jpg'),
        preview: mainImage,
        metadata: {
          alt: propertyTitle ? `${propertyTitle} - Imagen principal` : 'Imagen principal de la propiedad',
          title: propertyTitle || 'Imagen principal',
        },
        isMain: true,
        uploaded: true,
        url: mainImage,
      });
    }
    images.forEach((url, index) => {
      if (url && url !== mainImage) {
        existing.push({
          id: `existing-${url}`,
          file: new File([], `existing-${index}.jpg`),
          preview: url,
          metadata: {
            alt: propertyTitle ? `${propertyTitle} - Imagen ${index + 1}` : `Imagen ${index + 1} de la propiedad`,
            title: propertyTitle || `Imagen ${index + 1}`,
          },
          isMain: false,
          uploaded: true,
          url: url,
        });
      }
    });
    return existing;
  });

  // Exponer función para obtener imágenes directamente
  useEffect(() => {
    if (getImagesRef) {
      getImagesRef.current = () => pendingImages;
    }
  }, [pendingImages, getImagesRef]);

  // Notificar cambios solo cuando pendingImages cambia realmente
  // Usar useRef para evitar loops infinitos
  const lastNotifiedRef = useRef<string>('');
  
  useEffect(() => {
    // Crear un hash del estado actual para comparar
    const currentHash = JSON.stringify(pendingImages.map(img => ({
      id: img.id,
      url: img.url,
      preview: img.preview,
      isMain: img.isMain,
      uploaded: img.uploaded
    })));
    
    // Solo notificar si realmente cambió
    if (currentHash === lastNotifiedRef.current) {
      return;
    }
    
    lastNotifiedRef.current = currentHash;
    
    console.log('🔄 ImageUploader: Notificando cambios de estado interno', {
      total: pendingImages.length,
      nuevas: pendingImages.filter(img => !img.uploaded).length,
      subidas: pendingImages.filter(img => img.uploaded).length
    });
    
    if (onImagesDataChange) {
      onImagesDataChange(pendingImages);
    }
    if (onImagesChange) {
      const urls = pendingImages.map(img => img.url || img.preview).filter(Boolean) as string[];
      onImagesChange(urls);
    }
    const mainImg = pendingImages.find(img => img.isMain);
    if (mainImg && onMainImageChange) {
      onMainImageChange(mainImg.url || mainImg.preview);
    }
  }, [pendingImages, onImagesChange, onMainImageChange, onImagesDataChange]);

  // Generar metadata SEO automática
  const generateMetadata = (fileName: string, index: number): ImageMetadata => {
    const baseName = fileName.replace(/\.[^/.]+$/, '');
    const alt = propertyTitle 
      ? `${propertyTitle}${propertyCode ? ` (${propertyCode})` : ''} - ${baseName}`
      : `Imagen ${index + 1} de la propiedad`;
    const title = propertyTitle || baseName;
    return { alt, title };
  };

  // Manejar selección de archivos
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (pendingImages.length + files.length > maxImages) {
      setError(`Solo se pueden subir hasta ${maxImages} imágenes. Ya tienes ${pendingImages.length}.`);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const newImages: PendingImage[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const id = `pending-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`;
        const preview = URL.createObjectURL(file);
        const thumbnail = await generateThumbnail(file, 200);
        const metadata = generateMetadata(file.name, pendingImages.length + i + 1);

        newImages.push({
          id,
          file,
          preview,
          thumbnail,
          metadata,
          isMain: false,
          uploaded: false,
        });
      }

      const hasMain = pendingImages.some(img => img.isMain);
      if (!hasMain && newImages.length > 0) {
        newImages[0].isMain = true;
      }

      setPendingImages(prev => {
        const updated = [...prev, ...newImages];
        console.log('✅ ImageUploader: Imágenes agregadas al estado', {
          anteriores: prev.length,
          nuevas: newImages.length,
          total: updated.length,
          nuevasDetalle: newImages.map(img => ({
            id: img.id,
            fileName: img.file.name,
            fileSize: img.file.size,
            uploaded: img.uploaded
          }))
        });
        return updated;
      });
    } catch (err: any) {
      console.error('Error procesando imágenes:', err);
      setError(err.message || 'Error al procesar imágenes');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...pendingImages];
    const dragged = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, dragged);
    setPendingImages(newImages);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Drop zone handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleDragOverZone = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Establecer como principal
  const handleSetMain = (id: string) => {
    setPendingImages(prev => prev.map(img => ({
      ...img,
      isMain: img.id === id,
    })));
  };

  // Eliminar imagen
  const handleRemove = (id: string) => {
    setPendingImages(prev => {
      const updated = prev.filter(img => img.id !== id);
      const wasMain = prev.find(img => img.id === id)?.isMain;
      
      if (wasMain && updated.length > 0) {
        updated[0].isMain = true;
      }

      const removed = prev.find(img => img.id === id);
      if (removed && !removed.uploaded) {
        URL.revokeObjectURL(removed.preview);
        if (removed.thumbnail) {
          URL.revokeObjectURL(removed.thumbnail);
        }
      }

      return updated;
    });
  };

  // Carrusel navigation
  const ITEMS_PER_PAGE = 8;
  const totalPages = Math.ceil(pendingImages.length / ITEMS_PER_PAGE);
  const currentPageImages = pendingImages.slice(
    carouselIndex * ITEMS_PER_PAGE,
    (carouselIndex + 1) * ITEMS_PER_PAGE
  );
  const showCarousel = pendingImages.length > ITEMS_PER_PAGE;

  const mainImageObj = pendingImages.find(img => img.isMain);

  return (
    <div className="image-uploader-modern">
      {error && (
        <div className="upload-error">
          <strong>⚠️ Error:</strong> {error}
          <button onClick={() => setError(null)}><Icons.x /></button>
        </div>
      )}

      {/* Imagen Principal - Diseño Moderno */}
      <div className="main-image-container">
        {mainImageObj ? (
          <div className="main-image-wrapper">
            <div className="main-image-preview">
              <img 
                src={mainImageObj.preview} 
                alt={mainImageObj.metadata.alt}
                title={mainImageObj.metadata.title}
              />
              <div className="main-image-overlay">
                <div className="main-badge-modern">
                  <Icons.image />
                  <span>Imagen Principal</span>
                </div>
                <button
                  className="btn-remove-modern"
                  onClick={() => handleRemove(mainImageObj.id)}
                  title="Eliminar"
                >
                  <Icons.x />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="main-image-placeholder-modern">
            <div className="placeholder-content">
              <Icons.image />
              <h3>No hay imagen principal</h3>
              <p>La primera imagen que subas se asignará automáticamente como principal</p>
            </div>
          </div>
        )}
      </div>

      {/* Galería de Imágenes - Diseño Moderno */}
      <div className="gallery-container-modern">
        <div className="gallery-header-modern">
          <div className="gallery-title-section">
            <Icons.image />
            <div>
              <h3>Galería de Imágenes</h3>
              <p className="gallery-subtitle">
                {pendingImages.length} {pendingImages.length === 1 ? 'imagen' : 'imágenes'} de {maxImages} permitidas
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-upload-modern"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || pendingImages.length >= maxImages}
          >
            {uploading ? (
              <>
                <Icons.loader className="spin" />
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <Icons.upload />
                <span>Agregar Imágenes</span>
              </>
            )}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          style={{ display: 'none' }}
        />

        {/* Drop Zone Moderno */}
        <div
          ref={dropZoneRef}
          className={`drop-zone-modern ${pendingImages.length === 0 ? 'empty' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOverZone}
        >
          {pendingImages.length === 0 ? (
            <div className="empty-state-modern">
              <div className="empty-icon">
                <Icons.upload />
              </div>
              <h3>Arrastra imágenes aquí</h3>
              <p>o haz clic en "Agregar Imágenes" para seleccionar archivos</p>
              <small>Las imágenes se guardarán cuando guardes la propiedad</small>
            </div>
          ) : (
            <>
              {/* Carrusel Navigation */}
              {showCarousel && (
                <div className="carousel-nav-modern">
                  <button
                    className="carousel-btn-modern"
                    onClick={() => setCarouselIndex(prev => Math.max(0, prev - 1))}
                    disabled={carouselIndex === 0}
                  >
                    <Icons.chevronLeft />
                  </button>
                  <div className="carousel-dots">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        className={`carousel-dot ${carouselIndex === i ? 'active' : ''}`}
                        onClick={() => setCarouselIndex(i)}
                      />
                    ))}
                  </div>
                  <button
                    className="carousel-btn-modern"
                    onClick={() => setCarouselIndex(prev => Math.min(totalPages - 1, prev + 1))}
                    disabled={carouselIndex === totalPages - 1}
                  >
                    <Icons.chevronRight />
                  </button>
                </div>
              )}

              {/* Gallery Grid Moderno */}
              <div className="gallery-grid-modern">
                {currentPageImages.map((img, localIndex) => {
                  const globalIndex = carouselIndex * ITEMS_PER_PAGE + localIndex;
                  const isHovered = hoveredImage === img.id;
                  
                  return (
                    <div
                      key={img.id}
                      className={`gallery-item-modern ${img.isMain ? 'is-main' : ''} ${draggedIndex === globalIndex ? 'dragging' : ''}`}
                      draggable
                      onDragStart={() => handleDragStart(globalIndex)}
                      onDragOver={(e) => handleDragOver(e, globalIndex)}
                      onDragEnd={handleDragEnd}
                      onMouseEnter={() => setHoveredImage(img.id)}
                      onMouseLeave={() => setHoveredImage(null)}
                    >
                      <div className="gallery-image-wrapper">
                        <img 
                          src={img.thumbnail || img.preview} 
                          alt={img.metadata.alt}
                          title={img.metadata.title}
                        />
                        
                        {/* Overlay con acciones */}
                        <div className={`gallery-overlay ${isHovered ? 'visible' : ''}`}>
                          {!img.isMain && (
                            <button
                              className="overlay-btn primary"
                              onClick={() => handleSetMain(img.id)}
                              title="Establecer como principal"
                            >
                              <Icons.image />
                            </button>
                          )}
                          <button
                            className="overlay-btn danger"
                            onClick={() => handleRemove(img.id)}
                            title="Eliminar"
                          >
                            <Icons.x />
                          </button>
                        </div>

                        {/* Indicadores */}
                        {img.isMain && (
                          <div className="main-badge-small">
                            <Icons.image />
                          </div>
                        )}
                        {!img.uploaded && (
                          <div className="pending-badge-modern">
                            <span>Pendiente</span>
                          </div>
                        )}
                        
                        {/* Drag Handle */}
                        <div className="drag-handle-modern">
                          <Icons.grip />
                        </div>

                        {/* Número de orden */}
                        <div className="image-number">
                          #{globalIndex + 1}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        .image-uploader-modern {
          width: 100%;
        }

        .upload-error {
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
          border: 1px solid #fecaca;
          color: #991b1b;
          padding: 14px 18px;
          border-radius: 12px;
          margin-bottom: 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          box-shadow: 0 2px 8px rgba(220, 38, 38, 0.1);
        }

        .upload-error button {
          background: none;
          border: none;
          color: #991b1b;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          transition: transform 0.2s;
        }

        .upload-error button:hover {
          transform: scale(1.1);
        }

        /* Imagen Principal - Diseño Moderno */
        .main-image-container {
          margin-bottom: 40px;
        }

        .main-image-wrapper {
          position: relative;
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
        }

        .main-image-preview {
          position: relative;
          width: 100%;
          aspect-ratio: 16/9;
          border-radius: 20px;
          overflow: hidden;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .main-image-preview:hover {
          transform: translateY(-4px);
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.2);
        }

        .main-image-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .main-image-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.4) 100%);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 20px;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .main-image-preview:hover .main-image-overlay {
          opacity: 1;
        }

        .main-badge-modern {
          background: rgba(15, 23, 42, 0.85);
          color: white;
          padding: 10px 18px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .main-badge-modern svg {
          width: 18px;
          height: 18px;
        }

        .btn-remove-modern {
          background: rgba(239, 68, 68, 0.9);
          border: none;
          color: white;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        .btn-remove-modern:hover {
          background: rgba(220, 38, 38, 1);
          transform: scale(1.1);
        }

        .main-image-placeholder-modern {
          border: 3px dashed #cbd5e1;
          border-radius: 20px;
          padding: 80px 40px;
          text-align: center;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          transition: all 0.3s ease;
        }

        .main-image-placeholder-modern:hover {
          border-color: #3b82f6;
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
        }

        .placeholder-content svg {
          width: 64px;
          height: 64px;
          margin: 0 auto 20px;
          color: #94a3b8;
        }

        .placeholder-content h3 {
          margin: 0 0 8px 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #475569;
        }

        .placeholder-content p {
          margin: 0;
          color: #64748b;
          font-size: 0.95rem;
        }

        /* Galería - Diseño Moderno */
        .gallery-container-modern {
          background: white;
          border-radius: 20px;
          padding: 32px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .gallery-header-modern {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
          padding-bottom: 20px;
          border-bottom: 2px solid #f1f5f9;
        }

        .gallery-title-section {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .gallery-title-section svg {
          width: 32px;
          height: 32px;
          color: #3b82f6;
        }

        .gallery-title-section h3 {
          margin: 0 0 4px 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #0f172a;
        }

        .gallery-subtitle {
          margin: 0;
          font-size: 0.9rem;
          color: #64748b;
        }

        .btn-upload-modern {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 14px 28px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .btn-upload-modern:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
        }

        .btn-upload-modern:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .btn-upload-modern svg {
          width: 20px;
          height: 20px;
        }

        /* Drop Zone Moderno */
        .drop-zone-modern {
          min-height: 300px;
          border: 3px dashed #e2e8f0;
          border-radius: 16px;
          padding: 32px;
          background: linear-gradient(135deg, #fafbfc 0%, #f8fafc 100%);
          transition: all 0.3s ease;
        }

        .drop-zone-modern:hover:not(.empty) {
          border-color: #3b82f6;
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
        }

        .drop-zone-modern.empty {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .empty-state-modern {
          text-align: center;
          max-width: 400px;
        }

        .empty-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 24px;
          background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6366f1;
        }

        .empty-icon svg {
          width: 40px;
          height: 40px;
        }

        .empty-state-modern h3 {
          margin: 0 0 8px 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
        }

        .empty-state-modern p {
          margin: 0 0 4px 0;
          font-size: 1rem;
          color: #64748b;
        }

        .empty-state-modern small {
          display: block;
          margin-top: 8px;
          font-size: 0.85rem;
          color: #94a3b8;
        }

        /* Carrusel Navigation Moderno */
        .carousel-nav-modern {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          margin-bottom: 24px;
        }

        .carousel-btn-modern {
          background: white;
          border: 2px solid #e2e8f0;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          color: #475569;
        }

        .carousel-btn-modern:hover:not(:disabled) {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
          transform: scale(1.1);
        }

        .carousel-btn-modern:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .carousel-dots {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .carousel-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: none;
          background: #cbd5e1;
          cursor: pointer;
          transition: all 0.2s;
          padding: 0;
        }

        .carousel-dot:hover {
          background: #94a3b8;
          transform: scale(1.2);
        }

        .carousel-dot.active {
          background: #3b82f6;
          width: 24px;
          border-radius: 5px;
        }

        /* Gallery Grid Moderno */
        .gallery-grid-modern {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 20px;
        }

        .gallery-item-modern {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          background: white;
          cursor: move;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 2px solid transparent;
        }

        .gallery-item-modern:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
          border-color: #3b82f6;
        }

        .gallery-item-modern.dragging {
          opacity: 0.5;
          transform: scale(0.95);
          z-index: 1000;
        }

        .gallery-item-modern.is-main {
          border-color: #1e293b;
          border-width: 3px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.2);
        }

        .gallery-image-wrapper {
          position: relative;
          width: 100%;
          aspect-ratio: 16/9;
          overflow: hidden;
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
        }

        .gallery-image-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .gallery-item-modern:hover .gallery-image-wrapper img {
          transform: scale(1.1);
        }

        /* Overlay con acciones */
        .gallery-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.6) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .gallery-overlay.visible {
          opacity: 1;
        }

        .overlay-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          backdrop-filter: blur(10px);
        }

        .overlay-btn.primary {
          background: rgba(59, 130, 246, 0.9);
          color: white;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }

        .overlay-btn.primary:hover {
          background: rgba(37, 99, 235, 1);
          transform: scale(1.15);
        }

        .overlay-btn.danger {
          background: rgba(239, 68, 68, 0.9);
          color: white;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        }

        .overlay-btn.danger:hover {
          background: rgba(220, 38, 38, 1);
          transform: scale(1.15);
        }

        .overlay-btn svg {
          width: 20px;
          height: 20px;
        }

        /* Badges e Indicadores */
        .main-badge-small {
          position: absolute;
          top: 12px;
          left: 12px;
          background: rgba(15, 23, 42, 0.9);
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          z-index: 2;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .main-badge-small svg {
          width: 18px;
          height: 18px;
        }

        .pending-badge-modern {
          position: absolute;
          top: 12px;
          right: 12px;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
          z-index: 2;
        }

        .drag-handle-modern {
          position: absolute;
          bottom: 12px;
          left: 12px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: grab;
          opacity: 0;
          transition: opacity 0.2s;
          backdrop-filter: blur(10px);
          z-index: 2;
        }

        .gallery-item-modern:hover .drag-handle-modern {
          opacity: 1;
        }

        .drag-handle-modern:active {
          cursor: grabbing;
        }

        .image-number {
          position: absolute;
          bottom: 12px;
          right: 12px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          backdrop-filter: blur(10px);
          z-index: 2;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .gallery-grid-modern {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 16px;
          }

          .gallery-header-modern {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }

          .btn-upload-modern {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
