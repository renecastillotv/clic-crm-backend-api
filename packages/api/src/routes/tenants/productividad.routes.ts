/**
 * MÓDULO DE PRODUCTIVIDAD - Rutas
 *
 * Endpoints para el Sistema de Productividad:
 * - Configuración de metas y pesos
 * - Niveles de productividad (básico, promedio, experto)
 * - Metas personalizadas por usuario
 * - Cálculo de productividad en tiempo real
 * - Ranking y estadísticas
 */

import express, { Request, Response, NextFunction } from 'express';
import * as productividadService from '../../services/productividadService.js';
import { resolveUserScope } from '../../middleware/scopeResolver.js';

const router = express.Router({ mergeParams: true });
router.use(resolveUserScope);

interface TenantParams { tenantId: string }
interface UsuarioParams extends TenantParams { usuarioId: string }
interface NivelParams extends TenantParams { nivelId: string }

// ==================== CONFIGURACIÓN ====================

/**
 * GET /api/tenants/:tenantId/productividad/config
 * Obtiene la configuración de productividad
 */
router.get('/config', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const config = await productividadService.getConfig(tenantId);
    res.json({ config: config || null });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/productividad/config
 * Crea o actualiza la configuración de productividad
 */
router.put('/config', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const config = await productividadService.upsertConfig(tenantId, req.body);
    res.json({ config });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/productividad/toggle
 * Activa o desactiva el sistema de productividad
 */
router.post('/toggle', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { activo } = req.body;

    if (typeof activo !== 'boolean') {
      return res.status(400).json({ error: 'Campo "activo" es requerido (boolean)' });
    }

    const config = await productividadService.toggleSistema(tenantId, activo);
    res.json({ config });
  } catch (error) {
    next(error);
  }
});

// ==================== METAS POR USUARIO ====================

/**
 * GET /api/tenants/:tenantId/productividad/metas/:usuarioId
 * Obtiene las metas de un usuario para un período
 */
router.get('/metas/:usuarioId', async (req: Request<UsuarioParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, usuarioId } = req.params;
    const periodo = (req.query.periodo as string) || new Date().toISOString().slice(0, 7);

    const metas = await productividadService.getMetasUsuario(tenantId, usuarioId, periodo);
    res.json({ metas });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/productividad/metas/:usuarioId
 * Establece metas personalizadas para un usuario
 */
router.put('/metas/:usuarioId', async (req: Request<UsuarioParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, usuarioId } = req.params;
    const periodo = (req.query.periodo as string) || new Date().toISOString().slice(0, 7);

    const metas = await productividadService.setMetasUsuario(tenantId, usuarioId, periodo, req.body);
    res.json({ metas });
  } catch (error) {
    next(error);
  }
});

// ==================== RESUMEN DE PRODUCTIVIDAD ====================

/**
 * GET /api/tenants/:tenantId/productividad/resumen/:usuarioId
 * Obtiene el resumen de productividad de un usuario
 */
router.get('/resumen/:usuarioId', async (req: Request<UsuarioParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, usuarioId } = req.params;
    const periodo = (req.query.periodo as string) || new Date().toISOString().slice(0, 7);

    const resumen = await productividadService.calcularProductividadUsuario(tenantId, usuarioId, periodo);

    if (!resumen) {
      return res.status(404).json({ error: 'Usuario no encontrado o sistema inactivo' });
    }

    res.json({ resumen });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/productividad/equipo
 * Obtiene el resumen de productividad de todo el equipo
 */
router.get('/equipo', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const periodo = (req.query.periodo as string) || new Date().toISOString().slice(0, 7);

    const equipo = await productividadService.getResumenEquipo(tenantId, periodo);
    res.json({ equipo });
  } catch (error) {
    next(error);
  }
});

// ==================== RANKING ====================

/**
 * GET /api/tenants/:tenantId/productividad/ranking
 * Obtiene el ranking de productividad
 */
router.get('/ranking', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const periodo = (req.query.periodo as string) || new Date().toISOString().slice(0, 7);
    const limite = parseInt(req.query.limite as string) || 10;

    const ranking = await productividadService.getRankingProductividad(tenantId, periodo, limite);
    res.json({ ranking });
  } catch (error) {
    next(error);
  }
});

// ==================== ESTADÍSTICAS ====================

/**
 * GET /api/tenants/:tenantId/productividad/estadisticas
 * Obtiene estadísticas globales de productividad
 */
router.get('/estadisticas', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const periodo = (req.query.periodo as string) || new Date().toISOString().slice(0, 7);

    const estadisticas = await productividadService.getEstadisticasGlobales(tenantId, periodo);
    res.json({ estadisticas });
  } catch (error) {
    next(error);
  }
});

// ==================== ACTUALIZAR CACHE ====================

/**
 * POST /api/tenants/:tenantId/productividad/actualizar-cache/:usuarioId
 * Actualiza el cache de productividad de un usuario
 */
router.post('/actualizar-cache/:usuarioId', async (req: Request<UsuarioParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, usuarioId } = req.params;
    const periodo = (req.query.periodo as string) || new Date().toISOString().slice(0, 7);

    await productividadService.actualizarCache(tenantId, usuarioId, periodo);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ==================== NIVELES DE PRODUCTIVIDAD ====================

/**
 * GET /api/tenants/:tenantId/productividad/niveles
 * Obtiene todos los niveles de productividad
 */
router.get('/niveles', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const niveles = await productividadService.getNiveles(tenantId);
    res.json({ niveles });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/productividad/niveles
 * Crea un nuevo nivel de productividad
 */
router.post('/niveles', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { nombre, codigo, descripcion, orden, color, es_default, ...metas } = req.body;

    if (!nombre || !codigo) {
      return res.status(400).json({ error: 'nombre y codigo son requeridos' });
    }

    const nivel = await productividadService.createNivel(tenantId, {
      nombre,
      codigo,
      descripcion,
      orden,
      color,
      es_default,
      ...metas
    });
    res.status(201).json({ nivel });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/productividad/niveles/:nivelId
 * Actualiza un nivel de productividad
 */
router.put('/niveles/:nivelId', async (req: Request<NivelParams>, res: Response, next: NextFunction) => {
  try {
    const { nivelId } = req.params;
    const nivel = await productividadService.updateNivel(nivelId, req.body);

    if (!nivel) {
      return res.status(404).json({ error: 'Nivel no encontrado' });
    }

    res.json({ nivel });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/productividad/niveles/:nivelId
 * Desactiva un nivel de productividad
 */
router.delete('/niveles/:nivelId', async (req: Request<NivelParams>, res: Response, next: NextFunction) => {
  try {
    const { nivelId } = req.params;
    await productividadService.updateNivel(nivelId, { activo: false });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ==================== USUARIOS CON NIVELES ====================

/**
 * GET /api/tenants/:tenantId/productividad/usuarios
 * Obtiene todos los usuarios con su nivel de productividad
 */
router.get('/usuarios', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const usuarios = await productividadService.getUsuariosConNivel(tenantId);
    res.json({ usuarios });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/productividad/usuarios/:usuarioId/nivel
 * Asigna un nivel de productividad a un usuario
 */
router.put('/usuarios/:usuarioId/nivel', async (req: Request<UsuarioParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, usuarioId } = req.params;
    const { nivelId } = req.body;

    if (!nivelId) {
      return res.status(400).json({ error: 'nivelId es requerido' });
    }

    await productividadService.asignarNivelUsuario(tenantId, usuarioId, nivelId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/productividad/usuarios/:usuarioId/metas-efectivas
 * Obtiene las metas efectivas de un usuario (considerando su nivel)
 */
router.get('/usuarios/:usuarioId/metas-efectivas', async (req: Request<UsuarioParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, usuarioId } = req.params;
    const metas = await productividadService.getMetasEfectivasUsuario(tenantId, usuarioId);
    res.json({ metas });
  } catch (error) {
    next(error);
  }
});

export default router;
