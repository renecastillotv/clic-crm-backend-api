/**
 * PropiedadesSolicitudModal
 *
 * Modal que aparece cuando una solicitud tiene múltiples propiedades vinculadas
 * (ya sea directa o a través de propuestas). Permite al usuario seleccionar
 * cuál propiedad corresponde al cierre de venta.
 */

import { createPortal } from 'react-dom';
import { X, Home, FileText, Search } from 'lucide-react';

export interface PropiedadOpcion {
  id: string;
  titulo: string;
  codigo?: string;
  precio?: number;
  moneda?: string;
  imagen_principal?: string;
  tipo?: string;
  operacion?: string;
  ciudad?: string;
  origen: 'directa' | 'propuesta';
  propuesta_titulo?: string;
}

interface PropiedadesSolicitudModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (propiedadId: string) => void;
  onSelectManual: () => void;
  propiedades: PropiedadOpcion[];
  solicitudTitulo: string;
}

export default function PropiedadesSolicitudModal({
  isOpen,
  onClose,
  onSelect,
  onSelectManual,
  propiedades,
  solicitudTitulo,
}: PropiedadesSolicitudModalProps) {
  if (!isOpen) return null;

  const formatPrecio = (precio?: number, moneda?: string) => {
    if (!precio) return null;
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: moneda || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(precio);
  };

  const modalContent = (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>
              Seleccionar Propiedad del Cierre
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
              Solicitud: {solicitudTitulo}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              color: '#64748b',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Info */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#f0f9ff',
            borderBottom: '1px solid #e0f2fe',
          }}
        >
          <p style={{ margin: 0, fontSize: '13px', color: '#0369a1' }}>
            Esta solicitud tiene {propiedades.length} propiedad{propiedades.length > 1 ? 'es' : ''} vinculada{propiedades.length > 1 ? 's' : ''}.
            Selecciona la que corresponde al cierre de esta venta.
          </p>
        </div>

        {/* Lista de propiedades */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '16px 24px',
          }}
        >
          {propiedades.map((propiedad) => (
            <div
              key={propiedad.id}
              onClick={() => onSelect(propiedad.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                marginBottom: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backgroundColor: '#fff',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.backgroundColor = '#f8fafc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.backgroundColor = '#fff';
              }}
            >
              {/* Imagen */}
              <div
                style={{
                  width: '80px',
                  height: '60px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  backgroundColor: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {propiedad.imagen_principal ? (
                  <img
                    src={propiedad.imagen_principal}
                    alt={propiedad.titulo}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <Home size={24} style={{ color: '#94a3b8' }} />
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: propiedad.origen === 'directa' ? '#dbeafe' : '#fef3c7',
                      color: propiedad.origen === 'directa' ? '#1d4ed8' : '#92400e',
                    }}
                  >
                    {propiedad.origen === 'directa' ? 'Propiedad Directa' : 'Vía Propuesta'}
                  </span>
                  {propiedad.codigo && (
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      {propiedad.codigo}
                    </span>
                  )}
                </div>
                <h4
                  style={{
                    margin: 0,
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#1e293b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {propiedad.titulo}
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                  {propiedad.tipo && (
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      {propiedad.tipo}
                    </span>
                  )}
                  {propiedad.ciudad && (
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      {propiedad.ciudad}
                    </span>
                  )}
                  {propiedad.precio && (
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#059669' }}>
                      {formatPrecio(propiedad.precio, propiedad.moneda)}
                    </span>
                  )}
                </div>
                {propiedad.origen === 'propuesta' && propiedad.propuesta_titulo && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    <FileText size={12} style={{ color: '#94a3b8' }} />
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {propiedad.propuesta_titulo}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer - Opción manual */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
          }}
        >
          <button
            onClick={onSelectManual}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px dashed #cbd5e1',
              borderRadius: '8px',
              backgroundColor: 'transparent',
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
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.color = '#3b82f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            <Search size={16} />
            Elegir otra propiedad manualmente
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
