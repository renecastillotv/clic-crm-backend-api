/**
 * CrmSeoStatEditor - Editor de SEO Stats
 *
 * Editor para crear/editar contenido SEO con múltiples asociaciones:
 * - Operaciones (desde tabla operaciones)
 * - Tipos de propiedad (desde tabla categorias_propiedades)
 * - Ubicaciones (con jerarquía: país > provincia > ciudad > sector)
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { usePageHeader } from '../../../layouts/CrmLayout';
import {
  getSeoStat,
  createSeoStat,
  updateSeoStat,
  getCategoriasContenido,
  getOperacionesCatalogo,
  getCategoriasPropiedadesCatalogo,
  getArbolUbicaciones,
} from '../../../services/api';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { contenidoStyles } from './sharedStyles';

const Icons = {
  arrowLeft: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  save: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  globe: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  tag: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  mapPin: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  home: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  link: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  chevronRight: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
  chevronDown: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
  search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
};

// Configuración de React Quill
const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    ['link'],
    [{ align: [] }],
    ['clean'],
  ],
};

const quillFormats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet', 'indent',
  'link', 'align',
];

// Colores por defecto para operaciones si no tienen (basado en slug)
const DEFAULT_OPERACION_COLORS: Record<string, string> = {
  venta: '#10b981',
  'venta-amueblado': '#059669',
  alquiler: '#3b82f6',
  'alquiler-amueblado': '#2563eb',
  'renta-vacacional': '#8b5cf6',
};

// Colores para tipos de ubicación
const UBICACION_COLORS: Record<string, string> = {
  pais: '#6366f1',
  provincia: '#8b5cf6',
  ciudad: '#a855f7',
  sector: '#c084fc',
  zona: '#d8b4fe',
};

interface FormData {
  titulo: string;
  descripcion: string;
  contenido: string;
  categoriaId: string;
  keywords: string[];
  operaciones: string[];
  tipoPropiedadIds: string[];
  ubicacionIds: string[];
  publicado: boolean;
  destacado: boolean;
  orden: number;
}

// Interfaces para datos
interface OperacionOption {
  id: string;
  slug: string;  // Las operaciones usan slug, no codigo
  nombre: string;
  color?: string;
  icono?: string;
}

interface CategoriaOption {
  id: string;
  codigo: string;
  nombre: string;
  color?: string;
  icono?: string;
}

interface UbicacionNode {
  id: string;
  nombre: string;
  tipo: string;
  nivel: number;
  children?: UbicacionNode[];
}

const initialFormData: FormData = {
  titulo: '',
  descripcion: '',
  contenido: '',
  categoriaId: '',
  keywords: [],
  operaciones: [],
  tipoPropiedadIds: [],
  ubicacionIds: [],
  publicado: true,
  destacado: false,
  orden: 0,
};

export default function CrmSeoStatEditor() {
  const { tenantSlug, id } = useParams<{ tenantSlug: string; id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tenantActual, puedeEditar, puedeCrear } = useAuth();
  const { setPageHeader } = usePageHeader();

  const isEditing = id && id !== 'nuevo';
  const isViewOnly = searchParams.get('mode') === 'ver' || (isEditing && !puedeEditar('contenido')) || (!isEditing && !puedeCrear('contenido'));

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [operacionesOpciones, setOperacionesOpciones] = useState<OperacionOption[]>([]);
  const [tiposPropiedadOpciones, setTiposPropiedadOpciones] = useState<CategoriaOption[]>([]);
  const [ubicacionesArbol, setUbicacionesArbol] = useState<UbicacionNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keywordInput, setKeywordInput] = useState('');

  // Estado para secciones expandidas de ubicaciones
  const [expandedUbicaciones, setExpandedUbicaciones] = useState<Set<string>>(new Set());

  // Estado para búsqueda en cada tipo de ubicación
  const [ubicacionSearch, setUbicacionSearch] = useState<Record<string, string>>({
    pais: '',
    provincia: '',
    ciudad: '',
    sector: '',
  });

  // Ref para evitar stale closure en el header
  const handleSaveRef = useRef<() => void>(() => {});

  useEffect(() => {
    setPageHeader({
      title: isViewOnly ? 'Ver SEO Stat' : (isEditing ? 'Editar SEO Stat' : 'Nuevo SEO Stat'),
      subtitle: isViewOnly ? 'Solo lectura' : 'Contenido SEO con asociaciones múltiples',
      actions: (
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => navigate(`/crm/${tenantSlug}/contenido?tab=seo`)}
            className="btn-secondary"
          >
            {Icons.arrowLeft}
            <span>Volver</span>
          </button>
          {!isViewOnly && (
            <button
              onClick={() => handleSaveRef.current()}
              className="btn-primary"
              disabled={saving}
            >
              {Icons.save}
              <span>{saving ? 'Guardando...' : 'Guardar'}</span>
            </button>
          )}
        </div>
      ),
    });
  }, [setPageHeader, isEditing, isViewOnly, tenantSlug, saving]);

  useEffect(() => {
    loadData();
  }, [tenantActual?.id, id]);

  const loadData = async () => {
    if (!tenantActual?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Cargar datos en paralelo
      const [categoriasData, operacionesData, tiposData, ubicacionesData] = await Promise.all([
        getCategoriasContenido(tenantActual.id, 'seo_stats').catch(() => []),
        getOperacionesCatalogo(true).catch(() => []),
        getCategoriasPropiedadesCatalogo(true).catch(() => []),
        getArbolUbicaciones({ maxNivel: 4 }).catch(() => []),
      ]);

      setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
      // Mapear operaciones: la API devuelve 'codigo' pero internamente usamos 'slug'
      const operacionesMapeadas: OperacionOption[] = (Array.isArray(operacionesData) ? operacionesData : []).map((op: any) => ({
        id: op.id,
        slug: op.slug || op.codigo, // Preferir slug, fallback a codigo
        nombre: op.nombre,
        color: op.color,
        icono: op.icono,
      }));
      setOperacionesOpciones(operacionesMapeadas);
      setTiposPropiedadOpciones(Array.isArray(tiposData) ? tiposData : []);

      // Asegurar que ubicacionesData sea un array
      const ubicacionesArray = Array.isArray(ubicacionesData) ? ubicacionesData : [];
      setUbicacionesArbol(ubicacionesArray);

      // Expandir primer nivel por defecto
      if (ubicacionesArray.length > 0) {
        const firstLevelIds = ubicacionesArray.map((u: any) => u.id);
        setExpandedUbicaciones(new Set(firstLevelIds));
      }

      // Si estamos editando, cargar el SEO Stat
      if (isEditing && id) {
        const seoStat = await getSeoStat(tenantActual.id, id);
        const s = seoStat as any;
        setFormData({
          titulo: s.titulo || '',
          descripcion: s.descripcion || '',
          contenido: s.contenido || '',
          categoriaId: s.categoria_id || '',
          keywords: s.keywords || [],
          operaciones: s.operaciones || [],
          tipoPropiedadIds: s.tipo_propiedad_ids || [],
          ubicacionIds: s.ubicacion_ids || [],
          publicado: s.publicado ?? true,
          destacado: s.destacado ?? false,
          orden: s.orden || 0,
        });

        // Expandir ubicaciones seleccionadas
        if (s.ubicacion_ids?.length > 0 && ubicacionesArray.length > 0) {
          // Encontrar padres de ubicaciones seleccionadas para expandirlos
          const expandIds = new Set<string>();
          const findParents = (nodes: UbicacionNode[], targetIds: string[], path: string[] = []) => {
            if (!Array.isArray(nodes)) return;
            for (const node of nodes) {
              if (targetIds.includes(node.id)) {
                path.forEach(p => expandIds.add(p));
              }
              if (node.children?.length) {
                findParents(node.children, targetIds, [...path, node.id]);
              }
            }
          };
          findParents(ubicacionesArray, s.ubicacion_ids);
          setExpandedUbicaciones(prev => new Set([...prev, ...expandIds]));
        }
      } else {
        // Si NO estamos editando (es nuevo), auto-seleccionar el país si solo hay uno
        const paises = ubicacionesArray.filter((u: UbicacionNode) => u.tipo === 'pais');
        if (paises.length === 1) {
          setFormData(prev => ({
            ...prev,
            ubicacionIds: [paises[0].id],
          }));
          // Expandir para mostrar las provincias
          setExpandedUbicaciones(new Set(['pais', 'provincia']));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = useCallback(async () => {
    if (!tenantActual?.id) return;

    if (!formData.titulo.trim()) {
      setError('El título es requerido');
      return;
    }

    if (!formData.contenido.trim()) {
      setError('El contenido es requerido');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const dataToSave = {
        titulo: formData.titulo,
        descripcion: formData.descripcion,
        contenido: formData.contenido,
        categoriaId: formData.categoriaId || undefined,
        keywords: formData.keywords.filter(k => k.trim()),
        operaciones: formData.operaciones,
        tipoPropiedadIds: formData.tipoPropiedadIds,
        ubicacionIds: formData.ubicacionIds,
        publicado: formData.publicado,
        destacado: formData.destacado,
        orden: formData.orden,
      };

      if (isEditing && id) {
        await updateSeoStat(tenantActual.id, id, dataToSave);
      } else {
        await createSeoStat(tenantActual.id, dataToSave);
      }

      navigate(`/crm/${tenantSlug}/contenido?tab=seo`);
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }, [tenantActual?.id, formData, isEditing, id, tenantSlug, navigate]);

  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !formData.keywords.includes(keywordInput.trim())) {
      setFormData({
        ...formData,
        keywords: [...formData.keywords, keywordInput.trim()],
      });
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setFormData({
      ...formData,
      keywords: formData.keywords.filter(k => k !== keyword),
    });
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const toggleOperacion = (slug: string) => {
    const current = formData.operaciones;
    if (current.includes(slug)) {
      setFormData({ ...formData, operaciones: current.filter(o => o !== slug) });
    } else {
      setFormData({ ...formData, operaciones: [...current, slug] });
    }
  };

  const toggleTipoPropiedad = (id: string) => {
    const current = formData.tipoPropiedadIds;
    if (current.includes(id)) {
      setFormData({ ...formData, tipoPropiedadIds: current.filter(t => t !== id) });
    } else {
      setFormData({ ...formData, tipoPropiedadIds: [...current, id] });
    }
  };

  const toggleUbicacionExpand = (ubicacionId: string) => {
    setExpandedUbicaciones(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ubicacionId)) {
        newSet.delete(ubicacionId);
      } else {
        newSet.add(ubicacionId);
      }
      return newSet;
    });
  };

  // Aplanar el árbol de ubicaciones y agrupar por tipo, guardando parentId
  const ubicacionesPorTipo = useMemo(() => {
    const byType: Record<string, Array<{ id: string; nombre: string; parentId?: string; parentNombre?: string }>> = {
      pais: [],
      provincia: [],
      ciudad: [],
      sector: [],
    };

    // Verificar que tengamos datos válidos
    if (!Array.isArray(ubicacionesArbol) || ubicacionesArbol.length === 0) {
      return byType;
    }

    const flatten = (nodes: UbicacionNode[], parentId?: string, parentNombre?: string) => {
      if (!Array.isArray(nodes)) return;
      for (const node of nodes) {
        if (node && byType[node.tipo]) {
          byType[node.tipo].push({
            id: node.id,
            nombre: node.nombre,
            parentId,
            parentNombre,
          });
        }
        if (node?.children?.length) {
          flatten(node.children, node.id, node.nombre);
        }
      }
    };

    flatten(ubicacionesArbol);

    // Ordenar cada grupo alfabéticamente
    Object.keys(byType).forEach(tipo => {
      byType[tipo].sort((a, b) => a.nombre.localeCompare(b.nombre));
    });

    return byType;
  }, [ubicacionesArbol]);

  // Filtrar ubicaciones según padres seleccionados Y término de búsqueda
  const ubicacionesVisibles = useMemo(() => {
    const selectedIds = new Set(formData.ubicacionIds);
    const paises = ubicacionesPorTipo.pais || [];
    const provincias = ubicacionesPorTipo.provincia || [];
    const ciudades = ubicacionesPorTipo.ciudad || [];
    const sectores = ubicacionesPorTipo.sector || [];

    // Función para aplicar filtro de búsqueda
    const applySearch = (
      items: Array<{ id: string; nombre: string; parentId?: string; parentNombre?: string }>,
      searchTerm: string
    ) => {
      if (!searchTerm.trim()) return items;
      const term = searchTerm.toLowerCase();
      return items.filter(item =>
        item.nombre.toLowerCase().includes(term) ||
        (item.parentNombre && item.parentNombre.toLowerCase().includes(term))
      );
    };

    return {
      // Países siempre visibles (filtrados por búsqueda)
      pais: applySearch(paises, ubicacionSearch.pais),
      // Provincias: solo si su país padre está seleccionado (filtradas por búsqueda)
      provincia: applySearch(
        provincias.filter(p => p.parentId && selectedIds.has(p.parentId)),
        ubicacionSearch.provincia
      ),
      // Ciudades: solo si su provincia padre está seleccionada (filtradas por búsqueda)
      ciudad: applySearch(
        ciudades.filter(c => c.parentId && selectedIds.has(c.parentId)),
        ubicacionSearch.ciudad
      ),
      // Sectores: solo si su ciudad padre está seleccionada (filtrados por búsqueda)
      sector: applySearch(
        sectores.filter(s => s.parentId && selectedIds.has(s.parentId)),
        ubicacionSearch.sector
      ),
    };
  }, [ubicacionesPorTipo, formData.ubicacionIds, ubicacionSearch]);

  // Contar ubicaciones seleccionadas por tipo
  const ubicacionesSeleccionadasInfo = useMemo(() => {
    const countByType: Record<string, number> = {};
    Object.entries(ubicacionesPorTipo).forEach(([tipo, items]) => {
      const count = items.filter(item => formData.ubicacionIds.includes(item.id)).length;
      if (count > 0) {
        countByType[tipo] = count;
      }
    });
    return countByType;
  }, [ubicacionesPorTipo, formData.ubicacionIds]);

  const toggleUbicacion = (id: string) => {
    const current = formData.ubicacionIds;
    if (current.includes(id)) {
      setFormData({ ...formData, ubicacionIds: current.filter(u => u !== id) });
    } else {
      setFormData({ ...formData, ubicacionIds: [...current, id] });
    }
  };

  // Tipos de ubicación para mostrar en orden
  const tiposUbicacion = [
    { key: 'pais', label: 'Países', icon: '🌎' },
    { key: 'provincia', label: 'Provincias', icon: '🗺️' },
    { key: 'ciudad', label: 'Ciudades', icon: '🏙️' },
    { key: 'sector', label: 'Sectores', icon: '📍' },
  ];

  if (loading) {
    return (
      <div className="page">
        <style>{contenidoStyles}</style>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <style>{contenidoStyles}</style>
      <style>{`
        .editor-container {
          width: 100%;
          padding: 0;
        }

        .editor-grid {
          display: grid;
          grid-template-columns: 70% 30%;
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
          min-width: 0;
        }

        .editor-sidebar {
          display: flex;
          flex-direction: column;
          gap: 20px;
          min-width: 0;
        }

        .config-publish-row {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 16px;
        }

        .editor-section.compact {
          padding: 16px;
        }

        .editor-section.compact h3 {
          margin-bottom: 12px;
          font-size: 0.9rem;
        }

        .editor-section.compact .toggle-card {
          padding: 10px 12px;
          margin-bottom: 8px;
        }

        .editor-section.compact .toggle-card:last-child {
          margin-bottom: 0;
        }

        .editor-section {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow: visible;
          width: 100%;
          box-sizing: border-box;
        }

        .editor-section h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .editor-section h3 svg {
          color: #64748b;
        }

        .quill-container {
          border-radius: 8px;
          overflow: hidden;
          width: 100%;
        }

        .quill-container .ql-toolbar {
          border-color: #e2e8f0;
          background: #f8fafc;
        }

        .quill-container .ql-container {
          border-color: #e2e8f0;
          min-height: 350px;
          font-size: 1rem;
        }

        .quill-container .ql-editor {
          min-height: 350px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group:last-child {
          margin-bottom: 0;
        }

        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 6px;
        }

        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.95rem;
          transition: all 0.2s;
          box-sizing: border-box;
        }

        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .keywords-container {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }

        .keyword-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: #e0f2fe;
          color: #0369a1;
          border-radius: 16px;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .keyword-tag button {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          color: #0369a1;
          display: flex;
          align-items: center;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .keyword-tag button:hover {
          opacity: 1;
        }

        .keyword-input-group {
          display: flex;
          gap: 8px;
        }

        .keyword-input-group input {
          flex: 1;
        }

        .keyword-input-group button {
          padding: 10px 16px;
          background: #3b82f6;
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .keyword-input-group button:hover {
          background: #2563eb;
        }

        .toggle-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-bottom: 12px;
        }

        .toggle-card:last-child {
          margin-bottom: 0;
        }

        .toggle-card.active {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
        }

        .toggle-card.inactive {
          background: #f1f5f9;
          color: #64748b;
          border: 1px solid #e2e8f0;
        }

        .toggle-card.destacado.active {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);
        }

        .toggle-card-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .toggle-card-title {
          font-weight: 600;
          font-size: 0.95rem;
        }

        .toggle-card-subtitle {
          font-size: 0.8rem;
          opacity: 0.8;
        }

        .toggle-switch-mini {
          width: 44px;
          height: 24px;
          border-radius: 12px;
          position: relative;
          transition: all 0.3s;
        }

        .toggle-card.active .toggle-switch-mini {
          background: rgba(255, 255, 255, 0.3);
        }

        .toggle-card.inactive .toggle-switch-mini {
          background: #cbd5e1;
        }

        .toggle-switch-mini::after {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          top: 2px;
          transition: all 0.3s;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .toggle-card.active .toggle-switch-mini::after {
          left: 22px;
          background: white;
        }

        .toggle-card.inactive .toggle-switch-mini::after {
          left: 2px;
          background: white;
        }

        /* Multi-select chips */
        .chip-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: 2px solid transparent;
        }

        .chip.unselected {
          background: #f1f5f9;
          color: #64748b;
          border-color: #e2e8f0;
        }

        .chip.unselected:hover {
          background: #e2e8f0;
          border-color: #cbd5e1;
        }

        .chip.selected {
          color: white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .chip .check-icon {
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Ubicaciones - Secciones colapsables */
        .ubicacion-sections {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .ubicacion-section {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }

        .ubicacion-section-header {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: #f8fafc;
          border: none;
          cursor: pointer;
          transition: background 0.15s;
        }

        .ubicacion-section-header:hover {
          background: #f1f5f9;
        }

        .section-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .section-header-left svg {
          color: #64748b;
        }

        .section-icon {
          font-size: 1rem;
        }

        .section-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #1e293b;
        }

        .section-count {
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 400;
        }

        .section-selected-badge {
          font-size: 0.7rem;
          font-weight: 500;
          color: white;
          padding: 2px 8px;
          border-radius: 10px;
        }

        .ubicacion-section-content {
          max-height: 280px;
          overflow-y: auto;
          padding: 4px;
          background: white;
          border-top: 1px solid #e2e8f0;
        }

        .ubicacion-search-wrapper {
          position: sticky;
          top: 0;
          padding: 6px 4px;
          background: white;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .ubicacion-search-input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.85rem;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .ubicacion-search-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .ubicacion-search-input::placeholder {
          color: #94a3b8;
        }

        .ubicacion-search-clear {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          font-size: 0.75rem;
          color: #64748b;
          transition: background 0.2s;
        }

        .ubicacion-search-clear:hover {
          background: #e2e8f0;
          color: #1e293b;
        }

        .ubicacion-no-results {
          padding: 12px;
          text-align: center;
          color: #94a3b8;
          font-size: 0.85rem;
          font-style: italic;
        }

        .ubicacion-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          background: none;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.15s;
          text-align: left;
        }

        .ubicacion-item:hover {
          background: #f1f5f9;
        }

        .ubicacion-item.selected {
          background: #eff6ff;
        }

        .ubicacion-checkbox {
          width: 18px;
          height: 18px;
          border: 2px solid #cbd5e1;
          border-radius: 4px;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          flex-shrink: 0;
        }

        .ubicacion-checkbox.checked {
          color: white;
        }

        .ubicacion-checkbox.checked svg {
          width: 12px;
          height: 12px;
        }

        .ubicacion-item-content {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .ubicacion-nombre {
          font-size: 0.875rem;
          color: #1e293b;
        }

        .ubicacion-parent {
          font-size: 0.7rem;
          color: #94a3b8;
        }

        .ubicaciones-summary {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #e2e8f0;
        }

        .ubicacion-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 10px;
          font-size: 0.7rem;
          font-weight: 500;
          color: white;
        }

        .section-subtitle {
          font-size: 0.8rem;
          color: #64748b;
          margin-bottom: 12px;
        }

        .selected-count {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 8px;
        }

        /* Icono en chip (FontAwesome) */
        .chip-icon {
          font-size: 0.9rem;
          width: 16px;
          text-align: center;
        }
      `}</style>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="editor-container">
        <div className="editor-grid">
          {/* Columna Principal */}
          <div className="editor-main">
            {/* Información Básica */}
            <div className="editor-section">
              <h3>
                {Icons.globe}
                Información Básica
              </h3>

              <div className="form-group">
                <label>Título *</label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Título del contenido SEO"
                />
              </div>

              <div className="form-group">
                <label>Descripción corta</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Breve descripción para identificar el contenido"
                  rows={2}
                />
              </div>
            </div>

            {/* Contenido */}
            <div className="editor-section">
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
                Contenido Semántico *
              </h3>
              <p className="section-subtitle">
                Este contenido se agregará a las páginas para enriquecer el SEO semántico
              </p>

              <div className="quill-container">
                <ReactQuill
                  theme="snow"
                  value={formData.contenido}
                  onChange={(value) => setFormData({ ...formData, contenido: value })}
                  modules={quillModules}
                  formats={quillFormats}
                  placeholder="Contenido enriquecido para SEO semántico..."
                />
              </div>
            </div>

            {/* Keywords */}
            <div className="editor-section">
              <h3>
                {Icons.tag}
                Keywords
              </h3>
              <p className="section-subtitle">
                Palabras clave relacionadas con este contenido
              </p>

              <div className="form-group">
                <div className="keyword-input-group">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={handleKeywordKeyDown}
                    placeholder="Agregar keyword y presionar Enter"
                  />
                  <button type="button" onClick={handleAddKeyword}>
                    Agregar
                  </button>
                </div>
                {formData.keywords.length > 0 && (
                  <div className="keywords-container">
                    {formData.keywords.map((keyword, idx) => (
                      <span key={idx} className="keyword-tag">
                        {keyword}
                        <button onClick={() => handleRemoveKeyword(keyword)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Configuración y Publicación en fila */}
            <div className="config-publish-row">
              {/* Configuración */}
              <div className="editor-section compact">
                <h3>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                  Configuración
                </h3>

                <div className="form-group">
                  <label>Orden</label>
                  <input
                    type="number"
                    value={formData.orden}
                    onChange={(e) => setFormData({ ...formData, orden: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                </div>
              </div>

              {/* Publicación */}
              <div className="editor-section compact">
                <h3>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  Publicación
                </h3>

                <div
                  className={`toggle-card ${formData.publicado ? 'active' : 'inactive'}`}
                  onClick={() => setFormData({ ...formData, publicado: !formData.publicado })}
                >
                  <div className="toggle-card-content">
                    <span className="toggle-card-title">
                      {formData.publicado ? 'Publicado' : 'Borrador'}
                    </span>
                    <span className="toggle-card-subtitle">
                      {formData.publicado ? 'Visible en el sitio' : 'Solo visible en el CRM'}
                    </span>
                  </div>
                  <div className="toggle-switch-mini" />
                </div>

                <div
                  className={`toggle-card destacado ${formData.destacado ? 'active' : 'inactive'}`}
                  onClick={() => setFormData({ ...formData, destacado: !formData.destacado })}
                >
                  <div className="toggle-card-content">
                    <span className="toggle-card-title">
                      {formData.destacado ? 'Destacado' : 'Normal'}
                    </span>
                    <span className="toggle-card-subtitle">
                      {formData.destacado ? 'Mayor prioridad' : 'Prioridad normal'}
                    </span>
                  </div>
                  <div className="toggle-switch-mini" />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="editor-sidebar">
            {/* Operaciones */}
            <div className="editor-section">
              <h3>
                {Icons.link}
                Operaciones
              </h3>
              <p className="section-subtitle">
                Selecciona las operaciones donde aplica este contenido
              </p>

              <div className="chip-grid">
                {operacionesOpciones.map(op => {
                  const color = op.color || DEFAULT_OPERACION_COLORS[op.slug] || '#6366f1';
                  const isSelected = formData.operaciones.includes(op.slug);
                  return (
                    <button
                      key={op.id}
                      type="button"
                      className={`chip ${isSelected ? 'selected' : 'unselected'}`}
                      style={isSelected ? { background: color } : {}}
                      onClick={() => toggleOperacion(op.slug)}
                    >
                      {op.icono && <i className={`chip-icon ${op.icono}`} />}
                      {isSelected && !op.icono && (
                        <span className="check-icon">{Icons.check}</span>
                      )}
                      {op.nombre}
                    </button>
                  );
                })}
              </div>
              {operacionesOpciones.length === 0 && (
                <p className="selected-count">No hay operaciones configuradas</p>
              )}
              {formData.operaciones.length === 0 && operacionesOpciones.length > 0 && (
                <p className="selected-count">Sin selección = aplica a todas</p>
              )}
            </div>

            {/* Tipos de Propiedad */}
            <div className="editor-section">
              <h3>
                {Icons.home}
                Tipos de Propiedad
              </h3>
              <p className="section-subtitle">
                Selecciona los tipos de propiedad donde aplica
              </p>

              <div className="chip-grid">
                {tiposPropiedadOpciones.map((tipo) => {
                  const color = tipo.color || '#6366f1';
                  const isSelected = formData.tipoPropiedadIds.includes(tipo.id);
                  return (
                    <button
                      key={tipo.id}
                      type="button"
                      className={`chip ${isSelected ? 'selected' : 'unselected'}`}
                      style={isSelected ? { background: color } : {}}
                      onClick={() => toggleTipoPropiedad(tipo.id)}
                    >
                      {tipo.icono && <i className={`chip-icon ${tipo.icono}`} />}
                      {isSelected && !tipo.icono && (
                        <span className="check-icon">{Icons.check}</span>
                      )}
                      {tipo.nombre}
                    </button>
                  );
                })}
              </div>
              {tiposPropiedadOpciones.length === 0 && (
                <p className="selected-count">No hay tipos de propiedad configurados</p>
              )}
              {formData.tipoPropiedadIds.length === 0 && tiposPropiedadOpciones.length > 0 && (
                <p className="selected-count">Sin selección = aplica a todos</p>
              )}
            </div>

            {/* Ubicaciones */}
            <div className="editor-section">
              <h3>
                {Icons.mapPin}
                Ubicaciones
              </h3>
              <p className="section-subtitle">
                Selecciona las ubicaciones donde aplica
              </p>

              {/* Secciones por tipo de ubicación */}
              <div className="ubicacion-sections">
                {tiposUbicacion.map(({ key, label, icon }) => {
                  const items = ubicacionesVisibles[key as keyof typeof ubicacionesVisibles] || [];
                  const selectedCount = items.filter(item => formData.ubicacionIds.includes(item.id)).length;
                  const isExpanded = expandedUbicaciones.has(key);
                  const color = UBICACION_COLORS[key] || '#64748b';

                  // No mostrar sección si no hay items disponibles
                  if (items.length === 0) return null;

                  return (
                    <div key={key} className="ubicacion-section">
                      <button
                        type="button"
                        className="ubicacion-section-header"
                        onClick={() => toggleUbicacionExpand(key)}
                      >
                        <span className="section-header-left">
                          {isExpanded ? Icons.chevronDown : Icons.chevronRight}
                          <span className="section-icon">{icon}</span>
                          <span className="section-label">{label}</span>
                          <span className="section-count">({items.length})</span>
                        </span>
                        {selectedCount > 0 && (
                          <span
                            className="section-selected-badge"
                            style={{ background: color }}
                          >
                            {selectedCount} seleccionado{selectedCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </button>

                      {isExpanded && (
                        <div className="ubicacion-section-content">
                          {/* Campo de búsqueda */}
                          <div className="ubicacion-search-wrapper">
                            <input
                              type="text"
                              placeholder={`Buscar ${label.toLowerCase()}...`}
                              value={ubicacionSearch[key] || ''}
                              onChange={(e) => setUbicacionSearch(prev => ({
                                ...prev,
                                [key]: e.target.value
                              }))}
                              className="ubicacion-search-input"
                              onClick={(e) => e.stopPropagation()}
                            />
                            {ubicacionSearch[key] && (
                              <button
                                type="button"
                                className="ubicacion-search-clear"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUbicacionSearch(prev => ({ ...prev, [key]: '' }));
                                }}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          {items.length === 0 && ubicacionSearch[key] && (
                            <p className="ubicacion-no-results">No se encontraron resultados</p>
                          )}
                          {items.map(item => {
                            const isSelected = formData.ubicacionIds.includes(item.id);
                            return (
                              <button
                                key={item.id}
                                type="button"
                                className={`ubicacion-item ${isSelected ? 'selected' : ''}`}
                                onClick={() => toggleUbicacion(item.id)}
                              >
                                <span
                                  className={`ubicacion-checkbox ${isSelected ? 'checked' : ''}`}
                                  style={isSelected ? { background: color, borderColor: color } : {}}
                                >
                                  {isSelected && Icons.check}
                                </span>
                                <span className="ubicacion-item-content">
                                  <span className="ubicacion-nombre">{item.nombre}</span>
                                  {item.parentNombre && (
                                    <span className="ubicacion-parent">{item.parentNombre}</span>
                                  )}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {(ubicacionesPorTipo.pais?.length || 0) === 0 && (
                <p className="selected-count">No hay ubicaciones configuradas</p>
              )}

              {/* Mensaje guía */}
              {(ubicacionesPorTipo.pais?.length || 0) > 0 && formData.ubicacionIds.length === 0 && (
                <p className="selected-count">Selecciona un país para ver sus provincias</p>
              )}

              {/* Resumen de seleccionadas */}
              {formData.ubicacionIds.length > 0 && (
                <div className="ubicaciones-summary">
                  {Object.entries(ubicacionesSeleccionadasInfo).map(([tipo, count]) => (
                    <span
                      key={tipo}
                      className="ubicacion-badge"
                      style={{ background: UBICACION_COLORS[tipo] || '#64748b' }}
                    >
                      {count} {tipo}{count > 1 ? 's' : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Categoría */}
            <div className="editor-section">
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                Categoría / Segmento
              </h3>
              <p className="section-subtitle">
                Segmentación de audiencia (inversionistas, familias, etc.)
              </p>

              <div className="form-group">
                <select
                  value={formData.categoriaId}
                  onChange={(e) => setFormData({ ...formData, categoriaId: e.target.value })}
                >
                  <option value="">Sin categoría específica</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
