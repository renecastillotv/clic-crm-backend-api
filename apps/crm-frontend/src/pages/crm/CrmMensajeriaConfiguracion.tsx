/**
 * CrmMensajeriaConfiguracion - Configuración de mensajería
 *
 * Gestión de integraciones (estado real), etiquetas, firmas y notificaciones.
 * Conecta a: /mensajeria/etiquetas, /mensajeria/firmas, /mensajeria-email/credentials,
 *            /mensajeria-whatsapp/credentials, /mensajeria-webchat/config, /api-credentials
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageHeader } from '../../layouts/CrmLayout';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../services/api';

// ==================== TYPES ====================

interface Etiqueta {
  id: string;
  codigo: string;
  nombre: string;
  color: string;
  es_default: boolean;
}

interface IntegracionStatus {
  tipo: 'whatsapp' | 'instagram' | 'facebook' | 'web_chat' | 'email';
  nombre: string;
  conectado: boolean;
  cuenta?: string;
}

interface Firma {
  id: string;
  nombre: string;
  contenido_html: string;
  es_default: boolean;
}

interface InfoNegocio {
  nombre?: string;
  isotipo_url?: string;
  logo_url?: string;
  direccion?: string;
  ciudad?: string;
  estado_provincia?: string;
  pais?: string;
  telefono_principal?: string;
  email_principal?: string;
}

// ==================== ICONS ====================

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
  bold: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
    </svg>
  ),
  italic: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/>
    </svg>
  ),
  underline: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/>
    </svg>
  ),
  image: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
    </svg>
  ),
  linkIcon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  ),
  building: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><line x1="8" y1="6" x2="8" y2="6.01"/><line x1="12" y1="6" x2="12" y2="6.01"/><line x1="16" y1="6" x2="16" y2="6.01"/><line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="16" y1="10" x2="16" y2="10.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/>
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

// ==================== COMPONENT ====================

export default function CrmMensajeriaConfiguracion() {
  const { setPageHeader } = usePageHeader();
  const { user, tenantActual } = useAuth();
  const navigate = useNavigate();

  const tenantId = tenantActual?.id;
  const userId = user?.id;

  // Integration statuses
  const [integraciones, setIntegraciones] = useState<IntegracionStatus[]>([]);
  const [loadingInteg, setLoadingInteg] = useState(true);

  // Etiquetas
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [nuevaEtiquetaNombre, setNuevaEtiquetaNombre] = useState('');
  const [nuevaEtiquetaColor, setNuevaEtiquetaColor] = useState('#8b5cf6');

  // Firma
  const [firmas, setFirmas] = useState<Firma[]>([]);
  const [firmaSaving, setFirmaSaving] = useState(false);
  const firmaEditorRef = useRef<HTMLDivElement>(null);
  const firmaImageInputRef = useRef<HTMLInputElement>(null);

  // Info negocio (for timbrado)
  const [infoNegocio, setInfoNegocio] = useState<InfoNegocio | null>(null);

  // Notifications (local preferences)
  const [notifChats, setNotifChats] = useState(true);
  const [notifEmails, setNotifEmails] = useState(true);
  const [notifSonido, setNotifSonido] = useState(true);

  useEffect(() => {
    setPageHeader({ title: 'Configuración', subtitle: 'Ajustes de mensajería' });
  }, [setPageHeader]);

  // ==================== FETCH INTEGRATION STATUS ====================

  const fetchIntegrationStatus = useCallback(async () => {
    if (!tenantId || !userId) return;
    setLoadingInteg(true);

    const results: IntegracionStatus[] = [];

    // WhatsApp, Instagram & Facebook - check api-credentials for Meta/WA connection
    try {
      const metaRes = await apiFetch(`/tenants/${tenantId}/api-credentials`);
      const metaData = await metaRes.json();
      const hasMeta = !!metaData?.metaConnected;
      const hasIG = !!metaData?.metaInstagramBusinessAccountId;

      results.push({
        tipo: 'whatsapp', nombre: 'WhatsApp Business',
        conectado: !!metaData?.whatsappConnected,
        cuenta: metaData?.whatsappPhoneNumberId ? `ID: ${metaData.whatsappPhoneNumberId}` : undefined,
      });
      results.push({
        tipo: 'instagram', nombre: 'Instagram',
        conectado: hasIG,
        cuenta: metaData?.metaInstagramUsername ? `@${metaData.metaInstagramUsername}` : undefined,
      });
      results.push({
        tipo: 'facebook', nombre: 'Facebook Page',
        conectado: hasMeta,
        cuenta: metaData?.metaPageName || undefined,
      });
    } catch {
      results.push({ tipo: 'whatsapp', nombre: 'WhatsApp Business', conectado: false });
      results.push({ tipo: 'instagram', nombre: 'Instagram', conectado: false });
      results.push({ tipo: 'facebook', nombre: 'Facebook Page', conectado: false });
    }

    // Web Chat - check webchat config
    try {
      const wcRes = await apiFetch(`/tenants/${tenantId}/mensajeria-webchat/config`);
      const wcData = await wcRes.json();
      results.push({
        tipo: 'web_chat', nombre: 'Chat Web (Sitio)',
        conectado: !!wcData?.enabled,
        cuenta: wcData?.enabled ? 'Widget activo' : undefined,
      });
    } catch {
      results.push({ tipo: 'web_chat', nombre: 'Chat Web (Sitio)', conectado: false });
    }

    // Email - check user email credentials
    try {
      const emailRes = await apiFetch(`/tenants/${tenantId}/mensajeria-email/credentials?usuario_id=${userId}`);
      const emailData = await emailRes.json();
      results.push({
        tipo: 'email', nombre: 'Correo Electrónico',
        conectado: !!emailData?.is_connected,
        cuenta: emailData?.email_address || undefined,
      });
    } catch {
      results.push({ tipo: 'email', nombre: 'Correo Electrónico', conectado: false });
    }

    setIntegraciones(results);
    setLoadingInteg(false);
  }, [tenantId, userId]);

  // ==================== FETCH ETIQUETAS ====================

  const fetchEtiquetas = useCallback(async () => {
    if (!tenantId) return;
    try {
      const res = await apiFetch(`/tenants/${tenantId}/mensajeria/etiquetas`);
      const data = await res.json();
      setEtiquetas(Array.isArray(data) ? data : []);
    } catch {
      setEtiquetas([]);
    }
  }, [tenantId]);

  // ==================== FETCH FIRMAS ====================

  const fetchFirmas = useCallback(async () => {
    if (!tenantId || !userId) return;
    try {
      const res = await apiFetch(`/tenants/${tenantId}/mensajeria/firmas?usuario_id=${userId}`);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setFirmas(arr);
      // Set editor content after mount
      setTimeout(() => {
        if (firmaEditorRef.current && arr.length > 0) {
          firmaEditorRef.current.innerHTML = arr[0].contenido_html || '';
        }
      }, 100);
    } catch {
      setFirmas([]);
    }
  }, [tenantId, userId]);

  // ==================== FETCH INFO NEGOCIO ====================

  const fetchInfoNegocio = useCallback(async () => {
    if (!tenantId) return;
    try {
      const res = await apiFetch(`/tenants/${tenantId}/info-negocio`);
      const data = await res.json();
      // API returns { infoNegocio: { nombre, ciudad, pais, isotipo_url, ... } }
      setInfoNegocio(data?.infoNegocio || data);
    } catch {
      setInfoNegocio(null);
    }
  }, [tenantId]);

  useEffect(() => { fetchIntegrationStatus(); }, [fetchIntegrationStatus]);
  useEffect(() => { fetchEtiquetas(); }, [fetchEtiquetas]);
  useEffect(() => { fetchFirmas(); }, [fetchFirmas]);
  useEffect(() => { fetchInfoNegocio(); }, [fetchInfoNegocio]);

  // ==================== ETIQUETA ACTIONS ====================

  const agregarEtiqueta = async () => {
    if (!tenantId || !nuevaEtiquetaNombre.trim()) return;
    const codigo = nuevaEtiquetaNombre.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    try {
      await apiFetch(`/tenants/${tenantId}/mensajeria/etiquetas`, {
        method: 'POST',
        body: JSON.stringify({ codigo, nombre: nuevaEtiquetaNombre, color: nuevaEtiquetaColor }),
      });
      setNuevaEtiquetaNombre('');
      setNuevaEtiquetaColor('#8b5cf6');
      await fetchEtiquetas();
    } catch (err: any) {
      console.error('Error creating etiqueta:', err.message);
    }
  };

  const eliminarEtiqueta = async (id: string) => {
    if (!tenantId) return;
    try {
      await apiFetch(`/tenants/${tenantId}/mensajeria/etiquetas/${id}`, { method: 'DELETE' });
      await fetchEtiquetas();
    } catch (err: any) {
      console.error('Error deleting etiqueta:', err.message);
    }
  };

  // ==================== FIRMA ACTIONS ====================

  const guardarFirma = async () => {
    if (!tenantId || !userId) return;
    setFirmaSaving(true);
    const contenidoHtml = firmaEditorRef.current?.innerHTML || '';
    try {
      if (firmas.length > 0) {
        await apiFetch(`/tenants/${tenantId}/mensajeria/firmas/${firmas[0].id}`, {
          method: 'PUT',
          body: JSON.stringify({ contenido_html: contenidoHtml }),
        });
      } else {
        await apiFetch(`/tenants/${tenantId}/mensajeria/firmas`, {
          method: 'POST',
          body: JSON.stringify({ usuario_id: userId, nombre: 'Principal', contenido_html: contenidoHtml, es_default: true }),
        });
      }
      await fetchFirmas();
    } catch (err: any) {
      console.error('Error saving firma:', err.message);
    } finally {
      setFirmaSaving(false);
    }
  };

  // Rich text helpers for firma
  const firmaExecFormat = (command: string, value?: string) => {
    firmaEditorRef.current?.focus();
    document.execCommand(command, false, value);
  };

  const firmaInsertLink = () => {
    const url = prompt('URL del enlace:');
    if (url) {
      firmaEditorRef.current?.focus();
      document.execCommand('createLink', false, url);
    }
  };

  const firmaInsertImage = () => {
    firmaImageInputRef.current?.click();
  };

  const handleFirmaImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      firmaEditorRef.current?.focus();
      document.execCommand('insertHTML', false, `<img src="${dataUrl}" alt="" style="max-width:200px;max-height:80px;border-radius:4px;" />`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Timbrado inmobiliaria
  const insertTimbrado = () => {
    const nombreNegocio = infoNegocio?.nombre || 'Tu Inmobiliaria';
    const logoUrl = infoNegocio?.isotipo_url || infoNegocio?.logo_url || '';
    const ubicacion = [infoNegocio?.direccion, infoNegocio?.ciudad, infoNegocio?.estado_provincia, infoNegocio?.pais].filter(Boolean).join(', ');
    const nombreUsuario = user?.nombre
      ? `${user.nombre}${user.apellido ? ' ' + user.apellido : ''}`
      : 'Asesor';

    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="${nombreNegocio}" style="max-width:120px;max-height:50px;object-fit:contain;display:block;margin-bottom:8px;" />`
      : '';

    const timbradoHtml = `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;"><tr><td style="padding-right:16px;vertical-align:top;">${logoHtml}</td><td style="vertical-align:top;"><div style="font-size:15px;font-weight:700;color:#0f172a;margin:0 0 2px;">${nombreUsuario}</div><div style="font-size:13px;color:#3b82f6;font-weight:600;margin:0 0 6px;">Asesor Inmobiliario</div><div style="font-size:13px;font-weight:600;color:#334155;margin:0 0 2px;">${nombreNegocio}</div>${ubicacion ? `<div style="font-size:12px;color:#64748b;">${ubicacion}</div>` : ''}</td></tr></table>`;

    if (firmaEditorRef.current) {
      firmaEditorRef.current.innerHTML = timbradoHtml;
    }
  };

  // ==================== HELPERS ====================

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

  // ==================== RENDER ====================

  return (
    <div className="msg-config-container">
      {/* Integraciones */}
      <div className="config-section">
        <h3>{Icons.link} Integraciones</h3>
        <p className="config-description">Estado actual de tus canales de mensajería.</p>
        {loadingInteg ? (
          <p style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>Cargando integraciones...</p>
        ) : (
          <div className="integrations-grid">
            {integraciones.map(integ => (
              <div key={integ.tipo} className={`integration-card ${integ.conectado ? 'connected' : ''}`}>
                <div className="integration-header">
                  <span className="integration-icon" style={{ color: getOrigenColor(integ.tipo) }}>{getOrigenIcon(integ.tipo)}</span>
                  <span className="integration-name">{integ.nombre}</span>
                </div>
                <div className="integration-status">
                  {integ.conectado ? (
                    <><span className="status-connected">{Icons.check} Conectado</span>{integ.cuenta && <span className="integration-account">{integ.cuenta}</span>}</>
                  ) : (
                    <span className="status-disconnected">No configurado</span>
                  )}
                </div>
                {!integ.conectado && (
                  <button
                    className="btn-config-integ"
                    onClick={() => {
                      if (integ.tipo === 'email') navigate('../correo', { relative: 'path' });
                      else if (integ.tipo === 'whatsapp' || integ.tipo === 'instagram' || integ.tipo === 'facebook') navigate('../../marketing/configuracion', { relative: 'path' });
                      else if (integ.tipo === 'web_chat') navigate('../../marketing/configuracion', { relative: 'path' });
                    }}
                  >
                    Configurar
                  </button>
                )}
                {integ.conectado && integ.tipo === 'email' && (
                  <button className="btn-config-integ btn-config-ver" onClick={() => navigate('../correo', { relative: 'path' })}>Ir a Correo</button>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="config-hint">
          Para conectar WhatsApp, Facebook o Instagram ve a Marketing &gt; Configuración.
          Para Email ve a Correo &gt; Configurar cuenta. Web Chat se activa abajo.
        </p>
      </div>

      {/* Etiquetas */}
      <div className="config-section">
        <h3>{Icons.tag} Etiquetas de Chats</h3>
        <p className="config-description">Clasifica tus conversaciones con etiquetas personalizadas.</p>
        <div className="etiquetas-list">
          {etiquetas.length === 0 && <p style={{ color: '#94a3b8', fontSize: '0.8125rem', margin: 0 }}>No hay etiquetas. Crea la primera.</p>}
          {etiquetas.map(et => (
            <div key={et.id} className="etiqueta-item">
              <span className="etiqueta-dot" style={{ backgroundColor: et.color }}></span>
              <span className="etiqueta-nombre">{et.nombre}</span>
              {et.es_default && <span className="etiqueta-default">Sistema</span>}
              {!et.es_default && (
                <button className="btn-delete-etiqueta" onClick={() => eliminarEtiqueta(et.id)}>{Icons.trash}</button>
              )}
            </div>
          ))}
        </div>
        <div className="nueva-etiqueta-form">
          <input type="text" placeholder="Nueva etiqueta..." value={nuevaEtiquetaNombre} onChange={(e) => setNuevaEtiquetaNombre(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') agregarEtiqueta(); }} />
          <input type="color" value={nuevaEtiquetaColor} onChange={(e) => setNuevaEtiquetaColor(e.target.value)} className="color-picker" />
          <button className="btn-add-etiqueta" onClick={agregarEtiqueta} disabled={!nuevaEtiquetaNombre.trim()}>{Icons.plus}</button>
        </div>
      </div>

      {/* Firma de correo - Rich text editor */}
      <div className="config-section">
        <h3>{Icons.signature} Firma de Correo</h3>
        <p className="config-description">Se agregará automáticamente a todos tus correos enviados.</p>
        <div className="config-form">
          {/* Timbrado button */}
          <button className="btn-timbrado" onClick={insertTimbrado}>
            {Icons.building} Incluir timbrado de la inmobiliaria
          </button>

          {/* Toolbar */}
          <div className="firma-toolbar">
            <button type="button" className="firma-toolbar-btn" onClick={() => firmaExecFormat('bold')} title="Negrita">{Icons.bold}</button>
            <button type="button" className="firma-toolbar-btn" onClick={() => firmaExecFormat('italic')} title="Cursiva">{Icons.italic}</button>
            <button type="button" className="firma-toolbar-btn" onClick={() => firmaExecFormat('underline')} title="Subrayado">{Icons.underline}</button>
            <span className="firma-toolbar-sep" />
            <button type="button" className="firma-toolbar-btn" onClick={firmaInsertLink} title="Insertar enlace">{Icons.linkIcon}</button>
            <button type="button" className="firma-toolbar-btn" onClick={firmaInsertImage} title="Insertar imagen">{Icons.image}</button>
            <input ref={firmaImageInputRef} type="file" accept="image/*" hidden onChange={handleFirmaImageUpload} />
          </div>

          {/* Rich editor */}
          <div
            ref={firmaEditorRef}
            className="firma-rich-editor"
            contentEditable
            data-placeholder="Escribe tu firma con formato..."
          />

          <div className="firma-actions">
            <button className="btn-primary" onClick={guardarFirma} disabled={firmaSaving}>{firmaSaving ? 'Guardando...' : 'Guardar firma'}</button>
          </div>
        </div>
      </div>

      {/* Notificaciones */}
      <div className="config-section">
        <h3>{Icons.bell} Notificaciones</h3>
        <p className="config-description">Configura cómo recibir notificaciones de nuevos mensajes.</p>
        <div className="config-options">
          <label className="config-toggle">
            <input type="checkbox" checked={notifChats} onChange={(e) => setNotifChats(e.target.checked)} />
            <span className="toggle-track">
              <span className="toggle-thumb" />
            </span>
            <span className="toggle-label">Notificar nuevos chats</span>
          </label>
          <label className="config-toggle">
            <input type="checkbox" checked={notifEmails} onChange={(e) => setNotifEmails(e.target.checked)} />
            <span className="toggle-track">
              <span className="toggle-thumb" />
            </span>
            <span className="toggle-label">Notificar nuevos correos</span>
          </label>
          <label className="config-toggle">
            <input type="checkbox" checked={notifSonido} onChange={(e) => setNotifSonido(e.target.checked)} />
            <span className="toggle-track">
              <span className="toggle-thumb" />
            </span>
            <span className="toggle-label">Sonido de notificación</span>
          </label>
        </div>
      </div>

      <style>{`
        .msg-config-container { padding: 20px; overflow-y: auto; height: calc(100vh - 140px); }
        .config-section { background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 20px; }
        .config-section h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 6px 0; font-size: 1rem; font-weight: 600; color: #0f172a; }
        .config-description { margin: 0 0 16px 0; color: #64748b; font-size: 0.8125rem; }
        .config-hint { margin: 12px 0 0 0; color: #94a3b8; font-size: 0.75rem; font-style: italic; }

        .integrations-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
        .integration-card { padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center; }
        .integration-card.connected { background: #f0fdf4; border-color: #bbf7d0; }
        .integration-header { display: flex; flex-direction: column; align-items: center; gap: 6px; margin-bottom: 10px; }
        .integration-icon svg { width: 24px; height: 24px; }
        .integration-name { font-weight: 600; color: #0f172a; font-size: 0.8125rem; }
        .integration-status { display: flex; flex-direction: column; gap: 2px; min-height: 32px; }
        .status-connected { display: flex; align-items: center; justify-content: center; gap: 3px; color: #16a34a; font-size: 0.75rem; font-weight: 500; }
        .status-disconnected { color: #94a3b8; font-size: 0.75rem; }
        .integration-account { font-size: 0.6875rem; color: #64748b; }
        .btn-config-integ { margin-top: 8px; padding: 4px 12px; background: #3b82f6; color: white; border: none; border-radius: 5px; font-size: 0.75rem; font-weight: 500; cursor: pointer; transition: background 0.15s; }
        .btn-config-integ:hover { background: #2563eb; }
        .btn-config-ver { background: #f1f5f9; color: #3b82f6; border: 1px solid #e2e8f0; }
        .btn-config-ver:hover { background: #e2e8f0; }

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

        .config-form { display: flex; flex-direction: column; gap: 0; }

        /* Timbrado button */
        .btn-timbrado {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          background: linear-gradient(135deg, #eff6ff, #dbeafe);
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          color: #1d4ed8;
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 12px;
          align-self: flex-start;
        }
        .btn-timbrado:hover {
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          border-color: #93c5fd;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
        }

        /* Firma toolbar */
        .firma-toolbar {
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 6px 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-bottom: none;
          border-radius: 8px 8px 0 0;
        }
        .firma-toolbar-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          background: none;
          border: 1px solid transparent;
          border-radius: 5px;
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s;
        }
        .firma-toolbar-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
          border-color: #cbd5e1;
        }
        .firma-toolbar-sep {
          width: 1px;
          height: 18px;
          background: #e2e8f0;
          margin: 0 4px;
          flex-shrink: 0;
        }

        /* Firma rich editor */
        .firma-rich-editor {
          width: 100%;
          min-height: 140px;
          max-height: 300px;
          overflow-y: auto;
          padding: 14px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 0 0 8px 8px;
          font-size: 0.875rem;
          font-family: inherit;
          color: #334155;
          line-height: 1.6;
          outline: none;
          background: white;
          box-sizing: border-box;
          word-break: break-word;
        }
        .firma-rich-editor:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.08);
        }
        .firma-rich-editor:empty::before {
          content: attr(data-placeholder);
          color: #94a3b8;
          pointer-events: none;
        }
        .firma-rich-editor a { color: #3b82f6; text-decoration: underline; }
        .firma-rich-editor img { max-width: 200px; max-height: 80px; border-radius: 4px; display: block; margin: 6px 0; }

        .firma-actions {
          margin-top: 12px;
        }

        .btn-primary { align-self: flex-start; padding: 8px 16px; background: #3b82f6; border: none; border-radius: 6px; color: white; font-size: 0.8125rem; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .btn-primary:hover { background: #2563eb; }
        .btn-primary:disabled { opacity: 0.5; cursor: default; }

        /* Toggle switches - modern style */
        .config-options { display: flex; flex-direction: column; gap: 16px; }
        .config-toggle {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          padding: 10px 14px;
          border-radius: 10px;
          transition: background 0.15s;
        }
        .config-toggle:hover { background: #f8fafc; }
        .config-toggle input { display: none; }

        .toggle-track {
          position: relative;
          width: 44px;
          height: 24px;
          background: #cbd5e1;
          border-radius: 12px;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          flex-shrink: 0;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
        }
        .toggle-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 3px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1);
        }
        .config-toggle input:checked + .toggle-track {
          background: #3b82f6;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
        }
        .config-toggle input:checked + .toggle-track .toggle-thumb {
          transform: translateX(20px);
          box-shadow: 0 1px 3px rgba(59,130,246,0.3), 0 1px 2px rgba(0,0,0,0.1);
        }
        .toggle-label {
          font-size: 0.875rem;
          color: #334155;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
