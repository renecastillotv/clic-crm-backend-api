/**
 * AdminUsage - Dashboard de Uso de Tenants
 *
 * Muestra el uso de recursos de todos los tenants, costos calculados
 * y estado de cuenta para facturación.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import {
  getResumenUsoTodos,
  getTiposMembresia,
  ResumenUsoTenant,
  TipoMembresia,
} from '../../services/api';

// Iconos SVG
const IconUsers = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13M16 3.13C16.8604 3.3503 17.623 3.8507 18.1676 4.55231C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconBuilding = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 21H21M5 21V7L12 3L19 7V21M9 21V15H15V21M9 9V11M15 9V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconDollar = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2V22M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconAlert = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64547 18.3024 1.55311 18.6453 1.552 19C1.55089 19.3547 1.64105 19.6983 1.81377 19.9999C1.98649 20.3015 2.23616 20.5498 2.53752 20.7183C2.83887 20.8868 3.18067 20.9693 3.53 20.96H20.47C20.8193 20.9693 21.1611 20.8868 21.4625 20.7183C21.7638 20.5498 22.0135 20.3015 22.1862 19.9999C22.359 19.6983 22.4491 19.3547 22.448 19C22.4469 18.6453 22.3545 18.3024 22.18 18L13.71 3.86C13.5319 3.56609 13.2808 3.32312 12.9813 3.15447C12.6818 2.98582 12.3437 2.89726 12 2.89726C11.6563 2.89726 11.3182 2.98582 11.0187 3.15447C10.7192 3.32312 10.4681 3.56609 10.29 3.86Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const estadoCuentaLabels: Record<string, { label: string; color: string; bg: string }> = {
  al_dia: { label: 'Al Día', color: '#059669', bg: '#ECFDF5' },
  por_vencer: { label: 'Por Vencer', color: '#D97706', bg: '#FEF3C7' },
  vencido: { label: 'Vencido', color: '#DC2626', bg: '#FEE2E2' },
  suspendido: { label: 'Suspendido', color: '#7C3AED', bg: '#F3E8FF' },
};

export default function AdminUsage() {
  const { getToken } = useAuth();
  const [usageData, setUsageData] = useState<ResumenUsoTenant[]>([]);
  const [tiposMembresia, setTiposMembresia] = useState<TipoMembresia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [filtroMembresia, setFiltroMembresia] = useState<string>('');
  const [busqueda, setBusqueda] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [filtroEstado, filtroMembresia]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }

      const [usoData, membresiaData] = await Promise.all([
        getResumenUsoTodos(
          {
            estado_cuenta: filtroEstado || undefined,
            tipo_membresia_id: filtroMembresia || undefined,
          },
          token
        ),
        getTiposMembresia(false, token),
      ]);

      setUsageData(usoData);
      setTiposMembresia(membresiaData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos de uso');
      console.error('Error cargando datos de uso:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar por búsqueda local
  const filteredData = usageData.filter((item) =>
    busqueda
      ? item.tenant_nombre.toLowerCase().includes(busqueda.toLowerCase())
      : true
  );

  // Calcular estadísticas
  const stats = {
    totalTenants: filteredData.length,
    totalUsuarios: filteredData.reduce((acc, item) => acc + item.usuarios_activos, 0),
    totalPropiedades: filteredData.reduce((acc, item) => acc + item.propiedades_publicadas, 0),
    totalFacturacion: filteredData.reduce((acc, item) => acc + item.costo_total_periodo, 0),
    tenantsVencidos: filteredData.filter((item) => item.estado_cuenta === 'vencido' || item.estado_cuenta === 'suspendido').length,
  };

  if (loading) {
    return (
      <div className="admin-usage-loading">
        <div className="loading-spinner"></div>
        <p>Cargando datos de uso...</p>
        <style>{`
          .admin-usage-loading {
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
    <div className="admin-usage">
      <div className="page-header">
        <div>
          <h1>Uso y Facturación</h1>
          <p className="page-subtitle">
            Monitorea el uso de recursos y costos de todos los tenants
          </p>
        </div>
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
            <IconBuilding />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalTenants}</div>
            <div className="stat-label">Tenants</div>
          </div>
        </div>
        <div className="stat-card stat-green">
          <div className="stat-icon">
            <IconUsers />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalUsuarios}</div>
            <div className="stat-label">Usuarios Activos</div>
          </div>
        </div>
        <div className="stat-card stat-purple">
          <div className="stat-icon">
            <IconBuilding />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalPropiedades}</div>
            <div className="stat-label">Propiedades Publicadas</div>
          </div>
        </div>
        <div className="stat-card stat-orange">
          <div className="stat-icon">
            <IconDollar />
          </div>
          <div className="stat-content">
            <div className="stat-value">${stats.totalFacturacion.toFixed(2)}</div>
            <div className="stat-label">Facturación Proyectada</div>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {stats.tenantsVencidos > 0 && (
        <div className="alert-box alert-warning">
          <div className="alert-icon">
            <IconAlert />
          </div>
          <div className="alert-content">
            <p className="alert-title">Atención: Tenants con pagos pendientes</p>
            <p className="alert-text">
              Hay <strong>{stats.tenantsVencidos}</strong> tenant(s) con estado de cuenta vencido o suspendido.
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="filters-bar">
        <div className="search-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar tenant..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="filter-select"
        >
          <option value="">Todos los estados</option>
          <option value="al_dia">Al Día</option>
          <option value="por_vencer">Por Vencer</option>
          <option value="vencido">Vencido</option>
          <option value="suspendido">Suspendido</option>
        </select>

        <select
          value={filtroMembresia}
          onChange={(e) => setFiltroMembresia(e.target.value)}
          className="filter-select"
        >
          <option value="">Todas las membresías</option>
          {tiposMembresia.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Tabla de Uso */}
      {filteredData.length === 0 ? (
        <div className="empty-state">
          <p>No hay tenants que coincidan con los filtros</p>
        </div>
      ) : (
        <div className="usage-table-container">
          <table className="usage-table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Membresía</th>
                <th>Estado</th>
                <th className="text-center">Usuarios</th>
                <th className="text-center">Propiedades</th>
                <th className="text-right">Costo Período</th>
                <th className="text-center">Período</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item) => {
                const estadoInfo = estadoCuentaLabels[item.estado_cuenta] || estadoCuentaLabels.al_dia;

                return (
                  <tr key={item.tenant_id}>
                    <td>
                      <div className="tenant-cell">
                        <span className="tenant-name">{item.tenant_nombre}</span>
                      </div>
                    </td>
                    <td>
                      {item.tipo_membresia_nombre ? (
                        <span className="membership-badge">{item.tipo_membresia_nombre}</span>
                      ) : (
                        <span className="no-membership">Sin membresía</span>
                      )}
                    </td>
                    <td>
                      <span
                        className="status-badge"
                        style={{ backgroundColor: estadoInfo.bg, color: estadoInfo.color }}
                      >
                        {estadoInfo.label}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className="number-cell">{item.usuarios_activos}</span>
                    </td>
                    <td className="text-center">
                      <span className="number-cell">{item.propiedades_publicadas}</span>
                    </td>
                    <td className="text-right">
                      <span className="money-cell">${item.costo_total_periodo.toFixed(2)}</span>
                    </td>
                    <td className="text-center">
                      <span className="period-cell">
                        {new Date(item.periodo_inicio).toLocaleDateString()} -<br />
                        {new Date(item.periodo_fin).toLocaleDateString()}
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`/admin/tenants/${item.tenant_id}/edit`}
                        className="action-link"
                      >
                        Ver Detalle
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .admin-usage {
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
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: all 0.2s;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
        }

        .stat-card:hover {
          transform: translateY(-4px);
          border-color: #CBD5E1;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
        }

        .stat-icon {
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          flex-shrink: 0;
          color: white;
        }

        .stat-blue .stat-icon { background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); }
        .stat-green .stat-icon { background: linear-gradient(135deg, #10B981 0%, #059669 100%); }
        .stat-purple .stat-icon { background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); }
        .stat-orange .stat-icon { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); }

        .stat-content { flex: 1; }
        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: #0F172A;
          line-height: 1;
          margin-bottom: 4px;
          letter-spacing: -0.03em;
        }
        .stat-label {
          font-size: 0.8125rem;
          color: #64748B;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .alert-box {
          border-radius: 14px;
          padding: 20px 24px;
          margin-bottom: 24px;
          display: flex;
          gap: 16px;
        }

        .alert-warning {
          background: #FEF3C7;
          border: 1px solid #FDE68A;
        }

        .alert-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #D97706;
          flex-shrink: 0;
        }

        .alert-content { flex: 1; }
        .alert-title {
          font-weight: 700;
          color: #92400E;
          margin: 0 0 4px 0;
          font-size: 0.9375rem;
        }
        .alert-text {
          color: #B45309;
          font-size: 0.875rem;
          margin: 0;
        }

        .filters-bar {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .search-box {
          flex: 1;
          min-width: 250px;
          max-width: 400px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          transition: all 0.2s;
        }

        .search-box:focus-within {
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .search-box svg {
          color: #94A3B8;
          flex-shrink: 0;
        }

        .search-box input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.9375rem;
          color: #0F172A;
        }

        .search-box input::placeholder {
          color: #94A3B8;
        }

        .filter-select {
          padding: 12px 16px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          color: #0F172A;
          font-size: 0.9375rem;
          cursor: pointer;
          min-width: 180px;
          transition: all 0.2s;
        }

        .filter-select:focus {
          outline: none;
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .empty-state {
          text-align: center;
          padding: 48px 32px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          color: #64748B;
        }

        .usage-table-container {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          overflow: hidden;
        }

        .usage-table {
          width: 100%;
          border-collapse: collapse;
        }

        .usage-table th {
          padding: 16px 20px;
          background: #F8FAFC;
          border-bottom: 1px solid #E2E8F0;
          font-size: 0.75rem;
          font-weight: 700;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          text-align: left;
        }

        .usage-table td {
          padding: 16px 20px;
          border-bottom: 1px solid #F1F5F9;
          font-size: 0.9375rem;
          color: #0F172A;
        }

        .usage-table tr:last-child td {
          border-bottom: none;
        }

        .usage-table tr:hover td {
          background: #F8FAFC;
        }

        .text-center { text-align: center; }
        .text-right { text-align: right; }

        .tenant-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .tenant-name {
          font-weight: 600;
          color: #0F172A;
        }

        .membership-badge {
          display: inline-block;
          padding: 4px 10px;
          background: #EFF6FF;
          color: #2563EB;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .no-membership {
          color: #94A3B8;
          font-size: 0.875rem;
        }

        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .number-cell {
          font-weight: 600;
          font-size: 1rem;
        }

        .money-cell {
          font-weight: 700;
          color: #059669;
          font-size: 1rem;
        }

        .period-cell {
          font-size: 0.75rem;
          color: #64748B;
          line-height: 1.4;
        }

        .action-link {
          color: #2563EB;
          text-decoration: none;
          font-weight: 500;
          font-size: 0.875rem;
          transition: color 0.2s;
        }

        .action-link:hover {
          color: #1D4ED8;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
