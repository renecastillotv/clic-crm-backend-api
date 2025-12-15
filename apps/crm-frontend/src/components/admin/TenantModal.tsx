/**
 * TenantModal - Modal para crear/editar tenants
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@clerk/clerk-react';
import { TenantAdmin, createTenant, updateTenant, CreateTenantData, UpdateTenantData, getAllPaises, Pais } from '../../services/api';

interface TenantModalProps {
  tenant: TenantAdmin | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function TenantModal({ tenant, onClose, onSaved }: TenantModalProps) {
  const { getToken } = useAuth();
  const [formData, setFormData] = useState({
    nombre: tenant?.nombre || '',
    slug: tenant?.slug || '',
    idiomaDefault: tenant?.idiomaDefault || 'es',
    codigoPais: tenant?.codigoPais || '',
    activo: tenant?.activo !== undefined ? tenant.activo : true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [paises, setPaises] = useState<Pais[]>([]);
  const [loadingPaises, setLoadingPaises] = useState(true);

  useEffect(() => {
    setMounted(true);
    // Prevenir scroll del body cuando el modal está abierto
    document.body.style.overflow = 'hidden';
    
    // Cargar países
    loadPaises();
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const loadPaises = async () => {
    try {
      setLoadingPaises(true);
      const token = await getToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      const paisesData = await getAllPaises(token);
      setPaises(paisesData);
    } catch (err: any) {
      console.error('Error al cargar países:', err);
      // No bloqueamos si falla, solo mostramos error
      setError('No se pudieron cargar los países. El campo quedará deshabilitado.');
    } finally {
      setLoadingPaises(false);
    }
  };

  // Auto-generar slug desde el nombre
  const handleNameChange = (nombre: string) => {
    const slug = nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    setFormData({ ...formData, nombre, slug });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }

      if (tenant) {
        // Actualizar tenant existente
        const updateData: UpdateTenantData = {
          nombre: formData.nombre,
          slug: formData.slug,
          idiomaDefault: formData.idiomaDefault,
          codigoPais: formData.codigoPais || undefined,
          activo: formData.activo,
        };
        await updateTenant(tenant.id, updateData, token);
      } else {
        // Crear nuevo tenant
        const createData: CreateTenantData = {
          nombre: formData.nombre,
          slug: formData.slug,
          idiomaDefault: formData.idiomaDefault,
          codigoPais: formData.codigoPais || undefined,
          activo: formData.activo,
          idiomasDisponibles: [formData.idiomaDefault, 'en'],
        };
        await createTenant(createData, token);
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Error al guardar tenant');
      console.error('Error al guardar tenant:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '2rem',
          width: '100%',
          maxWidth: '500px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a202c', marginBottom: '1.5rem' }}>
          {tenant ? 'Editar Tenant' : 'Crear Nuevo Tenant'}
        </h2>

        {error && (
          <div
            style={{
              marginBottom: '1rem',
              padding: '0.75rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#991b1b',
              fontSize: '0.875rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '0.25rem',
              }}
            >
              Nombre de la Inmobiliaria <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => handleNameChange(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem',
              }}
              required
              placeholder="Ej: CLIC Inmobiliaria"
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '0.25rem',
              }}
            >
              Slug (URL) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem',
              }}
              required
              pattern="[a-z0-9-]+"
              placeholder="ejemplo: clic-inmobiliaria"
            />
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
              URL: {formData.slug || 'mi-inmobiliaria'}.dominiosaas.com
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: '0.25rem',
                }}
              >
                Idioma por Defecto
              </label>
              <select
                value={formData.idiomaDefault}
                onChange={(e) => setFormData({ ...formData, idiomaDefault: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '1rem',
                }}
              >
                <option value="es">Español</option>
                <option value="en">English</option>
                <option value="fr">Français</option>
              </select>
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: '0.25rem',
                }}
              >
                País (opcional)
              </label>
              <select
                value={formData.codigoPais}
                onChange={(e) => setFormData({ ...formData, codigoPais: e.target.value })}
                disabled={loadingPaises}
                style={{
                  width: '100%',
                  padding: '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  backgroundColor: loadingPaises ? '#f3f4f6' : 'white',
                  cursor: loadingPaises ? 'not-allowed' : 'pointer',
                }}
              >
                <option value="">Seleccionar país...</option>
                {paises.map((pais) => (
                  <option key={pais.codigo} value={pais.codigo}>
                    {pais.nombre} ({pais.codigo})
                  </option>
                ))}
              </select>
              {loadingPaises && (
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Cargando países...
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <input
              type="checkbox"
              id="activo"
              checked={formData.activo}
              onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
              style={{ width: '1rem', height: '1rem' }}
            />
            <label htmlFor="activo" style={{ fontSize: '0.875rem', color: '#374151' }}>
              Tenant activo
            </label>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                flex: 1,
                padding: '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                color: '#374151',
                backgroundColor: 'white',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.5 : 1,
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !formData.nombre.trim() || !formData.slug.trim()}
              style={{
                flex: 1,
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                color: 'white',
                background: saving || !formData.nombre.trim() || !formData.slug.trim()
                  ? '#9ca3af'
                  : 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)',
                border: 'none',
                cursor: saving || !formData.nombre.trim() || !formData.slug.trim() ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.5 : 1,
                fontWeight: 600,
              }}
            >
              {saving ? 'Guardando...' : tenant ? 'Guardar Cambios' : 'Crear Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

