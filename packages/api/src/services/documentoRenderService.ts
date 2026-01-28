/**
 * Servicio para renderizar y generar documentos desde plantillas
 *
 * - Renderiza plantillas con Handlebars
 * - Genera PDFs con PDFKit
 * - Sube documentos a R2
 * - Obtiene datos de contactos y propiedades para merge
 */

import Handlebars from 'handlebars';
import PDFDocument from 'pdfkit';
import { query } from '../utils/db.js';
import { uploadDocument } from './r2Service.js';
import * as plantillasService from './plantillasDocumentosService.js';

// ==================== INTERFACES ====================

export interface DatosMerge {
  // Empresa
  empresa_nombre?: string;
  empresa_rnc?: string;
  empresa_telefono?: string;
  empresa_email?: string;
  empresa_direccion?: string;
  empresa_logo_url?: string;

  // Asesor/Usuario
  asesor_nombre?: string;
  asesor_email?: string;
  asesor_telefono?: string;
  asesor_titulo?: string;

  // Contacto
  contacto_nombre?: string;
  contacto_apellido?: string;
  contacto_nombre_completo?: string;
  contacto_email?: string;
  contacto_telefono?: string;
  contacto_cedula?: string;
  contacto_direccion?: string;
  contacto_empresa?: string;
  contacto_cargo?: string;

  // Propiedad
  propiedad_titulo?: string;
  propiedad_codigo?: string;
  propiedad_tipo?: string;
  propiedad_direccion?: string;
  propiedad_ciudad?: string;
  propiedad_sector?: string;
  propiedad_precio?: string;
  propiedad_precio_numero?: number;
  propiedad_area?: number;
  propiedad_habitaciones?: number;
  propiedad_banos?: number;
  propiedad_parqueos?: number;

  // Fechas
  fecha?: string;
  fecha_larga?: string;
  dia?: string;
  mes?: string;
  ano?: string;

  // Custom fields
  [key: string]: any;
}

export interface GenerarDocumentoInput {
  plantilla_id: string;
  contacto_id?: string;
  propiedad_id?: string;
  venta_id?: string;
  datos_adicionales?: Record<string, any>;
  nombre_documento?: string;
}

export interface GenerarDocumentoResult {
  documento_id: string;
  nombre: string;
  html_renderizado: string;
  url_documento?: string;
  datos_merge: DatosMerge;
}

// ==================== HANDLEBARS HELPERS ====================

// Register custom helpers
Handlebars.registerHelper('formatCurrency', function(value: number, currency = 'USD') {
  if (!value && value !== 0) return '';
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: currency,
  }).format(value);
});

Handlebars.registerHelper('formatDate', function(date: string | Date, format = 'short') {
  if (!date) return '';
  const d = new Date(date);
  if (format === 'long') {
    return d.toLocaleDateString('es-DO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  return d.toLocaleDateString('es-DO');
});

Handlebars.registerHelper('uppercase', function(str: string) {
  return str ? str.toUpperCase() : '';
});

Handlebars.registerHelper('lowercase', function(str: string) {
  return str ? str.toLowerCase() : '';
});

Handlebars.registerHelper('ifEquals', function(arg1: any, arg2: any, options: any) {
  return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
});

// ==================== DATA FETCHING ====================

async function getTenantData(tenantId: string): Promise<Partial<DatosMerge>> {
  const result = await query(
    `SELECT nombre, info_negocio FROM tenants WHERE id = $1`,
    [tenantId]
  );

  if (result.rows.length === 0) return {};

  const row = result.rows[0];
  const info = row.info_negocio || {};
  const contacto = info.contacto || {};
  const ubicacion = info.ubicacion || {};
  const legal = info.legal || {};

  return {
    empresa_nombre: info.nombreComercial || row.nombre,
    empresa_rnc: legal.rnc || legal.rncCedula,
    empresa_telefono: contacto.telefono,
    empresa_email: contacto.email,
    empresa_direccion: ubicacion.direccion,
    empresa_logo_url: info.logo,
  };
}

async function getUsuarioData(usuarioId: string): Promise<Partial<DatosMerge>> {
  if (!usuarioId) return {};

  const result = await query(
    `SELECT u.nombre, u.apellido, u.email, u.telefono, pa.titulo_profesional
     FROM usuarios u
     LEFT JOIN perfiles_asesor pa ON pa.usuario_id = u.id
     WHERE u.id = $1`,
    [usuarioId]
  );

  if (result.rows.length === 0) return {};

  const row = result.rows[0];
  return {
    asesor_nombre: [row.nombre, row.apellido].filter(Boolean).join(' '),
    asesor_email: row.email,
    asesor_telefono: row.telefono,
    asesor_titulo: row.titulo_profesional,
  };
}

async function getContactoData(contactoId: string): Promise<Partial<DatosMerge>> {
  if (!contactoId) return {};

  const result = await query(
    `SELECT * FROM contactos WHERE id = $1`,
    [contactoId]
  );

  if (result.rows.length === 0) return {};

  const row = result.rows[0];
  const datosExtra = typeof row.datos_extra === 'string'
    ? JSON.parse(row.datos_extra)
    : (row.datos_extra || {});

  return {
    contacto_nombre: row.nombre,
    contacto_apellido: row.apellido,
    contacto_nombre_completo: [row.nombre, row.apellido].filter(Boolean).join(' '),
    contacto_email: row.email,
    contacto_telefono: row.telefono || row.whatsapp,
    contacto_cedula: datosExtra.cedula || datosExtra.documento_identidad,
    contacto_direccion: datosExtra.direccion,
    contacto_empresa: row.empresa,
    contacto_cargo: row.cargo,
  };
}

async function getPropiedadData(propiedadId: string): Promise<Partial<DatosMerge>> {
  if (!propiedadId) return {};

  const result = await query(
    `SELECT p.*, u.ciudad, u.sector
     FROM propiedades p
     LEFT JOIN ubicaciones u ON u.id = p.ubicacion_id
     WHERE p.id = $1`,
    [propiedadId]
  );

  if (result.rows.length === 0) return {};

  const row = result.rows[0];

  // Format price
  const precio = row.precio_venta || row.precio_alquiler;
  const moneda = row.moneda || 'USD';
  const precioFormateado = precio
    ? new Intl.NumberFormat('es-DO', { style: 'currency', currency: moneda }).format(precio)
    : '';

  return {
    propiedad_titulo: row.titulo,
    propiedad_codigo: row.codigo,
    propiedad_tipo: row.tipo,
    propiedad_direccion: row.direccion,
    propiedad_ciudad: row.ciudad,
    propiedad_sector: row.sector,
    propiedad_precio: precioFormateado,
    propiedad_precio_numero: precio,
    propiedad_area: row.area_construida || row.area_terreno,
    propiedad_habitaciones: row.habitaciones,
    propiedad_banos: row.banos,
    propiedad_parqueos: row.parqueos,
  };
}

function getDateData(): Partial<DatosMerge> {
  const now = new Date();
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  return {
    fecha: now.toLocaleDateString('es-DO'),
    fecha_larga: now.toLocaleDateString('es-DO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    dia: now.getDate().toString(),
    mes: meses[now.getMonth()],
    ano: now.getFullYear().toString(),
  };
}

// ==================== MAIN FUNCTIONS ====================

/**
 * Obtiene todos los datos para merge desde las diferentes fuentes
 */
export async function obtenerDatosMerge(
  tenantId: string,
  usuarioId: string,
  input: GenerarDocumentoInput
): Promise<DatosMerge> {
  const [tenantData, usuarioData, contactoData, propiedadData] = await Promise.all([
    getTenantData(tenantId),
    getUsuarioData(usuarioId),
    input.contacto_id ? getContactoData(input.contacto_id) : Promise.resolve({}),
    input.propiedad_id ? getPropiedadData(input.propiedad_id) : Promise.resolve({}),
  ]);

  // Merge all data sources
  const datos: DatosMerge = {
    ...tenantData,
    ...usuarioData,
    ...contactoData,
    ...propiedadData,
    ...getDateData(),
    ...(input.datos_adicionales || {}),
  };

  return datos;
}

/**
 * Renderiza una plantilla HTML con los datos proporcionados
 */
export function renderizarPlantilla(
  contenidoHtml: string,
  datos: DatosMerge
): string {
  try {
    const template = Handlebars.compile(contenidoHtml);
    return template(datos);
  } catch (error: any) {
    console.error('Error renderizando plantilla:', error);
    throw new Error(`Error al renderizar plantilla: ${error.message}`);
  }
}

/**
 * Genera un PDF básico a partir de texto
 * Nota: Para HTML complejo, considerar usar Puppeteer o un servicio externo
 */
export async function generarPdfBasico(
  titulo: string,
  contenidoTexto: string,
  tenantNombre?: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 72, bottom: 72, left: 72, right: 72 },
        info: {
          Title: titulo,
          Author: tenantNombre || 'CLIC CRM',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text(titulo, { align: 'center' });
      doc.moveDown(2);

      // Content - strip HTML tags for basic PDF
      const textoLimpio = contenidoTexto
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, '\n')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();

      doc.fontSize(11).font('Helvetica').text(textoLimpio, {
        align: 'justify',
        lineGap: 4,
      });

      // Footer
      doc.moveDown(4);
      doc.fontSize(9).fillColor('#666666').text(
        `Generado el ${new Date().toLocaleDateString('es-DO')} - ${tenantNombre || 'CLIC CRM'}`,
        { align: 'center' }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Función principal: genera un documento desde una plantilla
 */
export async function generarDocumento(
  tenantId: string,
  usuarioId: string,
  input: GenerarDocumentoInput
): Promise<GenerarDocumentoResult> {
  // 1. Obtener la plantilla
  const plantilla = await plantillasService.getPlantillaById(tenantId, input.plantilla_id);
  if (!plantilla) {
    throw new Error('Plantilla no encontrada');
  }

  // 2. Obtener datos para merge
  const datos = await obtenerDatosMerge(tenantId, usuarioId, input);

  // 3. Renderizar HTML
  const htmlRenderizado = renderizarPlantilla(plantilla.contenido_html, datos);

  // 4. Generar nombre del documento
  const nombreDocumento = input.nombre_documento ||
    `${plantilla.nombre} - ${datos.contacto_nombre_completo || 'Sin contacto'} - ${new Date().toISOString().split('T')[0]}`;

  // 5. Generar PDF
  const pdfBuffer = await generarPdfBasico(nombreDocumento, htmlRenderizado, datos.empresa_nombre);

  // 6. Subir a R2
  const fileName = `${nombreDocumento.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  const uploadResult = await uploadDocument(pdfBuffer, fileName, {
    tenantId,
    folder: 'documentos-generados',
  });
  const urlDocumento = uploadResult.url;

  // 7. Crear registro en BD
  const documento = await plantillasService.createDocumentoGenerado(tenantId, {
    plantilla_id: input.plantilla_id,
    contacto_id: input.contacto_id,
    propiedad_id: input.propiedad_id,
    venta_id: input.venta_id,
    nombre: nombreDocumento,
    estado: 'borrador',
    datos_merge: datos,
    url_documento: urlDocumento,
    tamano_archivo: pdfBuffer.length,
  }, usuarioId);

  return {
    documento_id: documento.id,
    nombre: nombreDocumento,
    html_renderizado: htmlRenderizado,
    url_documento: urlDocumento,
    datos_merge: datos,
  };
}

/**
 * Previsualiza un documento sin guardarlo
 */
export async function previsualizarDocumento(
  tenantId: string,
  usuarioId: string,
  input: GenerarDocumentoInput
): Promise<{ html: string; datos: DatosMerge }> {
  // 1. Obtener la plantilla
  const plantilla = await plantillasService.getPlantillaById(tenantId, input.plantilla_id);
  if (!plantilla) {
    throw new Error('Plantilla no encontrada');
  }

  // 2. Obtener datos para merge
  const datos = await obtenerDatosMerge(tenantId, usuarioId, input);

  // 3. Renderizar HTML
  const html = renderizarPlantilla(plantilla.contenido_html, datos);

  return { html, datos };
}

/**
 * Extrae las variables de una plantilla
 */
export function extraerVariables(contenidoHtml: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const variables: Set<string> = new Set();
  let match;

  while ((match = regex.exec(contenidoHtml)) !== null) {
    // Remove helper calls and get just the variable name
    const variable = match[1].trim().split(' ')[0];
    if (!variable.startsWith('#') && !variable.startsWith('/')) {
      variables.add(variable);
    }
  }

  return Array.from(variables);
}
