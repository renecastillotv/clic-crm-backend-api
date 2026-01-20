/**
 * MÓDULO DE EXTENSIONES DE CONTACTO - Catálogo de extensiones
 *
 * Este módulo maneja el catálogo de extensiones disponibles para contactos.
 * Las extensiones permiten agregar campos personalizados a los contactos.
 *
 * Tabla: catalogo_extensiones_contacto
 * - Extensiones globales (tenant_id = NULL, es_sistema = true)
 * - Extensiones por tenant (tenant_id = uuid, es_sistema = false)
 *
 * Tabla: tenant_extension_preferencias
 * - Activación/desactivación de extensiones por tenant
 */

import express, { Request, Response, NextFunction } from 'express';
import { query } from '../../utils/db.js';

const router = express.Router({ mergeParams: true });

// Tipo para request con tenantId del parent router
interface TenantParams { tenantId: string }

/**
 * GET /api/tenants/:tenantId/extensiones-contacto
 * Obtiene el catálogo de extensiones disponibles para contactos
 *
 * Retorna extensiones globales + extensiones del tenant
 * Con estado de activación por tenant
 */
router.get('/', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;

    // Obtener extensiones globales (sistema) + extensiones del tenant
    // Con left join a preferencias para saber si están activas para este tenant
    // IMPORTANTE: Usar COALESCE para campos_schema para retornar campos_override si existe
    const result = await query(
      `SELECT
        c.id, c.tenant_id, c.codigo, c.nombre, c.descripcion, c.icono, c.color,
        c.orden, c.es_sistema, c.activo, c.created_at, c.updated_at,
        COALESCE(p.campos_override, c.campos_schema) as campos_schema,
        CASE WHEN c.tenant_id IS NULL THEN 'sistema' ELSE 'custom' END as origen,
        COALESCE(p.activo, c.activo) as activo_tenant
      FROM catalogo_extensiones_contacto c
      LEFT JOIN tenant_extension_preferencias p
        ON p.extension_id = c.id AND p.tenant_id = $1
      WHERE c.tenant_id IS NULL OR c.tenant_id = $1
      ORDER BY c.orden, c.nombre`,
      [tenantId]
    );

    res.json({ items: result.rows, total: result.rows.length });
  } catch (error) {
    console.error('Error en GET /extensiones-contacto:', error);
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/extensiones-contacto/:extensionId
 * Obtiene una extensión específica por ID
 */
router.get('/:extensionId', async (req: Request<TenantParams & { extensionId: string }>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, extensionId } = req.params;

    const result = await query(
      `SELECT
        c.id, c.tenant_id, c.codigo, c.nombre, c.descripcion, c.icono, c.color,
        c.orden, c.es_sistema, c.activo, c.created_at, c.updated_at,
        COALESCE(p.campos_override, c.campos_schema) as campos_schema,
        CASE WHEN c.tenant_id IS NULL THEN 'sistema' ELSE 'custom' END as origen,
        COALESCE(p.activo, c.activo) as activo_tenant
      FROM catalogo_extensiones_contacto c
      LEFT JOIN tenant_extension_preferencias p
        ON p.extension_id = c.id AND p.tenant_id = $1
      WHERE c.id = $2 AND (c.tenant_id IS NULL OR c.tenant_id = $1)`,
      [tenantId, extensionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Extension no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/extensiones-contacto/:extensionId/toggle
 * Activa/desactiva una extensión para el tenant
 */
router.post('/:extensionId/toggle', async (req: Request<TenantParams & { extensionId: string }>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, extensionId } = req.params;
    const { activo } = req.body;

    // Verificar que la extensión existe
    const extResult = await query(
      `SELECT id FROM catalogo_extensiones_contacto WHERE id = $1`,
      [extensionId]
    );

    if (extResult.rows.length === 0) {
      return res.status(404).json({ error: 'Extension no encontrada' });
    }

    // Upsert en tenant_extension_preferencias
    const result = await query(
      `INSERT INTO tenant_extension_preferencias (tenant_id, extension_id, activo)
       VALUES ($1, $2, $3)
       ON CONFLICT (tenant_id, extension_id)
       DO UPDATE SET activo = $3
       RETURNING *`,
      [tenantId, extensionId, activo]
    );

    res.json({ success: true, preferencia: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/extensiones-contacto/:extensionId/campo-opciones
 * Obtiene las opciones de un campo específico de una extensión
 */
router.get('/:extensionId/campo-opciones', async (req: Request<TenantParams & { extensionId: string }>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, extensionId } = req.params;
    const { campo } = req.query;

    // Obtener la extensión
    const extResult = await query(
      `SELECT c.*,
        COALESCE(p.campos_override, c.campos_schema) as campos_efectivos
       FROM catalogo_extensiones_contacto c
       LEFT JOIN tenant_extension_preferencias p ON p.extension_id = c.id AND p.tenant_id = $1
       WHERE c.id = $2 AND (c.tenant_id IS NULL OR c.tenant_id = $1)`,
      [tenantId, extensionId]
    );

    if (extResult.rows.length === 0) {
      return res.status(404).json({ error: 'Extension no encontrada' });
    }

    const extension = extResult.rows[0];
    const camposSchema = extension.campos_efectivos || extension.campos_schema || [];

    // Si se especificó un campo, buscar ese campo específico (por 'campo' o 'nombre')
    if (campo) {
      const campoEncontrado = camposSchema.find((c: any) => c.campo === campo || c.nombre === campo);
      if (!campoEncontrado) {
        return res.status(404).json({ error: `Campo '${campo}' no encontrado en la extension` });
      }
      return res.json({
        campo: campoEncontrado,
        opciones: campoEncontrado.opciones || [],
        opciones_inactivas: campoEncontrado.opciones_inactivas || []
      });
    }

    // Si no se especificó campo, devolver todos los campos
    res.json({ campos: camposSchema });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/extensiones-contacto/:extensionId/campo-opciones
 * Actualiza las opciones de un campo específico de una extensión
 *
 * Body: { campo: string, opciones: string[], opciones_inactivas?: string[] }
 */
router.put('/:extensionId/campo-opciones', async (req: Request<TenantParams & { extensionId: string }>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, extensionId } = req.params;
    const { campo, opciones, opciones_inactivas } = req.body;

    if (!campo) {
      return res.status(400).json({ error: 'Se requiere el nombre del campo' });
    }

    // Obtener la extensión original
    const extResult = await query(
      `SELECT c.*, p.campos_override
       FROM catalogo_extensiones_contacto c
       LEFT JOIN tenant_extension_preferencias p ON p.extension_id = c.id AND p.tenant_id = $1
       WHERE c.id = $2 AND (c.tenant_id IS NULL OR c.tenant_id = $1)`,
      [tenantId, extensionId]
    );

    if (extResult.rows.length === 0) {
      return res.status(404).json({ error: 'Extension no encontrada' });
    }

    const extension = extResult.rows[0];

    // Obtener el schema de campos actual (preferencia del tenant o el original)
    let camposSchema = extension.campos_override || extension.campos_schema || [];

    // Clonar para modificar
    camposSchema = JSON.parse(JSON.stringify(camposSchema));

    // Encontrar y actualizar el campo (buscar por 'campo' o 'nombre' para compatibilidad)
    const campoIndex = camposSchema.findIndex((c: any) => c.campo === campo || c.nombre === campo);
    if (campoIndex === -1) {
      // Si el campo no existe, crearlo
      camposSchema.push({
        campo: campo,
        nombre: campo,
        tipo: 'select',
        opciones: opciones || [],
        opciones_inactivas: opciones_inactivas || []
      });
    } else {
      // Actualizar el campo existente
      camposSchema[campoIndex].opciones = opciones || [];
      if (opciones_inactivas !== undefined) {
        camposSchema[campoIndex].opciones_inactivas = opciones_inactivas;
      }
    }

    // Guardar en tenant_extension_preferencias
    const result = await query(
      `INSERT INTO tenant_extension_preferencias (tenant_id, extension_id, campos_override, activo)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (tenant_id, extension_id)
       DO UPDATE SET campos_override = $3, updated_at = NOW()
       RETURNING *`,
      [tenantId, extensionId, JSON.stringify(camposSchema)]
    );

    res.json({
      success: true,
      campos: camposSchema,
      campo_actualizado: camposSchema.find((c: any) => c.campo === campo || c.nombre === campo)
    });
  } catch (error) {
    console.error('Error en PUT /campo-opciones:', error);
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/extensiones-contacto
 * Crea una nueva extensión personalizada para el tenant
 */
router.post('/', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { codigo, nombre, descripcion, icono, color, campos_schema, orden } = req.body;

    if (!codigo || !nombre) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere codigo y nombre'
      });
    }

    // Verificar que no existe una extensión con el mismo código para este tenant
    const existingResult = await query(
      `SELECT id FROM catalogo_extensiones_contacto
       WHERE codigo = $1 AND (tenant_id = $2 OR tenant_id IS NULL)`,
      [codigo, tenantId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(409).json({
        error: 'Conflicto',
        message: `Ya existe una extension con el codigo "${codigo}"`
      });
    }

    const result = await query(
      `INSERT INTO catalogo_extensiones_contacto
        (tenant_id, codigo, nombre, descripcion, icono, color, campos_schema, orden, es_sistema, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 100), false, true)
       RETURNING *`,
      [tenantId, codigo, nombre, descripcion, icono, color, JSON.stringify(campos_schema || []), orden]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/extensiones-contacto/:extensionId
 * Actualiza una extensión personalizada del tenant
 * Solo permite editar extensiones propias del tenant (no las de sistema)
 */
router.put('/:extensionId', async (req: Request<TenantParams & { extensionId: string }>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, extensionId } = req.params;
    const { nombre, descripcion, icono, color, campos_schema, orden, activo } = req.body;

    // Verificar que la extensión existe y pertenece al tenant (no sistema)
    const extResult = await query(
      `SELECT id, es_sistema, tenant_id FROM catalogo_extensiones_contacto WHERE id = $1`,
      [extensionId]
    );

    if (extResult.rows.length === 0) {
      return res.status(404).json({ error: 'Extension no encontrada' });
    }

    const ext = extResult.rows[0];

    // No permitir editar extensiones de sistema
    if (ext.es_sistema || ext.tenant_id === null) {
      return res.status(403).json({
        error: 'Prohibido',
        message: 'No se pueden editar extensiones de sistema. Use toggle para activar/desactivar.'
      });
    }

    // Verificar que pertenece al tenant
    if (ext.tenant_id !== tenantId) {
      return res.status(403).json({
        error: 'Prohibido',
        message: 'Esta extension no pertenece a su tenant'
      });
    }

    const result = await query(
      `UPDATE catalogo_extensiones_contacto SET
        nombre = COALESCE($2, nombre),
        descripcion = COALESCE($3, descripcion),
        icono = COALESCE($4, icono),
        color = COALESCE($5, color),
        campos_schema = COALESCE($6, campos_schema),
        orden = COALESCE($7, orden),
        activo = COALESCE($8, activo),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
      [extensionId, nombre, descripcion, icono, color, campos_schema ? JSON.stringify(campos_schema) : null, orden, activo]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/extensiones-contacto/:extensionId
 * Elimina una extensión personalizada del tenant
 * Solo permite eliminar extensiones propias del tenant (no las de sistema)
 */
router.delete('/:extensionId', async (req: Request<TenantParams & { extensionId: string }>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, extensionId } = req.params;

    // Verificar que la extensión existe y pertenece al tenant (no sistema)
    const extResult = await query(
      `SELECT id, es_sistema, tenant_id FROM catalogo_extensiones_contacto WHERE id = $1`,
      [extensionId]
    );

    if (extResult.rows.length === 0) {
      return res.status(404).json({ error: 'Extension no encontrada' });
    }

    const ext = extResult.rows[0];

    // No permitir eliminar extensiones de sistema
    if (ext.es_sistema || ext.tenant_id === null) {
      return res.status(403).json({
        error: 'Prohibido',
        message: 'No se pueden eliminar extensiones de sistema'
      });
    }

    // Verificar que pertenece al tenant
    if (ext.tenant_id !== tenantId) {
      return res.status(403).json({
        error: 'Prohibido',
        message: 'Esta extension no pertenece a su tenant'
      });
    }

    // Eliminar
    await query(
      `DELETE FROM catalogo_extensiones_contacto WHERE id = $1`,
      [extensionId]
    );

    res.json({ success: true, message: 'Extension eliminada' });
  } catch (error) {
    next(error);
  }
});

export default router;
