/**
 * MiPerfil - Modal nativo de edicion de perfil
 *
 * Modal grande y centrado con:
 * - Foto de perfil mejorada
 * - Datos personales y de contacto
 * - Perfil profesional para asesores inmobiliarios
 * - Multi-select para especialidades, idiomas, zonas
 * - Cambio de contrasena
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useCatalogos } from '../contexts/CatalogosContext';
import ReactDOM from 'react-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface MiPerfilProps {
  isOpen: boolean;
  onClose: () => void;
}

// Iconos SVG
const Icons = {
  user: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  camera: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  ),
  save: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
  ),
  x: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  loader: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
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
  check: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  mapPin: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  briefcase: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  ),
  lock: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  eye: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  eyeOff: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ),
  fileText: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  chevronDown: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  plus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
};

type TabType = 'personal' | 'contacto' | 'profesional' | 'seguridad';

// Opciones predefinidas
const IDIOMAS_OPCIONES = [
  { value: 'es', label: 'Espanol' },
  { value: 'en', label: 'Ingles' },
  { value: 'fr', label: 'Frances' },
  { value: 'pt', label: 'Portugues' },
  { value: 'de', label: 'Aleman' },
  { value: 'it', label: 'Italiano' },
  { value: 'zh', label: 'Chino Mandarin' },
  { value: 'ja', label: 'Japones' },
];

const ESPECIALIDADES_OPCIONES = [
  'Residencial',
  'Comercial',
  'Industrial',
  'Terrenos',
  'Lujo',
  'Inversion',
  'Alquileres',
  'Primera Vivienda',
  'Vacacional',
  'Oficinas',
];

const TIPOS_PROPIEDAD_OPCIONES = [
  'Casa',
  'Apartamento',
  'Villa',
  'Penthouse',
  'Local Comercial',
  'Oficina',
  'Bodega',
  'Terreno',
  'Finca',
  'Edificio',
];

// Componente MultiSelect con chips
interface MultiSelectProps {
  label: string;
  options: string[] | { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  allowCustom?: boolean;
}

function MultiSelect({ label, options, selected, onChange, placeholder, allowCustom = false }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const normalizedOptions = options.map(opt =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const removeChip = (value: string) => {
    onChange(selected.filter(v => v !== value));
  };

  const addCustom = () => {
    if (customValue.trim() && !selected.includes(customValue.trim())) {
      onChange([...selected, customValue.trim()]);
      setCustomValue('');
    }
  };

  const getLabel = (value: string) => {
    const opt = normalizedOptions.find(o => o.value === value);
    return opt ? opt.label : value;
  };

  return (
    <div className="mi-perfil-multiselect" ref={dropdownRef}>
      <label>{label}</label>
      <div className="multiselect-container">
        <div className="multiselect-chips">
          {selected.map(value => (
            <span key={value} className="multiselect-chip">
              {getLabel(value)}
              <button type="button" onClick={() => removeChip(value)}>&times;</button>
            </span>
          ))}
          <button type="button" className="multiselect-trigger" onClick={() => setIsOpen(!isOpen)}>
            {selected.length === 0 && <span className="placeholder">{placeholder || 'Seleccionar...'}</span>}
            <Icons.chevronDown />
          </button>
        </div>
        {isOpen && (
          <div className="multiselect-dropdown">
            {normalizedOptions.map(opt => (
              <label key={opt.value} className="multiselect-option">
                <input
                  type="checkbox"
                  checked={selected.includes(opt.value)}
                  onChange={() => toggleOption(opt.value)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
            {allowCustom && (
              <div className="multiselect-custom">
                <input
                  type="text"
                  placeholder="Agregar otro..."
                  value={customValue}
                  onChange={e => setCustomValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustom())}
                />
                <button type="button" onClick={addCustom}><Icons.plus /></button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface PerfilAsesorData {
  biografia?: string;
  especialidades?: string[];
  idiomas?: string[];
  zonas?: string[];
  tiposPropiedad?: string[];
  experienciaAnos?: number;
  tituloProfesional?: string;
  whatsapp?: string;
  telefonoDirecto?: string;
  redesSociales?: {
    linkedin?: string;
    instagram?: string;
    facebook?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
  };
  metadata?: {
    licencia?: string;
  };
}

export default function MiPerfil({ isOpen, onClose }: MiPerfilProps) {
  const { user, refetch, tenantActual } = useAuth();
  const { getToken } = useClerkAuth();
  const { zonas: zonasDelCatalogo } = useCatalogos();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('personal');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loadingPerfil, setLoadingPerfil] = useState(false);

  // Verificar si el usuario es asesor inmobiliario
  const esAsesor = tenantActual?.roles?.some(r =>
    r.codigo === 'asesor' || r.codigo === 'asesor_inmobiliario' || r.codigo === 'agente'
  ) || false;

  // Formulario principal
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    estado: '',
    codigoPostal: '',
    pais: '',
    empresa: '',
    cargo: '',
    departamento: '',
  });

  // Datos de perfil asesor
  const [perfilAsesor, setPerfilAsesor] = useState<PerfilAsesorData>({
    biografia: '',
    especialidades: [],
    idiomas: ['es'],
    zonas: [],
    tiposPropiedad: [],
    experienciaAnos: 0,
    tituloProfesional: '',
    whatsapp: '',
    telefonoDirecto: '',
    redesSociales: {
      linkedin: '',
      instagram: '',
      facebook: '',
      twitter: '',
      youtube: '',
      tiktok: '',
    },
    metadata: {
      licencia: '',
    },
  });

  // Formulario de contrasena
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Cargar datos del usuario y perfil asesor al abrir
  useEffect(() => {
    if (isOpen && user) {
      // Cargar datos basicos del usuario
      setForm({
        nombre: user.nombre || '',
        apellido: user.apellido || '',
        telefono: user.telefono || '',
        direccion: user.direccion || '',
        ciudad: user.ciudad || '',
        estado: user.estado || '',
        codigoPostal: user.codigoPostal || '',
        pais: user.pais || '',
        empresa: user.empresa || '',
        cargo: user.cargo || '',
        departamento: user.departamento || '',
      });
      setAvatarPreview(user.avatarUrl || null);
      setError(null);
      setSuccess(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordError(null);
      setPasswordSuccess(false);

      // Cargar perfil de asesor si aplica
      if (esAsesor && tenantActual?.id) {
        loadPerfilAsesor();
      }
    }
  }, [isOpen, user, esAsesor, tenantActual?.id]);

  const loadPerfilAsesor = async () => {
    if (!tenantActual?.id) return;

    try {
      setLoadingPerfil(true);
      const token = await getToken();

      // Obtener perfil completo del usuario que incluye perfilAsesor
      const response = await fetch(`${API_URL}/auth/me?tenantId=${tenantActual.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const userData = await response.json();

        // Si hay perfil de asesor en los datos, cargarlo
        if (userData.perfilAsesor) {
          const pa = userData.perfilAsesor;
          setPerfilAsesor({
            biografia: pa.biografia || '',
            especialidades: Array.isArray(pa.especialidades) ? pa.especialidades : [],
            idiomas: Array.isArray(pa.idiomas) ? pa.idiomas : ['es'],
            zonas: Array.isArray(pa.zonas) ? pa.zonas : [],
            tiposPropiedad: Array.isArray(pa.tiposPropiedad) ? pa.tiposPropiedad : [],
            experienciaAnos: pa.experienciaAnos || 0,
            tituloProfesional: pa.tituloProfesional || '',
            whatsapp: pa.whatsapp || '',
            telefonoDirecto: pa.telefonoDirecto || '',
            redesSociales: {
              linkedin: pa.redesSociales?.linkedin || '',
              instagram: pa.redesSociales?.instagram || '',
              facebook: pa.redesSociales?.facebook || '',
              twitter: pa.redesSociales?.twitter || '',
              youtube: pa.redesSociales?.youtube || '',
              tiktok: pa.redesSociales?.tiktok || '',
            },
            metadata: {
              licencia: pa.metadata?.licencia || '',
            },
          });
        }
      }
    } catch (err) {
      console.error('Error al cargar perfil de asesor:', err);
    } finally {
      setLoadingPerfil(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setSuccess(false);
  };

  const handleAsesorChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name.startsWith('redes_')) {
      const redSocial = name.replace('redes_', '');
      setPerfilAsesor(prev => ({
        ...prev,
        redesSociales: { ...prev.redesSociales, [redSocial]: value },
      }));
    } else if (name === 'licencia') {
      setPerfilAsesor(prev => ({
        ...prev,
        metadata: { ...prev.metadata, licencia: value },
      }));
    } else {
      setPerfilAsesor(prev => ({ ...prev, [name]: value }));
    }
    setSuccess(false);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
    setPasswordError(null);
    setPasswordSuccess(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Por favor selecciona una imagen valida');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('La imagen no debe superar 5MB');
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const token = await getToken();

      // Construir datos para enviar
      const updateData: any = {
        ...form,
        tenantId: tenantActual?.id,
      };

      // Agregar datos de asesor si aplica
      if (esAsesor) {
        updateData.biografia = perfilAsesor.biografia;
        updateData.especialidades = perfilAsesor.especialidades?.join(',');
        updateData.aniosExperiencia = perfilAsesor.experienciaAnos;
        updateData.licencia = perfilAsesor.metadata?.licencia;
        updateData.redesSociales = perfilAsesor.redesSociales;
        updateData.idiomas = perfilAsesor.idiomas;
        updateData.zonas = perfilAsesor.zonas;
        updateData.tiposPropiedad = perfilAsesor.tiposPropiedad;
        updateData.tituloProfesional = perfilAsesor.tituloProfesional;
        updateData.whatsapp = perfilAsesor.whatsapp;
        updateData.telefonoDirecto = perfilAsesor.telefonoDirecto;
      }

      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        Object.entries(updateData).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (typeof value === 'object') {
              formData.append(key, JSON.stringify(value));
            } else {
              formData.append(key, String(value));
            }
          }
        });

        const response = await fetch(`${API_URL}/auth/profile`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Error al actualizar perfil');
        }
      } else {
        const response = await fetch(`${API_URL}/auth/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Error al actualizar perfil');
        }
      }

      await refetch();
      setSuccess(true);
      setAvatarFile(null);
    } catch (err: any) {
      console.error('Error al guardar perfil:', err);
      setError(err.message || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Las contrasenas no coinciden');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('La contrasena debe tener al menos 8 caracteres');
      return;
    }

    try {
      setSavingPassword(true);
      setPasswordError(null);
      setPasswordSuccess(false);

      const token = await getToken();

      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Error al cambiar contrasena');
      }

      setPasswordSuccess(true);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      console.error('Error al cambiar contrasena:', err);
      setPasswordError(err.message || 'Error al cambiar la contrasena');
    } finally {
      setSavingPassword(false);
    }
  };

  // Opciones de zonas del catalogo
  const zonasOpciones = zonasDelCatalogo?.length > 0
    ? zonasDelCatalogo.map(z => z.nombre)
    : ['Zona Norte', 'Zona Sur', 'Centro', 'Este', 'Oeste', 'Piantini', 'Naco', 'Bella Vista', 'Ensanche Serralles'];

  if (!isOpen) return null;

  const modalContent = (
    <>
      <div className="mi-perfil-overlay" onClick={onClose} />
      <div className="mi-perfil-modal">
        {/* Header */}
        <div className="mi-perfil-header">
          <h2>Mi Perfil</h2>
          <button className="mi-perfil-close" onClick={onClose} type="button">
            <Icons.x />
          </button>
        </div>

        <div className="mi-perfil-body">
          {/* Sidebar con Avatar */}
          <div className="mi-perfil-sidebar">
            <div className="mi-perfil-avatar-wrapper">
              <div className="mi-perfil-avatar-container" onClick={handleAvatarClick}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="mi-perfil-avatar" />
                ) : (
                  <div className="mi-perfil-avatar-placeholder">
                    <Icons.user />
                  </div>
                )}
                <div className="mi-perfil-avatar-overlay">
                  <Icons.camera />
                  <span>Cambiar foto</span>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />
            </div>
            <div className="mi-perfil-user-info">
              <h3>{user?.nombre || ''} {user?.apellido || ''}</h3>
              <p>{user?.email}</p>
              {esAsesor && <span className="mi-perfil-badge">Asesor Inmobiliario</span>}
              {user?.cargo && !esAsesor && <span className="mi-perfil-badge">{user.cargo}</span>}
            </div>

            {/* Tabs Verticales */}
            <nav className="mi-perfil-nav">
              <button
                type="button"
                className={`mi-perfil-nav-item ${activeTab === 'personal' ? 'active' : ''}`}
                onClick={() => setActiveTab('personal')}
              >
                <Icons.user />
                <span>Informacion Personal</span>
              </button>
              <button
                type="button"
                className={`mi-perfil-nav-item ${activeTab === 'contacto' ? 'active' : ''}`}
                onClick={() => setActiveTab('contacto')}
              >
                <Icons.mapPin />
                <span>Contacto y Ubicacion</span>
              </button>
              <button
                type="button"
                className={`mi-perfil-nav-item ${activeTab === 'profesional' ? 'active' : ''}`}
                onClick={() => setActiveTab('profesional')}
              >
                <Icons.briefcase />
                <span>Perfil Profesional</span>
              </button>
              <button
                type="button"
                className={`mi-perfil-nav-item ${activeTab === 'seguridad' ? 'active' : ''}`}
                onClick={() => setActiveTab('seguridad')}
              >
                <Icons.lock />
                <span>Seguridad</span>
              </button>
            </nav>
          </div>

          {/* Contenido Principal */}
          <div className="mi-perfil-content">
            {loadingPerfil && (
              <div className="mi-perfil-loading">
                <Icons.loader />
                <span>Cargando perfil...</span>
              </div>
            )}

            {/* Tab: Personal */}
            {activeTab === 'personal' && !loadingPerfil && (
              <form onSubmit={handleSubmit} className="mi-perfil-form">
                <h3>Informacion Personal</h3>
                <p className="mi-perfil-description">
                  Actualiza tu informacion basica de perfil.
                </p>

                <div className="mi-perfil-fields">
                  <div className="mi-perfil-field">
                    <label>Nombre</label>
                    <input
                      type="text"
                      name="nombre"
                      value={form.nombre}
                      onChange={handleChange}
                      placeholder="Tu nombre"
                    />
                  </div>
                  <div className="mi-perfil-field">
                    <label>Apellido</label>
                    <input
                      type="text"
                      name="apellido"
                      value={form.apellido}
                      onChange={handleChange}
                      placeholder="Tu apellido"
                    />
                  </div>
                  <div className="mi-perfil-field">
                    <label>Telefono</label>
                    <input
                      type="tel"
                      name="telefono"
                      value={form.telefono}
                      onChange={handleChange}
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                  <div className="mi-perfil-field">
                    <label>Email</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="disabled"
                    />
                    <span className="mi-perfil-hint">El email no puede ser modificado</span>
                  </div>
                </div>

                {error && activeTab === 'personal' && (
                  <div className="mi-perfil-error">{error}</div>
                )}
                {success && activeTab === 'personal' && (
                  <div className="mi-perfil-success">
                    <Icons.check />
                    Perfil actualizado correctamente
                  </div>
                )}

                <div className="mi-perfil-actions">
                  <button type="submit" className="mi-perfil-btn primary" disabled={saving}>
                    {saving ? (
                      <><Icons.loader /> Guardando...</>
                    ) : (
                      <><Icons.save /> Guardar cambios</>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Tab: Contacto */}
            {activeTab === 'contacto' && !loadingPerfil && (
              <form onSubmit={handleSubmit} className="mi-perfil-form">
                <h3>Contacto y Ubicacion</h3>
                <p className="mi-perfil-description">
                  Tu direccion y datos de contacto.
                </p>

                <div className="mi-perfil-fields">
                  <div className="mi-perfil-field full-width">
                    <label>Direccion</label>
                    <input
                      type="text"
                      name="direccion"
                      value={form.direccion}
                      onChange={handleChange}
                      placeholder="Calle y numero"
                    />
                  </div>
                  <div className="mi-perfil-field">
                    <label>Ciudad</label>
                    <input
                      type="text"
                      name="ciudad"
                      value={form.ciudad}
                      onChange={handleChange}
                      placeholder="Ciudad"
                    />
                  </div>
                  <div className="mi-perfil-field">
                    <label>Estado/Provincia</label>
                    <input
                      type="text"
                      name="estado"
                      value={form.estado}
                      onChange={handleChange}
                      placeholder="Estado o provincia"
                    />
                  </div>
                  <div className="mi-perfil-field">
                    <label>Codigo Postal</label>
                    <input
                      type="text"
                      name="codigoPostal"
                      value={form.codigoPostal}
                      onChange={handleChange}
                      placeholder="12345"
                    />
                  </div>
                  <div className="mi-perfil-field">
                    <label>Pais</label>
                    <input
                      type="text"
                      name="pais"
                      value={form.pais}
                      onChange={handleChange}
                      placeholder="Pais"
                    />
                  </div>
                  {esAsesor && (
                    <>
                      <div className="mi-perfil-field">
                        <label>WhatsApp</label>
                        <input
                          type="tel"
                          name="whatsapp"
                          value={perfilAsesor.whatsapp}
                          onChange={handleAsesorChange}
                          placeholder="+1 809 123 4567"
                        />
                      </div>
                      <div className="mi-perfil-field">
                        <label>Telefono Directo</label>
                        <input
                          type="tel"
                          name="telefonoDirecto"
                          value={perfilAsesor.telefonoDirecto}
                          onChange={handleAsesorChange}
                          placeholder="+1 809 123 4567"
                        />
                      </div>
                    </>
                  )}
                </div>

                {error && activeTab === 'contacto' && (
                  <div className="mi-perfil-error">{error}</div>
                )}
                {success && activeTab === 'contacto' && (
                  <div className="mi-perfil-success">
                    <Icons.check />
                    Informacion actualizada correctamente
                  </div>
                )}

                <div className="mi-perfil-actions">
                  <button type="submit" className="mi-perfil-btn primary" disabled={saving}>
                    {saving ? (
                      <><Icons.loader /> Guardando...</>
                    ) : (
                      <><Icons.save /> Guardar cambios</>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Tab: Profesional */}
            {activeTab === 'profesional' && !loadingPerfil && (
              <form onSubmit={handleSubmit} className="mi-perfil-form">
                <h3>Perfil Profesional</h3>
                <p className="mi-perfil-description">
                  {esAsesor
                    ? 'Completa tu perfil de asesor inmobiliario para destacar en la plataforma.'
                    : 'Informacion sobre tu trabajo y empresa.'}
                </p>

                <div className="mi-perfil-fields">
                  {!esAsesor && (
                    <>
                      <div className="mi-perfil-field">
                        <label>Empresa</label>
                        <input
                          type="text"
                          name="empresa"
                          value={form.empresa}
                          onChange={handleChange}
                          placeholder="Nombre de la empresa"
                        />
                      </div>
                      <div className="mi-perfil-field">
                        <label>Cargo</label>
                        <input
                          type="text"
                          name="cargo"
                          value={form.cargo}
                          onChange={handleChange}
                          placeholder="Tu cargo"
                        />
                      </div>
                      <div className="mi-perfil-field">
                        <label>Departamento</label>
                        <input
                          type="text"
                          name="departamento"
                          value={form.departamento}
                          onChange={handleChange}
                          placeholder="Departamento"
                        />
                      </div>
                    </>
                  )}

                  {esAsesor && (
                    <>
                      <div className="mi-perfil-field">
                        <label>Titulo Profesional</label>
                        <input
                          type="text"
                          name="tituloProfesional"
                          value={perfilAsesor.tituloProfesional}
                          onChange={handleAsesorChange}
                          placeholder="Ej: Agente Inmobiliario, Broker Asociado"
                        />
                      </div>
                      <div className="mi-perfil-field">
                        <label>Anos de Experiencia</label>
                        <input
                          type="number"
                          name="experienciaAnos"
                          value={perfilAsesor.experienciaAnos || ''}
                          onChange={handleAsesorChange}
                          placeholder="0"
                          min="0"
                          max="50"
                        />
                      </div>
                      <div className="mi-perfil-field">
                        <label>Licencia/Certificacion</label>
                        <input
                          type="text"
                          name="licencia"
                          value={perfilAsesor.metadata?.licencia || ''}
                          onChange={handleAsesorChange}
                          placeholder="Numero de licencia"
                        />
                      </div>
                    </>
                  )}
                </div>

                {esAsesor && (
                  <>
                    <h4 className="mi-perfil-section-title">Especializacion</h4>
                    <div className="mi-perfil-fields">
                      <MultiSelect
                        label="Especialidades"
                        options={ESPECIALIDADES_OPCIONES}
                        selected={perfilAsesor.especialidades || []}
                        onChange={(values) => setPerfilAsesor(prev => ({ ...prev, especialidades: values }))}
                        placeholder="Selecciona tus especialidades"
                        allowCustom
                      />
                      <MultiSelect
                        label="Idiomas"
                        options={IDIOMAS_OPCIONES}
                        selected={perfilAsesor.idiomas || []}
                        onChange={(values) => setPerfilAsesor(prev => ({ ...prev, idiomas: values }))}
                        placeholder="Selecciona idiomas"
                      />
                      <MultiSelect
                        label="Zonas de Cobertura"
                        options={zonasOpciones}
                        selected={perfilAsesor.zonas || []}
                        onChange={(values) => setPerfilAsesor(prev => ({ ...prev, zonas: values }))}
                        placeholder="Selecciona zonas"
                        allowCustom
                      />
                      <MultiSelect
                        label="Tipos de Propiedad"
                        options={TIPOS_PROPIEDAD_OPCIONES}
                        selected={perfilAsesor.tiposPropiedad || []}
                        onChange={(values) => setPerfilAsesor(prev => ({ ...prev, tiposPropiedad: values }))}
                        placeholder="Selecciona tipos"
                        allowCustom
                      />
                    </div>

                    <h4 className="mi-perfil-section-title">Acerca de Ti</h4>
                  </>
                )}

                <div className="mi-perfil-fields">
                  <div className="mi-perfil-field full-width">
                    <label>
                      <Icons.fileText />
                      {esAsesor ? 'Biografia / Acerca de mi' : 'Descripcion'}
                    </label>
                    <textarea
                      name="biografia"
                      value={esAsesor ? perfilAsesor.biografia : ''}
                      onChange={handleAsesorChange}
                      placeholder={esAsesor
                        ? "Cuentale a tus clientes sobre ti, tu experiencia y que te hace diferente..."
                        : "Una breve descripcion sobre ti..."}
                      rows={5}
                      disabled={!esAsesor}
                    />
                    {esAsesor && (
                      <span className="mi-perfil-hint">
                        {(perfilAsesor.biografia || '').length}/500 caracteres
                      </span>
                    )}
                  </div>
                </div>

                {esAsesor && (
                  <>
                    <h4 className="mi-perfil-section-title">Redes Sociales</h4>
                    <div className="mi-perfil-fields">
                      <div className="mi-perfil-field">
                        <label>LinkedIn</label>
                        <input
                          type="url"
                          name="redes_linkedin"
                          value={perfilAsesor.redesSociales?.linkedin || ''}
                          onChange={handleAsesorChange}
                          placeholder="https://linkedin.com/in/tu-perfil"
                        />
                      </div>
                      <div className="mi-perfil-field">
                        <label>Instagram</label>
                        <input
                          type="text"
                          name="redes_instagram"
                          value={perfilAsesor.redesSociales?.instagram || ''}
                          onChange={handleAsesorChange}
                          placeholder="@tu_usuario"
                        />
                      </div>
                      <div className="mi-perfil-field">
                        <label>Facebook</label>
                        <input
                          type="url"
                          name="redes_facebook"
                          value={perfilAsesor.redesSociales?.facebook || ''}
                          onChange={handleAsesorChange}
                          placeholder="https://facebook.com/tu-pagina"
                        />
                      </div>
                      <div className="mi-perfil-field">
                        <label>Twitter / X</label>
                        <input
                          type="text"
                          name="redes_twitter"
                          value={perfilAsesor.redesSociales?.twitter || ''}
                          onChange={handleAsesorChange}
                          placeholder="@tu_usuario"
                        />
                      </div>
                      <div className="mi-perfil-field">
                        <label>YouTube</label>
                        <input
                          type="url"
                          name="redes_youtube"
                          value={perfilAsesor.redesSociales?.youtube || ''}
                          onChange={handleAsesorChange}
                          placeholder="https://youtube.com/@tu-canal"
                        />
                      </div>
                      <div className="mi-perfil-field">
                        <label>TikTok</label>
                        <input
                          type="text"
                          name="redes_tiktok"
                          value={perfilAsesor.redesSociales?.tiktok || ''}
                          onChange={handleAsesorChange}
                          placeholder="@tu_usuario"
                        />
                      </div>
                    </div>
                  </>
                )}

                {error && activeTab === 'profesional' && (
                  <div className="mi-perfil-error">{error}</div>
                )}
                {success && activeTab === 'profesional' && (
                  <div className="mi-perfil-success">
                    <Icons.check />
                    Perfil profesional actualizado
                  </div>
                )}

                <div className="mi-perfil-actions">
                  <button type="submit" className="mi-perfil-btn primary" disabled={saving}>
                    {saving ? (
                      <><Icons.loader /> Guardando...</>
                    ) : (
                      <><Icons.save /> Guardar cambios</>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Tab: Seguridad */}
            {activeTab === 'seguridad' && !loadingPerfil && (
              <form onSubmit={handlePasswordSubmit} className="mi-perfil-form">
                <h3>Seguridad</h3>
                <p className="mi-perfil-description">
                  Cambia tu contrasena para mantener tu cuenta segura.
                </p>

                <div className="mi-perfil-fields single-column">
                  <div className="mi-perfil-field">
                    <label>Contrasena Actual</label>
                    <div className="mi-perfil-password-input">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        name="currentPassword"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                        placeholder="Ingresa tu contrasena actual"
                      />
                      <button
                        type="button"
                        className="mi-perfil-password-toggle"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <Icons.eyeOff /> : <Icons.eye />}
                      </button>
                    </div>
                  </div>
                  <div className="mi-perfil-field">
                    <label>Nueva Contrasena</label>
                    <div className="mi-perfil-password-input">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        name="newPassword"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                        placeholder="Minimo 8 caracteres"
                      />
                      <button
                        type="button"
                        className="mi-perfil-password-toggle"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <Icons.eyeOff /> : <Icons.eye />}
                      </button>
                    </div>
                  </div>
                  <div className="mi-perfil-field">
                    <label>Confirmar Nueva Contrasena</label>
                    <div className="mi-perfil-password-input">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange}
                        placeholder="Repite la nueva contrasena"
                      />
                      <button
                        type="button"
                        className="mi-perfil-password-toggle"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <Icons.eyeOff /> : <Icons.eye />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mi-perfil-password-requirements">
                  <p>La contrasena debe cumplir con:</p>
                  <ul>
                    <li className={passwordForm.newPassword.length >= 8 ? 'valid' : ''}>
                      Al menos 8 caracteres
                    </li>
                    <li className={/[A-Z]/.test(passwordForm.newPassword) ? 'valid' : ''}>
                      Una letra mayuscula
                    </li>
                    <li className={/[0-9]/.test(passwordForm.newPassword) ? 'valid' : ''}>
                      Un numero
                    </li>
                  </ul>
                </div>

                {passwordError && (
                  <div className="mi-perfil-error">{passwordError}</div>
                )}
                {passwordSuccess && (
                  <div className="mi-perfil-success">
                    <Icons.check />
                    Contrasena actualizada correctamente
                  </div>
                )}

                <div className="mi-perfil-actions">
                  <button
                    type="submit"
                    className="mi-perfil-btn primary"
                    disabled={savingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                  >
                    {savingPassword ? (
                      <><Icons.loader /> Cambiando...</>
                    ) : (
                      <><Icons.lock /> Cambiar Contrasena</>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .mi-perfil-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          z-index: 10000;
          animation: fadeIn 0.2s ease;
        }

        .mi-perfil-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          border-radius: 20px;
          width: 95%;
          max-width: 1100px;
          height: 90vh;
          max-height: 750px;
          display: flex;
          flex-direction: column;
          z-index: 10001;
          box-shadow: 0 25px 80px -12px rgba(0, 0, 0, 0.35);
          animation: modalSlideIn 0.3s ease;
          overflow: hidden;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translate(-50%, -48%) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        .mi-perfil-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 28px;
          border-bottom: 1px solid #E5E7EB;
          background: #FAFBFC;
          flex-shrink: 0;
        }

        .mi-perfil-header h2 {
          margin: 0;
          font-size: 1.375rem;
          font-weight: 700;
          color: #111827;
        }

        .mi-perfil-close {
          background: none;
          border: none;
          padding: 8px;
          border-radius: 10px;
          cursor: pointer;
          color: #6B7280;
          transition: all 0.15s ease;
        }

        .mi-perfil-close:hover {
          background: #F3F4F6;
          color: #111827;
        }

        .mi-perfil-body {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .mi-perfil-sidebar {
          width: 280px;
          background: linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%);
          border-right: 1px solid #E2E8F0;
          padding: 28px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
          overflow-y: auto;
        }

        .mi-perfil-avatar-wrapper {
          margin-bottom: 20px;
        }

        .mi-perfil-avatar-container {
          position: relative;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          overflow: hidden;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          border: 4px solid white;
        }

        .mi-perfil-avatar {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .mi-perfil-avatar-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #0057FF 0%, #6236FF 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .mi-perfil-avatar-placeholder svg {
          width: 48px;
          height: 48px;
        }

        .mi-perfil-avatar-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          color: white;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .mi-perfil-avatar-overlay span {
          font-size: 0.75rem;
          font-weight: 500;
        }

        .mi-perfil-avatar-container:hover .mi-perfil-avatar-overlay {
          opacity: 1;
        }

        .mi-perfil-user-info {
          text-align: center;
          margin-bottom: 28px;
        }

        .mi-perfil-user-info h3 {
          margin: 0 0 4px 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
        }

        .mi-perfil-user-info p {
          margin: 0 0 10px 0;
          font-size: 0.875rem;
          color: #6B7280;
        }

        .mi-perfil-badge {
          display: inline-block;
          padding: 4px 12px;
          background: linear-gradient(135deg, #0057FF 0%, #6236FF 100%);
          color: white;
          font-size: 0.75rem;
          font-weight: 500;
          border-radius: 20px;
        }

        .mi-perfil-nav {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .mi-perfil-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: transparent;
          border: none;
          border-radius: 10px;
          color: #64748B;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
          width: 100%;
        }

        .mi-perfil-nav-item:hover {
          background: rgba(0, 87, 255, 0.08);
          color: #0057FF;
        }

        .mi-perfil-nav-item.active {
          background: white;
          color: #0057FF;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .mi-perfil-nav-item svg {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
        }

        .mi-perfil-content {
          flex: 1;
          padding: 28px 32px;
          overflow-y: auto;
        }

        .mi-perfil-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 40px;
          color: #6B7280;
        }

        .mi-perfil-form h3 {
          margin: 0 0 8px 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
        }

        .mi-perfil-description {
          margin: 0 0 24px 0;
          font-size: 0.9375rem;
          color: #6B7280;
        }

        .mi-perfil-section-title {
          margin: 32px 0 16px 0;
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
          padding-top: 24px;
          border-top: 1px solid #E5E7EB;
        }

        .mi-perfil-fields {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .mi-perfil-fields.single-column {
          grid-template-columns: 1fr;
          max-width: 400px;
        }

        .mi-perfil-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .mi-perfil-field.full-width {
          grid-column: span 2;
        }

        .mi-perfil-field label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }

        .mi-perfil-field label svg {
          width: 16px;
          height: 16px;
          color: #6B7280;
        }

        .mi-perfil-field input,
        .mi-perfil-field textarea,
        .mi-perfil-field select {
          padding: 12px 16px;
          border: 1.5px solid #E2E8F0;
          border-radius: 10px;
          font-size: 0.9375rem;
          color: #111827;
          transition: all 0.15s ease;
          background: white;
        }

        .mi-perfil-field input:focus,
        .mi-perfil-field textarea:focus,
        .mi-perfil-field select:focus {
          outline: none;
          border-color: #0057FF;
          box-shadow: 0 0 0 4px rgba(0, 87, 255, 0.1);
        }

        .mi-perfil-field input.disabled,
        .mi-perfil-field input:disabled {
          background: #F8FAFC;
          color: #94A3B8;
          cursor: not-allowed;
        }

        .mi-perfil-field textarea {
          resize: vertical;
          min-height: 120px;
          font-family: inherit;
        }

        .mi-perfil-field textarea:disabled {
          background: #F8FAFC;
          color: #94A3B8;
        }

        .mi-perfil-hint {
          font-size: 0.75rem;
          color: #94A3B8;
        }

        /* MultiSelect Styles */
        .mi-perfil-multiselect {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .mi-perfil-multiselect label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }

        .multiselect-container {
          position: relative;
        }

        .multiselect-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 10px 12px;
          border: 1.5px solid #E2E8F0;
          border-radius: 10px;
          background: white;
          min-height: 48px;
          align-items: center;
          cursor: pointer;
        }

        .multiselect-chips:hover {
          border-color: #CBD5E1;
        }

        .multiselect-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: #EFF6FF;
          color: #1D4ED8;
          font-size: 0.8125rem;
          font-weight: 500;
          border-radius: 6px;
        }

        .multiselect-chip button {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          color: #1D4ED8;
          font-size: 1rem;
          line-height: 1;
          opacity: 0.7;
        }

        .multiselect-chip button:hover {
          opacity: 1;
        }

        .multiselect-trigger {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          padding: 4px;
          cursor: pointer;
          margin-left: auto;
          color: #64748B;
        }

        .multiselect-trigger .placeholder {
          color: #94A3B8;
          font-size: 0.9375rem;
        }

        .multiselect-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 4px;
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          z-index: 100;
          max-height: 250px;
          overflow-y: auto;
        }

        .multiselect-option {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          cursor: pointer;
          transition: background 0.1s ease;
        }

        .multiselect-option:hover {
          background: #F8FAFC;
        }

        .multiselect-option input[type="checkbox"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .multiselect-option span {
          font-size: 0.9rem;
          color: #374151;
        }

        .multiselect-custom {
          display: flex;
          gap: 8px;
          padding: 10px 14px;
          border-top: 1px solid #E2E8F0;
        }

        .multiselect-custom input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          font-size: 0.875rem;
        }

        .multiselect-custom button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: #0057FF;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }

        .mi-perfil-password-input {
          position: relative;
          display: flex;
          align-items: center;
        }

        .mi-perfil-password-input input {
          width: 100%;
          padding-right: 48px;
        }

        .mi-perfil-password-toggle {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          padding: 4px;
          cursor: pointer;
          color: #94A3B8;
          transition: color 0.15s ease;
        }

        .mi-perfil-password-toggle:hover {
          color: #64748B;
        }

        .mi-perfil-password-requirements {
          margin-top: 20px;
          padding: 16px;
          background: #F8FAFC;
          border-radius: 10px;
        }

        .mi-perfil-password-requirements p {
          margin: 0 0 12px 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }

        .mi-perfil-password-requirements ul {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .mi-perfil-password-requirements li {
          font-size: 0.8125rem;
          color: #94A3B8;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .mi-perfil-password-requirements li::before {
          content: '';
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #E2E8F0;
        }

        .mi-perfil-password-requirements li.valid {
          color: #10B981;
        }

        .mi-perfil-password-requirements li.valid::before {
          background: #10B981;
        }

        .mi-perfil-error {
          margin-top: 20px;
          padding: 14px 18px;
          background: #FEF2F2;
          border: 1px solid #FECACA;
          border-radius: 10px;
          color: #DC2626;
          font-size: 0.875rem;
        }

        .mi-perfil-success {
          margin-top: 20px;
          padding: 14px 18px;
          background: #F0FDF4;
          border: 1px solid #BBF7D0;
          border-radius: 10px;
          color: #16A34A;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .mi-perfil-actions {
          display: flex;
          justify-content: flex-start;
          gap: 12px;
          margin-top: 28px;
          padding-top: 24px;
          border-top: 1px solid #E5E7EB;
        }

        .mi-perfil-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .mi-perfil-btn.primary {
          background: linear-gradient(135deg, #0057FF 0%, #0041CC 100%);
          border: none;
          color: white;
          box-shadow: 0 4px 12px rgba(0, 87, 255, 0.25);
        }

        .mi-perfil-btn.primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(0, 87, 255, 0.35);
        }

        .mi-perfil-btn.primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @media (max-width: 768px) {
          .mi-perfil-modal {
            width: 100%;
            height: 100%;
            max-height: 100%;
            border-radius: 0;
          }

          .mi-perfil-body {
            flex-direction: column;
          }

          .mi-perfil-sidebar {
            width: 100%;
            padding: 20px;
            border-right: none;
            border-bottom: 1px solid #E2E8F0;
          }

          .mi-perfil-avatar-container {
            width: 80px;
            height: 80px;
          }

          .mi-perfil-nav {
            flex-direction: row;
            overflow-x: auto;
            gap: 8px;
            padding-bottom: 8px;
          }

          .mi-perfil-nav-item {
            padding: 10px 14px;
            white-space: nowrap;
          }

          .mi-perfil-nav-item span {
            display: none;
          }

          .mi-perfil-content {
            padding: 20px;
          }

          .mi-perfil-fields {
            grid-template-columns: 1fr;
          }

          .mi-perfil-field.full-width {
            grid-column: span 1;
          }
        }
      `}</style>
    </>
  );

  // Usar portal para renderizar en el body
  return ReactDOM.createPortal(modalContent, document.body);
}
