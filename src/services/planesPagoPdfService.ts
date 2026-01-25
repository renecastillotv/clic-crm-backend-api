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
  tipo?: string; // 'connect' para tenants tipo Connect
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

    return {
      nombre: info.nombre || row.nombre,
      logo_url: info.logo_url,
      isotipo_url: info.isotipo_url,
      telefono_principal: info.telefono_principal,
      email_principal: info.email_principal,
      direccion: info.direccion,
      ciudad: info.ciudad,
      pais: info.pais,
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
 * Genera un PDF del plan de pago
 */
export async function generarPdfPlanPago(plan: PlanPago): Promise<Buffer> {
  // Obtener info adicional
  const tenantInfo = await getTenantInfo(plan.tenant_id);
  const usuarioInfo = plan.usuario_creador_id ? await getUsuarioInfo(plan.usuario_creador_id) : null;

  // Determinar si es Connect (sin branding)
  const isConnect = tenantInfo?.tipo === 'connect';

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margin: 50,
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

      // ============================================
      // HEADER CON BRANDING (si no es Connect)
      // ============================================
      if (!isConnect && tenantInfo) {
        // Nombre de la empresa
        doc.fontSize(16).fillColor(primaryColor).text(tenantInfo.nombre, { align: 'left' });

        // Datos de contacto
        const contactInfo = [
          tenantInfo.telefono_principal,
          tenantInfo.email_principal,
          [tenantInfo.ciudad, tenantInfo.pais].filter(Boolean).join(', '),
        ].filter(Boolean);

        if (contactInfo.length > 0) {
          doc.fontSize(8).fillColor(mutedColor).text(contactInfo.join(' | '), { align: 'left' });
        }

        doc.moveDown(1.5);
      }

      // ============================================
      // TÍTULO DEL DOCUMENTO
      // ============================================
      doc.fontSize(22).fillColor(primaryColor).text('Plan de Pago', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor(mutedColor).text(plan.titulo || '', { align: 'center' });
      doc.moveDown(1.5);

      // ============================================
      // INFO PROPIEDAD Y CLIENTE
      // ============================================
      const startY = doc.y;

      // Columna izquierda - Propiedad
      if (plan.propiedad) {
        doc.fontSize(8).fillColor(mutedColor).text('PROPIEDAD', 50, startY);
        doc.fontSize(11).fillColor(textColor).text(plan.propiedad.titulo || '-', 50, startY + 12);
        if (plan.propiedad.codigo) {
          doc.fontSize(9).fillColor(mutedColor).text(`Código: ${plan.propiedad.codigo}`, 50, startY + 26);
        }
      }

      // Columna derecha - Cliente
      if (plan.contacto) {
        doc.fontSize(8).fillColor(mutedColor).text('CLIENTE', 300, startY);
        const nombreCompleto = [plan.contacto.nombre, plan.contacto.apellido].filter(Boolean).join(' ');
        doc.fontSize(11).fillColor(textColor).text(nombreCompleto || '-', 300, startY + 12);
        if (plan.contacto.email) {
          doc.fontSize(9).fillColor(mutedColor).text(plan.contacto.email, 300, startY + 26);
        }
        if (plan.contacto.telefono) {
          doc.fontSize(9).fillColor(mutedColor).text(plan.contacto.telefono, 300, startY + 38);
        }
      }

      doc.y = startY + 55;
      doc.moveDown(0.5);

      // Línea separadora
      doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor(borderColor).stroke();
      doc.moveDown(1);

      // ============================================
      // PRECIO TOTAL
      // ============================================
      doc.fontSize(12).fillColor(textColor).text('Precio Total:', 50);
      doc.fontSize(20).fillColor(primaryColor).text(formatMoney(plan.precio_total, plan.moneda));
      doc.moveDown(1.5);

      // ============================================
      // TABLA DE DESGLOSE
      // ============================================
      const detalle = plan.plan_detalle || {};
      const valoresCalc = detalle.valores_calculados || {};

      const tableTop = doc.y;
      const rowHeight = 28;

      // Header de tabla
      doc.rect(50, tableTop, 512, rowHeight).fillColor(lightGray).fill();
      doc.fontSize(9).fillColor(mutedColor);
      doc.text('CONCEPTO', 60, tableTop + 9);
      doc.text('DETALLE', 250, tableTop + 9);
      doc.text('MONTO', 460, tableTop + 9, { width: 90, align: 'right' });

      let currentY = tableTop + rowHeight;

      // Separación
      const separacionInfo = typeof detalle.separacion === 'object' ? detalle.separacion : { tipo: 'valor', valor: detalle.separacion || 0 };
      const separacionMonto = valoresCalc.separacion_monto || (separacionInfo.tipo === 'porcentaje' ? (plan.precio_total * separacionInfo.valor / 100) : separacionInfo.valor) || 0;

      if (separacionMonto > 0) {
        doc.rect(50, currentY, 512, rowHeight).strokeColor(borderColor).stroke();
        doc.fontSize(10).fillColor(textColor);
        doc.text('Separación', 60, currentY + 9);
        doc.text(separacionInfo.tipo === 'porcentaje' ? `${separacionInfo.valor}%` : 'Valor fijo', 250, currentY + 9);
        doc.text(formatMoney(separacionMonto, plan.moneda), 460, currentY + 9, { width: 90, align: 'right' });
        currentY += rowHeight;
      }

      // Inicial
      const inicialInfo = typeof detalle.inicial === 'object' ? detalle.inicial : { tipo: 'valor', valor: detalle.inicial || 0 };
      const inicialMonto = valoresCalc.inicial_monto || (inicialInfo.tipo === 'porcentaje' ? (plan.precio_total * inicialInfo.valor / 100) : inicialInfo.valor) || 0;

      if (inicialMonto > 0) {
        doc.rect(50, currentY, 512, rowHeight).strokeColor(borderColor).stroke();
        doc.fontSize(10).fillColor(textColor);
        doc.text('Inicial', 60, currentY + 9);
        doc.text(inicialInfo.tipo === 'porcentaje' ? `${inicialInfo.valor}%` : 'Valor fijo', 250, currentY + 9);
        doc.text(formatMoney(inicialMonto, plan.moneda), 460, currentY + 9, { width: 90, align: 'right' });
        currentY += rowHeight;
      }

      // Cuotas mensuales
      const numCuotas = detalle.num_cuotas || 12;
      const cuotaMonto = valoresCalc.cuota_monto || (valoresCalc.total_cuotas ? valoresCalc.total_cuotas / numCuotas : 0);
      const totalCuotas = valoresCalc.total_cuotas || (cuotaMonto * numCuotas);

      if (totalCuotas > 0) {
        doc.rect(50, currentY, 512, rowHeight).strokeColor(borderColor).stroke();
        doc.fontSize(10).fillColor(textColor);
        doc.text('Cuotas mensuales', 60, currentY + 9);
        doc.text(`${numCuotas} cuotas de ${formatMoney(cuotaMonto, plan.moneda)}`, 250, currentY + 9);
        doc.text(formatMoney(totalCuotas, plan.moneda), 460, currentY + 9, { width: 90, align: 'right' });
        currentY += rowHeight;
      }

      // Total
      doc.rect(50, currentY, 512, rowHeight).fillColor(primaryColor).fill();
      doc.fontSize(11).fillColor('white');
      doc.text('TOTAL A PAGAR', 60, currentY + 9);
      doc.text(formatMoney(plan.precio_total, plan.moneda), 460, currentY + 9, { width: 90, align: 'right' });
      currentY += rowHeight;

      doc.y = currentY + 20;

      // ============================================
      // CALENDARIO DE PAGOS
      // ============================================
      const cuotasGeneradas = detalle.cuotas_generadas || [];
      if (cuotasGeneradas.length > 0) {
        doc.moveDown(0.5);
        doc.fontSize(12).fillColor(textColor).text('Calendario de Pagos', { underline: true });
        doc.moveDown(0.5);

        const cuotasAMostrar = cuotasGeneradas.slice(0, 24);
        const cuotaTableTop = doc.y;

        doc.rect(50, cuotaTableTop, 512, 22).fillColor(lightGray).fill();
        doc.fontSize(8).fillColor(mutedColor);
        doc.text('#', 60, cuotaTableTop + 7);
        doc.text('FECHA', 120, cuotaTableTop + 7);
        doc.text('MONTO', 460, cuotaTableTop + 7, { width: 90, align: 'right' });

        let cuotaY = cuotaTableTop + 22;

        for (const cuota of cuotasAMostrar) {
          if (cuotaY > 650) {
            doc.addPage();
            cuotaY = 50;
          }

          doc.rect(50, cuotaY, 512, 20).strokeColor(borderColor).stroke();
          doc.fontSize(9).fillColor(textColor);
          doc.text(String(cuota.numero), 60, cuotaY + 6);
          doc.text(formatDate(cuota.fecha), 120, cuotaY + 6);
          doc.text(formatMoney(cuota.monto, plan.moneda), 460, cuotaY + 6, { width: 90, align: 'right' });
          cuotaY += 20;
        }

        if (cuotasGeneradas.length > 24) {
          doc.fontSize(8).fillColor(mutedColor).text(`... y ${cuotasGeneradas.length - 24} cuotas más`, 60, cuotaY + 5);
        }
      }

      // ============================================
      // CONDICIONES
      // ============================================
      if (plan.condiciones) {
        doc.moveDown(1.5);
        doc.fontSize(11).fillColor(textColor).text('Condiciones', { underline: true });
        doc.moveDown(0.3);
        doc.fontSize(9).fillColor('#4b5563').text(plan.condiciones, {
          width: 512,
          align: 'left',
        });
      }

      // ============================================
      // PREPARADO POR (si hay usuario creador)
      // ============================================
      if (usuarioInfo || plan.usuario_creador) {
        doc.moveDown(2);
        doc.fontSize(10).fillColor(mutedColor).text('Preparado por:', 50);
        doc.moveDown(0.3);

        const nombreAsesor = usuarioInfo
          ? `${usuarioInfo.nombre || ''} ${usuarioInfo.apellido || ''}`.trim()
          : plan.usuario_creador
            ? `${plan.usuario_creador.nombre || ''} ${plan.usuario_creador.apellido || ''}`.trim()
            : '';

        if (nombreAsesor) {
          doc.fontSize(11).fillColor(textColor).text(nombreAsesor);
        }

        if (usuarioInfo?.titulo_profesional) {
          doc.fontSize(9).fillColor(mutedColor).text(usuarioInfo.titulo_profesional);
        }

        const contactoAsesor = usuarioInfo?.email || plan.usuario_creador?.email;
        if (contactoAsesor) {
          doc.fontSize(9).fillColor(mutedColor).text(contactoAsesor);
        }

        // Línea para firma
        doc.moveDown(1.5);
        doc.moveTo(50, doc.y).lineTo(200, doc.y).strokeColor(borderColor).stroke();
        doc.fontSize(8).fillColor(mutedColor).text('Firma', 50, doc.y + 3);
      }

      // ============================================
      // DISCLAIMER (en todas las páginas al final)
      // ============================================
      const disclaimer = 'NOTA: Este documento es únicamente de carácter informativo y no constituye un contrato de compraventa ni compromiso legal. Los precios y condiciones presentados son referenciales y están sujetos a cambios sin previo aviso. El plan de pago definitivo será el establecido en el contrato formal de compraventa.';

      // Footer en todas las páginas
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);

        // Disclaimer
        doc.fontSize(7).fillColor('#9ca3af').text(
          disclaimer,
          50,
          720,
          { width: 512, align: 'justify' }
        );

        // Fecha y página
        doc.fontSize(8).fillColor('#9ca3af').text(
          `Generado el ${new Date().toLocaleDateString('es-MX')} | Página ${i + 1} de ${pageCount}`,
          50,
          755,
          { align: 'center', width: 512 }
        );
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
