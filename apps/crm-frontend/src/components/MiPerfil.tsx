/**
 * MiPerfil - Modal nativo de edición de perfil
 *
 * Modal grande y centrado con:
 * - Foto de perfil mejorada
 * - Datos personales y de contacto
 * - Biografía para asesores inmobiliarios
 * - Cambio de contraseña
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
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
  edit: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
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
};

type TabType = 'personal' | 'contacto' | 'profesional' | 'seguridad';

export default function MiPerfil({ isOpen, onClose }: MiPerfilProps) {
  const { user, refetch, tenantActual } = useAuth();
  const { getToken } = useClerkAuth();
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
    biografia: '',
    especialidades: '',
    aniosExperiencia: '',
    licencia: '',
    redesSociales: {
      linkedin: '',
      instagram: '',
      facebook: '',
    },
  });

  // Formulario de contraseña
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Cargar datos del usuario al abrir
  useEffect(() => {
    if (isOpen && user) {
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
        biografia: (user as any).biografia || '',
        especialidades: (user as any).especialidades || '',
        aniosExperiencia: (user as any).aniosExperiencia || '',
        licencia: (user as any).licencia || '',
        redesSociales: {
          linkedin: (user as any).redesSociales?.linkedin || '',
          instagram: (user as any).redesSociales?.instagram || '',
          facebook: (user as any).redesSociales?.facebook || '',
        },
      });
      setAvatarPreview(user.avatarUrl || null);
      setError(null);
      setSuccess(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordError(null);
      setPasswordSuccess(false);
    }
  }, [isOpen, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('redes_')) {
      const redSocial = name.replace('redes_', '');
      setForm(prev => ({
        ...prev,
        redesSociales: { ...prev.redesSociales, [redSocial]: value },
      }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
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
        setError('Por favor selecciona una imagen válida');
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

      const updateData: any = {
        nombre: form.nombre,
        apellido: form.apellido,
        telefono: form.telefono,
        direccion: form.direccion,
        ciudad: form.ciudad,
        estado: form.estado,
        codigoPostal: form.codigoPostal,
        pais: form.pais,
        empresa: form.empresa,
        cargo: form.cargo,
        departamento: form.departamento,
        biografia: form.biografia,
        especialidades: form.especialidades,
        aniosExperiencia: form.aniosExperiencia,
        licencia: form.licencia,
        redesSociales: form.redesSociales,
      };

      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        Object.entries(updateData).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (typeof value === 'object') {
              formData.append(key, JSON.stringify(value));
            } else {
              formData.append(key, value as string);
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
      setPasswordError('Las contraseñas no coinciden');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('La contraseña debe tener al menos 8 caracteres');
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
        throw new Error(data.message || 'Error al cambiar contraseña');
      }

      setPasswordSuccess(true);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      console.error('Error al cambiar contraseña:', err);
      setPasswordError(err.message || 'Error al cambiar la contraseña');
    } finally {
      setSavingPassword(false);
    }
  };

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
              {user?.cargo && <span className="mi-perfil-badge">{user.cargo}</span>}
            </div>

            {/* Tabs Verticales */}
            <nav className="mi-perfil-nav">
              <button
                type="button"
                className={`mi-perfil-nav-item ${activeTab === 'personal' ? 'active' : ''}`}
                onClick={() => setActiveTab('personal')}
              >
                <Icons.user />
                <span>Información Personal</span>
              </button>
              <button
                type="button"
                className={`mi-perfil-nav-item ${activeTab === 'contacto' ? 'active' : ''}`}
                onClick={() => setActiveTab('contacto')}
              >
                <Icons.mapPin />
                <span>Contacto y Ubicación</span>
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
            {/* Tab: Personal */}
            {activeTab === 'personal' && (
              <form onSubmit={handleSubmit} className="mi-perfil-form">
                <h3>Información Personal</h3>
                <p className="mi-perfil-description">
                  Actualiza tu información básica de perfil.
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
                    <label>Teléfono</label>
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
            {activeTab === 'contacto' && (
              <form onSubmit={handleSubmit} className="mi-perfil-form">
                <h3>Contacto y Ubicación</h3>
                <p className="mi-perfil-description">
                  Tu dirección y datos de contacto.
                </p>

                <div className="mi-perfil-fields">
                  <div className="mi-perfil-field full-width">
                    <label>Dirección</label>
                    <input
                      type="text"
                      name="direccion"
                      value={form.direccion}
                      onChange={handleChange}
                      placeholder="Calle y número"
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
                    <label>Código Postal</label>
                    <input
                      type="text"
                      name="codigoPostal"
                      value={form.codigoPostal}
                      onChange={handleChange}
                      placeholder="12345"
                    />
                  </div>
                  <div className="mi-perfil-field">
                    <label>País</label>
                    <input
                      type="text"
                      name="pais"
                      value={form.pais}
                      onChange={handleChange}
                      placeholder="País"
                    />
                  </div>
                </div>

                {error && activeTab === 'contacto' && (
                  <div className="mi-perfil-error">{error}</div>
                )}
                {success && activeTab === 'contacto' && (
                  <div className="mi-perfil-success">
                    <Icons.check />
                    Información actualizada correctamente
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
            {activeTab === 'profesional' && (
              <form onSubmit={handleSubmit} className="mi-perfil-form">
                <h3>Perfil Profesional</h3>
                <p className="mi-perfil-description">
                  {esAsesor
                    ? 'Completa tu perfil de asesor inmobiliario para destacar en la plataforma.'
                    : 'Información sobre tu trabajo y empresa.'}
                </p>

                <div className="mi-perfil-fields">
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
                  {esAsesor && (
                    <>
                      <div className="mi-perfil-field">
                        <label>Años de Experiencia</label>
                        <input
                          type="text"
                          name="aniosExperiencia"
                          value={form.aniosExperiencia}
                          onChange={handleChange}
                          placeholder="Ej: 5 años"
                        />
                      </div>
                      <div className="mi-perfil-field">
                        <label>Licencia/Certificación</label>
                        <input
                          type="text"
                          name="licencia"
                          value={form.licencia}
                          onChange={handleChange}
                          placeholder="Número de licencia"
                        />
                      </div>
                      <div className="mi-perfil-field">
                        <label>Especialidades</label>
                        <input
                          type="text"
                          name="especialidades"
                          value={form.especialidades}
                          onChange={handleChange}
                          placeholder="Ej: Residencial, Comercial, Lujo"
                        />
                      </div>
                    </>
                  )}
                  <div className="mi-perfil-field full-width">
                    <label>
                      <Icons.fileText />
                      Biografía / Acerca de mí
                    </label>
                    <textarea
                      name="biografia"
                      value={form.biografia}
                      onChange={handleChange}
                      placeholder={esAsesor
                        ? "Cuéntale a tus clientes sobre ti, tu experiencia y qué te hace diferente..."
                        : "Una breve descripción sobre ti..."}
                      rows={5}
                    />
                    <span className="mi-perfil-hint">
                      {form.biografia.length}/500 caracteres
                    </span>
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
                          value={form.redesSociales.linkedin}
                          onChange={handleChange}
                          placeholder="https://linkedin.com/in/tu-perfil"
                        />
                      </div>
                      <div className="mi-perfil-field">
                        <label>Instagram</label>
                        <input
                          type="text"
                          name="redes_instagram"
                          value={form.redesSociales.instagram}
                          onChange={handleChange}
                          placeholder="@tu_usuario"
                        />
                      </div>
                      <div className="mi-perfil-field">
                        <label>Facebook</label>
                        <input
                          type="url"
                          name="redes_facebook"
                          value={form.redesSociales.facebook}
                          onChange={handleChange}
                          placeholder="https://facebook.com/tu-pagina"
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
            {activeTab === 'seguridad' && (
              <form onSubmit={handlePasswordSubmit} className="mi-perfil-form">
                <h3>Seguridad</h3>
                <p className="mi-perfil-description">
                  Cambia tu contraseña para mantener tu cuenta segura.
                </p>

                <div className="mi-perfil-fields single-column">
                  <div className="mi-perfil-field">
                    <label>Contraseña Actual</label>
                    <div className="mi-perfil-password-input">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        name="currentPassword"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                        placeholder="Ingresa tu contraseña actual"
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
                    <label>Nueva Contraseña</label>
                    <div className="mi-perfil-password-input">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        name="newPassword"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                        placeholder="Mínimo 8 caracteres"
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
                    <label>Confirmar Nueva Contraseña</label>
                    <div className="mi-perfil-password-input">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange}
                        placeholder="Repite la nueva contraseña"
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
                  <p>La contraseña debe cumplir con:</p>
                  <ul>
                    <li className={passwordForm.newPassword.length >= 8 ? 'valid' : ''}>
                      Al menos 8 caracteres
                    </li>
                    <li className={/[A-Z]/.test(passwordForm.newPassword) ? 'valid' : ''}>
                      Una letra mayúscula
                    </li>
                    <li className={/[0-9]/.test(passwordForm.newPassword) ? 'valid' : ''}>
                      Un número
                    </li>
                  </ul>
                </div>

                {passwordError && (
                  <div className="mi-perfil-error">{passwordError}</div>
                )}
                {passwordSuccess && (
                  <div className="mi-perfil-success">
                    <Icons.check />
                    Contraseña actualizada correctamente
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
                      <><Icons.lock /> Cambiar Contraseña</>
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
          max-width: 1000px;
          height: 90vh;
          max-height: 700px;
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
        .mi-perfil-field textarea {
          padding: 12px 16px;
          border: 1.5px solid #E2E8F0;
          border-radius: 10px;
          font-size: 0.9375rem;
          color: #111827;
          transition: all 0.15s ease;
          background: white;
        }

        .mi-perfil-field input:focus,
        .mi-perfil-field textarea:focus {
          outline: none;
          border-color: #0057FF;
          box-shadow: 0 0 0 4px rgba(0, 87, 255, 0.1);
        }

        .mi-perfil-field input.disabled {
          background: #F8FAFC;
          color: #94A3B8;
          cursor: not-allowed;
        }

        .mi-perfil-field textarea {
          resize: vertical;
          min-height: 120px;
          font-family: inherit;
        }

        .mi-perfil-hint {
          font-size: 0.75rem;
          color: #94A3B8;
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
