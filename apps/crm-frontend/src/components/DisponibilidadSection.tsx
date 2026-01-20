/**
 * DisponibilidadSection - Seccion completa de disponibilidad para proyectos
 *
 * Permite 3 modos:
 * - Enlace externo (URL a portal, Google Drive, etc)
 * - Archivo (PDF o imagen)
 * - Inventario interno (tabla de unidades)
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import UnidadModal, { UnidadProyecto } from './UnidadModal';
import * as XLSX from 'xlsx';

interface DisponibilidadConfig {
  tipo: 'enlace' | 'archivo' | 'inventario';
  enlace_url?: string;
  archivo_url?: string;
  archivo_nombre?: string;
}

interface EstadisticasUnidades {
  total: number;
  disponibles: number;
  reservadas: number;
  bloqueadas: number;
  vendidas: number;
  porcentaje_vendido: number;
}

interface Tipologia {
  id: string;
  nombre: string;
  habitaciones?: number;
  banos?: number;
  m2?: number;
  precio?: number;
  estacionamiento?: number;
}

interface DisponibilidadSectionProps {
  propiedadId: string;
  tipologias?: Tipologia[];
  onUploadFile?: (file: File) => Promise<string>;
}

const Icons = {
  link: (props?: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
    </svg>
  ),
  file: (props?: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
    </svg>
  ),
  table: (props?: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="3" y1="9" x2="21" y2="9"></line>
      <line x1="3" y1="15" x2="21" y2="15"></line>
      <line x1="9" y1="3" x2="9" y2="21"></line>
      <line x1="15" y1="3" x2="15" y2="21"></line>
    </svg>
  ),
  plus: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  ),
  edit: (props?: any) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  ),
  trash: (props?: any) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  ),
  download: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
  ),
  upload: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="17 8 12 3 7 8"></polyline>
      <line x1="12" y1="3" x2="12" y2="15"></line>
    </svg>
  ),
  externalLink: (props?: any) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
      <polyline points="15 3 21 3 21 9"></polyline>
      <line x1="10" y1="14" x2="21" y2="3"></line>
    </svg>
  ),
};

const estadoColors: Record<string, { bg: string; text: string; label: string }> = {
  disponible: { bg: '#dcfce7', text: '#166534', label: 'Disponible' },
  reservada: { bg: '#fef3c7', text: '#92400e', label: 'Reservada' },
  bloqueada: { bg: '#e2e8f0', text: '#475569', label: 'Bloqueada' },
  vendida: { bg: '#fee2e2', text: '#991b1b', label: 'Vendida' },
};

export default function DisponibilidadSection({ propiedadId, tipologias = [], onUploadFile }: DisponibilidadSectionProps) {
  const { tenantActual } = useAuth();
  const tenantId = tenantActual?.id;
  const [config, setConfig] = useState<DisponibilidadConfig>({ tipo: 'inventario' });
  const [unidades, setUnidades] = useState<UnidadProyecto[]>([]);
  const [stats, setStats] = useState<EstadisticasUnidades | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUnidad, setEditingUnidad] = useState<UnidadProyecto | null>(null);
  const [selectedUnidades, setSelectedUnidades] = useState<Set<string>>(new Set());
  const [enlaceUrl, setEnlaceUrl] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  const fetchData = useCallback(async () => {
    if (!tenantId || !propiedadId) return;

    setLoading(true);
    try {
      // Fetch config
      const configRes = await fetch(`${API_URL}/tenants/${tenantId}/propiedades/${propiedadId}/disponibilidad/config`);
      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData);
        setEnlaceUrl(configData.enlace_url || '');
      }

      // Fetch unidades
      const unidadesRes = await fetch(`${API_URL}/tenants/${tenantId}/propiedades/${propiedadId}/unidades`);
      if (unidadesRes.ok) {
        const unidadesData = await unidadesRes.json();
        setUnidades(unidadesData);
      }

      // Fetch stats
      const statsRes = await fetch(`${API_URL}/tenants/${tenantId}/propiedades/${propiedadId}/unidades/stats`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error fetching disponibilidad data:', error);
    } finally {
      setLoading(false);
    }
  }, [tenantId, propiedadId, API_URL]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveConfig = async (newConfig: DisponibilidadConfig) => {
    const url = `${API_URL}/tenants/${tenantId}/propiedades/${propiedadId}/disponibilidad/config`;
    console.log('saveConfig: Sending to', url, 'data:', newConfig);
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      console.log('saveConfig: Response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('saveConfig: Response data:', data);
        setConfig(newConfig);
      } else {
        const errorText = await res.text();
        console.error('saveConfig: Error response:', errorText);
      }
    } catch (error) {
      console.error('Error saving config:', error);
    }
  };

  const handleTipoChange = async (tipo: 'enlace' | 'archivo' | 'inventario') => {
    console.log('handleTipoChange:', tipo, 'tenantId:', tenantId, 'propiedadId:', propiedadId);
    if (!tenantId || !propiedadId) {
      console.error('Missing tenantId or propiedadId');
      return;
    }
    await saveConfig({ ...config, tipo });
  };

  // Helper para normalizar URLs externas (agregar https:// si no tiene protocolo)
  const normalizeExternalUrl = (url: string): string => {
    if (!url) return url;
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  const handleEnlaceSubmit = () => {
    if (enlaceUrl.trim()) {
      saveConfig({ ...config, tipo: 'enlace', enlace_url: enlaceUrl.trim() });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantId) return;

    try {
      // Si hay prop onUploadFile, usarlo; sino, subir directamente
      let url: string;
      if (onUploadFile) {
        url = await onUploadFile(file);
      } else {
        // Subida directa al API - usar endpoint /upload/file con campo 'file' (acepta imágenes y PDFs)
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'disponibilidad');

        const res = await fetch(`${API_URL}/tenants/${tenantId}/upload/file`, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          throw new Error('Error al subir archivo');
        }

        const data = await res.json();
        url = data.url;
      }

      saveConfig({
        ...config,
        tipo: 'archivo',
        archivo_url: url,
        archivo_nombre: file.name,
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error al subir el archivo');
    }
  };

  const handleCreateUnidad = async (data: Partial<UnidadProyecto>) => {
    try {
      const res = await fetch(`${API_URL}/tenants/${tenantId}/propiedades/${propiedadId}/unidades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Error al crear unidad');
        return;
      }

      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('Error creating unidad:', error);
      alert('Error al crear unidad');
    }
  };

  const handleUpdateUnidad = async (data: Partial<UnidadProyecto>) => {
    if (!editingUnidad?.id) return;

    try {
      const res = await fetch(`${API_URL}/tenants/${tenantId}/propiedades/${propiedadId}/unidades/${editingUnidad.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Error al actualizar unidad');
        return;
      }

      setShowModal(false);
      setEditingUnidad(null);
      fetchData();
    } catch (error) {
      console.error('Error updating unidad:', error);
      alert('Error al actualizar unidad');
    }
  };

  const handleDeleteUnidad = async (unidadId: string) => {
    if (!confirm('Estas seguro de eliminar esta unidad?')) return;

    try {
      const res = await fetch(`${API_URL}/tenants/${tenantId}/propiedades/${propiedadId}/unidades/${unidadId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting unidad:', error);
    }
  };

  const handleCambiarEstado = async (unidadId: string, nuevoEstado: string) => {
    try {
      const res = await fetch(`${API_URL}/tenants/${tenantId}/propiedades/${propiedadId}/unidades/${unidadId}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error changing estado:', error);
    }
  };

  const handleCambioMasivo = async (nuevoEstado: string) => {
    if (selectedUnidades.size === 0) return;

    try {
      const res = await fetch(`${API_URL}/tenants/${tenantId}/propiedades/${propiedadId}/unidades/estado-masivo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unidadIds: Array.from(selectedUnidades),
          nuevoEstado,
        }),
      });

      if (res.ok) {
        setSelectedUnidades(new Set());
        fetchData();
      }
    } catch (error) {
      console.error('Error in bulk state change:', error);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch(`${API_URL}/tenants/${tenantId}/propiedades/${propiedadId}/unidades/export`);
      if (res.ok) {
        const data = await res.json();
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Unidades');
        XLSX.writeFile(wb, 'unidades_proyecto.xlsx');
      }
    } catch (error) {
      console.error('Error exporting:', error);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Mapear columnas de Excel a campos de la API
      const unidadesImport = jsonData.map((row: any) => ({
        codigo: row['Codigo'] || row['codigo'] || '',
        tipologia_nombre: row['Tipologia'] || row['tipologia'] || '',
        habitaciones: row['Habitaciones'] || row['habitaciones'],
        banos: row['Banos'] || row['banos'],
        m2: row['M2'] || row['m2'],
        precio: row['Precio'] || row['precio'],
        moneda: row['Moneda'] || row['moneda'] || 'USD',
        torre: row['Torre'] || row['torre'] || '',
        piso: row['Piso'] || row['piso'] || '',
        nivel: row['Nivel'] || row['nivel'] || '',
        estado: (row['Estado'] || row['estado'] || 'disponible').toLowerCase(),
        notas: row['Notas'] || row['notas'] || '',
      }));

      const modo = confirm('Deseas reemplazar todas las unidades existentes? (Cancelar = agregar/actualizar)')
        ? 'reemplazar' : 'agregar';

      const res = await fetch(`${API_URL}/tenants/${tenantId}/propiedades/${propiedadId}/unidades/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unidades: unidadesImport, modo }),
      });

      if (res.ok) {
        const result = await res.json();
        alert(`Importacion completada:\n- Creadas: ${result.creadas}\n- Actualizadas: ${result.actualizadas}\n- Errores: ${result.errores.length}`);
        fetchData();
      }
    } catch (error) {
      console.error('Error importing:', error);
      alert('Error al importar archivo');
    }

    e.target.value = '';
  };

  const toggleSelectAll = () => {
    if (selectedUnidades.size === unidades.length) {
      setSelectedUnidades(new Set());
    } else {
      setSelectedUnidades(new Set(unidades.map(u => u.id!)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedUnidades);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedUnidades(newSet);
  };

  const formatCurrency = (value?: number, moneda?: string) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: moneda || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return <div className="disponibilidad-loading">Cargando...</div>;
  }

  return (
    <div className="disponibilidad-section">
      {/* Selector de tipo */}
      <div className="tipo-selector">
        <button
          className={`tipo-btn ${config.tipo === 'enlace' ? 'active' : ''}`}
          onClick={() => handleTipoChange('enlace')}
        >
          <Icons.link />
          <span>Enlace Externo</span>
        </button>
        <button
          className={`tipo-btn ${config.tipo === 'archivo' ? 'active' : ''}`}
          onClick={() => handleTipoChange('archivo')}
        >
          <Icons.file />
          <span>Archivo</span>
        </button>
        <button
          className={`tipo-btn ${config.tipo === 'inventario' ? 'active' : ''}`}
          onClick={() => handleTipoChange('inventario')}
        >
          <Icons.table />
          <span>Inventario</span>
        </button>
      </div>

      {/* Contenido segun tipo */}
      {config.tipo === 'enlace' && (
        <div className="enlace-config">
          <label>URL del Portal de Disponibilidad</label>
          <div className="enlace-input-row">
            <input
              type="url"
              value={enlaceUrl}
              onChange={(e) => setEnlaceUrl(e.target.value)}
              placeholder="https://portal.ejemplo.com/disponibilidad"
            />
            <button className="btn-save" onClick={handleEnlaceSubmit}>
              Guardar
            </button>
          </div>
          {config.enlace_url && (
            <a href={normalizeExternalUrl(config.enlace_url)} target="_blank" rel="noopener noreferrer" className="enlace-preview">
              <Icons.externalLink />
              <span>Abrir enlace</span>
            </a>
          )}
        </div>
      )}

      {config.tipo === 'archivo' && (
        <div className="archivo-config">
          <label>Archivo de Disponibilidad (PDF o Imagen)</label>
          <div className="archivo-upload">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileUpload}
              id="disponibilidad-file"
              style={{ display: 'none' }}
            />
            <label htmlFor="disponibilidad-file" className="upload-btn">
              <Icons.upload />
              <span>Subir Archivo</span>
            </label>
          </div>
          {config.archivo_url && (
            <div className="archivo-preview">
              <Icons.file />
              <span>{config.archivo_nombre || 'Archivo subido'}</span>
              <a href={config.archivo_url} target="_blank" rel="noopener noreferrer">
                <Icons.externalLink />
              </a>
            </div>
          )}
        </div>
      )}

      {config.tipo === 'inventario' && (
        <div className="inventario-section">
          {/* Stats */}
          {stats && stats.total > 0 && (
            <div className="stats-row">
              <div className="stat-item total">
                <span className="stat-value">{stats.total}</span>
                <span className="stat-label">Total</span>
              </div>
              <div className="stat-item disponible">
                <span className="stat-value">{stats.disponibles}</span>
                <span className="stat-label">Disponibles</span>
              </div>
              <div className="stat-item reservada">
                <span className="stat-value">{stats.reservadas}</span>
                <span className="stat-label">Reservadas</span>
              </div>
              <div className="stat-item bloqueada">
                <span className="stat-value">{stats.bloqueadas}</span>
                <span className="stat-label">Bloqueadas</span>
              </div>
              <div className="stat-item vendida">
                <span className="stat-value">{stats.vendidas}</span>
                <span className="stat-label">Vendidas</span>
              </div>
              <div className="stat-item porcentaje">
                <span className="stat-value">{stats.porcentaje_vendido}%</span>
                <span className="stat-label">Vendido</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="actions-row">
            <button className="btn-primary" onClick={() => { setEditingUnidad(null); setShowModal(true); }}>
              <Icons.plus />
              <span>Agregar Unidad</span>
            </button>

            <div className="import-export">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImport}
                id="import-file"
                style={{ display: 'none' }}
              />
              <label htmlFor="import-file" className="btn-secondary">
                <Icons.upload />
                <span>Importar</span>
              </label>
              <button className="btn-secondary" onClick={handleExport} disabled={unidades.length === 0}>
                <Icons.download />
                <span>Exportar</span>
              </button>
            </div>

            {selectedUnidades.size > 0 && (
              <div className="bulk-actions">
                <span>{selectedUnidades.size} seleccionadas</span>
                <select onChange={(e) => { if (e.target.value) handleCambioMasivo(e.target.value); e.target.value = ''; }}>
                  <option value="">Cambiar estado...</option>
                  <option value="disponible">Disponible</option>
                  <option value="reservada">Reservada</option>
                  <option value="bloqueada">Bloqueada</option>
                  <option value="vendida">Vendida</option>
                </select>
              </div>
            )}
          </div>

          {/* Table */}
          {unidades.length === 0 ? (
            <div className="empty-state">
              <Icons.table style={{ width: 48, height: 48, opacity: 0.3 }} />
              <p>No hay unidades registradas</p>
              <p className="hint">Agrega unidades manualmente o importa desde Excel</p>
            </div>
          ) : (
            <div className="unidades-table-wrapper">
              <table className="unidades-table">
                <thead>
                  <tr>
                    <th className="check-col">
                      <input
                        type="checkbox"
                        checked={selectedUnidades.size === unidades.length}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th>Codigo</th>
                    <th>Tipologia</th>
                    <th className="num-col">Hab</th>
                    <th className="num-col">Banos</th>
                    <th className="num-col">M2</th>
                    <th className="price-col">Precio</th>
                    <th>Estado</th>
                    <th className="actions-col"></th>
                  </tr>
                </thead>
                <tbody>
                  {unidades.map(u => (
                    <tr key={u.id}>
                      <td className="check-col">
                        <input
                          type="checkbox"
                          checked={selectedUnidades.has(u.id!)}
                          onChange={() => toggleSelect(u.id!)}
                        />
                      </td>
                      <td className="codigo-col">{u.codigo}</td>
                      <td>{u.tipologia_nombre || '-'}</td>
                      <td className="num-col">{u.habitaciones ?? '-'}</td>
                      <td className="num-col">{u.banos ?? '-'}</td>
                      <td className="num-col">{u.m2 ?? '-'}</td>
                      <td className="price-col">{formatCurrency(u.precio, u.moneda)}</td>
                      <td>
                        <select
                          className="estado-select"
                          value={u.estado}
                          onChange={(e) => handleCambiarEstado(u.id!, e.target.value)}
                          style={{
                            backgroundColor: estadoColors[u.estado].bg,
                            color: estadoColors[u.estado].text,
                          }}
                        >
                          {Object.entries(estadoColors).map(([key, value]) => (
                            <option key={key} value={key}>{value.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="actions-col">
                        <button
                          className="icon-btn"
                          onClick={() => { setEditingUnidad(u); setShowModal(true); }}
                          title="Editar"
                        >
                          <Icons.edit />
                        </button>
                        <button
                          className="icon-btn danger"
                          onClick={() => handleDeleteUnidad(u.id!)}
                          title="Eliminar"
                        >
                          <Icons.trash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <UnidadModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingUnidad(null); }}
        onSubmit={editingUnidad ? handleUpdateUnidad : handleCreateUnidad}
        initialData={editingUnidad}
        tipologias={tipologias}
      />

      <style>{`
        .disponibilidad-section {
          background: #f8fafc;
          border-radius: 12px;
          padding: 20px;
        }

        .disponibilidad-loading {
          text-align: center;
          padding: 40px;
          color: #64748b;
        }

        .tipo-selector {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }

        .tipo-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          color: #64748b;
        }

        .tipo-btn:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
        }

        .tipo-btn.active {
          border-color: #0f172a;
          background: #0f172a;
          color: white;
        }

        .tipo-btn span {
          font-size: 0.85rem;
          font-weight: 500;
        }

        .enlace-config, .archivo-config {
          background: white;
          padding: 20px;
          border-radius: 12px;
        }

        .enlace-config label, .archivo-config label {
          display: block;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 12px;
        }

        .enlace-input-row {
          display: flex;
          gap: 12px;
        }

        .enlace-input-row input {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.9rem;
        }

        .btn-save {
          padding: 10px 20px;
          background: #0f172a;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
        }

        .enlace-preview {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
          color: #3b82f6;
          text-decoration: none;
          font-size: 0.9rem;
        }

        .enlace-preview:hover {
          text-decoration: underline;
        }

        .archivo-upload {
          margin-bottom: 16px;
        }

        .upload-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }

        .upload-btn:hover {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        .archivo-preview {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #f1f5f9;
          border-radius: 8px;
        }

        .archivo-preview span {
          flex: 1;
          color: #334155;
        }

        .archivo-preview a {
          color: #3b82f6;
        }

        .inventario-section {
          background: white;
          border-radius: 12px;
          padding: 20px;
        }

        .stats-row {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 1px solid #e2e8f0;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 20px;
          border-radius: 8px;
          min-width: 80px;
        }

        .stat-item.total { background: #f1f5f9; }
        .stat-item.disponible { background: #dcfce7; }
        .stat-item.reservada { background: #fef3c7; }
        .stat-item.bloqueada { background: #e2e8f0; }
        .stat-item.vendida { background: #fee2e2; }
        .stat-item.porcentaje { background: #dbeafe; }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #0f172a;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .actions-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: #0f172a;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
        }

        .btn-primary:hover {
          background: #1e293b;
        }

        .btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: #e2e8f0;
          color: #1e293b;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
        }

        .btn-secondary:hover {
          background: #cbd5e1;
        }

        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .import-export {
          display: flex;
          gap: 8px;
          margin-left: auto;
        }

        .bulk-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 16px;
          background: #dbeafe;
          border-radius: 8px;
        }

        .bulk-actions span {
          font-size: 0.85rem;
          color: #1e40af;
          font-weight: 500;
        }

        .bulk-actions select {
          padding: 6px 12px;
          border: 1px solid #93c5fd;
          border-radius: 6px;
          background: white;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #64748b;
        }

        .empty-state p {
          margin: 16px 0 0;
          font-size: 1rem;
        }

        .empty-state .hint {
          font-size: 0.85rem;
          opacity: 0.7;
        }

        .unidades-table-wrapper {
          overflow-x: auto;
        }

        .unidades-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .unidades-table th {
          text-align: left;
          padding: 12px 8px;
          background: #f8fafc;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
          border-bottom: 2px solid #e2e8f0;
        }

        .unidades-table td {
          padding: 12px 8px;
          border-bottom: 1px solid #f1f5f9;
          color: #334155;
        }

        .unidades-table tr:hover {
          background: #f8fafc;
        }

        .check-col {
          width: 40px;
          text-align: center;
        }

        .codigo-col {
          font-weight: 600;
          color: #0f172a;
        }

        .num-col {
          text-align: center;
          width: 60px;
        }

        .price-col {
          text-align: right;
          font-weight: 500;
          white-space: nowrap;
        }

        .estado-select {
          padding: 6px 10px;
          border: none;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
        }

        .actions-col {
          width: 80px;
          white-space: nowrap;
        }

        .icon-btn {
          padding: 6px;
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .icon-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .icon-btn.danger:hover {
          background: #fee2e2;
          color: #dc2626;
        }
      `}</style>
    </div>
  );
}
