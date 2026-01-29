/**
 * Rutas de Membresías - Admin API
 *
 * Endpoints para gestión de tipos de membresía, precios de features y uso.
 */

import express from 'express';
import {
  getTiposMembresia,
  getTipoMembresiaById,
  createTipoMembresia,
  updateTipoMembresia,
  deleteTipoMembresia,
  getPreciosFeatures,
  setPrecioFeature,
  deletePrecioFeature,
  asignarMembresiaTenant,
  getLimitesTenant,
  setLimitesOverride,
} from '../services/membershipService.js';
import {
  getUsoTenant,
  getHistorialUso,
  recalcularContadores,
  calcularCostosPeriodo,
  getResumenUsoTodos,
} from '../services/usageTrackingService.js';

const router = express.Router();

// Nota: La autenticación ya es aplicada por admin.ts

// ==================== USO Y TRACKING ====================
// IMPORTANTE: Estas rutas deben estar ANTES de /:id para evitar que "usage" sea capturado como ID

/**
 * GET /api/admin/memberships/usage
 * Resumen de uso de todos los tenants
 */
router.get('/usage', async (req, res, next) => {
  try {
    const { estado_cuenta, tipo_membresia_id } = req.query;

    const resumen = await getResumenUsoTodos({
      estado_cuenta: estado_cuenta as string,
      tipo_membresia_id: tipo_membresia_id as string,
    });

    res.json({ data: resumen, total: resumen.length });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/memberships/usage/:tenantId
 * Uso detallado de un tenant
 */
router.get('/usage/:tenantId', async (req, res, next) => {
  try {
    const uso = await getUsoTenant(req.params.tenantId);
    const costos = await calcularCostosPeriodo(req.params.tenantId);
    const limites = await getLimitesTenant(req.params.tenantId);

    res.json({
      uso,
      costos,
      limites,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/memberships/usage/:tenantId/history
 * Historial de uso de un tenant
 */
router.get('/usage/:tenantId/history', async (req, res, next) => {
  try {
    const { tipo_evento, fecha_desde, fecha_hasta, limit, offset } = req.query;

    const historial = await getHistorialUso(req.params.tenantId, {
      tipo_evento: tipo_evento as string,
      fecha_desde: fecha_desde ? new Date(fecha_desde as string) : undefined,
      fecha_hasta: fecha_hasta ? new Date(fecha_hasta as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json(historial);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/memberships/usage/:tenantId/recalculate
 * Forzar recálculo de contadores
 */
router.post('/usage/:tenantId/recalculate', async (req, res, next) => {
  try {
    const uso = await recalcularContadores(req.params.tenantId);
    res.json({ success: true, uso });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/memberships/usage/:tenantId/calculate
 * Calcular factura pendiente
 */
router.get('/usage/:tenantId/calculate', async (req, res, next) => {
  try {
    const costos = await calcularCostosPeriodo(req.params.tenantId);
    res.json(costos);
  } catch (error) {
    next(error);
  }
});

// ==================== TIPOS DE MEMBRESÍA ====================

/**
 * GET /api/admin/memberships
 * Lista todos los tipos de membresía
 */
router.get('/', async (req, res, next) => {
  try {
    const incluirInactivos = req.query.incluirInactivos === 'true';
    const tipos = await getTiposMembresia(incluirInactivos);
    res.json({ tipos, total: tipos.length });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/memberships/:id
 * Obtener detalle de un tipo de membresía
 */
router.get('/:id', async (req, res, next) => {
  try {
    const tipo = await getTipoMembresiaById(req.params.id);
    if (!tipo) {
      return res.status(404).json({ error: 'Tipo de membresía no encontrado' });
    }
    res.json(tipo);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/memberships
 * Crear nuevo tipo de membresía
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      codigo,
      nombre,
      descripcion,
      precio_base,
      moneda,
      ciclo_facturacion,
      usuarios_incluidos,
      propiedades_incluidas,
      costo_usuario_adicional,
      costo_propiedad_adicional,
      permite_pagina_web,
      permite_subtenants,
      es_individual,
      features_incluidos,
      orden,
    } = req.body;

    if (!codigo || !nombre || precio_base === undefined) {
      return res.status(400).json({
        error: 'Campos requeridos: codigo, nombre, precio_base',
      });
    }

    const tipo = await createTipoMembresia({
      codigo,
      nombre,
      descripcion,
      precio_base,
      moneda,
      ciclo_facturacion,
      usuarios_incluidos,
      propiedades_incluidas,
      costo_usuario_adicional,
      costo_propiedad_adicional,
      permite_pagina_web,
      permite_subtenants,
      es_individual,
      features_incluidos,
      orden,
    });

    res.status(201).json(tipo);
  } catch (error: any) {
    if (error.message?.includes('duplicate key')) {
      return res.status(400).json({ error: 'El código ya existe' });
    }
    next(error);
  }
});

/**
 * PUT /api/admin/memberships/:id
 * Actualizar tipo de membresía
 */
router.put('/:id', async (req, res, next) => {
  try {
    const tipo = await updateTipoMembresia(req.params.id, req.body);
    if (!tipo) {
      return res.status(404).json({ error: 'Tipo de membresía no encontrado' });
    }
    res.json(tipo);
  } catch (error: any) {
    if (error.message?.includes('duplicate key')) {
      return res.status(400).json({ error: 'El código ya existe' });
    }
    next(error);
  }
});

/**
 * DELETE /api/admin/memberships/:id
 * Eliminar (desactivar) tipo de membresía
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const eliminado = await deleteTipoMembresia(req.params.id);
    if (!eliminado) {
      return res.status(404).json({ error: 'Tipo de membresía no encontrado' });
    }
    res.json({ success: true, message: 'Tipo de membresía desactivado' });
  } catch (error: any) {
    if (error.message?.includes('hay tenants')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

// ==================== PRECIOS DE FEATURES ====================

/**
 * GET /api/admin/memberships/:id/features
 * Obtener precios de features para un tipo de membresía
 */
router.get('/:id/features', async (req, res, next) => {
  try {
    const precios = await getPreciosFeatures(req.params.id);
    res.json({ precios, total: precios.length });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/memberships/:id/features
 * Establecer precio de un feature para el tipo de membresía
 */
router.post('/:id/features', async (req, res, next) => {
  try {
    const { feature_id, precio_mensual, precio_unico, moneda } = req.body;

    if (!feature_id) {
      return res.status(400).json({ error: 'feature_id es requerido' });
    }

    const tipoMembresiaId = req.params.id === 'global' ? null : req.params.id;

    const precio = await setPrecioFeature(
      feature_id,
      tipoMembresiaId,
      precio_mensual ?? null,
      precio_unico ?? null,
      moneda || 'USD'
    );

    res.status(201).json(precio);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/memberships/:id/features/:featureId
 * Eliminar precio de un feature
 */
router.delete('/:id/features/:featureId', async (req, res, next) => {
  try {
    const tipoMembresiaId = req.params.id === 'global' ? null : req.params.id;
    const eliminado = await deletePrecioFeature(req.params.featureId, tipoMembresiaId);

    if (!eliminado) {
      return res.status(404).json({ error: 'Precio no encontrado' });
    }

    res.json({ success: true, message: 'Precio eliminado' });
  } catch (error) {
    next(error);
  }
});

// ==================== ASIGNACIÓN A TENANTS ====================

/**
 * PUT /api/admin/memberships/assign/:tenantId
 * Asignar membresía a un tenant
 */
router.put('/assign/:tenantId', async (req, res, next) => {
  try {
    const { tipo_membresia_id } = req.body;

    if (!tipo_membresia_id) {
      return res.status(400).json({ error: 'tipo_membresia_id es requerido' });
    }

    await asignarMembresiaTenant(req.params.tenantId, tipo_membresia_id);
    res.json({ success: true, message: 'Membresía asignada' });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/memberships/limits/:tenantId
 * Establecer límites personalizados para un tenant
 */
router.put('/limits/:tenantId', async (req, res, next) => {
  try {
    const { usuarios, propiedades } = req.body;

    await setLimitesOverride(req.params.tenantId, { usuarios, propiedades });
    const limites = await getLimitesTenant(req.params.tenantId);

    res.json({ success: true, limites });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/memberships/limits/:tenantId
 * Obtener límites de un tenant
 */
router.get('/limits/:tenantId', async (req, res, next) => {
  try {
    const limites = await getLimitesTenant(req.params.tenantId);
    res.json(limites);
  } catch (error) {
    next(error);
  }
});

export default router;
