/**
 * MÓDULO DE CATÁLOGOS SEPARADOS - Rutas para conteos y operaciones de catálogos
 *
 * Este módulo maneja las rutas de catálogos separados del CRM:
 * - tipo_propiedad -> tabla categorias_propiedades (GLOBAL - sin tenant_id)
 * - tipo_operacion -> tabla operaciones (GLOBAL - sin tenant_id)
 * - estado_venta -> tabla estados_venta (POR TENANT - tiene tenant_id)
 */

import express from 'express'
import { query } from '../../utils/db.js';

// Tipos para params con mergeParams
interface RouteParams { [key: string]: string | undefined;
  tenantId: string;
  tipo?: string;
  id?: string;
}

const router = express.Router({ mergeParams: true });

// Mapeo de tipos a tablas y campos
// IMPORTANTE: algunas tablas son globales (sin tenant_id) y otras son por tenant
const TIPOS_CONFIG: Record<string, {
  tabla: string;
  campoSlug: string;
  tieneTraduccionesSlugs: boolean;
  esPorTenant: boolean; // true = tiene tenant_id, false = tabla global
}> = {
  tipo_propiedad: {
    tabla: 'categorias_propiedades',
    campoSlug: 'slug',
    tieneTraduccionesSlugs: true,
    esPorTenant: false,
  },
  tipo_operacion: {
    tabla: 'operaciones',
    campoSlug: 'slug',
    tieneTraduccionesSlugs: true,
    esPorTenant: false,
  },
  estado_venta: {
    tabla: 'estados_venta',
    campoSlug: 'codigo',
    tieneTraduccionesSlugs: false,
    esPorTenant: true,
  },
};

/**
 * GET /api/tenants/:tenantId/catalogos-separados/conteos
 * Obtiene los conteos de diferentes catálogos del tenant
 */
router.get('/conteos', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;

    // Ejecutar todas las consultas en paralelo con manejo de errores individual
    const [
      extensionesResult,
      amenidadesResult,
      equiposResult,
      oficinasResult,
      tipoPropiedadResult,
      tipoOperacionResult,
      estadoVentaResult
    ] = await Promise.all([
      query(
        `SELECT COUNT(*) as count FROM catalogo_extensiones_contacto WHERE tenant_id IS NULL OR tenant_id = $1`,
        [tenantId]
      ).catch(() => ({ rows: [{ count: 0 }] })),
      query(
        `SELECT COUNT(*) as count FROM amenidades WHERE tenant_id IS NULL OR tenant_id = $1`,
        [tenantId]
      ).catch(() => ({ rows: [{ count: 0 }] })),
      query(
        `SELECT COUNT(*) as count FROM equipos WHERE tenant_id = $1`,
        [tenantId]
      ).catch(() => ({ rows: [{ count: 0 }] })),
      query(
        `SELECT COUNT(*) as count FROM oficinas WHERE tenant_id = $1`,
        [tenantId]
      ).catch(() => ({ rows: [{ count: 0 }] })),
      // tipo_propiedad es tabla global (sin tenant_id) - usar preferencias del tenant
      query(
        `SELECT COUNT(*) as count
         FROM categorias_propiedades cp
         LEFT JOIN tenant_global_catalogo_preferencias p
           ON p.item_id = cp.id AND p.tenant_id = $1 AND p.tabla = 'categorias_propiedades'
         WHERE COALESCE(p.activo, cp.activo) = true`,
        [tenantId]
      ).catch(() => ({ rows: [{ count: 0 }] })),
      // tipo_operacion es tabla global (sin tenant_id) - usar preferencias del tenant
      query(
        `SELECT COUNT(*) as count
         FROM operaciones o
         LEFT JOIN tenant_global_catalogo_preferencias p
           ON p.item_id = o.id AND p.tenant_id = $1 AND p.tabla = 'operaciones'
         WHERE COALESCE(p.activo, o.activo) = true`,
        [tenantId]
      ).catch(() => ({ rows: [{ count: 0 }] })),
      // estado_venta es por tenant
      query(
        `SELECT COUNT(*) as count FROM estados_venta WHERE tenant_id = $1`,
        [tenantId]
      ).catch(() => ({ rows: [{ count: 0 }] }))
    ]);

    // Formato esperado por el frontend: { conteos: { tipo_propiedad: X, ... } }
    res.json({
      conteos: {
        tipo_propiedad: parseInt(tipoPropiedadResult.rows[0]?.count || '0'),
        tipo_operacion: parseInt(tipoOperacionResult.rows[0]?.count || '0'),
        estado_venta: parseInt(estadoVentaResult.rows[0]?.count || '0'),
        extensiones_contacto: parseInt(extensionesResult.rows[0]?.count || '0'),
        amenidades: parseInt(amenidadesResult.rows[0]?.count || '0'),
        equipos: parseInt(equiposResult.rows[0]?.count || '0'),
        oficinas: parseInt(oficinasResult.rows[0]?.count || '0')
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/catalogos-separados/:tipo
 * Obtiene todos los items de un tipo de catálogo separado
 */
router.get('/:tipo', async (req, res, next) => {
  try {
    const { tenantId, tipo } = req.params as RouteParams;
    const { activo } = req.query;
    const includeInactive = activo === 'false';

    const config = TIPOS_CONFIG[tipo];
    if (!config) {
      return res.status(400).json({ error: `Tipo de catálogo no válido: ${tipo}` });
    }

    const { tabla, campoSlug, esPorTenant } = config;

    let result;
    if (esPorTenant) {
      // estado_venta - datos por tenant
      result = await query(
        `SELECT *, 'tenant' as origen
         FROM ${tabla}
         WHERE tenant_id = $1
         ${includeInactive ? '' : 'AND activo = true'}
         ORDER BY orden, nombre`,
        [tenantId]
      );
    } else {
      // tipo_propiedad y tipo_operacion - datos globales (sin tenant_id)
      // Usar tenant_global_catalogo_preferencias para el estado activo por tenant
      result = await query(
        `SELECT g.*,
                'global' as origen,
                COALESCE(p.activo, g.activo) as activo
         FROM ${tabla} g
         LEFT JOIN tenant_global_catalogo_preferencias p
           ON p.item_id = g.id
           AND p.tenant_id = $1
           AND p.tabla = $2
         ${includeInactive ? '' : 'WHERE COALESCE(p.activo, g.activo) = true'}
         ORDER BY g.orden, g.nombre`,
        [tenantId, tabla]
      );
    }

    // Mapear campos para compatibilidad con el frontend
    const items = result.rows.map(row => ({
      ...row,
      codigo: row[campoSlug] || row.codigo || row.id,
    }));

    res.json({ items, total: items.length });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/catalogos-separados/:tipo
 * Crea un nuevo item en un catálogo separado
 * NOTA: Solo funciona para estado_venta (por tenant). Las tablas globales no permiten crear.
 */
router.post('/:tipo', async (req, res, next) => {
  try {
    const { tenantId, tipo } = req.params as RouteParams;
    const { codigo, nombre, descripcion, icono, color, traducciones, slug_traducciones } = req.body;

    const config = TIPOS_CONFIG[tipo];
    if (!config) {
      return res.status(400).json({ error: `Tipo de catálogo no válido: ${tipo}` });
    }

    if (!config.esPorTenant) {
      return res.status(403).json({
        error: 'No se pueden crear items en catálogos globales. Estos son administrados por el sistema.'
      });
    }

    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    const { tabla, campoSlug } = config;
    const slugValue = codigo || nombre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Obtener el máximo orden
    const ordenResult = await query(
      `SELECT COALESCE(MAX(orden), 0) + 1 as next_orden FROM ${tabla} WHERE tenant_id = $1`,
      [tenantId]
    );
    const nextOrden = ordenResult.rows[0]?.next_orden || 1;

    // estado_venta tiene estructura diferente
    const result = await query(
      `INSERT INTO ${tabla} (tenant_id, ${campoSlug}, nombre, descripcion, color, orden)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *, 'tenant' as origen`,
      [tenantId, slugValue, nombre.trim(), descripcion || null, color || null, nextOrden]
    );

    const item = {
      ...result.rows[0],
      codigo: result.rows[0][campoSlug] || result.rows[0].codigo,
    };

    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/catalogos-separados/:tipo/:id
 * Actualiza un item de un catálogo separado
 */
router.put('/:tipo/:id', async (req, res, next) => {
  try {
    const { tenantId, tipo, id } = req.params as RouteParams;
    const { nombre, descripcion, icono, color, activo, traducciones, slug_traducciones } = req.body;

    const config = TIPOS_CONFIG[tipo];
    if (!config) {
      return res.status(400).json({ error: `Tipo de catálogo no válido: ${tipo}` });
    }

    const { tabla, esPorTenant, tieneTraduccionesSlugs } = config;

    // Verificar que el item existe
    const existing = await query(
      `SELECT * FROM ${tabla} WHERE id = $1`,
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }

    const item = existing.rows[0];

    let result;
    if (esPorTenant) {
      // estado_venta - solo items del tenant
      if (item.tenant_id !== tenantId) {
        return res.status(403).json({ error: 'No tiene permiso para modificar este item' });
      }

      result = await query(
        `UPDATE ${tabla} SET
          nombre = COALESCE($2, nombre),
          descripcion = COALESCE($3, descripcion),
          color = COALESCE($4, color),
          activo = COALESCE($5, activo),
          updated_at = NOW()
         WHERE id = $1 AND tenant_id = $6
         RETURNING *, 'tenant' as origen`,
        [id, nombre, descripcion, color, activo, tenantId]
      );
    } else {
      // tipo_propiedad y tipo_operacion - tablas globales
      // Solo permitir toggle de activo (usando tabla de preferencias)
      if (nombre !== undefined || descripcion !== undefined || icono !== undefined || color !== undefined) {
        return res.status(403).json({
          error: 'Los catálogos globales (tipos de propiedad y operación) no se pueden modificar. Solo se puede cambiar el estado activo/inactivo.'
        });
      }

      if (activo === undefined) {
        return res.status(400).json({ error: 'Debe proporcionar el campo activo para actualizar' });
      }

      // Actualizar la preferencia del tenant (UPSERT), NO la tabla global
      await query(
        `INSERT INTO tenant_global_catalogo_preferencias (tenant_id, tabla, item_id, activo, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (tenant_id, tabla, item_id)
         DO UPDATE SET activo = $4, updated_at = NOW()`,
        [tenantId, tabla, id, activo]
      );

      // Devolver el item con el estado actualizado
      result = await query(
        `SELECT g.*, 'global' as origen, $3 as activo
         FROM ${tabla} g
         WHERE g.id = $2`,
        [tenantId, id, activo]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item no encontrado o no se puede modificar' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/catalogos-separados/:tipo/:id
 * Elimina un item de un catálogo separado (solo items del tenant, no globales)
 */
router.delete('/:tipo/:id', async (req, res, next) => {
  try {
    const { tenantId, tipo, id } = req.params as RouteParams;

    const config = TIPOS_CONFIG[tipo];
    if (!config) {
      return res.status(400).json({ error: `Tipo de catálogo no válido: ${tipo}` });
    }

    if (!config.esPorTenant) {
      return res.status(403).json({
        error: 'No se pueden eliminar items de catálogos globales. Estos son administrados por el sistema.'
      });
    }

    const { tabla } = config;

    // Solo se pueden eliminar items del tenant
    const result = await query(
      `DELETE FROM ${tabla} WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Item no encontrado o no se puede eliminar'
      });
    }

    res.json({ success: true, message: 'Item eliminado correctamente' });
  } catch (error) {
    next(error);
  }
});

export default router;
