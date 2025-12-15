import express from 'express';
import { requireAuth } from '../middleware/clerkAuth.js';
import * as tenantPaginasService from '../services/tenantPaginasService.js';

const router = express.Router();

/**
 * GET /api/tenants/:tenantId/paginas-disponibles
 * Obtener todas las páginas disponibles para un tenant
 */
router.get('/:tenantId/paginas-disponibles', requireAuth, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { solo_visibles, solo_habilitadas } = req.query;

    let paginas;
    if (solo_habilitadas === 'true') {
      paginas = await tenantPaginasService.getPaginasHabilitadasParaTenant(tenantId);
    } else if (solo_visibles === 'true') {
      paginas = await tenantPaginasService.getPaginasVisiblesParaTenant(tenantId);
    } else {
      paginas = await tenantPaginasService.getPaginasDisponiblesParaTenant(tenantId);
    }

    res.json(paginas);
  } catch (error: any) {
    console.error('Error al obtener páginas disponibles:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/paginas-estadisticas
 * Obtener estadísticas de páginas de un tenant
 */
router.get('/:tenantId/paginas-estadisticas', requireAuth, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const stats = await tenantPaginasService.getEstadisticasPaginasTenant(tenantId);
    res.json(stats);
  } catch (error: any) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/paginas/:tipoPagina/activar
 * Activar una página para un tenant
 */
router.post('/:tenantId/paginas/:tipoPagina/activar', requireAuth, async (req, res) => {
  try {
    const { tenantId, tipoPagina } = req.params;
    const { variante = 'default' } = req.body;

    const paginaActiva = await tenantPaginasService.activarPaginaParaTenant(
      tenantId,
      tipoPagina,
      variante
    );

    res.json(paginaActiva);
  } catch (error: any) {
    console.error('Error al activar página:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/paginas/:tipoPagina/desactivar
 * Desactivar una página para un tenant
 */
router.post('/:tenantId/paginas/:tipoPagina/desactivar', requireAuth, async (req, res) => {
  try {
    const { tenantId, tipoPagina } = req.params;
    await tenantPaginasService.desactivarPaginaParaTenant(tenantId, tipoPagina);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error al desactivar página:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/tenants/:tenantId/paginas/:tipoPagina/variante
 * Cambiar variante activa de una página
 */
router.put('/:tenantId/paginas/:tipoPagina/variante', requireAuth, async (req, res) => {
  try {
    const { tenantId, tipoPagina } = req.params;
    const { variante } = req.body;

    if (!variante) {
      return res.status(400).json({ error: 'Campo "variante" requerido' });
    }

    const paginaActiva = await tenantPaginasService.cambiarVariantePagina(
      tenantId,
      tipoPagina,
      variante
    );

    res.json(paginaActiva);
  } catch (error: any) {
    console.error('Error al cambiar variante:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/paginas/:tipoPagina/validar
 * Verificar si un tenant puede activar una página
 */
router.post('/:tenantId/paginas/:tipoPagina/validar', requireAuth, async (req, res) => {
  try {
    const { tenantId, tipoPagina } = req.params;
    const resultado = await tenantPaginasService.tenantPuedeActivarPagina(tenantId, tipoPagina);
    res.json(resultado);
  } catch (error: any) {
    console.error('Error al validar página:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/paginas/:tipoPagina/configuraciones-variantes
 * Obtener configuraciones guardadas de todas las variantes
 */
router.get(
  '/:tenantId/paginas/:tipoPagina/configuraciones-variantes',
  requireAuth,
  async (req, res) => {
    try {
      const { tenantId, tipoPagina } = req.params;
      const configs = await tenantPaginasService.getConfiguracionesVariantes(tenantId, tipoPagina);
      res.json(configs);
    } catch (error: any) {
      console.error('Error al obtener configuraciones:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * PUT /api/tenants/:tenantId/paginas/:tipoPagina/configuraciones-variantes/:variante
 * Guardar configuración de una variante
 */
router.put(
  '/:tenantId/paginas/:tipoPagina/configuraciones-variantes/:variante',
  requireAuth,
  async (req, res) => {
    try {
      const { tenantId, tipoPagina, variante } = req.params;
      const configuracion = req.body;

      await tenantPaginasService.guardarConfiguracionVariante(
        tenantId,
        tipoPagina,
        variante,
        configuracion
      );

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error al guardar configuración:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/tenants/:tenantId/inicializar-paginas
 * Inicializar páginas para un nuevo tenant
 */
router.post('/:tenantId/inicializar-paginas', requireAuth, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { plan = 'basic' } = req.body;

    await tenantPaginasService.inicializarPaginasParaTenant(tenantId, plan);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error al inicializar páginas:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/tenants/:tenantId/actualizar-plan
 * Actualizar páginas disponibles cuando cambia el plan
 */
router.put('/:tenantId/actualizar-plan', requireAuth, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { plan } = req.body;

    if (!plan) {
      return res.status(400).json({ error: 'Campo "plan" requerido' });
    }

    await tenantPaginasService.actualizarPaginasDisponiblesPorPlan(tenantId, plan);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error al actualizar plan:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
