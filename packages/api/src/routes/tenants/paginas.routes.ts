/**
 * MÓDULO DE PÁGINAS - Rutas CRUD
 *
 * Este módulo maneja todas las operaciones de páginas del CRM.
 * Incluye: páginas, páginas por slug
 * Está aislado para que errores aquí NO afecten otros módulos.
 */

import express, { Request, Response, NextFunction } from 'express';
import { getPaginaCompleta } from '../../services/paginasService.js';
import { resolveUserScope } from '../../middleware/scopeResolver.js';

const router = express.Router({ mergeParams: true });
router.use(resolveUserScope);

// Tipos para request con tenantId del parent router
interface TenantParams { tenantId: string }
interface PaginaParams extends TenantParams { paginaId: string }
interface SlugParams extends TenantParams { slug: string }

/**
 * GET /api/tenants/:tenantId/paginas
 * Obtiene todas las páginas de un tenant
 */
router.get('/', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { getPaginasByTenant } = await import('../../services/paginasService.js');

    const paginas = await getPaginasByTenant(tenantId);
    res.json(paginas);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/paginas
 * Las páginas son tipos estándar del sistema (tipos_pagina).
 * Para páginas personalizadas, usar tenant_rutas_config_custom.
 */
router.post('/', async (_req: Request<TenantParams>, res: Response, _next: NextFunction) => {
  res.status(400).json({
    error: 'Operación no permitida',
    message: 'Las páginas son tipos estándar del sistema. Para personalizar componentes de una página, use el endpoint de componentes.'
  });
});

/**
 * GET /api/tenants/:tenantId/paginas/slug/:slug
 * Obtiene página por slug (para el frontend web)
 */
router.get('/slug/:slug', async (req: Request<SlugParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, slug } = req.params;
    const { getPaginasByTenant } = await import('../../services/paginasService.js');

    const paginas = await getPaginasByTenant(tenantId);
    const pagina = paginas.find((p: any) => p.slug === slug || (slug === '/' && p.slug === '/'));

    if (!pagina) {
      return res.status(404).json({
        error: 'Página no encontrada',
        message: 'La página solicitada no existe'
      });
    }

    res.json(pagina);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/paginas/:paginaId
 * Obtiene una página específica por ID
 */
router.get('/:paginaId', async (req: Request<PaginaParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, paginaId } = req.params;
    const { getPaginaById } = await import('../../services/paginasService.js');

    const pagina = await getPaginaById(tenantId, paginaId);

    if (!pagina) {
      return res.status(404).json({
        error: 'Página no encontrada',
        message: 'La página solicitada no existe o no pertenece al tenant'
      });
    }

    res.json(pagina);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/paginas/:paginaId
 * Las páginas son tipos estándar del sistema (tipos_pagina).
 * Para personalizar componentes de una página, usar el endpoint de componentes.
 */
router.put('/:paginaId', async (_req: Request<PaginaParams>, res: Response, _next: NextFunction) => {
  res.status(400).json({
    error: 'Operación no permitida',
    message: 'Las páginas son tipos estándar del sistema. Para personalizar componentes de una página, use el endpoint de componentes.'
  });
});

/**
 * GET /api/tenants/:tenantId/pages/:slug
 * Endpoint principal para obtener una página completa con todos sus componentes y tema.
 * Este endpoint reemplaza las múltiples llamadas separadas (página, tema, componentes).
 */
router.get('/pages/:slug', async (req: Request<SlugParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, slug } = req.params;

    const pageData = await getPaginaCompleta(tenantId, slug);

    if (!pageData || !pageData.page) {
      return res.status(404).json({
        error: 'Página no encontrada',
        message: `La página con slug "${slug}" no existe o no pertenece al tenant`
      });
    }

    res.json(pageData);
  } catch (error) {
    next(error);
  }
});

export default router;
