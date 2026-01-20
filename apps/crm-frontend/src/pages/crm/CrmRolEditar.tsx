/**
 * CrmRolEditar - Crear/Editar rol del tenant
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import {
  getRolTenant,
  createRolTenant,
  updateRolTenant,
  RolTenant,
} from '../../services/api';

// Iconos SVG como funciones que retornan JSX
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
  shield: (props?: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
};

export default function CrmRolEditar() {
  const { tenantSlug, rolId } = useParams<{ tenantSlug: string; rolId: string }>();
  const { tenantActual, isTenantAdmin } = useAuth();
  const { setPageHeader } = usePageHeader();
  const navigate = useNavigate();

  const isEditing = rolId && rolId !== 'nuevo';
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rol, setRol] = useState<RolTenant | null>(null);

  // Formulario
  const [form, setForm] = useState({
    nombre: '',
    codigo: '',
    descripcion: '',
    color: '#667eea',
  });

  // Configurar header
  useEffect(() => {
    const nombreInmobiliaria = tenantActual?.nombre || 'la inmobiliaria';
    setPageHeader({
      title: isEditing ? 'Editar Rol' : 'Nuevo Rol',
      subtitle: isEditing 
        ? `Modifica el rol de ${nombreInmobiliaria}` 
        : `Crea un nuevo rol para ${nombreInmobiliaria}`,
      backButton: {
        label: 'Volver a Usuarios',
        onClick: () => navigate(`/crm/${tenantSlug}/usuarios`),
      },
    });
  }, [setPageHeader, isEditing, tenantSlug, navigate, tenantActual?.nombre]);

  // Generar código automáticamente desde el nombre
  useEffect(() => {
    if (!isEditing && form.nombre && !form.codigo) {
      const codigo = form.nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      setForm(prev => ({ ...prev, codigo }));
    }
  }, [form.nombre, isEditing]);

  // Cargar datos
  useEffect(() => {
    async function cargarDatos() {
      if (!tenantActual?.id) return;

      try {
        setLoading(true);
        setError(null);

        if (isEditing && rolId) {
          const rolData = await getRolTenant(tenantActual.id, rolId);
          setRol(rolData);
          setForm({
            nombre: rolData.nombre || '',
            codigo: rolData.codigo || '',
            descripcion: rolData.descripcion || '',
            color: rolData.color || '#667eea',
          });
        }
      } catch (err: any) {
        console.error('Error cargando datos:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    cargarDatos();
  }, [tenantActual?.id, isEditing, rolId]);

  // Guardar
  const handleSave = async () => {
    if (!tenantActual?.id || !form.nombre.trim() || !form.codigo.trim()) {
      setError('Nombre y código son requeridos');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (isEditing && rolId) {
        await updateRolTenant(tenantActual.id, rolId, {
          nombre: form.nombre,
          descripcion: form.descripcion || undefined,
          color: form.color || undefined,
        });
      } else {
        await createRolTenant(tenantActual.id, {
          nombre: form.nombre,
          codigo: form.codigo,
          descripcion: form.descripcion || undefined,
          color: form.color || undefined,
        });
      }

      navigate(`/crm/${tenantSlug}/usuarios`);
    } catch (err: any) {
      console.error('Error al guardar rol:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isTenantAdmin) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-icon">
            <Icons.shield />
          </div>
          <h3>Acceso restringido</h3>
          <p>No tienes permisos para gestionar roles de {tenantActual?.nombre || 'esta inmobiliaria'}.</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-container">
          <Icons.loader className="spinner" />
          <p>Cargando...</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="form-container">
        {/* Error banner */}
        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          {/* Información del rol */}
          <div className="form-section">
            <h3 className="form-section-title">
              <Icons.shield />
              Información del Rol
            </h3>

            <div className="form-row">
              <div className="form-group">
                <label>Nombre del Rol *</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Ej: Asesor Inmobiliario"
                  required
                />
                <p className="form-hint">Nombre visible del rol que verán los usuarios</p>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Código del Rol *</label>
                <input
                  type="text"
                  value={form.codigo}
                  onChange={(e) => setForm(prev => ({ ...prev, codigo: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
                  placeholder="ej: asesor_inmobiliario"
                  required
                  disabled={isEditing}
                />
                {isEditing && (
                  <p className="form-hint">El código no se puede modificar una vez creado el rol</p>
                )}
                {!isEditing && (
                  <p className="form-hint">Código único interno (se genera automáticamente desde el nombre)</p>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Describe qué permisos y responsabilidades tiene este rol..."
                  rows={4}
                />
                <p className="form-hint">Explica qué puede hacer un usuario con este rol</p>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Color del Rol</label>
                <div className="color-picker-group">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm(prev => ({ ...prev, color: e.target.value }))}
                    className="color-input"
                  />
                  <input
                    type="text"
                    value={form.color}
                    onChange={(e) => setForm(prev => ({ ...prev, color: e.target.value }))}
                    placeholder="#667eea"
                    className="color-text-input"
                  />
                </div>
                <p className="form-hint">Color que se mostrará en los badges del rol (opcional)</p>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={() => navigate(`/crm/${tenantSlug}/usuarios`)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving || !form.nombre.trim() || !form.codigo.trim()}
            >
              {saving ? (
                <>
                  <Icons.loader className="spinner" />
                  Guardando...
                </>
              ) : (
                <>
                  <Icons.save />
                  {isEditing ? 'Guardar Cambios' : 'Crear Rol'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .page {
    width: 100%;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px;
    color: #64748b;
    gap: 16px;
  }

  .spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 24px;
    background: white;
    border: 2px dashed #e2e8f0;
    border-radius: 16px;
    text-align: center;
  }

  .empty-icon {
    width: 100px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
    border-radius: 50%;
    color: #94a3b8;
    margin-bottom: 24px;
  }

  .empty-state h3 {
    margin: 0 0 8px 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #0f172a;
  }

  .empty-state p {
    margin: 0;
    color: #64748b;
    font-size: 0.95rem;
    max-width: 360px;
  }

  .form-container {
    max-width: 100%;
    width: 100%;
    background: white;
    border-radius: 16px;
    padding: 32px;
    border: 1px solid #e2e8f0;
  }

  .error-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fef2f2;
    border: 1px solid #fecaca;
    padding: 12px 16px;
    border-radius: 10px;
    margin-bottom: 24px;
    color: #dc2626;
  }

  .error-banner button {
    background: none;
    border: none;
    color: #dc2626;
    cursor: pointer;
    padding: 4px;
  }

  .form-section {
    margin-bottom: 32px;
  }

  .form-section-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 20px 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #0f172a;
    padding-bottom: 12px;
    border-bottom: 2px solid #f1f5f9;
  }

  .form-row {
    margin-bottom: 16px;
  }

  .form-group {
    margin-bottom: 16px;
  }

  .form-group label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 8px;
  }

  .form-group input[type="text"],
  .form-group textarea {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: 0.9rem;
    transition: all 0.2s;
    font-family: inherit;
  }

  .form-group textarea {
    resize: vertical;
    min-height: 100px;
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .form-group input:disabled {
    background: #f8fafc;
    color: #94a3b8;
    cursor: not-allowed;
  }

  .form-hint {
    margin: 8px 0 0 0;
    font-size: 0.8rem;
    color: #94a3b8;
  }

  .color-picker-group {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .color-input {
    width: 60px;
    height: 40px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    cursor: pointer;
    padding: 2px;
  }

  .color-text-input {
    flex: 1;
    max-width: 150px;
  }

  .form-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    padding-top: 24px;
    border-top: 1px solid #f1f5f9;
    margin-top: 32px;
  }

  .btn-cancel {
    padding: 12px 24px;
    background: #f1f5f9;
    border: none;
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 500;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-cancel:hover {
    background: #e2e8f0;
  }

  .btn-primary {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary:hover:not(:disabled) {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: 768px) {
    .form-container {
      padding: 20px;
    }

    .form-actions {
      flex-direction: column-reverse;
    }

    .btn-cancel,
    .btn-primary {
      width: 100%;
      justify-content: center;
    }
  }
`;
















