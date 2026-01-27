/**
 * CrmMensajeriaCorreo - Bandeja de correo electrónico
 *
 * Bandeja de email por usuario via MXRoute (IMAP lectura + SMTP envío).
 * Conecta al backend: mensajeria-email routes (Phase 2).
 */

import { useState, useEffect, useCallback } from 'react';
import { usePageHeader } from '../../layouts/CrmLayout';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../services/api';

// ==================== TYPES ====================

interface EmailConversacion {
  id: string;
  contacto_nombre: string | null;
  ultimo_mensaje_texto: string | null;
  ultimo_mensaje_at: string | null;
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
    </svg>
  ),
  sent: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  attachment: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
};

export default function CrmMensajeriaCorreo() {
  const { setPageHeader } = usePageHeader();
  const { user, tenantActual } = useAuth();

  // State
  const [credentials, setCredentials] = useState<EmailCredentialsInfo | null>(null);
  const [credentialsLoading, setCredentialsLoading] = useState(true);
  const [conversaciones, setConversaciones] = useState<EmailConversacion[]>([]);
  const [mensajes, setMensajes] = useState<EmailMensaje[]>([]);
  const [conversacionActiva, setConversacionActiva] = useState<string | null>(null);
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
  const [setupImapHost, setSetupImapHost] = useState('mail.mxroute.com');
  const [setupImapPort, setSetupImapPort] = useState('993');
  const [setupSmtpHost, setSetupSmtpHost] = useState('mail.mxroute.com');
  const [setupSmtpPort, setSetupSmtpPort] = useState('465');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupTesting, setSetupTesting] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [setupSuccess, setSetupSuccess] = useState('');

  const tenantId = tenantActual?.id;
  const userId = user?.id;

  useEffect(() => {
    setPageHeader({ title: 'Correo', subtitle: 'Bandeja de correo electrónico' });
  }, [setPageHeader]);

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
      const params = new URLSearchParams({ usuario_id: userId });
      if (busqueda) params.set('busqueda', busqueda);
      const res = await apiFetch(`/tenants/${tenantId}/mensajeria-email/inbox?${params}`);
      const data = await res.json();
      setConversaciones(data.data || []);
    } catch {
      setConversaciones([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, userId, credentials?.is_connected, busqueda]);

  useEffect(() => { fetchConversaciones(); }, [fetchConversaciones]);

  // Poll every 30s
  useEffect(() => {
    if (!credentials?.is_connected) return;
    const interval = setInterval(fetchConversaciones, 30000);
    return () => clearInterval(interval);
  }, [credentials?.is_connected, fetchConversaciones]);

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

  // ==================== ACTIONS ====================

  const handleSync = async () => {
    if (!tenantId || !userId) return;
    setSyncing(true);
    try {
      await apiFetch(`/tenants/${tenantId}/mensajeria-email/sync`, { method: 'POST', body: JSON.stringify({ usuario_id: userId }) });
      await fetchConversaciones();
    } catch {}
    setSyncing(false);
  };

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
      const testResponse = await apiFetch(`/tenants/${tenantId}/mensajeria-email/test-connection`, { method: 'POST', body: JSON.stringify({ usuario_id: userId }) });
      const testRes = await testResponse.json();
      if (testRes.is_connected) {
        setSetupSuccess('Conexión exitosa. Sincronizando...');
        await apiFetch(`/tenants/${tenantId}/mensajeria-email/sync`, { method: 'POST', body: JSON.stringify({ usuario_id: userId }) });
        await fetchCredentials();
        await fetchConversaciones();
        setShowSetup(false);
      } else {
        setSetupError(`IMAP: ${testRes.imap?.error || 'OK'} | SMTP: ${testRes.smtp?.error || 'OK'}`);
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
        body: JSON.stringify({ usuario_id: userId, to: composeTo, cc: composeCc || undefined, subject: composeSubject, html: `<p>${composeBody.replace(/\n/g, '<br/>')}</p>`, text: composeBody }),
      });
      setShowCompose(false); setComposeTo(''); setComposeSubject(''); setComposeBody(''); setComposeCc('');
      await fetchConversaciones();
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
        body: JSON.stringify({ usuario_id: userId, conversacion_id: conversacionActiva, to: lastIncoming?.email_de || conv?.contacto_nombre || '', subject: lastIncoming?.email_asunto || '', html: `<p>${replyBody.replace(/\n/g, '<br/>')}</p>`, text: replyBody }),
      });
      setReplyMode(false); setReplyBody('');
      await fetchMensajes(conversacionActiva);
      await fetchConversaciones();
    } catch {}
    setSending(false);
  };

  // ==================== HELPERS ====================

  const formatTimeAgo = (dateStr: string | null) => {
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
  };

  const totalNoLeidos = conversaciones.reduce((sum, c) => sum + (c.no_leidos || 0), 0);

  // ==================== RENDER: LOADING ====================

  if (credentialsLoading) {
    return <div className="crm-correo"><div className="conv-empty"><p>Cargando...</p></div><style>{styles}</style></div>;
  }

  // ==================== RENDER: SETUP REQUIRED ====================

  if (!credentials || !credentials.is_connected) {
    return (
      <div className="crm-correo">
        <div className="conv-empty">
          <div className="empty-icon">{Icons.email}</div>
          <h3>Configura tu correo</h3>
          <p>Conecta tu cuenta de email para recibir y enviar correos desde el CRM.</p>
          <button className="btn-primary" onClick={() => setShowSetup(true)} style={{ marginTop: 16 }}>{Icons.settings} Configurar cuenta</button>
          {credentials?.last_error && <p style={{ color: '#ef4444', fontSize: '0.8125rem', marginTop: 8 }}>Error: {credentials.last_error}</p>}
        </div>
        {showSetup && (
          <div className="modal-overlay" onClick={() => setShowSetup(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header"><h3>Configurar cuenta de correo</h3><button className="btn-icon" onClick={() => setShowSetup(false)}>{Icons.close}</button></div>
              <div className="setup-fields">
                <div className="setup-field"><label>Correo electrónico:</label><input type="email" value={setupEmail} onChange={e => setSetupEmail(e.target.value)} placeholder="tu@dominio.com" /></div>
                <div className="setup-field"><label>Nombre visible:</label><input type="text" value={setupDisplayName} onChange={e => setSetupDisplayName(e.target.value)} placeholder="Tu Nombre" /></div>
                <div className="setup-field"><label>Contraseña:</label><input type="password" value={setupPassword} onChange={e => setSetupPassword(e.target.value)} placeholder="Contraseña del email" /></div>
                <div className="setup-row">
                  <div className="setup-field"><label>IMAP Host:</label><input type="text" value={setupImapHost} onChange={e => setSetupImapHost(e.target.value)} /></div>
                  <div className="setup-field"><label>Puerto:</label><input type="text" value={setupImapPort} onChange={e => setSetupImapPort(e.target.value)} /></div>
                </div>
                <div className="setup-row">
                  <div className="setup-field"><label>SMTP Host:</label><input type="text" value={setupSmtpHost} onChange={e => setSetupSmtpHost(e.target.value)} /></div>
                  <div className="setup-field"><label>Puerto:</label><input type="text" value={setupSmtpPort} onChange={e => setSetupSmtpPort(e.target.value)} /></div>
                </div>
                {setupError && <p className="setup-error">{setupError}</p>}
                {setupSuccess && <p className="setup-success">{setupSuccess}</p>}
              </div>
              <div className="modal-actions">
                <button className="btn-primary" onClick={handleSaveCredentials} disabled={setupTesting || !setupEmail || !setupPassword}>{setupTesting ? 'Verificando...' : 'Guardar y verificar'}</button>
                <button className="btn-secondary" onClick={() => setShowSetup(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        )}
        <style>{styles}</style>
      </div>
    );
  }

  // ==================== RENDER: MAIN INBOX ====================

  return (
    <div className="crm-correo">
      <div className="msg-email-container">
        {/* Sidebar */}
        <div className="email-sidebar">
          <button className="btn-compose" onClick={() => setShowCompose(true)}>{Icons.plus} Redactar</button>
          <div className="email-folders">
            <button className="folder-btn active">{Icons.inbox}<span>Bandeja</span>{totalNoLeidos > 0 && <span className="folder-badge">{totalNoLeidos}</span>}</button>
            <button className="folder-btn">{Icons.sent}<span>Enviados</span></button>
          </div>
          <div className="email-sidebar-actions">
            <button className="folder-btn" onClick={handleSync} disabled={syncing}>{Icons.refresh}<span>{syncing ? 'Sync...' : 'Sincronizar'}</span></button>
            <button className="folder-btn" onClick={() => setShowSetup(true)}>{Icons.settings}<span>Config</span></button>
            <button className="folder-btn" onClick={handleDisconnect}><span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{credentials.email_address}</span></button>
          </div>
        </div>

        {/* List */}
        <div className="email-list-panel">
          <div className="email-list-header">
            <div className="msg-search">{Icons.search}<input type="text" placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} /></div>
          </div>
          <div className="email-list">
            {loading && conversaciones.length === 0 && <div className="msg-empty"><p>Cargando...</p></div>}
            {conversaciones.map(conv => (
              <div key={conv.id} className={`email-item ${conversacionActiva === conv.id ? 'active' : ''} ${conv.no_leidos > 0 ? 'unread' : ''}`} onClick={() => { setConversacionActiva(conv.id); setReplyMode(false); }}>
                <div className="email-item-content">
                  <div className="email-item-header">
                    <span className="email-from">{conv.contacto_nombre || 'Desconocido'}</span>
                    <span className="email-time">{formatTimeAgo(conv.ultimo_mensaje_at)}</span>
                  </div>
                  <div className="email-subject">{conv.metadata?.email_subject || conv.ultimo_mensaje_texto || '(Sin asunto)'}</div>
                  <div className="email-preview">{conv.ultimo_mensaje_texto || ''}</div>
                </div>
                {conv.no_leidos > 0 && <span className="unread-badge">{conv.no_leidos}</span>}
              </div>
            ))}
            {!loading && conversaciones.length === 0 && <div className="msg-empty"><p>No hay correos. Pulsa Sincronizar.</p></div>}
          </div>
        </div>

        {/* Read panel */}
        <div className="email-read-panel">
          {conversacionActiva && mensajes.length > 0 ? (
            <>
              <div className="email-header"><h2>{mensajes[0]?.email_asunto || '(Sin asunto)'}</h2></div>
              <div className="email-thread">
                {mensajes.map(msg => (
                  <div key={msg.id} className={`email-msg ${msg.es_entrante ? 'incoming' : 'outgoing'}`}>
                    <div className="email-msg-header">
                      <span className="email-from-full">{msg.es_entrante ? `De: ${msg.email_de || msg.remitente_nombre}` : `Enviado a: ${msg.email_para}`}</span>
                      <span className="email-date">{new Date(msg.created_at).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {msg.email_cc && <div className="email-cc">CC: {msg.email_cc}</div>}
                    <div className="email-body" dangerouslySetInnerHTML={{ __html: msg.contenido || msg.contenido_plain || '' }} />
                    {msg.adjuntos?.length > 0 && (
                      <div className="email-attachments">{msg.adjuntos.map((adj: any, i: number) => <div key={i} className="attachment-item">{Icons.attachment}<span>{adj.name || adj.nombre}</span></div>)}</div>
                    )}
                  </div>
                ))}
              </div>
              <div className="email-actions">
                {replyMode ? (
                  <div className="reply-compose">
                    <textarea value={replyBody} onChange={(e) => setReplyBody(e.target.value)} placeholder="Escribe tu respuesta..." rows={4} />
                    <div className="reply-actions">
                      <button className="btn-primary" onClick={handleReply} disabled={sending || !replyBody}>{Icons.send} {sending ? 'Enviando...' : 'Enviar'}</button>
                      <button className="btn-secondary" onClick={() => { setReplyMode(false); setReplyBody(''); }}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button className="btn-secondary" onClick={() => setReplyMode(true)}>Responder</button>
                    <button className="btn-secondary" onClick={() => {
                      const lastMsg = mensajes[mensajes.length - 1];
                      setComposeTo(''); setComposeSubject(`Fwd: ${(lastMsg?.email_asunto || '').replace(/^Fwd:\s*/i, '')}`);
                      setComposeBody(lastMsg?.contenido_plain || ''); setShowCompose(true);
                    }}>Reenviar</button>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="conv-empty"><div className="empty-icon">{Icons.email}</div><h3>Selecciona un correo</h3><p>Elige un correo de la lista</p></div>
          )}
        </div>
      </div>

      {/* Compose Modal - inlined to avoid remount on state change */}
      {showCompose && (
        <div className="modal-overlay" onClick={() => setShowCompose(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Nuevo correo</h3><button className="btn-icon" onClick={() => setShowCompose(false)}>{Icons.close}</button></div>
            <div className="compose-fields">
              <div className="compose-field"><label>Para:</label><input type="text" value={composeTo} onChange={e => setComposeTo(e.target.value)} placeholder="destinatario@email.com" /></div>
              <div className="compose-field"><label>CC:</label><input type="text" value={composeCc} onChange={e => setComposeCc(e.target.value)} placeholder="(opcional)" /></div>
              <div className="compose-field"><label>Asunto:</label><input type="text" value={composeSubject} onChange={e => setComposeSubject(e.target.value)} placeholder="Asunto del correo" /></div>
              <textarea className="compose-body" value={composeBody} onChange={e => setComposeBody(e.target.value)} placeholder="Escribe tu mensaje..." rows={10} />
            </div>
            <div className="modal-actions">
              <button className="btn-primary" onClick={handleSendEmail} disabled={sending || !composeTo || !composeSubject}>{Icons.send} {sending ? 'Enviando...' : 'Enviar'}</button>
              <button className="btn-secondary" onClick={() => setShowCompose(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Setup Modal - inlined to avoid remount on state change */}
      {showSetup && (
        <div className="modal-overlay" onClick={() => setShowSetup(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Configurar cuenta de correo</h3><button className="btn-icon" onClick={() => setShowSetup(false)}>{Icons.close}</button></div>
            <div className="setup-fields">
              <div className="setup-field"><label>Correo electrónico:</label><input type="email" value={setupEmail} onChange={e => setSetupEmail(e.target.value)} placeholder="tu@dominio.com" /></div>
              <div className="setup-field"><label>Nombre visible:</label><input type="text" value={setupDisplayName} onChange={e => setSetupDisplayName(e.target.value)} placeholder="Tu Nombre" /></div>
              <div className="setup-field"><label>Contraseña:</label><input type="password" value={setupPassword} onChange={e => setSetupPassword(e.target.value)} placeholder="Contraseña del email" /></div>
              <div className="setup-row">
                <div className="setup-field"><label>IMAP Host:</label><input type="text" value={setupImapHost} onChange={e => setSetupImapHost(e.target.value)} /></div>
                <div className="setup-field"><label>Puerto:</label><input type="text" value={setupImapPort} onChange={e => setSetupImapPort(e.target.value)} /></div>
              </div>
              <div className="setup-row">
                <div className="setup-field"><label>SMTP Host:</label><input type="text" value={setupSmtpHost} onChange={e => setSetupSmtpHost(e.target.value)} /></div>
                <div className="setup-field"><label>Puerto:</label><input type="text" value={setupSmtpPort} onChange={e => setSetupSmtpPort(e.target.value)} /></div>
              </div>
              {setupError && <p className="setup-error">{setupError}</p>}
              {setupSuccess && <p className="setup-success">{setupSuccess}</p>}
            </div>
            <div className="modal-actions">
              <button className="btn-primary" onClick={handleSaveCredentials} disabled={setupTesting || !setupEmail || !setupPassword}>{setupTesting ? 'Verificando...' : 'Guardar y verificar'}</button>
              <button className="btn-secondary" onClick={() => setShowSetup(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
      <style>{styles}</style>
    </div>
  );
}

// ==================== STYLES ====================

const styles = `
  .crm-correo { display: flex; flex-direction: column; height: calc(100vh - 140px); background: #f8fafc; }
  .msg-email-container { display: flex; height: 100%; }
  .email-sidebar { width: 180px; background: white; border-right: 1px solid #e2e8f0; padding: 12px; display: flex; flex-direction: column; }
  .btn-compose { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; padding: 10px 14px; background: #3b82f6; color: white; border: none; border-radius: 6px; font-size: 0.8125rem; font-weight: 500; cursor: pointer; margin-bottom: 16px; transition: background 0.15s; }
  .btn-compose:hover { background: #2563eb; }
  .email-folders { display: flex; flex-direction: column; gap: 2px; }
  .email-sidebar-actions { margin-top: auto; display: flex; flex-direction: column; gap: 2px; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  .folder-btn { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 10px; background: none; border: none; border-radius: 5px; color: #475569; font-size: 0.8125rem; cursor: pointer; transition: all 0.15s; text-align: left; }
  .folder-btn:hover { background: #f1f5f9; }
  .folder-btn.active { background: #eff6ff; color: #3b82f6; }
  .folder-btn:disabled { opacity: 0.5; cursor: default; }
  .folder-badge { margin-left: auto; min-width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; padding: 0 5px; background: #ef4444; color: white; font-size: 0.6875rem; font-weight: 600; border-radius: 9px; }

  .email-list-panel { width: 300px; background: white; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; }
  .email-list-header { padding: 12px; border-bottom: 1px solid #e2e8f0; }
  .msg-search { display: flex; align-items: center; gap: 6px; padding: 8px 10px; background: #f1f5f9; border-radius: 6px; color: #64748b; }
  .msg-search input { flex: 1; border: none; background: none; font-size: 0.8125rem; color: #0f172a; outline: none; }
  .msg-search input::placeholder { color: #94a3b8; }
  .email-list { flex: 1; overflow-y: auto; }
  .email-item { display: flex; align-items: flex-start; gap: 6px; padding: 12px; border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background 0.15s; }
  .email-item:hover { background: #f8fafc; }
  .email-item.active { background: #eff6ff; }
  .email-item.unread { background: #fefce8; }
  .email-item.unread .email-from, .email-item.unread .email-subject { font-weight: 600; }
  .email-item-content { flex: 1; min-width: 0; }
  .email-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
  .email-from { font-size: 0.8125rem; color: #0f172a; }
  .email-time { font-size: 0.6875rem; color: #94a3b8; flex-shrink: 0; }
  .email-subject { font-size: 0.8125rem; color: #0f172a; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .email-preview { font-size: 0.75rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .unread-badge { min-width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; padding: 0 5px; background: #3b82f6; color: white; font-size: 0.6875rem; font-weight: 600; border-radius: 9px; flex-shrink: 0; }

  .email-read-panel { flex: 1; display: flex; flex-direction: column; background: white; overflow-y: auto; }
  .email-header { padding: 20px; border-bottom: 1px solid #e2e8f0; }
  .email-header h2 { margin: 0; font-size: 1.125rem; font-weight: 600; color: #0f172a; }
  .email-thread { flex: 1; overflow-y: auto; }
  .email-msg { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; }
  .email-msg.outgoing { background: #f0fdf4; }
  .email-msg-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .email-from-full { font-size: 0.8125rem; color: #475569; font-weight: 500; }
  .email-date { font-size: 0.75rem; color: #94a3b8; }
  .email-cc { font-size: 0.75rem; color: #94a3b8; margin-bottom: 8px; }
  .email-body { line-height: 1.6; color: #334155; font-size: 0.875rem; }
  .email-body p { margin: 0 0 8px 0; }
  .email-attachments { padding-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
  .attachment-item { display: flex; align-items: center; gap: 6px; padding: 6px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 5px; color: #475569; font-size: 0.75rem; }
  .email-actions { display: flex; gap: 6px; padding: 14px 20px; border-top: 1px solid #e2e8f0; flex-wrap: wrap; }

  .reply-compose { width: 100%; display: flex; flex-direction: column; gap: 8px; }
  .reply-compose textarea { width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.875rem; font-family: inherit; resize: vertical; outline: none; box-sizing: border-box; }
  .reply-compose textarea:focus { border-color: #3b82f6; }
  .reply-actions { display: flex; gap: 6px; }

  .btn-primary { display: flex; align-items: center; gap: 5px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 5px; font-size: 0.8125rem; font-weight: 500; cursor: pointer; transition: background 0.15s; }
  .btn-primary:hover { background: #2563eb; }
  .btn-primary:disabled { opacity: 0.5; cursor: default; }
  .btn-secondary { display: flex; align-items: center; gap: 5px; padding: 8px 14px; background: white; border: 1px solid #e2e8f0; border-radius: 5px; color: #475569; font-size: 0.8125rem; font-weight: 500; cursor: pointer; transition: all 0.15s; }
  .btn-secondary:hover { background: #f8fafc; border-color: #cbd5e1; }
  .btn-icon { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: none; border: none; color: #64748b; cursor: pointer; border-radius: 4px; }
  .btn-icon:hover { background: #f1f5f9; }

  .conv-empty, .msg-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; color: #64748b; }
  .empty-icon { width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; background: #f1f5f9; border-radius: 50%; color: #94a3b8; margin-bottom: 12px; }
  .empty-icon svg { width: 32px; height: 32px; }
  .conv-empty h3 { margin: 0 0 4px 0; font-size: 1rem; font-weight: 600; color: #0f172a; }
  .conv-empty p { margin: 0; font-size: 0.875rem; }

  .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
  .modal-content { background: white; border-radius: 10px; width: 500px; max-width: 95vw; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
  .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e2e8f0; }
  .modal-header h3 { margin: 0; font-size: 1rem; font-weight: 600; color: #0f172a; }
  .modal-actions { display: flex; gap: 8px; padding: 16px 20px; border-top: 1px solid #e2e8f0; }

  .compose-fields { padding: 16px 20px; display: flex; flex-direction: column; gap: 8px; }
  .compose-field { display: flex; align-items: center; gap: 8px; }
  .compose-field label { width: 50px; font-size: 0.8125rem; color: #64748b; flex-shrink: 0; }
  .compose-field input { flex: 1; padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 5px; font-size: 0.8125rem; outline: none; }
  .compose-field input:focus { border-color: #3b82f6; }
  .compose-body { padding: 10px; border: 1px solid #e2e8f0; border-radius: 5px; font-size: 0.875rem; font-family: inherit; resize: vertical; outline: none; }
  .compose-body:focus { border-color: #3b82f6; }

  .setup-fields { padding: 16px 20px; display: flex; flex-direction: column; gap: 10px; }
  .setup-field { display: flex; flex-direction: column; gap: 4px; }
  .setup-field label { font-size: 0.8125rem; color: #475569; font-weight: 500; }
  .setup-field input { padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 5px; font-size: 0.8125rem; outline: none; }
  .setup-field input:focus { border-color: #3b82f6; }
  .setup-row { display: flex; gap: 10px; }
  .setup-row .setup-field { flex: 1; }
  .setup-error { color: #ef4444; font-size: 0.8125rem; margin: 0; }
  .setup-success { color: #10b981; font-size: 0.8125rem; margin: 0; }

  @media (max-width: 900px) {
    .msg-email-container { flex-direction: column; }
    .email-list-panel, .email-sidebar { width: 100%; max-height: 50vh; }
    .email-read-panel { min-height: 50vh; }
  }
`;
