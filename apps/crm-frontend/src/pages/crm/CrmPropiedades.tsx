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
  DollarSign,
  type LucideIcon,
} from 'lucide-react';
import './CrmPropiedades.css';

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
  const { tenantActual, puedeCrear, puedeEditar, puedeEliminar, loadingModulos, modulos, getPermisosCampos } = useAuth();
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

  // Configurar header de la página - depende de modulos para re-evaluar permisos
  const canCreate = !loadingModulos && puedeCrear('propiedades');

  useEffect(() => {
    // Solo configurar el header cuando los módulos estén cargados
    if (loadingModulos) return;

    setPageHeader({
      title: 'Propiedades',
      subtitle: 'Gestiona tu inventario de propiedades',
      actions: canCreate ? (
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
      ) : undefined,
    });
  }, [setPageHeader, canCreate, loadingModulos, navigate, tenantSlug]);

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
      <div className="propiedades-page">
        <div className="loading-container">
          <div className="crm-spinner crm-spinner-lg"></div>
          <p>Cargando propiedades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="propiedades-page">
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
        <div className="propiedades-empty-state">
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
          {/* Detectar si es usuario Connect (tiene captador en hide) */}
          {(() => {
            const isConnectUser = getPermisosCampos('propiedades')?.hide?.includes('captador_nombre');
            return propiedades.map((propiedad) => {
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
                  {/* Badge comisión Connect - prominente para usuarios Connect */}
                  {isConnectUser && (propiedad as any).connect_comision && (
                    <span className="badge-comision-connect">
                      <DollarSign size={12} /> {(propiedad as any).connect_comision}%
                    </span>
                  )}
                  {/* Badge destacada - pequeño y elegante */}
                  {propiedad.destacada && (
                    <span className="badge-destacada"><Star size={9} fill="currentColor" /></span>
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
                        <span className="feature"><Bed size={11} /> {propiedad.habitaciones}</span>
                      )}
                      {propiedad.banos != null && (
                        <span className="feature"><Bath size={11} /> {propiedad.banos}</span>
                      )}
                      {propiedad.estacionamientos != null && (
                        <span className="feature"><Car size={11} /> {propiedad.estacionamientos}</span>
                      )}
                      {propiedad.m2_construccion != null && (
                        <span className="feature"><Maximize size={11} /> {propiedad.m2_construccion.toLocaleString()}m²</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer compacto con captador y acciones */}
                <div className="card-footer">
                  {/* Captador avatar - oculto para usuarios Connect */}
                  {!isConnectUser && (propiedad.captador_nombre || propiedad.captador_apellido) ? (
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
                    {puedeEditar('propiedades') && (
                      <button
                        className="action-btn"
                        onClick={(e) => { e.stopPropagation(); navigate(`/crm/${tenantSlug}/propiedades/${propiedad.id}/editar`); }}
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    {puedeEliminar('propiedades') && (
                      <button
                        className="action-btn danger"
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(propiedad.id); }}
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          });
          })()}
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
                        {puedeEditar('propiedades') && (
                          <button
                            className="action-btn"
                            onClick={(e) => { e.stopPropagation(); navigate(`/crm/${tenantSlug}/propiedades/${propiedad.id}`); }}
                          >
                            <Pencil size={16} />
                          </button>
                        )}
                        {puedeEliminar('propiedades') && (
                          <button
                            className="action-btn danger"
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(propiedad.id); }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
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
        <div className="propiedades-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="propiedades-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Eliminar propiedad</h3>
            <p>¿Estás seguro de que deseas eliminar esta propiedad? Esta acción no se puede deshacer.</p>
            <div className="propiedades-modal-actions">
              <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>
                Cancelar
              </button>
              <button className="crm-btn crm-btn-danger" onClick={() => handleDelete(deleteConfirm)}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de crear/editar */}
      {showModal && (
        <div className="propiedades-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="propiedades-modal-content modal-form modal-large" onClick={(e) => e.stopPropagation()}>
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

              <div className="propiedades-modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="crm-btn crm-btn-primary" disabled={saving || !form.titulo.trim()}>
                  {saving ? 'Guardando...' : (editingPropiedad ? 'Guardar Cambios' : 'Crear Propiedad')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
