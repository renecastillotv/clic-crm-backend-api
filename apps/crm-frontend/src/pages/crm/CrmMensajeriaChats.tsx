/**
 * CrmMensajeriaChats - Bandeja unificada de chats
 *
 * Muestra conversaciones de WhatsApp, Instagram DM, Facebook DM y Chat Web.
 * Conectado al backend via /mensajeria/conversaciones y /mensajeria/conversaciones/:id/mensajes.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePageHeader } from '../../layouts/CrmLayout';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../services/api';

// ==================== TYPES ====================

type CanalChat = 'whatsapp' | 'instagram_dm' | 'facebook_dm' | 'web_chat';

interface Conversacion {
  id: string;
  tenant_id: string;
  canal: CanalChat;
  external_conversation_id: string | null;
  external_participant_id: string | null;
  contacto_id: string | null;
  contacto_nombre: string | null;
  contacto_avatar_url: string | null;
  usuario_asignado_id: string | null;
  estado: string;
  no_leidos: number;
  ultimo_mensaje_texto: string | null;
  ultimo_mensaje_at: string | null;
  ultimo_mensaje_es_entrante: boolean | null;
  etiqueta_id: string | null;
  etiqueta_nombre?: string;
  etiqueta_color?: string;
  etiqueta_codigo?: string;
  metadata: Record<string, any>;
  created_at: string;
}

interface MensajeChat {
  id: string;
  conversacion_id: string;
  es_entrante: boolean;
  remitente_nombre: string | null;
  remitente_id: string | null;
  tipo: string;
  contenido: string | null;
  contenido_plain: string | null;
  adjuntos: any[];
  external_message_id: string | null;
  estado: string | null;
  error_mensaje: string | null;
  created_at: string;
}

interface Etiqueta {
  id: string;
  codigo: string;
  nombre: string;
  color: string;
  es_default: boolean;
}

// ==================== ICONS ====================

const Icons = {
  chats: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
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
  send: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13"/>
      <path d="M22 2l-7 20-4-9-9-4z"/>
    </svg>
  ),
  attachment: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
    </svg>
  ),
  property: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  search: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.35-4.35"/>
    </svg>
  ),
  userPlus: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="8.5" cy="7" r="4"/>
      <line x1="20" y1="8" x2="20" y2="14"/>
      <line x1="23" y1="11" x2="17" y2="11"/>
    </svg>
  ),
  chevronDown: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  ),
};

// ==================== COMPONENT ====================

export default function CrmMensajeriaChats() {
  const { setPageHeader } = usePageHeader();
  const { user, tenantActual } = useAuth();

  const tenantId = tenantActual?.id;
  const userId = user?.id;

  // State
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [conversacionActiva, setConversacionActiva] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [filtroOrigen, setFiltroOrigen] = useState<string>('todos');
  const [filtroEtiqueta, setFiltroEtiqueta] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMensajes, setLoadingMensajes] = useState(false);
  const [sending, setSending] = useState(false);
  const [showEtiquetaMenu, setShowEtiquetaMenu] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setPageHeader({
      title: 'Chats',
      subtitle: 'Bandeja unificada de mensajes',
    });
  }, [setPageHeader]);

  // ==================== DATA FETCHING ====================

  const fetchConversaciones = useCallback(async () => {
    if (!tenantId) return;
    try {
      const params = new URLSearchParams();
      if (userId) params.set('usuario_id', userId);
      if (filtroOrigen !== 'todos') params.set('canal', filtroOrigen);
      if (filtroEtiqueta !== 'todos') params.set('etiqueta_id', filtroEtiqueta);
      if (busqueda) params.set('busqueda', busqueda);
      // Only chat channels, not email
      if (filtroOrigen === 'todos') {
        // Exclude email conversations - we'll filter client-side since the API
        // doesn't support excluding a single canal
      }

      const res = await apiFetch(`/tenants/${tenantId}/mensajeria/conversaciones?${params}`);
      const data = await res.json();
      // Filter out email conversations (those are handled by CrmMensajeriaCorreo)
      const chatConvs = (data.data || []).filter((c: Conversacion) => c.canal !== 'email');
      setConversaciones(chatConvs);
    } catch (err) {
      console.error('Error fetching conversaciones:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, userId, filtroOrigen, filtroEtiqueta, busqueda]);

  const fetchEtiquetas = useCallback(async () => {
    if (!tenantId) return;
    try {
      const res = await apiFetch(`/tenants/${tenantId}/mensajeria/etiquetas`);
      const data = await res.json();
      setEtiquetas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching etiquetas:', err);
    }
  }, [tenantId]);

  const fetchMensajes = useCallback(async (conversacionId: string) => {
    if (!tenantId) return;
    setLoadingMensajes(true);
    try {
      const res = await apiFetch(`/tenants/${tenantId}/mensajeria/conversaciones/${conversacionId}/mensajes?limit=100`);
      const data = await res.json();
      setMensajes(data.data || []);
    } catch (err) {
      console.error('Error fetching mensajes:', err);
    } finally {
      setLoadingMensajes(false);
    }
  }, [tenantId]);

  // Initial load
  useEffect(() => {
    fetchConversaciones();
    fetchEtiquetas();
  }, [fetchConversaciones, fetchEtiquetas]);

  // Poll conversations every 10 seconds
  useEffect(() => {
    pollIntervalRef.current = setInterval(fetchConversaciones, 10000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [fetchConversaciones]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (conversacionActiva) {
      fetchMensajes(conversacionActiva);
      // Mark as read
      if (tenantId) {
        apiFetch(`/tenants/${tenantId}/mensajeria/conversaciones/${conversacionActiva}/read`, {
          method: 'POST',
        }).catch(() => {});
      }
    } else {
      setMensajes([]);
    }
  }, [conversacionActiva, fetchMensajes, tenantId]);

  // Poll messages for active conversation every 5 seconds
  useEffect(() => {
    if (!conversacionActiva) return;
    const interval = setInterval(() => fetchMensajes(conversacionActiva), 5000);
    return () => clearInterval(interval);
  }, [conversacionActiva, fetchMensajes]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  // ==================== ACTIONS ====================

  const handleSendMessage = async () => {
    if (!nuevoMensaje.trim() || !conversacionActiva || !tenantId || sending) return;
    const text = nuevoMensaje.trim();
    setNuevoMensaje('');
    setSending(true);
    try {
      await apiFetch(`/tenants/${tenantId}/mensajeria/conversaciones/${conversacionActiva}/mensajes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          es_entrante: false,
          tipo: 'text',
          contenido: text,
          contenido_plain: text,
          remitente_nombre: user?.nombre || 'Agente',
          remitente_id: userId,
        }),
      });
      // Refresh messages
      await fetchMensajes(conversacionActiva);
      // Refresh conversation list to update last message
      fetchConversaciones();
    } catch (err) {
      console.error('Error sending message:', err);
      setNuevoMensaje(text); // Restore on error
    } finally {
      setSending(false);
    }
  };

  const handleCambiarEtiqueta = async (conversacionId: string, etiquetaId: string) => {
    if (!tenantId) return;
    setShowEtiquetaMenu(null);
    try {
      await apiFetch(`/tenants/${tenantId}/mensajeria/conversaciones/${conversacionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etiqueta_id: etiquetaId }),
      });
      fetchConversaciones();
    } catch (err) {
      console.error('Error updating etiqueta:', err);
    }
  };

  // ==================== HELPERS ====================

  const formatTimeAgo = (dateStr: string | null) => {
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
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };

  const getOrigenIcon = (canal: string) => {
    switch (canal) {
      case 'whatsapp': return Icons.whatsapp;
      case 'instagram_dm': return Icons.instagram;
      case 'facebook_dm': return Icons.facebook;
      case 'web_chat': return Icons.webChat;
      default: return Icons.chats;
    }
  };

  const getOrigenColor = (canal: string) => {
    switch (canal) {
      case 'whatsapp': return '#25D366';
      case 'instagram_dm': return '#E4405F';
      case 'facebook_dm': return '#1877F2';
      case 'web_chat': return '#8b5cf6';
      default: return '#64748b';
    }
  };

  const getOrigenLabel = (canal: string) => {
    switch (canal) {
      case 'whatsapp': return 'WhatsApp';
      case 'instagram_dm': return 'Instagram DM';
      case 'facebook_dm': return 'Facebook DM';
      case 'web_chat': return 'Chat Web';
      default: return canal;
    }
  };

  const convActiva = conversaciones.find(c => c.id === conversacionActiva);
  const totalNoLeidos = conversaciones.reduce((acc, c) => acc + c.no_leidos, 0);

  // ==================== RENDER ====================

  if (loading) {
    return (
      <div className="crm-chats">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#64748b' }}>
          Cargando conversaciones...
        </div>
      </div>
    );
  }

  return (
    <div className="crm-chats">
      <div className="msg-chats-container">
        {/* Lista de conversaciones */}
        <div className="msg-list-panel">
          <div className="msg-list-header">
            <div className="msg-header-top">
              <span className="chat-counter">{conversaciones.length} chats</span>
              {totalNoLeidos > 0 && <span className="unread-counter">{totalNoLeidos} sin leer</span>}
            </div>
            <div className="msg-search">
              {Icons.search}
              <input type="text" placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>
            <div className="msg-filters-row">
              <select value={filtroOrigen} onChange={(e) => setFiltroOrigen(e.target.value)}>
                <option value="todos">Todos</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="instagram_dm">Instagram</option>
                <option value="facebook_dm">Facebook</option>
                <option value="web_chat">Chat Web</option>
              </select>
              <select value={filtroEtiqueta} onChange={(e) => setFiltroEtiqueta(e.target.value)}>
                <option value="todos">Etiquetas</option>
                {etiquetas.map(et => (
                  <option key={et.id} value={et.id}>{et.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="msg-list">
            {conversaciones.map(conv => (
              <div
                key={conv.id}
                className={`msg-item ${conversacionActiva === conv.id ? 'active' : ''} ${conv.no_leidos > 0 ? 'unread' : ''}`}
                onClick={() => setConversacionActiva(conv.id)}
              >
                <div className="msg-item-avatar">
                  <div className="avatar-placeholder">
                    {conv.contacto_avatar_url
                      ? <img src={conv.contacto_avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      : (conv.contacto_nombre || '?').charAt(0).toUpperCase()
                    }
                  </div>
                  <span className="origen-badge" style={{ backgroundColor: getOrigenColor(conv.canal) }}>
                    {getOrigenIcon(conv.canal)}
                  </span>
                </div>
                <div className="msg-item-content">
                  <div className="msg-item-header">
                    <span className="msg-item-name">{conv.contacto_nombre || 'Desconocido'}</span>
                    <span className="msg-item-time">{formatTimeAgo(conv.ultimo_mensaje_at)}</span>
                  </div>
                  <div className="msg-item-preview">
                    <span className="preview-text">{conv.ultimo_mensaje_texto || 'Sin mensajes'}</span>
                    {conv.no_leidos > 0 && <span className="unread-badge">{conv.no_leidos}</span>}
                  </div>
                  <div className="msg-item-footer">
                    {conv.etiqueta_nombre && (
                      <button
                        className="etiqueta-btn"
                        style={{
                          backgroundColor: `${conv.etiqueta_color || '#94a3b8'}20`,
                          color: conv.etiqueta_color || '#94a3b8',
                          borderColor: `${conv.etiqueta_color || '#94a3b8'}40`,
                        }}
                        onClick={(e) => { e.stopPropagation(); setShowEtiquetaMenu(showEtiquetaMenu === conv.id ? null : conv.id); }}
                      >
                        {conv.etiqueta_nombre}
                        {Icons.chevronDown}
                      </button>
                    )}
                    {!conv.etiqueta_nombre && (
                      <button
                        className="etiqueta-btn"
                        style={{ backgroundColor: '#f1f5f9', color: '#94a3b8', borderColor: '#e2e8f0' }}
                        onClick={(e) => { e.stopPropagation(); setShowEtiquetaMenu(showEtiquetaMenu === conv.id ? null : conv.id); }}
                      >
                        Sin etiqueta
                        {Icons.chevronDown}
                      </button>
                    )}
                    {showEtiquetaMenu === conv.id && (
                      <div className="etiqueta-menu" onClick={(e) => e.stopPropagation()}>
                        {etiquetas.map(et => (
                          <button key={et.id} className="etiqueta-option" onClick={() => handleCambiarEtiqueta(conv.id, et.id)}>
                            <span className="etiqueta-dot" style={{ backgroundColor: et.color }}></span>
                            {et.nombre}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {conversaciones.length === 0 && (
              <div className="msg-empty">
                <p>No hay conversaciones</p>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
                  Los mensajes de Facebook, Instagram, WhatsApp y Chat Web apareceran aqui
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Panel de conversacion */}
        <div className="msg-conversation-panel">
          {convActiva ? (
            <>
              <div className="conv-header">
                <div className="conv-header-info">
                  <div className="conv-avatar">
                    <div className="avatar-placeholder" style={{ width: 38, height: 38, fontSize: '0.875rem' }}>
                      {convActiva.contacto_avatar_url
                        ? <img src={convActiva.contacto_avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        : (convActiva.contacto_nombre || '?').charAt(0).toUpperCase()
                      }
                    </div>
                  </div>
                  <div>
                    <div className="conv-name-row">
                      <h3>{convActiva.contacto_nombre || 'Desconocido'}</h3>
                      {!convActiva.contacto_id && (
                        <button className="btn-add-contact" title="Agregar a contactos">
                          {Icons.userPlus}
                        </button>
                      )}
                    </div>
                    <span className="conv-origen" style={{ color: getOrigenColor(convActiva.canal) }}>
                      {getOrigenIcon(convActiva.canal)} {getOrigenLabel(convActiva.canal)}
                    </span>
                  </div>
                </div>
                <div className="conv-actions">
                  <button className="btn-icon" title="Ver propiedad">{Icons.property}</button>
                </div>
              </div>

              <div className="conv-messages">
                {loadingMensajes ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>Cargando mensajes...</div>
                ) : mensajes.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>Sin mensajes aun</div>
                ) : (
                  mensajes.map(msg => (
                    <div key={msg.id} className={`message-bubble ${msg.es_entrante ? 'incoming' : 'outgoing'}`}>
                      {msg.es_entrante && msg.remitente_nombre && (
                        <span className="message-sender">{msg.remitente_nombre}</span>
                      )}
                      <p>{msg.contenido || msg.contenido_plain || ''}</p>
                      {msg.adjuntos && msg.adjuntos.length > 0 && (
                        <div className="message-attachments">
                          {msg.adjuntos.map((att: any, i: number) => (
                            <div key={i} className="attachment-item">
                              {att.type === 'image' && att.url && (
                                <img src={att.url} alt="" style={{ maxWidth: 200, borderRadius: 8 }} />
                              )}
                              {att.type !== 'image' && (
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>[{att.type}]</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="message-meta">
                        <span className="message-time">{formatMessageTime(msg.created_at)}</span>
                        {!msg.es_entrante && msg.estado && (
                          <span className={`message-status ${msg.estado}`}>
                            {msg.estado === 'enviado' ? '✓' : msg.estado === 'entregado' ? '✓✓' : msg.estado === 'leido' ? '✓✓' : msg.estado === 'fallido' ? '!' : ''}
                          </span>
                        )}
                      </div>
                      {msg.error_mensaje && (
                        <span className="message-error">{msg.error_mensaje}</span>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="conv-input">
                <button className="btn-icon" title="Adjuntar">{Icons.attachment}</button>
                <input
                  type="text"
                  placeholder="Escribe un mensaje..."
                  value={nuevoMensaje}
                  onChange={(e) => setNuevoMensaje(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  disabled={sending}
                />
                <button
                  className="btn-send"
                  disabled={!nuevoMensaje.trim() || sending}
                  onClick={handleSendMessage}
                >
                  {Icons.send}
                </button>
              </div>
            </>
          ) : (
            <div className="conv-empty">
              <div className="empty-icon">{Icons.chats}</div>
              <h3>Selecciona una conversacion</h3>
              <p>Elige un chat de la lista para ver los mensajes</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .crm-chats { display: flex; flex-direction: column; height: calc(100vh - 140px); background: #f8fafc; }
        .msg-chats-container { display: flex; height: 100%; }
        .msg-list-panel { width: 320px; background: white; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; }
        .msg-list-header { padding: 12px; border-bottom: 1px solid #e2e8f0; }
        .msg-header-top { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
        .chat-counter { font-size: 0.8125rem; font-weight: 600; color: #0f172a; }
        .unread-counter { font-size: 0.75rem; color: #ef4444; font-weight: 500; }
        .msg-search { display: flex; align-items: center; gap: 6px; padding: 8px 10px; background: #f1f5f9; border-radius: 6px; color: #64748b; margin-bottom: 8px; }
        .msg-search input { flex: 1; border: none; background: none; font-size: 0.8125rem; color: #0f172a; }
        .msg-search input::placeholder { color: #94a3b8; }
        .msg-search input:focus { outline: none; }
        .msg-filters-row { display: flex; gap: 6px; }
        .msg-filters-row select { flex: 1; padding: 6px 8px; border: 1px solid #e2e8f0; border-radius: 5px; font-size: 0.75rem; color: #475569; background: white; cursor: pointer; }
        .msg-list { flex: 1; overflow-y: auto; }

        .msg-item { display: flex; gap: 10px; padding: 10px 12px; border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background 0.15s; }
        .msg-item:hover { background: #f8fafc; }
        .msg-item.active { background: #eff6ff; border-left: 3px solid #3b82f6; }
        .msg-item.unread { background: #fefce8; }
        .msg-item.unread.active { background: #eff6ff; }
        .msg-item-avatar { position: relative; flex-shrink: 0; }
        .msg-item-avatar .avatar-placeholder { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; font-size: 0.9375rem; font-weight: 600; overflow: hidden; }
        .origen-badge { position: absolute; bottom: -2px; right: -2px; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: white; border: 2px solid white; }
        .msg-item-content { flex: 1; min-width: 0; }
        .msg-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
        .msg-item-name { font-weight: 600; color: #0f172a; font-size: 0.8125rem; }
        .msg-item-time { font-size: 0.6875rem; color: #94a3b8; }
        .msg-item-preview { display: flex; justify-content: space-between; align-items: center; gap: 6px; margin-bottom: 4px; }
        .preview-text { flex: 1; color: #64748b; font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .unread-badge { flex-shrink: 0; min-width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; padding: 0 5px; background: #3b82f6; color: white; font-size: 0.6875rem; font-weight: 600; border-radius: 9px; }
        .msg-item-footer { position: relative; }
        .etiqueta-btn { display: flex; align-items: center; gap: 4px; padding: 2px 8px; border: 1px solid; border-radius: 4px; font-size: 0.6875rem; font-weight: 500; cursor: pointer; background: transparent; }
        .etiqueta-menu { position: absolute; top: 100%; left: 0; z-index: 100; background: white; border: 1px solid #e2e8f0; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 4px; min-width: 140px; }
        .etiqueta-option { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 10px; border: none; background: none; font-size: 0.75rem; color: #334155; cursor: pointer; border-radius: 4px; text-align: left; }
        .etiqueta-option:hover { background: #f1f5f9; }
        .etiqueta-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

        .msg-conversation-panel { flex: 1; display: flex; flex-direction: column; background: #f8fafc; }
        .conv-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: white; border-bottom: 1px solid #e2e8f0; }
        .conv-header-info { display: flex; align-items: center; gap: 10px; }
        .conv-avatar .avatar-placeholder { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; font-weight: 600; overflow: hidden; }
        .conv-name-row { display: flex; align-items: center; gap: 6px; }
        .conv-header-info h3 { margin: 0; font-size: 0.9375rem; font-weight: 600; color: #0f172a; }
        .btn-add-contact { display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; padding: 0; background: #f1f5f9; border: none; border-radius: 4px; color: #64748b; cursor: pointer; transition: all 0.15s; }
        .btn-add-contact:hover { background: #e2e8f0; color: #3b82f6; }
        .conv-origen { display: flex; align-items: center; gap: 4px; font-size: 0.75rem; }
        .conv-actions { display: flex; gap: 6px; }
        .btn-icon { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: #f1f5f9; border: none; border-radius: 6px; color: #64748b; cursor: pointer; transition: all 0.15s; }
        .btn-icon:hover { background: #e2e8f0; color: #3b82f6; }

        .conv-messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
        .message-bubble { max-width: 70%; padding: 10px 14px; border-radius: 14px; }
        .message-bubble.incoming { align-self: flex-start; background: white; border-bottom-left-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .message-bubble.outgoing { align-self: flex-end; background: #3b82f6; color: white; border-bottom-right-radius: 4px; }
        .message-sender { display: block; font-size: 0.6875rem; font-weight: 600; color: #64748b; margin-bottom: 2px; }
        .message-bubble p { margin: 0 0 2px 0; font-size: 0.875rem; line-height: 1.4; white-space: pre-wrap; word-break: break-word; }
        .message-meta { display: flex; align-items: center; gap: 4px; }
        .message-time { font-size: 0.625rem; opacity: 0.7; }
        .message-status { font-size: 0.625rem; }
        .message-status.leido { color: #3b82f6; }
        .message-status.fallido { color: #ef4444; font-weight: bold; }
        .message-error { display: block; font-size: 0.6875rem; color: #ef4444; margin-top: 2px; }
        .message-attachments { margin-top: 6px; }

        .conv-input { display: flex; align-items: center; gap: 6px; padding: 12px 20px; background: white; border-top: 1px solid #e2e8f0; }
        .conv-input input { flex: 1; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 20px; font-size: 0.875rem; background: #f8fafc; }
        .conv-input input:focus { outline: none; border-color: #3b82f6; background: white; }
        .conv-input input:disabled { opacity: 0.5; }
        .btn-send { display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; background: #3b82f6; border: none; border-radius: 50%; color: white; cursor: pointer; transition: all 0.15s; }
        .btn-send:hover:not(:disabled) { background: #2563eb; }
        .btn-send:disabled { background: #cbd5e1; cursor: not-allowed; }

        .conv-empty, .msg-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; color: #64748b; text-align: center; }
        .empty-icon { width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; background: #f1f5f9; border-radius: 50%; color: #94a3b8; margin-bottom: 12px; }
        .empty-icon svg { width: 32px; height: 32px; }
        .conv-empty h3 { margin: 0 0 4px 0; font-size: 1rem; font-weight: 600; color: #0f172a; }
        .conv-empty p { margin: 0; font-size: 0.875rem; }

        @media (max-width: 900px) {
          .msg-chats-container { flex-direction: column; }
          .msg-list-panel { width: 100%; max-height: 50vh; }
          .msg-conversation-panel { min-height: 50vh; }
        }
      `}</style>
    </div>
  );
}
