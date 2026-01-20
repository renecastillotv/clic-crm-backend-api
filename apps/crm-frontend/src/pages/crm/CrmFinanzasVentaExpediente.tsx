import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Upload, Eye, CheckCircle2, Circle, RefreshCw, X, Download, FileText, Image, AlertCircle, Calendar
} from 'lucide-react';
import {
  getRequerimientosExpediente,
  getItemsExpediente,
  upsertItemExpediente,
  RequerimientoExpediente,
  ItemExpediente,
} from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useParams } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';

interface CrmFinanzasVentaExpedienteProps {
  ventaId: string;
  venta?: any; // Venta completa para determinar tipo de operación
}

const CrmFinanzasVentaExpediente: React.FC<CrmFinanzasVentaExpedienteProps> = ({
  ventaId,
  venta,
}) => {
  const { tenantActual, user } = useAuth();
  const { getToken } = useClerkAuth();
  const [requerimientos, setRequerimientos] = useState<RequerimientoExpediente[]>([]);
  const [itemsSubidos, setItemsSubidos] = useState<Record<string, ItemExpediente>>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerFile, setViewerFile] = useState<{
    url: string;
    name: string;
    type: string;
    fecha?: string;
    titulo: string;
  } | null>(null);

  useEffect(() => {
    if (ventaId && tenantActual?.id) {
      loadData();
    }
  }, [ventaId, tenantActual?.id]);

  const loadData = async () => {
    if (!tenantActual?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Cargar requerimientos e items en paralelo
      const [reqs, items] = await Promise.all([
        getRequerimientosExpediente(tenantActual.id, ventaId),
        getItemsExpediente(tenantActual.id, ventaId),
      ]);

      // Crear mapa de items por requerimiento_id
      const itemsMap: Record<string, ItemExpediente> = {};
      items.forEach(item => {
        if (item.requerimiento_id) {
          itemsMap[item.requerimiento_id] = item;
        }
      });

      setRequerimientos(reqs);
      setItemsSubidos(itemsMap);
    } catch (error: any) {
      console.error('❌ Error cargando datos:', error);
      setError('Error al cargar datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (requerimiento: RequerimientoExpediente, file: File) => {
    if (!tenantActual?.id) return;

    try {
      setUploading({ ...uploading, [requerimiento.id]: true });
      setError(null);

      // Validar archivo
      if (file.size > requerimiento.tamaño_maximo_archivo) {
        throw new Error(`Archivo demasiado grande. Máximo ${(requerimiento.tamaño_maximo_archivo / 1024 / 1024).toFixed(1)}MB.`);
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (!requerimiento.tipos_archivo_permitidos.includes(fileExt || '')) {
        throw new Error(`Tipo de archivo no permitido. Use: ${requerimiento.tipos_archivo_permitidos.join(', ')}`);
      }

      // Subir archivo usando la ruta de upload del tenant
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', `ventas/${ventaId}/expediente`);

      const token = await getToken();
      const uploadResponse = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/tenants/${tenantActual.id}/upload/file`,
        {
          method: 'POST',
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.message || 'Error al subir archivo');
      }

      const uploadData = await uploadResponse.json();

      // Guardar item en BD
      // El endpoint devuelve { url, key, size } directamente
      // El backend espera snake_case para los campos
      await upsertItemExpediente(tenantActual.id, ventaId, {
        requerimiento_id: requerimiento.id,
        url_documento: uploadData.url,
        ruta_documento: uploadData.key,
        tipo_archivo: file.type,
        tamaño_archivo: file.size,
        nombre_documento: file.name,
        subido_por_id: user?.id || undefined,
      });

      // Recargar datos
      await loadData();
    } catch (error: any) {
      console.error('❌ Error completo en uploadDocument:', error);
      setError(error.message);
    } finally {
      setUploading({ ...uploading, [requerimiento.id]: false });
    }
  };

  const downloadFile = (url: string, fileName: string) => {
    if (!tenantActual?.id) return;

    // Usar endpoint proxy del backend para evitar problemas de CORS con R2
    const downloadUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/tenants/${tenantActual.id}/upload/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(fileName)}`;

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const viewFile = (item: ItemExpediente, requerimiento: RequerimientoExpediente) => {
    if (!item.url_documento) return;
    setViewerFile({
      url: item.url_documento,
      name: item.nombre_documento || requerimiento.titulo,
      type: item.tipo_archivo || 'application/pdf',
      fecha: item.fecha_subida_documento || undefined,
      titulo: requerimiento.titulo,
    });
    setViewerOpen(true);
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setViewerFile(null);
  };

  const getFileIcon = (fileName?: string, fileType?: string) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext || '') || fileType?.startsWith('image/')) {
      return <Image className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  const isImageFile = (fileName?: string, fileType?: string) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext || '') || fileType?.startsWith('image/');
  };

  const isPDFFile = (fileName?: string, fileType?: string) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    return ext === 'pdf' || fileType === 'application/pdf';
  };

  const handleFileSelect = (requerimiento: RequerimientoExpediente, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadDocument(requerimiento, file);
    }
    event.target.value = '';
  };

  const getEstadoItem = (requerimiento: RequerimientoExpediente) => {
    const item = itemsSubidos[requerimiento.id];
    if (!item) return { estado: 'pendiente', texto: 'Sin subir', color: 'text-gray-500' };

    if (item.url_documento) {
      return {
        estado: 'completado',
        texto: 'Subido',
        color: 'text-green-600',
        fecha: item.fecha_subida_documento ? new Date(item.fecha_subida_documento).toLocaleDateString() : '',
        url: item.url_documento,
        nombre_documento: item.nombre_documento,
        tipo_archivo: item.tipo_archivo,
        item,
      };
    }

    return { estado: 'pendiente', texto: 'Pendiente', color: 'text-yellow-600' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <RefreshCw className="w-6 h-6 animate-spin text-orange-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Cargando expediente...</p>
        </div>
      </div>
    );
  }

  const completados = requerimientos.filter(req => itemsSubidos[req.id]?.url_documento).length;
  const obligatorios = requerimientos.filter(req => req.es_obligatorio);
  const obligatoriosCompletos = obligatorios.filter(req => itemsSubidos[req.id]?.url_documento).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header mejorado */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        padding: '24px'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '24px',
          paddingBottom: '20px',
          borderBottom: '2px solid #e2e8f0'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 4px 6px rgba(249, 115, 22, 0.3)'
              }}>
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 700, 
                  color: '#1e293b',
                  margin: 0
                }}>
                  Expediente de Cierre
                </h2>
                <p style={{ 
                  fontSize: '0.875rem', 
                  color: '#64748b',
                  marginTop: '4px',
                  margin: 0
                }}>
                  {completados}/{requerimientos.length} documentos {' • '} {obligatoriosCompletos}/{obligatorios.length} obligatorios
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: 'white',
              color: '#475569',
              fontWeight: 500,
              fontSize: '0.875rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: loading ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }
            }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {/* Progreso mejorado */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
            border: '1px solid #fed7aa',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#9a3412' }}>Progreso General</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#c2410c' }}>
                {requerimientos.length > 0 ? Math.round((completados / requerimientos.length) * 100) : 0}%
              </span>
            </div>
            <div style={{
              width: '100%',
              background: '#f1f5f9',
              borderRadius: '10px',
              height: '12px',
              overflow: 'hidden',
              boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)'
            }}>
              <div
                style={{
                  background: 'linear-gradient(90deg, #f97316 0%, #ea580c 100%)',
                  height: '12px',
                  borderRadius: '10px',
                  transition: 'width 0.5s ease-out',
                  width: `${requerimientos.length > 0 ? (completados / requerimientos.length) * 100 : 0}%`,
                  boxShadow: '0 2px 4px rgba(249, 115, 22, 0.3)'
                }}
              />
            </div>
          </div>

          {obligatorios.length > 0 && (
            <div style={{
              background: obligatoriosCompletos === obligatorios.length
                ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
                : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
              border: `1px solid ${obligatoriosCompletos === obligatorios.length ? '#a7f3d0' : '#fde68a'}`,
              borderRadius: '12px',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: 600, 
                  color: obligatoriosCompletos === obligatorios.length ? '#065f46' : '#92400e'
                }}>
                  Obligatorios
                </span>
                <span style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: 700, 
                  color: obligatoriosCompletos === obligatorios.length ? '#047857' : '#c2410c'
                }}>
                  {Math.round((obligatoriosCompletos / obligatorios.length) * 100)}%
                </span>
              </div>
              <div style={{
                width: '100%',
                background: '#f1f5f9',
                borderRadius: '10px',
                height: '12px',
                overflow: 'hidden',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)'
              }}>
                <div
                  style={{
                    background: obligatoriosCompletos === obligatorios.length
                      ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                      : 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
                    height: '12px',
                    borderRadius: '10px',
                    transition: 'width 0.5s ease-out',
                    width: `${(obligatoriosCompletos / obligatorios.length) * 100}%`,
                    boxShadow: obligatoriosCompletos === obligatorios.length
                      ? '0 2px 4px rgba(16, 185, 129, 0.3)'
                      : '0 2px 4px rgba(245, 158, 11, 0.3)'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Estado mejorado */}
        {obligatorios.length > 0 && (
          <div style={{
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `4px solid ${obligatoriosCompletos === obligatorios.length ? '#10b981' : '#f59e0b'}`,
            background: obligatoriosCompletos === obligatorios.length
              ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
              : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            border: `1px solid ${obligatoriosCompletos === obligatorios.length ? '#a7f3d0' : '#fde68a'}`,
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: obligatoriosCompletos === obligatorios.length ? '#065f46' : '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {obligatoriosCompletos === obligatorios.length ? (
              <>
                <CheckCircle2 className="w-5 h-5" style={{ color: '#10b981' }} />
                <span>Expediente Completo - Comisión Liberada</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5" style={{ color: '#f59e0b' }} />
                <span>Faltan {obligatorios.length - obligatoriosCompletos} documentos obligatorios</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <p className="text-red-800 text-sm">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Lista de requerimientos mejorada */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '2px solid #e2e8f0',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
        }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: '#1e293b',
            margin: 0
          }}>
            Documentos Requeridos
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {requerimientos.map((req, index) => {
            const estado = getEstadoItem(req);
            const isUploading = uploading[req.id];

            return (
              <div 
                key={req.id} 
                style={{
                  padding: '20px 24px',
                  borderBottom: index < requerimientos.length - 1 ? '1px solid #e2e8f0' : 'none',
                  background: estado.estado === 'completado' 
                    ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
                    : 'white',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (estado.estado !== 'completado') {
                    e.currentTarget.style.background = '#f8fafc';
                  }
                }}
                onMouseLeave={(e) => {
                  if (estado.estado !== 'completado') {
                    e.currentTarget.style.background = 'white';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                    {/* Estado visual */}
                    <div style={{ flexShrink: 0 }}>
                      {estado.estado === 'completado' ? (
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)'
                        }}>
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      ) : (
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: '#f1f5f9',
                          border: '2px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#94a3b8'
                        }}>
                          <Circle className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    {/* Contenido */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <h4 style={{
                          fontSize: '0.9375rem',
                          fontWeight: 600,
                          color: '#1e293b',
                          margin: 0
                        }}>
                          {req.titulo}
                        </h4>
                        {req.es_obligatorio && (
                          <span style={{
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            background: '#fef3c7',
                            color: '#92400e',
                            borderRadius: '8px',
                            fontWeight: 600
                          }}>
                            Obligatorio
                          </span>
                        )}
                        <span style={{
                          fontSize: '0.8125rem',
                          fontWeight: 500,
                          color: estado.estado === 'completado' ? '#059669' : '#d97706'
                        }}>
                          {estado.texto}
                        </span>
                        {estado.fecha && (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            {' • '} {estado.fecha}
                          </span>
                        )}
                      </div>

                      {req.descripcion && (
                        <p style={{
                          fontSize: '0.8125rem',
                          color: '#64748b',
                          margin: '4px 0',
                          lineHeight: '1.5'
                        }}>
                          {req.descripcion}
                        </p>
                      )}

                      {req.instrucciones && (
                        <p style={{
                          fontSize: '0.8125rem',
                          color: '#3b82f6',
                          fontStyle: 'italic',
                          margin: '4px 0 0 0'
                        }}>
                          {req.instrucciones}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {estado.url && estado.item && (
                      <>
                        <button
                          onClick={() => viewFile(estado.item!, req)}
                          style={{
                            padding: '8px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            background: 'white',
                            color: '#475569',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f8fafc';
                            e.currentTarget.style.borderColor = '#cbd5e1';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'white';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                          }}
                          title="Ver archivo"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => downloadFile(estado.url!, estado.nombre_documento || `${req.titulo}.pdf`)}
                          style={{
                            padding: '8px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            background: 'white',
                            color: '#475569',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f8fafc';
                            e.currentTarget.style.borderColor = '#cbd5e1';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'white';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                          }}
                          title="Descargar archivo"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    <input
                      type="file"
                      id={`upload-${req.id}`}
                      style={{ display: 'none' }}
                      accept={req.tipos_archivo_permitidos.map(t => `.${t}`).join(',')}
                      onChange={(e) => handleFileSelect(req, e)}
                      disabled={isUploading}
                    />

                    <button
                      onClick={() => document.getElementById(`upload-${req.id}`)?.click()}
                      disabled={isUploading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 16px',
                        borderRadius: '10px',
                        border: 'none',
                        background: estado.estado === 'completado'
                          ? 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)'
                          : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                        color: estado.estado === 'completado' ? '#475569' : 'white',
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        cursor: isUploading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: isUploading ? 0.6 : 1,
                        boxShadow: estado.estado === 'completado' ? 'none' : '0 2px 4px rgba(249, 115, 22, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        if (!isUploading) {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          if (estado.estado !== 'completado') {
                            e.currentTarget.style.boxShadow = '0 4px 6px rgba(249, 115, 22, 0.4)';
                          }
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        if (estado.estado !== 'completado') {
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(249, 115, 22, 0.3)';
                        }
                      }}
                    >
                      {isUploading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          {estado.estado === 'completado' ? 'Actualizar' : 'Subir'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {requerimientos.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">No hay requerimientos configurados para este tipo de operación.</p>
        </div>
      )}

      {/* Modal de visor de documentos - Usando Portal para renderizar fuera del contexto de stacking */}
      {viewerOpen && viewerFile && createPortal(
        <div
          onClick={closeViewer}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 50000,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'calc(100vw - 48px)',
              maxWidth: '1400px',
              height: 'calc(100vh - 48px)',
              maxHeight: '900px',
              display: 'flex',
              flexDirection: 'column',
              background: 'white',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden'
            }}
          >
            {/* Header del modal */}
            <div className="modal-header" style={{ 
              borderBottom: '2px solid #e2e8f0',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  flexShrink: 0
                }}>
                  {getFileIcon(viewerFile.name, viewerFile.type)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    color: '#1e293b',
                    margin: 0,
                    marginBottom: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {viewerFile.titulo}
                  </h3>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#64748b',
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {viewerFile.name}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                <button
                  onClick={() => downloadFile(viewerFile.url, viewerFile.name)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    color: '#475569',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <Download className="w-4 h-4" />
                  Descargar
                </button>
                <button
                  onClick={() => window.open(viewerFile.url, '_blank')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    color: '#475569',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <Eye className="w-4 h-4" />
                  Nueva Pestaña
                </button>
                <button
                  onClick={closeViewer}
                  className="modal-close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contenido del visor */}
            <div className="modal-body" style={{ 
              flex: 1,
              overflow: 'auto',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f8fafc'
            }}>
              {isImageFile(viewerFile.name, viewerFile.type) ? (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px'
                }}>
                  <img
                    src={viewerFile.url}
                    alt={viewerFile.titulo}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      borderRadius: '12px',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
                    }}
                  />
                </div>
              ) : isPDFFile(viewerFile.name, viewerFile.type) ? (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <iframe
                    src={viewerFile.url}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      flex: 1
                    }}
                    title={viewerFile.titulo}
                  />
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  textAlign: 'center',
                  padding: '48px'
                }}>
                  <div>
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 24px',
                      color: '#94a3b8'
                    }}>
                      <FileText className="w-10 h-10" />
                    </div>
                    <h4 style={{
                      fontSize: '1.25rem',
                      fontWeight: 600,
                      color: '#1e293b',
                      marginBottom: '12px'
                    }}>
                      Vista previa no disponible
                    </h4>
                    <p style={{
                      fontSize: '0.9375rem',
                      color: '#64748b',
                      marginBottom: '24px',
                      maxWidth: '400px',
                      margin: '0 auto 24px'
                    }}>
                      Este tipo de archivo no se puede visualizar directamente en el navegador.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                      <button
                        onClick={() => downloadFile(viewerFile.url, viewerFile.name)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '12px 24px',
                          borderRadius: '10px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '0.9375rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: '0 4px 6px rgba(102, 126, 234, 0.25)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 12px rgba(102, 126, 234, 0.35)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 6px rgba(102, 126, 234, 0.25)';
                        }}
                      >
                        <Download className="w-4 h-4" />
                        Descargar Archivo
                      </button>
                      <button
                        onClick={() => window.open(viewerFile.url, '_blank')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '12px 24px',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0',
                          background: 'white',
                          color: '#475569',
                          fontWeight: 500,
                          fontSize: '0.9375rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f8fafc';
                          e.currentTarget.style.borderColor = '#cbd5e1';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.borderColor = '#e2e8f0';
                        }}
                      >
                        <Eye className="w-4 h-4" />
                        Abrir en Nueva Pestaña
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer con info del archivo */}
            {viewerFile.fecha && (
              <div style={{
                padding: '16px 24px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                fontSize: '0.8125rem',
                color: '#64748b',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Calendar className="w-4 h-4" style={{ color: '#94a3b8' }} />
                <span>Subido el {viewerFile.fecha}</span>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CrmFinanzasVentaExpediente;

