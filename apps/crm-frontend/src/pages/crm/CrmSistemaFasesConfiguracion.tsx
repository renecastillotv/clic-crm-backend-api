/**
 * CrmSistemaFasesConfiguracion - Configuración del Sistema de Fases
 *
 * Permite a los administradores:
 * - Activar/desactivar el sistema
 * - Configurar pesos por fase
 * - Configurar comisiones del pool
 * - Gestionar asesores en el sistema
 * - Ver estadísticas de distribución
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { usePageHeader } from '../../layouts/CrmLayout';
import { apiFetch, getUsuariosTenant } from '../../services/api';
import {
  Settings,
  Users,
  TrendingUp,
  DollarSign,
  Trash2,
  Save,
  Power,
  AlertCircle,
  CheckCircle,
  Award,
  Trophy,
  BarChart3,
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

interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
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

type TabType = 'configuracion' | 'asesores' | 'estadisticas';

const CrmSistemaFasesConfiguracion: React.FC = () => {
  const { tenantActual } = useAuth();
  const { getToken } = useClerkAuth();
  const { setPageHeader } = usePageHeader();

  const [config, setConfig] = useState<ConfigSistemaFases | null>(null);
  const [asesores, setAsesores] = useState<AsesorFases[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('configuracion');

  // Form state para edición
  const [formData, setFormData] = useState({
    peso_fase_1: 100,
    peso_fase_2: 150,
    peso_fase_3: 200,
    peso_fase_4: 250,
    peso_fase_5: 300,
    comision_asesor_pct: 50,
    comision_empresa_pct: 50,
    intentos_fase_1: 3,
    meses_solitario_max: 3,
  });

  // Función para toggle del sistema (usada en el header)
  const toggleSistema = async (activo: boolean) => {
    if (!tenantActual?.id) return;

    try {
      setSaving(true);
      const token = await getToken();

      await apiFetch(
        `/tenants/${tenantActual.id}/sistema-fases/toggle`,
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
      title: 'Sistema de Fases',
      subtitle: 'Gestiona la gamificación y distribución de leads del pool publicitario',
      actions: [
        <button
          key="toggle-sistema"
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
        `/tenants/${tenantActual.id}/sistema-fases/config`,
        {},
        token
      );
      const configData = await configRes.json();
      setConfig(configData.config);

      if (configData.config) {
        setFormData({
          peso_fase_1: configData.config.peso_fase_1 || 100,
          peso_fase_2: configData.config.peso_fase_2 || 150,
          peso_fase_3: configData.config.peso_fase_3 || 200,
          peso_fase_4: configData.config.peso_fase_4 || 250,
          peso_fase_5: configData.config.peso_fase_5 || 300,
          comision_asesor_pct: parseFloat(configData.config.comision_asesor_pct) || 50,
          comision_empresa_pct: parseFloat(configData.config.comision_empresa_pct) || 50,
          intentos_fase_1: configData.config.intentos_fase_1 || 3,
          meses_solitario_max: configData.config.meses_solitario_max || 3,
        });
      }

      // Cargar asesores
      const asesoresRes = await apiFetch(
        `/tenants/${tenantActual.id}/sistema-fases/asesores`,
        {},
        token
      );
      const asesoresData = await asesoresRes.json();
      setAsesores(asesoresData.asesores || []);

      // Cargar usuarios del tenant
      const usuariosData = await getUsuariosTenant(tenantActual.id, token);
      setUsuarios(Array.isArray(usuariosData) ? usuariosData : []);

      // Cargar estadísticas
      const statsRes = await apiFetch(
        `/tenants/${tenantActual.id}/sistema-fases/estadisticas`,
        {},
        token
      );
      const statsData = await statsRes.json();
      setEstadisticas(statsData.estadisticas);
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
        `/tenants/${tenantActual.id}/sistema-fases/config`,
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

  const agregarAsesor = async (usuarioId: string) => {
    if (!tenantActual?.id || !usuarioId) return;

    try {
      const token = await getToken();

      await apiFetch(
        `/tenants/${tenantActual.id}/sistema-fases/asesores`,
        {
          method: 'POST',
          body: JSON.stringify({ usuarioId }),
        },
        token
      );

      setSuccessMsg('Asesor agregado al sistema');
      setTimeout(() => setSuccessMsg(null), 3000);
      await cargarDatos();
    } catch (err: any) {
      setError(err.message || 'Error al agregar asesor');
    }
  };

  const removerAsesor = async (usuarioId: string) => {
    if (!tenantActual?.id || !usuarioId) return;

    if (!confirm('¿Estás seguro de remover a este asesor del sistema de fases?')) return;

    try {
      const token = await getToken();

      await apiFetch(
        `/tenants/${tenantActual.id}/sistema-fases/asesores/${usuarioId}`,
        { method: 'DELETE' },
        token
      );

      setSuccessMsg('Asesor removido del sistema');
      setTimeout(() => setSuccessMsg(null), 3000);
      await cargarDatos();
    } catch (err: any) {
      setError(err.message || 'Error al remover asesor');
    }
  };

  const getFaseColor = (fase: number) => {
    if (fase === 0) return '#f59e0b';
    const colors = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#16a34a'];
    return colors[fase - 1] || '#64748b';
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
        <p style={{ color: '#64748b' }}>Cargando configuración...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Asesores que ya están en el sistema
  const asesoresEnSistema = asesores.filter((a) => a.en_sistema_fases);
  // Usuarios disponibles para agregar
  const usuariosDisponibles = usuarios.filter(
    (u) => !asesoresEnSistema.some((a) => a.usuario_id === u.id)
  );

  const tabs = [
    { id: 'configuracion' as TabType, label: 'Configuración', icon: Settings },
    { id: 'asesores' as TabType, label: `Asesores (${asesoresEnSistema.length})`, icon: Users },
    { id: 'estadisticas' as TabType, label: 'Estadísticas', icon: BarChart3 },
  ];

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

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          borderBottom: '2px solid #e2e8f0',
          paddingBottom: '0',
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '3px solid #667eea' : '3px solid transparent',
                marginBottom: '-2px',
                cursor: 'pointer',
                fontWeight: isActive ? 600 : 500,
                fontSize: '14px',
                color: isActive ? '#667eea' : '#64748b',
                transition: 'all 0.2s',
              }}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab: Configuración */}
      {activeTab === 'configuracion' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
            gap: '24px',
          }}
        >
          {/* Pesos por Fase */}
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
                fontSize: '16px',
                fontWeight: 600,
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#1e293b',
              }}
            >
              <TrendingUp size={20} color="#667eea" />
              Pesos por Fase
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              Mayor peso = más leads asignados a esa fase
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1, 2, 3, 4, 5].map((fase) => (
                <div
                  key={fase}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: getFaseColor(fase),
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '14px',
                      flexShrink: 0,
                    }}
                  >
                    {fase}
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={formData[`peso_fase_${fase}` as keyof typeof formData]}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        [`peso_fase_${fase}`]: parseInt(e.target.value) || 0,
                      })
                    }
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Reglas del Sistema */}
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
                fontSize: '16px',
                fontWeight: 600,
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#1e293b',
              }}
            >
              <Settings size={20} color="#667eea" />
              Reglas del Sistema
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Comisiones */}
              <div
                style={{
                  padding: '16px',
                  background: '#f8fafc',
                  borderRadius: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                  }}
                >
                  <DollarSign size={16} color="#16a34a" />
                  <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>
                    Comisiones del Pool
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#64748b' }}>Asesor (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.comision_asesor_pct}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setFormData({
                          ...formData,
                          comision_asesor_pct: val,
                          comision_empresa_pct: 100 - val,
                        });
                      }}
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
                  <div>
                    <label style={{ fontSize: '12px', color: '#64748b' }}>Empresa (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.comision_empresa_pct}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setFormData({
                          ...formData,
                          comision_empresa_pct: val,
                          comision_asesor_pct: 100 - val,
                        });
                      }}
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

              {/* Intentos y meses */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#475569',
                      marginBottom: '6px',
                    }}
                  >
                    Intentos en Fase 1
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={formData.intentos_fase_1}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        intentos_fase_1: parseInt(e.target.value) || 3,
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  />
                  <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                    Meses sin venta antes de solitario
                  </p>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#475569',
                      marginBottom: '6px',
                    }}
                  >
                    Máx. meses solitario
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={formData.meses_solitario_max}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        meses_solitario_max: parseInt(e.target.value) || 3,
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  />
                  <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                    Sin ventas = sale del sistema
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={guardarConfig}
              disabled={saving}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '14px',
                marginTop: '24px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
              }}
            >
              <Save size={18} />
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </div>
      )}

      {/* Tab: Asesores */}
      {activeTab === 'asesores' && (
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#1e293b',
              }}
            >
              <Users size={20} color="#667eea" />
              Asesores en el Sistema
            </h3>

            {/* Selector para agregar asesor */}
            {usuariosDisponibles.length > 0 && (
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    agregarAsesor(e.target.value);
                    e.target.value = '';
                  }
                }}
                style={{
                  padding: '10px 14px',
                  border: '2px solid #667eea',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  background: 'white',
                  color: '#667eea',
                  fontWeight: 500,
                }}
              >
                <option value="">+ Agregar asesor...</option>
                {usuariosDisponibles.map((u) => (
                  <option key={u.id} value={u.id} style={{ color: '#1e293b' }}>
                    {u.nombre} {u.apellido}
                  </option>
                ))}
              </select>
            )}
          </div>

          {asesoresEnSistema.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 40px',
                color: '#94a3b8',
              }}
            >
              <Users size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p style={{ marginBottom: '8px', fontSize: '16px' }}>
                No hay asesores en el sistema
              </p>
              <p style={{ fontSize: '14px' }}>
                Usa el selector de arriba para agregar asesores
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px',
              }}
            >
              {asesoresEnSistema.map((asesor) => (
                <div
                  key={asesor.usuario_id}
                  style={{
                    padding: '16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    background: asesor.en_modo_solitario ? '#fef3c7' : 'white',
                    transition: 'all 0.2s',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                      marginBottom: '12px',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: '15px',
                          fontWeight: 600,
                          color: '#1e293b',
                          marginBottom: '2px',
                        }}
                      >
                        {asesor.nombre} {asesor.apellido}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{asesor.email}</div>
                    </div>
                    <button
                      onClick={() => removerAsesor(asesor.usuario_id)}
                      style={{
                        padding: '6px',
                        background: '#fee2e2',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: '#dc2626',
                      }}
                      title="Remover del sistema"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {/* Fase */}
                    <div
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: getFaseColor(
                          asesor.en_modo_solitario ? 0 : asesor.fase_actual
                        ),
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      {asesor.en_modo_solitario ? 'Solitario' : `Fase ${asesor.fase_actual}`}
                    </div>

                    {/* PRESTIGE */}
                    {asesor.prestige > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          color: '#f59e0b',
                          fontWeight: 600,
                        }}
                      >
                        <Award size={14} />
                        {asesor.prestige}
                      </div>
                    )}

                    {/* ULTRA */}
                    {asesor.ultra_record > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          color: '#2563eb',
                          fontWeight: 600,
                        }}
                      >
                        <Trophy size={14} />
                        {asesor.ultra_record}
                      </div>
                    )}

                    {/* Ventas mes */}
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#64748b',
                        marginLeft: 'auto',
                      }}
                    >
                      {asesor.ventas_mes_actual} ventas/mes
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Estadísticas */}
      {activeTab === 'estadisticas' && estadisticas && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* Resumen general */}
          <div
            style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              borderRadius: '16px',
              padding: '24px',
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
              Resumen General
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                gap: '20px',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 700 }}>
                  {estadisticas.total_asesores}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>Total Asesores</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 700, color: '#f59e0b' }}>
                  {estadisticas.total_prestige}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>PRESTIGE Total</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 700, color: '#3b82f6' }}>
                  {estadisticas.max_ultra}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>Máx. ULTRA</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 700, color: '#16a34a' }}>
                  {estadisticas.leads_asignados}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>Leads Asignados</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 700, color: '#ef4444' }}>
                  {estadisticas.leads_pendientes}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>Leads Pendientes</div>
              </div>
            </div>
          </div>

          {/* Distribución por fase */}
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
                fontSize: '16px',
                fontWeight: 600,
                marginBottom: '20px',
                color: '#1e293b',
              }}
            >
              Distribución por Fase
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: '16px',
              }}
            >
              {[1, 2, 3, 4, 5].map((fase) => (
                <div
                  key={fase}
                  style={{
                    textAlign: 'center',
                    padding: '20px 12px',
                    background: '#f8fafc',
                    borderRadius: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: getFaseColor(fase),
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '20px',
                      margin: '0 auto 12px',
                    }}
                  >
                    {fase}
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b' }}>
                    {estadisticas[`fase_${fase}` as keyof Estadisticas] || 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>asesores</div>
                </div>
              ))}
              <div
                style={{
                  textAlign: 'center',
                  padding: '20px 12px',
                  background: '#fef3c7',
                  borderRadius: '12px',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: '#f59e0b',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '14px',
                    margin: '0 auto 12px',
                  }}
                >
                  SOL
                </div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b' }}>
                  {estadisticas.modo_solitario}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>solitario</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'estadisticas' && !estadisticas && (
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '60px',
            textAlign: 'center',
            color: '#94a3b8',
          }}
        >
          <BarChart3 size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <p>No hay estadísticas disponibles</p>
        </div>
      )}
    </div>
  );
};

export default CrmSistemaFasesConfiguracion;
