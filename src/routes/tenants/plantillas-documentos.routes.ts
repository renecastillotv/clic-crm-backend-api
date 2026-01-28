/**
 * Rutas para Plantillas de Documentos y Documentos Generados
 *
 * Plantillas (Admin):
 * - GET /plantillas - Lista de plantillas
 * - POST /plantillas - Crear plantilla
 * - GET /plantillas/:id - Detalle de plantilla
 * - PUT /plantillas/:id - Actualizar plantilla
 * - DELETE /plantillas/:id - Eliminar plantilla
 * - POST /plantillas/:id/duplicar - Duplicar plantilla
 * - POST /plantillas/seed - Crear plantillas predeterminadas
 *
 * Documentos Generados:
 * - GET /generados - Lista de documentos generados
 * - POST /generados - Crear documento generado
 * - GET /generados/:id - Detalle de documento
 * - PUT /generados/:id - Actualizar documento
 *
 * DocuSeal (Firma Electrónica):
 * - GET /docuseal/status - Estado de conexión con DocuSeal
 * - POST /generados/:id/enviar-firma - Enviar documento a firma
 * - GET /generados/:id/estado-firma - Consultar estado de firma
 */

import express, { Request, Response, NextFunction } from 'express';
import { resolveUserScope } from '../../middleware/scopeResolver.js';
import * as plantillasService from '../../services/plantillasDocumentosService.js';
import * as renderService from '../../services/documentoRenderService.js';
import * as docusealService from '../../services/docusealService.js';
import { query } from '../../utils/db.js';

const router = express.Router({ mergeParams: true });

interface TenantParams {
  tenantId: string;
}

interface PlantillaParams extends TenantParams {
  id: string;
}

// Apply scope resolution to all routes
router.use(resolveUserScope);

// ==================== PLANTILLAS ====================

/**
 * GET /plantillas
 * Lista de plantillas de documentos
 */
router.get('/plantillas', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const filtros = {
      categoria: req.query.categoria as string,
      activo: req.query.activo === 'true' ? true : req.query.activo === 'false' ? false : undefined,
      es_publica: req.query.es_publica === 'true' ? true : req.query.es_publica === 'false' ? false : undefined,
    };

    const plantillas = await plantillasService.getPlantillas(tenantId, filtros);
    res.json(plantillas);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /plantillas/:id
 * Detalle de una plantilla
 */
router.get('/plantillas/:id', async (req: Request<PlantillaParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, id } = req.params;
    const plantilla = await plantillasService.getPlantillaById(tenantId, id);
    if (!plantilla) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }
    res.json(plantilla);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /plantillas
 * Crear nueva plantilla (Admin only)
 */
router.post('/plantillas', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const createdById = req.scope?.dbUserId;

    // TODO: Add admin check
    // if (!req.scope?.isAdmin) {
    //   return res.status(403).json({ error: 'Solo administradores pueden crear plantillas' });
    // }

    const plantilla = await plantillasService.createPlantilla(tenantId, req.body, createdById);
    res.status(201).json(plantilla);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /plantillas/:id
 * Actualizar plantilla (Admin only)
 */
router.put('/plantillas/:id', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tenantId, id } = req.params;
    const updatedById = req.scope?.dbUserId;

    const plantilla = await plantillasService.updatePlantilla(tenantId, id, req.body, updatedById);
    if (!plantilla) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }
    res.json(plantilla);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /plantillas/:id
 * Eliminar plantilla (soft delete, Admin only)
 */
router.delete('/plantillas/:id', async (req: Request<PlantillaParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, id } = req.params;
    const deleted = await plantillasService.deletePlantilla(tenantId, id);
    if (!deleted) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /plantillas/:id/duplicar
 * Duplicar una plantilla existente
 */
router.post('/plantillas/:id/duplicar', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tenantId, id } = req.params;
    const createdById = req.scope?.dbUserId;

    const plantilla = await plantillasService.duplicarPlantilla(tenantId, id, createdById);
    if (!plantilla) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }
    res.status(201).json(plantilla);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /plantillas/seed
 * Crear plantillas predeterminadas para el tenant
 */
router.post('/plantillas/seed', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const createdById = req.scope?.dbUserId;

    await plantillasService.seedDefaultPlantillas(tenantId, createdById);
    const plantillas = await plantillasService.getPlantillas(tenantId);
    res.json(plantillas);
  } catch (error) {
    next(error);
  }
});

// ==================== GENERACIÓN DE DOCUMENTOS ====================

/**
 * POST /generar
 * Genera un documento desde una plantilla
 */
router.post('/generar', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const usuarioId = req.scope?.dbUserId;

    if (!usuarioId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { plantilla_id, contacto_id, propiedad_id, venta_id, datos_adicionales, nombre_documento } = req.body;

    if (!plantilla_id) {
      return res.status(400).json({ error: 'plantilla_id es requerido' });
    }

    const resultado = await renderService.generarDocumento(tenantId, usuarioId, {
      plantilla_id,
      contacto_id,
      propiedad_id,
      venta_id,
      datos_adicionales,
      nombre_documento,
    });

    res.status(201).json(resultado);
  } catch (error: any) {
    console.error('Error generando documento:', error);
    next(error);
  }
});

/**
 * POST /previsualizar
 * Previsualiza un documento sin guardarlo
 */
router.post('/previsualizar', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const usuarioId = req.scope?.dbUserId;

    if (!usuarioId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { plantilla_id, contacto_id, propiedad_id, datos_adicionales } = req.body;

    if (!plantilla_id) {
      return res.status(400).json({ error: 'plantilla_id es requerido' });
    }

    const resultado = await renderService.previsualizarDocumento(tenantId, usuarioId, {
      plantilla_id,
      contacto_id,
      propiedad_id,
      datos_adicionales,
    });

    res.json(resultado);
  } catch (error: any) {
    console.error('Error previsualizando documento:', error);
    next(error);
  }
});

/**
 * GET /plantillas/:id/variables
 * Obtiene las variables de una plantilla
 */
router.get('/plantillas/:id/variables', async (req: Request<PlantillaParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, id } = req.params;

    const plantilla = await plantillasService.getPlantillaById(tenantId, id);
    if (!plantilla) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    const variables = renderService.extraerVariables(plantilla.contenido_html);

    res.json({
      variables,
      campos_requeridos: plantilla.campos_requeridos,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== DOCUMENTOS UNIFICADOS ====================

/**
 * GET /unificados
 * Lista unificada de documentos del usuario (generados + biblioteca empresa)
 */
router.get('/unificados', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const usuarioId = req.scope?.dbUserId;

    const tipo = req.query.tipo as string; // 'generado' | 'empresa' | undefined
    const estado = req.query.estado as string;
    const pendientes = req.query.pendientes === 'true';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const documentos: any[] = [];
    let totalGenerados = 0;
    let totalEmpresa = 0;

    // Obtener documentos generados del usuario
    if (!tipo || tipo === 'generado') {
      let whereGenerados = 'dg.tenant_id = $1 AND dg.usuario_id = $2';
      const paramsGenerados: any[] = [tenantId, usuarioId];
      let paramIdx = 3;

      if (estado) {
        whereGenerados += ` AND dg.estado = $${paramIdx}`;
        paramsGenerados.push(estado);
        paramIdx++;
      }

      const countGenRes = await query(
        `SELECT COUNT(*) FROM documentos_generados dg WHERE ${whereGenerados}`,
        paramsGenerados
      );
      totalGenerados = parseInt(countGenRes.rows[0].count);

      const genRes = await query(`
        SELECT
          dg.id,
          'generado' as tipo,
          dg.nombre,
          dg.estado,
          dg.url_documento,
          dg.fecha_generacion as fecha,
          dg.created_at,
          pd.nombre as plantilla_nombre,
          pd.categoria as plantilla_categoria,
          c.nombre as contacto_nombre,
          p.titulo as propiedad_titulo
        FROM documentos_generados dg
        LEFT JOIN plantillas_documentos pd ON dg.plantilla_id = pd.id
        LEFT JOIN contactos c ON dg.contacto_id = c.id
        LEFT JOIN propiedades p ON dg.propiedad_id = p.id
        WHERE ${whereGenerados}
        ORDER BY dg.created_at DESC
      `, paramsGenerados);

      documentos.push(...genRes.rows.map(r => ({
        ...r,
        tipo: 'generado'
      })));
    }

    // Obtener documentos de empresa (biblioteca)
    if (!tipo || tipo === 'empresa') {
      let whereEmpresa = 'bd.tenant_id = $1 AND bd.activo = true';
      const paramsEmpresa: any[] = [tenantId];
      let paramIdx = 2;

      if (pendientes) {
        // Solo documentos obligatorios sin confirmar
        whereEmpresa += ` AND bd.es_obligatorio = true
          AND NOT EXISTS (
            SELECT 1 FROM biblioteca_confirmaciones bc
            WHERE bc.documento_id = bd.id
            AND bc.usuario_id = $${paramIdx}
            AND bc.version_confirmada = bd.version
          )`;
        paramsEmpresa.push(usuarioId);
        paramIdx++;
      }

      const countEmpRes = await query(
        `SELECT COUNT(*) FROM biblioteca_documentos bd WHERE ${whereEmpresa}`,
        paramsEmpresa
      );
      totalEmpresa = parseInt(countEmpRes.rows[0].count);

      const empRes = await query(`
        SELECT
          bd.id,
          'empresa' as tipo,
          bd.titulo as nombre,
          CASE WHEN bd.es_obligatorio THEN 'obligatorio' ELSE 'disponible' END as estado,
          bd.url_documento,
          bd.created_at as fecha,
          bd.es_obligatorio,
          bd.tipo_archivo,
          bc.nombre as categoria_nombre,
          bc.color as categoria_color,
          EXISTS (
            SELECT 1 FROM biblioteca_confirmaciones conf
            WHERE conf.documento_id = bd.id
            AND conf.usuario_id = $${paramIdx}
            AND conf.version_confirmada = bd.version
          ) as confirmado,
          EXISTS (
            SELECT 1 FROM biblioteca_favoritos bf
            WHERE bf.documento_id = bd.id
            AND bf.usuario_id = $${paramIdx}
          ) as es_favorito
        FROM biblioteca_documentos bd
        LEFT JOIN biblioteca_categorias bc ON bd.categoria_id = bc.id
        WHERE ${whereEmpresa}
        ORDER BY bd.es_obligatorio DESC, bd.created_at DESC
      `, [...paramsEmpresa, usuarioId, usuarioId]);

      documentos.push(...empRes.rows.map(r => ({
        ...r,
        tipo: 'empresa'
      })));
    }

    // Ordenar combinados por fecha
    documentos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    // Paginar resultado combinado
    const paginatedDocs = documentos.slice(offset, offset + limit);
    const total = totalGenerados + totalEmpresa;

    res.json({
      data: paginatedDocs,
      total,
      totalGenerados,
      totalEmpresa,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    next(error);
  }
});

// ==================== DOCUMENTOS GENERADOS ====================

/**
 * GET /generados
 * Lista de documentos generados
 */
router.get('/generados', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const usuarioId = req.scope?.dbUserId;

    const filtros = {
      estado: req.query.estado as string,
      plantilla_id: req.query.plantilla_id as string,
      contacto_id: req.query.contacto_id as string,
      propiedad_id: req.query.propiedad_id as string,
      usuario_id: req.query.mis_documentos === 'true' ? usuarioId : (req.query.usuario_id as string),
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
    };

    const result = await plantillasService.getDocumentosGenerados(tenantId, filtros);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /generados/:id
 * Detalle de un documento generado
 */
router.get('/generados/:id', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tenantId, id } = req.params;
    const documento = await plantillasService.getDocumentoGeneradoById(tenantId, id);
    if (!documento) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }
    res.json(documento);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /generados
 * Crear documento generado
 */
router.post('/generados', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const usuarioId = req.scope?.dbUserId;

    const documento = await plantillasService.createDocumentoGenerado(tenantId, req.body, usuarioId);
    res.status(201).json(documento);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /generados/:id
 * Actualizar documento generado
 */
router.put('/generados/:id', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tenantId, id } = req.params;

    const documento = await plantillasService.updateDocumentoGenerado(tenantId, id, req.body);
    if (!documento) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }
    res.json(documento);
  } catch (error) {
    next(error);
  }
});

// ==================== DOCUSEAL - FIRMA ELECTRÓNICA ====================

/**
 * GET /docuseal/status
 * Verifica la conexión con DocuSeal
 */
router.get('/docuseal/status', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const status = await docusealService.verificarConexion();
    res.json(status);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /generados/:id/enviar-firma
 * Envía un documento generado para firma electrónica
 */
router.post('/generados/:id/enviar-firma', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tenantId, id } = req.params;
    const { firmantes, mensaje, enviar_email } = req.body;

    if (!firmantes || !Array.isArray(firmantes) || firmantes.length === 0) {
      return res.status(400).json({ error: 'Se requiere al menos un firmante' });
    }

    // Validar que cada firmante tenga nombre y email
    for (const f of firmantes) {
      if (!f.nombre || !f.email) {
        return res.status(400).json({ error: 'Cada firmante debe tener nombre y email' });
      }
    }

    const resultado = await docusealService.enviarDocumentoAFirma(tenantId, {
      documento_generado_id: id,
      firmantes,
      mensaje,
      enviar_email,
    });

    res.json(resultado);
  } catch (error: any) {
    console.error('Error enviando documento a firma:', error);
    next(error);
  }
});

/**
 * GET /generados/:id/estado-firma
 * Consulta el estado de firma de un documento
 */
router.get('/generados/:id/estado-firma', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tenantId, id } = req.params;

    const estado = await docusealService.consultarEstadoFirma(tenantId, id);
    res.json(estado);
  } catch (error: any) {
    console.error('Error consultando estado de firma:', error);
    next(error);
  }
});

export default router;
