/**
 * MÓDULO DE UNIDADES DE PROYECTO - Rutas API
 *
 * Gestiona el inventario de unidades para proyectos inmobiliarios.
 * Rutas anidadas bajo /api/tenants/:tenantId/propiedades/:propiedadId/unidades
 */

import express, { Request, Response, NextFunction } from 'express';

// Tipos para params con mergeParams
interface UnidadParams {
  tenantId: string;
  propiedadId: string;
  unidadId?: string;
}
import {
  getUnidadesByPropiedad,
  getUnidadById,
  createUnidad,
  updateUnidad,
  deleteUnidad,
  deleteUnidadesByPropiedad,
  cambiarEstadoUnidad,
  cambiarEstadoMasivo,
  getEstadisticasProyecto,
  importarUnidades,
  exportarUnidades,
  getDisponibilidadConfig,
  updateDisponibilidadConfig,
} from '../../services/unidadesProyectoService.js';

const router = express.Router({ mergeParams: true });

// ============ Configuración de Disponibilidad ============

/**
 * GET /api/tenants/:tenantId/propiedades/:propiedadId/disponibilidad/config
 * Obtiene la configuración de disponibilidad de una propiedad
 */
router.get('/disponibilidad/config', async (req, res, next) => {
  try {
    const { tenantId, propiedadId } = req.params as UnidadParams;
    const config = await getDisponibilidadConfig(tenantId, propiedadId);
    res.json(config || { tipo: 'inventario' });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/propiedades/:propiedadId/disponibilidad/config
 * Actualiza la configuración de disponibilidad
 */
router.put('/disponibilidad/config', async (req, res, next) => {
  try {
    const { tenantId, propiedadId } = req.params as UnidadParams;
    const config = await updateDisponibilidadConfig(tenantId, propiedadId, req.body);
    res.json(config);
  } catch (error) {
    next(error);
  }
});

// ============ Estadísticas ============

/**
 * GET /api/tenants/:tenantId/propiedades/:propiedadId/unidades/stats
 * Obtiene estadísticas de disponibilidad del proyecto
 */
router.get('/unidades/stats', async (req, res, next) => {
  try {
    const { tenantId, propiedadId } = req.params as UnidadParams;
    const stats = await getEstadisticasProyecto(tenantId, propiedadId);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// ============ Import/Export ============

/**
 * GET /api/tenants/:tenantId/propiedades/:propiedadId/unidades/export
 * Exporta unidades en formato para Excel
 */
router.get('/unidades/export', async (req, res, next) => {
  try {
    const { tenantId, propiedadId } = req.params as UnidadParams;
    const data = await exportarUnidades(tenantId, propiedadId);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/propiedades/:propiedadId/unidades/import
 * Importa unidades desde un array (Excel/CSV)
 */
router.post('/unidades/import', async (req, res, next) => {
  try {
    const { tenantId, propiedadId } = req.params as UnidadParams;
    const { unidades, modo = 'agregar' } = req.body;

    if (!Array.isArray(unidades)) {
      return res.status(400).json({ error: 'Se requiere un array de unidades' });
    }

    const resultado = await importarUnidades(tenantId, propiedadId, unidades, modo);
    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

// ============ Operaciones Masivas ============

/**
 * POST /api/tenants/:tenantId/propiedades/:propiedadId/unidades/estado-masivo
 * Cambia el estado de múltiples unidades
 */
router.post('/unidades/estado-masivo', async (req, res, next) => {
  try {
    const { tenantId } = req.params as UnidadParams;
    const { unidadIds, nuevoEstado } = req.body;

    if (!Array.isArray(unidadIds) || unidadIds.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de IDs de unidades' });
    }

    if (!['disponible', 'reservada', 'bloqueada', 'vendida'].includes(nuevoEstado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const actualizadas = await cambiarEstadoMasivo(tenantId, unidadIds, nuevoEstado);
    res.json({ success: true, actualizadas });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/propiedades/:propiedadId/unidades
 * Elimina todas las unidades de un proyecto
 */
router.delete('/unidades', async (req, res, next) => {
  try {
    const { tenantId, propiedadId } = req.params as UnidadParams;
    const eliminadas = await deleteUnidadesByPropiedad(tenantId, propiedadId);
    res.json({ success: true, eliminadas });
  } catch (error) {
    next(error);
  }
});

// ============ CRUD de Unidades ============

/**
 * GET /api/tenants/:tenantId/propiedades/:propiedadId/unidades
 * Obtiene todas las unidades de un proyecto
 */
router.get('/unidades', async (req, res, next) => {
  try {
    const { tenantId, propiedadId } = req.params as UnidadParams;
    const unidades = await getUnidadesByPropiedad(tenantId, propiedadId);
    res.json(unidades);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/propiedades/:propiedadId/unidades/:unidadId
 * Obtiene una unidad específica
 */
router.get('/unidades/:unidadId', async (req, res, next) => {
  try {
    const { tenantId, unidadId } = req.params as UnidadParams;
    const unidad = await getUnidadById(tenantId, unidadId);

    if (!unidad) {
      return res.status(404).json({ error: 'Unidad no encontrada' });
    }

    res.json(unidad);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/propiedades/:propiedadId/unidades
 * Crea una nueva unidad
 */
router.post('/unidades', async (req, res, next) => {
  try {
    const { tenantId, propiedadId } = req.params as UnidadParams;

    if (!req.body.codigo) {
      return res.status(400).json({ error: 'El código de unidad es requerido' });
    }

    const unidad = await createUnidad(tenantId, propiedadId, req.body);
    res.status(201).json(unidad);
  } catch (error: any) {
    // Manejar error de código duplicado
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ya existe una unidad con ese código' });
    }
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/propiedades/:propiedadId/unidades/:unidadId
 * Actualiza una unidad existente
 */
router.put('/unidades/:unidadId', async (req, res, next) => {
  try {
    const { tenantId, unidadId } = req.params as UnidadParams;
    const unidad = await updateUnidad(tenantId, unidadId, req.body);

    if (!unidad) {
      return res.status(404).json({ error: 'Unidad no encontrada' });
    }

    res.json(unidad);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ya existe una unidad con ese código' });
    }
    next(error);
  }
});

/**
 * PATCH /api/tenants/:tenantId/propiedades/:propiedadId/unidades/:unidadId/estado
 * Cambia el estado de una unidad
 */
router.patch('/unidades/:unidadId/estado', async (req, res, next) => {
  try {
    const { tenantId, unidadId } = req.params as UnidadParams;
    const { estado, contactoId } = req.body;

    if (!['disponible', 'reservada', 'bloqueada', 'vendida'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const unidad = await cambiarEstadoUnidad(tenantId, unidadId, estado, contactoId);

    if (!unidad) {
      return res.status(404).json({ error: 'Unidad no encontrada' });
    }

    res.json(unidad);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/propiedades/:propiedadId/unidades/:unidadId
 * Elimina una unidad
 */
router.delete('/unidades/:unidadId', async (req, res, next) => {
  try {
    const { tenantId, unidadId } = req.params as UnidadParams;
    const eliminado = await deleteUnidad(tenantId, unidadId);

    if (!eliminado) {
      return res.status(404).json({ error: 'Unidad no encontrada' });
    }

    res.json({ success: true, message: 'Unidad eliminada correctamente' });
  } catch (error) {
    next(error);
  }
});

export default router;
