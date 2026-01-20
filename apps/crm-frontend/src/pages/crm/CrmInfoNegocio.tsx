/**
 * CrmInfoNegocio - Página completa de configuración de información del negocio
 *
 * Incluye:
 * - Identidad visual (logos, isotipo, favicon)
 * - Información general con traducciones
 * - Contacto (teléfonos, emails, WhatsApp)
 * - Ubicación
 * - Horarios
 * - Redes sociales
 * - Información legal
 * - Información del CEO/Director
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import {
  getInfoNegocio,
  patchInfoNegocio,
  type InfoNegocio
} from '../../services/api';
import SingleImageUploader from '../../components/SingleImageUploader';
import TranslatableInput, { type Traducciones } from '../../components/TranslatableInput';
import {
  Save, Loader2,
  Image, Building2, Phone, MapPin, Clock, Share2, FileText, User,
  Facebook, Instagram, Twitter, Linkedin, Youtube
} from 'lucide-react';

// Tabs disponibles
type TabId = 'identidad' | 'general' | 'contacto' | 'ubicacion' | 'horarios' | 'redes' | 'legal' | 'ceo';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: 'identidad', label: 'Identidad Visual', icon: <Image size={18} /> },
  { id: 'general', label: 'Información General', icon: <Building2 size={18} /> },
  { id: 'contacto', label: 'Contacto', icon: <Phone size={18} /> },
  { id: 'ubicacion', label: 'Ubicación', icon: <MapPin size={18} /> },
  { id: 'horarios', label: 'Horarios', icon: <Clock size={18} /> },
  { id: 'redes', label: 'Redes Sociales', icon: <Share2 size={18} /> },
  { id: 'legal', label: 'Información Legal', icon: <FileText size={18} /> },
  { id: 'ceo', label: 'CEO / Director', icon: <User size={18} /> },
];

// Extensión del tipo InfoNegocio para incluir traducciones
interface InfoNegocioExtendida extends InfoNegocio {
  traducciones?: {
    nombreComercial?: Traducciones;
    slogan?: Traducciones;
    descripcion?: Traducciones;
    horarios?: {
      notas?: Traducciones;
    };
  };
}

export default function CrmInfoNegocio() {
  const { tenantActual } = useAuth();
  const { getToken } = useClerkAuth();
  const { setPageHeader } = usePageHeader();
  const navigate = useNavigate();

  const [tabActiva, setTabActiva] = useState<TabId>('identidad');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Estado de la información del negocio
  const [infoNegocio, setInfoNegocio] = useState<InfoNegocioExtendida | null>(null);

  // Cargar datos
  useEffect(() => {
    const cargarDatos = async () => {
      if (!tenantActual?.id) return;

      setLoading(true);
      setError(null);

      try {
        const token = await getToken();
        const info = await getInfoNegocio(tenantActual.id, token);
        setInfoNegocio(info as InfoNegocioExtendida);
      } catch (err: any) {
        console.error('Error al cargar info del negocio:', err);
        // Establecer valores por defecto
        setInfoNegocio({
          logo: null,
          logoBlanco: null,
          isotipo: null,
          favicon: null,
          nombreComercial: null,
          slogan: null,
          descripcion: null,
          contacto: {
            telefono: null,
            telefonoSecundario: null,
            whatsapp: null,
            email: null,
            emailSecundario: null
          },
          ubicacion: {
            direccion: null,
            ciudad: null,
            provincia: null,
            pais: null,
            codigoPostal: null,
            coordenadas: null
          },
          horarios: {
            lunesViernes: null,
            sabado: null,
            domingo: null,
            notas: null
          },
          redesSociales: {
            facebook: null,
            instagram: null,
            twitter: null,
            linkedin: null,
            youtube: null,
            tiktok: null
          },
          legal: {
            nombreLegal: null,
            rncCedula: null,
            registroMercantil: null
          },
          ceo: {
            nombre: null,
            cargo: null,
            firma: null,
            foto: null
          },
          traducciones: {}
        });
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [tenantActual?.id, getToken]);

  // Función para actualizar campos
  const updateField = (path: string, value: any) => {
    if (!infoNegocio) return;

    setHasChanges(true);
    const pathParts = path.split('.');
    const newInfo = { ...infoNegocio };

    if (pathParts.length === 1) {
      (newInfo as any)[pathParts[0]] = value;
    } else if (pathParts.length === 2) {
      (newInfo as any)[pathParts[0]] = {
        ...(newInfo as any)[pathParts[0]],
        [pathParts[1]]: value
      };
    } else if (pathParts.length === 3) {
      (newInfo as any)[pathParts[0]] = {
        ...(newInfo as any)[pathParts[0]],
        [pathParts[1]]: {
          ...((newInfo as any)[pathParts[0]]?.[pathParts[1]] || {}),
          [pathParts[2]]: value
        }
      };
    }

    setInfoNegocio(newInfo);
  };

  // Guardar cambios
  const guardar = useCallback(async () => {
    if (!tenantActual?.id || !infoNegocio) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const token = await getToken();
      await patchInfoNegocio(tenantActual.id, infoNegocio, token);
      setSuccess(true);
      setHasChanges(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error al guardar:', err);
      setError(err.message || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  }, [tenantActual?.id, infoNegocio, getToken]);

  // Configurar header con acciones
  useEffect(() => {
    setPageHeader({
      title: 'Información del Negocio',
      subtitle: 'Configura los datos de tu inmobiliaria para el CRM y sitio web',
      backButton: {
        label: 'Volver',
        onClick: () => navigate(-1),
      },
      actions: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {success && (
            <span style={{ color: '#22c55e', fontSize: '0.875rem', fontWeight: 500 }}>
              ✓ Cambios guardados
            </span>
          )}
          {error && (
            <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>
              {error}
            </span>
          )}
          <button
            className="btn-header-save"
            onClick={guardar}
            disabled={saving || !hasChanges}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: saving || !hasChanges ? '#94a3b8' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: saving || !hasChanges ? 'not-allowed' : 'pointer',
              opacity: saving || !hasChanges ? 0.7 : 1,
            }}
          >
            {saving ? (
              <>
                <Loader2 className="spin" size={18} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Guardar cambios</span>
              </>
            )}
          </button>
        </div>
      ),
    });
  }, [setPageHeader, navigate, success, error, saving, hasChanges, guardar]);

  // Renderizar contenido de cada tab
  const renderTabContent = () => {
    if (!infoNegocio || !tenantActual) return null;

    switch (tabActiva) {
      case 'identidad':
        return (
          <div className="tab-content">
            <div className="section-intro">
              <h3>Identidad Visual</h3>
              <p>Logos e íconos que representan tu marca. Estos se usarán en el CRM, sitio web y materiales.</p>
            </div>

            <div className="upload-grid">
              <div className="upload-item">
                <SingleImageUploader
                  label="Logo Principal"
                  hint="Logo a color para fondos claros. Recomendado: PNG transparente"
                  value={infoNegocio.logo}
                  onChange={(url) => updateField('logo', url)}
                  tenantId={tenantActual.id}
                  folder="branding"
                  aspectRatio="auto"
                  maxWidth={300}
                  maxHeight={150}
                />
              </div>

              <div className="upload-item">
                <SingleImageUploader
                  label="Logo Blanco"
                  hint="Logo para fondos oscuros. Se usa en headers y footers"
                  value={infoNegocio.logoBlanco}
                  onChange={(url) => updateField('logoBlanco', url)}
                  tenantId={tenantActual.id}
                  folder="branding"
                  aspectRatio="auto"
                  maxWidth={300}
                  maxHeight={150}
                  darkPreview
                />
              </div>

              <div className="upload-item">
                <SingleImageUploader
                  label="Isotipo"
                  hint="Ícono cuadrado para espacios reducidos (sidebar, apps)"
                  value={infoNegocio.isotipo}
                  onChange={(url) => updateField('isotipo', url)}
                  tenantId={tenantActual.id}
                  folder="branding"
                  aspectRatio="1/1"
                  maxWidth={150}
                />
              </div>

              <div className="upload-item">
                <SingleImageUploader
                  label="Favicon"
                  hint="Ícono de 32x32 para la pestaña del navegador"
                  value={infoNegocio.favicon}
                  onChange={(url) => updateField('favicon', url)}
                  tenantId={tenantActual.id}
                  folder="branding"
                  aspectRatio="1/1"
                  maxWidth={100}
                />
              </div>
            </div>
          </div>
        );

      case 'general':
        return (
          <div className="tab-content">
            <div className="section-intro">
              <h3>Información General</h3>
              <p>Datos básicos de tu negocio. Los campos con el ícono de globo pueden traducirse a otros idiomas.</p>
            </div>

            <div className="form-stack">
              <TranslatableInput
                label="Nombre Comercial"
                value={infoNegocio.nombreComercial}
                traducciones={infoNegocio.traducciones?.nombreComercial}
                onChange={(v) => updateField('nombreComercial', v)}
                onTraduccionesChange={(t) => updateField('traducciones.nombreComercial', t)}
                placeholder="Nombre público de tu inmobiliaria"
                required
              />

              <TranslatableInput
                label="Slogan"
                value={infoNegocio.slogan}
                traducciones={infoNegocio.traducciones?.slogan}
                onChange={(v) => updateField('slogan', v)}
                onTraduccionesChange={(t) => updateField('traducciones.slogan', t)}
                placeholder="Tu propuesta de valor en una frase"
                hint="Ej: 'Hacemos realidad tu hogar ideal'"
              />

              <TranslatableInput
                label="Descripción"
                value={infoNegocio.descripcion}
                traducciones={infoNegocio.traducciones?.descripcion}
                onChange={(v) => updateField('descripcion', v)}
                onTraduccionesChange={(t) => updateField('traducciones.descripcion', t)}
                placeholder="Breve descripción de tu negocio"
                multiline
                rows={4}
                hint="Esta descripción aparece en la sección 'Sobre Nosotros' y en meta tags SEO"
              />
            </div>
          </div>
        );

      case 'contacto':
        return (
          <div className="tab-content">
            <div className="section-intro">
              <h3>Información de Contacto</h3>
              <p>Datos de contacto que se mostrarán en tu sitio web y materiales de marketing.</p>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Teléfono Principal</label>
                <input
                  type="tel"
                  value={infoNegocio.contacto?.telefono || ''}
                  onChange={(e) => updateField('contacto.telefono', e.target.value || null)}
                  placeholder="+1 809 555 1234"
                />
              </div>

              <div className="form-group">
                <label>Teléfono Secundario</label>
                <input
                  type="tel"
                  value={infoNegocio.contacto?.telefonoSecundario || ''}
                  onChange={(e) => updateField('contacto.telefonoSecundario', e.target.value || null)}
                  placeholder="+1 809 555 5678"
                />
              </div>

              <div className="form-group full-width">
                <label>WhatsApp</label>
                <input
                  type="tel"
                  value={infoNegocio.contacto?.whatsapp || ''}
                  onChange={(e) => updateField('contacto.whatsapp', e.target.value || null)}
                  placeholder="+18095551234"
                />
                <span className="form-hint">Número en formato internacional sin espacios (para botón de WhatsApp)</span>
              </div>

              <div className="form-group">
                <label>Email Principal</label>
                <input
                  type="email"
                  value={infoNegocio.contacto?.email || ''}
                  onChange={(e) => updateField('contacto.email', e.target.value || null)}
                  placeholder="info@tuinmobiliaria.com"
                />
              </div>

              <div className="form-group">
                <label>Email Secundario</label>
                <input
                  type="email"
                  value={infoNegocio.contacto?.emailSecundario || ''}
                  onChange={(e) => updateField('contacto.emailSecundario', e.target.value || null)}
                  placeholder="ventas@tuinmobiliaria.com"
                />
              </div>
            </div>
          </div>
        );

      case 'ubicacion':
        return (
          <div className="tab-content">
            <div className="section-intro">
              <h3>Ubicación</h3>
              <p>Dirección física de tu oficina. Se mostrará en el sitio web y en Google Maps.</p>
            </div>

            <div className="form-stack">
              <div className="form-group">
                <label>Dirección</label>
                <input
                  type="text"
                  value={infoNegocio.ubicacion?.direccion || ''}
                  onChange={(e) => updateField('ubicacion.direccion', e.target.value || null)}
                  placeholder="Calle Principal #123, Local 4"
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Ciudad</label>
                  <input
                    type="text"
                    value={infoNegocio.ubicacion?.ciudad || ''}
                    onChange={(e) => updateField('ubicacion.ciudad', e.target.value || null)}
                    placeholder="Santo Domingo"
                  />
                </div>

                <div className="form-group">
                  <label>Provincia / Estado</label>
                  <input
                    type="text"
                    value={infoNegocio.ubicacion?.provincia || ''}
                    onChange={(e) => updateField('ubicacion.provincia', e.target.value || null)}
                    placeholder="Distrito Nacional"
                  />
                </div>

                <div className="form-group">
                  <label>País</label>
                  <input
                    type="text"
                    value={infoNegocio.ubicacion?.pais || ''}
                    onChange={(e) => updateField('ubicacion.pais', e.target.value || null)}
                    placeholder="República Dominicana"
                  />
                </div>

                <div className="form-group">
                  <label>Código Postal</label>
                  <input
                    type="text"
                    value={infoNegocio.ubicacion?.codigoPostal || ''}
                    onChange={(e) => updateField('ubicacion.codigoPostal', e.target.value || null)}
                    placeholder="10101"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Coordenadas GPS</label>
                <input
                  type="text"
                  value={infoNegocio.ubicacion?.coordenadas || ''}
                  onChange={(e) => updateField('ubicacion.coordenadas', e.target.value || null)}
                  placeholder="18.4861, -69.9312"
                />
                <span className="form-hint">Latitud, Longitud - Se usa para mostrar el mapa en tu sitio web</span>
              </div>
            </div>
          </div>
        );

      case 'horarios':
        return (
          <div className="tab-content">
            <div className="section-intro">
              <h3>Horarios de Atención</h3>
              <p>Horarios en que tu equipo está disponible para atender clientes.</p>
            </div>

            <div className="form-stack">
              <div className="form-group">
                <label>Lunes a Viernes</label>
                <input
                  type="text"
                  value={infoNegocio.horarios?.lunesViernes || ''}
                  onChange={(e) => updateField('horarios.lunesViernes', e.target.value || null)}
                  placeholder="9:00 AM - 6:00 PM"
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Sábado</label>
                  <input
                    type="text"
                    value={infoNegocio.horarios?.sabado || ''}
                    onChange={(e) => updateField('horarios.sabado', e.target.value || null)}
                    placeholder="9:00 AM - 1:00 PM"
                  />
                </div>

                <div className="form-group">
                  <label>Domingo</label>
                  <input
                    type="text"
                    value={infoNegocio.horarios?.domingo || ''}
                    onChange={(e) => updateField('horarios.domingo', e.target.value || null)}
                    placeholder="Cerrado"
                  />
                </div>
              </div>

              <TranslatableInput
                label="Notas adicionales"
                value={infoNegocio.horarios?.notas || null}
                traducciones={infoNegocio.traducciones?.horarios?.notas}
                onChange={(v) => updateField('horarios.notas', v)}
                onTraduccionesChange={(t) => updateField('traducciones.horarios.notas', t)}
                placeholder="Atención fuera de horario previa cita"
                multiline
                rows={2}
              />
            </div>
          </div>
        );

      case 'redes':
        // Helpers para manejar URLs de redes sociales
        const socialPrefixes: Record<string, string> = {
          facebook: 'https://facebook.com/',
          instagram: 'https://instagram.com/',
          twitter: 'https://x.com/',
          linkedin: 'https://linkedin.com/company/',
          youtube: 'https://youtube.com/@',
          tiktok: 'https://tiktok.com/@',
        };

        const extractUsername = (url: string | null | undefined, prefix: string): string => {
          if (!url) return '';
          // Si la URL contiene el prefijo, extraer solo el username
          if (url.startsWith(prefix)) {
            return url.substring(prefix.length);
          }
          // Si es una URL completa con otro formato, intentar extraer
          if (url.includes('/')) {
            const parts = url.split('/').filter(Boolean);
            return parts[parts.length - 1] || '';
          }
          return url;
        };

        const buildFullUrl = (username: string, prefix: string): string | null => {
          if (!username) return null;
          // Si ya es una URL completa, devolverla tal cual
          if (username.startsWith('http')) return username;
          // Limpiar el @ si lo incluye el usuario
          const cleanUsername = username.replace(/^@/, '');
          return `${prefix}${cleanUsername}`;
        };

        return (
          <div className="tab-content">
            <div className="section-intro">
              <h3>Redes Sociales</h3>
              <p>Ingresa solo tu nombre de usuario o página. El enlace completo se generará automáticamente.</p>
            </div>

            <div className="social-grid">
              <div className="social-item">
                <div className="social-icon facebook">
                  <Facebook size={20} />
                </div>
                <div className="social-input">
                  <label>Facebook</label>
                  <div className="input-with-prefix">
                    <span className="url-prefix">facebook.com/</span>
                    <input
                      type="text"
                      value={extractUsername(infoNegocio.redesSociales?.facebook, socialPrefixes.facebook)}
                      onChange={(e) => updateField('redesSociales.facebook', buildFullUrl(e.target.value, socialPrefixes.facebook))}
                      placeholder="tuinmobiliaria"
                    />
                  </div>
                </div>
              </div>

              <div className="social-item">
                <div className="social-icon instagram">
                  <Instagram size={20} />
                </div>
                <div className="social-input">
                  <label>Instagram</label>
                  <div className="input-with-prefix">
                    <span className="url-prefix">instagram.com/</span>
                    <input
                      type="text"
                      value={extractUsername(infoNegocio.redesSociales?.instagram, socialPrefixes.instagram)}
                      onChange={(e) => updateField('redesSociales.instagram', buildFullUrl(e.target.value, socialPrefixes.instagram))}
                      placeholder="tuinmobiliaria"
                    />
                  </div>
                </div>
              </div>

              <div className="social-item">
                <div className="social-icon twitter">
                  <Twitter size={20} />
                </div>
                <div className="social-input">
                  <label>X (Twitter)</label>
                  <div className="input-with-prefix">
                    <span className="url-prefix">x.com/</span>
                    <input
                      type="text"
                      value={extractUsername(infoNegocio.redesSociales?.twitter, socialPrefixes.twitter)}
                      onChange={(e) => updateField('redesSociales.twitter', buildFullUrl(e.target.value, socialPrefixes.twitter))}
                      placeholder="tuinmobiliaria"
                    />
                  </div>
                </div>
              </div>

              <div className="social-item">
                <div className="social-icon linkedin">
                  <Linkedin size={20} />
                </div>
                <div className="social-input">
                  <label>LinkedIn</label>
                  <div className="input-with-prefix">
                    <span className="url-prefix">linkedin.com/company/</span>
                    <input
                      type="text"
                      value={extractUsername(infoNegocio.redesSociales?.linkedin, socialPrefixes.linkedin)}
                      onChange={(e) => updateField('redesSociales.linkedin', buildFullUrl(e.target.value, socialPrefixes.linkedin))}
                      placeholder="tuinmobiliaria"
                    />
                  </div>
                </div>
              </div>

              <div className="social-item">
                <div className="social-icon youtube">
                  <Youtube size={20} />
                </div>
                <div className="social-input">
                  <label>YouTube</label>
                  <div className="input-with-prefix">
                    <span className="url-prefix">youtube.com/@</span>
                    <input
                      type="text"
                      value={extractUsername(infoNegocio.redesSociales?.youtube, socialPrefixes.youtube)}
                      onChange={(e) => updateField('redesSociales.youtube', buildFullUrl(e.target.value, socialPrefixes.youtube))}
                      placeholder="tuinmobiliaria"
                    />
                  </div>
                </div>
              </div>

              <div className="social-item">
                <div className="social-icon tiktok">
                  <span className="tiktok-icon">T</span>
                </div>
                <div className="social-input">
                  <label>TikTok</label>
                  <div className="input-with-prefix">
                    <span className="url-prefix">tiktok.com/@</span>
                    <input
                      type="text"
                      value={extractUsername(infoNegocio.redesSociales?.tiktok, socialPrefixes.tiktok)}
                      onChange={(e) => updateField('redesSociales.tiktok', buildFullUrl(e.target.value, socialPrefixes.tiktok))}
                      placeholder="tuinmobiliaria"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'legal':
        return (
          <div className="tab-content">
            <div className="section-intro">
              <h3>Información Legal</h3>
              <p>Datos legales de tu empresa. Se usan en facturas, contratos y documentos oficiales.</p>
            </div>

            <div className="form-stack">
              <div className="form-group">
                <label>Nombre Legal / Razón Social</label>
                <input
                  type="text"
                  value={infoNegocio.legal?.nombreLegal || ''}
                  onChange={(e) => updateField('legal.nombreLegal', e.target.value || null)}
                  placeholder="Inmobiliaria XYZ, SRL"
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>RNC / Cédula / Tax ID</label>
                  <input
                    type="text"
                    value={infoNegocio.legal?.rncCedula || ''}
                    onChange={(e) => updateField('legal.rncCedula', e.target.value || null)}
                    placeholder="123-45678-9"
                  />
                </div>

                <div className="form-group">
                  <label>Registro Mercantil</label>
                  <input
                    type="text"
                    value={infoNegocio.legal?.registroMercantil || ''}
                    onChange={(e) => updateField('legal.registroMercantil', e.target.value || null)}
                    placeholder="RM-12345"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'ceo':
        return (
          <div className="tab-content">
            <div className="section-intro">
              <h3>CEO / Director</h3>
              <p>Información del líder de la empresa. Se usa en algunos emails, footers y secciones de "Nuestro Equipo".</p>
            </div>

            <div className="ceo-layout">
              <div className="ceo-photo">
                <SingleImageUploader
                  label="Foto"
                  hint="Foto profesional del CEO/Director"
                  value={infoNegocio.ceo?.foto || null}
                  onChange={(url) => updateField('ceo.foto', url)}
                  tenantId={tenantActual.id}
                  folder="team"
                  aspectRatio="1/1"
                  maxWidth={200}
                  circular
                />
              </div>

              <div className="ceo-info">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Nombre Completo</label>
                    <input
                      type="text"
                      value={infoNegocio.ceo?.nombre || ''}
                      onChange={(e) => updateField('ceo.nombre', e.target.value || null)}
                      placeholder="Juan Pérez"
                    />
                  </div>

                  <div className="form-group">
                    <label>Cargo</label>
                    <input
                      type="text"
                      value={infoNegocio.ceo?.cargo || ''}
                      onChange={(e) => updateField('ceo.cargo', e.target.value || null)}
                      placeholder="Director General"
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '16px' }}>
                  <SingleImageUploader
                    label="Firma Digital"
                    hint="Imagen de la firma para documentos y emails"
                    value={infoNegocio.ceo?.firma || null}
                    onChange={(url) => updateField('ceo.firma', url)}
                    tenantId={tenantActual.id}
                    folder="signatures"
                    aspectRatio="auto"
                    maxWidth={300}
                    maxHeight={100}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="loading-page">
        <Loader2 className="spin" size={40} />
        <p>Cargando información...</p>
      </div>
    );
  }

  return (
    <div className="info-negocio-page">
      {/* Layout principal con tabs y contenido */}
      <div className="main-layout">
        {/* Sidebar de tabs */}
        <div className="tabs-sidebar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${tabActiva === tab.id ? 'active' : ''}`}
              onClick={() => setTabActiva(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Contenido del tab activo */}
        <div className="content-area">
          {renderTabContent()}
        </div>
      </div>

      <style>{`
        .info-negocio-page {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .loading-page {
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

        /* Layout principal */
        .main-layout {
          display: flex;
          flex: 1;
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          min-height: 0;
        }

        /* Tabs sidebar */
        .tabs-sidebar {
          width: 220px;
          flex-shrink: 0;
          background: #f8fafc;
          border-right: 1px solid #e2e8f0;
          padding: 20px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .tab-button {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: none;
          border: none;
          border-radius: 8px;
          color: #64748b;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .tab-button:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .tab-button.active {
          background: #2563eb;
          color: white;
        }

        /* Content area */
        .content-area {
          flex: 1;
          padding: 32px 32px;
          overflow-y: auto;
          min-width: 0;
        }

        .tab-content {
          width: 100%;
        }

        .section-intro {
          margin-bottom: 32px;
        }

        .section-intro h3 {
          margin: 0 0 8px 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: #0f172a;
        }

        .section-intro p {
          margin: 0;
          color: #64748b;
          font-size: 0.95rem;
          line-height: 1.5;
        }

        /* Form elements */
        .form-stack {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group.full-width {
          grid-column: span 2;
        }

        .form-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .form-group input,
        .form-group textarea {
          padding: 12px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.9rem;
          transition: all 0.2s;
          font-family: inherit;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .form-group textarea {
          resize: vertical;
          min-height: 100px;
        }

        .form-hint {
          font-size: 0.8rem;
          color: #94a3b8;
        }

        /* Upload grid */
        .upload-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 28px;
        }

        .upload-item {
          background: #f8fafc;
          border-radius: 12px;
          padding: 24px;
        }

        /* Social grid */
        .social-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        @media (max-width: 900px) {
          .social-grid {
            grid-template-columns: 1fr;
          }
        }

        .social-item {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .social-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .social-icon svg {
          width: 18px;
          height: 18px;
        }

        .social-icon.facebook { background: #1877f2; }
        .social-icon.instagram { background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); }
        .social-icon.twitter { background: #000; }
        .social-icon.linkedin { background: #0077b5; }
        .social-icon.youtube { background: #ff0000; }
        .social-icon.tiktok { background: #000; }

        .tiktok-icon {
          font-weight: 700;
          font-size: 0.9rem;
        }

        .social-input {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .social-input label {
          font-size: 0.8rem;
          font-weight: 500;
          color: #64748b;
        }

        .social-input input {
          padding: 12px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .social-input input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        /* Input con prefijo de URL */
        .input-with-prefix {
          display: flex;
          align-items: center;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
          transition: all 0.2s;
          min-width: 0;
        }

        .input-with-prefix:focus-within {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .url-prefix {
          padding: 8px 0 8px 10px;
          background: #f8fafc;
          color: #94a3b8;
          font-size: 0.7rem;
          white-space: nowrap;
          user-select: none;
          flex-shrink: 0;
          max-width: 130px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .input-with-prefix input {
          flex: 1;
          padding: 8px 10px 8px 2px;
          border: none;
          font-size: 0.85rem;
          background: transparent;
          min-width: 0;
        }

        .input-with-prefix input:focus {
          outline: none;
        }

        /* CEO layout */
        .ceo-layout {
          display: flex;
          gap: 40px;
        }

        .ceo-photo {
          flex-shrink: 0;
        }

        .ceo-info {
          flex: 1;
        }

        /* Responsive */
        @media (max-width: 900px) {
          .main-layout {
            flex-direction: column;
          }

          .tabs-sidebar {
            width: 100%;
            flex-direction: row;
            flex-wrap: wrap;
            border-right: none;
            border-bottom: 1px solid #e2e8f0;
          }

          .tab-button {
            flex: 1;
            min-width: 120px;
            justify-content: center;
          }

          .tab-button span {
            display: none;
          }

          .content-area {
            padding: 24px;
          }
        }

        @media (max-width: 640px) {
          .form-group.full-width {
            grid-column: span 1;
          }

          .ceo-layout {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
