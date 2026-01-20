/**
 * CrmCatalogoEditar - Página para editar un tipo de catálogo específico
 *
 * Muestra la lista de items del catálogo seleccionado con opciones para:
 * - Agregar nuevos items
 * - Editar items existentes
 * - Activar/desactivar items
 * - Eliminar items (solo los del tenant)
 *
 * NOTA: tipo_propiedad y tipo_operacion usan tablas separadas
 * (categorias_propiedades y operaciones) con endpoints diferentes
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCatalogos, type TipoCatalogo, type ItemCatalogo } from '../../contexts/CatalogosContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import {
  Home,
  Key,
  User,
  Phone,
  Tag,
  FileText,
  Briefcase,
  Users,
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  Check,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  CircleDollarSign,
  type LucideIcon
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { IconPickerModal } from '../../components/IconPickerModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Tipos que usan tablas separadas (no la tabla catalogos)
const TIPOS_TABLA_SEPARADA = ['tipo_propiedad', 'tipo_operacion', 'estado_venta'] as const;
type TipoTablaSeparada = typeof TIPOS_TABLA_SEPARADA[number];

// Tipo extendido que incluye tanto catalogos como tablas separadas
type TipoCatalogoExtendido = TipoCatalogo | TipoTablaSeparada;

interface CatalogoMeta {
  titulo: string;
  descripcion: string;
  icono: LucideIcon;
  color: string;
  tablaSeparada?: boolean;
  soportaMultiidioma?: boolean;
  campos: {
    nombre: string;
    nombrePlural?: boolean;
    descripcion?: boolean;
    icono?: boolean;
    color?: boolean;
    config?: { campo: string; label: string; tipo: 'number' | 'text' }[];
  };
}

// Idiomas soportados para traducciones
const IDIOMAS_DISPONIBLES = [
  { codigo: 'en', nombre: 'Inglés' },
  { codigo: 'fr', nombre: 'Francés' },
  { codigo: 'pt', nombre: 'Portugués' },
];

interface Traduccion {
  nombre?: string;
  descripcion?: string;
}

// Item genérico para ambos tipos de tablas
interface ItemGenerico {
  id: string;
  codigo: string;
  nombre: string;
  nombre_plural?: string | null;
  descripcion?: string | null;
  icono?: string | null;
  color?: string | null;
  activo: boolean;
  orden?: number;
  origen: 'global' | 'tenant';
  config?: Record<string, any> | null;
  tenant_id?: string | null;
  traducciones?: Record<string, Traduccion> | null;
  slug_traducciones?: Record<string, string> | null;
}

const CATALOGOS_META: Record<TipoCatalogoExtendido, CatalogoMeta> = {
  tipo_propiedad: {
    titulo: 'Tipos de Propiedad',
    descripcion: 'Casa, apartamento, local, terreno, etc.',
    icono: Home,
    color: '#3b82f6',
    tablaSeparada: true,
    soportaMultiidioma: true,
    campos: { nombre: 'Nombre', nombrePlural: true, descripcion: true, icono: true, color: true }
  },
  tipo_operacion: {
    titulo: 'Tipos de Operación',
    descripcion: 'Venta, alquiler, traspaso, etc.',
    icono: Key,
    color: '#10b981',
    tablaSeparada: true,
    soportaMultiidioma: true,
    campos: { nombre: 'Nombre', nombrePlural: true, descripcion: true, icono: true, color: true }
  },
  tipo_contacto: {
    titulo: 'Tipos de Contacto',
    descripcion: 'Cliente, propietario, desarrollador, etc.',
    icono: User,
    color: '#8b5cf6',
    campos: { nombre: 'Nombre', nombrePlural: true, descripcion: true, icono: true, color: true }
  },
  tipo_actividad: {
    titulo: 'Tipos de Actividad',
    descripcion: 'Llamada, reunión, visita, email, etc.',
    icono: Phone,
    color: '#f59e0b',
    campos: { nombre: 'Nombre', nombrePlural: true, descripcion: true, icono: true, color: true }
  },
  etiqueta_propiedad: {
    titulo: 'Etiquetas de Propiedad',
    descripcion: 'Exclusiva, destacada, rebajada, nueva, etc.',
    icono: Tag,
    color: '#ec4899',
    soportaMultiidioma: true,
    campos: { nombre: 'Nombre', descripcion: true, icono: true, color: true }
  },
  tipo_documento: {
    titulo: 'Tipos de Documento',
    descripcion: 'Cédula, pasaporte, RNC, licencia, etc.',
    icono: FileText,
    color: '#64748b',
    campos: { nombre: 'Nombre', descripcion: true }
  },
  especialidad_asesor: {
    titulo: 'Especialidades de Asesor',
    descripcion: 'Residencial, comercial, industrial, lujo, etc.',
    icono: Briefcase,
    color: '#0891b2',
    soportaMultiidioma: true,
    campos: { nombre: 'Nombre', nombrePlural: true, descripcion: true, icono: true, color: true }
  },
  tipo_asesor: {
    titulo: 'Tipos de Asesor',
    descripcion: 'Niveles con % de comisión: senior, junior, etc.',
    icono: Users,
    color: '#7c3aed',
    campos: {
      nombre: 'Nombre',
      descripcion: true,
      color: true,
      config: [{ campo: 'porcentaje_comision', label: '% Comisión', tipo: 'number' }]
    }
  },
  estado_venta: {
    titulo: 'Estados de Venta',
    descripcion: 'En proceso, completada, cancelada, etc.',
    icono: CircleDollarSign,
    color: '#059669',
    tablaSeparada: true,
    campos: { nombre: 'Nombre', descripcion: true }
  },
};

interface FormData {
  codigo: string;
  nombre: string;
  nombre_plural: string;
  descripcion: string;
  icono: string;
  color: string;
  config: Record<string, any>;
  traducciones: Record<string, Traduccion>;
  slug_traducciones: Record<string, string>;
}

const INITIAL_FORM: FormData = {
  codigo: '',
  nombre: '',
  nombre_plural: '',
  descripcion: '',
  icono: '',
  color: '#3b82f6',
  config: {},
  traducciones: {},
  slug_traducciones: {},
};

export default function CrmCatalogoEditar() {
  const { tipo: tipoCatalogo } = useParams<{ tipo: string }>();
  const { tenantActual } = useAuth();
  const navigate = useNavigate();
  const { setPageHeader } = usePageHeader();
  const { catalogos, createItem, updateItem, deleteItem, toggleItem, isLoading: isLoadingCatalogos } = useCatalogos();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  // Estado para items de tablas separadas
  const [itemsSeparados, setItemsSeparados] = useState<ItemGenerico[]>([]);
  const [loadingSeparados, setLoadingSeparados] = useState(false);

  // Estado para el modal de selección de iconos
  const [showIconPicker, setShowIconPicker] = useState(false);

  const meta = tipoCatalogo ? CATALOGOS_META[tipoCatalogo as TipoCatalogoExtendido] : null;
  const esTablaSepar = meta?.tablaSeparada === true;

  // Función para cargar items de tablas separadas
  const fetchItemsSeparados = useCallback(async () => {
    if (!tenantActual?.id || !tipoCatalogo || !esTablaSepar) return;

    try {
      setLoadingSeparados(true);
      const response = await fetch(
        `${API_URL}/tenants/${tenantActual.id}/catalogos-separados/${tipoCatalogo}?activo=false`
      );
      if (response.ok) {
        const data = await response.json();
        setItemsSeparados(data.items || []);
      }
    } catch (err) {
      console.error('Error fetching items separados:', err);
    } finally {
      setLoadingSeparados(false);
    }
  }, [tenantActual?.id, tipoCatalogo, esTablaSepar]);

  // Cargar items de tablas separadas
  useEffect(() => {
    if (esTablaSepar) {
      fetchItemsSeparados();
    }
  }, [esTablaSepar, fetchItemsSeparados]);

  // Obtener todos los items según el tipo de tabla
  const allItems: ItemGenerico[] = useMemo(() => {
    if (esTablaSepar) {
      return itemsSeparados;
    }
    return (catalogos[tipoCatalogo as TipoCatalogo] || []) as ItemGenerico[];
  }, [esTablaSepar, itemsSeparados, catalogos, tipoCatalogo]);

  // Filtrar según mostrarInactivos
  const items: ItemGenerico[] = useMemo(() => {
    if (mostrarInactivos) {
      return allItems;
    }
    return allItems.filter(i => i.activo);
  }, [allItems, mostrarInactivos]);

  // Contar inactivos para mostrar en el botón
  const inactivosCount = useMemo(() => {
    return allItems.filter(i => !i.activo).length;
  }, [allItems]);

  const isLoading = esTablaSepar ? loadingSeparados : isLoadingCatalogos;

  // Separar items globales y del tenant
  const { itemsGlobales, itemsTenant } = useMemo(() => {
    const globales = items.filter(i => i.origen === 'global');
    const tenant = items.filter(i => i.origen === 'tenant');
    return { itemsGlobales: globales, itemsTenant: tenant };
  }, [items]);

  // Configurar header
  useEffect(() => {
    if (meta) {
      setPageHeader({
        title: meta.titulo,
        subtitle: meta.descripcion,
        backButton: {
          label: 'Volver',
          onClick: () => navigate(`/crm/${tenantActual?.slug}/configuracion/personalizar`),
        },
      });
    }
  }, [setPageHeader, meta, tenantActual?.slug, navigate]);

  // Validar tipo de catálogo
  useEffect(() => {
    if (tipoCatalogo && !CATALOGOS_META[tipoCatalogo as TipoCatalogoExtendido]) {
      navigate(`/crm/${tenantActual?.slug}/configuracion/personalizar`);
    }
  }, [tipoCatalogo, navigate, tenantActual?.slug]);

  if (!tipoCatalogo || !meta) {
    return <div className="loading">Cargando...</div>;
  }

  const Icon = meta.icono;

  const handleStartCreate = () => {
    setEditingId(null);
    setIsCreating(true);
    setFormData(INITIAL_FORM);
    setError(null);
  };

  const handleStartEdit = (item: ItemGenerico) => {
    setIsCreating(false);
    setEditingId(item.id);
    setFormData({
      codigo: item.codigo,
      nombre: item.nombre,
      nombre_plural: item.nombre_plural || '',
      descripcion: item.descripcion || '',
      icono: item.icono || '',
      color: item.color || '#3b82f6',
      config: item.config || {},
      traducciones: item.traducciones || {},
      slug_traducciones: item.slug_traducciones || {},
    });
    setError(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData(INITIAL_FORM);
    setError(null);
  };

  const handleSave = async () => {
    if (!formData.nombre.trim()) {
      setError('El nombre es requerido');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const codigo = formData.codigo.trim() || formData.nombre.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

      // Preparar traducciones (limpiar vacías)
      const traduccionesLimpias: Record<string, Traduccion> = {};
      const slugTraduccionesLimpios: Record<string, string> = {};

      if (meta?.soportaMultiidioma) {
        for (const [idioma, trad] of Object.entries(formData.traducciones)) {
          if (trad.nombre?.trim() || trad.descripcion?.trim()) {
            traduccionesLimpias[idioma] = {
              nombre: trad.nombre?.trim() || undefined,
              descripcion: trad.descripcion?.trim() || undefined,
            };
          }
        }
        for (const [idioma, slug] of Object.entries(formData.slug_traducciones)) {
          if (slug?.trim()) {
            slugTraduccionesLimpios[idioma] = slug.trim();
          }
        }
      }

      if (esTablaSepar) {
        // Usar endpoints de tablas separadas
        const body: Record<string, any> = {
          codigo,
          nombre: formData.nombre.trim(),
          descripcion: formData.descripcion.trim() || null,
          icono: formData.icono.trim() || null,
          color: formData.color || null,
        };

        // Agregar traducciones si hay
        if (Object.keys(traduccionesLimpias).length > 0) {
          body.traducciones = traduccionesLimpias;
        }
        if (Object.keys(slugTraduccionesLimpios).length > 0) {
          body.slug_traducciones = slugTraduccionesLimpios;
        }

        let response;
        if (isCreating) {
          response = await fetch(
            `${API_URL}/tenants/${tenantActual?.id}/catalogos-separados/${tipoCatalogo}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            }
          );
        } else if (editingId) {
          response = await fetch(
            `${API_URL}/tenants/${tenantActual?.id}/catalogos-separados/${tipoCatalogo}/${editingId}`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            }
          );
        }

        if (response && !response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Error al guardar');
        }

        await fetchItemsSeparados();
      } else {
        // Usar contexto de catalogos
        const data: Partial<ItemCatalogo> = {
          tipo: tipoCatalogo as TipoCatalogo,
          nombre: formData.nombre.trim(),
          nombre_plural: formData.nombre_plural.trim() || null,
          descripcion: formData.descripcion.trim() || null,
          icono: formData.icono.trim() || null,
          color: formData.color || null,
          config: Object.keys(formData.config).length > 0 ? formData.config : null,
        };

        // Agregar traducciones si hay y el catálogo soporta multiidioma
        if (meta?.soportaMultiidioma && Object.keys(traduccionesLimpias).length > 0) {
          (data as any).traducciones = traduccionesLimpias;
        }

        if (isCreating) {
          data.codigo = codigo;
          await createItem(data);
        } else if (editingId) {
          await updateItem(editingId, data);
        }
      }

      handleCancel();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item: ItemGenerico) => {
    try {
      if (esTablaSepar) {
        const response = await fetch(
          `${API_URL}/tenants/${tenantActual?.id}/catalogos-separados/${tipoCatalogo}/${item.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activo: !item.activo }),
          }
        );
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Error al cambiar estado');
        }
        await fetchItemsSeparados();
      } else {
        await toggleItem(tipoCatalogo as TipoCatalogo, item.codigo, !item.activo);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cambiar estado');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      if (esTablaSepar) {
        const response = await fetch(
          `${API_URL}/tenants/${tenantActual?.id}/catalogos-separados/${tipoCatalogo}/${id}`,
          { method: 'DELETE' }
        );
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Error al eliminar');
        }
        await fetchItemsSeparados();
      } else {
        await deleteItem(id);
      }
      setDeleteConfirm(null);
    } catch (err: any) {
      setError(err.message || 'Error al eliminar');
    }
  };

  const renderForm = () => (
    <div className="edit-form">
      <h3>{isCreating ? 'Agregar nuevo' : 'Editar'}</h3>

      {error && (
        <div className="form-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="form-grid">
        <div className="form-group">
          <label>Nombre *</label>
          <input
            type="text"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            placeholder="Ej: Casa"
            autoFocus
          />
        </div>

        {meta.campos.nombrePlural && (
          <div className="form-group">
            <label>Nombre Plural</label>
            <input
              type="text"
              value={formData.nombre_plural}
              onChange={(e) => setFormData({ ...formData, nombre_plural: e.target.value })}
              placeholder="Ej: Casas"
            />
          </div>
        )}

        {meta.campos.descripcion && (
          <div className="form-group form-group-full">
            <label>Descripción</label>
            <input
              type="text"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Descripción opcional"
            />
          </div>
        )}

        {meta.campos.icono && (
          <div className="form-group">
            <label>Icono</label>
            <button
              type="button"
              className="icon-picker-trigger"
              onClick={() => setShowIconPicker(true)}
            >
              {formData.icono ? (
                <>
                  <span className="icon-preview">
                    {(() => {
                      const IconComp = (LucideIcons as Record<string, LucideIcon>)[formData.icono];
                      return IconComp ? <IconComp size={20} /> : null;
                    })()}
                  </span>
                  <span className="icon-name">{formData.icono}</span>
                </>
              ) : (
                <span className="icon-placeholder">Seleccionar icono...</span>
              )}
              <span className="icon-chevron">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </span>
            </button>
          </div>
        )}

        <IconPickerModal
          isOpen={showIconPicker}
          onClose={() => setShowIconPicker(false)}
          onSelect={(iconName) => setFormData({ ...formData, icono: iconName })}
          currentIcon={formData.icono}
          title="Seleccionar Icono"
        />

        {meta.campos.color && (
          <div className="form-group">
            <label>Color</label>
            <div className="color-input">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
              <input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="#3b82f6"
              />
            </div>
          </div>
        )}

        {meta.campos.config?.map(cfg => (
          <div key={cfg.campo} className="form-group">
            <label>{cfg.label}</label>
            <input
              type={cfg.tipo}
              value={formData.config[cfg.campo] || ''}
              onChange={(e) => setFormData({
                ...formData,
                config: {
                  ...formData.config,
                  [cfg.campo]: cfg.tipo === 'number' ? Number(e.target.value) : e.target.value
                }
              })}
              placeholder={cfg.tipo === 'number' ? '0' : ''}
            />
          </div>
        ))}
      </div>

      {/* Sección de traducciones */}
      {meta.soportaMultiidioma && (
        <div className="traducciones-section">
          <h4>Traducciones (opcional)</h4>
          <p className="traducciones-hint">Agrega traducciones para la web pública en otros idiomas</p>

          {IDIOMAS_DISPONIBLES.map(idioma => (
            <div key={idioma.codigo} className="traduccion-grupo">
              <div className="traduccion-header">
                <span className="idioma-badge">{idioma.nombre}</span>
              </div>
              <div className="traduccion-campos">
                <div className="form-group">
                  <label>Nombre en {idioma.nombre}</label>
                  <input
                    type="text"
                    value={formData.traducciones[idioma.codigo]?.nombre || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      traducciones: {
                        ...formData.traducciones,
                        [idioma.codigo]: {
                          ...formData.traducciones[idioma.codigo],
                          nombre: e.target.value,
                        },
                      },
                    })}
                    placeholder={`Traducción al ${idioma.nombre.toLowerCase()}`}
                  />
                </div>
                {meta.campos.descripcion && (
                  <div className="form-group">
                    <label>Descripción en {idioma.nombre}</label>
                    <input
                      type="text"
                      value={formData.traducciones[idioma.codigo]?.descripcion || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        traducciones: {
                          ...formData.traducciones,
                          [idioma.codigo]: {
                            ...formData.traducciones[idioma.codigo],
                            descripcion: e.target.value,
                          },
                        },
                      })}
                      placeholder={`Descripción en ${idioma.nombre.toLowerCase()}`}
                    />
                  </div>
                )}
                {esTablaSepar && (
                  <div className="form-group">
                    <label>Slug URL en {idioma.nombre}</label>
                    <input
                      type="text"
                      value={formData.slug_traducciones[idioma.codigo] || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        slug_traducciones: {
                          ...formData.slug_traducciones,
                          [idioma.codigo]: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                        },
                      })}
                      placeholder={`Ej: ${idioma.codigo === 'en' ? 'houses' : idioma.codigo === 'fr' ? 'maisons' : 'casas'}`}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="form-actions">
        <button className="btn-cancel" onClick={handleCancel} disabled={saving}>
          Cancelar
        </button>
        <button className="btn-save" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  );

  const renderItem = (item: ItemGenerico, editable: boolean) => {
    const isEditing = editingId === item.id;

    if (isEditing) {
      return (
        <div key={item.id} className="item-card item-editing">
          {renderForm()}
        </div>
      );
    }

    return (
      <div key={item.id} className={`item-card ${!item.activo ? 'item-inactive' : ''}`}>
        <div className="item-drag">
          <GripVertical size={16} />
        </div>

        <div
          className="item-color"
          style={{ backgroundColor: item.color || meta.color }}
        />

        <div className="item-content">
          <div className="item-name">{item.nombre}</div>
          {item.descripcion && <div className="item-desc">{item.descripcion}</div>}
          {item.config?.porcentaje_comision !== undefined && (
            <div className="item-badge">{item.config.porcentaje_comision}% comisión</div>
          )}
        </div>

        <div className="item-meta">
          {item.origen === 'global' && (
            <span className="origin-badge origin-global">Global</span>
          )}
          {item.origen === 'tenant' && (
            <span className="origin-badge origin-tenant">Personalizado</span>
          )}
        </div>

        <div className="item-actions">
          <button
            className={`btn-toggle ${item.activo ? 'active' : ''}`}
            onClick={() => handleToggle(item)}
            title={item.activo ? 'Desactivar' : 'Activar'}
          >
            {item.activo ? <Check size={16} /> : <X size={16} />}
          </button>

          {editable && (
            <>
              <button
                className="btn-edit"
                onClick={() => handleStartEdit(item)}
                title="Editar"
              >
                <Edit2 size={16} />
              </button>

              {deleteConfirm === item.id ? (
                <div className="delete-confirm">
                  <button className="btn-confirm-delete" onClick={() => handleDelete(item.id)}>
                    Sí
                  </button>
                  <button className="btn-cancel-delete" onClick={() => setDeleteConfirm(null)}>
                    No
                  </button>
                </div>
              ) : (
                <button
                  className="btn-delete"
                  onClick={() => setDeleteConfirm(item.id)}
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="catalogo-editar">
      {/* Header con icono y botón agregar */}
      <div className="section-header">
        <div className="header-left">
          <div className="section-icon" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>
            <Icon size={24} />
          </div>
          <span className="items-total">
            {items.length} elementos
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
          <button className="catalogo-btn-add" onClick={handleStartCreate}>
            <Plus size={18} />
            Agregar
          </button>
        </div>
      </div>

      {error && !isCreating && !editingId && (
        <div className="form-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="loading">Cargando...</div>
      ) : (
        <>
          {/* Formulario de creación */}
          {isCreating && (
            <div className="item-card item-editing">
              {renderForm()}
            </div>
          )}

          {/* Items del tenant (editables) */}
          {itemsTenant.length > 0 && (
            <div className="items-section">
              <h4 className="section-title">Personalizados</h4>
              <div className="items-list">
                {itemsTenant.map(item => renderItem(item, true))}
              </div>
            </div>
          )}

          {/* Items globales (solo toggle) */}
          {itemsGlobales.length > 0 && (
            <div className="items-section">
              <h4 className="section-title">Predefinidos del sistema</h4>
              <div className="items-list">
                {itemsGlobales.map(item => renderItem(item, false))}
              </div>
            </div>
          )}

          {items.length === 0 && !isCreating && (
            <div className="empty-state">
              <Icon size={48} strokeWidth={1} />
              <p>No hay elementos configurados</p>
              <button className="btn-add-empty" onClick={handleStartCreate}>
                <Plus size={18} />
                Agregar el primero
              </button>
            </div>
          )}
        </>
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

        .catalogo-btn-add:hover {
          background: #2563eb;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
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

        .item-desc {
          font-size: 0.875rem;
          color: #64748b;
          margin-top: 2px;
        }

        .item-badge {
          display: inline-block;
          margin-top: 4px;
          padding: 2px 8px;
          background: #f1f5f9;
          color: #475569;
          border-radius: 4px;
          font-size: 0.75rem;
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

        .btn-toggle:hover {
          opacity: 0.8;
        }

        .btn-edit {
          background: #f1f5f9;
          color: #475569;
        }

        .btn-edit:hover {
          background: #e2e8f0;
        }

        .btn-delete {
          background: #f1f5f9;
          color: #dc2626;
        }

        .btn-delete:hover {
          background: #fee2e2;
        }

        .delete-confirm {
          display: flex;
          gap: 4px;
        }

        .delete-confirm button {
          padding: 6px 12px;
          font-size: 0.75rem;
          font-weight: 500;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .btn-confirm-delete {
          background: #dc2626;
          color: white;
        }

        .btn-cancel-delete {
          background: #e2e8f0;
          color: #475569;
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

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group-full {
          grid-column: span 2;
        }

        .form-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .form-group input[type="text"],
        .form-group input[type="number"] {
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

        .color-input {
          display: flex;
          gap: 8px;
        }

        .color-input input[type="color"] {
          width: 40px;
          height: 38px;
          padding: 2px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          cursor: pointer;
        }

        .color-input input[type="text"] {
          flex: 1;
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

        .btn-save:hover {
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

        /* Traducciones section */
        .traducciones-section {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
        }

        .traducciones-section h4 {
          margin: 0 0 4px 0;
          font-size: 0.9375rem;
          font-weight: 600;
          color: #0f172a;
        }

        .traducciones-hint {
          margin: 0 0 16px 0;
          font-size: 0.8125rem;
          color: #64748b;
        }

        .traduccion-grupo {
          margin-bottom: 16px;
          padding: 12px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .traduccion-header {
          margin-bottom: 12px;
        }

        .idioma-badge {
          display: inline-block;
          padding: 4px 10px;
          background: #e0e7ff;
          color: #4338ca;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .traduccion-campos {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .traduccion-campos .form-group {
          margin-bottom: 0;
        }

        .traduccion-campos .form-group label {
          font-size: 0.8125rem;
          color: #475569;
        }

        .traduccion-campos .form-group input {
          padding: 8px 10px;
          font-size: 0.8125rem;
        }

        /* Icon Picker Trigger */
        .icon-picker-trigger {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 14px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.9375rem;
          color: #1e293b;
          cursor: pointer;
          transition: all 0.15s;
          text-align: left;
        }

        .icon-picker-trigger:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
        }

        .icon-picker-trigger:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .icon-picker-trigger .icon-preview {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: #f1f5f9;
          border-radius: 6px;
          color: #475569;
        }

        .icon-picker-trigger .icon-name {
          flex: 1;
          font-weight: 500;
          color: #1e293b;
        }

        .icon-picker-trigger .icon-placeholder {
          flex: 1;
          color: #94a3b8;
        }

        .icon-picker-trigger .icon-chevron {
          color: #94a3b8;
          font-size: 0.875rem;
        }

        @media (max-width: 640px) {
          .catalogo-editar {
            padding: 16px;
          }

          .section-header {
            flex-wrap: wrap;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .form-group-full {
            grid-column: span 1;
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
