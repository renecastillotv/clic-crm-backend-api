/**
 * CrmSistemaFases - Dashboard del Sistema de Fases para Asesores
 * 
 * Muestra al asesor:
 * - Su fase actual
 * - PRESTIGE y ULTRA
 * - Leads asignados
 * - Progreso y estadísticas
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { usePageHeader } from '../../layouts/CrmLayout';
import {
  getSistemaFasesProyectos,
  getSistemaFasesAsesores,
  getSistemaFasesLeads,
  SistemaFasesProyecto,
  SistemaFasesAsesor,
  SistemaFasesLead,
} from '../../services/api';
import { TrendingUp, Target, Users, Award, Zap, ArrowUp, ArrowDown } from 'lucide-react';

const CrmSistemaFases: React.FC = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { tenantActual, user } = useAuth();
  const { getToken } = useClerkAuth();
  const { setPageHeader } = usePageHeader();

  const [proyectos, setProyectos] = useState<SistemaFasesProyecto[]>([]);
  const [asesores, setAsesores] = useState<SistemaFasesAsesor[]>([]);
  const [leads, setLeads] = useState<Record<string, SistemaFasesLead[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedProyecto, setSelectedProyecto] = useState<string | null>(null);

  useEffect(() => {
    setPageHeader({
      title: 'Sistema de Fases',
      subtitle: 'Tu progreso y estadísticas',
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
      const token = await getToken();
      const proyectosData = await getSistemaFasesProyectos(tenantActual.id, token);
      setProyectos(proyectosData.filter(p => p.activo));

      // Cargar información del asesor en cada proyecto
      const asesoresData: SistemaFasesAsesor[] = [];
      const leadsData: Record<string, SistemaFasesLead[]> = {};

      for (const proyecto of proyectosData.filter(p => p.activo)) {
        try {
          const asesoresProyecto = await getSistemaFasesAsesores(tenantActual.id, proyecto.id, token);
          const asesor = asesoresProyecto.find(a => a.usuario_id === user.id);
          
          if (asesor) {
            asesoresData.push(asesor);
            if (!selectedProyecto) {
              setSelectedProyecto(proyecto.id);
            }

            // Cargar leads del asesor
            const leadsAsesor = await getSistemaFasesLeads(tenantActual.id, proyecto.id, asesor.id, token);
            leadsData[proyecto.id] = leadsAsesor;
          }
        } catch (error) {
          console.error(`Error cargando datos del proyecto ${proyecto.id}:`, error);
        }
      }

      setAsesores(asesoresData);
      setLeads(leadsData);
    } catch (error: any) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p>Cargando...</p>
      </div>
    );
  }

  if (asesores.length === 0) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}>
          <Users size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
            No estás en ningún proyecto activo
          </h2>
          <p style={{ color: '#6b7280' }}>
            Contacta a tu administrador para ser agregado a un proyecto del Sistema de Fases.
          </p>
        </div>
      </div>
    );
  }

  const asesorActual = asesores.find(a => a.proyecto_id === selectedProyecto) || asesores[0];
  const proyectoActual = proyectos.find(p => p.id === asesorActual.proyecto_id);
  const leadsActuales = leads[asesorActual.proyecto_id] || [];

  const getFaseColor = (fase: number) => {
    if (fase === 0) return '#f59e0b'; // Modo solitario
    if (fase === 5) return '#16a34a'; // Fase máxima
    return ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#16a34a'][fase - 1] || '#64748b';
  };

  const getFaseLabel = (fase: number) => {
    if (fase === 0) return 'Modo Solitario';
    return `Fase ${fase}`;
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Tarjeta de Fase Actual */}
        <div style={{
          background: `linear-gradient(135deg, ${getFaseColor(asesorActual.fase_actual)} 0%, ${getFaseColor(asesorActual.fase_actual)}dd 100%)`,
          borderRadius: '12px',
          padding: '32px',
          color: 'white',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Target size={32} />
            <div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Fase Actual</div>
              <div style={{ fontSize: '32px', fontWeight: 700 }}>
                {getFaseLabel(asesorActual.fase_actual)}
              </div>
            </div>
          </div>
          
          {asesorActual.fase_actual === 1 && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '8px' }}>
              <div style={{ fontSize: '14px', marginBottom: '4px' }}>Intentos Usados</div>
              <div style={{ fontSize: '20px', fontWeight: 600 }}>
                {asesorActual.intentos_usados} / {asesorActual.intentos_totales}
              </div>
            </div>
          )}

          {asesorActual.en_modo_solitario && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '8px' }}>
              <div style={{ fontSize: '14px' }}>Meses sin venta: {asesorActual.meses_sin_venta_solitario}</div>
            </div>
          )}
        </div>

        {/* Tarjeta de PRESTIGE y ULTRA */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <Award size={24} color="#f59e0b" />
            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Logros</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>PRESTIGE</div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#f59e0b' }}>
                {asesorActual.prestige}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                {asesorActual.ventas_fase_5_actuales} / 3 ventas para el próximo nivel
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>ULTRA</div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#2563eb' }}>
                {asesorActual.ultra_maximo}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                {asesorActual.ultra_fecha ? `Alcanzado: ${new Date(asesorActual.ultra_fecha).toLocaleDateString()}` : 'Aún no alcanzado'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas del Mes */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={20} />
          Estadísticas del Mes
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Ventas Este Mes</div>
            <div style={{ fontSize: '28px', fontWeight: 600 }}>{asesorActual.ventas_mes_actual}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Leads Asignados</div>
            <div style={{ fontSize: '28px', fontWeight: 600 }}>{leadsActuales.length}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Leads Convertidos</div>
            <div style={{ fontSize: '28px', fontWeight: 600, color: '#16a34a' }}>
              {leadsActuales.filter(l => l.estado === 'convertido').length}
            </div>
          </div>
        </div>
      </div>

      {/* Proyectos */}
      {proyectos.length > 1 && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Proyectos</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {proyectos.map((proyecto) => {
              const asesor = asesores.find(a => a.proyecto_id === proyecto.id);
              if (!asesor) return null;
              return (
                <button
                  key={proyecto.id}
                  onClick={() => setSelectedProyecto(proyecto.id)}
                  style={{
                    padding: '12px 20px',
                    border: selectedProyecto === proyecto.id ? '2px solid #667eea' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    background: selectedProyecto === proyecto.id ? '#f0f4ff' : 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {proyecto.propiedad_id ? 'Proyecto' : 'Proyecto General'} - {getFaseLabel(asesor.fase_actual)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Leads Asignados */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={20} />
          Leads Asignados
        </h3>
        {leadsActuales.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            <p>No tienes leads asignados aún</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {leadsActuales.map((lead) => (
              <div
                key={lead.id}
                style={{
                  padding: '16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
                    {lead.contacto_nombre} {lead.contacto_apellido}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {lead.contacto_email} • {lead.contacto_telefono}
                  </div>
                  {lead.fase_asignacion && (
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      Asignado en Fase {lead.fase_asignacion} • Valor: ${lead.valor_asignado}
                    </div>
                  )}
                </div>
                <div>
                  <span style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 500,
                    background: lead.estado === 'convertido' ? '#dcfce7' : lead.estado === 'perdido' ? '#fee2e2' : '#f1f5f9',
                    color: lead.estado === 'convertido' ? '#16a34a' : lead.estado === 'perdido' ? '#dc2626' : '#64748b',
                  }}>
                    {lead.estado === 'convertido' ? '✅ Convertido' : lead.estado === 'perdido' ? '❌ Perdido' : '⏳ Pendiente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CrmSistemaFases;

