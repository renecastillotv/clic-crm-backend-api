/**
 * CrmImportaciones - Importador de Propiedades
 *
 * Página para importar propiedades desde fuentes externas:
 * - Alterestate
 * - EasyBroker (futuro)
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageHeader } from '../../layouts/CrmLayout';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../services/api';
import {
  ArrowLeft,
  Link as LinkIcon,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Download,
  Upload,
  ChevronRight,
  Loader2,
  Info,
  Settings,
  Building,
  Eye,
  Play,
  History,
  Key,
  Trash2,
  Home,
  X,
} from 'lucide-react';

// Interfaces
interface ImportCredential {
  id: string;
  provider: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ImportStats {
  external_source: string;
  total: number;
  disponibles: number;
  ultima_importacion: string;
}

interface RecentImport {
  id: string;
  titulo: string;
  external_id: string;
  external_source: string;
  estado_propiedad: string;
  created_at: string;
}

interface AnalysisResult {
  totalProperties: number;
  sampleProperty: any;
  fieldCoverage: Record<string, number>;
}

interface ImportResult {
  success: number;
  failed: number;
  skipped: number;
  errors: Array<{ cid: number; error: string }>;
  imported: Array<{ id: string; titulo: string; cid: number }>;
}

export default function CrmImportaciones() {
  const navigate = useNavigate();
  const { setPageHeader } = usePageHeader();
  const { tenantActual } = useAuth();

  // Estados
  const [loading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState<ImportCredential[]>([]);
  const [stats, setStats] = useState<ImportStats[]>([]);
  const [recentImports, setRecentImports] = useState<RecentImport[]>([]);

  // Estados para modal de credenciales
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<string>('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savingCredential, setSavingCredential] = useState(false);

  // Estados para importación
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string; count?: number } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importLimit, setImportLimit] = useState(10);
  const [importMode, setImportMode] = useState<'import' | 'sync'>('import');

  useEffect(() => {
    setPageHeader({
      title: 'Importador de Propiedades',
      subtitle: 'Conecta con Alterestate y otros CRM',
      backButton: {
        label: 'Propiedades',
        onClick: () => navigate(-1),
      },
    });
  }, [setPageHeader, navigate]);

  useEffect(() => {
    if (tenantActual?.id) {
      loadData();
    }
  }, [tenantActual?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar credenciales
      const credResponse = await apiFetch(`/import/credentials?tenant_id=${tenantActual?.id}`);
      const credRes = await credResponse.json();
      if (credRes.success) {
        setCredentials(credRes.data);
      }

      // Cargar historial
      const histResponse = await apiFetch(`/import/history?tenant_id=${tenantActual?.id}`);
      const histRes = await histResponse.json();
      if (histRes.success) {
        setStats(histRes.data.statsBySource || []);
        setRecentImports(histRes.data.recentImports || []);
      }
    } catch (error) {
      console.error('Error loading import data:', error);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    try {
      const response = await apiFetch(`/import/alterestate/test?tenant_id=${tenantActual?.id}`);
      const res = await response.json();
      setConnectionStatus({
        success: res.success,
        message: res.message || (res.success ? 'Conexión exitosa' : 'Error de conexión'),
        count: res.totalProperties,
      });
    } catch (error: any) {
      setConnectionStatus({
        success: false,
        message: error.message || 'Error de conexión',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const analyzeProperties = async () => {
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const response = await apiFetch(`/import/alterestate/analyze?tenant_id=${tenantActual?.id}`);
      const res = await response.json();
      if (res.success) {
        setAnalysis(res.data);
      }
    } catch (error) {
      console.error('Error analyzing properties:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const runImport = async () => {
    setImporting(true);
    setImportResult(null);
    try {
      const endpoint = importMode === 'sync'
        ? '/import/alterestate/sync'
        : '/import/alterestate/import';

      const response = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantActual?.id,
          limit: importLimit,
        }),
      });

      const res = await response.json();
      if (res.success) {
        setImportResult(res.data);
        // Recargar datos
        loadData();
      }
    } catch (error) {
      console.error('Error importing properties:', error);
    } finally {
      setImporting(false);
    }
  };

  const saveCredential = async () => {
    if (!apiKeyInput.trim()) {
      alert('Por favor ingresa una API Key');
      return;
    }

    if (!tenantActual?.id) {
      alert('Error: No se encontró el tenant actual');
      return;
    }

    setSavingCredential(true);
    try {
      console.log('Guardando credencial:', { tenant_id: tenantActual.id, provider: editingProvider });

      const response = await apiFetch('/import/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: tenantActual.id,
          provider: editingProvider,
          api_key: apiKeyInput,
          is_active: true,
        }),
      });

      const res = await response.json();
      console.log('Respuesta:', res);

      if (res.success) {
        setShowCredentialModal(false);
        setApiKeyInput('');
        setEditingProvider('');
        loadData();
        alert('Credencial guardada exitosamente');
      } else {
        alert(`Error: ${res.error || 'Error desconocido'}`);
      }
    } catch (error: any) {
      console.error('Error saving credential:', error);
      alert(`Error al guardar: ${error.message || 'Error de conexión'}`);
    } finally {
      setSavingCredential(false);
    }
  };

  const deleteCredential = async (id: string, provider: string) => {
    if (!confirm('¿Desconectar esta integración?')) return;

    try {
      await apiFetch(`/import/credentials/${id}?provider=${provider}`, { method: 'DELETE' });
      loadData();
    } catch (error) {
      console.error('Error deleting credential:', error);
    }
  };

  const alterestateCredential = credentials.find(c => c.provider === 'alterestate');
  const alterestateStats = stats.find(s => s.external_source === 'alterestate');

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '0' }}>
      {/* Estadísticas rápidas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <StatCard
          label="Total Importadas"
          value={stats.reduce((acc, s) => acc + parseInt(s.total as any, 10), 0)}
          icon={<Home size={20} />}
          color="#2563eb"
        />
        <StatCard
          label="Disponibles"
          value={stats.reduce((acc, s) => acc + parseInt(s.disponibles as any, 10), 0)}
          icon={<CheckCircle size={20} />}
          color="#16a34a"
        />
        <StatCard
          label="Fuentes Conectadas"
          value={credentials.filter(c => c.is_active).length}
          icon={<LinkIcon size={20} />}
          color="#8b5cf6"
        />
      </div>

      {/* Tarjeta de Alterestate */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        border: alterestateCredential ? '2px solid #16a34a' : '1px solid #e2e8f0',
        marginBottom: '24px',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          borderBottom: '1px solid #f1f5f9',
        }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: alterestateCredential ? '#dcfce7' : '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: alterestateCredential ? '#16a34a' : '#94a3b8',
          }}>
            <Building size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
              Alterestate
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
              Importa propiedades desde tu cuenta de Alterestate
            </p>
          </div>
          {/* Status badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '20px',
            background: alterestateCredential ? '#dcfce7' : '#f1f5f9',
            color: alterestateCredential ? '#16a34a' : '#64748b',
            fontSize: '12px',
            fontWeight: 600,
          }}>
            {alterestateCredential ? <CheckCircle size={14} /> : <XCircle size={14} />}
            {alterestateCredential ? 'Conectado' : 'No conectado'}
          </div>
        </div>

        {/* Stats de Alterestate */}
        {alterestateStats && (
          <div style={{
            padding: '12px 24px',
            background: '#f8fafc',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            fontSize: '13px',
          }}>
            <div>
              <span style={{ color: '#64748b' }}>Propiedades importadas: </span>
              <strong style={{ color: '#1e293b' }}>{alterestateStats.total}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Disponibles: </span>
              <strong style={{ color: '#16a34a' }}>{alterestateStats.disponibles}</strong>
            </div>
            {alterestateStats.ultima_importacion && (
              <div>
                <span style={{ color: '#64748b' }}>Última importación: </span>
                <strong style={{ color: '#1e293b' }}>
                  {new Date(alterestateStats.ultima_importacion).toLocaleDateString()}
                </strong>
              </div>
            )}
          </div>
        )}

        {/* Acciones */}
        <div style={{ padding: '16px 24px' }}>
          {!alterestateCredential ? (
            <button
              onClick={() => {
                setEditingProvider('alterestate');
                setShowCredentialModal(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <Key size={16} />
              Configurar API Key
            </button>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {/* Test Connection */}
              <button
                onClick={testConnection}
                disabled={testingConnection}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  background: '#f8fafc',
                  color: '#475569',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {testingConnection ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                Probar Conexión
              </button>

              {/* Analyze */}
              <button
                onClick={analyzeProperties}
                disabled={analyzing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  background: '#f8fafc',
                  color: '#475569',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {analyzing ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                Analizar
              </button>

              {/* Import Options */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginLeft: 'auto',
              }}>
                <select
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value as 'import' | 'sync')}
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '13px',
                    background: 'white',
                  }}
                >
                  <option value="import">Solo nuevas</option>
                  <option value="sync">Sincronizar todo</option>
                </select>

                <select
                  value={importLimit}
                  onChange={(e) => setImportLimit(parseInt(e.target.value, 10))}
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '13px',
                    background: 'white',
                  }}
                >
                  <option value="10">10 propiedades</option>
                  <option value="25">25 propiedades</option>
                  <option value="50">50 propiedades</option>
                  <option value="100">100 propiedades</option>
                  <option value="500">500 propiedades</option>
                </select>

                <button
                  onClick={runImport}
                  disabled={importing}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {importing ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  Importar
                </button>
              </div>

              {/* Delete credential */}
              <button
                onClick={() => alterestateCredential && deleteCredential(alterestateCredential.id, 'alterestate')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  background: '#fef2f2',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={16} />
                Eliminar
              </button>
            </div>
          )}
        </div>

        {/* Connection Status */}
        {connectionStatus && (
          <div style={{
            padding: '16px 24px',
            background: connectionStatus.success ? '#f0fdf4' : '#fef2f2',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            {connectionStatus.success ? (
              <CheckCircle size={20} color="#16a34a" />
            ) : (
              <AlertTriangle size={20} color="#dc2626" />
            )}
            <div>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: connectionStatus.success ? '#16a34a' : '#dc2626' }}>
                {connectionStatus.message}
              </p>
              {connectionStatus.count !== undefined && (
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                  {connectionStatus.count} propiedades disponibles en Alterestate
                </p>
              )}
            </div>
          </div>
        )}

        {/* Analysis Results */}
        {analysis && (
          <div style={{
            padding: '16px 24px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
          }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
              Análisis de propiedades ({analysis.totalProperties} encontradas)
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '12px',
            }}>
              {Object.entries(analysis.fieldCoverage).map(([field, coverage]) => (
                <div key={field} style={{
                  background: 'white',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                    {field}
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: coverage >= 80 ? '#16a34a' : coverage >= 50 ? '#f59e0b' : '#dc2626',
                  }}>
                    {coverage}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Import Results */}
        {importResult && (
          <div style={{
            padding: '16px 24px',
            background: '#f0fdf4',
            borderTop: '1px solid #e2e8f0',
          }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
              Resultado de importación
            </h4>
            <div style={{ display: 'flex', gap: '24px', fontSize: '14px' }}>
              <div>
                <span style={{ color: '#16a34a' }}>✓ Exitosas: </span>
                <strong>{importResult.success}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>⏭ Omitidas: </span>
                <strong>{importResult.skipped}</strong>
              </div>
              <div>
                <span style={{ color: '#dc2626' }}>✕ Fallidas: </span>
                <strong>{importResult.failed}</strong>
              </div>
            </div>
            {importResult.errors.length > 0 && (
              <div style={{ marginTop: '12px', fontSize: '13px', color: '#dc2626' }}>
                <strong>Errores:</strong>
                <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                  {importResult.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>CID {err.cid}: {err.error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Importaciones recientes */}
      {recentImports.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <History size={20} color="#64748b" />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>
              Importaciones Recientes
            </h3>
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {recentImports.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '12px 24px',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <Home size={16} color="#64748b" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
                    {item.titulo}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {item.external_source} • ID: {item.external_id}
                  </div>
                </div>
                <div style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 500,
                  background: item.estado_propiedad === 'disponible' ? '#dcfce7' : '#f1f5f9',
                  color: item.estado_propiedad === 'disponible' ? '#16a34a' : '#64748b',
                }}>
                  {item.estado_propiedad}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {new Date(item.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de credenciales */}
      {showCredentialModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            margin: '20px',
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
                Configurar {editingProvider === 'alterestate' ? 'Alterestate' : editingProvider}
              </h3>
              <button
                onClick={() => setShowCredentialModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#64748b',
                }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#475569',
                  marginBottom: '8px',
                }}>
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Ingresa tu API Key..."
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div style={{
                background: '#f8fafc',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '24px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <Info size={16} color="#64748b" style={{ marginTop: '2px' }} />
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    Puedes obtener tu API Key desde tu cuenta de Alterestate en Configuración &gt; API &gt; Tokens.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowCredentialModal(false)}
                  style={{
                    padding: '10px 20px',
                    background: '#f8fafc',
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={saveCredential}
                  disabled={savingCredential || !apiKeyInput.trim()}
                  style={{
                    padding: '10px 20px',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    opacity: savingCredential || !apiKeyInput.trim() ? 0.6 : 1,
                  }}
                >
                  {savingCredential ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}

// Componente de tarjeta de estadísticas
function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    }}>
      <div style={{
        width: '44px',
        height: '44px',
        borderRadius: '10px',
        background: `${color}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>
          {label}
        </div>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>
          {value}
        </div>
      </div>
    </div>
  );
}
