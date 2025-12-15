/**
 * Rutas para datos dinámicos
 * 
 * Endpoint único para solicitar cualquier tipo de dato dinámico
 * GET /api/dynamic-data/:tipo
 * 
 * Tipos soportados:
 * - stats
 * - categorias_videos, categorias_articulos, categorias_testimonios
 * - propiedades
 * - propiedad_single
 * - carrusel_propiedades
 * - texto_suelto
 * - lista_videos, video_single
 * - lista_articulos, articulo_single
 * - lista_testimonios, testimonio_single
 * - lista_faqs, faq_single
 * - lista_asesores, asesor_single
 */

import { Router, Request, Response } from 'express';
import { resolveDynamicDataType, DynamicDataParams } from '../services/dynamicDataService.js';

const router = Router();

/**
 * GET /api/dynamic-data/:tipo
 * Resuelve datos dinámicos por tipo
 * 
 * Query params:
 * - tenantId: ID del tenant (requerido)
 * - filters: JSON string con filtros adicionales
 * - page: Número de página (para listados)
 * - limit: Límite de resultados (para listados)
 * - id: ID del elemento (para single)
 * - clave: Clave del texto (para texto_suelto)
 * - slug: Slug del carrusel (para carrusel_propiedades)
 */
router.get('/:tipo', async (req: Request, res: Response) => {
  try {
    const { tipo } = req.params;
    const { filters, page, limit, id, clave, slug } = req.query;

    // Obtener tenantId del path (si viene montado en /api/tenants/:tenantId/dynamic-data)
    // o del query param como fallback
    let tenantId = req.query.tenantId as string;

    // Si la ruta viene de /api/tenants/:tenantId/dynamic-data, el tenantId estará en req.baseUrl
    // Express no propaga params de rutas padre, así que lo extraemos del URL
    if (!tenantId) {
      const match = req.baseUrl.match(/\/tenants\/([^\/]+)\/dynamic-data/);
      if (match) {
        tenantId = match[1];
      }
    }

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId es requerido' });
    }

    // Si es un slug en lugar de UUID, resolver al ID real
    const { getTenantByIdOrSlug } = await import('../services/tenantsService.js');
    const tenant = await getTenantByIdOrSlug(tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant no encontrado' });
    }
    tenantId = tenant.id;

    // Parsear filtros si vienen como string JSON
    let parsedFilters: Record<string, any> = {};
    if (filters) {
      try {
        parsedFilters = typeof filters === 'string' ? JSON.parse(filters) : filters;
      } catch (e) {
        console.warn('Error parsing filters:', e);
      }
    }

    // Agregar parámetros específicos a filters
    if (id) {
      parsedFilters.id = id;
    }
    if (clave) {
      parsedFilters.clave = clave;
    }
    if (slug) {
      parsedFilters.slug = slug;
    }

    const params: DynamicDataParams = {
      tenantId: tenantId as string,
      filters: parsedFilters,
      pagination: {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      },
      queryParams: req.query as Record<string, any>,
      id: id as string | undefined,
    };

    const data = await resolveDynamicDataType(tipo, params);

    // Si es null (single not found), retornar 404
    if (data === null) {
      return res.status(404).json({ error: 'Recurso no encontrado' });
    }

    res.json(data);
  } catch (error: any) {
    console.error(`Error resolviendo ${req.params.tipo}:`, error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
});

export default router;

