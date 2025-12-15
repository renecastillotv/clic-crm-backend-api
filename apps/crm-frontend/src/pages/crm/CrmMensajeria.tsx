/**
 * CrmMensajeria - Centro de Mensajería Unificado
 *
 * Bandeja unificada que integra:
 * - Chats: WhatsApp, Instagram, Facebook, Chat Web (sitio web)
 * - Correo Electrónico: Envío, recepción, adjuntos de propiedades
 * - Configuración: Integraciones, etiquetas, firmas, notificaciones
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';

// Tipos para el sistema de mensajería
type OrigenChat = 'whatsapp' | 'instagram_dm' | 'instagram_comment' | 'facebook_dm' | 'facebook_comment' | 'web_chat';
type EtiquetaTemp = 'caliente' | 'tibio' | 'medio' | 'frio' | 'descartado' | 'sin_calificar' | string;

interface Etiqueta {
  id: string;
  codigo: string;
  nombre: string;
  color: string;
  esDefault: boolean;
}

interface Mensaje {
  id: string;
  origen: OrigenChat;
  contactoNombre: string;
  contactoAvatar?: string;
  contactoId?: string; // Si ya está en contactos
  ultimoMensaje: string;
  timestamp: Date;
  noLeidos: number;
  conversacionId: string;
  etiqueta: EtiquetaTemp;
}

interface Email {
  id: string;
  de: string;
  para: string;
  asunto: string;
  contenido: string;
  timestamp: Date;
  leido: boolean;
  destacado: boolean;
  adjuntos: { nombre: string; tipo: string; size: number }[];
}

interface IntegracionRed {
  id: string;
  tipo: 'whatsapp' | 'instagram' | 'facebook' | 'web_chat' | 'email';
  nombre: string;
  conectado: boolean;
  cuenta?: string;
  ultimaSync?: Date;
}

// Etiquetas por defecto del sistema
const etiquetasDefault: Etiqueta[] = [
  { id: 'e1', codigo: 'caliente', nombre: 'Caliente', color: '#ef4444', esDefault: true },
  { id: 'e2', codigo: 'tibio', nombre: 'Tibio', color: '#f97316', esDefault: true },
  { id: 'e3', codigo: 'medio', nombre: 'Medio', color: '#eab308', esDefault: true },
  { id: 'e4', codigo: 'frio', nombre: 'Frío', color: '#3b82f6', esDefault: true },
  { id: 'e5', codigo: 'descartado', nombre: 'Descartado', color: '#6b7280', esDefault: true },
  { id: 'e6', codigo: 'sin_calificar', nombre: 'Sin calificar', color: '#94a3b8', esDefault: true },
];

// Iconos
const Icons = {
  chats: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  email: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  ),
  config: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
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
  star: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  starFilled: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
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
  userPlus: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="8.5" cy="7" r="4"/>
      <line x1="20" y1="8" x2="20" y2="14"/>
      <line x1="23" y1="11" x2="17" y2="11"/>
    </svg>
  ),
  check: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  link: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  ),
  bell: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  signature: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
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
  trash: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18"/>
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
    </svg>
  ),
  x: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18"/>
      <path d="m6 6 12 12"/>
    </svg>
  ),
  chevronDown: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  ),
};

// Datos de ejemplo para desarrollo
const mensajesEjemplo: Mensaje[] = [
  { id: '1', origen: 'whatsapp', contactoNombre: 'María González', ultimoMensaje: 'Hola, me interesa el depto de Polanco', timestamp: new Date(Date.now() - 5 * 60000), noLeidos: 2, conversacionId: 'conv-1', etiqueta: 'caliente' },
  { id: '2', origen: 'instagram_dm', contactoNombre: 'Carlos Rodríguez', ultimoMensaje: '¿Tienen casas en Coyoacán?', timestamp: new Date(Date.now() - 30 * 60000), noLeidos: 0, conversacionId: 'conv-2', etiqueta: 'tibio' },
  { id: '3', origen: 'facebook_comment', contactoNombre: 'Ana Martínez', ultimoMensaje: 'Comentó: "Hermosa propiedad!"', timestamp: new Date(Date.now() - 2 * 3600000), noLeidos: 1, conversacionId: 'conv-3', etiqueta: 'sin_calificar' },
  { id: '4', origen: 'web_chat', contactoNombre: 'Pedro Sánchez', ultimoMensaje: 'Busco un local comercial', timestamp: new Date(Date.now() - 3 * 3600000), noLeidos: 3, conversacionId: 'conv-4', etiqueta: 'caliente' },
  { id: '5', origen: 'instagram_comment', contactoNombre: 'Laura López', ultimoMensaje: 'Comentó: "Precio?"', timestamp: new Date(Date.now() - 5 * 3600000), noLeidos: 1, conversacionId: 'conv-5', etiqueta: 'medio' },
  { id: '6', origen: 'facebook_dm', contactoNombre: 'Roberto Herrera', ultimoMensaje: 'Lo consultaré con mi familia', timestamp: new Date(Date.now() - 24 * 3600000), noLeidos: 0, conversacionId: 'conv-6', etiqueta: 'frio', contactoId: 'contact-1' },
  { id: '7', origen: 'whatsapp', contactoNombre: 'Elena Vargas', ultimoMensaje: 'Ya no me interesa, gracias', timestamp: new Date(Date.now() - 48 * 3600000), noLeidos: 0, conversacionId: 'conv-7', etiqueta: 'descartado', contactoId: 'contact-2' },
];

const emailsEjemplo: Email[] = [
  { id: '1', de: 'cliente@ejemplo.com', para: 'agente@inmobiliaria.com', asunto: 'Consulta sobre propiedad en Reforma', contenido: 'Buenos días, me gustaría agendar una visita...', timestamp: new Date(Date.now() - 2 * 3600000), leido: false, destacado: true, adjuntos: [] },
  { id: '2', de: 'prospecto@gmail.com', para: 'agente@inmobiliaria.com', asunto: 'Re: Casa en venta Pedregal', contenido: 'Perfecto, nos vemos el jueves a las 4pm.', timestamp: new Date(Date.now() - 5 * 3600000), leido: true, destacado: false, adjuntos: [{ nombre: 'contrato.pdf', tipo: 'pdf', size: 245000 }] },
];

const integracionesEjemplo: IntegracionRed[] = [
  { id: '1', tipo: 'whatsapp', nombre: 'WhatsApp Business', conectado: true, cuenta: '+52 55 1234 5678', ultimaSync: new Date() },
  { id: '2', tipo: 'instagram', nombre: 'Instagram', conectado: true, cuenta: '@inmobiliaria_cdmx', ultimaSync: new Date() },
  { id: '3', tipo: 'facebook', nombre: 'Facebook Page', conectado: false },
  { id: '4', tipo: 'web_chat', nombre: 'Chat Web (Sitio)', conectado: true, cuenta: 'Widget activo', ultimaSync: new Date() },
  { id: '5', tipo: 'email', nombre: 'Correo Electrónico', conectado: true, cuenta: 'agente@inmobiliaria.com', ultimaSync: new Date() },
];

type TabType = 'chats' | 'email' | 'config';
type EmailFolder = 'inbox' | 'sent' | 'starred';

export default function CrmMensajeria() {
  const { tenantActual } = useAuth();
  const { setPageHeader } = usePageHeader();

  const [activeTab, setActiveTab] = useState<TabType>('chats');
  const [mensajes, setMensajes] = useState<Mensaje[]>(mensajesEjemplo);
  const [emails, setEmails] = useState<Email[]>(emailsEjemplo);
  const [integraciones, setIntegraciones] = useState<IntegracionRed[]>(integracionesEjemplo);
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>(etiquetasDefault);
  const [conversacionActiva, setConversacionActiva] = useState<string | null>(null);
  const [emailActivo, setEmailActivo] = useState<string | null>(null);
  const [emailFolder, setEmailFolder] = useState<EmailFolder>('inbox');
  const [filtroOrigen, setFiltroOrigen] = useState<string>('todos');
  const [filtroEtiqueta, setFiltroEtiqueta] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [showEtiquetaMenu, setShowEtiquetaMenu] = useState<string | null>(null);
  const [showAddContactModal, setShowAddContactModal] = useState<string | null>(null);

  // Configuración
  const [firmaEmail, setFirmaEmail] = useState('');
  const [notifChats, setNotifChats] = useState(true);
  const [notifEmails, setNotifEmails] = useState(true);
  const [notifSonido, setNotifSonido] = useState(true);
  const [autoRegistrarContactos, setAutoRegistrarContactos] = useState(false);
  const [nuevaEtiquetaNombre, setNuevaEtiquetaNombre] = useState('');
  const [nuevaEtiquetaColor, setNuevaEtiquetaColor] = useState('#8b5cf6');

  // Configurar header de la página
  useEffect(() => {
    setPageHeader({
      title: 'Mensajería',
      subtitle: 'Centro de comunicaciones unificado',
    });
  }, [setPageHeader]);

  // Helpers
  const formatTimeAgo = (date: Date) => {
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

  const getOrigenIcon = (origen: string) => {
    switch (origen) {
      case 'whatsapp': return Icons.whatsapp;
      case 'instagram_dm':
      case 'instagram_comment': return Icons.instagram;
      case 'facebook_dm':
      case 'facebook_comment': return Icons.facebook;
      case 'web_chat': return Icons.webChat;
      case 'email': return Icons.email;
      default: return Icons.chats;
    }
  };

  const getOrigenColor = (origen: string) => {
    switch (origen) {
      case 'whatsapp': return '#25D366';
      case 'instagram_dm':
      case 'instagram_comment': return '#E4405F';
      case 'facebook_dm':
      case 'facebook_comment': return '#1877F2';
      case 'web_chat': return '#8b5cf6';
      case 'email': return '#3b82f6';
      default: return '#64748b';
    }
  };

  const getOrigenLabel = (origen: string) => {
    switch (origen) {
      case 'whatsapp': return 'WhatsApp';
      case 'instagram_dm': return 'Instagram DM';
      case 'instagram_comment': return 'Instagram';
      case 'facebook_dm': return 'Facebook DM';
      case 'facebook_comment': return 'Facebook';
      case 'web_chat': return 'Chat Web';
      case 'email': return 'Email';
      default: return origen;
    }
  };

  const getEtiqueta = (codigo: string): Etiqueta | undefined => {
    return etiquetas.find(e => e.codigo === codigo);
  };

  const mensajesFiltrados = mensajes.filter(m => {
    if (filtroOrigen !== 'todos' && !m.origen.includes(filtroOrigen)) return false;
    if (filtroEtiqueta !== 'todos' && m.etiqueta !== filtroEtiqueta) return false;
    if (busqueda && !m.contactoNombre.toLowerCase().includes(busqueda.toLowerCase()) &&
        !m.ultimoMensaje.toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

  const emailsFiltrados = emails.filter(e => {
    if (emailFolder === 'starred' && !e.destacado) return false;
    if (busqueda && !e.de.toLowerCase().includes(busqueda.toLowerCase()) &&
        !e.asunto.toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

  const totalNoLeidos = mensajes.reduce((acc, m) => acc + m.noLeidos, 0);
  const totalEmailsNoLeidos = emails.filter(e => !e.leido).length;
  const totalChats = mensajes.length;

  const cambiarEtiqueta = (mensajeId: string, nuevaEtiqueta: string) => {
    setMensajes(mensajes.map(m =>
      m.id === mensajeId ? { ...m, etiqueta: nuevaEtiqueta } : m
    ));
    setShowEtiquetaMenu(null);
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

  const agregarAContactos = (mensajeId: string) => {
    // En producción, esto llamaría a la API para crear el contacto
    setMensajes(mensajes.map(m =>
      m.id === mensajeId ? { ...m, contactoId: `contact-new-${Date.now()}` } : m
    ));
    setShowAddContactModal(null);
  };

  // Render Tabs
  const renderTabs = () => (
    <div className="msg-tabs">
      <button className={`msg-tab ${activeTab === 'chats' ? 'active' : ''}`} onClick={() => setActiveTab('chats')}>
        {Icons.chats}
        <span>Chats</span>
        {totalNoLeidos > 0 && <span className="tab-badge">{totalNoLeidos}</span>}
      </button>
      <button className={`msg-tab ${activeTab === 'email' ? 'active' : ''}`} onClick={() => setActiveTab('email')}>
        {Icons.email}
        <span>Correo Electrónico</span>
        {totalEmailsNoLeidos > 0 && <span className="tab-badge">{totalEmailsNoLeidos}</span>}
      </button>
      <button className={`msg-tab ${activeTab === 'config' ? 'active' : ''}`} onClick={() => setActiveTab('config')}>
        {Icons.config}
        <span>Configuración</span>
      </button>
    </div>
  );

  // Render Chats Tab
  const renderChatsTab = () => (
    <div className="msg-chats-container">
      {/* Lista de conversaciones */}
      <div className="msg-list-panel">
        <div className="msg-list-header">
          <div className="msg-header-top">
            <span className="chat-counter">{totalChats} chats</span>
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
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="web_chat">Chat Web</option>
            </select>
            <select value={filtroEtiqueta} onChange={(e) => setFiltroEtiqueta(e.target.value)}>
              <option value="todos">Etiquetas</option>
              {etiquetas.map(et => (
                <option key={et.id} value={et.codigo}>{et.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="msg-list">
          {mensajesFiltrados.map(mensaje => {
            const etiquetaInfo = getEtiqueta(mensaje.etiqueta);
            return (
              <div
                key={mensaje.id}
                className={`msg-item ${conversacionActiva === mensaje.conversacionId ? 'active' : ''} ${mensaje.noLeidos > 0 ? 'unread' : ''}`}
                onClick={() => setConversacionActiva(mensaje.conversacionId)}
              >
                <div className="msg-item-avatar">
                  <div className="avatar-placeholder">{mensaje.contactoNombre.charAt(0).toUpperCase()}</div>
                  <span className="origen-badge" style={{ backgroundColor: getOrigenColor(mensaje.origen) }}>
                    {getOrigenIcon(mensaje.origen)}
                  </span>
                </div>
                <div className="msg-item-content">
                  <div className="msg-item-header">
                    <span className="msg-item-name">{mensaje.contactoNombre}</span>
                    <span className="msg-item-time">{formatTimeAgo(mensaje.timestamp)}</span>
                  </div>
                  <div className="msg-item-preview">
                    <span className="preview-text">{mensaje.ultimoMensaje}</span>
                    {mensaje.noLeidos > 0 && <span className="unread-badge">{mensaje.noLeidos}</span>}
                  </div>
                  <div className="msg-item-footer">
                    <button
                      className="etiqueta-btn"
                      style={{ backgroundColor: `${etiquetaInfo?.color}20`, color: etiquetaInfo?.color, borderColor: `${etiquetaInfo?.color}40` }}
                      onClick={(e) => { e.stopPropagation(); setShowEtiquetaMenu(showEtiquetaMenu === mensaje.id ? null : mensaje.id); }}
                    >
                      {etiquetaInfo?.nombre || 'Sin calificar'}
                      {Icons.chevronDown}
                    </button>
                    {showEtiquetaMenu === mensaje.id && (
                      <div className="etiqueta-menu" onClick={(e) => e.stopPropagation()}>
                        {etiquetas.map(et => (
                          <button key={et.id} className="etiqueta-option" onClick={() => cambiarEtiqueta(mensaje.id, et.codigo)}>
                            <span className="etiqueta-dot" style={{ backgroundColor: et.color }}></span>
                            {et.nombre}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {mensajesFiltrados.length === 0 && (
            <div className="msg-empty"><p>No hay conversaciones</p></div>
          )}
        </div>
      </div>

      {/* Panel de conversación */}
      <div className="msg-conversation-panel">
        {conversacionActiva ? (
          <>
            <div className="conv-header">
              {(() => {
                const msg = mensajes.find(m => m.conversacionId === conversacionActiva);
                return msg ? (
                  <>
                    <div className="conv-header-info">
                      <div className="conv-avatar">
                        <div className="avatar-placeholder">{msg.contactoNombre.charAt(0).toUpperCase()}</div>
                      </div>
                      <div>
                        <div className="conv-name-row">
                          <h3>{msg.contactoNombre}</h3>
                          {!msg.contactoId && (
                            <button className="btn-add-contact" onClick={() => setShowAddContactModal(msg.id)} title="Agregar a contactos">
                              {Icons.userPlus}
                            </button>
                          )}
                        </div>
                        <span className="conv-origen" style={{ color: getOrigenColor(msg.origen) }}>
                          {getOrigenIcon(msg.origen)} {getOrigenLabel(msg.origen)}
                        </span>
                      </div>
                    </div>
                    <div className="conv-actions">
                      <button className="btn-icon" title="Ver propiedad">{Icons.property}</button>
                    </div>
                  </>
                ) : null;
              })()}
            </div>

            <div className="conv-messages">
              <div className="message-bubble incoming">
                <p>Hola, me interesa el departamento de Polanco que vi en su sitio web.</p>
                <span className="message-time">10:30 AM</span>
              </div>
              <div className="message-bubble outgoing">
                <p>Claro, con gusto te ayudo. ¿Qué te gustaría saber?</p>
                <span className="message-time">10:32 AM</span>
              </div>
              <div className="message-bubble incoming">
                <p>¿Cuál es el precio y tienen disponibilidad para visitarla?</p>
                <span className="message-time">10:35 AM</span>
              </div>
            </div>

            <div className="conv-input">
              <button className="btn-icon" title="Adjuntar">{Icons.attachment}</button>
              <button className="btn-icon" title="Propiedad">{Icons.property}</button>
              <input
                type="text"
                placeholder="Escribe un mensaje..."
                value={nuevoMensaje}
                onChange={(e) => setNuevoMensaje(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && nuevoMensaje.trim() && setNuevoMensaje('')}
              />
              <button className="btn-send" disabled={!nuevoMensaje.trim()} onClick={() => setNuevoMensaje('')}>
                {Icons.send}
              </button>
            </div>
          </>
        ) : (
          <div className="conv-empty">
            <div className="empty-icon">{Icons.chats}</div>
            <h3>Selecciona una conversación</h3>
            <p>Elige un chat de la lista</p>
          </div>
        )}
      </div>

      {/* Modal agregar contacto */}
      {showAddContactModal && (
        <div className="modal-overlay" onClick={() => setShowAddContactModal(null)}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
            <h4>Agregar a contactos</h4>
            <p>¿Deseas agregar a <strong>{mensajes.find(m => m.id === showAddContactModal)?.contactoNombre}</strong> a tus contactos?</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowAddContactModal(null)}>Cancelar</button>
              <button className="btn-primary" onClick={() => agregarAContactos(showAddContactModal)}>Agregar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render Email Tab
  const renderEmailTab = () => (
    <div className="msg-email-container">
      <div className="email-sidebar">
        <button className="btn-compose">{Icons.plus} Redactar</button>
        <div className="email-folders">
          <button className={`folder-btn ${emailFolder === 'inbox' ? 'active' : ''}`} onClick={() => setEmailFolder('inbox')}>
            {Icons.inbox}<span>Bandeja</span>
            {totalEmailsNoLeidos > 0 && <span className="folder-badge">{totalEmailsNoLeidos}</span>}
          </button>
          <button className={`folder-btn ${emailFolder === 'sent' ? 'active' : ''}`} onClick={() => setEmailFolder('sent')}>
            {Icons.sent}<span>Enviados</span>
          </button>
          <button className={`folder-btn ${emailFolder === 'starred' ? 'active' : ''}`} onClick={() => setEmailFolder('starred')}>
            {Icons.starFilled}<span>Destacados</span>
          </button>
        </div>
      </div>

      <div className="email-list-panel">
        <div className="email-list-header">
          <div className="msg-search">
            {Icons.search}
            <input type="text" placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
        </div>
        <div className="email-list">
          {emailsFiltrados.map(email => (
            <div key={email.id} className={`email-item ${emailActivo === email.id ? 'active' : ''} ${!email.leido ? 'unread' : ''}`} onClick={() => setEmailActivo(email.id)}>
              <button className={`btn-star ${email.destacado ? 'starred' : ''}`} onClick={(e) => { e.stopPropagation(); setEmails(emails.map(e => e.id === email.id ? { ...e, destacado: !e.destacado } : e)); }}>
                {email.destacado ? Icons.starFilled : Icons.star}
              </button>
              <div className="email-item-content">
                <div className="email-item-header">
                  <span className="email-from">{email.de}</span>
                  <span className="email-time">{formatTimeAgo(email.timestamp)}</span>
                </div>
                <div className="email-subject">{email.asunto}</div>
                <div className="email-preview">{email.contenido}</div>
              </div>
              {email.adjuntos.length > 0 && <span className="email-attachment">{Icons.attachment}</span>}
            </div>
          ))}
          {emailsFiltrados.length === 0 && <div className="msg-empty"><p>No hay correos</p></div>}
        </div>
      </div>

      <div className="email-read-panel">
        {emailActivo ? (
          (() => {
            const email = emails.find(e => e.id === emailActivo);
            return email ? (
              <>
                <div className="email-header">
                  <h2>{email.asunto}</h2>
                  <div className="email-meta">
                    <span className="email-from-full">De: {email.de}</span>
                    <span className="email-date">{email.timestamp.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                <div className="email-body"><p>{email.contenido}</p></div>
                {email.adjuntos.length > 0 && (
                  <div className="email-attachments">
                    <h4>Adjuntos</h4>
                    {email.adjuntos.map((adj, idx) => (
                      <div key={idx} className="attachment-item">{Icons.attachment}<span>{adj.nombre}</span><span className="attachment-size">{(adj.size / 1024).toFixed(0)} KB</span></div>
                    ))}
                  </div>
                )}
                <div className="email-actions">
                  <button className="btn-secondary">Responder</button>
                  <button className="btn-secondary">Reenviar</button>
                  <button className="btn-secondary">{Icons.property} Adjuntar propiedad</button>
                </div>
              </>
            ) : null;
          })()
        ) : (
          <div className="conv-empty">
            <div className="empty-icon">{Icons.email}</div>
            <h3>Selecciona un correo</h3>
            <p>Elige un correo de la lista</p>
          </div>
        )}
      </div>
    </div>
  );

  // Render Config Tab
  const renderConfigTab = () => (
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
    </div>
  );

  return (
    <div className="crm-mensajeria">
      {renderTabs()}
      <div className="msg-content">
        {activeTab === 'chats' && renderChatsTab()}
        {activeTab === 'email' && renderEmailTab()}
        {activeTab === 'config' && renderConfigTab()}
      </div>

      <style>{`
        .crm-mensajeria { display: flex; flex-direction: column; height: calc(100vh - 140px); background: #f8fafc; }

        /* Tabs */
        .msg-tabs { display: flex; gap: 4px; padding: 0 24px; background: white; border-bottom: 1px solid #e2e8f0; }
        .msg-tab { display: flex; align-items: center; gap: 8px; padding: 14px 20px; background: none; border: none; border-bottom: 2px solid transparent; color: #64748b; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .msg-tab:hover { color: #3b82f6; background: #f8fafc; }
        .msg-tab.active { color: #3b82f6; border-bottom-color: #3b82f6; }
        .tab-badge { display: flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 5px; background: #ef4444; color: white; font-size: 0.6875rem; font-weight: 600; border-radius: 9px; }
        .msg-content { flex: 1; overflow: hidden; }

        /* Chats Tab */
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
        .msg-item-avatar .avatar-placeholder { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; font-size: 0.9375rem; font-weight: 600; }
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

        /* Conversation Panel */
        .msg-conversation-panel { flex: 1; display: flex; flex-direction: column; background: #f8fafc; }
        .conv-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: white; border-bottom: 1px solid #e2e8f0; }
        .conv-header-info { display: flex; align-items: center; gap: 10px; }
        .conv-avatar .avatar-placeholder { width: 38px; height: 38px; font-size: 0.875rem; }
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
        .message-bubble p { margin: 0 0 2px 0; font-size: 0.875rem; line-height: 1.4; }
        .message-time { font-size: 0.625rem; opacity: 0.7; }

        .conv-input { display: flex; align-items: center; gap: 6px; padding: 12px 20px; background: white; border-top: 1px solid #e2e8f0; }
        .conv-input input { flex: 1; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 20px; font-size: 0.875rem; background: #f8fafc; }
        .conv-input input:focus { outline: none; border-color: #3b82f6; background: white; }
        .btn-send { display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; background: #3b82f6; border: none; border-radius: 50%; color: white; cursor: pointer; transition: all 0.15s; }
        .btn-send:hover:not(:disabled) { background: #2563eb; }
        .btn-send:disabled { background: #cbd5e1; cursor: not-allowed; }

        .conv-empty, .msg-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; color: #64748b; }
        .empty-icon { width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; background: #f1f5f9; border-radius: 50%; color: #94a3b8; margin-bottom: 12px; }
        .empty-icon svg { width: 32px; height: 32px; }
        .conv-empty h3 { margin: 0 0 4px 0; font-size: 1rem; font-weight: 600; color: #0f172a; }
        .conv-empty p { margin: 0; font-size: 0.875rem; }

        /* Modal */
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { background: white; border-radius: 12px; padding: 24px; max-width: 400px; width: 90%; }
        .modal-content.small { max-width: 340px; }
        .modal-content h4 { margin: 0 0 8px 0; font-size: 1rem; font-weight: 600; color: #0f172a; }
        .modal-content p { margin: 0 0 20px 0; font-size: 0.875rem; color: #64748b; }
        .modal-actions { display: flex; gap: 8px; justify-content: flex-end; }

        /* Email Tab */
        .msg-email-container { display: flex; height: 100%; }
        .email-sidebar { width: 180px; background: white; border-right: 1px solid #e2e8f0; padding: 12px; }
        .btn-compose { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; padding: 10px 14px; background: #3b82f6; color: white; border: none; border-radius: 6px; font-size: 0.8125rem; font-weight: 500; cursor: pointer; margin-bottom: 16px; transition: background 0.15s; }
        .btn-compose:hover { background: #2563eb; }
        .email-folders { display: flex; flex-direction: column; gap: 2px; }
        .folder-btn { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 10px; background: none; border: none; border-radius: 5px; color: #475569; font-size: 0.8125rem; cursor: pointer; transition: all 0.15s; text-align: left; }
        .folder-btn:hover { background: #f1f5f9; }
        .folder-btn.active { background: #eff6ff; color: #3b82f6; }
        .folder-badge { margin-left: auto; min-width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; padding: 0 5px; background: #ef4444; color: white; font-size: 0.6875rem; font-weight: 600; border-radius: 9px; }

        .email-list-panel { width: 300px; background: white; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; }
        .email-list-header { padding: 12px; border-bottom: 1px solid #e2e8f0; }
        .email-list { flex: 1; overflow-y: auto; }
        .email-item { display: flex; align-items: flex-start; gap: 6px; padding: 12px; border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background 0.15s; }
        .email-item:hover { background: #f8fafc; }
        .email-item.active { background: #eff6ff; }
        .email-item.unread { background: #fefce8; }
        .email-item.unread .email-from, .email-item.unread .email-subject { font-weight: 600; }
        .btn-star { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; background: none; border: none; color: #cbd5e1; cursor: pointer; transition: color 0.15s; flex-shrink: 0; }
        .btn-star:hover { color: #fbbf24; }
        .btn-star.starred { color: #fbbf24; }
        .email-item-content { flex: 1; min-width: 0; }
        .email-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
        .email-from { font-size: 0.8125rem; color: #0f172a; }
        .email-time { font-size: 0.6875rem; color: #94a3b8; flex-shrink: 0; }
        .email-subject { font-size: 0.8125rem; color: #0f172a; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .email-preview { font-size: 0.75rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .email-attachment { color: #94a3b8; flex-shrink: 0; }

        .email-read-panel { flex: 1; display: flex; flex-direction: column; background: white; overflow-y: auto; }
        .email-header { padding: 20px; border-bottom: 1px solid #e2e8f0; }
        .email-header h2 { margin: 0 0 12px 0; font-size: 1.125rem; font-weight: 600; color: #0f172a; }
        .email-meta { display: flex; flex-direction: column; gap: 2px; }
        .email-from-full { font-size: 0.875rem; color: #475569; }
        .email-date { font-size: 0.75rem; color: #94a3b8; }
        .email-body { flex: 1; padding: 20px; line-height: 1.6; color: #334155; font-size: 0.875rem; }
        .email-body p { margin: 0; }
        .email-attachments { padding: 0 20px 20px; }
        .email-attachments h4 { margin: 0 0 10px 0; font-size: 0.8125rem; color: #64748b; font-weight: 500; }
        .attachment-item { display: flex; align-items: center; gap: 6px; padding: 8px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 5px; color: #475569; font-size: 0.8125rem; }
        .attachment-size { color: #94a3b8; margin-left: auto; font-size: 0.75rem; }
        .email-actions { display: flex; gap: 6px; padding: 14px 20px; border-top: 1px solid #e2e8f0; }
        .btn-secondary { display: flex; align-items: center; gap: 5px; padding: 8px 14px; background: white; border: 1px solid #e2e8f0; border-radius: 5px; color: #475569; font-size: 0.8125rem; font-weight: 500; cursor: pointer; transition: all 0.15s; }
        .btn-secondary:hover { background: #f8fafc; border-color: #cbd5e1; }

        /* Config Tab */
        .msg-config-container { padding: 20px; overflow-y: auto; height: 100%; }
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

        @media (max-width: 1100px) {
          .msg-list-panel { width: 280px; }
          .email-list-panel { width: 260px; }
        }
        @media (max-width: 900px) {
          .msg-chats-container, .msg-email-container { flex-direction: column; }
          .msg-list-panel, .email-list-panel, .email-sidebar { width: 100%; max-height: 50vh; }
          .msg-conversation-panel, .email-read-panel { min-height: 50vh; }
        }
      `}</style>
    </div>
  );
}
