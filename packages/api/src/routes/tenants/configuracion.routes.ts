/**
 * MÓDULO DE CONFIGURACIÓN - Rutas de configuración del tenant
 *
 * Este módulo maneja la configuración general del tenant.
 * Está aislado para que errores aquí NO afecten otros módulos.
 */

import express from 'express'
import { query } from '../../utils/db.js';
import { getTasasCambio, updateTasasCambio } from '../../services/tasasCambioService.js';

// Tipos para params con mergeParams
interface RouteParams { [key: string]: string | undefined;
  tenantId: string;
  extensionId?: string;
}

const router = express.Router({ mergeParams: true });

/**
 * GET /api/tenants/:tenantId/configuracion
 * Obtiene la configuración general del tenant
 */
router.get('/', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;

    const result = await query(
      `SELECT
        id, nombre, slug, dominio_personalizado,
        info_negocio, configuracion, plan, activo, created_at, updated_at
      FROM tenants
      WHERE id = $1`,
      [tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant no encontrado' });
    }

    const tenant = result.rows[0];
    const infoNegocio = tenant.info_negocio || {};

    // Extraer campos de info_negocio para compatibilidad con el frontend
    res.json({
      ...tenant,
      logo_url: infoNegocio.logo_url || infoNegocio.logo || null,
      favicon_url: infoNegocio.favicon_url || infoNegocio.favicon || null,
      email_contacto: infoNegocio.email || infoNegocio.email_contacto || null,
      telefono_contacto: infoNegocio.telefono || infoNegocio.telefono_contacto || null,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/configuracion
 * Actualiza la configuración general del tenant
 */
router.put('/', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const {
      nombre, logo_url, favicon_url, email_contacto, telefono_contacto, configuracion
    } = req.body;

    const result = await query(
      `UPDATE tenants SET
        nombre = COALESCE($2, nombre),
        logo_url = COALESCE($3, logo_url),
        favicon_url = COALESCE($4, favicon_url),
        email_contacto = COALESCE($5, email_contacto),
        telefono_contacto = COALESCE($6, telefono_contacto),
        configuracion = COALESCE($7, configuracion),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
      [tenantId, nombre, logo_url, favicon_url, email_contacto, telefono_contacto, configuracion]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// ==================== TASAS DE CAMBIO ====================

/**
 * GET /api/tenants/:tenantId/configuracion/tasas-cambio
 * Obtiene las tasas de cambio del tenant
 */
router.get('/tasas-cambio', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const tasas = await getTasasCambio(tenantId);
    res.json(tasas);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/configuracion/tasas-cambio
 * Actualiza las tasas de cambio del tenant
 */
router.put('/tasas-cambio', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const { tasas } = req.body;

    if (!tasas) {
      return res.status(400).json({ error: 'Se requiere un objeto de tasas' });
    }

    // Convertir array a objeto si es necesario
    const tasasObj = Array.isArray(tasas)
      ? tasas.reduce((acc: Record<string, number>, t: { moneda: string; tasa: number }) => {
          acc[t.moneda] = t.tasa;
          return acc;
        }, {})
      : tasas;

    const resultado = await updateTasasCambio(tenantId, tasasObj);
    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

// ==================== EXTENSIONES ====================

/**
 * GET /api/tenants/:tenantId/configuracion/extensiones
 * Obtiene las extensiones habilitadas del tenant
 */
router.get('/extensiones', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;

    const result = await query(
      `SELECT
        te.id, te.extension_id, te.configuracion, te.activo, te.created_at,
        e.nombre, e.codigo, e.descripcion, e.icono, e.version
      FROM tenant_extensiones te
      JOIN extensiones e ON te.extension_id = e.id
      WHERE te.tenant_id = $1 AND te.activo = true
      ORDER BY e.nombre ASC`,
      [tenantId]
    );

    res.json({ extensiones: result.rows, total: result.rows.length });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/configuracion/extensiones
 * Habilita una extensión para el tenant
 */
router.post('/extensiones', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const { extension_id, configuracion } = req.body;

    if (!extension_id) {
      return res.status(400).json({ error: 'extension_id es requerido' });
    }

    // Verificar si ya existe
    const existing = await query(
      `SELECT id FROM tenant_extensiones WHERE tenant_id = $1 AND extension_id = $2`,
      [tenantId, extension_id]
    );

    if (existing.rows.length > 0) {
      // Actualizar
      const result = await query(
        `UPDATE tenant_extensiones SET activo = true, configuracion = COALESCE($3, configuracion), updated_at = NOW()
         WHERE tenant_id = $1 AND extension_id = $2
         RETURNING *`,
        [tenantId, extension_id, configuracion]
      );
      return res.json(result.rows[0]);
    }

    // Crear
    const result = await query(
      `INSERT INTO tenant_extensiones (tenant_id, extension_id, configuracion)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [tenantId, extension_id, configuracion || {}]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/configuracion/extensiones/:extensionId
 * Deshabilita una extensión del tenant
 */
router.delete('/extensiones/:extensionId', async (req, res, next) => {
  try {
    const { tenantId, extensionId } = req.params as RouteParams;

    const result = await query(
      `UPDATE tenant_extensiones SET activo = false, updated_at = NOW()
       WHERE tenant_id = $1 AND extension_id = $2
       RETURNING id`,
      [tenantId, extensionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Extensión no encontrada' });
    }

    res.json({ success: true, message: 'Extensión deshabilitada' });
  } catch (error) {
    next(error);
  }
});

// ==================== IDIOMAS ====================

/**
 * GET /api/tenants/:tenantId/configuracion/idiomas
 * Obtiene los idiomas habilitados del tenant
 */
router.get('/idiomas', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;

    const result = await query(
      `SELECT configuracion->'idiomas' as idiomas
       FROM tenants WHERE id = $1`,
      [tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant no encontrado' });
    }

    res.json(result.rows[0].idiomas || ['es']);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/configuracion/idiomas
 * Actualiza los idiomas del tenant
 */
router.put('/idiomas', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const { idiomas } = req.body;

    if (!idiomas || !Array.isArray(idiomas)) {
      return res.status(400).json({ error: 'Se requiere un array de idiomas' });
    }

    const result = await query(
      `UPDATE tenants SET
        configuracion = jsonb_set(COALESCE(configuracion, '{}'::jsonb), '{idiomas}', $2::jsonb),
        updated_at = NOW()
       WHERE id = $1
       RETURNING configuracion->'idiomas' as idiomas`,
      [tenantId, JSON.stringify(idiomas)]
    );

    res.json(result.rows[0].idiomas);
  } catch (error) {
    next(error);
  }
});

export default router;
