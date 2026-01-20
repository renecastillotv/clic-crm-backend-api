/**
 * CrmPropiedades - Gestión de propiedades inmobiliarias
 *
 * Módulo para gestionar el inventario de propiedades con:
 * - Grid de propiedades con imágenes
 * - Filtros avanzados
 * - Vista de lista alternativa
 * - Modal para crear/editar
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import {
  getPropiedadesCrm,
  createPropiedadCrm,
  updatePropiedadCrm,
  deletePropiedadCrm,
  getOperacionesCatalogo,
  getCategoriasPropiedadesCatalogo,
  Propiedad,
  PropiedadFiltros,
  type Operacion,
  type CategoriaPropiedad,
} from '../../services/api';
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  Home,
  Bed,
  Bath,
  Car,
  Maximize,
  Star,
  Trash2,
  Pencil,
  Building2,
  Castle,
  Building,
  Grid3x3,
  LandPlot,
  TreePine,
  Store,
  Briefcase,
  Factory,
  DoorOpen,
  Hotel,
  ParkingCircle,
  Download,
  type LucideIcon,
} from 'lucide-react';

// Mapa de iconos de Lucide para categorías de propiedades
const CategoryIcons: Record<string, LucideIcon> = {
  Home,
  Building2,
  Castle,
  Building,
  Grid3x3,
  LandPlot,
  TreePine,
  Store,
  Briefcase,
  Factory,
  DoorOpen,
  Hotel,
  ParkingCircle,
};

// Estados de propiedad - Colores del tema CRM Premium
const ESTADOS: Record<string, { label: string; color: string; bgColor: string }> = {
  disponible: { label: 'Disponible', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.12)' },
  reservada: { label: 'Reservada', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.12)' },
  vendida: { label: 'Vendida', color: '#64748B', bgColor: 'rgba(100, 116, 139, 0.12)' },
  rentada: { label: 'Rentada', color: '#64748B', bgColor: 'rgba(100, 116, 139, 0.12)' },
  inactiva: { label: 'Inactiva', color: '#94A3B8', bgColor: 'rgba(148, 163, 184, 0.12)' },
};

export default function CrmPropiedades() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const { tenantActual } = useAuth();
  const { setPageHeader } = usePageHeader();

  // Estado
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vista, setVista] = useState<'grid' | 'list'>('grid');
  const [busqueda, setBusqueda] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<string>('');
  const [operacionFiltro, setOperacionFiltro] = useState<string>('');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingPropiedad, setEditingPropiedad] = useState<Propiedad | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // Catálogos de la base de datos
  const [categoriasCatalogo, setCategoriasCatalogo] = useState<CategoriaPropiedad[]>([]);
  const [operacionesCatalogo, setOperacionesCatalogo] = useState<Operacion[]>([]);

  // Formulario
  const [form, setForm] = useState({
    titulo: '',
    codigo: '',
    descripcion: '',
    tipo: 'casa',
    operacion: 'venta',
    precio: '',
    moneda: 'USD',
    ciudad: '',
    provincia: '',
    sector: '',
    zona: '',
    direccion: '',
    habitaciones: '',
    banos: '',
    estacionamientos: '',
    m2_construccion: '',
    m2_terreno: '',
    imagen_principal: '',
    estado_propiedad: 'disponible',
    destacada: false,
    notas: '',
  });

  // Configurar header de la página
  useEffect(() => {
    setPageHeader({
      title: 'Propiedades',
      subtitle: 'Gestiona tu inventario de propiedades',
      actions: (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn-secondary"
            onClick={() => navigate(`/crm/${tenantSlug}/propiedades/importar`)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={16} />
            Importar
          </button>
          <button className="btn-primary" onClick={() => navigate(`/crm/${tenantSlug}/propiedades/nueva`)}>
            <Plus size={16} />
            Nueva Propiedad
          </button>
        </div>
      ),
    });
  }, [setPageHeader]);

  // Ref para trackear el tenant actual y evitar race conditions
  const currentTenantRef = useRef<string | null>(null);

  // Limpiar propiedades cuando cambia el tenant
  useEffect(() => {
    if (tenantActual?.id !== currentTenantRef.current) {
      // Limpiar datos del tenant anterior inmediatamente
      setPropiedades([]);
      setTotal(0);
      setError(null);
      currentTenantRef.current = tenantActual?.id || null;
    }
  }, [tenantActual?.id]);

  // Cargar propiedades con manejo de cancelación
  useEffect(() => {
    let isCancelled = false;

    async function cargarPropiedades() {
      if (!tenantActual?.id) return;

      try {
        setLoading(true);
        setError(null);

        const filtros: PropiedadFiltros = {
          busqueda: busqueda || undefined,
          tipo: tipoFiltro || undefined,
          operacion: operacionFiltro || undefined,
          estado_propiedad: estadoFiltro || undefined,
          page,
          limit: 24,
        };

        const response = await getPropiedadesCrm(tenantActual.id, filtros);

        // Solo actualizar si no fue cancelado
        if (!isCancelled) {
          setPropiedades(response.data);
          setTotal(response.total);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Error cargando propiedades:', err);
          setError(err.message);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    cargarPropiedades();

    return () => {
      isCancelled = true;
    };
  }, [tenantActual?.id, busqueda, tipoFiltro, operacionFiltro, estadoFiltro, page]);

  // Función para recargar propiedades (usada después de crear/editar/eliminar)
  const recargarPropiedades = useCallback(async () => {
    if (!tenantActual?.id) return;

    try {
      setLoading(true);
      const filtros: PropiedadFiltros = {
        busqueda: busqueda || undefined,
        tipo: tipoFiltro || undefined,
        operacion: operacionFiltro || undefined,
        estado_propiedad: estadoFiltro || undefined,
        page,
        limit: 24,
      };
      const response = await getPropiedadesCrm(tenantActual.id, filtros);
      setPropiedades(response.data);
      setTotal(response.total);
    } catch (err: any) {
      console.error('Error cargando propiedades:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantActual?.id, busqueda, tipoFiltro, operacionFiltro, estadoFiltro, page]);

  // Cargar catálogos de operaciones y categorías
  useEffect(() => {
    async function cargarCatalogos() {
      try {
        const [operaciones, categorias] = await Promise.all([
          getOperacionesCatalogo(true),
          getCategoriasPropiedadesCatalogo(true)
        ]);
        setOperacionesCatalogo(operaciones);
        setCategoriasCatalogo(categorias);
      } catch (err) {
        console.error('Error cargando catálogos:', err);
      }
    }
    cargarCatalogos();
  }, []);

  // Helper para renderizar iconos de Lucide desde el nombre guardado en BD
  const renderCategoryIcon = (iconName: string | undefined, size: number = 14) => {
    const IconComponent = iconName ? CategoryIcons[iconName] : Home;
    const FinalIcon = IconComponent || Home;
    return <FinalIcon size={size} />;
  };

  // Helper para obtener datos del tipo de propiedad desde el catálogo
  const getTipoPropiedad = (slug: string) => {
    const categoria = categoriasCatalogo.find(c => c.slug === slug);
    return categoria
      ? { label: categoria.nombre, iconName: categoria.icono }
      : { label: slug, iconName: 'Home' };
  };

  // Helper para obtener datos de la operación desde el catálogo
  const getOperacion = (slug: string) => {
    const operacion = operacionesCatalogo.find(o => o.slug === slug);
    return operacion
      ? { label: operacion.nombre, color: operacion.color || '#10B981', bgColor: `${operacion.color}20` }
      : { label: slug, color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.12)' };
  };

  // Navegar a página de edición
  const openModal = (propiedad?: Propiedad) => {
    if (propiedad) {
      navigate(`/crm/${tenantSlug}/propiedades/${propiedad.id}`);
    } else {
      navigate(`/crm/${tenantSlug}/propiedades/nueva`);
    }
  };

  // DEPRECATED: Mantener función para compatibilidad pero redirige a página
  const openModalOld = (propiedad?: Propiedad) => {
    if (propiedad) {
      setEditingPropiedad(propiedad);
      setForm({
        titulo: propiedad.titulo,
        codigo: propiedad.codigo || '',
        descripcion: propiedad.descripcion || '',
        tipo: propiedad.tipo,
        operacion: propiedad.operacion,
        precio: propiedad.precio?.toString() || '',
        moneda: propiedad.moneda || 'USD',
        ciudad: propiedad.ciudad || '',
        provincia: propiedad.provincia || '',
        sector: propiedad.sector || '',
        zona: propiedad.zona || '',
        direccion: propiedad.direccion || '',
        habitaciones: propiedad.habitaciones?.toString() || '',
        banos: propiedad.banos?.toString() || '',
        estacionamientos: propiedad.estacionamientos?.toString() || '',
        m2_construccion: propiedad.m2_construccion?.toString() || '',
        m2_terreno: propiedad.m2_terreno?.toString() || '',
        imagen_principal: propiedad.imagen_principal || '',
        estado_propiedad: propiedad.estado_propiedad,
        destacada: propiedad.destacada,
        notas: propiedad.notas || '',
      });
    } else {
      setEditingPropiedad(null);
      setForm({
        titulo: '',
        codigo: '',
        descripcion: '',
        tipo: 'casa',
        operacion: 'venta',
        precio: '',
        moneda: 'USD',
        ciudad: '',
        provincia: '',
        sector: '',
        zona: '',
        direccion: '',
        habitaciones: '',
        banos: '',
        estacionamientos: '',
        m2_construccion: '',
        m2_terreno: '',
        imagen_principal: '',
        estado_propiedad: 'disponible',
        destacada: false,
        notas: '',
      });
    }
    setShowModal(true);
  };

  // Guardar propiedad
  const handleSave = async () => {
    if (!tenantActual?.id || !form.titulo.trim()) return;

    try {
      setSaving(true);
      const data = {
        titulo: form.titulo,
        codigo: form.codigo || undefined,
        descripcion: form.descripcion || undefined,
        tipo: form.tipo,
        operacion: form.operacion,
        precio: form.precio ? parseFloat(form.precio) : undefined,
        moneda: form.moneda,
        ciudad: form.ciudad || undefined,
        provincia: form.provincia || undefined,
        sector: form.sector || undefined,
        zona: form.zona || undefined,
        direccion: form.direccion || undefined,
        habitaciones: form.habitaciones ? parseInt(form.habitaciones) : undefined,
        banos: form.banos ? parseInt(form.banos) : undefined,
        estacionamientos: form.estacionamientos ? parseInt(form.estacionamientos) : undefined,
        m2_construccion: form.m2_construccion ? parseFloat(form.m2_construccion) : undefined,
        m2_terreno: form.m2_terreno ? parseFloat(form.m2_terreno) : undefined,
        imagen_principal: form.imagen_principal || undefined,
        estado_propiedad: form.estado_propiedad,
        destacada: form.destacada,
        notas: form.notas || undefined,
      };

      if (editingPropiedad) {
        await updatePropiedadCrm(tenantActual.id, editingPropiedad.id, data);
      } else {
        await createPropiedadCrm(tenantActual.id, data);
      }
      setShowModal(false);
      setEditingPropiedad(null);
      recargarPropiedades();
    } catch (err: any) {
      console.error('Error al guardar propiedad:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Eliminar propiedad
  const handleDelete = async (propiedadId: string) => {
    if (!tenantActual?.id) return;

    try {
      await deletePropiedadCrm(tenantActual.id, propiedadId);
      setPropiedades(prev => prev.filter(p => p.id !== propiedadId));
      setDeleteConfirm(null);
    } catch (err: any) {
      console.error('Error al eliminar propiedad:', err);
      setError(err.message);
    }
  };

  // Formatear moneda
  const formatMoney = (value: number | undefined, moneda: string = 'USD') => {
    if (!value) return '-';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: moneda,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading && propiedades.length === 0) {
    return (
      <div className="page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando propiedades...</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Barra de filtros */}
      <div className="filters-bar">
        <div className="search-box">
          <span className="search-icon"><Search size={18} /></span>
          <input
            type="text"
            placeholder="Buscar propiedades..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="filters-right">
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            className="filter-select"
          >
            <option value="">Todos los tipos</option>
            {categoriasCatalogo.map((cat) => (
              <option key={cat.id} value={cat.slug}>{cat.nombre}</option>
            ))}
          </select>

          <select
            value={operacionFiltro}
            onChange={(e) => setOperacionFiltro(e.target.value)}
            className="filter-select"
          >
            <option value="">Todas las operaciones</option>
            {operacionesCatalogo.map((op) => (
              <option key={op.id} value={op.slug}>{op.nombre}</option>
            ))}
          </select>

          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="filter-select"
          >
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>

          <div className="view-toggle">
            <button
              className={`toggle-btn ${vista === 'grid' ? 'active' : ''}`}
              onClick={() => setVista('grid')}
              title="Vista grid"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              className={`toggle-btn ${vista === 'list' ? 'active' : ''}`}
              onClick={() => setVista('list')}
              title="Vista lista"
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Contador */}
      <div className="results-count">
        {total} propiedad{total !== 1 ? 'es' : ''} encontrada{total !== 1 ? 's' : ''}
      </div>

      {/* Lista/Grid de propiedades */}
      {propiedades.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Home size={48} /></div>
          <h3>No hay propiedades</h3>
          <p>
            {busqueda || tipoFiltro || operacionFiltro || estadoFiltro
              ? 'No se encontraron propiedades con los filtros aplicados'
              : 'Agrega tu primera propiedad para comenzar'}
          </p>
        </div>
      ) : vista === 'grid' ? (
        <div className="propiedades-grid">
          {propiedades.map((propiedad) => {
            const estado = ESTADOS[propiedad.estado_propiedad] || ESTADOS.disponible;
            const tipo = getTipoPropiedad(propiedad.tipo);
            // Mostrar estado solo si no es 'disponible' y no coincide con el filtro actual
            const mostrarEstado = propiedad.estado_propiedad !== 'disponible' &&
                                  propiedad.estado_propiedad !== estadoFiltro;
            return (
              <div
                key={propiedad.id}
                className="propiedad-card"
                onClick={() => navigate(`/crm/${tenantSlug}/propiedades/${propiedad.id}`)}
              >
                <div className="card-image">
                  {propiedad.imagen_principal ? (
                    <img src={propiedad.imagen_principal} alt={propiedad.titulo} />
                  ) : (
                    <div className="image-placeholder">
                      <Home size={48} />
                    </div>
                  )}
                  {/* Badge destacada - sutil, escala de grises */}
                  {propiedad.destacada && (
                    <span className="badge-destacada">Destacada</span>
                  )}
                  {/* Badge estado - solo si no es disponible y no coincide con filtro */}
                  {mostrarEstado && (
                    <span
                      className="badge-estado"
                      style={{ color: estado.color, backgroundColor: estado.bgColor }}
                    >
                      {estado.label}
                    </span>
                  )}
                </div>

                <div className="card-body">
                  {/* Fila 1: Tipo + Código */}
                  <div className="card-top-row">
                    <span className="tipo-badge">{renderCategoryIcon(tipo.iconName, 14)} {tipo.label}</span>
                    {(propiedad as any).codigo_publico && (
                      <span className="codigo-ref">#{(propiedad as any).codigo_publico}</span>
                    )}
                  </div>

                  {/* Fila 2: Título */}
                  <h3 className="card-title">{propiedad.titulo}</h3>

                  {/* Fila 3: Ubicación */}
                  <div className="card-location">
                    {[propiedad.sector, propiedad.ciudad].filter(Boolean).join(', ') || 'Sin ubicación'}
                  </div>

                  {/* Fila 4: Precio + Features en línea */}
                  <div className="card-price-features">
                    <div className="card-price">
                      {propiedad.precio_venta && propiedad.precio_alquiler ? (
                        <>
                          <span>{formatMoney(propiedad.precio_venta, propiedad.moneda)}</span>
                          <span className="price-divider">|</span>
                          <span className="price-rent">
                            {formatMoney(propiedad.precio_alquiler, propiedad.moneda)}<span className="price-suffix">/mes</span>
                          </span>
                        </>
                      ) : (
                        <>
                          {formatMoney(propiedad.precio_venta || propiedad.precio_alquiler || propiedad.precio, propiedad.moneda)}
                          {(propiedad.operacion === 'renta' || (!propiedad.precio_venta && propiedad.precio_alquiler)) && (
                            <span className="price-suffix">/mes</span>
                          )}
                        </>
                      )}
                    </div>
                    <div className="card-features">
                      {propiedad.habitaciones != null && (
                        <span className="feature"><Bed size={13} /> {propiedad.habitaciones}</span>
                      )}
                      {propiedad.banos != null && (
                        <span className="feature"><Bath size={13} /> {propiedad.banos}</span>
                      )}
                      {propiedad.estacionamientos != null && (
                        <span className="feature"><Car size={13} /> {propiedad.estacionamientos}</span>
                      )}
                      {propiedad.m2_construccion != null && (
                        <span className="feature"><Maximize size={13} /> {propiedad.m2_construccion.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer compacto con captador y acciones */}
                <div className="card-footer">
                  {(propiedad.captador_nombre || propiedad.captador_apellido) ? (
                    <div
                      className="captador-avatar"
                      title={`${propiedad.captador_nombre || ''} ${propiedad.captador_apellido || ''}`.trim()}
                    >
                      {propiedad.captador_avatar ? (
                        <img src={propiedad.captador_avatar} alt="" />
                      ) : (
                        <span>
                          {(propiedad.captador_nombre?.[0] || '').toUpperCase()}
                          {(propiedad.captador_apellido?.[0] || '').toUpperCase()}
                        </span>
                      )}
                    </div>
                  ) : <div />}
                  <div className="card-actions">
                    <button
                      className="action-btn"
                      onClick={(e) => { e.stopPropagation(); navigate(`/crm/${tenantSlug}/propiedades/${propiedad.id}/editar`); }}
                      title="Editar"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="action-btn danger"
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(propiedad.id); }}
                      title="Eliminar"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="propiedades-list">
          <table>
            <thead>
              <tr>
                <th>Propiedad</th>
                <th>Tipo</th>
                <th>Precio</th>
                <th>Ubicación</th>
                <th>Captador</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {propiedades.map((propiedad) => {
                const estado = ESTADOS[propiedad.estado_propiedad] || ESTADOS.disponible;
                const tipo = getTipoPropiedad(propiedad.tipo);
                const mostrarEstado = propiedad.estado_propiedad !== 'disponible' &&
                                      propiedad.estado_propiedad !== estadoFiltro;
                return (
                  <tr key={propiedad.id} onClick={() => navigate(`/crm/${tenantSlug}/propiedades/${propiedad.id}`)}>
                    <td>
                      <div className="list-propiedad">
                        <div className="list-image">
                          {propiedad.imagen_principal ? (
                            <img src={propiedad.imagen_principal} alt="" />
                          ) : (
                            <div className="img-placeholder"><Home size={24} /></div>
                          )}
                        </div>
                        <div>
                          <div className="list-title">
                            {propiedad.destacada && <span className="destacada-dot" title="Destacada" />}
                            {propiedad.titulo}
                            {mostrarEstado && (
                              <span
                                className="estado-inline"
                                style={{ color: estado.color, backgroundColor: estado.bgColor }}
                              >
                                {estado.label}
                              </span>
                            )}
                          </div>
                          {(propiedad as any).codigo_publico && (
                            <span className="list-codigo">#{(propiedad as any).codigo_publico}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td><span className="tipo-cell">{renderCategoryIcon(tipo.iconName, 14)} {tipo.label}</span></td>
                    <td className="price-cell">
                      {propiedad.precio_venta && propiedad.precio_alquiler ? (
                        <>
                          <div>{formatMoney(propiedad.precio_venta, propiedad.moneda)}</div>
                          <div className="price-secondary-sm">
                            {formatMoney(propiedad.precio_alquiler, propiedad.moneda)}<span className="price-suffix-sm">/mes</span>
                          </div>
                        </>
                      ) : (
                        <>
                          {formatMoney(propiedad.precio_venta || propiedad.precio_alquiler || propiedad.precio, propiedad.moneda)}
                          {(propiedad.operacion === 'renta' || (!propiedad.precio_venta && propiedad.precio_alquiler)) && (
                            <span className="price-suffix-sm">/mes</span>
                          )}
                        </>
                      )}
                    </td>
                    <td className="location-cell">{[propiedad.sector, propiedad.ciudad].filter(Boolean).join(', ') || '-'}</td>
                    <td>
                      {(propiedad.captador_nombre || propiedad.captador_apellido) ? (
                        <div className="captador-cell">
                          <div className="captador-avatar-sm">
                            {propiedad.captador_avatar ? (
                              <img src={propiedad.captador_avatar} alt="" />
                            ) : (
                              <span>
                                {(propiedad.captador_nombre?.[0] || '').toUpperCase()}
                                {(propiedad.captador_apellido?.[0] || '').toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="no-captador">-</span>
                      )}
                    </td>
                    <td>
                      <div className="list-actions">
                        <button
                          className="action-btn"
                          onClick={(e) => { e.stopPropagation(); navigate(`/crm/${tenantSlug}/propiedades/${propiedad.id}`); }}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="action-btn danger"
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(propiedad.id); }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {total > 24 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Anterior
          </button>
          <div className="pagination-center">
            <span className="pagination-range">
              {((page - 1) * 24) + 1}-{Math.min(page * 24, total)} de {total}
            </span>
            <span className="pagination-pages">
              Página {page} de {Math.ceil(total / 24)}
            </span>
          </div>
          <button
            className="pagination-btn"
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / 24)}
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Eliminar propiedad</h3>
            <p>¿Estás seguro de que deseas eliminar esta propiedad? Esta acción no se puede deshacer.</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>
                Cancelar
              </button>
              <button className="btn-danger" onClick={() => handleDelete(deleteConfirm)}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de crear/editar */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-form modal-large" onClick={(e) => e.stopPropagation()}>
            <h3>{editingPropiedad ? 'Editar Propiedad' : 'Nueva Propiedad'}</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label htmlFor="titulo">Título *</label>
                  <input
                    id="titulo"
                    type="text"
                    value={form.titulo}
                    onChange={(e) => setForm(prev => ({ ...prev, titulo: e.target.value }))}
                    placeholder="Ej: Casa en venta en Zona Norte"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="codigo">Código de referencia</label>
                  <input
                    id="codigo"
                    type="text"
                    value={form.codigo}
                    onChange={(e) => setForm(prev => ({ ...prev, codigo: e.target.value }))}
                    placeholder="Ej: PROP-001"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="tipo">Tipo de propiedad *</label>
                  <select
                    id="tipo"
                    value={form.tipo}
                    onChange={(e) => setForm(prev => ({ ...prev, tipo: e.target.value }))}
                  >
                    {categoriasCatalogo.map((cat) => (
                      <option key={cat.id} value={cat.slug}>{cat.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="operacion">Operación *</label>
                  <select
                    id="operacion"
                    value={form.operacion}
                    onChange={(e) => setForm(prev => ({ ...prev, operacion: e.target.value }))}
                  >
                    {operacionesCatalogo.map((op) => (
                      <option key={op.id} value={op.slug}>{op.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="estado_propiedad">Estado</label>
                  <select
                    id="estado_propiedad"
                    value={form.estado_propiedad}
                    onChange={(e) => setForm(prev => ({ ...prev, estado_propiedad: e.target.value }))}
                  >
                    {Object.entries(ESTADOS).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="precio">Precio</label>
                  <input
                    id="precio"
                    type="number"
                    value={form.precio}
                    onChange={(e) => setForm(prev => ({ ...prev, precio: e.target.value }))}
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="moneda">Moneda</label>
                  <select
                    id="moneda"
                    value={form.moneda}
                    onChange={(e) => setForm(prev => ({ ...prev, moneda: e.target.value }))}
                  >
                    <option value="USD">USD</option>
                    <option value="MXN">MXN</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="provincia">Provincia/Estado</label>
                  <input
                    id="provincia"
                    type="text"
                    value={form.provincia}
                    onChange={(e) => setForm(prev => ({ ...prev, provincia: e.target.value }))}
                    placeholder="Ej: Santo Domingo"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="ciudad">Ciudad</label>
                  <input
                    id="ciudad"
                    type="text"
                    value={form.ciudad}
                    onChange={(e) => setForm(prev => ({ ...prev, ciudad: e.target.value }))}
                    placeholder="Ej: Santo Domingo Este"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="sector">Sector</label>
                  <input
                    id="sector"
                    type="text"
                    value={form.sector}
                    onChange={(e) => setForm(prev => ({ ...prev, sector: e.target.value }))}
                    placeholder="Ej: Naco"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="zona">Zona</label>
                  <input
                    id="zona"
                    type="text"
                    value={form.zona}
                    onChange={(e) => setForm(prev => ({ ...prev, zona: e.target.value }))}
                    placeholder="Ej: Zona Colonial"
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="direccion">Dirección completa</label>
                  <input
                    id="direccion"
                    type="text"
                    value={form.direccion}
                    onChange={(e) => setForm(prev => ({ ...prev, direccion: e.target.value }))}
                    placeholder="Ej: Calle 26 de Enero esquina..."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="habitaciones">Habitaciones</label>
                  <input
                    id="habitaciones"
                    type="number"
                    value={form.habitaciones}
                    onChange={(e) => setForm(prev => ({ ...prev, habitaciones: e.target.value }))}
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="banos">Baños</label>
                  <input
                    id="banos"
                    type="number"
                    value={form.banos}
                    onChange={(e) => setForm(prev => ({ ...prev, banos: e.target.value }))}
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="estacionamientos">Estacionamientos</label>
                  <input
                    id="estacionamientos"
                    type="number"
                    value={form.estacionamientos}
                    onChange={(e) => setForm(prev => ({ ...prev, estacionamientos: e.target.value }))}
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="m2_construccion">m² Construcción</label>
                  <input
                    id="m2_construccion"
                    type="number"
                    value={form.m2_construccion}
                    onChange={(e) => setForm(prev => ({ ...prev, m2_construccion: e.target.value }))}
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="m2_terreno">m² Terreno</label>
                  <input
                    id="m2_terreno"
                    type="number"
                    value={form.m2_terreno}
                    onChange={(e) => setForm(prev => ({ ...prev, m2_terreno: e.target.value }))}
                    min="0"
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="imagen_principal">URL de imagen principal</label>
                  <input
                    id="imagen_principal"
                    type="url"
                    value={form.imagen_principal}
                    onChange={(e) => setForm(prev => ({ ...prev, imagen_principal: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="descripcion">Descripción</label>
                  <textarea
                    id="descripcion"
                    value={form.descripcion}
                    onChange={(e) => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
                    placeholder="Describe la propiedad..."
                    rows={3}
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="notas">Notas internas</label>
                  <textarea
                    id="notas"
                    value={form.notas}
                    onChange={(e) => setForm(prev => ({ ...prev, notas: e.target.value }))}
                    placeholder="Notas para uso interno..."
                    rows={2}
                  />
                </div>

                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={form.destacada}
                      onChange={(e) => setForm(prev => ({ ...prev, destacada: e.target.checked }))}
                    />
                    Marcar como destacada
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving || !form.titulo.trim()}>
                  {saving ? 'Guardando...' : (editingPropiedad ? 'Guardar Cambios' : 'Crear Propiedad')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .page {
    width: 100%;
  }

  /* Loading */
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px;
    color: #64748b;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e2e8f0;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Filters Bar */
  .filters-bar {
    display: flex;
    gap: 16px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .search-box {
    flex: 1;
    min-width: 280px;
    position: relative;
  }

  .search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
  }

  .search-box input {
    width: 100%;
    padding: 12px 16px 12px 44px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: 0.9rem;
    background: white;
    transition: all 0.2s;
  }

  .search-box input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .filters-right {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .filter-select {
    padding: 10px 16px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: 0.9rem;
    background: white;
    cursor: pointer;
    min-width: 150px;
  }

  .view-toggle {
    display: flex;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    overflow: hidden;
  }

  .toggle-btn {
    padding: 10px 14px;
    background: white;
    border: none;
    cursor: pointer;
    color: #64748b;
    transition: all 0.15s;
  }

  .toggle-btn:first-child {
    border-right: 1px solid #e2e8f0;
  }

  .toggle-btn:hover {
    background: #f8fafc;
  }

  .toggle-btn.active {
    background: #2563eb;
    color: white;
  }

  /* Results count */
  .results-count {
    margin-bottom: 16px;
    font-size: 0.875rem;
    color: #64748b;
  }

  /* Error Banner */
  .error-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fef2f2;
    border: 1px solid #fecaca;
    padding: 12px 16px;
    border-radius: 10px;
    margin-bottom: 20px;
    color: #dc2626;
  }

  .error-banner button {
    background: none;
    border: none;
    color: #dc2626;
    font-size: 1.25rem;
    cursor: pointer;
  }

  /* Propiedades Grid */
  .propiedades-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 16px;
  }

  .propiedad-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    overflow: hidden;
    transition: all 0.2s;
    cursor: pointer;
  }

  .propiedad-card:hover {
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  .card-image {
    position: relative;
    height: 150px;
    background: #f1f5f9;
  }

  .card-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .image-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
  }

  .image-placeholder svg {
    width: 48px;
    height: 48px;
  }

  .badge-destacada {
    position: absolute;
    top: 12px;
    left: 12px;
    background: rgba(255, 255, 255, 0.95);
    color: #374151;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 500;
    letter-spacing: 0.02em;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .badge-estado {
    position: absolute;
    top: 12px;
    right: 12px;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 500;
  }

  .card-body {
    padding: 10px 12px;
  }

  .card-top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .codigo-ref {
    font-size: 0.7rem;
    color: #94a3b8;
    font-weight: 500;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .tipo-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
    color: #64748b;
    background: #f8fafc;
    padding: 4px 10px;
    border-radius: 6px;
  }

  .tipo-badge svg {
    flex-shrink: 0;
    color: #3b82f6;
  }

  .tipo-cell {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .tipo-cell svg {
    flex-shrink: 0;
    color: #3b82f6;
  }

  .estado-badge {
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .card-title {
    margin: 0 0 2px 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: #0f172a;
    line-height: 1.25;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-codigos {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .card-codigo-publico {
    font-size: 0.8rem;
    font-weight: 600;
    color: #3b82f6;
    background: #eff6ff;
    padding: 2px 8px;
    border-radius: 4px;
  }

  .card-codigo {
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .card-nombre-privado {
    display: block;
    font-size: 0.8rem;
    color: #64748b;
    font-style: italic;
    margin-top: 2px;
    margin-bottom: 2px;
  }

  .card-price-features {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
  }

  .card-price {
    font-size: 1rem;
    font-weight: 700;
    color: #16a34a;
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 4px;
  }

  .price-divider {
    color: #cbd5e1;
    font-weight: 400;
    margin: 0 2px;
  }

  .price-rent {
    font-size: 0.85rem;
    font-weight: 600;
    color: #0ea5e9;
  }

  .price-suffix {
    font-size: 0.7rem;
    font-weight: 500;
    color: #64748b;
    margin-left: 2px;
  }

  .price-suffix-sm {
    font-size: 0.7rem;
    font-weight: 400;
    color: #64748b;
    margin-left: 2px;
  }

  .card-location {
    font-size: 0.8rem;
    color: #64748b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .card-features {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  .feature {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 0.75rem;
    color: #64748b;
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-top: 1px solid #f1f5f9;
  }

  .card-actions {
    display: flex;
    gap: 8px;
    margin-left: auto;
  }

  .captador-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    flex-shrink: 0;
  }

  .captador-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .captador-avatar span {
    font-size: 0.65rem;
    font-weight: 600;
    color: #64748b;
    letter-spacing: -0.5px;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: #f8fafc;
    border-radius: 6px;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s;
  }

  .action-btn:hover {
    background: #e2e8f0;
    color: #0f172a;
  }

  .action-btn.danger:hover {
    background: #fef2f2;
    color: #dc2626;
  }

  /* Propiedades List */
  .propiedades-list {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    overflow: hidden;
  }

  .propiedades-list table {
    width: 100%;
    border-collapse: collapse;
  }

  .propiedades-list th,
  .propiedades-list td {
    padding: 14px 16px;
    text-align: left;
    border-bottom: 1px solid #f1f5f9;
  }

  .propiedades-list th {
    background: #f8fafc;
    font-weight: 600;
    font-size: 0.85rem;
    color: #64748b;
  }

  .propiedades-list tr {
    cursor: pointer;
    transition: background 0.15s;
  }

  .propiedades-list tbody tr:hover {
    background: #f8fafc;
  }

  .list-propiedad {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .list-image {
    width: 60px;
    height: 45px;
    border-radius: 6px;
    overflow: hidden;
    background: #f1f5f9;
    flex-shrink: 0;
  }

  .list-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .img-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
  }

  .img-placeholder svg {
    width: 24px;
    height: 24px;
  }

  .list-title {
    font-weight: 500;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .destacada-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #94a3b8;
    flex-shrink: 0;
  }

  .estado-inline {
    font-size: 0.65rem;
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: 500;
    margin-left: 4px;
  }

  .star-icon {
    color: #fbbf24;
  }

  .list-codigos {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 2px;
  }

  .list-codigo-publico {
    font-size: 0.75rem;
    font-weight: 600;
    color: #3b82f6;
    background: #eff6ff;
    padding: 1px 6px;
    border-radius: 3px;
  }

  .list-codigo {
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .list-nombre-privado {
    display: block;
    font-size: 0.75rem;
    color: #64748b;
    font-style: italic;
  }

  .captador-cell {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .captador-avatar-sm {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    flex-shrink: 0;
  }

  .captador-avatar-sm img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .captador-avatar-sm span {
    font-size: 0.55rem;
    font-weight: 600;
    color: #64748b;
    letter-spacing: -0.5px;
  }

  .captador-name {
    font-size: 0.8rem;
    color: #64748b;
    white-space: nowrap;
  }

  .no-captador {
    color: #94a3b8;
  }

  .price-cell {
    font-weight: 600;
    color: #16a34a;
  }

  .estado-badge-sm {
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .list-actions {
    display: flex;
    gap: 6px;
  }

  /* Paginación */
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-top: 24px;
    padding: 16px 24px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
  }

  .pagination-btn {
    padding: 10px 18px;
    background: #2563eb;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    color: white;
    cursor: pointer;
    transition: all 0.15s;
  }

  .pagination-btn:hover:not(:disabled) {
    background: #1d4ed8;
  }

  .pagination-btn:disabled {
    background: #e2e8f0;
    color: #94a3b8;
    cursor: not-allowed;
  }

  .pagination-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-width: 140px;
  }

  .pagination-range {
    font-size: 0.95rem;
    font-weight: 600;
    color: #0f172a;
  }

  .pagination-pages {
    font-size: 0.75rem;
    color: #64748b;
  }

  /* Empty state */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 24px;
    background: white;
    border: 1px dashed #e2e8f0;
    border-radius: 12px;
    text-align: center;
  }

  .empty-icon {
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f1f5f9;
    border-radius: 50%;
    color: #94a3b8;
    margin-bottom: 20px;
  }

  .empty-state h3 {
    margin: 0 0 8px 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #0f172a;
  }

  .empty-state p {
    margin: 0;
    color: #64748b;
    font-size: 0.9rem;
    max-width: 300px;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }

  .modal-content {
    background: white;
    border-radius: 16px;
    padding: 24px;
    max-width: 400px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-large {
    max-width: 700px;
  }

  .modal-content h3 {
    margin: 0 0 20px 0;
    font-size: 1.125rem;
    color: #0f172a;
  }

  .modal-content p {
    margin: 0 0 24px 0;
    color: #64748b;
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 20px;
  }

  .btn-cancel {
    padding: 10px 20px;
    background: #f1f5f9;
    border: none;
    border-radius: 8px;
    font-size: 0.9rem;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-cancel:hover {
    background: #e2e8f0;
  }

  .btn-danger {
    padding: 10px 20px;
    background: #dc2626;
    border: none;
    border-radius: 8px;
    font-size: 0.9rem;
    color: white;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-danger:hover {
    background: #b91c1c;
  }

  .btn-primary {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-primary:hover {
    background: #1d4ed8;
  }

  .btn-primary:disabled {
    background: #94a3b8;
    cursor: not-allowed;
  }

  /* Form */
  .modal-form {
    max-width: 700px;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
  }

  .form-group.full-width {
    grid-column: span 2;
  }

  .form-group label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 6px;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    padding: 10px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .form-group textarea {
    resize: vertical;
    min-height: 80px;
  }

  .checkbox-group label {
    flex-direction: row;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .checkbox-group input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }

  @media (max-width: 600px) {
    .form-grid {
      grid-template-columns: 1fr;
    }

    .form-group.full-width {
      grid-column: span 1;
    }

    .propiedades-grid {
      grid-template-columns: 1fr;
    }

    .filters-right {
      width: 100%;
    }

    .filter-select {
      flex: 1;
    }
  }
`;
