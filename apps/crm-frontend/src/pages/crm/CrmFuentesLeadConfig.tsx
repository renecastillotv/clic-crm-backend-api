/**
 * CrmFuentesLeadConfig - Configuración de Fuentes de Lead
 *
 * Permite personalizar las fuentes de obtención de leads:
 * - Ver fuentes predefinidas del sistema
 * - Agregar fuentes personalizadas
 * - Activar/desactivar fuentes
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import {
  Target,
  Plus,
  GripVertical,
  AlertCircle,
  Globe,
  Instagram,
  Youtube,
  Megaphone,
  Newspaper,
  Users,
  Phone,
  MapPin,
  HelpCircle,
  X,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Iconos sugeridos para cada fuente
const ICONOS_FUENTES: Record<string, any> = {
  'pagina_web': Globe,
  'portales_inmobiliarios': MapPin,
  'referido': Users,
  'conocido': Users,
  'periodico': Newspaper,
  'youtube': Youtube,
  'instagram': Instagram,
  'campana_publicitaria': Megaphone,
  'letrero': MapPin,
  'llamada_directa': Phone,
  'sin_via': HelpCircle,
};

// Fuentes predeterminadas del sistema
const FUENTES_DEFAULT = [
  'Página Web',
  'Portales Inmobiliarios',
  'Referido',
  'Conocido',
  'Periódico',
  'Youtube',
  'Instagram',
  'Campaña Publicitaria',
  'Letrero',
  'Sin Vía',
];

interface FuenteItem {
  nombre: string;
  activo: boolean;
}

export default function CrmFuentesLeadConfig() {
  const { tenantActual } = useAuth();
  const navigate = useNavigate();
  const { setPageHeader } = usePageHeader();

  const [fuentes, setFuentes] = useState<FuenteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extensionId, setExtensionId] = useState<string | null>(null);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  // Estado para el formulario de agregar
  const [isCreating, setIsCreating] = useState(false);
  const [nuevaFuente, setNuevaFuente] = useState('');

  // Configurar header
  useEffect(() => {
    setPageHeader({
      title: 'Fuentes de Lead',
      subtitle: 'Personaliza las fuentes de obtención de leads',
      backButton: {
        label: 'Volver',
        onClick: () => navigate(`/crm/${tenantActual?.slug}/configuracion/personalizar`),
      },
    });
  }, [setPageHeader, tenantActual?.slug, navigate]);

  // Cargar fuentes actuales desde la extensión Lead
  const fetchFuentes = useCallback(async () => {
    if (!tenantActual?.id) return;

    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/tenants/${tenantActual.id}/extensiones-contacto`
      );
      if (!response.ok) throw new Error('Error al cargar extensiones');

      const data = await response.json();
      const extensionLead = data.items?.find((ext: any) => ext.codigo === 'lead');

      if (extensionLead) {
        setExtensionId(extensionLead.id);
        const campoFuente = extensionLead.campos_schema?.find(
          (c: any) => c.campo === 'fuente_lead'
        );

        // Obtener opciones activas y inactivas
        const opcionesActivas: string[] = campoFuente?.opciones || FUENTES_DEFAULT;
        const opcionesInactivas: string[] = campoFuente?.opciones_inactivas || [];

        // Combinar en objetos con estado
        const fuentesActivas = opcionesActivas.map(nombre => ({ nombre, activo: true }));
        const fuentesInactivas = opcionesInactivas.map(nombre => ({ nombre, activo: false }));

        setFuentes([...fuentesActivas, ...fuentesInactivas]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantActual?.id]);

  useEffect(() => {
    fetchFuentes();
  }, [fetchFuentes]);

  // Filtrar según mostrarInactivos
  const fuentesFiltradas = useMemo(() => {
    if (mostrarInactivos) {
      return fuentes;
    }
    return fuentes.filter(f => f.activo);
  }, [fuentes, mostrarInactivos]);

  // Contar inactivos para mostrar en el botón
  const inactivosCount = useMemo(() => {
    return fuentes.filter(f => !f.activo).length;
  }, [fuentes]);

  // Separar fuentes predeterminadas y personalizadas
  const { fuentesPredeterminadas, fuentesPersonalizadas } = useMemo(() => {
    const predeterminadas = fuentesFiltradas.filter(f =>
      FUENTES_DEFAULT.some(d => d.toLowerCase() === f.nombre.toLowerCase())
    );
    const personalizadas = fuentesFiltradas.filter(f =>
      !FUENTES_DEFAULT.some(d => d.toLowerCase() === f.nombre.toLowerCase())
    );
    return { fuentesPredeterminadas: predeterminadas, fuentesPersonalizadas: personalizadas };
  }, [fuentesFiltradas]);

  // Iniciar modo creación
  const handleStartCreate = () => {
    setIsCreating(true);
    setNuevaFuente('');
    setError(null);
  };

  // Cancelar creación
  const handleCancelCreate = () => {
    setIsCreating(false);
    setNuevaFuente('');
    setError(null);
  };

  // Guardar nueva fuente
  const handleSaveNew = async () => {
    const nombreFuente = nuevaFuente.trim();
    if (!nombreFuente) {
      setError('El nombre es requerido');
      return;
    }
    if (fuentes.some(f => f.nombre.toLowerCase() === nombreFuente.toLowerCase())) {
      setError('Esta fuente ya existe');
      return;
    }

    // Agregar la nueva fuente
    const newFuentes = [...fuentes, { nombre: nombreFuente, activo: true }];
    setFuentes(newFuentes);

    // Guardar en el servidor
    await saveToServer(newFuentes);

    // Cerrar formulario
    setIsCreating(false);
    setNuevaFuente('');
    setError(null);
  };

  // Toggle activar/desactivar fuente
  const handleToggle = async (fuente: FuenteItem) => {
    const newFuentes = fuentes.map(f =>
      f.nombre === fuente.nombre ? { ...f, activo: !f.activo } : f
    );
    setFuentes(newFuentes);
    await saveToServer(newFuentes);
  };

  // Guardar cambios en el servidor
  const saveToServer = async (fuentesToSave: FuenteItem[]) => {
    if (!tenantActual?.id || !extensionId) return;

    try {
      setSaving(true);
      setError(null);

      // Separar activas e inactivas
      const opcionesActivas = fuentesToSave.filter(f => f.activo).map(f => f.nombre);
      const opcionesInactivas = fuentesToSave.filter(f => !f.activo).map(f => f.nombre);

      const response = await fetch(
        `${API_URL}/tenants/${tenantActual.id}/extensiones-contacto/${extensionId}/campo-opciones`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campo: 'fuente_lead',
            opciones: opcionesActivas,
            opciones_inactivas: opcionesInactivas,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al guardar');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getIconForFuente = (fuente: string) => {
    const key = fuente.toLowerCase().replace(/\s+/g, '_').replace(/[áéíóú]/g, (c) => {
      const map: Record<string, string> = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u' };
      return map[c] || c;
    });
    return ICONOS_FUENTES[key] || Target;
  };

  // Renderizar formulario de creación
  const renderCreateForm = () => (
    <div className="item-card item-editing">
      <div className="edit-form">
        <h3>Agregar nueva fuente</h3>

        {error && (
          <div className="form-error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="form-group">
          <label>Nombre *</label>
          <input
            type="text"
            value={nuevaFuente}
            onChange={(e) => setNuevaFuente(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveNew()}
            placeholder="Ej: Feria Inmobiliaria"
            autoFocus
          />
        </div>

        <div className="form-actions">
          <button className="btn-cancel" onClick={handleCancelCreate} disabled={saving}>
            Cancelar
          </button>
          <button className="btn-save" onClick={handleSaveNew} disabled={saving || !nuevaFuente.trim()}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );

  // Renderizar item de fuente
  const renderFuenteItem = (fuente: FuenteItem) => {
    const Icon = getIconForFuente(fuente.nombre);
    const isDefault = FUENTES_DEFAULT.some(
      f => f.toLowerCase() === fuente.nombre.toLowerCase()
    );

    return (
      <div key={fuente.nombre} className={`item-card ${!fuente.activo ? 'item-inactive' : ''}`}>
        <div className="item-drag">
          <GripVertical size={16} />
        </div>

        <div className="item-color" style={{ backgroundColor: '#f59e0b' }} />

        <div className="item-content">
          <div className="item-name">{fuente.nombre}</div>
        </div>

        <div className="item-meta">
          {isDefault ? (
            <span className="origin-badge origin-global">Global</span>
          ) : (
            <span className="origin-badge origin-tenant">Personalizado</span>
          )}
        </div>

        <div className="item-actions">
          <button
            className={`btn-toggle ${fuente.activo ? 'active' : ''}`}
            onClick={() => handleToggle(fuente)}
            title={fuente.activo ? 'Desactivar' : 'Activar'}
            disabled={saving}
          >
            {fuente.activo ? <Check size={16} /> : <X size={16} />}
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="loading">Cargando fuentes...</div>;
  }

  return (
    <div className="catalogo-editar">
      {/* Header con icono y botón agregar */}
      <div className="section-header">
        <div className="header-left">
          <div className="section-icon" style={{ backgroundColor: '#f59e0b15', color: '#f59e0b' }}>
            <Target size={24} />
          </div>
          <span className="items-total">
            {fuentesFiltradas.length} elementos
            {!mostrarInactivos && inactivosCount > 0 && (
              <span className="inactive-hint"> ({inactivosCount} ocultos)</span>
            )}
          </span>
        </div>
        <div className="header-actions">
          {inactivosCount > 0 && (
            <button
              className={`btn-toggle-inactive ${mostrarInactivos ? 'active' : ''}`}
              onClick={() => setMostrarInactivos(!mostrarInactivos)}
              title={mostrarInactivos ? 'Ocultar inactivos' : 'Mostrar inactivos'}
            >
              {mostrarInactivos ? <EyeOff size={16} /> : <Eye size={16} />}
              {mostrarInactivos ? 'Ocultar inactivos' : `Ver inactivos (${inactivosCount})`}
            </button>
          )}
          <button className="catalogo-btn-add" onClick={handleStartCreate} disabled={isCreating}>
            <Plus size={18} />
            Agregar
          </button>
        </div>
      </div>

      {error && !isCreating && (
        <div className="form-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Formulario de creación */}
      {isCreating && renderCreateForm()}

      {/* Items personalizados */}
      {fuentesPersonalizadas.length > 0 && (
        <div className="items-section">
          <h4 className="section-title">Personalizados</h4>
          <div className="items-list">
            {fuentesPersonalizadas.map(fuente => renderFuenteItem(fuente))}
          </div>
        </div>
      )}

      {/* Items predeterminados */}
      {fuentesPredeterminadas.length > 0 && (
        <div className="items-section">
          <h4 className="section-title">Predefinidos del sistema</h4>
          <div className="items-list">
            {fuentesPredeterminadas.map(fuente => renderFuenteItem(fuente))}
          </div>
        </div>
      )}

      {fuentesFiltradas.length === 0 && !isCreating && (
        <div className="empty-state">
          <Target size={48} strokeWidth={1} />
          <p>No hay fuentes configuradas</p>
          <button className="btn-add-empty" onClick={handleStartCreate}>
            <Plus size={18} />
            Agregar la primera
          </button>
        </div>
      )}

      <style>{`
        .catalogo-editar {
          padding: 0;
        }

        .loading {
          padding: 60px;
          text-align: center;
          color: #64748b;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e2e8f0;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .section-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .items-total {
          font-size: 0.875rem;
          color: #64748b;
        }

        .inactive-hint {
          color: #94a3b8;
          font-size: 0.8125rem;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .btn-toggle-inactive {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: #f1f5f9;
          color: #64748b;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.8125rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-toggle-inactive:hover {
          background: #e2e8f0;
          color: #475569;
        }

        .btn-toggle-inactive.active {
          background: #fef3c7;
          color: #d97706;
          border-color: #fcd34d;
        }

        .btn-toggle-inactive.active:hover {
          background: #fde68a;
        }

        .catalogo-btn-add {
          display: inline-flex !important;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 20px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          flex: none !important;
          width: auto !important;
          min-width: auto !important;
          max-width: fit-content !important;
        }

        .catalogo-btn-add:hover:not(:disabled) {
          background: #2563eb;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .catalogo-btn-add:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .form-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: #fef2f2;
          color: #dc2626;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 0.875rem;
        }

        .items-section {
          margin-bottom: 32px;
        }

        .section-title {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
          margin: 0 0 12px 0;
        }

        .items-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .item-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          transition: all 0.2s;
        }

        .item-card:hover {
          border-color: #cbd5e1;
        }

        .item-card.item-inactive {
          opacity: 0.5;
          background: #f8fafc;
        }

        .item-card.item-editing {
          padding: 20px;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .item-drag {
          color: #cbd5e1;
          cursor: grab;
        }

        .item-color {
          width: 4px;
          height: 32px;
          border-radius: 2px;
        }

        .item-content {
          flex: 1;
          min-width: 0;
        }

        .item-name {
          font-weight: 500;
          color: #0f172a;
        }

        .item-meta {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .origin-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .origin-global {
          background: #f1f5f9;
          color: #64748b;
        }

        .origin-tenant {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .item-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .item-actions button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-toggle {
          background: #fee2e2;
          color: #dc2626;
        }

        .btn-toggle.active {
          background: #dcfce7;
          color: #16a34a;
        }

        .btn-toggle:hover:not(:disabled) {
          opacity: 0.8;
        }

        .btn-toggle:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        /* Form styles */
        .edit-form {
          width: 100%;
        }

        .edit-form h3 {
          margin: 0 0 16px 0;
          font-size: 1rem;
          font-weight: 600;
          color: #0f172a;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 20px;
        }

        .form-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .form-group input {
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
        }

        .btn-cancel {
          padding: 10px 20px;
          background: #f1f5f9;
          color: #475569;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-cancel:hover {
          background: #e2e8f0;
        }

        .btn-save {
          padding: 10px 20px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-save:hover:not(:disabled) {
          background: #2563eb;
        }

        .btn-save:disabled,
        .btn-cancel:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Empty state */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #94a3b8;
          text-align: center;
        }

        .empty-state p {
          margin: 16px 0;
          font-size: 1rem;
        }

        .btn-add-empty {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-add-empty:hover {
          background: #2563eb;
        }

        @media (max-width: 640px) {
          .section-header {
            flex-wrap: wrap;
          }

          .item-card {
            flex-wrap: wrap;
          }

          .item-meta {
            order: 5;
            width: 100%;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid #e2e8f0;
          }
        }
      `}</style>
    </div>
  );
}
