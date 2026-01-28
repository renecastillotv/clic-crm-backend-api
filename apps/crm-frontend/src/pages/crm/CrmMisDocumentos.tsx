/**
 * CrmMisDocumentos.tsx
 * Página unificada de documentos del usuario
 * - Lista documentos generados + documentos de empresa (biblioteca)
 * - Botón "Crear Documento" con flujo integrado
 * - Integración con DocuSeal para firmas
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { usePageHeader } from '../../layouts/CrmLayout';
import { apiFetch } from '../../services/api';
import {
  Plus,
  FileText,
  Building2,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  Send,
  Eye,
  Search,
  Filter,
  RefreshCw,
  X,
  ChevronRight,
  Loader2,
  Star,
  FileCheck,
  Users,
  Home,
  Trash2,
  ExternalLink,
} from 'lucide-react';

// ==================== TYPES ====================

interface DocumentoUnificado {
  id: string;
  tipo: 'generado' | 'empresa';
  nombre: string;
  estado: string;
  url_documento: string;
  fecha: string;
  created_at: string;
  // Para generados
  plantilla_nombre?: string;
  plantilla_categoria?: string;
  contacto_nombre?: string;
  propiedad_titulo?: string;
  // Para empresa
  es_obligatorio?: boolean;
  confirmado?: boolean;
  es_favorito?: boolean;
  categoria_nombre?: string;
  categoria_color?: string;
  tipo_archivo?: string;
}

interface PlantillaSimple {
  id: string;
  nombre: string;
  categoria: string;
  descripcion?: string;
  requiere_firma: boolean;
}

interface ContactoSimple {
  id: string;
  nombre: string;
  email?: string;
  telefono?: string;
}

interface PropiedadSimple {
  id: string;
  titulo: string;
  direccion?: string;
}

interface Firmante {
  nombre: string;
  email: string;
  rol?: string;
}

// ==================== STYLES ====================

const styles = `
.mis-documentos-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Header Actions */
.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn-crear {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-crear:hover {
  background: #1d4ed8;
}

/* Filter Bar */
.filter-bar {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  align-items: center;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  flex: 1;
  max-width: 400px;
}

.search-box input {
  border: none;
  background: transparent;
  outline: none;
  flex: 1;
  font-size: 14px;
}

.filter-tabs {
  display: flex;
  gap: 4px;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 8px;
}

.filter-tab {
  padding: 8px 16px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #64748b;
  transition: all 0.2s;
}

.filter-tab.active {
  background: white;
  color: #1e293b;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.filter-tab .count {
  margin-left: 6px;
  font-size: 12px;
  padding: 2px 6px;
  background: #e2e8f0;
  border-radius: 10px;
}

.filter-tab.active .count {
  background: #2563eb;
  color: white;
}

/* Documents Grid */
.documents-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.document-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  transition: all 0.2s;
}

.document-card:hover {
  border-color: #2563eb;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
}

.doc-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  flex-shrink: 0;
}

.doc-icon.generado {
  background: #dbeafe;
  color: #2563eb;
}

.doc-icon.empresa {
  background: #dcfce7;
  color: #16a34a;
}

.doc-info {
  flex: 1;
  min-width: 0;
}

.doc-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.doc-title {
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.doc-badge.generado {
  background: #dbeafe;
  color: #1d4ed8;
}

.doc-badge.empresa {
  background: #dcfce7;
  color: #15803d;
}

.doc-badge.obligatorio {
  background: #fef3c7;
  color: #b45309;
}

.doc-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #64748b;
}

.doc-meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.doc-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

.doc-status.borrador {
  background: #f1f5f9;
  color: #64748b;
}

.doc-status.pendiente_firma {
  background: #fef3c7;
  color: #b45309;
}

.doc-status.firmado {
  background: #dcfce7;
  color: #15803d;
}

.doc-status.disponible {
  background: #f0f9ff;
  color: #0369a1;
}

.doc-status.obligatorio {
  background: #fef3c7;
  color: #b45309;
}

.doc-status.confirmado {
  background: #dcfce7;
  color: #15803d;
}

.doc-actions {
  display: flex;
  gap: 8px;
}

.btn-action {
  padding: 8px;
  border: none;
  background: #f1f5f9;
  border-radius: 8px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;
}

.btn-action:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.btn-action.primary {
  background: #2563eb;
  color: white;
}

.btn-action.primary:hover {
  background: #1d4ed8;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
}

.empty-state svg {
  margin-bottom: 16px;
  color: #cbd5e1;
}

.empty-state h3 {
  font-size: 18px;
  color: #1e293b;
  margin-bottom: 8px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-content.large {
  max-width: 1000px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
}

.modal-close {
  padding: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #64748b;
  border-radius: 8px;
}

.modal-close:hover {
  background: #f1f5f9;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
}

/* Creation Wizard */
.creation-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.creation-option {
  padding: 24px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;
}

.creation-option:hover {
  border-color: #2563eb;
  background: #f0f9ff;
}

.creation-option.selected {
  border-color: #2563eb;
  background: #eff6ff;
}

.creation-option svg {
  margin-bottom: 12px;
  color: #2563eb;
}

.creation-option h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.creation-option p {
  font-size: 13px;
  color: #64748b;
}

/* Steps */
.wizard-steps {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
}

.wizard-step {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-number {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 600;
  background: #e2e8f0;
  color: #64748b;
}

.step-number.active {
  background: #2563eb;
  color: white;
}

.step-number.completed {
  background: #16a34a;
  color: white;
}

.step-label {
  font-size: 13px;
  color: #64748b;
}

.step-label.active {
  color: #1e293b;
  font-weight: 500;
}

.step-divider {
  width: 40px;
  height: 2px;
  background: #e2e8f0;
}

/* Plantillas Grid */
.plantillas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.plantilla-card {
  padding: 16px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.plantilla-card:hover {
  border-color: #2563eb;
}

.plantilla-card.selected {
  border-color: #2563eb;
  background: #eff6ff;
}

.plantilla-card h4 {
  font-weight: 600;
  margin-bottom: 4px;
}

.plantilla-card p {
  font-size: 13px;
  color: #64748b;
}

.plantilla-card .categoria {
  display: inline-block;
  font-size: 11px;
  padding: 2px 8px;
  background: #f1f5f9;
  border-radius: 4px;
  margin-top: 8px;
}

/* Form */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

/* Buttons */
.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: #2563eb;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-secondary {
  background: #f1f5f9;
  color: #475569;
}

.btn-secondary:hover:not(:disabled) {
  background: #e2e8f0;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Firmantes List */
.firmantes-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.firmante-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.firmante-row input {
  flex: 1;
}

.btn-remove-firmante {
  padding: 10px;
  background: #fee2e2;
  color: #dc2626;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.btn-add-firmante {
  padding: 8px 16px;
  background: #f0f9ff;
  color: #0369a1;
  border: 1px dashed #0369a1;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

/* Preview Frame */
.preview-frame {
  width: 100%;
  height: 400px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

/* Loading */
.loading-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #64748b;
}

.loading-spinner svg {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Search Results */
.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
}

.search-result-item {
  padding: 10px 14px;
  cursor: pointer;
  border-bottom: 1px solid #f1f5f9;
}

.search-result-item:hover {
  background: #f8fafc;
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-container {
  position: relative;
}

/* Responsive */
@media (max-width: 768px) {
  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    max-width: none;
  }

  .document-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .doc-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .creation-options {
    grid-template-columns: 1fr;
  }
}
`;

// ==================== COMPONENT ====================

export default function CrmMisDocumentos() {
  const { tenantActual, isPlatformAdmin } = useAuth();
  const { getToken } = useClerkAuth();
  const { setPageHeader } = usePageHeader();

  // State - Documentos
  const [documentos, setDocumentos] = useState<DocumentoUnificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [totals, setTotals] = useState({ total: 0, generados: 0, empresa: 0 });

  // State - Modal Crear
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [modoCreacion, setModoCreacion] = useState<'plantilla' | 'estatico' | null>(null);
  const [pasoCreacion, setPasoCreacion] = useState(1);
  const [plantillas, setPlantillas] = useState<PlantillaSimple[]>([]);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<PlantillaSimple | null>(null);
  const [contactos, setContactos] = useState<ContactoSimple[]>([]);
  const [contactoSeleccionado, setContactoSeleccionado] = useState<ContactoSimple | null>(null);
  const [busquedaContacto, setBusquedaContacto] = useState('');
  const [showContactoResults, setShowContactoResults] = useState(false);
  const [propiedades, setPropiedades] = useState<PropiedadSimple[]>([]);
  const [propiedadSeleccionada, setPropiedadSeleccionada] = useState<PropiedadSimple | null>(null);
  const [busquedaPropiedad, setBusquedaPropiedad] = useState('');
  const [showPropiedadResults, setShowPropiedadResults] = useState(false);
  const [datosAdicionales, setDatosAdicionales] = useState<Record<string, string>>({});
  const [generando, setGenerando] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // State - Modal Firma
  const [showFirmaModal, setShowFirmaModal] = useState(false);
  const [documentoParaFirmar, setDocumentoParaFirmar] = useState<DocumentoUnificado | null>(null);
  const [firmantes, setFirmantes] = useState<Firmante[]>([{ nombre: '', email: '', rol: '' }]);
  const [enviandoFirma, setEnviandoFirma] = useState(false);

  // ==================== DATA LOADING ====================

  const loadDocumentos = useCallback(async () => {
    if (!tenantActual?.id) return;

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      let url = `/tenants/${tenantActual.id}/documentos/unificados`;
      if (filtroTipo && filtroTipo !== 'todos') {
        url += `?tipo=${filtroTipo}`;
      }

      const response = await apiFetch(url, {}, token);
      const data = await response.json();

      setDocumentos(data.data || []);
      setTotals({
        total: data.total || 0,
        generados: data.totalGenerados || 0,
        empresa: data.totalEmpresa || 0,
      });
    } catch (err: any) {
      console.error('Error cargando documentos:', err);
      setError(err.message || 'Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  }, [tenantActual?.id, getToken, filtroTipo]);

  useEffect(() => {
    loadDocumentos();
  }, [loadDocumentos]);

  const loadPlantillas = useCallback(async () => {
    if (!tenantActual?.id) return;
    try {
      const token = await getToken();
      const res = await apiFetch(
        `/tenants/${tenantActual.id}/documentos/plantillas?activo=true`,
        {},
        token
      );
      const data = await res.json();
      setPlantillas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando plantillas:', err);
    }
  }, [tenantActual?.id, getToken]);

  const searchContactos = useCallback(async (query: string) => {
    if (!tenantActual?.id || query.length < 2) {
      setContactos([]);
      return;
    }
    try {
      const token = await getToken();
      const res = await apiFetch(
        `/tenants/${tenantActual.id}/contactos?busqueda=${encodeURIComponent(query)}&limit=10`,
        {},
        token
      );
      const data = await res.json();
      setContactos(data.data || data || []);
    } catch (err) {
      console.error('Error buscando contactos:', err);
    }
  }, [tenantActual?.id, getToken]);

  const searchPropiedades = useCallback(async (query: string) => {
    if (!tenantActual?.id || query.length < 2) {
      setPropiedades([]);
      return;
    }
    try {
      const token = await getToken();
      const res = await apiFetch(
        `/tenants/${tenantActual.id}/propiedades?busqueda=${encodeURIComponent(query)}&limit=10`,
        {},
        token
      );
      const data = await res.json();
      setPropiedades(data.propiedades || data.data || data || []);
    } catch (err) {
      console.error('Error buscando propiedades:', err);
    }
  }, [tenantActual?.id, getToken]);

  // ==================== PAGE HEADER ====================

  useEffect(() => {
    setPageHeader({
      title: 'Mis Documentos',
      subtitle: 'Todos tus documentos en un solo lugar',
      actions: (
        <div className="header-actions">
          <button onClick={loadDocumentos} className="btn btn-secondary">
            <RefreshCw size={18} />
          </button>
          <button onClick={() => {
            setShowCrearModal(true);
            setModoCreacion(null);
            setPasoCreacion(1);
            setPlantillaSeleccionada(null);
            setContactoSeleccionado(null);
            setPropiedadSeleccionada(null);
            setDatosAdicionales({});
            setPreviewUrl(null);
            loadPlantillas();
          }} className="btn-crear">
            <Plus size={18} />
            Crear Documento
          </button>
        </div>
      ),
    });
  }, [setPageHeader, loadDocumentos, loadPlantillas]);

  // ==================== HANDLERS ====================

  const handleDownload = (doc: DocumentoUnificado) => {
    if (doc.url_documento) {
      window.open(doc.url_documento, '_blank');
    }
  };

  const handleEnviarFirma = (doc: DocumentoUnificado) => {
    setDocumentoParaFirmar(doc);
    setFirmantes([{ nombre: '', email: '', rol: '' }]);
    setShowFirmaModal(true);
  };

  const handleSubmitFirma = async () => {
    if (!documentoParaFirmar || !tenantActual?.id) return;

    const firmantesValidos = firmantes.filter(f => f.nombre && f.email);
    if (firmantesValidos.length === 0) {
      alert('Agrega al menos un firmante con nombre y email');
      return;
    }

    setEnviandoFirma(true);
    try {
      const token = await getToken();
      await apiFetch(
        `/tenants/${tenantActual.id}/documentos/generados/${documentoParaFirmar.id}/enviar-firma`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firmantes: firmantesValidos,
            enviar_email: true,
          }),
        },
        token
      );

      setShowFirmaModal(false);
      loadDocumentos();
      alert('Documento enviado a firma exitosamente');
    } catch (err: any) {
      console.error('Error enviando a firma:', err);
      alert(err.message || 'Error al enviar documento a firma');
    } finally {
      setEnviandoFirma(false);
    }
  };

  const handleConfirmarLectura = async (doc: DocumentoUnificado) => {
    if (!tenantActual?.id) return;
    try {
      const token = await getToken();
      await apiFetch(
        `/tenants/${tenantActual.id}/biblioteca/documentos/${doc.id}/confirmar`,
        { method: 'POST' },
        token
      );
      loadDocumentos();
    } catch (err: any) {
      alert(err.message || 'Error al confirmar lectura');
    }
  };

  const handleGenerarDocumento = async () => {
    if (!tenantActual?.id || !plantillaSeleccionada) return;

    setGenerando(true);
    try {
      const token = await getToken();
      const res = await apiFetch(
        `/tenants/${tenantActual.id}/documentos/generar`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plantilla_id: plantillaSeleccionada.id,
            contacto_id: contactoSeleccionado?.id,
            propiedad_id: propiedadSeleccionada?.id,
            datos_adicionales: datosAdicionales,
          }),
        },
        token
      );
      const data = await res.json();

      setShowCrearModal(false);
      loadDocumentos();

      if (data.url_documento) {
        window.open(data.url_documento, '_blank');
      }
      alert('Documento generado exitosamente');
    } catch (err: any) {
      console.error('Error generando documento:', err);
      alert(err.message || 'Error al generar documento');
    } finally {
      setGenerando(false);
    }
  };

  const handlePreview = async () => {
    if (!tenantActual?.id || !plantillaSeleccionada) return;

    try {
      const token = await getToken();
      const res = await apiFetch(
        `/tenants/${tenantActual.id}/documentos/previsualizar`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plantilla_id: plantillaSeleccionada.id,
            contacto_id: contactoSeleccionado?.id,
            propiedad_id: propiedadSeleccionada?.id,
            datos_adicionales: datosAdicionales,
          }),
        },
        token
      );
      const data = await res.json();
      setPreviewUrl(data.html);
    } catch (err: any) {
      console.error('Error previsualizando:', err);
    }
  };

  // ==================== HELPERS ====================

  const getEstadoInfo = (doc: DocumentoUnificado) => {
    if (doc.tipo === 'generado') {
      switch (doc.estado) {
        case 'borrador':
          return { icon: FileText, color: '#64748b', label: 'Borrador', className: 'borrador' };
        case 'pendiente_firma':
          return { icon: Clock, color: '#f59e0b', label: 'Pendiente Firma', className: 'pendiente_firma' };
        case 'firmado':
          return { icon: CheckCircle, color: '#16a34a', label: 'Firmado', className: 'firmado' };
        default:
          return { icon: FileText, color: '#64748b', label: doc.estado, className: 'borrador' };
      }
    } else {
      if (doc.confirmado) {
        return { icon: CheckCircle, color: '#16a34a', label: 'Confirmado', className: 'confirmado' };
      }
      if (doc.es_obligatorio) {
        return { icon: AlertCircle, color: '#f59e0b', label: 'Obligatorio', className: 'obligatorio' };
      }
      return { icon: FileText, color: '#0369a1', label: 'Disponible', className: 'disponible' };
    }
  };

  const filteredDocumentos = documentos.filter(doc => {
    if (!busqueda) return true;
    return doc.nombre.toLowerCase().includes(busqueda.toLowerCase());
  });

  // ==================== RENDER ====================

  return (
    <>
      <style>{styles}</style>
      <div className="mis-documentos-page">
        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="search-box">
            <Search size={18} color="#64748b" />
            <input
              type="text"
              placeholder="Buscar documentos..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <div className="filter-tabs">
            <button
              className={`filter-tab ${filtroTipo === 'todos' ? 'active' : ''}`}
              onClick={() => setFiltroTipo('todos')}
            >
              Todos
              <span className="count">{totals.total}</span>
            </button>
            <button
              className={`filter-tab ${filtroTipo === 'generado' ? 'active' : ''}`}
              onClick={() => setFiltroTipo('generado')}
            >
              Generados
              <span className="count">{totals.generados}</span>
            </button>
            <button
              className={`filter-tab ${filtroTipo === 'empresa' ? 'active' : ''}`}
              onClick={() => setFiltroTipo('empresa')}
            >
              Empresa
              <span className="count">{totals.empresa}</span>
            </button>
          </div>
        </div>

        {/* Documents List */}
        {loading ? (
          <div className="loading-spinner">
            <Loader2 size={32} />
            <span style={{ marginLeft: 12 }}>Cargando documentos...</span>
          </div>
        ) : error ? (
          <div className="empty-state">
            <AlertCircle size={48} />
            <h3>Error al cargar</h3>
            <p>{error}</p>
            <button onClick={loadDocumentos} className="btn btn-primary" style={{ marginTop: 16 }}>
              Reintentar
            </button>
          </div>
        ) : filteredDocumentos.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} />
            <h3>No hay documentos</h3>
            <p>Crea tu primer documento haciendo clic en el boton</p>
          </div>
        ) : (
          <div className="documents-list">
            {filteredDocumentos.map((doc) => {
              const estadoInfo = getEstadoInfo(doc);
              const EstadoIcon = estadoInfo.icon;

              return (
                <div key={`${doc.tipo}-${doc.id}`} className="document-card">
                  <div className={`doc-icon ${doc.tipo}`}>
                    {doc.tipo === 'generado' ? <FileText size={24} /> : <Building2 size={24} />}
                  </div>

                  <div className="doc-info">
                    <div className="doc-header">
                      <span className="doc-title">{doc.nombre}</span>
                      <span className={`doc-badge ${doc.tipo}`}>
                        {doc.tipo === 'generado' ? 'Generado' : 'Empresa'}
                      </span>
                      {doc.es_obligatorio && !doc.confirmado && (
                        <span className="doc-badge obligatorio">Obligatorio</span>
                      )}
                    </div>
                    <div className="doc-meta">
                      <span className="doc-meta-item">
                        <Clock size={14} />
                        {new Date(doc.fecha).toLocaleDateString('es-ES')}
                      </span>
                      {doc.plantilla_nombre && (
                        <span className="doc-meta-item">
                          <FileText size={14} />
                          {doc.plantilla_nombre}
                        </span>
                      )}
                      {doc.contacto_nombre && (
                        <span className="doc-meta-item">
                          <Users size={14} />
                          {doc.contacto_nombre}
                        </span>
                      )}
                      {doc.propiedad_titulo && (
                        <span className="doc-meta-item">
                          <Home size={14} />
                          {doc.propiedad_titulo}
                        </span>
                      )}
                      {doc.categoria_nombre && (
                        <span className="doc-meta-item" style={{ color: doc.categoria_color }}>
                          {doc.categoria_nombre}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={`doc-status ${estadoInfo.className}`}>
                    <EstadoIcon size={16} />
                    {estadoInfo.label}
                  </div>

                  <div className="doc-actions">
                    {doc.url_documento && (
                      <button
                        className="btn-action"
                        onClick={() => handleDownload(doc)}
                        title="Descargar"
                      >
                        <Download size={18} />
                      </button>
                    )}
                    {doc.tipo === 'generado' && doc.estado === 'borrador' && (
                      <button
                        className="btn-action primary"
                        onClick={() => handleEnviarFirma(doc)}
                        title="Enviar a Firma"
                      >
                        <Send size={18} />
                      </button>
                    )}
                    {doc.tipo === 'empresa' && doc.es_obligatorio && !doc.confirmado && (
                      <button
                        className="btn-action primary"
                        onClick={() => handleConfirmarLectura(doc)}
                        title="Confirmar Lectura"
                      >
                        <FileCheck size={18} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Crear Documento */}
        {showCrearModal && (
          <div className="modal-overlay" onClick={() => setShowCrearModal(false)}>
            <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Crear Documento</h2>
                <button className="modal-close" onClick={() => setShowCrearModal(false)}>
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                {/* Paso 0: Elegir tipo (solo admin) */}
                {!modoCreacion && isPlatformAdmin && (
                  <>
                    <p style={{ marginBottom: 20, color: '#64748b' }}>
                      Selecciona el tipo de documento que deseas crear:
                    </p>
                    <div className="creation-options">
                      <div
                        className="creation-option"
                        onClick={() => {
                          setModoCreacion('plantilla');
                          setPasoCreacion(1);
                        }}
                      >
                        <FileText size={40} />
                        <h3>Desde Plantilla</h3>
                        <p>Genera un documento usando una plantilla existente</p>
                      </div>
                      <div
                        className="creation-option"
                        onClick={() => {
                          // TODO: Implementar subida de documento estatico
                          alert('Funcionalidad en desarrollo. Por ahora, usa Documentos > Configuracion para subir documentos de empresa.');
                        }}
                      >
                        <Building2 size={40} />
                        <h3>Documento de Empresa</h3>
                        <p>Sube un documento estatico (estatutos, politicas, etc.)</p>
                      </div>
                    </div>
                  </>
                )}

                {/* Si no es admin, va directo a plantilla */}
                {!modoCreacion && !isPlatformAdmin && (
                  <>
                    {(() => {
                      setModoCreacion('plantilla');
                      setPasoCreacion(1);
                      return null;
                    })()}
                  </>
                )}

                {/* Wizard de creacion desde plantilla */}
                {modoCreacion === 'plantilla' && (
                  <>
                    {/* Steps indicator */}
                    <div className="wizard-steps">
                      {[1, 2, 3, 4].map((step, idx) => (
                        <div key={step} className="wizard-step">
                          {idx > 0 && <div className="step-divider" />}
                          <span
                            className={`step-number ${pasoCreacion === step ? 'active' : ''} ${pasoCreacion > step ? 'completed' : ''}`}
                          >
                            {pasoCreacion > step ? <CheckCircle size={14} /> : step}
                          </span>
                          <span className={`step-label ${pasoCreacion === step ? 'active' : ''}`}>
                            {step === 1 && 'Plantilla'}
                            {step === 2 && 'Contacto'}
                            {step === 3 && 'Datos'}
                            {step === 4 && 'Generar'}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Paso 1: Seleccionar plantilla */}
                    {pasoCreacion === 1 && (
                      <>
                        <h3 style={{ marginBottom: 16 }}>Selecciona una plantilla</h3>
                        {plantillas.length === 0 ? (
                          <div className="empty-state">
                            <FileText size={40} />
                            <p>No hay plantillas disponibles</p>
                            {isPlatformAdmin && (
                              <p style={{ fontSize: 13 }}>
                                Ve a Configuracion para crear plantillas
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="plantillas-grid">
                            {plantillas.map((p) => (
                              <div
                                key={p.id}
                                className={`plantilla-card ${plantillaSeleccionada?.id === p.id ? 'selected' : ''}`}
                                onClick={() => setPlantillaSeleccionada(p)}
                              >
                                <h4>{p.nombre}</h4>
                                <p>{p.descripcion || 'Sin descripcion'}</p>
                                <span className="categoria">{p.categoria}</span>
                                {p.requiere_firma && (
                                  <span className="categoria" style={{ marginLeft: 8, background: '#fef3c7' }}>
                                    Requiere firma
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {/* Paso 2: Vincular contacto (opcional) */}
                    {pasoCreacion === 2 && (
                      <>
                        <h3 style={{ marginBottom: 16 }}>Vincular contacto (opcional)</h3>
                        <p style={{ marginBottom: 16, color: '#64748b' }}>
                          Selecciona un contacto para autocompletar sus datos en el documento
                        </p>

                        <div className="form-group search-container">
                          <label>Buscar contacto</label>
                          <input
                            type="text"
                            placeholder="Escribe para buscar..."
                            value={busquedaContacto}
                            onChange={(e) => {
                              setBusquedaContacto(e.target.value);
                              searchContactos(e.target.value);
                              setShowContactoResults(true);
                            }}
                            onFocus={() => setShowContactoResults(true)}
                          />
                          {showContactoResults && contactos.length > 0 && (
                            <div className="search-results">
                              {contactos.map((c) => (
                                <div
                                  key={c.id}
                                  className="search-result-item"
                                  onClick={() => {
                                    setContactoSeleccionado(c);
                                    setBusquedaContacto(c.nombre);
                                    setShowContactoResults(false);
                                  }}
                                >
                                  <strong>{c.nombre}</strong>
                                  {c.email && <span style={{ marginLeft: 8, color: '#64748b' }}>{c.email}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {contactoSeleccionado && (
                          <div style={{ padding: 12, background: '#f0f9ff', borderRadius: 8, marginTop: 12 }}>
                            <strong>Contacto seleccionado:</strong> {contactoSeleccionado.nombre}
                            <button
                              onClick={() => {
                                setContactoSeleccionado(null);
                                setBusquedaContacto('');
                              }}
                              style={{ marginLeft: 12, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                              Quitar
                            </button>
                          </div>
                        )}

                        {/* Propiedad (opcional) */}
                        <div className="form-group search-container" style={{ marginTop: 20 }}>
                          <label>Vincular propiedad (opcional)</label>
                          <input
                            type="text"
                            placeholder="Escribe para buscar..."
                            value={busquedaPropiedad}
                            onChange={(e) => {
                              setBusquedaPropiedad(e.target.value);
                              searchPropiedades(e.target.value);
                              setShowPropiedadResults(true);
                            }}
                            onFocus={() => setShowPropiedadResults(true)}
                          />
                          {showPropiedadResults && propiedades.length > 0 && (
                            <div className="search-results">
                              {propiedades.map((p) => (
                                <div
                                  key={p.id}
                                  className="search-result-item"
                                  onClick={() => {
                                    setPropiedadSeleccionada(p);
                                    setBusquedaPropiedad(p.titulo);
                                    setShowPropiedadResults(false);
                                  }}
                                >
                                  <strong>{p.titulo}</strong>
                                  {p.direccion && <span style={{ marginLeft: 8, color: '#64748b' }}>{p.direccion}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {propiedadSeleccionada && (
                          <div style={{ padding: 12, background: '#f0fdf4', borderRadius: 8, marginTop: 12 }}>
                            <strong>Propiedad seleccionada:</strong> {propiedadSeleccionada.titulo}
                            <button
                              onClick={() => {
                                setPropiedadSeleccionada(null);
                                setBusquedaPropiedad('');
                              }}
                              style={{ marginLeft: 12, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                              Quitar
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {/* Paso 3: Datos adicionales */}
                    {pasoCreacion === 3 && (
                      <>
                        <h3 style={{ marginBottom: 16 }}>Datos adicionales</h3>
                        <p style={{ marginBottom: 16, color: '#64748b' }}>
                          Completa los campos requeridos para el documento
                        </p>

                        {/* Campos dinamicos segun plantilla */}
                        <div className="form-group">
                          <label>Notas o comentarios</label>
                          <textarea
                            rows={4}
                            placeholder="Informacion adicional para el documento..."
                            value={datosAdicionales.notas || ''}
                            onChange={(e) => setDatosAdicionales({ ...datosAdicionales, notas: e.target.value })}
                          />
                        </div>
                      </>
                    )}

                    {/* Paso 4: Vista previa y generar */}
                    {pasoCreacion === 4 && (
                      <>
                        <h3 style={{ marginBottom: 16 }}>Vista previa y generar</h3>

                        <div style={{ marginBottom: 16 }}>
                          <p><strong>Plantilla:</strong> {plantillaSeleccionada?.nombre}</p>
                          {contactoSeleccionado && <p><strong>Contacto:</strong> {contactoSeleccionado.nombre}</p>}
                          {propiedadSeleccionada && <p><strong>Propiedad:</strong> {propiedadSeleccionada.titulo}</p>}
                        </div>

                        <button onClick={handlePreview} className="btn btn-secondary" style={{ marginBottom: 16 }}>
                          <Eye size={18} />
                          Ver Vista Previa
                        </button>

                        {previewUrl && (
                          <iframe
                            className="preview-frame"
                            srcDoc={previewUrl}
                            title="Vista previa"
                          />
                        )}
                      </>
                    )}
                  </>
                )}
              </div>

              {modoCreacion === 'plantilla' && (
                <div className="modal-footer">
                  {pasoCreacion > 1 && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => setPasoCreacion(pasoCreacion - 1)}
                    >
                      Anterior
                    </button>
                  )}
                  {pasoCreacion < 4 ? (
                    <button
                      className="btn btn-primary"
                      onClick={() => setPasoCreacion(pasoCreacion + 1)}
                      disabled={pasoCreacion === 1 && !plantillaSeleccionada}
                    >
                      Siguiente
                      <ChevronRight size={18} />
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={handleGenerarDocumento}
                      disabled={generando}
                    >
                      {generando ? <Loader2 size={18} className="spin" /> : <FileText size={18} />}
                      {generando ? 'Generando...' : 'Generar Documento'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Enviar a Firma */}
        {showFirmaModal && documentoParaFirmar && (
          <div className="modal-overlay" onClick={() => setShowFirmaModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Enviar a Firma</h2>
                <button className="modal-close" onClick={() => setShowFirmaModal(false)}>
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                <p style={{ marginBottom: 20 }}>
                  Documento: <strong>{documentoParaFirmar.nombre}</strong>
                </p>

                <h4 style={{ marginBottom: 12 }}>Firmantes</h4>
                <div className="firmantes-list">
                  {firmantes.map((firmante, index) => (
                    <div key={index} className="firmante-row">
                      <input
                        type="text"
                        placeholder="Nombre"
                        value={firmante.nombre}
                        onChange={(e) => {
                          const updated = [...firmantes];
                          updated[index].nombre = e.target.value;
                          setFirmantes(updated);
                        }}
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={firmante.email}
                        onChange={(e) => {
                          const updated = [...firmantes];
                          updated[index].email = e.target.value;
                          setFirmantes(updated);
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Rol (opcional)"
                        value={firmante.rol || ''}
                        onChange={(e) => {
                          const updated = [...firmantes];
                          updated[index].rol = e.target.value;
                          setFirmantes(updated);
                        }}
                        style={{ maxWidth: 150 }}
                      />
                      {firmantes.length > 1 && (
                        <button
                          className="btn-remove-firmante"
                          onClick={() => setFirmantes(firmantes.filter((_, i) => i !== index))}
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  className="btn-add-firmante"
                  onClick={() => setFirmantes([...firmantes, { nombre: '', email: '', rol: '' }])}
                  style={{ marginTop: 12 }}
                >
                  + Agregar firmante
                </button>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowFirmaModal(false)}>
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSubmitFirma}
                  disabled={enviandoFirma}
                >
                  {enviandoFirma ? <Loader2 size={18} /> : <Send size={18} />}
                  {enviandoFirma ? 'Enviando...' : 'Enviar a Firma'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
