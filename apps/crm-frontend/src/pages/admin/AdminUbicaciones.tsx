/**
 * AdminUbicaciones - Gestión de Ubicaciones del Sistema
 * Permite crear, editar y administrar la jerarquía de ubicaciones:
 * País → Provincia → Ciudad → Sector
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  getArbolUbicaciones,
  getUbicaciones,
  createUbicacion,
  updateUbicacion,
  deleteUbicacion,
  toggleUbicacionStatus,
  UbicacionAdmin,
  CreateUbicacionData,
} from '../../services/api';

// Iconos inline para evitar dependencias
const IconChevron = ({ expanded }: { expanded: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
      transition: 'transform 0.2s',
    }}
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const IconEdit = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
);

const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

const IconGlobe = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
  </svg>
);

const IconMap = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" />
    <path d="M8 2v16M16 6v16" />
  </svg>
);

const IconBuilding = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01" />
  </svg>
);

const IconMapPin = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

// Tipos para el nivel/tipo de ubicación
const TIPO_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: JSX.Element; nivel: number }> = {
  pais: { label: 'País', color: '#7C3AED', bgColor: '#EDE9FE', icon: <IconGlobe />, nivel: 1 },
  provincia: { label: 'Provincia', color: '#2563EB', bgColor: '#DBEAFE', icon: <IconMap />, nivel: 2 },
  ciudad: { label: 'Ciudad', color: '#059669', bgColor: '#D1FAE5', icon: <IconBuilding />, nivel: 3 },
  sector: { label: 'Sector', color: '#D97706', bgColor: '#FEF3C7', icon: <IconMapPin />, nivel: 4 },
};

// Componente de Modal para crear/editar ubicación
function UbicacionModal({
  ubicacion,
  parentUbicacion,
  onClose,
  onSaved,
  getToken,
}: {
  ubicacion: UbicacionAdmin | null;
  parentUbicacion: UbicacionAdmin | null;
  onClose: () => void;
  onSaved: () => void;
  getToken: () => Promise<string | null>;
}) {
  const isEditing = !!ubicacion;

  // Determinar el tipo basado en el parent o la ubicación existente
  const determineDefaultTipo = (): 'pais' | 'provincia' | 'ciudad' | 'sector' => {
    if (ubicacion) return ubicacion.tipo;
    if (!parentUbicacion) return 'pais';
    switch (parentUbicacion.tipo) {
      case 'pais': return 'provincia';
      case 'provincia': return 'ciudad';
      case 'ciudad': return 'sector';
      default: return 'sector';
    }
  };

  const [formData, setFormData] = useState<CreateUbicacionData>({
    nombre: ubicacion?.nombre || '',
    tipo: determineDefaultTipo(),
    parent_id: ubicacion?.parent_id || parentUbicacion?.id || null,
    slug: ubicacion?.slug || '',
    codigo: ubicacion?.codigo || '',
    latitud: ubicacion?.latitud,
    longitud: ubicacion?.longitud,
    destacado: ubicacion?.destacado ?? false,
    mostrar_en_menu: ubicacion?.mostrar_en_menu ?? true,
    mostrar_en_filtros: ubicacion?.mostrar_en_filtros ?? true,
    activo: ubicacion?.activo ?? true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableParents, setAvailableParents] = useState<UbicacionAdmin[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);

  // Cargar parents disponibles cuando cambia el tipo
  useEffect(() => {
    const loadParents = async () => {
      if (formData.tipo === 'pais') {
        setAvailableParents([]);
        setFormData(prev => ({ ...prev, parent_id: null }));
        return;
      }

      setLoadingParents(true);
      try {
        const token = await getToken();
        const parentTipo = formData.tipo === 'provincia' ? 'pais'
          : formData.tipo === 'ciudad' ? 'provincia'
          : 'ciudad';
        const parents = await getUbicaciones({ tipo: parentTipo, activo: true }, token);
        setAvailableParents(parents);
      } catch (err) {
        console.error('Error cargando parents:', err);
      } finally {
        setLoadingParents(false);
      }
    };

    loadParents();
  }, [formData.tipo, getToken]);

  // Generar slug automáticamente
  const generateSlug = (nombre: string) => {
    return nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNombreChange = (nombre: string) => {
    setFormData(prev => ({
      ...prev,
      nombre,
      slug: isEditing ? prev.slug : generateSlug(nombre),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      setError('El nombre es requerido');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('No se pudo obtener el token');

      if (isEditing && ubicacion) {
        await updateUbicacion(ubicacion.id, formData, token);
      } else {
        await createUbicacion(formData, token);
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content ubicacion-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Editar Ubicación' : 'Nueva Ubicación'}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="form-error">
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)}>&times;</button>
            </div>
          )}

          <div className="form-grid">
            {/* Tipo */}
            <div className="form-group">
              <label>Tipo *</label>
              <select
                value={formData.tipo}
                onChange={e => setFormData(prev => ({
                  ...prev,
                  tipo: e.target.value as CreateUbicacionData['tipo'],
                  parent_id: null
                }))}
                disabled={isEditing}
              >
                <option value="pais">País</option>
                <option value="provincia">Provincia</option>
                <option value="ciudad">Ciudad</option>
                <option value="sector">Sector</option>
              </select>
            </div>

            {/* Parent */}
            {formData.tipo !== 'pais' && (
              <div className="form-group">
                <label>
                  {formData.tipo === 'provincia' ? 'País' :
                   formData.tipo === 'ciudad' ? 'Provincia' : 'Ciudad'} *
                </label>
                <select
                  value={formData.parent_id || ''}
                  onChange={e => setFormData(prev => ({ ...prev, parent_id: e.target.value || null }))}
                  disabled={loadingParents || isEditing}
                  required
                >
                  <option value="">Seleccionar...</option>
                  {availableParents.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Nombre */}
            <div className="form-group full-width">
              <label>Nombre *</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={e => handleNombreChange(e.target.value)}
                placeholder="Ej: Santo Domingo"
                required
              />
            </div>

            {/* Slug */}
            <div className="form-group">
              <label>Slug (URL)</label>
              <input
                type="text"
                value={formData.slug}
                onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="santo-domingo"
              />
              <span className="field-hint">Se genera automáticamente del nombre</span>
            </div>

            {/* Código */}
            <div className="form-group">
              <label>Código</label>
              <input
                type="text"
                value={formData.codigo || ''}
                onChange={e => setFormData(prev => ({ ...prev, codigo: e.target.value }))}
                placeholder="Ej: DO, SD"
                maxLength={10}
              />
            </div>

            {/* Coordenadas */}
            <div className="form-group">
              <label>Latitud</label>
              <input
                type="number"
                step="any"
                value={formData.latitud || ''}
                onChange={e => setFormData(prev => ({ ...prev, latitud: e.target.value ? parseFloat(e.target.value) : undefined }))}
                placeholder="18.4861"
              />
            </div>

            <div className="form-group">
              <label>Longitud</label>
              <input
                type="number"
                step="any"
                value={formData.longitud || ''}
                onChange={e => setFormData(prev => ({ ...prev, longitud: e.target.value ? parseFloat(e.target.value) : undefined }))}
                placeholder="-69.9312"
              />
            </div>

            {/* Checkboxes */}
            <div className="form-group full-width checkboxes-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={e => setFormData(prev => ({ ...prev, activo: e.target.checked }))}
                />
                <span>Activo</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.destacado}
                  onChange={e => setFormData(prev => ({ ...prev, destacado: e.target.checked }))}
                />
                <span>Destacado</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.mostrar_en_menu}
                  onChange={e => setFormData(prev => ({ ...prev, mostrar_en_menu: e.target.checked }))}
                />
                <span>Mostrar en menú</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.mostrar_en_filtros}
                  onChange={e => setFormData(prev => ({ ...prev, mostrar_en_filtros: e.target.checked }))}
                />
                <span>Mostrar en filtros</span>
              </label>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Ubicación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Componente de nodo del árbol
function UbicacionNode({
  ubicacion,
  level,
  onEdit,
  onDelete,
  onToggleStatus,
  onAddChild,
  expandedIds,
  toggleExpanded,
}: {
  ubicacion: UbicacionAdmin;
  level: number;
  onEdit: (u: UbicacionAdmin) => void;
  onDelete: (u: UbicacionAdmin) => void;
  onToggleStatus: (u: UbicacionAdmin) => void;
  onAddChild: (parent: UbicacionAdmin) => void;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
}) {
  const config = TIPO_CONFIG[ubicacion.tipo] || TIPO_CONFIG.sector;
  const hasChildren = ubicacion.children && ubicacion.children.length > 0;
  const isExpanded = expandedIds.has(ubicacion.id);
  const canHaveChildren = ubicacion.tipo !== 'sector';

  return (
    <div className="ubicacion-node">
      <div
        className={`node-content ${!ubicacion.activo ? 'inactive' : ''}`}
        style={{ paddingLeft: `${level * 24 + 12}px` }}
      >
        {/* Expand/Collapse button */}
        <button
          className={`expand-btn ${hasChildren ? '' : 'invisible'}`}
          onClick={() => toggleExpanded(ubicacion.id)}
        >
          <IconChevron expanded={isExpanded} />
        </button>

        {/* Tipo badge */}
        <span
          className="tipo-badge"
          style={{
            color: config.color,
            backgroundColor: config.bgColor
          }}
        >
          {config.icon}
          {config.label}
        </span>

        {/* Nombre */}
        <span className="node-nombre">{ubicacion.nombre}</span>

        {/* Código */}
        {ubicacion.codigo && (
          <span className="node-codigo">{ubicacion.codigo}</span>
        )}

        {/* Slug */}
        <span className="node-slug">/{ubicacion.slug}</span>

        {/* Children count */}
        {hasChildren && (
          <span className="children-count">{ubicacion.children!.length}</span>
        )}

        {/* Status badge */}
        {!ubicacion.activo && (
          <span className="status-badge inactive">Inactivo</span>
        )}
        {ubicacion.destacado && (
          <span className="status-badge featured">Destacado</span>
        )}

        {/* Actions */}
        <div className="node-actions">
          {canHaveChildren && (
            <button
              className="action-btn add"
              onClick={() => onAddChild(ubicacion)}
              title="Agregar hijo"
            >
              <IconPlus />
            </button>
          )}
          <button
            className="action-btn edit"
            onClick={() => onEdit(ubicacion)}
            title="Editar"
          >
            <IconEdit />
          </button>
          <button
            className="action-btn toggle"
            onClick={() => onToggleStatus(ubicacion)}
            title={ubicacion.activo ? 'Desactivar' : 'Activar'}
          >
            {ubicacion.activo ? '●' : '○'}
          </button>
          <button
            className="action-btn delete"
            onClick={() => onDelete(ubicacion)}
            title="Eliminar"
          >
            <IconTrash />
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="node-children">
          {ubicacion.children!.map(child => (
            <UbicacionNode
              key={child.id}
              ubicacion={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleStatus={onToggleStatus}
              onAddChild={onAddChild}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminUbicaciones() {
  const { getToken } = useAuth();
  const [ubicaciones, setUbicaciones] = useState<UbicacionAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [filterTipo, setFilterTipo] = useState<string>('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingUbicacion, setEditingUbicacion] = useState<UbicacionAdmin | null>(null);
  const [parentForNew, setParentForNew] = useState<UbicacionAdmin | null>(null);

  // Expanded nodes
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();

      // Cargar árbol completo
      const arbol = await getArbolUbicaciones({ maxNivel: 4 }, token);
      setUbicaciones(arbol);

      // Expandir primer nivel por defecto
      const firstLevelIds = new Set(arbol.map(u => u.id));
      setExpandedIds(firstLevelIds);
    } catch (err: any) {
      setError(err.message || 'Error al cargar ubicaciones');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toggle expanded
  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Expand all
  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (items: UbicacionAdmin[]) => {
      items.forEach(item => {
        allIds.add(item.id);
        if (item.children) collectIds(item.children);
      });
    };
    collectIds(ubicaciones);
    setExpandedIds(allIds);
  };

  // Collapse all
  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // Handle edit
  const handleEdit = (ubicacion: UbicacionAdmin) => {
    setEditingUbicacion(ubicacion);
    setParentForNew(null);
    setShowModal(true);
  };

  // Handle add child
  const handleAddChild = (parent: UbicacionAdmin) => {
    setEditingUbicacion(null);
    setParentForNew(parent);
    setShowModal(true);
  };

  // Handle create new (root level - país)
  const handleCreateNew = () => {
    setEditingUbicacion(null);
    setParentForNew(null);
    setShowModal(true);
  };

  // Handle delete
  const handleDelete = async (ubicacion: UbicacionAdmin) => {
    const hasChildren = ubicacion.children && ubicacion.children.length > 0;
    const confirmMsg = hasChildren
      ? `"${ubicacion.nombre}" tiene ${ubicacion.children!.length} ubicaciones hijas. ¿Deseas desactivarla?`
      : `¿Estás seguro de eliminar "${ubicacion.nombre}"?`;

    if (!confirm(confirmMsg)) return;

    try {
      setError(null);
      const token = await getToken();
      if (!token) throw new Error('No se pudo obtener el token');

      await deleteUbicacion(ubicacion.id, false, token); // soft delete
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar');
    }
  };

  // Handle toggle status
  const handleToggleStatus = async (ubicacion: UbicacionAdmin) => {
    try {
      setError(null);
      const token = await getToken();
      if (!token) throw new Error('No se pudo obtener el token');

      await toggleUbicacionStatus(ubicacion.id, !ubicacion.activo, token);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al cambiar estado');
    }
  };

  // Handle modal close
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUbicacion(null);
    setParentForNew(null);
  };

  // Handle saved
  const handleSaved = () => {
    handleCloseModal();
    loadData();
  };

  // Filter ubicaciones recursively
  const filterUbicaciones = (items: UbicacionAdmin[]): UbicacionAdmin[] => {
    return items.reduce<UbicacionAdmin[]>((acc, item) => {
      const matchesSearch = !search ||
        item.nombre.toLowerCase().includes(search.toLowerCase()) ||
        item.slug.toLowerCase().includes(search.toLowerCase());
      const matchesTipo = !filterTipo || item.tipo === filterTipo;
      const matchesActive = showInactive || item.activo;

      // Filter children recursively
      const filteredChildren = item.children ? filterUbicaciones(item.children) : [];

      // Include if matches or has matching children
      if ((matchesSearch && matchesTipo && matchesActive) || filteredChildren.length > 0) {
        acc.push({
          ...item,
          children: filteredChildren.length > 0 ? filteredChildren : item.children,
        });
      }

      return acc;
    }, []);
  };

  const filteredUbicaciones = filterUbicaciones(ubicaciones);

  // Count stats
  const countAll = (items: UbicacionAdmin[]): { total: number; byTipo: Record<string, number>; inactive: number } => {
    let total = 0;
    let inactive = 0;
    const byTipo: Record<string, number> = {};

    const count = (list: UbicacionAdmin[]) => {
      list.forEach(item => {
        total++;
        byTipo[item.tipo] = (byTipo[item.tipo] || 0) + 1;
        if (!item.activo) inactive++;
        if (item.children) count(item.children);
      });
    };

    count(items);
    return { total, byTipo, inactive };
  };

  const stats = countAll(ubicaciones);

  if (loading) {
    return (
      <div className="admin-ubicaciones-loading">
        <div className="loading-spinner"></div>
        <p>Cargando ubicaciones...</p>
        <style>{`
          .admin-ubicaciones-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            gap: 16px;
            color: #64748B;
          }
          .loading-spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #E2E8F0;
            border-top-color: #2563EB;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="admin-ubicaciones">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Gestión de Ubicaciones</h1>
          <p className="page-subtitle">
            Administra la jerarquía de ubicaciones: País → Provincia → Ciudad → Sector
          </p>
        </div>
        <button className="btn-primary" onClick={handleCreateNew}>
          <span className="btn-icon">+</span>
          Nueva Ubicación
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total</div>
        </div>
        {Object.entries(TIPO_CONFIG).map(([tipo, config]) => (
          <div key={tipo} className="stat-card" style={{ borderLeftColor: config.color }}>
            <div className="stat-value">{stats.byTipo[tipo] || 0}</div>
            <div className="stat-label">{config.label}es</div>
          </div>
        ))}
        <div className="stat-card inactive">
          <div className="stat-value">{stats.inactive}</div>
          <div className="stat-label">Inactivos</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <IconSearch />
          <input
            type="text"
            placeholder="Buscar por nombre o slug..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          value={filterTipo}
          onChange={e => setFilterTipo(e.target.value)}
          className="filter-select"
        >
          <option value="">Todos los tipos</option>
          <option value="pais">País</option>
          <option value="provincia">Provincia</option>
          <option value="ciudad">Ciudad</option>
          <option value="sector">Sector</option>
        </select>

        <label className="toggle-filter">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={e => setShowInactive(e.target.checked)}
          />
          <span>Mostrar inactivos</span>
        </label>

        <div className="expand-controls">
          <button onClick={expandAll} className="expand-btn-control">Expandir todo</button>
          <button onClick={collapseAll} className="expand-btn-control">Colapsar todo</button>
        </div>
      </div>

      {/* Tree */}
      <div className="ubicaciones-tree">
        {filteredUbicaciones.length === 0 ? (
          <div className="empty-state">
            <IconGlobe />
            <h3>No hay ubicaciones</h3>
            <p>
              {search || filterTipo
                ? 'No se encontraron ubicaciones con los filtros aplicados'
                : 'Comienza creando un país para establecer la jerarquía'}
            </p>
            {!search && !filterTipo && (
              <button className="btn-primary" onClick={handleCreateNew}>
                Crear primer país
              </button>
            )}
          </div>
        ) : (
          filteredUbicaciones.map(ubicacion => (
            <UbicacionNode
              key={ubicacion.id}
              ubicacion={ubicacion}
              level={0}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
              onAddChild={handleAddChild}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
            />
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <UbicacionModal
          ubicacion={editingUbicacion}
          parentUbicacion={parentForNew}
          onClose={handleCloseModal}
          onSaved={handleSaved}
          getToken={getToken}
        />
      )}

      <style>{`
        .admin-ubicaciones {
          max-width: 1400px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .page-header h1 {
          margin: 0 0 8px 0;
          font-size: 2rem;
          font-weight: 700;
          color: #0F172A;
        }

        .page-subtitle {
          margin: 0;
          color: #64748B;
          font-size: 0.9375rem;
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);
        }

        .btn-icon {
          font-size: 1.25rem;
          line-height: 1;
        }

        .error-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #FEE2E2;
          border: 1px solid #FECACA;
          border-radius: 8px;
          color: #DC2626;
          margin-bottom: 20px;
        }

        .error-banner button {
          background: none;
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
          color: #DC2626;
        }

        /* Stats */
        .stats-grid {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .stat-card {
          flex: 1;
          min-width: 100px;
          padding: 16px 20px;
          background: white;
          border: 1px solid #E2E8F0;
          border-left: 4px solid #2563EB;
          border-radius: 10px;
        }

        .stat-card.inactive {
          border-left-color: #94A3B8;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #0F172A;
        }

        .stat-label {
          font-size: 0.8rem;
          color: #64748B;
          margin-top: 4px;
        }

        /* Filters */
        .filters-section {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 250px;
          padding: 10px 16px;
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
        }

        .search-box svg {
          color: #94A3B8;
        }

        .search-box input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 0.9rem;
        }

        .filter-select {
          padding: 10px 16px;
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          font-size: 0.9rem;
          color: #374151;
          cursor: pointer;
        }

        .toggle-filter {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          cursor: pointer;
          font-size: 0.9rem;
          color: #374151;
        }

        .expand-controls {
          display: flex;
          gap: 8px;
        }

        .expand-btn-control {
          padding: 8px 14px;
          background: #F1F5F9;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          font-size: 0.8rem;
          color: #64748B;
          cursor: pointer;
          transition: all 0.2s;
        }

        .expand-btn-control:hover {
          background: #E2E8F0;
          color: #475569;
        }

        /* Tree */
        .ubicaciones-tree {
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          overflow: hidden;
        }

        .ubicacion-node {
          border-bottom: 1px solid #F1F5F9;
        }

        .ubicacion-node:last-child {
          border-bottom: none;
        }

        .node-content {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          transition: background 0.15s;
        }

        .node-content:hover {
          background: #F8FAFC;
        }

        .node-content.inactive {
          opacity: 0.6;
        }

        .expand-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background: none;
          border: none;
          color: #64748B;
          cursor: pointer;
          flex-shrink: 0;
        }

        .expand-btn.invisible {
          visibility: hidden;
        }

        .tipo-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          flex-shrink: 0;
        }

        .tipo-badge svg {
          width: 14px;
          height: 14px;
        }

        .node-nombre {
          font-weight: 600;
          color: #0F172A;
          flex-shrink: 0;
        }

        .node-codigo {
          padding: 2px 8px;
          background: #F1F5F9;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
          color: #64748B;
          flex-shrink: 0;
        }

        .node-slug {
          font-size: 0.8rem;
          color: #94A3B8;
          font-family: monospace;
        }

        .children-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          background: #E2E8F0;
          border-radius: 10px;
          font-size: 0.7rem;
          font-weight: 600;
          color: #64748B;
          flex-shrink: 0;
        }

        .status-badge {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          flex-shrink: 0;
        }

        .status-badge.inactive {
          background: #FEE2E2;
          color: #DC2626;
        }

        .status-badge.featured {
          background: #FEF3C7;
          color: #D97706;
        }

        .node-actions {
          display: flex;
          gap: 4px;
          margin-left: auto;
          opacity: 0;
          transition: opacity 0.15s;
        }

        .node-content:hover .node-actions {
          opacity: 1;
        }

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: #F1F5F9;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          color: #64748B;
          cursor: pointer;
          transition: all 0.15s;
        }

        .action-btn:hover {
          background: #E2E8F0;
        }

        .action-btn.add:hover {
          background: #DBEAFE;
          color: #2563EB;
          border-color: #93C5FD;
        }

        .action-btn.edit:hover {
          background: #D1FAE5;
          color: #059669;
          border-color: #6EE7B7;
        }

        .action-btn.toggle:hover {
          background: #FEF3C7;
          color: #D97706;
          border-color: #FCD34D;
        }

        .action-btn.delete:hover {
          background: #FEE2E2;
          color: #DC2626;
          border-color: #FECACA;
        }

        .node-children {
          border-top: 1px solid #F1F5F9;
        }

        /* Empty state */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #64748B;
          text-align: center;
        }

        .empty-state svg {
          width: 64px;
          height: 64px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-state h3 {
          margin: 0 0 8px 0;
          color: #374151;
        }

        .empty-state p {
          margin: 0 0 20px 0;
          max-width: 400px;
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
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #E2E8F0;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #0F172A;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #64748B;
          cursor: pointer;
          padding: 4px 8px;
        }

        .modal-close:hover {
          color: #0F172A;
        }

        .ubicacion-modal form {
          padding: 24px;
        }

        .form-error {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #FEE2E2;
          border: 1px solid #FECACA;
          border-radius: 8px;
          color: #DC2626;
          margin-bottom: 20px;
          font-size: 0.9rem;
        }

        .form-error button {
          background: none;
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
          color: #DC2626;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .form-group input,
        .form-group select {
          padding: 10px 14px;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          font-size: 0.9rem;
          color: #0F172A;
          transition: border-color 0.2s;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #2563EB;
        }

        .form-group input:disabled,
        .form-group select:disabled {
          background: #F8FAFC;
          color: #64748B;
        }

        .field-hint {
          font-size: 0.75rem;
          color: #94A3B8;
        }

        .checkboxes-group {
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          gap: 16px;
          padding-top: 8px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          color: #374151;
          cursor: pointer;
        }

        .checkbox-label input {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #E2E8F0;
        }

        .btn-secondary {
          padding: 10px 20px;
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          font-weight: 500;
          color: #64748B;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #F8FAFC;
          border-color: #CBD5E1;
        }

        .btn-secondary:disabled,
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .modal-actions .btn-primary {
          padding: 10px 20px;
        }

        @media (max-width: 640px) {
          .form-grid {
            grid-template-columns: 1fr;
          }

          .stats-grid {
            flex-direction: column;
          }

          .filters-section {
            flex-direction: column;
            align-items: stretch;
          }

          .search-box {
            min-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
