/**
 * CrmClicConnect - Gestión de usuarios Connect
 * 
 * Los usuarios Connect son usuarios normales con rol "connect".
 * Esta página filtra y muestra solo usuarios con ese rol.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import {
  getUsuariosTenant,
  getRolesTenant,
  UsuarioTenant,
  RolTenant,
  assignRoleToUser,
  unassignRoleFromUser,
} from '../../services/api';

// Iconos SVG como funciones que retornan JSX
const Icons = {
  search: (props?: any) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  user: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  link: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M10 13C10.4295 13.5741 10.9774 14.0491 11.6066 14.3929C12.2357 14.7367 12.9315 14.9411 13.6467 14.9923C14.3618 15.0435 15.0796 14.9403 15.7513 14.6897C16.4231 14.4392 17.0331 14.047 17.54 13.54L20.54 10.54C21.4508 9.59695 21.9548 8.33394 21.9434 7.02296C21.932 5.71198 21.4061 4.45791 20.4791 3.53087C19.5521 2.60383 18.298 2.07799 16.987 2.0666C15.676 2.0552 14.413 2.55918 13.47 3.47L11.75 5.18"/>
      <path d="M14 11C13.5705 10.4259 13.0226 9.95087 12.3934 9.60707C11.7643 9.26327 11.0685 9.05886 10.3533 9.00766C9.63821 8.95645 8.92038 9.05972 8.24863 9.31026C7.57688 9.5608 6.96691 9.95303 6.46 10.46L3.46 13.46C2.54918 14.403 2.04519 15.6661 2.05659 16.977C2.06798 18.288 2.59382 19.5421 3.52086 20.4691C4.44791 21.3962 5.70198 21.922 7.01296 21.9334C8.32394 21.9448 9.58705 21.4408 10.53 20.53L12.24 18.82"/>
    </svg>
  ),
  arrowLeft: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
  loader: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <line x1="12" y1="2" x2="12" y2="6"/>
      <line x1="12" y1="18" x2="12" y2="22"/>
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
      <line x1="2" y1="12" x2="6" y2="12"/>
      <line x1="18" y1="12" x2="22" y2="12"/>
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
    </svg>
  ),
};

export default function CrmClicConnect() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { tenantActual, isTenantAdmin } = useAuth();
  const { getToken } = useClerkAuth();
  const { setPageHeader } = usePageHeader();
  const navigate = useNavigate();

  const [usuarios, setUsuarios] = useState<UsuarioTenant[]>([]);
  const [roles, setRoles] = useState<RolTenant[]>([]);
  const [connectRol, setConnectRol] = useState<RolTenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    if (!tenantActual?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      
      // Cargar usuarios y roles
      const [usuariosData, rolesData] = await Promise.all([
        getUsuariosTenant(tenantActual.id, token),
        getRolesTenant(tenantActual.id, token || undefined),
      ]);

      // Encontrar el rol "connect"
      const connectRolFound = rolesData.find(r => r.codigo === 'connect');
      setConnectRol(connectRolFound || null);

      // Filtrar usuarios con rol connect
      const usuariosConnect = usuariosData.filter(u => 
        u.roles.some(r => r.codigo === 'connect')
      );

      setUsuarios(usuariosConnect);
      setRoles(rolesData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar usuarios Connect');
      console.error('Error cargando usuarios Connect:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantActual?.id, getToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPageHeader({
      title: 'CLIC Connect',
      subtitle: 'Red de usuarios externos con acceso al CRM e inventario',
      actions: (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => navigate(`/crm/${tenantSlug}/clic-connect/solicitudes`)}
            className="btn-secondary"
          >
            Solicitudes
          </button>
          <button
            onClick={() => navigate(`/crm/${tenantSlug}/clic-connect/upgrade-requests`)}
            className="btn-secondary"
          >
            Solicitudes de Upgrade
          </button>
          <button
            onClick={() => navigate(`/crm/${tenantSlug}/usuarios?rol=connect`)}
            className="btn-primary"
          >
            <Icons.user />
            Gestionar Usuarios
          </button>
        </div>
      ),
    });
  }, [setPageHeader, tenantSlug, navigate]);

  const handleRevertToUser = async (usuario: UsuarioTenant) => {
    if (!connectRol || !tenantActual?.id) return;
    
    if (!confirm(`¿Estás seguro de revertir a ${usuario.nombre || usuario.email} a usuario normal del tenant?`)) {
      return;
    }

    try {
      const token = await getToken();
      await unassignRoleFromUser(usuario.id, connectRol.id, tenantActual.id, token || undefined);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al revertir usuario');
    }
  };

  const filteredUsuarios = usuarios.filter((u) => {
    const searchLower = search.toLowerCase();
    return (
      u.nombre?.toLowerCase().includes(searchLower) ||
      u.apellido?.toLowerCase().includes(searchLower) ||
      u.email.toLowerCase().includes(searchLower)
    );
  });

  const stats = {
    total: usuarios.length,
    activos: usuarios.filter((u) => u.activo).length,
  };

  if (loading) {
    return (
      <div style={{ padding: '64px', textAlign: 'center' }}>
        <Icons.loader style={{ animation: 'spin 1s linear infinite', width: '32px', height: '32px', margin: '0 auto 16px' }} />
        <p>Cargando usuarios Connect...</p>
      </div>
    );
  }

  if (!connectRol) {
    return (
      <div style={{ padding: '64px', textAlign: 'center' }}>
        <p style={{ color: '#DC2626', marginBottom: '16px' }}>
          El rol "connect" no está configurado. Por favor, contacta al administrador.
        </p>
        <button
          onClick={() => navigate(`/crm/${tenantSlug}/usuarios`)}
          className="btn-primary"
        >
          Ir a Gestión de Usuarios
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      {error && (
        <div style={{ 
          padding: '12px 16px', 
          background: '#FEE2E2', 
          border: '1px solid #FECACA', 
          borderRadius: '8px',
          color: '#DC2626',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"/>
          </svg>
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{ 
          background: 'white', 
          border: '1px solid #E2E8F0', 
          borderRadius: '12px', 
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <Icons.user />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#0F172A', lineHeight: '1' }}>
              {stats.total}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748B', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Usuarios
            </div>
          </div>
        </div>
        <div style={{ 
          background: 'white', 
          border: '1px solid #E2E8F0', 
          borderRadius: '12px', 
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <Icons.user />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#0F172A', lineHeight: '1' }}>
              {stats.activos}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748B', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Activos
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ position: 'relative', maxWidth: '500px' }}>
          <span style={{ 
            position: 'absolute', 
            left: '16px', 
            top: '50%', 
            transform: 'translateY(-50%)',
            color: '#64748B'
          }}>
            <Icons.search />
          </span>
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px 12px 48px',
              background: 'white',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              fontSize: '0.9375rem',
            }}
          />
        </div>
      </div>

      {/* Users Table */}
      <div style={{ 
        background: 'white', 
        border: '1px solid #E2E8F0', 
        borderRadius: '12px', 
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
            <tr>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>
                Usuario
              </th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>
                Estado
              </th>
              <th style={{ padding: '16px', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredUsuarios.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: '64px 32px', textAlign: 'center', color: '#64748B' }}>
                  {search ? 'No se encontraron usuarios' : 'No hay usuarios Connect'}
                </td>
              </tr>
            ) : (
              filteredUsuarios.map((usuario) => (
                <tr key={usuario.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: '700',
                        fontSize: '1rem'
                      }}>
                        {usuario.nombre?.charAt(0) || usuario.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: '#0F172A', marginBottom: '4px' }}>
                          {usuario.nombre && usuario.apellido 
                            ? `${usuario.nombre} ${usuario.apellido}`
                            : usuario.nombre || usuario.email}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: '#64748B' }}>
                          {usuario.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      background: usuario.activo ? '#D1FAE5' : '#FEE2E2',
                      color: usuario.activo ? '#059669' : '#DC2626'
                    }}>
                      {usuario.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleRevertToUser(usuario)}
                      style={{
                        padding: '6px 12px',
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        color: '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = '#F1F5F9';
                        e.currentTarget.style.borderColor = '#CBD5E1';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = '#F8FAFC';
                        e.currentTarget.style.borderColor = '#E2E8F0';
                      }}
                    >
                      Revertir a Usuario
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
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
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);
        }
        .btn-secondary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: white;
          color: #475569;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-secondary:hover {
          background: #F8FAFC;
          border-color: #CBD5E1;
        }
      `}</style>
    </div>
  );
}
