/**
 * ExpedienteRequerimientosTab - Gestión de Documentos Requeridos
 *
 * Permite a cada tenant configurar qué documentos son requeridos para:
 * - Cierre de ventas (propiedades listas)
 * - Cierre de ventas (proyectos)
 * - Cierre de alquileres
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  DocumentoRequerido,
  CategoriaDocumento,
  CATEGORIA_LABELS,
  CATEGORIAS_CIERRE,
  TIPOS_ARCHIVO_COMUNES,
  formatFileSize,
  getDocumentosRequeridos,
  createDocumentoRequerido,
  updateDocumentoRequerido,
  deleteDocumentoRequerido,
  reordenarDocumentosRequeridos,
} from '../../services/documentosRequeridos';
import {
  Loader2,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Home,
  Building2,
  Key,
  FileText,
  Check,
  X,
  FileCheck,
  Circle,
} from 'lucide-react';

// ============================================================
// SUB-COMPONENTES
// ============================================================

interface DocumentoCardProps {
  documento: DocumentoRequerido;
  index: number;
  onEdit: (doc: DocumentoRequerido) => void;
  onDelete: (doc: DocumentoRequerido) => void;
}

function DocumentoCard({ documento, index, onEdit, onDelete }: DocumentoCardProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px',
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        transition: 'all 0.2s',
      }}
    >
      {/* Drag handle */}
      <div style={{ cursor: 'grab', color: '#94a3b8' }}>
        <GripVertical size={20} />
      </div>

      {/* Número de orden */}
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: '#f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: '#64748b',
          flexShrink: 0,
        }}
      >
        {index + 1}
      </div>

      {/* Info principal */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontWeight: 600, color: '#1e293b' }}>{documento.titulo}</span>
          {documento.es_obligatorio ? (
            <span
              style={{
                fontSize: '0.625rem',
                padding: '2px 6px',
                background: '#fee2e2',
                color: '#dc2626',
                borderRadius: '4px',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              Obligatorio
            </span>
          ) : (
            <span
              style={{
                fontSize: '0.625rem',
                padding: '2px 6px',
                background: '#f1f5f9',
                color: '#64748b',
                borderRadius: '4px',
                fontWeight: 500,
              }}
            >
              Opcional
            </span>
          )}
        </div>
        {documento.descripcion && (
          <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>{documento.descripcion}</p>
        )}
      </div>

      {/* Tipos de archivo */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '4px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {documento.tipos_archivo_permitidos?.slice(0, 4).map((tipo) => (
            <span
              key={tipo}
              style={{
                fontSize: '0.625rem',
                padding: '2px 6px',
                background: '#e0f2fe',
                color: '#0369a1',
                borderRadius: '4px',
                fontWeight: 500,
                textTransform: 'uppercase',
              }}
            >
              {tipo}
            </span>
          ))}
          {documento.tipos_archivo_permitidos?.length > 4 && (
            <span
              style={{
                fontSize: '0.625rem',
                padding: '2px 6px',
                background: '#f1f5f9',
                color: '#64748b',
                borderRadius: '4px',
              }}
            >
              +{documento.tipos_archivo_permitidos.length - 4}
            </span>
          )}
        </div>
        <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
          Máx. {formatFileSize(documento.tamaño_maximo_archivo)}
        </span>
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={() => onEdit(documento)}
          style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            color: '#64748b',
            transition: 'all 0.2s',
          }}
          title="Editar"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={() => onDelete(documento)}
          style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fef2f2',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            color: '#ef4444',
            transition: 'all 0.2s',
          }}
          title="Eliminar"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// MODAL DE EDICIÓN
// ============================================================

interface ModalDocumentoProps {
  isOpen: boolean;
  documento: DocumentoRequerido | null;
  categoria: CategoriaDocumento;
  onClose: () => void;
  onSave: (data: Partial<DocumentoRequerido>) => Promise<void>;
}

function ModalDocumento({ isOpen, documento, categoria, onClose, onSave }: ModalDocumentoProps) {
  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    instrucciones: '',
    es_obligatorio: false,
    requiere_documento: true,
    tipos_archivo_permitidos: ['pdf', 'jpg', 'jpeg', 'png'],
    tamaño_maximo_archivo: 10485760, // 10MB
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (documento) {
      setForm({
        titulo: documento.titulo || '',
        descripcion: documento.descripcion || '',
        instrucciones: documento.instrucciones || '',
        es_obligatorio: documento.es_obligatorio,
        requiere_documento: documento.requiere_documento,
        tipos_archivo_permitidos: documento.tipos_archivo_permitidos || ['pdf', 'jpg', 'jpeg', 'png'],
        tamaño_maximo_archivo: documento.tamaño_maximo_archivo || 10485760,
      });
    } else {
      setForm({
        titulo: '',
        descripcion: '',
        instrucciones: '',
        es_obligatorio: false,
        requiere_documento: true,
        tipos_archivo_permitidos: ['pdf', 'jpg', 'jpeg', 'png'],
        tamaño_maximo_archivo: 10485760,
      });
    }
  }, [documento, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo.trim()) return;

    setSaving(true);
    try {
      await onSave({
        ...form,
        categoria,
      });
      onClose();
    } catch (error) {
      console.error('Error guardando documento:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleTipoArchivo = (tipo: string) => {
    setForm((prev) => ({
      ...prev,
      tipos_archivo_permitidos: prev.tipos_archivo_permitidos.includes(tipo)
        ? prev.tipos_archivo_permitidos.filter((t) => t !== tipo)
        : [...prev.tipos_archivo_permitidos, tipo],
    }));
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>
            {documento ? 'Editar Documento' : 'Nuevo Documento'}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Título */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#334155' }}>
              Título *
            </label>
            <input
              type="text"
              value={form.titulo}
              onChange={(e) => setForm((prev) => ({ ...prev, titulo: e.target.value }))}
              placeholder="Ej: Documento de Identidad"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '0.875rem',
              }}
              required
            />
          </div>

          {/* Descripción */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#334155' }}>
              Descripción
            </label>
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
              placeholder="Breve descripción del documento"
              rows={2}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '0.875rem',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Instrucciones */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#334155' }}>
              Instrucciones
            </label>
            <textarea
              value={form.instrucciones}
              onChange={(e) => setForm((prev) => ({ ...prev, instrucciones: e.target.value }))}
              placeholder="Instrucciones para el usuario al subir este documento"
              rows={2}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '0.875rem',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Opciones */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 500, color: '#334155' }}>
              Configuración
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.es_obligatorio}
                  onChange={(e) => setForm((prev) => ({ ...prev, es_obligatorio: e.target.checked }))}
                  style={{ width: '18px', height: '18px', accentColor: '#667eea' }}
                />
                <span style={{ color: '#334155' }}>Es obligatorio</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.requiere_documento}
                  onChange={(e) => setForm((prev) => ({ ...prev, requiere_documento: e.target.checked }))}
                  style={{ width: '18px', height: '18px', accentColor: '#667eea' }}
                />
                <span style={{ color: '#334155' }}>Requiere subir archivo</span>
              </label>
            </div>
          </div>

          {/* Tipos de archivo */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 500, color: '#334155' }}>
              Tipos de archivo permitidos
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {TIPOS_ARCHIVO_COMUNES.map((tipo) => (
                <button
                  key={tipo.value}
                  type="button"
                  onClick={() => toggleTipoArchivo(tipo.value)}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid',
                    borderColor: form.tipos_archivo_permitidos.includes(tipo.value) ? '#667eea' : '#e2e8f0',
                    background: form.tipos_archivo_permitidos.includes(tipo.value) ? '#eef2ff' : 'white',
                    color: form.tipos_archivo_permitidos.includes(tipo.value) ? '#667eea' : '#64748b',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                  }}
                >
                  {tipo.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tamaño máximo */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#334155' }}>
              Tamaño máximo (MB)
            </label>
            <input
              type="number"
              value={form.tamaño_maximo_archivo / (1024 * 1024)}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  tamaño_maximo_archivo: parseFloat(e.target.value) * 1024 * 1024,
                }))
              }
              min={1}
              max={50}
              step={1}
              style={{
                width: '100px',
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '0.875rem',
              }}
            />
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                border: '1px solid #e2e8f0',
                background: 'white',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 500,
                color: '#64748b',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !form.titulo.trim()}
              style={{
                padding: '10px 20px',
                border: 'none',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                borderRadius: '8px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontWeight: 500,
                opacity: saving || !form.titulo.trim() ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function ExpedienteRequerimientosTab() {
  const { tenantActual } = useAuth();
  const [documentos, setDocumentos] = useState<DocumentoRequerido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CategoriaDocumento>('cierre_venta_lista');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentoRequerido | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DocumentoRequerido | null>(null);

  useEffect(() => {
    if (tenantActual?.id) {
      loadData();
    }
  }, [tenantActual?.id]);

  const loadData = async () => {
    if (!tenantActual?.id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getDocumentosRequeridos(tenantActual.id);
      setDocumentos(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar documentos por categoría activa
  const documentosFiltrados = documentos.filter((d) => d.categoria === activeTab);

  // Stats
  const totalCategoria = documentosFiltrados.length;
  const obligatoriosCategoria = documentosFiltrados.filter((d) => d.es_obligatorio).length;
  const opcionalesCategoria = totalCategoria - obligatoriosCategoria;

  // Handlers
  const handleCreate = () => {
    setEditingDoc(null);
    setModalOpen(true);
  };

  const handleEdit = (doc: DocumentoRequerido) => {
    setEditingDoc(doc);
    setModalOpen(true);
  };

  const handleSave = async (data: Partial<DocumentoRequerido>) => {
    if (!tenantActual?.id) return;

    if (editingDoc) {
      // Update
      await updateDocumentoRequerido(tenantActual.id, editingDoc.id, data);
    } else {
      // Create
      await createDocumentoRequerido(tenantActual.id, data as any);
    }

    await loadData();
  };

  const handleDelete = async (doc: DocumentoRequerido) => {
    if (!tenantActual?.id) return;
    await deleteDocumentoRequerido(tenantActual.id, doc.id);
    setDeleteConfirm(null);
    await loadData();
  };

  const getTabIcon = (cat: CategoriaDocumento) => {
    switch (cat) {
      case 'cierre_venta_lista':
        return <Home size={16} />;
      case 'cierre_venta_proyecto':
        return <Building2 size={16} />;
      case 'cierre_alquiler':
        return <Key size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', color: '#64748b' }}>
        <Loader2 size={32} className="animate-spin" style={{ marginBottom: '16px' }} />
        <p>Cargando documentos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', color: '#ef4444' }}>
        <AlertCircle size={32} style={{ marginBottom: '16px' }} />
        <p>{error}</p>
        <button
          onClick={loadData}
          style={{ marginTop: '16px', padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>
            Documentos Requeridos
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Configura los documentos necesarios para completar ventas y alquileres
          </p>
        </div>
        <button
          onClick={handleCreate}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          <Plus size={18} />
          Agregar Documento
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #e2e8f0', paddingBottom: '0' }}>
        {CATEGORIAS_CIERRE.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === cat ? '2px solid #667eea' : '2px solid transparent',
              marginBottom: '-2px',
              cursor: 'pointer',
              color: activeTab === cat ? '#667eea' : '#64748b',
              fontWeight: activeTab === cat ? 600 : 400,
              transition: 'all 0.2s',
            }}
          >
            {getTabIcon(cat)}
            {CATEGORIA_LABELS[cat]}
            <span
              style={{
                fontSize: '0.75rem',
                padding: '2px 8px',
                background: activeTab === cat ? '#eef2ff' : '#f1f5f9',
                borderRadius: '12px',
                color: activeTab === cat ? '#667eea' : '#64748b',
              }}
            >
              {documentos.filter((d) => d.categoria === cat).length}
            </span>
          </button>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '12px', padding: '16px', color: 'white' }}>
          <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '4px' }}>Total Documentos</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{totalCategoria}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '12px', padding: '16px', color: 'white' }}>
          <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '4px' }}>Obligatorios</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{obligatoriosCategoria}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderRadius: '12px', padding: '16px', color: 'white' }}>
          <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '4px' }}>Opcionales</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{opcionalesCategoria}</div>
        </div>
      </div>

      {/* Lista de documentos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {documentosFiltrados.map((doc, index) => (
          <DocumentoCard
            key={doc.id}
            documento={doc}
            index={index}
            onEdit={handleEdit}
            onDelete={(d) => setDeleteConfirm(d)}
          />
        ))}
      </div>

      {/* Empty state */}
      {documentosFiltrados.length === 0 && (
        <div
          style={{
            padding: '60px 20px',
            textAlign: 'center',
            color: '#64748b',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '2px dashed #e2e8f0',
          }}
        >
          <FileText size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <h3 style={{ marginBottom: '8px' }}>No hay documentos configurados</h3>
          <p style={{ marginBottom: '16px' }}>Agrega los documentos requeridos para esta categoría</p>
          <button
            onClick={handleCreate}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            <Plus size={18} />
            Agregar Documento
          </button>
        </div>
      )}

      {/* Modal de edición */}
      <ModalDocumento
        isOpen={modalOpen}
        documento={editingDoc}
        categoria={activeTab}
        onClose={() => {
          setModalOpen(false);
          setEditingDoc(null);
        }}
        onSave={handleSave}
      />

      {/* Modal de confirmación de eliminación */}
      {deleteConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '400px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: '1.125rem', fontWeight: 600 }}>Eliminar documento</h3>
            <p style={{ margin: '0 0 20px', color: '#64748b' }}>
              ¿Estás seguro de que deseas eliminar "{deleteConfirm.titulo}"? Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #e2e8f0',
                  background: 'white',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  color: '#64748b',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
