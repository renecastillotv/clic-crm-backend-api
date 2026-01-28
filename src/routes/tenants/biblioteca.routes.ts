/**
 * Rutas para la Biblioteca de la Empresa
 *
 * Endpoints:
 * - GET /categorias - Lista de categorías
 * - POST /categorias - Crear categoría
 * - PUT /categorias/:id - Actualizar categoría
 * - DELETE /categorias/:id - Eliminar categoría
 *
 * - GET /documentos - Lista de documentos (con filtros)
 * - GET /documentos/pendientes - Documentos obligatorios sin confirmar
 * - GET /documentos/favoritos - Documentos favoritos del usuario
 * - GET /documentos/:id - Detalle de documento
 * - POST /documentos - Crear documento
 * - PUT /documentos/:id - Actualizar documento
 * - DELETE /documentos/:id - Eliminar documento
 *
 * - POST /documentos/:id/version - Subir nueva versión
 * - GET /documentos/:id/versiones - Historial de versiones
 *
 * - POST /documentos/:id/confirmar - Confirmar lectura
 * - GET /documentos/:id/confirmaciones - Lista de confirmaciones
 *
 * - POST /documentos/:id/favorito - Toggle favorito
 *
 * - POST /seed-categorias - Crear categorías por defecto (admin)
 */

import express, { Request, Response, NextFunction } from 'express';
import { resolveUserScope } from '../../middleware/scopeResolver.js';
import * as bibliotecaService from '../../services/bibliotecaService.js';

const router = express.Router({ mergeParams: true });

interface TenantParams {
  tenantId: string;
}

interface DocumentoParams extends TenantParams {
  id: string;
}

// Apply scope resolution to all routes
router.use(resolveUserScope);

// ==================== CATEGORÍAS ====================

/**
 * GET /categorias
 * Lista todas las categorías activas con conteo de documentos
 */
router.get('/categorias', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const categorias = await bibliotecaService.getCategorias(tenantId);
    res.json(categorias);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /categorias
 * Crea una nueva categoría
 */
router.post('/categorias', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const createdById = req.scope?.dbUserId;
    const categoria = await bibliotecaService.createCategoria(tenantId, req.body, createdById);
    res.status(201).json(categoria);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /categorias/:id
 * Actualiza una categoría
 */
router.put('/categorias/:id', async (req: Request<DocumentoParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, id } = req.params;
    const categoria = await bibliotecaService.updateCategoria(tenantId, id, req.body);
    if (!categoria) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    res.json(categoria);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /categorias/:id
 * Elimina (soft delete) una categoría
 */
router.delete('/categorias/:id', async (req: Request<DocumentoParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, id } = req.params;
    const deleted = await bibliotecaService.deleteCategoria(tenantId, id);
    if (!deleted) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ==================== DOCUMENTOS ====================

/**
 * GET /documentos
 * Lista documentos con filtros y paginación
 */
router.get('/documentos', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const usuarioId = req.scope?.dbUserId;

    if (!usuarioId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const filtros = {
      categoria_id: req.query.categoria_id as string,
      es_obligatorio: req.query.es_obligatorio === 'true' ? true : req.query.es_obligatorio === 'false' ? false : undefined,
      busqueda: req.query.busqueda as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
    };

    const result = await bibliotecaService.getDocumentos(tenantId, usuarioId, filtros);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /documentos/pendientes
 * Documentos obligatorios que el usuario no ha confirmado
 */
router.get('/documentos/pendientes', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const usuarioId = req.scope?.dbUserId;

    if (!usuarioId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const documentos = await bibliotecaService.getDocumentosPendientes(tenantId, usuarioId);
    res.json(documentos);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /documentos/favoritos
 * Documentos marcados como favoritos por el usuario
 */
router.get('/documentos/favoritos', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const usuarioId = req.scope?.dbUserId;

    if (!usuarioId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const documentos = await bibliotecaService.getFavoritos(tenantId, usuarioId);
    res.json(documentos);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /documentos/:id
 * Detalle de un documento
 */
router.get('/documentos/:id', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tenantId, id } = req.params;
    const usuarioId = req.scope?.dbUserId;

    const documento = await bibliotecaService.getDocumentoById(tenantId, id, usuarioId);
    if (!documento) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }
    res.json(documento);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /documentos
 * Crea un nuevo documento
 */
router.post('/documentos', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const createdById = req.scope?.dbUserId;

    const documento = await bibliotecaService.createDocumento(tenantId, req.body, createdById);
    res.status(201).json(documento);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /documentos/:id
 * Actualiza un documento
 */
router.put('/documentos/:id', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tenantId, id } = req.params;
    const updatedById = req.scope?.dbUserId;

    const documento = await bibliotecaService.updateDocumento(tenantId, id, req.body, updatedById);
    if (!documento) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }
    res.json(documento);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /documentos/:id
 * Elimina (soft delete) un documento
 */
router.delete('/documentos/:id', async (req: Request<DocumentoParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, id } = req.params;
    const deleted = await bibliotecaService.deleteDocumento(tenantId, id);
    if (!deleted) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ==================== VERSIONES ====================

/**
 * POST /documentos/:id/version
 * Sube una nueva versión del documento
 */
router.post('/documentos/:id/version', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const createdById = req.scope?.dbUserId;

    const version = await bibliotecaService.createVersion(id, req.body, createdById);
    res.status(201).json(version);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /documentos/:id/versiones
 * Historial de versiones de un documento
 */
router.get('/documentos/:id/versiones', async (req: Request<DocumentoParams>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const versiones = await bibliotecaService.getVersiones(id);
    res.json(versiones);
  } catch (error) {
    next(error);
  }
});

// ==================== CONFIRMACIONES ====================

/**
 * POST /documentos/:id/confirmar
 * Confirma la lectura del documento por el usuario actual
 */
router.post('/documentos/:id/confirmar', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tenantId, id } = req.params;
    const usuarioId = req.scope?.dbUserId;

    if (!usuarioId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Get IP from request
    const ipAddress = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip;

    const confirmacion = await bibliotecaService.confirmarLectura(tenantId, id, usuarioId, ipAddress as string);
    res.json(confirmacion);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /documentos/:id/confirmaciones
 * Lista de confirmaciones de un documento (admin)
 */
router.get('/documentos/:id/confirmaciones', async (req: Request<DocumentoParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, id } = req.params;
    const confirmaciones = await bibliotecaService.getConfirmaciones(tenantId, id);
    res.json(confirmaciones);
  } catch (error) {
    next(error);
  }
});

// ==================== FAVORITOS ====================

/**
 * POST /documentos/:id/favorito
 * Toggle favorito para el usuario actual
 */
router.post('/documentos/:id/favorito', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const usuarioId = req.scope?.dbUserId;

    if (!usuarioId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const esFavorito = await bibliotecaService.toggleFavorito(id, usuarioId);
    res.json({ es_favorito: esFavorito });
  } catch (error) {
    next(error);
  }
});

// ==================== ADMIN ====================

/**
 * POST /seed-categorias
 * Crea las categorías por defecto para el tenant
 */
router.post('/seed-categorias', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const createdById = req.scope?.dbUserId;

    await bibliotecaService.seedDefaultCategorias(tenantId, createdById);
    const categorias = await bibliotecaService.getCategorias(tenantId);
    res.json(categorias);
  } catch (error) {
    next(error);
  }
});

export default router;
