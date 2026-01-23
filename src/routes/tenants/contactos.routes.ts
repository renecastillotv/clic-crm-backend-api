/**
 * MÓDULO DE CONTACTOS - Rutas CRUD
 *
 * Este módulo maneja todas las operaciones de contactos del CRM.
 * Está aislado para que errores aquí NO afecten otros módulos.
 */

import express, { Request, Response, NextFunction } from 'express';
import {
  getContactos,
  getContactoById,
  createContacto,
  updateContacto,
  deleteContacto,
  toggleContactoFavorito,
  getRelacionesContacto,
  createRelacionContacto,
  deleteRelacionContacto,
} from '../../services/contactosService.js';
import { getActividadesByContacto } from '../../services/actividadesService.js';
import { getOwnFilter } from '../../middleware/scopeResolver.js';
import { query } from '../../utils/db.js';

const router = express.Router({ mergeParams: true });

// Tipo para request con tenantId del parent router
interface TenantParams {
  tenantId: string;
  contactoId?: string;
  relacionId?: string;
  extensionId?: string;
}

/**
 * GET /api/tenants/:tenantId/contactos
 * Obtiene lista de contactos con filtros y paginación
 */
router.get('/', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params as TenantParams;
    const { tipo, favorito, busqueda, usuario_asignado_id, page, limit } = req.query;

    // Apply scope filter: if alcance_ver = 'own', force user's own contacts
    const ownUserId = getOwnFilter(req, 'contactos');

    const filtros = {
      tipo: tipo as string | undefined,
      favorito: favorito === 'true' ? true : favorito === 'false' ? false : undefined,
      busqueda: busqueda as string | undefined,
      usuario_asignado_id: ownUserId || (usuario_asignado_id as string | undefined),
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50,
    };

    const resultado = await getContactos(tenantId, filtros);
    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/contactos/:contactoId
 * Obtiene un contacto específico
 */
router.get('/:contactoId', async (req, res, next) => {
  try {
    const { tenantId, contactoId } = req.params as TenantParams;
    const contacto = await getContactoById(tenantId, contactoId);

    if (!contacto) {
      return res.status(404).json({ error: 'Contacto no encontrado' });
    }

    res.json(contacto);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/contactos
 * Crea un nuevo contacto
 */
router.post('/', async (req, res, next) => {
  try {
    const { tenantId } = req.params as TenantParams;
    const contacto = await createContacto(tenantId, req.body);
    res.status(201).json(contacto);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/contactos/:contactoId
 * Actualiza un contacto existente
 */
router.put('/:contactoId', async (req, res, next) => {
  try {
    const { tenantId, contactoId } = req.params as TenantParams;
    const contacto = await updateContacto(tenantId, contactoId, req.body);

    if (!contacto) {
      return res.status(404).json({ error: 'Contacto no encontrado' });
    }

    res.json(contacto);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/contactos/:contactoId
 * Elimina (desactiva) un contacto
 */
router.delete('/:contactoId', async (req, res, next) => {
  try {
    const { tenantId, contactoId } = req.params as TenantParams;
    const eliminado = await deleteContacto(tenantId, contactoId);

    if (!eliminado) {
      return res.status(404).json({ error: 'Contacto no encontrado' });
    }

    res.json({ success: true, message: 'Contacto eliminado correctamente' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/contactos/:contactoId/favorito
 * Alterna el estado de favorito
 */
router.post('/:contactoId/favorito', async (req, res, next) => {
  try {
    const { tenantId, contactoId } = req.params as TenantParams;
    const contacto = await toggleContactoFavorito(tenantId, contactoId);

    if (!contacto) {
      return res.status(404).json({ error: 'Contacto no encontrado' });
    }

    res.json(contacto);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/contactos/:contactoId/relaciones
 * Obtiene las relaciones de un contacto
 */
router.get('/:contactoId/relaciones', async (req, res, next) => {
  try {
    const { tenantId, contactoId } = req.params as TenantParams;
    const relaciones = await getRelacionesContacto(tenantId, contactoId);
    res.json(relaciones);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/contactos/:contactoId/relaciones
 * Crea una relación entre contactos
 */
router.post('/:contactoId/relaciones', async (req, res, next) => {
  try {
    const { tenantId, contactoId } = req.params as TenantParams;
    const { contacto_destino_id, tipo_relacion, notas } = req.body;

    if (!contacto_destino_id || !tipo_relacion) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere contacto_destino_id y tipo_relacion',
      });
    }

    const relacion = await createRelacionContacto(tenantId, {
      contacto_origen_id: contactoId,
      contacto_destino_id,
      tipo_relacion,
      notas,
    });

    res.status(201).json(relacion);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/contactos/:contactoId/relaciones/:relacionId
 * Elimina una relación entre contactos
 */
router.delete('/:contactoId/relaciones/:relacionId', async (req, res, next) => {
  try {
    const { tenantId, relacionId } = req.params as TenantParams;
    const deleted = await deleteRelacionContacto(tenantId, relacionId);

    if (!deleted) {
      return res.status(404).json({ error: 'Relación no encontrada' });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/contactos/:contactoId/actividades
 * Obtiene actividades de un contacto específico
 */
router.get('/:contactoId/actividades', async (req, res, next) => {
  try {
    const { tenantId, contactoId } = req.params as TenantParams;
    const { limit } = req.query;

    const actividades = await getActividadesByContacto(
      tenantId,
      contactoId,
      limit ? parseInt(limit as string) : 20
    );
    res.json(actividades);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/contactos/:contactoId/extensiones
 * Obtiene las extensiones asignadas a un contacto específico
 */
router.get('/:contactoId/extensiones', async (req, res, next) => {
  try {
    const { tenantId, contactoId } = req.params as TenantParams;

    const result = await query(`
      SELECT
        ce.id,
        ce.extension_id,
        ce.datos,
        ce.activo,
        ce.created_at,
        c.codigo,
        c.nombre,
        c.descripcion,
        c.icono,
        c.color,
        c.campos_schema
      FROM contacto_extensiones ce
      JOIN catalogo_extensiones_contacto c ON c.id = ce.extension_id
      WHERE ce.tenant_id = $1 AND ce.contacto_id = $2 AND ce.activo = true
      ORDER BY c.orden, c.nombre
    `, [tenantId, contactoId]);

    res.json({ extensiones: result.rows });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/contactos/:contactoId/extensiones
 * Asigna una extensión a un contacto
 */
router.post('/:contactoId/extensiones', async (req, res, next) => {
  try {
    const { tenantId, contactoId } = req.params as TenantParams;
    const { extension_id, datos = {} } = req.body;

    if (!extension_id) {
      return res.status(400).json({ error: 'extension_id es requerido' });
    }

    const result = await query(`
      INSERT INTO contacto_extensiones (tenant_id, contacto_id, extension_id, datos)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (contacto_id, extension_id)
      DO UPDATE SET datos = $4, activo = true, updated_at = NOW()
      RETURNING *
    `, [tenantId, contactoId, extension_id, JSON.stringify(datos)]);

    // Obtener datos completos de la extensión
    const extResult = await query(`
      SELECT
        ce.id,
        ce.extension_id,
        ce.datos,
        ce.activo,
        ce.created_at,
        c.codigo,
        c.nombre,
        c.descripcion,
        c.icono,
        c.color,
        c.campos_schema
      FROM contacto_extensiones ce
      JOIN catalogo_extensiones_contacto c ON c.id = ce.extension_id
      WHERE ce.id = $1
    `, [result.rows[0].id]);

    res.status(201).json({ extension: extResult.rows[0] });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/contactos/:contactoId/extensiones/:extensionId
 * Actualiza los datos de una extensión de un contacto
 */
router.put('/:contactoId/extensiones/:extensionId', async (req, res, next) => {
  try {
    const { tenantId, contactoId, extensionId } = req.params as TenantParams;
    const { datos } = req.body;

    const result = await query(`
      UPDATE contacto_extensiones
      SET datos = $1, updated_at = NOW()
      WHERE tenant_id = $2 AND contacto_id = $3 AND extension_id = $4 AND activo = true
      RETURNING *
    `, [JSON.stringify(datos), tenantId, contactoId, extensionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Extensión no encontrada para este contacto' });
    }

    // Obtener datos completos
    const extResult = await query(`
      SELECT
        ce.id,
        ce.extension_id,
        ce.datos,
        ce.activo,
        ce.created_at,
        c.codigo,
        c.nombre,
        c.descripcion,
        c.icono,
        c.color,
        c.campos_schema
      FROM contacto_extensiones ce
      JOIN catalogo_extensiones_contacto c ON c.id = ce.extension_id
      WHERE ce.id = $1
    `, [result.rows[0].id]);

    res.json({ extension: extResult.rows[0] });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/contactos/:contactoId/extensiones/:extensionId
 * Elimina (desactiva) una extensión de un contacto
 */
router.delete('/:contactoId/extensiones/:extensionId', async (req, res, next) => {
  try {
    const { tenantId, contactoId, extensionId } = req.params as TenantParams;

    const result = await query(`
      UPDATE contacto_extensiones
      SET activo = false, updated_at = NOW()
      WHERE tenant_id = $1 AND contacto_id = $2 AND extension_id = $3
      RETURNING id
    `, [tenantId, contactoId, extensionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Extensión no encontrada para este contacto' });
    }

    res.json({ success: true, message: 'Extensión removida del contacto' });
  } catch (error) {
    next(error);
  }
});

export default router;
