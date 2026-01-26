/**
 * MÓDULO DE UPLOAD - Rutas para subida y descarga de archivos
 *
 * Este módulo maneja todas las operaciones de subida y descarga de archivos.
 * Incluye: upload de imágenes a R2 (Cloudflare) y proxy de descarga
 * Está aislado para que errores aquí NO afecten otros módulos.
 */

import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { uploadImage, uploadDocument } from '../../services/r2Service.js';

const router = express.Router({ mergeParams: true });

// Tipo para request con tenantId del parent router
interface TenantParams { [key: string]: string | undefined; tenantId: string }

// Configurar multer para subida de imágenes (almacenamiento en memoria para luego procesar y subir a R2)
const uploadImageStorage = multer.memoryStorage();
const uploadImageMiddleware = multer({
  storage: uploadImageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, GIF, WebP).'));
    }
  },
});

// Configurar multer para subida de archivos (imágenes + PDFs)
const uploadFileMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, GIF, WebP) y PDFs.'));
    }
  },
});

/**
 * POST /api/tenants/:tenantId/upload/images
 *
 * Sube múltiples archivos (imágenes o PDFs) a R2 para el tenant especificado
 * Body (multipart/form-data):
 * - images: Archivos a subir (múltiples, max 10)
 * - folder: Carpeta destino (opcional, default: 'general')
 */
router.post('/images', uploadFileMiddleware.array('images', 10), async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { folder = 'general' } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        error: 'No se proporcionaron archivos',
        message: 'Se requieren archivos en el campo "images"',
      });
    }

    const results = [];

    for (const file of files) {
      let result: any;

      // Si es imagen, usar uploadImage para optimización
      if (file.mimetype.startsWith('image/')) {
        result = await uploadImage(file.buffer, file.originalname, {
          tenantId,
          folder,
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 85,
          format: 'webp',
        });
      } else {
        // Si es PDF u otro documento, usar uploadDocument
        result = await uploadDocument(file.buffer, file.originalname, {
          tenantId,
          folder,
        });
      }

      results.push({
        ...result,
        originalName: file.originalname,
        size: file.size,
      });
    }

    res.json({ images: results });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/upload/image
 *
 * Sube una imagen a R2 para el tenant especificado
 * Body (multipart/form-data):
 * - image: Archivo de imagen
 * - folder: Carpeta destino (opcional, default: 'general')
 */
router.post('/image', uploadImageMiddleware.single('image'), async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { folder = 'general' } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        error: 'No se proporcionó ninguna imagen',
        message: 'Se requiere un archivo de imagen en el campo "image"',
      });
    }

    // Subir imagen a R2
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

/**
 * POST /api/tenants/:tenantId/upload/file
 *
 * Sube un archivo (imagen o PDF) a R2 para el tenant especificado
 * Body (multipart/form-data):
 * - file: Archivo (imagen o PDF)
 * - folder: Carpeta destino (opcional, default: 'general')
 */
router.post('/file', uploadFileMiddleware.single('file'), async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { folder = 'general' } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        error: 'No se proporcionó ningún archivo',
        message: 'Se requiere un archivo en el campo "file"',
      });
    }

    let result: any;

    // Si es imagen, usar uploadImage para optimización
    if (file.mimetype.startsWith('image/')) {
      result = await uploadImage(file.buffer, file.originalname, {
        tenantId,
        folder,
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 85,
        format: 'webp',
      });
    } else {
      // Si es PDF u otro documento, usar uploadDocument
      result = await uploadDocument(file.buffer, file.originalname, {
        tenantId,
        folder,
      });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/upload/proxy-image
 *
 * Proxy para obtener imágenes externas (evita CORS para uso en Canvas)
 * Retorna la imagen directamente con headers CORS apropiados
 * Query params:
 * - url: URL de la imagen a obtener (HTTP/HTTPS)
 */
router.get('/proxy-image', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        error: 'URL requerida',
        message: 'Se requiere el parámetro "url" con la URL de la imagen',
      });
    }

    // Validar que la URL sea HTTPS
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return res.status(403).json({
        error: 'Protocolo no permitido',
        message: 'Solo se permiten URLs HTTP/HTTPS',
      });
    }

    // Fetch de la imagen con headers apropiados (CloudFront puede requerir User-Agent)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CLICBot/1.0)',
        'Accept': 'image/*,*/*',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Error al obtener imagen',
        message: `El servidor de archivos respondió con código ${response.status}`,
      });
    }

    // Obtener el content-type
    const contentType = response.headers.get('content-type') || 'image/png';

    // Configurar headers CORS para permitir uso en Canvas
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache de 1 hora

    // Pasar el content-length si está disponible
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Enviar la imagen
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/upload/download
 *
 * Proxy de descarga para archivos en R2
 * Evita problemas de CORS al descargar archivos cross-origin
 * Query params:
 * - url: URL del archivo a descargar (debe ser de R2)
 * - filename: Nombre del archivo para la descarga
 */
router.get('/download', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { url, filename } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        error: 'URL requerida',
        message: 'Se requiere el parámetro "url" con la URL del archivo a descargar',
      });
    }

    // Validar que la URL sea de nuestro bucket R2
    const allowedDomains = [
      'pub-b7a3dee69f6541d3b2ab6a935184789c.r2.dev',
      'r2.cloudflarestorage.com'
    ];

    const urlObj = new URL(url);
    const isAllowedDomain = allowedDomains.some(domain => urlObj.hostname.includes(domain));

    if (!isAllowedDomain) {
      return res.status(403).json({
        error: 'Dominio no permitido',
        message: 'Solo se pueden descargar archivos del almacenamiento autorizado',
      });
    }

    // Fetch del archivo desde R2
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Error al obtener archivo',
        message: `El servidor de archivos respondió con código ${response.status}`,
      });
    }

    // Obtener el content-type del archivo
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // Determinar el nombre del archivo
    const downloadFilename = filename || url.split('/').pop() || 'archivo';

    // Configurar headers para forzar descarga
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(String(downloadFilename))}"`);

    // Pasar el content-length si está disponible
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Streamear el archivo al cliente
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    next(error);
  }
});

export default router;
