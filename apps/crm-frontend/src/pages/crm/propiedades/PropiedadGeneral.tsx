/**
 * PropiedadGeneral - Tab General
 * Muestra información completa de la propiedad: galería, descripción, características, ubicación
 */

import { useState } from 'react';
import { Propiedad } from '../../../services/api';
import { useCatalogos } from '../../../contexts/CatalogosContext';

interface Props {
  propiedad: Propiedad;
  onUpdate: (data: Partial<Propiedad>) => Promise<void>;
  onRefresh: () => void;
}

// Iconos SVG
const Icons = {
  bed: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 4v16"/>
      <path d="M2 8h18a2 2 0 0 1 2 2v10"/>
      <path d="M2 17h20"/>
      <path d="M6 8v9"/>
    </svg>
  ),
  bath: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1z"/>
      <path d="M6 12V5a2 2 0 0 1 2-2h3v2.25"/>
    </svg>
  ),
  car: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 17h14v-5l-2-6H7L5 12z"/>
      <circle cx="7.5" cy="17.5" r="1.5"/>
      <circle cx="16.5" cy="17.5" r="1.5"/>
    </svg>
  ),
  area: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18"/>
      <path d="M9 21V9"/>
    </svg>
  ),
  land: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 22L12 12l10 10"/>
      <path d="M5 19v-2"/>
      <path d="M8 16v-2"/>
      <path d="M11 13v-2"/>
      <path d="M14 13v-2"/>
      <path d="M17 16v-2"/>
      <path d="M20 19v-2"/>
    </svg>
  ),
  calendar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  layers: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
  mapPin: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  dollar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  check: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  x: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  image: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  ),
  chevronLeft: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  chevronRight: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
};

// Configuración de estados
const ESTADOS = {
  disponible: { label: 'Disponible', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.12)' },
  reservada: { label: 'Reservada', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.12)' },
  vendida: { label: 'Vendida', color: '#64748B', bgColor: 'rgba(100, 116, 139, 0.12)' },
  rentada: { label: 'Rentada', color: '#64748B', bgColor: 'rgba(100, 116, 139, 0.12)' },
  inactiva: { label: 'Inactiva', color: '#94A3B8', bgColor: 'rgba(148, 163, 184, 0.12)' },
};

const OPERACIONES = {
  venta: { label: 'Venta', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.12)' },
  renta: { label: 'Renta', color: '#0057FF', bgColor: 'rgba(0, 87, 255, 0.12)' },
  traspaso: { label: 'Traspaso', color: '#6236FF', bgColor: 'rgba(98, 54, 255, 0.12)' },
};

const TIPOS = {
  casa: { label: 'Casa', icon: '🏠' },
  departamento: { label: 'Departamento', icon: '🏢' },
  terreno: { label: 'Terreno', icon: '🌳' },
  oficina: { label: 'Oficina', icon: '🏛️' },
  local: { label: 'Local Comercial', icon: '🏪' },
  bodega: { label: 'Bodega', icon: '📦' },
};

export default function PropiedadGeneral({ propiedad, onUpdate, onRefresh }: Props) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const { etiquetasPropiedad } = useCatalogos();

  // Obtener las etiquetas con sus datos del catálogo
  const etiquetasConDatos = ((propiedad as any).etiquetas || [])
    .map((codigo: string) => etiquetasPropiedad.find(e => e.codigo === codigo))
    .filter(Boolean);

  // Combinar imagen principal con galería
  const allImages = [
    propiedad.imagen_principal,
    ...(propiedad.imagenes || [])
  ].filter(Boolean) as string[];

  const formatMoney = (value: number | undefined, moneda: string = 'USD') => {
    if (!value) return null;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: moneda,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const estado = ESTADOS[propiedad.estado_propiedad as keyof typeof ESTADOS] || ESTADOS.disponible;
  const operacion = OPERACIONES[propiedad.operacion as keyof typeof OPERACIONES] || OPERACIONES.venta;
  const tipo = TIPOS[propiedad.tipo as keyof typeof TIPOS] || TIPOS.casa;

  // Características principales
  const mainFeatures = [
    { icon: Icons.bed, label: 'Habitaciones', value: propiedad.habitaciones },
    { icon: Icons.bath, label: 'Baños', value: propiedad.banos },
    { icon: Icons.car, label: 'Estacionamientos', value: propiedad.estacionamientos },
    { icon: Icons.area, label: 'Construcción', value: propiedad.m2_construccion, suffix: 'm²' },
    { icon: Icons.land, label: 'Terreno', value: propiedad.m2_terreno, suffix: 'm²' },
    { icon: Icons.layers, label: 'Pisos', value: propiedad.pisos },
    { icon: Icons.layers, label: 'Piso/Nivel', value: propiedad.floor_level },
    { icon: Icons.calendar, label: 'Antigüedad', value: propiedad.antiguedad, suffix: 'años' },
    { icon: Icons.calendar, label: 'Año construcción', value: propiedad.year_built },
  ].filter(f => f.value);

  // Características booleanas adicionales
  const booleanExtras = [
    { label: 'Amueblado', value: propiedad.is_furnished },
  ].filter(f => f.value !== undefined && f.value !== null);

  // Características adicionales (desde caracteristicas JSONB)
  const caracteristicas = propiedad.caracteristicas || {};
  const booleanFeatures = Object.entries(caracteristicas)
    .filter(([_, value]) => typeof value === 'boolean')
    .map(([key, value]) => ({
      label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: value as boolean
    }));

  const navigateImage = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedImageIndex(prev => prev === 0 ? allImages.length - 1 : prev - 1);
    } else {
      setSelectedImageIndex(prev => prev === allImages.length - 1 ? 0 : prev + 1);
    }
  };

  return (
    <div className="propiedad-general">
      {/* Grid principal: Galería + Info */}
      <div className="main-grid">
        {/* Galería de imágenes */}
        <div className="gallery-section">
          <div className="main-image-container">
            {allImages.length > 0 ? (
              <>
                <img
                  src={allImages[selectedImageIndex]}
                  alt={propiedad.titulo}
                  className="main-image"
                  onClick={() => setShowGallery(true)}
                />
                {allImages.length > 1 && (
                  <>
                    <button
                      className="nav-btn prev"
                      onClick={() => navigateImage('prev')}
                    >
                      {Icons.chevronLeft}
                    </button>
                    <button
                      className="nav-btn next"
                      onClick={() => navigateImage('next')}
                    >
                      {Icons.chevronRight}
                    </button>
                    <div className="image-counter">
                      {selectedImageIndex + 1} / {allImages.length}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="image-placeholder">
                {Icons.image}
                <span>Sin imágenes</span>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {allImages.length > 1 && (
            <div className="thumbnails">
              {allImages.slice(0, 5).map((img, idx) => (
                <button
                  key={idx}
                  className={`thumbnail ${idx === selectedImageIndex ? 'active' : ''}`}
                  onClick={() => setSelectedImageIndex(idx)}
                >
                  <img src={img} alt={`Imagen ${idx + 1}`} />
                </button>
              ))}
              {allImages.length > 5 && (
                <button className="thumbnail more" onClick={() => setShowGallery(true)}>
                  +{allImages.length - 5}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Panel de información */}
        <div className="info-panel">
          {/* Badges */}
          <div className="badges-row">
            <span className="badge tipo-badge">{tipo.icon} {tipo.label}</span>
            <span
              className="badge operacion-badge"
              style={{ color: operacion.color, backgroundColor: operacion.bgColor }}
            >
              {operacion.label}
            </span>
            <span
              className="badge estado-badge"
              style={{ color: estado.color, backgroundColor: estado.bgColor }}
            >
              {estado.label}
            </span>
            {propiedad.destacada && (
              <span className="badge destacada-badge">⭐ Destacada</span>
            )}
            {propiedad.exclusiva && (
              <span className="badge exclusiva-badge">🔒 Exclusiva</span>
            )}
            {etiquetasConDatos.map((etiqueta: any) => (
              <span
                key={etiqueta.id}
                className="badge etiqueta-badge"
                style={{
                  color: etiqueta.color || '#6366f1',
                  backgroundColor: `${etiqueta.color || '#6366f1'}15`
                }}
              >
                {etiqueta.icono && <span className="badge-icon">{etiqueta.icono}</span>}
                {etiqueta.nombre}
              </span>
            ))}
          </div>

          {/* Precios */}
          <div className="prices-section">
            {propiedad.precio ? (
              <div className="price-main">
                {formatMoney(propiedad.precio, propiedad.moneda)}
                {propiedad.precio_anterior && propiedad.precio_anterior !== propiedad.precio && (
                  <span className="price-previous">
                    Antes: {formatMoney(propiedad.precio_anterior, propiedad.moneda)}
                  </span>
                )}
              </div>
            ) : (
              <div className="price-main price-consultar">
                Precio a consultar
              </div>
            )}

            {/* Precios adicionales */}
            {(propiedad.precio_venta || propiedad.precio_alquiler || propiedad.maintenance) && (
              <div className="prices-grid">
                {propiedad.precio_venta && (
                  <div className="price-item">
                    <span className="price-label">Venta</span>
                    <span className="price-value">{formatMoney(propiedad.precio_venta, propiedad.moneda)}</span>
                  </div>
                )}
                {propiedad.precio_alquiler && (
                  <div className="price-item">
                    <span className="price-label">Alquiler</span>
                    <span className="price-value">{formatMoney(propiedad.precio_alquiler, propiedad.moneda)}/mes</span>
                  </div>
                )}
                {propiedad.maintenance && (
                  <div className="price-item">
                    <span className="price-label">Mantenimiento</span>
                    <span className="price-value">{formatMoney(propiedad.maintenance, propiedad.moneda)}/mes</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Características principales */}
          <div className="features-grid">
            {mainFeatures.map((feat, idx) => (
              <div key={idx} className="feature-item">
                <span className="feature-icon">{feat.icon}</span>
                <div className="feature-content">
                  <span className="feature-value">{feat.value}{feat.suffix ? ` ${feat.suffix}` : ''}</span>
                  <span className="feature-label">{feat.label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Características booleanas */}
          {(booleanFeatures.length > 0 || booleanExtras.length > 0) && (
            <div className="boolean-features">
              {booleanExtras.map((feat, idx) => (
                <div key={`extra-${idx}`} className={`boolean-item ${feat.value ? 'active' : ''}`}>
                  <span className="boolean-icon">
                    {feat.value ? Icons.check : Icons.x}
                  </span>
                  <span>{feat.label}</span>
                </div>
              ))}
              {booleanFeatures.map((feat, idx) => (
                <div key={idx} className={`boolean-item ${feat.value ? 'active' : ''}`}>
                  <span className="boolean-icon">
                    {feat.value ? Icons.check : Icons.x}
                  </span>
                  <span>{feat.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ubicación */}
      <div className="section location-section">
        <h3 className="section-title">
          {Icons.mapPin}
          <span>Ubicación</span>
        </h3>
        <div className="location-details">
          {propiedad.direccion && (
            <div className="location-row">
              <span className="location-label">Dirección:</span>
              <span className="location-value">{propiedad.direccion}</span>
            </div>
          )}
          <div className="location-grid">
            {propiedad.sector && (
              <div className="location-item">
                <span className="location-label">Sector</span>
                <span className="location-value">{propiedad.sector}</span>
              </div>
            )}
            {propiedad.zona && (
              <div className="location-item">
                <span className="location-label">Zona</span>
                <span className="location-value">{propiedad.zona}</span>
              </div>
            )}
            {propiedad.ciudad && (
              <div className="location-item">
                <span className="location-label">Ciudad</span>
                <span className="location-value">{propiedad.ciudad}</span>
              </div>
            )}
            {propiedad.provincia && (
              <div className="location-item">
                <span className="location-label">Provincia/Estado</span>
                <span className="location-value">{propiedad.provincia}</span>
              </div>
            )}
            {propiedad.pais && (
              <div className="location-item">
                <span className="location-label">País</span>
                <span className="location-value">{propiedad.pais}</span>
              </div>
            )}
            {propiedad.codigo_postal && (
              <div className="location-item">
                <span className="location-label">Código Postal</span>
                <span className="location-value">{propiedad.codigo_postal}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Descripción */}
      {propiedad.descripcion && (
        <div className="section description-section">
          <h3 className="section-title">Descripción</h3>
          <div className="description-content">
            {propiedad.descripcion}
          </div>
        </div>
      )}

      {/* Amenidades */}
      {propiedad.amenidades && propiedad.amenidades.length > 0 && (
        <div className="section amenidades-section">
          <h3 className="section-title">Amenidades</h3>
          <div className="amenidades-grid">
            {propiedad.amenidades.map((amenidad, idx) => (
              <span key={idx} className="amenidad-tag">
                {Icons.check}
                {amenidad}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notas internas */}
      {propiedad.notas && (
        <div className="section notes-section">
          <h3 className="section-title">Notas internas</h3>
          <div className="notes-content">
            {propiedad.notas}
          </div>
        </div>
      )}

      {/* Modal de galería completa */}
      {showGallery && (
        <div className="gallery-modal" onClick={() => setShowGallery(false)}>
          <div className="gallery-modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowGallery(false)}>×</button>
            <div className="gallery-main">
              <img src={allImages[selectedImageIndex]} alt="" />
              <button className="nav-btn prev" onClick={() => navigateImage('prev')}>
                {Icons.chevronLeft}
              </button>
              <button className="nav-btn next" onClick={() => navigateImage('next')}>
                {Icons.chevronRight}
              </button>
            </div>
            <div className="gallery-thumbnails">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  className={`thumb ${idx === selectedImageIndex ? 'active' : ''}`}
                  onClick={() => setSelectedImageIndex(idx)}
                >
                  <img src={img} alt="" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .propiedad-general {
    max-width: 1200px;
  }

  .main-grid {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 32px;
    margin-bottom: 32px;
  }

  @media (max-width: 900px) {
    .main-grid {
      grid-template-columns: 1fr;
    }
  }

  /* Gallery */
  .gallery-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .main-image-container {
    position: relative;
    aspect-ratio: 4/3;
    border-radius: 16px;
    overflow: hidden;
    background: #f1f5f9;
  }

  .main-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    cursor: zoom-in;
  }

  .image-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: #94a3b8;
  }

  .nav-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.9);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    transition: all 0.2s;
  }

  .nav-btn:hover {
    background: white;
    transform: translateY(-50%) scale(1.05);
  }

  .nav-btn.prev { left: 12px; }
  .nav-btn.next { right: 12px; }

  .image-counter {
    position: absolute;
    bottom: 12px;
    right: 12px;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 500;
  }

  .thumbnails {
    display: flex;
    gap: 8px;
  }

  .thumbnail {
    width: 72px;
    height: 54px;
    border-radius: 8px;
    overflow: hidden;
    border: 2px solid transparent;
    cursor: pointer;
    background: #f1f5f9;
    padding: 0;
    transition: all 0.2s;
  }

  .thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .thumbnail.active {
    border-color: #0057FF;
  }

  .thumbnail.more {
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    color: #64748b;
  }

  /* Info Panel */
  .info-panel {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .badges-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .tipo-badge {
    background: #f1f5f9;
    color: #475569;
  }

  .destacada-badge {
    background: rgba(245, 158, 11, 0.12);
    color: #d97706;
  }

  .exclusiva-badge {
    background: rgba(98, 54, 255, 0.12);
    color: #6236FF;
  }

  .etiqueta-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .badge-icon {
    font-size: 0.85em;
  }

  /* Prices */
  .prices-section {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-radius: 16px;
    padding: 20px;
  }

  .price-main {
    font-size: 2rem;
    font-weight: 700;
    color: #0057FF;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .price-main.price-consultar {
    font-size: 1.2rem;
    color: #64748b;
    font-weight: 500;
  }

  .price-previous {
    font-size: 0.9rem;
    font-weight: 400;
    color: #94a3b8;
    text-decoration: line-through;
  }

  .prices-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #e2e8f0;
  }

  .price-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .price-label {
    font-size: 0.75rem;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .price-value {
    font-size: 1rem;
    font-weight: 600;
    color: #0f172a;
  }

  /* Features */
  .features-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .feature-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
  }

  .feature-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 87, 255, 0.08);
    border-radius: 10px;
    color: #0057FF;
  }

  .feature-content {
    display: flex;
    flex-direction: column;
  }

  .feature-value {
    font-size: 1.1rem;
    font-weight: 600;
    color: #0f172a;
  }

  .feature-label {
    font-size: 0.75rem;
    color: #64748b;
  }

  /* Boolean features */
  .boolean-features {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .boolean-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 8px;
    font-size: 0.85rem;
    background: #f8fafc;
    color: #94a3b8;
    border: 1px solid #e2e8f0;
  }

  .boolean-item.active {
    background: rgba(16, 185, 129, 0.08);
    color: #10B981;
    border-color: rgba(16, 185, 129, 0.2);
  }

  .boolean-icon {
    display: flex;
  }

  /* Sections */
  .section {
    background: white;
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 24px;
    border: 1px solid #e2e8f0;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1.1rem;
    font-weight: 600;
    color: #0f172a;
    margin: 0 0 20px 0;
  }

  .section-title svg {
    color: #0057FF;
  }

  /* Location */
  .location-row {
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e2e8f0;
  }

  .location-row .location-label {
    font-weight: 500;
    color: #64748b;
    margin-right: 8px;
  }

  .location-row .location-value {
    color: #0f172a;
  }

  .location-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 16px;
  }

  .location-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .location-item .location-label {
    font-size: 0.75rem;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .location-item .location-value {
    font-weight: 500;
    color: #0f172a;
  }

  /* Description */
  .description-content {
    color: #475569;
    line-height: 1.7;
    white-space: pre-wrap;
  }

  /* Amenidades */
  .amenidades-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .amenidad-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: rgba(0, 87, 255, 0.06);
    border: 1px solid rgba(0, 87, 255, 0.15);
    border-radius: 8px;
    font-size: 0.85rem;
    color: #0057FF;
  }

  /* Notes */
  .notes-section {
    background: #fffbeb;
    border-color: #fde68a;
  }

  .notes-content {
    color: #92400e;
    line-height: 1.6;
    white-space: pre-wrap;
  }

  /* Gallery Modal */
  .gallery-modal {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.9);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
  }

  .gallery-modal-content {
    width: 100%;
    max-width: 1200px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .close-btn {
    position: absolute;
    top: 20px;
    right: 20px;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: white;
    font-size: 24px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .gallery-main {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .gallery-main img {
    max-height: 70vh;
    max-width: 100%;
    object-fit: contain;
    border-radius: 8px;
  }

  .gallery-thumbnails {
    display: flex;
    gap: 8px;
    justify-content: center;
    overflow-x: auto;
    padding: 10px 0;
  }

  .gallery-thumbnails .thumb {
    width: 80px;
    height: 60px;
    border-radius: 6px;
    overflow: hidden;
    border: 2px solid transparent;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
    background: transparent;
    opacity: 0.6;
    transition: all 0.2s;
  }

  .gallery-thumbnails .thumb:hover {
    opacity: 1;
  }

  .gallery-thumbnails .thumb.active {
    border-color: white;
    opacity: 1;
  }

  .gallery-thumbnails .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;



