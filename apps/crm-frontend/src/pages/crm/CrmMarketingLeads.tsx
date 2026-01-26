/**
 * CrmMarketingLeads - Lead Distribution & Assignment
 *
 * Placeholder page showing planned functionality:
 * - Lead distribution rules (by zone, property type, round-robin)
 * - Assignment queue
 * - Source tracking (which campaign generated which lead)
 */

import React, { useEffect } from 'react';
import { usePageHeader } from '../../layouts/CrmLayout';
import {
  Users,
  GitBranch,
  Target,
  BarChart3,
  MapPin,
  RefreshCw,
  Zap,
  ArrowRight,
} from 'lucide-react';

const CrmMarketingLeads: React.FC = () => {
  const { setPageHeader } = usePageHeader();

  useEffect(() => {
    setPageHeader({
      title: 'Leads de Marketing',
      subtitle: 'Distribucion y asignacion de leads de campanas',
    });
  }, [setPageHeader]);

  const features = [
    {
      icon: <GitBranch size={28} />,
      title: 'Reglas de Distribucion',
      description: 'Define como se asignan automaticamente los leads que llegan de tus campanas. Configura reglas por zona geografica, tipo de propiedad, presupuesto del cliente o equipo de ventas.',
      color: '#3b82f6',
      items: ['Por zona geografica', 'Por tipo de propiedad', 'Por presupuesto', 'Por equipo de ventas'],
    },
    {
      icon: <RefreshCw size={28} />,
      title: 'Round Robin Inteligente',
      description: 'Distribuye leads de forma equitativa entre asesores disponibles. El sistema considera la carga actual, horario y especialidad de cada asesor.',
      color: '#8b5cf6',
      items: ['Distribucion equitativa', 'Por capacidad actual', 'Por horario disponible', 'Por especialidad'],
    },
    {
      icon: <Target size={28} />,
      title: 'Tracking de Origen',
      description: 'Identifica exactamente de que campana, anuncio o fuente proviene cada lead. Conecta el gasto publicitario con las conversiones reales.',
      color: '#16a34a',
      items: ['Campana de origen', 'Anuncio especifico', 'Keyword o audiencia', 'Costo por lead'],
    },
    {
      icon: <BarChart3 size={28} />,
      title: 'Metricas de Conversion',
      description: 'Mide la efectividad de cada asesor y campana. Ve cuantos leads se convirtieron en citas, propuestas y ventas cerradas.',
      color: '#f59e0b',
      items: ['Lead → Contacto', 'Contacto → Cita', 'Cita → Propuesta', 'Propuesta → Venta'],
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px' }}>
      {/* Hero section */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          borderRadius: '20px',
          padding: '40px',
          marginBottom: '32px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.15)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-40px',
            right: '100px',
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            background: 'rgba(59, 130, 246, 0.1)',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              background: 'rgba(99, 102, 241, 0.2)',
              borderRadius: '20px',
              marginBottom: '16px',
            }}
          >
            <Zap size={14} color="#a5b4fc" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#a5b4fc' }}>
              Proximamente
            </span>
          </div>

          <h2 style={{ fontSize: '28px', fontWeight: 700, color: 'white', margin: '0 0 12px 0' }}>
            Distribucion Inteligente de Leads
          </h2>
          <p style={{ fontSize: '15px', color: '#94a3b8', margin: 0, maxWidth: '600px', lineHeight: 1.6 }}>
            Automatiza la asignacion de leads que llegan de tus campanas de Google Ads, Meta Ads y otras fuentes.
            Define reglas de distribucion y mide la efectividad de cada canal y asesor.
          </p>
        </div>
      </div>

      {/* Flujo visual */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '40px',
          flexWrap: 'wrap',
        }}
      >
        {[
          { icon: <Zap size={18} />, label: 'Lead llega', color: '#3b82f6' },
          { icon: <GitBranch size={18} />, label: 'Reglas evaluan', color: '#8b5cf6' },
          { icon: <MapPin size={18} />, label: 'Zona + Tipo', color: '#f59e0b' },
          { icon: <Users size={18} />, label: 'Asesor asignado', color: '#16a34a' },
        ].map((step, i) => (
          <React.Fragment key={i}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 20px',
                background: 'white',
                borderRadius: '12px',
                border: `2px solid ${step.color}30`,
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: `${step.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: step.color,
                }}
              >
                {step.icon}
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                {step.label}
              </span>
            </div>
            {i < 3 && <ArrowRight size={20} color="#cbd5e1" />}
          </React.Fragment>
        ))}
      </div>

      {/* Feature cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        {features.map((feature) => (
          <div
            key={feature.title}
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '28px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: `${feature.color}12`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: feature.color,
                marginBottom: '16px',
              }}
            >
              {feature.icon}
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
              {feature.title}
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, marginBottom: '16px' }}>
              {feature.description}
            </p>
            <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
              {feature.items.map((item) => (
                <li
                  key={item}
                  style={{
                    fontSize: '12px',
                    color: '#94a3b8',
                    marginBottom: '4px',
                    lineHeight: 1.4,
                  }}
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Info note */}
      <div
        style={{
          background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
          border: '1px solid #a5b4fc',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px',
        }}
      >
        <Users size={24} color="#4f46e5" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#3730a3', margin: '0 0 6px 0' }}>
            Conecta tus campanas primero
          </h4>
          <p style={{ fontSize: '13px', color: '#4f46e5', margin: 0, lineHeight: 1.5 }}>
            Para distribuir leads automaticamente, primero conecta tus cuentas de Google Ads, Meta Ads
            o configura tu proveedor de email en la seccion de Configuracion. Los leads de campanas activas
            se asignaran segun las reglas que definas aqui.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CrmMarketingLeads;
