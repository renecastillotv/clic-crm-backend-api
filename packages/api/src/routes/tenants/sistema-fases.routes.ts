/**
 * MÓDULO DE SISTEMA DE FASES - Rutas (Nueva Versión Simplificada)
 *
 * Endpoints para el Sistema de Fases:
 * - /config: Configuración del sistema (1 por tenant)
 * - /asesores: Gestión de asesores en el sistema
 * - /leads: Leads del pool
 * - /estadisticas: Estadísticas y ranking
 */

import express, { Request, Response, NextFunction } from 'express';
import * as sistemaFasesService from '../../services/sistemaFasesService.js';

const router = express.Router({ mergeParams: true });

interface TenantParams { tenantId: string }
interface UsuarioParams extends TenantParams { usuarioId: string }

// ==================== CONFIGURACIÓN DEL SISTEMA ====================

/**
 * GET /api/tenants/:tenantId/sistema-fases/config
 * Obtiene la configuración del sistema de fases
 */
router.get('/config', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    let config = await sistemaFasesService.getConfig(tenantId);

    // Si no existe, crear una por defecto
    if (!config) {
      config = await sistemaFasesService.upsertConfig(tenantId, {});
    }

    res.json({ config });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/sistema-fases/config
 * Crea o actualiza la configuración del sistema
 */
router.put('/config', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const config = await sistemaFasesService.upsertConfig(tenantId, req.body);
    res.json({ config });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/sistema-fases/toggle
 * Activa o desactiva el sistema de fases
 */
router.post('/toggle', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { activo } = req.body;

    if (typeof activo !== 'boolean') {
      return res.status(400).json({ error: 'Campo "activo" es requerido (boolean)' });
    }

    const config = await sistemaFasesService.toggleSistema(tenantId, activo);
    res.json({ config });
  } catch (error) {
    next(error);
  }
});

// ==================== ASESORES ====================

/**
 * GET /api/tenants/:tenantId/sistema-fases/asesores
 * Obtiene todos los asesores con su estado en el sistema
 */
router.get('/asesores', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { activos } = req.query;

    const config = await sistemaFasesService.getConfig(tenantId);
    const asesores = activos === 'true'
      ? await sistemaFasesService.getAsesoresActivos(tenantId)
      : await sistemaFasesService.getAsesores(tenantId);

    res.json({
      asesores,
      config: config ? {
        intentos_fase_1: config.intentos_fase_1,
        meses_solitario_max: config.meses_solitario_max
      } : null
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/sistema-fases/asesores
 * Agrega un asesor al sistema de fases
 */
router.post('/asesores', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { usuarioId } = req.body;

    if (!usuarioId) {
      return res.status(400).json({ error: 'usuarioId es requerido' });
    }

    const asesor = await sistemaFasesService.agregarAsesor(tenantId, usuarioId);
    res.status(201).json({ asesor });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/sistema-fases/asesores/:usuarioId
 * Remueve un asesor del sistema de fases
 */
router.delete('/asesores/:usuarioId', async (req: Request<UsuarioParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, usuarioId } = req.params;
    await sistemaFasesService.removerAsesor(tenantId, usuarioId);
    res.json({ success: true, message: 'Asesor removido del sistema de fases' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/sistema-fases/asesores/:usuarioId/historial
 * Obtiene el historial de un asesor
 */
router.get('/asesores/:usuarioId/historial', async (req: Request<UsuarioParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, usuarioId } = req.params;
    const limite = parseInt(req.query.limite as string) || 50;
    const historial = await sistemaFasesService.getHistorialAsesor(tenantId, usuarioId, limite);
    res.json({ historial });
  } catch (error) {
    next(error);
  }
});

// ==================== LEADS DEL POOL ====================

/**
 * GET /api/tenants/:tenantId/sistema-fases/leads
 * Obtiene los leads del pool
 */
router.get('/leads', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { asignado, origen, usuarioId } = req.query;

    const leads = await sistemaFasesService.getLeadsPool(tenantId, {
      asignado: asignado === 'true' ? true : asignado === 'false' ? false : undefined,
      origen: origen as string
    });

    // Si se pide por usuario, filtrar
    const leadsFiltrados = usuarioId
      ? leads.filter(l => l.lead_asignado_a === usuarioId)
      : leads;

    res.json({ leads: leadsFiltrados });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/sistema-fases/leads/marcar
 * Marca un contacto como lead del pool
 */
router.post('/leads/marcar', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { contactoId, origen } = req.body;

    if (!contactoId) {
      return res.status(400).json({ error: 'contactoId es requerido' });
    }

    await sistemaFasesService.marcarComoLeadPool(tenantId, contactoId, origen || 'pool_fases');
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/sistema-fases/leads/asignar
 * Asigna un lead a un asesor
 */
router.post('/leads/asignar', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { contactoId, usuarioId } = req.body;

    if (!contactoId || !usuarioId) {
      return res.status(400).json({ error: 'contactoId y usuarioId son requeridos' });
    }

    await sistemaFasesService.asignarLead(tenantId, contactoId, usuarioId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/sistema-fases/leads/seleccionar-asesor
 * Selecciona automáticamente un asesor para el próximo lead
 */
router.get('/leads/seleccionar-asesor', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const usuarioId = await sistemaFasesService.seleccionarAsesorParaLead(tenantId);
    res.json({ usuarioId });
  } catch (error) {
    next(error);
  }
});

// ==================== ESTADÍSTICAS ====================

/**
 * GET /api/tenants/:tenantId/sistema-fases/estadisticas
 * Obtiene estadísticas del sistema de fases
 */
router.get('/estadisticas', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const estadisticas = await sistemaFasesService.getEstadisticas(tenantId);
    res.json({ estadisticas });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/sistema-fases/ranking
 * Obtiene el ranking de asesores
 */
router.get('/ranking', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const limite = parseInt(req.query.limite as string) || 10;
    const ranking = await sistemaFasesService.getRanking(tenantId, limite);
    res.json({ ranking });
  } catch (error) {
    next(error);
  }
});

// ==================== PROCESAR VENTA (para integración) ====================

/**
 * POST /api/tenants/:tenantId/sistema-fases/procesar-venta
 * Procesa una venta y actualiza el estado del asesor
 */
router.post('/procesar-venta', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { usuarioId, ventaId, esLeadPool } = req.body;

    if (!usuarioId || !ventaId) {
      return res.status(400).json({ error: 'usuarioId y ventaId son requeridos' });
    }

    await sistemaFasesService.procesarVenta(tenantId, usuarioId, ventaId, esLeadPool || false);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
