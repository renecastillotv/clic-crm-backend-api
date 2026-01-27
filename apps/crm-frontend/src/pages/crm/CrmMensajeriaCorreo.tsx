/**
 * CrmMensajeriaCorreo - Bandeja de correo electrónico (v2)
 *
 * Bandeja de email profesional con:
 * - Folder sidebar (Bandeja, Enviados, Spam, Eliminados)
 * - Full-page composer with contact autocomplete + property picker + signatures
 * - Attachment viewing and downloading
 * - Delete, archive, spam actions
 * - Visual overhaul with modern design
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

interface ContactSuggestion {
  id: string;
  nombre: string;
  apellido: string | null;
  email: string | null;
  foto_url: string | null;
}

interface PropertyItem {
  id: string;
  titulo: string;
  codigo?: string;
  tipo: string;
  operacion: string;
  precio?: number;
  moneda: string;
  ciudad?: string;
  imagen_principal?: string;
  habitaciones?: number;
  banos?: number;
  m2_construccion?: number;
}

interface Firma {
  id: string;
  nombre: string;
  contenido_html: string;
  es_default: boolean;
}

type Carpeta = 'bandeja' | 'enviados' | 'spam' | 'eliminados';
type ViewMode = 'inbox' | 'compose';
type ComposeMode = 'new' | 'reply' | 'forward';

// ==================== ICONS ====================

const Icons = {
  inbox: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
  sent: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  trash: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  spam: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
  plus: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14m-7-7h14"/></svg>,
  attachment: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>,
  refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  settings: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  close: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  sendIcon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  disconnect: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>,
  reply: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>,
  forward: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/></svg>,
  archive: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
  download: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  user: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  home: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  signature: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  email: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>,
  restore: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>,
  filePdf: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  arrowLeft: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
};

// ==================== HELPERS ====================

function translateEmailError(error: string): string {
  const lower = error.toLowerCase();
  if (lower.includes('invalid login') || lower.includes('535') || lower.includes('incorrect authentication') || lower.includes('authentication failed')) return 'Contrasena incorrecta. Verifica tu correo y contrasena.';
  if (lower.includes('enotfound') || lower.includes('getaddrinfo')) return 'Servidor no encontrado. Verifica el hostname (ej: witcher.mxrouting.net).';
  if (lower.includes('econnrefused')) return 'Conexion rechazada. Verifica el host y puerto.';
  if (lower.includes('etimeout') || lower.includes('timeout') || lower.includes('ebusy')) return 'Tiempo de espera agotado. Verifica el host y puerto.';
  if (lower.includes('certificate') || lower.includes('ssl') || lower.includes('tls')) return 'Error de certificado SSL/TLS. Verifica la configuracion de seguridad.';
  if (lower.includes('command failed')) return 'Error del servidor de correo. Verifica tus credenciales.';
  return error;
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  if (date.getFullYear() === now.getFullYear()) return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name[0].toUpperCase();
}

function getAvatarColor(name: string | null): string {
  if (!name) return '#94a3b8';
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#ef4444', '#14b8a6', '#f97316', '#06b6d4'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function buildPropertyHtml(prop: PropertyItem): string {
  const details = [prop.ciudad, prop.habitaciones ? `${prop.habitaciones} hab` : '', prop.banos ? `${prop.banos} ban` : '', prop.m2_construccion ? `${prop.m2_construccion} m2` : ''].filter(Boolean).join(' | ');
  const price = prop.precio ? `${prop.moneda || '$'} ${prop.precio.toLocaleString()}` : '';
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;font-family:sans-serif;"><tr>${prop.imagen_principal ? `<td style="padding:0;"><img src="${prop.imagen_principal}" alt="" style="width:100%;max-height:180px;object-fit:cover;display:block;"/></td>` : ''}</tr><tr><td style="padding:16px;"><div style="font-size:16px;font-weight:600;color:#0f172a;margin:0 0 4px;">${prop.titulo}</div><div style="font-size:13px;color:#64748b;margin:0 0 6px;">${details}</div>${price ? `<div style="font-size:18px;font-weight:700;color:#2563eb;">${price}</div>` : ''}</td></tr></table>`;
}

// ==================== COMPONENT ====================

export default function CrmMensajeriaCorreo() {
  const { setPageHeader } = usePageHeader();
  const { user, tenantActual } = useAuth();

  // Core state
  const [credentials, setCredentials] = useState<EmailCredentialsInfo | null>(null);
  const [credentialsLoading, setCredentialsLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('inbox');
  const [carpeta, setCarpeta] = useState<Carpeta>('bandeja');

  // Inbox state
  const [conversaciones, setConversaciones] = useState<EmailConversacion[]>([]);
  const [mensajes, setMensajes] = useState<EmailMensaje[]>([]);
  const [conversacionActiva, setConversacionActiva] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Compose state
  const [composeMode, setComposeMode] = useState<ComposeMode>('new');
  const [composeTo, setComposeTo] = useState('');
  const [composeCc, setComposeCc] = useState('');
  const [composeBcc, setComposeBcc] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [composeReplyConvId, setComposeReplyConvId] = useState<string | null>(null);
  const [composeFiles, setComposeFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);

  // Contact suggestions
  const [contactSuggestions, setContactSuggestions] = useState<ContactSuggestion[]>([]);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const contactDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Property picker
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);
  const [propertyResults, setPropertyResults] = useState<PropertyItem[]>([]);
  const [propertyQuery, setPropertyQuery] = useState('');
  const [selectedProperties, setSelectedProperties] = useState<PropertyItem[]>([]);

  // Signature
  const [firma, setFirma] = useState<Firma | null>(null);
  const [showFirma, setShowFirma] = useState(true);

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

  // Refs
  const tenantId = tenantActual?.id;
  const userId = user?.id;
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);

  // ==================== DATA FETCHING ====================

  const fetchCredentials = useCallback(async () => {
    if (!tenantId || !userId) return;
    setCredentialsLoading(true);
    try {
      const res = await apiFetch(`/tenants/${tenantId}/mensajeria-email/credentials?usuario_id=${userId}`);
      setCredentials(await res.json());
    } catch { setCredentials(null); }
    finally { setCredentialsLoading(false); }
  }, [tenantId, userId]);

  const fetchConversaciones = useCallback(async () => {
    if (!tenantId || !userId || !credentials?.is_connected) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ usuario_id: userId, carpeta });
      if (busqueda) params.set('busqueda', busqueda);
      const res = await apiFetch(`/tenants/${tenantId}/mensajeria-email/inbox?${params}`);
      setConversaciones((await res.json()).data || []);
    } catch { setConversaciones([]); }
    finally { setLoading(false); }
  }, [tenantId, userId, credentials?.is_connected, busqueda, carpeta]);

  const fetchMensajes = useCallback(async (convId: string) => {
    if (!tenantId) return;
    try {
      const res = await apiFetch(`/tenants/${tenantId}/mensajeria-email/conversacion/${convId}/mensajes`);
      setMensajes((await res.json()).data || []);
      await apiFetch(`/tenants/${tenantId}/mensajeria-email/conversacion/${convId}/read`, { method: 'PUT' });
      setConversaciones(prev => prev.map(c => c.id === convId ? { ...c, no_leidos: 0 } : c));
    } catch { setMensajes([]); }
  }, [tenantId]);

  const fetchFirma = useCallback(async () => {
    if (!tenantId || !userId) return;
    try {
      const res = await apiFetch(`/tenants/${tenantId}/mensajeria/firmas?usuario_id=${userId}`);
      const firmas: Firma[] = await res.json();
      const defaultFirma = firmas.find(f => f.es_default) || firmas[0] || null;
      setFirma(defaultFirma);
    } catch { /* no firma */ }
  }, [tenantId, userId]);

  const searchContacts = useCallback(async (query: string) => {
    if (!tenantId || query.length < 2) { setContactSuggestions([]); return; }
    try {
      const res = await apiFetch(`/tenants/${tenantId}/contactos?busqueda=${encodeURIComponent(query)}&limit=8`);
      const data = await res.json();
      setContactSuggestions((data.data || []).filter((c: any) => c.email));
    } catch { setContactSuggestions([]); }
  }, [tenantId]);

  const searchProperties = useCallback(async (query: string) => {
    if (!tenantId) return;
    try {
      const res = await apiFetch(`/tenants/${tenantId}/propiedades?busqueda=${encodeURIComponent(query)}&limit=8`);
      const data = await res.json();
      setPropertyResults(data.data || []);
    } catch { setPropertyResults([]); }
  }, [tenantId]);

  // ==================== EFFECTS ====================

  useEffect(() => { fetchCredentials(); }, [fetchCredentials]);
  useEffect(() => { fetchConversaciones(); }, [fetchConversaciones]);
  useEffect(() => { fetchFirma(); }, [fetchFirma]);
  useEffect(() => { if (conversacionActiva) fetchMensajes(conversacionActiva); }, [conversacionActiva, fetchMensajes]);

  // Auto-sync
  useEffect(() => {
    if (!credentials?.is_connected) return;
    handleSync(true);
    syncIntervalRef.current = setInterval(() => handleSync(true), 60000);
    pollIntervalRef.current = setInterval(fetchConversaciones, 15000);
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [credentials?.is_connected]); // eslint-disable-line

  // Header
  useEffect(() => {
    if (view === 'compose') {
      const modeLabel = composeMode === 'reply' ? 'Responder' : composeMode === 'forward' ? 'Reenviar' : 'Nuevo correo';
      setPageHeader({
        title: modeLabel,
        backButton: { label: 'Volver', onClick: () => setView('inbox') },
      });
      return;
    }
    if (!credentials?.is_connected) {
      setPageHeader({ title: 'Correo', subtitle: 'Configura tu cuenta de email' });
      return;
    }
    setPageHeader({
      title: 'Correo',
      subtitle: credentials.email_address,
      actions: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="ce-header-btn primary" onClick={openNewCompose}>{Icons.plus} <span>Redactar</span></button>
          <button className="ce-header-btn" onClick={() => handleSync(false)} disabled={syncing}>{Icons.refresh} <span>{syncing ? 'Sincronizando...' : 'Sincronizar'}</span></button>
          <button className="ce-header-btn" onClick={() => setShowSetup(true)} title="Configuracion">{Icons.settings}</button>
          <button className="ce-header-btn danger" onClick={handleDisconnect} title="Desconectar">{Icons.disconnect}</button>
        </div>
      ),
    });
  }, [view, composeMode, credentials, syncing]); // eslint-disable-line

  // ==================== ACTIONS ====================

  const handleSync = useCallback(async (silent = false) => {
    if (!tenantId || !userId) return;
    if (!silent) setSyncing(true);
    try {
      await apiFetch(`/tenants/${tenantId}/mensajeria-email/sync`, { method: 'POST', body: JSON.stringify({ usuario_id: userId }) });
      await fetchConversaciones();
    } catch {}
    if (!silent) setSyncing(false);
  }, [tenantId, userId, fetchConversaciones]);

  const handleSaveCredentials = async () => {
    if (!tenantId || !userId || !setupEmail) return;
    setSetupTesting(true); setSetupError(''); setSetupSuccess('');
    try {
      await apiFetch(`/tenants/${tenantId}/mensajeria-email/credentials`, {
        method: 'POST',
        body: JSON.stringify({
          usuario_id: userId, email_address: setupEmail, display_name: setupDisplayName || undefined,
          imap_host: setupImapHost, imap_port: parseInt(setupImapPort), imap_username: setupEmail, imap_password: setupPassword || undefined,
          smtp_host: setupSmtpHost, smtp_port: parseInt(setupSmtpPort), smtp_username: setupEmail, smtp_password: setupPassword || undefined,
        }),
      });
      const testRes = await (await apiFetch(`/tenants/${tenantId}/mensajeria-email/test-connection`, { method: 'POST', body: JSON.stringify({ usuario_id: userId }) })).json();
      if (testRes.is_connected) {
        setSetupSuccess('Conexion exitosa. Sincronizando correos...');
        await apiFetch(`/tenants/${tenantId}/mensajeria-email/sync`, { method: 'POST', body: JSON.stringify({ usuario_id: userId }) });
        await fetchCredentials(); await fetchConversaciones();
        setShowSetup(false);
      } else {
        const parts: string[] = [];
        if (testRes.imap?.error) parts.push(`IMAP: ${translateEmailError(testRes.imap.error)}`);
        if (testRes.smtp?.error) parts.push(`SMTP: ${translateEmailError(testRes.smtp.error)}`);
        setSetupError(parts.join(' — ') || 'No se pudo conectar. Verifica tus datos.');
      }
    } catch (err: any) { setSetupError(err.message || 'Error al guardar'); }
    finally { setSetupTesting(false); }
  };

  const handleDisconnect = async () => {
    if (!tenantId || !userId || !confirm('Desconectar cuenta de correo?')) return;
    await apiFetch(`/tenants/${tenantId}/mensajeria-email/credentials?usuario_id=${userId}`, { method: 'DELETE' });
    setCredentials(null); setConversaciones([]); setMensajes([]);
  };

  function openNewCompose() {
    setComposeMode('new'); setComposeTo(''); setComposeCc(''); setComposeBcc('');
    setComposeSubject(''); setComposeBody(''); setComposeFiles([]); setSelectedProperties([]);
    setShowCcBcc(false); setComposeReplyConvId(null); setView('compose');
  }

  function openReply(conv: EmailConversacion, msgs: EmailMensaje[]) {
    const lastIncoming = msgs.filter(m => m.es_entrante).pop();
    setComposeMode('reply');
    setComposeTo(lastIncoming?.email_de || conv.contacto_nombre || '');
    setComposeCc(''); setComposeBcc('');
    setComposeSubject(lastIncoming?.email_asunto ? `Re: ${lastIncoming.email_asunto.replace(/^Re:\s*/i, '')}` : 'Re:');
    setComposeBody('');
    setComposeFiles([]); setSelectedProperties([]); setShowCcBcc(false);
    setComposeReplyConvId(conv.id); setView('compose');
  }

  function openForward(msg: EmailMensaje) {
    setComposeMode('forward');
    setComposeTo(''); setComposeCc(''); setComposeBcc('');
    setComposeSubject(`Fwd: ${(msg.email_asunto || '').replace(/^Fwd:\s*/i, '')}`);
    setComposeBody(msg.contenido_plain || '');
    setComposeFiles([]); setSelectedProperties([]); setShowCcBcc(false);
    setComposeReplyConvId(null); setView('compose');
  }

  const handleSendEmail = async () => {
    if (!tenantId || !userId || !composeTo || !composeSubject) return;
    setSending(true);
    try {
      // Build HTML body - replace property placeholders with rich HTML
      let bodyHtml = composeBody;
      for (const prop of selectedProperties) {
        bodyHtml = bodyHtml.replace(`[Propiedad: ${prop.titulo}]`, buildPropertyHtml(prop));
      }
      let htmlBody = `<div>${bodyHtml.replace(/\n/g, '<br/>')}</div>`;
      if (firma && showFirma) {
        htmlBody += `<br/><div style="border-top:1px solid #e2e8f0;padding-top:12px;margin-top:12px;color:#64748b;font-size:13px;">${firma.contenido_html}</div>`;
      }

      // Prepare attachments
      const attachments = await Promise.all(composeFiles.map(async (file) => ({
        filename: file.name, content: await fileToBase64(file), contentType: file.type, encoding: 'base64',
      })));

      if (composeMode === 'reply' && composeReplyConvId) {
        await apiFetch(`/tenants/${tenantId}/mensajeria-email/reply`, {
          method: 'POST',
          body: JSON.stringify({
            usuario_id: userId, conversacion_id: composeReplyConvId, to: composeTo,
            cc: composeCc || undefined, bcc: composeBcc || undefined,
            subject: composeSubject, html: htmlBody, text: composeBody, attachments,
          }),
        });
      } else {
        await apiFetch(`/tenants/${tenantId}/mensajeria-email/send`, {
          method: 'POST',
          body: JSON.stringify({
            usuario_id: userId, to: composeTo, cc: composeCc || undefined, bcc: composeBcc || undefined,
            subject: composeSubject, html: htmlBody, text: composeBody, attachments,
          }),
        });
      }
      setView('inbox');
      setCarpeta('enviados');
      await fetchConversaciones();
    } catch {}
    setSending(false);
  };

  const handleChangeEstado = async (convId: string, estado: string) => {
    if (!tenantId) return;
    try {
      await apiFetch(`/tenants/${tenantId}/mensajeria-email/conversacion/${convId}/estado`, {
        method: 'PUT', body: JSON.stringify({ estado }),
      });
      if (conversacionActiva === convId) { setConversacionActiva(null); setMensajes([]); }
      await fetchConversaciones();
    } catch {}
  };

  // Contact autocomplete
  const handleToInputChange = (value: string) => {
    setComposeTo(value);
    if (contactDebounceRef.current) clearTimeout(contactDebounceRef.current);
    const lastPart = value.split(',').pop()?.trim() || '';
    if (lastPart.length >= 2) {
      contactDebounceRef.current = setTimeout(() => {
        searchContacts(lastPart);
        setShowContactDropdown(true);
      }, 300);
    } else {
      setShowContactDropdown(false);
      setContactSuggestions([]);
    }
  };

  const selectContact = (contact: ContactSuggestion) => {
    const parts = composeTo.split(',').map(p => p.trim()).filter(Boolean);
    parts.pop(); // Remove the query part
    parts.push(contact.email!);
    setComposeTo(parts.join(', ') + ', ');
    setShowContactDropdown(false);
    setContactSuggestions([]);
    toInputRef.current?.focus();
  };

  // Property picker
  const handleInsertProperty = (prop: PropertyItem) => {
    setComposeBody(prev => prev + '\n[Propiedad: ' + prop.titulo + ']\n');
    setSelectedProperties(prev => [...prev, prop]);
    setShowPropertyPicker(false);
  };

  // ==================== COMPUTED ====================

  const totalNoLeidos = conversaciones.reduce((sum, c) => sum + (c.no_leidos || 0), 0);
  const convActual = conversaciones.find(c => c.id === conversacionActiva);

  const folders: { id: Carpeta; label: string; icon: JSX.Element; color: string }[] = [
    { id: 'bandeja', label: 'Bandeja', icon: Icons.inbox, color: '#3b82f6' },
    { id: 'enviados', label: 'Enviados', icon: Icons.sent, color: '#10b981' },
    { id: 'spam', label: 'Spam', icon: Icons.spam, color: '#f59e0b' },
    { id: 'eliminados', label: 'Eliminados', icon: Icons.trash, color: '#ef4444' },
  ];

  // ==================== RENDER: LOADING ====================

  if (credentialsLoading) {
    return (<div className="ce-root"><div className="ce-empty-state"><div className="ce-spinner" /><p>Cargando...</p></div><style>{styles}</style></div>);
  }

  // ==================== RENDER: SETUP REQUIRED ====================

  if (!credentials || !credentials.is_connected) {
    return (
      <div className="ce-root">
        <div className="ce-empty-state">
          <div className="ce-empty-icon-big">{Icons.email}</div>
          <h2>Configura tu correo</h2>
          <p>Conecta tu cuenta de email para recibir y enviar correos directamente desde el CRM.</p>
          <button className="ce-btn primary lg" onClick={() => setShowSetup(true)} style={{ marginTop: 20 }}>{Icons.settings} Configurar cuenta</button>
          {credentials?.last_error && <div className="ce-alert error" style={{ marginTop: 16 }}>{translateEmailError(credentials.last_error)}</div>}
        </div>
        {renderSetupModal()}
        <style>{styles}</style>
      </div>
    );
  }

  // ==================== RENDER: COMPOSE VIEW ====================

  if (view === 'compose') {
    return (
      <div className="ce-root">
        <div className="ce-compose-page">
          {/* Recipients */}
          <div className="ce-compose-header-fields">
            <div className="ce-compose-field-row">
              <label>Para:</label>
              <div className="ce-compose-input-wrap">
                <input
                  ref={toInputRef}
                  type="text" value={composeTo}
                  onChange={e => handleToInputChange(e.target.value)}
                  onBlur={() => setTimeout(() => setShowContactDropdown(false), 200)}
                  placeholder="destinatario@email.com"
                  autoFocus
                />
                <button className="ce-compose-field-btn" onClick={() => { searchContacts(''); setShowContactDropdown(true); }} title="Buscar contactos">{Icons.user}</button>
                {!showCcBcc && <button className="ce-compose-field-btn text" onClick={() => setShowCcBcc(true)}>CC/BCC</button>}
              </div>
              {showContactDropdown && contactSuggestions.length > 0 && (
                <div className="ce-contact-dropdown">
                  {contactSuggestions.map(c => (
                    <button key={c.id} className="ce-contact-option" onClick={() => selectContact(c)}>
                      <div className="ce-contact-avatar" style={{ background: getAvatarColor(c.nombre) }}>{getInitials(c.nombre)}</div>
                      <div><div className="ce-contact-name">{c.nombre} {c.apellido || ''}</div><div className="ce-contact-email">{c.email}</div></div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {showCcBcc && (
              <>
                <div className="ce-compose-field-row">
                  <label>CC:</label>
                  <input type="text" value={composeCc} onChange={e => setComposeCc(e.target.value)} placeholder="(opcional)" />
                </div>
                <div className="ce-compose-field-row">
                  <label>BCC:</label>
                  <input type="text" value={composeBcc} onChange={e => setComposeBcc(e.target.value)} placeholder="(opcional)" />
                </div>
              </>
            )}
            <div className="ce-compose-field-row subject">
              <label>Asunto:</label>
              <input type="text" value={composeSubject} onChange={e => setComposeSubject(e.target.value)} placeholder="Asunto del correo" />
            </div>
          </div>

          {/* Body */}
          <div className="ce-compose-body-area">
            <textarea
              value={composeBody}
              onChange={e => setComposeBody(e.target.value)}
              placeholder="Escribe tu mensaje..."
            />
          </div>

          {/* Signature preview */}
          {firma && showFirma && (
            <div className="ce-compose-signature">
              <div className="ce-compose-signature-divider" />
              <div dangerouslySetInnerHTML={{ __html: firma.contenido_html }} />
            </div>
          )}

          {/* Attachments preview */}
          {composeFiles.length > 0 && (
            <div className="ce-compose-attachments">
              {composeFiles.map((file, i) => (
                <div key={i} className="ce-compose-file-chip">
                  {Icons.filePdf}
                  <span>{file.name}</span>
                  <span className="ce-file-size">{formatFileSize(file.size)}</span>
                  <button onClick={() => setComposeFiles(prev => prev.filter((_, idx) => idx !== i))}>{Icons.close}</button>
                </div>
              ))}
            </div>
          )}

          {/* Property picker */}
          {showPropertyPicker && (
            <div className="ce-property-picker">
              <div className="ce-property-picker-header">
                <h4>Adjuntar propiedad</h4>
                <button onClick={() => setShowPropertyPicker(false)}>{Icons.close}</button>
              </div>
              <input type="text" placeholder="Buscar propiedades..." value={propertyQuery}
                onChange={e => { setPropertyQuery(e.target.value); searchProperties(e.target.value); }}
                autoFocus />
              <div className="ce-property-list">
                {propertyResults.map(prop => (
                  <button key={prop.id} className="ce-property-item" onClick={() => handleInsertProperty(prop)}>
                    {prop.imagen_principal && <img src={prop.imagen_principal} alt="" />}
                    <div>
                      <div className="ce-property-title">{prop.titulo}</div>
                      <div className="ce-property-detail">{prop.ciudad} {prop.precio ? `- ${prop.moneda || '$'}${prop.precio.toLocaleString()}` : ''}</div>
                    </div>
                  </button>
                ))}
                {propertyResults.length === 0 && propertyQuery && <p className="ce-property-empty">Sin resultados</p>}
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="ce-compose-toolbar">
            <div className="ce-compose-toolbar-left">
              <button className="ce-btn primary" onClick={handleSendEmail} disabled={sending || !composeTo || !composeSubject}>
                {Icons.sendIcon} {sending ? 'Enviando...' : 'Enviar'}
              </button>
              <div className="ce-toolbar-divider" />
              <input ref={fileInputRef} type="file" multiple hidden onChange={e => { if (e.target.files) setComposeFiles(prev => [...prev, ...Array.from(e.target.files!)]); }} />
              <button className="ce-toolbar-btn" onClick={() => fileInputRef.current?.click()} title="Adjuntar archivo">{Icons.attachment}</button>
              <button className="ce-toolbar-btn" onClick={() => { setShowPropertyPicker(!showPropertyPicker); if (!showPropertyPicker) searchProperties(''); }} title="Adjuntar propiedad">{Icons.home}</button>
              <button className={`ce-toolbar-btn ${showFirma ? 'active' : ''}`} onClick={() => setShowFirma(!showFirma)} title={firma ? `Firma: ${firma.nombre}` : 'Sin firma'}>{Icons.signature}</button>
            </div>
            <button className="ce-btn ghost" onClick={() => setView('inbox')}>Descartar</button>
          </div>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  // ==================== RENDER: MAIN INBOX ====================

  return (
    <div className="ce-root">
      <div className="ce-inbox-layout">
        {/* Folder sidebar */}
        <div className="ce-folders">
          {folders.map(f => (
            <button
              key={f.id}
              className={`ce-folder-btn ${carpeta === f.id ? 'active' : ''}`}
              onClick={() => { setCarpeta(f.id); setConversacionActiva(null); setMensajes([]); }}
              style={{ '--folder-color': f.color } as React.CSSProperties}
            >
              <span className="ce-folder-icon">{f.icon}</span>
              <span className="ce-folder-label">{f.label}</span>
              {f.id === 'bandeja' && totalNoLeidos > 0 && <span className="ce-folder-badge">{totalNoLeidos}</span>}
            </button>
          ))}
        </div>

        {/* Email list */}
        <div className="ce-list-panel">
          <div className="ce-list-search">
            {Icons.search}
            <input type="text" placeholder="Buscar correos..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <div className="ce-list">
            {loading && conversaciones.length === 0 && (
              <div className="ce-list-empty"><div className="ce-spinner" /><p>Cargando...</p></div>
            )}
            {conversaciones.map(conv => {
              const isActive = conversacionActiva === conv.id;
              const isUnread = conv.no_leidos > 0;
              return (
                <div
                  key={conv.id}
                  className={`ce-list-item ${isActive ? 'active' : ''} ${isUnread ? 'unread' : ''}`}
                  onClick={() => { setConversacionActiva(conv.id); }}
                >
                  <div className="ce-list-avatar" style={{ background: getAvatarColor(conv.contacto_nombre) }}>
                    {getInitials(conv.contacto_nombre)}
                  </div>
                  <div className="ce-list-content">
                    <div className="ce-list-top">
                      <span className="ce-list-from">{conv.contacto_nombre || 'Desconocido'}</span>
                      <span className="ce-list-time">{formatTimeAgo(conv.ultimo_mensaje_at)}</span>
                    </div>
                    <div className="ce-list-subject">{conv.metadata?.email_subject || '(Sin asunto)'}</div>
                    <div className="ce-list-preview">{conv.ultimo_mensaje_texto || ''}</div>
                  </div>
                  {isUnread && <span className="ce-list-badge">{conv.no_leidos}</span>}
                </div>
              );
            })}
            {!loading && conversaciones.length === 0 && (
              <div className="ce-list-empty">
                <div className="ce-empty-icon-sm">{folders.find(f => f.id === carpeta)?.icon}</div>
                <p>{carpeta === 'bandeja' ? 'No hay correos en la bandeja' : carpeta === 'enviados' ? 'No hay correos enviados' : carpeta === 'spam' ? 'No hay correos spam' : 'No hay correos eliminados'}</p>
                {carpeta === 'bandeja' && (
                  <button className="ce-btn ghost sm" onClick={() => handleSync(false)} disabled={syncing} style={{ marginTop: 8 }}>
                    {Icons.refresh} {syncing ? 'Sincronizando...' : 'Sincronizar'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Read panel */}
        <div className="ce-read-panel">
          {conversacionActiva && mensajes.length > 0 ? (
            <>
              {/* Subject + actions */}
              <div className="ce-read-header">
                <div className="ce-read-subject-row">
                  <h2>{mensajes[0]?.email_asunto || '(Sin asunto)'}</h2>
                </div>
                <div className="ce-read-meta">
                  <span>{carpeta === 'bandeja' ? 'De' : 'Para'}: <strong>{convActual?.contacto_nombre || 'Desconocido'}</strong></span>
                  <span className="ce-read-count">{mensajes.length} mensaje{mensajes.length > 1 ? 's' : ''}</span>
                </div>
                <div className="ce-read-actions">
                  <button className="ce-action-btn" onClick={() => openReply(convActual!, mensajes)}>{Icons.reply} Responder</button>
                  <button className="ce-action-btn" onClick={() => openForward(mensajes[mensajes.length - 1])}>{Icons.forward} Reenviar</button>
                  <div className="ce-action-divider" />
                  {carpeta !== 'spam' && carpeta !== 'eliminados' && (
                    <>
                      <button className="ce-action-btn" onClick={() => handleChangeEstado(conversacionActiva!, 'archivada')} title="Archivar">{Icons.archive}</button>
                      <button className="ce-action-btn warning" onClick={() => handleChangeEstado(conversacionActiva!, 'spam')} title="Spam">{Icons.spam}</button>
                      <button className="ce-action-btn danger" onClick={() => handleChangeEstado(conversacionActiva!, 'eliminada')} title="Eliminar">{Icons.trash}</button>
                    </>
                  )}
                  {(carpeta === 'spam' || carpeta === 'eliminados') && (
                    <button className="ce-action-btn" onClick={() => handleChangeEstado(conversacionActiva!, 'abierta')} title="Restaurar">{Icons.restore} Restaurar</button>
                  )}
                </div>
              </div>

              {/* Thread */}
              <div className="ce-thread">
                {mensajes.map(msg => (
                  <div key={msg.id} className={`ce-msg ${msg.es_entrante ? 'incoming' : 'outgoing'}`}>
                    <div className="ce-msg-header">
                      <div className="ce-msg-sender">
                        <div className="ce-msg-avatar" style={{ background: getAvatarColor(msg.es_entrante ? msg.remitente_nombre : 'Yo') }}>
                          {getInitials(msg.es_entrante ? (msg.remitente_nombre || msg.email_de) : 'Yo')}
                        </div>
                        <div className="ce-msg-sender-info">
                          <span className="ce-msg-from">{msg.es_entrante ? (msg.remitente_nombre || msg.email_de) : (credentials?.display_name || 'Yo')}</span>
                          <span className="ce-msg-email">{msg.es_entrante ? msg.email_de : `Para: ${msg.email_para}`}</span>
                        </div>
                      </div>
                      <span className="ce-msg-date">{formatFullDate(msg.created_at)}</span>
                    </div>
                    {msg.email_cc && <div className="ce-msg-cc">CC: {msg.email_cc}</div>}
                    <div className="ce-msg-body" dangerouslySetInnerHTML={{ __html: msg.contenido || msg.contenido_plain || '' }} />
                    {msg.adjuntos?.length > 0 && (
                      <div className="ce-msg-attachments">
                        <div className="ce-attachments-label">{Icons.attachment} {msg.adjuntos.length} adjunto{msg.adjuntos.length > 1 ? 's' : ''}</div>
                        <div className="ce-attachments-grid">
                          {msg.adjuntos.map((adj: any, i: number) => (
                            <a
                              key={i}
                              className="ce-attachment-card"
                              href={adj.url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={adj.name || adj.nombre}
                              onClick={e => { if (!adj.url) e.preventDefault(); }}
                            >
                              <div className="ce-attachment-icon">{Icons.filePdf}</div>
                              <div className="ce-attachment-info">
                                <span className="ce-attachment-name">{adj.name || adj.nombre || 'Adjunto'}</span>
                                {adj.size && <span className="ce-attachment-size">{formatFileSize(adj.size)}</span>}
                              </div>
                              {adj.url && <span className="ce-attachment-dl">{Icons.download}</span>}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="ce-empty-state">
              <div className="ce-empty-icon-big">{Icons.email}</div>
              <h3>Selecciona un correo</h3>
              <p>Elige un correo de la lista para leerlo aqui.</p>
            </div>
          )}
        </div>
      </div>

      {/* Setup Modal */}
      {renderSetupModal()}
      <style>{styles}</style>
    </div>
  );

  // ==================== SETUP MODAL ====================

  function renderSetupModal() {
    if (!showSetup) return null;
    return (
      <div className="ce-modal-overlay"
        onMouseDown={e => { mouseDownTargetRef.current = e.target; }}
        onClick={e => { if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) setShowSetup(false); }}
      >
        <div className="ce-modal" onClick={e => e.stopPropagation()}>
          <div className="ce-modal-header">
            <h3>Configurar cuenta de correo</h3>
            <button className="ce-btn-icon" onClick={() => setShowSetup(false)}>{Icons.close}</button>
          </div>
          <div className="ce-setup-fields">
            <div className="ce-setup-field"><label>Correo electronico:</label><input type="email" value={setupEmail} onChange={e => setSetupEmail(e.target.value)} placeholder="tu@dominio.com" /></div>
            <div className="ce-setup-field"><label>Nombre visible:</label><input type="text" value={setupDisplayName} onChange={e => setSetupDisplayName(e.target.value)} placeholder="Tu Nombre" /></div>
            <div className="ce-setup-field"><label>Contrasena:</label><input type="password" value={setupPassword} onChange={e => setSetupPassword(e.target.value)} placeholder="Contrasena del email" /></div>
            <div className="ce-setup-hint">Los datos de IMAP y SMTP los encuentras en tu panel de MXRoute. Usa el hostname de tu servidor (ej: witcher.mxrouting.net).</div>
            <div className="ce-setup-row">
              <div className="ce-setup-field"><label>IMAP Host:</label><input type="text" value={setupImapHost} onChange={e => setSetupImapHost(e.target.value)} /></div>
              <div className="ce-setup-field"><label>Puerto:</label><input type="text" value={setupImapPort} onChange={e => setSetupImapPort(e.target.value)} /></div>
            </div>
            <div className="ce-setup-row">
              <div className="ce-setup-field"><label>SMTP Host:</label><input type="text" value={setupSmtpHost} onChange={e => setSetupSmtpHost(e.target.value)} /></div>
              <div className="ce-setup-field"><label>Puerto:</label><input type="text" value={setupSmtpPort} onChange={e => setSetupSmtpPort(e.target.value)} /></div>
            </div>
            {setupError && <div className="ce-alert error">{setupError}</div>}
            {setupSuccess && <div className="ce-alert success">{setupSuccess}</div>}
          </div>
          <div className="ce-modal-footer">
            <button className="ce-btn primary" onClick={handleSaveCredentials} disabled={setupTesting || !setupEmail || !setupPassword || !setupImapHost || !setupSmtpHost}>
              {setupTesting ? 'Verificando conexion...' : 'Guardar y verificar'}
            </button>
            <button className="ce-btn ghost" onClick={() => setShowSetup(false)}>Cancelar</button>
          </div>
        </div>
      </div>
    );
  }
}

// ==================== STYLES ====================

const styles = `
  /* ===== ROOT ===== */
  .ce-root {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 64px);
    background: #f0f2f5;
    overflow: hidden;
  }

  /* ===== SPINNER ===== */
  .ce-spinner {
    width: 32px; height: 32px;
    border: 3px solid #e2e8f0; border-top-color: #3b82f6;
    border-radius: 50%;
    animation: ce-spin 0.8s linear infinite;
  }
  @keyframes ce-spin { to { transform: rotate(360deg); } }

  /* ===== INBOX LAYOUT ===== */
  .ce-inbox-layout {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  /* ===== FOLDER SIDEBAR ===== */
  .ce-folders {
    width: 180px;
    min-width: 160px;
    background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
    padding: 16px 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex-shrink: 0;
  }
  .ce-folder-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: transparent;
    border: none;
    border-radius: 8px;
    color: #94a3b8;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    position: relative;
  }
  .ce-folder-btn:hover {
    background: rgba(255,255,255,0.08);
    color: #e2e8f0;
  }
  .ce-folder-btn.active {
    background: rgba(255,255,255,0.12);
    color: white;
    font-weight: 600;
  }
  .ce-folder-btn.active .ce-folder-icon {
    color: var(--folder-color);
  }
  .ce-folder-icon {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }
  .ce-folder-label {
    flex: 1;
  }
  .ce-folder-badge {
    min-width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 6px;
    background: #ef4444;
    color: white;
    font-size: 0.6875rem;
    font-weight: 700;
    border-radius: 10px;
  }

  /* ===== LIST PANEL ===== */
  .ce-list-panel {
    width: 380px;
    min-width: 300px;
    background: white;
    border-right: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
  }
  .ce-list-search {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-bottom: 1px solid #e2e8f0;
    color: #94a3b8;
    background: #fafbfc;
  }
  .ce-list-search input {
    flex: 1;
    border: none;
    background: none;
    font-size: 0.8125rem;
    color: #0f172a;
    outline: none;
  }
  .ce-list-search input::placeholder { color: #94a3b8; }
  .ce-list {
    flex: 1;
    overflow-y: auto;
  }

  /* ===== LIST ITEMS ===== */
  .ce-list-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    border-bottom: 1px solid #f1f5f9;
    cursor: pointer;
    transition: all 0.15s;
    border-left: 3px solid transparent;
  }
  .ce-list-item:hover { background: #f8fafc; }
  .ce-list-item.active {
    background: #eff6ff;
    border-left-color: #3b82f6;
  }
  .ce-list-item.unread {
    background: #fffbeb;
    border-left-color: #f59e0b;
  }
  .ce-list-item.unread .ce-list-from,
  .ce-list-item.unread .ce-list-subject { font-weight: 700; }
  .ce-list-item.active.unread {
    background: #eff6ff;
    border-left-color: #3b82f6;
  }
  .ce-list-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8125rem;
    font-weight: 700;
    flex-shrink: 0;
    letter-spacing: -0.02em;
  }
  .ce-list-content { flex: 1; min-width: 0; }
  .ce-list-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 3px;
  }
  .ce-list-from {
    font-size: 0.8125rem;
    color: #0f172a;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ce-list-time {
    font-size: 0.6875rem;
    color: #94a3b8;
    flex-shrink: 0;
    margin-left: 8px;
  }
  .ce-list-subject {
    font-size: 0.8125rem;
    color: #334155;
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ce-list-preview {
    font-size: 0.75rem;
    color: #94a3b8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.4;
  }
  .ce-list-badge {
    min-width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 6px;
    background: #3b82f6;
    color: white;
    font-size: 0.6875rem;
    font-weight: 700;
    border-radius: 10px;
    flex-shrink: 0;
    margin-top: 4px;
  }
  .ce-list-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: #94a3b8;
    text-align: center;
  }
  .ce-list-empty p { margin: 10px 0 0; font-size: 0.8125rem; }

  /* ===== READ PANEL ===== */
  .ce-read-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: #f8fafc;
    overflow: hidden;
  }
  .ce-read-header {
    padding: 20px 24px 16px;
    background: white;
    border-bottom: 1px solid #e2e8f0;
  }
  .ce-read-subject-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
  }
  .ce-read-header h2 {
    margin: 0 0 8px;
    font-size: 1.25rem;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.3;
  }
  .ce-read-meta {
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 0.8125rem;
    color: #64748b;
    margin-bottom: 12px;
  }
  .ce-read-meta strong { color: #0f172a; font-weight: 600; }
  .ce-read-count {
    padding: 2px 8px;
    background: #f1f5f9;
    border-radius: 4px;
    font-size: 0.75rem;
    color: #64748b;
  }
  .ce-read-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .ce-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    color: #475569;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }
  .ce-action-btn:hover { background: #e2e8f0; color: #0f172a; }
  .ce-action-btn.warning:hover { background: #fef3c7; color: #d97706; border-color: #fcd34d; }
  .ce-action-btn.danger:hover { background: #fef2f2; color: #dc2626; border-color: #fca5a5; }
  .ce-action-divider {
    width: 1px;
    height: 20px;
    background: #e2e8f0;
    margin: 0 4px;
  }

  /* ===== THREAD ===== */
  .ce-thread {
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px;
  }
  .ce-msg {
    margin-bottom: 12px;
    background: white;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
    transition: box-shadow 0.15s;
  }
  .ce-msg:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .ce-msg.outgoing {
    background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
    border-color: #bbf7d0;
  }
  .ce-msg-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 18px 0;
    gap: 12px;
  }
  .ce-msg-sender {
    display: flex;
    gap: 10px;
    align-items: center;
    min-width: 0;
  }
  .ce-msg-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8125rem;
    font-weight: 700;
    flex-shrink: 0;
    color: white;
    letter-spacing: -0.02em;
  }
  .ce-msg-sender-info { min-width: 0; }
  .ce-msg-from {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: #0f172a;
  }
  .ce-msg-email {
    display: block;
    font-size: 0.75rem;
    color: #94a3b8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ce-msg-date {
    font-size: 0.75rem;
    color: #94a3b8;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .ce-msg-cc {
    padding: 6px 18px 0;
    font-size: 0.75rem;
    color: #94a3b8;
  }
  .ce-msg-body {
    padding: 14px 18px 18px;
    line-height: 1.7;
    color: #334155;
    font-size: 0.875rem;
    word-break: break-word;
  }
  .ce-msg-body p { margin: 0 0 10px; }
  .ce-msg-body img { max-width: 100%; height: auto; border-radius: 6px; }
  .ce-msg-body a { color: #3b82f6; }

  /* ===== ATTACHMENTS ===== */
  .ce-msg-attachments {
    padding: 0 18px 14px;
  }
  .ce-attachments-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #64748b;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .ce-attachments-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .ce-attachment-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    text-decoration: none;
    color: inherit;
    transition: all 0.15s;
    cursor: pointer;
    min-width: 180px;
  }
  .ce-attachment-card:hover {
    background: #eff6ff;
    border-color: #bfdbfe;
    box-shadow: 0 1px 4px rgba(59,130,246,0.1);
  }
  .ce-attachment-icon {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #dbeafe;
    color: #3b82f6;
    border-radius: 8px;
    flex-shrink: 0;
  }
  .ce-attachment-info {
    flex: 1;
    min-width: 0;
  }
  .ce-attachment-name {
    display: block;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #0f172a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ce-attachment-size {
    display: block;
    font-size: 0.6875rem;
    color: #94a3b8;
  }
  .ce-attachment-dl {
    display: flex;
    align-items: center;
    color: #3b82f6;
    opacity: 0;
    transition: opacity 0.15s;
  }
  .ce-attachment-card:hover .ce-attachment-dl { opacity: 1; }

  /* ===== EMPTY STATES ===== */
  .ce-empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    color: #64748b;
    text-align: center;
  }
  .ce-empty-icon-big {
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #eff6ff, #dbeafe);
    border-radius: 50%;
    color: #3b82f6;
    margin-bottom: 16px;
  }
  .ce-empty-icon-big svg { width: 36px; height: 36px; }
  .ce-empty-icon-sm {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f1f5f9;
    border-radius: 50%;
    color: #94a3b8;
  }
  .ce-empty-state h2 { margin: 0 0 6px; font-size: 1.25rem; font-weight: 700; color: #0f172a; }
  .ce-empty-state h3 { margin: 0 0 4px; font-size: 1rem; font-weight: 600; color: #0f172a; }
  .ce-empty-state p { margin: 0; font-size: 0.875rem; max-width: 360px; line-height: 1.5; }

  /* ===== COMPOSE PAGE ===== */
  .ce-compose-page {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: white;
    overflow: hidden;
  }
  .ce-compose-header-fields {
    padding: 0;
    border-bottom: 1px solid #e2e8f0;
    flex-shrink: 0;
  }
  .ce-compose-field-row {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0 24px;
    border-bottom: 1px solid #f1f5f9;
    position: relative;
  }
  .ce-compose-field-row.subject {
    border-bottom: none;
  }
  .ce-compose-field-row label {
    width: 60px;
    font-size: 0.8125rem;
    color: #64748b;
    font-weight: 500;
    flex-shrink: 0;
  }
  .ce-compose-field-row input,
  .ce-compose-input-wrap input {
    flex: 1;
    border: none;
    background: none;
    padding: 14px 0;
    font-size: 0.875rem;
    color: #0f172a;
    outline: none;
    font-family: inherit;
  }
  .ce-compose-input-wrap {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 4px;
  }
  .ce-compose-field-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: #f1f5f9;
    border: none;
    border-radius: 6px;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s;
    flex-shrink: 0;
  }
  .ce-compose-field-btn.text {
    width: auto;
    padding: 0 10px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #3b82f6;
    background: #eff6ff;
  }
  .ce-compose-field-btn:hover { background: #e2e8f0; color: #0f172a; }

  /* ===== CONTACT DROPDOWN ===== */
  .ce-contact-dropdown {
    position: absolute;
    top: 100%;
    left: 60px;
    right: 24px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.12);
    z-index: 100;
    max-height: 280px;
    overflow-y: auto;
  }
  .ce-contact-option {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    width: 100%;
    border: none;
    background: none;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s;
  }
  .ce-contact-option:hover { background: #f8fafc; }
  .ce-contact-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 700;
    flex-shrink: 0;
  }
  .ce-contact-name { font-size: 0.8125rem; font-weight: 500; color: #0f172a; }
  .ce-contact-email { font-size: 0.75rem; color: #64748b; }

  /* ===== COMPOSE BODY ===== */
  .ce-compose-body-area {
    flex: 1;
    overflow: hidden;
    display: flex;
  }
  .ce-compose-body-area textarea {
    flex: 1;
    border: none;
    padding: 20px 24px;
    font-size: 0.9375rem;
    font-family: inherit;
    line-height: 1.7;
    color: #0f172a;
    resize: none;
    outline: none;
    background: white;
  }
  .ce-compose-body-area textarea::placeholder { color: #94a3b8; }

  /* ===== COMPOSE SIGNATURE ===== */
  .ce-compose-signature {
    padding: 0 24px 16px;
    flex-shrink: 0;
  }
  .ce-compose-signature-divider {
    height: 1px;
    background: #e2e8f0;
    margin-bottom: 12px;
  }
  .ce-compose-signature div {
    font-size: 0.8125rem;
    color: #64748b;
    line-height: 1.5;
  }

  /* ===== COMPOSE ATTACHMENTS ===== */
  .ce-compose-attachments {
    padding: 0 24px 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    flex-shrink: 0;
  }
  .ce-compose-file-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 0.75rem;
    color: #475569;
  }
  .ce-compose-file-chip button {
    display: flex;
    align-items: center;
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 0;
  }
  .ce-compose-file-chip button:hover { color: #ef4444; }
  .ce-file-size { color: #94a3b8; }

  /* ===== PROPERTY PICKER ===== */
  .ce-property-picker {
    padding: 0 24px 12px;
    border-top: 1px solid #e2e8f0;
    background: #fafbfc;
    flex-shrink: 0;
    max-height: 300px;
    overflow-y: auto;
  }
  .ce-property-picker-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0 8px;
  }
  .ce-property-picker-header h4 { margin: 0; font-size: 0.8125rem; font-weight: 600; color: #0f172a; }
  .ce-property-picker-header button { background: none; border: none; color: #64748b; cursor: pointer; }
  .ce-property-picker input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 0.8125rem;
    outline: none;
    margin-bottom: 8px;
    box-sizing: border-box;
  }
  .ce-property-picker input:focus { border-color: #3b82f6; }
  .ce-property-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .ce-property-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
    transition: all 0.15s;
    width: 100%;
  }
  .ce-property-item:hover { border-color: #3b82f6; background: #eff6ff; }
  .ce-property-item img {
    width: 48px;
    height: 48px;
    border-radius: 4px;
    object-fit: cover;
    flex-shrink: 0;
  }
  .ce-property-title { font-size: 0.8125rem; font-weight: 500; color: #0f172a; }
  .ce-property-detail { font-size: 0.75rem; color: #64748b; }
  .ce-property-empty { color: #94a3b8; font-size: 0.8125rem; text-align: center; padding: 16px; margin: 0; }

  /* ===== COMPOSE TOOLBAR ===== */
  .ce-compose-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 24px;
    background: #fafbfc;
    border-top: 1px solid #e2e8f0;
    flex-shrink: 0;
  }
  .ce-compose-toolbar-left {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .ce-toolbar-divider {
    width: 1px;
    height: 24px;
    background: #e2e8f0;
    margin: 0 6px;
  }
  .ce-toolbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s;
  }
  .ce-toolbar-btn:hover { background: #f1f5f9; color: #0f172a; border-color: #cbd5e1; }
  .ce-toolbar-btn.active { background: #eff6ff; color: #3b82f6; border-color: #bfdbfe; }

  /* ===== BUTTONS ===== */
  .ce-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .ce-btn:disabled { opacity: 0.5; cursor: default; }
  .ce-btn.primary { background: #3b82f6; color: white; }
  .ce-btn.primary:hover:not(:disabled) { background: #2563eb; }
  .ce-btn.ghost { background: #f1f5f9; color: #475569; }
  .ce-btn.ghost:hover:not(:disabled) { background: #e2e8f0; }
  .ce-btn.lg { padding: 12px 24px; font-size: 0.875rem; }
  .ce-btn.sm { padding: 6px 12px; font-size: 0.75rem; }

  /* ===== HEADER BUTTONS ===== */
  .ce-header-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 7px 14px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    color: #475569;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }
  .ce-header-btn:hover { background: #f1f5f9; border-color: #cbd5e1; }
  .ce-header-btn:disabled { opacity: 0.5; cursor: default; }
  .ce-header-btn.primary { background: #3b82f6; color: white; border-color: #3b82f6; }
  .ce-header-btn.primary:hover { background: #2563eb; }
  .ce-header-btn.danger { color: #ef4444; }
  .ce-header-btn.danger:hover { background: #fef2f2; border-color: #fca5a5; }
  .ce-btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px; height: 28px;
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    border-radius: 4px;
  }
  .ce-btn-icon:hover { background: #f1f5f9; }

  /* ===== ALERT ===== */
  .ce-alert { padding: 10px 14px; border-radius: 8px; font-size: 0.8125rem; line-height: 1.5; }
  .ce-alert.error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
  .ce-alert.success { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }

  /* ===== MODAL ===== */
  .ce-modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  .ce-modal {
    background: white;
    border-radius: 14px;
    width: 520px;
    max-width: 95vw;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
  }
  .ce-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18px 24px;
    border-bottom: 1px solid #e2e8f0;
  }
  .ce-modal-header h3 { margin: 0; font-size: 1rem; font-weight: 700; color: #0f172a; }
  .ce-modal-footer {
    display: flex;
    gap: 8px;
    padding: 16px 24px;
    border-top: 1px solid #e2e8f0;
  }

  /* ===== SETUP FIELDS ===== */
  .ce-setup-fields { padding: 20px 24px; display: flex; flex-direction: column; gap: 12px; }
  .ce-setup-field { display: flex; flex-direction: column; gap: 4px; }
  .ce-setup-field label { font-size: 0.8125rem; color: #475569; font-weight: 600; }
  .ce-setup-field input {
    padding: 10px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.8125rem;
    outline: none;
    transition: border-color 0.15s;
  }
  .ce-setup-field input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
  .ce-setup-row { display: flex; gap: 12px; }
  .ce-setup-row .ce-setup-field { flex: 1; }
  .ce-setup-hint {
    color: #64748b;
    font-size: 0.75rem;
    padding: 10px 12px;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    line-height: 1.5;
  }

  /* ===== RESPONSIVE ===== */
  @media (max-width: 1100px) {
    .ce-inbox-layout { flex-direction: column; }
    .ce-folders { flex-direction: row; width: 100%; min-width: 0; padding: 8px 12px; overflow-x: auto; }
    .ce-folder-btn { flex-direction: column; padding: 6px 10px; font-size: 0.6875rem; gap: 4px; }
    .ce-list-panel { width: 100%; max-height: 40vh; min-width: 0; }
  }
  @media (max-width: 768px) {
    .ce-read-panel { display: none; }
    .ce-list-panel { width: 100%; max-height: none; flex: 1; }
  }
`;
