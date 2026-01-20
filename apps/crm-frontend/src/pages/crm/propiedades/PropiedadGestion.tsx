/**
 * PropiedadGestion - Tab Gestión
 * Muestra estadísticas, actividad reciente, agente asignado y configuración de publicación
 */

import { useState } from 'react';
import { Propiedad } from '../../../services/api';

interface Props {
  propiedadId: string;
  propiedad: Propiedad;
  onUpdate: (data: Partial<Propiedad>) => Promise<void>;
}

// Iconos SVG
const Icons = {
  user: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  eye: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  heart: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  phone: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  mail: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  calendar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  clock: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  trendingUp: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      <polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  activity: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  globe: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  star: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  toggle: (props: { checked: boolean }) => (
    <svg width="36" height="20" viewBox="0 0 36 20">
      <rect x="0" y="0" width="36" height="20" rx="10" fill={props.checked ? '#0057FF' : '#cbd5e1'}/>
      <circle cx={props.checked ? "26" : "10"} cy="10" r="7" fill="white"/>
    </svg>
  ),
};

// Datos simulados de estadísticas
const mockStats = {
  visitas: 342,
  favoritos: 28,
  consultas: 12,
  compartidos: 8,
};

// Datos simulados de actividad reciente
const mockActividad = [
  { id: 1, tipo: 'visita', descripcion: 'Nueva visita desde portal', fecha: '2024-01-15T10:30:00' },
  { id: 2, tipo: 'favorito', descripcion: 'Agregada a favoritos', fecha: '2024-01-14T16:45:00' },
  { id: 3, tipo: 'consulta', descripcion: 'Consulta recibida por WhatsApp', fecha: '2024-01-14T09:20:00' },
  { id: 4, tipo: 'actualizado', descripcion: 'Precio actualizado', fecha: '2024-01-12T14:15:00' },
  { id: 5, tipo: 'visita', descripcion: 'Nueva visita desde Google', fecha: '2024-01-11T11:00:00' },
];

export default function PropiedadGestion({ propiedadId, propiedad, onUpdate }: Props) {
  const [saving, setSaving] = useState(false);

  const toggleDestacada = async () => {
    setSaving(true);
    try {
      await onUpdate({ destacada: !propiedad.destacada });
    } finally {
      setSaving(false);
    }
  };

  const toggleExclusiva = async () => {
    setSaving(true);
    try {
      await onUpdate({ exclusiva: !propiedad.exclusiva });
    } finally {
      setSaving(false);
    }
  };

  const toggleActivo = async () => {
    setSaving(true);
    try {
      await onUpdate({ activo: !propiedad.activo });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'Hoy ' + date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Ayer ' + date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else if (days < 7) {
      return `Hace ${days} días`;
    } else {
      return formatDate(dateString);
    }
  };

  const getActivityIcon = (tipo: string) => {
    switch (tipo) {
      case 'visita': return Icons.eye;
      case 'favorito': return Icons.heart;
      case 'consulta': return Icons.mail;
      default: return Icons.activity;
    }
  };

  return (
    <div className="propiedad-gestion">
      <div className="gestion-grid">
        {/* Columna principal */}
        <div className="main-column">
          {/* Estadísticas */}
          <div className="section stats-section">
            <h3 className="section-title">
              {Icons.trendingUp}
              <span>Estadísticas</span>
            </h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon views">{Icons.eye}</div>
                <div className="stat-info">
                  <div className="stat-value">{mockStats.visitas}</div>
                  <div className="stat-label">Visitas</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon favorites">{Icons.heart}</div>
                <div className="stat-info">
                  <div className="stat-value">{mockStats.favoritos}</div>
                  <div className="stat-label">Favoritos</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon inquiries">{Icons.mail}</div>
                <div className="stat-info">
                  <div className="stat-value">{mockStats.consultas}</div>
                  <div className="stat-label">Consultas</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon shares">{Icons.globe}</div>
                <div className="stat-info">
                  <div className="stat-value">{mockStats.compartidos}</div>
                  <div className="stat-label">Compartidos</div>
                </div>
              </div>
            </div>
          </div>

          {/* Actividad reciente */}
          <div className="section">
            <h3 className="section-title">
              {Icons.activity}
              <span>Actividad reciente</span>
            </h3>
            <div className="activity-list">
              {mockActividad.map((item) => (
                <div key={item.id} className="activity-item">
                  <div className={`activity-icon ${item.tipo}`}>
                    {getActivityIcon(item.tipo)}
                  </div>
                  <div className="activity-content">
                    <div className="activity-text">{item.descripcion}</div>
                    <div className="activity-time">
                      {Icons.clock}
                      {formatDateTime(item.fecha)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn-view-all">Ver toda la actividad</button>
          </div>

          {/* Configuración de publicación */}
          <div className="section">
            <h3 className="section-title">
              {Icons.globe}
              <span>Configuración de publicación</span>
            </h3>
            <div className="toggles-list">
              <div className="toggle-item">
                <div className="toggle-info">
                  <div className="toggle-label">Propiedad activa</div>
                  <div className="toggle-description">
                    Mostrar esta propiedad en el sitio web y portales
                  </div>
                </div>
                <button
                  className="toggle-button"
                  onClick={toggleActivo}
                  disabled={saving}
                >
                  <Icons.toggle checked={propiedad.activo} />
                </button>
              </div>
              <div className="toggle-item">
                <div className="toggle-info">
                  <div className="toggle-label">Propiedad destacada</div>
                  <div className="toggle-description">
                    Mostrar en la sección de propiedades destacadas
                  </div>
                </div>
                <button
                  className="toggle-button"
                  onClick={toggleDestacada}
                  disabled={saving}
                >
                  <Icons.toggle checked={propiedad.destacada} />
                </button>
              </div>
              <div className="toggle-item">
                <div className="toggle-info">
                  <div className="toggle-label">Exclusiva</div>
                  <div className="toggle-description">
                    Marcar como propiedad en exclusiva
                  </div>
                </div>
                <button
                  className="toggle-button"
                  onClick={toggleExclusiva}
                  disabled={saving}
                >
                  <Icons.toggle checked={propiedad.exclusiva} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Columna lateral */}
        <div className="side-column">
          {/* Agente asignado */}
          <div className="section agent-section">
            <h3 className="section-title">
              {Icons.user}
              <span>Agente asignado</span>
            </h3>
            {propiedad.agente_nombre || propiedad.agente_apellido ? (
              <div className="agent-card">
                <div className="agent-avatar">
                  {(propiedad.agente_nombre?.[0] || '') + (propiedad.agente_apellido?.[0] || '')}
                </div>
                <div className="agent-info">
                  <div className="agent-name">
                    {propiedad.agente_nombre} {propiedad.agente_apellido}
                  </div>
                  <div className="agent-role">Agente inmobiliario</div>
                </div>
              </div>
            ) : (
              <div className="empty-agent">
                <div className="empty-icon">{Icons.user}</div>
                <p>Sin agente asignado</p>
                <button className="btn-assign">Asignar agente</button>
              </div>
            )}
          </div>

          {/* Propietario */}
          <div className="section owner-section">
            <h3 className="section-title">
              {Icons.user}
              <span>Propietario</span>
            </h3>
            {propiedad.propietario_nombre || propiedad.propietario_apellido ? (
              <div className="owner-card">
                <div className="owner-name">
                  {propiedad.propietario_nombre} {propiedad.propietario_apellido}
                </div>
              </div>
            ) : (
              <div className="empty-owner">
                <p>Sin propietario registrado</p>
              </div>
            )}
          </div>

          {/* Fechas importantes */}
          <div className="section dates-section">
            <h3 className="section-title">
              {Icons.calendar}
              <span>Fechas</span>
            </h3>
            <div className="dates-list">
              <div className="date-item">
                <span className="date-label">Creación</span>
                <span className="date-value">{formatDate(propiedad.created_at)}</span>
              </div>
              <div className="date-item">
                <span className="date-label">Última actualización</span>
                <span className="date-value">{formatDate(propiedad.updated_at)}</span>
              </div>
              <div className="date-item">
                <span className="date-label">Días publicada</span>
                <span className="date-value">
                  {Math.floor((new Date().getTime() - new Date(propiedad.created_at).getTime()) / (1000 * 60 * 60 * 24))} días
                </span>
              </div>
            </div>
          </div>

          {/* Estado actual */}
          <div className="section status-section">
            <h3 className="section-title">Estado actual</h3>
            <div className="status-badges">
              <span className={`status-badge ${propiedad.estado_propiedad}`}>
                {propiedad.estado_propiedad}
              </span>
              {propiedad.destacada && (
                <span className="status-badge destacada">
                  {Icons.star} Destacada
                </span>
              )}
              {propiedad.exclusiva && (
                <span className="status-badge exclusiva">
                  Exclusiva
                </span>
              )}
              {!propiedad.activo && (
                <span className="status-badge inactiva">
                  Inactiva
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .propiedad-gestion {
    width: 100%;
  }

  .gestion-grid {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 24px;
  }

  @media (max-width: 1024px) {
    .gestion-grid {
      grid-template-columns: 1fr;
    }
  }

  .section {
    background: white;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
    border: 1px solid #e2e8f0;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1rem;
    font-weight: 600;
    color: #0f172a;
    margin: 0 0 20px 0;
  }

  .section-title svg {
    color: #0057FF;
  }

  /* Stats */
  .stats-section {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }

  @media (max-width: 768px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    background: white;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
  }

  .stat-icon.views {
    background: rgba(0, 87, 255, 0.1);
    color: #0057FF;
  }

  .stat-icon.favorites {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  .stat-icon.inquiries {
    background: rgba(16, 185, 129, 0.1);
    color: #10B981;
  }

  .stat-icon.shares {
    background: rgba(139, 92, 246, 0.1);
    color: #8b5cf6;
  }

  .stat-info {
    display: flex;
    flex-direction: column;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #0f172a;
  }

  .stat-label {
    font-size: 0.8rem;
    color: #64748b;
  }

  /* Activity */
  .activity-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .activity-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    background: #f8fafc;
    border-radius: 8px;
  }

  .activity-icon {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: white;
    color: #64748b;
    flex-shrink: 0;
  }

  .activity-icon.visita { color: #0057FF; }
  .activity-icon.favorito { color: #ef4444; }
  .activity-icon.consulta { color: #10B981; }

  .activity-content {
    flex: 1;
  }

  .activity-text {
    font-size: 0.9rem;
    color: #0f172a;
    margin-bottom: 4px;
  }

  .activity-time {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .btn-view-all {
    width: 100%;
    padding: 12px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    color: #64748b;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    margin-top: 12px;
    transition: all 0.2s;
  }

  .btn-view-all:hover {
    background: #f1f5f9;
    color: #475569;
  }

  /* Toggles */
  .toggles-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .toggle-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: #f8fafc;
    border-radius: 8px;
  }

  .toggle-info {
    flex: 1;
  }

  .toggle-label {
    font-size: 0.9rem;
    font-weight: 500;
    color: #0f172a;
    margin-bottom: 4px;
  }

  .toggle-description {
    font-size: 0.8rem;
    color: #64748b;
  }

  .toggle-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
  }

  .toggle-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Agent */
  .agent-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    background: #f8fafc;
    border-radius: 12px;
  }

  .agent-avatar {
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #0057FF 0%, #6366f1 100%);
    color: white;
    font-size: 1.2rem;
    font-weight: 600;
    border-radius: 50%;
    text-transform: uppercase;
  }

  .agent-info {
    flex: 1;
  }

  .agent-name {
    font-size: 1rem;
    font-weight: 600;
    color: #0f172a;
    margin-bottom: 4px;
  }

  .agent-role {
    font-size: 0.8rem;
    color: #64748b;
  }

  .empty-agent, .empty-owner {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px;
    background: #f8fafc;
    border-radius: 8px;
    text-align: center;
  }

  .empty-icon {
    color: #cbd5e1;
    margin-bottom: 12px;
  }

  .empty-agent p, .empty-owner p {
    color: #94a3b8;
    font-size: 0.9rem;
    margin: 0 0 12px 0;
  }

  .btn-assign {
    padding: 8px 16px;
    background: #0057FF;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-assign:hover {
    background: #0046cc;
  }

  /* Owner */
  .owner-card {
    padding: 16px;
    background: #f8fafc;
    border-radius: 8px;
  }

  .owner-name {
    font-size: 0.95rem;
    font-weight: 500;
    color: #0f172a;
  }

  /* Dates */
  .dates-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .date-item {
    display: flex;
    justify-content: space-between;
    padding: 12px;
    background: #f8fafc;
    border-radius: 8px;
  }

  .date-label {
    font-size: 0.85rem;
    color: #64748b;
  }

  .date-value {
    font-size: 0.85rem;
    font-weight: 500;
    color: #0f172a;
  }

  /* Status */
  .status-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: capitalize;
  }

  .status-badge.disponible {
    background: rgba(16, 185, 129, 0.1);
    color: #10B981;
  }

  .status-badge.reservada {
    background: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
  }

  .status-badge.vendida, .status-badge.rentada {
    background: rgba(100, 116, 139, 0.1);
    color: #64748b;
  }

  .status-badge.destacada {
    background: rgba(245, 158, 11, 0.1);
    color: #d97706;
  }

  .status-badge.exclusiva {
    background: rgba(98, 54, 255, 0.1);
    color: #6236FF;
  }

  .status-badge.inactiva {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }
`;

