/**
 * University Service
 * Gestiona cursos, secciones, videos y certificados
 */

import { query } from '../utils/db.js';

// ==================== INTERFACES ====================

export interface UniversityCurso {
  id: string;
  tenant_id: string;
  titulo: string;
  descripcion?: string;
  imagen_portada?: string;
  nivel: 'principiante' | 'intermedio' | 'avanzado';
  duracion_estimada_minutos: number;
  estado: 'borrador' | 'publicado' | 'archivado';
  es_pago: boolean;
  precio?: number;
  moneda: string;
  orden: number;
  metadata?: Record<string, any>;
  fecha_publicacion?: Date;
  created_at: Date;
  updated_at: Date;
  // Campos calculados
  total_secciones?: number;
  total_videos?: number;
  certificados?: UniversityCertificado[];
}

export interface UniversitySeccion {
  id: string;
  curso_id: string;
  titulo: string;
  descripcion?: string;
  orden: number;
  es_pago_adicional: boolean;
  precio_seccion?: number;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
  // Campos calculados
  total_videos?: number;
  videos?: UniversityVideo[];
}

export interface UniversityVideo {
  id: string;
  seccion_id: string;
  titulo: string;
  descripcion?: string;
  url_video: string;
  proveedor: 'youtube' | 'vimeo' | 'cloudflare' | 'custom';
  video_id?: string;
  duracion_segundos: number;
  thumbnail?: string;
  orden: number;
  es_preview: boolean;
  es_pago_adicional: boolean;
  precio_video?: number;
  recursos_adjuntos: any[];
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UniversityCertificado {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion?: string;
  imagen_template?: string;
  campos_personalizados: Record<string, any>;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UniversityInscripcion {
  id: string;
  tenant_id: string;
  curso_id: string;
  usuario_id: string;
  email_usuario: string;
  nombre_usuario?: string;
  estado: 'activa' | 'completada' | 'cancelada' | 'expirada';
  progreso_porcentaje: number;
  pago_completado: boolean;
  monto_pagado?: number;
  fecha_inscripcion: Date;
  fecha_completado?: Date;
  fecha_expiracion?: Date;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

// ==================== CURSOS ====================

export async function getCursosByTenant(
  tenantId: string,
  options: {
    estado?: 'borrador' | 'publicado' | 'archivado';
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ cursos: UniversityCurso[]; total: number }> {
  let sql = `
    SELECT
      c.*,
      (SELECT COUNT(*) FROM university_secciones s WHERE s.curso_id = c.id) as total_secciones,
      (SELECT COUNT(*) FROM university_videos v
       JOIN university_secciones s ON v.seccion_id = s.id
       WHERE s.curso_id = c.id) as total_videos
    FROM university_cursos c
    WHERE c.tenant_id = $1
  `;
  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (options.estado) {
    sql += ` AND c.estado = $${paramIndex}`;
    params.push(options.estado);
    paramIndex++;
  }

  sql += ` ORDER BY c.orden ASC, c.created_at DESC`;

  // Contar total - consulta simplificada para evitar problemas con subqueries
  let countSql = `SELECT COUNT(*) as total FROM university_cursos c WHERE c.tenant_id = $1`;
  if (options.estado) {
    countSql += ` AND c.estado = $2`;
  }
  const countResult = await query(countSql, params.slice(0, options.estado ? 2 : 1));
  const total = parseInt(countResult.rows[0]?.total || '0');

  // Aplicar paginación
  if (options.limit) {
    sql += ` LIMIT $${paramIndex}`;
    params.push(options.limit);
    paramIndex++;
  }
  if (options.offset) {
    sql += ` OFFSET $${paramIndex}`;
    params.push(options.offset);
  }

  const result = await query(sql, params);
  return { cursos: result.rows, total };
}

export async function getCursoById(tenantId: string, cursoId: string): Promise<UniversityCurso | null> {
  const sql = `
    SELECT
      c.*,
      (SELECT COUNT(*) FROM university_secciones s WHERE s.curso_id = c.id) as total_secciones,
      (SELECT COUNT(*) FROM university_videos v
       JOIN university_secciones s ON v.seccion_id = s.id
       WHERE s.curso_id = c.id) as total_videos
    FROM university_cursos c
    WHERE c.id = $1 AND c.tenant_id = $2
  `;
  const result = await query(sql, [cursoId, tenantId]);
  return result.rows[0] || null;
}

export async function getCursoConDetalle(tenantId: string, cursoId: string): Promise<UniversityCurso | null> {
  const curso = await getCursoById(tenantId, cursoId);
  if (!curso) return null;

  // Obtener secciones con videos
  const seccionesResult = await query(`
    SELECT s.*,
      (SELECT COUNT(*) FROM university_videos v WHERE v.seccion_id = s.id) as total_videos
    FROM university_secciones s
    WHERE s.curso_id = $1
    ORDER BY s.orden ASC
  `, [cursoId]);

  const secciones: UniversitySeccion[] = [];
  for (const seccion of seccionesResult.rows) {
    const videosResult = await query(`
      SELECT * FROM university_videos
      WHERE seccion_id = $1
      ORDER BY orden ASC
    `, [seccion.id]);
    secciones.push({
      ...seccion,
      videos: videosResult.rows
    });
  }

  // Obtener certificados asociados
  const certResult = await query(`
    SELECT cert.*, cc.porcentaje_requerido, cc.requiere_examen
    FROM university_certificados cert
    JOIN university_cursos_certificados cc ON cert.id = cc.certificado_id
    WHERE cc.curso_id = $1
  `, [cursoId]);

  return {
    ...curso,
    secciones,
    certificados: certResult.rows
  } as any;
}

export async function createCurso(
  tenantId: string,
  data: Partial<UniversityCurso>
): Promise<UniversityCurso> {
  const sql = `
    INSERT INTO university_cursos (
      tenant_id, titulo, descripcion, imagen_portada, nivel,
      duracion_estimada_minutos, estado, es_pago, precio, moneda, orden, metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `;
  const result = await query(sql, [
    tenantId,
    data.titulo,
    data.descripcion || null,
    data.imagen_portada || null,
    data.nivel || 'principiante',
    data.duracion_estimada_minutos || 0,
    data.estado || 'borrador',
    data.es_pago || false,
    data.precio || null,
    data.moneda || 'USD',
    data.orden || 0,
    JSON.stringify(data.metadata || {})
  ]);
  return result.rows[0];
}

export async function updateCurso(
  tenantId: string,
  cursoId: string,
  data: Partial<UniversityCurso>
): Promise<UniversityCurso | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  const allowedFields = [
    'titulo', 'descripcion', 'imagen_portada', 'nivel',
    'duracion_estimada_minutos', 'estado', 'es_pago', 'precio',
    'moneda', 'orden', 'metadata', 'fecha_publicacion'
  ];

  for (const field of allowedFields) {
    if (data[field as keyof UniversityCurso] !== undefined) {
      fields.push(`${field} = $${paramIndex}`);
      let value = data[field as keyof UniversityCurso];
      if (field === 'metadata') {
        value = JSON.stringify(value);
      }
      values.push(value);
      paramIndex++;
    }
  }

  if (fields.length === 0) return null;

  fields.push(`updated_at = NOW()`);
  values.push(cursoId, tenantId);

  const sql = `
    UPDATE university_cursos
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
    RETURNING *
  `;

  const result = await query(sql, values);
  return result.rows[0] || null;
}

export async function deleteCurso(tenantId: string, cursoId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM university_cursos WHERE id = $1 AND tenant_id = $2',
    [cursoId, tenantId]
  );
  return (result.rowCount || 0) > 0;
}

// ==================== SECCIONES ====================

export async function getSeccionesByCurso(cursoId: string): Promise<UniversitySeccion[]> {
  const result = await query(`
    SELECT s.*,
      (SELECT COUNT(*) FROM university_videos v WHERE v.seccion_id = s.id) as total_videos
    FROM university_secciones s
    WHERE s.curso_id = $1
    ORDER BY s.orden ASC
  `, [cursoId]);
  return result.rows;
}

export async function createSeccion(
  cursoId: string,
  data: Partial<UniversitySeccion>
): Promise<UniversitySeccion> {
  // Obtener el orden máximo actual
  const maxOrden = await query(
    'SELECT COALESCE(MAX(orden), 0) + 1 as next_orden FROM university_secciones WHERE curso_id = $1',
    [cursoId]
  );

  const sql = `
    INSERT INTO university_secciones (
      curso_id, titulo, descripcion, orden, es_pago_adicional, precio_seccion, activo
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  const result = await query(sql, [
    cursoId,
    data.titulo,
    data.descripcion || null,
    data.orden ?? maxOrden.rows[0].next_orden,
    data.es_pago_adicional || false,
    data.precio_seccion || null,
    data.activo !== false
  ]);
  return result.rows[0];
}

export async function updateSeccion(
  seccionId: string,
  data: Partial<UniversitySeccion>
): Promise<UniversitySeccion | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  const allowedFields = ['titulo', 'descripcion', 'orden', 'es_pago_adicional', 'precio_seccion', 'activo'];

  for (const field of allowedFields) {
    if (data[field as keyof UniversitySeccion] !== undefined) {
      fields.push(`${field} = $${paramIndex}`);
      values.push(data[field as keyof UniversitySeccion]);
      paramIndex++;
    }
  }

  if (fields.length === 0) return null;

  fields.push(`updated_at = NOW()`);
  values.push(seccionId);

  const sql = `
    UPDATE university_secciones
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await query(sql, values);
  return result.rows[0] || null;
}

export async function deleteSeccion(seccionId: string): Promise<boolean> {
  const result = await query('DELETE FROM university_secciones WHERE id = $1', [seccionId]);
  return (result.rowCount || 0) > 0;
}

export async function reorderSecciones(cursoId: string, ordenIds: string[]): Promise<void> {
  for (let i = 0; i < ordenIds.length; i++) {
    await query(
      'UPDATE university_secciones SET orden = $1, updated_at = NOW() WHERE id = $2 AND curso_id = $3',
      [i, ordenIds[i], cursoId]
    );
  }
}

// ==================== VIDEOS ====================

export async function getVideosBySeccion(seccionId: string): Promise<UniversityVideo[]> {
  const result = await query(`
    SELECT * FROM university_videos
    WHERE seccion_id = $1
    ORDER BY orden ASC
  `, [seccionId]);
  return result.rows;
}

export async function createVideo(
  seccionId: string,
  data: Partial<UniversityVideo>
): Promise<UniversityVideo> {
  // Obtener el orden máximo actual
  const maxOrden = await query(
    'SELECT COALESCE(MAX(orden), 0) + 1 as next_orden FROM university_videos WHERE seccion_id = $1',
    [seccionId]
  );

  const sql = `
    INSERT INTO university_videos (
      seccion_id, titulo, descripcion, url_video, proveedor, video_id,
      duracion_segundos, thumbnail, orden, es_preview, es_pago_adicional,
      precio_video, recursos_adjuntos, activo
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *
  `;
  const result = await query(sql, [
    seccionId,
    data.titulo,
    data.descripcion || null,
    data.url_video,
    data.proveedor || 'youtube',
    data.video_id || null,
    data.duracion_segundos || 0,
    data.thumbnail || null,
    data.orden ?? maxOrden.rows[0].next_orden,
    data.es_preview || false,
    data.es_pago_adicional || false,
    data.precio_video || null,
    JSON.stringify(data.recursos_adjuntos || []),
    data.activo !== false
  ]);
  return result.rows[0];
}

export async function updateVideo(
  videoId: string,
  data: Partial<UniversityVideo>
): Promise<UniversityVideo | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  const allowedFields = [
    'titulo', 'descripcion', 'url_video', 'proveedor', 'video_id',
    'duracion_segundos', 'thumbnail', 'orden', 'es_preview',
    'es_pago_adicional', 'precio_video', 'recursos_adjuntos', 'activo'
  ];

  for (const field of allowedFields) {
    if (data[field as keyof UniversityVideo] !== undefined) {
      fields.push(`${field} = $${paramIndex}`);
      let value = data[field as keyof UniversityVideo];
      if (field === 'recursos_adjuntos') {
        value = JSON.stringify(value);
      }
      values.push(value);
      paramIndex++;
    }
  }

  if (fields.length === 0) return null;

  fields.push(`updated_at = NOW()`);
  values.push(videoId);

  const sql = `
    UPDATE university_videos
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await query(sql, values);
  return result.rows[0] || null;
}

export async function deleteVideo(videoId: string): Promise<boolean> {
  const result = await query('DELETE FROM university_videos WHERE id = $1', [videoId]);
  return (result.rowCount || 0) > 0;
}

export async function reorderVideos(seccionId: string, ordenIds: string[]): Promise<void> {
  for (let i = 0; i < ordenIds.length; i++) {
    await query(
      'UPDATE university_videos SET orden = $1, updated_at = NOW() WHERE id = $2 AND seccion_id = $3',
      [i, ordenIds[i], seccionId]
    );
  }
}

// ==================== CERTIFICADOS ====================

export async function getCertificadosByTenant(tenantId: string): Promise<UniversityCertificado[]> {
  const result = await query(`
    SELECT * FROM university_certificados
    WHERE tenant_id = $1
    ORDER BY nombre ASC
  `, [tenantId]);
  return result.rows;
}

export async function getCertificadoById(
  tenantId: string,
  certificadoId: string
): Promise<UniversityCertificado | null> {
  const result = await query(`
    SELECT * FROM university_certificados
    WHERE id = $1 AND tenant_id = $2
  `, [certificadoId, tenantId]);
  return result.rows[0] || null;
}

export async function createCertificado(
  tenantId: string,
  data: Partial<UniversityCertificado>
): Promise<UniversityCertificado> {
  const sql = `
    INSERT INTO university_certificados (
      tenant_id, nombre, descripcion, imagen_template, campos_personalizados, activo
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const result = await query(sql, [
    tenantId,
    data.nombre,
    data.descripcion || null,
    data.imagen_template || null,
    JSON.stringify(data.campos_personalizados || {}),
    data.activo !== false
  ]);
  return result.rows[0];
}

export async function updateCertificado(
  tenantId: string,
  certificadoId: string,
  data: Partial<UniversityCertificado>
): Promise<UniversityCertificado | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  const allowedFields = ['nombre', 'descripcion', 'imagen_template', 'campos_personalizados', 'activo'];

  for (const field of allowedFields) {
    // Usar 'in' para verificar si el campo existe en el objeto (incluyendo valores null)
    if (field in data) {
      fields.push(`${field} = $${paramIndex}`);
      let value = data[field as keyof UniversityCertificado];
      if (field === 'campos_personalizados' && value !== null) {
        value = JSON.stringify(value);
      } else if (field === 'campos_personalizados' && value === null) {
        value = '{}';
      }
      values.push(value);
      paramIndex++;
    }
  }

  if (fields.length === 0) return null;

  fields.push(`updated_at = NOW()`);
  values.push(certificadoId, tenantId);

  const sql = `
    UPDATE university_certificados
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
    RETURNING *
  `;

  const result = await query(sql, values);
  return result.rows[0] || null;
}

export async function deleteCertificado(tenantId: string, certificadoId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM university_certificados WHERE id = $1 AND tenant_id = $2',
    [certificadoId, tenantId]
  );
  return (result.rowCount || 0) > 0;
}

// ==================== CURSO-CERTIFICADO ====================

export async function asignarCertificadoACurso(
  cursoId: string,
  certificadoId: string,
  porcentajeRequerido: number = 100,
  requiereExamen: boolean = false
): Promise<void> {
  await query(`
    INSERT INTO university_cursos_certificados (curso_id, certificado_id, porcentaje_requerido, requiere_examen)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (curso_id, certificado_id) DO UPDATE
    SET porcentaje_requerido = $3, requiere_examen = $4
  `, [cursoId, certificadoId, porcentajeRequerido, requiereExamen]);
}

export async function removerCertificadoDeCurso(cursoId: string, certificadoId: string): Promise<void> {
  await query(
    'DELETE FROM university_cursos_certificados WHERE curso_id = $1 AND certificado_id = $2',
    [cursoId, certificadoId]
  );
}

// ==================== CERTIFICADOS EMITIDOS ====================

export interface CertificadoEmitido {
  id: string;
  inscripcion_id: string;
  certificado_id: string;
  codigo_verificacion: string;
  url_pdf?: string;
  fecha_emision: Date;
  datos_certificado: Record<string, any>;
  created_at: Date;
  // Campos join
  nombre_usuario?: string;
  email_usuario?: string;
  nombre_curso?: string;
  nombre_certificado?: string;
}

function generarCodigoVerificacion(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let codigo = '';
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) codigo += '-';
    codigo += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return codigo;
}

export async function emitirCertificado(
  inscripcionId: string,
  certificadoId: string,
  datosCertificado: Record<string, any> = {},
  nombreEstudiante?: string
): Promise<CertificadoEmitido> {
  // Primero verificar si ya existe el certificado para evitar duplicados
  const existingResult = await query(`
    SELECT * FROM university_certificados_emitidos
    WHERE inscripcion_id = $1 AND certificado_id = $2
  `, [inscripcionId, certificadoId]);

  if (existingResult.rows.length > 0) {
    // Certificado ya existe, retornarlo sin crear duplicado
    console.log('[emitirCertificado] Certificado ya existe, retornando existente');
    return existingResult.rows[0];
  }

  const codigoVerificacion = generarCodigoVerificacion();

  // Intentar insertar - si hay constraint UNIQUE, usar ON CONFLICT como fallback
  try {
    const sql = `
      INSERT INTO university_certificados_emitidos (
        inscripcion_id, certificado_id, codigo_verificacion, datos_certificado, nombre_estudiante, fecha_emision
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `;
    const result = await query(sql, [
      inscripcionId,
      certificadoId,
      codigoVerificacion,
      JSON.stringify(datosCertificado),
      nombreEstudiante || null
    ]);
    return result.rows[0];
  } catch (error: any) {
    // Si es error de constraint UNIQUE (código 23505), obtener el existente
    if (error.code === '23505') {
      console.log('[emitirCertificado] Race condition detectada, obteniendo certificado existente');
      const existing = await query(`
        SELECT * FROM university_certificados_emitidos
        WHERE inscripcion_id = $1 AND certificado_id = $2
      `, [inscripcionId, certificadoId]);
      return existing.rows[0];
    }
    throw error;
  }
}

export async function getCertificadosEmitidosByTenant(
  tenantId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ certificados: CertificadoEmitido[]; total: number }> {
  const countSql = `
    SELECT COUNT(*) as total
    FROM university_certificados_emitidos ce
    JOIN university_inscripciones i ON ce.inscripcion_id = i.id
    WHERE i.tenant_id = $1
  `;
  const countResult = await query(countSql, [tenantId]);
  const total = parseInt(countResult.rows[0]?.total || '0');

  let sql = `
    SELECT
      ce.*,
      i.nombre_usuario,
      i.email_usuario,
      c.titulo as nombre_curso,
      cert.nombre as nombre_certificado,
      cert.imagen_template
    FROM university_certificados_emitidos ce
    JOIN university_inscripciones i ON ce.inscripcion_id = i.id
    JOIN university_cursos c ON i.curso_id = c.id
    JOIN university_certificados cert ON ce.certificado_id = cert.id
    WHERE i.tenant_id = $1
    ORDER BY ce.fecha_emision DESC
  `;
  const params: any[] = [tenantId];

  if (options.limit) {
    sql += ` LIMIT $2`;
    params.push(options.limit);
    if (options.offset) {
      sql += ` OFFSET $3`;
      params.push(options.offset);
    }
  }

  const result = await query(sql, params);
  return { certificados: result.rows, total };
}

export async function getCertificadosEmitidosByUsuario(
  tenantId: string,
  usuarioId: string
): Promise<CertificadoEmitido[]> {
  const sql = `
    SELECT
      ce.*,
      i.nombre_usuario,
      i.email_usuario,
      c.titulo as nombre_curso,
      cert.nombre as nombre_certificado,
      cert.imagen_template
    FROM university_certificados_emitidos ce
    JOIN university_inscripciones i ON ce.inscripcion_id = i.id
    JOIN university_cursos c ON i.curso_id = c.id
    JOIN university_certificados cert ON ce.certificado_id = cert.id
    WHERE i.tenant_id = $1 AND i.usuario_id = $2
    ORDER BY ce.fecha_emision DESC
  `;
  const result = await query(sql, [tenantId, usuarioId]);
  return result.rows;
}

export async function verificarCertificado(
  codigoVerificacion: string
): Promise<CertificadoEmitido | null> {
  const sql = `
    SELECT
      ce.*,
      i.nombre_usuario,
      i.email_usuario,
      c.titulo as nombre_curso,
      cert.nombre as nombre_certificado,
      cert.imagen_template,
      t.nombre as nombre_empresa
    FROM university_certificados_emitidos ce
    JOIN university_inscripciones i ON ce.inscripcion_id = i.id
    JOIN university_cursos c ON i.curso_id = c.id
    JOIN university_certificados cert ON ce.certificado_id = cert.id
    JOIN tenants t ON i.tenant_id = t.id
    WHERE ce.codigo_verificacion = $1
  `;
  const result = await query(sql, [codigoVerificacion]);
  return result.rows[0] || null;
}

export async function actualizarUrlPdfCertificado(
  certificadoEmitidoId: string,
  urlPdf: string
): Promise<void> {
  await query(
    'UPDATE university_certificados_emitidos SET url_pdf = $1 WHERE id = $2',
    [urlPdf, certificadoEmitidoId]
  );
}

export async function emitirCertificadoManual(
  tenantId: string,
  cursoId: string,
  certificadoId: string,
  usuarioData: { email: string; nombre: string; usuario_id?: string }
): Promise<CertificadoEmitido> {
  // Primero crear o obtener la inscripción
  let inscripcion = await query(`
    SELECT id FROM university_inscripciones
    WHERE tenant_id = $1 AND curso_id = $2 AND email_usuario = $3
  `, [tenantId, cursoId, usuarioData.email]);

  let inscripcionId: string;

  if (inscripcion.rows.length === 0) {
    // Crear inscripción automática
    const newInsc = await query(`
      INSERT INTO university_inscripciones (
        tenant_id, curso_id, usuario_id, email_usuario, nombre_usuario,
        estado, progreso_porcentaje, pago_completado
      )
      VALUES ($1, $2, $3, $4, $5, 'completada', 100, true)
      RETURNING id
    `, [tenantId, cursoId, usuarioData.usuario_id || null, usuarioData.email, usuarioData.nombre]);
    inscripcionId = newInsc.rows[0].id;
  } else {
    inscripcionId = inscripcion.rows[0].id;
  }

  // Emitir el certificado con el nombre del estudiante
  return emitirCertificado(inscripcionId, certificadoId, {
    emision_manual: true,
    fecha_emision: new Date().toISOString()
  }, usuarioData.nombre);
}

// ==================== ESTADÍSTICAS ====================

export async function getUniversityStats(tenantId: string): Promise<{
  totalCursos: number;
  cursosPublicados: number;
  totalSecciones: number;
  totalVideos: number;
  totalInscripciones: number;
  totalCertificadosEmitidos: number;
}> {
  const [cursos, secciones, videos, inscripciones, certificados] = await Promise.all([
    query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE estado = 'publicado') as publicados
      FROM university_cursos WHERE tenant_id = $1
    `, [tenantId]),
    query(`
      SELECT COUNT(*) as total FROM university_secciones s
      JOIN university_cursos c ON s.curso_id = c.id
      WHERE c.tenant_id = $1
    `, [tenantId]),
    query(`
      SELECT COUNT(*) as total FROM university_videos v
      JOIN university_secciones s ON v.seccion_id = s.id
      JOIN university_cursos c ON s.curso_id = c.id
      WHERE c.tenant_id = $1
    `, [tenantId]),
    query(`SELECT COUNT(*) as total FROM university_inscripciones WHERE tenant_id = $1`, [tenantId]),
    query(`
      SELECT COUNT(*) as total FROM university_certificados_emitidos ce
      JOIN university_inscripciones i ON ce.inscripcion_id = i.id
      WHERE i.tenant_id = $1
    `, [tenantId])
  ]);

  return {
    totalCursos: parseInt(cursos.rows[0]?.total || '0'),
    cursosPublicados: parseInt(cursos.rows[0]?.publicados || '0'),
    totalSecciones: parseInt(secciones.rows[0]?.total || '0'),
    totalVideos: parseInt(videos.rows[0]?.total || '0'),
    totalInscripciones: parseInt(inscripciones.rows[0]?.total || '0'),
    totalCertificadosEmitidos: parseInt(certificados.rows[0]?.total || '0')
  };
}
