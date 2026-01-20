/**
 * Mi Entrenamiento Service
 * Gestiona el acceso de usuarios a cursos según su rol,
 * tracking de progreso y emisión automática de certificados.
 */

import { query } from '../utils/db.js';
import { emitirCertificado, UniversityInscripcion } from './universityService.js';

// ==================== INTERFACES ====================

export interface CursoDisponible {
  id: string;
  titulo: string;
  descripcion?: string;
  imagen_portada?: string;
  nivel: 'principiante' | 'intermedio' | 'avanzado';
  duracion_estimada_minutos: number;
  estado: string;
  es_pago: boolean;
  precio?: number;
  total_secciones: number;
  total_videos: number;
  secciones_accesibles: number;
  progreso_porcentaje: number;
  tiene_certificado: boolean;
  inscripcion_id?: string;
}

export interface SeccionConAcceso {
  id: string;
  titulo: string;
  descripcion?: string;
  orden: number;
  total_videos: number;
  tiene_acceso: boolean;
  videos: VideoConProgreso[];
}

export interface VideoConProgreso {
  id: string;
  titulo: string;
  descripcion?: string;
  url_video: string;
  proveedor: string;
  video_id?: string;
  duracion_segundos: number;
  thumbnail?: string;
  orden: number;
  es_preview: boolean;
  recursos_adjuntos: any[];
  // Progreso
  segundos_vistos: number;
  porcentaje_completado: number;
  completado: boolean;
}

export interface CursoConAcceso {
  id: string;
  titulo: string;
  descripcion?: string;
  imagen_portada?: string;
  nivel: string;
  duracion_estimada_minutos: number;
  total_secciones: number;
  total_videos: number;
  secciones_accesibles: number;
  progreso_porcentaje: number;
  inscripcion_id?: string;
  secciones: SeccionConAcceso[];
  certificados_disponibles: { id: string; nombre: string; porcentaje_requerido: number }[];
  certificados_obtenidos: { id: string; nombre: string; codigo_verificacion: string; fecha_emision: Date }[];
}

export interface AccesoRolCurso {
  id: string;
  curso_id: string;
  rol_id: string;
  rol_nombre?: string;
  rol_codigo?: string;
  seccion_limite_id?: string;
  seccion_limite_titulo?: string;
  seccion_limite_orden?: number;
}

// ==================== ACCESO POR ROL ====================

/**
 * Obtiene la configuración de acceso por rol de un curso
 */
export async function getAccesoRolesByCurso(cursoId: string): Promise<AccesoRolCurso[]> {
  const sql = `
    SELECT
      ar.*,
      r.nombre as rol_nombre,
      r.codigo as rol_codigo,
      s.titulo as seccion_limite_titulo,
      s.orden as seccion_limite_orden
    FROM university_cursos_acceso_roles ar
    JOIN roles r ON ar.rol_id = r.id
    LEFT JOIN university_secciones s ON ar.seccion_limite_id = s.id
    WHERE ar.curso_id = $1
    ORDER BY r.nombre ASC
  `;
  const result = await query(sql, [cursoId]);
  return result.rows;
}

/**
 * Configura el acceso de un rol a un curso
 */
export async function setAccesoRol(
  cursoId: string,
  rolId: string,
  seccionLimiteId: string | null
): Promise<AccesoRolCurso> {
  const sql = `
    INSERT INTO university_cursos_acceso_roles (curso_id, rol_id, seccion_limite_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (curso_id, rol_id) DO UPDATE
    SET seccion_limite_id = $3
    RETURNING *
  `;
  const result = await query(sql, [cursoId, rolId, seccionLimiteId]);
  return result.rows[0];
}

/**
 * Elimina el acceso de un rol a un curso
 */
export async function removeAccesoRol(cursoId: string, rolId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM university_cursos_acceso_roles WHERE curso_id = $1 AND rol_id = $2',
    [cursoId, rolId]
  );
  return (result.rowCount || 0) > 0;
}

/**
 * Obtiene los IDs de secciones accesibles para un usuario según sus roles
 * Retorna null si tiene acceso completo
 */
async function getSeccionesAccesiblesOrden(
  cursoId: string,
  rolIds: string[]
): Promise<{ ordenMaximo: number | null }> {
  if (rolIds.length === 0) {
    return { ordenMaximo: -1 }; // Sin acceso
  }

  const sql = `
    SELECT
      ar.seccion_limite_id,
      s.orden as seccion_orden
    FROM university_cursos_acceso_roles ar
    LEFT JOIN university_secciones s ON ar.seccion_limite_id = s.id
    WHERE ar.curso_id = $1 AND ar.rol_id = ANY($2)
  `;
  const result = await query(sql, [cursoId, rolIds]);

  if (result.rows.length === 0) {
    return { ordenMaximo: -1 }; // Sin acceso configurado
  }

  // Si algún rol tiene acceso completo (seccion_limite_id = NULL), retornar null
  const tieneAccesoCompleto = result.rows.some((r: any) => r.seccion_limite_id === null);
  if (tieneAccesoCompleto) {
    return { ordenMaximo: null }; // Acceso completo
  }

  // Encontrar el orden máximo entre todos los roles
  const ordenMaximo = Math.max(...result.rows.map((r: any) => r.seccion_orden || 0));
  return { ordenMaximo };
}

// ==================== CURSOS DISPONIBLES ====================

/**
 * Obtiene los cursos disponibles para un usuario según sus roles
 */
export async function getCursosDisponibles(
  tenantId: string,
  usuarioId: string,
  rolIds: string[]
): Promise<CursoDisponible[]> {
  // Obtener cursos publicados que tengan acceso para alguno de los roles del usuario
  // Usamos subquery para manejar el DISTINCT y luego ordenamos
  const sql = `
    SELECT
      c.id,
      c.titulo,
      c.descripcion,
      c.imagen_portada,
      c.nivel,
      c.duracion_estimada_minutos,
      c.estado,
      c.es_pago,
      c.precio,
      c.orden,
      (SELECT COUNT(*) FROM university_secciones s WHERE s.curso_id = c.id) as total_secciones,
      (SELECT COUNT(*) FROM university_videos v
       JOIN university_secciones s ON v.seccion_id = s.id
       WHERE s.curso_id = c.id) as total_videos,
      i.id as inscripcion_id,
      COALESCE(i.progreso_porcentaje, 0) as progreso_porcentaje,
      EXISTS (
        SELECT 1 FROM university_certificados_emitidos ce
        WHERE ce.inscripcion_id = i.id
      ) as tiene_certificado
    FROM university_cursos c
    LEFT JOIN university_inscripciones i ON i.curso_id = c.id AND i.usuario_id = $2
    WHERE c.tenant_id = $1
      AND c.estado = 'publicado'
      AND EXISTS (
        SELECT 1 FROM university_cursos_acceso_roles ar
        WHERE ar.curso_id = c.id AND ar.rol_id = ANY($3)
      )
    ORDER BY c.orden ASC, c.titulo ASC
  `;

  const result = await query(sql, [tenantId, usuarioId, rolIds]);

  // Calcular secciones accesibles para cada curso
  const cursos: CursoDisponible[] = [];
  for (const row of result.rows) {
    const { ordenMaximo } = await getSeccionesAccesiblesOrden(row.id, rolIds);

    // Contar secciones accesibles
    let seccionesAccesibles = parseInt(row.total_secciones);
    if (ordenMaximo !== null && ordenMaximo >= 0) {
      const countResult = await query(
        'SELECT COUNT(*) as count FROM university_secciones WHERE curso_id = $1 AND orden <= $2',
        [row.id, ordenMaximo]
      );
      seccionesAccesibles = parseInt(countResult.rows[0]?.count || '0');
    }

    cursos.push({
      ...row,
      total_secciones: parseInt(row.total_secciones),
      total_videos: parseInt(row.total_videos),
      secciones_accesibles: seccionesAccesibles,
      progreso_porcentaje: parseInt(row.progreso_porcentaje),
    });
  }

  return cursos;
}

/**
 * Obtiene el detalle de un curso con acceso filtrado por rol
 */
export async function getCursoConAcceso(
  tenantId: string,
  cursoId: string,
  usuarioId: string,
  rolIds: string[],
  email: string,
  nombre: string
): Promise<CursoConAcceso | null> {
  // Verificar que el usuario tiene acceso al curso
  const accesoResult = await query(`
    SELECT 1 FROM university_cursos_acceso_roles
    WHERE curso_id = $1 AND rol_id = ANY($2)
  `, [cursoId, rolIds]);

  if (accesoResult.rows.length === 0) {
    return null; // Sin acceso
  }

  // Obtener curso
  const cursoResult = await query(`
    SELECT
      c.*,
      (SELECT COUNT(*) FROM university_secciones s WHERE s.curso_id = c.id) as total_secciones,
      (SELECT COUNT(*) FROM university_videos v
       JOIN university_secciones s ON v.seccion_id = s.id
       WHERE s.curso_id = c.id) as total_videos
    FROM university_cursos c
    WHERE c.id = $1 AND c.tenant_id = $2 AND c.estado = 'publicado'
  `, [cursoId, tenantId]);

  if (cursoResult.rows.length === 0) {
    return null;
  }

  const curso = cursoResult.rows[0];

  // Obtener o crear inscripción
  const inscripcion = await getOrCreateInscripcion(tenantId, cursoId, usuarioId, email, nombre);

  // Obtener límite de acceso por rol
  const { ordenMaximo } = await getSeccionesAccesiblesOrden(cursoId, rolIds);

  // Obtener secciones con videos
  const seccionesResult = await query(`
    SELECT s.*,
      (SELECT COUNT(*) FROM university_videos v WHERE v.seccion_id = s.id AND v.activo = true) as total_videos
    FROM university_secciones s
    WHERE s.curso_id = $1 AND s.activo = true
    ORDER BY s.orden ASC
  `, [cursoId]);

  const secciones: SeccionConAcceso[] = [];
  let seccionesAccesibles = 0;

  for (const seccion of seccionesResult.rows) {
    const tieneAcceso = ordenMaximo === null || seccion.orden <= ordenMaximo;

    if (tieneAcceso) {
      seccionesAccesibles++;
    }

    // Obtener videos con progreso
    const videosResult = await query(`
      SELECT
        v.*,
        COALESCE(p.segundos_vistos, 0) as segundos_vistos,
        COALESCE(p.porcentaje_completado, 0) as porcentaje_completado,
        COALESCE(p.completado, false) as completado
      FROM university_videos v
      LEFT JOIN university_progreso p ON p.video_id = v.id AND p.inscripcion_id = $2
      WHERE v.seccion_id = $1 AND v.activo = true
      ORDER BY v.orden ASC
    `, [seccion.id, inscripcion.id]);

    secciones.push({
      id: seccion.id,
      titulo: seccion.titulo,
      descripcion: seccion.descripcion,
      orden: seccion.orden,
      total_videos: parseInt(seccion.total_videos),
      tiene_acceso: tieneAcceso,
      videos: tieneAcceso ? videosResult.rows.map((v: any) => ({
        ...v,
        segundos_vistos: parseFloat(v.segundos_vistos) || 0,
        porcentaje_completado: parseFloat(v.porcentaje_completado) || 0,
      })) : []
    });
  }

  // Obtener certificados disponibles
  const certDisponiblesResult = await query(`
    SELECT cert.id, cert.nombre, cc.porcentaje_requerido
    FROM university_certificados cert
    JOIN university_cursos_certificados cc ON cert.id = cc.certificado_id
    WHERE cc.curso_id = $1 AND cert.activo = true
  `, [cursoId]);

  // Obtener certificados obtenidos
  const certObtenidosResult = await query(`
    SELECT cert.id, cert.nombre, ce.codigo_verificacion, ce.fecha_emision
    FROM university_certificados_emitidos ce
    JOIN university_certificados cert ON ce.certificado_id = cert.id
    WHERE ce.inscripcion_id = $1
  `, [inscripcion.id]);

  return {
    id: curso.id,
    titulo: curso.titulo,
    descripcion: curso.descripcion,
    imagen_portada: curso.imagen_portada,
    nivel: curso.nivel,
    duracion_estimada_minutos: curso.duracion_estimada_minutos,
    total_secciones: parseInt(curso.total_secciones),
    total_videos: parseInt(curso.total_videos),
    secciones_accesibles: seccionesAccesibles,
    progreso_porcentaje: inscripcion.progreso_porcentaje,
    inscripcion_id: inscripcion.id,
    secciones,
    certificados_disponibles: certDisponiblesResult.rows,
    certificados_obtenidos: certObtenidosResult.rows
  };
}

// ==================== INSCRIPCIONES ====================

/**
 * Obtiene o crea una inscripción para un usuario en un curso
 */
export async function getOrCreateInscripcion(
  tenantId: string,
  cursoId: string,
  usuarioId: string,
  email: string,
  nombre: string
): Promise<UniversityInscripcion> {
  // Buscar inscripción existente
  const existingResult = await query(`
    SELECT * FROM university_inscripciones
    WHERE curso_id = $1 AND usuario_id = $2
  `, [cursoId, usuarioId]);

  if (existingResult.rows.length > 0) {
    return existingResult.rows[0];
  }

  // Crear nueva inscripción
  const insertResult = await query(`
    INSERT INTO university_inscripciones (
      tenant_id, curso_id, usuario_id, email_usuario, nombre_usuario,
      estado, progreso_porcentaje, pago_completado
    )
    VALUES ($1, $2, $3, $4, $5, 'activa', 0, false)
    RETURNING *
  `, [tenantId, cursoId, usuarioId, email, nombre]);

  return insertResult.rows[0];
}

// ==================== PROGRESO ====================

/**
 * Registra el progreso de un video
 */
export async function registrarProgreso(
  inscripcionId: string,
  videoId: string,
  segundosVistos: number,
  porcentajeCompletado: number
): Promise<{ progreso_video: any; progreso_curso: number; certificado_emitido?: any }> {
  // Redondear valores ya que la BD usa INTEGER
  const segundosVistosInt = Math.round(segundosVistos || 0);
  const porcentajeCompletadoInt = Math.round(porcentajeCompletado || 0);

  console.log('[registrarProgreso] Params:', { inscripcionId, videoId, segundosVistos: segundosVistosInt, porcentajeCompletado: porcentajeCompletadoInt });

  const completado = porcentajeCompletadoInt >= 90;

  console.log('[registrarProgreso] Inserting/updating progreso...');
  // Actualizar o crear registro de progreso
  const progresoResult = await query(`
    INSERT INTO university_progreso (
      inscripcion_id, video_id, segundos_vistos, porcentaje_completado, completado,
      ultimo_acceso, fecha_completado
    )
    VALUES ($1, $2, $3, $4, $5, NOW(), $6)
    ON CONFLICT (inscripcion_id, video_id) DO UPDATE
    SET
      segundos_vistos = GREATEST(university_progreso.segundos_vistos, $3),
      porcentaje_completado = GREATEST(university_progreso.porcentaje_completado, $4),
      completado = university_progreso.completado OR $5,
      ultimo_acceso = NOW(),
      fecha_completado = CASE
        WHEN university_progreso.completado THEN university_progreso.fecha_completado
        WHEN $5 THEN NOW()
        ELSE NULL
      END,
      updated_at = NOW()
    RETURNING *
  `, [inscripcionId, videoId, segundosVistosInt, porcentajeCompletadoInt, completado, completado ? new Date() : null]);

  // Recalcular progreso del curso
  const progresoCurso = await recalcularProgresoCurso(inscripcionId);

  // Si el progreso es 100%, verificar emisión de certificado
  let certificadoEmitido = null;
  if (progresoCurso >= 100) {
    certificadoEmitido = await verificarYEmitirCertificado(inscripcionId);
  }

  return {
    progreso_video: progresoResult.rows[0],
    progreso_curso: progresoCurso,
    certificado_emitido: certificadoEmitido
  };
}

/**
 * Recalcula el progreso total del curso
 */
export async function recalcularProgresoCurso(inscripcionId: string): Promise<number> {
  // Obtener inscripción y curso
  const inscResult = await query(`
    SELECT i.*, c.id as curso_id
    FROM university_inscripciones i
    JOIN university_cursos c ON i.curso_id = c.id
    WHERE i.id = $1
  `, [inscripcionId]);

  if (inscResult.rows.length === 0) {
    return 0;
  }

  const cursoId = inscResult.rows[0].curso_id;

  // Calcular progreso basado en el porcentaje promedio de todos los videos
  // Esto incluye progreso parcial, no solo videos completados
  const statsResult = await query(`
    SELECT
      (SELECT COUNT(*) FROM university_videos v
       JOIN university_secciones s ON v.seccion_id = s.id
       WHERE s.curso_id = $1 AND v.activo = true) as total_videos,
      (SELECT COALESCE(SUM(p.porcentaje_completado), 0) FROM university_progreso p
       JOIN university_videos v ON p.video_id = v.id
       JOIN university_secciones s ON v.seccion_id = s.id
       WHERE p.inscripcion_id = $2 AND s.curso_id = $1) as suma_porcentajes
  `, [cursoId, inscripcionId]);

  const totalVideos = parseInt(statsResult.rows[0]?.total_videos || '0');
  const sumaPorcentajes = parseInt(statsResult.rows[0]?.suma_porcentajes || '0');

  // Progreso = suma de porcentajes de cada video / total de videos
  // Si hay 1 video con 50% progreso, el curso está al 50%
  // Si hay 2 videos, uno al 100% y otro al 0%, el curso está al 50%
  const progresoPorcentaje = totalVideos > 0 ? Math.round(sumaPorcentajes / totalVideos) : 0;

  // Actualizar inscripción
  await query(`
    UPDATE university_inscripciones
    SET
      progreso_porcentaje = $1,
      estado = CASE WHEN $1 >= 100 THEN 'completada' ELSE estado END,
      fecha_completado = CASE WHEN $1 >= 100 AND fecha_completado IS NULL THEN NOW() ELSE fecha_completado END,
      updated_at = NOW()
    WHERE id = $2
  `, [progresoPorcentaje, inscripcionId]);

  return progresoPorcentaje;
}

/**
 * Verifica y emite certificados automáticamente si corresponde
 */
export async function verificarYEmitirCertificado(inscripcionId: string): Promise<any | null> {
  // Obtener inscripción con datos del curso y usuario
  const inscResult = await query(`
    SELECT i.*, c.titulo as curso_titulo
    FROM university_inscripciones i
    JOIN university_cursos c ON i.curso_id = c.id
    WHERE i.id = $1
  `, [inscripcionId]);

  if (inscResult.rows.length === 0) {
    return null;
  }

  const inscripcion = inscResult.rows[0];

  // Obtener certificados del curso que aún no se han emitido
  const certPendientesResult = await query(`
    SELECT cc.*, cert.nombre as nombre_certificado
    FROM university_cursos_certificados cc
    JOIN university_certificados cert ON cc.certificado_id = cert.id
    WHERE cc.curso_id = $1
      AND cert.activo = true
      AND cc.porcentaje_requerido <= $2
      AND NOT EXISTS (
        SELECT 1 FROM university_certificados_emitidos ce
        WHERE ce.inscripcion_id = $3 AND ce.certificado_id = cc.certificado_id
      )
  `, [inscripcion.curso_id, inscripcion.progreso_porcentaje, inscripcionId]);

  if (certPendientesResult.rows.length === 0) {
    return null;
  }

  // Emitir el primer certificado pendiente
  const certConfig = certPendientesResult.rows[0];

  const certificadoEmitido = await emitirCertificado(
    inscripcionId,
    certConfig.certificado_id,
    {
      curso: inscripcion.curso_titulo,
      estudiante: inscripcion.nombre_usuario,
      email: inscripcion.email_usuario,
      fecha_completado: inscripcion.fecha_completado,
      emision_automatica: true
    },
    inscripcion.nombre_usuario
  );

  return {
    ...certificadoEmitido,
    nombre_certificado: certConfig.nombre_certificado
  };
}

// ==================== MIS CERTIFICADOS ====================

/**
 * Obtiene los certificados de un usuario
 * Busca por usuario_id (inscripciones automáticas) Y por email (inscripciones manuales)
 */
export async function getMisCertificados(
  tenantId: string,
  usuarioId: string,
  email?: string
): Promise<any[]> {
  // Si tenemos email, buscar por usuario_id OR email
  // Si no tenemos email, solo buscar por usuario_id
  const sql = email ? `
    SELECT DISTINCT ON (ce.id)
      ce.*,
      cert.nombre as nombre_certificado,
      cert.imagen_template,
      c.titulo as nombre_curso,
      i.fecha_completado
    FROM university_certificados_emitidos ce
    JOIN university_inscripciones i ON ce.inscripcion_id = i.id
    JOIN university_cursos c ON i.curso_id = c.id
    JOIN university_certificados cert ON ce.certificado_id = cert.id
    WHERE i.tenant_id = $1 AND (i.usuario_id = $2 OR LOWER(i.email_usuario) = LOWER($3))
    ORDER BY ce.id, ce.fecha_emision DESC
  ` : `
    SELECT
      ce.*,
      cert.nombre as nombre_certificado,
      cert.imagen_template,
      c.titulo as nombre_curso,
      i.fecha_completado
    FROM university_certificados_emitidos ce
    JOIN university_inscripciones i ON ce.inscripcion_id = i.id
    JOIN university_cursos c ON i.curso_id = c.id
    JOIN university_certificados cert ON ce.certificado_id = cert.id
    WHERE i.tenant_id = $1 AND i.usuario_id = $2
    ORDER BY ce.fecha_emision DESC
  `;

  const params = email ? [tenantId, usuarioId, email] : [tenantId, usuarioId];
  const result = await query(sql, params);
  return result.rows;
}
