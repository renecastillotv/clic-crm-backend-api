/**
 * Servicio para generar PDF de planes de pago
 */

import PDFDocument from 'pdfkit';
import { PlanPago } from './planesPagoService.js';

interface PdfOptions {
  tenantName?: string;
  tenantLogo?: string;
}

/**
 * Genera un PDF del plan de pago
 */
export async function generarPdfPlanPago(plan: PlanPago, options: PdfOptions = {}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margin: 50,
        info: {
          Title: plan.titulo || 'Plan de Pago',
          Author: options.tenantName || 'CRM',
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

      // Header
      doc.fontSize(24).fillColor(primaryColor).text('Plan de Pago', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#6b7280').text(plan.titulo || '', { align: 'center' });
      doc.moveDown(1.5);

      // Info del plan
      const startY = doc.y;

      // Columna izquierda - Propiedad
      if (plan.propiedad) {
        doc.fontSize(8).fillColor('#6b7280').text('PROPIEDAD', 50, startY);
        doc.fontSize(11).fillColor(textColor).text(plan.propiedad.titulo || '-', 50, startY + 12);
        if (plan.propiedad.codigo) {
          doc.fontSize(9).fillColor('#6b7280').text(`Código: ${plan.propiedad.codigo}`, 50, startY + 26);
        }
      }

      // Columna derecha - Cliente
      if (plan.contacto) {
        doc.fontSize(8).fillColor('#6b7280').text('CLIENTE', 300, startY);
        const nombreCompleto = [plan.contacto.nombre, plan.contacto.apellido].filter(Boolean).join(' ');
        doc.fontSize(11).fillColor(textColor).text(nombreCompleto || '-', 300, startY + 12);
        if (plan.contacto.email) {
          doc.fontSize(9).fillColor('#6b7280').text(plan.contacto.email, 300, startY + 26);
        }
      }

      doc.y = startY + 50;
      doc.moveDown(1);

      // Línea separadora
      doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor(borderColor).stroke();
      doc.moveDown(1);

      // Precio total
      doc.fontSize(12).fillColor(textColor).text('Precio Total:', 50);
      doc.fontSize(18).fillColor(primaryColor).text(
        formatMoney(plan.precio_total, plan.moneda),
        { continued: false }
      );
      doc.moveDown(1.5);

      // Desglose
      const detalle = plan.plan_detalle || {};
      const valoresCalc = detalle.valores_calculados || {};

      // Tabla de desglose
      const tableTop = doc.y;
      const colWidths = [200, 150, 150];
      const rowHeight = 25;

      // Header de tabla
      doc.rect(50, tableTop, 512, rowHeight).fillColor(lightGray).fill();
      doc.fontSize(9).fillColor('#6b7280');
      doc.text('CONCEPTO', 60, tableTop + 8);
      doc.text('DETALLE', 260, tableTop + 8);
      doc.text('MONTO', 460, tableTop + 8, { width: 90, align: 'right' });

      let currentY = tableTop + rowHeight;

      // Separación
      const separacionInfo = typeof detalle.separacion === 'object' ? detalle.separacion : { tipo: 'valor', valor: detalle.separacion || 0 };
      const separacionMonto = valoresCalc.separacion_monto || (separacionInfo.tipo === 'porcentaje' ? (plan.precio_total * separacionInfo.valor / 100) : separacionInfo.valor);

      if (separacionMonto > 0) {
        doc.rect(50, currentY, 512, rowHeight).strokeColor(borderColor).stroke();
        doc.fontSize(10).fillColor(textColor);
        doc.text('Separación', 60, currentY + 8);
        doc.text(separacionInfo.tipo === 'porcentaje' ? `${separacionInfo.valor}%` : 'Valor fijo', 260, currentY + 8);
        doc.text(formatMoney(separacionMonto, plan.moneda), 460, currentY + 8, { width: 90, align: 'right' });
        currentY += rowHeight;
      }

      // Inicial
      const inicialInfo = typeof detalle.inicial === 'object' ? detalle.inicial : { tipo: 'valor', valor: detalle.inicial || 0 };
      const inicialMonto = valoresCalc.inicial_monto || (inicialInfo.tipo === 'porcentaje' ? (plan.precio_total * inicialInfo.valor / 100) : inicialInfo.valor);

      if (inicialMonto > 0) {
        doc.rect(50, currentY, 512, rowHeight).strokeColor(borderColor).stroke();
        doc.fontSize(10).fillColor(textColor);
        doc.text('Inicial', 60, currentY + 8);
        doc.text(inicialInfo.tipo === 'porcentaje' ? `${inicialInfo.valor}%` : 'Valor fijo', 260, currentY + 8);
        doc.text(formatMoney(inicialMonto, plan.moneda), 460, currentY + 8, { width: 90, align: 'right' });
        currentY += rowHeight;
      }

      // Cuotas mensuales
      const numCuotas = detalle.num_cuotas || 12;
      const cuotaMonto = valoresCalc.cuota_monto || valoresCalc.total_cuotas / numCuotas || 0;
      const totalCuotas = valoresCalc.total_cuotas || cuotaMonto * numCuotas;

      if (totalCuotas > 0) {
        doc.rect(50, currentY, 512, rowHeight).strokeColor(borderColor).stroke();
        doc.fontSize(10).fillColor(textColor);
        doc.text('Cuotas mensuales', 60, currentY + 8);
        doc.text(`${numCuotas} cuotas de ${formatMoney(cuotaMonto, plan.moneda)}`, 260, currentY + 8);
        doc.text(formatMoney(totalCuotas, plan.moneda), 460, currentY + 8, { width: 90, align: 'right' });
        currentY += rowHeight;
      }

      // Total
      doc.rect(50, currentY, 512, rowHeight).fillColor(primaryColor).fill();
      doc.fontSize(11).fillColor('white');
      doc.text('TOTAL A PAGAR', 60, currentY + 7);
      doc.text(formatMoney(plan.precio_total, plan.moneda), 460, currentY + 7, { width: 90, align: 'right' });
      currentY += rowHeight;

      doc.y = currentY + 20;

      // Calendario de pagos
      const cuotasGeneradas = detalle.cuotas_generadas || [];
      if (cuotasGeneradas.length > 0) {
        doc.moveDown(1);
        doc.fontSize(12).fillColor(textColor).text('Calendario de Pagos', { underline: true });
        doc.moveDown(0.5);

        // Mostrar máximo 24 cuotas en el PDF
        const cuotasAMostrar = cuotasGeneradas.slice(0, 24);

        // Header de tabla de cuotas
        const cuotaTableTop = doc.y;
        doc.rect(50, cuotaTableTop, 512, 20).fillColor(lightGray).fill();
        doc.fontSize(8).fillColor('#6b7280');
        doc.text('#', 60, cuotaTableTop + 6);
        doc.text('FECHA', 120, cuotaTableTop + 6);
        doc.text('MONTO', 460, cuotaTableTop + 6, { width: 90, align: 'right' });

        let cuotaY = cuotaTableTop + 20;

        for (const cuota of cuotasAMostrar) {
          // Nueva página si es necesario
          if (cuotaY > 700) {
            doc.addPage();
            cuotaY = 50;
          }

          doc.rect(50, cuotaY, 512, 18).strokeColor(borderColor).stroke();
          doc.fontSize(9).fillColor(textColor);
          doc.text(String(cuota.numero), 60, cuotaY + 5);
          doc.text(formatDate(cuota.fecha), 120, cuotaY + 5);
          doc.text(formatMoney(cuota.monto, plan.moneda), 460, cuotaY + 5, { width: 90, align: 'right' });
          cuotaY += 18;
        }

        if (cuotasGeneradas.length > 24) {
          doc.fontSize(8).fillColor('#6b7280').text(`... y ${cuotasGeneradas.length - 24} cuotas más`, 60, cuotaY + 5);
        }
      }

      // Condiciones
      if (plan.condiciones) {
        doc.addPage();
        doc.fontSize(12).fillColor(textColor).text('Términos y Condiciones', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#4b5563').text(plan.condiciones, {
          width: 512,
          align: 'justify',
        });
      }

      // Footer
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor('#9ca3af').text(
          `Generado el ${new Date().toLocaleDateString('es-MX')} | Página ${i + 1} de ${pageCount}`,
          50,
          750,
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
