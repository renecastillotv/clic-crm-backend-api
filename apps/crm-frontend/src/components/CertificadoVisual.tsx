/**
 * CertificadoVisual - Componente para renderizar un certificado profesional
 * Incluye QR, firma, sellos y diseño elegante con opciones configurables
 */

import { useRef, forwardRef, useImperativeHandle } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';

export interface CertificadoData {
  codigo_verificacion: string;
  nombre_usuario: string;
  nombre_curso: string;
  nombre_certificado: string;
  nombre_empresa: string;
  fecha_emision: string;
  imagen_template?: string;
  logo_empresa?: string;
  firma_imagen?: string;
  firma_nombre?: string;
  firma_cargo?: string;
  sello_imagen?: string;
  // Opciones de visualización
  mostrar_fecha?: boolean;
  mostrar_qr?: boolean;
  mostrar_codigo?: boolean;
  texto_otorgado?: string;
  texto_curso?: string;
  // Colores personalizables
  color_fondo?: string;
  color_borde?: string;
  color_texto_principal?: string;
  color_texto_secundario?: string;
  color_acento?: string;
  // Layout y diseño
  template_id?: string;
  aspecto?: 'horizontal' | 'cuadrado';
  logo_posicion?: 'top-center' | 'top-left' | 'top-right' | 'bottom-center';
  logo_tamano?: 'small' | 'medium' | 'large';
  firma_posicion?: 'bottom-left' | 'bottom-center' | 'bottom-right' | 'dual';
  borde_estilo?: 'doble' | 'simple' | 'decorativo' | 'ninguno' | 'esquinas';
  borde_grosor?: 'thin' | 'medium' | 'thick';
  fuente_titulo?: 'serif' | 'sans-serif' | 'elegant';
  fuente_cuerpo?: 'serif' | 'sans-serif';
  mostrar_ornamentos?: boolean;
  mostrar_sello?: boolean;
  sello_posicion?: 'qr-lado' | 'firma-lado' | 'esquina';
}

export interface CertificadoVisualRef {
  descargarImagen: () => Promise<void>;
}

interface Props {
  data: CertificadoData;
  verificacionUrl?: string;
  modo?: 'completo' | 'compacto';
}

const CertificadoVisual = forwardRef<CertificadoVisualRef, Props>(({
  data,
  verificacionUrl,
  modo = 'completo'
}, ref) => {
  const certificadoRef = useRef<HTMLDivElement>(null);

  const baseUrl = verificacionUrl || `${window.location.origin}/verificar/${data.codigo_verificacion}`;

  // Valores por defecto para las opciones
  const mostrarFecha = data.mostrar_fecha ?? true;
  const mostrarQR = data.mostrar_qr ?? true;
  const mostrarCodigo = data.mostrar_codigo ?? true;
  const textoOtorgado = data.texto_otorgado || 'Otorgado a';
  const textoCurso = data.texto_curso || 'Por haber completado satisfactoriamente el curso';

  // Colores (con valores por defecto elegantes)
  const colorFondo = data.color_fondo || '#ffffff';
  const colorBorde = data.color_borde || '#c9a227';
  const colorTextoPrincipal = data.color_texto_principal || '#1e3a5f';
  const colorTextoSecundario = data.color_texto_secundario || '#64748b';
  const colorAcento = data.color_acento || '#c9a227';

  // Layout options
  const aspecto = data.aspecto || 'horizontal';
  const logoPosicion = data.logo_posicion || 'top-center';
  const logoTamano = data.logo_tamano || 'medium';
  const firmaPosicion = data.firma_posicion || 'bottom-left';
  const bordeEstilo = data.borde_estilo || 'doble';
  const bordeGrosor = data.borde_grosor || 'medium';
  const fuenteTitulo = data.fuente_titulo || 'serif';
  const fuenteCuerpo = data.fuente_cuerpo || 'sans-serif';
  // Variables de layout para uso futuro en ornamentos
  const _mostrarOrnamentos = data.mostrar_ornamentos ?? true;
  const _mostrarSello = data.mostrar_sello ?? true;
  const _selloPosicion = data.sello_posicion || 'qr-lado';
  // Previene advertencias de TS mientras se implementan
  void _mostrarOrnamentos; void _mostrarSello; void _selloPosicion;

  // Si hay imagen de template, el fondo interior es transparente
  const tieneImagenFondo = !!data.imagen_template;

  // Clases CSS dinámicas
  const certificadoClasses = [
    'certificado-visual',
    modo,
    tieneImagenFondo ? 'con-imagen' : '',
    `aspecto-${aspecto}`,
    `borde-${bordeEstilo}`,
    `borde-grosor-${bordeGrosor}`,
    `logo-${logoPosicion}`,
    `logo-size-${logoTamano}`,
    `firma-${firmaPosicion}`,
    `fuente-titulo-${fuenteTitulo}`,
    `fuente-cuerpo-${fuenteCuerpo}`,
  ].filter(Boolean).join(' ');

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const descargarImagen = async () => {
    if (!certificadoRef.current) return;

    try {
      const canvas = await html2canvas(certificadoRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });

      const link = document.createElement('a');
      link.download = `certificado-${data.codigo_verificacion}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error al generar imagen:', error);
      alert('Error al descargar el certificado');
    }
  };

  useImperativeHandle(ref, () => ({
    descargarImagen,
  }));

  return (
    <div className="certificado-container">
      <div
        ref={certificadoRef}
        className={certificadoClasses}
        style={{
          backgroundImage: tieneImagenFondo ? `url(${data.imagen_template})` : undefined,
          backgroundColor: !tieneImagenFondo ? colorFondo : undefined,
        }}
      >
        {/* Borde decorativo */}
        <div className="certificado-borde" style={{ borderColor: colorBorde }}>
          <div
            className="certificado-borde-interior"
            style={{
              borderColor: colorBorde,
              backgroundColor: tieneImagenFondo ? 'transparent' : colorFondo,
            }}
          >

            {/* Header con logo */}
            <div className="certificado-header">
              {data.logo_empresa ? (
                <img src={data.logo_empresa} alt={data.nombre_empresa} className="logo-empresa" />
              ) : (
                <div className="logo-placeholder" style={{ background: `linear-gradient(135deg, ${colorTextoPrincipal}, ${colorAcento})` }}>
                  {data.nombre_empresa.charAt(0)}
                </div>
              )}
              <div className="empresa-info">
                <h2 className="empresa-nombre" style={{ color: colorTextoPrincipal }}>{data.nombre_empresa}</h2>
              </div>
            </div>

            {/* Titulo del certificado */}
            <div className="certificado-titulo-container">
              <div className="ornamento-superior" style={{ color: colorAcento }}>
                <svg viewBox="0 0 200 20" className="ornamento-svg">
                  <path d="M0,10 Q50,0 100,10 Q150,20 200,10" fill="none" stroke="currentColor" strokeWidth="1"/>
                </svg>
              </div>
              <h1 className="certificado-titulo" style={{ color: colorTextoPrincipal }}>{data.nombre_certificado}</h1>
              <p className="certificado-subtitulo" style={{ color: colorTextoSecundario }}>{textoOtorgado}</p>
            </div>

            {/* Nombre del estudiante */}
            <div className="estudiante-container">
              <h2 className="estudiante-nombre" style={{ color: colorTextoPrincipal }}>{data.nombre_usuario}</h2>
              <div className="linea-decorativa" style={{ background: `linear-gradient(90deg, transparent, ${colorAcento}, transparent)` }}></div>
            </div>

            {/* Descripción */}
            <div className="descripcion-container">
              <p className="descripcion-texto" style={{ color: colorTextoSecundario }}>
                {textoCurso}
              </p>
              <h3 className="curso-nombre" style={{ color: colorTextoPrincipal }}>{data.nombre_curso}</h3>
            </div>

            {/* Fecha */}
            {mostrarFecha && (
              <div className="fecha-container">
                <p className="fecha-texto" style={{ color: colorTextoSecundario }}>
                  Emitido el {formatDate(data.fecha_emision)}
                </p>
              </div>
            )}

            {/* Firma y Sello */}
            <div className="firmas-container">
              <div className="firma-box">
                {data.firma_imagen ? (
                  <img src={data.firma_imagen} alt="Firma" className="firma-imagen" />
                ) : (
                  <div className="firma-linea" style={{ background: colorTextoPrincipal }}></div>
                )}
                <div className="firma-info" style={{ borderTopColor: colorTextoPrincipal }}>
                  <p className="firma-nombre" style={{ color: colorTextoPrincipal }}>{data.firma_nombre || 'Director Académico'}</p>
                  <p className="firma-cargo" style={{ color: colorTextoSecundario }}>{data.firma_cargo || data.nombre_empresa}</p>
                </div>
              </div>

              {(mostrarQR || data.sello_imagen) && (
                <div className="sello-qr-container">
                  {data.sello_imagen && (
                    <img src={data.sello_imagen} alt="Sello" className="sello-imagen" />
                  )}
                  {mostrarQR && (
                    <div className="qr-container">
                      <QRCodeSVG
                        value={baseUrl}
                        size={80}
                        level="M"
                        includeMargin={false}
                        className="qr-code"
                      />
                      <p className="qr-texto" style={{ color: colorTextoSecundario }}>Escanea para verificar</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Código de verificación */}
            {mostrarCodigo && (
              <div className="verificacion-container">
                <p className="verificacion-label" style={{ color: colorTextoSecundario }}>Código de verificación</p>
                <code className="verificacion-codigo" style={{ color: colorTextoPrincipal }}>{data.codigo_verificacion}</code>
                <p className="verificacion-url" style={{ color: colorTextoSecundario }}>{baseUrl}</p>
              </div>
            )}

          </div>
        </div>
      </div>

      <style>{styles}</style>
    </div>
  );
});

CertificadoVisual.displayName = 'CertificadoVisual';

export default CertificadoVisual;

const styles = `
  .certificado-container {
    display: flex;
    justify-content: center;
    padding: 20px;
  }

  .certificado-visual {
    width: 900px;
    background: linear-gradient(145deg, #fefefe 0%, #f8f9fa 100%);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
    position: relative;
    background-size: cover;
    background-position: center;
    padding: 12px;
  }

  .certificado-visual.compacto {
    width: 700px;
  }

  .certificado-borde {
    border: 3px solid;
    padding: 8px;
  }

  .certificado-borde-interior {
    border: 1px solid;
    padding: 25px 35px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .certificado-visual.con-imagen .certificado-borde-interior {
    background: transparent !important;
  }

  .certificado-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 12px;
  }

  .logo-empresa {
    height: 50px;
    width: auto;
    object-fit: contain;
    margin-bottom: 6px;
  }

  .logo-placeholder {
    width: 50px;
    height: 50px;
    background: linear-gradient(135deg, #1e3a5f, #2c5282);
    color: white;
    font-size: 24px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    margin-bottom: 6px;
  }

  .empresa-nombre {
    font-size: 1.1rem;
    font-weight: 600;
    color: #1e3a5f;
    margin: 0;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .certificado-titulo-container {
    text-align: center;
    margin-bottom: 10px;
  }

  .ornamento-superior {
    width: 200px;
    height: 20px;
    margin: 0 auto 10px;
    color: #c9a227;
  }

  .ornamento-svg {
    width: 100%;
    height: 100%;
  }

  .certificado-titulo {
    font-size: 2rem;
    font-weight: 300;
    color: #1e3a5f;
    margin: 0;
    font-family: 'Georgia', serif;
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }

  .certificado-subtitulo {
    font-size: 0.9rem;
    color: #64748b;
    margin: 10px 0 0 0;
    font-style: italic;
  }

  .estudiante-container {
    text-align: center;
    margin-bottom: 10px;
  }

  .estudiante-nombre {
    font-size: 1.8rem;
    font-weight: 400;
    color: #0f172a;
    margin: 0;
    font-family: 'Georgia', serif;
    font-style: italic;
  }

  .linea-decorativa {
    width: 250px;
    height: 1px;
    background: linear-gradient(90deg, transparent, #c9a227, transparent);
    margin: 8px auto 0;
  }

  .descripcion-container {
    text-align: center;
    margin-bottom: 12px;
  }

  .descripcion-texto {
    font-size: 0.9rem;
    color: #475569;
    margin: 0 0 6px 0;
  }

  .curso-nombre {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1e3a5f;
    margin: 0;
  }

  .fecha-container {
    text-align: center;
    margin-bottom: 15px;
  }

  .fecha-texto {
    font-size: 0.85rem;
    color: #64748b;
    margin: 0;
  }

  .firmas-container {
    display: flex;
    justify-content: space-between;
    width: 100%;
    padding: 0 30px;
    margin-bottom: 12px;
  }

  .firma-box {
    text-align: center;
    min-width: 160px;
  }

  .firma-imagen {
    height: 40px;
    width: auto;
    object-fit: contain;
    margin-bottom: 2px;
  }

  .firma-linea {
    width: 150px;
    height: 1px;
    background: #0f172a;
    margin: 0 auto 4px;
  }

  .firma-info {
    border-top: 1px solid #0f172a;
    padding-top: 4px;
  }

  .firma-nombre {
    font-size: 0.8rem;
    font-weight: 600;
    color: #0f172a;
    margin: 0;
  }

  .firma-cargo {
    font-size: 0.7rem;
    color: #64748b;
    margin: 2px 0 0 0;
  }

  .sello-qr-container {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .sello-imagen {
    width: 60px;
    height: 60px;
    object-fit: contain;
    opacity: 0.85;
  }

  .qr-container {
    text-align: center;
  }

  .qr-code {
    border: 1px solid #e2e8f0;
    padding: 2px;
    background: white;
    border-radius: 3px;
  }

  .qr-texto {
    font-size: 0.55rem;
    color: #94a3b8;
    margin: 2px 0 0 0;
  }

  .verificacion-container {
    text-align: center;
    padding-top: 10px;
    border-top: 1px dashed #e2e8f0;
    margin-top: 8px;
  }

  .verificacion-label {
    font-size: 0.6rem;
    color: #94a3b8;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .verificacion-codigo {
    font-size: 0.85rem;
    font-weight: 600;
    color: #1e3a5f;
    font-family: monospace;
    letter-spacing: 0.1em;
  }

  .verificacion-url {
    font-size: 0.55rem;
    color: #94a3b8;
    margin: 2px 0 0 0;
    word-break: break-all;
  }

  /* Responsive */
  @media (max-width: 960px) {
    .certificado-visual {
      width: 100%;
      max-width: 900px;
    }
  }

  @media (max-width: 640px) {
    .certificado-visual {
      min-height: auto;
      padding-bottom: 20px;
    }

    .certificado-borde {
      inset: 8px;
    }

    .certificado-borde-interior {
      padding: 20px;
    }

    .certificado-titulo {
      font-size: 1.5rem;
    }

    .estudiante-nombre {
      font-size: 1.5rem;
    }

    .firmas-container {
      flex-direction: column;
      gap: 24px;
      align-items: center;
      padding: 0;
    }
  }

  /* ============ LAYOUT: ASPECTO ============ */
  .certificado-visual.aspecto-cuadrado {
    width: 600px;
    aspect-ratio: 1;
  }

  .certificado-visual.aspecto-cuadrado.compacto {
    width: 500px;
  }

  .certificado-visual.aspecto-cuadrado .certificado-borde-interior {
    padding: 20px 25px;
  }

  .certificado-visual.aspecto-cuadrado .certificado-titulo {
    font-size: 1.5rem;
  }

  .certificado-visual.aspecto-cuadrado .estudiante-nombre {
    font-size: 1.4rem;
  }

  .certificado-visual.aspecto-cuadrado .curso-nombre {
    font-size: 1rem;
  }

  /* ============ LAYOUT: BORDES ============ */
  .certificado-visual.borde-ninguno .certificado-borde {
    border: none;
    padding: 0;
  }

  .certificado-visual.borde-ninguno .certificado-borde-interior {
    border: none;
  }

  .certificado-visual.borde-simple .certificado-borde {
    border-width: 1px;
    padding: 0;
  }

  .certificado-visual.borde-simple .certificado-borde-interior {
    border: none;
  }

  .certificado-visual.borde-doble .certificado-borde {
    border-width: 3px;
  }

  .certificado-visual.borde-decorativo .certificado-borde {
    border-width: 4px;
    border-style: double;
  }

  .certificado-visual.borde-decorativo .certificado-borde-interior {
    border-width: 2px;
    border-style: dashed;
  }

  .certificado-visual.borde-esquinas .certificado-borde {
    border: none;
    padding: 0;
    position: relative;
  }

  .certificado-visual.borde-esquinas .certificado-borde::before,
  .certificado-visual.borde-esquinas .certificado-borde::after {
    content: '';
    position: absolute;
    width: 40px;
    height: 40px;
    border-color: inherit;
  }

  .certificado-visual.borde-esquinas .certificado-borde::before {
    top: 0;
    left: 0;
    border-top: 3px solid;
    border-left: 3px solid;
  }

  .certificado-visual.borde-esquinas .certificado-borde::after {
    top: 0;
    right: 0;
    border-top: 3px solid;
    border-right: 3px solid;
  }

  .certificado-visual.borde-esquinas .certificado-borde-interior {
    border: none;
    position: relative;
  }

  .certificado-visual.borde-esquinas .certificado-borde-interior::before,
  .certificado-visual.borde-esquinas .certificado-borde-interior::after {
    content: '';
    position: absolute;
    width: 40px;
    height: 40px;
    border-color: inherit;
  }

  .certificado-visual.borde-esquinas .certificado-borde-interior::before {
    bottom: 0;
    left: 0;
    border-bottom: 3px solid;
    border-left: 3px solid;
  }

  .certificado-visual.borde-esquinas .certificado-borde-interior::after {
    bottom: 0;
    right: 0;
    border-bottom: 3px solid;
    border-right: 3px solid;
  }

  /* Grosor del borde */
  .certificado-visual.borde-grosor-thin .certificado-borde {
    border-width: 1px;
    padding: 4px;
  }

  .certificado-visual.borde-grosor-thick .certificado-borde {
    border-width: 5px;
    padding: 12px;
  }

  /* ============ LAYOUT: LOGO POSICION ============ */
  .certificado-visual.logo-top-left .certificado-header {
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    gap: 12px;
  }

  .certificado-visual.logo-top-right .certificado-header {
    flex-direction: row-reverse;
    justify-content: flex-start;
    align-items: center;
    gap: 12px;
  }

  .certificado-visual.logo-bottom-center .certificado-header {
    order: 10;
    margin-bottom: 0;
    margin-top: 12px;
  }

  /* ============ LAYOUT: LOGO TAMANO ============ */
  .certificado-visual.logo-size-small .logo-empresa {
    height: 35px;
  }

  .certificado-visual.logo-size-small .logo-placeholder {
    width: 35px;
    height: 35px;
    font-size: 18px;
  }

  .certificado-visual.logo-size-large .logo-empresa {
    height: 70px;
  }

  .certificado-visual.logo-size-large .logo-placeholder {
    width: 70px;
    height: 70px;
    font-size: 32px;
  }

  /* ============ LAYOUT: FIRMA POSICION ============ */
  .certificado-visual.firma-bottom-center .firmas-container {
    justify-content: center;
  }

  .certificado-visual.firma-bottom-right .firmas-container {
    justify-content: flex-end;
  }

  .certificado-visual.firma-dual .firmas-container {
    justify-content: space-between;
  }

  /* ============ LAYOUT: FUENTES ============ */
  .certificado-visual.fuente-titulo-serif .certificado-titulo,
  .certificado-visual.fuente-titulo-serif .estudiante-nombre {
    font-family: 'Georgia', 'Times New Roman', serif;
  }

  .certificado-visual.fuente-titulo-sans-serif .certificado-titulo,
  .certificado-visual.fuente-titulo-sans-serif .estudiante-nombre {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  }

  .certificado-visual.fuente-titulo-elegant .certificado-titulo,
  .certificado-visual.fuente-titulo-elegant .estudiante-nombre {
    font-family: 'Playfair Display', 'Georgia', serif;
    font-weight: 400;
    letter-spacing: 0.08em;
  }

  .certificado-visual.fuente-cuerpo-serif .descripcion-texto,
  .certificado-visual.fuente-cuerpo-serif .curso-nombre,
  .certificado-visual.fuente-cuerpo-serif .firma-nombre,
  .certificado-visual.fuente-cuerpo-serif .firma-cargo {
    font-family: 'Georgia', 'Times New Roman', serif;
  }

  .certificado-visual.fuente-cuerpo-sans-serif .descripcion-texto,
  .certificado-visual.fuente-cuerpo-sans-serif .curso-nombre,
  .certificado-visual.fuente-cuerpo-sans-serif .firma-nombre,
  .certificado-visual.fuente-cuerpo-sans-serif .firma-cargo {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  }

  /* Print styles */
  @media print {
    .certificado-container {
      padding: 0;
    }

    .certificado-visual {
      width: 100%;
      box-shadow: none;
      page-break-inside: avoid;
    }
  }
`;
