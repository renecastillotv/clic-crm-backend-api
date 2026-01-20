/**
 * CrmProductividad - Dashboard de Productividad
 *
 * Vista del sistema de productividad:
 * - Metas mensuales del asesor
 * - Progreso actual vs metas
 * - Ranking de productividad
 * - Estadísticas del equipo
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { usePageHeader } from '../../layouts/CrmLayout';
import { apiFetch } from '../../services/api';
import {
  Target,
  BarChart3,
  Trophy,
  Phone,
  MessageSquare,
  Calendar,
  DollarSign,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Users,
  FileText,
} from 'lucide-react';

// Nombres de meses en español
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Interfaces - alineadas con el backend
interface ConfigProductividad {
  id: string;
  tenant_id: string;
  activo: boolean;
  meta_contactos_mes: number;
  meta_captaciones_mes: number;
  meta_ventas_mes: number;
  meta_llamadas_mes: number;
  meta_visitas_mes: number;
  meta_propuestas_mes: number;
  peso_contactos: number;
  peso_captaciones: number;
  peso_ventas: number;
  peso_llamadas: number;
  peso_visitas: number;
  mostrar_ranking: boolean;
  notificar_cumplimiento: boolean;
}

interface ResumenProductividad {
  usuario_id: string;
  nombre: string;
  apellido: string;
  periodo: string;
  // Contadores reales
  contactos_registrados: number;
  captaciones_registradas: number;
  ventas_cerradas: number;
  llamadas_realizadas: number;
  visitas_realizadas: number;
  propuestas_enviadas: number;
  // Metas
  meta_contactos: number;
  meta_captaciones: number;
  meta_ventas: number;
  meta_llamadas: number;
  meta_visitas: number;
  meta_propuestas: number;
  // Porcentajes
  pct_contactos: number;
  pct_captaciones: number;
  pct_ventas: number;
  pct_llamadas: number;
  pct_visitas: number;
  pct_propuestas: number;
  pct_global: number;
  // Valores monetarios
  monto_ventas: number;
  monto_comisiones: number;
}

interface RankingItem extends ResumenProductividad {}

const CrmProductividad: React.FC = () => {
  const { tenantActual, user } = useAuth();
  const { getToken } = useClerkAuth();
  const { setPageHeader } = usePageHeader();

  const [config, setConfig] = useState<ConfigProductividad | null>(null);
  const [resumen, setResumen] = useState<ResumenProductividad | null>(null);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const monthPickerRef = useRef<HTMLDivElement>(null);

  // Obtener año y mes del periodo
  const [year, month] = periodo.split('-').map(Number);

  // Navegación de meses
  const goToPrevMonth = () => {
    const newDate = new Date(year, month - 2, 1);
    setPeriodo(newDate.toISOString().slice(0, 7));
  };

  const goToNextMonth = () => {
    const newDate = new Date(year, month, 1);
    setPeriodo(newDate.toISOString().slice(0, 7));
  };

  const selectMonth = (m: number) => {
    const newPeriodo = `${year}-${String(m + 1).padStart(2, '0')}`;
    setPeriodo(newPeriodo);
    setShowMonthPicker(false);
  };

  const selectYear = (y: number) => {
    const newPeriodo = `${y}-${String(month).padStart(2, '0')}`;
    setPeriodo(newPeriodo);
  };

  // Cerrar month picker al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(event.target as Node)) {
        setShowMonthPicker(false);
      }
    };
    if (showMonthPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMonthPicker]);

  useEffect(() => {
    setPageHeader({
      title: 'Productividad',
      subtitle: 'Tu rendimiento y metas mensuales',
      actions: [],
    });
  }, [setPageHeader]);

  useEffect(() => {
    if (tenantActual?.id && user?.id) {
      cargarDatos();
    }
  }, [tenantActual?.id, user?.id, periodo]);

  const cargarDatos = async () => {
    if (!tenantActual?.id || !user?.id) return;

    try {
      setLoading(true);
      setError(null);
      const token = await getToken();

      // Cargar config
      const configRes = await apiFetch(
        `/tenants/${tenantActual.id}/productividad/config`,
        {},
        token
      );
      const configData = await configRes.json();
      setConfig(configData.config);

      // Si el sistema está activo, cargar resumen y ranking
      if (configData.config?.activo) {
        // Cargar resumen del usuario
        const resumenRes = await apiFetch(
          `/tenants/${tenantActual.id}/productividad/resumen/${user.id}?periodo=${periodo}`,
          {},
          token
        );
        if (resumenRes.ok) {
          const resumenData = await resumenRes.json();
          setResumen(resumenData.resumen);
        }

        // Cargar ranking
        const rankingRes = await apiFetch(
          `/tenants/${tenantActual.id}/productividad/ranking?periodo=${periodo}&limite=5`,
          {},
          token
        );
        const rankingData = await rankingRes.json();
        setRanking(rankingData.ranking || []);
      }
    } catch (err: any) {
      console.error('Error cargando datos:', err);
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (porcentaje: number) => {
    if (porcentaje >= 100) return '#16a34a';
    if (porcentaje >= 75) return '#3b82f6';
    if (porcentaje >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const formatMes = (periodo: string) => {
    const [y, m] = periodo.split('-');
    return `${MESES[parseInt(m) - 1]} ${y}`;
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
        <p style={{ color: '#64748b' }}>Cargando productividad...</p>
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
          <AlertCircle size={48} color="#dc2626" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ color: '#dc2626', marginBottom: '8px' }}>Error al cargar</h3>
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
          <BarChart3 size={64} style={{ margin: '0 auto 20px', color: '#94a3b8', opacity: 0.5 }} />
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '12px', color: '#1e293b' }}>
            Sistema de Productividad Inactivo
          </h2>
          <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto' }}>
            El sistema de productividad no está habilitado. Contacta al administrador para activarlo.
          </p>
        </div>
      </div>
    );
  }

  // Las metas vienen directamente en el resumen desde el backend
  const currentDate = new Date();
  const isCurrentMonth = year === currentDate.getFullYear() && month === currentDate.getMonth() + 1;

  return (
    <div style={{ padding: '24px' }}>
      {/* Selector de Periodo Mejorado */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Month Picker */}
        <div
          ref={monthPickerRef}
          style={{ position: 'relative' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'white',
              borderRadius: '12px',
              padding: '4px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              border: '1px solid #e2e8f0',
            }}
          >
            <button
              onClick={goToPrevMonth}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                border: 'none',
                background: '#f8fafc',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#667eea';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.color = '#64748b';
              }}
            >
              <ChevronLeft size={20} />
            </button>

            <button
              onClick={() => setShowMonthPicker(!showMonthPicker)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 16px',
                background: showMonthPicker ? '#f0f4ff' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s',
                minWidth: '180px',
                justifyContent: 'center',
              }}
            >
              <Calendar size={18} style={{ color: '#667eea' }} />
              <span style={{
                fontWeight: 600,
                fontSize: '15px',
                color: '#1e293b',
              }}>
                {MESES[month - 1]} {year}
              </span>
            </button>

            <button
              onClick={goToNextMonth}
              disabled={isCurrentMonth}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                border: 'none',
                background: isCurrentMonth ? '#f1f5f9' : '#f8fafc',
                color: isCurrentMonth ? '#cbd5e1' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isCurrentMonth ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!isCurrentMonth) {
                  e.currentTarget.style.background = '#667eea';
                  e.currentTarget.style.color = 'white';
                }
              }}
              onMouseLeave={(e) => {
                if (!isCurrentMonth) {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.color = '#64748b';
                }
              }}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Month Picker Dropdown */}
          {showMonthPicker && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: '0',
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
                border: '1px solid #e2e8f0',
                padding: '16px',
                zIndex: 100,
                minWidth: '320px',
                animation: 'monthPickerSlideIn 0.2s ease-out',
              }}
            >
              <style>{`
                @keyframes monthPickerSlideIn {
                  from { opacity: 0; transform: translateY(-10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}</style>

              {/* Year Selector */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <button
                  onClick={() => selectYear(year - 1)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#f8fafc',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontWeight: 700, fontSize: '16px', color: '#1e293b' }}>
                  {year}
                </span>
                <button
                  onClick={() => selectYear(year + 1)}
                  disabled={year >= currentDate.getFullYear()}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: 'none',
                    background: year >= currentDate.getFullYear() ? '#f1f5f9' : '#f8fafc',
                    color: year >= currentDate.getFullYear() ? '#cbd5e1' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: year >= currentDate.getFullYear() ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Month Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                }}
              >
                {MESES.map((mes, index) => {
                  const isSelected = index === month - 1;
                  const isFuture = year === currentDate.getFullYear() && index > currentDate.getMonth();
                  const isCurrent = year === currentDate.getFullYear() && index === currentDate.getMonth();

                  return (
                    <button
                      key={mes}
                      onClick={() => !isFuture && selectMonth(index)}
                      disabled={isFuture}
                      style={{
                        padding: '12px 8px',
                        borderRadius: '10px',
                        border: 'none',
                        background: isSelected
                          ? 'linear-gradient(135deg, #667eea, #8b5cf6)'
                          : isCurrent
                          ? '#f0f4ff'
                          : 'transparent',
                        color: isSelected
                          ? 'white'
                          : isFuture
                          ? '#cbd5e1'
                          : isCurrent
                          ? '#667eea'
                          : '#374151',
                        fontSize: '13px',
                        fontWeight: isSelected || isCurrent ? 600 : 500,
                        cursor: isFuture ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s',
                        boxShadow: isSelected ? '0 4px 12px rgba(102, 126, 234, 0.4)' : 'none',
                      }}
                    >
                      {mes.slice(0, 3)}
                    </button>
                  );
                })}
              </div>

              {/* Quick Actions */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  marginTop: '16px',
                  paddingTop: '12px',
                  borderTop: '1px solid #f1f5f9',
                }}
              >
                <button
                  onClick={() => {
                    setPeriodo(new Date().toISOString().slice(0, 7));
                    setShowMonthPicker(false);
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    color: '#667eea',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Mes Actual
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {resumen && (
          <div
            style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: '#f0fdf4',
                borderRadius: '10px',
                border: '1px solid #bbf7d0',
              }}
            >
              <DollarSign size={16} style={{ color: '#16a34a' }} />
              <span style={{ fontSize: '13px', color: '#15803d', fontWeight: 600 }}>
                ${resumen.monto_ventas?.toLocaleString() || 0}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: '#faf5ff',
                borderRadius: '10px',
                border: '1px solid #e9d5ff',
              }}
            >
              <TrendingUp size={16} style={{ color: '#9333ea' }} />
              <span style={{ fontSize: '13px', color: '#7e22ce', fontWeight: 600 }}>
                ${resumen.monto_comisiones?.toLocaleString() || 0} comisiones
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Porcentaje Global de Productividad - Diseño Mejorado */}
      {resumen && (
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
          {/* Background decoration */}
          <div
            style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '200px',
              height: '200px',
              background: `${getProgressColor(resumen.pct_global)}15`,
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
              background: `${getProgressColor(resumen.pct_global)}10`,
              borderRadius: '50%',
            }}
          />

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '40px', flexWrap: 'wrap' }}>
            {/* Círculo de progreso */}
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
                  stroke={getProgressColor(resumen.pct_global)}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 70}`}
                  strokeDashoffset={`${2 * Math.PI * 70 * (1 - Math.min(resumen.pct_global, 100) / 100)}`}
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
                <div style={{ fontSize: '36px', fontWeight: 700, color: getProgressColor(resumen.pct_global) }}>
                  {Math.round(resumen.pct_global)}%
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                  completado
                </div>
              </div>
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                Tu Productividad
              </h3>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
                {resumen.pct_global >= 100
                  ? 'Excelente trabajo, has superado tus metas del mes'
                  : resumen.pct_global >= 75
                  ? 'Buen progreso, estás cerca de alcanzar tu meta'
                  : resumen.pct_global >= 50
                  ? 'Vas a medio camino, sigue así'
                  : 'Necesitas acelerar para alcanzar tus metas'}
              </p>

              {/* Mini progress bars */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Contactos</div>
                  <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(resumen.pct_contactos || 0, 100)}%`, background: '#3b82f6', borderRadius: '2px' }} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Captaciones</div>
                  <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(resumen.pct_captaciones || 0, 100)}%`, background: '#8b5cf6', borderRadius: '2px' }} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Ventas</div>
                  <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(resumen.pct_ventas || 0, 100)}%`, background: '#16a34a', borderRadius: '2px' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid de Métricas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Contactos */}
        <MetricCard
          icon={<Users size={20} />}
          title="Contactos"
          actual={resumen?.contactos_registrados || 0}
          meta={resumen?.meta_contactos || config?.meta_contactos_mes || 30}
          color="#3b82f6"
        />

        {/* Captaciones */}
        <MetricCard
          icon={<Target size={20} />}
          title="Captaciones"
          actual={resumen?.captaciones_registradas || 0}
          meta={resumen?.meta_captaciones || config?.meta_captaciones_mes || 2}
          color="#8b5cf6"
        />

        {/* Ventas */}
        <MetricCard
          icon={<DollarSign size={20} />}
          title="Ventas"
          actual={resumen?.ventas_cerradas || 0}
          meta={resumen?.meta_ventas || config?.meta_ventas_mes || 1}
          color="#16a34a"
        />

        {/* Visitas */}
        <MetricCard
          icon={<Calendar size={20} />}
          title="Visitas"
          actual={resumen?.visitas_realizadas || 0}
          meta={resumen?.meta_visitas || config?.meta_visitas_mes || 20}
          color="#f59e0b"
        />

        {/* Llamadas */}
        <MetricCard
          icon={<Phone size={20} />}
          title="Llamadas"
          actual={resumen?.llamadas_realizadas || 0}
          meta={resumen?.meta_llamadas || config?.meta_llamadas_mes || 100}
          color="#ec4899"
        />

        {/* Propuestas */}
        <MetricCard
          icon={<FileText size={20} />}
          title="Propuestas"
          actual={resumen?.propuestas_enviadas || 0}
          meta={resumen?.meta_propuestas || config?.meta_propuestas_mes || 10}
          color="#06b6d4"
        />
      </div>

      {/* Ranking */}
      {ranking.length > 0 && (
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
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Trophy size={20} color="#f59e0b" />
            Ranking de Productividad
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {ranking.map((item, index) => {
              const isMe = item.usuario_id === user?.id;
              return (
                <div
                  key={item.usuario_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    background: isMe
                      ? 'linear-gradient(135deg, #f0f4ff 0%, #e8f4ff 100%)'
                      : index === 0
                      ? '#fef3c7'
                      : '#f8fafc',
                    borderRadius: '12px',
                    border: isMe ? '2px solid #667eea' : 'none',
                  }}
                >
                  <span
                    style={{
                      width: '36px',
                      height: '36px',
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
                    <div style={{ fontWeight: 600, color: isMe ? '#667eea' : '#1e293b' }}>
                      {item.nombre} {item.apellido}
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
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      {item.contactos_registrados} contactos • {item.ventas_cerradas} ventas
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '24px',
                      fontWeight: 700,
                      color: getProgressColor(item.pct_global),
                    }}
                  >
                    {Math.round(item.pct_global)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Info cuando no hay resumen */}
      {!resumen && (
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
        >
          <Clock size={48} style={{ margin: '0 auto 16px', color: '#94a3b8', opacity: 0.5 }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#1e293b' }}>
            Sin datos para este periodo
          </h3>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            No hay registros de productividad para {formatMes(periodo)}
          </p>
        </div>
      )}
    </div>
  );
};

// Componente de Tarjeta de Métrica - Diseño Mejorado
interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  actual: number;
  meta: number;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, title, actual, meta, color }) => {
  const porcentaje = meta > 0 ? Math.min((actual / meta) * 100, 100) : 0;
  const isCompleted = actual >= meta;

  return (
    <div
      style={{
        background: 'white',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e2e8f0',
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

      {/* Completed indicator */}
      {isCompleted && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '14px',
          }}
        >
          ✓
        </div>
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

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '14px' }}>
          <span style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b' }}>{actual}</span>
          <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>/ {meta}</span>
        </div>

        {/* Circular mini progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Progress bar */}
          <div
            style={{
              flex: 1,
              height: '6px',
              background: '#f1f5f9',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${porcentaje}%`,
                background: `linear-gradient(90deg, ${color} 0%, ${color}cc 100%)`,
                borderRadius: '3px',
                transition: 'width 0.5s ease',
              }}
            />
          </div>
          {/* Percentage */}
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: color,
              minWidth: '36px',
              textAlign: 'right',
            }}
          >
            {Math.round(porcentaje)}%
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '10px',
            fontSize: '11px',
          }}
        >
          <span style={{ color: '#94a3b8' }}>
            {isCompleted ? 'Meta alcanzada' : `Faltan ${meta - actual}`}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CrmProductividad;
