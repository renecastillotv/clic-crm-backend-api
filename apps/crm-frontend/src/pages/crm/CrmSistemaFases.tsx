/**
 * CrmSistemaFases - Dashboard del Sistema de Fases
 *
 * Vista principal del sistema de gamificación:
 * - Estado del asesor (fase actual, PRESTIGE, ULTRA)
 * - Leads asignados del pool
 * - Estadísticas del mes
 * - Ranking de asesores
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { usePageHeader } from '../../layouts/CrmLayout';
import { apiFetch } from '../../services/api';
import {
  TrendingUp,
  Target,
  Users,
  Award,
  Zap,
  Trophy,
  Star,
  AlertCircle,
  Clock,
  Phone,
  Mail,
  UserCheck,
  ChevronUp,
  Flame,
  Crown,
} from 'lucide-react';

// Interfaces
interface ConfigSistemaFases {
  id: string;
  tenant_id: string;
  activo: boolean;
  propiedad_pool_id: string | null;
  comision_asesor_pct: number;
  comision_empresa_pct: number;
  peso_fase_1: number;
  peso_fase_2: number;
  peso_fase_3: number;
  peso_fase_4: number;
  peso_fase_5: number;
  intentos_fase_1: number;
  meses_solitario_max: number;
}

interface AsesorFases {
  usuario_id: string;
  tenant_id: string;
  nombre: string;
  apellido: string;
  email: string;
  en_sistema_fases: boolean;
  fase_actual: number;
  en_modo_solitario: boolean;
  intentos_fase_1_usados: number;
  meses_solitario_sin_venta: number;
  prestige: number;
  ventas_fase_5_contador: number;
  ultra_record: number;
  ultra_mes: string | null;
  ventas_mes_actual: number;
}

interface LeadPool {
  id: string;
  nombre: string;
  apellido: string | null;
  email: string | null;
  telefono: string | null;
  origen_lead: string | null;
  lead_asignado_a: string | null;
  fecha_asignacion_lead: string | null;
}

interface Estadisticas {
  total_asesores: number;
  fase_1: number;
  fase_2: number;
  fase_3: number;
  fase_4: number;
  fase_5: number;
  modo_solitario: number;
  total_prestige: number;
  max_ultra: number;
  total_leads: number;
  leads_asignados: number;
  leads_pendientes: number;
}

const CrmSistemaFases: React.FC = () => {
  const { tenantActual, user } = useAuth();
  const { getToken } = useClerkAuth();
  const { setPageHeader } = usePageHeader();

  const [config, setConfig] = useState<ConfigSistemaFases | null>(null);
  const [miEstado, setMiEstado] = useState<AsesorFases | null>(null);
  const [misLeads, setMisLeads] = useState<LeadPool[]>([]);
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [ranking, setRanking] = useState<AsesorFases[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPageHeader({
      title: 'Sistema de Fases',
      subtitle: 'Tu progreso y estadísticas en el sistema de gamificación',
      actions: [],
    });
  }, [setPageHeader]);

  useEffect(() => {
    if (tenantActual?.id && user?.id) {
      cargarDatos();
    }
  }, [tenantActual?.id, user?.id]);

  const cargarDatos = async () => {
    if (!tenantActual?.id || !user?.id) return;

    try {
      setLoading(true);
      setError(null);
      const token = await getToken();

      // Cargar config
      const configRes = await apiFetch(
        `/tenants/${tenantActual.id}/sistema-fases/config`,
        {},
        token
      );
      const configData = await configRes.json();
      setConfig(configData.config);

      // Cargar todos los asesores para encontrar mi estado
      const asesoresRes = await apiFetch(
        `/tenants/${tenantActual.id}/sistema-fases/asesores`,
        {},
        token
      );
      const asesoresData = await asesoresRes.json();
      const miAsesor = asesoresData.asesores?.find(
        (a: AsesorFases) => a.usuario_id === user.id
      );
      setMiEstado(miAsesor || null);

      // Cargar mis leads si estoy en el sistema
      if (miAsesor?.en_sistema_fases) {
        const leadsRes = await apiFetch(
          `/tenants/${tenantActual.id}/sistema-fases/leads?usuarioId=${user.id}`,
          {},
          token
        );
        const leadsData = await leadsRes.json();
        setMisLeads(leadsData.leads || []);
      }

      // Cargar estadísticas
      const statsRes = await apiFetch(
        `/tenants/${tenantActual.id}/sistema-fases/estadisticas`,
        {},
        token
      );
      const statsData = await statsRes.json();
      setEstadisticas(statsData.estadisticas);

      // Cargar ranking
      const rankingRes = await apiFetch(
        `/tenants/${tenantActual.id}/sistema-fases/ranking?limite=5`,
        {},
        token
      );
      const rankingData = await rankingRes.json();
      setRanking(rankingData.ranking || []);
    } catch (err: any) {
      console.error('Error cargando datos:', err);
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const getFaseColor = (fase: number) => {
    if (fase === 0) return '#f59e0b'; // Modo solitario - amber
    const colors = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#16a34a'];
    return colors[fase - 1] || '#64748b';
  };

  const getFaseLabel = (fase: number) => {
    if (fase === 0) return 'Modo Solitario';
    return `Fase ${fase}`;
  };

  const getFaseIcon = (fase: number) => {
    if (fase === 0) return <AlertCircle size={24} />;
    if (fase === 5) return <Trophy size={24} />;
    return <Target size={24} />;
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e2e8f0',
            borderTopColor: '#667eea',
            borderRadius: '50%',
            margin: '0 auto 16px',
            animation: 'spin 1s linear infinite',
          }}
        />
        <p style={{ color: '#64748b' }}>Cargando sistema de fases...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <AlertCircle
            size={48}
            color="#dc2626"
            style={{ margin: '0 auto 12px' }}
          />
          <h3 style={{ color: '#dc2626', marginBottom: '8px' }}>
            Error al cargar
          </h3>
          <p style={{ color: '#7f1d1d' }}>{error}</p>
          <button
            onClick={cargarDatos}
            style={{
              marginTop: '16px',
              padding: '10px 20px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Si el sistema no está activo
  if (!config?.activo) {
    return (
      <div style={{ padding: '24px' }}>
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '60px 40px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
        >
          <Zap
            size={64}
            style={{ margin: '0 auto 20px', color: '#94a3b8', opacity: 0.5 }}
          />
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '12px', color: '#1e293b' }}>
            Sistema de Fases Inactivo
          </h2>
          <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto' }}>
            El sistema de fases no está habilitado para este tenant. Contacta al
            administrador para activarlo.
          </p>
        </div>
      </div>
    );
  }

  // Si no estoy en el sistema de fases
  if (!miEstado?.en_sistema_fases) {
    return (
      <div style={{ padding: '24px' }}>
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '60px 40px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
        >
          <Users
            size={64}
            style={{ margin: '0 auto 20px', color: '#94a3b8', opacity: 0.5 }}
          />
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '12px', color: '#1e293b' }}>
            No estás en el Sistema de Fases
          </h2>
          <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto' }}>
            Aún no has sido agregado al sistema de fases. Contacta a tu
            administrador para ser incluido y empezar a recibir leads del pool.
          </p>
        </div>

        {/* Mostrar ranking aunque no esté en el sistema */}
        {ranking.length > 0 && (
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              marginTop: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 600,
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Trophy size={20} color="#f59e0b" />
              Ranking de Asesores
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {ranking.map((asesor, index) => (
                <div
                  key={asesor.usuario_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    background: index === 0 ? '#fef3c7' : '#f8fafc',
                    borderRadius: '8px',
                  }}
                >
                  <span
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: index === 0 ? '#f59e0b' : '#e2e8f0',
                      color: index === 0 ? 'white' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      fontSize: '14px',
                    }}
                  >
                    {index + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>
                      {asesor.nombre} {asesor.apellido}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Fase {asesor.fase_actual} • PRESTIGE {asesor.prestige}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Vista completa para asesores en el sistema
  const faseActual = miEstado.en_modo_solitario ? 0 : miEstado.fase_actual;
  const faseColor = getFaseColor(faseActual);
  const progresoFase = faseActual === 5
    ? (miEstado.ventas_fase_5_contador / 3) * 100
    : faseActual === 0
    ? ((config?.meses_solitario_max || 3) - miEstado.meses_solitario_sin_venta) / (config?.meses_solitario_max || 3) * 100
    : (faseActual / 5) * 100;

  return (
    <div style={{ padding: '24px' }}>
      {/* Header con estado principal - Diseño similar a Productividad */}
      <div
        style={{
          background: 'white',
          borderRadius: '20px',
          padding: '32px',
          marginBottom: '24px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e2e8f0',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background decorations */}
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '200px',
            height: '200px',
            background: `${faseColor}15`,
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-30px',
            left: '-30px',
            width: '120px',
            height: '120px',
            background: `${faseColor}10`,
            borderRadius: '50%',
          }}
        />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '40px', flexWrap: 'wrap' }}>
          {/* Círculo de progreso de fase */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <svg width="160" height="160" viewBox="0 0 160 160">
              {/* Background circle */}
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="12"
              />
              {/* Progress circle */}
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke={faseColor}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 70}`}
                strokeDashoffset={`${2 * Math.PI * 70 * (1 - Math.min(progresoFase, 100) / 100)}`}
                transform="rotate(-90 80 80)"
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
              }}
            >
              {faseActual === 0 ? (
                <AlertCircle size={32} style={{ color: faseColor }} />
              ) : faseActual === 5 ? (
                <Crown size={32} style={{ color: faseColor }} />
              ) : (
                <div style={{ fontSize: '36px', fontWeight: 700, color: faseColor }}>
                  {faseActual}
                </div>
              )}
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                {faseActual === 0 ? 'Solitario' : 'Fase'}
              </div>
            </div>
          </div>

          {/* Info de fase */}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                {getFaseLabel(faseActual)}
              </h3>
              {faseActual === 5 && miEstado.prestige > 0 && (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#92400e',
                  }}
                >
                  <Star size={14} />
                  PRESTIGE {miEstado.prestige}
                </span>
              )}
            </div>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
              {faseActual === 0
                ? 'Estás en modo solitario. Cierra una venta para volver a Fase 1.'
                : faseActual === 5
                ? 'Excelente trabajo. Mantén tu rendimiento para aumentar tu PRESTIGE.'
                : `Cierra ventas para avanzar a Fase ${faseActual + 1} y obtener más leads.`}
            </p>

            {/* Mini progress bars */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
              {[1, 2, 3, 4, 5].map((fase) => (
                <div key={fase}>
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px', textAlign: 'center' }}>
                    F{fase}
                  </div>
                  <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: faseActual >= fase ? '100%' : '0%',
                        background: getFaseColor(fase),
                        borderRadius: '2px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid de métricas - Estilo coherente con Productividad */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Ventas del mes */}
        <StatCard
          icon={<TrendingUp size={20} />}
          title="Ventas del Mes"
          value={miEstado.ventas_mes_actual}
          subtitle={miEstado.ventas_mes_actual > miEstado.ultra_record ? 'Nuevo récord' : `Récord: ${miEstado.ultra_record}`}
          color="#16a34a"
          isHighlight={miEstado.ventas_mes_actual > 0}
        />

        {/* Leads asignados */}
        <StatCard
          icon={<Users size={20} />}
          title="Leads Asignados"
          value={misLeads.length}
          subtitle="Del pool publicitario"
          color="#3b82f6"
        />

        {/* Peso actual */}
        <StatCard
          icon={<Target size={20} />}
          title="Peso en Pool"
          value={config ? (config[`peso_fase_${faseActual === 0 ? 1 : faseActual}` as keyof ConfigSistemaFases] as number) || 0 : 0}
          subtitle="Probabilidad de leads"
          color="#8b5cf6"
        />

        {/* PRESTIGE */}
        <StatCard
          icon={<Star size={20} />}
          title="PRESTIGE"
          value={miEstado.prestige}
          subtitle={faseActual === 5 ? `${miEstado.ventas_fase_5_contador}/3 para +1` : 'Logro permanente'}
          color="#f59e0b"
          isHighlight={miEstado.prestige > 0}
        />

        {/* ULTRA Record */}
        <StatCard
          icon={<Trophy size={20} />}
          title="ULTRA Record"
          value={miEstado.ultra_record}
          subtitle={miEstado.ultra_mes ? `En ${miEstado.ultra_mes}` : 'Mejor mes'}
          color="#ec4899"
          isHighlight={miEstado.ultra_record > 0}
        />

        {/* Estado especial según fase */}
        {faseActual === 1 && (
          <StatCard
            icon={<Flame size={20} />}
            title="Intentos F1"
            value={`${miEstado.intentos_fase_1_usados}/${config?.intentos_fase_1 || 3}`}
            subtitle="Meses sin cerrar"
            color="#ef4444"
            isWarning={miEstado.intentos_fase_1_usados >= (config?.intentos_fase_1 || 3) - 1}
          />
        )}

        {faseActual === 0 && (
          <StatCard
            icon={<AlertCircle size={20} />}
            title="Meses Solitario"
            value={`${miEstado.meses_solitario_sin_venta}/${config?.meses_solitario_max || 3}`}
            subtitle="Sin ventas"
            color="#f59e0b"
            isWarning={true}
          />
        )}
      </div>

      {/* Tarjeta de progreso hacia siguiente nivel */}
      {faseActual > 0 && faseActual < 5 && (
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: `linear-gradient(135deg, ${getFaseColor(faseActual + 1)}20 0%, ${getFaseColor(faseActual + 1)}10 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChevronUp size={24} style={{ color: getFaseColor(faseActual + 1) }} />
            </div>
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                Próximo: Fase {faseActual + 1}
              </h4>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Cierra 1 venta este mes para ascender
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: miEstado.ventas_mes_actual > 0 ? '100%' : '0%',
                  background: `linear-gradient(90deg, ${getFaseColor(faseActual + 1)} 0%, ${getFaseColor(faseActual + 1)}cc 100%)`,
                  borderRadius: '4px',
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
            <span style={{ fontSize: '14px', fontWeight: 700, color: getFaseColor(faseActual + 1), minWidth: '60px' }}>
              {miEstado.ventas_mes_actual > 0 ? 'Listo' : '0/1'}
            </span>
          </div>
        </div>
      )}

      {/* Grid de Leads y Ranking */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '24px',
        }}
      >
        {/* Mis Leads Asignados */}
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
        >
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 600,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <UserCheck size={20} />
            Mis Leads del Pool
          </h3>

          {misLeads.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px',
                color: '#94a3b8',
              }}
            >
              <Users size={40} style={{ marginBottom: '12px', opacity: 0.5 }} />
              <p>No tienes leads asignados actualmente</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {misLeads.slice(0, 5).map((lead) => (
                <div
                  key={lead.id}
                  style={{
                    padding: '16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    transition: 'all 0.2s',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>
                        {lead.nombre} {lead.apellido || ''}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          fontSize: '13px',
                          color: '#64748b',
                        }}
                      >
                        {lead.email && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Mail size={12} />
                            {lead.email}
                          </div>
                        )}
                        {lead.telefono && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Phone size={12} />
                            {lead.telefono}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 500,
                          background: '#dbeafe',
                          color: '#1d4ed8',
                        }}
                      >
                        {lead.origen_lead || 'Pool'}
                      </span>
                    </div>
                  </div>
                  {lead.fecha_asignacion_lead && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        color: '#94a3b8',
                        marginTop: '8px',
                      }}
                    >
                      <Clock size={10} />
                      Asignado: {new Date(lead.fecha_asignacion_lead).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
              {misLeads.length > 5 && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '12px',
                    color: '#667eea',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  + {misLeads.length - 5} leads más
                </div>
              )}
            </div>
          )}
        </div>

        {/* Ranking */}
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
        >
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 600,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Trophy size={20} color="#f59e0b" />
            Ranking de Asesores
          </h3>

          {ranking.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px',
                color: '#94a3b8',
              }}
            >
              <Trophy size={40} style={{ marginBottom: '12px', opacity: 0.5 }} />
              <p>No hay asesores en el ranking</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {ranking.map((asesor, index) => {
                const isMe = asesor.usuario_id === user?.id;
                return (
                  <div
                    key={asesor.usuario_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px',
                      background: isMe
                        ? 'linear-gradient(135deg, #f0f4ff 0%, #e8f4ff 100%)'
                        : index === 0
                        ? '#fef3c7'
                        : '#f8fafc',
                      borderRadius: '10px',
                      border: isMe ? '2px solid #667eea' : 'none',
                    }}
                  >
                    <span
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background:
                          index === 0
                            ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                            : index === 1
                            ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)'
                            : index === 2
                            ? 'linear-gradient(135deg, #b45309 0%, #92400e 100%)'
                            : '#e2e8f0',
                        color: index < 3 ? 'white' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '14px',
                      }}
                    >
                      {index + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          color: isMe ? '#667eea' : '#1e293b',
                        }}
                      >
                        {asesor.nombre} {asesor.apellido}
                        {isMe && (
                          <span
                            style={{
                              marginLeft: '8px',
                              fontSize: '10px',
                              background: '#667eea',
                              color: 'white',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            TÚ
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#64748b',
                          display: 'flex',
                          gap: '12px',
                          marginTop: '4px',
                        }}
                      >
                        <span>
                          Fase {asesor.fase_actual}
                        </span>
                        <span style={{ color: '#f59e0b' }}>
                          ⭐ {asesor.prestige}
                        </span>
                        <span style={{ color: '#2563eb' }}>
                          🏆 {asesor.ultra_record}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Estadísticas globales */}
      {estadisticas && (
        <div
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            borderRadius: '16px',
            padding: '24px',
            marginTop: '24px',
            color: 'white',
          }}
        >
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 600,
              marginBottom: '20px',
              opacity: 0.9,
            }}
          >
            Estadísticas del Sistema
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
              gap: '16px',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700 }}>
                {estadisticas.total_asesores}
              </div>
              <div style={{ fontSize: '11px', opacity: 0.7 }}>Asesores activos</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#16a34a' }}>
                {estadisticas.fase_5}
              </div>
              <div style={{ fontSize: '11px', opacity: 0.7 }}>En Fase 5</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#f59e0b' }}>
                {estadisticas.total_prestige || 0}
              </div>
              <div style={{ fontSize: '11px', opacity: 0.7 }}>PRESTIGE total</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6' }}>
                {estadisticas.leads_pendientes}
              </div>
              <div style={{ fontSize: '11px', opacity: 0.7 }}>Leads pendientes</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#a855f7' }}>
                {estadisticas.max_ultra || 0}
              </div>
              <div style={{ fontSize: '11px', opacity: 0.7 }}>ULTRA máximo</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente de Tarjeta de Estadística - Diseño coherente con MetricCard de Productividad
interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: number | string;
  subtitle: string;
  color: string;
  isHighlight?: boolean;
  isWarning?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, subtitle, color, isHighlight, isWarning }) => {
  return (
    <div
      style={{
        background: 'white',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        border: isWarning ? `2px solid ${color}40` : '1px solid #e2e8f0',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)';
      }}
    >
      {/* Background accent */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '80px',
          height: '80px',
          background: `${color}08`,
          borderRadius: '0 0 0 80px',
        }}
      />

      {/* Highlight indicator */}
      {isHighlight && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 8px ${color}`,
          }}
        />
      )}

      <div style={{ position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
              color: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 12px ${color}20`,
            }}
          >
            {icon}
          </div>
          <span style={{ fontWeight: 600, color: '#475569', fontSize: '14px' }}>{title}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '8px' }}>
          <span style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b' }}>{value}</span>
        </div>

        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
          {subtitle}
        </div>
      </div>
    </div>
  );
};

export default CrmSistemaFases;
