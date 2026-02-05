/**
 * ventasImportService.ts - Importador de ventas desde CSV
 *
 * Parsea un CSV con formato closeddeals, resuelve contactos, usuarios,
 * propiedades y estados de venta, e inserta las ventas con comisiones.
 */

import { query } from '../utils/db.js';
import { createContacto } from './contactosService.js';
import { calcularYCrearComisiones } from './comisionesService.js';

// ============================================================================
// TYPES
// ============================================================================

interface CSVVentaRow {
  'No. de Cierre': string;
  'Negocio': string;
  'Contacto principal': string;
  'Contacto - Telefono': string;
  'Contacto - Correo electronico': string;
  'Cierre hecho por': string;
  'Inmueble Externo': string;
  'Es un proyecto?': string;
  'Operación': string;
  'Propiedad - Número de Unidad': string;
  'Propiedad - Código': string;
  'Propiedad - Nombre': string;
  'Propiedad - Nombre privado': string;
  'Propiedad - Categoría': string;
  'Propiedad - Ciudad': string;
  'Propiedad - Sector': string;
  'Estatus': string;
  'Moneda': string;
  'Valor de Cierre': string;
  'Impuestos Aplicados?': string;
  'Porcentaje Comision': string;
  'Estatus completado': string;
  'Fecha Ganado': string;
  'Notas': string;
  'Fecha creado': string;
  'Referidor': string;
  'Referidor (USD)': string;
  [key: string]: string;
}

export interface ImportVentasResult {
  total: number;
  importadas: number;
  errores: { fila: number; numero_cierre: string; error: string }[];
  warnings: { fila: number; numero_cierre: string; warning: string }[];
  contactos_creados: number;
  contactos_existentes: number;
}

export interface ImportVentasPreview {
  total_filas: number;
  contactos_nuevos: string[];
  contactos_existentes: string[];
  usuarios_encontrados: string[];
  usuarios_no_encontrados: string[];
  propiedades_vinculables: number;
  propiedades_externas: number;
  estados_encontrados: Record<string, number>;
}

// ============================================================================
// CSV PARSER
// ============================================================================

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      if (nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = false;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function parseVentasCSV(content: string): CSVVentaRow[] {
  const lines = content.split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: CSVVentaRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const row: any = {};

    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });

    rows.push(row as CSVVentaRow);
  }

  return rows;
}

function parseBool(val: string): boolean {
  return val.toLowerCase() === 'true';
}

// ============================================================================
// LOOKUP HELPERS
// ============================================================================

async function findContactoByPhoneOrEmail(
  tenantId: string,
  telefono: string,
  email: string,
  nombre: string
): Promise<{ id: string; found: boolean }> {
  // Try phone first
  if (telefono) {
    const result = await query(
      `SELECT id FROM contactos WHERE tenant_id = $1 AND telefono = $2 AND activo = true LIMIT 1`,
      [tenantId, telefono]
    );
    if (result.rows.length > 0) return { id: result.rows[0].id, found: true };
  }

  // Try email
  if (email) {
    const result = await query(
      `SELECT id FROM contactos WHERE tenant_id = $1 AND email ILIKE $2 AND activo = true LIMIT 1`,
      [tenantId, email]
    );
    if (result.rows.length > 0) return { id: result.rows[0].id, found: true };
  }

  // Try exact name match
  if (nombre) {
    const result = await query(
      `SELECT id FROM contactos WHERE tenant_id = $1 AND nombre ILIKE $2 AND activo = true LIMIT 1`,
      [tenantId, nombre]
    );
    if (result.rows.length > 0) return { id: result.rows[0].id, found: true };
  }

  return { id: '', found: false };
}

async function findUsuarioByName(
  tenantId: string,
  nombre: string
): Promise<string | null> {
  if (!nombre) return null;

  const result = await query(
    `SELECT u.id FROM usuarios u
     INNER JOIN usuarios_tenants ut ON u.id = ut.usuario_id
     WHERE ut.tenant_id = $1
       AND CONCAT(u.nombre, ' ', u.apellido) ILIKE $2
       AND ut.activo = true
     LIMIT 1`,
    [tenantId, `%${nombre}%`]
  );

  return result.rows.length > 0 ? result.rows[0].id : null;
}

async function findPropiedadByCodigo(
  tenantId: string,
  codigo: string
): Promise<string | null> {
  if (!codigo) return null;

  const result = await query(
    `SELECT id FROM propiedades WHERE tenant_id = $1 AND codigo = $2 AND activo = true LIMIT 1`,
    [tenantId, codigo]
  );

  return result.rows.length > 0 ? result.rows[0].id : null;
}

async function findEstadoVentaByNombre(
  tenantId: string,
  nombre: string
): Promise<string | null> {
  if (!nombre) return null;

  const result = await query(
    `SELECT id FROM estados_venta WHERE tenant_id = $1 AND nombre ILIKE $2 AND activo = true LIMIT 1`,
    [tenantId, nombre]
  );

  return result.rows.length > 0 ? result.rows[0].id : null;
}

// ============================================================================
// PREVIEW (análisis sin insertar)
// ============================================================================

export async function previewImportVentas(
  tenantId: string,
  csvContent: string
): Promise<ImportVentasPreview> {
  const rows = parseVentasCSV(csvContent);

  const contactosNuevos: string[] = [];
  const contactosExistentes: string[] = [];
  const usuariosEncontrados: string[] = [];
  const usuariosNoEncontrados: string[] = [];
  const estadosCount: Record<string, number> = {};
  let propiedadesVinculables = 0;
  let propiedadesExternas = 0;

  // Cache to avoid repeated lookups
  const contactoCache = new Map<string, boolean>();
  const usuarioCache = new Map<string, boolean>();

  for (const row of rows) {
    const contactoNombre = row['Contacto principal'];
    const telefono = row['Contacto - Telefono'];
    const email = row['Contacto - Correo electronico'];
    const cerrador = row['Cierre hecho por'];
    const esExterna = parseBool(row['Inmueble Externo']);
    const codigoPropiedad = row['Propiedad - Código'];
    const estatus = row['Estatus'];

    // Contacto lookup
    const contactoKey = telefono || email || contactoNombre;
    if (contactoKey && !contactoCache.has(contactoKey)) {
      const { found } = await findContactoByPhoneOrEmail(tenantId, telefono, email, contactoNombre);
      contactoCache.set(contactoKey, found);
      if (found) {
        contactosExistentes.push(contactoNombre);
      } else {
        contactosNuevos.push(contactoNombre);
      }
    }

    // Usuario cerrador lookup
    if (cerrador && !usuarioCache.has(cerrador)) {
      const userId = await findUsuarioByName(tenantId, cerrador);
      usuarioCache.set(cerrador, !!userId);
      if (userId) {
        usuariosEncontrados.push(cerrador);
      } else {
        usuariosNoEncontrados.push(cerrador);
      }
    }

    // Propiedad
    if (!esExterna && codigoPropiedad) {
      const propId = await findPropiedadByCodigo(tenantId, codigoPropiedad);
      if (propId) propiedadesVinculables++;
      else propiedadesExternas++;
    } else {
      propiedadesExternas++;
    }

    // Estado
    if (estatus) {
      estadosCount[estatus] = (estadosCount[estatus] || 0) + 1;
    }
  }

  return {
    total_filas: rows.length,
    contactos_nuevos: contactosNuevos,
    contactos_existentes: contactosExistentes,
    usuarios_encontrados: usuariosEncontrados,
    usuarios_no_encontrados: usuariosNoEncontrados,
    propiedades_vinculables: propiedadesVinculables,
    propiedades_externas: propiedadesExternas,
    estados_encontrados: estadosCount,
  };
}

// ============================================================================
// IMPORT (insertar ventas)
// ============================================================================

export async function importarVentas(
  tenantId: string,
  csvContent: string
): Promise<ImportVentasResult> {
  const rows = parseVentasCSV(csvContent);

  const result: ImportVentasResult = {
    total: rows.length,
    importadas: 0,
    errores: [],
    warnings: [],
    contactos_creados: 0,
    contactos_existentes: 0,
  };

  // Caches para evitar lookups repetidos
  const contactoCache = new Map<string, string>(); // key → contacto_id
  const usuarioCache = new Map<string, string | null>();
  const propiedadCache = new Map<string, string | null>();
  const estadoCache = new Map<string, string | null>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const numeroCierre = row['No. de Cierre'];
    const fila = i + 2; // +2 because 1-indexed + header row

    try {
      const valorCierre = parseFloat(row['Valor de Cierre']);
      if (!valorCierre || isNaN(valorCierre)) {
        result.errores.push({ fila, numero_cierre: numeroCierre, error: 'Valor de Cierre inválido o vacío' });
        continue;
      }

      // Check duplicate by numero_venta
      const numVenta = parseInt(numeroCierre);
      if (!isNaN(numVenta)) {
        const existingCheck = await query(
          `SELECT id FROM ventas WHERE tenant_id = $1 AND numero_venta = $2`,
          [tenantId, numVenta]
        );
        if (existingCheck.rows.length > 0) {
          result.warnings.push({ fila, numero_cierre: numeroCierre, warning: 'Venta ya existe (numero_venta duplicado), omitida' });
          continue;
        }
      }

      // 1. Resolve contacto
      let contactoId: string | null = null;
      const contactoNombre = row['Contacto principal'];
      const telefono = row['Contacto - Telefono'];
      const email = row['Contacto - Correo electronico'];
      const contactoKey = telefono || email || contactoNombre;

      if (contactoKey) {
        if (contactoCache.has(contactoKey)) {
          contactoId = contactoCache.get(contactoKey)!;
        } else {
          const found = await findContactoByPhoneOrEmail(tenantId, telefono, email, contactoNombre);
          if (found.found) {
            contactoId = found.id;
            contactoCache.set(contactoKey, found.id);
            result.contactos_existentes++;
          } else if (contactoNombre) {
            // Create contact
            const newContacto = await createContacto(tenantId, {
              nombre: contactoNombre,
              telefono: telefono || undefined,
              email: email || undefined,
              tipo: 'cliente',
              origen: 'importacion_csv',
            });
            contactoId = newContacto.id;
            contactoCache.set(contactoKey, newContacto.id);
            result.contactos_creados++;
          }
        }
      }

      // 2. Resolve usuario cerrador
      const cerrador = row['Cierre hecho por'];
      let usuarioCerradorId: string | null = null;
      if (cerrador) {
        if (usuarioCache.has(cerrador)) {
          usuarioCerradorId = usuarioCache.get(cerrador)!;
        } else {
          usuarioCerradorId = await findUsuarioByName(tenantId, cerrador);
          usuarioCache.set(cerrador, usuarioCerradorId);
          if (!usuarioCerradorId) {
            result.warnings.push({ fila, numero_cierre: numeroCierre, warning: `Usuario "${cerrador}" no encontrado` });
          }
        }
      }

      // 3. Resolve propiedad
      const esExterna = parseBool(row['Inmueble Externo']);
      let propiedadId: string | null = null;
      const codigoPropiedad = row['Propiedad - Código'];

      if (!esExterna && codigoPropiedad) {
        if (propiedadCache.has(codigoPropiedad)) {
          propiedadId = propiedadCache.get(codigoPropiedad)!;
        } else {
          propiedadId = await findPropiedadByCodigo(tenantId, codigoPropiedad);
          propiedadCache.set(codigoPropiedad, propiedadId);
        }
      }

      // 4. Resolve estado venta
      const estatus = row['Estatus'];
      let estadoVentaId: string | null = null;
      if (estatus) {
        if (estadoCache.has(estatus)) {
          estadoVentaId = estadoCache.get(estatus)!;
        } else {
          estadoVentaId = await findEstadoVentaByNombre(tenantId, estatus);
          estadoCache.set(estatus, estadoVentaId);
          if (!estadoVentaId) {
            result.warnings.push({ fila, numero_cierre: numeroCierre, warning: `Estado "${estatus}" no encontrado` });
          }
        }
      }

      // 5. Build and insert venta
      const porcentajeComision = parseFloat(row['Porcentaje Comision']) || 0;
      const montoComision = porcentajeComision > 0 ? (valorCierre * porcentajeComision) / 100 : 0;
      const moneda = row['Moneda'] || 'USD';
      const completada = parseBool(row['Estatus completado']);
      const aplicaImpuestos = parseBool(row['Impuestos Aplicados?']);
      const fechaCierre = row['Fecha Ganado'] || null;
      const fechaCreado = row['Fecha creado'] || null;
      const notas = row['Notas'] || null;
      const referidorNombre = row['Referidor'] || null;

      const sql = `
        INSERT INTO ventas (
          tenant_id, numero_venta, nombre_negocio, contacto_id,
          usuario_cerrador_id, propiedad_id, es_propiedad_externa,
          nombre_propiedad_externa, codigo_propiedad_externa,
          ciudad_propiedad, sector_propiedad, categoria_propiedad,
          numero_unidad, estado_venta_id, valor_cierre, moneda,
          porcentaje_comision, monto_comision, aplica_impuestos,
          completada, fecha_cierre, notas, referidor_nombre,
          datos_extra, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $25
        )
        RETURNING *
      `;

      const params = [
        tenantId,                                          // $1
        isNaN(numVenta) ? null : numVenta,                 // $2
        row['Negocio'] || `Venta #${numeroCierre}`,        // $3
        contactoId,                                        // $4
        usuarioCerradorId,                                 // $5
        propiedadId,                                       // $6
        esExterna,                                         // $7
        esExterna ? (row['Propiedad - Nombre'] || null) : null,          // $8
        esExterna ? (row['Propiedad - Nombre privado'] || null) : null,  // $9
        row['Propiedad - Ciudad'] || null,                 // $10
        row['Propiedad - Sector'] || null,                 // $11
        row['Propiedad - Categoría'] || null,              // $12
        row['Propiedad - Número de Unidad'] || null,       // $13
        estadoVentaId,                                     // $14
        valorCierre,                                       // $15
        moneda,                                            // $16
        porcentajeComision,                                // $17
        montoComision,                                     // $18
        aplicaImpuestos,                                   // $19
        completada,                                        // $20
        fechaCierre,                                       // $21
        notas,                                             // $22
        referidorNombre,                                   // $23
        '{}',                                              // $24 datos_extra
        fechaCreado || new Date().toISOString(),            // $25
      ];

      const insertResult = await query(sql, params);
      const ventaCreada = insertResult.rows[0];

      // 6. Create comisiones if monto > 0
      if (montoComision > 0 && ventaCreada) {
        try {
          await calcularYCrearComisiones(
            tenantId,
            ventaCreada.id,
            montoComision,
            moneda,
            porcentajeComision,
            usuarioCerradorId,
            {
              vendedor_id: usuarioCerradorId,
              captador_id: null,
              referidor_id: null,
              referidor_contacto_id: null,
              referidor_nombre: referidorNombre,
              vendedor_externo_id: null,
              vendedor_externo_tipo: null,
              vendedor_externo_nombre: null,
            }
          );
        } catch (comisionError) {
          result.warnings.push({
            fila,
            numero_cierre: numeroCierre,
            warning: `Venta importada pero error creando comisiones: ${(comisionError as Error).message}`,
          });
        }
      }

      result.importadas++;
    } catch (err) {
      result.errores.push({
        fila,
        numero_cierre: numeroCierre,
        error: (err as Error).message,
      });
    }
  }

  return result;
}
