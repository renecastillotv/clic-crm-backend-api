/**
 * Script para migrar ventas cerradas desde CSV a la nueva estructura
 * 
 * Uso: tsx -r dotenv/config src/scripts/migrate-closed-deals.ts
 */

import knex from 'knex';
import config from '../config/knexfile.js';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const environment = process.env.NODE_ENV || 'development';
const knexConfig = config[environment as keyof typeof config];

if (!knexConfig) {
  console.error(`No configuration found for environment: ${environment}`);
  process.exit(1);
}

const db = knex(knexConfig);

interface CSVRow {
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
  'Propiedad - Habitaciones': string;
  'Propiedad - Baños': string;
  'Propiedades': string;
  'Estatus': string;
  'Moneda': string;
  'Valor de Cierre': string;
  'Impuestos Aplicados?': string;
  'Porcentaje Comision': string;
  'Equipo': string;
  'Tipo de Cierre': string;
  'Estatus completado': string;
  'Fecha Ganado': string;
  'Notas': string;
  'Ultima actualizacion': string;
  'Fecha creado': string;
  'Referidor': string;
  'Referidor (USD)': string;
}

// Función para parsear CSV robusta (maneja comas y saltos de línea dentro de campos con comillas)
function parseCSV(content: string): CSVRow[] {
  if (!content || content.trim().length === 0) return [];

  const rows: CSVRow[] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  // Función para procesar un carácter
  const processChar = (char: string, nextChar?: string) => {
    if (char === '"') {
      // Si hay dos comillas seguidas, es una comilla escapada
      if (nextChar === '"') {
        currentField += '"';
        return 1; // Saltar el siguiente carácter también
      }
      inQuotes = !inQuotes;
      return 0;
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
      return 0;
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      // Fin de fila
      if (char === '\r' && nextChar === '\n') {
        // Windows line ending, saltar ambos
        currentRow.push(currentField.trim());
        currentField = '';
        return 1;
      }
      currentRow.push(currentField.trim());
      currentField = '';
      return 0;
    } else {
      currentField += char;
      return 0;
    }
  };

  // Parsear línea por línea, pero respetando comillas
  const lines: string[] = [];
  let currentLine = '';
  inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = i < content.length - 1 ? content[i + 1] : '';

    if (char === '"') {
      if (nextChar === '"') {
        currentLine += '"';
        i++; // Saltar la siguiente comilla
      } else {
        inQuotes = !inQuotes;
        currentLine += char;
      }
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
      if (char === '\r') i++; // Saltar el \n también
      lines.push(currentLine);
      currentLine = '';
    } else {
      currentLine += char;
    }
  }
  if (currentLine) lines.push(currentLine);

  if (lines.length < 2) return [];

  // Parsear headers
  const headerLine = lines[0];
  const headers: string[] = [];
  currentField = '';
  inQuotes = false;

  for (let i = 0; i < headerLine.length; i++) {
    const char = headerLine[i];
    const nextChar = i < headerLine.length - 1 ? headerLine[i + 1] : '';

    if (char === '"') {
      if (nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      headers.push(currentField.trim());
      currentField = '';
    } else {
      currentField += char;
    }
  }
  headers.push(currentField.trim());

  // Parsear cada fila
  for (let lineIdx = 1; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const values: string[] = [];
    currentField = '';
    inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = i < line.length - 1 ? line[i + 1] : '';

      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    values.push(currentField.trim());

    // Solo procesar si tiene el número correcto de columnas o al menos el número de cierre
    if (values.length >= headers.length || (values[0] && /^\d+$/.test(values[0]))) {
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      // Validar que tenga número de cierre válido
      if (row['No. de Cierre'] && /^\d+$/.test(row['No. de Cierre'].trim())) {
        rows.push(row as CSVRow);
      }
    }
  }

  return rows;
}

// Mapear operación del CSV a nuestro sistema
function mapOperacion(operacion: string): string {
  const map: Record<string, string> = {
    '3': 'venta',
    '4': 'renta',
  };
  return map[operacion] || 'venta';
}

// Mapear estado del CSV a nuestro sistema
function mapEstado(estatus: string): string {
  const estadosMap: Record<string, string> = {
    'Reserva': 'En Proceso',
    'Separación': 'En Proceso',
    'Firma de la Promesa': 'Contrato Pendiente',
    'Firma Contrato Definitivo': 'Contrato Pendiente',
    'Financiamiento': 'En Proceso',
    'Entrega de la Propiedad': 'Completada',
    'Cierre': 'Completada',
    'Nuevo / Sin Contacto': 'En Proceso',
  };
  return estadosMap[estatus] || 'En Proceso';
}

async function findOrCreateContacto(
  tenantId: string,
  nombre: string,
  telefono?: string,
  email?: string
): Promise<string | null> {
  if (!nombre || nombre.trim() === '') return null;

  // Buscar por nombre
  let contacto = await db('contactos')
    .where('tenant_id', tenantId)
    .whereRaw("LOWER(TRIM(nombre || ' ' || COALESCE(apellido, ''))) = LOWER(TRIM(?))", [nombre.trim()])
    .first();

  if (!contacto && email) {
    // Buscar por email
    contacto = await db('contactos')
      .where('tenant_id', tenantId)
      .whereRaw('LOWER(email) = LOWER(?)', [email.trim()])
      .first();
  }

  if (!contacto && telefono) {
    // Buscar por teléfono
    contacto = await db('contactos')
      .where('tenant_id', tenantId)
      .whereRaw('telefono = ?', [telefono.trim()])
      .first();
  }

  if (contacto) {
    return contacto.id;
  }

  // Crear nuevo contacto
  const [nombrePart, apellidoPart] = nombre.trim().split(' ').filter(Boolean);
  const nuevoContacto = await db('contactos')
    .insert({
      tenant_id: tenantId,
      nombre: nombrePart || nombre.trim(),
      apellido: apellidoPart || null,
      email: email || null,
      telefono: telefono || null,
      tipo: 'cliente',
      activo: true,
    })
    .returning('id');

  return nuevoContacto[0].id;
}

async function findUsuarioByName(tenantId: string, nombre: string): Promise<string | null> {
  if (!nombre || nombre.trim() === '') return null;

  const nombreCompleto = nombre.trim();
  const partes = nombreCompleto.split(' ').filter(Boolean);
  const nombrePart = partes[0] || '';
  const apellidoPart = partes.slice(1).join(' ') || null;

  const usuario = await db('usuarios')
    .join('usuarios_tenants', 'usuarios.id', 'usuarios_tenants.usuario_id')
    .where('usuarios_tenants.tenant_id', tenantId)
    .where('usuarios_tenants.activo', true)
    .where(function() {
      if (apellidoPart) {
        this.whereRaw("LOWER(usuarios.nombre) = LOWER(?) AND LOWER(COALESCE(usuarios.apellido, '')) = LOWER(?)", [nombrePart, apellidoPart]);
      } else {
        // Si solo hay un nombre, buscar por nombre completo o solo nombre
        this.where(function() {
          this.whereRaw("LOWER(usuarios.nombre || ' ' || COALESCE(usuarios.apellido, '')) = LOWER(?)", [nombreCompleto])
            .orWhereRaw("LOWER(usuarios.nombre) = LOWER(?)", [nombreCompleto]);
        });
      }
    })
    .select('usuarios.id')
    .first();

  return usuario?.id || null;
}

async function findPropiedadByCodigo(tenantId: string, codigo: string): Promise<string | null> {
  if (!codigo || codigo.trim() === '') return null;

  const propiedad = await db('propiedades')
    .where('tenant_id', tenantId)
    .where('codigo', codigo.trim())
    .first();

  return propiedad?.id || null;
}

async function findEstadoVenta(tenantId: string, nombreEstado: string): Promise<string | null> {
  const estado = await db('estados_venta')
    .where('tenant_id', tenantId)
    .whereRaw('LOWER(nombre) = LOWER(?)', [nombreEstado.trim()])
    .first();

  return estado?.id || null;
}

async function migrateDeals() {
  try {
    console.log('📥 Iniciando migración de ventas cerradas...\n');

    // Leer el CSV (buscar en varias ubicaciones posibles)
    const possiblePaths = [
      path.join(process.cwd(), '../../closeddeals.csv'), // Desde packages/api hacia raíz
      path.join(process.cwd(), '../../../closeddeals.csv'), // Desde packages/api/src/scripts hacia raíz
      path.join(__dirname, '../../../closeddeals.csv'),
      path.join(process.cwd(), 'closeddeals.csv'),
      path.join(process.cwd(), '../closeddeals.csv'),
    ];

    let csvPath: string | null = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        csvPath = possiblePath;
        break;
      }
    }

    if (!csvPath) {
      console.error(`❌ No se encontró el archivo closeddeals.csv en ninguna de estas ubicaciones:`);
      possiblePaths.forEach(p => console.error(`   - ${p}`));
      process.exit(1);
    }

    console.log(`📄 Leyendo CSV desde: ${csvPath}\n`);

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const rows = parseCSV(csvContent);

    console.log(`📊 Encontradas ${rows.length} ventas en el CSV\n`);

    // Obtener todos los tenants (asumimos que queremos migrar a todos o al primero)
    const tenants = await db('tenants').where('activo', true);
    if (tenants.length === 0) {
      console.error('❌ No se encontraron tenants activos');
      process.exit(1);
    }

    // Por ahora, usar el primer tenant (puedes modificar esto)
    const tenantId = tenants[0].id;
    console.log(`🏢 Migrando a tenant: ${tenants[0].nombre} (${tenantId})\n`);

    // Limpiar ventas existentes del tenant (opcional, comentar si no quieres limpiar)
    const ventasExistentes = await db('ventas').where('tenant_id', tenantId).count('id as count');
    const countExistentes = parseInt(ventasExistentes[0]?.count as string || '0');
    if (countExistentes > 0) {
      console.log(`⚠️  Encontradas ${countExistentes} ventas existentes. Eliminándolas antes de migrar...\n`);
      await db('ventas').where('tenant_id', tenantId).delete();
      console.log(`✅ Ventas existentes eliminadas.\n`);
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        console.log(`\n[${i + 1}/${rows.length}] Procesando venta #${row['No. de Cierre']}...`);

        // Buscar o crear contacto
        const contactoId = await findOrCreateContacto(
          tenantId,
          row['Contacto principal'],
          row['Contacto - Telefono'] || undefined,
          row['Contacto - Correo electronico'] || undefined
        );

        // Buscar usuario cerrador
        const usuarioCerradorId = await findUsuarioByName(tenantId, row['Cierre hecho por']);

        // Buscar propiedad
        let propiedadId: string | null = null;
        const esPropiedadExterna = row['Inmueble Externo'] === 'True';

        if (!esPropiedadExterna && row['Propiedad - Código']) {
          propiedadId = await findPropiedadByCodigo(tenantId, row['Propiedad - Código']);
        }

        // Buscar estado de venta
        const estadoNombre = mapEstado(row['Estatus']);
        const estadoVentaId = await findEstadoVenta(tenantId, estadoNombre);

        // Validar número de cierre PRIMERO
        const numeroCierre = row['No. de Cierre']?.trim();
        if (!numeroCierre || !/^\d+$/.test(numeroCierre)) {
          console.log(`⚠️ Saltando fila ${i + 1}: número de cierre inválido: "${numeroCierre}"`);
          errorCount++;
          errors.push(`Fila ${i + 1}: número de cierre inválido: "${numeroCierre}"`);
          continue;
        }

        // Calcular monto de comisión (limpiar comas de los valores)
        const valorCierreStr = (row['Valor de Cierre'] || '0').toString().replace(/,/g, '').trim();
        const valorCierre = parseFloat(valorCierreStr) || 0;
        const porcentajeComisionStr = (row['Porcentaje Comision'] || '0').toString().replace(/,/g, '').trim();
        const porcentajeComision = parseFloat(porcentajeComisionStr) || 0;
        const montoComision = porcentajeComision > 0 && valorCierre > 0 ? (valorCierre * porcentajeComision) / 100 : null;

        // Determinar si está completada
        const completada = row['Estatus completado'] === 'True' || 
                          row['Estatus'] === 'Cierre' || 
                          row['Estatus'] === 'Entrega de la Propiedad';

        // Preparar datos de la venta
        const ventaData: any = {
          tenant_id: tenantId,
          numero_venta: parseInt(numeroCierre),
          nombre_negocio: row['Negocio'] || null,
          descripcion: null,
          propiedad_id: propiedadId,
          contacto_id: contactoId,
          usuario_cerrador_id: usuarioCerradorId,
          equipo_id: null,
          estado_venta_id: estadoVentaId,
          vendedor_externo_tipo: null,
          vendedor_externo_nombre: null,
          vendedor_externo_contacto: null,
          vendedor_externo_id: null,
          referidor_nombre: row['Referidor'] || null,
          referidor_id: null,
          referidor_contacto_id: null,
          es_propiedad_externa: esPropiedadExterna,
          nombre_propiedad_externa: esPropiedadExterna ? (row['Propiedad - Nombre'] || row['Negocio']) : null,
          codigo_propiedad_externa: esPropiedadExterna ? row['Propiedad - Código'] : null,
          ciudad_propiedad: row['Propiedad - Ciudad'] || null,
          sector_propiedad: row['Propiedad - Sector'] || null,
          categoria_propiedad: row['Propiedad - Categoría'] || null,
          numero_unidad: row['Propiedad - Número de Unidad'] || null,
          valor_cierre: valorCierre,
          moneda: row['Moneda'] || 'USD',
          porcentaje_comision: porcentajeComision > 0 ? porcentajeComision : null,
          monto_comision: montoComision,
          fecha_cierre: row['Fecha Ganado'] ? new Date(row['Fecha Ganado']) : null,
          aplica_impuestos: row['Impuestos Aplicados?'] === 'True',
          monto_impuestos: null,
          notas: row['Notas'] || null,
          datos_extra: JSON.stringify({
            tipo_cierre: row['Tipo de Cierre'],
            equipo: row['Equipo'],
            es_proyecto: row['Es un proyecto?'] === 'True',
            referidor_usd: row['Referidor (USD)'] || null,
          }),
          completada: completada,
          cancelada: false,
          activo: true,
        };

        // Verificar si ya existe una venta con este número
        const existe = await db('ventas')
          .where('tenant_id', tenantId)
          .where('numero_venta', parseInt(numeroCierre))
          .first();

        if (existe) {
          console.log(`⚠️ Venta #${numeroCierre} ya existe, actualizando...`);
          await db('ventas')
            .where('id', existe.id)
            .update({
              ...ventaData,
              updated_at: db.fn.now(),
            });
        } else {
          // Insertar venta
          await db('ventas').insert(ventaData);
        }

        console.log(`✅ Venta #${numeroCierre} migrada correctamente`);
        successCount++;

      } catch (error: any) {
        console.error(`❌ Error procesando venta #${row['No. de Cierre']}:`, error.message);
        errors.push(`Venta #${row['No. de Cierre']}: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(60));
    console.log(`✅ Ventas migradas exitosamente: ${successCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errores detallados:');
      errors.forEach(err => console.log(`   - ${err}`));
    }

    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    await db.destroy();
    process.exit(1);
  }
}

migrateDeals();

