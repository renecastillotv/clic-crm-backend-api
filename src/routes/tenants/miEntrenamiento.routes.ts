/**
 * Mi Entrenamiento Routes
 * API endpoints para usuarios que consumen cursos de University.
 * Incluye: cursos disponibles, progreso, certificados
 */

import express, { Request, Response, Router } from 'express'
import * as miEntrenamientoService from '../../services/miEntrenamientoService.js';
import { requireAuth } from '../../middleware/clerkAuth.js';
import { getUsuarioByClerkId, getUsuarioConRoles } from '../../services/usuariosService.js';
import { resolveUserScope } from '../../middleware/scopeResolver.js';

// Tipos para params con mergeParams
interface RouteParams { [key: string]: string | undefined;
  tenantId: string;
  cursoId?: string;
}

const router: Router = express.Router({ mergeParams: true });
router.use(resolveUserScope);

// Test endpoint (público)
router.get('/test', (req, res) => {
  console.log('[miEntrenamiento] GET /test - Request received');
  res.json({ message: 'Mi Entrenamiento API working', timestamp: new Date().toISOString() });
});

// Helper para obtener usuario completo con roles del tenant
async function getUsuarioConRolesTenant(clerkUserId: string, tenantId: string) {
  // Buscar usuario por Clerk ID
  const usuario = await getUsuarioByClerkId(clerkUserId);
  if (!usuario) return null;

  // Obtener usuario con roles
  const usuarioCompleto = await getUsuarioConRoles(usuario.id);
  if (!usuarioCompleto) return null;

  // Encontrar el tenant en la lista de tenants del usuario
  const tenantDelUsuario = usuarioCompleto.tenants?.find((t: any) => t.id === tenantId);

  // Obtener roles del tenant específico
  const rolesDelTenant = tenantDelUsuario?.roles || [];

  console.log('[getUsuarioConRolesTenant] Usuario:', usuarioCompleto.id);
  console.log('[getUsuarioConRolesTenant] Tenant buscado:', tenantId);
  console.log('[getUsuarioConRolesTenant] Tenants del usuario:', JSON.stringify(usuarioCompleto.tenants?.map((t: any) => ({ id: t.id, nombre: t.nombre, roles: t.roles }))));
  console.log('[getUsuarioConRolesTenant] Tenant encontrado:', tenantDelUsuario ? 'SI' : 'NO');
  console.log('[getUsuarioConRolesTenant] Roles del tenant:', JSON.stringify(rolesDelTenant));

  return {
    id: usuarioCompleto.id,
    email: usuarioCompleto.email,
    nombre: usuarioCompleto.nombre || usuarioCompleto.email,
    roles: rolesDelTenant
  };
}

// ==================== CURSOS DISPONIBLES ====================

/**
 * GET /api/tenants/:tenantId/mi-entrenamiento/cursos
 * Lista los cursos disponibles para el usuario según sus roles
 */
router.get('/cursos', requireAuth, async (req: Request, res: Response) => {
  console.log('[miEntrenamiento] GET /cursos - Request received');
  try {
    const { tenantId } = req.params as RouteParams;
    const clerkUserId = req.auth?.userId;

    console.log('[miEntrenamiento] GET /cursos - tenantId:', tenantId, 'clerkUserId:', clerkUserId);

    if (!clerkUserId) {
      console.log('[miEntrenamiento] GET /cursos - No clerkUserId, returning 401');
      return res.status(401).json({ error: 'No autenticado' });
    }

    // Obtener usuario completo con roles del tenant
    const user = await getUsuarioConRolesTenant(clerkUserId, tenantId);

    if (!user) {
      console.log('[miEntrenamiento] GET /cursos - Usuario no encontrado en BD');
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    console.log('[miEntrenamiento] GET /cursos - user:', user.id, 'roles:', user.roles?.length);

    const rolIds = user.roles?.map((r: any) => r.id) || [];

    if (rolIds.length === 0) {
      console.log('[miEntrenamiento] GET /cursos - No roles, returning empty array');
      return res.json([]);
    }

    console.log('[miEntrenamiento] GET /cursos - Fetching cursos for user:', user.id);
    console.log('[miEntrenamiento] GET /cursos - rolIds:', JSON.stringify(rolIds));
    console.log('[miEntrenamiento] GET /cursos - tenantId:', tenantId);

    const cursos = await miEntrenamientoService.getCursosDisponibles(
      tenantId,
      user.id,
      rolIds
    );

    console.log('[miEntrenamiento] GET /cursos - Found', cursos.length, 'cursos');

    // Debug: si no hay cursos, verificar tabla de acceso
    if (cursos.length === 0) {
      console.log('[miEntrenamiento] DEBUG - Verificando accesos en BD...');
      const { query: dbQuery } = await import('../../utils/db.js');

      // Ver cursos publicados del tenant
      const cursosPublicados = await dbQuery(
        `SELECT id, titulo, estado FROM university_cursos WHERE tenant_id = $1`,
        [tenantId]
      );
      console.log('[miEntrenamiento] DEBUG - Cursos del tenant:', cursosPublicados.rows);

      // Ver accesos configurados
      const accesos = await dbQuery(
        `SELECT ar.*, r.nombre as rol_nombre
         FROM university_cursos_acceso_roles ar
         JOIN roles r ON ar.rol_id = r.id
         JOIN university_cursos c ON ar.curso_id = c.id
         WHERE c.tenant_id = $1`,
        [tenantId]
      );
      console.log('[miEntrenamiento] DEBUG - Accesos configurados:', accesos.rows);

      // Ver roles del usuario
      console.log('[miEntrenamiento] DEBUG - Roles del usuario:', user.roles);
    }

    res.json(cursos);
  } catch (error: any) {
    console.error('[miEntrenamiento] Error obteniendo cursos disponibles:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/mi-entrenamiento/cursos/:cursoId
 * Obtiene el detalle de un curso con acceso filtrado por rol
 */
router.get('/cursos/:cursoId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, cursoId } = req.params as RouteParams;
    const clerkUserId = req.auth?.userId;

    if (!clerkUserId) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const user = await getUsuarioConRolesTenant(clerkUserId, tenantId);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const rolIds = user.roles?.map((r: any) => r.id) || [];

    if (rolIds.length === 0) {
      return res.status(403).json({ error: 'Sin roles asignados' });
    }

    const curso = await miEntrenamientoService.getCursoConAcceso(
      tenantId,
      cursoId,
      user.id,
      rolIds,
      user.email,
      user.nombre || user.email
    );

    if (!curso) {
      return res.status(404).json({ error: 'Curso no encontrado o sin acceso' });
    }

    res.json(curso);
  } catch (error: any) {
    console.error('Error obteniendo curso:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== PROGRESO ====================

/**
 * POST /api/tenants/:tenantId/mi-entrenamiento/progreso
 * Registra el progreso de visualización de un video
 */
router.post('/progreso', requireAuth, async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.userId;
    const { inscripcion_id, video_id, segundos_vistos, porcentaje_completado } = req.body;

    console.log('[miEntrenamiento] POST /progreso - Request:', {
      clerkUserId,
      inscripcion_id,
      video_id,
      segundos_vistos,
      porcentaje_completado
    });

    if (!clerkUserId) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!inscripcion_id || !video_id) {
      console.log('[miEntrenamiento] POST /progreso - Missing required fields');
      return res.status(400).json({
        error: 'Se requieren: inscripcion_id, video_id'
      });
    }

    console.log('[miEntrenamiento] POST /progreso - Calling registrarProgreso...');
    const resultado = await miEntrenamientoService.registrarProgreso(
      inscripcion_id,
      video_id,
      segundos_vistos || 0,
      porcentaje_completado || 0
    );

    console.log('[miEntrenamiento] POST /progreso - Success:', resultado);
    res.json(resultado);
  } catch (error: any) {
    console.error('[miEntrenamiento] POST /progreso - ERROR:', error);
    console.error('[miEntrenamiento] POST /progreso - Stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

// ==================== MIS CERTIFICADOS ====================

/**
 * GET /api/tenants/:tenantId/mi-entrenamiento/mis-certificados
 * Obtiene los certificados del usuario
 */
router.get('/mis-certificados', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const clerkUserId = req.auth?.userId;

    if (!clerkUserId) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const user = await getUsuarioConRolesTenant(clerkUserId, tenantId);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const certificados = await miEntrenamientoService.getMisCertificados(
      tenantId,
      user.id,
      user.email  // También buscar por email para inscripciones manuales
    );

    res.json(certificados);
  } catch (error: any) {
    console.error('Error obteniendo certificados:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
