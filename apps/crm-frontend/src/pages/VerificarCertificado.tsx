/**
 * VerificarCertificado - Página pública para verificar certificados
 * Muestra el certificado completo con diseño profesional, QR y opción de descarga
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Award, CheckCircle, XCircle, Search, Download, Share2, Printer } from 'lucide-react';
import CertificadoVisual, { CertificadoVisualRef, CertificadoData } from '../components/CertificadoVisual';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface CertificadoVerificado extends CertificadoData {
  id: string;
  email_usuario?: string;
  campos_personalizados?: Record<string, any>;
}

export default function VerificarCertificado() {
  const { codigo } = useParams<{ codigo?: string }>();
  const [searchParams] = useSearchParams();
  const [inputCodigo, setInputCodigo] = useState(codigo || searchParams.get('codigo') || '');
  const [certificado, setCertificado] = useState<CertificadoVerificado | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [showCertificado, setShowCertificado] = useState(false);
  const certificadoRef = useRef<CertificadoVisualRef>(null);

  useEffect(() => {
    if (codigo) {
      verificar(codigo);
    }
  }, [codigo]);

  // Auto-descarga si viene con ?download=pdf
  useEffect(() => {
    const shouldDownload = searchParams.get('download') === 'pdf';
    if (shouldDownload && certificado && !loading) {
      // Esperar un poco para que se renderice el certificado
      setShowCertificado(true);
      const timer = setTimeout(() => {
        handleDescargar();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [certificado, loading, searchParams]);

  const verificar = async (codigoToVerify: string) => {
    if (!codigoToVerify.trim()) {
      setError('Ingresa un código de verificación');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSearched(true);
      setShowCertificado(false);

      const response = await fetch(`${API_URL}/public/verificar-certificado/${codigoToVerify.trim()}`);

      if (!response.ok) {
        if (response.status === 404) {
          setCertificado(null);
        } else {
          throw new Error('Error al verificar certificado');
        }
      } else {
        const data = await response.json();
        setCertificado(data);
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
      setCertificado(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verificar(inputCodigo);
  };

  const handleDescargar = async () => {
    if (certificadoRef.current) {
      await certificadoRef.current.descargarImagen();
    }
  };

  const handleCompartir = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Certificado de ${certificado?.nombre_usuario}`,
          text: `Verificar certificado: ${certificado?.nombre_certificado}`,
          url: url,
        });
      } catch (err) {
        // Usuario canceló
      }
    } else {
      navigator.clipboard.writeText(url);
      alert('Enlace copiado al portapapeles');
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="verificar-page">
      {/* Modo búsqueda */}
      {!showCertificado && (
        <div className="verificar-container">
          <div className="verificar-header">
            <div className="logo-icon">
              <Award size={40} />
            </div>
            <h1>Verificar Certificado</h1>
            <p>Ingresa el código de verificación para confirmar la autenticidad del certificado</p>
          </div>

          <form onSubmit={handleSubmit} className="search-form">
            <div className="search-input-container">
              <Search size={20} className="search-icon" />
              <input
                type="text"
                value={inputCodigo}
                onChange={(e) => setInputCodigo(e.target.value.toUpperCase())}
                placeholder="Ej: ABCD-1234-EFGH"
                className="search-input"
                maxLength={14}
              />
            </div>
            <button type="submit" className="btn-verificar" disabled={loading}>
              {loading ? 'Verificando...' : 'Verificar'}
            </button>
          </form>

          {error && (
            <div className="error-message">
              <XCircle size={20} />
              {error}
            </div>
          )}

          {searched && !loading && !error && (
            <>
              {certificado ? (
                <div className="resultado-valido">
                  <div className="resultado-header">
                    <CheckCircle size={48} className="icono-valido" />
                    <h2>Certificado Válido</h2>
                    <p>Este certificado es auténtico y fue emitido oficialmente</p>
                  </div>

                  <div className="certificado-resumen">
                    <div className="resumen-item">
                      <span className="resumen-label">Otorgado a</span>
                      <span className="resumen-value">{certificado.nombre_usuario}</span>
                    </div>
                    <div className="resumen-item">
                      <span className="resumen-label">Certificado</span>
                      <span className="resumen-value">{certificado.nombre_certificado}</span>
                    </div>
                    <div className="resumen-item">
                      <span className="resumen-label">Curso</span>
                      <span className="resumen-value">{certificado.nombre_curso}</span>
                    </div>
                    <div className="resumen-item">
                      <span className="resumen-label">Emitido por</span>
                      <span className="resumen-value">{certificado.nombre_empresa}</span>
                    </div>
                    <div className="resumen-item">
                      <span className="resumen-label">Fecha</span>
                      <span className="resumen-value">{formatDate(certificado.fecha_emision)}</span>
                    </div>
                  </div>

                  <button
                    className="btn-ver-certificado"
                    onClick={() => setShowCertificado(true)}
                  >
                    <Award size={20} />
                    Ver Certificado Completo
                  </button>
                </div>
              ) : (
                <div className="resultado-invalido">
                  <div className="resultado-header">
                    <XCircle size={48} className="icono-invalido" />
                    <h2>Certificado No Encontrado</h2>
                    <p>No se encontró ningún certificado con este código de verificación</p>
                  </div>
                  <div className="sugerencias">
                    <h4>Sugerencias:</h4>
                    <ul>
                      <li>Verifica que el código esté escrito correctamente</li>
                      <li>Asegúrate de incluir los guiones (ej: ABCD-1234-EFGH)</li>
                      <li>El código debe tener 12 caracteres alfanuméricos</li>
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="verificar-footer">
            <p>Sistema de verificación de certificados</p>
          </div>
        </div>
      )}

      {/* Modo certificado completo */}
      {showCertificado && certificado && (
        <div className="certificado-fullview">
          <div className="certificado-toolbar no-print">
            <button
              className="btn-toolbar"
              onClick={() => setShowCertificado(false)}
            >
              <Search size={18} />
              Volver
            </button>
            <div className="toolbar-actions">
              <button className="btn-toolbar" onClick={handleDescargar}>
                <Download size={18} />
                Descargar
              </button>
              <button className="btn-toolbar" onClick={handleImprimir}>
                <Printer size={18} />
                Imprimir
              </button>
              <button className="btn-toolbar" onClick={handleCompartir}>
                <Share2 size={18} />
                Compartir
              </button>
            </div>
          </div>

          <div className="certificado-wrapper">
            <CertificadoVisual
              ref={certificadoRef}
              data={certificado}
              verificacionUrl={window.location.href}
            />
          </div>

          <div className="certificado-info-footer no-print">
            <div className="validacion-box">
              <CheckCircle size={24} className="icono-valido" />
              <div>
                <strong>Certificado verificado</strong>
                <p>Este documento digital es auténtico y fue emitido por {certificado.nombre_empresa}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .verificar-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  }

  /* Modo búsqueda */
  .verificar-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 40px 24px;
  }

  .verificar-header {
    text-align: center;
    margin-bottom: 32px;
  }

  .logo-icon {
    width: 80px;
    height: 80px;
    background: linear-gradient(135deg, #fef3c7, #fde68a);
    color: #d97706;
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
  }

  .verificar-header h1 {
    margin: 0 0 8px 0;
    font-size: 1.75rem;
    color: #0f172a;
  }

  .verificar-header p {
    margin: 0;
    color: #64748b;
    font-size: 1rem;
  }

  .search-form {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;
  }

  .search-input-container {
    flex: 1;
    position: relative;
  }

  .search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
  }

  .search-input {
    width: 100%;
    padding: 14px 14px 14px 46px;
    border: 2px solid #e2e8f0;
    border-radius: 10px;
    font-size: 1.125rem;
    font-family: monospace;
    letter-spacing: 0.1em;
    transition: border-color 0.15s;
    background: white;
  }

  .search-input:focus {
    outline: none;
    border-color: #2563eb;
  }

  .btn-verificar {
    padding: 14px 28px;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
    white-space: nowrap;
  }

  .btn-verificar:hover {
    background: #1d4ed8;
  }

  .btn-verificar:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: #fef2f2;
    color: #dc2626;
    border-radius: 8px;
    margin-bottom: 20px;
  }

  .resultado-valido,
  .resultado-invalido {
    background: white;
    border-radius: 16px;
    padding: 32px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
    margin-bottom: 20px;
  }

  .resultado-valido {
    border: 2px solid #86efac;
  }

  .resultado-invalido {
    border: 2px solid #fecaca;
  }

  .resultado-header {
    text-align: center;
    margin-bottom: 24px;
  }

  .icono-valido {
    color: #16a34a;
  }

  .icono-invalido {
    color: #dc2626;
  }

  .resultado-header h2 {
    margin: 12px 0 8px 0;
    font-size: 1.5rem;
    color: #0f172a;
  }

  .resultado-header p {
    margin: 0;
    color: #64748b;
  }

  .certificado-resumen {
    display: grid;
    gap: 16px;
    margin-bottom: 24px;
  }

  .resumen-item {
    display: flex;
    justify-content: space-between;
    padding: 12px 16px;
    background: #f8fafc;
    border-radius: 8px;
  }

  .resumen-label {
    color: #64748b;
    font-size: 0.875rem;
  }

  .resumen-value {
    color: #0f172a;
    font-weight: 500;
    text-align: right;
  }

  .btn-ver-certificado {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 16px;
    background: linear-gradient(135deg, #c9a227, #d4af37);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 1.125rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-ver-certificado:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(201, 162, 39, 0.35);
  }

  .sugerencias {
    padding: 16px;
    background: #f8fafc;
    border-radius: 8px;
  }

  .sugerencias h4 {
    margin: 0 0 12px 0;
    font-size: 0.875rem;
    color: #374151;
  }

  .sugerencias ul {
    margin: 0;
    padding-left: 20px;
    color: #64748b;
    font-size: 0.875rem;
  }

  .sugerencias li {
    margin-bottom: 6px;
  }

  .verificar-footer {
    text-align: center;
    padding-top: 16px;
    color: #94a3b8;
    font-size: 0.875rem;
  }

  /* Modo certificado completo */
  .certificado-fullview {
    min-height: 100vh;
    background: #1e293b;
    padding-bottom: 40px;
  }

  .certificado-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    background: #0f172a;
    border-bottom: 1px solid #334155;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .toolbar-actions {
    display: flex;
    gap: 12px;
  }

  .btn-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: #334155;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-toolbar:hover {
    background: #475569;
  }

  .certificado-wrapper {
    padding: 40px 24px;
    display: flex;
    justify-content: center;
    overflow-x: auto;
  }

  .certificado-info-footer {
    max-width: 900px;
    margin: 0 auto;
    padding: 0 24px;
  }

  .validacion-box {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 20px;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: 12px;
    color: #86efac;
  }

  .validacion-box strong {
    display: block;
    margin-bottom: 4px;
    color: #4ade80;
  }

  .validacion-box p {
    margin: 0;
    font-size: 0.875rem;
    color: #94a3b8;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .search-form {
      flex-direction: column;
    }

    .btn-verificar {
      width: 100%;
    }

    .certificado-toolbar {
      flex-direction: column;
      gap: 12px;
    }

    .toolbar-actions {
      width: 100%;
      justify-content: center;
    }

    .btn-toolbar span {
      display: none;
    }
  }

  /* Print */
  @media print {
    .no-print {
      display: none !important;
    }

    .verificar-page {
      background: white;
    }

    .certificado-fullview {
      background: white;
      padding: 0;
    }

    .certificado-wrapper {
      padding: 0;
    }
  }
`;
