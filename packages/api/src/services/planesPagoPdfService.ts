/**
 * Servicio para generar PDF de planes de pago
 */

import PDFDocument from 'pdfkit';
import { PlanPago } from './planesPagoService.js';
import { query } from '../utils/db.js';

interface TenantInfo {
  nombre: string;
  logo_url?: string;
  telefono?: string;
  email?: string;
  ciudad?: string;
  pais?: string;
  tipo?: string;
}

interface UsuarioInfo {
  nombre: string;
  apellido?: string;
  email?: string;
  titulo_profesional?: string;
}

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
      nombre: info.nombreComercial || row.nombre,
      logo_url: info.logo || null,
      telefono: contacto.telefono || null,
      email: contacto.email || null,
      ciudad: ubicacion.ciudad || null,
      pais: ubicacion.pais || null,
      tipo: row.tipo,
    };
  } catch (e) {
    console.error('Error getting tenant info:', e);
    return null;
  }
}

async function getUsuarioInfo(usuarioId: string): Promise<UsuarioInfo | null> {
  if (!usuarioId) return null;
  try {
    const result = await query(
      `SELECT u.nombre, u.apellido, u.email, pa.titulo_profesional
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

async function fetchImage(url: string): Promise<Buffer | null> {
  if (!url) return null;
  try {
    console.log('Fetching logo from:', url);
    const response = await fetch(url);
    if (!response.ok) {
      console.log('Logo fetch failed:', response.status);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    console.log('Logo fetched, size:', arrayBuffer.byteLength);
    return Buffer.from(arrayBuffer);
  } catch (e) {
    console.error('Error fetching logo:', e);
    return null;
  }
}

export async function generarPdfPlanPago(plan: PlanPago): Promise<Buffer> {
  const tenantInfo = await getTenantInfo(plan.tenant_id);
  const usuarioInfo = plan.usuario_creador_id ? await getUsuarioInfo(plan.usuario_creador_id) : null;
  const isConnect = tenantInfo?.tipo === 'connect';

  // Fetch logo
  let logoBuffer: Buffer | null = null;
  if (!isConnect && tenantInfo?.logo_url) {
    logoBuffer = await fetchImage(tenantInfo.logo_url);
  }

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margin: 50,
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const blue = '#1e40af';
      const gray = '#6b7280';
      const dark = '#1f2937';

      // ========== HEADER ==========
      let startY = 50;

      if (!isConnect && tenantInfo) {
        // Logo on left
        if (logoBuffer) {
          try {
            doc.image(logoBuffer, 50, 40, { height: 40 });
          } catch (e) {
            console.error('Error embedding logo:', e);
          }
        }

        // Company info on right
        doc.fontSize(11).fillColor(blue).text(tenantInfo.nombre, 350, 40, { width: 200, align: 'right' });

        let infoY = 54;
        if (tenantInfo.telefono) {
          doc.fontSize(8).fillColor(gray).text(tenantInfo.telefono, 350, infoY, { width: 200, align: 'right' });
          infoY += 10;
        }
        if (tenantInfo.email) {
          doc.fontSize(8).fillColor(gray).text(tenantInfo.email, 350, infoY, { width: 200, align: 'right' });
          infoY += 10;
        }
        if (tenantInfo.ciudad || tenantInfo.pais) {
          const loc = [tenantInfo.ciudad, tenantInfo.pais].filter(Boolean).join(', ');
          doc.fontSize(8).fillColor(gray).text(loc, 350, infoY, { width: 200, align: 'right' });
        }

        // Header line
        doc.moveTo(50, 90).lineTo(562, 90).strokeColor('#e5e7eb').stroke();
        startY = 105;
      }

      // ========== TITLE ==========
      doc.fontSize(20).fillColor(blue).text('Plan de Pago', 50, startY, { align: 'center', width: 512 });
      if (plan.titulo) {
        doc.fontSize(9).fillColor(gray).text(plan.titulo, 50, startY + 25, { align: 'center', width: 512 });
      }

      // ========== PROPERTY & CLIENT ==========
      const infoTop = startY + 55;

      if (plan.propiedad) {
        doc.fontSize(8).fillColor(gray).text('PROPIEDAD', 50, infoTop);
        doc.fontSize(10).fillColor(dark).text(plan.propiedad.titulo || '-', 50, infoTop + 12, { width: 230 });
        if (plan.propiedad.codigo) {
          doc.fontSize(8).fillColor(gray).text(`Código: ${plan.propiedad.codigo}`, 50, infoTop + 26);
        }
      }

      if (plan.contacto) {
        doc.fontSize(8).fillColor(gray).text('CLIENTE', 310, infoTop);
        const clientName = [plan.contacto.nombre, plan.contacto.apellido].filter(Boolean).join(' ');
        doc.fontSize(10).fillColor(dark).text(clientName || '-', 310, infoTop + 12, { width: 230 });
        let cy = infoTop + 26;
        if (plan.contacto.email) {
          doc.fontSize(8).fillColor(gray).text(plan.contacto.email, 310, cy);
          cy += 10;
        }
        if (plan.contacto.telefono) {
          doc.fontSize(8).fillColor(gray).text(plan.contacto.telefono, 310, cy);
        }
      }

      // Separator
      doc.moveTo(50, infoTop + 50).lineTo(562, infoTop + 50).strokeColor('#e5e7eb').stroke();

      // ========== TOTAL PRICE ==========
      const priceY = infoTop + 65;
      doc.fontSize(11).fillColor(dark).text('Precio Total:', 50, priceY);
      doc.fontSize(18).fillColor(blue).text(formatMoney(plan.precio_total, plan.moneda), 50, priceY + 14);

      // ========== BREAKDOWN TABLE ==========
      const detalle = plan.plan_detalle || {};
      const calc = detalle.valores_calculados || {};

      let tableY = priceY + 50;
      const rowH = 24;

      // Header row
      doc.rect(50, tableY, 512, rowH).fillColor('#f3f4f6').fill();
      doc.fontSize(8).fillColor(gray);
      doc.text('CONCEPTO', 60, tableY + 8);
      doc.text('DETALLE', 230, tableY + 8);
      doc.text('MONTO', 460, tableY + 8, { width: 90, align: 'right' });
      tableY += rowH;

      // Separación row
      const sepInfo = typeof detalle.separacion === 'object' ? detalle.separacion : { tipo: 'valor', valor: detalle.separacion || 0 };
      const sepMonto = calc.separacion_monto || (sepInfo.tipo === 'porcentaje' ? plan.precio_total * sepInfo.valor / 100 : sepInfo.valor) || 0;

      if (sepMonto > 0) {
        doc.rect(50, tableY, 512, rowH).strokeColor('#e5e7eb').stroke();
        doc.fontSize(9).fillColor(dark);
        doc.text('Separación', 60, tableY + 7);
        doc.text(sepInfo.tipo === 'porcentaje' ? `${sepInfo.valor}%` : 'Valor fijo', 230, tableY + 7);
        doc.text(formatMoney(sepMonto, plan.moneda), 460, tableY + 7, { width: 90, align: 'right' });
        tableY += rowH;
      }

      // Inicial row
      const iniInfo = typeof detalle.inicial === 'object' ? detalle.inicial : { tipo: 'valor', valor: detalle.inicial || 0 };
      const iniMonto = calc.inicial_monto || (iniInfo.tipo === 'porcentaje' ? plan.precio_total * iniInfo.valor / 100 : iniInfo.valor) || 0;

      if (iniMonto > 0) {
        doc.rect(50, tableY, 512, rowH).strokeColor('#e5e7eb').stroke();
        doc.fontSize(9).fillColor(dark);
        doc.text('Inicial', 60, tableY + 7);
        doc.text(iniInfo.tipo === 'porcentaje' ? `${iniInfo.valor}%` : 'Valor fijo', 230, tableY + 7);
        doc.text(formatMoney(iniMonto, plan.moneda), 460, tableY + 7, { width: 90, align: 'right' });
        tableY += rowH;
      }

      // Cuotas row
      const numCuotas = detalle.num_cuotas || 12;
      const cuotaMonto = calc.cuota_monto || 0;
      const totalCuotas = calc.total_cuotas || 0;

      if (totalCuotas > 0) {
        doc.rect(50, tableY, 512, rowH).strokeColor('#e5e7eb').stroke();
        doc.fontSize(9).fillColor(dark);
        doc.text('Cuotas mensuales', 60, tableY + 7);
        doc.text(`${numCuotas} cuotas de ${formatMoney(cuotaMonto, plan.moneda)}`, 230, tableY + 7);
        doc.text(formatMoney(totalCuotas, plan.moneda), 460, tableY + 7, { width: 90, align: 'right' });
        tableY += rowH;
      }

      // Total row
      doc.rect(50, tableY, 512, rowH).fillColor(blue).fill();
      doc.fontSize(10).fillColor('white');
      doc.text('TOTAL A PAGAR', 60, tableY + 7);
      doc.text(formatMoney(plan.precio_total, plan.moneda), 460, tableY + 7, { width: 90, align: 'right' });
      tableY += rowH + 20;

      // ========== PAYMENT CALENDAR ==========
      const cuotas = detalle.cuotas_generadas || [];
      if (cuotas.length > 0) {
        doc.fontSize(11).fillColor(dark).text('Calendario de Pagos', 50, tableY, { underline: true });
        tableY += 18;

        // Calendar header
        doc.rect(50, tableY, 512, 20).fillColor('#f3f4f6').fill();
        doc.fontSize(8).fillColor(gray);
        doc.text('#', 60, tableY + 6);
        doc.text('FECHA', 100, tableY + 6);
        doc.text('MONTO', 460, tableY + 6, { width: 90, align: 'right' });
        tableY += 20;

        // Show max 12 cuotas on first page
        const maxShow = Math.min(cuotas.length, 12);
        for (let i = 0; i < maxShow; i++) {
          const c = cuotas[i];
          doc.rect(50, tableY, 512, 18).strokeColor('#e5e7eb').stroke();
          doc.fontSize(8).fillColor(dark);
          doc.text(String(c.numero), 60, tableY + 5);
          doc.text(formatDate(c.fecha), 100, tableY + 5);
          doc.text(formatMoney(c.monto, plan.moneda), 460, tableY + 5, { width: 90, align: 'right' });
          tableY += 18;
        }

        if (cuotas.length > 12) {
          doc.fontSize(8).fillColor(gray).text(`... y ${cuotas.length - 12} cuotas más`, 60, tableY + 3);
          tableY += 15;
        }
      }

      // ========== CONDITIONS ==========
      if (plan.condiciones && tableY < 620) {
        tableY += 15;
        doc.fontSize(10).fillColor(dark).text('Condiciones', 50, tableY, { underline: true });
        doc.fontSize(8).fillColor(gray).text(plan.condiciones, 50, tableY + 14, { width: 512 });
      }

      // ========== PREPARED BY ==========
      if ((usuarioInfo || plan.usuario_creador) && tableY < 580) {
        tableY = Math.max(tableY + 40, 550);
        doc.fontSize(9).fillColor(gray).text('Preparado por:', 50, tableY);

        const asesorName = usuarioInfo
          ? `${usuarioInfo.nombre || ''} ${usuarioInfo.apellido || ''}`.trim()
          : plan.usuario_creador
            ? `${plan.usuario_creador.nombre || ''} ${plan.usuario_creador.apellido || ''}`.trim()
            : '';

        if (asesorName) {
          doc.fontSize(10).fillColor(dark).text(asesorName, 50, tableY + 12);
        }
        if (usuarioInfo?.titulo_profesional) {
          doc.fontSize(8).fillColor(gray).text(usuarioInfo.titulo_profesional, 50, tableY + 24);
        }
        if (usuarioInfo?.email || plan.usuario_creador?.email) {
          doc.fontSize(8).fillColor(gray).text(usuarioInfo?.email || plan.usuario_creador?.email || '', 50, tableY + 34);
        }

        // Signature line
        doc.moveTo(50, tableY + 60).lineTo(180, tableY + 60).strokeColor('#e5e7eb').stroke();
        doc.fontSize(7).fillColor(gray).text('Firma', 50, tableY + 63);
      }

      // ========== FOOTER (simple, one line) ==========
      const disclaimer = 'NOTA: Este documento es informativo y no constituye contrato. Precios sujetos a cambios.';
      const dateStr = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(7).fillColor('#9ca3af').text(disclaimer, 50, 730, { width: 400 });
        doc.fontSize(7).fillColor('#9ca3af').text(`${dateStr} | Pág. ${i + 1}/${pages.count}`, 460, 730, { width: 100, align: 'right' });
      }

      doc.end();
    } catch (error) {
      console.error('PDF generation error:', error);
      reject(error);
    }
  });
}

function formatMoney(value: number, currency: string = 'USD'): string {
  if (!value && value !== 0) return '$0';

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

  const symbol = currency === 'USD' ? 'USD' : currency === 'DOP' ? 'RD$' : currency;
  return `${symbol} ${formatted}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}
