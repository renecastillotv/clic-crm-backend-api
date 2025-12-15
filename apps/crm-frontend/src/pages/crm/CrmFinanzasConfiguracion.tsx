/**
 * CrmFinanzasConfiguracion - Configuración de finanzas
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import { Percent, Settings, FileText, Calendar, CreditCard, Users, UserCheck, Building2, Home } from 'lucide-react';

export default function CrmFinanzasConfiguracion() {
  const { tenantActual } = useAuth();
  const { setPageHeader } = usePageHeader();
  const [activeTab, setActiveTab] = useState('split-comisiones');

  // Configurar header de la página
  useEffect(() => {
    setPageHeader({
      title: 'Configuración de Finanzas',
      subtitle: `Ajustes de finanzas para ${tenantActual?.nombre || 'tu CRM'}`,
    });
  }, [setPageHeader, tenantActual?.nombre]);

  const tabs = [
    { id: 'split-comisiones', label: 'Split de Comisiones', icon: Percent },
    { id: 'facturacion', label: 'Facturación', icon: FileText },
    { id: 'periodos', label: 'Periodos de Pago', icon: Calendar },
    { id: 'metodos', label: 'Métodos de Pago', icon: CreditCard },
  ];

  return (
    <div className="page">
      {/* Sistema de Pestañas */}
      <div className="tabs-container">
        <div className="tabs-header">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="tab-icon" size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="tabs-content">
          {activeTab === 'split-comisiones' && <SplitComisionesTab />}
          {activeTab === 'facturacion' && <FacturacionTab />}
          {activeTab === 'periodos' && <PeriodosTab />}
          {activeTab === 'metodos' && <MetodosTab />}
        </div>
      </div>

      <style>{`
        .page {
          width: 100%;
        }

        .tabs-container {
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }

        .tabs-header {
          display: flex;
          border-bottom: 2px solid #e2e8f0;
          background: #f8fafc;
          overflow-x: auto;
        }

        .tab-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 16px 24px;
          border: none;
          background: transparent;
          color: #64748b;
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border-bottom: 3px solid transparent;
          white-space: nowrap;
        }

        .tab-button:hover {
          color: #334155;
          background: #f1f5f9;
        }

        .tab-button.active {
          color: #667eea;
          background: white;
          border-bottom-color: #667eea;
        }

        .tab-icon {
          flex-shrink: 0;
        }

        .tabs-content {
          padding: 32px;
        }
      `}</style>
    </div>
  );
}

// Componente para la pestaña de Split de Comisiones
function SplitComisionesTab() {
  const [viewMode, setViewMode] = useState<'general' | 'personalizado'>('general');
  const [tipoPropiedad, setTipoPropiedad] = useState<'lista' | 'proyecto' | 'ambas'>('ambas');
  const [mismoAsesor, setMismoAsesor] = useState<boolean | null>(null); // null = sin separación
  const [sinVariantesTipo, setSinVariantesTipo] = useState<boolean>(false);

  return (
    <div className="split-comisiones-container">
      {/* Header con información y botón de Plan Personalizado */}
      <div className="section-header">
        <div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
            Split de Comisiones
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
            Configura cómo se distribuyen las comisiones entre asesores, captadores y la empresa
          </p>
        </div>
        {viewMode === 'general' && (
          <button 
            className="btn-plan-personalizado"
            onClick={() => setViewMode('personalizado')}
          >
            <UserCheck size={18} />
            <span>Plan Personalizado</span>
          </button>
        )}
      </div>

      {viewMode === 'general' ? (
        <ConfiguracionGeneral 
          tipoPropiedad={tipoPropiedad} 
          setTipoPropiedad={setTipoPropiedad}
          mismoAsesor={mismoAsesor}
          setMismoAsesor={setMismoAsesor}
          sinVariantesTipo={sinVariantesTipo}
          setSinVariantesTipo={setSinVariantesTipo}
        />
      ) : (
        <PlanesPersonalizados onBack={() => setViewMode('general')} />
      )}

      <style>{`
        .split-comisiones-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .section-header {
          padding-bottom: 20px;
          border-bottom: 1px solid #e2e8f0;
        }

        .mode-selector {
          display: flex;
          gap: 12px;
          padding: 8px;
          background: #f8fafc;
          border-radius: 10px;
        }

        .mode-button {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 20px;
          border: 2px solid transparent;
          background: white;
          border-radius: 8px;
          color: #64748b;
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mode-button:hover {
          color: #334155;
          border-color: #e2e8f0;
        }

        .mode-button.active {
          color: #667eea;
          border-color: #667eea;
          background: #f0f4ff;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid #e2e8f0;
        }

        .btn-plan-personalizado {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border: 2px solid #667eea;
          background: white;
          border-radius: 8px;
          color: #667eea;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-plan-personalizado:hover {
          background: #f0f4ff;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
        }
      `}</style>
    </div>
  );
}

// Componente para Variante de Distribución
function VarianteCard({
  variante,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete
}: {
  variante: any;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (variante: any) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [nombre, setNombre] = useState(variante.nombre || '');
  const [propListas, setPropListas] = useState(variante.propiedadesListas || { captador: 0, vendedor: 0, empresa: 0 });
  const [propConstruccion, setPropConstruccion] = useState(variante.propiedadesConstruccion || { captador: 0, vendedor: 0, empresa: 0 });
  const [regaliasAdmin, setRegaliasAdmin] = useState(variante.regaliasAdmin || []);
  const [fees, setFees] = useState(variante.fees || { mentor: 0, liderEquipo: 0, franquicia: 0 });

  const calcularTotal = (dist: any) => {
    return (dist.captador || 0) + (dist.vendedor || 0) + (dist.empresa || 0);
  };

  const handleSave = () => {
    onSave({
      ...variante,
      nombre,
      propiedadesListas: propListas,
      propiedadesConstruccion: propConstruccion,
      regaliasAdmin,
      fees
    });
  };

  const agregarRegalia = () => {
    setRegaliasAdmin([...regaliasAdmin, { rol: '', porcentaje: 0 }]);
  };

  if (isEditing) {
    return (
      <div className="variante-card editing">
        <div className="variante-header-editing">
          <div className="variante-nombre-wrapper">
            <input
              type="text"
              className="variante-nombre-input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre de la variante (ej: Junior, PRO, TOP)"
            />
          </div>
          <div className="variante-actions">
            <button className="btn-save-small" onClick={handleSave}>Guardar</button>
            <button className="btn-cancel-small" onClick={onCancel}>Cancelar</button>
            <button className="btn-delete-small" onClick={onDelete}>Eliminar</button>
          </div>
        </div>

        <div className="variante-content">
          {/* Propiedades Listas */}
          <div className="distribucion-block">
            <div className="block-title-simple">
              <Home size={18} style={{ color: '#64748b' }} />
              <h4>Propiedades Listas (Reventas)</h4>
            </div>
            <div className="distribucion-inputs">
              <div className="input-card">
                <label>Captador</label>
                <div className="input-wrapper">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={propListas.captador}
                    onChange={(e) => setPropListas({ ...propListas, captador: parseFloat(e.target.value) || 0 })}
                  />
                  <span className="input-suffix">%</span>
                </div>
              </div>
              <div className="input-card">
                <label>Vendedor</label>
                <div className="input-wrapper">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={propListas.vendedor}
                    onChange={(e) => setPropListas({ ...propListas, vendedor: parseFloat(e.target.value) || 0 })}
                  />
                  <span className="input-suffix">%</span>
                </div>
              </div>
              <div className="input-card">
                <label>Empresa</label>
                <div className="input-wrapper">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={propListas.empresa}
                    onChange={(e) => setPropListas({ ...propListas, empresa: parseFloat(e.target.value) || 0 })}
                  />
                  <span className="input-suffix">%</span>
                </div>
              </div>
              <div className="input-card total-card">
                <label>Total</label>
                <div className="total-display">
                  <strong className={calcularTotal(propListas) === 100 ? 'valid' : 'invalid'}>
                    {calcularTotal(propListas).toFixed(1)}%
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Propiedades en Construcción */}
          <div className="distribucion-block">
            <div className="block-title-simple">
              <Building2 size={18} style={{ color: '#64748b' }} />
              <h4>Propiedades en Construcción</h4>
            </div>
            <div className="distribucion-inputs">
              <div className="input-card">
                <label>Captador</label>
                <div className="input-wrapper">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={propConstruccion.captador}
                    onChange={(e) => setPropConstruccion({ ...propConstruccion, captador: parseFloat(e.target.value) || 0 })}
                  />
                  <span className="input-suffix">%</span>
                </div>
              </div>
              <div className="input-card">
                <label>Vendedor</label>
                <div className="input-wrapper">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={propConstruccion.vendedor}
                    onChange={(e) => setPropConstruccion({ ...propConstruccion, vendedor: parseFloat(e.target.value) || 0 })}
                  />
                  <span className="input-suffix">%</span>
                </div>
              </div>
              <div className="input-card">
                <label>Empresa</label>
                <div className="input-wrapper">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={propConstruccion.empresa}
                    onChange={(e) => setPropConstruccion({ ...propConstruccion, empresa: parseFloat(e.target.value) || 0 })}
                  />
                  <span className="input-suffix">%</span>
                </div>
              </div>
              <div className="input-card total-card">
                <label>Total</label>
                <div className="total-display">
                  <strong className={calcularTotal(propConstruccion) === 100 ? 'valid' : 'invalid'}>
                    {calcularTotal(propConstruccion).toFixed(1)}%
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Regalías Administrativas */}
          <div className="distribucion-block">
            <div className="block-title-with-action">
              <div className="block-title-simple">
                <Users size={18} style={{ color: '#64748b' }} />
                <h4>Regalías Administrativas</h4>
              </div>
              <button className="btn-add-regalia" onClick={agregarRegalia}>
                + Agregar Rol
              </button>
            </div>
            <p className="block-hint">Basadas en la comisión neta que recibe la empresa</p>
            <div className="regalias-list">
              {regaliasAdmin.map((regalia, index) => (
                <div key={index} className="regalia-item-card">
                  <div className="regalia-input-wrapper">
                    <input
                      type="text"
                      className="regalia-rol-input"
                      placeholder="Ej: Coordinadora Captaciones, Asistente..."
                      value={regalia.rol}
                      onChange={(e) => {
                        const newRegalias = [...regaliasAdmin];
                        newRegalias[index].rol = e.target.value;
                        setRegaliasAdmin(newRegalias);
                      }}
                    />
                  </div>
                  <div className="regalia-porcentaje-wrapper">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      className="regalia-porcentaje-input"
                      value={regalia.porcentaje}
                      onChange={(e) => {
                        const newRegalias = [...regaliasAdmin];
                        newRegalias[index].porcentaje = parseFloat(e.target.value) || 0;
                        setRegaliasAdmin(newRegalias);
                      }}
                    />
                    <span className="regalia-porcentaje-suffix">%</span>
                  </div>
                  <button 
                    className="btn-remove-regalia"
                    onClick={() => setRegaliasAdmin(regaliasAdmin.filter((_, i) => i !== index))}
                    title="Eliminar"
                  >
                    ×
                  </button>
                </div>
              ))}
              {regaliasAdmin.length === 0 && (
                <div className="empty-state-regalias">
                  <Users size={32} style={{ color: '#cbd5e1', marginBottom: '12px' }} />
                  <p className="empty-message">No hay regalías administrativas configuradas</p>
                  <p className="empty-hint">Haz clic en "Agregar Rol" para comenzar</p>
                </div>
              )}
            </div>
          </div>

          {/* Fees Adicionales */}
          <div className="distribucion-block">
            <div className="block-title-simple">
              <CreditCard size={18} style={{ color: '#64748b' }} />
              <h4>Fees Adicionales</h4>
            </div>
            <p className="block-hint">Porcentajes de la comisión total que se deducen antes de la distribución</p>
            <div className="fees-inputs">
              <div className="fee-card" style={{ borderLeft: '4px solid #f43f5e' }}>
                <label>Mentor</label>
                <div className="input-wrapper">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={fees.mentor}
                    onChange={(e) => setFees({ ...fees, mentor: parseFloat(e.target.value) || 0 })}
                  />
                  <span className="input-suffix">%</span>
                </div>
              </div>
              <div className="fee-card" style={{ borderLeft: '4px solid #ec4899' }}>
                <label>Líder de Equipo</label>
                <div className="input-wrapper">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={fees.liderEquipo}
                    onChange={(e) => setFees({ ...fees, liderEquipo: parseFloat(e.target.value) || 0 })}
                  />
                  <span className="input-suffix">%</span>
                </div>
              </div>
              <div className="fee-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
                <label>Franquicia Zonal</label>
                <div className="input-wrapper">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={fees.franquicia}
                    onChange={(e) => setFees({ ...fees, franquicia: parseFloat(e.target.value) || 0 })}
                  />
                  <span className="input-suffix">%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="variante-card">
      <div className="variante-header-preview">
        <div className="variante-badge">
          <span className="variante-badge-text">{variante.nombre || 'Sin nombre'}</span>
        </div>
        <button className="btn-edit-preview" onClick={onEdit}>
          <span>✏️</span> Editar
        </button>
      </div>
      <div className="variante-preview">
        <div className="preview-section-card">
          <div className="preview-icon" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}>
            <Home size={18} color="white" />
          </div>
          <div className="preview-content">
            <strong className="preview-title">Propiedades Listas</strong>
            <div className="preview-distribucion">
              <span className="preview-item" style={{ color: '#10b981' }}>Captador: {variante.propiedadesListas?.captador || 0}%</span>
              <span className="preview-item" style={{ color: '#667eea' }}>Vendedor: {variante.propiedadesListas?.vendedor || 0}%</span>
              <span className="preview-item" style={{ color: '#f59e0b' }}>Empresa: {variante.propiedadesListas?.empresa || 0}%</span>
            </div>
          </div>
        </div>
        <div className="preview-section-card">
          <div className="preview-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' }}>
            <Building2 size={18} color="white" />
          </div>
          <div className="preview-content">
            <strong className="preview-title">Propiedades Construcción</strong>
            <div className="preview-distribucion">
              <span className="preview-item" style={{ color: '#10b981' }}>Captador: {variante.propiedadesConstruccion?.captador || 0}%</span>
              <span className="preview-item" style={{ color: '#667eea' }}>Vendedor: {variante.propiedadesConstruccion?.vendedor || 0}%</span>
              <span className="preview-item" style={{ color: '#f59e0b' }}>Empresa: {variante.propiedadesConstruccion?.empresa || 0}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente para Configuración General
function ConfiguracionGeneral({ 
  tipoPropiedad, 
  setTipoPropiedad,
  mismoAsesor,
  setMismoAsesor,
  sinVariantesTipo,
  setSinVariantesTipo
}: { 
  tipoPropiedad: 'lista' | 'proyecto' | 'ambas';
  setTipoPropiedad: (value: 'lista' | 'proyecto' | 'ambas') => void;
  mismoAsesor: boolean | null;
  setMismoAsesor: (value: boolean | null) => void;
  sinVariantesTipo: boolean;
  setSinVariantesTipo: (value: boolean) => void;
}) {
  const [variantes, setVariantes] = useState([
    {
      id: '1',
      nombre: 'Junior',
      propiedadesListas: { captador: 10, vendedor: 60, empresa: 30 },
      propiedadesConstruccion: { captador: 10, vendedor: 60, empresa: 30 },
      regaliasAdmin: [
        { rol: 'Coordinadora Captaciones', porcentaje: 2 },
        { rol: 'Asistente', porcentaje: 1 }
      ],
      fees: {
        mentor: 0,
        liderEquipo: 0,
        franquicia: 0
      }
    }
  ]);
  
  const [varianteEditando, setVarianteEditando] = useState<string | null>(null);

  const agregarVariante = () => {
    const nuevaVariante = {
      id: Date.now().toString(),
      nombre: '',
      propiedadesListas: { captador: 0, vendedor: 0, empresa: 0 },
      propiedadesConstruccion: { captador: 0, vendedor: 0, empresa: 0 },
      regaliasAdmin: [],
      fees: {
        mentor: 0,
        liderEquipo: 0,
        franquicia: 0
      }
    };
    setVariantes([...variantes, nuevaVariante]);
    setVarianteEditando(nuevaVariante.id);
  };

  return (
    <div className="config-general">
      {/* Bloque Principal de Configuración */}
      <div className="config-section">
        <div className="section-title">
          <Users size={20} />
          <div style={{ flex: 1 }}>
            <h3>Distribución de Comisiones</h3>
            <p className="section-description" style={{ margin: '8px 0 0 0' }}>
              Configura cómo se distribuye el 100% de la comisión. Puedes crear variantes por nivel de asesor (Junior, PRO, TOP, etc.)
            </p>
          </div>
          <button className="btn-primary" onClick={agregarVariante}>
            + Agregar Variante
          </button>
        </div>

        {/* Lista de Variantes */}
        <div className="variantes-list">
          {variantes.map((variante) => (
            <VarianteCard
              key={variante.id}
              variante={variante}
              isEditing={varianteEditando === variante.id}
              onEdit={() => setVarianteEditando(variante.id)}
              onSave={(updated) => {
                setVariantes(variantes.map(v => v.id === variante.id ? updated : v));
                setVarianteEditando(null);
              }}
              onCancel={() => setVarianteEditando(null)}
              onDelete={() => {
                setVariantes(variantes.filter(v => v.id !== variante.id));
                setVarianteEditando(null);
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        .config-general {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .config-cards-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .config-card {
          padding: 24px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          transition: all 0.2s;
        }

        .config-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .card-icon-header {
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          margin-bottom: 16px;
        }

        .config-card h3 {
          margin: 0 0 8px 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #0f172a;
        }

        .card-explanation {
          margin: 0 0 20px 0;
          color: #64748b;
          font-size: 0.8125rem;
          line-height: 1.5;
        }

        .toggle-container {
          margin-bottom: 16px;
        }

        .toggle-switch {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }

        .toggle-switch input[type="checkbox"] {
          display: none;
        }

        .toggle-slider {
          position: relative;
          width: 48px;
          height: 24px;
          background: #cbd5e1;
          border-radius: 12px;
          transition: all 0.3s;
        }

        .toggle-slider::before {
          content: '';
          position: absolute;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          top: 3px;
          left: 3px;
          transition: all 0.3s;
        }

        .toggle-switch input[type="checkbox"]:checked + .toggle-slider {
          background: #667eea;
        }

        .toggle-switch input[type="checkbox"]:checked + .toggle-slider::before {
          transform: translateX(24px);
        }

        .toggle-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #0f172a;
        }

        .toggle-switch-small {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .toggle-switch-small input[type="checkbox"] {
          display: none;
        }

        .toggle-slider-small {
          position: relative;
          width: 40px;
          height: 20px;
          background: #cbd5e1;
          border-radius: 10px;
          transition: all 0.3s;
        }

        .toggle-slider-small::before {
          content: '';
          position: absolute;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          top: 2px;
          left: 2px;
          transition: all 0.3s;
        }

        .toggle-switch-small input[type="checkbox"]:checked + .toggle-slider-small {
          background: #667eea;
        }

        .toggle-switch-small input[type="checkbox"]:checked + .toggle-slider-small::before {
          transform: translateX(20px);
        }

        .toggle-label-small {
          font-size: 0.8125rem;
          font-weight: 500;
          color: #64748b;
        }

        .config-section {
          padding: 24px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .section-title h3 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #0f172a;
        }

        .section-badge {
          margin-left: auto;
          padding: 4px 12px;
          background: #e0e7ff;
          color: #4338ca;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .section-description {
          margin: 0 0 20px 0;
          color: #64748b;
          font-size: 0.875rem;
        }

        .property-type-selector {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .type-button {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          background: white;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .type-button:hover {
          border-color: #cbd5e1;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .type-button.active {
          border-color: #667eea;
          background: #f0f4ff;
        }

        .type-button strong {
          display: block;
          color: #0f172a;
          font-size: 0.9375rem;
          margin-bottom: 4px;
        }

        .type-button span {
          display: block;
          color: #64748b;
          font-size: 0.8125rem;
        }

        .property-type-selector-horizontal {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 16px;
        }

        .type-button-large {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 24px;
          border: 2px solid #e2e8f0;
          background: white;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }

        .type-button-large:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          transform: translateY(-2px);
        }

        .type-button-large.active {
          border-color: #667eea;
          background: #f0f4ff;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
        }

        .type-button-large strong {
          display: block;
          color: #0f172a;
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .type-button-large span {
          display: block;
          color: #64748b;
          font-size: 0.8125rem;
        }

        .casos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }

        .caso-card {
          padding: 20px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .caso-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          transform: translateY(-2px);
        }

        .caso-card.selected {
          border-color: #667eea;
          background: #f0f4ff;
          box-shadow: 0 4px 16px rgba(102, 126, 234, 0.2);
        }

        .caso-header {
          margin-bottom: 16px;
        }

        .caso-header h4 {
          margin: 0 0 4px 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #0f172a;
        }

        .caso-header p {
          margin: 0;
          color: #64748b;
          font-size: 0.8125rem;
        }

        .distribucion-visual {
          margin-bottom: 16px;
        }

        .distribucion-bars {
          display: flex;
          height: 32px;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 12px;
          border: 1px solid #e2e8f0;
        }

        .distribucion-bar-item {
          height: 100%;
          transition: all 0.2s;
        }

        .distribucion-bar-item:hover {
          opacity: 0.8;
        }

        .distribucion-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .distribucion-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 0;
        }

        .distribucion-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .distribucion-rol {
          flex: 1;
          color: #64748b;
          font-size: 0.875rem;
        }

        .distribucion-porcentaje {
          color: #0f172a;
          font-size: 0.9375rem;
          font-weight: 600;
          min-width: 50px;
          text-align: right;
        }

        .distribucion-total-row {
          padding-top: 8px;
          margin-top: 8px;
          border-top: 2px solid #e2e8f0;
          text-align: right;
        }

        .distribucion-total-row strong {
          color: #667eea;
          font-size: 1rem;
          font-weight: 700;
        }

        .caso-actions {
          display: flex;
          gap: 8px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
        }

        .btn-edit-caso {
          flex: 1;
          padding: 8px 16px;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 6px;
          color: #64748b;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-edit-caso:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
          color: #334155;
        }

        .btn-use-caso {
          flex: 1;
          padding: 8px 16px;
          border: none;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 6px;
          color: white;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-use-caso:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .btn-primary {
          padding: 10px 20px;
          border: none;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .role-distribution {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .radio-option {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          border: 2px solid #e2e8f0;
          background: white;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .radio-option:hover {
          border-color: #cbd5e1;
        }

        .radio-option input[type="radio"] {
          margin-top: 4px;
          cursor: pointer;
        }

        .radio-option input[type="radio"]:checked + div {
          color: #667eea;
        }

        .radio-option input[type="radio"]:checked {
          accent-color: #667eea;
        }

        .radio-option strong {
          display: block;
          color: #0f172a;
          font-size: 0.9375rem;
          margin-bottom: 4px;
        }

        .radio-option span {
          display: block;
          color: #64748b;
          font-size: 0.8125rem;
        }

        .tipos-asesor-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .tipo-asesor-card {
          padding: 20px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          transition: all 0.2s;
        }

        .tipo-asesor-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .tipo-badge {
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.8125rem;
          font-weight: 600;
        }

        .edit-button {
          padding: 6px 12px;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 6px;
          color: #64748b;
          font-size: 0.8125rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .edit-button:hover {
          border-color: #667eea;
          color: #667eea;
        }

        .split-display {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .split-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
        }

        .split-item span {
          color: #64748b;
          font-size: 0.875rem;
        }

        .split-item strong {
          color: #0f172a;
          font-size: 1rem;
          font-weight: 600;
        }

        .split-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          margin-top: 8px;
          border-top: 2px solid #e2e8f0;
        }

        .split-total span {
          color: #0f172a;
          font-size: 0.9375rem;
          font-weight: 600;
        }

        .split-total strong {
          color: #667eea;
          font-size: 1.125rem;
          font-weight: 700;
        }

        .add-tipo-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 24px;
          border: 2px dashed #cbd5e1;
          background: #f8fafc;
          border-radius: 10px;
          color: #64748b;
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .add-tipo-button:hover {
          border-color: #667eea;
          color: #667eea;
          background: #f0f4ff;
        }

        .add-tipo-button span {
          font-size: 1.5rem;
          font-weight: 300;
        }

        .distribuciones-extra {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .distribucion-card {
          padding: 20px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          transition: all 0.2s;
        }

        .distribucion-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .distribucion-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 12px;
        }

        .distribucion-icon {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          flex-shrink: 0;
        }

        .distribucion-header h4 {
          margin: 0 0 4px 0;
          font-size: 1rem;
          font-weight: 600;
          color: #0f172a;
        }

        .distribucion-header p {
          margin: 0;
          color: #64748b;
          font-size: 0.8125rem;
          line-height: 1.4;
        }

        .distribucion-status {
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .status-badge.inactive {
          background: #f1f5f9;
          color: #64748b;
        }

        .status-badge.active {
          background: #dcfce7;
          color: #166534;
        }

        .distribucion-expanded {
          margin-top: 16px;
          padding: 20px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .distribucion-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #0f172a;
        }

        .form-group input[type="number"] {
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.9375rem;
          transition: all 0.2s;
        }

        .form-group input[type="number"]:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 8px;
        }

        .btn-save {
          padding: 10px 20px;
          border: none;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 6px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-save:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .btn-cancel {
          padding: 10px 20px;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 6px;
          color: #64748b;
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-cancel:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
        }

        .roles-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .role-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }

        .role-item input[type="number"] {
          width: 100px;
          margin-left: auto;
        }

        .role-item label {
          flex: 1;
          font-size: 0.875rem;
          color: #0f172a;
        }
      `}</style>
    </div>
  );
}

// Componente para las cards de distribución extra
function DistribucionCard({
  id,
  icon,
  iconColor,
  iconTextColor,
  titulo,
  descripcion,
  tipo,
  porcentajeEjemplo
}: {
  id: string;
  icon: React.ReactNode;
  iconColor: string;
  iconTextColor: string;
  titulo: string;
  descripcion: string;
  tipo: 'administrativo' | 'porcentaje';
  porcentajeEjemplo?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [porcentaje, setPorcentaje] = useState<string>('');
  const [rolesAdmin, setRolesAdmin] = useState([
    { id: 'gerente', nombre: 'Gerente', porcentaje: '' },
    { id: 'coordinador', nombre: 'Coordinador', porcentaje: '' },
    { id: 'asistente', nombre: 'Asistente', porcentaje: '' },
  ]);

  const handleSave = () => {
    if (tipo === 'porcentaje') {
      if (porcentaje && parseFloat(porcentaje) > 0) {
        setIsConfigured(true);
        setIsExpanded(false);
      }
    } else {
      const total = rolesAdmin.reduce((sum, role) => sum + (parseFloat(role.porcentaje) || 0), 0);
      if (total > 0 && total <= 100) {
        setIsConfigured(true);
        setIsExpanded(false);
      }
    }
  };

  const handleCancel = () => {
    setIsExpanded(false);
    setPorcentaje('');
  };

  return (
    <div className="distribucion-card">
      <div className="distribucion-header">
        <div className="distribucion-icon" style={{ background: iconColor, color: iconTextColor }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <h4>{titulo}</h4>
          <p>{descripcion}</p>
        </div>
        <button 
          className="edit-button"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Cerrar' : 'Configurar'}
        </button>
      </div>
      <div className="distribucion-status">
        {isConfigured ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="status-badge active">Configurado</span>
            {tipo === 'porcentaje' && porcentaje && (
              <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
                {porcentaje}% de la comisión total
              </span>
            )}
          </div>
        ) : (
          <span className="status-badge inactive">No configurado</span>
        )}
      </div>
      
      {isExpanded && (
        <div className="distribucion-expanded">
          {tipo === 'porcentaje' ? (
            <div className="distribucion-form">
              <div className="form-group">
                <label>Porcentaje de la comisión total (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={porcentaje}
                  onChange={(e) => setPorcentaje(e.target.value)}
                  placeholder={porcentajeEjemplo || "Ej: 5"}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                  Este porcentaje se deducirá de la comisión total antes de distribuir entre asesor y empresa
                </span>
              </div>
              <div className="form-actions">
                <button className="btn-cancel" onClick={handleCancel}>
                  Cancelar
                </button>
                <button className="btn-save" onClick={handleSave}>
                  Guardar
                </button>
              </div>
            </div>
          ) : (
            <div className="distribucion-form">
              <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '0.875rem' }}>
                Distribuye la comisión de la empresa entre los diferentes roles administrativos. 
                El total debe sumar máximo 100% de la porción de la empresa.
              </p>
              <div className="roles-list">
                {rolesAdmin.map((role) => (
                  <div key={role.id} className="role-item">
                    <label>{role.nombre}</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={role.porcentaje}
                      onChange={(e) => {
                        const newRoles = rolesAdmin.map(r => 
                          r.id === role.id ? { ...r, porcentaje: e.target.value } : r
                        );
                        setRolesAdmin(newRoles);
                      }}
                      placeholder="0%"
                    />
                    <span style={{ color: '#64748b', fontSize: '0.875rem', minWidth: '30px' }}>%</span>
                  </div>
                ))}
              </div>
              <div style={{ 
                padding: '12px', 
                background: '#f1f5f9', 
                borderRadius: '6px',
                fontSize: '0.875rem',
                color: '#64748b'
              }}>
                <strong>Total asignado:</strong> {
                  rolesAdmin.reduce((sum, role) => sum + (parseFloat(role.porcentaje) || 0), 0).toFixed(1)
                }% de la comisión de la empresa
              </div>
              <div className="form-actions">
                <button className="btn-cancel" onClick={handleCancel}>
                  Cancelar
                </button>
                <button className="btn-save" onClick={handleSave}>
                  Guardar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Componente para Planes Personalizados
function PlanesPersonalizados({ onBack }: { onBack: () => void }) {
  return (
    <div className="planes-personalizados">
      <div className="info-card">
        <Users size={24} />
        <div>
          <h3>Planes Personalizados 1 a 1</h3>
          <p>
            Crea acuerdos de comisión específicos para asesores individuales. 
            Estos planes tienen prioridad sobre la configuración general.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button 
          className="btn-secondary"
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          ← Volver a Configuración General
        </button>
      </div>

      <div className="planes-list">
        <div className="empty-state">
          <UserCheck size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
          <h3>No hay planes personalizados</h3>
          <p>Crea acuerdos específicos para asesores que requieren condiciones especiales</p>
          <button className="btn-primary">Crear Plan Personalizado</button>
        </div>
      </div>

      <style>{`
        .planes-personalizados {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .info-card {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 20px;
          background: #f0f4ff;
          border: 1px solid #c7d2fe;
          border-radius: 10px;
        }

        .info-card h3 {
          margin: 0 0 8px 0;
          font-size: 1rem;
          font-weight: 600;
          color: #0f172a;
        }

        .info-card p {
          margin: 0;
          color: #64748b;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .planes-list {
          min-height: 400px;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
        }

        .empty-state h3 {
          margin: 0 0 8px 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #0f172a;
        }

        .empty-state p {
          margin: 0 0 24px 0;
          color: #64748b;
          font-size: 0.875rem;
        }

        .btn-primary {
          padding: 12px 24px;
          border: none;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .btn-secondary {
          padding: 10px 20px;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 8px;
          color: #64748b;
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
          color: #334155;
        }

        .variantes-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 20px;
        }

        .variante-card {
          padding: 24px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .variante-card.editing {
          border-color: #667eea;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .variante-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .variante-header h4 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #0f172a;
        }

        .variante-nombre-input {
          flex: 1;
          padding: 10px 12px;
          border: 2px solid #667eea;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
        }

        .variante-actions {
          display: flex;
          gap: 8px;
        }

        .btn-save-small, .btn-cancel-small, .btn-delete-small {
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-save-small {
          background: #667eea;
          color: white;
        }

        .btn-save-small:hover {
          background: #5568d3;
        }

        .btn-cancel-small {
          background: #f3f4f6;
          color: #374151;
        }

        .btn-cancel-small:hover {
          background: #e5e7eb;
        }

        .btn-delete-small {
          background: #fee2e2;
          color: #dc2626;
        }

        .btn-delete-small:hover {
          background: #fecaca;
        }

        .btn-edit {
          padding: 8px 16px;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 6px;
          color: #64748b;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-edit:hover {
          border-color: #667eea;
          color: #667eea;
        }

        .variante-content {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .distribucion-block {
          padding: 24px;
          background: white;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .block-title-simple {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }

        .block-title-simple h4 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
        }

        .block-title-with-action {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .block-hint {
          margin: 0 0 20px 0;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .btn-add-regalia {
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 6px;
          color: #374151;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-add-regalia:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .distribucion-inputs {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        .input-card {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .input-card label {
          font-size: 0.8125rem;
          font-weight: 500;
          color: #6b7280;
        }

        .input-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .input-wrapper input[type="number"] {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 500;
          color: #111827;
          background: white;
          transition: all 0.2s;
        }

        .input-wrapper input[type="number"]:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .input-suffix {
          font-size: 0.875rem;
          font-weight: 500;
          color: #6b7280;
          min-width: 20px;
        }

        .input-card.total-card {
          justify-content: flex-end;
        }

        .total-display strong {
          font-size: 1.25rem;
          font-weight: 600;
        }

        .total-display strong.valid {
          color: #059669;
        }

        .total-display strong.invalid {
          color: #dc2626;
        }

        .regalias-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .regalia-item-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
        }

        .regalia-input-wrapper {
          flex: 1;
        }

        .regalia-rol-input {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          background: white;
        }

        .regalia-rol-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .regalia-porcentaje-wrapper {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .regalia-porcentaje-input {
          width: 90px;
          padding: 10px 14px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          background: white;
        }

        .regalia-porcentaje-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .regalia-porcentaje-suffix {
          font-size: 0.875rem;
          font-weight: 500;
          color: #6b7280;
        }

        .btn-remove-regalia {
          width: 32px;
          height: 32px;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 6px;
          color: #6b7280;
          font-size: 1.25rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .btn-remove-regalia:hover {
          background: #fee2e2;
          border-color: #fca5a5;
          color: #dc2626;
        }

        .empty-state-regalias {
          padding: 32px 20px;
          text-align: center;
          background: #f9fafb;
          border: 1px dashed #d1d5db;
          border-radius: 6px;
        }

        .empty-hint {
          margin: 8px 0 0 0;
          color: #9ca3af;
          font-size: 0.8125rem;
        }

        .fees-inputs {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .fee-card {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .fee-card label {
          font-size: 0.8125rem;
          font-weight: 500;
          color: #6b7280;
        }

        .empty-message {
          color: #94a3b8;
          font-size: 0.875rem;
          font-style: italic;
          margin: 0;
        }

        .variante-preview {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .preview-section-card {
          padding: 16px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
        }

        .preview-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          margin-bottom: 12px;
        }

        .preview-content {
          flex: 1;
        }

        .preview-title {
          display: block;
          color: #111827;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .preview-distribucion {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .preview-item {
          font-size: 0.8125rem;
          font-weight: 500;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}

// Componentes placeholder para otras pestañas
function FacturacionTab() {
  return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
      <FileText size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
      <h3>Plantillas de Facturación</h3>
      <p>Próximamente</p>
    </div>
  );
}

function PeriodosTab() {
  return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
      <Calendar size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
      <h3>Periodos de Pago</h3>
      <p>Próximamente</p>
    </div>
  );
}

function MetodosTab() {
  return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
      <CreditCard size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
      <h3>Métodos de Pago</h3>
      <p>Próximamente</p>
    </div>
  );
}




