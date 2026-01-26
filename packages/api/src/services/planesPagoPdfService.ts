/**
 * Servicio para generar PDF de planes de pago
 */

import PDFDocument from 'pdfkit';
import { PlanPago } from './planesPagoService.js';
import { query } from '../utils/db.js';

interface TenantInfo {
  nombre: string;
  logo_url?: string;
  isotipo_url?: string;
  telefono_principal?: string;
  email_principal?: string;
  direccion?: string;
  ciudad?: string;
  pais?: string;
  tipo?: string;
}

interface UsuarioInfo {
  nombre: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  titulo_profesional?: string;
}

/**
 * Obtiene información del tenant para el PDF
 * Estructura de info_negocio:
 * - logo, isotipo, logoBlanco
 * - nombreComercial
 * - contacto: { telefono, email, whatsapp }
 * - ubicacion: { ciudad, pais, direccion, provincia }
 */
async function getTenantInfo(tenantId: string): Promise<TenantInfo | null> {
  try {
    const result = await query(
      `SELECT nombre, tipo, info_negocio FROM tenants WHERE id = $1`,
      [tenantId]
    );
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const info = row.info_negocio || {};
    const contacto = info.contacto || {};
    const ubicacion = info.ubicacion || {};

    return {
      nombre: info.nombreComercial || info.nombre || row.nombre,
      logo_url: info.logo,
      isotipo_url: info.isotipo,
      telefono_principal: contacto.telefono,
      email_principal: contacto.email,
      direccion: ubicacion.direccion,
      ciudad: ubicacion.ciudad,
      pais: ubicacion.pais,
      tipo: row.tipo,
    };
  } catch {
    return null;
  }
}

/**
 * Obtiene información del usuario creador del plan
 */
async function getUsuarioInfo(usuarioId: string): Promise<UsuarioInfo | null> {
  if (!usuarioId) return null;
  try {
    const result = await query(
      `SELECT u.nombre, u.apellido, u.email, u.telefono, pa.titulo_profesional
       FROM usuarios u
       LEFT JOIN perfiles_asesor pa ON pa.usuario_id = u.id
       WHERE u.id = $1`,
      [usuarioId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0];
  } catch {
    return null;
  }
}

/**
 * Descarga una imagen desde URL y la convierte a buffer
 */
async function fetchImageAsBuffer(url: string): Promise<Buffer | null> {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

/**
 * Genera un PDF del plan de pago
 */
export async function generarPdfPlanPago(plan: PlanPago): Promise<Buffer> {
  // Obtener info adicional
  const tenantInfo = await getTenantInfo(plan.tenant_id);
  const usuarioInfo = plan.usuario_creador_id ? await getUsuarioInfo(plan.usuario_creador_id) : null;

  // Determinar si es Connect (sin branding)
  const isConnect = tenantInfo?.tipo === 'connect';

  // Descargar logo si existe y no es Connect
  let logoBuffer: Buffer | null = null;
  if (!isConnect && tenantInfo?.logo_url) {
    logoBuffer = await fetchImageAsBuffer(tenantInfo.logo_url);
  }

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 50, bottom: 80, left: 50, right: 50 },
        bufferPages: true,
        info: {
          Title: plan.titulo || 'Plan de Pago',
          Author: tenantInfo?.nombre || 'CRM',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Colores
      const primaryColor = '#1e40af';
      const textColor = '#1f2937';
      const lightGray = '#f3f4f6';
      const borderColor = '#e5e7eb';
      const mutedColor = '#6b7280';

      // Page dimensions
      const pageWidth = 612;
      const marginLeft = 50;
      const contentWidth = pageWidth - 100;
      const maxContentY = 680; // Leave space for footer

      // Helper to check if we need a new page
      const checkNewPage = (neededSpace: number = 50) => {
        if (doc.y > maxContentY - neededSpace) {
          doc.addPage();
          return true;
        }
        return false;
      };

      // ============================================
      // HEADER CON BRANDING (si no es Connect)
      // ============================================
      let headerHeight = 50;

      if (!isConnect && tenantInfo) {
        const headerY = 30;

        // Logo en la izquierda
        if (logoBuffer) {
          try {
            doc.image(logoBuffer, marginLeft, headerY, { height: 45 });
          } catch {
            // Si falla el logo, continuar sin él
          }
        }

        // Información de contacto en la derecha (estilo hoja membretada)
        const rightX = pageWidth - marginLeft - 200;
        doc.fontSize(12).fillColor(primaryColor).text(
          tenantInfo.nombre,
          rightX,
          headerY,
          { width: 200, align: 'right' }
        );

        const contactParts: string[] = [];
        if (tenantInfo.telefono_principal) contactParts.push(tenantInfo.telefono_principal);
        if (tenantInfo.email_principal) contactParts.push(tenantInfo.email_principal);

        if (contactParts.length > 0) {
          doc.fontSize(8).fillColor(mutedColor);
          let contactY = headerY + 16;
          for (const part of contactParts) {
            doc.text(part, rightX, contactY, { width: 200, align: 'right' });
            contactY += 10;
          }
        }

        const locationParts = [tenantInfo.ciudad, tenantInfo.pais].filter(Boolean);
        if (locationParts.length > 0) {
          doc.fontSize(8).fillColor(mutedColor).text(
            locationParts.join(', '),
            rightX,
            headerY + 38,
            { width: 200, align: 'right' }
          );
        }

        // Línea separadora del header
        doc.moveTo(marginLeft, 85).lineTo(pageWidth - marginLeft, 85).strokeColor(borderColor).stroke();
        headerHeight = 95;
      }

      doc.y = headerHeight;

      // ============================================
      // TÍTULO DEL DOCUMENTO
      // ============================================
      doc.fontSize(22).fillColor(primaryColor).text('Plan de Pago', marginLeft, doc.y, {
        align: 'center',
        width: contentWidth
      });

      if (plan.titulo) {
        doc.moveDown(0.2);
        doc.fontSize(10).fillColor(mutedColor).text(plan.titulo, marginLeft, doc.y, {
          align: 'center',
          width: contentWidth
        });
      }
      doc.moveDown(1.2);

      // ============================================
      // INFO PROPIEDAD Y CLIENTE (en dos columnas)
      // ============================================
      const infoStartY = doc.y;
      const colWidth = (contentWidth - 30) / 2;

      // Columna izquierda - Propiedad
      if (plan.propiedad) {
        doc.fontSize(8).fillColor(mutedColor).text('PROPIEDAD', marginLeft, infoStartY);
        doc.fontSize(10).fillColor(textColor).text(
          truncateText(plan.propiedad.titulo || '-', 40),
          marginLeft,
          infoStartY + 12,
          { width: colWidth }
        );
        if (plan.propiedad.codigo) {
          doc.fontSize(8).fillColor(mutedColor).text(
            `Código: ${plan.propiedad.codigo}`,
            marginLeft,
            infoStartY + 26
          );
        }
      }

      // Columna derecha - Cliente
      const rightColX = marginLeft + colWidth + 30;
      if (plan.contacto) {
        doc.fontSize(8).fillColor(mutedColor).text('CLIENTE', rightColX, infoStartY);
        const nombreCompleto = [plan.contacto.nombre, plan.contacto.apellido].filter(Boolean).join(' ');
        doc.fontSize(10).fillColor(textColor).text(
          nombreCompleto || '-',
          rightColX,
          infoStartY + 12,
          { width: colWidth }
        );

        let contactY = infoStartY + 26;
        if (plan.contacto.email) {
          doc.fontSize(8).fillColor(mutedColor).text(plan.contacto.email, rightColX, contactY);
          contactY += 10;
        }
        if (plan.contacto.telefono) {
          doc.fontSize(8).fillColor(mutedColor).text(plan.contacto.telefono, rightColX, contactY);
        }
      }

      doc.y = infoStartY + 55;

      // Línea separadora
      doc.moveTo(marginLeft, doc.y).lineTo(pageWidth - marginLeft, doc.y).strokeColor(borderColor).stroke();
      doc.y += 15;

      // ============================================
      // PRECIO TOTAL
      // ============================================
      doc.fontSize(12).fillColor(textColor).text('Precio Total:', marginLeft, doc.y);
      doc.fontSize(20).fillColor(primaryColor).text(formatMoney(plan.precio_total, plan.moneda), marginLeft, doc.y + 15);
      doc.y += 50;

      // ============================================
      // TABLA DE DESGLOSE
      // ============================================
      const detalle = plan.plan_detalle || {};
      const valoresCalc = detalle.valores_calculados || {};

      const tableTop = doc.y;
      const rowHeight = 26;
      const tableWidth = contentWidth;

      // Header de tabla
      doc.rect(marginLeft, tableTop, tableWidth, rowHeight).fillColor(lightGray).fill();
      doc.fontSize(9).fillColor(mutedColor);
      doc.text('CONCEPTO', marginLeft + 10, tableTop + 8, { lineBreak: false });
      doc.text('DETALLE', marginLeft + 180, tableTop + 8, { lineBreak: false });
      doc.text('MONTO', marginLeft + tableWidth - 100, tableTop + 8, { width: 90, align: 'right', lineBreak: false });

      let currentY = tableTop + rowHeight;

      // Separación
      const separacionInfo = typeof detalle.separacion === 'object' ? detalle.separacion : { tipo: 'valor', valor: detalle.separacion || 0 };
      const separacionMonto = valoresCalc.separacion_monto || (separacionInfo.tipo === 'porcentaje' ? (plan.precio_total * separacionInfo.valor / 100) : separacionInfo.valor) || 0;

      if (separacionMonto > 0) {
        doc.rect(marginLeft, currentY, tableWidth, rowHeight).strokeColor(borderColor).stroke();
        doc.fontSize(10).fillColor(textColor);
        doc.text('Separación', marginLeft + 10, currentY + 8, { lineBreak: false });
        doc.text(separacionInfo.tipo === 'porcentaje' ? `${separacionInfo.valor}%` : 'Valor fijo', marginLeft + 180, currentY + 8, { lineBreak: false });
        doc.text(formatMoney(separacionMonto, plan.moneda), marginLeft + tableWidth - 100, currentY + 8, { width: 90, align: 'right', lineBreak: false });
        currentY += rowHeight;
      }

      // Inicial
      const inicialInfo = typeof detalle.inicial === 'object' ? detalle.inicial : { tipo: 'valor', valor: detalle.inicial || 0 };
      const inicialMonto = valoresCalc.inicial_monto || (inicialInfo.tipo === 'porcentaje' ? (plan.precio_total * inicialInfo.valor / 100) : inicialInfo.valor) || 0;

      if (inicialMonto > 0) {
        doc.rect(marginLeft, currentY, tableWidth, rowHeight).strokeColor(borderColor).stroke();
        doc.fontSize(10).fillColor(textColor);
        doc.text('Inicial', marginLeft + 10, currentY + 8, { lineBreak: false });
        doc.text(inicialInfo.tipo === 'porcentaje' ? `${inicialInfo.valor}%` : 'Valor fijo', marginLeft + 180, currentY + 8, { lineBreak: false });
        doc.text(formatMoney(inicialMonto, plan.moneda), marginLeft + tableWidth - 100, currentY + 8, { width: 90, align: 'right', lineBreak: false });
        currentY += rowHeight;
      }

      // Cuotas mensuales
      const numCuotas = detalle.num_cuotas || 12;
      const cuotaMonto = valoresCalc.cuota_monto || (valoresCalc.total_cuotas ? valoresCalc.total_cuotas / numCuotas : 0);
      const totalCuotas = valoresCalc.total_cuotas || (cuotaMonto * numCuotas);

      if (totalCuotas > 0) {
        doc.rect(marginLeft, currentY, tableWidth, rowHeight).strokeColor(borderColor).stroke();
        doc.fontSize(10).fillColor(textColor);
        doc.text('Cuotas mensuales', marginLeft + 10, currentY + 8, { lineBreak: false });
        doc.text(`${numCuotas} cuotas de ${formatMoney(cuotaMonto, plan.moneda)}`, marginLeft + 180, currentY + 8, { lineBreak: false });
        doc.text(formatMoney(totalCuotas, plan.moneda), marginLeft + tableWidth - 100, currentY + 8, { width: 90, align: 'right', lineBreak: false });
        currentY += rowHeight;
      }

      // Total row
      doc.rect(marginLeft, currentY, tableWidth, rowHeight).fillColor(primaryColor).fill();
      doc.fontSize(11).fillColor('white');
      doc.text('TOTAL A PAGAR', marginLeft + 10, currentY + 8, { lineBreak: false });
      doc.text(formatMoney(plan.precio_total, plan.moneda), marginLeft + tableWidth - 100, currentY + 8, { width: 90, align: 'right', lineBreak: false });

      doc.y = currentY + rowHeight + 20;

      // ============================================
      // CALENDARIO DE PAGOS
      // ============================================
      const cuotasGeneradas = detalle.cuotas_generadas || [];
      if (cuotasGeneradas.length > 0) {
        checkNewPage(100);

        doc.fontSize(12).fillColor(textColor).text('Calendario de Pagos', marginLeft, doc.y, { underline: true });
        doc.y += 15;

        const cuotasAMostrar = cuotasGeneradas.slice(0, 24);
        const cuotaTableTop = doc.y;

        doc.rect(marginLeft, cuotaTableTop, tableWidth, 20).fillColor(lightGray).fill();
        doc.fontSize(8).fillColor(mutedColor);
        doc.text('#', marginLeft + 10, cuotaTableTop + 6, { lineBreak: false });
        doc.text('FECHA', marginLeft + 60, cuotaTableTop + 6, { lineBreak: false });
        doc.text('MONTO', marginLeft + tableWidth - 100, cuotaTableTop + 6, { width: 90, align: 'right', lineBreak: false });

        let cuotaY = cuotaTableTop + 20;

        for (const cuota of cuotasAMostrar) {
          if (cuotaY > maxContentY - 20) {
            doc.addPage();
            cuotaY = 50;
          }

          doc.rect(marginLeft, cuotaY, tableWidth, 18).strokeColor(borderColor).stroke();
          doc.fontSize(9).fillColor(textColor);
          doc.text(String(cuota.numero), marginLeft + 10, cuotaY + 5, { lineBreak: false });
          doc.text(formatDate(cuota.fecha), marginLeft + 60, cuotaY + 5, { lineBreak: false });
          doc.text(formatMoney(cuota.monto, plan.moneda), marginLeft + tableWidth - 100, cuotaY + 5, { width: 90, align: 'right', lineBreak: false });
          cuotaY += 18;
        }

        if (cuotasGeneradas.length > 24) {
          doc.fontSize(8).fillColor(mutedColor).text(
            `... y ${cuotasGeneradas.length - 24} cuotas más`,
            marginLeft + 10,
            cuotaY + 5,
            { lineBreak: false }
          );
          cuotaY += 15;
        }

        doc.y = cuotaY + 10;
      }

      // ============================================
      // CONDICIONES
      // ============================================
      if (plan.condiciones) {
        checkNewPage(80);
        doc.fontSize(11).fillColor(textColor).text('Condiciones', marginLeft, doc.y, { underline: true });
        doc.y += 12;
        doc.fontSize(9).fillColor('#4b5563').text(plan.condiciones, marginLeft, doc.y, {
          width: contentWidth,
          align: 'left',
        });
        doc.y += 15;
      }

      // ============================================
      // PREPARADO POR (si hay usuario creador)
      // ============================================
      if (usuarioInfo || plan.usuario_creador) {
        checkNewPage(100);
        doc.y += 20;
        doc.fontSize(10).fillColor(mutedColor).text('Preparado por:', marginLeft, doc.y);
        doc.y += 12;

        const nombreAsesor = usuarioInfo
          ? `${usuarioInfo.nombre || ''} ${usuarioInfo.apellido || ''}`.trim()
          : plan.usuario_creador
            ? `${plan.usuario_creador.nombre || ''} ${plan.usuario_creador.apellido || ''}`.trim()
            : '';

        if (nombreAsesor) {
          doc.fontSize(11).fillColor(textColor).text(nombreAsesor, marginLeft, doc.y);
          doc.y += 14;
        }

        if (usuarioInfo?.titulo_profesional) {
          doc.fontSize(9).fillColor(mutedColor).text(usuarioInfo.titulo_profesional, marginLeft, doc.y);
          doc.y += 12;
        }

        const contactoAsesor = usuarioInfo?.email || plan.usuario_creador?.email;
        if (contactoAsesor) {
          doc.fontSize(9).fillColor(mutedColor).text(contactoAsesor, marginLeft, doc.y);
          doc.y += 12;
        }

        // Línea para firma
        doc.y += 25;
        doc.moveTo(marginLeft, doc.y).lineTo(marginLeft + 150, doc.y).strokeColor(borderColor).stroke();
        doc.fontSize(8).fillColor(mutedColor).text('Firma', marginLeft, doc.y + 3, { lineBreak: false });
      }

      // ============================================
      // FOOTER EN TODAS LAS PÁGINAS
      // ============================================
      const disclaimer = 'NOTA: Este documento es únicamente de carácter informativo y no constituye un contrato de compraventa ni compromiso legal. Los precios y condiciones presentados son referenciales y están sujetos a cambios sin previo aviso.';
      const dateStr = new Date().toLocaleDateString('es-MX');

      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);

        // Save current position
        const savedY = doc.y;

        // Draw footer line
        doc.moveTo(marginLeft, 695).lineTo(pageWidth - marginLeft, 695).strokeColor(borderColor).stroke();

        // Disclaimer text
        doc.fontSize(7).fillColor('#9ca3af');
        doc.text(disclaimer, marginLeft, 700, {
          width: contentWidth,
          align: 'justify',
          lineBreak: true
        });

        // Page number
        doc.fontSize(8).fillColor('#9ca3af');
        doc.text(
          `Generado el ${dateStr} | Página ${i + 1} de ${range.count}`,
          marginLeft,
          750,
          { width: contentWidth, align: 'center', lineBreak: false }
        );

        // Restore position
        doc.y = savedY;
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function formatMoney(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
