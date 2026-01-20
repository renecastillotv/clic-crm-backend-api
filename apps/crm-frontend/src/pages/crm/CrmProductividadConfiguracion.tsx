/**
 * CrmProductividadConfiguracion - Configuración del Sistema de Productividad
 *
 * Permite a los administradores:
 * - Activar/desactivar el sistema
 * - Configurar metas globales por defecto
 * - Configurar pesos de cada métrica
 * - Ver estadísticas del equipo
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { usePageHeader } from '../../layouts/CrmLayout';
import { apiFetch } from '../../services/api';
import {
  Settings,
  Target,
  Phone,
  MessageSquare,
  Calendar,
  DollarSign,
  Save,
  Power,
  AlertCircle,
  CheckCircle,
  Users,
} from 'lucide-react';

// Interfaces
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

interface NivelProductividad {
  id: string;
  nombre: string;
  codigo: string;
  descripcion: string | null;
  orden: number;
  meta_contactos_mes: number | null;
  meta_captaciones_mes: number | null;
  meta_ventas_mes: number | null;
  meta_llamadas_mes: number | null;
  meta_visitas_mes: number | null;
  meta_propuestas_mes: number | null;
  color: string;
  es_default: boolean;
}

interface EstadisticasEquipo {
  total_asesores: number;
  pct_promedio: number;
  asesores_meta_cumplida: number;
  total_contactos: number;
  total_captaciones: number;
  total_ventas: number;
  total_monto_ventas: number;
}

const CrmProductividadConfiguracion: React.FC = () => {
  const { tenantActual } = useAuth();
  const { getToken } = useClerkAuth();
  const { setPageHeader } = usePageHeader();

  const [config, setConfig] = useState<ConfigProductividad | null>(null);
  const [niveles, setNiveles] = useState<NivelProductividad[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasEquipo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state - ahora con los campos correctos del backend
  const [formData, setFormData] = useState({
    meta_contactos_mes: 30,
    meta_captaciones_mes: 2,
    meta_ventas_mes: 1,
    meta_llamadas_mes: 100,
    meta_visitas_mes: 20,
    meta_propuestas_mes: 5,
    peso_contactos: 20,
    peso_captaciones: 25,
    peso_ventas: 30,
    peso_llamadas: 15,
    peso_visitas: 10,
  });

  // Función para toggle del sistema (usada en el header)
  const toggleSistema = async (activo: boolean) => {
    if (!tenantActual?.id) return;

    try {
      setSaving(true);
      const token = await getToken();

      await apiFetch(
        `/tenants/${tenantActual.id}/productividad/toggle`,
        {
          method: 'POST',
          body: JSON.stringify({ activo }),
        },
        token
      );

      setSuccessMsg(activo ? 'Sistema activado' : 'Sistema desactivado');
      setTimeout(() => setSuccessMsg(null), 3000);
      await cargarDatos();
    } catch (err: any) {
      setError(err.message || 'Error al cambiar estado');
    } finally {
      setSaving(false);
    }
  };

  // Configurar el header con el botón de activación
  useEffect(() => {
    setPageHeader({
      title: 'Productividad',
      subtitle: 'Define las metas y métricas de productividad del equipo',
      actions: [
        <button
          key="toggle-productividad"
          onClick={() => toggleSistema(!config?.activo)}
          disabled={saving || loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: config?.activo
              ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
              : 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            boxShadow: config?.activo
              ? '0 4px 12px rgba(22, 163, 74, 0.3)'
              : '0 4px 12px rgba(100, 116, 139, 0.3)',
            transition: 'all 0.2s',
            opacity: loading ? 0.6 : 1,
          }}
        >
          <Power size={18} />
          {config?.activo ? 'Activo' : 'Inactivo'}
        </button>,
      ],
    });
  }, [setPageHeader, config?.activo, saving, loading]);

  useEffect(() => {
    if (tenantActual?.id) {
      cargarDatos();
    }
  }, [tenantActual?.id]);

  const cargarDatos = async () => {
    if (!tenantActual?.id) return;

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

      if (configData.config) {
        setFormData({
          meta_contactos_mes: configData.config.meta_contactos_mes || 30,
          meta_captaciones_mes: configData.config.meta_captaciones_mes || 2,
          meta_ventas_mes: configData.config.meta_ventas_mes || 1,
          meta_llamadas_mes: configData.config.meta_llamadas_mes || 100,
          meta_visitas_mes: configData.config.meta_visitas_mes || 20,
          meta_propuestas_mes: configData.config.meta_propuestas_mes || 5,
          peso_contactos: configData.config.peso_contactos ?? 20,
          peso_captaciones: configData.config.peso_captaciones ?? 25,
          peso_ventas: configData.config.peso_ventas ?? 30,
          peso_llamadas: configData.config.peso_llamadas ?? 15,
          peso_visitas: configData.config.peso_visitas ?? 10,
        });
      }

      // Cargar niveles de productividad
      try {
        const nivelesRes = await apiFetch(
          `/tenants/${tenantActual.id}/productividad/niveles`,
          {},
          token
        );
        const nivelesData = await nivelesRes.json();
        setNiveles(nivelesData.niveles || []);
      } catch {
        // Niveles pueden no estar disponibles aún
      }

      // Cargar estadísticas del equipo
      try {
        const statsRes = await apiFetch(
          `/tenants/${tenantActual.id}/productividad/estadisticas`,
          {},
          token
        );
        const statsData = await statsRes.json();
        setEstadisticas(statsData.estadisticas);
      } catch {
        // Estadísticas pueden no estar disponibles
      }
    } catch (err: any) {
      console.error('Error cargando datos:', err);
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const guardarConfig = async () => {
    if (!tenantActual?.id) return;

    try {
      setSaving(true);
      setError(null);
      const token = await getToken();

      await apiFetch(
        `/tenants/${tenantActual.id}/productividad/config`,
        {
          method: 'PUT',
          body: JSON.stringify(formData),
        },
        token
      );

      setSuccessMsg('Configuración guardada correctamente');
      setTimeout(() => setSuccessMsg(null), 3000);
      await cargarDatos();
    } catch (err: any) {
      setError(err.message || 'Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  // Calcular suma de pesos
  const sumaPesos =
    formData.peso_contactos +
    formData.peso_captaciones +
    formData.peso_ventas +
    formData.peso_llamadas +
    formData.peso_visitas;

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
        <p style={{ color: '#64748b' }}>Cargando configuración...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Mensajes de error/éxito */}
      {error && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            padding: '14px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <AlertCircle size={18} color="#dc2626" />
          <span style={{ color: '#dc2626' }}>{error}</span>
        </div>
      )}

      {successMsg && (
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '10px',
            padding: '14px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <CheckCircle size={18} color="#16a34a" />
          <span style={{ color: '#16a34a' }}>{successMsg}</span>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '24px',
        }}
      >
        {/* Metas Mensuales */}
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
            <Target size={20} />
            Metas Mensuales por Defecto
          </h3>

          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
            Estas son las metas que se aplicarán a todos los asesores por defecto.
            Se pueden personalizar individualmente.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Contactos */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#dbeafe',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Phone size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '13px', color: '#64748b' }}>
                  Contactos / mes
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.meta_contactos_mes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      meta_contactos_mes: parseInt(e.target.value) || 0,
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    marginTop: '4px',
                  }}
                />
              </div>
            </div>

            {/* Captaciones */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#f3e8ff',
                  color: '#7c3aed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Target size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '13px', color: '#64748b' }}>
                  Captaciones / mes
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.meta_captaciones_mes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      meta_captaciones_mes: parseInt(e.target.value) || 0,
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    marginTop: '4px',
                  }}
                />
              </div>
            </div>

            {/* Ventas */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#dcfce7',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <DollarSign size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '13px', color: '#64748b' }}>
                  Ventas / mes
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.meta_ventas_mes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      meta_ventas_mes: parseInt(e.target.value) || 0,
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    marginTop: '4px',
                  }}
                />
              </div>
            </div>

            {/* Visitas */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Calendar size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '13px', color: '#64748b' }}>
                  Visitas / mes
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.meta_visitas_mes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      meta_visitas_mes: parseInt(e.target.value) || 0,
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    marginTop: '4px',
                  }}
                />
              </div>
            </div>

            {/* Llamadas */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#fce7f3',
                  color: '#db2777',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MessageSquare size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '13px', color: '#64748b' }}>
                  Llamadas / mes
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.meta_llamadas_mes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      meta_llamadas_mes: parseInt(e.target.value) || 0,
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    marginTop: '4px',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pesos de Métricas */}
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
            <Settings size={20} />
            Pesos de Métricas (%)
          </h3>

          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
            Define la importancia de cada métrica en el cálculo de productividad.
            La suma debe ser 100%.
          </p>

          {/* Indicador de suma */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              marginBottom: '20px',
              background: sumaPesos === 100 ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${sumaPesos === 100 ? '#bbf7d0' : '#fecaca'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                color: sumaPesos === 100 ? '#16a34a' : '#dc2626',
                fontWeight: 500,
              }}
            >
              Suma actual: {sumaPesos}%
            </span>
            {sumaPesos === 100 ? (
              <CheckCircle size={18} color="#16a34a" />
            ) : (
              <AlertCircle size={18} color="#dc2626" />
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { key: 'peso_contactos', label: 'Contactos', color: '#2563eb' },
              { key: 'peso_captaciones', label: 'Captaciones', color: '#7c3aed' },
              { key: 'peso_ventas', label: 'Ventas', color: '#16a34a' },
              { key: 'peso_visitas', label: 'Visitas', color: '#d97706' },
              { key: 'peso_llamadas', label: 'Llamadas', color: '#db2777' },
            ].map((item) => (
              <div key={item.key}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                  }}
                >
                  <label style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
                    {item.label}
                  </label>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: item.color }}>
                    {formData[item.key as keyof typeof formData]}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData[item.key as keyof typeof formData]}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      [item.key]: parseInt(e.target.value) || 0,
                    })
                  }
                  style={{
                    width: '100%',
                    accentColor: item.color,
                  }}
                />
              </div>
            ))}
          </div>

          <button
            onClick={guardarConfig}
            disabled={saving || sumaPesos !== 100}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '14px',
              marginTop: '24px',
              background:
                sumaPesos !== 100
                  ? '#94a3b8'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: sumaPesos !== 100 ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              boxShadow:
                sumaPesos !== 100 ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.4)',
            }}
          >
            <Save size={18} />
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </div>

      {/* Estadísticas del equipo */}
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
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Users size={18} />
            Estadísticas del Equipo
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '20px',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 700 }}>
                {estadisticas.total_asesores}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.7 }}>Asesores activos</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#3b82f6' }}>
                {estadisticas.total_ventas}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.7 }}>Ventas del mes</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#16a34a' }}>
                {estadisticas.pct_promedio || 0}%
              </div>
              <div style={{ fontSize: '12px', opacity: 0.7 }}>Productividad prom.</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#f59e0b' }}>
                {estadisticas.asesores_meta_cumplida}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.7 }}>Superan meta</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrmProductividadConfiguracion;
