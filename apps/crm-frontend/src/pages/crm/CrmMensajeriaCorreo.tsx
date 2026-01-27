/**
 * CrmMensajeriaCorreo - Bandeja de correo electrónico
 *
 * Bandeja de email por usuario via MXRoute (IMAP lectura + SMTP envío).
 * Conecta al backend: mensajeria-email routes (Phase 2).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePageHeader } from '../../layouts/CrmLayout';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../services/api';

// ==================== TYPES ====================

interface EmailConversacion {
  id: string;
  contacto_nombre: string | null;
  ultimo_mensaje_texto: string | null;
  ultimo_mensaje_at: string | null;
  ultimo_mensaje_es_entrante: boolean | null;
  no_leidos: number;
  estado: string;
  metadata: Record<string, any>;
}

interface EmailMensaje {
  id: string;
  es_entrante: boolean;
  remitente_nombre: string | null;
  contenido: string | null;
  contenido_plain: string | null;
  email_asunto: string | null;
  email_de: string | null;
  email_para: string | null;
  email_cc: string | null;
  adjuntos: any[];
  created_at: string;
}

interface EmailCredentialsInfo {
  id: string;
  email_address: string;
  display_name: string | null;
  is_connected: boolean;
  last_sync_at: string | null;
  last_error: string | null;
  has_imap_password: boolean;
  has_smtp_password: boolean;
}

type Carpeta = 'bandeja' | 'enviados';

// ==================== ICONS ====================

const Icons = {
  email: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  ),
  search: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.35-4.35"/>
    </svg>
  ),
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14m-7-7h14"/>
    </svg>
  ),
  inbox: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
    </svg>
  ),
  sent: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  attachment: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
    </svg>
  ),
  refresh: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  close: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  send: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  disconnect: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
      <line x1="12" y1="2" x2="12" y2="12"/>
    </svg>
  ),
};

// ==================== HELPERS ====================

function translateEmailError(error: string): string {
  const lower = error.toLowerCase();
  if (lower.includes('invalid login') || lower.includes('535') || lower.includes('incorrect authentication') || lower.includes('authentication failed')) {
    return 'Contraseña incorrecta. Verifica tu correo y contraseña.';
  }
  if (lower.includes('enotfound') || lower.includes('getaddrinfo')) {
    return 'Servidor no encontrado. Verifica el hostname (ej: witcher.mxrouting.net).';
  }
  if (lower.includes('econnrefused')) {
    return 'Conexión rechazada. Verifica el host y puerto.';
  }
  if (lower.includes('etimeout') || lower.includes('timeout') || lower.includes('ebusy')) {
    return 'Tiempo de espera agotado. Verifica el host y puerto.';
  }
  if (lower.includes('certificate') || lower.includes('ssl') || lower.includes('tls')) {
    return 'Error de certificado SSL/TLS. Verifica la configuración de seguridad.';
  }
  if (lower.includes('command failed')) {
    return 'Error del servidor de correo. Verifica tus credenciales.';
  }
  return error;
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CrmMensajeriaCorreo() {
  const { setPageHeader } = usePageHeader();
  const { user, tenantActual } = useAuth();

  // State
  const [credentials, setCredentials] = useState<EmailCredentialsInfo | null>(null);
  const [credentialsLoading, setCredentialsLoading] = useState(true);
  const [conversaciones, setConversaciones] = useState<EmailConversacion[]>([]);
  const [mensajes, setMensajes] = useState<EmailMensaje[]>([]);
  const [conversacionActiva, setConversacionActiva] = useState<string | null>(null);
  const [carpeta, setCarpeta] = useState<Carpeta>('bandeja');
  const [busqueda, setBusqueda] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Compose
  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeCc, setComposeCc] = useState('');
  const [sending, setSending] = useState(false);

  // Reply
  const [replyMode, setReplyMode] = useState(false);
  const [replyBody, setReplyBody] = useState('');

  // Setup
  const [showSetup, setShowSetup] = useState(false);
  const [setupEmail, setSetupEmail] = useState('');
  const [setupDisplayName, setSetupDisplayName] = useState('');
  const [setupImapHost, setSetupImapHost] = useState('witcher.mxrouting.net');
  const [setupImapPort, setSetupImapPort] = useState('993');
  const [setupSmtpHost, setSetupSmtpHost] = useState('witcher.mxrouting.net');
  const [setupSmtpPort, setSetupSmtpPort] = useState('465');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupTesting, setSetupTesting] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [setupSuccess, setSetupSuccess] = useState('');

  const tenantId = tenantActual?.id;
  const userId = user?.id;
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  // ==================== FETCH CREDENTIALS ====================

  const fetchCredentials = useCallback(async () => {
    if (!tenantId || !userId) return;
    setCredentialsLoading(true);
    try {
      const res = await apiFetch(`/tenants/${tenantId}/mensajeria-email/credentials?usuario_id=${userId}`);
      const data = await res.json();
      setCredentials(data);
    } catch {
      setCredentials(null);
    } finally {
      setCredentialsLoading(false);
    }
  }, [tenantId, userId]);

  useEffect(() => { fetchCredentials(); }, [fetchCredentials]);

  // ==================== FETCH CONVERSATIONS ====================

  const fetchConversaciones = useCallback(async () => {
    if (!tenantId || !userId || !credentials?.is_connected) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ usuario_id: userId, carpeta });
      if (busqueda) params.set('busqueda', busqueda);
      const res = await apiFetch(`/tenants/${tenantId}/mensajeria-email/inbox?${params}`);
      const data = await res.json();
      setConversaciones(data.data || []);
    } catch {
      setConversaciones([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, userId, credentials?.is_connected, busqueda, carpeta]);

  useEffect(() => { fetchConversaciones(); }, [fetchConversaciones]);

  // ==================== FETCH MESSAGES ====================

  const fetchMensajes = useCallback(async (convId: string) => {
    if (!tenantId) return;
    try {
      const res = await apiFetch(`/tenants/${tenantId}/mensajeria-email/conversacion/${convId}/mensajes`);
      const data = await res.json();
      setMensajes(data.data || []);
      await apiFetch(`/tenants/${tenantId}/mensajeria-email/conversacion/${convId}/read`, { method: 'PUT' });
      setConversaciones(prev => prev.map(c => c.id === convId ? { ...c, no_leidos: 0 } : c));
    } catch {
      setMensajes([]);
    }
  }, [tenantId]);

  useEffect(() => {
    if (conversacionActiva) fetchMensajes(conversacionActiva);
  }, [conversacionActiva, fetchMensajes]);

  // ==================== AUTO-SYNC + POLLING ====================

  const handleSync = useCallback(async (silent = false) => {
    if (!tenantId || !userId) return;
    if (!silent) setSyncing(true);
    try {
      await apiFetch(`/tenants/${tenantId}/mensajeria-email/sync`, {
        method: 'POST',
        body: JSON.stringify({ usuario_id: userId }),
      });
      await fetchConversaciones();
    } catch {}
    if (!silent) setSyncing(false);
  }, [tenantId, userId, fetchConversaciones]);

  // Auto-sync on mount + every 60s; poll conversations every 15s
  useEffect(() => {
    if (!credentials?.is_connected) return;

    // Initial sync
    handleSync(true);

    // Sync IMAP every 60s
    syncIntervalRef.current = setInterval(() => handleSync(true), 60000);

    // Poll conversations every 15s (fast DB read)
    pollIntervalRef.current = setInterval(fetchConversaciones, 15000);

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [credentials?.is_connected, handleSync, fetchConversaciones]);

  // ==================== ACTIONS ====================

  const handleSaveCredentials = async () => {
    if (!tenantId || !userId || !setupEmail) return;
    setSetupTesting(true);
    setSetupError('');
    setSetupSuccess('');
    try {
      await apiFetch(`/tenants/${tenantId}/mensajeria-email/credentials`, {
        method: 'POST',
        body: JSON.stringify({
          usuario_id: userId, email_address: setupEmail, display_name: setupDisplayName || undefined,
          imap_host: setupImapHost, imap_port: parseInt(setupImapPort), imap_username: setupEmail, imap_password: setupPassword || undefined,
          smtp_host: setupSmtpHost, smtp_port: parseInt(setupSmtpPort), smtp_username: setupEmail, smtp_password: setupPassword || undefined,
        }),
      });
      const testResponse = await apiFetch(`/tenants/${tenantId}/mensajeria-email/test-connection`, {
        method: 'POST',
        body: JSON.stringify({ usuario_id: userId }),
      });
      const testRes = await testResponse.json();
      if (testRes.is_connected) {
        setSetupSuccess('Conexión exitosa. Sincronizando correos...');
        await apiFetch(`/tenants/${tenantId}/mensajeria-email/sync`, { method: 'POST', body: JSON.stringify({ usuario_id: userId }) });
        await fetchCredentials();
        await fetchConversaciones();
        setShowSetup(false);
      } else {
        // Translate each error to user-friendly message
        const imapErr = testRes.imap?.error ? translateEmailError(testRes.imap.error) : null;
        const smtpErr = testRes.smtp?.error ? translateEmailError(testRes.smtp.error) : null;
        const parts: string[] = [];
        if (imapErr) parts.push(`IMAP: ${imapErr}`);
        if (smtpErr) parts.push(`SMTP: ${smtpErr}`);
        setSetupError(parts.join(' — ') || 'No se pudo conectar. Verifica tus datos.');
      }
    } catch (err: any) {
      setSetupError(err.message || 'Error al guardar');
    } finally {
      setSetupTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!tenantId || !userId || !confirm('¿Desconectar cuenta de correo?')) return;
    await apiFetch(`/tenants/${tenantId}/mensajeria-email/credentials?usuario_id=${userId}`, { method: 'DELETE' });
    setCredentials(null);
    setConversaciones([]);
    setMensajes([]);
  };

  const handleSendEmail = async () => {
    if (!tenantId || !userId || !composeTo || !composeSubject) return;
    setSending(true);
    try {
      await apiFetch(`/tenants/${tenantId}/mensajeria-email/send`, {
        method: 'POST',
        body: JSON.stringify({
          usuario_id: userId,
          to: composeTo,
          cc: composeCc || undefined,
          subject: composeSubject,
          html: `<p>${composeBody.replace(/\n/g, '<br/>')}</p>`,
          text: composeBody,
        }),
      });
      setShowCompose(false);
      setComposeTo(''); setComposeSubject(''); setComposeBody(''); setComposeCc('');
      // Switch to Enviados to show the sent email
      setCarpeta('enviados');
    } catch {}
    setSending(false);
  };

  const handleReply = async () => {
    if (!tenantId || !userId || !conversacionActiva || !replyBody) return;
    setSending(true);
    try {
      const conv = conversaciones.find(c => c.id === conversacionActiva);
      const lastIncoming = mensajes.filter(m => m.es_entrante).pop();
      await apiFetch(`/tenants/${tenantId}/mensajeria-email/reply`, {
        method: 'POST',
        body: JSON.stringify({
          usuario_id: userId,
          conversacion_id: conversacionActiva,
          to: lastIncoming?.email_de || conv?.contacto_nombre || '',
          subject: lastIncoming?.email_asunto || '',
          html: `<p>${replyBody.replace(/\n/g, '<br/>')}</p>`,
          text: replyBody,
        }),
      });
      setReplyMode(false); setReplyBody('');
      await fetchMensajes(conversacionActiva);
      await fetchConversaciones();
    } catch {}
    setSending(false);
  };

  // ==================== COMPUTED ====================

  const totalNoLeidos = conversaciones.reduce((sum, c) => sum + (c.no_leidos || 0), 0);
  const convActual = conversaciones.find(c => c.id === conversacionActiva);

  // ==================== HEADER ====================

  useEffect(() => {
    if (!credentials?.is_connected) {
      setPageHeader({ title: 'Correo', subtitle: 'Configura tu cuenta de email' });
      return;
    }

    setPageHeader({
      title: 'Correo',
      subtitle: credentials.email_address,
      actions: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="correo-header-btn primary" onClick={() => setShowCompose(true)}>
            {Icons.plus} <span>Redactar</span>
          </button>
          <button className="correo-header-btn" onClick={() => handleSync(false)} disabled={syncing}>
            {Icons.refresh} <span>{syncing ? 'Sincronizando...' : 'Sincronizar'}</span>
          </button>
          <button className="correo-header-btn" onClick={() => setShowSetup(true)} title="Configuración">
            {Icons.settings}
          </button>
          <button className="correo-header-btn danger" onClick={handleDisconnect} title="Desconectar cuenta">
            {Icons.disconnect}
          </button>
        </div>
      ),
    });
  }, [setPageHeader, credentials, syncing, handleSync]);

  // ==================== RENDER: LOADING ====================

  if (credentialsLoading) {
    return (
      <div className="crm-correo">
        <div className="correo-empty-state">
          <p>Cargando...</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  // ==================== RENDER: SETUP REQUIRED ====================

  if (!credentials || !credentials.is_connected) {
    return (
      <div className="crm-correo">
        <div className="correo-empty-state">
          <div className="correo-empty-icon">{Icons.email}</div>
          <h3>Configura tu correo</h3>
          <p>Conecta tu cuenta de email para recibir y enviar correos desde el CRM.</p>
          <button className="correo-btn primary" onClick={() => setShowSetup(true)} style={{ marginTop: 16 }}>
            {Icons.settings} Configurar cuenta
          </button>
          {credentials?.last_error && (
            <div className="correo-alert error" style={{ marginTop: 12 }}>
              {translateEmailError(credentials.last_error)}
            </div>
          )}
        </div>
        {renderSetupModal()}
        <style>{styles}</style>
      </div>
    );
  }

  // ==================== RENDER: MAIN INBOX ====================

  return (
    <div className="crm-correo">
      {/* Toolbar: folder tabs + search */}
      <div className="correo-toolbar">
        <div className="correo-tabs">
          <button
            className={`correo-tab ${carpeta === 'bandeja' ? 'active' : ''}`}
            onClick={() => { setCarpeta('bandeja'); setConversacionActiva(null); }}
          >
            {Icons.inbox}
            <span>Bandeja</span>
            {carpeta === 'bandeja' && totalNoLeidos > 0 && <span className="correo-tab-badge">{totalNoLeidos}</span>}
          </button>
          <button
            className={`correo-tab ${carpeta === 'enviados' ? 'active' : ''}`}
            onClick={() => { setCarpeta('enviados'); setConversacionActiva(null); }}
          >
            {Icons.sent}
            <span>Enviados</span>
          </button>
        </div>
        <div className="correo-search">
          {Icons.search}
          <input
            type="text"
            placeholder="Buscar correos..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="correo-panels">
        {/* Email list */}
        <div className="correo-list-panel">
          <div className="correo-list">
            {loading && conversaciones.length === 0 && (
              <div className="correo-list-empty"><p>Cargando...</p></div>
            )}
            {conversaciones.map(conv => (
              <div
                key={conv.id}
                className={`correo-item ${conversacionActiva === conv.id ? 'active' : ''} ${conv.no_leidos > 0 ? 'unread' : ''}`}
                onClick={() => { setConversacionActiva(conv.id); setReplyMode(false); }}
              >
                <div className="correo-item-avatar">
                  {(conv.contacto_nombre || 'D')[0].toUpperCase()}
                </div>
                <div className="correo-item-content">
                  <div className="correo-item-top">
                    <span className="correo-item-from">{conv.contacto_nombre || 'Desconocido'}</span>
                    <span className="correo-item-time">{formatTimeAgo(conv.ultimo_mensaje_at)}</span>
                  </div>
                  <div className="correo-item-subject">{conv.metadata?.email_subject || '(Sin asunto)'}</div>
                  <div className="correo-item-preview">{conv.ultimo_mensaje_texto || ''}</div>
                </div>
                {conv.no_leidos > 0 && <span className="correo-item-badge">{conv.no_leidos}</span>}
              </div>
            ))}
            {!loading && conversaciones.length === 0 && (
              <div className="correo-list-empty">
                <div className="correo-empty-icon" style={{ width: 48, height: 48 }}>
                  {carpeta === 'bandeja' ? Icons.inbox : Icons.sent}
                </div>
                <p>{carpeta === 'bandeja' ? 'No hay correos en la bandeja.' : 'No hay correos enviados.'}</p>
                {carpeta === 'bandeja' && (
                  <button className="correo-btn secondary" onClick={() => handleSync(false)} disabled={syncing} style={{ marginTop: 8 }}>
                    {Icons.refresh} {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Read panel */}
        <div className="correo-read-panel">
          {conversacionActiva && mensajes.length > 0 ? (
            <>
              <div className="correo-read-header">
                <h2>{mensajes[0]?.email_asunto || '(Sin asunto)'}</h2>
                <div className="correo-read-meta">
                  <span>{carpeta === 'bandeja' ? 'De' : 'Para'}: {convActual?.contacto_nombre || 'Desconocido'}</span>
                  <span>{mensajes.length} mensaje{mensajes.length > 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="correo-thread">
                {mensajes.map(msg => (
                  <div key={msg.id} className={`correo-msg ${msg.es_entrante ? 'incoming' : 'outgoing'}`}>
                    <div className="correo-msg-header">
                      <div className="correo-msg-sender">
                        <div className="correo-msg-avatar" style={{ background: msg.es_entrante ? '#dbeafe' : '#dcfce7', color: msg.es_entrante ? '#2563eb' : '#16a34a' }}>
                          {(msg.es_entrante ? (msg.email_de || msg.remitente_nombre || 'D') : 'Yo')[0].toUpperCase()}
                        </div>
                        <div>
                          <span className="correo-msg-from">{msg.es_entrante ? (msg.remitente_nombre || msg.email_de) : 'Yo'}</span>
                          <span className="correo-msg-email">{msg.es_entrante ? msg.email_de : `Para: ${msg.email_para}`}</span>
                        </div>
                      </div>
                      <span className="correo-msg-date">{formatFullDate(msg.created_at)}</span>
                    </div>
                    {msg.email_cc && <div className="correo-msg-cc">CC: {msg.email_cc}</div>}
                    <div className="correo-msg-body" dangerouslySetInnerHTML={{ __html: msg.contenido || msg.contenido_plain || '' }} />
                    {msg.adjuntos?.length > 0 && (
                      <div className="correo-msg-attachments">
                        {msg.adjuntos.map((adj: any, i: number) => (
                          <div key={i} className="correo-attachment">{Icons.attachment}<span>{adj.name || adj.nombre || 'Adjunto'}</span></div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="correo-actions-bar">
                {replyMode ? (
                  <div className="correo-reply-box">
                    <textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder="Escribe tu respuesta..."
                      rows={4}
                      autoFocus
                    />
                    <div className="correo-reply-actions">
                      <button className="correo-btn primary" onClick={handleReply} disabled={sending || !replyBody}>
                        {Icons.send} {sending ? 'Enviando...' : 'Enviar'}
                      </button>
                      <button className="correo-btn secondary" onClick={() => { setReplyMode(false); setReplyBody(''); }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="correo-action-buttons">
                    <button className="correo-btn primary" onClick={() => setReplyMode(true)}>
                      Responder
                    </button>
                    <button className="correo-btn secondary" onClick={() => {
                      const lastMsg = mensajes[mensajes.length - 1];
                      setComposeTo('');
                      setComposeSubject(`Fwd: ${(lastMsg?.email_asunto || '').replace(/^Fwd:\s*/i, '')}`);
                      setComposeBody(lastMsg?.contenido_plain || '');
                      setShowCompose(true);
                    }}>
                      Reenviar
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="correo-empty-state">
              <div className="correo-empty-icon">{Icons.email}</div>
              <h3>Selecciona un correo</h3>
              <p>Elige un correo de la lista para leerlo aquí.</p>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="correo-modal-overlay"
          onMouseDown={e => { mouseDownTargetRef.current = e.target; }}
          onClick={e => { if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) setShowCompose(false); }}
        >
          <div className="correo-modal" onClick={e => e.stopPropagation()}>
            <div className="correo-modal-header">
              <h3>Nuevo correo</h3>
              <button className="correo-btn-icon" onClick={() => setShowCompose(false)}>{Icons.close}</button>
            </div>
            <div className="correo-compose-fields">
              <div className="correo-compose-row"><label>Para:</label><input type="text" value={composeTo} onChange={e => setComposeTo(e.target.value)} placeholder="destinatario@email.com" /></div>
              <div className="correo-compose-row"><label>CC:</label><input type="text" value={composeCc} onChange={e => setComposeCc(e.target.value)} placeholder="(opcional)" /></div>
              <div className="correo-compose-row"><label>Asunto:</label><input type="text" value={composeSubject} onChange={e => setComposeSubject(e.target.value)} placeholder="Asunto del correo" /></div>
              <textarea className="correo-compose-body" value={composeBody} onChange={e => setComposeBody(e.target.value)} placeholder="Escribe tu mensaje..." rows={10} />
            </div>
            <div className="correo-modal-footer">
              <button className="correo-btn primary" onClick={handleSendEmail} disabled={sending || !composeTo || !composeSubject}>
                {Icons.send} {sending ? 'Enviando...' : 'Enviar'}
              </button>
              <button className="correo-btn secondary" onClick={() => setShowCompose(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Setup Modal */}
      {renderSetupModal()}
      <style>{styles}</style>
    </div>
  );

  // ==================== SETUP MODAL (reused) ====================

  function renderSetupModal() {
    if (!showSetup) return null;
    return (
      <div className="correo-modal-overlay"
        onMouseDown={e => { mouseDownTargetRef.current = e.target; }}
        onClick={e => { if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) setShowSetup(false); }}
      >
        <div className="correo-modal" onClick={e => e.stopPropagation()}>
          <div className="correo-modal-header">
            <h3>Configurar cuenta de correo</h3>
            <button className="correo-btn-icon" onClick={() => setShowSetup(false)}>{Icons.close}</button>
          </div>
          <div className="correo-setup-fields">
            <div className="correo-setup-field">
              <label>Correo electrónico:</label>
              <input type="email" value={setupEmail} onChange={e => setSetupEmail(e.target.value)} placeholder="tu@dominio.com" />
            </div>
            <div className="correo-setup-field">
              <label>Nombre visible:</label>
              <input type="text" value={setupDisplayName} onChange={e => setSetupDisplayName(e.target.value)} placeholder="Tu Nombre" />
            </div>
            <div className="correo-setup-field">
              <label>Contraseña:</label>
              <input type="password" value={setupPassword} onChange={e => setSetupPassword(e.target.value)} placeholder="Contraseña del email" />
            </div>
            <div className="correo-setup-hint">
              Los datos de IMAP y SMTP los encuentras en tu panel de MXRoute. Usa el hostname de tu servidor (ej: witcher.mxrouting.net).
            </div>
            <div className="correo-setup-row">
              <div className="correo-setup-field"><label>IMAP Host:</label><input type="text" value={setupImapHost} onChange={e => setSetupImapHost(e.target.value)} placeholder="ej: echo.mxrouting.net" /></div>
              <div className="correo-setup-field"><label>Puerto:</label><input type="text" value={setupImapPort} onChange={e => setSetupImapPort(e.target.value)} /></div>
            </div>
            <div className="correo-setup-row">
              <div className="correo-setup-field"><label>SMTP Host:</label><input type="text" value={setupSmtpHost} onChange={e => setSetupSmtpHost(e.target.value)} placeholder="ej: echo.mxrouting.net" /></div>
              <div className="correo-setup-field"><label>Puerto:</label><input type="text" value={setupSmtpPort} onChange={e => setSetupSmtpPort(e.target.value)} /></div>
            </div>
            {setupError && <div className="correo-alert error">{setupError}</div>}
            {setupSuccess && <div className="correo-alert success">{setupSuccess}</div>}
          </div>
          <div className="correo-modal-footer">
            <button className="correo-btn primary" onClick={handleSaveCredentials} disabled={setupTesting || !setupEmail || !setupPassword || !setupImapHost || !setupSmtpHost}>
              {setupTesting ? 'Verificando conexión...' : 'Guardar y verificar'}
            </button>
            <button className="correo-btn secondary" onClick={() => setShowSetup(false)}>Cancelar</button>
          </div>
        </div>
      </div>
    );
  }
}

// ==================== STYLES ====================

const styles = `
  /* Layout */
  .crm-correo {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 64px);
    background: #f1f5f9;
  }

  /* Toolbar */
  .correo-toolbar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 0 20px;
    height: 48px;
    background: white;
    border-bottom: 1px solid #e2e8f0;
    flex-shrink: 0;
  }
  .correo-tabs {
    display: flex;
    gap: 2px;
    height: 100%;
  }
  .correo-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 16px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: #64748b;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .correo-tab:hover { color: #334155; background: #f8fafc; }
  .correo-tab.active {
    color: #3b82f6;
    border-bottom-color: #3b82f6;
  }
  .correo-tab-badge {
    min-width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 5px;
    background: #ef4444;
    color: white;
    font-size: 0.6875rem;
    font-weight: 600;
    border-radius: 9px;
  }
  .correo-search {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
    padding: 6px 12px;
    background: #f1f5f9;
    border-radius: 6px;
    color: #64748b;
    min-width: 200px;
  }
  .correo-search input {
    flex: 1;
    border: none;
    background: none;
    font-size: 0.8125rem;
    color: #0f172a;
    outline: none;
  }
  .correo-search input::placeholder { color: #94a3b8; }

  /* Two-panel layout */
  .correo-panels {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  /* List panel */
  .correo-list-panel {
    width: 360px;
    min-width: 280px;
    background: white;
    border-right: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
  }
  .correo-list {
    flex: 1;
    overflow-y: auto;
  }
  .correo-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 16px;
    border-bottom: 1px solid #f1f5f9;
    cursor: pointer;
    transition: background 0.15s;
  }
  .correo-item:hover { background: #f8fafc; }
  .correo-item.active { background: #eff6ff; }
  .correo-item.unread { background: #fffbeb; }
  .correo-item.unread .correo-item-from,
  .correo-item.unread .correo-item-subject { font-weight: 600; }
  .correo-item-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #e2e8f0;
    color: #475569;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
    font-weight: 600;
    flex-shrink: 0;
  }
  .correo-item-content { flex: 1; min-width: 0; }
  .correo-item-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2px;
  }
  .correo-item-from { font-size: 0.8125rem; color: #0f172a; }
  .correo-item-time { font-size: 0.6875rem; color: #94a3b8; flex-shrink: 0; }
  .correo-item-subject {
    font-size: 0.8125rem;
    color: #334155;
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .correo-item-preview {
    font-size: 0.75rem;
    color: #94a3b8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .correo-item-badge {
    min-width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 5px;
    background: #3b82f6;
    color: white;
    font-size: 0.6875rem;
    font-weight: 600;
    border-radius: 9px;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .correo-list-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: #94a3b8;
    text-align: center;
  }
  .correo-list-empty p { margin: 8px 0 0; font-size: 0.8125rem; }

  /* Read panel */
  .correo-read-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: #fafbfc;
    overflow: hidden;
  }
  .correo-read-header {
    padding: 20px 24px 16px;
    background: white;
    border-bottom: 1px solid #e2e8f0;
  }
  .correo-read-header h2 {
    margin: 0 0 6px;
    font-size: 1.125rem;
    font-weight: 600;
    color: #0f172a;
    line-height: 1.3;
  }
  .correo-read-meta {
    display: flex;
    gap: 16px;
    font-size: 0.8125rem;
    color: #64748b;
  }
  .correo-thread {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }
  .correo-msg {
    margin: 8px 16px;
    padding: 16px 20px;
    background: white;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
  }
  .correo-msg.outgoing {
    background: #f0fdf4;
    border-color: #bbf7d0;
  }
  .correo-msg-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
  }
  .correo-msg-sender {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  .correo-msg-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8125rem;
    font-weight: 600;
    flex-shrink: 0;
  }
  .correo-msg-from {
    display: block;
    font-size: 0.8125rem;
    font-weight: 600;
    color: #0f172a;
  }
  .correo-msg-email {
    display: block;
    font-size: 0.75rem;
    color: #94a3b8;
  }
  .correo-msg-date { font-size: 0.75rem; color: #94a3b8; white-space: nowrap; }
  .correo-msg-cc { font-size: 0.75rem; color: #94a3b8; margin-bottom: 8px; }
  .correo-msg-body {
    line-height: 1.6;
    color: #334155;
    font-size: 0.875rem;
    word-break: break-word;
  }
  .correo-msg-body p { margin: 0 0 8px; }
  .correo-msg-body img { max-width: 100%; height: auto; border-radius: 4px; }
  .correo-msg-attachments {
    padding-top: 12px;
    margin-top: 12px;
    border-top: 1px solid #f1f5f9;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .correo-attachment {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 5px;
    color: #475569;
    font-size: 0.75rem;
  }

  /* Actions bar */
  .correo-actions-bar {
    padding: 12px 16px;
    background: white;
    border-top: 1px solid #e2e8f0;
  }
  .correo-action-buttons { display: flex; gap: 8px; }
  .correo-reply-box {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .correo-reply-box textarea {
    width: 100%;
    padding: 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 0.875rem;
    font-family: inherit;
    resize: vertical;
    outline: none;
    box-sizing: border-box;
  }
  .correo-reply-box textarea:focus { border-color: #3b82f6; }
  .correo-reply-actions { display: flex; gap: 6px; }

  /* Empty state */
  .correo-empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    color: #64748b;
    text-align: center;
  }
  .correo-empty-icon {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f1f5f9;
    border-radius: 50%;
    color: #94a3b8;
    margin-bottom: 12px;
  }
  .correo-empty-icon svg { width: 32px; height: 32px; }
  .correo-empty-state h3 { margin: 0 0 4px; font-size: 1rem; font-weight: 600; color: #0f172a; }
  .correo-empty-state p { margin: 0; font-size: 0.875rem; }

  /* Buttons */
  .correo-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 8px 16px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    background: white;
    color: #475569;
  }
  .correo-btn:hover { background: #f8fafc; border-color: #cbd5e1; }
  .correo-btn:disabled { opacity: 0.5; cursor: default; }
  .correo-btn.primary {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }
  .correo-btn.primary:hover { background: #2563eb; border-color: #2563eb; }
  .correo-btn.secondary { background: white; color: #475569; }
  .correo-btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    border-radius: 4px;
  }
  .correo-btn-icon:hover { background: #f1f5f9; }

  /* Header action buttons */
  .correo-header-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    color: #475569;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }
  .correo-header-btn:hover { background: #f1f5f9; border-color: #cbd5e1; }
  .correo-header-btn:disabled { opacity: 0.5; cursor: default; }
  .correo-header-btn.primary {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }
  .correo-header-btn.primary:hover { background: #2563eb; }
  .correo-header-btn.danger { color: #ef4444; }
  .correo-header-btn.danger:hover { background: #fef2f2; border-color: #fca5a5; }

  /* Alert */
  .correo-alert {
    padding: 10px 14px;
    border-radius: 6px;
    font-size: 0.8125rem;
    line-height: 1.4;
  }
  .correo-alert.error {
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
  }
  .correo-alert.success {
    background: #f0fdf4;
    color: #16a34a;
    border: 1px solid #bbf7d0;
  }

  /* Modal */
  .correo-modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  .correo-modal {
    background: white;
    border-radius: 10px;
    width: 520px;
    max-width: 95vw;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,0.15);
  }
  .correo-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #e2e8f0;
  }
  .correo-modal-header h3 { margin: 0; font-size: 1rem; font-weight: 600; color: #0f172a; }
  .correo-modal-footer {
    display: flex;
    gap: 8px;
    padding: 16px 20px;
    border-top: 1px solid #e2e8f0;
  }

  /* Compose fields */
  .correo-compose-fields { padding: 16px 20px; display: flex; flex-direction: column; gap: 8px; }
  .correo-compose-row { display: flex; align-items: center; gap: 8px; }
  .correo-compose-row label { width: 50px; font-size: 0.8125rem; color: #64748b; flex-shrink: 0; }
  .correo-compose-row input {
    flex: 1;
    padding: 8px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 5px;
    font-size: 0.8125rem;
    outline: none;
  }
  .correo-compose-row input:focus { border-color: #3b82f6; }
  .correo-compose-body {
    padding: 10px;
    border: 1px solid #e2e8f0;
    border-radius: 5px;
    font-size: 0.875rem;
    font-family: inherit;
    resize: vertical;
    outline: none;
  }
  .correo-compose-body:focus { border-color: #3b82f6; }

  /* Setup fields */
  .correo-setup-fields { padding: 16px 20px; display: flex; flex-direction: column; gap: 10px; }
  .correo-setup-field { display: flex; flex-direction: column; gap: 4px; }
  .correo-setup-field label { font-size: 0.8125rem; color: #475569; font-weight: 500; }
  .correo-setup-field input {
    padding: 8px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 5px;
    font-size: 0.8125rem;
    outline: none;
  }
  .correo-setup-field input:focus { border-color: #3b82f6; }
  .correo-setup-row { display: flex; gap: 10px; }
  .correo-setup-row .correo-setup-field { flex: 1; }
  .correo-setup-hint {
    color: #64748b;
    font-size: 0.75rem;
    margin: 0;
    padding: 8px 10px;
    background: #f8fafc;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    line-height: 1.4;
  }

  /* Responsive */
  @media (max-width: 900px) {
    .correo-panels { flex-direction: column; }
    .correo-list-panel { width: 100%; max-height: 50vh; }
    .correo-read-panel { min-height: 50vh; }
    .correo-search { min-width: 140px; }
    .correo-toolbar { padding: 0 12px; gap: 8px; }
  }
`;
