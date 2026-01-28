/**
 * Servicio para gestionar Plantillas de Documentos
 *
 * - CRUD de plantillas (solo admin)
 * - Renderizado de plantillas con Handlebars
 * - Duplicación de plantillas
 * - Generación de documentos PDF
 */

import { query } from '../utils/db.js';

// ==================== INTERFACES ====================

export interface CampoPlantilla {
  nombre: string;
  label: string;
  tipo: 'text' | 'number' | 'date' | 'currency' | 'textarea' | 'select';
  fuente?: string; // e.g., 'contacto.nombre', 'propiedad.precio'
  opciones?: string[]; // For select type
  requerido?: boolean;
  valorDefault?: string;
}

export interface FirmantePlantilla {
  rol: string; // e.g., 'comprador', 'vendedor', 'asesor'
  nombre: string;
  email_campo?: string; // Field name for email
  orden: number;
}

export interface PlantillaDocumento {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion?: string;
  categoria: 'captacion' | 'venta' | 'alquiler' | 'legal' | 'kyc' | 'otro';
  contenido_html: string;
  campos_requeridos: CampoPlantilla[];
  requiere_firma: boolean;
  firmantes: FirmantePlantilla[];
  es_publica: boolean;
  orden: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
  created_by_id?: string;
  updated_by_id?: string;
}

export interface DocumentoGenerado {
  id: string;
  tenant_id: string;
  usuario_id?: string;
  plantilla_id?: string;
  contacto_id?: string;
  propiedad_id?: string;
  venta_id?: string;
  nombre: string;
  numero_documento?: string;
  estado: 'borrador' | 'pendiente_firma' | 'firmado' | 'anulado';
  datos_merge: Record<string, any>;
  url_documento?: string;
  tamano_archivo?: number;
  docuseal_submission_id?: string;
  docuseal_signing_url?: string;
  docuseal_signers: any[];
  fecha_generacion: string;
  fecha_firma?: string;
  fecha_expiracion?: string;
  created_at: string;
  updated_at: string;
  // Relations
  plantilla?: PlantillaDocumento;
  contacto?: { id: string; nombre: string; email?: string };
  propiedad?: { id: string; titulo: string };
}

// ==================== PLANTILLAS CRUD ====================

export async function getPlantillas(
  tenantId: string,
  filtros: { categoria?: string; activo?: boolean; es_publica?: boolean } = {}
): Promise<PlantillaDocumento[]> {
  let whereClause = 'tenant_id = $1';
  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (filtros.categoria) {
    whereClause += ` AND categoria = $${paramIndex}`;
    params.push(filtros.categoria);
    paramIndex++;
  }

  if (filtros.activo !== undefined) {
    whereClause += ` AND activo = $${paramIndex}`;
    params.push(filtros.activo);
    paramIndex++;
  }

  if (filtros.es_publica !== undefined) {
    whereClause += ` AND es_publica = $${paramIndex}`;
    params.push(filtros.es_publica);
    paramIndex++;
  }

  const sql = `
    SELECT * FROM plantillas_documentos
    WHERE ${whereClause}
    ORDER BY categoria ASC, orden ASC, nombre ASC
  `;

  const result = await query(sql, params);
  return result.rows.map(formatPlantilla);
}

export async function getPlantillaById(
  tenantId: string,
  plantillaId: string
): Promise<PlantillaDocumento | null> {
  const sql = `
    SELECT * FROM plantillas_documentos
    WHERE id = $1 AND tenant_id = $2
  `;

  const result = await query(sql, [plantillaId, tenantId]);
  return result.rows[0] ? formatPlantilla(result.rows[0]) : null;
}

export async function createPlantilla(
  tenantId: string,
  data: Partial<PlantillaDocumento>,
  createdById?: string
): Promise<PlantillaDocumento> {
  const sql = `
    INSERT INTO plantillas_documentos (
      tenant_id, nombre, descripcion, categoria, contenido_html,
      campos_requeridos, requiere_firma, firmantes, es_publica, orden,
      created_by_id, updated_by_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
    RETURNING *
  `;

  const result = await query(sql, [
    tenantId,
    data.nombre,
    data.descripcion || null,
    data.categoria || 'otro',
    data.contenido_html || '',
    JSON.stringify(data.campos_requeridos || []),
    data.requiere_firma || false,
    JSON.stringify(data.firmantes || []),
    data.es_publica !== false,
    data.orden || 0,
    createdById || null,
  ]);

  return formatPlantilla(result.rows[0]);
}

export async function updatePlantilla(
  tenantId: string,
  plantillaId: string,
  data: Partial<PlantillaDocumento>,
  updatedById?: string
): Promise<PlantillaDocumento | null> {
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  const camposSimples = ['nombre', 'descripcion', 'categoria', 'contenido_html', 'requiere_firma', 'es_publica', 'orden', 'activo'];

  for (const campo of camposSimples) {
    if (data[campo as keyof PlantillaDocumento] !== undefined) {
      updates.push(`${campo} = $${paramIndex}`);
      params.push(data[campo as keyof PlantillaDocumento]);
      paramIndex++;
    }
  }

  // JSON fields
  if (data.campos_requeridos !== undefined) {
    updates.push(`campos_requeridos = $${paramIndex}`);
    params.push(JSON.stringify(data.campos_requeridos));
    paramIndex++;
  }

  if (data.firmantes !== undefined) {
    updates.push(`firmantes = $${paramIndex}`);
    params.push(JSON.stringify(data.firmantes));
    paramIndex++;
  }

  updates.push(`updated_at = NOW()`);

  if (updatedById) {
    updates.push(`updated_by_id = $${paramIndex}`);
    params.push(updatedById);
    paramIndex++;
  }

  if (updates.length === 1) {
    return getPlantillaById(tenantId, plantillaId);
  }

  const sql = `
    UPDATE plantillas_documentos
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
    RETURNING *
  `;
  params.push(plantillaId, tenantId);

  const result = await query(sql, params);
  return result.rows[0] ? formatPlantilla(result.rows[0]) : null;
}

export async function deletePlantilla(
  tenantId: string,
  plantillaId: string
): Promise<boolean> {
  // Soft delete
  const sql = `
    UPDATE plantillas_documentos
    SET activo = false, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
  `;

  const result = await query(sql, [plantillaId, tenantId]);
  return (result.rowCount ?? 0) > 0;
}

export async function duplicarPlantilla(
  tenantId: string,
  plantillaId: string,
  createdById?: string
): Promise<PlantillaDocumento | null> {
  const original = await getPlantillaById(tenantId, plantillaId);
  if (!original) return null;

  return createPlantilla(tenantId, {
    nombre: `${original.nombre} (copia)`,
    descripcion: original.descripcion,
    categoria: original.categoria,
    contenido_html: original.contenido_html,
    campos_requeridos: original.campos_requeridos,
    requiere_firma: original.requiere_firma,
    firmantes: original.firmantes,
    es_publica: original.es_publica,
    orden: original.orden,
  }, createdById);
}

// ==================== DOCUMENTOS GENERADOS ====================

export interface DocumentosFiltros {
  estado?: string;
  plantilla_id?: string;
  contacto_id?: string;
  propiedad_id?: string;
  usuario_id?: string;
  page?: number;
  limit?: number;
}

export interface DocumentosResponse {
  data: DocumentoGenerado[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getDocumentosGenerados(
  tenantId: string,
  filtros: DocumentosFiltros = {}
): Promise<DocumentosResponse> {
  const { estado, plantilla_id, contacto_id, propiedad_id, usuario_id, page = 1, limit = 50 } = filtros;
  const offset = (page - 1) * limit;

  let whereClause = 'dg.tenant_id = $1';
  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (estado) {
    whereClause += ` AND dg.estado = $${paramIndex}`;
    params.push(estado);
    paramIndex++;
  }

  if (plantilla_id) {
    whereClause += ` AND dg.plantilla_id = $${paramIndex}`;
    params.push(plantilla_id);
    paramIndex++;
  }

  if (contacto_id) {
    whereClause += ` AND dg.contacto_id = $${paramIndex}`;
    params.push(contacto_id);
    paramIndex++;
  }

  if (propiedad_id) {
    whereClause += ` AND dg.propiedad_id = $${paramIndex}`;
    params.push(propiedad_id);
    paramIndex++;
  }

  if (usuario_id) {
    whereClause += ` AND dg.usuario_id = $${paramIndex}`;
    params.push(usuario_id);
    paramIndex++;
  }

  // Count total
  const countSql = `SELECT COUNT(*) as total FROM documentos_generados dg WHERE ${whereClause}`;
  const countResult = await query(countSql, params);
  const total = parseInt(countResult.rows[0].total);

  // Get data with relations
  const dataSql = `
    SELECT
      dg.*,
      p.nombre as plantilla_nombre,
      c.nombre as contacto_nombre, c.email as contacto_email,
      prop.titulo as propiedad_titulo
    FROM documentos_generados dg
    LEFT JOIN plantillas_documentos p ON p.id = dg.plantilla_id
    LEFT JOIN contactos c ON c.id = dg.contacto_id
    LEFT JOIN propiedades prop ON prop.id = dg.propiedad_id
    WHERE ${whereClause}
    ORDER BY dg.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  params.push(limit, offset);

  const result = await query(dataSql, params);

  return {
    data: result.rows.map(formatDocumentoGenerado),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getDocumentoGeneradoById(
  tenantId: string,
  documentoId: string
): Promise<DocumentoGenerado | null> {
  const sql = `
    SELECT
      dg.*,
      p.nombre as plantilla_nombre, p.contenido_html as plantilla_contenido,
      c.nombre as contacto_nombre, c.email as contacto_email,
      prop.titulo as propiedad_titulo
    FROM documentos_generados dg
    LEFT JOIN plantillas_documentos p ON p.id = dg.plantilla_id
    LEFT JOIN contactos c ON c.id = dg.contacto_id
    LEFT JOIN propiedades prop ON prop.id = dg.propiedad_id
    WHERE dg.id = $1 AND dg.tenant_id = $2
  `;

  const result = await query(sql, [documentoId, tenantId]);
  return result.rows[0] ? formatDocumentoGenerado(result.rows[0]) : null;
}

export async function createDocumentoGenerado(
  tenantId: string,
  data: Partial<DocumentoGenerado>,
  usuarioId?: string
): Promise<DocumentoGenerado> {
  const sql = `
    INSERT INTO documentos_generados (
      tenant_id, usuario_id, plantilla_id, contacto_id, propiedad_id, venta_id,
      nombre, numero_documento, estado, datos_merge, url_documento, tamano_archivo,
      docuseal_submission_id, docuseal_signing_url, docuseal_signers, fecha_expiracion
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *
  `;

  const result = await query(sql, [
    tenantId,
    usuarioId || data.usuario_id || null,
    data.plantilla_id || null,
    data.contacto_id || null,
    data.propiedad_id || null,
    data.venta_id || null,
    data.nombre,
    data.numero_documento || null,
    data.estado || 'borrador',
    JSON.stringify(data.datos_merge || {}),
    data.url_documento || null,
    data.tamano_archivo || null,
    data.docuseal_submission_id || null,
    data.docuseal_signing_url || null,
    JSON.stringify(data.docuseal_signers || []),
    data.fecha_expiracion || null,
  ]);

  return formatDocumentoGenerado(result.rows[0]);
}

export async function updateDocumentoGenerado(
  tenantId: string,
  documentoId: string,
  data: Partial<DocumentoGenerado>
): Promise<DocumentoGenerado | null> {
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  const camposSimples = [
    'nombre', 'numero_documento', 'estado', 'url_documento', 'tamano_archivo',
    'docuseal_submission_id', 'docuseal_signing_url', 'fecha_firma', 'fecha_expiracion'
  ];

  for (const campo of camposSimples) {
    if (data[campo as keyof DocumentoGenerado] !== undefined) {
      updates.push(`${campo} = $${paramIndex}`);
      params.push(data[campo as keyof DocumentoGenerado]);
      paramIndex++;
    }
  }

  // JSON fields
  if (data.datos_merge !== undefined) {
    updates.push(`datos_merge = $${paramIndex}`);
    params.push(JSON.stringify(data.datos_merge));
    paramIndex++;
  }

  if (data.docuseal_signers !== undefined) {
    updates.push(`docuseal_signers = $${paramIndex}`);
    params.push(JSON.stringify(data.docuseal_signers));
    paramIndex++;
  }

  updates.push(`updated_at = NOW()`);

  const sql = `
    UPDATE documentos_generados
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
    RETURNING *
  `;
  params.push(documentoId, tenantId);

  const result = await query(sql, params);
  return result.rows[0] ? formatDocumentoGenerado(result.rows[0]) : null;
}

// ==================== HELPERS ====================

function formatPlantilla(row: any): PlantillaDocumento {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    categoria: row.categoria,
    contenido_html: row.contenido_html,
    campos_requeridos: typeof row.campos_requeridos === 'string'
      ? JSON.parse(row.campos_requeridos)
      : (row.campos_requeridos || []),
    requiere_firma: row.requiere_firma,
    firmantes: typeof row.firmantes === 'string'
      ? JSON.parse(row.firmantes)
      : (row.firmantes || []),
    es_publica: row.es_publica,
    orden: row.orden,
    activo: row.activo,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by_id: row.created_by_id,
    updated_by_id: row.updated_by_id,
  };
}

function formatDocumentoGenerado(row: any): DocumentoGenerado {
  const doc: DocumentoGenerado = {
    id: row.id,
    tenant_id: row.tenant_id,
    usuario_id: row.usuario_id,
    plantilla_id: row.plantilla_id,
    contacto_id: row.contacto_id,
    propiedad_id: row.propiedad_id,
    venta_id: row.venta_id,
    nombre: row.nombre,
    numero_documento: row.numero_documento,
    estado: row.estado,
    datos_merge: typeof row.datos_merge === 'string'
      ? JSON.parse(row.datos_merge)
      : (row.datos_merge || {}),
    url_documento: row.url_documento,
    tamano_archivo: row.tamano_archivo,
    docuseal_submission_id: row.docuseal_submission_id,
    docuseal_signing_url: row.docuseal_signing_url,
    docuseal_signers: typeof row.docuseal_signers === 'string'
      ? JSON.parse(row.docuseal_signers)
      : (row.docuseal_signers || []),
    fecha_generacion: row.fecha_generacion,
    fecha_firma: row.fecha_firma,
    fecha_expiracion: row.fecha_expiracion,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  // Add relations if joined
  if (row.plantilla_nombre) {
    doc.plantilla = {
      id: row.plantilla_id,
      tenant_id: row.tenant_id,
      nombre: row.plantilla_nombre,
    } as any;
  }

  if (row.contacto_nombre) {
    doc.contacto = {
      id: row.contacto_id,
      nombre: row.contacto_nombre,
      email: row.contacto_email,
    };
  }

  if (row.propiedad_titulo) {
    doc.propiedad = {
      id: row.propiedad_id,
      titulo: row.propiedad_titulo,
    };
  }

  return doc;
}

// ==================== SEED DEFAULT TEMPLATES ====================

export async function seedDefaultPlantillas(tenantId: string, createdById?: string): Promise<void> {
  const defaultPlantillas = [
    {
      nombre: 'Hoja de Captación - Venta Exclusiva',
      descripcion: 'Contrato de exclusividad para venta de propiedad',
      categoria: 'captacion',
      contenido_html: `
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
  <h1 style="text-align: center; color: #333;">CONTRATO DE CAPTACIÓN EN EXCLUSIVA</h1>
  <h2 style="text-align: center; color: #666;">PARA VENTA DE INMUEBLE</h2>

  <p style="text-align: right;">Fecha: {{fecha}}</p>

  <p>En la ciudad de {{ciudad}}, a los {{dia}} días del mes de {{mes}} del año {{ano}},</p>

  <h3>ENTRE:</h3>
  <p><strong>EL PROPIETARIO:</strong> {{propietario_nombre}}, portador de la Cédula de Identidad No. {{propietario_cedula}}, domiciliado en {{propietario_direccion}}, teléfono {{propietario_telefono}}, correo electrónico {{propietario_email}}.</p>

  <p><strong>LA INMOBILIARIA:</strong> {{empresa_nombre}}, representada por {{asesor_nombre}}, con RNC {{empresa_rnc}}.</p>

  <h3>PROPIEDAD EN CAPTACIÓN:</h3>
  <p>Ubicación: {{propiedad_direccion}}</p>
  <p>Tipo: {{propiedad_tipo}}</p>
  <p>Área: {{propiedad_area}} m²</p>
  <p>Precio de Venta: {{propiedad_precio}}</p>

  <h3>ACUERDAN:</h3>
  <ol>
    <li>El propietario otorga a la inmobiliaria la <strong>exclusividad</strong> para la comercialización del inmueble por un período de {{duracion_meses}} meses.</li>
    <li>La comisión acordada es del {{comision_porcentaje}}% sobre el precio de venta.</li>
    <li>La inmobiliaria se compromete a promocionar activamente la propiedad.</li>
  </ol>

  <div style="margin-top: 60px;">
    <div style="display: inline-block; width: 45%;">
      <p style="border-top: 1px solid #333; padding-top: 10px;">EL PROPIETARIO</p>
      <p>{{propietario_nombre}}</p>
    </div>
    <div style="display: inline-block; width: 45%; margin-left: 5%;">
      <p style="border-top: 1px solid #333; padding-top: 10px;">LA INMOBILIARIA</p>
      <p>{{asesor_nombre}}</p>
    </div>
  </div>
</div>
      `.trim(),
      campos_requeridos: [
        { nombre: 'fecha', label: 'Fecha', tipo: 'date', requerido: true },
        { nombre: 'ciudad', label: 'Ciudad', tipo: 'text', requerido: true },
        { nombre: 'propietario_nombre', label: 'Nombre del Propietario', tipo: 'text', fuente: 'contacto.nombre', requerido: true },
        { nombre: 'propietario_cedula', label: 'Cédula del Propietario', tipo: 'text', requerido: true },
        { nombre: 'propietario_direccion', label: 'Dirección del Propietario', tipo: 'text', requerido: true },
        { nombre: 'propietario_telefono', label: 'Teléfono', tipo: 'text', fuente: 'contacto.telefono' },
        { nombre: 'propietario_email', label: 'Email', tipo: 'text', fuente: 'contacto.email' },
        { nombre: 'propiedad_direccion', label: 'Dirección de la Propiedad', tipo: 'text', fuente: 'propiedad.direccion' },
        { nombre: 'propiedad_tipo', label: 'Tipo de Propiedad', tipo: 'text', fuente: 'propiedad.tipo' },
        { nombre: 'propiedad_area', label: 'Área (m²)', tipo: 'number', fuente: 'propiedad.area' },
        { nombre: 'propiedad_precio', label: 'Precio de Venta', tipo: 'currency', fuente: 'propiedad.precio' },
        { nombre: 'duracion_meses', label: 'Duración (meses)', tipo: 'number', valorDefault: '6' },
        { nombre: 'comision_porcentaje', label: 'Comisión (%)', tipo: 'number', valorDefault: '5' },
      ],
      requiere_firma: true,
      firmantes: [
        { rol: 'propietario', nombre: 'Propietario', email_campo: 'propietario_email', orden: 1 },
        { rol: 'asesor', nombre: 'Asesor Inmobiliario', orden: 2 },
      ],
    },
    {
      nombre: 'Formulario Conozca a su Cliente (KYC)',
      descripcion: 'Formulario de identificación y verificación de cliente',
      categoria: 'kyc',
      contenido_html: `
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
  <h1 style="text-align: center;">FORMULARIO CONOZCA A SU CLIENTE</h1>

  <h3>DATOS PERSONALES</h3>
  <table style="width: 100%; border-collapse: collapse;">
    <tr><td style="border: 1px solid #ccc; padding: 8px;"><strong>Nombre Completo:</strong></td><td style="border: 1px solid #ccc; padding: 8px;">{{nombre_completo}}</td></tr>
    <tr><td style="border: 1px solid #ccc; padding: 8px;"><strong>Cédula/Pasaporte:</strong></td><td style="border: 1px solid #ccc; padding: 8px;">{{documento_identidad}}</td></tr>
    <tr><td style="border: 1px solid #ccc; padding: 8px;"><strong>Fecha de Nacimiento:</strong></td><td style="border: 1px solid #ccc; padding: 8px;">{{fecha_nacimiento}}</td></tr>
    <tr><td style="border: 1px solid #ccc; padding: 8px;"><strong>Nacionalidad:</strong></td><td style="border: 1px solid #ccc; padding: 8px;">{{nacionalidad}}</td></tr>
    <tr><td style="border: 1px solid #ccc; padding: 8px;"><strong>Estado Civil:</strong></td><td style="border: 1px solid #ccc; padding: 8px;">{{estado_civil}}</td></tr>
    <tr><td style="border: 1px solid #ccc; padding: 8px;"><strong>Dirección:</strong></td><td style="border: 1px solid #ccc; padding: 8px;">{{direccion}}</td></tr>
    <tr><td style="border: 1px solid #ccc; padding: 8px;"><strong>Teléfono:</strong></td><td style="border: 1px solid #ccc; padding: 8px;">{{telefono}}</td></tr>
    <tr><td style="border: 1px solid #ccc; padding: 8px;"><strong>Email:</strong></td><td style="border: 1px solid #ccc; padding: 8px;">{{email}}</td></tr>
  </table>

  <h3>INFORMACIÓN LABORAL</h3>
  <table style="width: 100%; border-collapse: collapse;">
    <tr><td style="border: 1px solid #ccc; padding: 8px;"><strong>Ocupación:</strong></td><td style="border: 1px solid #ccc; padding: 8px;">{{ocupacion}}</td></tr>
    <tr><td style="border: 1px solid #ccc; padding: 8px;"><strong>Empresa:</strong></td><td style="border: 1px solid #ccc; padding: 8px;">{{empresa}}</td></tr>
    <tr><td style="border: 1px solid #ccc; padding: 8px;"><strong>Cargo:</strong></td><td style="border: 1px solid #ccc; padding: 8px;">{{cargo}}</td></tr>
    <tr><td style="border: 1px solid #ccc; padding: 8px;"><strong>Ingresos Mensuales:</strong></td><td style="border: 1px solid #ccc; padding: 8px;">{{ingresos_mensuales}}</td></tr>
  </table>

  <h3>ORIGEN DE FONDOS</h3>
  <p>Origen de los fondos para la transacción: {{origen_fondos}}</p>

  <h3>DECLARACIÓN</h3>
  <p>Declaro que la información proporcionada es verdadera y me comprometo a notificar cualquier cambio.</p>

  <div style="margin-top: 40px;">
    <p style="border-top: 1px solid #333; width: 50%; padding-top: 10px;">Firma del Cliente</p>
    <p>Fecha: {{fecha}}</p>
  </div>
</div>
      `.trim(),
      campos_requeridos: [
        { nombre: 'nombre_completo', label: 'Nombre Completo', tipo: 'text', fuente: 'contacto.nombre', requerido: true },
        { nombre: 'documento_identidad', label: 'Cédula/Pasaporte', tipo: 'text', requerido: true },
        { nombre: 'fecha_nacimiento', label: 'Fecha de Nacimiento', tipo: 'date' },
        { nombre: 'nacionalidad', label: 'Nacionalidad', tipo: 'text' },
        { nombre: 'estado_civil', label: 'Estado Civil', tipo: 'select', opciones: ['Soltero/a', 'Casado/a', 'Divorciado/a', 'Viudo/a', 'Unión Libre'] },
        { nombre: 'direccion', label: 'Dirección', tipo: 'textarea' },
        { nombre: 'telefono', label: 'Teléfono', tipo: 'text', fuente: 'contacto.telefono' },
        { nombre: 'email', label: 'Email', tipo: 'text', fuente: 'contacto.email' },
        { nombre: 'ocupacion', label: 'Ocupación', tipo: 'text' },
        { nombre: 'empresa', label: 'Empresa', tipo: 'text', fuente: 'contacto.empresa' },
        { nombre: 'cargo', label: 'Cargo', tipo: 'text', fuente: 'contacto.cargo' },
        { nombre: 'ingresos_mensuales', label: 'Ingresos Mensuales', tipo: 'currency' },
        { nombre: 'origen_fondos', label: 'Origen de Fondos', tipo: 'textarea', requerido: true },
        { nombre: 'fecha', label: 'Fecha', tipo: 'date', requerido: true },
      ],
      requiere_firma: true,
      firmantes: [
        { rol: 'cliente', nombre: 'Cliente', email_campo: 'email', orden: 1 },
      ],
    },
  ];

  for (const plantilla of defaultPlantillas) {
    // Check if plantilla already exists
    const existing = await query(
      'SELECT id FROM plantillas_documentos WHERE tenant_id = $1 AND nombre = $2',
      [tenantId, plantilla.nombre]
    );

    if (existing.rows.length === 0) {
      await createPlantilla(tenantId, plantilla as any, createdById);
    }
  }
}
