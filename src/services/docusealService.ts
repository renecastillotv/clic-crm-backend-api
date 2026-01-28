/**
 * Servicio para integración con DocuSeal
 *
 * - Enviar documentos para firma electrónica
 * - Consultar estado de firmas
 * - Recibir webhooks de notificación
 * - Descargar documentos firmados
 */

import { query } from '../utils/db.js';

// ==================== CONFIGURATION ====================

const DOCUSEAL_URL = process.env.DOCUSEAL_URL || 'https://docuseal.clicinmobiliaria.com';
const DOCUSEAL_API_KEY = process.env.DOCUSEAL_API_KEY || '';

// ==================== INTERFACES ====================

export interface DocuSealSigner {
  name: string;
  email: string;
  role?: string;
  phone?: string;
}

export interface DocuSealSubmissionRequest {
  template_id?: number;
  document_url?: string;
  send_email?: boolean;
  signers: DocuSealSigner[];
  message?: {
    subject?: string;
    body?: string;
  };
  fields?: Record<string, any>;
  expire_at?: string;
  external_id?: string;
}

export interface DocuSealSubmission {
  id: number;
  source: string;
  status: 'pending' | 'completed' | 'expired';
  audit_log_url: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  expire_at: string | null;
  submitters: DocuSealSubmitter[];
}

export interface DocuSealSubmitter {
  id: number;
  submission_id: number;
  uuid: string;
  email: string;
  slug: string;
  sent_at: string | null;
  opened_at: string | null;
  completed_at: string | null;
  declined_at: string | null;
  created_at: string;
  updated_at: string;
  name: string;
  phone: string | null;
  status: 'pending' | 'sent' | 'opened' | 'completed' | 'declined';
  role: string;
  embed_src: string;
  values: Record<string, any>;
  metadata: Record<string, any>;
  documents: DocuSealDocument[];
}

export interface DocuSealDocument {
  name: string;
  url: string;
}

export interface DocuSealTemplate {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  folder_name: string | null;
  fields: any[];
}

export interface EnviarAFirmaInput {
  documento_generado_id: string;
  firmantes: {
    nombre: string;
    email: string;
    rol?: string;
  }[];
  mensaje?: {
    asunto?: string;
    cuerpo?: string;
  };
  enviar_email?: boolean;
}

export interface EnviarAFirmaResult {
  submission_id: number;
  signing_urls: {
    email: string;
    url: string;
  }[];
  status: string;
}

// ==================== API HELPERS ====================

async function docusealFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!DOCUSEAL_API_KEY) {
    throw new Error('DOCUSEAL_API_KEY no está configurado');
  }

  const url = `${DOCUSEAL_URL}/api${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'X-Auth-Token': DOCUSEAL_API_KEY,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('DocuSeal API Error:', response.status, errorText);
    throw new Error(`DocuSeal API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// ==================== TEMPLATES ====================

/**
 * Lista todas las plantillas disponibles en DocuSeal
 */
export async function getTemplates(): Promise<DocuSealTemplate[]> {
  return docusealFetch<DocuSealTemplate[]>('/templates');
}

/**
 * Obtiene una plantilla por ID
 */
export async function getTemplateById(templateId: number): Promise<DocuSealTemplate> {
  return docusealFetch<DocuSealTemplate>(`/templates/${templateId}`);
}

// ==================== SUBMISSIONS ====================

/**
 * Crea una nueva submission (envío para firma)
 */
export async function createSubmission(
  request: DocuSealSubmissionRequest
): Promise<DocuSealSubmission> {
  return docusealFetch<DocuSealSubmission>('/submissions', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Crea una submission desde una URL de documento
 */
export async function createSubmissionFromUrl(
  documentUrl: string,
  signers: DocuSealSigner[],
  options: {
    sendEmail?: boolean;
    message?: { subject?: string; body?: string };
    externalId?: string;
  } = {}
): Promise<DocuSealSubmission> {
  // Primero crear template desde URL
  const templateResponse = await docusealFetch<DocuSealTemplate>('/templates/pdf', {
    method: 'POST',
    body: JSON.stringify({
      url: documentUrl,
    }),
  });

  // Luego crear submission con el template
  return createSubmission({
    template_id: templateResponse.id,
    signers,
    send_email: options.sendEmail ?? true,
    message: options.message,
    external_id: options.externalId,
  });
}

/**
 * Obtiene una submission por ID
 */
export async function getSubmission(submissionId: number): Promise<DocuSealSubmission> {
  return docusealFetch<DocuSealSubmission>(`/submissions/${submissionId}`);
}

/**
 * Lista submissions con filtros
 */
export async function getSubmissions(params: {
  status?: 'pending' | 'completed' | 'expired';
  limit?: number;
  after?: number;
  before?: number;
} = {}): Promise<DocuSealSubmission[]> {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set('status', params.status);
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.after) searchParams.set('after', params.after.toString());
  if (params.before) searchParams.set('before', params.before.toString());

  const query = searchParams.toString();
  return docusealFetch<DocuSealSubmission[]>(`/submissions${query ? `?${query}` : ''}`);
}

/**
 * Archiva una submission
 */
export async function archiveSubmission(submissionId: number): Promise<DocuSealSubmission> {
  return docusealFetch<DocuSealSubmission>(`/submissions/${submissionId}`, {
    method: 'DELETE',
  });
}

// ==================== SUBMITTERS ====================

/**
 * Obtiene información de un submitter por ID
 */
export async function getSubmitter(submitterId: number): Promise<DocuSealSubmitter> {
  return docusealFetch<DocuSealSubmitter>(`/submitters/${submitterId}`);
}

/**
 * Actualiza un submitter
 */
export async function updateSubmitter(
  submitterId: number,
  data: Partial<{ name: string; email: string; phone: string }>
): Promise<DocuSealSubmitter> {
  return docusealFetch<DocuSealSubmitter>(`/submitters/${submitterId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ==================== INTEGRATION WITH DB ====================

/**
 * Envía un documento generado a firma
 */
export async function enviarDocumentoAFirma(
  tenantId: string,
  input: EnviarAFirmaInput
): Promise<EnviarAFirmaResult> {
  // 1. Obtener el documento generado
  const docResult = await query(
    `SELECT dg.*, pd.nombre as plantilla_nombre
     FROM documentos_generados dg
     LEFT JOIN plantillas_documentos pd ON pd.id = dg.plantilla_id
     WHERE dg.id = $1 AND dg.tenant_id = $2`,
    [input.documento_generado_id, tenantId]
  );

  if (docResult.rows.length === 0) {
    throw new Error('Documento no encontrado');
  }

  const documento = docResult.rows[0];

  if (!documento.url_documento) {
    throw new Error('El documento no tiene URL');
  }

  // 2. Crear submission en DocuSeal
  const signers: DocuSealSigner[] = input.firmantes.map((f, index) => ({
    name: f.nombre,
    email: f.email,
    role: f.rol || `Firmante ${index + 1}`,
  }));

  const submission = await createSubmissionFromUrl(
    documento.url_documento,
    signers,
    {
      sendEmail: input.enviar_email ?? true,
      message: input.mensaje ? {
        subject: input.mensaje.asunto,
        body: input.mensaje.cuerpo,
      } : undefined,
      externalId: input.documento_generado_id,
    }
  );

  // 3. Actualizar documento en BD con info de DocuSeal
  const signingUrls = submission.submitters.map(s => ({
    email: s.email,
    url: s.embed_src,
    status: s.status,
  }));

  await query(
    `UPDATE documentos_generados
     SET docuseal_submission_id = $1,
         docuseal_signers = $2,
         estado = 'pendiente_firma',
         updated_at = NOW()
     WHERE id = $3`,
    [
      submission.id.toString(),
      JSON.stringify(signingUrls),
      input.documento_generado_id,
    ]
  );

  return {
    submission_id: submission.id,
    signing_urls: submission.submitters.map(s => ({
      email: s.email,
      url: s.embed_src,
    })),
    status: submission.status,
  };
}

/**
 * Consulta el estado de firma de un documento
 */
export async function consultarEstadoFirma(
  tenantId: string,
  documentoGeneradoId: string
): Promise<{
  estado: string;
  firmantes: {
    email: string;
    nombre: string;
    estado: string;
    firmado_at?: string;
  }[];
  documento_firmado_url?: string;
}> {
  // Obtener documento de BD
  const docResult = await query(
    `SELECT docuseal_submission_id, docuseal_signers, estado
     FROM documentos_generados
     WHERE id = $1 AND tenant_id = $2`,
    [documentoGeneradoId, tenantId]
  );

  if (docResult.rows.length === 0) {
    throw new Error('Documento no encontrado');
  }

  const documento = docResult.rows[0];

  if (!documento.docuseal_submission_id) {
    return {
      estado: documento.estado || 'borrador',
      firmantes: [],
    };
  }

  // Consultar DocuSeal
  const submission = await getSubmission(parseInt(documento.docuseal_submission_id));

  // Mapear estado
  let estado = 'pendiente_firma';
  if (submission.status === 'completed') {
    estado = 'firmado';
  } else if (submission.status === 'expired') {
    estado = 'expirado';
  }

  // Actualizar BD si cambió el estado
  if (estado !== documento.estado) {
    let urlFirmado = null;
    if (estado === 'firmado' && submission.submitters[0]?.documents?.[0]?.url) {
      urlFirmado = submission.submitters[0].documents[0].url;
    }

    await query(
      `UPDATE documentos_generados
       SET estado = $1,
           docuseal_signing_url = $2,
           docuseal_signers = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [
        estado,
        urlFirmado,
        JSON.stringify(submission.submitters.map(s => ({
          email: s.email,
          nombre: s.name,
          estado: s.status,
          firmado_at: s.completed_at,
        }))),
        documentoGeneradoId,
      ]
    );
  }

  return {
    estado,
    firmantes: submission.submitters.map(s => ({
      email: s.email,
      nombre: s.name,
      estado: s.status,
      firmado_at: s.completed_at || undefined,
    })),
    documento_firmado_url: submission.submitters[0]?.documents?.[0]?.url,
  };
}

/**
 * Procesa webhook de DocuSeal
 */
export async function procesarWebhook(payload: {
  event_type: string;
  timestamp: string;
  data: {
    id: number;
    submission_id: number;
    email: string;
    status: string;
    completed_at?: string;
    documents?: { url: string }[];
    metadata?: { external_id?: string };
  };
}): Promise<void> {
  console.log('DocuSeal Webhook recibido:', payload.event_type);

  const { event_type, data } = payload;

  // Buscar documento por submission_id
  const docResult = await query(
    `SELECT id, tenant_id FROM documentos_generados
     WHERE docuseal_submission_id = $1`,
    [data.submission_id.toString()]
  );

  if (docResult.rows.length === 0) {
    console.log('Documento no encontrado para submission:', data.submission_id);
    return;
  }

  const documento = docResult.rows[0];

  switch (event_type) {
    case 'form.viewed':
      // Actualizar que el firmante abrió el documento
      console.log(`Firmante ${data.email} abrió el documento`);
      break;

    case 'form.completed':
      // Un firmante completó su firma
      console.log(`Firmante ${data.email} completó su firma`);

      // Verificar si todos firmaron
      const submission = await getSubmission(data.submission_id);
      const todosCompletaron = submission.submitters.every(s => s.status === 'completed');

      if (todosCompletaron) {
        // Actualizar estado a firmado
        const docUrl = submission.submitters[0]?.documents?.[0]?.url;
        await query(
          `UPDATE documentos_generados
           SET estado = 'firmado',
               docuseal_signing_url = $1,
               updated_at = NOW()
           WHERE id = $2`,
          [docUrl, documento.id]
        );
      }
      break;

    case 'form.declined':
      // Un firmante rechazó firmar
      console.log(`Firmante ${data.email} rechazó firmar`);
      await query(
        `UPDATE documentos_generados
         SET estado = 'rechazado',
             updated_at = NOW()
         WHERE id = $1`,
        [documento.id]
      );
      break;

    case 'submission.completed':
      // Todos los firmantes completaron
      console.log('Todos los firmantes completaron');
      const docUrl = data.documents?.[0]?.url;
      await query(
        `UPDATE documentos_generados
         SET estado = 'firmado',
             docuseal_signing_url = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [docUrl, documento.id]
      );
      break;

    case 'submission.expired':
      console.log('Submission expiró');
      await query(
        `UPDATE documentos_generados
         SET estado = 'expirado',
             updated_at = NOW()
         WHERE id = $1`,
        [documento.id]
      );
      break;
  }
}

/**
 * Verifica la conexión con DocuSeal
 */
export async function verificarConexion(): Promise<{
  conectado: boolean;
  url: string;
  mensaje?: string;
}> {
  try {
    if (!DOCUSEAL_API_KEY) {
      return {
        conectado: false,
        url: DOCUSEAL_URL,
        mensaje: 'API Key no configurado',
      };
    }

    const templates = await getTemplates();
    return {
      conectado: true,
      url: DOCUSEAL_URL,
      mensaje: `Conectado. ${templates.length} plantillas disponibles.`,
    };
  } catch (error: any) {
    return {
      conectado: false,
      url: DOCUSEAL_URL,
      mensaje: error.message,
    };
  }
}
