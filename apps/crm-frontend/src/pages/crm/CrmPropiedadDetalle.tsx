/**
 * CrmPropiedadDetalle - Vista panorámica de propiedad para asesores
 *
 * Vista optimizada para que el asesor pueda:
 * - Ver toda la información relevante de un vistazo
 * - Decidir si la propiedad es ideal para su cliente
 * - Acceder rápidamente a estadísticas de rendimiento
 * - Ver documentos disponibles (sin acceso directo por protección)
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { usePageHeader } from '../../layouts/CrmLayout';
import { useCatalogos } from '../../contexts/CatalogosContext';
import {
  getPropiedadCrm,
  Propiedad,
} from '../../services/api';
import {
  Edit, ExternalLink, Copy, Share2, Phone, Mail, MapPin,
  Bed, Bath, Car, Maximize, Calendar, Building2, Eye, Heart,
  MessageSquare, TrendingUp, Clock, User, FileText, Play,
  ChevronLeft, ChevronRight, Star, Lock, Check, X, Globe,
  Home, Layers, DollarSign, Percent, Table2, Download, Link
} from 'lucide-react';

// Configuración de estados
const ESTADOS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  disponible: { label: 'Disponible', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  reservada: { label: 'Reservada', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
  vendida: { label: 'Vendida', color: '#64748B', bg: 'rgba(100, 116, 139, 0.12)' },
  rentada: { label: 'Rentada', color: '#64748B', bg: 'rgba(100, 116, 139, 0.12)' },
  inactiva: { label: 'Inactiva', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.12)' },
};

const OPERACIONES_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  venta: { label: 'Venta', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  renta: { label: 'Renta', color: '#0057FF', bg: 'rgba(0, 87, 255, 0.12)' },
  traspaso: { label: 'Traspaso', color: '#6236FF', bg: 'rgba(98, 54, 255, 0.12)' },
};

export default function CrmPropiedadDetalle() {
  const { tenantSlug, propiedadId } = useParams<{ tenantSlug: string; propiedadId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getToken } = useClerkAuth();
  const { setPageHeader } = usePageHeader();
  const { etiquetasPropiedad } = useCatalogos();

  const [propiedad, setPropiedad] = useState<Propiedad | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Estados para modal de inventario
  const [showInventarioModal, setShowInventarioModal] = useState(false);
  const [inventarioUnidades, setInventarioUnidades] = useState<any[]>([]);
  const [loadingInventario, setLoadingInventario] = useState(false);

  // Estados para modal de documentos
  const [showDocumentosModal, setShowDocumentosModal] = useState(false);

  const tenantActual = user?.tenants?.find(t => t.slug === tenantSlug);

  useEffect(() => {
    if (tenantActual?.id && propiedadId) {
      cargarPropiedad();
    }
  }, [tenantActual?.id, propiedadId]);

  useEffect(() => {
    if (propiedad) {
      setPageHeader({
        title: propiedad.titulo || 'Propiedad',
        subtitle: `#${(propiedad as any).codigo_publico || 'N/A'} ${propiedad.codigo ? `· Ref: ${propiedad.codigo}` : ''}`,
        backButton: {
          label: 'Propiedades',
          onClick: () => navigate(`/crm/${tenantSlug}/propiedades`),
        },
        actions: (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn-secondary"
              onClick={() => {
                const code = (propiedad as any).codigo_publico?.toString() || propiedad.codigo || '';
                navigator.clipboard.writeText(code);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
              }}
              title="Copiar código"
            >
              {copiedCode ? <Check size={16} /> : <Copy size={16} />}
              {copiedCode ? 'Copiado' : 'Código'}
            </button>
            <button
              className="btn-primary"
              onClick={() => navigate(`/crm/${tenantSlug}/propiedades/${propiedadId}/editar`)}
            >
              <Edit size={16} />
              Editar
            </button>
          </div>
        ),
      });
    }
  }, [propiedad, copiedCode, setPageHeader, tenantSlug, propiedadId, navigate]);

  const cargarPropiedad = async () => {
    if (!tenantActual?.id || !propiedadId) return;
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const data = await getPropiedadCrm(tenantActual.id, propiedadId, token);
      setPropiedad(data);
    } catch (err: any) {
      console.error('Error cargando propiedad:', err);
      setError(err.message || 'Error al cargar la propiedad');
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (value: number | undefined, moneda: string = 'USD') => {
    if (!value) return null;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: moneda,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDaysPublished = (dateString: string) => {
    const days = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return (
      <div className="detail-page">
        <div className="loading-state">
          <div className="spinner" />
          <p>Cargando propiedad...</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  if (error || !propiedad) {
    return (
      <div className="detail-page">
        <div className="error-state">
          <Home size={48} />
          <h3>{error || 'Propiedad no encontrada'}</h3>
          <button className="btn-primary" onClick={() => navigate(`/crm/${tenantSlug}/propiedades`)}>
            Volver a Propiedades
          </button>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  const estado = ESTADOS_CONFIG[propiedad.estado_propiedad] || ESTADOS_CONFIG.disponible;
  const operacion = OPERACIONES_CONFIG[propiedad.operacion] || OPERACIONES_CONFIG.venta;

  // Combinar imágenes
  const allImages = [propiedad.imagen_principal, ...(propiedad.imagenes || [])].filter(Boolean) as string[];

  // Características principales
  const caracteristicas = [
    { icon: Bed, label: 'Habitaciones', value: propiedad.habitaciones },
    { icon: Bath, label: 'Baños', value: propiedad.banos },
    { icon: Car, label: 'Estacionamientos', value: propiedad.estacionamientos },
    { icon: Maximize, label: 'Construcción', value: propiedad.m2_construccion, suffix: 'm²' },
    { icon: Layers, label: 'Terreno', value: propiedad.m2_terreno, suffix: 'm²' },
    { icon: Calendar, label: 'Antigüedad', value: propiedad.antiguedad, suffix: 'años' },
  ].filter(c => c.value);

  // Documentos (solo mostrar cantidad, no acceso)
  const documentos = propiedad.documentos || [];

  // Etiquetas con datos
  const etiquetasConDatos = ((propiedad as any).etiquetas || [])
    .map((codigo: string) => etiquetasPropiedad.find(e => e.codigo === codigo))
    .filter(Boolean);

  // Estadísticas simuladas (en producción vendrían del backend)
  const stats = {
    visitas: 342,
    favoritos: 28,
    consultas: 12,
    diasPublicada: getDaysPublished(propiedad.created_at),
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedImageIndex(prev => prev === 0 ? allImages.length - 1 : prev - 1);
    } else {
      setSelectedImageIndex(prev => prev === allImages.length - 1 ? 0 : prev + 1);
    }
  };

  // Cargar unidades de inventario
  const loadInventario = async () => {
    if (!tenantActual?.id || !propiedadId) return;
    try {
      setLoadingInventario(true);
      setShowInventarioModal(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const res = await fetch(`${API_URL}/tenants/${tenantActual.id}/propiedades/${propiedadId}/unidades`);
      if (!res.ok) throw new Error('Error al cargar unidades');
      const data = await res.json();
      setInventarioUnidades(data);
    } catch (err) {
      console.error('Error cargando inventario:', err);
      setInventarioUnidades([]);
    } finally {
      setLoadingInventario(false);
    }
  };

  // Configuración de disponibilidad
  const disponibilidadConfig = (propiedad as any)?.disponibilidad_config;
  const tieneEnlace = disponibilidadConfig?.enlace_url && disponibilidadConfig.enlace_url.trim();
  const tieneArchivo = disponibilidadConfig?.archivo_url && disponibilidadConfig.archivo_url.trim();
  const tieneInventario = disponibilidadConfig?.tipo === 'inventario';
  const tieneDisponibilidad = tieneEnlace || tieneArchivo || tieneInventario;

  return (
    <div className="detail-page">
      <div className="detail-container">
        {/* Hero Section: Galería + Info Principal */}
        <div className="hero-section">
          {/* Galería */}
          <div className="gallery-container">
            {allImages.length > 0 ? (
              <>
                <div className="main-image" onClick={() => setShowGallery(true)}>
                  <img src={allImages[selectedImageIndex]} alt={propiedad.titulo} />
                  {allImages.length > 1 && (
                    <>
                      <button className="nav-btn prev" onClick={(e) => { e.stopPropagation(); navigateImage('prev'); }}>
                        <ChevronLeft size={24} />
                      </button>
                      <button className="nav-btn next" onClick={(e) => { e.stopPropagation(); navigateImage('next'); }}>
                        <ChevronRight size={24} />
                      </button>
                      <div className="image-counter">{selectedImageIndex + 1} / {allImages.length}</div>
                    </>
                  )}
                </div>
                {allImages.length > 1 && (
                  <div className="thumbnails">
                    {allImages.slice(0, 5).map((img, idx) => (
                      <button
                        key={idx}
                        className={`thumb ${idx === selectedImageIndex ? 'active' : ''}`}
                        onClick={() => setSelectedImageIndex(idx)}
                      >
                        <img src={img} alt="" />
                      </button>
                    ))}
                    {allImages.length > 5 && (
                      <button className="thumb more" onClick={() => setShowGallery(true)}>
                        +{allImages.length - 5}
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="no-image">
                <Home size={48} />
                <span>Sin imágenes</span>
              </div>
            )}
          </div>

          {/* Info Principal */}
          <div className="main-info">
            {/* Badges */}
            <div className="badges-row">
              <span className="badge badge-operacion" style={{ color: operacion.color, background: operacion.bg }}>
                {operacion.label}
              </span>
              <span className="badge badge-estado" style={{ color: estado.color, background: estado.bg }}>
                {estado.label}
              </span>
              {propiedad.is_project && (
                <span className="badge badge-proyecto"><Building2 size={12} /> Proyecto</span>
              )}
              {propiedad.destacada && (
                <span className="badge badge-destacada"><Star size={12} /> Destacada</span>
              )}
              {propiedad.exclusiva && (
                <span className="badge badge-exclusiva"><Lock size={12} /> Exclusiva</span>
              )}
            </div>

            {/* Etiquetas personalizadas */}
            {etiquetasConDatos.length > 0 && (
              <div className="etiquetas-row">
                {etiquetasConDatos.map((etiqueta: any) => (
                  <span
                    key={etiqueta.id}
                    className="etiqueta"
                    style={{ color: etiqueta.color || '#6366f1', background: `${etiqueta.color || '#6366f1'}15` }}
                  >
                    {etiqueta.nombre}
                  </span>
                ))}
              </div>
            )}

            {/* Código público destacado */}
            <div className="codigo-publico">
              #{(propiedad as any).codigo_publico || 'N/A'}
              {propiedad.codigo && <span className="codigo-interno">Ref: {propiedad.codigo}</span>}
            </div>

            {/* Precio */}
            <div className="precio-section">
              {propiedad.precio ? (
                <>
                  <div className="precio-principal">{formatMoney(propiedad.precio, propiedad.moneda)}</div>
                  {propiedad.precio_anterior && propiedad.precio_anterior !== propiedad.precio && (
                    <div className="precio-anterior">Antes: {formatMoney(propiedad.precio_anterior, propiedad.moneda)}</div>
                  )}
                </>
              ) : (
                <div className="precio-consultar">Precio a consultar</div>
              )}

              {/* Precios adicionales */}
              {(propiedad.precio_venta || propiedad.precio_alquiler || propiedad.maintenance) && (
                <div className="precios-extra">
                  {propiedad.precio_venta && propiedad.precio_venta !== propiedad.precio && (
                    <div className="precio-item">
                      <span className="label">Venta</span>
                      <span className="value">{formatMoney(propiedad.precio_venta, propiedad.moneda)}</span>
                    </div>
                  )}
                  {propiedad.precio_alquiler && (
                    <div className="precio-item">
                      <span className="label">Alquiler</span>
                      <span className="value">{formatMoney(propiedad.precio_alquiler, propiedad.moneda)}/mes</span>
                    </div>
                  )}
                  {propiedad.maintenance && (
                    <div className="precio-item">
                      <span className="label">Mantenimiento</span>
                      <span className="value">{formatMoney(propiedad.maintenance, propiedad.moneda)}/mes</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Comisión */}
            {(propiedad.comision || propiedad.comision_nota) && (
              <div className="comision-box">
                <Percent size={16} />
                <div className="comision-content">
                  {propiedad.comision && (
                    <span className="comision-value">
                      {typeof propiedad.comision === 'number' || !isNaN(Number(propiedad.comision))
                        ? `${propiedad.comision}%`
                        : propiedad.comision}
                    </span>
                  )}
                  {propiedad.comision_nota && <span className="comision-nota">{propiedad.comision_nota}</span>}
                </div>
              </div>
            )}

            {/* Características */}
            <div className="caracteristicas-grid">
              {caracteristicas.map((c, idx) => (
                <div key={idx} className="caracteristica">
                  <c.icon size={20} />
                  <div className="caracteristica-info">
                    <span className="caracteristica-value">{c.value}{c.suffix ? ` ${c.suffix}` : ''}</span>
                    <span className="caracteristica-label">{c.label}</span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Sección de Disponibilidad - Ancho completo debajo del hero */}
        {tieneDisponibilidad && (
          <div className="disponibilidad-section">
            <span className="disp-label">Disponibilidad:</span>
            <div className="disp-buttons">
              {tieneEnlace && (
                <a
                  href={disponibilidadConfig.enlace_url.startsWith('http') ? disponibilidadConfig.enlace_url : `https://${disponibilidadConfig.enlace_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="disp-btn"
                >
                  <Link size={14} /> Ver enlace externo
                </a>
              )}
              {tieneArchivo && (
                <a
                  href={disponibilidadConfig.archivo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="disp-btn"
                >
                  <Download size={14} /> Descargar archivo
                </a>
              )}
              {tieneInventario && (
                <button type="button" onClick={loadInventario} className="disp-btn">
                  <Table2 size={14} /> Ver inventario de unidades
                </button>
              )}
            </div>
          </div>
        )}

        {/* Grid de contenido */}
        <div className="content-grid">
          {/* Columna Principal */}
          <div className="main-column">
            {/* Ubicación */}
            <section className="section">
              <h3><MapPin size={18} /> Ubicación</h3>
              <div className="ubicacion-content">
                {propiedad.direccion && <p className="direccion">{propiedad.direccion}</p>}
                <div className="ubicacion-tags">
                  {propiedad.sector && <span>{propiedad.sector}</span>}
                  {propiedad.zona && <span>{propiedad.zona}</span>}
                  {propiedad.ciudad && <span>{propiedad.ciudad}</span>}
                  {propiedad.provincia && <span>{propiedad.provincia}</span>}
                  {propiedad.pais && <span>{propiedad.pais}</span>}
                </div>
              </div>
            </section>

            {/* Descripción */}
            {propiedad.descripcion && (
              <section className="section">
                <h3><FileText size={18} /> Descripción</h3>
                <div
                  className="descripcion-content"
                  dangerouslySetInnerHTML={{ __html: propiedad.descripcion }}
                />
              </section>
            )}

            {/* Amenidades */}
            {propiedad.amenidades && propiedad.amenidades.length > 0 && (
              <section className="section">
                <h3><Check size={18} /> Amenidades</h3>
                <div className="amenidades-grid">
                  {propiedad.amenidades.map((amenidad, idx) => (
                    <span key={idx} className="amenidad-tag">
                      <Check size={14} /> {amenidad}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Tour Virtual / Video (solo si existe) */}
            {(propiedad.tour_virtual_url || propiedad.video_url) && (
              <section className="section">
                <h3><Play size={18} /> Multimedia</h3>
                <div className="multimedia-links">
                  {propiedad.tour_virtual_url && (
                    <a href={propiedad.tour_virtual_url} target="_blank" rel="noopener noreferrer" className="multimedia-link">
                      <Globe size={16} /> Ver Tour Virtual
                      <ExternalLink size={14} />
                    </a>
                  )}
                  {propiedad.video_url && (
                    <a href={propiedad.video_url} target="_blank" rel="noopener noreferrer" className="multimedia-link">
                      <Play size={16} /> Ver Video
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </section>
            )}

            {/* Datos del Proyecto (solo si es proyecto) */}
            {propiedad.is_project && (
              <section className="section section-proyecto">
                <h3><Building2 size={18} /> Datos del Proyecto</h3>
                <div className="proyecto-content">
                  {/* Tipologías */}
                  {(propiedad as any).tipologias?.length > 0 && (
                    <div className="proyecto-subsection">
                      <h4>Tipologías disponibles</h4>
                      <div className="tipologias-grid">
                        {(propiedad as any).tipologias.map((tip: any, idx: number) => (
                          <div key={idx} className="tipologia-card">
                            <div className="tipologia-nombre">{tip.nombre}</div>
                            <div className="tipologia-detalles">
                              {tip.habitaciones && <span><Bed size={14} /> {tip.habitaciones}</span>}
                              {tip.banos && <span><Bath size={14} /> {tip.banos}</span>}
                              {tip.m2 && <span><Maximize size={14} /> {tip.m2}m²</span>}
                              {tip.precio && <span><DollarSign size={14} /> {formatMoney(Number(tip.precio), propiedad.moneda || 'USD')}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Etapas */}
                  {(propiedad as any).etapas?.length > 0 && (
                    <div className="proyecto-subsection">
                      <h4>Etapas de entrega</h4>
                      <div className="etapas-list">
                        {(propiedad as any).etapas.map((etapa: any, idx: number) => (
                          <div key={idx} className="etapa-item">
                            <span className="etapa-nombre">{etapa.nombre}</span>
                            {etapa.fecha_entrega && (
                              <span className="etapa-fecha">
                                <Calendar size={14} /> {formatDate(etapa.fecha_entrega)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Planes de Pago */}
                  {(propiedad as any).planes_pago && (
                    (Array.isArray((propiedad as any).planes_pago)
                      ? (propiedad as any).planes_pago.length > 0
                      : Object.keys((propiedad as any).planes_pago).length > 0)
                  ) && (
                    <div className="proyecto-subsection">
                      <h4>Plan de Pago</h4>
                      <div className="planes-pago-list">
                        {Array.isArray((propiedad as any).planes_pago) ? (
                          (propiedad as any).planes_pago.map((plan: any, idx: number) => (
                            <div key={idx} className="plan-pago-item">
                              <span className="plan-concepto">{plan.concepto || plan.nombre || `Pago ${idx + 1}`}</span>
                              <span className="plan-valor">
                                {plan.porcentaje ? `${plan.porcentaje}%` : ''}
                                {plan.monto ? formatMoney(Number(plan.monto), propiedad.moneda || 'USD') : ''}
                              </span>
                            </div>
                          ))
                        ) : (
                          (() => {
                            // Mapeo de labels amigables
                            const labelMap: Record<string, string> = {
                              'separacion': 'Separación',
                              'reserva': 'Reserva',
                              'reserva_valor': 'Reserva',
                              'inicial': 'Inicial',
                              'inicial_construccion': 'Inicial / Construcción',
                              'contra_entrega': 'Contra Entrega',
                              'financiamiento': 'Financiamiento',
                              'cuotas': 'Cuotas',
                              'entrada': 'Entrada',
                              'saldo': 'Saldo'
                            };

                            // Orden deseado para mostrar los planes de pago
                            const ordenPrioritario = [
                              'reserva', 'reserva_valor',
                              'separacion',
                              'inicial', 'inicial_construccion',
                              'contra_entrega',
                              'financiamiento', 'cuotas', 'entrada', 'saldo'
                            ];

                            // Ordenar las entradas según la prioridad
                            const entries = Object.entries((propiedad as any).planes_pago);
                            const sortedEntries = entries.sort(([keyA], [keyB]) => {
                              const indexA = ordenPrioritario.indexOf(keyA);
                              const indexB = ordenPrioritario.indexOf(keyB);
                              // Si no está en la lista, ponerlo al final
                              const orderA = indexA === -1 ? 999 : indexA;
                              const orderB = indexB === -1 ? 999 : indexB;
                              return orderA - orderB;
                            });

                            return sortedEntries.map(([key, value]: [string, any], idx: number) => {
                              const label = labelMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                              // Detectar si es porcentaje o monto
                              const numValue = typeof value === 'string' ? parseFloat(value) : (typeof value === 'number' ? value : null);
                              const isLikelyPercentage = numValue !== null && numValue <= 100 && key !== 'reserva_valor';
                              const isMontoField = key.includes('valor') || key.includes('monto');

                              return (
                                <div key={idx} className="plan-pago-item">
                                  <span className="plan-concepto">{label}</span>
                                  <span className="plan-valor">
                                    {typeof value === 'object'
                                      ? (value.porcentaje ? `${value.porcentaje}%` : formatMoney(Number(value.monto || value), propiedad.moneda || 'USD'))
                                      : isMontoField
                                        ? formatMoney(Number(value), propiedad.moneda || 'USD')
                                        : isLikelyPercentage
                                          ? `${numValue}%`
                                          : value
                                    }
                                  </span>
                                </div>
                              );
                            });
                          })()
                        )}
                      </div>
                    </div>
                  )}

                  {/* Rangos de precio */}
                  {(propiedad.precio_min || propiedad.precio_max) && (
                    <div className="proyecto-rango">
                      <span className="rango-label">Rango de precios:</span>
                      <span className="rango-value">
                        {formatMoney(propiedad.precio_min, propiedad.moneda)} - {formatMoney(propiedad.precio_max, propiedad.moneda)}
                      </span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Beneficios del Proyecto */}
            {propiedad.is_project && (propiedad as any).beneficios?.length > 0 && (
              <section className="section section-beneficios">
                <h3><Star size={18} /> Beneficios del Proyecto</h3>
                <div className="beneficios-grid">
                  {(propiedad as any).beneficios.map((beneficio: string, idx: number) => (
                    <div key={idx} className="beneficio-item">
                      <Check size={16} />
                      <span>{beneficio}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Garantías del Proyecto */}
            {propiedad.is_project && (propiedad as any).garantias?.length > 0 && (
              <section className="section section-garantias">
                <h3><Lock size={18} /> Garantías</h3>
                <div className="garantias-grid">
                  {(propiedad as any).garantias.map((garantia: string, idx: number) => (
                    <div key={idx} className="garantia-item">
                      <Check size={16} />
                      <span>{garantia}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Notas internas */}
            {propiedad.notas && (
              <section className="section section-notas">
                <h3>Notas internas</h3>
                <div className="notas-content">{propiedad.notas}</div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="detail-sidebar">
            {/* Estadísticas rápidas */}
            <div className="sidebar-card stats-card">
              <h4><TrendingUp size={16} /> Rendimiento</h4>
              <div className="stats-grid">
                <div className="stat">
                  <Eye size={18} />
                  <span className="stat-value">{stats.visitas}</span>
                  <span className="stat-label">Visitas</span>
                </div>
                <div className="stat">
                  <Heart size={18} />
                  <span className="stat-value">{stats.favoritos}</span>
                  <span className="stat-label">Favoritos</span>
                </div>
                <div className="stat">
                  <MessageSquare size={18} />
                  <span className="stat-value">{stats.consultas}</span>
                  <span className="stat-label">Consultas</span>
                </div>
                <div className="stat">
                  <Clock size={18} />
                  <span className="stat-value">{stats.diasPublicada}</span>
                  <span className="stat-label">Días</span>
                </div>
              </div>
            </div>

            {/* Captador */}
            {(propiedad.agente_nombre || (propiedad as any).captador_nombre) && (
              <div className="sidebar-card captador-card">
                <h4><User size={16} /> Captador</h4>
                <div className="agente-info">
                  {(propiedad as any).captador_avatar ? (
                    <img
                      src={(propiedad as any).captador_avatar}
                      alt="Avatar"
                      className="agente-avatar-img"
                    />
                  ) : (
                    <div className="agente-avatar">
                      {(propiedad.agente_nombre?.[0] || (propiedad as any).captador_nombre?.[0] || 'A').toUpperCase()}
                    </div>
                  )}
                  <div className="agente-datos">
                    <span className="agente-nombre">
                      {propiedad.agente_nombre || (propiedad as any).captador_nombre} {propiedad.agente_apellido || (propiedad as any).captador_apellido || ''}
                    </span>
                    {((propiedad as any).captador_telefono || (propiedad as any).captador_email) && (
                      <div className="agente-contacto">
                        {(propiedad as any).captador_telefono && (
                          <a href={`tel:${(propiedad as any).captador_telefono}`} className="contacto-link">
                            <Phone size={14} /> {(propiedad as any).captador_telefono}
                          </a>
                        )}
                        {(propiedad as any).captador_email && (
                          <a href={`mailto:${(propiedad as any).captador_email}`} className="contacto-link">
                            <Mail size={14} /> {(propiedad as any).captador_email}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Desarrollador (solo si es proyecto y tiene desarrollador) */}
            {propiedad.is_project && ((propiedad as any).desarrollador_nombre || (propiedad as any).desarrollador_empresa) && (
              <div className="sidebar-card desarrollador-card">
                <h4><Building2 size={16} /> Desarrollador</h4>
                <div className="desarrollador-info">
                  {(propiedad as any).desarrollador_empresa && (
                    <span className="desarrollador-empresa">{(propiedad as any).desarrollador_empresa}</span>
                  )}
                  {(propiedad as any).desarrollador_nombre && (
                    <span className="desarrollador-nombre">
                      {(propiedad as any).desarrollador_nombre} {(propiedad as any).desarrollador_apellido || ''}
                    </span>
                  )}
                  {((propiedad as any).desarrollador_telefono || (propiedad as any).desarrollador_email) && (
                    <div className="desarrollador-contacto">
                      {(propiedad as any).desarrollador_telefono && (
                        <a href={`tel:${(propiedad as any).desarrollador_telefono}`} className="contacto-link">
                          <Phone size={14} /> {(propiedad as any).desarrollador_telefono}
                        </a>
                      )}
                      {(propiedad as any).desarrollador_email && (
                        <a href={`mailto:${(propiedad as any).desarrollador_email}`} className="contacto-link">
                          <Mail size={14} /> {(propiedad as any).desarrollador_email}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Propietario */}
            {(propiedad.propietario_nombre) && (
              <div className="sidebar-card">
                <h4><User size={16} /> Propietario</h4>
                <div className="propietario-info">
                  <span>{propiedad.propietario_nombre} {propiedad.propietario_apellido || ''}</span>
                </div>
              </div>
            )}

            {/* Documentos (resumido) */}
            {documentos.length > 0 && (
              <div className="sidebar-card">
                <h4><FileText size={16} /> Documentos</h4>
                <div className="documentos-resumen">
                  <p>{documentos.length} documento{documentos.length !== 1 ? 's' : ''} adjunto{documentos.length !== 1 ? 's' : ''}</p>
                  <ul className="documentos-lista">
                    {documentos.slice(0, 3).map((doc: any, idx: number) => (
                      <li
                        key={idx}
                        className="doc-item-clickable"
                        onClick={() => doc.url && window.open(doc.url, '_blank')}
                        title={doc.url ? 'Clic para abrir documento' : 'Sin archivo'}
                      >
                        <FileText size={14} />
                        <span>{doc.nombre || doc.tipo}</span>
                        {doc.url && <ExternalLink size={12} className="doc-external-icon" />}
                      </li>
                    ))}
                  </ul>
                  {documentos.length > 3 && (
                    <button
                      className="btn-ver-docs"
                      onClick={() => setShowDocumentosModal(true)}
                    >
                      Ver todos ({documentos.length})
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Fechas */}
            <div className="sidebar-card fechas-card">
              <div className="fecha-item">
                <span className="fecha-label">Creada</span>
                <span className="fecha-value">{formatDate(propiedad.created_at)}</span>
              </div>
              <div className="fecha-item">
                <span className="fecha-label">Actualizada</span>
                <span className="fecha-value">{formatDate(propiedad.updated_at)}</span>
              </div>
            </div>

            {/* Acciones rápidas */}
            <div className="sidebar-card acciones-card">
              <button className="btn-accion" onClick={() => navigate(`/crm/${tenantSlug}/propiedades/${propiedadId}/editar`)}>
                <Edit size={16} /> Editar propiedad
              </button>
              <button className="btn-accion secondary">
                <Share2 size={16} /> Compartir
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de galería */}
      {showGallery && (
        <div className="gallery-modal" onClick={() => setShowGallery(false)}>
          <button className="close-modal" onClick={() => setShowGallery(false)}>×</button>
          <div className="gallery-content" onClick={e => e.stopPropagation()}>
            <img src={allImages[selectedImageIndex]} alt="" />
            <button className="nav-btn prev" onClick={() => navigateImage('prev')}>
              <ChevronLeft size={32} />
            </button>
            <button className="nav-btn next" onClick={() => navigateImage('next')}>
              <ChevronRight size={32} />
            </button>
            <div className="gallery-thumbs">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  className={`gthumb ${idx === selectedImageIndex ? 'active' : ''}`}
                  onClick={() => setSelectedImageIndex(idx)}
                >
                  <img src={img} alt="" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Inventario */}
      {showInventarioModal && (
        <div className="inventario-modal-overlay" onClick={() => setShowInventarioModal(false)}>
          <div className="inventario-modal" onClick={e => e.stopPropagation()}>
            <div className="inventario-modal-header">
              <h3><Table2 size={20} /> Inventario de Unidades - {propiedad.titulo}</h3>
              <button className="close-modal-btn" onClick={() => setShowInventarioModal(false)}>
                <X size={20} />
              </button>
            </div>

            {loadingInventario ? (
              <div className="inventario-loading">
                <div className="spinner" />
                <p>Cargando unidades...</p>
              </div>
            ) : inventarioUnidades.length === 0 ? (
              <div className="inventario-empty">
                <Table2 size={48} />
                <p>No hay unidades registradas en el inventario</p>
              </div>
            ) : (
              <>
                {/* Estadísticas rápidas */}
                <div className="inventario-stats">
                  <div className="stat-card disponible">
                    <span className="stat-number">{inventarioUnidades.filter(u => u.estado === 'disponible').length}</span>
                    <span className="stat-label">Disponibles</span>
                  </div>
                  <div className="stat-card reservada">
                    <span className="stat-number">{inventarioUnidades.filter(u => u.estado === 'reservada').length}</span>
                    <span className="stat-label">Reservadas</span>
                  </div>
                  <div className="stat-card vendida">
                    <span className="stat-number">{inventarioUnidades.filter(u => u.estado === 'vendida').length}</span>
                    <span className="stat-label">Vendidas</span>
                  </div>
                  <div className="stat-card total">
                    <span className="stat-number">{inventarioUnidades.length}</span>
                    <span className="stat-label">Total</span>
                  </div>
                </div>

                {/* Tabla de unidades */}
                <div className="inventario-table-container">
                  <table className="inventario-table">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Tipología</th>
                        <th>Nivel</th>
                        <th>Área</th>
                        <th>Precio</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventarioUnidades.map(unidad => (
                        <tr key={unidad.id}>
                          <td className="codigo">{unidad.codigo}</td>
                          <td>{unidad.tipologia || '-'}</td>
                          <td>{unidad.nivel || '-'}</td>
                          <td>{unidad.area_m2 ? `${unidad.area_m2} m²` : '-'}</td>
                          <td className="precio">
                            {unidad.precio
                              ? new Intl.NumberFormat('es-MX', {
                                  style: 'currency',
                                  currency: unidad.moneda || 'USD',
                                  maximumFractionDigits: 0
                                }).format(unidad.precio)
                              : '-'}
                          </td>
                          <td>
                            <span className={`estado-badge ${unidad.estado}`}>
                              {unidad.estado === 'disponible' && 'Disponible'}
                              {unidad.estado === 'reservada' && 'Reservada'}
                              {unidad.estado === 'vendida' && 'Vendida'}
                              {unidad.estado === 'bloqueada' && 'Bloqueada'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de Documentos */}
      {showDocumentosModal && (
        <div className="documentos-modal-overlay" onClick={() => setShowDocumentosModal(false)}>
          <div className="documentos-modal" onClick={e => e.stopPropagation()}>
            <div className="documentos-modal-header">
              <h3><FileText size={20} /> Documentos - {propiedad.titulo}</h3>
              <button className="close-modal-btn" onClick={() => setShowDocumentosModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="documentos-modal-content">
              {documentos.length === 0 ? (
                <div className="documentos-empty">
                  <FileText size={48} />
                  <p>No hay documentos adjuntos</p>
                </div>
              ) : (
                <ul className="documentos-modal-lista">
                  {documentos.map((doc: any, idx: number) => (
                    <li
                      key={idx}
                      className={`doc-modal-item ${doc.url ? 'clickable' : 'disabled'}`}
                      onClick={() => doc.url && window.open(doc.url, '_blank')}
                    >
                      <FileText size={18} />
                      <div className="doc-info">
                        <span className="doc-nombre">{doc.nombre || doc.tipo || `Documento ${idx + 1}`}</span>
                        {doc.tipo && doc.nombre && <span className="doc-tipo">{doc.tipo}</span>}
                        {doc.fecha_subida && (
                          <span className="doc-fecha">
                            Subido: {new Date(doc.fecha_subida).toLocaleDateString('es-ES')}
                          </span>
                        )}
                      </div>
                      {doc.url ? (
                        <ExternalLink size={16} className="doc-action-icon" />
                      ) : (
                        <span className="doc-no-archivo">Sin archivo</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .detail-page {
    width: 100%;
    min-height: 100%;
  }

  .detail-container {
    width: 100%;
  }

  .loading-state, .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 24px;
    gap: 16px;
    color: #64748b;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e2e8f0;
    border-top-color: #0057FF;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-state h3 {
    margin: 0;
    color: #0f172a;
  }

  /* Hero Section */
  .hero-section {
    display: grid;
    grid-template-columns: 1fr 420px;
    gap: 32px;
    margin-bottom: 32px;
  }

  @media (max-width: 1200px) {
    .hero-section {
      grid-template-columns: 1fr 380px;
    }
  }

  @media (max-width: 1024px) {
    .hero-section {
      grid-template-columns: 1fr;
    }
  }

  /* Gallery */
  .gallery-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .main-image {
    position: relative;
    aspect-ratio: 16/9;
    border-radius: 16px;
    overflow: hidden;
    background: #e2e8f0;
    cursor: zoom-in;
  }

  .main-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .nav-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(255,255,255,0.95);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    transition: all 0.2s;
    color: #0f172a;
  }

  .nav-btn:hover {
    transform: translateY(-50%) scale(1.05);
    background: white;
  }

  .nav-btn.prev { left: 12px; }
  .nav-btn.next { right: 12px; }

  .image-counter {
    position: absolute;
    bottom: 12px;
    right: 12px;
    background: rgba(0,0,0,0.7);
    color: white;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 500;
  }

  .thumbnails {
    display: flex;
    gap: 8px;
  }

  .thumb {
    width: 80px;
    height: 60px;
    border-radius: 8px;
    overflow: hidden;
    border: 2px solid transparent;
    cursor: pointer;
    padding: 0;
    background: #e2e8f0;
    transition: all 0.2s;
  }

  .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .thumb.active {
    border-color: #0057FF;
  }

  .thumb.more {
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    color: #64748b;
  }

  .no-image {
    aspect-ratio: 16/10;
    border-radius: 16px;
    background: #e2e8f0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: #94a3b8;
  }

  /* Main Info */
  .main-info {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .badges-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .badge-proyecto {
    background: #1e293b;
    color: white;
  }

  .badge-destacada {
    background: rgba(245, 158, 11, 0.12);
    color: #d97706;
  }

  .badge-exclusiva {
    background: rgba(98, 54, 255, 0.12);
    color: #6236FF;
  }

  .etiquetas-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .etiqueta {
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .codigo-publico {
    font-size: 1.8rem;
    font-weight: 800;
    color: #0057FF;
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  .codigo-interno {
    font-size: 0.85rem;
    font-weight: 500;
    color: #94a3b8;
  }

  .precio-section {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    padding: 16px 20px;
    border-radius: 14px;
  }

  .precio-principal {
    font-size: 1.8rem;
    font-weight: 700;
    color: #0f172a;
  }

  .precio-anterior {
    font-size: 0.9rem;
    color: #94a3b8;
    text-decoration: line-through;
    margin-top: 4px;
  }

  .precio-consultar {
    font-size: 1.2rem;
    color: #64748b;
    font-style: italic;
  }

  .precios-extra {
    display: flex;
    gap: 16px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #e2e8f0;
  }

  .precio-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .precio-item .label {
    font-size: 0.7rem;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .precio-item .value {
    font-size: 0.95rem;
    font-weight: 600;
    color: #0f172a;
  }

  .comision-box {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.04) 100%);
    border: 1.5px solid rgba(16, 185, 129, 0.3);
    border-radius: 10px;
    color: #059669;
  }

  .comision-content {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .comision-value {
    font-size: 1rem;
    font-weight: 700;
    color: #047857;
  }

  .comision-nota {
    font-size: 0.8rem;
    color: #065f46;
  }

  .caracteristicas-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 10px;
  }

  .caracteristica {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
  }

  .caracteristica svg {
    color: #0057FF;
    flex-shrink: 0;
    width: 18px;
    height: 18px;
  }

  .caracteristica-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .caracteristica-value {
    font-size: 1rem;
    font-weight: 600;
    color: #0f172a;
    line-height: 1.2;
  }

  .caracteristica-label {
    font-size: 0.65rem;
    color: #64748b;
    white-space: nowrap;
  }

  /* Content Grid */
  .content-grid {
    display: grid;
    grid-template-columns: 1fr 360px;
    gap: 24px;
  }

  @media (max-width: 1200px) {
    .content-grid {
      grid-template-columns: 1fr 340px;
    }
  }

  @media (max-width: 1024px) {
    .content-grid {
      grid-template-columns: 1fr;
    }
  }

  .main-column {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .section {
    background: white;
    border-radius: 16px;
    padding: 28px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }

  .section h3 {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 1.1rem;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 20px 0;
    padding-bottom: 12px;
    border-bottom: 2px solid #f1f5f9;
  }

  .section h3 svg {
    color: #0057FF;
    width: 22px;
    height: 22px;
  }

  .ubicacion-content .direccion {
    font-size: 1rem;
    color: #0f172a;
    margin: 0 0 12px 0;
  }

  .ubicacion-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .ubicacion-tags span {
    padding: 6px 12px;
    background: #f1f5f9;
    border-radius: 8px;
    font-size: 0.85rem;
    color: #475569;
  }

  .descripcion-content {
    font-size: 0.95rem;
    line-height: 1.8;
    color: #475569;
  }

  .descripcion-content p {
    margin: 0 0 1em 0;
  }

  .descripcion-content p:last-child {
    margin-bottom: 0;
  }

  .descripcion-content strong,
  .descripcion-content b {
    font-weight: 600;
    color: #0f172a;
  }

  .descripcion-content em,
  .descripcion-content i {
    font-style: italic;
  }

  .descripcion-content ul,
  .descripcion-content ol {
    margin: 0 0 1em 0;
    padding-left: 1.5em;
  }

  .descripcion-content li {
    margin-bottom: 0.5em;
  }

  .descripcion-content h4,
  .descripcion-content h5,
  .descripcion-content h6 {
    font-weight: 600;
    color: #0f172a;
    margin: 1.5em 0 0.5em 0;
  }

  .amenidades-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
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

  .multimedia-links {
    display: flex;
    gap: 12px;
  }

  .multimedia-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    color: #0057FF;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s;
  }

  .multimedia-link:hover {
    background: #f1f5f9;
    border-color: #0057FF;
  }

  /* Proyecto */
  .section-proyecto {
    background: linear-gradient(135deg, #fafbff 0%, #f5f7ff 100%);
    border-color: #c7d2fe;
  }

  .proyecto-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .proyecto-subsection h4 {
    font-size: 0.85rem;
    font-weight: 600;
    color: #475569;
    margin: 0 0 12px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .tipologias-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
  }

  .tipologia-card {
    padding: 14px;
    background: white;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
  }

  .tipologia-nombre {
    font-weight: 600;
    color: #0f172a;
    margin-bottom: 8px;
  }

  .tipologia-detalles {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .tipologia-detalles span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    color: #64748b;
  }

  .etapas-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .etapa-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: white;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
  }

  .etapa-nombre {
    font-weight: 500;
    color: #0f172a;
  }

  .etapa-fecha {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.85rem;
    color: #64748b;
  }

  .planes-pago-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .plan-pago-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 18px;
    background: white;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
  }

  .plan-concepto {
    font-weight: 500;
    color: #0f172a;
    font-size: 0.95rem;
  }

  .plan-valor {
    font-weight: 700;
    color: #0057FF;
    font-size: 1rem;
  }

  .proyecto-rango {
    padding: 12px 16px;
    background: white;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
  }

  .rango-label {
    font-size: 0.85rem;
    color: #64748b;
    margin-right: 8px;
  }

  .rango-value {
    font-weight: 600;
    color: #0f172a;
  }

  /* Beneficios */
  .section-beneficios {
    background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
    border-color: #86efac;
  }

  .section-beneficios h3 {
    color: #166534;
  }

  .section-beneficios h3 svg {
    color: #16a34a;
  }

  .beneficios-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .beneficio-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 16px;
    background: white;
    border-radius: 10px;
    border: 1px solid rgba(22, 163, 74, 0.2);
  }

  .beneficio-item svg {
    color: #16a34a;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .beneficio-item span {
    color: #166534;
    font-size: 0.95rem;
    line-height: 1.4;
  }

  /* Garantías */
  .section-garantias {
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    border-color: #93c5fd;
  }

  .section-garantias h3 {
    color: #1e40af;
  }

  .section-garantias h3 svg {
    color: #3b82f6;
  }

  .garantias-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .garantia-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 16px;
    background: white;
    border-radius: 10px;
    border: 1px solid rgba(59, 130, 246, 0.2);
  }

  .garantia-item svg {
    color: #3b82f6;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .garantia-item span {
    color: #1e40af;
    font-size: 0.95rem;
    line-height: 1.4;
  }

  /* Notas */
  .section-notas {
    background: #fffbeb;
    border-color: #fde68a;
  }

  .section-notas h3 {
    color: #92400e;
  }

  .notas-content {
    color: #92400e;
    line-height: 1.6;
    white-space: pre-wrap;
  }

  /* Sidebar */
  .detail-sidebar {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .sidebar-card {
    background: white;
    border-radius: 12px;
    padding: 20px;
    border: 1px solid #e2e8f0;
  }

  .sidebar-card h4 {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    font-weight: 600;
    color: #0f172a;
    margin: 0 0 16px 0;
  }

  .sidebar-card h4 svg {
    color: #64748b;
  }

  /* Stats */
  .stats-card {
    background: white;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px;
    background: white;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
  }

  .stat svg {
    color: #0057FF;
    margin-bottom: 4px;
  }

  .stat-value {
    font-size: 1.3rem;
    font-weight: 700;
    color: #0f172a;
  }

  .stat-label {
    font-size: 0.7rem;
    color: #64748b;
  }

  /* Agente */
  .agente-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .agente-avatar {
    width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #0057FF 0%, #6366f1 100%);
    color: white;
    font-size: 1.2rem;
    font-weight: 600;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .agente-avatar-img {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
    border: 2px solid #e2e8f0;
  }

  .agente-datos {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
    min-width: 0;
  }

  .agente-nombre {
    font-weight: 600;
    color: #0f172a;
  }

  .agente-contacto {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 8px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
  }

  .contacto-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    background: transparent;
    font-size: 0.9rem;
    font-weight: 500;
    color: #475569;
    text-decoration: none;
    transition: all 0.2s;
  }

  .contacto-link:hover {
    color: #0057FF;
  }

  .contacto-link svg {
    flex-shrink: 0;
    color: #0057FF;
    width: 18px;
    height: 18px;
  }

  /* Desarrollador card */
  .desarrollador-card {
    background: white;
  }

  .desarrollador-card h4 svg {
    color: #6366f1;
  }

  .desarrollador-info {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .desarrollador-empresa {
    font-size: 1rem;
    font-weight: 600;
    color: #0f172a;
  }

  .desarrollador-nombre {
    font-size: 0.9rem;
    color: #475569;
  }

  .desarrollador-contacto {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 10px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
  }

  .propietario-info {
    padding: 0;
    background: transparent;
    color: #0f172a;
  }

  /* Documentos */
  .documentos-resumen p {
    margin: 0 0 12px 0;
    color: #64748b;
    font-size: 0.9rem;
  }

  .documentos-lista {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .documentos-lista li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    border-bottom: 1px solid #f1f5f9;
    font-size: 0.85rem;
    color: #475569;
  }

  .documentos-lista li:last-child {
    border-bottom: none;
  }

  .documentos-lista li svg {
    color: #64748b;
    flex-shrink: 0;
  }

  .documentos-lista li span {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .documentos-lista li.more {
    color: #94a3b8;
    font-style: italic;
  }

  .btn-ver-docs {
    margin-top: 12px;
    width: 100%;
    padding: 10px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    color: #0057FF;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-ver-docs:hover {
    background: #f1f5f9;
  }

  /* Fechas */
  .fechas-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .fechas-card h4 {
    display: none;
  }

  .fecha-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
  }

  .fecha-item:not(:last-child) {
    border-bottom: 1px solid #f1f5f9;
  }

  .fecha-label {
    font-size: 0.85rem;
    color: #64748b;
  }

  .fecha-value {
    font-size: 0.85rem;
    font-weight: 500;
    color: #0f172a;
  }

  /* Acciones */
  .acciones-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .acciones-card h4 {
    display: none;
  }

  .btn-accion {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 16px;
    background: #0057FF;
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-accion:hover {
    background: #0046cc;
  }

  .btn-accion.secondary {
    background: white;
    color: #475569;
    border: 1px solid #e2e8f0;
  }

  .btn-accion.secondary:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
  }

  /* Gallery Modal */
  .gallery-modal {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.95);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
  }

  .close-modal {
    position: absolute;
    top: 20px;
    right: 20px;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(255,255,255,0.1);
    border: none;
    color: white;
    font-size: 28px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .close-modal:hover {
    background: rgba(255,255,255,0.2);
  }

  .gallery-content {
    position: relative;
    max-width: 100%;
    max-height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  .gallery-content > img {
    max-height: 70vh;
    max-width: 100%;
    object-fit: contain;
    border-radius: 8px;
  }

  .gallery-modal .nav-btn {
    position: absolute;
    top: 50%;
    background: rgba(255,255,255,0.15);
    color: white;
  }

  .gallery-modal .nav-btn:hover {
    background: rgba(255,255,255,0.25);
  }

  .gallery-thumbs {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 10px 0;
  }

  .gthumb {
    width: 80px;
    height: 60px;
    border-radius: 6px;
    overflow: hidden;
    border: 2px solid transparent;
    cursor: pointer;
    padding: 0;
    opacity: 0.6;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .gthumb:hover {
    opacity: 1;
  }

  .gthumb.active {
    border-color: white;
    opacity: 1;
  }

  .gthumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* Buttons in header */
  .btn-primary, .btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .btn-primary {
    background: #0057FF;
    color: white;
  }

  .btn-primary:hover {
    background: #0046cc;
  }

  .btn-secondary {
    background: white;
    color: #475569;
    border: 1px solid #e2e8f0;
  }

  .btn-secondary:hover {
    background: #f8fafc;
  }

  /* Disponibilidad - Sección completa */
  .disponibilidad-section {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 14px 20px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    margin-bottom: 24px;
  }

  .disponibilidad-section .disp-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #475569;
    white-space: nowrap;
  }

  .disp-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    flex: 1;
  }

  .disp-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    color: #475569;
    transition: all 0.15s;
  }

  .disp-btn:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
    color: #0f172a;
  }

  .disp-btn svg {
    color: #0057FF;
  }

  /* Modal de Inventario */
  .inventario-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 1001;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    backdrop-filter: blur(4px);
  }

  .inventario-modal {
    background: white;
    border-radius: 16px;
    width: 100%;
    max-width: 900px;
    max-height: 80vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
  }

  .inventario-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid #e2e8f0;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  }

  .inventario-modal-header h3 {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1.1rem;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
  }

  .inventario-modal-header h3 svg {
    color: #7c3aed;
  }

  .close-modal-btn {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: none;
    background: #f1f5f9;
    color: #64748b;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .close-modal-btn:hover {
    background: #e2e8f0;
    color: #0f172a;
  }

  .inventario-loading,
  .inventario-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 24px;
    gap: 16px;
    color: #64748b;
  }

  .inventario-loading .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e2e8f0;
    border-top-color: #7c3aed;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .inventario-empty svg {
    color: #cbd5e1;
  }

  .inventario-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    padding: 20px 24px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
  }

  .inventario-stats .stat-card {
    padding: 16px;
    border-radius: 10px;
    text-align: center;
    background: white;
    border: 1px solid #e2e8f0;
  }

  .inventario-stats .stat-card.disponible {
    border-color: rgba(16, 185, 129, 0.3);
    background: rgba(16, 185, 129, 0.05);
  }

  .inventario-stats .stat-card.reservada {
    border-color: rgba(245, 158, 11, 0.3);
    background: rgba(245, 158, 11, 0.05);
  }

  .inventario-stats .stat-card.vendida {
    border-color: rgba(100, 116, 139, 0.3);
    background: rgba(100, 116, 139, 0.05);
  }

  .inventario-stats .stat-card.total {
    border-color: rgba(0, 87, 255, 0.3);
    background: rgba(0, 87, 255, 0.05);
  }

  .inventario-stats .stat-number {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    color: #0f172a;
  }

  .inventario-stats .stat-label {
    display: block;
    font-size: 0.75rem;
    color: #64748b;
    margin-top: 4px;
  }

  .inventario-table-container {
    flex: 1;
    overflow: auto;
    padding: 0;
  }

  .inventario-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  .inventario-table thead {
    position: sticky;
    top: 0;
    background: #f8fafc;
    z-index: 1;
  }

  .inventario-table th {
    padding: 14px 16px;
    text-align: left;
    font-weight: 600;
    color: #475569;
    border-bottom: 2px solid #e2e8f0;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .inventario-table td {
    padding: 14px 16px;
    border-bottom: 1px solid #f1f5f9;
    color: #0f172a;
  }

  .inventario-table tbody tr:hover {
    background: #f8fafc;
  }

  .inventario-table .codigo {
    font-weight: 600;
    color: #0057FF;
  }

  .inventario-table .precio {
    font-weight: 600;
  }

  .estado-badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .estado-badge.disponible {
    background: rgba(16, 185, 129, 0.12);
    color: #059669;
  }

  .estado-badge.reservada {
    background: rgba(245, 158, 11, 0.12);
    color: #d97706;
  }

  .estado-badge.vendida {
    background: rgba(100, 116, 139, 0.12);
    color: #475569;
  }

  .estado-badge.bloqueada {
    background: rgba(239, 68, 68, 0.12);
    color: #dc2626;
  }

  @media (max-width: 768px) {
    .inventario-stats {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  /* Documentos clickeables en sidebar */
  .doc-item-clickable {
    cursor: pointer;
    transition: all 0.15s ease;
    padding: 10px 8px !important;
    border-radius: 8px;
    margin: 0 -8px;
  }

  .doc-item-clickable:hover {
    background: #f1f5f9;
  }

  .doc-item-clickable:hover span {
    color: #0057FF;
  }

  .doc-external-icon {
    opacity: 0;
    transition: opacity 0.15s ease;
    color: #0057FF;
    margin-left: auto;
  }

  .doc-item-clickable:hover .doc-external-icon {
    opacity: 1;
  }

  /* Modal de Documentos */
  .documentos-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 1001;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    backdrop-filter: blur(4px);
  }

  .documentos-modal {
    background: white;
    border-radius: 16px;
    width: 100%;
    max-width: 600px;
    max-height: 80vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
  }

  .documentos-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid #e2e8f0;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  }

  .documentos-modal-header h3 {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1.1rem;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
  }

  .documentos-modal-header h3 svg {
    color: #0057FF;
  }

  .documentos-modal-content {
    flex: 1;
    overflow-y: auto;
    padding: 0;
  }

  .documentos-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 24px;
    gap: 16px;
    color: #64748b;
  }

  .documentos-empty svg {
    color: #cbd5e1;
  }

  .documentos-modal-lista {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .doc-modal-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px 24px;
    border-bottom: 1px solid #f1f5f9;
    transition: all 0.15s ease;
  }

  .doc-modal-item:last-child {
    border-bottom: none;
  }

  .doc-modal-item.clickable {
    cursor: pointer;
  }

  .doc-modal-item.clickable:hover {
    background: #f8fafc;
  }

  .doc-modal-item.clickable:hover .doc-nombre {
    color: #0057FF;
  }

  .doc-modal-item.disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .doc-modal-item > svg:first-child {
    color: #64748b;
    flex-shrink: 0;
  }

  .doc-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .doc-nombre {
    font-size: 0.95rem;
    font-weight: 500;
    color: #0f172a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color 0.15s ease;
  }

  .doc-tipo {
    font-size: 0.75rem;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .doc-fecha {
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .doc-action-icon {
    color: #0057FF;
    flex-shrink: 0;
    opacity: 0.5;
    transition: opacity 0.15s ease;
  }

  .doc-modal-item.clickable:hover .doc-action-icon {
    opacity: 1;
  }

  .doc-no-archivo {
    font-size: 0.75rem;
    color: #94a3b8;
    font-style: italic;
  }
`;
