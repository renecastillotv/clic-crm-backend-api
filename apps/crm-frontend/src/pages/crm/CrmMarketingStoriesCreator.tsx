/**
 * CrmMarketingStoriesCreator - Creador de Stories para Redes Sociales
 *
 * Genera stories verticales optimizados para Instagram y Facebook:
 * - Templates específicos para stories (1080x1920)
 * - Efectos y animaciones
 * - Múltiples estilos
 * - Descarga lista para publicar
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
  Loader2,
  Search,
  Home,
  MapPin,
  ChevronRight,
  Check,
  Sparkles,
  Smartphone,
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
  };
  caracteristicas: {
    habitaciones?: number;
    banos?: number;
    metros_construccion?: number;
  };
  imagenes: Array<{ url: string; orden: number }>;
}

interface StoryTemplate {
  id: string;
  name: string;
  style: 'modern' | 'elegant' | 'bold' | 'minimal' | 'gradient';
  preview: string;
}

const storyTemplates: StoryTemplate[] = [
  { id: 'modern-1', name: 'Moderno', style: 'modern', preview: '🏠' },
  { id: 'elegant-1', name: 'Elegante', style: 'elegant', preview: '✨' },
  { id: 'bold-1', name: 'Impactante', style: 'bold', preview: '🔥' },
  { id: 'minimal-1', name: 'Minimalista', style: 'minimal', preview: '🎯' },
  { id: 'gradient-1', name: 'Degradado', style: 'gradient', preview: '🌈' },
];

const CrmMarketingStoriesCreator: React.FC = () => {
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
  const [selectedTemplate, setSelectedTemplate] = useState<StoryTemplate>(storyTemplates[0]);
  const [colores, setColores] = useState<TemaColores | null>(null);
  const [infoNegocio, setInfoNegocio] = useState<InfoNegocio | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedStory, setGeneratedStory] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);

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
      title: 'Stories Creator',
      subtitle: 'Crea stories verticales para Instagram y Facebook',
    });
  }, [setPageHeader]);

  // Cargar datos
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

  // Generar story según template
  const generateStory = async () => {
    if (!selectedProperty || !canvasRef.current) return;

    setGenerating(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Story dimensions (9:16)
    canvas.width = 1080;
    canvas.height = 1920;

    const primaryColor = colores?.primary || '#3b82f6';
    const textColor = '#ffffff';

    // Fondo según estilo
    switch (selectedTemplate.style) {
      case 'gradient':
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, primaryColor);
        gradient.addColorStop(0.5, adjustColor(primaryColor, -30));
        gradient.addColorStop(1, adjustColor(primaryColor, -60));
        ctx.fillStyle = gradient;
        break;
      case 'bold':
        ctx.fillStyle = '#000000';
        break;
      case 'elegant':
        ctx.fillStyle = '#1a1a2e';
        break;
      default:
        ctx.fillStyle = '#0f172a';
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Imagen principal
    const mainImage = selectedProperty.imagenes?.[0]?.url;
    if (mainImage) {
      try {
        const img = await loadImage(mainImage);

        if (selectedTemplate.style === 'minimal') {
          // Imagen arriba con bordes redondeados (simulado)
          const imgHeight = canvas.height * 0.5;
          const scale = Math.max(canvas.width / img.width, imgHeight / img.height);
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;
          ctx.drawImage(img, (canvas.width - scaledWidth) / 2, 0, scaledWidth, scaledHeight);
        } else if (selectedTemplate.style === 'bold') {
          // Imagen completa con overlay oscuro
          const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;
          ctx.drawImage(img, (canvas.width - scaledWidth) / 2, (canvas.height - scaledHeight) / 2, scaledWidth, scaledHeight);

          // Overlay
          const overlay = ctx.createLinearGradient(0, 0, 0, canvas.height);
          overlay.addColorStop(0, 'rgba(0,0,0,0.3)');
          overlay.addColorStop(0.5, 'rgba(0,0,0,0.5)');
          overlay.addColorStop(1, 'rgba(0,0,0,0.9)');
          ctx.fillStyle = overlay;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
          // Imagen en el centro-superior
          const imgHeight = canvas.height * 0.55;
          const margin = 40;
          const imgWidth = canvas.width - margin * 2;
          const scale = Math.max(imgWidth / img.width, imgHeight / img.height);
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;

          ctx.save();
          roundedRect(ctx, margin, 100, imgWidth, imgHeight, 24);
          ctx.clip();
          ctx.drawImage(img, margin + (imgWidth - scaledWidth) / 2, 100 + (imgHeight - scaledHeight) / 2, scaledWidth, scaledHeight);
          ctx.restore();
        }
      } catch (e) {
        console.error('Error loading image:', e);
      }
    }

    // Contenido según estilo
    const padding = 60;
    let contentY = selectedTemplate.style === 'bold' ? 1200 : canvas.height * 0.62;

    // Badge de operación
    ctx.fillStyle = primaryColor;
    const badgeText = selectedProperty.tipo_operacion === 'venta' ? 'EN VENTA' : 'EN ALQUILER';
    ctx.font = 'bold 32px Arial';
    const badgeWidth = ctx.measureText(badgeText).width + 60;
    roundedRect(ctx, padding, contentY, badgeWidth, 60, 12);
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.fillText(badgeText, padding + 30, contentY + 42);

    contentY += 100;

    // Precio grande
    ctx.fillStyle = textColor;
    ctx.font = 'bold 96px Arial';
    ctx.fillText(formatPrice(selectedProperty.precio, selectedProperty.moneda), padding, contentY);

    contentY += 80;

    // Título
    ctx.font = '600 42px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    const titulo = selectedProperty.titulo.length > 35
      ? selectedProperty.titulo.substring(0, 35) + '...'
      : selectedProperty.titulo;
    ctx.fillText(titulo, padding, contentY);

    contentY += 60;

    // Ubicación
    ctx.font = '400 36px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    const ubicacion = [selectedProperty.ubicacion?.sector, selectedProperty.ubicacion?.ciudad]
      .filter(Boolean)
      .join(', ');
    ctx.fillText(`📍 ${ubicacion}`, padding, contentY);

    contentY += 80;

    // Características en iconos
    ctx.font = '500 32px Arial';
    ctx.fillStyle = textColor;
    const caracteristicas = [];
    if (selectedProperty.caracteristicas?.habitaciones) {
      caracteristicas.push(`🛏️ ${selectedProperty.caracteristicas.habitaciones}`);
    }
    if (selectedProperty.caracteristicas?.banos) {
      caracteristicas.push(`🚿 ${selectedProperty.caracteristicas.banos}`);
    }
    if (selectedProperty.caracteristicas?.metros_construccion) {
      caracteristicas.push(`📐 ${selectedProperty.caracteristicas.metros_construccion}m²`);
    }
    ctx.fillText(caracteristicas.join('   '), padding, contentY);

    // Logo y contacto abajo
    const footerY = canvas.height - 160;

    // Línea decorativa
    ctx.fillStyle = primaryColor;
    ctx.fillRect(padding, footerY - 20, canvas.width - padding * 2, 4);

    // Logo
    const logoUrl = infoNegocio ? getLogoUrl(infoNegocio) : null;
    if (logoUrl) {
      try {
        const logo = await loadImage(logoUrl);
        const logoHeight = 70;
        const logoWidth = (logo.width / logo.height) * logoHeight;
        ctx.drawImage(logo, padding, footerY + 20, logoWidth, logoHeight);
      } catch (e) {
        ctx.fillStyle = textColor;
        ctx.font = 'bold 36px Arial';
        const nombre = infoNegocio ? getNombreComercial(infoNegocio) : '';
        ctx.fillText(nombre || '', padding, footerY + 60);
      }
    }

    // Contacto a la derecha
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '600 32px Arial';
    ctx.textAlign = 'right';
    const telefono = infoNegocio ? getTelefono(infoNegocio) : null;
    const whatsapp = infoNegocio ? getWhatsapp(infoNegocio) : null;
    ctx.fillText(telefono || whatsapp || '', canvas.width - padding, footerY + 60);
    ctx.textAlign = 'left';

    // Swipe up indicator (estilo story)
    if (selectedTemplate.style !== 'minimal') {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '400 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('↑ Desliza para más info', canvas.width / 2, canvas.height - 40);
      ctx.textAlign = 'left';
    }

    setGeneratedStory(canvas.toDataURL('image/jpeg', 0.95));
    setGenerating(false);
    setStep(3);
  };

  // Helper para ajustar color
  const adjustColor = (hex: string, amount: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  };

  // Helper para rectángulos redondeados
  const roundedRect = (
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

  // Descargar
  const handleDownload = () => {
    if (!generatedStory) return;
    const link = document.createElement('a');
    link.download = `story-${selectedProperty?.id || 'propiedad'}.jpg`;
    link.href = generatedStory;
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

        {/* Steps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {[
            { num: 1, label: 'Propiedad' },
            { num: 2, label: 'Estilo' },
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
                  background: step >= s.num ? '#d946ef' : '#f1f5f9',
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
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', margin: '0 0 16px 0' }}>
              Selecciona una Propiedad
            </h2>

            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
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
                    onClick={() => { setSelectedProperty(prop); setStep(2); }}
                    style={{
                      display: 'flex',
                      gap: '16px',
                      padding: '12px',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d946ef'; e.currentTarget.style.background = '#fdf4ff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'white'; }}
                  >
                    <img
                      src={prop.imagenes?.[0]?.url || '/placeholder-property.jpg'}
                      alt=""
                      style={{ width: '100px', height: '80px', objectFit: 'cover', borderRadius: '8px', background: '#f1f5f9' }}
                    />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: '0 0 4px 0' }}>
                        {prop.titulo}
                      </h4>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 8px 0' }}>
                        <MapPin size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        {[prop.ubicacion?.sector, prop.ubicacion?.ciudad].filter(Boolean).join(', ')}
                      </p>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: colores?.primary || '#d946ef' }}>
                        {formatPrice(prop.precio, prop.moneda)}
                      </span>
                    </div>
                    <ChevronRight size={20} color="#94a3b8" style={{ alignSelf: 'center' }} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Elegir Estilo */}
      {step === 2 && selectedProperty && (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                background: '#fdf4ff',
                borderRadius: '12px',
                marginBottom: '24px',
              }}
            >
              <img
                src={selectedProperty.imagenes?.[0]?.url}
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
              Elige el Estilo del Story
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
              {storyTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  style={{
                    padding: '24px 16px',
                    borderRadius: '12px',
                    border: `2px solid ${selectedTemplate.id === template.id ? '#d946ef' : '#e2e8f0'}`,
                    background: selectedTemplate.id === template.id ? '#fdf4ff' : 'white',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>{template.preview}</div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                    {template.name}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={generateStory}
              disabled={generating}
              style={{
                width: '100%',
                marginTop: '24px',
                padding: '14px',
                background: '#d946ef',
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
              {generating ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={18} />}
              {generating ? 'Generando...' : 'Crear Story'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 3 && generatedStory && (
        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
              <Smartphone size={20} color="#d946ef" />
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                Tu Story está Listo
              </h2>
            </div>

            <div
              style={{
                width: '270px',
                height: '480px',
                margin: '0 auto 24px',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                border: '8px solid #1e293b',
              }}
            >
              <img
                src={generatedStory}
                alt="Story generado"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => { setGeneratedStory(null); setStep(2); }}
                style={{
                  padding: '12px 20px',
                  background: '#f1f5f9',
                  color: '#64748b',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cambiar Estilo
              </button>
              <button
                onClick={handleDownload}
                style={{
                  padding: '12px 20px',
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
                Descargar
              </button>
            </div>
          </div>
        </div>
      )}

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

export default CrmMarketingStoriesCreator;
