/**
 * AdminMemberships - Gestión de Tipos de Membresía
 *
 * Panel para administrar los tipos de membresía, precios base, límites
 * y costos adicionales por usuarios/propiedades.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  getTiposMembresia,
  createTipoMembresia,
  updateTipoMembresia,
  deleteTipoMembresia,
  TipoMembresia,
  CreateTipoMembresiaData,
  UpdateTipoMembresiaData,
} from '../../services/api';

// Iconos SVG
const IconCrown = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 20H22M4 17L2 7L7 10L12 4L17 10L22 7L20 17H4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconUsers = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13M16 3.13C16.8604 3.3503 17.623 3.8507 18.1676 4.55231C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconBuilding = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 21H21M5 21V7L12 3L19 7V21M9 21V15H15V21M9 9V11M15 9V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconDollar = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2V22M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconEdit = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18.5 2.50023C18.8978 2.10243 19.4374 1.87891 20 1.87891C20.5626 1.87891 21.1022 2.10243 21.5 2.50023C21.8978 2.89804 22.1213 3.43762 22.1213 4.00023C22.1213 4.56284 21.8978 5.10243 21.5 5.50023L12 15.0002L8 16.0002L9 12.0002L18.5 2.50023Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconTrash = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 6H5H21M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconInfo = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 16V12M12 8H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const cicloLabels: Record<string, string> = {
  mensual: 'Mensual',
  trimestral: 'Trimestral',
  anual: 'Anual',
};

export default function AdminMemberships() {
  const { getToken } = useAuth();
  const [memberships, setMemberships] = useState<TipoMembresia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMembership, setEditingMembership] = useState<TipoMembresia | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    loadMemberships();
  }, [showInactive]);

  const loadMemberships = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      const data = await getTiposMembresia(showInactive, token);
      setMemberships(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar tipos de membresía');
      console.error('Error cargando membresías:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (membership: TipoMembresia) => {
    setEditingMembership(membership);
  };

  const handleDelete = async (membership: TipoMembresia) => {
    if (!confirm(`¿Estás seguro de desactivar la membresía "${membership.nombre}"?`)) {
      return;
    }
    try {
      const token = await getToken();
      await deleteTipoMembresia(membership.id, token);
      loadMemberships();
    } catch (err: any) {
      alert(err.message || 'Error al desactivar membresía');
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingMembership(null);
  };

  const handleSaved = () => {
    handleCloseModal();
    loadMemberships();
  };

  const stats = {
    total: memberships.length,
    activos: memberships.filter((m) => m.activo).length,
    totalUsuarios: memberships.reduce((acc, m) => acc + m.usuarios_incluidos, 0),
    precioPromedio: memberships.length > 0
      ? memberships.reduce((acc, m) => acc + Number(m.precio_base), 0) / memberships.length
      : 0,
  };

  if (loading) {
    return (
      <div className="admin-memberships-loading">
        <div className="loading-spinner"></div>
        <p>Cargando tipos de membresía...</p>
        <style>{`
          .admin-memberships-loading {
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
    <div className="admin-memberships">
      <div className="page-header">
        <div>
          <h1>Tipos de Membresía</h1>
          <p className="page-subtitle">
            Gestiona los planes de membresía, precios y límites de recursos
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <span className="btn-icon">+</span>
          Nueva Membresía
        </button>
      </div>

      {error && (
        <div className="error-message">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card stat-blue">
          <div className="stat-icon">
            <IconCrown />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Membresías</div>
          </div>
        </div>
        <div className="stat-card stat-green">
          <div className="stat-icon">
            <IconUsers />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.activos}</div>
            <div className="stat-label">Activas</div>
          </div>
        </div>
        <div className="stat-card stat-purple">
          <div className="stat-icon">
            <IconBuilding />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalUsuarios}</div>
            <div className="stat-label">Usuarios Incluidos</div>
          </div>
        </div>
        <div className="stat-card stat-orange">
          <div className="stat-icon">
            <IconDollar />
          </div>
          <div className="stat-content">
            <div className="stat-value">${stats.precioPromedio.toFixed(2)}</div>
            <div className="stat-label">Precio Promedio</div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="info-box">
        <div className="info-icon">
          <IconInfo />
        </div>
        <div className="info-content">
          <p className="info-title">Sistema de Membresías</p>
          <p className="info-text">
            Cada membresía define el <strong>precio base</strong>, la cantidad de <strong>usuarios y propiedades incluidas</strong>,
            y el <strong>costo adicional</strong> por recursos extra. Los tenants pueden tener límites personalizados
            que sobreescriben los valores de la membresía.
          </p>
        </div>
      </div>

      {/* Filtro de inactivos */}
      <div className="filter-bar">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          <span>Mostrar inactivas</span>
        </label>
      </div>

      {/* Memberships Grid */}
      {memberships.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <IconCrown />
          </div>
          <h3>No hay tipos de membresía</h3>
          <p>Crea tu primer tipo de membresía para comenzar</p>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            Crear Membresía
          </button>
        </div>
      ) : (
        <div className="memberships-grid">
          {memberships.map((membership) => (
            <div key={membership.id} className={`membership-card ${!membership.activo ? 'inactive' : ''}`}>
              <div className="membership-card-header">
                <div className="membership-header-left">
                  <div className="membership-icon">
                    <IconCrown />
                  </div>
                  <div>
                    <h3 className="membership-name">{membership.nombre}</h3>
                    <span className="membership-code">{membership.codigo}</span>
                  </div>
                </div>
                <div className="membership-actions">
                  <button
                    onClick={() => handleEdit(membership)}
                    className="action-btn"
                    title="Editar"
                  >
                    <IconEdit />
                  </button>
                  {membership.activo && (
                    <button
                      onClick={() => handleDelete(membership)}
                      className="action-btn action-btn-danger"
                      title="Desactivar"
                    >
                      <IconTrash />
                    </button>
                  )}
                </div>
              </div>

              {membership.descripcion && (
                <p className="membership-description">{membership.descripcion}</p>
              )}

              <div className="membership-price">
                <span className="price-value">${Number(membership.precio_base).toFixed(2)}</span>
                <span className="price-cycle">/{cicloLabels[membership.ciclo_facturacion] || membership.ciclo_facturacion}</span>
              </div>

              <div className="membership-details">
                <div className="detail-row">
                  <span className="detail-label">Usuarios incluidos:</span>
                  <span className="detail-value">{membership.usuarios_incluidos === -1 ? 'Ilimitados' : membership.usuarios_incluidos}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Propiedades incluidas:</span>
                  <span className="detail-value">{membership.propiedades_incluidas === -1 ? 'Ilimitadas' : membership.propiedades_incluidas}</span>
                </div>
                <div className="detail-row detail-row-highlight">
                  <span className="detail-label">Costo usuario extra:</span>
                  <span className="detail-value">${Number(membership.costo_usuario_adicional).toFixed(2)}</span>
                </div>
                <div className="detail-row detail-row-highlight">
                  <span className="detail-label">Costo propiedad extra:</span>
                  <span className="detail-value">${Number(membership.costo_propiedad_adicional).toFixed(4)}</span>
                </div>
              </div>

              <div className="membership-features">
                {membership.permite_pagina_web && (
                  <span className="feature-badge feature-badge-green">Página Web</span>
                )}
                {membership.permite_subtenants && (
                  <span className="feature-badge feature-badge-purple">Subtenants</span>
                )}
                {membership.es_individual && (
                  <span className="feature-badge feature-badge-orange">Individual</span>
                )}
                {!membership.activo && (
                  <span className="feature-badge feature-badge-red">Inactiva</span>
                )}
              </div>

              {membership.tenants_count !== undefined && (
                <div className="membership-footer">
                  <span className="tenants-count">{membership.tenants_count} tenants asignados</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingMembership) && (
        <MembershipModal
          membership={editingMembership}
          onClose={handleCloseModal}
          onSaved={handleSaved}
        />
      )}

      <style>{`
        .admin-memberships {
          width: 100%;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
        }

        .page-header h1 {
          font-size: 2.25rem;
          font-weight: 700;
          color: #0F172A;
          margin: 0 0 8px 0;
          letter-spacing: -0.02em;
        }

        .page-subtitle {
          color: #64748B;
          font-size: 1rem;
          margin: 0;
          font-weight: 400;
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          color: white;
          border: none;
          border-radius: 12px;
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
        }

        .error-message {
          padding: 16px 20px;
          background: #FEE2E2;
          border: 1px solid #FECACA;
          border-radius: 12px;
          color: #DC2626;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 500;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 28px;
          display: flex;
          align-items: center;
          gap: 20px;
          transition: all 0.2s;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
        }

        .stat-card:hover {
          transform: translateY(-4px);
          border-color: #CBD5E1;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
        }

        .stat-icon {
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          flex-shrink: 0;
          color: white;
        }

        .stat-blue .stat-icon { background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); }
        .stat-green .stat-icon { background: linear-gradient(135deg, #10B981 0%, #059669 100%); }
        .stat-purple .stat-icon { background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); }
        .stat-orange .stat-icon { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); }

        .stat-content { flex: 1; }
        .stat-value {
          font-size: 2.5rem;
          font-weight: 700;
          color: #0F172A;
          line-height: 1;
          margin-bottom: 8px;
          letter-spacing: -0.03em;
        }
        .stat-label {
          font-size: 0.875rem;
          color: #64748B;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .info-box {
          background: #EFF6FF;
          border: 1px solid #DBEAFE;
          border-radius: 14px;
          padding: 24px;
          margin-bottom: 24px;
          display: flex;
          gap: 16px;
        }

        .info-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2563EB;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .info-content { flex: 1; }
        .info-title {
          font-weight: 700;
          color: #0F172A;
          margin: 0 0 8px 0;
          font-size: 1rem;
        }
        .info-text {
          color: #475569;
          font-size: 0.9375rem;
          line-height: 1.6;
          margin: 0;
        }
        .info-text strong {
          color: #0F172A;
          font-weight: 700;
        }

        .filter-bar {
          margin-bottom: 24px;
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 0.9375rem;
          color: #475569;
        }

        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #2563EB;
        }

        .memberships-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 24px;
        }

        .membership-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 24px;
          transition: all 0.2s;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
        }

        .membership-card:hover {
          transform: translateY(-2px);
          border-color: #CBD5E1;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        }

        .membership-card.inactive {
          opacity: 0.7;
          background: #F8FAFC;
        }

        .membership-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .membership-header-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .membership-icon {
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
          border-radius: 12px;
          color: white;
          flex-shrink: 0;
        }

        .membership-name {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0F172A;
          margin: 0 0 4px 0;
        }

        .membership-code {
          display: inline-block;
          padding: 4px 10px;
          background: #F1F5F9;
          color: #64748B;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          font-family: monospace;
        }

        .membership-actions {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          padding: 8px;
          background: transparent;
          border: none;
          color: #64748B;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .action-btn:hover {
          background: #F1F5F9;
          color: #2563EB;
        }

        .action-btn-danger:hover {
          background: #FEE2E2;
          color: #DC2626;
        }

        .membership-description {
          color: #475569;
          font-size: 0.875rem;
          line-height: 1.5;
          margin: 0 0 16px 0;
        }

        .membership-price {
          background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 16px;
          display: flex;
          align-items: baseline;
          gap: 4px;
        }

        .price-value {
          font-size: 2rem;
          font-weight: 700;
          color: #2563EB;
        }

        .price-cycle {
          font-size: 0.9375rem;
          color: #64748B;
          font-weight: 500;
        }

        .membership-details {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 16px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.875rem;
        }

        .detail-row-highlight {
          background: #F8FAFC;
          padding: 8px 12px;
          margin: 0 -12px;
          border-radius: 8px;
        }

        .detail-label {
          color: #64748B;
          font-weight: 500;
        }

        .detail-value {
          color: #0F172A;
          font-weight: 600;
        }

        .membership-features {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }

        .feature-badge {
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .feature-badge-green {
          background: #ECFDF5;
          color: #059669;
        }

        .feature-badge-purple {
          background: #F3E8FF;
          color: #7C3AED;
        }

        .feature-badge-orange {
          background: #FEF3C7;
          color: #D97706;
        }

        .feature-badge-red {
          background: #FEE2E2;
          color: #DC2626;
        }

        .membership-footer {
          padding-top: 16px;
          border-top: 1px solid #E2E8F0;
        }

        .tenants-count {
          font-size: 0.875rem;
          color: #64748B;
          font-weight: 500;
        }

        .empty-state {
          text-align: center;
          padding: 64px 32px;
          background: #FFFFFF;
          border: 2px dashed #CBD5E1;
          border-radius: 16px;
        }

        .empty-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #CBD5E1;
        }

        .empty-state h3 {
          color: #0F172A;
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 8px 0;
        }

        .empty-state p {
          color: #64748B;
          margin: 0 0 24px 0;
          font-size: 0.9375rem;
        }
      `}</style>
    </div>
  );
}

/**
 * Modal para crear/editar membresías
 */
function MembershipModal({
  membership,
  onClose,
  onSaved,
}: {
  membership: TipoMembresia | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { getToken } = useAuth();
  const [formData, setFormData] = useState<CreateTipoMembresiaData>({
    codigo: membership?.codigo || '',
    nombre: membership?.nombre || '',
    descripcion: membership?.descripcion || '',
    precio_base: membership?.precio_base || 0,
    moneda: membership?.moneda || 'USD',
    ciclo_facturacion: membership?.ciclo_facturacion || 'mensual',
    usuarios_incluidos: membership?.usuarios_incluidos || 1,
    propiedades_incluidas: membership?.propiedades_incluidas || 0,
    costo_usuario_adicional: membership?.costo_usuario_adicional || 0,
    costo_propiedad_adicional: membership?.costo_propiedad_adicional || 0,
    permite_pagina_web: membership?.permite_pagina_web || false,
    permite_subtenants: membership?.permite_subtenants || false,
    es_individual: membership?.es_individual || false,
    orden: membership?.orden || 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.codigo.trim() || !formData.nombre.trim()) {
      setError('Código y nombre son requeridos');
      return;
    }
    if (formData.precio_base < 0) {
      setError('El precio base no puede ser negativo');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }

      if (membership) {
        const updateData: UpdateTipoMembresiaData = { ...formData };
        delete (updateData as any).codigo; // No se puede cambiar el código
        await updateTipoMembresia(membership.id, updateData, token);
      } else {
        await createTipoMembresia(formData, token);
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Error al guardar membresía');
      console.error('Error guardando membresía:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">
          {membership ? 'Editar Membresía' : 'Crear Nueva Membresía'}
        </h2>

        {error && (
          <div className="error-message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label>Código *</label>
              <input
                type="text"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                placeholder="ej: tenant-base"
                required
                disabled={!!membership}
              />
            </div>
            <div className="form-group">
              <label>Nombre *</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="ej: Tenant Base"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Descripción</label>
            <textarea
              value={formData.descripcion || ''}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              rows={2}
              placeholder="Descripción del plan de membresía..."
            />
          </div>

          <div className="form-section-title">Precios</div>
          <div className="form-row form-row-3">
            <div className="form-group">
              <label>Precio Base *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.precio_base}
                onChange={(e) => setFormData({ ...formData, precio_base: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="form-group">
              <label>Moneda</label>
              <select
                value={formData.moneda}
                onChange={(e) => setFormData({ ...formData, moneda: e.target.value })}
              >
                <option value="USD">USD</option>
                <option value="MXN">MXN</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div className="form-group">
              <label>Ciclo</label>
              <select
                value={formData.ciclo_facturacion}
                onChange={(e) => setFormData({ ...formData, ciclo_facturacion: e.target.value })}
              >
                <option value="mensual">Mensual</option>
                <option value="trimestral">Trimestral</option>
                <option value="anual">Anual</option>
              </select>
            </div>
          </div>

          <div className="form-section-title">Recursos Incluidos</div>
          <div className="form-row">
            <div className="form-group">
              <label>Usuarios Incluidos</label>
              <input
                type="number"
                min="-1"
                value={formData.usuarios_incluidos}
                onChange={(e) => setFormData({ ...formData, usuarios_incluidos: parseInt(e.target.value) || 0 })}
              />
              <span className="form-hint">-1 para ilimitados</span>
            </div>
            <div className="form-group">
              <label>Propiedades Incluidas</label>
              <input
                type="number"
                min="-1"
                value={formData.propiedades_incluidas}
                onChange={(e) => setFormData({ ...formData, propiedades_incluidas: parseInt(e.target.value) || 0 })}
              />
              <span className="form-hint">-1 para ilimitadas</span>
            </div>
          </div>

          <div className="form-section-title">Costos Adicionales</div>
          <div className="form-row">
            <div className="form-group">
              <label>Costo Usuario Extra</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.costo_usuario_adicional}
                onChange={(e) => setFormData({ ...formData, costo_usuario_adicional: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group">
              <label>Costo Propiedad Extra</label>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={formData.costo_propiedad_adicional}
                onChange={(e) => setFormData({ ...formData, costo_propiedad_adicional: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="form-section-title">Opciones</div>
          <div className="form-row-checkboxes">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.permite_pagina_web}
                onChange={(e) => setFormData({ ...formData, permite_pagina_web: e.target.checked })}
              />
              <span>Permite Página Web</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.permite_subtenants}
                onChange={(e) => setFormData({ ...formData, permite_subtenants: e.target.checked })}
              />
              <span>Permite Subtenants</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.es_individual}
                onChange={(e) => setFormData({ ...formData, es_individual: e.target.checked })}
              />
              <span>Es Individual</span>
            </label>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Guardando...' : membership ? 'Guardar Cambios' : 'Crear Membresía'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 20px;
          padding: 32px;
          width: 100%;
          max-width: 700px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
        }

        .modal-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #0F172A;
          margin: 0 0 24px 0;
          letter-spacing: -0.01em;
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-section-title {
          font-size: 0.875rem;
          font-weight: 700;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 8px;
          padding-bottom: 8px;
          border-bottom: 1px solid #E2E8F0;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #0F172A;
        }

        .form-group input,
        .form-group textarea,
        .form-group select {
          padding: 12px 16px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          color: #0F172A;
          font-size: 0.9375rem;
          transition: all 0.2s;
        }

        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .form-group input:disabled {
          background: #F1F5F9;
          color: #64748B;
          cursor: not-allowed;
        }

        .form-group textarea {
          resize: vertical;
          min-height: 60px;
        }

        .form-hint {
          font-size: 0.75rem;
          color: #64748B;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-row-3 {
          grid-template-columns: 1fr 1fr 1fr;
        }

        .form-row-checkboxes {
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #2563EB;
        }

        .checkbox-label span {
          color: #0F172A;
          font-size: 0.9375rem;
          font-weight: 500;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          padding-top: 8px;
        }

        .btn-secondary {
          flex: 1;
          padding: 12px 24px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          color: #475569;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #F1F5F9;
          border-color: #CBD5E1;
        }

        .btn-secondary:disabled,
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .error-message {
          padding: 16px 20px;
          background: #FEE2E2;
          border: 1px solid #FECACA;
          border-radius: 12px;
          color: #DC2626;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 500;
        }

        .error-message svg {
          flex-shrink: 0;
          color: #EF4444;
        }
      `}</style>
    </div>
  );
}
