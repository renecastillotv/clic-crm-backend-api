/**
 * CrmMensajeriaConfiguracion - Configuración de mensajería
 *
 * Gestión de integraciones, etiquetas, firmas y notificaciones.
 * Datos mock por ahora; se conectará al backend en Fase 1+.
 */

import { useState, useEffect } from 'react';
import { usePageHeader } from '../../layouts/CrmLayout';

interface Etiqueta {
  id: string;
  codigo: string;
  nombre: string;
  color: string;
  esDefault: boolean;
}

interface IntegracionRed {
  id: string;
  tipo: 'whatsapp' | 'instagram' | 'facebook' | 'web_chat' | 'email';
  nombre: string;
  conectado: boolean;
  cuenta?: string;
  ultimaSync?: Date;
}

const etiquetasDefault: Etiqueta[] = [
  { id: 'e1', codigo: 'caliente', nombre: 'Caliente', color: '#ef4444', esDefault: true },
  { id: 'e2', codigo: 'tibio', nombre: 'Tibio', color: '#f97316', esDefault: true },
  { id: 'e3', codigo: 'medio', nombre: 'Medio', color: '#eab308', esDefault: true },
  { id: 'e4', codigo: 'frio', nombre: 'Frío', color: '#3b82f6', esDefault: true },
  { id: 'e5', codigo: 'descartado', nombre: 'Descartado', color: '#6b7280', esDefault: true },
  { id: 'e6', codigo: 'sin_calificar', nombre: 'Sin calificar', color: '#94a3b8', esDefault: true },
];

const integracionesEjemplo: IntegracionRed[] = [
  { id: '1', tipo: 'whatsapp', nombre: 'WhatsApp Business', conectado: true, cuenta: '+52 55 1234 5678', ultimaSync: new Date() },
  { id: '2', tipo: 'instagram', nombre: 'Instagram', conectado: true, cuenta: '@inmobiliaria_cdmx', ultimaSync: new Date() },
  { id: '3', tipo: 'facebook', nombre: 'Facebook Page', conectado: false },
  { id: '4', tipo: 'web_chat', nombre: 'Chat Web (Sitio)', conectado: true, cuenta: 'Widget activo', ultimaSync: new Date() },
  { id: '5', tipo: 'email', nombre: 'Correo Electrónico', conectado: true, cuenta: 'agente@inmobiliaria.com', ultimaSync: new Date() },
];

// Iconos
const Icons = {
  link: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  ),
  tag: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/>
      <path d="M7 7h.01"/>
    </svg>
  ),
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  signature: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
    </svg>
  ),
  bell: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  check: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14m-7-7h14"/>
    </svg>
  ),
  trash: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18"/>
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
    </svg>
  ),
  whatsapp: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  ),
  instagram: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  ),
  facebook: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  webChat: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  email: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  ),
};

export default function CrmMensajeriaConfiguracion() {
  const { setPageHeader } = usePageHeader();

  const [integraciones] = useState<IntegracionRed[]>(integracionesEjemplo);
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>(etiquetasDefault);
  const [firmaEmail, setFirmaEmail] = useState('');
  const [notifChats, setNotifChats] = useState(true);
  const [notifEmails, setNotifEmails] = useState(true);
  const [notifSonido, setNotifSonido] = useState(true);
  const [autoRegistrarContactos, setAutoRegistrarContactos] = useState(false);
  const [nuevaEtiquetaNombre, setNuevaEtiquetaNombre] = useState('');
  const [nuevaEtiquetaColor, setNuevaEtiquetaColor] = useState('#8b5cf6');

  useEffect(() => {
    setPageHeader({
      title: 'Configuración',
      subtitle: 'Ajustes de mensajería',
    });
  }, [setPageHeader]);

  const getOrigenIcon = (tipo: string) => {
    switch (tipo) {
      case 'whatsapp': return Icons.whatsapp;
      case 'instagram': return Icons.instagram;
      case 'facebook': return Icons.facebook;
      case 'web_chat': return Icons.webChat;
      case 'email': return Icons.email;
      default: return Icons.link;
    }
  };

  const getOrigenColor = (tipo: string) => {
    switch (tipo) {
      case 'whatsapp': return '#25D366';
      case 'instagram': return '#E4405F';
      case 'facebook': return '#1877F2';
      case 'web_chat': return '#8b5cf6';
      case 'email': return '#3b82f6';
      default: return '#64748b';
    }
  };

  const agregarEtiqueta = () => {
    if (!nuevaEtiquetaNombre.trim()) return;
    const codigo = nuevaEtiquetaNombre.toLowerCase().replace(/\s+/g, '_');
    const nueva: Etiqueta = {
      id: `e${etiquetas.length + 1}`,
      codigo,
      nombre: nuevaEtiquetaNombre,
      color: nuevaEtiquetaColor,
      esDefault: false,
    };
    setEtiquetas([...etiquetas, nueva]);
    setNuevaEtiquetaNombre('');
    setNuevaEtiquetaColor('#8b5cf6');
  };

  const eliminarEtiqueta = (id: string) => {
    setEtiquetas(etiquetas.filter(e => e.id !== id || e.esDefault));
  };

  return (
    <div className="msg-config-container">
      {/* Integraciones */}
      <div className="config-section">
        <h3>{Icons.link} Integraciones</h3>
        <p className="config-description">Conecta tus cuentas para recibir mensajes desde un solo lugar.</p>
        <div className="integrations-grid">
          {integraciones.map(integ => (
            <div key={integ.id} className={`integration-card ${integ.conectado ? 'connected' : ''}`}>
              <div className="integration-header">
                <span className="integration-icon" style={{ color: getOrigenColor(integ.tipo) }}>{getOrigenIcon(integ.tipo)}</span>
                <span className="integration-name">{integ.nombre}</span>
              </div>
              <div className="integration-status">
                {integ.conectado ? (
                  <><span className="status-connected">{Icons.check} Conectado</span><span className="integration-account">{integ.cuenta}</span></>
                ) : (
                  <span className="status-disconnected">Desconectado</span>
                )}
              </div>
              <button className={`btn-integration ${integ.conectado ? 'disconnect' : 'connect'}`}>
                {integ.conectado ? 'Desconectar' : 'Conectar'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Etiquetas */}
      <div className="config-section">
        <h3>{Icons.tag} Etiquetas de Chats</h3>
        <p className="config-description">Clasifica tus conversaciones con etiquetas personalizadas.</p>
        <div className="etiquetas-list">
          {etiquetas.map(et => (
            <div key={et.id} className="etiqueta-item">
              <span className="etiqueta-dot" style={{ backgroundColor: et.color }}></span>
              <span className="etiqueta-nombre">{et.nombre}</span>
              {et.esDefault && <span className="etiqueta-default">Sistema</span>}
              {!et.esDefault && (
                <button className="btn-delete-etiqueta" onClick={() => eliminarEtiqueta(et.id)}>{Icons.trash}</button>
              )}
            </div>
          ))}
        </div>
        <div className="nueva-etiqueta-form">
          <input type="text" placeholder="Nueva etiqueta..." value={nuevaEtiquetaNombre} onChange={(e) => setNuevaEtiquetaNombre(e.target.value)} />
          <input type="color" value={nuevaEtiquetaColor} onChange={(e) => setNuevaEtiquetaColor(e.target.value)} className="color-picker" />
          <button className="btn-add-etiqueta" onClick={agregarEtiqueta} disabled={!nuevaEtiquetaNombre.trim()}>{Icons.plus}</button>
        </div>
      </div>

      {/* Contactos automáticos */}
      <div className="config-section">
        <h3>{Icons.users} Registro de Contactos</h3>
        <p className="config-description">Decide cómo manejar los nuevos contactos que te escriben.</p>
        <div className="config-options">
          <label className="config-toggle">
            <input type="checkbox" checked={autoRegistrarContactos} onChange={(e) => setAutoRegistrarContactos(e.target.checked)} />
            <span className="toggle-slider"></span>
            <span className="toggle-label">Registrar automáticamente cada cliente que me escriba en Contactos</span>
          </label>
          <p className="config-hint">Si está desactivado, puedes agregar contactos manualmente con el botón + junto al nombre en cada conversación.</p>
        </div>
      </div>

      {/* Firma de correo */}
      <div className="config-section">
        <h3>{Icons.signature} Firma de Correo</h3>
        <p className="config-description">Se agregará automáticamente a todos tus correos enviados.</p>
        <div className="config-form">
          <textarea className="signature-input" placeholder="Escribe tu firma..." value={firmaEmail} onChange={(e) => setFirmaEmail(e.target.value)} rows={5} />
          <button className="btn-primary">Guardar firma</button>
        </div>
      </div>

      {/* Notificaciones */}
      <div className="config-section">
        <h3>{Icons.bell} Notificaciones</h3>
        <p className="config-description">Configura cómo recibir notificaciones de nuevos mensajes.</p>
        <div className="config-options">
          <label className="config-toggle">
            <input type="checkbox" checked={notifChats} onChange={(e) => setNotifChats(e.target.checked)} />
            <span className="toggle-slider"></span>
            <span className="toggle-label">Notificar nuevos chats</span>
          </label>
          <label className="config-toggle">
            <input type="checkbox" checked={notifEmails} onChange={(e) => setNotifEmails(e.target.checked)} />
            <span className="toggle-slider"></span>
            <span className="toggle-label">Notificar nuevos correos</span>
          </label>
          <label className="config-toggle">
            <input type="checkbox" checked={notifSonido} onChange={(e) => setNotifSonido(e.target.checked)} />
            <span className="toggle-slider"></span>
            <span className="toggle-label">Sonido de notificación</span>
          </label>
        </div>
      </div>

      <style>{`
        .msg-config-container { padding: 20px; overflow-y: auto; height: calc(100vh - 140px); }
        .config-section { background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 20px; }
        .config-section h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 6px 0; font-size: 1rem; font-weight: 600; color: #0f172a; }
        .config-description { margin: 0 0 16px 0; color: #64748b; font-size: 0.8125rem; }
        .config-hint { margin: 8px 0 0 0; color: #94a3b8; font-size: 0.75rem; font-style: italic; }

        .integrations-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
        .integration-card { padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center; }
        .integration-card.connected { background: #f0fdf4; border-color: #bbf7d0; }
        .integration-header { display: flex; flex-direction: column; align-items: center; gap: 6px; margin-bottom: 10px; }
        .integration-icon svg { width: 24px; height: 24px; }
        .integration-name { font-weight: 600; color: #0f172a; font-size: 0.8125rem; }
        .integration-status { display: flex; flex-direction: column; gap: 2px; margin-bottom: 12px; min-height: 32px; }
        .status-connected { display: flex; align-items: center; justify-content: center; gap: 3px; color: #16a34a; font-size: 0.75rem; font-weight: 500; }
        .status-disconnected { color: #94a3b8; font-size: 0.75rem; }
        .integration-account { font-size: 0.6875rem; color: #64748b; }
        .btn-integration { width: 100%; padding: 6px 12px; border-radius: 5px; font-size: 0.75rem; font-weight: 500; cursor: pointer; transition: all 0.15s; }
        .btn-integration.connect { background: #3b82f6; border: none; color: white; }
        .btn-integration.connect:hover { background: #2563eb; }
        .btn-integration.disconnect { background: white; border: 1px solid #e2e8f0; color: #64748b; }
        .btn-integration.disconnect:hover { background: #fef2f2; border-color: #fecaca; color: #dc2626; }

        .etiquetas-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
        .etiqueta-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: #f8fafc; border-radius: 6px; }
        .etiqueta-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .etiqueta-nombre { flex: 1; font-size: 0.8125rem; color: #334155; }
        .etiqueta-default { font-size: 0.6875rem; color: #94a3b8; padding: 2px 6px; background: #f1f5f9; border-radius: 3px; }
        .btn-delete-etiqueta { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; background: none; border: none; color: #94a3b8; cursor: pointer; border-radius: 4px; }
        .btn-delete-etiqueta:hover { background: #fef2f2; color: #dc2626; }
        .nueva-etiqueta-form { display: flex; gap: 8px; align-items: center; }
        .nueva-etiqueta-form input[type="text"] { flex: 1; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.8125rem; }
        .nueva-etiqueta-form input[type="text"]:focus { outline: none; border-color: #3b82f6; }
        .color-picker { width: 36px; height: 36px; padding: 2px; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; }
        .btn-add-etiqueta { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: #3b82f6; border: none; border-radius: 6px; color: white; cursor: pointer; }
        .btn-add-etiqueta:hover:not(:disabled) { background: #2563eb; }
        .btn-add-etiqueta:disabled { background: #cbd5e1; cursor: not-allowed; }

        .config-form { display: flex; flex-direction: column; gap: 12px; }
        .signature-input { width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.8125rem; font-family: inherit; resize: vertical; min-height: 100px; }
        .signature-input:focus { outline: none; border-color: #3b82f6; }
        .btn-primary { align-self: flex-start; padding: 8px 16px; background: #3b82f6; border: none; border-radius: 5px; color: white; font-size: 0.8125rem; font-weight: 500; cursor: pointer; transition: background 0.15s; }
        .btn-primary:hover { background: #2563eb; }

        .config-options { display: flex; flex-direction: column; gap: 12px; }
        .config-toggle { display: flex; align-items: center; gap: 10px; cursor: pointer; }
        .config-toggle input { display: none; }
        .toggle-slider { position: relative; width: 40px; height: 22px; background: #cbd5e1; border-radius: 11px; transition: background 0.2s; flex-shrink: 0; }
        .toggle-slider::before { content: ''; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; background: white; border-radius: 50%; transition: transform 0.2s; }
        .config-toggle input:checked + .toggle-slider { background: #3b82f6; }
        .config-toggle input:checked + .toggle-slider::before { transform: translateX(18px); }
        .toggle-label { font-size: 0.8125rem; color: #334155; }
      `}</style>
    </div>
  );
}
