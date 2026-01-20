/**
 * MÓDULO DE AMENIDADES - Rutas para gestión de amenidades del tenant
 *
 * Este módulo maneja la gestión de amenidades (globales + personalizadas).
 * Está aislado para que errores aquí NO afecten otros módulos.
 */

import express, { Request, Response, NextFunction } from 'express';
import {
  getAmenidades,
  getCategoriasAmenidades,
  createAmenidadTenant,
  updateAmenidadTenant,
  deleteAmenidadTenant,
} from '../../services/catalogosService.js';

const router = express.Router({ mergeParams: true });

// Tipo para request con tenantId del parent router
interface TenantParams { tenantId: string }
interface AmenidadParams extends TenantParams { amenidadId: string }

/**
 * GET /api/tenants/:tenantId/amenidades
 * Obtiene las amenidades del tenant (globales + personalizadas)
 */
router.get('/', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const incluirInactivas = req.query.incluirInactivas === 'true';

    const amenidades = await getAmenidades(!incluirInactivas, tenantId);
    res.json({ amenidades });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/amenidades/categorias
 * Obtiene las categorías de amenidades disponibles
 */
router.get('/categorias', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const categorias = await getCategoriasAmenidades();
    res.json(categorias);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/amenidades
 * Crea una nueva amenidad personalizada para el tenant
 */
router.post('/', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { nombre, icono, categoria, traducciones } = req.body;

    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre de la amenidad es requerido' });
    }

    const amenidad = await createAmenidadTenant(tenantId, {
      nombre: nombre.trim(),
      icono,
      categoria,
      traducciones
    });

    res.status(201).json(amenidad);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/amenidades/:amenidadId
 * Actualiza una amenidad del tenant
 */
router.put('/:amenidadId', async (req: Request<AmenidadParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, amenidadId } = req.params;
    const { nombre, icono, categoria, traducciones, activo } = req.body;

    const amenidad = await updateAmenidadTenant(tenantId, amenidadId, {
      nombre,
      icono,
      categoria,
      traducciones,
      activo
    });

    if (!amenidad) {
      return res.status(404).json({ error: 'Amenidad no encontrada' });
    }

    res.json(amenidad);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/amenidades/:amenidadId
 * Elimina una amenidad del tenant
 */
router.delete('/:amenidadId', async (req: Request<AmenidadParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, amenidadId } = req.params;

    const deleted = await deleteAmenidadTenant(tenantId, amenidadId);

    if (!deleted) {
      return res.status(404).json({ error: 'Amenidad no encontrada' });
    }

    res.json({ success: true, message: 'Amenidad eliminada correctamente' });
  } catch (error) {
    next(error);
  }
});

export default router;
