/**
 * CrmPropiedadEditar - Crear/Editar propiedad
 * 
 * Página completa para crear y editar propiedades con todos los campos
 * organizados en secciones lógicas y aprovechando todo el espacio disponible.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useCatalogos } from '../../contexts/CatalogosContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import {
  Settings, Home, Image as ImageIcon, Building2, FileText, Share2,
  Bed, Bath, ShowerHead, Car, Maximize, DollarSign, BarChart3, Calendar
} from 'lucide-react';
import ImageUploader, { type PendingImage } from '../../components/ImageUploader';
import RichTextEditor from '../../components/RichTextEditor';
import NumberToggle from '../../components/NumberToggle';
import RangeSelector from '../../components/RangeSelector';
import AmenidadModal from '../../components/AmenidadModal';
import TipologiaModal from '../../components/TipologiaModal';
import EtapaModal from '../../components/EtapaModal';
import ContentRelationModal from '../../components/ContentRelationModal';
import DocumentoUpload from '../../components/DocumentoUpload';
import DocumentoModal from '../../components/DocumentoModal';
import ToggleSwitch from '../../components/ToggleSwitch';
import UserPickerModal from '../../components/UserPickerModal';
import DatePicker from '../../components/DatePicker';
import ContactPicker from '../../components/ContactPicker';
import UbicacionCompleta from '../../components/UbicacionCompleta';
import {
  getUsuariosTenant,
  getContactos,
  createContacto,
  getAmenidadesPorCategoria,
  createAmenidadTenant,
  getOperacionesCatalogo,
  getCategoriasPropiedadesCatalogo,
  getTenantFeatures,
  getTenantComisionConfig,
  getTenantMonedas,
  type UsuarioTenant,
  type Contacto,
  type Amenidad,
  type Operacion,
  type CategoriaPropiedad,
  type FeatureWithTenantStatus,
  type Moneda
} from '../../services/api';
import {
  getPropiedadCrm,
  createPropiedadCrm,
  updatePropiedadCrm,
  regeneratePropiedadSlugs,
  Propiedad,
  TipoPropiedad,
  OperacionPropiedad,
  EstadoPropiedad,
} from '../../services/api';

// Iconos SVG
const Icons = {
  arrowLeft: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
  save: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
  ),
  loader: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" y1="2" x2="12" y2="6"/>
      <line x1="12" y1="18" x2="12" y2="22"/>
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
      <line x1="2" y1="12" x2="6" y2="12"/>
      <line x1="18" y1="12" x2="22" y2="12"/>
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
    </svg>
  ),
  home: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  mapPin: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  dollar: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  grid: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/>
    </svg>
  ),
  image: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  ),
  settings: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3m15.364 6.364l-4.243-4.243m0 8.485l4.243-4.243M4.636 4.636l4.243 4.243m0-8.485L4.636 4.636"/>
    </svg>
  ),
  plus: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  x: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
};

// TIPOS_PROPIEDAD y OPERACIONES ahora se cargan desde la base de datos

const ESTADOS: { value: EstadoPropiedad; label: string; color: string }[] = [
  { value: 'disponible', label: 'Disponible', color: '#10b981' },
  { value: 'reservada', label: 'Reservada', color: '#f59e0b' },
  { value: 'vendida', label: 'Vendida', color: '#3b82f6' },
  { value: 'rentada', label: 'Rentada', color: '#8b5cf6' },
  { value: 'inactiva', label: 'Inactiva', color: '#6b7280' },
];

// MONEDAS ahora se cargan desde la base de datos por tenant

// AMENIDADES_COMUNES ahora se cargan desde la base de datos

type TabId = 'basica' | 'proyecto' | 'multimedia' | 'estado' | 'contenido' | 'portales';

interface Tab {
  id: TabId;
  name: string;
  icon: any;
}

const BASE_TABS: Tab[] = [
  { id: 'basica', name: 'Información Principal', icon: Home },
  { id: 'estado', name: 'Estado y Configuración', icon: Settings },
  { id: 'multimedia', name: 'Fotos y Contenido', icon: ImageIcon },
  { id: 'contenido', name: 'SEO y Documentación', icon: FileText },
  { id: 'portales', name: 'Portales y Redes', icon: Share2 },
];

const PROYECTO_TAB: Tab = { id: 'proyecto', name: 'Datos del Proyecto', icon: Building2 };

// Función para generar slug desde título
const generarSlug = (titulo: string): string => {
  return titulo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^a-z0-9\s-]/g, '') // Eliminar caracteres especiales
    .trim()
    .replace(/\s+/g, '-') // Reemplazar espacios con guiones
    .replace(/-+/g, '-'); // Eliminar guiones múltiples
};

export default function CrmPropiedadEditar() {
  const { tenantSlug, propiedadId } = useParams<{ tenantSlug: string; propiedadId: string }>();
  const { tenantActual } = useAuth();
  const { getToken } = useClerkAuth();
  const { etiquetasPropiedad } = useCatalogos();
  const { setPageHeader } = usePageHeader();
  const navigate = useNavigate();

  const isEditing = propiedadId && propiedadId !== 'nuevo';
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('basica');
  const [propiedad, setPropiedad] = useState<Propiedad | null>(null);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const imageUploaderRef = useRef<(() => PendingImage[]) | null>(null);
  const [pendingDocuments, setPendingDocuments] = useState<Array<{
    id: string;
    tipo: string;
    nombre: string;
    file: File;
    uploaded?: boolean;
    url?: string;
  }>>([]);
  // Ref para almacenar los archivos de documentos y evitar que se pierdan
  const documentosFilesRef = useRef<Map<string, File>>(new Map());
  const [showAmenidadModal, setShowAmenidadModal] = useState(false);
  const [showTipologiaModal, setShowTipologiaModal] = useState(false);
  const [tipologiaEditando, setTipologiaEditando] = useState<{
    id: string;
    nombre: string;
    habitaciones: string;
    banos: string;
    medios_banos: string;
    studio: boolean;
    estacionamiento: string;
    precio: string;
    m2: string;
  } | null>(null);
  const [showEtapaModal, setShowEtapaModal] = useState(false);
  const [etapaEditando, setEtapaEditando] = useState<{
    id: string;
    nombre: string;
    fecha_entrega: string;
  } | null>(null);
  const [showFaqsModal, setShowFaqsModal] = useState(false);
  const [showVideosModal, setShowVideosModal] = useState(false);
  const [showArticulosModal, setShowArticulosModal] = useState(false);
  const [showDocumentoModal, setShowDocumentoModal] = useState(false);
  const [showCaptadorModal, setShowCaptadorModal] = useState(false);
  const [showCocaptadoresModal, setShowCocaptadoresModal] = useState(false);
  const [showCreateContactModal, setShowCreateContactModal] = useState(false);
  const [usuarios, setUsuarios] = useState<UsuarioTenant[]>([]);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [loadingContactos, setLoadingContactos] = useState(false);
  const [amenidadesCatalogo, setAmenidadesCatalogo] = useState<Record<string, Amenidad[]>>({});
  const [loadingAmenidades, setLoadingAmenidades] = useState(false);
  const [operacionesCatalogo, setOperacionesCatalogo] = useState<Operacion[]>([]);
  const [categoriasCatalogo, setCategoriasCatalogo] = useState<CategoriaPropiedad[]>([]);
  const [monedasCatalogo, setMonedasCatalogo] = useState<Moneda[]>([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);
  const [hasConnectFeature, setHasConnectFeature] = useState(false);
  const [tenantComisionDefaults, setTenantComisionDefaults] = useState({
    red_global_comision_default: '',
    connect_comision_default: ''
  });
  const { user } = useAuth();

  // Formulario completo
  const [form, setForm] = useState({
    // Información Básica
    titulo: '',
    nombre_privado: '',
    codigo: '',
    descripcion: '',
    tipo: 'apartamento' as TipoPropiedad, // slug del catálogo
    operacion: 'venta' as OperacionPropiedad, // slug del catálogo
    
    // Ubicación
    pais: 'República Dominicana',
    provincia: '',
    ciudad: '',
    sector: '',
    direccion: '',
    latitud: '',
    longitud: '',
    mostrar_ubicacion_exacta: true,
    
    // Precios
    precio_venta: '',
    precio_alquiler: '',
    precio_alquiler_temporal: '',
    precio_venta_amueblado: '',
    precio_alquiler_amueblado: '',
    maintenance: '',
    moneda: 'USD',
    comision: '',
    comision_nota: '',

    // Características
    habitaciones: '',
    banos: '',
    medios_banos: '',
    bano_visita: false,
    cuarto_servicio: false,
    estacionamientos: '',
    m2_construccion: '',
    m2_terreno: '',
    antiguedad: '',
    pisos: '',
    floor_level: '',
    year_built: '',
    condition: '',
    amenidades: [] as string[],
    
    // Multimedia
    imagen_principal: '',
    imagenes: [] as string[],
    video_url: '',
    tour_virtual_url: '',
    
    // Estado
    publicada: true,
    destacada: false,
    exclusiva: false,
    etiquetas: [] as string[],
    is_project: false,
    is_furnished: false,
    
    // Relaciones
    captador_id: '',
    cocaptadores_ids: [] as string[], // Array para múltiples cocaptadores
    propietario_id: '',
    correo_reporte: '',
    desarrollador_id: '',
    
    // SEO
    slug: '',
    slug_traducciones: {} as Record<string, string>,
    short_description: '',
    traducciones: {} as Record<string, {
      titulo?: string;
      descripcion?: string;
      short_description?: string;
      meta_title?: string;
      meta_description?: string;
    }>,
    meta_title: '',
    meta_description: '',
    keywords: [] as string[],
    tags: [] as string[],
    
    // Documentación
    documentos: [] as Array<{
      id: string;
      tipo: string;
      nombre: string;
      url: string;
      fecha_subida?: string;
    }>,
    
    // Notas
    notas: '',

    // Datos del Proyecto
    tipologias: [] as Array<{
      id: string;
      nombre: string;
      habitaciones: string;
      banos: string;
      medios_banos: string;
      studio: boolean;
      estacionamiento: string;
      precio: string;
      m2: string;
    }>,
    planes_pago: {
      reserva_valor: '',
      separacion: '',
      inicial_construccion: '',
      contra_entrega: '',
    },
    etapas: [] as Array<{
      id: string;
      nombre: string;
      fecha_entrega: string;
    }>,
    beneficios: [] as string[],
    garantias: [] as string[],

    // Portales y Redes
    red_global: true,
    red_global_comision: '',
    red_afiliados: true,
    connect: true,
    portales: {
      mercadolibre: true,
      easybroker: true,
      corotos: true,
    } as Record<string, boolean>,
  });

  // Ref para mantener el valor actual del form (evita closures stale)
  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  // Configurar header
  useEffect(() => {
    setPageHeader({
      title: isEditing ? 'Editar Propiedad' : 'Nueva Propiedad',
      subtitle: isEditing 
        ? 'Modifica la información de la propiedad' 
        : 'Agrega una nueva propiedad al inventario',
      backButton: {
        label: 'Volver a Propiedades',
        onClick: () => navigate(`/crm/${tenantSlug}/propiedades`),
      },
      actions: (
        <button 
          className="btn-primary" 
          onClick={handleSave}
          disabled={saving || !form.titulo.trim()}
        >
          {saving ? <Icons.loader className="spin" /> : <Icons.save />}
          {saving ? 'Guardando...' : 'Guardar Propiedad'}
        </button>
      ),
    });
  }, [setPageHeader, isEditing, tenantSlug, navigate, saving, form.titulo]);

  // Cargar datos - usamos un ref para trackear qué combinación tenant+propiedad ya fue cargado
  const loadedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    // Flag de cancelación para evitar race conditions
    let isCancelled = false;

    async function cargarDatos() {
      if (!tenantActual?.id || !isEditing || !propiedadId) return;

      // Crear una key única que combine tenant + propiedad
      const loadKey = `${tenantActual.id}:${propiedadId}`;

      // IMPORTANTE: Solo cargar si es una combinación diferente a la ya cargada
      if (loadedKeyRef.current === loadKey) {
        console.log('⚠️ Propiedad', propiedadId, 'para tenant', tenantActual.id, 'ya cargada, ignorando');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const token = await getToken();

        // Verificar si fue cancelado antes de continuar
        if (isCancelled) {
          console.log('🚫 Request cancelado (token obtenido pero tenant cambió)');
          return;
        }

        const propiedadData = await getPropiedadCrm(tenantActual.id, propiedadId, token);

        // Verificar de nuevo si fue cancelado después de obtener la propiedad
        if (isCancelled) {
          console.log('🚫 Request cancelado (datos recibidos pero tenant cambió)');
          return;
        }

        setPropiedad(propiedadData);
        
        setForm({
          titulo: propiedadData.titulo || '',
          nombre_privado: (propiedadData as any).nombre_privado || '',
          codigo: propiedadData.codigo || '',
          descripcion: propiedadData.descripcion || '',
          tipo: propiedadData.tipo || 'casa',
          operacion: propiedadData.operacion || 'venta',
          
          pais: propiedadData.pais || 'República Dominicana',
          provincia: propiedadData.provincia || '',
          ciudad: propiedadData.ciudad || '',
          sector: propiedadData.sector || '',
          direccion: propiedadData.direccion || '',
          latitud: propiedadData.latitud?.toString() || '',
          longitud: propiedadData.longitud?.toString() || '',
          mostrar_ubicacion_exacta: propiedadData.mostrar_ubicacion_exacta !== undefined ? propiedadData.mostrar_ubicacion_exacta : true,
          
          precio_venta: (propiedadData as any).precio_venta?.toString() || '',
          precio_alquiler: (propiedadData as any).precio_alquiler?.toString() || '',
          precio_alquiler_temporal: (propiedadData as any).precio_alquiler_temporal?.toString() || '',
          precio_venta_amueblado: (propiedadData as any).precio_venta_amueblado?.toString() || '',
          precio_alquiler_amueblado: (propiedadData as any).precio_alquiler_amueblado?.toString() || '',
          maintenance: (propiedadData as any).maintenance?.toString() || '',
          moneda: propiedadData.moneda || 'USD',
          comision: (propiedadData as any).comision?.toString() || '',
          comision_nota: (propiedadData as any).comision_nota || '',

          habitaciones: propiedadData.habitaciones?.toString() || '',
          banos: propiedadData.banos?.toString() || '',
          medios_banos: propiedadData.medios_banos?.toString() || '',
          bano_visita: (propiedadData as any).bano_visita || false,
          cuarto_servicio: (propiedadData as any).cuarto_servicio || false,
          estacionamientos: propiedadData.estacionamientos?.toString() || '',
          m2_construccion: propiedadData.m2_construccion?.toString() || '',
          m2_terreno: propiedadData.m2_terreno?.toString() || '',
          antiguedad: propiedadData.antiguedad?.toString() || '',
          pisos: propiedadData.pisos?.toString() || '',
          floor_level: (propiedadData as any).floor_level?.toString() || '',
          year_built: (propiedadData as any).year_built?.toString() || '',
          condition: (propiedadData as any).condition?.toString() || '',
          amenidades: Array.isArray(propiedadData.amenidades) ? propiedadData.amenidades : [],
          
          imagen_principal: propiedadData.imagen_principal || '',
          imagenes: Array.isArray(propiedadData.imagenes) ? propiedadData.imagenes : [],
          video_url: propiedadData.video_url || '',
          tour_virtual_url: propiedadData.tour_virtual_url || '',
          
          publicada: (propiedadData as any).publicada !== undefined ? (propiedadData as any).publicada : true,
          destacada: propiedadData.destacada || false,
          exclusiva: propiedadData.exclusiva || false,
          etiquetas: Array.isArray((propiedadData as any).etiquetas) ? (propiedadData as any).etiquetas : [],
          is_furnished: (propiedadData as any).is_furnished || false,
          is_project: (propiedadData as any).is_project || false,

          captador_id: (propiedadData as any).captador_id || '',
          cocaptadores_ids: Array.isArray((propiedadData as any).cocaptadores_ids) 
            ? (propiedadData as any).cocaptadores_ids 
            : (propiedadData as any).cocaptador_id 
              ? [(propiedadData as any).cocaptador_id] 
              : [],
          propietario_id: propiedadData.propietario_id || '',
          correo_reporte: (propiedadData as any).correo_reporte || '',
          desarrollador_id: (propiedadData as any).desarrollador_id || '',

          slug: propiedadData.slug || '',
          slug_traducciones: (propiedadData as any).slug_traducciones || {},
          short_description: (propiedadData as any).short_description || '',
          traducciones: (propiedadData as any).traducciones || {},
          meta_title: (propiedadData as any).meta_title || '',
          meta_description: (propiedadData as any).meta_description || '',
          keywords: (propiedadData as any).keywords || [],
          tags: (propiedadData as any).tags || [],
          documentos: (propiedadData as any).documentos || [],
          notas: propiedadData.notas || '',

          // Datos del Proyecto
          tipologias: ((propiedadData as any).tipologias || []).map((t: any) => ({
            id: t.id || crypto.randomUUID(),
            nombre: t.nombre || '',
            habitaciones: t.habitaciones || '0',
            banos: t.banos || '0',
            medios_banos: t.medios_banos || '0',
            studio: t.studio || false,
            estacionamiento: t.estacionamiento || '0',
            precio: t.precio || '',
            m2: t.m2 || '',
          })),
          planes_pago: (() => {
            const planesPago = (propiedadData as any).planes_pago;
            if (planesPago) {
              return {
                reserva_valor: planesPago.reserva_valor || '',
                separacion: planesPago.separacion || '',
                inicial_construccion: planesPago.inicial_construccion || '',
                contra_entrega: planesPago.contra_entrega || '',
              };
            }
            return {
              reserva_valor: '',
              separacion: '',
              inicial_construccion: '',
              contra_entrega: '',
            };
          })(),
          etapas: ((propiedadData as any).etapas || []).map((etapa: any) => ({
            ...etapa,
            // Convertir fecha de YYYY-MM-DD a YYYY-MM si es necesario
            fecha_entrega: etapa.fecha_entrega 
              ? (etapa.fecha_entrega.includes('-') && etapa.fecha_entrega.split('-').length === 3
                  ? etapa.fecha_entrega.substring(0, 7) // Tomar solo YYYY-MM
                  : etapa.fecha_entrega)
              : ''
          })),
          beneficios: (propiedadData as any).beneficios || [],
          garantias: (propiedadData as any).garantias || [],
          // Portales y Redes - default true si no está definido
          red_global: (propiedadData as any).red_global !== undefined ? (propiedadData as any).red_global : true,
          red_global_comision: (propiedadData as any).red_global_comision || '',
          red_afiliados: (propiedadData as any).red_afiliados !== undefined ? (propiedadData as any).red_afiliados : true,
          connect: (propiedadData as any).connect !== undefined ? (propiedadData as any).connect : true,
          portales: (propiedadData as any).portales || { mercadolibre: true, easybroker: true, corotos: true },
        });

        // Cargar imágenes existentes en pendingImages como "uploaded"
        const existingImages: PendingImage[] = [];
        if (propiedadData.imagen_principal) {
          existingImages.push({
            id: crypto.randomUUID(),
            file: new File([], 'imagen_principal'), // Placeholder
            preview: propiedadData.imagen_principal,
            url: propiedadData.imagen_principal,
            metadata: { alt: 'Imagen principal', title: 'Imagen principal' },
            isMain: true,
            uploaded: true,
          });
        }
        if (Array.isArray(propiedadData.imagenes)) {
          propiedadData.imagenes.forEach((url: string, index: number) => {
            if (url && url !== propiedadData.imagen_principal) {
              existingImages.push({
                id: crypto.randomUUID(),
                file: new File([], `imagen_${index}`), // Placeholder
                preview: url,
                url: url,
                metadata: { alt: `Imagen ${index + 1}`, title: `Imagen ${index + 1}` },
                isMain: false,
                uploaded: true,
              });
            }
          });
        }
        setPendingImages(existingImages);
        console.log('📸 Imágenes cargadas:', existingImages.length, existingImages);

        // Cargar documentos existentes en form.documentos y también en pendingDocuments como "uploaded"
        const existingDocs = Array.isArray((propiedadData as any).documentos) 
          ? (propiedadData as any).documentos 
          : [];
        
        // Agregar documentos existentes a pendingDocuments como "uploaded" para que se incluyan al guardar
        const existingPendingDocs = existingDocs.map((doc: any) => ({
          id: doc.id || crypto.randomUUID(),
          tipo: doc.tipo || 'adicional',
          nombre: doc.nombre || 'Documento',
          file: new File([], doc.nombre || 'documento.pdf'), // File vacío porque ya está subido
          uploaded: true,
          url: doc.url || '',
        }));
        setPendingDocuments(existingPendingDocs);
        
        console.log('📄 Documentos existentes cargados:', existingDocs.length);
        console.log('📄 Documentos en form.documentos:', existingDocs);
        console.log('📄 Documentos en pendingDocuments (como uploaded):', existingPendingDocs.length);

        // Marcar como cargado para evitar recargas posteriores (con la key combinada)
        loadedKeyRef.current = loadKey;
        console.log('✅ Datos de propiedad cargados exitosamente - tenant:', tenantActual.id, 'propiedad:', propiedadId);
      } catch (err: any) {
        // Solo mostrar error si no fue cancelado
        if (!isCancelled) {
          console.error('Error cargando propiedad:', err);
          setError(err.message || 'Error al cargar la propiedad');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    cargarDatos();

    // Cleanup: cancelar si el componente se desmonta o si cambia el tenant/propiedad
    return () => {
      isCancelled = true;
    };
  }, [tenantActual?.id, isEditing, propiedadId, getToken]);

  // Cargar usuarios y contactos
  useEffect(() => {
    let isCancelled = false;

    async function cargarUsuariosYContactos() {
      if (!tenantActual?.id) return;

      try {
        setLoadingUsuarios(true);
        setLoadingContactos(true);
        const token = await getToken();

        if (isCancelled) return;

        // Cargar usuarios del tenant
        const usuariosData = await getUsuariosTenant(tenantActual.id, token);
        if (isCancelled) return;
        setUsuarios(usuariosData);

        // Cargar contactos
        const contactosData = await getContactos(tenantActual.id, {});
        if (isCancelled) return;
        setContactos(contactosData.data || []);
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Error cargando usuarios/contactos:', err);
        }
      } finally {
        if (!isCancelled) {
          setLoadingUsuarios(false);
          setLoadingContactos(false);
        }
      }
    }

    cargarUsuariosYContactos();

    return () => {
      isCancelled = true;
    };
  }, [tenantActual?.id, getToken]);

  // Cargar amenidades del catálogo (incluyendo las del tenant)
  useEffect(() => {
    async function cargarAmenidades() {
      if (!tenantActual?.id) return;
      try {
        setLoadingAmenidades(true);
        // Pasar tenantId para obtener amenidades globales + las personalizadas del tenant
        const amenidadesPorCategoria = await getAmenidadesPorCategoria(true, tenantActual.id);
        setAmenidadesCatalogo(amenidadesPorCategoria);
      } catch (err: any) {
        console.error('Error cargando amenidades:', err);
        // Fallback a catálogo vacío si falla
        setAmenidadesCatalogo({});
      } finally {
        setLoadingAmenidades(false);
      }
    }

    cargarAmenidades();
  }, [tenantActual?.id]);

  // Cargar operaciones y categorías del catálogo
  useEffect(() => {
    async function cargarCatalogos() {
      try {
        setLoadingCatalogos(true);
        const [operaciones, categorias] = await Promise.all([
          getOperacionesCatalogo(true),
          getCategoriasPropiedadesCatalogo(true)
        ]);
        setOperacionesCatalogo(operaciones);
        setCategoriasCatalogo(categorias);
      } catch (err: any) {
        console.error('Error cargando catálogos:', err);
      } finally {
        setLoadingCatalogos(false);
      }
    }

    cargarCatalogos();
  }, []);

  // Cargar features del tenant para verificar CONNECT y configuración de comisiones
  useEffect(() => {
    let isCancelled = false;

    async function cargarFeaturesYConfig() {
      if (!tenantActual?.id) return;
      try {
        const token = await getToken();
        if (isCancelled) return;

        // Cargar features
        const features = await getTenantFeatures(tenantActual.id, token);
        if (isCancelled) return;

        const connectFeature = features.find(f => {
          if (!f || !f.name) return false;
          const nameLower = f.name.toLowerCase();
          return nameLower.includes('connect') || nameLower.includes('clic connect');
        });
        setHasConnectFeature(!!(connectFeature && (connectFeature.isPublic === true || connectFeature.enabled === true)));

        // Cargar configuración de comisiones
        const comisionConfig = await getTenantComisionConfig(tenantActual.id, token);
        if (isCancelled) return;

        setTenantComisionDefaults({
          red_global_comision_default: comisionConfig.red_global_comision_default || '',
          connect_comision_default: comisionConfig.connect_comision_default || ''
        });

        // Si es nueva propiedad (no tiene propiedadId), precargar el default de red_global_comision
        if (!propiedadId && comisionConfig.red_global_comision_default) {
          setForm(prev => ({
            ...prev,
            red_global_comision: prev.red_global_comision || comisionConfig.red_global_comision_default || ''
          }));
        }

        // Cargar monedas del tenant
        const monedas = await getTenantMonedas(tenantActual.id);
        if (isCancelled) return;
        setMonedasCatalogo(monedas);

        // Si es nueva propiedad y hay moneda default, preseleccionarla
        if (!propiedadId && monedas.length > 0) {
          const monedaDefault = monedas.find(m => m.esDefault) || monedas[0];
          if (monedaDefault) {
            setForm(prev => ({
              ...prev,
              moneda: prev.moneda || monedaDefault.codigo
            }));
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Error cargando features y config:', err);
        }
      }
    }

    // Resetear la key de carga cuando cambia el tenant para forzar recarga
    loadedKeyRef.current = null;

    cargarFeaturesYConfig();

    return () => {
      isCancelled = true;
    };
  }, [tenantActual?.id, getToken, propiedadId]);

  // Calcular el captador preseleccionado (usuario logueado si está en el tenant)
  const captadorPreseleccionado = React.useMemo(() => {
    // Si ya hay un captador seleccionado, usarlo
    if (form.captador_id) {
      return form.captador_id;
    }
    // Si no, preseleccionar usuario logueado si está en la lista de usuarios del tenant
    // Esto funciona independientemente del rol específico que tenga
    if (user?.id && usuarios.length > 0) {
      const currentUser = usuarios.find(u => u.id === user.id);
      if (currentUser && currentUser.activo) {
        // Preseleccionar si el usuario tiene algún rol de tenant (no solo platform admin)
        // O si tiene un rol que sugiere que puede ser captador (asesor, agente, etc.)
        const tieneRolTenant = currentUser.roles.length > 0;
        const esAsesor = currentUser.roles.some(role => 
          role.codigo.toLowerCase().includes('asesor') ||
          role.nombre.toLowerCase().includes('asesor') ||
          role.nombre.toLowerCase().includes('agente') ||
          role.nombre.toLowerCase().includes('inmobiliaria')
        );
        
        // Preseleccionar si es asesor explícito o si tiene roles de tenant (probablemente puede ser captador)
        if (esAsesor || tieneRolTenant) {
          return currentUser.id;
        }
      }
    }
    return null;
  }, [form.captador_id, user?.id, usuarios]);

  // Asignar captador por defecto si el usuario es asesor
  // Solo al crear una nueva propiedad (no al editar una existente)
  useEffect(() => {
    // Solo asignar automáticamente si:
    // 1. No estamos editando una propiedad existente (isEditing = false)
    // 2. No hay captador ya asignado
    // 3. Hay un captador preseleccionado (usuario logueado es asesor)
    // 4. Los usuarios ya se han cargado
    if (!isEditing && !form.captador_id && captadorPreseleccionado && usuarios.length > 0 && !loadingUsuarios) {
      setForm(prev => ({ ...prev, captador_id: captadorPreseleccionado }));
    }
  }, [isEditing, captadorPreseleccionado, form.captador_id, usuarios.length, loadingUsuarios]);

  // Auto-activar "Propiedad Amueblada" si hay precios amueblados
  useEffect(() => {
    const hasPrecioAmueblado = 
      (form.precio_venta_amueblado && form.precio_venta_amueblado.trim() !== '') ||
      (form.precio_alquiler_amueblado && form.precio_alquiler_amueblado.trim() !== '');
    
    if (hasPrecioAmueblado && !form.is_furnished) {
      setForm(prev => ({ ...prev, is_furnished: true }));
    }
  }, [form.precio_venta_amueblado, form.precio_alquiler_amueblado]);

  // Subir imágenes pendientes
  const uploadPendingImages = async (imagesToProcess: PendingImage[]): Promise<{ mainImage: string; images: string[] }> => {
    if (!tenantActual?.id) {
      throw new Error('No hay tenant seleccionado');
    }

    const token = await getToken();
    const { apiFetch } = await import('../../services/api');
    
    console.log('📤 uploadPendingImages llamado con', imagesToProcess.length, 'imágenes');
    
    const imagesToUpload = imagesToProcess.filter(img => !img.uploaded && img.file && img.file.size > 0);
    
    console.log('📤 ========== UPLOAD PENDING IMAGES ==========');
    console.log('📤 Total imágenes recibidas:', imagesToProcess.length);
    console.log('📤 Imágenes pendientes (no subidas):', imagesToUpload.length);
    console.log('📤 Detalle de imágenes pendientes:', imagesToUpload.map(img => ({
      id: img.id,
      fileName: img.file?.name,
      fileSize: img.file?.size,
      hasFile: !!img.file,
      isMain: img.isMain
    })));
    console.log('📤 Imágenes ya subidas:', imagesToProcess.filter(img => img.uploaded && img.url).map(img => ({
      id: img.id,
      url: img.url,
      isMain: img.isMain
    })));
    
    // Si no hay imágenes pendientes, usar las que ya están
    if (imagesToUpload.length === 0) {
      const existingUrls = imagesToProcess
        .filter(img => img.uploaded && img.url)
        .map(img => img.url!);
      const mainImg = imagesToProcess.find(img => img.isMain && img.uploaded)?.url || existingUrls[0] || '';
      console.log('📤 No hay imágenes pendientes, usando existentes:', existingUrls.length);
      console.log('📤 URLs existentes:', existingUrls);
      console.log('📤 Imagen principal existente:', mainImg);
      return {
        mainImage: mainImg,
        images: existingUrls,
      };
    }

    const uploadedUrls: string[] = [];
    let mainImageUrl = '';

    // Subir todas las imágenes pendientes en un solo request
    try {
      const formData = new FormData();
      imagesToUpload.forEach((img) => {
        formData.append('images', img.file);
        console.log('📤 Agregando imagen a FormData:', img.file.name, img.file.size, 'bytes');
      });

      console.log('📤 Enviando request de upload a:', `/upload/propiedades/${tenantActual.id}`);

      const response = await apiFetch(
        `/upload/propiedades/${tenantActual.id}`,
        {
          method: 'POST',
          body: formData,
        },
        token
      );

      console.log('📤 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: 'Error desconocido',
          message: `Error ${response.status}: ${response.statusText}`
        }));
        console.error('❌ Error en response:', errorData);
        throw new Error(errorData.message || errorData.error || 'Error al subir imágenes');
      }

      const data = await response.json();
      console.log('📤 Response data completo:', JSON.stringify(data, null, 2));
      
      if (data.images && data.images.length > 0) {
        console.log('✅ Imágenes subidas exitosamente:', data.images.length);
        console.log('✅ URLs de imágenes:', data.images.map((img: any) => img.url));
        // Mapear las imágenes subidas con las pendientes
        imagesToUpload.forEach((img, index) => {
          if (data.images[index]) {
            const uploadedUrl = data.images[index].url;
            console.log(`✅ Imagen ${index + 1} subida:`, uploadedUrl);
            uploadedUrls.push(uploadedUrl);
            
            if (img.isMain) {
              mainImageUrl = uploadedUrl;
              console.log('✅ Imagen principal establecida:', uploadedUrl);
            }

            // Limpiar blob URLs
            URL.revokeObjectURL(img.preview);
            if (img.thumbnail) {
              URL.revokeObjectURL(img.thumbnail);
            }
          } else {
            console.warn(`⚠️ No se recibió URL para imagen ${index + 1}`);
          }
        });
      } else {
        console.error('❌ ERROR: No se recibieron imágenes en la respuesta');
        console.error('❌ Response completo:', data);
        throw new Error('No se recibieron URLs de las imágenes subidas');
      }
    } catch (err: any) {
      console.error('❌ Error subiendo imágenes:', err);
      throw new Error(`Error al subir imágenes: ${err.message}`);
    }

    // Combinar URLs de imágenes ya subidas con las nuevas
    const existingUrls = imagesToProcess
      .filter(img => img.uploaded && img.url)
      .map(img => img.url!);
    
    // Mantener el orden: primero las existentes, luego las nuevas
    const allUrls = [...existingUrls, ...uploadedUrls];
    
    // Determinar imagen principal
    const finalMainImage = mainImageUrl || 
      imagesToProcess.find(img => img.isMain && img.uploaded)?.url ||
      allUrls[0] ||
      '';

    return {
      mainImage: finalMainImage,
      images: allUrls,
    };
  };

  // Guardar
  const handleSave = async () => {
    // CRÍTICO: Usar formRef.current para obtener el valor más reciente del form
    // Esto evita el problema de closures stale donde form tiene valores viejos
    const currentForm = formRef.current;

    console.log('🚀🚀🚀 handleSave INICIADO 🚀🚀🚀');
    console.log('🚀 tenantActual?.id:', tenantActual?.id);
    console.log('🚀 currentForm.titulo:', currentForm.titulo);
    console.log('🚀 pendingDocuments.length:', pendingDocuments.length);
    console.log('🚀 currentForm.documentos.length:', currentForm.documentos?.length || 0);

    // DEBUG CRÍTICO: Estado completo de precios
    console.log('💰💰💰 ESTADO DEL FORM (desde formRef) - PRECIOS 💰💰💰');
    console.log('💰 currentForm.precio_venta:', currentForm.precio_venta, '(tipo:', typeof currentForm.precio_venta, ')');
    console.log('💰 currentForm.precio_alquiler:', currentForm.precio_alquiler, '(tipo:', typeof currentForm.precio_alquiler, ')');
    console.log('💰 currentForm.maintenance:', currentForm.maintenance, '(tipo:', typeof currentForm.maintenance, ')');
    console.log('💰 currentForm.moneda:', currentForm.moneda);
    console.log('💰 currentForm.operacion:', currentForm.operacion);
    console.log('💰 currentForm.descripcion (primeros 100 chars):', currentForm.descripcion?.substring(0, 100));
    console.log('💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰');

    if (!tenantActual?.id || !currentForm.titulo.trim()) {
      console.error('❌ Validación fallida: título o tenant faltante');
      setError('El título es requerido');
      return;
    }
    
    console.log('✅ Validación pasada, continuando...');

    try {
      setSaving(true);
      setError(null);

      // Subir imágenes pendientes primero
      let finalMainImage = currentForm.imagen_principal;
      let finalImages = currentForm.imagenes;

      // CRÍTICO: Obtener imágenes directamente del ImageUploader si está disponible
      let actualPendingImages = pendingImages;
      if (imageUploaderRef.current) {
        const imagesFromUploader = imageUploaderRef.current();
        console.log('📤 Obteniendo imágenes directamente del ImageUploader:', imagesFromUploader.length);
        if (imagesFromUploader.length > 0) {
          actualPendingImages = imagesFromUploader;
          console.log('✅ Usando imágenes del ImageUploader');
        } else {
          console.log('⚠️ ImageUploader no tiene imágenes');
        }
      } else {
        console.log('⚠️ imageUploaderRef.current es null');
      }

      console.log('📤 ========== ESTADO ANTES DE SUBIR IMÁGENES ==========');
      console.log('📤 Total pendingImages (estado):', pendingImages.length);
      console.log('📤 Total actualPendingImages (del uploader):', actualPendingImages.length);
      console.log('📤 actualPendingImages detalle:', actualPendingImages.map(img => ({
        id: img.id,
        uploaded: img.uploaded,
        hasFile: !!img.file && img.file.size > 0,
        hasUrl: !!img.url,
        fileName: img.file?.name || 'N/A',
        isMain: img.isMain
      })));
      
      // CRÍTICO: Si actualPendingImages está vacío, ERROR
      if (actualPendingImages.length === 0) {
        console.error('❌❌❌ ERROR CRÍTICO: NO HAY IMÁGENES EN NINGÚN LADO');
        console.error('❌ pendingImages:', pendingImages.length);
        console.error('❌ imageUploaderRef.current:', imageUploaderRef.current ? 'existe' : 'null');
        if (imageUploaderRef.current) {
          const fromRef = imageUploaderRef.current();
          console.error('❌ Desde ref:', fromRef.length);
        }
      }
      console.log('📤 PendingImages detalle:', JSON.stringify(pendingImages.map(img => ({
        id: img.id,
        uploaded: img.uploaded,
        isMain: img.isMain,
        hasUrl: !!img.url,
        hasPreview: !!img.preview,
        url: img.url || 'NO URL',
        preview: img.preview ? 'HAS PREVIEW' : 'NO PREVIEW',
        fileName: img.file?.name || 'N/A',
        fileSize: img.file?.size || 0,
        hasFile: !!img.file && img.file.size > 0,
        fileType: img.file?.type || 'NO TYPE'
      })), null, 2));
      console.log('📤 Imágenes ya subidas:', pendingImages.filter(img => img.uploaded && img.url).length);
      console.log('📤 Imágenes pendientes (nuevas):', pendingImages.filter(img => !img.uploaded && img.file && img.file.size > 0).length);
      console.log('📤 currentForm.imagen_principal:', currentForm.imagen_principal);
      console.log('📤 currentForm.imagenes count:', currentForm.imagenes?.length || 0);
      console.log('📤 currentForm.imagenes:', currentForm.imagenes);
      
      // CRÍTICO: Verificar si pendingImages está realmente vacío
      if (pendingImages.length === 0) {
        console.error('❌❌❌ ERROR CRÍTICO: pendingImages está VACÍO cuando se intenta guardar');
        console.error('❌ Esto significa que las imágenes no se agregaron al estado o se perdieron');
        console.error('❌ Verificar que onImagesDataChange se esté llamando correctamente');
      }
      
      console.log('📤 ====================================================');

      // Validar que actualPendingImages tenga datos válidos
      const validPendingImages = actualPendingImages.filter(img => {
        // Debe tener URL (si está subida) o File (si es nueva)
        return (img.uploaded && img.url) || (!img.uploaded && img.file && img.file.size > 0);
      });

      console.log('📤 Imágenes válidas:', validPendingImages.length);

      // Si hay imágenes pendientes (nuevas), subirlas
      const imagesToUpload = validPendingImages.filter(img => !img.uploaded && img.file && img.file.size > 0);
      if (imagesToUpload.length > 0) {
        console.log('📤 Subiendo', imagesToUpload.length, 'imágenes nuevas...');
        console.log('📤 Archivos a subir:', imagesToUpload.map(img => ({
          name: img.file?.name,
          size: img.file?.size,
          type: img.file?.type,
          hasFile: !!img.file
        })));
        try {
          // Usar actualPendingImages directamente
          const uploaded = await uploadPendingImages(actualPendingImages);
          console.log('✅ Imágenes subidas:', {
            mainImage: uploaded.mainImage,
            imagesCount: uploaded.images.length,
            images: uploaded.images
          });
          finalMainImage = uploaded.mainImage;
          finalImages = uploaded.images;
        } catch (uploadError: any) {
          console.error('❌ Error subiendo imágenes:', uploadError);
          throw new Error(`Error al subir imágenes: ${uploadError.message}`);
        }
      } else if (validPendingImages.length > 0) {
        // Si hay imágenes en actualPendingImages pero todas están uploaded, usarlas
        console.log('📤 Usando imágenes ya subidas');
        const uploaded = await uploadPendingImages(actualPendingImages);
        console.log('✅ Imágenes obtenidas de pendingImages:', {
          mainImage: uploaded.mainImage,
          imagesCount: uploaded.images.length,
          images: uploaded.images
        });
        finalMainImage = uploaded.mainImage;
        finalImages = uploaded.images;
      } else {
        // Si no hay pendingImages, usar las del form (para propiedades existentes)
        console.log('⚠️ No hay pendingImages válidas, usando las del form');
        console.log('⚠️ currentForm.imagen_principal:', currentForm.imagen_principal);
        console.log('⚠️ currentForm.imagenes:', currentForm.imagenes);
        finalMainImage = currentForm.imagen_principal || undefined;
        finalImages = currentForm.imagenes || [];
      }

      // VALIDACIÓN FINAL CRÍTICA: Asegurar que tenemos imágenes
      if (!finalMainImage && finalImages.length === 0) {
        console.error('❌❌❌ ERROR CRÍTICO: NO HAY IMÁGENES PARA ENVIAR');
        console.error('❌ finalMainImage:', finalMainImage);
        console.error('❌ finalImages:', finalImages);
        console.error('❌ actualPendingImages:', actualPendingImages.length);
        console.error('❌ validPendingImages:', validPendingImages.length);
        console.error('❌ currentForm.imagenes:', currentForm.imagenes?.length || 0);
        
        // ÚLTIMO RECURSO: Intentar obtener desde el ImageUploader
        if (imageUploaderRef.current) {
          console.log('🔄 ÚLTIMO RECURSO: Intentando obtener desde ImageUploader');
          const lastTry = imageUploaderRef.current();
          console.log('🔄 Imágenes desde ref:', lastTry.length);
          if (lastTry.length > 0) {
            const urls = lastTry
              .map(img => img.url || img.preview)
              .filter((url): url is string => !!url && !url.startsWith('blob:'));
            if (urls.length > 0) {
              console.log('✅ Encontradas imágenes en último intento:', urls.length);
              finalMainImage = lastTry.find(img => img.isMain && img.url)?.url || 
                              lastTry.find(img => img.url)?.url || 
                              urls[0] || 
                              undefined;
              finalImages = urls;
            } else {
              // Si solo hay previews (blob URLs), intentar subirlas
              const blobImages = lastTry.filter(img => !img.uploaded && img.file && img.file.size > 0);
              if (blobImages.length > 0) {
                console.log('🔄 Intentando subir imágenes desde último recurso:', blobImages.length);
                try {
                  const uploaded = await uploadPendingImages(blobImages);
                  finalMainImage = uploaded.mainImage;
                  finalImages = uploaded.images;
                } catch (err: any) {
                  console.error('❌ Error en último recurso:', err);
                }
              }
            }
          }
        }
        
        if (!finalMainImage && finalImages.length === 0) {
          console.error('❌❌❌ NO SE PUDIERON OBTENER IMÁGENES DE NINGÚN LADO');
        }
      }

      // Subir documentos pendientes
      console.log('🚀🚀🚀🚀🚀 INICIANDO PROCESO DE DOCUMENTOS 🚀🚀🚀🚀🚀');
      console.log('📄 ========== ESTADO ANTES DE SUBIR DOCUMENTOS ==========');
      console.log('📄 Total pendingDocuments (estado):', pendingDocuments.length);
      console.log('📄 pendingDocuments COMPLETO:', JSON.stringify(pendingDocuments.map(doc => ({
        id: doc.id,
        tipo: doc.tipo,
        nombre: doc.nombre,
        uploaded: doc.uploaded,
        hasFile: !!doc.file && doc.file.size > 0,
        fileSize: doc.file?.size || 0,
        hasUrl: !!doc.url,
        fileName: doc.file?.name || 'N/A'
      })), null, 2));
      console.log('📄 currentForm.documentos count:', currentForm.documentos?.length || 0);
      console.log('📄 currentForm.documentos COMPLETO:', JSON.stringify(currentForm.documentos, null, 2));

      let finalDocumentos = currentForm.documentos.filter(d => !d.url.startsWith('blob:'));

      // CRÍTICO: Si pendingDocuments está vacío pero currentForm.documentos tiene documentos con blob URLs,
      // reconstruir pendingDocuments desde currentForm.documentos usando el ref
      let actualPendingDocuments = pendingDocuments;
      const blobDocuments = currentForm.documentos.filter(d => d.url.startsWith('blob:'));
      
      if (pendingDocuments.length === 0 && blobDocuments.length > 0) {
        console.warn('⚠️ ADVERTENCIA: pendingDocuments está VACÍO, pero form.documentos tiene documentos con blob URLs.');
        console.warn('⚠️ Esto sugiere un problema de sincronización del estado. Reconstruyendo desde ref.');
        
        // Reconstruir pendingDocuments desde form.documentos usando los archivos del ref
        actualPendingDocuments = blobDocuments.map(doc => {
          const fileFromRef = documentosFilesRef.current.get(doc.id);
          if (fileFromRef) {
            console.log('✅ Archivo recuperado del ref para:', doc.id, doc.nombre);
            return {
              id: doc.id,
              tipo: doc.tipo,
              nombre: doc.nombre,
              file: fileFromRef,
              uploaded: false,
              url: doc.url,
            };
          } else {
            console.warn('⚠️ No se encontró archivo en ref para:', doc.id);
            return null;
          }
        }).filter((doc): doc is NonNullable<typeof doc> => doc !== null);
        
        console.log('✅ Reconstruidos', actualPendingDocuments.length, 'documentos desde ref');
      }
      
      // Validar que actualPendingDocuments tenga datos válidos
      const validPendingDocuments = actualPendingDocuments.filter(doc => {
        return (doc.uploaded && doc.url) || (!doc.uploaded && doc.file && doc.file.size > 0);
      });
      
      console.log('📄 Documentos válidos:', validPendingDocuments.length);
      
      // Si hay documentos con blob URLs en form.documentos pero no en pendingDocuments,
      // intentar subirlos directamente desde form.documentos
      if (validPendingDocuments.length === 0 && blobDocuments.length > 0) {
        console.log('🔄 ÚLTIMO RECURSO: Intentando subir documentos directamente desde form.documentos');
        console.log('🔄 Blob documents encontrados:', blobDocuments.length);
        
        // Intentar obtener los archivos desde el cache o reconstruirlos
        // Por ahora, vamos a intentar usar los documentos del form directamente
        // pero necesitamos los archivos reales para subirlos
        console.warn('⚠️ No se pueden subir documentos sin los archivos originales');
        console.warn('⚠️ Los documentos se agregaron pero los archivos se perdieron del estado');
      }
      
      if (validPendingDocuments.length > 0) {
        const documentsToUpload = validPendingDocuments.filter(doc => !doc.uploaded && doc.file && doc.file.size > 0);
        if (documentsToUpload.length > 0) {
          console.log('📤 Subiendo', documentsToUpload.length, 'documentos nuevos...');
          try {
            finalDocumentos = await uploadPendingDocuments(validPendingDocuments);
            console.log('✅ Documentos subidos:', finalDocumentos.length);
          } catch (uploadError: any) {
            console.error('❌ Error subiendo documentos:', uploadError);
            throw new Error(`Error al subir documentos: ${uploadError.message}`);
          }
        } else {
          // Todos están subidos, solo obtener URLs
          console.log('📤 Todos los documentos ya están subidos, obteniendo URLs');
          try {
            finalDocumentos = await uploadPendingDocuments(validPendingDocuments);
            console.log('✅ Documentos obtenidos:', finalDocumentos.length);
          } catch (uploadError: any) {
            console.error('❌ Error obteniendo documentos:', uploadError);
            // No lanzar error, usar los del form como fallback
            finalDocumentos = form.documentos.filter(d => !d.url.startsWith('blob:'));
          }
        }
      } else {
        console.log('⚠️ No hay documentos válidos en pendingDocuments');
        console.log('⚠️ Usando documentos del form:', finalDocumentos.length);
        
        // ÚLTIMO RECURSO: Verificar si hay documentos en form.documentos con blob URLs
        const blobDocuments = form.documentos.filter(d => d.url.startsWith('blob:'));
        if (blobDocuments.length > 0 && pendingDocuments.length > 0) {
          console.log('🔄 ÚLTIMO RECURSO: Intentando subir documentos con blob URLs');
          console.log('🔄 Blob documents:', blobDocuments.length);
          console.log('🔄 Pending documents:', pendingDocuments.length);
          
          // Intentar encontrar los documentos en pendingDocuments que corresponden a los blobs
          const matchingDocs = pendingDocuments.filter(doc => {
            const matchingBlob = blobDocuments.find(b => b.id === doc.id);
            return matchingBlob && doc.file && doc.file.size > 0;
          });
          
          if (matchingDocs.length > 0) {
            console.log('✅ Encontrados documentos para subir:', matchingDocs.length);
            try {
              finalDocumentos = await uploadPendingDocuments(matchingDocs);
              console.log('✅ Documentos subidos en último recurso:', finalDocumentos.length);
            } catch (err: any) {
              console.error('❌ Error en último recurso:', err);
            }
          }
        }
      }
      
      console.log('📄 ====================================================');

      const data: Partial<Propiedad> = {
        titulo: currentForm.titulo.trim(),
        nombre_privado: currentForm.nombre_privado?.trim() || undefined,
        codigo: currentForm.codigo.trim() || undefined,
        // Descripcion: enviar siempre, incluso si está vacía (para poder limpiarla)
        descripcion: currentForm.descripcion?.trim() || null,
        tipo: currentForm.tipo,
        operacion: currentForm.operacion,

        pais: currentForm.pais || undefined,
        provincia: currentForm.provincia.trim() || undefined,
        ciudad: currentForm.ciudad.trim() || undefined,
        sector: currentForm.sector.trim() || undefined,
        direccion: currentForm.direccion.trim() || undefined,
        latitud: currentForm.latitud ? parseFloat(currentForm.latitud) : undefined,
        longitud: currentForm.longitud ? parseFloat(currentForm.longitud) : undefined,
        mostrar_ubicacion_exacta: currentForm.mostrar_ubicacion_exacta,

        moneda: currentForm.moneda,

        habitaciones: currentForm.habitaciones ? parseInt(currentForm.habitaciones) : undefined,
        banos: currentForm.banos ? parseInt(currentForm.banos) : undefined,
        medios_banos: currentForm.medios_banos ? parseInt(currentForm.medios_banos) : undefined,
        estacionamientos: currentForm.estacionamientos ? parseInt(currentForm.estacionamientos) : undefined,
        m2_construccion: currentForm.m2_construccion ? parseFloat(currentForm.m2_construccion) : undefined,
        m2_terreno: currentForm.m2_terreno ? parseFloat(currentForm.m2_terreno) : undefined,
        antiguedad: currentForm.antiguedad ? parseInt(currentForm.antiguedad) : undefined,
        pisos: currentForm.pisos ? parseInt(currentForm.pisos) : undefined,
        amenidades: currentForm.amenidades,

        // Usar imágenes subidas
        imagen_principal: finalMainImage || undefined,
        imagenes: finalImages && finalImages.length > 0 ? finalImages : [],
        video_url: currentForm.video_url.trim() || undefined,
        tour_virtual_url: currentForm.tour_virtual_url.trim() || undefined,

        publicada: currentForm.publicada,
        destacada: currentForm.destacada,
        exclusiva: currentForm.exclusiva,
        etiquetas: currentForm.etiquetas.length > 0 ? currentForm.etiquetas : [],
        is_project: currentForm.is_project,

        captador_id: currentForm.captador_id || undefined,
        cocaptadores_ids: currentForm.cocaptadores_ids.length > 0 ? currentForm.cocaptadores_ids : undefined,
        propietario_id: currentForm.propietario_id || undefined,
        correo_reporte: currentForm.correo_reporte.trim() || undefined,
        desarrollador_id: currentForm.desarrollador_id || undefined,

        slug: currentForm.slug.trim() || undefined,
        meta_title: currentForm.meta_title.trim() || undefined,
        meta_description: currentForm.meta_description.trim() || undefined,
        keywords: currentForm.keywords.length > 0 ? currentForm.keywords : [],
        tags: currentForm.tags.length > 0 ? currentForm.tags : [],
        documentos: finalDocumentos.length > 0 ? finalDocumentos : [],
        notas: currentForm.notas.trim() || undefined,

        // Datos del Proyecto
        tipologias: currentForm.tipologias.length > 0 ? currentForm.tipologias : undefined,
        planes_pago: currentForm.is_project ? currentForm.planes_pago : undefined,
        etapas: currentForm.etapas.length > 0 ? currentForm.etapas : undefined,
        beneficios: currentForm.beneficios.length > 0 ? currentForm.beneficios : undefined,
        garantias: currentForm.garantias.length > 0 ? currentForm.garantias : undefined,

        // Portales y Redes
        red_global: currentForm.red_global,
        red_afiliados: currentForm.red_afiliados,
        connect: currentForm.connect,
        portales: currentForm.portales,
      };

      // Calcular rangos desde tipologías (para proyectos)
      if (currentForm.tipologias.length > 0) {
        const tipologias = currentForm.tipologias;

        // Precios
        const precios = tipologias
          .map(t => t.precio ? parseFloat(t.precio.replace(/[^0-9.]/g, '')) : null)
          .filter((p): p is number => p !== null && !isNaN(p) && p > 0);
        if (precios.length > 0) {
          data.precio_min = Math.min(...precios);
          data.precio_max = Math.max(...precios);
        }

        // M2
        const m2s = tipologias
          .map(t => t.m2 ? parseFloat(t.m2) : null)
          .filter((m): m is number => m !== null && !isNaN(m) && m > 0);
        if (m2s.length > 0) {
          data.m2_min = Math.min(...m2s);
          data.m2_max = Math.max(...m2s);
        }

        // Habitaciones
        const habs = tipologias
          .map(t => t.habitaciones ? parseInt(t.habitaciones) : null)
          .filter((h): h is number => h !== null && !isNaN(h) && h > 0);
        if (habs.length > 0) {
          data.habitaciones_min = Math.min(...habs);
          data.habitaciones_max = Math.max(...habs);
        }

        // Baños
        const banos = tipologias
          .map(t => t.banos ? parseInt(t.banos) : null)
          .filter((b): b is number => b !== null && !isNaN(b) && b > 0);
        if (banos.length > 0) {
          data.banos_min = Math.min(...banos);
          data.banos_max = Math.max(...banos);
        }

        // Parqueos/Estacionamientos
        const parqueos = tipologias
          .map(t => t.estacionamiento ? parseInt(t.estacionamiento) : null)
          .filter((p): p is number => p !== null && !isNaN(p) && p > 0);
        if (parqueos.length > 0) {
          data.parqueos_min = Math.min(...parqueos);
          data.parqueos_max = Math.max(...parqueos);
        }
      }

      // Agregar campos extendidos de precios
      if (currentForm.precio_venta) data.precio_venta = parseFloat(currentForm.precio_venta);
      if (currentForm.precio_alquiler) data.precio_alquiler = parseFloat(currentForm.precio_alquiler);
      if (currentForm.maintenance) data.maintenance = parseFloat(currentForm.maintenance);

      // Comisión
      if (currentForm.comision) data.comision = parseFloat(currentForm.comision);
      if (currentForm.comision_nota) data.comision_nota = currentForm.comision_nota;

      // Características adicionales
      if (currentForm.floor_level) data.floor_level = parseInt(currentForm.floor_level);
      if (currentForm.year_built) data.year_built = parseInt(currentForm.year_built);
      if (currentForm.condition) data.condition = parseInt(currentForm.condition);
      if (currentForm.is_furnished !== undefined) data.is_furnished = currentForm.is_furnished;

      // Establecer el campo 'precio' principal basado en la operación
      // Si es venta, usar precio_venta; si es renta, usar precio_alquiler
      if (currentForm.operacion === 'venta' && currentForm.precio_venta) {
        data.precio = parseFloat(currentForm.precio_venta);
      } else if ((currentForm.operacion === 'renta' || currentForm.operacion === 'traspaso') && currentForm.precio_alquiler) {
        data.precio = parseFloat(currentForm.precio_alquiler);
      } else if (currentForm.precio_venta) {
        data.precio = parseFloat(currentForm.precio_venta);
      } else if (currentForm.precio_alquiler) {
        data.precio = parseFloat(currentForm.precio_alquiler);
      }

      console.log('💾 ========== RESUMEN ANTES DE GUARDAR ==========');
      console.log('💾 Imagen principal:', finalMainImage || 'NO HAY');
      console.log('💾 Total imágenes:', finalImages?.length || 0);
      console.log('💾 URLs de imágenes:', finalImages);
      console.log('💾 Total documentos:', finalDocumentos?.length || 0);
      console.log('💾 Documentos detalle:', finalDocumentos);
      console.log('💾 --- CAMPOS CRÍTICOS ---');
      console.log('💾 precio en data:', data.precio);
      console.log('💾 precio_venta en data:', data.precio_venta);
      console.log('💾 precio_alquiler en data:', data.precio_alquiler);
      console.log('💾 maintenance en data:', data.maintenance);
      console.log('💾 descripcion en data:', data.descripcion?.substring(0, 100) || 'NO HAY');
      console.log('💾 currentForm.precio_venta (raw):', currentForm.precio_venta);
      console.log('💾 currentForm.descripcion (raw):', currentForm.descripcion?.substring(0, 100) || 'NO HAY');
      console.log('💾 ==============================================');
      
      // VALIDACIÓN FINAL CRÍTICA: Verificar que los documentos se incluyan
      if (finalDocumentos.length === 0 && pendingDocuments.length > 0) {
        console.error('❌❌❌ ERROR CRÍTICO: Hay documentos en pendingDocuments pero no se incluyeron');
        console.error('❌ pendingDocuments:', pendingDocuments.length);
        console.error('❌ finalDocumentos:', finalDocumentos.length);
        console.error('❌ pendingDocuments detalle:', pendingDocuments.map(doc => ({
          id: doc.id,
          tipo: doc.tipo,
          nombre: doc.nombre,
          uploaded: doc.uploaded,
          hasFile: !!doc.file && doc.file.size > 0,
          hasUrl: !!doc.url
        })));
        // Intentar usar pendingDocuments directamente como último recurso
        const fallbackDocs = pendingDocuments
          .filter(doc => doc.url && !doc.url.startsWith('blob:'))
          .map(doc => ({
            id: doc.id,
            tipo: doc.tipo,
            nombre: doc.nombre,
            url: doc.url!,
            fecha_subida: new Date().toISOString()
          }));
        if (fallbackDocs.length > 0) {
          console.log('✅ Usando documentos de fallback:', fallbackDocs.length);
          finalDocumentos = fallbackDocs;
          // Actualizar data también
          data.documentos = fallbackDocs;
        }
      }
      
      console.log('💾 Datos completos a enviar:', {
        imagen_principal: finalMainImage,
        imagenes: finalImages,
        documentos: finalDocumentos,
        total_imagenes: finalImages?.length || 0,
        total_documentos: finalDocumentos?.length || 0,
        data_imagen_principal: data.imagen_principal,
        data_imagenes: data.imagenes,
        data_documentos: data.documentos,
      });

      const token = await getToken();
      
      if (isEditing && propiedadId) {
        console.log('📝 Actualizando propiedad:', propiedadId);
        console.log('📝 Payload completo:', JSON.stringify(data, null, 2));
        const result = await updatePropiedadCrm(tenantActual.id, propiedadId, data, token);
        console.log('✅ ========== PROPIEDAD ACTUALIZADA ==========');
        console.log('✅ ID:', result.id);
        console.log('✅ Imagen principal retornada:', result.imagen_principal || 'NO HAY');
        console.log('✅ Imágenes retornadas:', Array.isArray(result.imagenes) ? result.imagenes.length : 0);
        console.log('✅ URLs de imágenes retornadas:', result.imagenes);
        console.log('✅ Documentos retornados:', Array.isArray(result.documentos) ? result.documentos.length : 0);
        console.log('✅ URLs de documentos retornados:', result.documentos);
        console.log('✅ ===========================================');
        
        // Verificar si las imágenes se guardaron correctamente
        if (!result.imagen_principal && finalMainImage) {
          console.error('❌ ERROR: La imagen principal NO se guardó correctamente');
          console.error('❌ Se envió:', finalMainImage);
          console.error('❌ Se recibió:', result.imagen_principal);
        }
        if (Array.isArray(result.imagenes) && result.imagenes.length === 0 && finalImages && finalImages.length > 0) {
          console.error('❌ ERROR: Las imágenes NO se guardaron correctamente');
          console.error('❌ Se enviaron:', finalImages.length, 'imágenes');
          console.error('❌ Se recibieron:', result.imagenes.length, 'imágenes');
        }
      } else {
        console.log('➕ Creando nueva propiedad');
        console.log('➕ Payload completo:', JSON.stringify(data, null, 2));
        const result = await createPropiedadCrm(tenantActual.id, data, token);
        console.log('✅ ========== PROPIEDAD CREADA ==========');
        console.log('✅ ID:', result.id);
        console.log('✅ Imagen principal retornada:', result.imagen_principal || 'NO HAY');
        console.log('✅ Imágenes retornadas:', Array.isArray(result.imagenes) ? result.imagenes.length : 0);
        console.log('✅ URLs de imágenes retornadas:', result.imagenes);
        console.log('✅ Documentos retornados:', Array.isArray(result.documentos) ? result.documentos.length : 0);
        console.log('✅ URLs de documentos retornados:', result.documentos);
        console.log('✅ ======================================');
        
        // Verificar si las imágenes se guardaron correctamente
        if (!result.imagen_principal && finalMainImage) {
          console.error('❌ ERROR: La imagen principal NO se guardó correctamente');
          console.error('❌ Se envió:', finalMainImage);
          console.error('❌ Se recibió:', result.imagen_principal);
        }
        if (Array.isArray(result.imagenes) && result.imagenes.length === 0 && finalImages && finalImages.length > 0) {
          console.error('❌ ERROR: Las imágenes NO se guardaron correctamente');
          console.error('❌ Se enviaron:', finalImages.length, 'imágenes');
          console.error('❌ Se recibieron:', result.imagenes.length, 'imágenes');
        }
      }

      navigate(`/crm/${tenantSlug}/propiedades`);
    } catch (err: any) {
      console.error('Error guardando propiedad:', err);
      setError(err.message || 'Error al guardar la propiedad');
    } finally {
      setSaving(false);
    }
  };

  // Agregar amenidad desde modal - persiste en la base de datos para el tenant
  const handleAddAmenidad = async (data: {
    nombre: string;
    icono: string;
    categoria: string;
    traducciones: Record<string, string>;
  }) => {
    if (!tenantActual?.id) {
      console.error('No hay tenant seleccionado');
      return;
    }

    try {
      // Crear la amenidad en la API para el tenant específico
      const nuevaAmenidad = await createAmenidadTenant(tenantActual.id, {
        nombre: data.nombre,
        icono: data.icono,
        categoria: data.categoria, // Usar la categoría seleccionada por el usuario
        traducciones: data.traducciones,
      });

      console.log('Amenidad creada:', nuevaAmenidad);

      // Agregar al formulario actual usando el código de la nueva amenidad
      if (!form.amenidades.includes(nuevaAmenidad.codigo)) {
        setForm(prev => ({
          ...prev,
          amenidades: [...prev.amenidades, nuevaAmenidad.codigo],
        }));
      }

      // Recargar el catálogo de amenidades para incluir la nueva
      const amenidadesPorCategoria = await getAmenidadesPorCategoria(true, tenantActual.id);
      setAmenidadesCatalogo(amenidadesPorCategoria);
    } catch (err: any) {
      console.error('Error al crear amenidad:', err);
      // En caso de error, aún agregamos localmente para no perder la selección del usuario
      if (!form.amenidades.includes(data.nombre)) {
        setForm(prev => ({
          ...prev,
          amenidades: [...prev.amenidades, data.nombre],
        }));
      }
    }
  };

  const handleTipologiaSubmit = (data: {
    nombre: string;
    habitaciones: string;
    banos: string;
    medios_banos: string;
    studio: boolean;
    estacionamiento: string;
    precio: string;
    m2: string;
  }) => {
    if (tipologiaEditando) {
      // Editar tipología existente
      setForm(prev => ({
        ...prev,
        tipologias: prev.tipologias.map(t => 
          t.id === tipologiaEditando.id 
            ? { ...t, ...data }
            : t
        )
      }));
    } else {
      // Agregar nueva tipología
      setForm(prev => ({
        ...prev,
        tipologias: [...prev.tipologias, {
          id: crypto.randomUUID(),
          ...data,
        }]
      }));
    }
    setTipologiaEditando(null);
  };

  const handleEtapaSubmit = (data: {
    nombre: string;
    fecha_entrega: string;
  }) => {
    if (etapaEditando) {
      // Editar etapa existente
      setForm(prev => ({
        ...prev,
        etapas: prev.etapas.map(e => 
          e.id === etapaEditando.id 
            ? { ...e, ...data }
            : e
        )
      }));
    } else {
      // Agregar nueva etapa
      setForm(prev => ({
        ...prev,
        etapas: [...prev.etapas, { ...data, id: crypto.randomUUID() }]
      }));
    }
    setShowEtapaModal(false);
    setEtapaEditando(null);
  };

  // Función para autogenerar SEO
  const autogenerarSEO = () => {
    const keywords: string[] = [];
    const tags: string[] = [];

    // Keywords desde datos básicos
    if (form.titulo) {
      const palabrasTitulo = form.titulo.toLowerCase().split(/\s+/).filter(p => p.length > 3);
      keywords.push(...palabrasTitulo);
    }
    if (form.tipo) keywords.push(form.tipo.toLowerCase());
    if (form.operacion) keywords.push(form.operacion.toLowerCase());
    if (form.ciudad) keywords.push(form.ciudad.toLowerCase());
    if (form.sector) keywords.push(form.sector.toLowerCase());
    if (form.habitaciones) keywords.push(`${form.habitaciones} habitaciones`);
    if (form.banos) keywords.push(`${form.banos} baños`);
    if (form.m2_construccion) keywords.push(`${form.m2_construccion} m²`);
    if (form.moneda) keywords.push(form.moneda.toLowerCase());

    // Tags desde características
    if (form.destacada) tags.push('destacado');
    if (form.exclusiva) tags.push('exclusivo');
    if (form.is_project) tags.push('proyecto');
    if (form.amenidades.length > 0) tags.push('con amenidades');
    if (form.estacionamientos && parseInt(form.estacionamientos) > 0) tags.push('con estacionamiento');

    // Meta description
    const metaDescription = [
      form.tipo && form.operacion ? `${form.tipo} en ${form.operacion}` : '',
      form.habitaciones ? `${form.habitaciones} habitaciones` : '',
      form.banos ? `${form.banos} baños` : '',
      form.m2_construccion ? `${form.m2_construccion} m²` : '',
      form.ciudad ? `en ${form.ciudad}` : '',
      form.sector ? `, ${form.sector}` : '',
    ].filter(Boolean).join(', ');

    // Meta title
    const metaTitle = form.titulo || `${form.tipo} ${form.operacion} ${form.ciudad || ''}`.trim();

    return {
      keywords: [...new Set(keywords)], // Eliminar duplicados
      tags: [...new Set(tags)],
      meta_description: metaDescription,
      meta_title: metaTitle.length > 60 ? metaTitle.substring(0, 57) + '...' : metaTitle,
    };
  };

  // Autogenerar SEO cuando cambien los datos relevantes
  useEffect(() => {
    if (!isEditing && (form.titulo || form.tipo || form.operacion || form.ciudad)) {
      const seo = autogenerarSEO();
      setForm(prev => ({
        ...prev,
        keywords: prev.keywords.length === 0 ? seo.keywords : prev.keywords,
        tags: prev.tags.length === 0 ? seo.tags : prev.tags,
        meta_description: !prev.meta_description ? seo.meta_description : prev.meta_description,
        meta_title: !prev.meta_title ? seo.meta_title : prev.meta_title,
      }));
    }
  }, [form.titulo, form.tipo, form.operacion, form.ciudad, form.habitaciones, form.banos, form.m2_construccion, isEditing]);

  // Manejar agregar documento (guardar en memoria)
  const handleDocumentoUpload = (tipo: string, nombre: string, file: File, idExistente?: string) => {
    console.log('🚀🚀🚀 handleDocumentoUpload INICIADO 🚀🚀🚀');
    console.log('🚀 Parámetros recibidos:', { tipo, nombre, fileName: file?.name, fileSize: file?.size, idExistente });
    
    if (!file) {
      console.error('❌ ERROR: No se recibió archivo');
      return;
    }
    
    const documentoId = idExistente || crypto.randomUUID();
    
    console.log('📄 handleDocumentoUpload procesando:', {
      tipo,
      nombre,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      idExistente,
      documentoId
    });
    
    // Si existe, reemplazarlo
    if (idExistente) {
      setPendingDocuments(prev => {
        const filtered = prev.filter(d => d.id !== idExistente);
        console.log('📄 Removiendo documento existente:', idExistente, 'Quedan:', filtered.length);
        return filtered;
      });
    }
    
    // Guardar el archivo en el ref para evitar que se pierda
    documentosFilesRef.current.set(documentoId, file);
    console.log('📄 Archivo guardado en ref:', documentoId, file.name, file.size, 'bytes');
    
    // Agregar a documentos pendientes
    setPendingDocuments(prev => {
      console.log('📄 setPendingDocuments - Estado anterior:', prev.length, 'documentos');
      const nuevoDocumento = {
        id: documentoId,
        tipo,
        nombre,
        file,
        uploaded: false,
      };
      const updated = [...prev, nuevoDocumento];
      console.log('✅✅✅ Documento agregado a pendingDocuments:', {
        totalAnterior: prev.length,
        totalNuevo: updated.length,
        nuevo: {
          id: documentoId,
          tipo,
          nombre,
          fileName: file.name,
          fileSize: file.size,
          hasFile: !!file && file.size > 0
        },
        todosLosIds: updated.map(d => d.id)
      });
      console.log('✅✅✅ pendingDocuments COMPLETO:', JSON.stringify(updated.map(d => ({
        id: d.id,
        tipo: d.tipo,
        nombre: d.nombre,
        hasFile: !!d.file,
        fileSize: d.file?.size || 0
      })), null, 2));
      return updated;
    });

    // También agregar a form.documentos para mostrar en UI (con URL temporal)
    // IMPORTANTE: Guardar también una referencia al archivo en el documento del form
    // para poder recuperarlo si pendingDocuments se pierde
    setForm(prev => {
      console.log('📄 setForm.documentos - Estado anterior:', prev.documentos.length, 'documentos');
      const documentosExistentes = prev.documentos.filter(d => d.id !== documentoId);
      const blobUrl = URL.createObjectURL(file);
      const nuevoDocumentoEnForm = {
        id: documentoId,
        tipo,
        nombre,
        url: blobUrl, // Temporal para preview
        fecha_subida: new Date().toISOString(),
        // Guardar metadata del archivo para poder recuperarlo
        _fileMetadata: {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
        }
      };
      const updated = {
        ...prev,
        documentos: [
          ...documentosExistentes,
          nuevoDocumentoEnForm
        ]
      };
      console.log('✅✅✅ Documento agregado a form.documentos:', {
        totalAnterior: prev.documentos.length,
        totalNuevo: updated.documentos.length,
        nuevo: nuevoDocumentoEnForm,
        todosLosIds: updated.documentos.map(d => d.id)
      });
      return updated;
    });
    
    console.log('✅✅✅✅✅ handleDocumentoUpload COMPLETADO ✅✅✅✅✅');
  };

  // Manejar eliminación de documentos
  const handleDocumentoRemove = (idOrTipo: string) => {
    // Remover de documentos pendientes
    setPendingDocuments(prev => prev.filter(d => d.id !== idOrTipo && d.tipo !== idOrTipo));
    
    // Remover del ref también
    const documento = form.documentos.find(d => d.id === idOrTipo || d.tipo === idOrTipo);
    if (documento) {
      documentosFilesRef.current.delete(documento.id);
      console.log('📄 Archivo removido del ref:', documento.id);
    }
    
    // Remover de form.documentos
    if (documento && documento.url.startsWith('blob:')) {
      URL.revokeObjectURL(documento.url);
    }
    
    setForm(prev => ({
      ...prev,
      documentos: prev.documentos.filter(d => d.id !== idOrTipo && d.tipo !== idOrTipo)
    }));
  };

  // Subir documentos pendientes
  const uploadPendingDocuments = async (documentsToProcess: Array<{
    id: string;
    tipo: string;
    nombre: string;
    file: File;
    uploaded?: boolean;
    url?: string;
  }>): Promise<Array<{ id: string; tipo: string; nombre: string; url: string; fecha_subida: string }>> => {
    if (!tenantActual?.id) {
      throw new Error('No hay tenant seleccionado');
    }

    const token = await getToken();
    const { apiFetch } = await import('../../services/api');
    
    console.log('📤 ========== UPLOAD PENDING DOCUMENTS ==========');
    console.log('📤 Total documentos recibidos:', documentsToProcess.length);
    
    const documentsToUpload = documentsToProcess.filter(doc => !doc.uploaded && doc.file && doc.file.size > 0);
    
    console.log('📤 Documentos pendientes (no subidos):', documentsToUpload.length);
    console.log('📤 Detalle de documentos pendientes:', documentsToUpload.map(doc => ({
      id: doc.id,
      tipo: doc.tipo,
      nombre: doc.nombre,
      fileName: doc.file?.name,
      fileSize: doc.file?.size,
      hasFile: !!doc.file
    })));
    console.log('📤 Documentos ya subidos:', documentsToProcess.filter(doc => doc.uploaded && doc.url).map(doc => ({
      id: doc.id,
      tipo: doc.tipo,
      url: doc.url
    })));
    
    // Si no hay documentos pendientes, usar los que ya están
    if (documentsToUpload.length === 0) {
      console.log('📤 No hay documentos pendientes, usando existentes');
      const existingDocs = form.documentos.filter(d => !d.url.startsWith('blob:'));
      console.log('📤 Documentos existentes del form:', existingDocs.length);
      return existingDocs;
    }

    const uploadedDocuments: Array<{ id: string; tipo: string; nombre: string; url: string; fecha_subida: string }> = [];

    try {
      // Subir todos los documentos en un solo request (similar a imágenes)
      const formData = new FormData();
      documentsToUpload.forEach((doc) => {
        formData.append('files', doc.file);
        console.log('📤 Agregando documento a FormData:', doc.file.name, doc.file.size, 'bytes');
      });

      console.log('📤 Enviando request de upload documentos a:', `/upload/propiedades/${tenantActual.id}/documentos`);

      const response = await apiFetch(
        `/upload/propiedades/${tenantActual.id}/documentos`,
        {
          method: 'POST',
          body: formData,
        },
        token
      );

      console.log('📤 Response documentos status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: 'Error desconocido',
          message: `Error ${response.status}: ${response.statusText}`
        }));
        console.error('❌ Error en response documentos:', errorData);
        throw new Error(errorData.message || errorData.error || 'Error al subir documentos');
      }

      const data = await response.json();
      console.log('📤 Response documentos data completo:', JSON.stringify(data, null, 2));
      
      // Mapear las URLs subidas con los documentos pendientes
      if (data.images && data.images.length > 0) {
        console.log('✅ Documentos subidos exitosamente:', data.images.length);
        console.log('✅ URLs de documentos:', data.images.map((img: any) => img.url));
        documentsToUpload.forEach((doc, index) => {
          if (data.images[index]) {
            const uploadedUrl = data.images[index].url;
            console.log(`✅ Documento ${index + 1} subido:`, doc.nombre, '->', uploadedUrl);
            uploadedDocuments.push({
              id: doc.id,
              tipo: doc.tipo,
              nombre: doc.nombre,
              url: uploadedUrl,
              fecha_subida: new Date().toISOString(),
            });

            // Limpiar blob URL
            const documentoEnForm = form.documentos.find(d => d.id === doc.id);
            if (documentoEnForm && documentoEnForm.url.startsWith('blob:')) {
              URL.revokeObjectURL(documentoEnForm.url);
            }
          } else {
            console.warn(`⚠️ No se recibió URL para documento ${index + 1}:`, doc.nombre);
          }
        });
      } else {
        console.error('❌ ERROR: No se recibieron documentos en la respuesta');
        console.error('❌ Response completo:', data);
        throw new Error('No se recibieron URLs de los documentos subidos');
      }
    } catch (err: any) {
      console.error('Error subiendo documentos:', err);
      throw new Error(`Error al subir documentos: ${err.message}`);
    }

    // Combinar documentos ya subidos con los nuevos
    // Primero obtener documentos existentes del form que ya tienen URL (no blob)
    const formDocuments = form.documentos.filter(d => !d.url.startsWith('blob:'));
    
    // También obtener documentos de documentsToProcess que ya están subidos
    const existingFromProcess = documentsToProcess
      .filter(doc => doc.uploaded && doc.url && !doc.url.startsWith('blob:'))
      .map(doc => ({
        id: doc.id,
        tipo: doc.tipo,
        nombre: doc.nombre,
        url: doc.url!,
        fecha_subida: new Date().toISOString()
      }));
    
    // Combinar: primero los existentes del form, luego los de process, luego los nuevos subidos
    const allDocuments = [...formDocuments, ...existingFromProcess, ...uploadedDocuments];
    
    // Eliminar duplicados por ID (mantener el último para URLs actualizadas)
    const uniqueDocuments = allDocuments.reduce((acc, doc) => {
      const existingIndex = acc.findIndex(d => d.id === doc.id);
      if (existingIndex >= 0) {
        // Reemplazar el existente con el nuevo (para mantener URLs actualizadas)
        acc[existingIndex] = doc;
      } else {
        acc.push(doc);
      }
      return acc;
    }, [] as Array<{ id: string; tipo: string; nombre: string; url: string; fecha_subida: string }>);
    
    console.log('✅ Total documentos finales:', uniqueDocuments.length);
    console.log('✅ Documentos finales:', uniqueDocuments);
    console.log('✅ Desglose:', {
      formDocuments: formDocuments.length,
      existingFromProcess: existingFromProcess.length,
      uploadedDocuments: uploadedDocuments.length,
      unique: uniqueDocuments.length
    });
    
    return uniqueDocuments;
  };

  // Estado para rastrear si el usuario ha editado manualmente el slug
  const [slugManualmenteEditado, setSlugManualmenteEditado] = useState(false);

  // Generar slug automáticamente cuando cambie el título (en modo creación)
  // Se actualiza en tiempo real mientras el usuario escribe
  useEffect(() => {
    // Solo auto-generar si:
    // 1. Hay título
    // 2. NO estamos en modo edición
    // 3. El usuario NO ha editado manualmente el slug
    if (form.titulo && !isEditing && !slugManualmenteEditado) {
      setForm(prev => ({ ...prev, slug: generarSlug(form.titulo) }));
    }
  }, [form.titulo, isEditing, slugManualmenteEditado]);

  // Eliminar amenidad
  const handleRemoveAmenidad = (amenidad: string) => {
    setForm(prev => ({
      ...prev,
      amenidades: prev.amenidades.filter(a => a !== amenidad),
    }));
  };


  // Tabs dinámicos (incluir proyecto si is_project es true)
  const TABS = React.useMemo(() => {
    if (form.is_project) {
      return [
        BASE_TABS[0], // Información Principal
        PROYECTO_TAB, // Datos del Proyecto
        ...BASE_TABS.slice(1), // Estado y Multimedia
      ];
    }
    return BASE_TABS;
  }, [form.is_project]);

  if (loading) {
    return (
      <div className="propiedad-editar-loading">
        <Icons.loader className="spin" />
        <p>Cargando propiedad...</p>
        <style>{`
          .propiedad-editar-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            gap: 16px;
            color: #64748b;
          }
          .spin {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const currentTab = TABS.find(t => t.id === activeTab) || TABS[0];
  const TabIcon = currentTab.icon;

  return (
    <div className="propiedad-editar">
      {error && (
        <div className="error-banner">
          <strong>⚠️ Error:</strong> {error}
          <button onClick={() => setError(null)}><Icons.x /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-header">
        {TABS.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <IconComponent size={20} />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="tab-content-wrapper">
        {/* TAB: Información Básica */}
        {activeTab === 'basica' && (
          <div className="tab-content">
            <div className="form-section">
              <h3 className="section-title">Información Principal</h3>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label htmlFor="titulo">Título de la Propiedad *</label>
                  <input
                    id="titulo"
                    type="text"
                    value={form.titulo}
                    onChange={(e) => setForm(prev => ({ ...prev, titulo: e.target.value }))}
                    placeholder="Ej: Hermosa casa en Naco con 3 habitaciones"
                    required
                  />
                  {/* Vista previa del slug en modo creación */}
                  {!isEditing && form.titulo && (
                    <small className="form-hint" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginTop: '4px',
                      color: 'var(--premium-primary)'
                    }}>
                      <span>URL: <strong>{form.slug || generarSlug(form.titulo)}</strong></span>
                    </small>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="codigo">Código Interno</label>
                  <input
                    id="codigo"
                    type="text"
                    value={form.codigo}
                    onChange={(e) => setForm(prev => ({ ...prev, codigo: e.target.value }))}
                    placeholder="Ej: PRO-001"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="tipo">Tipo de Propiedad *</label>
                  <select
                    id="tipo"
                    value={form.tipo}
                    onChange={(e) => setForm(prev => ({ ...prev, tipo: e.target.value as TipoPropiedad }))}
                    required
                    disabled={loadingCatalogos}
                  >
                    {loadingCatalogos ? (
                      <option value="">Cargando...</option>
                    ) : categoriasCatalogo.length === 0 ? (
                      <option value="">No hay categorías disponibles</option>
                    ) : (
                      categoriasCatalogo.map(cat => (
                        <option key={cat.id} value={cat.slug}>
                          {cat.nombre}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="operacion">Operación *</label>
                  <select
                    id="operacion"
                    value={form.operacion}
                    onChange={(e) => setForm(prev => ({ ...prev, operacion: e.target.value as OperacionPropiedad }))}
                    required
                    disabled={loadingCatalogos}
                  >
                    {loadingCatalogos ? (
                      <option value="">Cargando...</option>
                    ) : operacionesCatalogo.length === 0 ? (
                      <option value="">No hay operaciones disponibles</option>
                    ) : (
                      operacionesCatalogo.map(op => (
                        <option key={op.id} value={op.slug}>{op.nombre}</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="form-group toggle-centered">
                  <ToggleSwitch
                    label="ES PROYECTO"
                    description="Activa para habilitar datos del proyecto"
                    checked={form.is_project}
                    onChange={(checked) => {
                      setForm(prev => ({ ...prev, is_project: checked }));
                      if (checked && TABS.find(t => t.id === 'proyecto')) {
                        setTimeout(() => setActiveTab('proyecto'), 100);
                      }
                    }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="nombre_privado">Nombre Privado</label>
                  <input
                    id="nombre_privado"
                    type="text"
                    value={form.nombre_privado}
                    onChange={(e) => setForm(prev => ({ ...prev, nombre_privado: e.target.value }))}
                    placeholder="Ej: Casa Pérez, Proyecto Torre Norte"
                  />
                </div>

              </div>
            </div>

            <div className="form-section">
              <h3 className="section-title">Descripción</h3>
                <div className="form-group full-width">
                  <label htmlFor="descripcion">Descripción</label>
                  <RichTextEditor
                    value={form.descripcion}
                    onChange={(value) => setForm(prev => ({ ...prev, descripcion: value }))}
                    placeholder="Describe la propiedad en detalle. Puedes usar formato, enlaces, listas y más..."
                    height="300px"
                  />
                  <small className="form-hint">
                    El contenido se guardará como HTML y se mostrará tal cual en el sitio web público
                  </small>
              </div>
            </div>

            {/* Sección de Precios */}
            <div className="form-section">
              <h3 className="section-title">Precios</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="precio_venta">Precio de Venta</label>
                  <input
                    id="precio_venta"
                    type="number"
                    step="0.01"
                    value={form.precio_venta}
                    onChange={(e) => {
                      console.log('🔴 CAMBIO precio_venta:', e.target.value);
                      setForm(prev => ({ ...prev, precio_venta: e.target.value }));
                    }}
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="precio_alquiler">Precio de Alquiler</label>
                  <input
                    id="precio_alquiler"
                    type="number"
                    step="0.01"
                    value={form.precio_alquiler}
                    onChange={(e) => {
                      console.log('🔴 CAMBIO precio_alquiler:', e.target.value);
                      setForm(prev => ({ ...prev, precio_alquiler: e.target.value }));
                    }}
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="precio_alquiler_temporal">Alquiler Temporal</label>
                  <input
                    id="precio_alquiler_temporal"
                    type="number"
                    step="0.01"
                    value={form.precio_alquiler_temporal}
                    onChange={(e) => setForm(prev => ({ ...prev, precio_alquiler_temporal: e.target.value }))}
                    placeholder="0.00"
                  />
                  <small className="form-hint">Precio por día/semana</small>
                </div>

                <div className="form-group">
                  <label htmlFor="precio_venta_amueblado">Precio Venta Amueblado</label>
                  <input
                    id="precio_venta_amueblado"
                    type="number"
                    step="0.01"
                    value={form.precio_venta_amueblado}
                    onChange={(e) => setForm(prev => ({ ...prev, precio_venta_amueblado: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="precio_alquiler_amueblado">Precio Alquiler Amueblado</label>
                  <input
                    id="precio_alquiler_amueblado"
                    type="number"
                    step="0.01"
                    value={form.precio_alquiler_amueblado}
                    onChange={(e) => setForm(prev => ({ ...prev, precio_alquiler_amueblado: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="maintenance">Mantenimiento Mensual</label>
                  <input
                    id="maintenance"
                    type="number"
                    step="0.01"
                    value={form.maintenance}
                    onChange={(e) => setForm(prev => ({ ...prev, maintenance: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="moneda">Moneda *</label>
                  <select
                    id="moneda"
                    value={form.moneda}
                    onChange={(e) => setForm(prev => ({ ...prev, moneda: e.target.value }))}
                    required
                  >
                    {monedasCatalogo.map(moneda => (
                      <option key={moneda.codigo} value={moneda.codigo}>
                        {moneda.codigo} - {moneda.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Comisión */}
                <div className="form-group" style={{ position: 'relative' }}>
                  <label htmlFor="comision">Comisión %</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="comision"
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={form.comision}
                      onChange={(e) => setForm(prev => ({ ...prev, comision: e.target.value }))}
                      placeholder="3.5"
                      style={{ paddingRight: '30px' }}
                    />
                    <span style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#64748b',
                      fontWeight: 500,
                      pointerEvents: 'none'
                    }}>%</span>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="comision_nota">Nota de Comisión</label>
                  <input
                    id="comision_nota"
                    type="text"
                    value={form.comision_nota}
                    onChange={(e) => setForm(prev => ({ ...prev, comision_nota: e.target.value }))}
                    placeholder="Ej: Incluye gastos de cierre"
                  />
                </div>
              </div>
            </div>

            {/* Sección de Características */}
            <div className="form-section">
              <h3 className="section-title">Características Físicas</h3>
              <div className="form-grid form-grid-spaced">
                <NumberToggle
                  label="Habitaciones"
                  value={form.habitaciones}
                  onChange={(value) => setForm(prev => ({ ...prev, habitaciones: value }))}
                  min={0}
                  max={50}
                />

                <NumberToggle
                  label="Baños Completos"
                  value={form.banos}
                  onChange={(value) => setForm(prev => ({ ...prev, banos: value }))}
                  min={0}
                  max={20}
                  quickOptions={[1, 2, 3]}
                />

                <NumberToggle
                  label="Medios Baños"
                  value={form.medios_banos}
                  onChange={(value) => setForm(prev => ({ ...prev, medios_banos: value }))}
                  min={0}
                  max={10}
                  quickOptions={[1, 2, 3]}
                />

                <NumberToggle
                  label="Estacionamientos"
                  value={form.estacionamientos}
                  onChange={(value) => setForm(prev => ({ ...prev, estacionamientos: value }))}
                  min={0}
                  max={20}
                  quickOptions={[1, 2, 3]}
                />
              </div>

              <div className="form-group" style={{ marginTop: '20px' }}>
                  <div className="checkboxes-grid">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={form.bano_visita}
                        onChange={(e) => setForm(prev => ({ ...prev, bano_visita: e.target.checked }))}
                      />
                      <span>Baño de Visita</span>
                    </label>

                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={form.cuarto_servicio}
                        onChange={(e) => setForm(prev => ({ ...prev, cuarto_servicio: e.target.checked }))}
                      />
                      <span>Cuarto de Servicio</span>
                    </label>
                  </div>
                </div>

              <div className="form-grid" style={{ marginTop: '20px' }}>
                <div className="form-group">
                  <label htmlFor="m2_construccion">M² Construcción</label>
                  <input
                    id="m2_construccion"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.m2_construccion}
                    onChange={(e) => setForm(prev => ({ ...prev, m2_construccion: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="m2_terreno">M² Terreno</label>
                  <input
                    id="m2_terreno"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.m2_terreno}
                    onChange={(e) => setForm(prev => ({ ...prev, m2_terreno: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="antiguedad">Antigüedad (años)</label>
                  <input
                    id="antiguedad"
                    type="number"
                    min="0"
                    value={form.antiguedad}
                    onChange={(e) => setForm(prev => ({ ...prev, antiguedad: e.target.value }))}
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="year_built">Año de Construcción</label>
                  <input
                    id="year_built"
                    type="number"
                    min="1800"
                    max={new Date().getFullYear()}
                    value={form.year_built}
                    onChange={(e) => setForm(prev => ({ ...prev, year_built: e.target.value }))}
                    placeholder="2024"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="pisos">Pisos del Edificio</label>
                  <input
                    id="pisos"
                    type="number"
                    min="0"
                    value={form.pisos}
                    onChange={(e) => setForm(prev => ({ ...prev, pisos: e.target.value }))}
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="floor_level">Piso de la Propiedad</label>
                  <input
                    id="floor_level"
                    type="number"
                    value={form.floor_level}
                    onChange={(e) => setForm(prev => ({ ...prev, floor_level: e.target.value }))}
                    placeholder="Ej: 5"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="condition">Estado de la Propiedad (1-10)</label>
                  <select
                    id="condition"
                    value={form.condition}
                    onChange={(e) => setForm(prev => ({ ...prev, condition: e.target.value }))}
                  >
                    <option value="">Seleccionar estado</option>
                    <option value="1">1 - Muy Malo</option>
                    <option value="2">2 - Malo</option>
                    <option value="3">3 - Regular</option>
                    <option value="4">4 - Aceptable</option>
                    <option value="5">5 - Bueno</option>
                    <option value="6">6 - Muy Bueno</option>
                    <option value="7">7 - Excelente</option>
                    <option value="8">8 - Óptimo</option>
                    <option value="9">9 - Perfecto</option>
                    <option value="10">10 - Nuevo</option>
                  </select>
                  <small className="form-hint">1 = Muy malo, 10 = Excelente/Nuevo</small>
                </div>
              </div>
            </div>

            {/* Sección de Amenidades */}
            <div className="form-section">
              <h3 className="section-title">Amenidades</h3>
              <div className="amenidades-section">
                {loadingAmenidades ? (
                  <div className="loading-amenidades">
                    <Icons.loader className="spin" />
                    <span>Cargando amenidades...</span>
                  </div>
                ) : Object.keys(amenidadesCatalogo).length === 0 ? (
                  <p className="empty-state">No hay amenidades disponibles</p>
                ) : (
                  <div className="amenidades-por-categoria">
                    {Object.entries(amenidadesCatalogo).map(([categoria, amenidades]) => (
                      <div key={categoria} className="categoria-amenidades">
                        <label className="categoria-title">
                          {categoria.charAt(0).toUpperCase() + categoria.slice(1).replace(/_/g, ' ')}
                        </label>
                        <div className="amenidades-tags">
                          {amenidades.map((amenidad) => (
                            <button
                              key={amenidad.id}
                              type="button"
                              className={`amenidad-tag ${form.amenidades.includes(amenidad.nombre) ? 'active' : ''}`}
                              onClick={() => {
                                if (form.amenidades.includes(amenidad.nombre)) {
                                  handleRemoveAmenidad(amenidad.nombre);
                                } else {
                                  setForm(prev => ({
                                    ...prev,
                                    amenidades: [...prev.amenidades, amenidad.nombre],
                                  }));
                                }
                              }}
                              title={amenidad.nombre}
                            >
                              {amenidad.icono && <i className={amenidad.icono} style={{ marginRight: '4px' }} />}
                              {amenidad.nombre}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="amenidades-custom">
                  <label>Agregar Amenidad Personalizada</label>
                  <div className="input-with-button">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowAmenidadModal(true)}
                    >
                      <Icons.plus />
                      Agregar Nueva Amenidad
                    </button>
                  </div>
                </div>

                <div className="amenidades-selected">
                  <label>Amenidades Seleccionadas ({form.amenidades.length})</label>
                  {form.amenidades.length === 0 ? (
                    <p className="empty-state">No hay amenidades seleccionadas</p>
                  ) : (
                    <div className="amenidades-list">
                      {form.amenidades.map((amenidad, index) => (
                        <div key={index} className="amenidad-item">
                          <span>{amenidad}</span>
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => handleRemoveAmenidad(amenidad)}
                            title="Eliminar"
                          >
                            <Icons.x />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Datos del Proyecto (solo visible si is_project es true) */}
        {activeTab === 'proyecto' && form.is_project && (
          <div className="tab-content">
            {/* Desarrollador - Compacto */}
            <div className="form-section">
              <div className="form-grid" style={{ gridTemplateColumns: '1fr', gap: '16px' }}>
                <div className="form-group" style={{ maxWidth: '400px' }}>
                  <label>Desarrollador del Proyecto</label>
                  <ContactPicker
                    value={form.desarrollador_id || null}
                    onChange={(contactId) => {
                      setForm(prev => ({ ...prev, desarrollador_id: contactId || '' }));
                    }}
                    contacts={contactos.filter(c => {
                      // Verificar tipo principal
                      if (c.tipo === 'desarrollador') return true;
                      // Verificar tipos_contacto (puede ser array o string JSON)
                      if (c.tipos_contacto) {
                        const tipos = Array.isArray(c.tipos_contacto) 
                          ? c.tipos_contacto 
                          : (typeof c.tipos_contacto === 'string' ? JSON.parse(c.tipos_contacto) : []);
                        return tipos.includes('desarrollador');
                      }
                      return false;
                    })}
                    loading={loadingContactos}
                    placeholder="Buscar desarrollador..."
                    clearable
                    tenantId={tenantActual?.id}
                    defaultContactType="desarrollador"
                    onCreateContact={(contact) => {
                      setContactos(prev => [...prev, contact]);
                    }}
                  />
                  <small className="form-hint">Contacto responsable del desarrollo</small>
                </div>
              </div>
            </div>

            {/* Tipologías y Etapas - Dos Columnas */}
            <div className="form-section">
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'flex-start' }}>
                {/* Tipologías - Columna Izquierda */}
                <div>
                  <h3 className="section-title" style={{ marginBottom: '16px' }}>Tipologías</h3>
                  <div className="form-group full-width">
                    <p className="form-hint" style={{ marginBottom: '16px', fontSize: '0.875rem' }}>
                      Define las diferentes variantes de unidades disponibles en el proyecto
                    </p>
                    
                    {/* Botón para agregar tipología */}
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setTipologiaEditando(null);
                        setShowTipologiaModal(true);
                      }}
                      style={{ marginBottom: '16px', width: '100%' }}
                    >
                      <Icons.plus /> Agregar Tipología
                    </button>

                    {/* Lista de tipologías existentes */}
                    {form.tipologias.length > 0 && (
                      <div className="tipologias-list">
                        {form.tipologias.map((tipologia, index) => (
                          <div key={tipologia.id} className="tipologia-item" style={{ 
                            padding: '12px', 
                            border: '1px solid #e2e8f0', 
                            borderRadius: '10px', 
                            marginBottom: '10px',
                            background: '#f8fafc',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ margin: 0, marginBottom: '6px', fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>
                                {tipologia.nombre || 'Tipología sin nombre'}
                              </h4>
                              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '0.8rem', color: '#64748b', alignItems: 'center' }}>
                                {tipologia.habitaciones && parseInt(tipologia.habitaciones) > 0 && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <Bed size={14} /> {tipologia.habitaciones}
                                  </span>
                                )}
                                {tipologia.banos && parseInt(tipologia.banos) > 0 && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <Bath size={14} /> {tipologia.banos}
                                  </span>
                                )}
                                {tipologia.medios_banos && parseInt(tipologia.medios_banos) > 0 && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <ShowerHead size={14} /> {tipologia.medios_banos}
                                  </span>
                                )}
                                {tipologia.studio && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <Home size={14} /> Studio
                                  </span>
                                )}
                                {tipologia.estacionamiento && parseInt(tipologia.estacionamiento) > 0 && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <Car size={14} /> {tipologia.estacionamiento}
                                  </span>
                                )}
                                {tipologia.m2 && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <Maximize size={14} /> {tipologia.m2} M²
                                  </span>
                                )}
                                {tipologia.precio && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <DollarSign size={14} /> {form.moneda}$ {Number(tipologia.precio).toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                                onClick={() => {
                                  setTipologiaEditando(tipologia);
                                  setShowTipologiaModal(true);
                                }}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="btn-icon danger"
                                style={{ padding: '6px' }}
                                onClick={() => {
                                  setForm(prev => ({
                                    ...prev,
                                    tipologias: prev.tipologias.filter((_, i) => i !== index)
                                  }));
                                }}
                                title="Eliminar tipología"
                              >
                                <Icons.x />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {form.tipologias.length === 0 && (
                      <div style={{
                        padding: '24px',
                        textAlign: 'center',
                        color: '#94a3b8',
                        border: '2px dashed #cbd5e1',
                        borderRadius: '10px',
                        background: '#f8fafc',
                        fontSize: '0.875rem'
                      }}>
                        <p style={{ margin: 0 }}>No hay tipologías agregadas</p>
                      </div>
                    )}

                    {/* Resumen de rangos calculados */}
                    {form.tipologias.length > 0 && (() => {
                      const tipologias = form.tipologias;
                      const precios = tipologias
                        .map(t => t.precio ? parseFloat(t.precio.replace(/[^0-9.]/g, '')) : null)
                        .filter((p): p is number => p !== null && !isNaN(p) && p > 0);
                      const m2s = tipologias
                        .map(t => t.m2 ? parseFloat(t.m2) : null)
                        .filter((m): m is number => m !== null && !isNaN(m) && m > 0);
                      const habs = tipologias
                        .map(t => t.habitaciones ? parseInt(t.habitaciones) : null)
                        .filter((h): h is number => h !== null && !isNaN(h) && h > 0);
                      const banos = tipologias
                        .map(t => t.banos ? parseInt(t.banos) : null)
                        .filter((b): b is number => b !== null && !isNaN(b) && b > 0);

                      const formatPrice = (num: number) =>
                        new Intl.NumberFormat('es-DO', { style: 'currency', currency: form.moneda || 'USD', maximumFractionDigits: 0 }).format(num);

                      const showRange = (arr: number[], format?: (n: number) => string) => {
                        if (arr.length === 0) return null;
                        const min = Math.min(...arr);
                        const max = Math.max(...arr);
                        const fmt = format || ((n: number) => n.toString());
                        return min === max ? fmt(min) : `${fmt(min)} - ${fmt(max)}`;
                      };

                      return (
                        <div style={{
                          marginTop: '16px',
                          padding: '16px',
                          background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
                          border: '1px solid #86efac',
                          borderRadius: '10px',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                          gap: '12px'
                        }}>
                          <div style={{ fontSize: '0.75rem', color: '#166534', gridColumn: '1 / -1', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <BarChart3 size={14} /> Rangos calculados del proyecto:
                          </div>
                          {precios.length > 0 && (
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Precio</div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#166534' }}>
                                {showRange(precios, formatPrice)}
                              </div>
                            </div>
                          )}
                          {m2s.length > 0 && (
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>M²</div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>
                                {showRange(m2s)} m²
                              </div>
                            </div>
                          )}
                          {habs.length > 0 && (
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Habitaciones</div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>
                                {showRange(habs)}
                              </div>
                            </div>
                          )}
                          {banos.length > 0 && (
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Baños</div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>
                                {showRange(banos)}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Etapas - Columna Derecha */}
                <div>
                  <h3 className="section-title" style={{ marginBottom: '16px' }}>Etapas</h3>
                  <div className="form-group full-width">
                    <p className="form-hint" style={{ marginBottom: '16px', fontSize: '0.875rem' }}>
                      Define las diferentes etapas del proyecto con sus fechas de entrega
                    </p>
                    
                    {/* Botón para agregar etapa */}
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setEtapaEditando(null);
                        setShowEtapaModal(true);
                      }}
                      style={{ marginBottom: '16px', width: '100%' }}
                    >
                      <Icons.plus /> Agregar Etapa
                    </button>

                    {/* Lista de etapas existentes */}
                    {form.etapas.length > 0 && (
                      <div className="etapas-list">
                        {form.etapas.map((etapa, index) => {
                          // Formatear fecha para mostrar (YYYY-MM -> Mes Año)
                          const formatFecha = (fecha: string) => {
                            if (!fecha) return 'Sin fecha';
                            const [year, month] = fecha.split('-').map(Number);
                            const MONTHS = [
                              'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                              'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                            ];
                            return `${MONTHS[month - 1]} ${year}`;
                          };

                          return (
                            <div key={etapa.id} className="etapa-item" style={{ 
                              padding: '12px', 
                              border: '1px solid #e2e8f0', 
                              borderRadius: '10px', 
                              marginBottom: '10px',
                              background: '#f8fafc',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <div style={{ flex: 1 }}>
                                <h4 style={{ margin: 0, marginBottom: '6px', fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>
                                  {etapa.nombre || 'Etapa sin nombre'}
                                </h4>
                                <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Calendar size={14} /> {formatFecha(etapa.fecha_entrega)}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                                  onClick={() => {
                                    setEtapaEditando(etapa);
                                    setShowEtapaModal(true);
                                  }}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className="btn-icon danger"
                                  style={{ padding: '6px' }}
                                  onClick={() => {
                                    setForm(prev => ({
                                      ...prev,
                                      etapas: prev.etapas.filter((_, i) => i !== index)
                                    }));
                                  }}
                                  title="Eliminar etapa"
                                >
                                  <Icons.x />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {form.etapas.length === 0 && (
                      <div style={{ 
                        padding: '24px', 
                        textAlign: 'center', 
                        color: '#94a3b8',
                        border: '2px dashed #cbd5e1',
                        borderRadius: '10px',
                        background: '#f8fafc',
                        fontSize: '0.875rem'
                      }}>
                        <p style={{ margin: 0 }}>No hay etapas agregadas</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Planes de Pago - Mejorado */}
            <div className="form-section">
              <h3 className="section-title">Planes de Pago</h3>
              <div className="form-group full-width">
                <p className="form-hint" style={{ marginBottom: '16px' }}>
                  La suma de Separación, Inicial y Contra Entrega debe dar 100%. Contra Entrega se calcula automáticamente.
                </p>
                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  <div className="form-group">
                    <label>Reserva (Monto Fijo)</label>
                    <input
                      type="text"
                      value={form.planes_pago.reserva_valor}
                      onChange={(e) => setForm(prev => ({
                        ...prev,
                        planes_pago: { ...prev.planes_pago, reserva_valor: e.target.value }
                      }))}
                      placeholder="Ej: USD 5,000"
                    />
                    <small className="form-hint">Monto fijo de reserva</small>
                  </div>
                  <div className="form-group">
                    <label>Separación (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.planes_pago.separacion}
                      onChange={(e) => {
                        const separacion = parseFloat(e.target.value) || 0;
                        const inicial = parseFloat(form.planes_pago.inicial_construccion) || 0;
                        const contraEntrega = Math.max(0, 100 - separacion - inicial);
                        setForm(prev => ({
                          ...prev,
                          planes_pago: { 
                            ...prev.planes_pago, 
                            separacion: e.target.value,
                            contra_entrega: contraEntrega.toFixed(1)
                          }
                        }));
                      }}
                      placeholder="Ej: 10"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div className="form-group">
                    <label>Inicial Durante Construcción (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.planes_pago.inicial_construccion}
                      onChange={(e) => {
                        const inicial = parseFloat(e.target.value) || 0;
                        const separacion = parseFloat(form.planes_pago.separacion) || 0;
                        const contraEntrega = Math.max(0, 100 - separacion - inicial);
                        setForm(prev => ({
                          ...prev,
                          planes_pago: { 
                            ...prev.planes_pago, 
                            inicial_construccion: e.target.value,
                            contra_entrega: contraEntrega.toFixed(1)
                          }
                        }));
                      }}
                      placeholder="Ej: 30"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div className="form-group">
                    <label>Contra Entrega (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.planes_pago.contra_entrega}
                      onChange={(e) => {
                        const contraEntrega = parseFloat(e.target.value) || 0;
                        const separacion = parseFloat(form.planes_pago.separacion) || 0;
                        const inicial = Math.max(0, 100 - separacion - contraEntrega);
                        setForm(prev => ({
                          ...prev,
                          planes_pago: { 
                            ...prev.planes_pago, 
                            contra_entrega: e.target.value,
                            inicial_construccion: inicial.toFixed(1)
                          }
                        }));
                      }}
                      placeholder="Auto-calculado"
                      min="0"
                      max="100"
                      style={{ 
                        background: (() => {
                          const separacion = parseFloat(form.planes_pago.separacion) || 0;
                          const inicial = parseFloat(form.planes_pago.inicial_construccion) || 0;
                          const contraEntrega = parseFloat(form.planes_pago.contra_entrega) || 0;
                          return separacion + inicial + contraEntrega === 100 ? '#f0fdf4' : '#fef2f2';
                        })(),
                        borderColor: (() => {
                          const separacion = parseFloat(form.planes_pago.separacion) || 0;
                          const inicial = parseFloat(form.planes_pago.inicial_construccion) || 0;
                          const contraEntrega = parseFloat(form.planes_pago.contra_entrega) || 0;
                          return separacion + inicial + contraEntrega === 100 ? '#86efac' : '#fca5a5';
                        })()
                      }}
                    />
                    <small className="form-hint" style={{ 
                      color: (() => {
                        const separacion = parseFloat(form.planes_pago.separacion) || 0;
                        const inicial = parseFloat(form.planes_pago.inicial_construccion) || 0;
                        const contraEntrega = parseFloat(form.planes_pago.contra_entrega) || 0;
                        const total = separacion + inicial + contraEntrega;
                        return total === 100 ? '#10b981' : total > 100 ? '#dc2626' : '#64748b';
                      })()
                    }}>
                      Total: {(() => {
                        const separacion = parseFloat(form.planes_pago.separacion) || 0;
                        const inicial = parseFloat(form.planes_pago.inicial_construccion) || 0;
                        const contraEntrega = parseFloat(form.planes_pago.contra_entrega) || 0;
                        return (separacion + inicial + contraEntrega).toFixed(1);
                      })()}%
                    </small>
                  </div>
                </div>
              </div>
            </div>

            {/* Beneficios del Proyecto */}
            <div className="form-section">
              <h3 className="section-title">Beneficios del Proyecto</h3>
              <div className="form-group full-width">
                <div className="checkboxes-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                  {['Fideicomiso', 'Bono Primera Vivienda', 'Incluye Línea Blanca', 'Green', 'Bono Militar'].map((beneficio) => (
                    <label key={beneficio} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={form.beneficios.includes(beneficio)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm(prev => ({
                              ...prev,
                              beneficios: [...prev.beneficios, beneficio]
                            }));
                          } else {
                            setForm(prev => ({
                              ...prev,
                              beneficios: prev.beneficios.filter(b => b !== beneficio)
                            }));
                          }
                        }}
                      />
                      <span>{beneficio}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Garantías del Proyecto */}
            <div className="form-section">
              <h3 className="section-title">Garantías del Proyecto</h3>
              <div className="form-group full-width">
                <p className="form-hint" style={{ marginBottom: '16px' }}>
                  Selecciona las garantías y permisos con los que cuenta el proyecto para avalar que es seguro
                </p>
                <div className="checkboxes-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                  {[
                    'Permiso de Medio Ambiente',
                    'Turismo',
                    'Obras Públicas',
                    'Ayuntamiento',
                    'Licencia de Construcción',
                    'Evaluación Legal'
                  ].map((garantia) => (
                    <label key={garantia} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={form.garantias.includes(garantia)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm(prev => ({
                              ...prev,
                              garantias: [...prev.garantias, garantia]
                            }));
                          } else {
                            setForm(prev => ({
                              ...prev,
                              garantias: prev.garantias.filter(g => g !== garantia)
                            }));
                          }
                        }}
                      />
                      <span>{garantia}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Multimedia */}
        {activeTab === 'multimedia' && (
          <div className="tab-content">
            <div className="form-section">
              {tenantActual?.id ? (
                <ImageUploader
                  tenantId={tenantActual.id}
                  mainImage={form.imagen_principal}
                  images={form.imagenes}
                  onMainImageChange={(url) => {
                    setForm(prev => ({ ...prev, imagen_principal: url }));
                  }}
                  onImagesChange={(urls) => {
                    // Solo actualizar si realmente cambió (evitar loops)
                    setForm(prev => {
                      const currentUrls = prev.imagenes || [];
                      const urlsChanged = 
                        currentUrls.length !== urls.length ||
                        currentUrls.some((url, i) => url !== urls[i]);
                      
                      if (!urlsChanged) {
                        return prev; // No cambiar si es lo mismo
                      }
                      
                      const updated = { ...prev, imagenes: urls };
                      // Si no hay imagen principal y hay imágenes, asignar la primera
                      if (!updated.imagen_principal && urls.length > 0) {
                        updated.imagen_principal = urls[0];
                      }
                      return updated;
                    });
                  }}
                  getImagesRef={imageUploaderRef}
                  onImagesDataChange={(images) => {
                    console.log('🔄 ImageUploader notificó cambio en imágenes:', {
                      total: images.length,
                      nuevas: images.filter(img => !img.uploaded).length,
                      subidas: images.filter(img => img.uploaded).length,
                      detalle: images.map(img => ({
                        id: img.id,
                        uploaded: img.uploaded,
                        isMain: img.isMain,
                        hasFile: !!img.file && img.file.size > 0,
                        fileName: img.file?.name || 'N/A',
                        hasUrl: !!img.url
                      }))
                    });
                    
                    // CRÍTICO: Siempre actualizar
                    console.log('✅ Actualizando pendingImages:', {
                      anterior: pendingImages.length,
                      nuevo: images.length
                    });
                    setPendingImages(images);
                  }}
                  maxImages={50}
                  folder="propiedades"
                  propertyTitle={form.titulo}
                  propertyCode={form.codigo}
                />
              ) : (
                <div className="error-banner">
                  <strong>⚠️ Error:</strong> No se pudo cargar la información del tenant. Por favor, recarga la página.
                </div>
              )}
            </div>

            <div className="form-section">
              <h3 className="section-title">Videos y Tours</h3>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label htmlFor="video_url">URL de Video</label>
                  <input
                    id="video_url"
                    type="url"
                    value={form.video_url}
                    onChange={(e) => setForm(prev => ({ ...prev, video_url: e.target.value }))}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="tour_virtual_url">URL de Tour Virtual</label>
                  <input
                    id="tour_virtual_url"
                    type="url"
                    value={form.tour_virtual_url}
                    onChange={(e) => setForm(prev => ({ ...prev, tour_virtual_url: e.target.value }))}
                    placeholder="https://matterport.com/..."
                  />
                </div>
              </div>
            </div>

            {/* Relacionar con Contenido */}
            <div className="form-section">
              <h3 className="section-title">Relacionar con Contenido</h3>
              <div className="form-group full-width">
                <p className="form-hint" style={{ marginBottom: '20px' }}>
                  Relaciona esta propiedad con FAQs, Videos y Artículos para mejorar la experiencia del usuario
                </p>
                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowFaqsModal(true)}
                    style={{ 
                      padding: '20px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      gap: '12px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '12px',
                      background: '#f8fafc',
                      transition: 'all 0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#6366f1';
                      e.currentTarget.style.background = '#f0f4ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                  >
                    <span style={{ fontSize: '2rem' }}>❓</span>
                    <span style={{ fontWeight: 600, fontSize: '1rem', color: '#1e293b' }}>Relacionar con FAQs</span>
                    <span style={{ fontSize: '0.875rem', color: '#64748b', textAlign: 'center' }}>
                      Buscar o crear preguntas frecuentes relacionadas
                    </span>
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowVideosModal(true)}
                    style={{ 
                      padding: '20px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      gap: '12px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '12px',
                      background: '#f8fafc',
                      transition: 'all 0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#6366f1';
                      e.currentTarget.style.background = '#f0f4ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                  >
                    <span style={{ fontSize: '2rem' }}>🎥</span>
                    <span style={{ fontWeight: 600, fontSize: '1rem', color: '#1e293b' }}>Relacionar con Videos</span>
                    <span style={{ fontSize: '0.875rem', color: '#64748b', textAlign: 'center' }}>
                      Buscar o crear videos relacionados
                    </span>
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowArticulosModal(true)}
                    style={{ 
                      padding: '20px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      gap: '12px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '12px',
                      background: '#f8fafc',
                      transition: 'all 0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#6366f1';
                      e.currentTarget.style.background = '#f0f4ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                  >
                    <span style={{ fontSize: '2rem' }}>📄</span>
                    <span style={{ fontWeight: 600, fontSize: '1rem', color: '#1e293b' }}>Relacionar con Artículos</span>
                    <span style={{ fontSize: '0.875rem', color: '#64748b', textAlign: 'center' }}>
                      Buscar o crear artículos relacionados
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Estado y Configuración */}
        {activeTab === 'estado' && (
          <div className="tab-content">
            {/* Layout 70/30: Ubicación a la izquierda (prioritaria), resto a la derecha */}
            <div className="ubicacion-priority-layout">
              {/* Columna Principal (70%): Ubicación */}
              <div className="ubicacion-main-column">
                <div className="form-section ubicacion-section-large">
                  <h3 className="section-title">Ubicacion Geografica</h3>
                  <p className="section-hint">
                    Busca una direccion o haz clic en el mapa. Verifica que los datos detectados sean correctos.
                  </p>

                  <UbicacionCompleta
                    value={{
                      pais: form.pais,
                      provincia: form.provincia,
                      ciudad: form.ciudad,
                      sector: form.sector,
                      direccion: form.direccion,
                      latitud: form.latitud,
                      longitud: form.longitud,
                    }}
                    onChange={(ubicacion) => {
                      setForm(prev => ({
                        ...prev,
                        pais: ubicacion.pais,
                        provincia: ubicacion.provincia,
                        ciudad: ubicacion.ciudad,
                        sector: ubicacion.sector,
                        direccion: ubicacion.direccion,
                        latitud: ubicacion.latitud,
                        longitud: ubicacion.longitud,
                      }));
                    }}
                    showMap={true}
                    mapHeight="400px"
                  />

                  <div className="form-group full-width" style={{ marginTop: '16px' }}>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={form.mostrar_ubicacion_exacta}
                        onChange={(e) => setForm(prev => ({ ...prev, mostrar_ubicacion_exacta: e.target.checked }))}
                      />
                      <span>Mostrar ubicacion exacta (GPS) en el sitio web</span>
                    </label>
                    <small className="form-hint">
                      Si esta desactivado, solo se mostrara la ubicacion general (sector/ciudad) sin coordenadas exactas
                    </small>
                  </div>
                </div>
              </div>

              {/* Columna Secundaria (30%): Estado, Relaciones y Notas */}
              <div className="ubicacion-side-column">
                <div className="form-section">
                  <h3 className="section-title">Estado de la Propiedad</h3>
                  <div className="toggles-section">
                    <ToggleSwitch
                      label="Publicada"
                      description="Visible en el sitio web"
                      checked={form.publicada}
                      onChange={(checked) => setForm(prev => ({ ...prev, publicada: checked }))}
                    />

                    <ToggleSwitch
                      label="Exclusiva"
                      description="Solo tu inmobiliaria"
                      checked={form.exclusiva}
                      onChange={(checked) => setForm(prev => ({ ...prev, exclusiva: checked }))}
                    />

                    <ToggleSwitch
                      label="Destacada"
                      description="Mayor visibilidad"
                      checked={form.destacada}
                      onChange={(checked) => setForm(prev => ({ ...prev, destacada: checked }))}
                    />

                    <ToggleSwitch
                      label="Amueblada"
                      description="Incluye muebles"
                      checked={form.is_furnished}
                      onChange={(checked) => {
                        if (checked) {
                          const hasPrecioAmueblado =
                            (form.precio_venta_amueblado && form.precio_venta_amueblado.trim() !== '') ||
                            (form.precio_alquiler_amueblado && form.precio_alquiler_amueblado.trim() !== '');

                          if (!hasPrecioAmueblado) {
                            alert('Primero ingresa un precio amueblado en la pestaña de Precios.');
                            return;
                          }
                        }
                        setForm(prev => ({ ...prev, is_furnished: checked }));
                      }}
                    />
                  </div>

                  {/* Selector de Etiquetas del Catálogo */}
                  {etiquetasPropiedad.filter(e => e.activo).length > 0 && (
                    <div className="etiquetas-selector">
                      <label className="etiquetas-label">Etiquetas</label>
                      <div className="etiquetas-list">
                        {etiquetasPropiedad.filter(e => e.activo).map(etiqueta => {
                          const isSelected = form.etiquetas.includes(etiqueta.codigo);
                          return (
                            <button
                              key={etiqueta.id}
                              type="button"
                              className={`etiqueta-chip ${isSelected ? 'selected' : ''}`}
                              style={{
                                '--etiqueta-color': etiqueta.color || '#6366f1',
                              } as React.CSSProperties}
                              onClick={() => {
                                setForm(prev => ({
                                  ...prev,
                                  etiquetas: isSelected
                                    ? prev.etiquetas.filter(c => c !== etiqueta.codigo)
                                    : [...prev.etiquetas, etiqueta.codigo]
                                }));
                              }}
                            >
                              {etiqueta.icono && <span className="etiqueta-icono">{etiqueta.icono}</span>}
                              {etiqueta.nombre}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-section">
                  <h3 className="section-title">Relaciones</h3>
                  <div className="form-grid-compact">
                    <div className="form-group">
                      <label>Captador</label>
                      <button
                        type="button"
                        className="user-picker-button"
                        onClick={() => setShowCaptadorModal(true)}
                      >
                        {form.captador_id ? (
                          (() => {
                            const selectedUser = usuarios.find(u => u.id === form.captador_id);
                            return selectedUser ? (
                              <div className="selected-user-display">
                                <div className="user-avatar-small">
                                  {selectedUser.avatarUrl ? (
                                    <img src={selectedUser.avatarUrl} alt={`${selectedUser.nombre} ${selectedUser.apellido}`} />
                                  ) : (
                                    <span>{selectedUser.nombre?.[0] || selectedUser.email[0]}{selectedUser.apellido?.[0] || ''}</span>
                                  )}
                                </div>
                                <span>{selectedUser.nombre} {selectedUser.apellido}</span>
                                <button
                                  type="button"
                                  className="clear-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setForm(prev => ({ ...prev, captador_id: '' }));
                                  }}
                                >
                                  <Icons.x />
                                </button>
                              </div>
                            ) : (
                              <span className="placeholder">Seleccionar</span>
                            );
                          })()
                        ) : (
                          <span className="placeholder">Seleccionar</span>
                        )}
                      </button>
                    </div>

                    <div className="form-group">
                      <label>Cocaptadores</label>
                      <button
                        type="button"
                        className="user-picker-button"
                        onClick={() => setShowCocaptadoresModal(true)}
                      >
                        {form.cocaptadores_ids.length > 0 ? (
                          <div className="selected-users-display">
                            <span className="count-badge">{form.cocaptadores_ids.length} seleccionados</span>
                          </div>
                        ) : (
                          <span className="placeholder">Seleccionar</span>
                        )}
                      </button>
                    </div>

                    <div className="form-group">
                      <label>Propietario</label>
                      <ContactPicker
                        value={form.propietario_id || null}
                        onChange={(contactId, contact) => {
                          setForm(prev => {
                            const updated = { ...prev, propietario_id: contactId || '' };
                            if (contact?.email && contactId) {
                              updated.correo_reporte = contact.email;
                            }
                            return updated;
                          });
                        }}
                        contacts={contactos}
                        loading={loadingContactos}
                        placeholder="Buscar..."
                        clearable
                        tenantId={tenantActual?.id}
                        onCreateContact={(contact) => {
                          setContactos(prev => [...prev, contact]);
                        }}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="correo_reporte">Correo Reporte</label>
                      <input
                        id="correo_reporte"
                        type="email"
                        value={form.correo_reporte}
                        onChange={(e) => setForm(prev => ({ ...prev, correo_reporte: e.target.value }))}
                        placeholder="correo@ejemplo.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3 className="section-title">Notas Internas</h3>
                  <div className="form-group">
                    <textarea
                      id="notas"
                      value={form.notas}
                      onChange={(e) => setForm(prev => ({ ...prev, notas: e.target.value }))}
                      placeholder="Notas internas sobre la propiedad..."
                      rows={4}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: SEO y Documentación */}
        {activeTab === 'contenido' && (
          <div className="tab-content">
            {/* Sección SEO */}
            <div className="form-section">
              <h3 className="section-title">SEO y Metadata</h3>
              
              {/* Slug principal (español) */}
              <div className="form-group full-width">
                <label htmlFor="slug">Slug Principal (ES)</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  id="slug"
                  type="text"
                  value={form.slug}
                  onChange={(e) => {
                    // Marcar que el usuario editó manualmente el slug
                    if (!isEditing) {
                      setSlugManualmenteEditado(true);
                    }
                    setForm(prev => ({ ...prev, slug: e.target.value }));
                  }}
                    placeholder={form.titulo ? generarSlug(form.titulo) : 'auto-generado desde título'}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      if (form.titulo) {
                        setForm(prev => ({ ...prev, slug: generarSlug(form.titulo) }));
                        // Resetear el estado de edición manual para que vuelva a seguir el título
                        if (!isEditing) {
                          setSlugManualmenteEditado(false);
                        }
                      }
                    }}
                    style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}
                    disabled={!form.titulo}
                  >
                    Generar local
                  </button>
                </div>
                <small className="form-hint">
                  {!isEditing && !slugManualmenteEditado
                    ? 'Se genera automáticamente desde el título'
                    : 'URL para la versión en español de la propiedad'
                  }
                </small>
              </div>

              {/* Slugs multi-idioma */}
              {isEditing && (
                <div className="form-group full-width" style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <label style={{ margin: 0, fontWeight: 600, color: '#334155' }}>
                      Slugs Multi-idioma
                    </label>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={async () => {
                        if (!tenantActual?.id || !propiedadId) return;
                        try {
                          const result = await regeneratePropiedadSlugs(tenantActual.id, propiedadId, {
                            forceRegenerate: true,
                            nuevoTitulo: form.titulo,
                          });
                          setForm(prev => ({
                            ...prev,
                            slug: result.slug,
                            slug_traducciones: result.slug_traducciones,
                          }));
                          if (result.warning) {
                            alert(result.warning);
                          }
                        } catch (error: any) {
                          alert('Error al regenerar slugs: ' + error.message);
                        }
                      }}
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                      disabled={!form.titulo}
                    >
                      🌍 Traducir y Regenerar Slugs
                    </button>
                  </div>

                  <div style={{ display: 'grid', gap: '12px' }}>
                    {Object.keys(form.slug_traducciones).length > 0 ? (
                      Object.entries(form.slug_traducciones).map(([lang, slugLang]) => (
                        <div key={lang} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{
                            minWidth: '40px',
                            fontWeight: 600,
                            color: '#64748b',
                            textTransform: 'uppercase',
                            fontSize: '0.8rem'
                          }}>
                            {lang}
                          </span>
                          <input
                            type="text"
                            value={slugLang}
                            onChange={(e) => setForm(prev => ({
                              ...prev,
                              slug_traducciones: {
                                ...prev.slug_traducciones,
                                [lang]: e.target.value,
                              }
                            }))}
                            style={{ flex: 1 }}
                            placeholder={`Slug en ${lang.toUpperCase()}`}
                          />
                        </div>
                      ))
                    ) : (
                      <div style={{ color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic' }}>
                        Haz clic en "Traducir y Regenerar Slugs" para generar URLs en otros idiomas automáticamente usando Google Translate.
                      </div>
                    )}
                  </div>

                  <small className="form-hint" style={{ marginTop: '12px', display: 'block' }}>
                    Los slugs en otros idiomas se generan automáticamente al crear la propiedad.
                    Puedes editarlos manualmente si es necesario.
                    <strong style={{ color: '#f59e0b' }}> ⚠️ Cambiar slugs de propiedades publicadas puede afectar el SEO.</strong>
                  </small>
                </div>
              )}

              {/* Traducciones de Contenido */}
              {isEditing && Object.keys(form.traducciones).length > 0 && (
                <div className="form-group full-width" style={{ background: 'var(--premium-primary-light, #f0f7ff)', padding: '16px', borderRadius: '8px', border: '1px solid var(--premium-primary, #0057FF)', borderOpacity: 0.2 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <label style={{ margin: 0, fontWeight: 600, color: 'var(--premium-primary, #0057FF)' }}>
                      🌍 Traducciones de Contenido
                    </label>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {Object.entries(form.traducciones).map(([lang, traduccion]) => (
                      <div key={lang} style={{
                        background: 'white',
                        padding: '16px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                      }}>
                        <div style={{
                          fontWeight: 600,
                          color: 'var(--premium-primary, #0057FF)',
                          marginBottom: '12px',
                          textTransform: 'uppercase',
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span style={{
                            background: 'var(--premium-primary, #0057FF)',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem'
                          }}>
                            {lang.toUpperCase()}
                          </span>
                          {lang === 'en' ? 'Inglés' : lang === 'fr' ? 'Francés' : lang === 'pt' ? 'Portugués' : lang}
                        </div>

                        {/* Título traducido */}
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>
                            Título
                          </label>
                          <input
                            type="text"
                            value={traduccion.titulo || ''}
                            onChange={(e) => setForm(prev => ({
                              ...prev,
                              traducciones: {
                                ...prev.traducciones,
                                [lang]: {
                                  ...prev.traducciones[lang],
                                  titulo: e.target.value
                                }
                              }
                            }))}
                            style={{ width: '100%' }}
                            placeholder={`Título en ${lang.toUpperCase()}`}
                          />
                        </div>

                        {/* Short description traducida */}
                        {traduccion.short_description && (
                          <div style={{ marginBottom: '12px' }}>
                            <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>
                              Descripción Corta
                            </label>
                            <textarea
                              value={traduccion.short_description || ''}
                              onChange={(e) => setForm(prev => ({
                                ...prev,
                                traducciones: {
                                  ...prev.traducciones,
                                  [lang]: {
                                    ...prev.traducciones[lang],
                                    short_description: e.target.value
                                  }
                                }
                              }))}
                              style={{ width: '100%' }}
                              rows={2}
                              placeholder={`Descripción corta en ${lang.toUpperCase()}`}
                            />
                          </div>
                        )}

                        {/* Descripción traducida (colapsable) */}
                        {traduccion.descripcion && (
                          <details style={{ marginBottom: '12px' }}>
                            <summary style={{
                              fontSize: '0.8rem',
                              color: '#64748b',
                              cursor: 'pointer',
                              marginBottom: '8px'
                            }}>
                              Ver/Editar Descripción completa
                            </summary>
                            <textarea
                              value={traduccion.descripcion || ''}
                              onChange={(e) => setForm(prev => ({
                                ...prev,
                                traducciones: {
                                  ...prev.traducciones,
                                  [lang]: {
                                    ...prev.traducciones[lang],
                                    descripcion: e.target.value
                                  }
                                }
                              }))}
                              style={{ width: '100%' }}
                              rows={4}
                              placeholder={`Descripción en ${lang.toUpperCase()}`}
                            />
                          </details>
                        )}
                      </div>
                    ))}
                  </div>

                  <small className="form-hint" style={{ marginTop: '12px', display: 'block', color: '#64748b' }}>
                    Las traducciones se generan automáticamente con Google Translate al crear/actualizar la propiedad.
                    Puedes editarlas manualmente para mejorar la calidad.
                  </small>
                </div>
              )}

              {/* Short Description (ES) */}
              <div className="form-group full-width">
                <label htmlFor="short_description">Descripción Corta (ES)</label>
                <textarea
                  id="short_description"
                  value={form.short_description}
                  onChange={(e) => setForm(prev => ({ ...prev, short_description: e.target.value }))}
                  placeholder="Breve descripción impactante para tarjetas y previsualizaciones (max 200 caracteres)"
                  rows={2}
                  maxLength={200}
                />
                <small className="form-hint">
                  {form.short_description.length}/200 caracteres. Se usa en listados y tarjetas de propiedades.
                  {!form.short_description && form.descripcion && ' Se puede generar automáticamente desde la descripción.'}
                </small>
              </div>

              {/* Meta Title */}
              <div className="form-group full-width">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label htmlFor="meta_title" style={{ margin: 0 }}>Meta Título</label>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      const seo = autogenerarSEO();
                      setForm(prev => ({ ...prev, meta_title: seo.meta_title }));
                    }}
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    🔄 Regenerar
                  </button>
                </div>
                <input
                  id="meta_title"
                  type="text"
                  value={form.meta_title}
                  onChange={(e) => setForm(prev => ({ ...prev, meta_title: e.target.value }))}
                  placeholder={form.titulo || 'Título para motores de búsqueda (SEO)'}
                  maxLength={60}
                />
                <small className="form-hint">
                  {form.meta_title.length}/60 caracteres. Recomendado: 50-60 caracteres. Se genera automáticamente desde el título.
                </small>
            </div>

              {/* Meta Description */}
              <div className="form-group full-width">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label htmlFor="meta_description" style={{ margin: 0 }}>Meta Descripción</label>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      const seo = autogenerarSEO();
                      setForm(prev => ({ ...prev, meta_description: seo.meta_description }));
                    }}
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    🔄 Regenerar
                  </button>
                </div>
                <textarea
                  id="meta_description"
                  value={form.meta_description}
                  onChange={(e) => setForm(prev => ({ ...prev, meta_description: e.target.value }))}
                  placeholder="Descripción para motores de búsqueda (SEO)"
                  rows={3}
                  maxLength={160}
                />
                <small className="form-hint">
                  {form.meta_description.length}/160 caracteres. Recomendado: 150-160 caracteres. Se genera automáticamente desde los datos de la propiedad.
                </small>
              </div>

              {/* Keywords */}
              <div className="form-group full-width">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label htmlFor="keywords" style={{ margin: 0 }}>Keywords (Palabras Clave)</label>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      const seo = autogenerarSEO();
                      setForm(prev => ({
                        ...prev,
                        keywords: seo.keywords,
                        tags: seo.tags,
                        meta_description: seo.meta_description,
                        meta_title: seo.meta_title,
                      }));
                    }}
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    🔄 Regenerar SEO
                  </button>
                </div>
                <input
                  id="keywords"
                  type="text"
                  value={form.keywords.join(', ')}
                  onChange={(e) => {
                    const keywords = e.target.value
                      .split(',')
                      .map(k => k.trim())
                      .filter(k => k.length > 0);
                    setForm(prev => ({ ...prev, keywords }));
                  }}
                  placeholder="Ej: apartamento, venta, zona este, 2 habitaciones"
                />
                <small className="form-hint">Separa las palabras clave con comas. Se generan automáticamente desde los datos de la propiedad.</small>
                {form.keywords.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                    {form.keywords.map((keyword, index) => (
                      <span
                        key={index}
                        style={{
                          padding: '4px 12px',
                          background: '#e0e7ff',
                          color: '#4338ca',
                          borderRadius: '20px',
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {keyword}
                        <button
                          type="button"
                          onClick={() => {
                            setForm(prev => ({
                              ...prev,
                              keywords: prev.keywords.filter((_, i) => i !== index)
                            }));
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#4338ca',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Icons.x style={{ width: '14px', height: '14px' }} />
                        </button>
                      </span>
                    ))}
            </div>
                )}
              </div>

              {/* Tags */}
              <div className="form-group full-width">
                <label htmlFor="tags">Tags (Etiquetas)</label>
                <input
                  id="tags"
                  type="text"
                  value={form.tags.join(', ')}
                  onChange={(e) => {
                    const tags = e.target.value
                      .split(',')
                      .map(t => t.trim())
                      .filter(t => t.length > 0);
                    setForm(prev => ({ ...prev, tags }));
                  }}
                  placeholder="Ej: destacado, nuevo, exclusivo, promoción"
                />
                <small className="form-hint">Separa las etiquetas con comas</small>
                {form.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                    {form.tags.map((tag, index) => (
                      <span
                        key={index}
                        style={{
                          padding: '4px 12px',
                          background: '#fef3c7',
                          color: '#92400e',
                          borderRadius: '20px',
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => {
                            setForm(prev => ({
                              ...prev,
                              tags: prev.tags.filter((_, i) => i !== index)
                            }));
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#92400e',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Icons.x style={{ width: '14px', height: '14px' }} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Preview de Google */}
              <div className="form-group full-width" style={{ marginTop: '24px' }}>
                <label>Vista Previa de Google</label>
                <div style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '20px',
                  background: '#f8fafc',
                }}>
                  <div style={{
                    maxWidth: '600px',
                    fontFamily: 'Arial, sans-serif',
                  }}>
                    {/* URL */}
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#006621',
                      marginBottom: '4px',
                    }}>
                      {tenantActual?.nombre || 'Inmobiliaria'} › Propiedades › {form.slug || generarSlug(form.titulo || 'propiedad')}
                    </div>
                    
                    {/* Título */}
                    <div style={{
                      fontSize: '1.25rem',
                      color: '#1a0dab',
                      marginBottom: '4px',
                      fontWeight: 400,
                      lineHeight: '1.3',
                    }}>
                      {form.meta_title || form.titulo || 'Título de la propiedad'}
                    </div>
                    
                    {/* Descripción */}
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#545454',
                      lineHeight: '1.5',
                    }}>
                      {form.meta_description || 'Descripción de la propiedad que aparecerá en los resultados de búsqueda de Google...'}
                    </div>
                  </div>
                </div>
                <small className="form-hint">
                  Esta es una aproximación de cómo se verá tu propiedad en los resultados de búsqueda de Google
                </small>
              </div>
            </div>

            {/* Sección Documentación */}
            <div className="form-section">
              <h3 className="section-title">Documentación</h3>
              <div className="form-group full-width">
                <p className="form-hint" style={{ marginBottom: '20px' }}>
                  {form.is_project 
                    ? 'Documentos requeridos para proyectos: Hoja de captación. Documentos adicionales: Garantías del proyecto pueden tener respaldo en archivo.'
                    : 'Documentos requeridos para propiedades listas: Cédula propietarios, Formulario de captación, Copia de título. Documentos adicionales pueden relacionarse directamente con la propiedad.'}
                </p>

                {/* Documentos Requeridos */}
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ marginBottom: '16px', fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
                    Documentos Requeridos
                  </h4>
                  <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                    {form.is_project ? (
                      // Documentos para Proyecto
                      <DocumentoUpload
                        tipo="hoja_captacion"
                        label="Hoja de Captación"
                        documento={form.documentos.find(d => d.tipo === 'hoja_captacion')}
                        onUpload={(file) => handleDocumentoUpload('hoja_captacion', 'Hoja de Captación', file)}
                        onRemove={() => handleDocumentoRemove('hoja_captacion')}
                        tenantId={tenantActual?.id}
                      />
                    ) : (
                      // Documentos para Propiedad Lista
                      <>
                        <DocumentoUpload
                          tipo="cedula_propietarios"
                          label="Cédula Propietarios"
                          documento={form.documentos.find(d => d.tipo === 'cedula_propietarios')}
                          onUpload={(file) => handleDocumentoUpload('cedula_propietarios', 'Cédula Propietarios', file)}
                          onRemove={() => handleDocumentoRemove('cedula_propietarios')}
                          tenantId={tenantActual?.id}
                        />
                        <DocumentoUpload
                          tipo="formulario_captacion"
                          label="Formulario de Captación"
                          documento={form.documentos.find(d => d.tipo === 'formulario_captacion')}
                          onUpload={(file) => handleDocumentoUpload('formulario_captacion', 'Formulario de Captación', file)}
                          onRemove={() => handleDocumentoRemove('formulario_captacion')}
                          tenantId={tenantActual?.id}
                        />
                        <DocumentoUpload
                          tipo="copia_titulo"
                          label="Copia de Título"
                          documento={form.documentos.find(d => d.tipo === 'copia_titulo')}
                          onUpload={(file) => handleDocumentoUpload('copia_titulo', 'Copia de Título', file)}
                          onRemove={() => handleDocumentoRemove('copia_titulo')}
                          tenantId={tenantActual?.id}
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Documentos Adicionales */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
                      Documentos Adicionales
                    </h4>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowDocumentoModal(true)}
                      style={{ padding: '8px 16px', fontSize: '0.875rem' }}
                    >
                      <Icons.plus /> Agregar Documento
                    </button>
                  </div>
                  
                  {form.documentos.filter(d => d.tipo === 'adicional').length > 0 && (
                    <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                      {form.documentos
                        .filter(d => d.tipo === 'adicional')
                        .map((doc) => (
                          <DocumentoUpload
                            key={doc.id}
                            tipo="adicional"
                            label={doc.nombre}
                            documento={doc}
                            onUpload={(file) => {
                              // Reemplazar documento existente
                              handleDocumentoRemove(doc.id);
                              handleDocumentoUpload('adicional', doc.nombre, file, doc.id);
                            }}
                            onRemove={() => handleDocumentoRemove(doc.id)}
                            tenantId={tenantActual?.id}
                          />
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== TAB: PORTALES Y REDES ========== */}
        {activeTab === 'portales' && (
          <div className="tab-content-inner">
            {/* Sección Redes de Distribución - Rediseñada */}
            <div className="form-section">
              <h3 className="section-title">Redes de Distribución</h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '20px' }}>

                {/* Card RED GLOBAL - Verde */}
                <div style={{
                  background: form.red_global ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' : '#f8fafc',
                  border: form.red_global ? '2px solid #10b981' : '2px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '20px',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: form.red_global ? '#10b981' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s ease'
                      }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                        </svg>
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: form.red_global ? '#065f46' : '#374151' }}>Red Global</h4>
                        <span style={{ fontSize: '0.8rem', color: form.red_global ? '#047857' : '#6b7280' }}>Todas las inmobiliarias CLIC</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, red_global: !prev.red_global }))}
                      style={{
                        width: '52px',
                        height: '28px',
                        borderRadius: '14px',
                        border: 'none',
                        background: form.red_global ? '#10b981' : '#d1d5db',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <span style={{
                        position: 'absolute',
                        top: '3px',
                        left: form.red_global ? '27px' : '3px',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: 'white',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        transition: 'all 0.3s ease'
                      }} />
                    </button>
                  </div>

                  {form.red_global && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #a7f3d0' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#065f46', marginBottom: '8px' }}>
                        Términos de comisión
                      </label>
                      <textarea
                        value={form.red_global_comision}
                        onChange={(e) => setForm(prev => ({ ...prev, red_global_comision: e.target.value }))}
                        placeholder="Ej: Comisión 50/50 con asesor externo..."
                        style={{
                          width: '100%',
                          minHeight: '60px',
                          padding: '10px 12px',
                          border: '1px solid #a7f3d0',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          resize: 'vertical',
                          fontFamily: 'inherit',
                          background: 'white'
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Card RED AFILIADOS - Morado */}
                <div style={{
                  background: form.red_afiliados ? 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)' : '#f8fafc',
                  border: form.red_afiliados ? '2px solid #8b5cf6' : '2px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '20px',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: form.red_afiliados ? '#8b5cf6' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s ease'
                      }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                          <circle cx="9" cy="7" r="4"/>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: form.red_afiliados ? '#5b21b6' : '#374151' }}>Red de Afiliados</h4>
                        <span style={{ fontSize: '0.8rem', color: form.red_afiliados ? '#7c3aed' : '#6b7280' }}>Partners de tu inmobiliaria</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, red_afiliados: !prev.red_afiliados }))}
                      style={{
                        width: '52px',
                        height: '28px',
                        borderRadius: '14px',
                        border: 'none',
                        background: form.red_afiliados ? '#8b5cf6' : '#d1d5db',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <span style={{
                        position: 'absolute',
                        top: '3px',
                        left: form.red_afiliados ? '27px' : '3px',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: 'white',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        transition: 'all 0.3s ease'
                      }} />
                    </button>
                  </div>
                </div>

                {/* Card CONNECT - Azul */}
                {hasConnectFeature && (
                  <div style={{
                    background: form.connect ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' : '#f8fafc',
                    border: form.connect ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '20px',
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: form.connect && tenantComisionDefaults.connect_comision_default ? '12px' : '0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: form.connect ? '#3b82f6' : '#94a3b8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.3s ease'
                        }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/>
                          </svg>
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: form.connect ? '#1e40af' : '#374151' }}>CLIC Connect</h4>
                          <span style={{ fontSize: '0.8rem', color: form.connect ? '#2563eb' : '#6b7280' }}>Asesores independientes</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, connect: !prev.connect }))}
                        style={{
                          width: '52px',
                          height: '28px',
                          borderRadius: '14px',
                          border: 'none',
                          background: form.connect ? '#3b82f6' : '#d1d5db',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <span style={{
                          position: 'absolute',
                          top: '3px',
                          left: form.connect ? '27px' : '3px',
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: 'white',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          transition: 'all 0.3s ease'
                        }} />
                      </button>
                    </div>

                    {form.connect && tenantComisionDefaults.connect_comision_default && (
                      <div style={{
                        marginTop: '12px',
                        padding: '12px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: '8px',
                        borderLeft: '3px solid #3b82f6'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{ fontSize: '14px' }}>💰</span>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: '#1e40af', lineHeight: '1.4' }}>
                            {tenantComisionDefaults.connect_comision_default}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Sección Portales Inmobiliarios */}
            <div className="form-section">
              <h3 className="section-title">Portales Inmobiliarios</h3>
              <p className="section-hint">
                Selecciona en qué portales externos quieres publicar esta propiedad. Las integraciones deben estar configuradas previamente.
              </p>

              <div className="portales-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
                marginTop: '20px'
              }}>
                {/* MercadoLibre */}
                <div className={`portal-card ${form.portales.mercadolibre ? 'active' : ''}`}>
                  <div className="portal-header">
                    <div className="portal-logo" style={{ background: '#FFE600', color: '#333' }}>ML</div>
                    <div className="portal-info">
                      <h4>MercadoLibre</h4>
                      <span className="portal-status">Integración pendiente</span>
                    </div>
                  </div>
                  <ToggleSwitch
                    label="Publicar en MercadoLibre"
                    checked={form.portales.mercadolibre}
                    onChange={(checked) => setForm(prev => ({
                      ...prev,
                      portales: { ...prev.portales, mercadolibre: checked }
                    }))}
                  />
                </div>

                {/* EasyBroker */}
                <div className={`portal-card ${form.portales.easybroker ? 'active' : ''}`}>
                  <div className="portal-header">
                    <div className="portal-logo" style={{ background: '#2563eb', color: '#fff' }}>EB</div>
                    <div className="portal-info">
                      <h4>EasyBroker</h4>
                      <span className="portal-status">Integración pendiente</span>
                    </div>
                  </div>
                  <ToggleSwitch
                    label="Publicar en EasyBroker"
                    checked={form.portales.easybroker}
                    onChange={(checked) => setForm(prev => ({
                      ...prev,
                      portales: { ...prev.portales, easybroker: checked }
                    }))}
                  />
                </div>

                {/* Corotos */}
                <div className={`portal-card ${form.portales.corotos ? 'active' : ''}`}>
                  <div className="portal-header">
                    <div className="portal-logo" style={{ background: '#0ea5e9', color: '#fff' }}>CO</div>
                    <div className="portal-info">
                      <h4>Corotos</h4>
                      <span className="portal-status">Integración pendiente</span>
                    </div>
                  </div>
                  <ToggleSwitch
                    label="Publicar en Corotos"
                    checked={form.portales.corotos}
                    onChange={(checked) => setForm(prev => ({
                      ...prev,
                      portales: { ...prev.portales, corotos: checked }
                    }))}
                  />
                </div>
              </div>

              <div style={{
                marginTop: '24px',
                padding: '16px',
                background: '#f8fafc',
                borderRadius: '10px',
                border: '1px solid #e2e8f0'
              }}>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                  <strong>Nota:</strong> Las integraciones con portales externos están en desarrollo.
                  Una vez configuradas, las propiedades marcadas se sincronizarán automáticamente.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Amenidad */}
      <AmenidadModal
        isOpen={showAmenidadModal}
        onClose={() => setShowAmenidadModal(false)}
        onSubmit={handleAddAmenidad}
        idiomasHabilitados={['es', 'en']} // TODO: Obtener del tenant
      />

      {/* Modal de Tipología */}
      <TipologiaModal
        isOpen={showTipologiaModal}
        onClose={() => {
          setShowTipologiaModal(false);
          setTipologiaEditando(null);
        }}
        onSubmit={handleTipologiaSubmit}
        initialData={tipologiaEditando}
      />

      <EtapaModal
        isOpen={showEtapaModal}
        onClose={() => {
          setShowEtapaModal(false);
          setEtapaEditando(null);
        }}
        onSubmit={handleEtapaSubmit}
        initialData={etapaEditando}
      />

      {/* Modales de Relación de Contenido */}
      <ContentRelationModal
        isOpen={showFaqsModal}
        onClose={() => setShowFaqsModal(false)}
        onSelect={(item) => {
          console.log('FAQ seleccionado:', item);
          // TODO: Guardar relación con la propiedad
        }}
        contentType="faqs"
        tenantId={tenantActual?.id || ''}
        onCreateNew={() => {
          // TODO: Navegar a creación de FAQ
          console.log('Crear nueva FAQ');
        }}
      />

      <ContentRelationModal
        isOpen={showVideosModal}
        onClose={() => setShowVideosModal(false)}
        onSelect={(item) => {
          console.log('Video seleccionado:', item);
          // TODO: Guardar relación con la propiedad
        }}
        contentType="videos"
        tenantId={tenantActual?.id || ''}
        onCreateNew={() => {
          // TODO: Navegar a creación de Video
          console.log('Crear nuevo video');
        }}
      />

      <ContentRelationModal
        isOpen={showArticulosModal}
        onClose={() => setShowArticulosModal(false)}
        onSelect={(item) => {
          console.log('Artículo seleccionado:', item);
          // TODO: Guardar relación con la propiedad
        }}
        contentType="articulos"
        tenantId={tenantActual?.id || ''}
        onCreateNew={() => {
          // TODO: Navegar a creación de Artículo
          console.log('Crear nuevo artículo');
        }}
      />

      {/* Modal de Agregar Documento */}
      <DocumentoModal
        isOpen={showDocumentoModal}
        onClose={() => setShowDocumentoModal(false)}
        onSubmit={(tipo, nombre, file) => {
          handleDocumentoUpload(tipo, nombre, file);
        }}
      />

      {/* Modal de Selección de Captador */}
      <UserPickerModal
        isOpen={showCaptadorModal}
        onClose={() => setShowCaptadorModal(false)}
        onSelect={(userId, user) => {
          setForm(prev => ({ ...prev, captador_id: userId || '' }));
        }}
        users={usuarios}
        loading={loadingUsuarios}
        selectedUserId={captadorPreseleccionado || form.captador_id || null}
        filterByRole="asesor"
        title="Seleccionar Captador"
        placeholder="Buscar asesor inmobiliario..."
      />

      {/* Modal de Selección de Cocaptadores (múltiple) */}
      <UserPickerModal
        isOpen={showCocaptadoresModal}
        onClose={() => setShowCocaptadoresModal(false)}
        onSelectMultiple={(userIds) => {
          setForm(prev => ({ ...prev, cocaptadores_ids: userIds }));
        }}
        users={usuarios}
        loading={loadingUsuarios}
        selectedUserIds={form.cocaptadores_ids}
        filterByRole="asesor"
        multiple={true}
        title="Seleccionar Cocaptadores"
        placeholder="Buscar asesores..."
      />

      <style>{`
        .propiedad-editar {
          width: 100%;
          padding: 0;
        }

        .error-banner {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .error-banner button {
          background: none;
          border: none;
          color: #991b1b;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
        }

        .tabs-header {
          display: flex;
          gap: 4px;
          background: #f8fafc;
          border-radius: 12px;
          padding: 6px;
          margin-bottom: 40px;
          overflow-x: auto;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .tab-button {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 24px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: #64748b;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
          position: relative;
        }

        .tab-button:hover {
          color: #1e293b;
          background: rgba(15, 23, 42, 0.05);
        }

        .tab-button.active {
          color: #0f172a;
          background: white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          font-weight: 700;
        }

        .tab-button svg {
          flex-shrink: 0;
        }

        .tab-content-wrapper {
          min-height: 500px;
        }

        .tab-content {
          animation: fadeIn 0.2s;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .two-columns-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
          align-items: start;
        }

        .column-left,
        .column-right {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        @media (max-width: 1200px) {
          .two-columns-layout {
            grid-template-columns: 1fr;
          }
        }

        /* Layout 70/30 para Ubicación */
        .ubicacion-priority-layout {
          display: grid;
          grid-template-columns: 7fr 3fr;
          gap: 24px;
          align-items: start;
        }

        .ubicacion-main-column {
          display: flex;
          flex-direction: column;
        }

        .ubicacion-side-column {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .ubicacion-section-large {
          min-height: 600px;
        }

        .section-hint {
          margin: -16px 0 20px 0;
          font-size: 0.85rem;
          color: #64748b;
          line-height: 1.5;
        }

        .form-grid-compact {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-grid-compact .form-group {
          gap: 6px;
        }

        .form-grid-compact label {
          font-size: 0.8rem;
          margin-bottom: 2px;
        }

        @media (max-width: 1400px) {
          .ubicacion-priority-layout {
            grid-template-columns: 1fr;
          }

          .ubicacion-section-large {
            min-height: auto;
          }

          .ubicacion-side-column {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
          }
        }

        @media (max-width: 900px) {
          .ubicacion-side-column {
            grid-template-columns: 1fr;
          }
        }

        .form-section {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          transition: box-shadow 0.2s;
        }

        .form-section:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .toggles-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Etiquetas Selector */
        .etiquetas-selector {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
        }

        .etiquetas-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 500;
          color: #64748b;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .etiquetas-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .etiqueta-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 500;
          border: 1.5px solid #e2e8f0;
          background: #f8fafc;
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .etiqueta-chip:hover {
          border-color: var(--etiqueta-color);
          background: color-mix(in srgb, var(--etiqueta-color) 8%, white);
        }

        .etiqueta-chip.selected {
          border-color: var(--etiqueta-color);
          background: color-mix(in srgb, var(--etiqueta-color) 12%, white);
          color: var(--etiqueta-color);
        }

        .etiqueta-icono {
          font-size: 0.9rem;
        }

        .toggle-centered {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .toggle-centered .toggle-switch-group {
          width: 100%;
        }

        .toggle-centered .toggle-content {
          justify-content: center;
        }

        /* Portal Cards */
        .portal-card {
          background: #fff;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          transition: all 0.2s ease;
        }

        .portal-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .portal-card.active {
          border-color: #1e293b;
          background: #f8fafc;
        }

        .portal-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .portal-logo {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1rem;
          flex-shrink: 0;
        }

        .portal-info h4 {
          margin: 0 0 4px 0;
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
        }

        .portal-status {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .portal-card .toggle-switch-group {
          margin-top: 8px;
        }

        .portal-card .toggle-content {
          padding: 10px 14px;
          background: transparent;
          border-color: #e2e8f0;
        }

        .portal-card .toggle-label {
          font-size: 0.85rem;
        }

        .portal-card .toggle-description {
          display: none;
        }

        .section-title {
          font-size: 1.35rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 24px 0;
          padding-bottom: 16px;
          border-bottom: 2px solid #1e293b;
          letter-spacing: -0.02em;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }

        .form-grid-spaced {
          gap: 24px;
          grid-template-columns: repeat(4, 1fr);
        }

        @media (max-width: 1400px) {
          .form-grid-spaced {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 1000px) {
          .form-grid-spaced {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .form-grid-spaced {
            grid-template-columns: 1fr;
          }
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-group label {
          font-weight: 600;
          color: #1e293b;
          font-size: 0.9rem;
          letter-spacing: -0.01em;
          margin-bottom: 6px;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 14px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 0.95rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: inherit;
          background: white;
          color: #0f172a;
          font-weight: 500;
        }

        .form-group input:hover,
        .form-group select:hover,
        .form-group textarea:hover {
          border-color: #cbd5e1;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #1e293b;
          box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.08);
          background: #fafbfc;
        }

        .form-group select {
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%231e293b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 16px center;
          padding-right: 40px;
        }

        .form-group textarea {
          resize: vertical;
          min-height: 100px;
        }

        .form-hint {
          font-size: 0.85rem;
          color: #64748b;
          margin-top: 4px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          padding: 12px 16px;
          border-radius: 10px;
          transition: all 0.2s;
          border: 2px solid transparent;
        }

        .checkbox-label:hover {
          background: #f8fafc;
          border-color: #e2e8f0;
        }

        .checkbox-label input[type="checkbox"] {
          width: 20px;
          height: 20px;
          cursor: pointer;
          accent-color: #1e293b;
          border-radius: 4px;
        }

        .checkboxes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .amenidades-section {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .loading-amenidades {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #64748b;
          padding: 16px;
        }

        .amenidades-por-categoria {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .categoria-amenidades {
          padding: 16px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .categoria-title {
          font-size: 0.95rem;
          font-weight: 600;
          color: #334155;
          text-transform: capitalize;
          margin-bottom: 8px;
          display: block;
        }

        .amenidades-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .amenidad-tag {
          padding: 10px 18px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          color: #475569;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .amenidad-tag:hover {
          border-color: #1e293b;
          color: #0f172a;
          background: #f8fafc;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
        }

        .amenidad-tag.active {
          background: #1e293b;
          color: white;
          border-color: #1e293b;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
        }

        .amenidades-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .amenidad-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #f1f5f9;
          border-radius: 6px;
          font-size: 0.9rem;
        }

        .amenidad-item button {
          background: none;
          border: none;
          color: #ef4444;
          cursor: pointer;
          padding: 2px;
          display: flex;
          align-items: center;
        }

        .input-with-button {
          display: flex;
          gap: 8px;
        }

        .input-with-button input {
          flex: 1;
        }

        .image-preview {
          margin-top: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
          max-width: 400px;
        }

        .image-preview img {
          width: 100%;
          height: auto;
          display: block;
        }

        .imagenes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
          margin-top: 16px;
        }

        .imagen-item {
          position: relative;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
          background: #f8fafc;
        }

        .imagen-preview {
          width: 100%;
          aspect-ratio: 16/9;
          overflow: hidden;
          background: #e2e8f0;
        }

        .imagen-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .imagen-actions {
          display: flex;
          gap: 4px;
          padding: 8px;
          background: rgba(0, 0, 0, 0.7);
          position: absolute;
          top: 0;
          right: 0;
        }

        .imagen-actions button {
          background: rgba(255, 255, 255, 0.9);
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          transition: all 0.2s;
        }

        .imagen-actions button:hover:not(:disabled) {
          background: white;
          transform: scale(1.1);
        }

        .imagen-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .imagen-actions button.danger {
          color: #ef4444;
        }

        .imagen-index {
          position: absolute;
          bottom: 8px;
          left: 8px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .empty-state {
          text-align: center;
          padding: 32px;
          color: #94a3b8;
          font-style: italic;
        }

        .btn-primary, .btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 24px;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-size: 0.95rem;
          letter-spacing: -0.01em;
        }

        .btn-primary {
          background: #1e293b;
          color: white;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
        }

        .btn-primary:hover:not(:disabled) {
          background: #0f172a;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(15, 23, 42, 0.3);
        }

        .btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .btn-secondary {
          background: white;
          color: #1e293b;
          border: 2px solid #e2e8f0;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
        }

        .btn-secondary:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #1e293b;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .btn-icon {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
        }

        .btn-icon:hover {
          color: #0f172a;
        }

        .btn-icon.danger {
          color: #ef4444;
        }

        .btn-icon.danger:hover {
          color: #dc2626;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .user-picker-button {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          background: white;
          cursor: pointer;
          transition: all 0.3s;
          text-align: left;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .user-picker-button:hover {
          border-color: #1e293b;
          box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.08);
        }

        .selected-user-display {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .user-avatar-small {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 0.75rem;
          flex-shrink: 0;
          overflow: hidden;
        }

        .user-avatar-small img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .clear-btn {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          transition: color 0.2s;
        }

        .clear-btn:hover {
          color: #0f172a;
        }

        .selected-users-display {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
          flex: 1;
        }

        .selected-user-badge {
          padding: 6px 12px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 500;
          color: #1e40af;
        }

        .count-badge {
          padding: 6px 12px;
          background: #1e293b;
          color: white;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .placeholder {
          color: #94a3b8;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}

