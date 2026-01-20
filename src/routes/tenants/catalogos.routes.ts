/**
 * MÓDULO DE CATÁLOGOS - Rutas de catálogos del tenant
 *
 * Este módulo maneja los catálogos configurables del tenant:
 * - Tipos de contacto
 * - Tipos de actividad
 * - Etiquetas
 * - Amenidades
 * - Categorías de propiedad
 * - Operaciones
 */

import express from 'express'
import { query } from '../../utils/db.js';
import {
  getAmenidades,
  getAmenidadesTenant,
  getCategoriasAmenidades,
  createAmenidadTenant,
  updateAmenidadTenant,
  deleteAmenidadTenant,
} from '../../services/catalogosService.js';

// Tipos para params con mergeParams
interface RouteParams { [key: string]: string | undefined;
  tenantId: string;
  tipo?: string;
  id?: string;
  codigo?: string;
  amenidadId?: string;
}

const router = express.Router({ mergeParams: true });

/**
 * GET /api/tenants/:tenantId/catalogos
 * Obtiene todos los catálogos del tenant
 */
router.get('/', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const { activo } = req.query;
    const includeInactive = activo === 'false';

    // Obtener items de catalogos
    const result = await query(
      `SELECT c.*,
        CASE WHEN c.tenant_id IS NULL THEN 'global' ELSE 'tenant' END as origen
       FROM catalogos c
       WHERE (c.tenant_id IS NULL OR c.tenant_id = $1)
       ${includeInactive ? '' : 'AND c.activo = true'}
       ORDER BY c.tipo, c.orden, c.nombre`,
      [tenantId]
    );

    // Agrupar por tipo
    const catalogos: Record<string, any[]> = {};
    for (const row of result.rows) {
      const t = row.tipo;
      if (!catalogos[t]) {
        catalogos[t] = [];
      }
      catalogos[t].push(row);
    }

    res.json({ catalogos });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/catalogos/:tipo
 * Obtiene items de un tipo específico
 *
 * LÓGICA:
 * - Items globales (tenant_id IS NULL): usa tenant_catalogo_preferencias para estado activo
 * - Items del tenant (tenant_id = tenantId): usa su propio estado activo
 * - origen = 'global' para items globales, 'tenant' para items del tenant
 */
router.get('/:tipo', async (req, res, next) => {
  try {
    const { tenantId, tipo } = req.params as RouteParams;
    const { activo } = req.query;
    const includeInactive = activo === 'false';

    // Query simplificada usando tenant_catalogo_preferencias para el estado de items globales
    const result = await query(
      `-- Items globales con preferencia de activo del tenant
       SELECT
         g.*,
         'global' as origen,
         COALESCE(p.activo, g.activo) as activo
       FROM catalogos g
       LEFT JOIN tenant_catalogo_preferencias p ON p.catalogo_id = g.id AND p.tenant_id = $1
       WHERE g.tenant_id IS NULL
         AND g.tipo = $2
         ${includeInactive ? '' : 'AND COALESCE(p.activo, g.activo) = true'}

       UNION ALL

       -- Items del tenant (personalizados)
       SELECT
         t.*,
         'tenant' as origen,
         t.activo
       FROM catalogos t
       WHERE t.tenant_id = $1
         AND t.tipo = $2
         ${includeInactive ? '' : 'AND t.activo = true'}

       ORDER BY orden, nombre`,
      [tenantId, tipo]
    );

    res.json({ items: result.rows, total: result.rows.length });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/catalogos
 * Crea un nuevo item de catálogo
 */
router.post('/', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const {
      tipo, codigo, nombre, nombre_plural, descripcion, icono, color, orden, config, traducciones
    } = req.body;

    if (!tipo || !codigo || !nombre) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere tipo, codigo y nombre',
      });
    }

    const result = await query(
      `INSERT INTO catalogos (
        tenant_id, tipo, codigo, nombre, nombre_plural, descripcion, icono, color, orden, config, traducciones
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [tenantId, tipo, codigo, nombre, nombre_plural, descripcion, icono, color, orden || 0, config, traducciones]
    );

    res.status(201).json({ catalogo: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/catalogos/:id
 * Actualiza un item de catálogo
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { tenantId, id } = req.params as RouteParams;
    const {
      codigo, nombre, nombre_plural, descripcion, icono, color, orden, activo, config, traducciones
    } = req.body;

    const result = await query(
      `UPDATE catalogos SET
        codigo = COALESCE($3, codigo),
        nombre = COALESCE($4, nombre),
        nombre_plural = COALESCE($5, nombre_plural),
        descripcion = COALESCE($6, descripcion),
        icono = COALESCE($7, icono),
        color = COALESCE($8, color),
        orden = COALESCE($9, orden),
        activo = COALESCE($10, activo),
        config = COALESCE($11, config),
        traducciones = COALESCE($12, traducciones),
        updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING *`,
      [id, tenantId, codigo, nombre, nombre_plural, descripcion, icono, color, orden, activo, config, traducciones]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item de catálogo no encontrado' });
    }

    res.json({ catalogo: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/catalogos/:id
 * Elimina un item de catálogo
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { tenantId, id } = req.params as RouteParams;

    const result = await query(
      `DELETE FROM catalogos WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item de catálogo no encontrado' });
    }

    res.json({ success: true, message: 'Item eliminado' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/catalogos/:tipo/toggle/:codigo
 * Activa/desactiva un item de catálogo
 *
 * LÓGICA:
 * - Items del tenant: actualiza directamente catalogos.activo
 * - Items globales: usa tenant_catalogo_preferencias (no duplica el registro)
 */
router.post('/:tipo/toggle/:codigo', async (req, res, next) => {
  try {
    const { tenantId, tipo, codigo } = req.params as RouteParams;
    const { activo } = req.body;

    // Primero buscar si existe un item del tenant
    const tenantItem = await query(
      `SELECT * FROM catalogos WHERE tenant_id = $1 AND tipo = $2 AND codigo = $3`,
      [tenantId, tipo, codigo]
    );

    if (tenantItem.rows.length > 0) {
      // Actualizar el item del tenant existente
      const result = await query(
        `UPDATE catalogos SET activo = $4, updated_at = NOW()
         WHERE tenant_id = $1 AND tipo = $2 AND codigo = $3
         RETURNING *, 'tenant' as origen`,
        [tenantId, tipo, codigo, activo]
      );
      return res.json({ catalogo: result.rows[0] });
    }

    // Si no hay item del tenant, buscar item global
    const globalItem = await query(
      `SELECT * FROM catalogos WHERE tenant_id IS NULL AND tipo = $1 AND codigo = $2`,
      [tipo, codigo]
    );

    if (globalItem.rows.length === 0) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }

    // Para items globales, usar tenant_catalogo_preferencias (UPSERT)
    const catalogoId = globalItem.rows[0].id;
    await query(
      `INSERT INTO tenant_catalogo_preferencias (tenant_id, catalogo_id, activo, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (tenant_id, catalogo_id)
       DO UPDATE SET activo = $3, updated_at = NOW()`,
      [tenantId, catalogoId, activo]
    );

    // Devolver el item global con el estado actualizado
    res.json({
      catalogo: {
        ...globalItem.rows[0],
        activo,
        origen: 'global'
      }
    });
  } catch (error) {
    next(error);
  }
});

// ==================== AMENIDADES ====================

/**
 * GET /api/tenants/:tenantId/catalogos/amenidades
 * Obtiene amenidades del tenant
 */
router.get('/amenidades/list', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const amenidades = await getAmenidadesTenant(tenantId);
    res.json({ amenidades, total: amenidades.length });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/catalogos/amenidades/categorias
 * Obtiene categorías de amenidades
 */
router.get('/amenidades/categorias', async (req, res, next) => {
  try {
    const categorias = await getCategoriasAmenidades();
    res.json({ categorias, total: categorias.length });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/catalogos/amenidades
 * Crea una amenidad para el tenant
 */
router.post('/amenidades', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const amenidad = await createAmenidadTenant(tenantId, req.body);
    res.status(201).json(amenidad);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/catalogos/amenidades/:amenidadId
 * Actualiza una amenidad del tenant
 */
router.put('/amenidades/:amenidadId', async (req, res, next) => {
  try {
    const { tenantId, amenidadId } = req.params as RouteParams;
    const amenidad = await updateAmenidadTenant(tenantId, amenidadId, req.body);
    res.json(amenidad);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/catalogos/amenidades/:amenidadId
 * Elimina una amenidad del tenant
 */
router.delete('/amenidades/:amenidadId', async (req, res, next) => {
  try {
    const { tenantId, amenidadId } = req.params as RouteParams;
    await deleteAmenidadTenant(tenantId, amenidadId);
    res.json({ success: true, message: 'Amenidad eliminada' });
  } catch (error) {
    next(error);
  }
});

export default router;
