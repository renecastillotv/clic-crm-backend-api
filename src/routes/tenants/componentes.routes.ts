/**
 * MÓDULO DE COMPONENTES - Rutas de componentes web del tenant
 *
 * Este módulo maneja los componentes para el website builder.
 * Incluye: páginas, tema, resolve, upload de imágenes.
 */

import express from 'express'
import multer from 'multer';
import {
  getComponentesByTenant,
  getTemaByTenant,
  saveComponente,
  deleteComponente,
  updateTemaByTenant,
} from '../../services/componentesService.js';
import { uploadImage } from '../../services/r2Service.js';
import { getPaginaCompleta } from '../../services/paginasService.js';
import { resolveRoute } from '../../services/routeResolver.js';

// Tipos para params con mergeParams
interface RouteParams { [key: string]: string | undefined;
  tenantId: string;
  componenteId?: string;
  paginaId?: string;
  slug?: string;
  propertyId?: string;
}

const router = express.Router({ mergeParams: true });

// Configurar multer para subida de imágenes
const uploadImageStorage = multer.memoryStorage();
const uploadImageMiddleware = multer({
  storage: uploadImageStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, GIF, WebP).'));
    }
  },
});

// ==================== UPLOAD DE IMÁGENES ====================

/**
 * POST /api/tenants/:tenantId/upload/image
 * Sube una imagen a R2
 */
router.post('/upload/image', uploadImageMiddleware.single('image'), async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const { folder = 'general' } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        error: 'No se proporcionó ninguna imagen',
        message: 'Se requiere un archivo de imagen en el campo "image"',
      });
    }

    const result = await uploadImage(file.buffer, file.originalname, {
      tenantId,
      folder,
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 85,
      format: 'webp',
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ==================== COMPONENTES ====================

/**
 * GET /api/tenants/:tenantSlugOrId/componentes
 * Obtiene componentes del tenant
 */
router.get('/componentes', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const { paginaId, todos } = req.query;

    const soloPredeterminados = todos !== 'true';

    const componentes = await getComponentesByTenant(
      tenantId,
      paginaId as string | undefined,
      soloPredeterminados
    );

    res.json(componentes);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/componentes
 * Crea o actualiza un componente
 */
router.post('/componentes', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const componente = req.body;

    const saved = await saveComponente(tenantId, componente);
    res.json(saved);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/componentes/:componenteId
 * Actualiza un componente
 */
router.put('/componentes/:componenteId', async (req, res, next) => {
  try {
    const { tenantId, componenteId } = req.params as RouteParams;
    const componente = { ...req.body, id: componenteId };

    const saved = await saveComponente(tenantId, componente);
    res.json(saved);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/componentes/:componenteId
 * Elimina un componente
 */
router.delete('/componentes/:componenteId', async (req, res, next) => {
  try {
    const { tenantId, componenteId } = req.params as RouteParams;

    await deleteComponente(tenantId, componenteId);
    res.json({ success: true, message: 'Componente eliminado correctamente' });
  } catch (error) {
    next(error);
  }
});

// ==================== TEMA ====================

/**
 * GET /api/tenants/:tenantId/tema
 * Obtiene el tema del tenant
 */
router.get('/tema', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const tema = await getTemaByTenant(tenantId);
    res.json(tema);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/tema
 * Actualiza el tema del tenant
 */
router.put('/tema', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const { colores } = req.body;

    if (!colores || typeof colores !== 'object') {
      return res.status(400).json({
        error: 'Colores inválidos',
        message: 'Se requiere un objeto con los colores del tema',
      });
    }

    const tema = await updateTemaByTenant(tenantId, colores);
    res.json(tema);
  } catch (error) {
    next(error);
  }
});

// ==================== PÁGINAS ====================

/**
 * GET /api/tenants/:tenantId/paginas
 * Obtiene todas las páginas del tenant
 */
router.get('/paginas', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const { getPaginasByTenant } = await import('../../services/paginasService.js');

    const paginas = await getPaginasByTenant(tenantId);
    res.json(paginas);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/paginas
 * Las páginas son tipos estándar del sistema (tipos_pagina).
 */
router.post('/paginas', async (_req, res, _next) => {
  res.status(400).json({
    error: 'Operación no permitida',
    message: 'Las páginas son tipos estándar del sistema. Para personalizar componentes de una página, use el endpoint de componentes.'
  });
});

/**
 * GET /api/tenants/:tenantId/paginas/:paginaId
 * Obtiene una página específica
 */
router.get('/paginas/:paginaId', async (req, res, next) => {
  try {
    const { tenantId, paginaId } = req.params as RouteParams;
    const { getPaginaById } = await import('../../services/paginasService.js');

    const pagina = await getPaginaById(tenantId, paginaId);

    if (!pagina) {
      return res.status(404).json({
        error: 'Página no encontrada',
        message: 'La página solicitada no existe o no pertenece al tenant',
      });
    }

    res.json(pagina);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/paginas/:paginaId
 * Las páginas son tipos estándar del sistema (tipos_pagina).
 */
router.put('/paginas/:paginaId', async (_req, res, _next) => {
  res.status(400).json({
    error: 'Operación no permitida',
    message: 'Las páginas son tipos estándar del sistema. Para personalizar componentes de una página, use el endpoint de componentes.'
  });
});

/**
 * GET /api/tenants/:tenantId/paginas/slug/:slug
 * Obtiene página por slug
 */
router.get('/paginas/slug/:slug', async (req, res, next) => {
  try {
    const { tenantId, slug } = req.params as RouteParams;
    const { getPaginasByTenant } = await import('../../services/paginasService.js');

    const paginas = await getPaginasByTenant(tenantId);
    const pagina = paginas.find(p => p.slug === slug || (slug === '/' && p.slug === '/'));

    if (!pagina) {
      return res.status(404).json({
        error: 'Página no encontrada',
        message: 'La página solicitada no existe',
      });
    }

    res.json(pagina);
  } catch (error) {
    next(error);
  }
});

// ==================== PÁGINAS COMPLETAS ====================

/**
 * GET /api/tenants/:tenantId/pages/:slug
 * Obtiene página completa con componentes y tema
 */
/**
 * GET /api/tenants/:tenantId/pages/:slug
 * Obtiene página completa con componentes y tema
 * Acepta tanto UUID como slug del tenant
 */
router.get('/pages/:slug', async (req, res, next) => {
  try {
    const { tenantId: tenantSlugOrId, slug } = req.params as RouteParams;

    // Resolver slug a UUID si es necesario
    let tenantUUID = tenantSlugOrId;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantSlugOrId);

    if (!isUUID) {
      // Es un slug, buscar el tenant para obtener su UUID
      const { getTenantBySlug } = await import('../../services/tenantsService.js');
      const tenant = await getTenantBySlug(tenantSlugOrId);
      if (!tenant) {
        return res.status(404).json({
          error: 'Tenant no encontrado',
          message: `No se encontró ningún tenant con slug "${tenantSlugOrId}"`,
        });
      }
      tenantUUID = tenant.id;
    }

    const paginaCompleta = await getPaginaCompleta(tenantUUID, slug);

    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json(paginaCompleta);
  } catch (error) {
    next(error);
  }
});
// ==================== RESOLVE ====================

/**
 * GET /api/tenants/:tenantSlugOrId/resolve
 * Resuelve cualquier URL y devuelve la página completa
 * Acepta tanto UUID como slug del tenant
 */
router.get('/resolve', async (req, res, next) => {
  try {
    const { tenantId: tenantSlugOrId } = req.params as RouteParams;
    const pathname = req.query.pathname as string || '/';
    const normalizedPath = pathname.startsWith('/') ? pathname : '/' + pathname;

    // Resolver slug a UUID si es necesario
    let tenantUUID = tenantSlugOrId;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantSlugOrId);

    if (!isUUID) {
      // Es un slug, buscar el tenant para obtener su UUID
      const { getTenantBySlug } = await import('../../services/tenantsService.js');
      const tenant = await getTenantBySlug(tenantSlugOrId);
      if (!tenant) {
        return res.status(404).json({
          error: 'Tenant no encontrado',
          message: `No se encontró ningún tenant con slug "${tenantSlugOrId}"`,
        });
      }
      tenantUUID = tenant.id;
    }

    const paginaCompleta = await resolveRoute(tenantUUID, normalizedPath);

    if (!paginaCompleta) {
      return res.status(404).json({
        error: 'Página no encontrada',
        message: `No se encontró ninguna página para la ruta "${normalizedPath}"`,
      });
    }

    res.json(paginaCompleta);
  } catch (error) {
    next(error);
  }
});

// ==================== PROPERTIES (Web) ====================

/**
 * GET /api/tenants/:tenantId/properties/:propertyId
 * Obtiene una propiedad individual (para web)
 */
router.get('/properties/:propertyId', async (req, res, next) => {
  try {
    const { tenantId, propertyId } = req.params as RouteParams;
    const { getPropiedadById } = await import('../../services/propertiesService.js');

    const propiedad = await getPropiedadById(tenantId, propertyId);

    if (!propiedad) {
      return res.status(404).json({
        error: 'Propiedad no encontrada',
        message: 'La propiedad solicitada no existe o no pertenece al tenant',
      });
    }

    res.json(propiedad);
  } catch (error) {
    next(error);
  }
});

export default router;
