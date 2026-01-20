/**
 * CrmAmenidadesConfig - Página de configuración de amenidades personalizadas
 *
 * Permite al administrador/dueño del tenant:
 * - Ver todas las amenidades personalizadas (activas e inactivas)
 * - Aprobar/desaprobar amenidades (activar/desactivar)
 * - Editar nombre, icono, categoría y traducciones
 * - Eliminar amenidades
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import { useIdiomas } from '../../services/idiomas';
import {
  getAmenidadesTenant,
  createAmenidadTenant,
  updateAmenidadTenant,
  deleteAmenidadTenant,
  getCategoriasAmenidades,
  type Amenidad,
} from '../../services/api';
import {
  Check,
  X,
  Edit2,
  Trash2,
  Search,
  Filter,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
} from 'lucide-react';

// Traducciones de categorías
const CATEGORIAS_LABELS: Record<string, string> = {
  'recreacion': 'Recreación',
  'seguridad': 'Seguridad',
  'servicios': 'Servicios',
  'comodidades': 'Comodidades',
  'tecnologia': 'Tecnología',
  'accesibilidad': 'Accesibilidad',
  'vistas': 'Vistas',
  'playa': 'Playa',
  'negocios': 'Negocios',
  'sostenibilidad': 'Sostenibilidad',
  'extras': 'Extras',
  'personalizada': 'Personalizada',
  'personalizadas': 'Sin Categoría',
};

// Iconos disponibles
const ICONOS_DISPONIBLES = [
  { value: '🏊', label: 'Piscina' },
  { value: '💪', label: 'Gimnasio' },
  { value: '🔒', label: 'Seguridad' },
  { value: '🚗', label: 'Estacionamiento' },
  { value: '🛗', label: 'Ascensor' },
  { value: '🌳', label: 'Jardín' },
  { value: '🏖️', label: 'Terraza' },
  { value: '🔥', label: 'BBQ' },
  { value: '🏀', label: 'Cancha' },
  { value: '🎮', label: 'Playground' },
  { value: '💆', label: 'Spa' },
  { value: '🧖', label: 'Sauna' },
  { value: '🛁', label: 'Jacuzzi' },
  { value: '❄️', label: 'Aire Acondicionado' },
  { value: '🍳', label: 'Cocina' },
  { value: '👔', label: 'Closets' },
  { value: '🚨', label: 'Alarmas' },
  { value: '📺', label: 'TV' },
  { value: '📶', label: 'WiFi' },
  { value: '🏋️', label: 'Gym' },
  { value: '🏃', label: 'Running Track' },
  { value: '🎯', label: 'Otro' },
];

interface EditModalProps {
  amenidad: Amenidad;
  categorias: string[];
  idiomas: { code: string; labelNativo: string; flagEmoji: string }[];
  onSave: (data: { nombre?: string; icono?: string; categoria?: string; traducciones?: Record<string, string> }) => void;
  onClose: () => void;
}

function EditModal({ amenidad, categorias, idiomas, onSave, onClose }: EditModalProps) {
  const [nombre, setNombre] = useState(amenidad.nombre);
  const [icono, setIcono] = useState(amenidad.icono || '🎯');
  const [categoria, setCategoria] = useState(amenidad.categoria || 'personalizadas');
  const [traducciones, setTraducciones] = useState<Record<string, string>>(
    amenidad.traducciones || {}
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ nombre, icono, categoria, traducciones });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Editar Amenidad</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Icono</label>
            <div className="iconos-grid-edit">
              {ICONOS_DISPONIBLES.map((i) => (
                <button
                  key={i.value}
                  type="button"
                  className={`icono-btn ${icono === i.value ? 'selected' : ''}`}
                  onClick={() => setIcono(i.value)}
                  title={i.label}
                >
                  {i.value}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre de la amenidad"
            />
          </div>

          <div className="form-group">
            <label>Categoría</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              <option value="personalizadas">Sin Categoría (Personalizadas)</option>
              {categorias.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORIAS_LABELS[cat] || cat}
                </option>
              ))}
            </select>
          </div>

          {idiomas.length > 1 && (
            <div className="form-group">
              <label>Traducciones</label>
              <div className="traducciones-grid-edit">
                {idiomas.map((idioma) => (
                  <div key={idioma.code} className="traduccion-item">
                    <span className="idioma-label">
                      {idioma.flagEmoji} {idioma.labelNativo}
                    </span>
                    <input
                      type="text"
                      value={traducciones[idioma.code] || ''}
                      onChange={(e) =>
                        setTraducciones((prev) => ({
                          ...prev,
                          [idioma.code]: e.target.value,
                        }))
                      }
                      placeholder={`Nombre en ${idioma.labelNativo}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn-save"
            onClick={handleSave}
            disabled={!nombre.trim() || saving}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface CreateModalProps {
  categorias: string[];
  idiomas: { code: string; labelNativo: string; flagEmoji: string }[];
  onSave: (data: { nombre: string; icono: string; categoria: string; traducciones?: Record<string, string> }) => void;
  onClose: () => void;
  saving: boolean;
}

function CreateModal({ categorias, idiomas, onSave, onClose, saving }: CreateModalProps) {
  const [nombre, setNombre] = useState('');
  const [icono, setIcono] = useState('🎯');
  const [categoria, setCategoria] = useState('personalizadas');
  const [traducciones, setTraducciones] = useState<Record<string, string>>({});

  const handleSave = () => {
    if (!nombre.trim()) return;
    // Solo incluir traducciones si hay alguna definida
    const traduccionesLimpias = Object.fromEntries(
      Object.entries(traducciones).filter(([_, v]) => v.trim())
    );
    onSave({
      nombre: nombre.trim(),
      icono,
      categoria,
      ...(Object.keys(traduccionesLimpias).length > 0 && { traducciones: traduccionesLimpias })
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Crear Nueva Amenidad</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Icono</label>
            <div className="iconos-grid-edit">
              {ICONOS_DISPONIBLES.map((i) => (
                <button
                  key={i.value}
                  type="button"
                  className={`icono-btn ${icono === i.value ? 'selected' : ''}`}
                  onClick={() => setIcono(i.value)}
                  title={i.label}
                >
                  {i.value}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre de la amenidad"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Categoria</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              <option value="personalizadas">Sin Categoria (Personalizadas)</option>
              {categorias.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORIAS_LABELS[cat] || cat}
                </option>
              ))}
            </select>
          </div>

          {idiomas.length > 1 && (
            <div className="form-group">
              <label>Traducciones</label>
              <div className="traducciones-grid-edit">
                {idiomas.map((idioma) => (
                  <div key={idioma.code} className="traduccion-item">
                    <span className="idioma-label">
                      {idioma.flagEmoji} {idioma.labelNativo}
                    </span>
                    <input
                      type="text"
                      value={traducciones[idioma.code] || ''}
                      onChange={(e) =>
                        setTraducciones((prev) => ({
                          ...prev,
                          [idioma.code]: e.target.value,
                        }))
                      }
                      placeholder={`Nombre en ${idioma.labelNativo}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="create-info">
            La amenidad se creara como "pendiente" y podras activarla despues.
          </p>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn-save"
            onClick={handleSave}
            disabled={!nombre.trim() || saving}
          >
            {saving ? 'Creando...' : 'Crear Amenidad'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper para renderizar iconos (soporta emojis y FontAwesome)
function renderIcon(icono: string | null | undefined, size: string = '2rem'): React.ReactNode {
  const iconValue = icono || '🎯';

  // Si es clase de FontAwesome (comienza con "fa")
  if (iconValue.startsWith('fa')) {
    return <i className={iconValue} style={{ fontSize: size }} />;
  }

  // Si es emoji u otro texto
  return <span style={{ fontSize: size }}>{iconValue}</span>;
}

export default function CrmAmenidadesConfig() {
  const { tenantActual } = useAuth();
  const navigate = useNavigate();
  const { setPageHeader } = usePageHeader();
  const { idiomas } = useIdiomas(tenantActual?.id);

  const [amenidades, setAmenidades] = useState<Amenidad[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todas' | 'activas' | 'pendientes'>('todas');
  const [editando, setEditando] = useState<Amenidad | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Amenidad | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creando, setCreando] = useState(false);

  // Configurar header
  useEffect(() => {
    setPageHeader({
      title: 'Amenidades Personalizadas',
      subtitle: 'Gestiona las amenidades personalizadas de tu empresa',
      backButton: {
        label: 'Volver',
        onClick: () => navigate(`/crm/${tenantActual?.slug}/configuracion/personalizar`),
      },
    });
  }, [setPageHeader, tenantActual?.slug, navigate]);

  // Cargar datos
  useEffect(() => {
    async function fetchData() {
      if (!tenantActual?.id) return;

      try {
        setLoading(true);
        setError(null);

        const [amenidadesData, categoriasData] = await Promise.all([
          getAmenidadesTenant(tenantActual.id, true), // incluir inactivas para ver pendientes
          getCategoriasAmenidades(),
        ]);

        // Filtrar solo las amenidades del tenant (personalizadas), no las globales
        const amenidadesTenant = amenidadesData.filter((a: any) => a.origen === 'tenant');
        setAmenidades(amenidadesTenant);
        setCategorias(categoriasData.filter((c) => c !== 'personalizada' && c !== 'personalizadas'));
      } catch (err: any) {
        console.error('Error cargando amenidades:', err);
        setError(err.message || 'Error al cargar las amenidades');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [tenantActual?.id]);

  // Filtrar amenidades
  const amenidadesFiltradas = amenidades.filter((a) => {
    const matchBusqueda =
      !busqueda ||
      a.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.codigo.toLowerCase().includes(busqueda.toLowerCase());

    const matchEstado =
      filtroEstado === 'todas' ||
      (filtroEstado === 'activas' && a.activo) ||
      (filtroEstado === 'pendientes' && !a.activo);

    return matchBusqueda && matchEstado;
  });

  // Handlers
  const handleToggleActivo = async (amenidad: Amenidad) => {
    if (!tenantActual?.id) return;

    try {
      const updated = await updateAmenidadTenant(tenantActual.id, amenidad.id, {
        activo: !amenidad.activo,
      });
      setAmenidades((prev) =>
        prev.map((a) => (a.id === amenidad.id ? updated : a))
      );
    } catch (err: any) {
      console.error('Error actualizando amenidad:', err);
      setError(err.message);
    }
  };

  const handleEdit = async (data: { nombre?: string; icono?: string; categoria?: string; traducciones?: Record<string, string> }) => {
    if (!tenantActual?.id || !editando) return;

    try {
      const updated = await updateAmenidadTenant(tenantActual.id, editando.id, data);
      setAmenidades((prev) =>
        prev.map((a) => (a.id === editando.id ? updated : a))
      );
      setEditando(null);
    } catch (err: any) {
      console.error('Error actualizando amenidad:', err);
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!tenantActual?.id || !confirmDelete) return;

    try {
      await deleteAmenidadTenant(tenantActual.id, confirmDelete.id);
      setAmenidades((prev) => prev.filter((a) => a.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (err: any) {
      console.error('Error eliminando amenidad:', err);
      setError(err.message);
    }
  };

  const handleCreate = async (data: { nombre: string; icono: string; categoria: string; traducciones?: Record<string, string> }) => {
    if (!tenantActual?.id) return;

    try {
      setCreando(true);
      const nuevaAmenidad = await createAmenidadTenant(tenantActual.id, data);
      setAmenidades((prev) => [...prev, { ...nuevaAmenidad, origen: 'tenant' }]);
      setShowCreateModal(false);
    } catch (err: any) {
      console.error('Error creando amenidad:', err);
      setError(err.message);
    } finally {
      setCreando(false);
    }
  };

  const getCategoriaLabel = (cat: string | null) => {
    if (!cat) return 'Sin Categoría';
    return CATEGORIAS_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  const idiomasActivos = idiomas.filter((i) => i.activo);

  if (loading) {
    return (
      <div className="amenidades-config loading">
        <div className="loading-spinner">Cargando amenidades...</div>
      </div>
    );
  }

  return (
    <div className="amenidades-config">
      {error && (
        <div className="error-banner">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Barra de herramientas */}
      <div className="toolbar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar amenidad..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="filter-box">
          <Filter size={18} />
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as any)}
          >
            <option value="todas">Todas</option>
            <option value="activas">Activas</option>
            <option value="pendientes">Pendientes</option>
          </select>
          <ChevronDown size={16} className="select-arrow" />
        </div>

        <div className="stats">
          <span className="stat">
            <CheckCircle size={16} className="stat-icon activas" />
            {amenidades.filter((a) => a.activo).length} activas
          </span>
          <span className="stat">
            <Clock size={16} className="stat-icon pendientes" />
            {amenidades.filter((a) => !a.activo).length} pendientes
          </span>
        </div>

        <button
          className="btn-crear"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={18} />
          Crear Nueva
        </button>
      </div>

      {/* Lista de amenidades */}
      {amenidadesFiltradas.length === 0 ? (
        <div className="empty-state">
          <p>
            {amenidades.length === 0
              ? 'No hay amenidades personalizadas aún. Las amenidades creadas desde el formulario de propiedades aparecerán aquí.'
              : 'No se encontraron amenidades con los filtros aplicados.'}
          </p>
        </div>
      ) : (
        <div className="amenidades-list">
          {amenidadesFiltradas.map((amenidad) => (
            <div
              key={amenidad.id}
              className={`amenidad-card ${amenidad.activo ? 'activa' : 'pendiente'}`}
            >
              <div className="amenidad-icon">{renderIcon(amenidad.icono)}</div>

              <div className="amenidad-info">
                <h3>{amenidad.nombre}</h3>
                <div className="amenidad-meta">
                  <span className="categoria">{getCategoriaLabel(amenidad.categoria)}</span>
                  <span className={`estado ${amenidad.activo ? 'activo' : 'pendiente'}`}>
                    {amenidad.activo ? 'Activa' : 'Pendiente de aprobación'}
                  </span>
                </div>
              </div>

              <div className="amenidad-actions">
                <button
                  className={`btn-toggle ${amenidad.activo ? 'desactivar' : 'activar'}`}
                  onClick={() => handleToggleActivo(amenidad)}
                  title={amenidad.activo ? 'Desactivar' : 'Aprobar'}
                >
                  {amenidad.activo ? <X size={18} /> : <Check size={18} />}
                  {amenidad.activo ? 'Desactivar' : 'Aprobar'}
                </button>

                <button
                  className="btn-edit"
                  onClick={() => setEditando(amenidad)}
                  title="Editar"
                >
                  <Edit2 size={18} />
                </button>

                <button
                  className="btn-delete"
                  onClick={() => setConfirmDelete(amenidad)}
                  title="Eliminar"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de edición */}
      {editando && (
        <EditModal
          amenidad={editando}
          categorias={categorias}
          idiomas={idiomasActivos}
          onSave={handleEdit}
          onClose={() => setEditando(null)}
        />
      )}

      {/* Modal de confirmación de eliminación */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Eliminar Amenidad</h2>
            </div>
            <div className="modal-body">
              <p>
                ¿Estás seguro de que deseas eliminar la amenidad{' '}
                <strong>"{confirmDelete.nombre}"</strong>?
              </p>
              <p className="warning-text">Esta acción no se puede deshacer.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setConfirmDelete(null)}>
                Cancelar
              </button>
              <button className="btn-delete-confirm" onClick={handleDelete}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de creación de amenidad */}
      {showCreateModal && (
        <CreateModal
          categorias={categorias}
          idiomas={idiomasActivos}
          onSave={handleCreate}
          onClose={() => setShowCreateModal(false)}
          saving={creando}
        />
      )}

      <style>{`
        .amenidades-config {
          padding: 0;
        }

        .amenidades-config.loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 300px;
        }

        .loading-spinner {
          color: #64748b;
          font-size: 1rem;
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 10px;
          margin-bottom: 20px;
          color: #dc2626;
        }

        .error-banner button {
          background: none;
          border: none;
          cursor: pointer;
          margin-left: auto;
          color: #dc2626;
          padding: 4px;
        }

        .toolbar {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 12px;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          width: 320px;
          transition: border-color 0.2s;
        }

        .search-box:hover {
          border-color: #9ca3af;
        }

        .search-box:focus-within {
          border-color: #6366f1;
        }

        .search-box input {
          border: none !important;
          outline: none !important;
          background: transparent !important;
          width: 100%;
          font-size: 0.95rem;
          color: #0f172a;
          padding: 12px 0;
          box-shadow: none !important;
        }

        .search-box input:focus {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
        }

        .search-box input::placeholder {
          color: #9ca3af;
        }

        .search-box svg {
          color: #9ca3af;
          flex-shrink: 0;
        }

        .filter-box {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 12px;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          position: relative;
          transition: border-color 0.2s;
        }

        .filter-box:hover {
          border-color: #9ca3af;
        }

        .filter-box:focus-within {
          border-color: #6366f1;
        }

        .filter-box select {
          border: none !important;
          outline: none !important;
          background: transparent !important;
          font-size: 0.95rem;
          cursor: pointer;
          appearance: none;
          padding: 12px 32px 12px 0;
          color: #0f172a;
          font-weight: 500;
          box-shadow: none !important;
        }

        .filter-box select:focus {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
        }

        .filter-box svg:first-child {
          color: #9ca3af;
          flex-shrink: 0;
        }

        .select-arrow {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
          pointer-events: none;
        }

        .stats {
          display: flex;
          gap: 16px;
          margin-left: auto;
        }

        .stat {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
          color: #64748b;
        }

        .stat-icon.activas {
          color: #22c55e;
        }

        .stat-icon.pendientes {
          color: #f59e0b;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          color: #64748b;
        }

        .amenidades-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .amenidad-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          transition: all 0.2s;
        }

        .amenidad-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .amenidad-card.pendiente {
          border-left: 4px solid #f59e0b;
        }

        .amenidad-card.activa {
          border-left: 4px solid #22c55e;
        }

        .amenidad-icon {
          font-size: 2rem;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          border-radius: 10px;
        }

        .amenidad-info {
          flex: 1;
        }

        .amenidad-info h3 {
          margin: 0 0 6px 0;
          font-size: 1rem;
          font-weight: 600;
          color: #0f172a;
        }

        .amenidad-meta {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .categoria {
          font-size: 0.85rem;
          color: #64748b;
          padding: 2px 10px;
          background: #f1f5f9;
          border-radius: 20px;
        }

        .estado {
          font-size: 0.8rem;
          font-weight: 500;
        }

        .estado.activo {
          color: #22c55e;
        }

        .estado.pendiente {
          color: #f59e0b;
        }

        .amenidad-actions {
          display: flex;
          gap: 8px;
        }

        .btn-toggle,
        .btn-edit,
        .btn-delete {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn-toggle.activar {
          background: #ecfdf5;
          color: #059669;
        }

        .btn-toggle.activar:hover {
          background: #d1fae5;
        }

        .btn-toggle.desactivar {
          background: #fef3c7;
          color: #d97706;
        }

        .btn-toggle.desactivar:hover {
          background: #fde68a;
        }

        .btn-edit {
          background: #f1f5f9;
          color: #475569;
        }

        .btn-edit:hover {
          background: #e2e8f0;
        }

        .btn-delete {
          background: #fef2f2;
          color: #dc2626;
        }

        .btn-delete:hover {
          background: #fee2e2;
        }

        /* Modal styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 20px;
        }

        .modal-content {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .confirm-modal {
          max-width: 400px;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #0f172a;
        }

        .close-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #64748b;
          padding: 4px;
          border-radius: 6px;
        }

        .close-btn:hover {
          background: #f1f5f9;
        }

        .modal-body {
          padding: 24px;
        }

        .modal-body p {
          margin: 0 0 12px 0;
          color: #475569;
        }

        .warning-text {
          color: #dc2626 !important;
          font-size: 0.9rem;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 8px;
          font-size: 0.95rem;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.95rem;
          transition: all 0.2s;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .iconos-grid-edit {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .icono-btn {
          width: 44px;
          height: 44px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          font-size: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .icono-btn:hover {
          border-color: #6366f1;
        }

        .icono-btn.selected {
          background: #6366f1;
          border-color: #6366f1;
        }

        .traducciones-grid-edit {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .traduccion-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .idioma-label {
          font-size: 0.85rem;
          color: #64748b;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #e2e8f0;
        }

        .btn-cancel,
        .btn-save,
        .btn-delete-confirm {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-cancel {
          background: #f1f5f9;
          color: #475569;
        }

        .btn-cancel:hover {
          background: #e2e8f0;
        }

        .btn-save {
          background: #6366f1;
          color: white;
        }

        .btn-save:hover:not(:disabled) {
          background: #4f46e5;
        }

        .btn-save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-crear {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
          margin-left: auto;
        }

        .btn-crear:hover {
          background: #4f46e5;
        }

        .create-info {
          font-size: 0.875rem;
          color: #64748b;
          margin-top: 8px;
          padding: 12px;
          background: #f8fafc;
          border-radius: 8px;
          border-left: 3px solid #6366f1;
        }

        .btn-delete-confirm {
          background: #dc2626;
          color: white;
        }

        .btn-delete-confirm:hover {
          background: #b91c1c;
        }

        @media (max-width: 768px) {
          .toolbar {
            flex-direction: column;
            gap: 12px;
          }

          .search-box {
            width: 100%;
            min-width: auto;
          }

          .filter-box {
            width: 100%;
          }

          .filter-box select {
            width: 100%;
          }

          .stats {
            margin-left: 0;
            width: 100%;
            justify-content: center;
          }

          .amenidad-card {
            flex-wrap: wrap;
          }

          .amenidad-actions {
            width: 100%;
            justify-content: flex-end;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid #f1f5f9;
          }
        }
      `}</style>
    </div>
  );
}
