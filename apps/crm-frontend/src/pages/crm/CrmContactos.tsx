/**
 * CrmContactos - Gestión de contactos del CRM
 *
 * Módulo completo para gestionar contactos con:
 * - Lista con búsqueda y filtros
 * - Tipos de contacto (Lead, Cliente, Asesor, etc.)
 * - Favoritos
 * - Paginación
 * - CRUD completo
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import {
  getContactos,
  createContacto,
  deleteContacto,
  toggleContactoFavorito,
  Contacto,
  ContactoFiltros,
} from '../../services/api';

// Tipos de contacto con sus colores
const TIPOS_CONTACTO: Record<string, { label: string; bgColor: string; textColor: string }> = {
  lead: { label: 'Lead', bgColor: '#dbeafe', textColor: '#1d4ed8' },
  cliente: { label: 'Cliente', bgColor: '#dcfce7', textColor: '#16a34a' },
  asesor: { label: 'Asesor', bgColor: '#f3e8ff', textColor: '#7c3aed' },
  desarrollador: { label: 'Desarrollador', bgColor: '#e0e7ff', textColor: '#4338ca' },
  referidor: { label: 'Referidor', bgColor: '#fce7f3', textColor: '#be185d' },
  propietario: { label: 'Propietario', bgColor: '#fef3c7', textColor: '#b45309' },
  vendedor: { label: 'Vendedor', bgColor: '#ccfbf1', textColor: '#0d9488' },
};

const ITEMS_PER_PAGE = 50;

// Iconos SVG
const Icons = {
  search: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  star: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  starFilled: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  trash: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  ),
  phone: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  mail: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  chevronLeft: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  chevronRight: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  filter: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  ),
  edit: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  eye: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  x: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
};

export default function CrmContactos() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const { tenantActual, isPlatformAdmin } = useAuth();
  const { setPageHeader } = usePageHeader();

  // Estado
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<string>('');
  const [soloFavoritos, setSoloFavoritos] = useState(false);
  const [verTodos, setVerTodos] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nuevoContacto, setNuevoContacto] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    tipo: 'lead',
    empresa: '',
    cargo: '',
    notas: '',
  });

  // Configurar header de la página
  useEffect(() => {
    setPageHeader({
      title: 'Contactos',
      subtitle: 'Gestiona tu base de contactos y leads',
      actions: (
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          {Icons.plus}
          Nuevo Contacto
        </button>
      ),
    });
  }, [setPageHeader]);

  // Cargar contactos
  const cargarContactos = useCallback(async () => {
    if (!tenantActual?.id) return;

    try {
      setLoading(true);
      setError(null);

      const filtros: ContactoFiltros = {
        busqueda: busqueda || undefined,
        tipo: tipoFiltro || undefined,
        favoritos: soloFavoritos || undefined,
        todos: verTodos || undefined,
        page,
        limit: ITEMS_PER_PAGE,
      };

      const response = await getContactos(tenantActual.id, filtros);
      setContactos(response.data);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (err: any) {
      console.error('Error cargando contactos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantActual?.id, busqueda, tipoFiltro, soloFavoritos, verTodos, page]);

  useEffect(() => {
    cargarContactos();
  }, [cargarContactos]);

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [busqueda]);

  // Toggle favorito
  const handleToggleFavorito = async (contactoId: string) => {
    if (!tenantActual?.id) return;

    try {
      await toggleContactoFavorito(tenantActual.id, contactoId);
      setContactos(prev =>
        prev.map(c =>
          c.id === contactoId ? { ...c, favorito: !c.favorito } : c
        )
      );
    } catch (err: any) {
      console.error('Error al cambiar favorito:', err);
    }
  };

  // Eliminar contacto
  const handleDelete = async (contactoId: string) => {
    if (!tenantActual?.id) return;

    try {
      await deleteContacto(tenantActual.id, contactoId);
      setContactos(prev => prev.filter(c => c.id !== contactoId));
      setDeleteConfirm(null);
      setTotal(prev => prev - 1);
    } catch (err: any) {
      console.error('Error al eliminar contacto:', err);
      setError(err.message);
    }
  };

  // Crear contacto
  const handleCreateContacto = async () => {
    if (!tenantActual?.id || !nuevoContacto.nombre.trim()) return;

    try {
      setSaving(true);
      await createContacto(tenantActual.id, nuevoContacto);
      setShowCreateModal(false);
      setNuevoContacto({
        nombre: '',
        apellido: '',
        email: '',
        telefono: '',
        tipo: 'lead',
        empresa: '',
        cargo: '',
        notas: '',
      });
      cargarContactos();
    } catch (err: any) {
      console.error('Error al crear contacto:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Navegar a página de detalle
  const handleOpenDetail = (contacto: Contacto) => {
    navigate(`/crm/${tenantSlug}/contactos/${contacto.id}`);
  };

  // Formatear nombre completo
  const getNombreCompleto = (contacto: Contacto) => {
    return [contacto.nombre, contacto.apellido].filter(Boolean).join(' ');
  };

  // Obtener iniciales para avatar
  const getIniciales = (contacto: Contacto) => {
    const nombre = contacto.nombre?.charAt(0) || '';
    const apellido = contacto.apellido?.charAt(0) || '';
    return (nombre + apellido).toUpperCase() || '?';
  };

  // Renderizar badges de tipo
  const renderTipos = (tipos: string[]) => {
    if (!tipos || tipos.length === 0) return null;

    return (
      <div className="tipos-badges">
        {tipos.map((tipo, index) => {
          const config = TIPOS_CONTACTO[tipo] || { label: tipo, bgColor: '#f1f5f9', textColor: '#64748b' };
          return (
            <span
              key={index}
              className="tipo-badge"
              style={{ backgroundColor: config.bgColor, color: config.textColor }}
            >
              {config.label}
            </span>
          );
        })}
      </div>
    );
  };

  if (loading && contactos.length === 0) {
    return (
      <div className="page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando contactos...</p>
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
          <span className="search-icon">{Icons.search}</span>
          <input
            type="text"
            placeholder="Buscar por nombre, email o teléfono..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="filters-right">
          <select
            value={tipoFiltro}
            onChange={(e) => {
              setTipoFiltro(e.target.value);
              setPage(1);
            }}
            className="filter-select"
          >
            <option value="">Todos los tipos</option>
            {Object.entries(TIPOS_CONTACTO).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>

          <button
            className={`filter-btn ${soloFavoritos ? 'active' : ''}`}
            onClick={() => {
              setSoloFavoritos(!soloFavoritos);
              setPage(1);
            }}
          >
            {soloFavoritos ? Icons.starFilled : Icons.star}
            Favoritos
          </button>

          {isPlatformAdmin && (
            <button
              className={`filter-btn ${verTodos ? 'active' : ''}`}
              onClick={() => {
                setVerTodos(!verTodos);
                setPage(1);
              }}
            >
              {Icons.filter}
              Ver todos
            </button>
          )}
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
      <div className="results-info">
        <span>{total} contacto{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Lista de contactos */}
      {contactos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h3>No hay contactos</h3>
          <p>
            {busqueda || tipoFiltro || soloFavoritos
              ? 'No se encontraron contactos con los filtros aplicados'
              : 'Agrega tu primer contacto para comenzar'}
          </p>
        </div>
      ) : (
        <div className="contactos-table-wrapper">
          <table className="contactos-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th>Contacto</th>
                <th>Tipo</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Empresa</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {contactos.map((contacto) => (
                <tr
                  key={contacto.id}
                  className="contacto-row"
                  onClick={() => handleOpenDetail(contacto)}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      className="fav-btn"
                      onClick={() => handleToggleFavorito(contacto.id)}
                    >
                      {contacto.favorito ? (
                        <span className="star-filled">{Icons.starFilled}</span>
                      ) : (
                        <span className="star-empty">{Icons.star}</span>
                      )}
                    </button>
                  </td>
                  <td>
                    <div className="contacto-cell">
                      <div className="contacto-avatar placeholder">
                        {getIniciales(contacto)}
                      </div>
                      <div className="contacto-info">
                        <span className="contacto-nombre">{getNombreCompleto(contacto)}</span>
                        {contacto.cargo && (
                          <span className="contacto-cargo">{contacto.cargo}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{renderTipos(contacto.tipos_contacto)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {contacto.telefono && (
                      <a href={`tel:${contacto.telefono}`} className="contact-link">
                        {Icons.phone}
                        {contacto.telefono}
                      </a>
                    )}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {contacto.email && (
                      <a href={`mailto:${contacto.email}`} className="contact-link">
                        {Icons.mail}
                        {contacto.email}
                      </a>
                    )}
                  </td>
                  <td>
                    <span className="empresa-text">{contacto.empresa || '-'}</span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="row-actions">
                      <button
                        className="action-btn view-btn"
                        onClick={() => handleOpenDetail(contacto)}
                        title="Ver detalles"
                      >
                        {Icons.eye}
                      </button>
                      <button
                        className="action-btn delete-btn"
                        onClick={() => setDeleteConfirm(contacto.id)}
                        title="Eliminar"
                      >
                        {Icons.trash}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            {Icons.chevronLeft}
            Anterior
          </button>
          <span className="pagination-info">
            Página {page} de {totalPages}
          </span>
          <button
            className="pagination-btn"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
            {Icons.chevronRight}
          </button>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Eliminar contacto</h3>
            <p>¿Estás seguro de que deseas eliminar este contacto? Esta acción no se puede deshacer.</p>
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

      {/* Modal de creación de contacto */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content modal-form" onClick={(e) => e.stopPropagation()}>
            <h3>Nuevo Contacto</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateContacto(); }}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="nombre">Nombre *</label>
                  <input
                    id="nombre"
                    type="text"
                    value={nuevoContacto.nombre}
                    onChange={(e) => setNuevoContacto(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Nombre"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="apellido">Apellido</label>
                  <input
                    id="apellido"
                    type="text"
                    value={nuevoContacto.apellido}
                    onChange={(e) => setNuevoContacto(prev => ({ ...prev, apellido: e.target.value }))}
                    placeholder="Apellido"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={nuevoContacto.email}
                    onChange={(e) => setNuevoContacto(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="telefono">Teléfono</label>
                  <input
                    id="telefono"
                    type="tel"
                    value={nuevoContacto.telefono}
                    onChange={(e) => setNuevoContacto(prev => ({ ...prev, telefono: e.target.value }))}
                    placeholder="+52 55 1234 5678"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="tipo">Tipo de contacto</label>
                <select
                  id="tipo"
                  value={nuevoContacto.tipo}
                  onChange={(e) => setNuevoContacto(prev => ({ ...prev, tipo: e.target.value }))}
                >
                  {Object.entries(TIPOS_CONTACTO).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="empresa">Empresa</label>
                  <input
                    id="empresa"
                    type="text"
                    value={nuevoContacto.empresa}
                    onChange={(e) => setNuevoContacto(prev => ({ ...prev, empresa: e.target.value }))}
                    placeholder="Empresa u organización"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="cargo">Cargo</label>
                  <input
                    id="cargo"
                    type="text"
                    value={nuevoContacto.cargo}
                    onChange={(e) => setNuevoContacto(prev => ({ ...prev, cargo: e.target.value }))}
                    placeholder="Puesto o cargo"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="notas">Notas</label>
                <textarea
                  id="notas"
                  value={nuevoContacto.notas}
                  onChange={(e) => setNuevoContacto(prev => ({ ...prev, notas: e.target.value }))}
                  placeholder="Notas adicionales sobre el contacto..."
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving || !nuevoContacto.nombre.trim()}>
                  {saving ? 'Guardando...' : 'Crear Contacto'}
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
    margin-bottom: 20px;
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
    min-width: 160px;
  }

  .filter-select:focus {
    outline: none;
    border-color: #2563eb;
  }

  .filter-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: 0.9rem;
    background: white;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s;
  }

  .filter-btn:hover {
    border-color: #cbd5e1;
    color: #0f172a;
  }

  .filter-btn.active {
    background: #eff6ff;
    border-color: #2563eb;
    color: #2563eb;
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

  /* Results Info */
  .results-info {
    color: #64748b;
    font-size: 0.875rem;
    margin-bottom: 16px;
  }

  /* Table */
  .contactos-table-wrapper {
    background: white;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
  }

  .contactos-table {
    width: 100%;
    border-collapse: collapse;
  }

  .contactos-table th {
    text-align: left;
    padding: 14px 16px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
  }

  .contactos-table td {
    padding: 14px 16px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
  }

  .contactos-table tr:last-child td {
    border-bottom: none;
  }

  .contactos-table tr:hover {
    background: #f8fafc;
  }

  /* Favorite button */
  .fav-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .star-filled {
    color: #f59e0b;
  }

  .star-empty {
    color: #cbd5e1;
  }

  .fav-btn:hover .star-empty {
    color: #f59e0b;
  }

  /* Contact cell */
  .contacto-cell {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .contacto-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
  }

  .contacto-avatar.placeholder {
    background: linear-gradient(135deg, #2563eb, #3b82f6);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
    font-weight: 600;
  }

  .contacto-info {
    display: flex;
    flex-direction: column;
  }

  .contacto-nombre {
    font-weight: 500;
    color: #0f172a;
  }

  .contacto-cargo {
    font-size: 0.8rem;
    color: #64748b;
  }

  /* Tipos badges */
  .tipos-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .tipo-badge {
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  /* Contact links */
  .contact-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #64748b;
    text-decoration: none;
    font-size: 0.875rem;
    transition: color 0.15s;
  }

  .contact-link:hover {
    color: #2563eb;
  }

  .empresa-text {
    color: #64748b;
    font-size: 0.875rem;
  }

  /* Delete button */
  .delete-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px;
    color: #94a3b8;
    border-radius: 6px;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .delete-btn:hover {
    background: #fef2f2;
    color: #dc2626;
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

  /* Pagination */
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    margin-top: 24px;
  }

  .pagination-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.875rem;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s;
  }

  .pagination-btn:hover:not(:disabled) {
    border-color: #2563eb;
    color: #2563eb;
  }

  .pagination-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .pagination-info {
    font-size: 0.875rem;
    color: #64748b;
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
  }

  .modal-content {
    background: white;
    border-radius: 16px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
  }

  .modal-content h3 {
    margin: 0 0 12px 0;
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

  /* Primary button */
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

  /* Form Modal */
  .modal-form {
    max-width: 520px;
  }

  .modal-form h3 {
    margin-bottom: 20px;
  }

  .form-row {
    display: flex;
    gap: 16px;
    margin-bottom: 16px;
  }

  .form-row .form-group {
    flex: 1;
    margin-bottom: 0;
  }

  .form-group {
    margin-bottom: 16px;
  }

  .form-group label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 6px;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.9rem;
    transition: all 0.2s;
    background: white;
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

  .form-group input::placeholder,
  .form-group textarea::placeholder {
    color: #94a3b8;
  }

  /* Clickable row */
  .contacto-row {
    cursor: pointer;
    transition: background 0.15s;
  }

  .contacto-row:hover {
    background: #f8fafc;
  }

  /* Row actions */
  .row-actions {
    display: flex;
    gap: 4px;
  }

  .action-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px;
    color: #94a3b8;
    border-radius: 6px;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .action-btn.view-btn:hover {
    background: #eff6ff;
    color: #2563eb;
  }

  .action-btn.delete-btn:hover {
    background: #fef2f2;
    color: #dc2626;
  }
`;
