/**
 * Página de debug para ver logs del servidor
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../services/api';

interface LogEntry {
  timestamp: string;
  level: 'log' | 'error' | 'warn' | 'info';
  message: string;
  data?: any;
  stack?: string;
}

export default function DebugLogs() {
  const { getToken } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await apiFetch(
        `/debug/logs?recent=300&filter=${encodeURIComponent(filter)}`,
        { method: 'GET' },
        token
      );
      const data = await response.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (error: any) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 2000); // Actualizar cada 2 segundos
      return () => clearInterval(interval);
    }
  }, [autoRefresh, filter]);

  const clearLogs = async () => {
    try {
      const token = await getToken();
      await apiFetch('/debug/logs/clear', { method: 'POST' }, token);
      setLogs([]);
    } catch (error: any) {
      console.error('Error clearing logs:', error);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return '#ef4444';
      case 'warn':
        return '#f59e0b';
      case 'info':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1rem' }}>Logs del Servidor</h1>
      
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Filtrar logs (ej: propiedades, imágenes, documentos)..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            padding: '0.5rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            flex: 1,
          }}
        />
        <button
          onClick={fetchLogs}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          Auto-refresh
        </label>
        <button
          onClick={clearLogs}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Limpiar Logs
        </button>
      </div>

      <div style={{ 
        backgroundColor: '#1e1e1e', 
        color: '#d4d4d4', 
        padding: '1rem', 
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '0.875rem',
        maxHeight: '70vh',
        overflowY: 'auto',
      }}>
        {logs.length === 0 ? (
          <div style={{ color: '#6b7280' }}>No hay logs disponibles</div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              style={{
                marginBottom: '0.5rem',
                padding: '0.5rem',
                borderLeft: `3px solid ${getLevelColor(log.level)}`,
                paddingLeft: '1rem',
              }}
            >
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.25rem' }}>
                <span style={{ color: '#6b7280' }}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span style={{ 
                  color: getLevelColor(log.level),
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                }}>
                  {log.level}
                </span>
              </div>
              <div style={{ color: '#d4d4d4', marginBottom: '0.25rem' }}>
                {log.message}
              </div>
              {log.data && (
                <pre style={{ 
                  marginTop: '0.5rem',
                  padding: '0.5rem',
                  backgroundColor: '#2d2d2d',
                  borderRadius: '4px',
                  overflowX: 'auto',
                  fontSize: '0.75rem',
                }}>
                  {JSON.stringify(log.data, null, 2)}
                </pre>
              )}
              {log.stack && (
                <pre style={{ 
                  marginTop: '0.5rem',
                  padding: '0.5rem',
                  backgroundColor: '#2d2d2d',
                  borderRadius: '4px',
                  overflowX: 'auto',
                  fontSize: '0.75rem',
                  color: '#ef4444',
                }}>
                  {log.stack}
                </pre>
              )}
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
        Mostrando {logs.length} logs (últimos 5 minutos)
      </div>
    </div>
  );
}













