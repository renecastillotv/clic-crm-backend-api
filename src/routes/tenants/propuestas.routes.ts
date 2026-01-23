/**
 * MÓDULO DE PROPUESTAS - Rutas CRUD
 *
 * Este módulo maneja todas las operaciones de propuestas del CRM.
 * Está aislado para que errores aquí NO afecten otros módulos.
 */

import express from 'express'
import {
  getPropuestas,
  getPropuestaById,
  createPropuesta,
  updatePropuesta,
  deletePropuesta,
  cambiarEstadoPropuesta,
  regenerarUrlPublica,
  getPropiedadesDePropuesta,
  sincronizarPropiedadesPropuesta,
  agregarPropiedadAPropuesta,
  eliminarPropiedadDePropuesta,
} from '../../services/propuestasService.js';
import { requireAuth } from '../../middleware/clerkAuth.js';
import { getUsuarioByClerkId } from '../../services/usuariosService.js';
import { getOwnFilter } from '../../middleware/scopeResolver.js';

// Tipos para params con mergeParams
interface RouteParams { [key: string]: string | undefined;
  tenantId: string;
  propuestaId?: string;
  propiedadId?: string;
}

const router = express.Router({ mergeParams: true });

/**
 * GET /api/tenants/:tenantId/propuestas
 * Obtiene lista de propuestas con filtros y paginación
 */
router.get('/', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const { estado, estados, solicitud_id, contacto_id, usuario_creador_id, busqueda, page, limit } = req.query;

    // Apply scope filter: if alcance_ver = 'own', force user's own proposals
    const ownUserId = getOwnFilter(req, 'propuestas');

    const filtros = {
      estado: estado as string | undefined,
      estados: estados ? (estados as string).split(',') : undefined,
      solicitud_id: solicitud_id as string | undefined,
      contacto_id: contacto_id as string | undefined,
      usuario_creador_id: ownUserId || (usuario_creador_id as string | undefined),
      busqueda: busqueda as string | undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50,
    };

    const resultado = await getPropuestas(tenantId, filtros);
    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/propuestas/:propuestaId
 * Obtiene una propuesta específica
 */
router.get('/:propuestaId', async (req, res, next) => {
  try {
    const { tenantId, propuestaId } = req.params as RouteParams;
    const propuesta = await getPropuestaById(tenantId, propuestaId);

    if (!propuesta) {
      return res.status(404).json({ error: 'Propuesta no encontrada' });
    }

    res.json(propuesta);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/propuestas
 * Crea una nueva propuesta
 */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const clerkUserId = req.auth?.userId;

    // Obtener el usuario_creador_id desde Clerk
    let usuarioCreadorId: string | null = null;
    if (clerkUserId) {
      const usuario = await getUsuarioByClerkId(clerkUserId);
      if (usuario) {
        usuarioCreadorId = usuario.id;
      }
    }

    // Agregar usuario_creador_id al body si no viene definido
    const dataConUsuario = {
      ...req.body,
      usuario_creador_id: req.body.usuario_creador_id || usuarioCreadorId,
    };

    const propuesta = await createPropuesta(tenantId, dataConUsuario);
    res.status(201).json(propuesta);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/propuestas/:propuestaId
 * Actualiza una propuesta existente
 */
router.put('/:propuestaId', requireAuth, async (req, res, next) => {
  try {
    const { tenantId, propuestaId } = req.params as RouteParams;
    const clerkUserId = req.auth?.userId;

    // Obtener el usuario_creador_id desde Clerk si no viene en el body
    let usuarioCreadorId: string | null = null;
    if (clerkUserId) {
      const usuario = await getUsuarioByClerkId(clerkUserId);
      if (usuario) {
        usuarioCreadorId = usuario.id;
      }
    }

    // Agregar usuario_creador_id al body si no viene definido
    const dataConUsuario = {
      ...req.body,
      usuario_creador_id: req.body.usuario_creador_id || usuarioCreadorId,
    };

    const propuesta = await updatePropuesta(tenantId, propuestaId, dataConUsuario);

    if (!propuesta) {
      return res.status(404).json({ error: 'Propuesta no encontrada' });
    }

    res.json(propuesta);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/propuestas/:propuestaId
 * Elimina (desactiva) una propuesta
 */
router.delete('/:propuestaId', async (req, res, next) => {
  try {
    const { tenantId, propuestaId } = req.params as RouteParams;
    const eliminado = await deletePropuesta(tenantId, propuestaId);

    if (!eliminado) {
      return res.status(404).json({ error: 'Propuesta no encontrada' });
    }

    res.json({ success: true, message: 'Propuesta eliminada correctamente' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/propuestas/:propuestaId/estado
 * Cambia el estado de una propuesta
 */
router.post('/:propuestaId/estado', async (req, res, next) => {
  try {
    const { tenantId, propuestaId } = req.params as RouteParams;
    const { estado } = req.body;

    if (!estado) {
      return res.status(400).json({ error: 'El estado es requerido' });
    }

    const propuesta = await cambiarEstadoPropuesta(tenantId, propuestaId, estado);

    if (!propuesta) {
      return res.status(404).json({ error: 'Propuesta no encontrada' });
    }

    res.json(propuesta);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/propuestas/:propuestaId/regenerar-url
 * Regenera la URL pública de una propuesta
 */
router.post('/:propuestaId/regenerar-url', async (req, res, next) => {
  try {
    const { tenantId, propuestaId } = req.params as RouteParams;
    const propuesta = await regenerarUrlPublica(tenantId, propuestaId);

    if (!propuesta) {
      return res.status(404).json({ error: 'Propuesta no encontrada' });
    }

    res.json(propuesta);
  } catch (error) {
    next(error);
  }
});

// =====================================================
// RUTAS PARA GESTIONAR PROPIEDADES DE UNA PROPUESTA
// =====================================================

/**
 * GET /api/tenants/:tenantId/propuestas/:propuestaId/propiedades
 * Obtiene las propiedades de una propuesta
 */
router.get('/:propuestaId/propiedades', async (req, res, next) => {
  try {
    const { propuestaId } = req.params as RouteParams;
    const propiedades = await getPropiedadesDePropuesta(propuestaId);
    res.json(propiedades);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/propuestas/:propuestaId/propiedades
 * Sincroniza (reemplaza) todas las propiedades de una propuesta
 * Body: { propiedad_ids: string[] }
 */
router.put('/:propuestaId/propiedades', async (req, res, next) => {
  try {
    const { propuestaId } = req.params as RouteParams;
    const { propiedad_ids } = req.body;

    if (!Array.isArray(propiedad_ids)) {
      return res.status(400).json({ error: 'propiedad_ids debe ser un array' });
    }

    const propiedades = await sincronizarPropiedadesPropuesta(propuestaId, propiedad_ids);
    res.json(propiedades);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/propuestas/:propuestaId/propiedades
 * Agrega una propiedad a una propuesta
 * Body: { propiedad_id: string, notas?: string, precio_especial?: number }
 */
router.post('/:propuestaId/propiedades', async (req, res, next) => {
  try {
    const { propuestaId } = req.params as RouteParams;
    const { propiedad_id, notas, precio_especial } = req.body;

    if (!propiedad_id) {
      return res.status(400).json({ error: 'propiedad_id es requerido' });
    }

    const propiedades = await agregarPropiedadAPropuesta(
      propuestaId,
      propiedad_id,
      notas,
      precio_especial
    );
    res.json(propiedades);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/propuestas/:propuestaId/propiedades/:propiedadId
 * Elimina una propiedad de una propuesta
 */
router.delete('/:propuestaId/propiedades/:propiedadId', async (req, res, next) => {
  try {
    const { propuestaId, propiedadId } = req.params as RouteParams;
    const propiedades = await eliminarPropiedadDePropuesta(propuestaId, propiedadId);
    res.json(propiedades);
  } catch (error) {
    next(error);
  }
});

export default router;
