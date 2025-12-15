/**
 * CrmSistemaFasesConfiguracion - Configuración del Sistema de Fases
 * 
 * Permite a los admins/tenants:
 * - Crear y gestionar proyectos
 * - Agregar asesores a proyectos
 * - Configurar montos de inversión por fase
 * - Ver estadísticas
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { usePageHeader } from '../../layouts/CrmLayout';
import {
  getSistemaFasesProyectos,
  createSistemaFasesProyecto,
  updateSistemaFasesProyecto,
  deleteSistemaFasesProyecto,
  getSistemaFasesAsesores,
  agregarAsesorSistemaFases,
  getSistemaFasesEstadisticas,
  getPropiedadesCrm,
  getUsuariosTenant,
  SistemaFasesProyecto,
  SistemaFasesAsesor,
} from '../../services/api';
import { Settings, Plus, Edit, Trash2, Users, TrendingUp, DollarSign, Target, X, Search, Building2, Sparkles } from 'lucide-react';

const CrmSistemaFasesConfiguracion: React.FC = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { tenantActual, user } = useAuth();
  const { getToken } = useClerkAuth();
  const { setPageHeader } = usePageHeader();

  const [proyectos, setProyectos] = useState<SistemaFasesProyecto[]>([]);
  const [propiedades, setPropiedades] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProyecto, setEditingProyecto] = useState<SistemaFasesProyecto | null>(null);
  const [selectedProyecto, setSelectedProyecto] = useState<string | null>(null);
  const [asesores, setAsesores] = useState<SistemaFasesAsesor[]>([]);
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const [selectedUsuarioParaAgregar, setSelectedUsuarioParaAgregar] = useState<string>('');

  useEffect(() => {
    setPageHeader({
      title: 'Configuración - Sistema de Fases',
      subtitle: `Gestiona Pools/Campañas, asesores y configuración para ${tenantActual?.nombre || 'tu empresa'}`,
      actions: [
        {
          label: 'Nuevo Pool/Campaña',
          onClick: () => {
            setEditingProyecto(null);
            setShowModal(true);
          },
          variant: 'primary',
          icon: <Plus className="w-4 h-4" />,
        },
      ],
    });
  }, [setPageHeader, tenantActual?.nombre]);

  useEffect(() => {
    if (tenantActual?.id) {
      cargarDatos();
    }
  }, [tenantActual?.id]);

  const cargarDatos = async () => {
    if (!tenantActual?.id) return;
    
    try {
      setLoading(true);
      const token = await getToken();
      const [proyectosData, propiedadesData, usuariosData] = await Promise.all([
        getSistemaFasesProyectos(tenantActual.id, token),
        getPropiedadesCrm(tenantActual.id, { limit: 1000 }),
        getUsuariosTenant(tenantActual.id, token),
      ]);

      setProyectos(proyectosData);
      const propsArray = propiedadesData.data || propiedadesData.propiedades || [];
      console.log('📦 Propiedades cargadas:', propsArray.length, propsArray);
      setPropiedades(propsArray);
      
      // getUsuariosTenant devuelve un array directamente
      console.log('👥 Usuarios recibidos:', usuariosData, 'Tipo:', typeof usuariosData, 'Es array:', Array.isArray(usuariosData));
      setUsuarios(Array.isArray(usuariosData) ? usuariosData : []);
    } catch (error: any) {
      console.error('Error cargando datos:', error);
      alert('Error al cargar datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarAsesores = async (proyectoId: string) => {
    if (!tenantActual?.id) return;
    
    try {
      const token = await getToken();
      const asesoresData = await getSistemaFasesAsesores(tenantActual.id, proyectoId, token);
      setAsesores(asesoresData);
      
      const stats = await getSistemaFasesEstadisticas(tenantActual.id, proyectoId, token);
      setEstadisticas(stats);
    } catch (error: any) {
      console.error('Error cargando asesores:', error);
    }
  };

  const handleSaveProyecto = async (data: any) => {
    if (!tenantActual?.id) return;

    try {
      const token = await getToken();
      if (editingProyecto) {
        await updateSistemaFasesProyecto(tenantActual.id, editingProyecto.id, data, token);
      } else {
        await createSistemaFasesProyecto(tenantActual.id, data, token);
      }
      setShowModal(false);
      setEditingProyecto(null);
      cargarDatos();
    } catch (error: any) {
      alert('Error al guardar Pool/Campaña: ' + error.message);
    }
  };

  const handleDeleteProyecto = async (proyectoId: string) => {
    if (!tenantActual?.id) return;
    if (!confirm('¿Estás seguro de eliminar este Pool/Campaña?')) return;

    try {
      const token = await getToken();
      await deleteSistemaFasesProyecto(tenantActual.id, proyectoId, token);
      cargarDatos();
      if (selectedProyecto === proyectoId) {
        setSelectedProyecto(null);
        setAsesores([]);
        setEstadisticas(null);
      }
    } catch (error: any) {
      alert('Error al eliminar Pool/Campaña: ' + error.message);
    }
  };

  const handleAgregarAsesor = async (usuarioId: string) => {
    if (!tenantActual?.id || !selectedProyecto) {
      alert('No hay proyecto seleccionado');
      return;
    }

    if (!usuarioId) {
      alert('Por favor selecciona un asesor');
      return;
    }

    try {
      console.log('➕ Agregando asesor:', { tenantId: tenantActual.id, proyectoId: selectedProyecto, usuarioId });
      const token = await getToken();
      console.log('🔑 Token obtenido:', token ? 'Sí' : 'No');
      
      const resultado = await agregarAsesorSistemaFases(tenantActual.id, selectedProyecto, usuarioId, token);
      console.log('✅ Asesor agregado:', resultado);
      
      // Recargar asesores y datos
      await cargarAsesores(selectedProyecto);
      await cargarDatos();
      
      // Mostrar mensaje de éxito
      alert('Asesor agregado exitosamente');
    } catch (error: any) {
      console.error('❌ Error al agregar asesor:', error);
      alert('Error al agregar asesor: ' + (error.message || 'Error desconocido'));
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Lista de Proyectos */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={20} />
            Pools/Campañas
          </h2>

          {proyectos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <Sparkles size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p style={{ fontSize: '16px', marginBottom: '8px' }}>No hay Pools/Campañas configurados</p>
              <p style={{ fontSize: '14px', color: '#94a3b8' }}>Crea tu primer Pool para comenzar a gestionar el Sistema de Fases</p>
              <button
                onClick={() => {
                  setEditingProyecto(null);
                  setShowModal(true);
                }}
                style={{
                  marginTop: '20px',
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                }}
              >
                <Plus size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                Crear Primer Pool/Campaña
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {proyectos.map((proyecto) => {
                const propiedad = propiedades.find(p => p.id === proyecto.propiedad_id);
                return (
                  <div
                    key={proyecto.id}
                    onClick={() => {
                      setSelectedProyecto(proyecto.id);
                      cargarAsesores(proyecto.id);
                    }}
                    style={{
                      padding: '16px',
                      border: selectedProyecto === proyecto.id ? '2px solid #667eea' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: selectedProyecto === proyecto.id ? '#f0f4ff' : 'white',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                          {propiedad?.titulo || 'Pool/Campaña General'}
                        </h3>
                        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                          {proyecto.activo ? '✅ Activo' : '⏸️ Inactivo'}
                        </p>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#64748b' }}>
                          <span>Fase 1: ${proyecto.monto_fase_1}</span>
                          <span>Fase 5: ${proyecto.monto_fase_5}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProyecto(proyecto);
                            setShowModal(true);
                          }}
                          style={{
                            padding: '6px',
                            background: '#f1f5f9',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProyecto(proyecto.id);
                          }}
                          style={{
                            padding: '6px',
                            background: '#fee2e2',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={16} color="#dc2626" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detalles del Proyecto Seleccionado */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}>
          {selectedProyecto ? (
            <>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={20} />
                Asesores y Estadísticas
              </h2>

              {/* Estadísticas */}
              {estadisticas && (
                <div style={{
                  background: '#f8fafc',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '20px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Total Asesores</div>
                    <div style={{ fontSize: '24px', fontWeight: 600 }}>{estadisticas.total_asesores || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>En Fase 5</div>
                    <div style={{ fontSize: '24px', fontWeight: 600, color: '#16a34a' }}>{estadisticas.asesores_fase_5 || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Leads Convertidos</div>
                    <div style={{ fontSize: '24px', fontWeight: 600, color: '#2563eb' }}>{estadisticas.leads_convertidos || 0}</div>
                  </div>
                </div>
              )}

              {/* Agregar Asesor */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                  Agregar Asesor
                </label>
                <select
                  value={selectedUsuarioParaAgregar}
                  onChange={async (e) => {
                    const usuarioId = e.target.value;
                    setSelectedUsuarioParaAgregar(usuarioId);
                    if (usuarioId) {
                      await handleAgregarAsesor(usuarioId);
                      // Resetear el select después de agregar
                      setSelectedUsuarioParaAgregar('');
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white',
                  }}
                >
                  <option value="">Seleccionar asesor...</option>
                  {usuarios.length === 0 ? (
                    <option value="" disabled>No hay usuarios disponibles</option>
                  ) : (
                    usuarios
                      .filter(u => !asesores.some(a => a.usuario_id === u.id))
                      .map((usuario) => (
                        <option key={usuario.id} value={usuario.id}>
                          {usuario.nombre || ''} {usuario.apellido || ''} {usuario.nombre || usuario.apellido ? ' - ' : ''}({usuario.email})
                        </option>
                      ))
                  )}
                  {usuarios.length > 0 && usuarios.filter(u => !asesores.some(a => a.usuario_id === u.id)).length === 0 && (
                    <option value="" disabled>Todos los usuarios ya están en este proyecto</option>
                  )}
                </select>
              </div>

              {/* Lista de Asesores */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
                {asesores.map((asesor) => (
                  <div
                    key={asesor.id}
                    style={{
                      padding: '16px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      background: asesor.en_modo_solitario ? '#fef3c7' : 'white',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
                          {asesor.usuario_nombre} {asesor.usuario_apellido}
                        </h4>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                          {asesor.en_modo_solitario ? '🔶 Modo Solitario' : `Fase ${asesor.fase_actual}`}
                        </div>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#64748b' }}>
                          {asesor.prestige > 0 && (
                            <span>⭐ PRESTIGE: {asesor.prestige}</span>
                          )}
                          {asesor.ultra_maximo > 0 && (
                            <span>🏆 ULTRA: {asesor.ultra_maximo}</span>
                          )}
                          <span>Ventas este mes: {asesor.ventas_mes_actual}</span>
                        </div>
                        {asesor.fase_actual === 1 && (
                          <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '4px' }}>
                            Intentos: {asesor.intentos_usados}/{asesor.intentos_totales}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <Users size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                <Target size={48} style={{ marginBottom: '16px', opacity: '0.5' }} />
                <p style={{ fontSize: '16px', marginBottom: '8px' }}>Selecciona un Pool/Campaña</p>
                <p style={{ fontSize: '14px', color: '#94a3b8' }}>Elige un Pool/Campaña de la lista para ver asesores y estadísticas</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Crear/Editar Proyecto */}
      {showModal && (
        <ModalProyecto
          proyecto={editingProyecto}
          propiedades={propiedades}
          tenantNombre={tenantActual?.nombre || 'Empresa'}
          onClose={() => {
            setShowModal(false);
            setEditingProyecto(null);
          }}
          onSave={handleSaveProyecto}
        />
      )}
    </div>
  );
};

// Modal para crear/editar Pool/Campaña
const ModalProyecto: React.FC<{
  proyecto: SistemaFasesProyecto | null;
  propiedades: any[];
  tenantNombre: string;
  onClose: () => void;
  onSave: (data: any) => void;
}> = ({ proyecto, propiedades, tenantNombre, onClose, onSave }) => {
  // Debug: verificar propiedades recibidas
  useEffect(() => {
    console.log('🔍 Modal recibió propiedades:', propiedades.length, propiedades);
  }, [propiedades]);

  const [formData, setFormData] = useState({
    propiedad_id: proyecto?.propiedad_id || '',
    porcentaje_comision_asesor: proyecto?.porcentaje_comision_asesor || 50,
    porcentaje_comision_tenant: proyecto?.porcentaje_comision_tenant || 50,
    monto_fase_1: proyecto?.monto_fase_1 || 100,
    monto_fase_2: proyecto?.monto_fase_2 || 150,
    monto_fase_3: proyecto?.monto_fase_3 || 200,
    monto_fase_4: proyecto?.monto_fase_4 || 250,
    monto_fase_5: proyecto?.monto_fase_5 || 300,
    intentos_fase_1: proyecto?.intentos_fase_1 || 3,
    meses_solitario: proyecto?.meses_solitario || 3,
    activo: proyecto?.activo ?? true,
  });

  const [showPropiedadSelector, setShowPropiedadSelector] = useState(false);
  const [busquedaPropiedad, setBusquedaPropiedad] = useState('');

  // Debug: verificar propiedades disponibles
  React.useEffect(() => {
    if (showPropiedadSelector) {
      console.log('🔍 Propiedades disponibles en selector:', propiedades.length, propiedades);
    }
  }, [showPropiedadSelector, propiedades]);

  const propiedadesFiltradas = React.useMemo(() => {
    if (!busquedaPropiedad.trim()) {
      return propiedades;
    }
    const busquedaLower = busquedaPropiedad.toLowerCase();
    return propiedades.filter(prop =>
      prop.titulo?.toLowerCase().includes(busquedaLower) ||
      prop.codigo?.toLowerCase().includes(busquedaLower) ||
      prop.sector?.toLowerCase().includes(busquedaLower) ||
      prop.ciudad?.toLowerCase().includes(busquedaLower) ||
      prop.zona?.toLowerCase().includes(busquedaLower)
    );
  }, [propiedades, busquedaPropiedad]);

  const propiedadSeleccionada = propiedades.find(p => p.id === formData.propiedad_id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const formatMoney = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            borderRadius: '20px',
            padding: 0,
            width: '100%',
            maxWidth: '900px',
            maxHeight: '95vh',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header con gradiente */}
          <div
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '24px 32px',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sparkles size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>
                  {proyecto ? 'Editar Pool/Campaña' : 'Nuevo Pool/Campaña'}
                </h2>
                <p style={{ fontSize: '14px', margin: '4px 0 0 0', opacity: 0.9 }}>
                  Configura el Sistema de Fases para {tenantNombre}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Body con scroll */}
          <div
            style={{
              padding: '32px',
              overflowY: 'auto',
              flex: 1,
            }}
          >

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Selector de Propiedad */}
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#1e293b' }}>
                    Propiedad Vinculada
                  </label>
                  {propiedadSeleccionada ? (
                    <div
                      style={{
                        border: '2px solid #667eea',
                        borderRadius: '12px',
                        padding: '16px',
                        background: 'linear-gradient(135deg, #f0f4ff 0%, #ffffff 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                        <div
                          style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            background: '#e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {propiedadSeleccionada.imagen_principal ? (
                            <img
                              src={propiedadSeleccionada.imagen_principal}
                              alt={propiedadSeleccionada.titulo}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <Building2 size={32} color="#94a3b8" />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0', color: '#1e293b' }}>
                            {propiedadSeleccionada.titulo}
                          </h3>
                          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 4px 0' }}>
                            {propiedadSeleccionada.codigo && `Ref: ${propiedadSeleccionada.codigo} • `}
                            {[propiedadSeleccionada.sector, propiedadSeleccionada.ciudad].filter(Boolean).join(', ') || 'Sin ubicación'}
                          </p>
                          <p style={{ fontSize: '14px', fontWeight: 600, color: '#667eea', margin: 0 }}>
                            {formatMoney(propiedadSeleccionada.precio || 0, propiedadSeleccionada.moneda || 'USD')}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, propiedad_id: '' })}
                        style={{
                          background: '#fee2e2',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px',
                          cursor: 'pointer',
                          color: '#dc2626',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowPropiedadSelector(true)}
                      style={{
                        width: '100%',
                        padding: '16px',
                        border: '2px dashed #cbd5e0',
                        borderRadius: '12px',
                        background: '#f8fafc',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        color: '#64748b',
                        fontSize: '14px',
                        fontWeight: 500,
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#667eea';
                        e.currentTarget.style.background = '#f0f4ff';
                        e.currentTarget.style.color = '#667eea';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#cbd5e0';
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.color = '#64748b';
                      }}
                    >
                      <Building2 size={20} />
                      Seleccionar Propiedad
                    </button>
                  )}
                </div>

                {/* Distribución de Comisiones */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <DollarSign size={18} />
                    Distribución de Comisiones
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: '#64748b' }}>
                        % Comisión Asesor
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.porcentaje_comision_asesor}
                        onChange={(e) => {
                          const valor = parseFloat(e.target.value) || 0;
                          setFormData({
                            ...formData,
                            porcentaje_comision_asesor: valor,
                            porcentaje_comision_tenant: 100 - valor,
                          });
                        }}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '2px solid #e2e8f0',
                          borderRadius: '10px',
                          fontSize: '15px',
                          fontWeight: 600,
                          background: 'white',
                          transition: 'all 0.2s',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#667eea';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: '#64748b' }}>
                        % Comisión {tenantNombre}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.porcentaje_comision_tenant}
                        onChange={(e) => {
                          const valor = parseFloat(e.target.value) || 0;
                          setFormData({
                            ...formData,
                            porcentaje_comision_tenant: valor,
                            porcentaje_comision_asesor: 100 - valor,
                          });
                        }}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '2px solid #e2e8f0',
                          borderRadius: '10px',
                          fontSize: '15px',
                          fontWeight: 600,
                          background: 'white',
                          transition: 'all 0.2s',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#667eea';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '10px',
                      borderRadius: '8px',
                      background: (formData.porcentaje_comision_asesor + formData.porcentaje_comision_tenant) === 100
                        ? '#dcfce7'
                        : '#fee2e2',
                      textAlign: 'center',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: (formData.porcentaje_comision_asesor + formData.porcentaje_comision_tenant) === 100
                        ? '#16a34a'
                        : '#dc2626',
                    }}
                  >
                    Total: {formData.porcentaje_comision_asesor + formData.porcentaje_comision_tenant}%
                    {(formData.porcentaje_comision_asesor + formData.porcentaje_comision_tenant) !== 100 && ' (debe sumar 100%)'}
                  </div>
                </div>

                {/* Montos de Inversión por Fase */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #fef3c7 0%, #ffffff 100%)',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid #fde68a',
                  }}
                >
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp size={18} />
                    Montos de Inversión por Fase USD$
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px', marginTop: '4px' }}>
                    Define el monto de inversión publicitaria para cada fase del sistema
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                    {[1, 2, 3, 4, 5].map((fase) => (
                      <div key={fase}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#475569' }}>
                          Fase {fase}
                        </label>
                        <div style={{ position: 'relative' }}>
                          <span
                            style={{
                              position: 'absolute',
                              left: '10px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: '13px',
                              fontWeight: 600,
                              color: '#64748b',
                            }}
                          >
                            $
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="10"
                            value={formData[`monto_fase_${fase}` as keyof typeof formData] as number}
                            onChange={(e) => setFormData({ ...formData, [`monto_fase_${fase}`]: parseFloat(e.target.value) || 0 } as any)}
                            style={{
                              width: '100%',
                              padding: '10px 10px 10px 28px',
                              border: '2px solid #e2e8f0',
                              borderRadius: '10px',
                              fontSize: '14px',
                              fontWeight: 600,
                              background: 'white',
                              transition: 'all 0.2s',
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = '#fbbf24';
                              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251, 191, 36, 0.1)';
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor = '#e2e8f0';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Configuración Avanzada */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid #bae6fd',
                  }}
                >
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Target size={18} />
                    Configuración Avanzada
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: '#64748b' }}>
                        Intentos Fase 1
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={formData.intentos_fase_1}
                        onChange={(e) => setFormData({ ...formData, intentos_fase_1: parseInt(e.target.value) || 3 })}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '2px solid #e2e8f0',
                          borderRadius: '10px',
                          fontSize: '15px',
                          fontWeight: 600,
                          background: 'white',
                          transition: 'all 0.2s',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#0ea5e9';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(14, 165, 233, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                      <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                        Meses para cerrar venta antes de entrar en modo solitario
                      </p>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: '#64748b' }}>
                        Meses Modo Solitario
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={formData.meses_solitario}
                        onChange={(e) => setFormData({ ...formData, meses_solitario: parseInt(e.target.value) || 3 })}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '2px solid #e2e8f0',
                          borderRadius: '10px',
                          fontSize: '15px',
                          fontWeight: 600,
                          background: 'white',
                          transition: 'all 0.2s',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#0ea5e9';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(14, 165, 233, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                      <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                        Tiempo máximo sin ventas antes de salir del sistema
                      </p>
                    </div>
                  </div>
                </div>

                {/* Estado Activo */}
                <div
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '2px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px', color: '#1e293b', cursor: 'pointer' }}>
                      Pool/Campaña Activo
                    </label>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                      El sistema de fases estará activo y procesando ventas
                    </p>
                  </div>
                  <label
                    style={{
                      position: 'relative',
                      display: 'inline-block',
                      width: '52px',
                      height: '28px',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.activo}
                      onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: formData.activo ? '#667eea' : '#cbd5e0',
                        borderRadius: '28px',
                        transition: 'all 0.3s',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          content: '""',
                          height: '22px',
                          width: '22px',
                          left: '3px',
                          bottom: '3px',
                          background: 'white',
                          borderRadius: '50%',
                          transition: 'all 0.3s',
                          transform: formData.activo ? 'translateX(24px)' : 'translateX(0)',
                        }}
                      />
                    </span>
                  </label>
                </div>
              </div>

              {/* Footer con botones */}
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  marginTop: '32px',
                  justifyContent: 'flex-end',
                  paddingTop: '24px',
                  borderTop: '1px solid #e2e8f0',
                }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '12px 24px',
                    background: '#f1f5f9',
                    color: '#334155',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e2e8f0';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                  }}
                >
                  {proyecto ? 'Actualizar Pool/Campaña' : 'Crear Pool/Campaña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Modal Selector de Propiedades */}
      {showPropiedadSelector && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px',
          }}
          onClick={() => setShowPropiedadSelector(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '1000px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3 style={{ fontSize: '20px', fontWeight: 600, margin: 0, color: '#1e293b' }}>
                Seleccionar Propiedad
              </h3>
              <button
                onClick={() => setShowPropiedadSelector(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '8px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ position: 'relative' }}>
                <Search
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                  }}
                />
                <input
                  type="text"
                  placeholder="Buscar por título, código o ubicación..."
                  value={busquedaPropiedad}
                  onChange={(e) => setBusquedaPropiedad(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>
            <div
              style={{
                padding: '20px',
                overflowY: 'auto',
                flex: 1,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px',
              }}
            >
              {propiedades.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <Building2 size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
                  <p style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>No hay propiedades disponibles</p>
                  <p style={{ fontSize: '14px', color: '#64748b' }}>Asegúrate de tener propiedades creadas en el sistema</p>
                </div>
              ) : propiedadesFiltradas.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <Search size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
                  <p style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>No se encontraron propiedades</p>
                  <p style={{ fontSize: '14px', color: '#64748b' }}>Intenta con otros términos de búsqueda</p>
                </div>
              ) : (
                propiedadesFiltradas.map((prop) => (
                  <div
                    key={prop.id}
                    onClick={() => {
                      setFormData({ ...formData, propiedad_id: prop.id });
                      setShowPropiedadSelector(false);
                      setBusquedaPropiedad('');
                    }}
                    style={{
                      border: formData.propiedad_id === prop.id ? '2px solid #667eea' : '2px solid #e2e8f0',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      background: formData.propiedad_id === prop.id ? '#f0f4ff' : 'white',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (formData.propiedad_id !== prop.id) {
                        e.currentTarget.style.borderColor = '#cbd5e0';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (formData.propiedad_id !== prop.id) {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '160px',
                        background: '#e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      {prop.imagen_principal ? (
                        <img
                          src={prop.imagen_principal}
                          alt={prop.titulo}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <Building2 size={48} color="#94a3b8" />
                      )}
                    </div>
                    <div style={{ padding: '16px' }}>
                      <h4
                        style={{
                          fontSize: '15px',
                          fontWeight: 600,
                          margin: '0 0 6px 0',
                          color: '#1e293b',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {prop.titulo}
                      </h4>
                      <p
                        style={{
                          fontSize: '12px',
                          color: '#64748b',
                          margin: '0 0 8px 0',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {prop.codigo && `Ref: ${prop.codigo} • `}
                        {[prop.sector, prop.ciudad].filter(Boolean).join(', ') || 'Sin ubicación'}
                      </p>
                      <p
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: '#667eea',
                          margin: 0,
                        }}
                      >
                        {formatMoney(prop.precio || 0, prop.moneda || 'USD')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CrmSistemaFasesConfiguracion;

