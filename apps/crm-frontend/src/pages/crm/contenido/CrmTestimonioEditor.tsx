/**
 * CrmTestimonioEditor - Editor de Testimonios
 *
 * Página para crear/editar testimonios de clientes
 * Layout de dos columnas para mejor aprovechamiento del espacio
 * - Auto-relleno desde contacto seleccionado
 * - Selector de categorías
 * - Slug automático
 * - Soporte multi-idioma (traducciones)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '../../../contexts/AuthContext';
import { usePageHeader } from '../../../layouts/CrmLayout';
import ContactPicker from '../../../components/ContactPicker';
import UserPicker from '../../../components/UserPicker';
import PropertyPicker from '../../../components/PropertyPicker';
import {
  getTestimonio,
  createTestimonio,
  updateTestimonio,
  uploadContenidoImage,
  getContactos,
  getPropiedadesCrm,
  getUsuariosTenant,
  getCategoriasContenido,
  Contacto,
  Propiedad,
  UsuarioTenant,
  CategoriaContenido,
} from '../../../services/api';
import { useIdiomas } from '../../../services/idiomas';
import { contenidoStyles } from './sharedStyles';

const Icons = {
  back: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  save: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  user: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  message: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  link: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  settings: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  globe: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  folder: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  translate: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/></svg>,
  google: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>,
  facebook: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
};

// Fuentes de testimonios hardcodeadas
const FUENTES_TESTIMONIO = [
  { value: 'google_reviews', label: 'Google Reviews', icon: 'google' },
  { value: 'facebook', label: 'Facebook', icon: 'facebook' },
  { value: 'instagram', label: 'Instagram', icon: null },
  { value: 'pagina_web', label: 'Página Web', icon: null },
  { value: 'whatsapp', label: 'WhatsApp', icon: null },
  { value: 'email', label: 'Email', icon: null },
  { value: 'presencial', label: 'Presencial', icon: null },
  { value: 'telefono', label: 'Teléfono', icon: null },
  { value: 'otras_redes', label: 'Otras Redes', icon: null },
  { value: 'otro', label: 'Otro', icon: null },
];


interface Traducciones {
  [idioma: string]: {
    titulo?: string;
    contenido?: string;
  };
}

export default function CrmTestimonioEditor() {
  const { tenantSlug, id } = useParams<{ tenantSlug: string; id?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getToken } = useClerkAuth();
  const { tenantActual, puedeEditar, puedeCrear } = useAuth();
  const { setPageHeader } = usePageHeader();
  const { idiomas } = useIdiomas(tenantActual?.id);

  const isEditing = id && id !== 'nuevo';
  const isViewOnly = searchParams.get('mode') === 'ver' || (isEditing && !puedeEditar('contenido')) || (!isEditing && !puedeCrear('contenido'));

  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [asesores, setAsesores] = useState<UsuarioTenant[]>([]);
  const [categorias, setCategorias] = useState<CategoriaContenido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  // Idioma activo para traducciones
  const [idiomaActivo, setIdiomaActivo] = useState('es');

  // Inicializar con strings vacíos para evitar warning de controlled/uncontrolled
  const [formData, setFormData] = useState({
    slug: '',
    idioma: 'es',
    clienteNombre: '',
    clienteCargo: '',
    clienteEmpresa: '',
    clienteFoto: '',
    clienteUbicacion: '',
    titulo: '',
    contenido: '',
    categoriaId: '',
    rating: 5,
    publicado: true,
    destacado: false,
    verificado: false,
    fuente: '',
    contactoId: '',
    asesorId: '',
    propiedadId: '',
  });

  // Traducciones separadas del form principal
  const [traducciones, setTraducciones] = useState<Traducciones>({});

  // Ref para mantener handleSave actualizado
  const handleSaveRef = useRef<() => void>(() => {});

  // Header - usa el ref para evitar stale closure
  useEffect(() => {
    setPageHeader({
      title: isViewOnly ? 'Ver Testimonio' : (isEditing ? 'Editar Testimonio' : 'Nuevo Testimonio'),
      subtitle: isViewOnly ? 'Solo lectura' : (isEditing ? 'Actualiza el testimonio' : 'Agrega un nuevo testimonio de cliente'),
      actions: (
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => navigate(`/crm/${tenantSlug}/contenido?tab=testimonios`)} className="btn-secondary">
            {Icons.back}
            <span>Volver</span>
          </button>
          {!isViewOnly && (
            <button onClick={() => handleSaveRef.current()} className="btn-primary" disabled={saving}>
              {Icons.save}
              <span>{saving ? 'Guardando...' : 'Guardar'}</span>
            </button>
          )}
        </div>
      ),
    });
  }, [setPageHeader, isEditing, isViewOnly, saving, tenantSlug]);

  // Cargar datos
  useEffect(() => {
    if (!tenantActual?.id) return;
    loadInitialData();
  }, [tenantActual?.id, id]);

  const loadInitialData = async () => {
    if (!tenantActual?.id) return;
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const [contactosResp, propiedadesResp, asesoresData, categoriasData] = await Promise.all([
        getContactos(tenantActual.id, { limit: 100 }),
        getPropiedadesCrm(tenantActual.id, { limit: 100 }),
        getUsuariosTenant(tenantActual.id, token),
        getCategoriasContenido(tenantActual.id, 'testimonio'),
      ]);
      setContactos(contactosResp.data);
      setPropiedades(propiedadesResp.data);
      setAsesores(asesoresData);
      setCategorias(categoriasData);

      if (isEditing && id) {
        const testimonio = await getTestimonio(tenantActual.id, id);
        // Mapear campos soportando tanto snake_case (API) como camelCase
        const t = testimonio as any;
        setFormData({
          slug: t.slug ?? '',
          idioma: t.idioma ?? 'es',
          clienteNombre: t.cliente_nombre || t.clienteNombre || '',
          clienteCargo: t.cliente_cargo || t.clienteCargo || '',
          clienteEmpresa: t.cliente_empresa || t.clienteEmpresa || '',
          clienteFoto: t.cliente_foto || t.clienteFoto || '',
          clienteUbicacion: t.cliente_ubicacion || t.clienteUbicacion || '',
          titulo: t.titulo ?? '',
          contenido: t.contenido ?? '',
          categoriaId: t.categoria_id || t.categoriaId || '',
          rating: t.rating ?? 5,
          publicado: t.publicado ?? true,
          destacado: t.destacado ?? false,
          verificado: t.verificado ?? false,
          fuente: t.fuente ?? '',
          contactoId: t.contacto_id || t.contactoId || '',
          asesorId: t.asesor_id || t.asesorId || '',
          propiedadId: t.propiedad_id || t.propiedadId || '',
        });
        // Cargar traducciones existentes
        if (testimonio.traducciones) {
          setTraducciones(testimonio.traducciones as Traducciones);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  // Auto-generar slug cuando cambia el nombre
  const handleNombreChange = (nombre: string) => {
    setFormData(prev => ({
      ...prev,
      clienteNombre: nombre,
      slug: !isEditing ? generateSlug(nombre) : prev.slug,
    }));
  };

  // Auto-llenar campos desde contacto seleccionado
  const handleContactoSelect = (contactoId: string | null) => {
    if (contactoId) {
      const contacto = contactos.find(c => c.id === contactoId);
      if (contacto) {
        const nombreCompleto = [contacto.nombre, contacto.apellido].filter(Boolean).join(' ');
        setFormData(prev => ({
          ...prev,
          contactoId,
          // Siempre sobrescribir con datos del contacto
          clienteNombre: nombreCompleto,
          clienteCargo: contacto.cargo || prev.clienteCargo,
          clienteEmpresa: contacto.empresa || prev.clienteEmpresa,
          clienteFoto: contacto.foto_url || prev.clienteFoto,
          // Generar slug automáticamente si no estamos editando
          slug: !isEditing ? generateSlug(nombreCompleto) : prev.slug,
        }));
      } else {
        // Contacto no encontrado, solo actualizar el ID
        setFormData(prev => ({ ...prev, contactoId }));
      }
    } else {
      // Se deseleccionó el contacto
      setFormData(prev => ({ ...prev, contactoId: '' }));
    }
  };

  const handleFotoUpload = async (file: File) => {
    if (!tenantActual?.id) return;
    try {
      setUploadingFoto(true);
      const token = await getToken();
      const result = await uploadContenidoImage(tenantActual.id, file, token);
      setFormData(prev => ({ ...prev, clienteFoto: result.url }));
    } catch (err: any) {
      setError(err.message || 'Error al subir imagen');
    } finally {
      setUploadingFoto(false);
    }
  };

  // Actualizar traducción de un idioma específico
  const handleTraduccionChange = (idioma: string, campo: 'titulo' | 'contenido', valor: string) => {
    setTraducciones(prev => ({
      ...prev,
      [idioma]: {
        ...prev[idioma],
        [campo]: valor,
      },
    }));
  };

  const handleSave = useCallback(async () => {
    if (!tenantActual?.id || !formData.clienteNombre || !formData.contenido) {
      setError('Nombre del cliente y contenido son requeridos');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Helper para verificar si un HTML de ReactQuill tiene contenido real
      const tieneContenidoReal = (html: string | undefined): boolean => {
        if (!html) return false;
        // Remover tags HTML y espacios para ver si hay texto real
        const textoLimpio = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
        return textoLimpio.length > 0;
      };

      // Limpiar traducciones vacías (verificar contenido real, no solo tags HTML vacíos)
      const traduccionesLimpias: Traducciones = {};
      Object.entries(traducciones).forEach(([idioma, contenido]) => {
        const tieneTitulo = contenido.titulo && contenido.titulo.trim().length > 0;
        const tieneContenido = tieneContenidoReal(contenido.contenido);
        if (tieneTitulo || tieneContenido) {
          // Solo incluir campos con contenido real
          traduccionesLimpias[idioma] = {
            ...(tieneTitulo ? { titulo: contenido.titulo } : {}),
            ...(tieneContenido ? { contenido: contenido.contenido } : {}),
          };
        }
      });

      const testimonioData = {
        ...formData,
        slug: formData.slug || generateSlug(formData.clienteNombre),
        categoriaId: formData.categoriaId || undefined,
        contactoId: formData.contactoId || undefined,
        asesorId: formData.asesorId || undefined,
        propiedadId: formData.propiedadId || undefined,
        traducciones: Object.keys(traduccionesLimpias).length > 0 ? traduccionesLimpias : undefined,
      };

      if (isEditing && id) {
        await updateTestimonio(tenantActual.id, id, testimonioData);
      } else {
        await createTestimonio(tenantActual.id, testimonioData);
      }

      navigate(`/crm/${tenantSlug}/contenido?tab=testimonios`);
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }, [tenantActual?.id, formData, traducciones, isEditing, id, tenantSlug, navigate]);

  // Mantener el ref actualizado con la última versión de handleSave
  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  if (loading) {
    return (
      <div className="page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando...</p>
        </div>
        <style>{contenidoStyles}</style>
      </div>
    );
  }

  return (
    <div className="page editor-page">
      <style>{contenidoStyles}</style>
      <style>{`
        .editor-page {
          width: 100%;
          padding-bottom: 40px;
        }

        .editor-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 24px;
        }

        @media (max-width: 1024px) {
          .editor-grid {
            grid-template-columns: 1fr;
          }
        }

        .editor-main {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .editor-sidebar {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .editor-section {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          overflow: visible;
        }

        .editor-section h4 {
          margin: 0 0 16px 0;
          font-size: 0.95rem;
          font-weight: 600;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .editor-section h4 svg {
          color: #64748b;
        }

        .foto-upload {
          display: flex;
          gap: 20px;
          align-items: flex-start;
        }

        .foto-container {
          position: relative;
          flex-shrink: 0;
        }

        .foto-preview {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid #e2e8f0;
        }

        .foto-placeholder {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px dashed #cbd5e1;
          color: #94a3b8;
          font-size: 2rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .foto-placeholder:hover {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .foto-remove {
          position: absolute;
          top: -5px;
          right: -5px;
          background: #ef4444;
          color: white;
          border: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .foto-remove:hover {
          background: #dc2626;
        }

        .foto-fields {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .rating-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .rating-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .rating-stars {
          display: flex;
          gap: 6px;
        }

        .rating-star {
          font-size: 28px;
          cursor: pointer;
          transition: transform 0.15s;
          line-height: 1;
        }

        .rating-star:hover {
          transform: scale(1.2);
        }

        /* Toggle Cards mejorados */
        .toggle-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.25s ease;
          margin-bottom: 10px;
        }

        .toggle-card:last-child {
          margin-bottom: 0;
        }

        .toggle-card:hover {
          border-color: #cbd5e1;
        }

        .toggle-card.active {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-color: transparent;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
        }

        .toggle-card.active.warning {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);
        }

        .toggle-card.active.info {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
        }

        .toggle-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .toggle-title {
          font-weight: 600;
          font-size: 0.9rem;
          color: #374151;
        }

        .toggle-card.active .toggle-title {
          color: white;
        }

        .toggle-subtitle {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .toggle-card.active .toggle-subtitle {
          color: rgba(255, 255, 255, 0.8);
        }

        .toggle-switch {
          width: 44px;
          height: 24px;
          border-radius: 12px;
          background: #cbd5e1;
          position: relative;
          transition: all 0.25s ease;
          flex-shrink: 0;
        }

        .toggle-card.active .toggle-switch {
          background: rgba(255, 255, 255, 0.3);
        }

        .toggle-switch::after {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          top: 2px;
          left: 2px;
          transition: all 0.25s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .toggle-card.active .toggle-switch::after {
          left: 22px;
        }

        /* Fuente selector */
        .fuente-selector {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .fuente-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.85rem;
          color: #64748b;
        }

        .fuente-option:hover {
          border-color: #cbd5e1;
          background: white;
        }

        .fuente-option.selected {
          border-color: #3b82f6;
          background: #eff6ff;
          color: #1d4ed8;
        }

        .fuente-option svg {
          flex-shrink: 0;
        }

        /* Relation picker styling */
        .relation-section {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .relation-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .relation-item label {
          font-size: 0.8rem;
          font-weight: 500;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        /* Categoria selector */
        .categoria-selector {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .categoria-option {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.85rem;
          color: #64748b;
        }

        .categoria-option:hover {
          border-color: #cbd5e1;
        }

        .categoria-option.selected {
          border-color: #3b82f6;
          background: #eff6ff;
          color: #1d4ed8;
        }

        .categoria-option .cat-color {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        /* Idioma tabs */
        .idioma-tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 16px;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 0;
        }

        .idioma-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          background: transparent;
          border: none;
          border-bottom: 3px solid transparent;
          margin-bottom: -2px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          color: #64748b;
          transition: all 0.2s;
        }

        .idioma-tab:hover {
          color: #3b82f6;
        }

        .idioma-tab.active {
          color: #3b82f6;
          border-bottom-color: #3b82f6;
        }

        .idioma-tab .flag {
          font-size: 1.1rem;
        }

        .idioma-tab .has-content {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
        }

        .traduccion-fields {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .slug-preview {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
          padding: 8px 12px;
          background: #f1f5f9;
          border-radius: 6px;
          font-size: 0.8rem;
          color: #64748b;
        }

        .slug-preview code {
          background: #e2e8f0;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
          color: #475569;
        }

        .btn-secondary {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          color: #475569;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-secondary:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }
      `}</style>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="editor-grid">
        {/* Columna Principal */}
        <div className="editor-main">
          {/* Información del Cliente */}
          <div className="editor-section">
            <h4>{Icons.user} Información del Cliente</h4>
            <div className="foto-upload">
              <div className="foto-container">
                {formData.clienteFoto ? (
                  <>
                    <img src={formData.clienteFoto} alt="Foto" className="foto-preview" />
                    <button
                      type="button"
                      className="foto-remove"
                      onClick={() => setFormData({ ...formData, clienteFoto: '' })}
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <div
                    className="foto-placeholder"
                    onClick={() => document.getElementById('fotoInput')?.click()}
                  >
                    {uploadingFoto ? '...' : '📷'}
                  </div>
                )}
                <input
                  id="fotoInput"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFotoUpload(file);
                  }}
                />
              </div>
              <div className="foto-fields">
                <div className="grid-2">
                  <div className="form-group">
                    <label>Nombre *</label>
                    <input
                      type="text"
                      value={formData.clienteNombre}
                      onChange={(e) => handleNombreChange(e.target.value)}
                      placeholder="Nombre del cliente"
                    />
                  </div>
                  <div className="form-group">
                    <label>Cargo</label>
                    <input
                      type="text"
                      value={formData.clienteCargo}
                      onChange={(e) => setFormData({ ...formData, clienteCargo: e.target.value })}
                      placeholder="Cargo o profesión"
                    />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Empresa</label>
                    <input
                      type="text"
                      value={formData.clienteEmpresa}
                      onChange={(e) => setFormData({ ...formData, clienteEmpresa: e.target.value })}
                      placeholder="Empresa"
                    />
                  </div>
                  <div className="form-group">
                    <label>Ubicación</label>
                    <input
                      type="text"
                      value={formData.clienteUbicacion}
                      onChange={(e) => setFormData({ ...formData, clienteUbicacion: e.target.value })}
                      placeholder="Ciudad, País"
                    />
                  </div>
                </div>
                {formData.slug && (
                  <div className="slug-preview">
                    <span>Slug:</span>
                    <code>{formData.slug}</code>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Testimonio con traducciones */}
          <div className="editor-section">
            <h4>{Icons.message} Testimonio</h4>

            {/* Tabs de idioma */}
            <div className="idioma-tabs">
              {idiomas.map(idioma => {
                const tieneContenido = idioma.code === 'es'
                  ? formData.titulo || formData.contenido
                  : traducciones[idioma.code]?.titulo || traducciones[idioma.code]?.contenido;
                return (
                  <button
                    key={idioma.code}
                    type="button"
                    className={`idioma-tab ${idiomaActivo === idioma.code ? 'active' : ''}`}
                    onClick={() => setIdiomaActivo(idioma.code)}
                  >
                    <span className="flag">{idioma.flagEmoji}</span>
                    <span>{idioma.labelNativo}</span>
                    {tieneContenido && <span className="has-content" />}
                  </button>
                );
              })}
            </div>

            {/* Campos según idioma activo */}
            <div className="traduccion-fields">
              {idiomaActivo === 'es' ? (
                <>
                  <div className="form-group">
                    <label>Título (opcional)</label>
                    <input
                      type="text"
                      value={formData.titulo}
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                      placeholder="Título o resumen del testimonio"
                    />
                  </div>
                  <div className="form-group">
                    <label>Contenido *</label>
                    <textarea
                      value={formData.contenido}
                      onChange={(e) => setFormData({ ...formData, contenido: e.target.value })}
                      placeholder="El testimonio completo del cliente..."
                      rows={6}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>Título en {idiomas.find(i => i.code === idiomaActivo)?.labelNativo}</label>
                    <input
                      type="text"
                      value={traducciones[idiomaActivo]?.titulo || ''}
                      onChange={(e) => handleTraduccionChange(idiomaActivo, 'titulo', e.target.value)}
                      placeholder={`Traducción del título en ${idiomas.find(i => i.code === idiomaActivo)?.labelNativo}`}
                    />
                  </div>
                  <div className="form-group">
                    <label>Contenido en {idiomas.find(i => i.code === idiomaActivo)?.labelNativo}</label>
                    <textarea
                      value={traducciones[idiomaActivo]?.contenido || ''}
                      onChange={(e) => handleTraduccionChange(idiomaActivo, 'contenido', e.target.value)}
                      placeholder={`Traducción del testimonio en ${idiomas.find(i => i.code === idiomaActivo)?.labelNativo}`}
                      rows={6}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="rating-section" style={{ marginTop: '16px' }}>
              <span className="rating-label">Rating</span>
              <div className="rating-stars">
                {[1, 2, 3, 4, 5].map(star => (
                  <span
                    key={star}
                    className="rating-star"
                    onClick={() => setFormData({ ...formData, rating: star })}
                  >
                    {star <= formData.rating ? '⭐' : '☆'}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="editor-sidebar">
          {/* Relaciones */}
          <div className="editor-section">
            <h4>{Icons.link} Relaciones</h4>
            <div className="relation-section">
              <div className="relation-item">
                <label>Contacto (auto-rellena datos)</label>
                <ContactPicker
                  value={formData.contactoId || null}
                  onChange={handleContactoSelect}
                  placeholder="Vincular contacto..."
                  contacts={contactos}
                  loading={loading}
                  clearable
                />
              </div>
              <div className="relation-item">
                <label>Asesor</label>
                <UserPicker
                  value={formData.asesorId || null}
                  onChange={(userId) => setFormData({ ...formData, asesorId: userId || '' })}
                  placeholder="Vincular asesor..."
                  users={asesores}
                  loading={loading}
                  clearable
                />
              </div>
              <div className="relation-item">
                <label>Propiedad</label>
                <PropertyPicker
                  value={formData.propiedadId || null}
                  onChange={(propiedadId) => setFormData({ ...formData, propiedadId: propiedadId || '' })}
                  placeholder="Vincular propiedad..."
                  properties={propiedades}
                  loading={loading}
                  clearable
                />
              </div>
            </div>
          </div>

          {/* Categoría */}
          {categorias.length > 0 && (
            <div className="editor-section">
              <h4>{Icons.folder} Categoría</h4>
              <div className="categoria-selector">
                <div
                  className={`categoria-option ${!formData.categoriaId ? 'selected' : ''}`}
                  onClick={() => setFormData({ ...formData, categoriaId: '' })}
                >
                  Sin categoría
                </div>
                {categorias.map(cat => (
                  <div
                    key={cat.id}
                    className={`categoria-option ${formData.categoriaId === cat.id ? 'selected' : ''}`}
                    onClick={() => setFormData({ ...formData, categoriaId: cat.id })}
                  >
                    {cat.color && <span className="cat-color" style={{ background: cat.color }} />}
                    {cat.nombre}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fuente */}
          <div className="editor-section">
            <h4>{Icons.globe} Fuente</h4>
            <div className="fuente-selector">
              {FUENTES_TESTIMONIO.map(fuente => (
                <div
                  key={fuente.value}
                  className={`fuente-option ${formData.fuente === fuente.value ? 'selected' : ''}`}
                  onClick={() => setFormData({ ...formData, fuente: formData.fuente === fuente.value ? '' : fuente.value })}
                >
                  {fuente.icon === 'google' && Icons.google}
                  {fuente.icon === 'facebook' && Icons.facebook}
                  {fuente.label}
                </div>
              ))}
            </div>
          </div>

          {/* Estado */}
          <div className="editor-section">
            <h4>{Icons.settings} Estado</h4>
            <div
              className={`toggle-card ${formData.publicado ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, publicado: !formData.publicado })}
            >
              <div className="toggle-content">
                <span className="toggle-title">{formData.publicado ? 'Publicado' : 'Borrador'}</span>
                <span className="toggle-subtitle">{formData.publicado ? 'Visible en el sitio' : 'Solo visible en el CRM'}</span>
              </div>
              <div className="toggle-switch" />
            </div>
            <div
              className={`toggle-card warning ${formData.destacado ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, destacado: !formData.destacado })}
            >
              <div className="toggle-content">
                <span className="toggle-title">{formData.destacado ? 'Destacado' : 'Normal'}</span>
                <span className="toggle-subtitle">{formData.destacado ? 'Aparece en secciones destacadas' : 'Listado normal'}</span>
              </div>
              <div className="toggle-switch" />
            </div>
            <div
              className={`toggle-card info ${formData.verificado ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, verificado: !formData.verificado })}
            >
              <div className="toggle-content">
                <span className="toggle-title">{formData.verificado ? 'Verificado' : 'Sin verificar'}</span>
                <span className="toggle-subtitle">{formData.verificado ? 'Testimonio confirmado' : 'Pendiente de verificación'}</span>
              </div>
              <div className="toggle-switch" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
