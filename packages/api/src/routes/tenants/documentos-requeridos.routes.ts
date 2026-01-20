/**
 * RUTAS DE DOCUMENTOS REQUERIDOS
 *
 * CRUD para gestionar los documentos requeridos del tenant.
 * Usado en Finanzas > Configuración > Expediente
 */

import express, { Request, Response, NextFunction, Router } from 'express';

const router: Router = express.Router({ mergeParams: true });

interface TenantParams { tenantId: string }
interface DocumentoParams extends TenantParams { documentoId: string }

/**
 * GET /api/tenants/:tenantId/documentos-requeridos
 * Obtiene todos los documentos requeridos del tenant
 */
router.get('/', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { categoria } = req.query;

    const { getDocumentosRequeridos } = await import('../../services/expedienteService.js');
    const documentos = await getDocumentosRequeridos(tenantId, categoria as any);
    res.json(documentos);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/documentos-requeridos
 * Crear nuevo documento requerido
 */
router.post('/', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { createDocumentoRequerido } = await import('../../services/expedienteService.js');

    const documento = await createDocumentoRequerido(tenantId, req.body);
    res.status(201).json(documento);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/documentos-requeridos/reordenar
 * Reordenar documentos requeridos
 */
router.post('/reordenar', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Se requiere un array de items' });
    }

    const { reordenarDocumentosRequeridos } = await import('../../services/expedienteService.js');
    await reordenarDocumentosRequeridos(tenantId, items);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/documentos-requeridos/:documentoId
 * Actualizar documento requerido
 */
router.put('/:documentoId', async (req: Request<DocumentoParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, documentoId } = req.params;
    const { updateDocumentoRequerido } = await import('../../services/expedienteService.js');

    const documento = await updateDocumentoRequerido(tenantId, documentoId, req.body);

    if (!documento) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    res.json(documento);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/documentos-requeridos/:documentoId
 * Eliminar documento requerido (soft delete)
 */
router.delete('/:documentoId', async (req: Request<DocumentoParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, documentoId } = req.params;
    const { deleteDocumentoRequerido } = await import('../../services/expedienteService.js');

    const deleted = await deleteDocumentoRequerido(tenantId, documentoId);

    if (!deleted) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
