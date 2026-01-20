/**
 * CrmMarketingFlyerGenerator - Generador de Flyers para Propiedades
 *
 * Crea flyers profesionales para propiedades con templates prediseñados:
 * - Selección de propiedad del inventario
 * - Templates verticales y horizontales
 * - Personalización de colores y textos
 * - Descarga en alta resolución
 */

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageHeader } from '../../layouts/CrmLayout';
import { useAuth } from '../../contexts/AuthContext';
import { getTema, getInfoNegocio, apiFetch, type TemaColores, type InfoNegocio } from '../../services/api';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import {
  ArrowLeft,
  Download,
  FileImage,
  Loader2,
  Search,
  Home,
  MapPin,
  ChevronRight,
  Check,
} from 'lucide-react';

// Tipos
interface Propiedad {
  id: string;
  titulo: string;
  precio: number;
  moneda: string;
  tipo_operacion: string;
  tipo_propiedad: string;
  ubicacion: {
    ciudad?: string;
    sector?: string;
    direccion?: string;
  };
  caracteristicas: {
    habitaciones?: number;
    banos?: number;
    estacionamientos?: number;
    metros_construccion?: number;
    metros_terreno?: number;
  };
  imagenes: Array<{ url: string; orden: number }>;
}

interface FlyerTemplate {
  id: string;
  name: string;
  orientation: 'vertical' | 'horizontal';
  preview: string;
}

const templates: FlyerTemplate[] = [
  { id: 'modern-v1', name: 'Moderno Vertical', orientation: 'vertical', preview: '📱' },
  { id: 'elegant-v1', name: 'Elegante Vertical', orientation: 'vertical', preview: '🎨' },
  { id: 'minimal-v1', name: 'Minimalista', orientation: 'vertical', preview: '✨' },
  { id: 'bold-h1', name: 'Impactante Horizontal', orientation: 'horizontal', preview: '🖼️' },
  { id: 'classic-h1', name: 'Clásico Horizontal', orientation: 'horizontal', preview: '📐' },
];

const CrmMarketingFlyerGenerator: React.FC = () => {
  const navigate = useNavigate();
  const { setPageHeader } = usePageHeader();
  const { tenantActual } = useAuth();
  const { getToken } = useClerkAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Estados
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [searchResults, setSearchResults] = useState<Propiedad[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Propiedad | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<FlyerTemplate>(templates[0]);
  const [colores, setColores] = useState<TemaColores | null>(null);
  const [infoNegocio, setInfoNegocio] = useState<InfoNegocio | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedFlyer, setGeneratedFlyer] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: seleccionar propiedad, 2: elegir template, 3: preview

  const basePath = tenantActual?.slug ? `/crm/${tenantActual.slug}` : '/crm';

  // Helpers para obtener campos de InfoNegocio (soporta estructura plana y anidada)
  const getLogoUrl = (info: InfoNegocio): string | null => {
    if ((info as any).logo) return (info as any).logo;
    if (info.logo_url) return info.logo_url;
    return null;
  };

  const getTelefono = (info: InfoNegocio): string | null => {
    if ((info as any).contacto?.telefono) return (info as any).contacto.telefono;
    if (info.telefono_principal) return info.telefono_principal;
    return null;
  };

  const getWhatsapp = (info: InfoNegocio): string | null => {
    if ((info as any).contacto?.whatsapp) return (info as any).contacto.whatsapp;
    if (info.whatsapp) return info.whatsapp;
    return null;
  };

  const getNombreComercial = (info: InfoNegocio): string | null => {
    if ((info as any).nombreComercial) return (info as any).nombreComercial;
    if (info.nombre) return info.nombre;
    return null;
  };

  useEffect(() => {
    setPageHeader({
      title: 'Generador de Flyers',
      subtitle: 'Crea flyers profesionales para tus propiedades',
    });
  }, [setPageHeader]);

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      if (!tenantActual?.id) return;

      try {
        const token = await getToken();
        const [temaData, infoData, propsResponse] = await Promise.all([
          getTema(tenantActual.id).catch(() => null),
          getInfoNegocio(tenantActual.id, token).catch(() => null),
          apiFetch(`/tenants/${tenantActual.id}/propiedades?limit=50&estado=disponible`).catch(() => null),
        ]);

        if (temaData) setColores(temaData);
        if (infoData) setInfoNegocio(infoData);
        if (propsResponse) {
          const propsData = await propsResponse.json();
          if (propsData?.propiedades) {
            setPropiedades(propsData.propiedades);
            setSearchResults(propsData.propiedades.slice(0, 10));
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [tenantActual?.id, getToken]);

  // Buscar propiedades
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(propiedades.slice(0, 10));
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = propiedades.filter(
      (p) =>
        p.titulo.toLowerCase().includes(query) ||
        p.ubicacion?.ciudad?.toLowerCase().includes(query) ||
        p.ubicacion?.sector?.toLowerCase().includes(query)
    );
    setSearchResults(filtered.slice(0, 10));
  }, [searchQuery, propiedades]);

  // Formatear precio
  const formatPrice = (precio: number, moneda: string) => {
    const symbol = moneda === 'USD' ? '$' : moneda === 'EUR' ? '€' : 'RD$';
    return `${symbol}${precio.toLocaleString()}`;
  };

  // Generar flyer
  const generateFlyer = async () => {
    if (!selectedProperty || !canvasRef.current) return;

    setGenerating(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensiones según orientación
    const isVertical = selectedTemplate.orientation === 'vertical';
    canvas.width = isVertical ? 1080 : 1920;
    canvas.height = isVertical ? 1920 : 1080;

    // Fondo
    ctx.fillStyle = colores?.background || '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Cargar imagen principal
    const mainImage = selectedProperty.imagenes?.[0]?.url;
    if (mainImage) {
      try {
        const img = await loadImage(mainImage);
        const imgHeight = isVertical ? canvas.height * 0.55 : canvas.height * 0.7;

        // Dibujar imagen con cover
        const scale = Math.max(canvas.width / img.width, imgHeight / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const x = (canvas.width - scaledWidth) / 2;
        const y = (imgHeight - scaledHeight) / 2;

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, canvas.width, imgHeight);
        ctx.clip();
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
        ctx.restore();

        // Overlay degradado
        const gradient = ctx.createLinearGradient(0, imgHeight - 200, 0, imgHeight);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.7)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, imgHeight - 200, canvas.width, 200);
      } catch (e) {
        console.error('Error loading image:', e);
      }
    }

    const contentY = isVertical ? canvas.height * 0.55 : canvas.height * 0.7;
    const padding = 60;

    // Tipo de operación badge
    ctx.fillStyle = colores?.primary || '#3b82f6';
    const badgeText = selectedProperty.tipo_operacion === 'venta' ? 'EN VENTA' : 'EN ALQUILER';
    ctx.font = 'bold 28px Arial';
    const badgeWidth = ctx.measureText(badgeText).width + 40;
    roundRect(ctx, padding, contentY + 30, badgeWidth, 50, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(badgeText, padding + 20, contentY + 65);

    // Precio
    ctx.fillStyle = colores?.text || '#1e293b';
    ctx.font = 'bold 72px Arial';
    const priceText = formatPrice(selectedProperty.precio, selectedProperty.moneda);
    ctx.fillText(priceText, padding, contentY + 160);

    // Título
    ctx.fillStyle = colores?.text || '#1e293b';
    ctx.font = '600 36px Arial';
    const titulo = selectedProperty.titulo.length > 50
      ? selectedProperty.titulo.substring(0, 50) + '...'
      : selectedProperty.titulo;
    ctx.fillText(titulo, padding, contentY + 220);

    // Ubicación
    ctx.fillStyle = colores?.textSecondary || '#64748b';
    ctx.font = '400 28px Arial';
    const ubicacion = [selectedProperty.ubicacion?.sector, selectedProperty.ubicacion?.ciudad]
      .filter(Boolean)
      .join(', ');
    ctx.fillText(`📍 ${ubicacion}`, padding, contentY + 270);

    // Características
    const caracY = contentY + 340;
    const caracSpacing = isVertical ? 200 : 280;
    ctx.font = '400 26px Arial';
    ctx.fillStyle = colores?.text || '#1e293b';

    const caracteristicas = [
      { icon: '🛏️', value: selectedProperty.caracteristicas?.habitaciones, label: 'Hab.' },
      { icon: '🚿', value: selectedProperty.caracteristicas?.banos, label: 'Baños' },
      { icon: '🚗', value: selectedProperty.caracteristicas?.estacionamientos, label: 'Est.' },
      { icon: '📐', value: selectedProperty.caracteristicas?.metros_construccion, label: 'm²' },
    ].filter((c) => c.value);

    caracteristicas.forEach((carac, i) => {
      const x = padding + i * caracSpacing;
      ctx.fillText(`${carac.icon} ${carac.value} ${carac.label}`, x, caracY);
    });

    // Barra inferior con branding
    const barHeight = 120;
    const barY = canvas.height - barHeight;
    ctx.fillStyle = colores?.primary || '#3b82f6';
    ctx.fillRect(0, barY, canvas.width, barHeight);

    // Logo en la barra
    const logoUrl = infoNegocio ? getLogoUrl(infoNegocio) : null;
    if (logoUrl) {
      try {
        const logo = await loadImage(logoUrl);
        const logoHeight = 60;
        const logoWidth = (logo.width / logo.height) * logoHeight;
        ctx.drawImage(logo, padding, barY + (barHeight - logoHeight) / 2, logoWidth, logoHeight);
      } catch (e) {
        // Si no carga el logo, mostrar nombre
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px Arial';
        const nombre = infoNegocio ? getNombreComercial(infoNegocio) : '';
        ctx.fillText(nombre || '', padding, barY + barHeight / 2 + 10);
      }
    }

    // Contacto en la barra
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 28px Arial';
    ctx.textAlign = 'right';
    const telefono = infoNegocio ? getTelefono(infoNegocio) : null;
    const whatsapp = infoNegocio ? getWhatsapp(infoNegocio) : null;
    const contactText = telefono || whatsapp || '';
    ctx.fillText(contactText, canvas.width - padding, barY + barHeight / 2 + 10);
    ctx.textAlign = 'left';

    // Generar imagen
    setGeneratedFlyer(canvas.toDataURL('image/jpeg', 0.95));
    setGenerating(false);
    setStep(3);
  };

  // Helper para cargar imágenes (usa fetch+base64 para evitar CORS, fallback a crossOrigin)
  const loadImage = async (src: string): Promise<HTMLImageElement> => {
    // Primero intentar con fetch + base64 para evitar problemas de CORS
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = base64;
      });
    } catch {
      // Fallback: intentar con crossOrigin
      return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    }
  };

  // Helper para rectángulos redondeados
  const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  // Descargar flyer
  const handleDownload = () => {
    if (!generatedFlyer) return;
    const link = document.createElement('a');
    link.download = `flyer-${selectedProperty?.id || 'propiedad'}.jpg`;
    link.href = generatedFlyer;
    link.click();
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#3b82f6' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <button
          onClick={() => navigate(`${basePath}/marketing`)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '8px',
            color: '#64748b',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={16} />
          Volver al Marketing Hub
        </button>

        {/* Steps indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {[
            { num: 1, label: 'Propiedad' },
            { num: 2, label: 'Template' },
            { num: 3, label: 'Descargar' },
          ].map((s, i) => (
            <React.Fragment key={s.num}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  background: step >= s.num ? '#3b82f6' : '#f1f5f9',
                  color: step >= s.num ? 'white' : '#64748b',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {step > s.num ? <Check size={14} /> : s.num}
                <span>{s.label}</span>
              </div>
              {i < 2 && <ChevronRight size={16} color="#94a3b8" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step 1: Seleccionar Propiedad */}
      {step === 1 && (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '24px',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', margin: '0 0 16px 0' }}>
              Selecciona una Propiedad
            </h2>

            {/* Buscador */}
            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <Search
                size={18}
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por título, ciudad o sector..."
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 44px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Lista de propiedades */}
            <div style={{ display: 'grid', gap: '12px', maxHeight: '500px', overflow: 'auto' }}>
              {searchResults.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <Home size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
                  <p>No se encontraron propiedades</p>
                </div>
              ) : (
                searchResults.map((prop) => (
                  <div
                    key={prop.id}
                    onClick={() => {
                      setSelectedProperty(prop);
                      setStep(2);
                    }}
                    style={{
                      display: 'flex',
                      gap: '16px',
                      padding: '12px',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = 'white';
                    }}
                  >
                    <img
                      src={prop.imagenes?.[0]?.url || '/placeholder-property.jpg'}
                      alt=""
                      style={{
                        width: '100px',
                        height: '80px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        background: '#f1f5f9',
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: '0 0 4px 0' }}>
                        {prop.titulo}
                      </h4>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 8px 0' }}>
                        <MapPin size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        {[prop.ubicacion?.sector, prop.ubicacion?.ciudad].filter(Boolean).join(', ')}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: colores?.primary || '#3b82f6',
                          }}
                        >
                          {formatPrice(prop.precio, prop.moneda)}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 8px',
                            background: prop.tipo_operacion === 'venta' ? '#dcfce7' : '#dbeafe',
                            color: prop.tipo_operacion === 'venta' ? '#16a34a' : '#2563eb',
                            borderRadius: '4px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                          }}
                        >
                          {prop.tipo_operacion}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={20} color="#94a3b8" style={{ alignSelf: 'center' }} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Elegir Template */}
      {step === 2 && selectedProperty && (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '24px',
            }}
          >
            {/* Propiedad seleccionada */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                background: '#f8fafc',
                borderRadius: '12px',
                marginBottom: '24px',
              }}
            >
              <img
                src={selectedProperty.imagenes?.[0]?.url || '/placeholder-property.jpg'}
                alt=""
                style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '8px' }}
              />
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                  {selectedProperty.titulo}
                </h4>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                  {formatPrice(selectedProperty.precio, selectedProperty.moneda)}
                </p>
              </div>
              <button
                onClick={() => setStep(1)}
                style={{
                  marginLeft: 'auto',
                  padding: '6px 12px',
                  background: 'transparent',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#64748b',
                  cursor: 'pointer',
                }}
              >
                Cambiar
              </button>
            </div>

            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', margin: '0 0 16px 0' }}>
              Elige un Template
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  style={{
                    padding: '20px',
                    borderRadius: '12px',
                    border: `2px solid ${selectedTemplate.id === template.id ? '#3b82f6' : '#e2e8f0'}`,
                    background: selectedTemplate.id === template.id ? '#eff6ff' : 'white',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>{template.preview}</div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                    {template.name}
                  </p>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 0 0' }}>
                    {template.orientation === 'vertical' ? 'Story / Vertical' : 'Post / Horizontal'}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={generateFlyer}
              disabled={generating}
              style={{
                width: '100%',
                marginTop: '24px',
                padding: '14px',
                background: '#f43f5e',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: generating ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: generating ? 0.7 : 1,
              }}
            >
              {generating ? (
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <FileImage size={18} />
              )}
              {generating ? 'Generando...' : 'Generar Flyer'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview y Descarga */}
      {step === 3 && generatedFlyer && (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              textAlign: 'center',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', margin: '0 0 20px 0' }}>
              Tu Flyer está Listo
            </h2>

            <img
              src={generatedFlyer}
              alt="Flyer generado"
              style={{
                maxWidth: '100%',
                maxHeight: '600px',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                marginBottom: '24px',
              }}
            />

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  setGeneratedFlyer(null);
                  setStep(2);
                }}
                style={{
                  padding: '12px 24px',
                  background: '#f1f5f9',
                  color: '#64748b',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cambiar Template
              </button>
              <button
                onClick={handleDownload}
                style={{
                  padding: '12px 24px',
                  background: '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Download size={18} />
                Descargar Flyer
              </button>
              <button
                onClick={() => {
                  setSelectedProperty(null);
                  setGeneratedFlyer(null);
                  setStep(1);
                }}
                style={{
                  padding: '12px 24px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Crear Otro Flyer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Canvas oculto */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CrmMarketingFlyerGenerator;
