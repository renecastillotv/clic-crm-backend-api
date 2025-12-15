import express from 'express';
import multer from 'multer';
import {
  getComponentesByTenant,
  getTemaByTenant,
  saveComponente,
  deleteComponente,
  updateTemaByTenant,
} from '../services/componentesService.js';
import { uploadImage } from '../services/r2Service.js';
import { getPaginaCompleta } from '../services/paginasService.js';
import { resolveRoute } from '../services/routeResolver.js';
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
} from '../services/contactosService.js';
import {
  getSolicitudes,
  getSolicitudById,
  createSolicitud,
  updateSolicitud,
  deleteSolicitud,
  cambiarEtapaSolicitud,
} from '../services/solicitudesService.js';
import {
  getPropuestas,
  getPropuestaById,
  createPropuesta,
  updatePropuesta,
  deletePropuesta,
  cambiarEstadoPropuesta,
  regenerarUrlPublica,
} from '../services/propuestasService.js';
import {
  getActividades,
  getActividadById,
  createActividad,
  updateActividad,
  deleteActividad,
  completarActividad,
  cambiarEstadoActividad,
  getActividadesByContacto,
  getActividadesBySolicitud,
  getActividadesPendientes,
  getActividadesStats,
} from '../services/actividadesService.js';
import {
  getPropiedades,
  getPropiedadById,
  createPropiedad,
  updatePropiedad,
  deletePropiedad,
  getPropiedadesStats,
} from '../services/propiedadesCrmService.js';
import {
  getMetas,
  getMetaById,
  createMeta,
  updateMeta,
  deleteMeta,
  actualizarProgresoMeta,
  getMetasResumen,
} from '../services/metasService.js';
import dynamicDataRouter from './dynamic-data.js';
import {
  getUsuariosByTenant,
  getUsuarioTenantById,
  agregarUsuarioATenant,
  actualizarUsuarioTenant,
  eliminarUsuarioDeTenant,
  getRolesByTenant,
  getRolTenantById,
  createRolTenant,
  updateRolTenant,
  deleteRolTenant,
} from '../services/usuariosService.js';
import { getTasasCambio, updateTasasCambio } from '../services/tasasCambioService.js';
import { query } from '../utils/db.js';

const router = express.Router();

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

/**
 * POST /api/tenants/:tenantId/upload/image
 *
 * Sube una imagen a R2 para el tenant especificado
 * Body (multipart/form-data):
 * - image: Archivo de imagen
 * - folder: Carpeta destino (opcional, default: 'general')
 */
router.post('/:tenantId/upload/image', uploadImageMiddleware.single('image'), async (req, res) => {
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

    console.log(`📤 POST /upload/image - tenantId: ${tenantId}, folder: ${folder}, file: ${file.originalname}`);

    // Subir imagen a R2
    const result = await uploadImage(file.buffer, file.originalname, {
      tenantId,
      folder,
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 85,
      format: 'webp',
    });

    console.log(`✅ Imagen subida correctamente: ${result.url}`);

    res.json(result);
  } catch (error: any) {
    console.error('❌ Error en POST /upload/image:', error);
    res.status(500).json({
      error: 'Error al subir imagen',
      message: error.message,
    });
  }
});

/**
 * GET /api/tenants/:tenantId/componentes
 * 
 * Obtiene todos los componentes activos de un tenant, ordenados y listos para renderizar.
 * Los componentes vienen con toda su configuración y datos listos.
 * 
 * Query params:
 * - paginaId (opcional): Filtrar componentes por página específica
 * - todos (opcional): Si es 'true', devuelve todos los componentes (para CRM)
 *                     Si es 'false' o no se especifica, solo devuelve los predeterminados (para frontend)
 */
router.get('/:tenantSlugOrId/componentes', async (req, res) => {
  try {
    const { tenantSlugOrId } = req.params;
    const { paginaId, todos } = req.query;
    
    // Obtener tenant por slug o ID (auto-detecta)
    const { getTenantByIdOrSlug } = await import('../services/tenantsService.js');
    const tenant = await getTenantByIdOrSlug(tenantSlugOrId);
    
    if (!tenant) {
      return res.status(404).json({ 
        error: 'Tenant no encontrado',
        message: `No se encontró un tenant con slug/ID: "${tenantSlugOrId}"` 
      });
    }
    
    const tenantId = tenant.id;
    
    // Si se solicita 'todos', devolver todos los componentes (para CRM)
    // Si no, solo devolver los predeterminados (para frontend web)
    const soloPredeterminados = todos !== 'true';
    
    console.log(`📥 GET /componentes - tenantSlugOrId: ${tenantSlugOrId} (ID: ${tenantId}), paginaId: ${paginaId}, todos: ${todos}, soloPredeterminados: ${soloPredeterminados}`);
    console.log(`📥 Query params recibidos:`, req.query);
    
    const componentes = await getComponentesByTenant(
      tenantId,
      paginaId as string | undefined,
      soloPredeterminados
    );

    console.log(`✅ Devolviendo ${componentes.length} componentes`);
    if (componentes.length === 0) {
      console.log(`⚠️ ADVERTENCIA: Se devolvieron 0 componentes. Verifica los logs anteriores.`);
    }
    res.json(componentes);
  } catch (error: any) {
    console.error('❌ Error en GET /componentes:', error);
    res.status(500).json({ 
      error: 'Error al obtener componentes',
      message: error.message 
    });
  }
});

/**
 * GET /api/tenants/:tenantId/tema
 * 
 * Obtiene el tema (colores) de un tenant.
 * Si no existe, retorna el tema por defecto.
 */
router.get('/:tenantId/tema', async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    const tema = await getTemaByTenant(tenantId);

    res.json(tema);
  } catch (error: any) {
    console.error('Error en GET /tema:', error);
    res.status(500).json({ 
      error: 'Error al obtener tema',
      message: error.message 
    });
  }
});

/**
 * POST /api/tenants/:tenantId/componentes
 * 
 * Crea o actualiza un componente
 */
router.post('/:tenantId/componentes', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const componente = req.body;
    
    console.log(`💾 POST /componentes - tenantId: ${tenantId}`, componente);
    
    const saved = await saveComponente(tenantId, componente);

    console.log(`✅ Componente guardado:`, saved);
    res.json(saved);
  } catch (error: any) {
    console.error('❌ Error en POST /componentes:', error);
    res.status(500).json({ 
      error: 'Error al guardar componente',
      message: error.message 
    });
  }
});

/**
 * PUT /api/tenants/:tenantId/componentes/:componenteId
 * 
 * Actualiza un componente existente
 */
router.put('/:tenantId/componentes/:componenteId', async (req, res) => {
  try {
    const { tenantId, componenteId } = req.params;
    const componente = { ...req.body, id: componenteId };
    
    console.log(`🔄 PUT /componentes - tenantId: ${tenantId}, componenteId: ${componenteId}`, componente);
    
    const saved = await saveComponente(tenantId, componente);

    console.log(`✅ Componente actualizado:`, saved);
    res.json(saved);
  } catch (error: any) {
    console.error('❌ Error en PUT /componentes:', error);
    res.status(500).json({ 
      error: 'Error al actualizar componente',
      message: error.message 
    });
  }
});

/**
 * DELETE /api/tenants/:tenantId/componentes/:componenteId
 * 
 * Elimina un componente
 */
router.delete('/:tenantId/componentes/:componenteId', async (req, res) => {
  try {
    const { tenantId, componenteId } = req.params;
    
    await deleteComponente(tenantId, componenteId);

    res.json({ success: true, message: 'Componente eliminado correctamente' });
  } catch (error: any) {
    console.error('Error en DELETE /componentes:', error);
    res.status(500).json({ 
      error: 'Error al eliminar componente',
      message: error.message 
    });
  }
});

/**
 * PUT /api/tenants/:tenantId/tema
 * 
 * Actualiza el tema (colores) de un tenant
 */
router.put('/:tenantId/tema', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { colores } = req.body;
    
    if (!colores || typeof colores !== 'object') {
      return res.status(400).json({ 
        error: 'Colores inválidos',
        message: 'Se requiere un objeto con los colores del tema' 
      });
    }
    
    const tema = await updateTemaByTenant(tenantId, colores);

    res.json(tema);
  } catch (error: any) {
    console.error('Error en PUT /tema:', error);
    res.status(500).json({ 
      error: 'Error al actualizar tema',
      message: error.message 
    });
  }
});

/**
 * GET /api/tenants/:tenantId/paginas
 * 
 * Obtiene todas las páginas de un tenant
 */
router.get('/:tenantId/paginas', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { getPaginasByTenant } = await import('../services/paginasService.js');
    
    const paginas = await getPaginasByTenant(tenantId);
    res.json(paginas);
  } catch (error: any) {
    console.error('Error en GET /paginas:', error);
    res.status(500).json({ 
      error: 'Error al obtener páginas',
      message: error.message 
    });
  }
});

/**
 * POST /api/tenants/:tenantId/paginas
 * 
 * Crea una nueva página
 */
router.post('/:tenantId/paginas', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const pagina = req.body;
    const { savePagina } = await import('../services/paginasService.js');
    
    console.log(`💾 POST /paginas - tenantId: ${tenantId}`, pagina);
    
    const saved = await savePagina(tenantId, pagina);
    
    console.log(`✅ Página creada:`, saved);
    res.json(saved);
  } catch (error: any) {
    console.error('❌ Error en POST /paginas:', error);
    res.status(500).json({ 
      error: 'Error al crear página',
      message: error.message 
    });
  }
});

/**
 * PUT /api/tenants/:tenantId/paginas/:paginaId
 * 
 * Actualiza una página existente
 */
router.put('/:tenantId/paginas/:paginaId', async (req, res) => {
  try {
    const { tenantId, paginaId } = req.params;
    const pagina = { ...req.body, id: paginaId };
    const { savePagina } = await import('../services/paginasService.js');
    
    console.log(`🔄 PUT /paginas - tenantId: ${tenantId}, paginaId: ${paginaId}`, pagina);
    
    const saved = await savePagina(tenantId, pagina);
    
    console.log(`✅ Página actualizada:`, saved);
    res.json(saved);
  } catch (error: any) {
    console.error('❌ Error en PUT /paginas:', error);
    res.status(500).json({ 
      error: 'Error al actualizar página',
      message: error.message 
    });
  }
});

/**
 * GET /api/tenants/:tenantId/paginas/:paginaId
 * 
 * Obtiene una página específica por ID
 */
router.get('/:tenantId/paginas/:paginaId', async (req, res) => {
  try {
    const { tenantId, paginaId } = req.params;
    const { getPaginaById } = await import('../services/paginasService.js');
    
    const pagina = await getPaginaById(tenantId, paginaId);
    
    if (!pagina) {
      return res.status(404).json({ 
        error: 'Página no encontrada',
        message: 'La página solicitada no existe o no pertenece al tenant' 
      });
    }
    
    res.json(pagina);
  } catch (error: any) {
    console.error('Error en GET /paginas/:paginaId:', error);
    res.status(500).json({ 
      error: 'Error al obtener página',
      message: error.message 
    });
  }
});

/**
 * PUT /api/tenants/:tenantId/paginas/:paginaId
 * 
 * Actualiza una página existente
 */
router.put('/:tenantId/paginas/:paginaId', async (req, res) => {
  try {
    const { tenantId, paginaId } = req.params;
    const pagina = { ...req.body, id: paginaId };
    const { savePagina } = await import('../services/paginasService.js');
    
    console.log(`🔄 PUT /paginas - tenantId: ${tenantId}, paginaId: ${paginaId}`, pagina);
    
    const saved = await savePagina(tenantId, pagina);
    
    console.log(`✅ Página actualizada:`, saved);
    res.json(saved);
  } catch (error: any) {
    console.error('❌ Error en PUT /paginas:', error);
    res.status(500).json({ 
      error: 'Error al actualizar página',
      message: error.message 
    });
  }
});

// Obtener página por slug (para el frontend web)
router.get('/:tenantId/paginas/slug/:slug', async (req, res) => {
  try {
    const { tenantId, slug } = req.params;
    const { getPaginasByTenant } = await import('../services/paginasService.js');
    
    const paginas = await getPaginasByTenant(tenantId);
    const pagina = paginas.find(p => p.slug === slug || (slug === '/' && p.slug === '/'));
    
    if (!pagina) {
      return res.status(404).json({ 
        error: 'Página no encontrada',
        message: 'La página solicitada no existe' 
      });
    }
    
    res.json(pagina);
  } catch (error: any) {
    console.error('Error en GET /paginas/slug/:slug:', error);
    res.status(500).json({ 
      error: 'Error al obtener página',
      message: error.message 
    });
  }
});

/**
 * GET /api/tenants/:tenantId/properties/:propertyId
 * 
 * Obtiene una propiedad individual por ID
 */
router.get('/:tenantId/properties/:propertyId', async (req, res) => {
  try {
    const { tenantId, propertyId } = req.params;
    const { getPropiedadById } = await import('../services/propertiesService.js');
    
    const propiedad = await getPropiedadById(tenantId, propertyId);
    
    if (!propiedad) {
      return res.status(404).json({ 
        error: 'Propiedad no encontrada',
        message: 'La propiedad solicitada no existe o no pertenece al tenant' 
      });
    }
    
    res.json(propiedad);
  } catch (error: any) {
    console.error('Error en GET /properties/:propertyId:', error);
    res.status(500).json({ 
      error: 'Error al obtener propiedad',
      message: error.message 
    });
  }
});

/**
 * GET /api/tenants/:tenantId/pages/:slug
 * 
 * Endpoint principal para obtener una página completa con todos sus componentes y tema.
 * Este endpoint reemplaza las múltiples llamadas separadas (página, tema, componentes).
 * 
 * El frontend debe usar este endpoint en lugar de hacer 3 llamadas separadas.
 * 
 * Respuesta:
 * {
 *   page: { id, titulo, slug, ... },
 *   theme: { primary, secondary, ... },
 *   components: [ { id, tipo, variante, datos, ... }, ... ]
 * }
 */
router.get('/:tenantId/pages/:slug', async (req, res) => {
  try {
    const { tenantId, slug } = req.params;
    
    console.log(`📄 GET /pages/:slug - tenantId: ${tenantId}, slug: ${slug}`);
    
    const paginaCompleta = await getPaginaCompleta(tenantId, slug);
    
    // Agregar headers de caché
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutos de caché
    
    console.log(`✅ Página completa devuelta: ${paginaCompleta.page.titulo} (${paginaCompleta.components.length} componentes)`);
    res.json(paginaCompleta);
  } catch (error: any) {
    console.error('❌ Error en GET /pages/:slug:', error);
    res.status(404).json({ 
      error: 'Página no encontrada',
      message: error.message 
    });
  }
});

/**
 * GET /api/tenants/:tenantId/resolve/*
 * 
 * Endpoint universal que resuelve cualquier URL y devuelve la página completa
 * El frontend es "tonto" - solo envía la URL y recibe todo listo para renderizar
 * 
 * Este endpoint:
 * - Detecta automáticamente el tipo de página
 * - Resuelve datos dinámicos (propiedades, etc.)
 * - Inyecta datos en componentes (ej: propiedad en property_detail)
 * - Devuelve todo listo para renderizar
 * 
 * Ejemplos:
 * - GET /api/tenants/:tenantId/resolve/ → Homepage
 * - GET /api/tenants/:tenantId/resolve/propiedades → Listado de propiedades
 * - GET /api/tenants/:tenantId/resolve/propiedades/1 → Propiedad individual
 * - GET /api/tenants/:tenantId/resolve/blog → Blog
 */
// Endpoint universal para resolver cualquier ruta
// IMPORTANTE: Debe estar DESPUÉS de todas las rutas más específicas
// Usamos query param para el pathname en lugar de wildcard (más confiable)
// El tenantId puede ser un slug o un UUID (auto-detecta)
router.get('/:tenantSlugOrId/resolve', async (req, res) => {
  try {
    const { tenantSlugOrId } = req.params;
    // Obtener pathname desde query param
    const pathname = req.query.pathname as string || '/';
    
    // Normalizar: asegurar que empiece con /
    const normalizedPath = pathname.startsWith('/') ? pathname : '/' + pathname;
    
    console.log(`🌐 GET /resolve - tenantSlugOrId: ${tenantSlugOrId}`);
    console.log(`   pathname: ${normalizedPath}`);
    console.log(`   req.query:`, req.query);
    
    // Obtener tenant por slug o ID (auto-detecta)
    const { getTenantByIdOrSlug } = await import('../services/tenantsService.js');
    const tenant = await getTenantByIdOrSlug(tenantSlugOrId);
    
    if (!tenant) {
      console.log(`❌ Tenant no encontrado: ${tenantSlugOrId}`);
      return res.status(404).json({
        error: 'Tenant no encontrado',
        message: `No se encontró un tenant con slug/ID: "${tenantSlugOrId}"`,
      });
    }
    
    const tenantId = tenant.id;
    console.log(`   Tenant encontrado: ${tenant.slug} (ID: ${tenantId})`);
    
    const paginaCompleta = await resolveRoute(tenantId, normalizedPath);
    
    if (!paginaCompleta) {
      console.log(`❌ No se encontró página para: ${normalizedPath}`);
      return res.status(404).json({
        error: 'Página no encontrada',
        message: `No se encontró ninguna página para la ruta "${normalizedPath}"`,
      });
    }
    
    console.log(`✅ Ruta resuelta: ${normalizedPath} → ${paginaCompleta.page.titulo}`);
    res.json(paginaCompleta);
  } catch (error: any) {
    console.error('❌ Error en GET /resolve:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Error al resolver ruta',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ==================== RUTAS CRM: CONTACTOS ====================

/**
 * GET /api/tenants/:tenantId/contactos
 *
 * Obtiene lista de contactos con filtros y paginación
 */
router.get('/:tenantId/contactos', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { tipo, favorito, busqueda, usuario_asignado_id, page, limit } = req.query;

    const filtros = {
      tipo: tipo as string | undefined,
      favorito: favorito === 'true' ? true : favorito === 'false' ? false : undefined,
      busqueda: busqueda as string | undefined,
      usuario_asignado_id: usuario_asignado_id as string | undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50,
    };

    const resultado = await getContactos(tenantId, filtros);
    res.json(resultado);
  } catch (error: any) {
    console.error('Error en GET /contactos:', error);
    res.status(500).json({ error: 'Error al obtener contactos', message: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/contactos/:contactoId
 *
 * Obtiene un contacto específico
 */
router.get('/:tenantId/contactos/:contactoId', async (req, res) => {
  try {
    const { tenantId, contactoId } = req.params;
    const contacto = await getContactoById(tenantId, contactoId);

    if (!contacto) {
      return res.status(404).json({ error: 'Contacto no encontrado' });
    }

    res.json(contacto);
  } catch (error: any) {
    console.error('Error en GET /contactos/:id:', error);
    res.status(500).json({ error: 'Error al obtener contacto', message: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/contactos
 *
 * Crea un nuevo contacto
 */
router.post('/:tenantId/contactos', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const contacto = await createContacto(tenantId, req.body);
    res.status(201).json(contacto);
  } catch (error: any) {
    console.error('Error en POST /contactos:', error);
    res.status(500).json({ error: 'Error al crear contacto', message: error.message });
  }
});

/**
 * PUT /api/tenants/:tenantId/contactos/:contactoId
 *
 * Actualiza un contacto existente
 */
router.put('/:tenantId/contactos/:contactoId', async (req, res) => {
  try {
    const { tenantId, contactoId } = req.params;
    const contacto = await updateContacto(tenantId, contactoId, req.body);

    if (!contacto) {
      return res.status(404).json({ error: 'Contacto no encontrado' });
    }

    res.json(contacto);
  } catch (error: any) {
    console.error('Error en PUT /contactos/:id:', error);
    res.status(500).json({ error: 'Error al actualizar contacto', message: error.message });
  }
});

/**
 * DELETE /api/tenants/:tenantId/contactos/:contactoId
 *
 * Elimina (desactiva) un contacto
 */
router.delete('/:tenantId/contactos/:contactoId', async (req, res) => {
  try {
    const { tenantId, contactoId } = req.params;
    const eliminado = await deleteContacto(tenantId, contactoId);

    if (!eliminado) {
      return res.status(404).json({ error: 'Contacto no encontrado' });
    }

    res.json({ success: true, message: 'Contacto eliminado correctamente' });
  } catch (error: any) {
    console.error('Error en DELETE /contactos/:id:', error);
    res.status(500).json({ error: 'Error al eliminar contacto', message: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/contactos/:contactoId/favorito
 *
 * Alterna el estado de favorito
 */
router.post('/:tenantId/contactos/:contactoId/favorito', async (req, res) => {
  try {
    const { tenantId, contactoId } = req.params;
    const contacto = await toggleContactoFavorito(tenantId, contactoId);

    if (!contacto) {
      return res.status(404).json({ error: 'Contacto no encontrado' });
    }

    res.json(contacto);
  } catch (error: any) {
    console.error('Error en POST /contactos/:id/favorito:', error);
    res.status(500).json({ error: 'Error al cambiar favorito', message: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/contactos/:contactoId/relaciones
 *
 * Obtiene las relaciones de un contacto
 */
router.get('/:tenantId/contactos/:contactoId/relaciones', async (req, res) => {
  try {
    const { tenantId, contactoId } = req.params;
    const relaciones = await getRelacionesContacto(tenantId, contactoId);
    res.json(relaciones);
  } catch (error: any) {
    console.error('Error en GET /contactos/:id/relaciones:', error);
    res.status(500).json({ error: 'Error al obtener relaciones', message: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/contactos/:contactoId/relaciones
 *
 * Crea una relación entre contactos
 */
router.post('/:tenantId/contactos/:contactoId/relaciones', async (req, res) => {
  try {
    const { tenantId, contactoId } = req.params;
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
  } catch (error: any) {
    console.error('Error en POST /contactos/:id/relaciones:', error);
    res.status(500).json({ error: 'Error al crear relación', message: error.message });
  }
});

/**
 * DELETE /api/tenants/:tenantId/contactos/:contactoId/relaciones/:relacionId
 *
 * Elimina una relación entre contactos
 */
router.delete('/:tenantId/contactos/:contactoId/relaciones/:relacionId', async (req, res) => {
  try {
    const { tenantId, relacionId } = req.params;
    const deleted = await deleteRelacionContacto(tenantId, relacionId);

    if (!deleted) {
      return res.status(404).json({ error: 'Relación no encontrada' });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error en DELETE /contactos/:id/relaciones/:id:', error);
    res.status(500).json({ error: 'Error al eliminar relación', message: error.message });
  }
});

// ==================== RUTAS CRM: SOLICITUDES ====================

/**
 * GET /api/tenants/:tenantId/solicitudes
 *
 * Obtiene lista de solicitudes con filtros y paginación
 */
router.get('/:tenantId/solicitudes', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { etapa, etapas, contacto_id, usuario_asignado_id, busqueda, page, limit } = req.query;

    const filtros = {
      etapa: etapa as string | undefined,
      etapas: etapas ? (etapas as string).split(',') : undefined,
      contacto_id: contacto_id as string | undefined,
      usuario_asignado_id: usuario_asignado_id as string | undefined,
      busqueda: busqueda as string | undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 100,
    };

    const resultado = await getSolicitudes(tenantId, filtros);
    res.json(resultado);
  } catch (error: any) {
    console.error('Error en GET /solicitudes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes', message: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/solicitudes/:solicitudId
 *
 * Obtiene una solicitud específica
 */
router.get('/:tenantId/solicitudes/:solicitudId', async (req, res) => {
  try {
    const { tenantId, solicitudId } = req.params;
    const solicitud = await getSolicitudById(tenantId, solicitudId);

    if (!solicitud) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.json(solicitud);
  } catch (error: any) {
    console.error('Error en GET /solicitudes/:id:', error);
    res.status(500).json({ error: 'Error al obtener solicitud', message: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/solicitudes
 *
 * Crea una nueva solicitud
 */
router.post('/:tenantId/solicitudes', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const solicitud = await createSolicitud(tenantId, req.body);
    res.status(201).json(solicitud);
  } catch (error: any) {
    console.error('Error en POST /solicitudes:', error);
    res.status(500).json({ error: 'Error al crear solicitud', message: error.message });
  }
});

/**
 * PUT /api/tenants/:tenantId/solicitudes/:solicitudId
 *
 * Actualiza una solicitud existente
 */
router.put('/:tenantId/solicitudes/:solicitudId', async (req, res) => {
  try {
    const { tenantId, solicitudId } = req.params;
    const solicitud = await updateSolicitud(tenantId, solicitudId, req.body);

    if (!solicitud) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.json(solicitud);
  } catch (error: any) {
    console.error('Error en PUT /solicitudes/:id:', error);
    res.status(500).json({ error: 'Error al actualizar solicitud', message: error.message });
  }
});

/**
 * DELETE /api/tenants/:tenantId/solicitudes/:solicitudId
 *
 * Elimina (desactiva) una solicitud
 */
router.delete('/:tenantId/solicitudes/:solicitudId', async (req, res) => {
  try {
    const { tenantId, solicitudId } = req.params;
    const eliminado = await deleteSolicitud(tenantId, solicitudId);

    if (!eliminado) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.json({ success: true, message: 'Solicitud eliminada correctamente' });
  } catch (error: any) {
    console.error('Error en DELETE /solicitudes/:id:', error);
    res.status(500).json({ error: 'Error al eliminar solicitud', message: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/solicitudes/:solicitudId/etapa
 *
 * Cambia la etapa de una solicitud
 */
router.post('/:tenantId/solicitudes/:solicitudId/etapa', async (req, res) => {
  try {
    const { tenantId, solicitudId } = req.params;
    const { etapa, razonPerdida } = req.body;

    if (!etapa) {
      return res.status(400).json({ error: 'La etapa es requerida' });
    }

    const solicitud = await cambiarEtapaSolicitud(tenantId, solicitudId, etapa, razonPerdida);

    if (!solicitud) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.json(solicitud);
  } catch (error: any) {
    console.error('Error en POST /solicitudes/:id/etapa:', error);
    res.status(500).json({ error: 'Error al cambiar etapa', message: error.message });
  }
});

// ==================== RUTAS CRM: PROPUESTAS ====================

/**
 * GET /api/tenants/:tenantId/propuestas
 *
 * Obtiene lista de propuestas con filtros y paginación
 */
router.get('/:tenantId/propuestas', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { estado, estados, solicitud_id, contacto_id, usuario_creador_id, busqueda, page, limit } = req.query;

    const filtros = {
      estado: estado as string | undefined,
      estados: estados ? (estados as string).split(',') : undefined,
      solicitud_id: solicitud_id as string | undefined,
      contacto_id: contacto_id as string | undefined,
      usuario_creador_id: usuario_creador_id as string | undefined,
      busqueda: busqueda as string | undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50,
    };

    const resultado = await getPropuestas(tenantId, filtros);
    res.json(resultado);
  } catch (error: any) {
    console.error('Error en GET /propuestas:', error);
    res.status(500).json({ error: 'Error al obtener propuestas', message: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/propuestas/:propuestaId
 *
 * Obtiene una propuesta específica
 */
router.get('/:tenantId/propuestas/:propuestaId', async (req, res) => {
  try {
    const { tenantId, propuestaId } = req.params;
    const propuesta = await getPropuestaById(tenantId, propuestaId);

    if (!propuesta) {
      return res.status(404).json({ error: 'Propuesta no encontrada' });
    }

    res.json(propuesta);
  } catch (error: any) {
    console.error('Error en GET /propuestas/:id:', error);
    res.status(500).json({ error: 'Error al obtener propuesta', message: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/propuestas
 *
 * Crea una nueva propuesta
 */
router.post('/:tenantId/propuestas', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const propuesta = await createPropuesta(tenantId, req.body);
    res.status(201).json(propuesta);
  } catch (error: any) {
    console.error('Error en POST /propuestas:', error);
    res.status(500).json({ error: 'Error al crear propuesta', message: error.message });
  }
});

/**
 * PUT /api/tenants/:tenantId/propuestas/:propuestaId
 *
 * Actualiza una propuesta existente
 */
router.put('/:tenantId/propuestas/:propuestaId', async (req, res) => {
  try {
    const { tenantId, propuestaId } = req.params;
    const propuesta = await updatePropuesta(tenantId, propuestaId, req.body);

    if (!propuesta) {
      return res.status(404).json({ error: 'Propuesta no encontrada' });
    }

    res.json(propuesta);
  } catch (error: any) {
    console.error('Error en PUT /propuestas/:id:', error);
    res.status(500).json({ error: 'Error al actualizar propuesta', message: error.message });
  }
});

/**
 * DELETE /api/tenants/:tenantId/propuestas/:propuestaId
 *
 * Elimina (desactiva) una propuesta
 */
router.delete('/:tenantId/propuestas/:propuestaId', async (req, res) => {
  try {
    const { tenantId, propuestaId } = req.params;
    const eliminado = await deletePropuesta(tenantId, propuestaId);

    if (!eliminado) {
      return res.status(404).json({ error: 'Propuesta no encontrada' });
    }

    res.json({ success: true, message: 'Propuesta eliminada correctamente' });
  } catch (error: any) {
    console.error('Error en DELETE /propuestas/:id:', error);
    res.status(500).json({ error: 'Error al eliminar propuesta', message: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/propuestas/:propuestaId/estado
 *
 * Cambia el estado de una propuesta
 */
router.post('/:tenantId/propuestas/:propuestaId/estado', async (req, res) => {
  try {
    const { tenantId, propuestaId } = req.params;
    const { estado } = req.body;

    if (!estado) {
      return res.status(400).json({ error: 'El estado es requerido' });
    }

    const propuesta = await cambiarEstadoPropuesta(tenantId, propuestaId, estado);

    if (!propuesta) {
      return res.status(404).json({ error: 'Propuesta no encontrada' });
    }

    res.json(propuesta);
  } catch (error: any) {
    console.error('Error en POST /propuestas/:id/estado:', error);
    res.status(500).json({ error: 'Error al cambiar estado', message: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/propuestas/:propuestaId/regenerar-url
 *
 * Regenera la URL pública de una propuesta
 */
router.post('/:tenantId/propuestas/:propuestaId/regenerar-url', async (req, res) => {
  try {
    const { tenantId, propuestaId } = req.params;
    const propuesta = await regenerarUrlPublica(tenantId, propuestaId);

    if (!propuesta) {
      return res.status(404).json({ error: 'Propuesta no encontrada' });
    }

    res.json(propuesta);
  } catch (error: any) {
    console.error('Error en POST /propuestas/:id/regenerar-url:', error);
    res.status(500).json({ error: 'Error al regenerar URL', message: error.message });
  }
});

// ==================== RUTAS CRM: ACTIVIDADES ====================

/**
 * GET /api/tenants/:tenantId/actividades
 *
 * Obtiene lista de actividades con filtros y paginación
 */
router.get('/:tenantId/actividades', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { tipo, estado, prioridad, contacto_id, solicitud_id, propuesta_id, completada, busqueda, fecha_desde, fecha_hasta, page, limit } = req.query;

    const filtros = {
      tipo: tipo as string | undefined,
      estado: estado as any,
      prioridad: prioridad as any,
      contacto_id: contacto_id as string | undefined,
      solicitud_id: solicitud_id as string | undefined,
      propuesta_id: propuesta_id as string | undefined,
      completada: completada === 'true' ? true : completada === 'false' ? false : undefined,
      busqueda: busqueda as string | undefined,
      fecha_desde: fecha_desde as string | undefined,
      fecha_hasta: fecha_hasta as string | undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50,
    };

    const resultado = await getActividades(tenantId, filtros);
    res.json(resultado);
  } catch (error: any) {
    console.error('Error en GET /actividades:', error);
    res.status(500).json({ error: 'Error al obtener actividades', message: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/actividades/pendientes
 *
 * Obtiene actividades pendientes (tareas no completadas)
 */
router.get('/:tenantId/actividades/pendientes', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { usuario_id, limit } = req.query;

    const actividades = await getActividadesPendientes(
      tenantId,
      usuario_id as string | undefined,
      limit ? parseInt(limit as string) : 20
    );
    res.json(actividades);
  } catch (error: any) {
    console.error('Error en GET /actividades/pendientes:', error);
    res.status(500).json({ error: 'Error al obtener actividades pendientes', message: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/actividades/:actividadId
 *
 * Obtiene una actividad específica
 */
router.get('/:tenantId/actividades/:actividadId', async (req, res) => {
  try {
    const { tenantId, actividadId } = req.params;
    const actividad = await getActividadById(tenantId, actividadId);

    if (!actividad) {
      return res.status(404).json({ error: 'Actividad no encontrada' });
    }

    res.json(actividad);
  } catch (error: any) {
    console.error('Error en GET /actividades/:id:', error);
    res.status(500).json({ error: 'Error al obtener actividad', message: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/actividades
 *
 * Crea una nueva actividad
 */
router.post('/:tenantId/actividades', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const actividad = await createActividad(tenantId, req.body);
    res.status(201).json(actividad);
  } catch (error: any) {
    console.error('Error en POST /actividades:', error);
    res.status(500).json({ error: 'Error al crear actividad', message: error.message });
  }
});

/**
 * PUT /api/tenants/:tenantId/actividades/:actividadId
 *
 * Actualiza una actividad existente
 */
router.put('/:tenantId/actividades/:actividadId', async (req, res) => {
  try {
    const { tenantId, actividadId } = req.params;
    const actividad = await updateActividad(tenantId, actividadId, req.body);

    if (!actividad) {
      return res.status(404).json({ error: 'Actividad no encontrada' });
    }

    res.json(actividad);
  } catch (error: any) {
    console.error('Error en PUT /actividades/:id:', error);
    res.status(500).json({ error: 'Error al actualizar actividad', message: error.message });
  }
});

/**
 * DELETE /api/tenants/:tenantId/actividades/:actividadId
 *
 * Elimina una actividad
 */
router.delete('/:tenantId/actividades/:actividadId', async (req, res) => {
  try {
    const { tenantId, actividadId } = req.params;
    const eliminado = await deleteActividad(tenantId, actividadId);

    if (!eliminado) {
      return res.status(404).json({ error: 'Actividad no encontrada' });
    }

    res.json({ success: true, message: 'Actividad eliminada correctamente' });
  } catch (error: any) {
    console.error('Error en DELETE /actividades/:id:', error);
    res.status(500).json({ error: 'Error al eliminar actividad', message: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/actividades/:actividadId/completar
 *
 * Marca una actividad como completada/no completada
 */
router.post('/:tenantId/actividades/:actividadId/completar', async (req, res) => {
  try {
    const { tenantId, actividadId } = req.params;
    const { completada, nota } = req.body;

    const actividad = await completarActividad(tenantId, actividadId, completada !== false, nota);

    if (!actividad) {
      return res.status(404).json({ error: 'Actividad no encontrada' });
    }

    res.json(actividad);
  } catch (error: any) {
    console.error('Error en POST /actividades/:id/completar:', error);
    res.status(500).json({ error: 'Error al completar actividad', message: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/actividades/:actividadId/estado
 *
 * Cambia el estado de una actividad
 */
router.post('/:tenantId/actividades/:actividadId/estado', async (req, res) => {
  try {
    const { tenantId, actividadId } = req.params;
    const { estado, nota } = req.body;

    if (!estado) {
      return res.status(400).json({ error: 'El estado es requerido' });
    }

    const actividad = await cambiarEstadoActividad(tenantId, actividadId, estado, nota);

    if (!actividad) {
      return res.status(404).json({ error: 'Actividad no encontrada' });
    }

    res.json(actividad);
  } catch (error: any) {
    console.error('Error en POST /actividades/:id/estado:', error);
    res.status(500).json({ error: 'Error al cambiar estado', message: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/actividades/stats
 *
 * Obtiene estadísticas de actividades
 */
router.get('/:tenantId/actividades/stats', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const stats = await getActividadesStats(tenantId);
    res.json(stats);
  } catch (error: any) {
    console.error('Error en GET /actividades/stats:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas', message: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/contactos/:contactoId/actividades
 *
 * Obtiene actividades de un contacto específico
 */
router.get('/:tenantId/contactos/:contactoId/actividades', async (req, res) => {
  try {
    const { tenantId, contactoId } = req.params;
    const { limit } = req.query;

    const actividades = await getActividadesByContacto(
      tenantId,
      contactoId,
      limit ? parseInt(limit as string) : 20
    );
    res.json(actividades);
  } catch (error: any) {
    console.error('Error en GET /contactos/:id/actividades:', error);
    res.status(500).json({ error: 'Error al obtener actividades del contacto', message: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/solicitudes/:solicitudId/actividades
 *
 * Obtiene actividades de una solicitud específica
 */
router.get('/:tenantId/solicitudes/:solicitudId/actividades', async (req, res) => {
  try {
    const { tenantId, solicitudId } = req.params;
    const { limit } = req.query;

    const actividades = await getActividadesBySolicitud(
      tenantId,
      solicitudId,
      limit ? parseInt(limit as string) : 20
    );
    res.json(actividades);
  } catch (error: any) {
    console.error('Error en GET /solicitudes/:id/actividades:', error);
    res.status(500).json({ error: 'Error al obtener actividades de la solicitud', message: error.message });
  }
});

// ==================== RUTAS CRM: PROPIEDADES ====================

/**
 * GET /api/tenants/:tenantId/propiedades
 *
 * Obtiene lista de propiedades con filtros y paginación
 */
router.get('/:tenantId/propiedades', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const {
      tipo, operacion, estado_propiedad, ciudad,
      precio_min, precio_max, recamaras_min, banos_min,
      m2_min, m2_max, destacada, busqueda, agente_id,
      page, limit
    } = req.query;

    const filtros = {
      tipo: tipo as string | undefined,
      operacion: operacion as string | undefined,
      estado_propiedad: estado_propiedad as string | undefined,
      ciudad: ciudad as string | undefined,
      precio_min: precio_min ? parseFloat(precio_min as string) : undefined,
      precio_max: precio_max ? parseFloat(precio_max as string) : undefined,
      recamaras_min: recamaras_min ? parseInt(recamaras_min as string) : undefined,
      banos_min: banos_min ? parseInt(banos_min as string) : undefined,
      m2_min: m2_min ? parseFloat(m2_min as string) : undefined,
      m2_max: m2_max ? parseFloat(m2_max as string) : undefined,
      destacada: destacada === 'true' ? true : destacada === 'false' ? false : undefined,
      busqueda: busqueda as string | undefined,
      agente_id: agente_id as string | undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 24,
    };

    const resultado = await getPropiedades(tenantId, filtros);
    res.json(resultado);
  } catch (error: any) {
    console.error('Error en GET /propiedades:', error);
    res.status(500).json({ error: 'Error al obtener propiedades', message: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/propiedades/stats
 *
 * Obtiene estadísticas de propiedades
 */
router.get('/:tenantId/propiedades/stats', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const stats = await getPropiedadesStats(tenantId);
    res.json(stats);
  } catch (error: any) {
    console.error('Error en GET /propiedades/stats:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas', message: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/propiedades/:propiedadId
 *
 * Obtiene una propiedad específica
 */
router.get('/:tenantId/propiedades/:propiedadId', async (req, res) => {
  try {
    const { tenantId, propiedadId } = req.params;
    const propiedad = await getPropiedadById(tenantId, propiedadId);

    if (!propiedad) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    res.json(propiedad);
  } catch (error: any) {
    console.error('Error en GET /propiedades/:id:', error);
    res.status(500).json({ error: 'Error al obtener propiedad', message: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/propiedades
 *
 * Crea una nueva propiedad
 */
router.post('/:tenantId/propiedades', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const propiedad = await createPropiedad(tenantId, req.body);
    res.status(201).json(propiedad);
  } catch (error: any) {
    console.error('Error en POST /propiedades:', error);
    res.status(500).json({ error: 'Error al crear propiedad', message: error.message });
  }
});

/**
 * PUT /api/tenants/:tenantId/propiedades/:propiedadId
 *
 * Actualiza una propiedad existente
 */
router.put('/:tenantId/propiedades/:propiedadId', async (req, res) => {
  try {
    const { tenantId, propiedadId } = req.params;
    const propiedad = await updatePropiedad(tenantId, propiedadId, req.body);

    if (!propiedad) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    res.json(propiedad);
  } catch (error: any) {
    console.error('Error en PUT /propiedades/:id:', error);
    res.status(500).json({ error: 'Error al actualizar propiedad', message: error.message });
  }
});

/**
 * DELETE /api/tenants/:tenantId/propiedades/:propiedadId
 *
 * Elimina una propiedad (soft delete)
 */
router.delete('/:tenantId/propiedades/:propiedadId', async (req, res) => {
  try {
    const { tenantId, propiedadId } = req.params;
    const eliminado = await deletePropiedad(tenantId, propiedadId);

    if (!eliminado) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    res.json({ success: true, message: 'Propiedad eliminada correctamente' });
  } catch (error: any) {
    console.error('Error en DELETE /propiedades/:id:', error);
    res.status(500).json({ error: 'Error al eliminar propiedad', message: error.message });
  }
});

// ==================== RUTAS CRM: METAS (GAMIFICACIÓN) ====================

/**
 * GET /api/tenants/:tenantId/metas
 *
 * Obtiene lista de metas con filtros
 */
router.get('/:tenantId/metas', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { tipo_meta, estado, origen, usuario_id, periodo, page, limit } = req.query;

    const filtros = {
      tipo_meta: tipo_meta as string | undefined,
      estado: estado as string | undefined,
      origen: origen as string | undefined,
      usuario_id: usuario_id as string | undefined,
      periodo: periodo as string | undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
    };

    const resultado = await getMetas(tenantId, filtros);
    res.json(resultado);
  } catch (error: any) {
    console.error('Error en GET /metas:', error);
    res.status(500).json({ error: 'Error al obtener metas', message: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/metas/resumen
 *
 * Obtiene resumen de metas
 */
router.get('/:tenantId/metas/resumen', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { usuario_id } = req.query;
    const resumen = await getMetasResumen(tenantId, usuario_id as string | undefined);
    res.json(resumen);
  } catch (error: any) {
    console.error('Error en GET /metas/resumen:', error);
    res.status(500).json({ error: 'Error al obtener resumen', message: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/metas/:metaId
 *
 * Obtiene una meta específica
 */
router.get('/:tenantId/metas/:metaId', async (req, res) => {
  try {
    const { tenantId, metaId } = req.params;
    const meta = await getMetaById(tenantId, metaId);

    if (!meta) {
      return res.status(404).json({ error: 'Meta no encontrada' });
    }

    res.json(meta);
  } catch (error: any) {
    console.error('Error en GET /metas/:id:', error);
    res.status(500).json({ error: 'Error al obtener meta', message: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/metas
 *
 * Crea una nueva meta
 */
router.post('/:tenantId/metas', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const meta = await createMeta(tenantId, req.body);
    res.status(201).json(meta);
  } catch (error: any) {
    console.error('Error en POST /metas:', error);
    res.status(500).json({ error: 'Error al crear meta', message: error.message });
  }
});

/**
 * PUT /api/tenants/:tenantId/metas/:metaId
 *
 * Actualiza una meta existente
 */
router.put('/:tenantId/metas/:metaId', async (req, res) => {
  try {
    const { tenantId, metaId } = req.params;
    const meta = await updateMeta(tenantId, metaId, req.body);

    if (!meta) {
      return res.status(404).json({ error: 'Meta no encontrada' });
    }

    res.json(meta);
  } catch (error: any) {
    console.error('Error en PUT /metas/:id:', error);
    res.status(500).json({ error: 'Error al actualizar meta', message: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/metas/:metaId/progreso
 *
 * Actualiza el progreso de una meta
 */
router.post('/:tenantId/metas/:metaId/progreso', async (req, res) => {
  try {
    const { tenantId, metaId } = req.params;
    const { valor, nota } = req.body;

    const meta = await actualizarProgresoMeta(tenantId, metaId, valor, nota);

    if (!meta) {
      return res.status(404).json({ error: 'Meta no encontrada' });
    }

    res.json(meta);
  } catch (error: any) {
    console.error('Error en POST /metas/:id/progreso:', error);
    res.status(500).json({ error: 'Error al actualizar progreso', message: error.message });
  }
});

/**
 * DELETE /api/tenants/:tenantId/metas/:metaId
 *
 * Elimina una meta (soft delete)
 */
router.delete('/:tenantId/metas/:metaId', async (req, res) => {
  try {
    const { tenantId, metaId } = req.params;
    const eliminado = await deleteMeta(tenantId, metaId);

    if (!eliminado) {
      return res.status(404).json({ error: 'Meta no encontrada' });
    }

    res.json({ success: true, message: 'Meta eliminada correctamente' });
  } catch (error: any) {
    console.error('Error en DELETE /metas/:id:', error);
    res.status(500).json({ error: 'Error al eliminar meta', message: error.message });
  }
});

// ==================== RUTAS CRM: USUARIOS DEL TENANT ====================

/**
 * GET /api/tenants/:tenantId/usuarios
 *
 * Obtiene lista de usuarios del tenant
 */
router.get('/:tenantId/usuarios', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const usuarios = await getUsuariosByTenant(tenantId);
    res.json(usuarios);
  } catch (error: any) {
    console.error('Error en GET /usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios', message: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/usuarios/:usuarioId
 */
router.get('/:tenantId/usuarios/:usuarioId', async (req, res) => {
  try {
    const { tenantId, usuarioId } = req.params;
    const usuario = await getUsuarioTenantById(tenantId, usuarioId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(usuario);
  } catch (error: any) {
    console.error('Error en GET /usuarios/:id:', error);
    res.status(500).json({ error: 'Error al obtener usuario', message: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/usuarios
 */
router.post('/:tenantId/usuarios', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const usuario = await agregarUsuarioATenant(tenantId, req.body);
    res.status(201).json(usuario);
  } catch (error: any) {
    console.error('Error en POST /usuarios:', error);
    res.status(500).json({ error: 'Error al crear usuario', message: error.message });
  }
});

/**
 * PUT /api/tenants/:tenantId/usuarios/:usuarioId
 */
router.put('/:tenantId/usuarios/:usuarioId', async (req, res) => {
  try {
    const { tenantId, usuarioId } = req.params;
    const usuario = await actualizarUsuarioTenant(tenantId, usuarioId, req.body);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(usuario);
  } catch (error: any) {
    console.error('Error en PUT /usuarios/:id:', error);
    res.status(500).json({ error: 'Error al actualizar usuario', message: error.message });
  }
});

/**
 * DELETE /api/tenants/:tenantId/usuarios/:usuarioId
 */
router.delete('/:tenantId/usuarios/:usuarioId', async (req, res) => {
  try {
    const { tenantId, usuarioId } = req.params;
    const eliminado = await eliminarUsuarioDeTenant(tenantId, usuarioId);
    if (!eliminado) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ success: true, message: 'Usuario eliminado correctamente' });
  } catch (error: any) {
    console.error('Error en DELETE /usuarios/:id:', error);
    res.status(500).json({ error: 'Error al eliminar usuario', message: error.message });
  }
});

// ==================== RUTAS CRM: ROLES DEL TENANT ====================

/**
 * GET /api/tenants/:tenantId/roles
 */
router.get('/:tenantId/roles', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const roles = await getRolesByTenant(tenantId);
    res.json(roles);
  } catch (error: any) {
    console.error('Error en GET /roles:', error);
    res.status(500).json({ error: 'Error al obtener roles', message: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/roles/:rolId
 */
router.get('/:tenantId/roles/:rolId', async (req, res) => {
  try {
    const { tenantId, rolId } = req.params;
    const rol = await getRolTenantById(tenantId, rolId);
    if (!rol) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }
    res.json(rol);
  } catch (error: any) {
    console.error('Error en GET /roles/:id:', error);
    res.status(500).json({ error: 'Error al obtener rol', message: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/roles
 */
router.post('/:tenantId/roles', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const rol = await createRolTenant(tenantId, req.body);
    res.status(201).json(rol);
  } catch (error: any) {
    console.error('Error en POST /roles:', error);
    res.status(500).json({ error: 'Error al crear rol', message: error.message });
  }
});

/**
 * PUT /api/tenants/:tenantId/roles/:rolId
 */
router.put('/:tenantId/roles/:rolId', async (req, res) => {
  try {
    const { tenantId, rolId } = req.params;
    const rol = await updateRolTenant(tenantId, rolId, req.body);
    if (!rol) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }
    res.json(rol);
  } catch (error: any) {
    console.error('Error en PUT /roles/:id:', error);
    res.status(500).json({ error: 'Error al actualizar rol', message: error.message });
  }
});

/**
 * DELETE /api/tenants/:tenantId/roles/:rolId
 */
router.delete('/:tenantId/roles/:rolId', async (req, res) => {
  try {
    const { tenantId, rolId } = req.params;
    const eliminado = await deleteRolTenant(tenantId, rolId);
    if (!eliminado) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }
    res.json({ success: true, message: 'Rol eliminado correctamente' });
  } catch (error: any) {
    console.error('Error en DELETE /roles/:id:', error);
    res.status(500).json({ error: 'Error al eliminar rol', message: error.message });
  }
});

// ==================== RUTAS CRM: TASAS DE CAMBIO ====================

/**
 * GET /api/tenants/:tenantId/tasas-cambio
 */
router.get('/:tenantId/tasas-cambio', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const tasas = await getTasasCambio(tenantId);
    res.json(tasas);
  } catch (error: any) {
    console.error('Error en GET /tasas-cambio:', error);
    res.status(500).json({ error: 'Error al obtener tasas de cambio', message: error.message });
  }
});

/**
 * PUT /api/tenants/:tenantId/tasas-cambio
 */
router.put('/:tenantId/tasas-cambio', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const tasas = await updateTasasCambio(tenantId, req.body);
    res.json(tasas);
  } catch (error: any) {
    console.error('Error en PUT /tasas-cambio:', error);
    res.status(500).json({ error: 'Error al actualizar tasas de cambio', message: error.message });
  }
});

// ==================== RUTAS CRM: CONTENIDO (ARTÍCULOS, VIDEOS, FAQS, TESTIMONIOS) ====================

/**
 * GET /api/tenants/:tenantId/contenido/articulos
 */
router.get('/:tenantId/contenido/articulos', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { publicado, destacado, categoria_id, limit, offset } = req.query;

    let sql = `
      SELECT a.*, c.nombre as categoria_nombre, c.slug as categoria_slug
      FROM articulos a
      LEFT JOIN categorias_contenido c ON a.categoria_id = c.id
      WHERE a.tenant_id = $1
    `;
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (publicado !== undefined) {
      sql += ` AND a.publicado = $${paramIndex}`;
      params.push(publicado === 'true');
      paramIndex++;
    }
    if (destacado !== undefined) {
      sql += ` AND a.destacado = $${paramIndex}`;
      params.push(destacado === 'true');
      paramIndex++;
    }
    if (categoria_id) {
      sql += ` AND a.categoria_id = $${paramIndex}`;
      params.push(categoria_id);
      paramIndex++;
    }

    sql += ' ORDER BY a.fecha_publicacion DESC NULLS LAST, a.created_at DESC';

    if (limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(parseInt(limit as string));
      paramIndex++;
    }
    if (offset) {
      sql += ` OFFSET $${paramIndex}`;
      params.push(parseInt(offset as string));
    }

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error en GET /contenido/articulos:', error);
    res.status(500).json({ error: 'Error al obtener artículos', message: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/contenido/articulos/:id
 */
router.get('/:tenantId/contenido/articulos/:articuloId', async (req, res) => {
  try {
    const { tenantId, articuloId } = req.params;
    const sql = `
      SELECT a.*, c.nombre as categoria_nombre, c.slug as categoria_slug
      FROM articulos a
      LEFT JOIN categorias_contenido c ON a.categoria_id = c.id
      WHERE a.tenant_id = $1 AND a.id = $2
    `;
    const result = await query(sql, [tenantId, articuloId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Artículo no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error en GET /contenido/articulos/:id:', error);
    res.status(500).json({ error: 'Error al obtener artículo', message: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/contenido/articulos
 */
router.post('/:tenantId/contenido/articulos', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const {
      slug, titulo, extracto, contenido, imagen_principal, imagenes,
      autor_id, autor_nombre, autor_foto, meta_titulo, meta_descripcion,
      tags, publicado, destacado, fecha_publicacion, categoria_id, idioma, traducciones
    } = req.body;

    const sql = `
      INSERT INTO articulos (
        tenant_id, slug, titulo, extracto, contenido, imagen_principal, imagenes,
        autor_id, autor_nombre, autor_foto, meta_titulo, meta_descripcion,
        tags, publicado, destacado, fecha_publicacion, categoria_id, idioma, traducciones
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `;
    const result = await query(sql, [
      tenantId, slug, titulo, extracto, contenido, imagen_principal,
      JSON.stringify(imagenes || []), autor_id, autor_nombre, autor_foto,
      meta_titulo, meta_descripcion, JSON.stringify(tags || []),
      publicado || false, destacado || false, fecha_publicacion,
      categoria_id, idioma || 'es', JSON.stringify(traducciones || {})
    ]);
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error en POST /contenido/articulos:', error);
    res.status(500).json({ error: 'Error al crear artículo', message: error.message });
  }
});

/**
 * PUT /api/tenants/:tenantId/contenido/articulos/:id
 */
router.put('/:tenantId/contenido/articulos/:articuloId', async (req, res) => {
  try {
    const { tenantId, articuloId } = req.params;
    const {
      slug, titulo, extracto, contenido, imagen_principal, imagenes,
      autor_id, autor_nombre, autor_foto, meta_titulo, meta_descripcion,
      tags, publicado, destacado, fecha_publicacion, categoria_id, idioma, traducciones
    } = req.body;

    const sql = `
      UPDATE articulos SET
        slug = COALESCE($3, slug),
        titulo = COALESCE($4, titulo),
        extracto = COALESCE($5, extracto),
        contenido = COALESCE($6, contenido),
        imagen_principal = COALESCE($7, imagen_principal),
        imagenes = COALESCE($8, imagenes),
        autor_id = COALESCE($9, autor_id),
        autor_nombre = COALESCE($10, autor_nombre),
        autor_foto = COALESCE($11, autor_foto),
        meta_titulo = COALESCE($12, meta_titulo),
        meta_descripcion = COALESCE($13, meta_descripcion),
        tags = COALESCE($14, tags),
        publicado = COALESCE($15, publicado),
        destacado = COALESCE($16, destacado),
        fecha_publicacion = COALESCE($17, fecha_publicacion),
        categoria_id = $18,
        idioma = COALESCE($19, idioma),
        traducciones = COALESCE($20, traducciones),
        updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING *
    `;
    const result = await query(sql, [
      tenantId, articuloId, slug, titulo, extracto, contenido, imagen_principal,
      imagenes ? JSON.stringify(imagenes) : null, autor_id, autor_nombre, autor_foto,
      meta_titulo, meta_descripcion, tags ? JSON.stringify(tags) : null,
      publicado, destacado, fecha_publicacion, categoria_id,
      idioma, traducciones ? JSON.stringify(traducciones) : null
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Artículo no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error en PUT /contenido/articulos/:id:', error);
    res.status(500).json({ error: 'Error al actualizar artículo', message: error.message });
  }
});

/**
 * DELETE /api/tenants/:tenantId/contenido/articulos/:id
 */
router.delete('/:tenantId/contenido/articulos/:articuloId', async (req, res) => {
  try {
    const { tenantId, articuloId } = req.params;
    const sql = 'DELETE FROM articulos WHERE tenant_id = $1 AND id = $2';
    const result = await query(sql, [tenantId, articuloId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Artículo no encontrado' });
    }
    res.json({ success: true, message: 'Artículo eliminado correctamente' });
  } catch (error: any) {
    console.error('Error en DELETE /contenido/articulos/:id:', error);
    res.status(500).json({ error: 'Error al eliminar artículo', message: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/contenido/videos
 */
router.get('/:tenantId/contenido/videos', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const sql = `
      SELECT v.*, c.nombre as categoria_nombre
      FROM videos v
      LEFT JOIN categorias_contenido c ON v.categoria_id = c.id
      WHERE v.tenant_id = $1
      ORDER BY v.orden ASC, v.created_at DESC
    `;
    const result = await query(sql, [tenantId]);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error en GET /contenido/videos:', error);
    res.status(500).json({ error: 'Error al obtener videos', message: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/contenido/faqs
 */
router.get('/:tenantId/contenido/faqs', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const sql = `
      SELECT f.*, c.nombre as categoria_nombre
      FROM faqs f
      LEFT JOIN categorias_contenido c ON f.categoria_id = c.id
      WHERE f.tenant_id = $1
      ORDER BY f.orden ASC, f.created_at DESC
    `;
    const result = await query(sql, [tenantId]);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error en GET /contenido/faqs:', error);
    res.status(500).json({ error: 'Error al obtener FAQs', message: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/contenido/testimonios
 */
router.get('/:tenantId/contenido/testimonios', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const sql = `
      SELECT * FROM testimonios
      WHERE tenant_id = $1
      ORDER BY orden ASC, created_at DESC
    `;
    const result = await query(sql, [tenantId]);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error en GET /contenido/testimonios:', error);
    res.status(500).json({ error: 'Error al obtener testimonios', message: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/contenido/categorias
 */
router.get('/:tenantId/contenido/categorias', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { tipo } = req.query;

    let sql = 'SELECT * FROM categorias_contenido WHERE tenant_id = $1';
    const params: any[] = [tenantId];

    if (tipo) {
      sql += ' AND tipo = $2';
      params.push(tipo);
    }

    sql += ' ORDER BY orden ASC, nombre ASC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error en GET /contenido/categorias:', error);
    res.status(500).json({ error: 'Error al obtener categorías', message: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/contenido/seo-stats
 */
router.get('/:tenantId/contenido/seo-stats', async (req, res) => {
  try {
    const { tenantId } = req.params;

    // Obtener conteos de contenido
    const articulos = await query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE publicado = true) as publicados FROM articulos WHERE tenant_id = $1', [tenantId]);
    const videos = await query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE activo = true) as activos FROM videos WHERE tenant_id = $1', [tenantId]);
    const faqs = await query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE activa = true) as activas FROM faqs WHERE tenant_id = $1', [tenantId]);
    const testimonios = await query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE activo = true) as activos FROM testimonios WHERE tenant_id = $1', [tenantId]);

    res.json({
      articulos: {
        total: parseInt(articulos.rows[0]?.total || 0),
        publicados: parseInt(articulos.rows[0]?.publicados || 0)
      },
      videos: {
        total: parseInt(videos.rows[0]?.total || 0),
        activos: parseInt(videos.rows[0]?.activos || 0)
      },
      faqs: {
        total: parseInt(faqs.rows[0]?.total || 0),
        activas: parseInt(faqs.rows[0]?.activas || 0)
      },
      testimonios: {
        total: parseInt(testimonios.rows[0]?.total || 0),
        activos: parseInt(testimonios.rows[0]?.activos || 0)
      }
    });
  } catch (error: any) {
    console.error('Error en GET /contenido/seo-stats:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas', message: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/contenido/tags
 * Obtiene tags globales del tenant
 */
router.get('/:tenantId/contenido/tags', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { activo } = req.query;

    let sql = 'SELECT * FROM tags_globales WHERE tenant_id = $1';
    const params: any[] = [tenantId];

    if (activo !== undefined) {
      sql += ' AND activo = $2';
      params.push(activo === 'true');
    }

    sql += ' ORDER BY nombre ASC';

    const result = await query(sql, params);
    res.json({ tags: result.rows });
  } catch (error: any) {
    console.error('Error en GET /contenido/tags:', error);
    res.status(500).json({ error: 'Error al obtener tags', message: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/contenido/:tipoContenido/:contenidoId/tags
 * Obtiene tags de un contenido específico
 */
router.get('/:tenantId/contenido/:tipoContenido/:contenidoId/tags', async (req, res) => {
  try {
    const { tenantId, tipoContenido, contenidoId } = req.params;

    const sql = `
      SELECT tg.* FROM tags_globales tg
      INNER JOIN contenido_tags ct ON tg.id = ct.tag_id
      WHERE ct.tenant_id = $1 AND ct.tipo_contenido = $2 AND ct.contenido_id = $3
    `;

    const result = await query(sql, [tenantId, tipoContenido, contenidoId]);
    res.json({ tags: result.rows });
  } catch (error: any) {
    console.error('Error en GET /contenido/:tipo/:id/tags:', error);
    res.status(500).json({ error: 'Error al obtener tags del contenido', message: error.message });
  }
});

// ==================== RUTAS: ESTADOS DE VENTA ====================

/**
 * GET /api/tenants/:tenantId/estados-venta
 * Obtiene todos los estados de venta del tenant
 */
router.get('/:tenantId/estados-venta', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const sql = `
      SELECT * FROM estados_venta
      WHERE tenant_id = $1 AND activo = true
      ORDER BY orden ASC, nombre ASC
    `;
    const result = await query(sql, [tenantId]);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error en GET /estados-venta:', error);
    res.status(500).json({ error: 'Error al obtener estados de venta', message: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/estados-venta/:estadoId
 * Obtiene un estado de venta específico
 */
router.get('/:tenantId/estados-venta/:estadoId', async (req, res) => {
  try {
    const { tenantId, estadoId } = req.params;
    const sql = 'SELECT * FROM estados_venta WHERE tenant_id = $1 AND id = $2';
    const result = await query(sql, [tenantId, estadoId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Estado de venta no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error en GET /estados-venta/:id:', error);
    res.status(500).json({ error: 'Error al obtener estado de venta', message: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/estados-venta
 * Crea un nuevo estado de venta
 */
router.post('/:tenantId/estados-venta', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { nombre, descripcion, es_final, orden } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    const sql = `
      INSERT INTO estados_venta (tenant_id, nombre, descripcion, es_final, orden)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await query(sql, [tenantId, nombre, descripcion || null, es_final || false, orden || 0]);
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error en POST /estados-venta:', error);
    res.status(500).json({ error: 'Error al crear estado de venta', message: error.message });
  }
});

/**
 * PUT /api/tenants/:tenantId/estados-venta/:estadoId
 * Actualiza un estado de venta
 */
router.put('/:tenantId/estados-venta/:estadoId', async (req, res) => {
  try {
    const { tenantId, estadoId } = req.params;
    const { nombre, descripcion, es_final, orden, activo } = req.body;

    const sql = `
      UPDATE estados_venta SET
        nombre = COALESCE($3, nombre),
        descripcion = COALESCE($4, descripcion),
        es_final = COALESCE($5, es_final),
        orden = COALESCE($6, orden),
        activo = COALESCE($7, activo),
        updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING *
    `;
    const result = await query(sql, [tenantId, estadoId, nombre, descripcion, es_final, orden, activo]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Estado de venta no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error en PUT /estados-venta/:id:', error);
    res.status(500).json({ error: 'Error al actualizar estado de venta', message: error.message });
  }
});

/**
 * DELETE /api/tenants/:tenantId/estados-venta/:estadoId
 * Elimina (desactiva) un estado de venta
 */
router.delete('/:tenantId/estados-venta/:estadoId', async (req, res) => {
  try {
    const { tenantId, estadoId } = req.params;
    const sql = 'UPDATE estados_venta SET activo = false, updated_at = NOW() WHERE tenant_id = $1 AND id = $2 RETURNING *';
    const result = await query(sql, [tenantId, estadoId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Estado de venta no encontrado' });
    }
    res.json({ success: true, message: 'Estado de venta eliminado correctamente' });
  } catch (error: any) {
    console.error('Error en DELETE /estados-venta/:id:', error);
    res.status(500).json({ error: 'Error al eliminar estado de venta', message: error.message });
  }
});

// ==================== RUTAS: VENTAS ====================

/**
 * GET /api/tenants/:tenantId/ventas
 * Obtiene lista de ventas con filtros
 */
router.get('/:tenantId/ventas', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const {
      estado_venta_id,
      usuario_cerrador_id,
      contacto_id,
      propiedad_id,
      completada,
      cancelada,
      fecha_inicio,
      fecha_fin,
      busqueda,
      page = '1',
      limit = '50'
    } = req.query;

    let sql = `
      SELECT v.*,
        ev.nombre as estado_venta_nombre,
        c.nombre as contacto_nombre,
        c.apellido as contacto_apellido,
        c.email as contacto_email,
        p.titulo as propiedad_nombre,
        p.codigo as propiedad_codigo,
        u.nombre as usuario_cerrador_nombre,
        u.apellido as usuario_cerrador_apellido
      FROM ventas v
      LEFT JOIN estados_venta ev ON v.estado_venta_id = ev.id
      LEFT JOIN contactos c ON v.contacto_id = c.id
      LEFT JOIN propiedades p ON v.propiedad_id = p.id
      LEFT JOIN usuarios u ON v.usuario_cerrador_id = u.id
      WHERE v.tenant_id = $1 AND v.activo = true
    `;
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (estado_venta_id) {
      sql += ` AND v.estado_venta_id = $${paramIndex}`;
      params.push(estado_venta_id);
      paramIndex++;
    }

    if (usuario_cerrador_id) {
      sql += ` AND v.usuario_cerrador_id = $${paramIndex}`;
      params.push(usuario_cerrador_id);
      paramIndex++;
    }

    if (contacto_id) {
      sql += ` AND v.contacto_id = $${paramIndex}`;
      params.push(contacto_id);
      paramIndex++;
    }

    if (propiedad_id) {
      sql += ` AND v.propiedad_id = $${paramIndex}`;
      params.push(propiedad_id);
      paramIndex++;
    }

    if (completada !== undefined) {
      sql += ` AND v.completada = $${paramIndex}`;
      params.push(completada === 'true');
      paramIndex++;
    }

    if (cancelada !== undefined) {
      sql += ` AND v.cancelada = $${paramIndex}`;
      params.push(cancelada === 'true');
      paramIndex++;
    }

    if (fecha_inicio) {
      sql += ` AND v.fecha_cierre >= $${paramIndex}`;
      params.push(fecha_inicio);
      paramIndex++;
    }

    if (fecha_fin) {
      sql += ` AND v.fecha_cierre <= $${paramIndex}`;
      params.push(fecha_fin);
      paramIndex++;
    }

    if (busqueda) {
      sql += ` AND (v.nombre_negocio ILIKE $${paramIndex} OR v.descripcion ILIKE $${paramIndex} OR CAST(v.numero_venta AS TEXT) = $${paramIndex + 1})`;
      params.push(`%${busqueda}%`);
      params.push(busqueda);
      paramIndex += 2;
    }

    // Contar total
    const countSql = sql.replace(/SELECT v\.\*.*FROM ventas v/, 'SELECT COUNT(*) as total FROM ventas v');
    const countResult = await query(countSql, params);
    const total = parseInt(countResult.rows[0]?.total || '0');

    // Ordenar y paginar
    sql += ' ORDER BY v.created_at DESC';
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limitNum, offset);

    const result = await query(sql, params);
    res.json({
      data: result.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('Error en GET /ventas:', error);
    res.status(500).json({ error: 'Error al obtener ventas', message: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/ventas-stats
 * Obtiene estadísticas de ventas
 */
router.get('/:tenantId/ventas-stats', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { fecha_inicio, fecha_fin } = req.query;

    let dateFilter = '';
    const params: any[] = [tenantId];

    if (fecha_inicio && fecha_fin) {
      dateFilter = 'AND fecha_cierre BETWEEN $2 AND $3';
      params.push(fecha_inicio, fecha_fin);
    }

    const sql = `
      SELECT
        COUNT(*) as total_ventas,
        COUNT(*) FILTER (WHERE completada = true) as ventas_completadas,
        COUNT(*) FILTER (WHERE cancelada = true) as ventas_canceladas,
        COUNT(*) FILTER (WHERE completada = false AND cancelada = false) as ventas_en_proceso,
        COALESCE(SUM(valor_cierre) FILTER (WHERE completada = true), 0) as valor_total_completadas,
        COALESCE(SUM(monto_comision) FILTER (WHERE completada = true), 0) as comisiones_totales,
        COALESCE(AVG(valor_cierre) FILTER (WHERE completada = true), 0) as valor_promedio
      FROM ventas
      WHERE tenant_id = $1 AND activo = true ${dateFilter}
    `;

    const result = await query(sql, params);
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error en GET /ventas-stats:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas', message: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/ventas/:ventaId
 * Obtiene una venta específica con todos sus detalles
 */
router.get('/:tenantId/ventas/:ventaId', async (req, res) => {
  try {
    const { tenantId, ventaId } = req.params;
    const sql = `
      SELECT v.*,
        ev.nombre as estado_venta_nombre,
        c.nombre as contacto_nombre,
        c.apellido as contacto_apellido,
        c.email as contacto_email,
        c.telefono as contacto_telefono,
        p.titulo as propiedad_nombre,
        p.codigo as propiedad_codigo,
        u.nombre as usuario_cerrador_nombre,
        u.apellido as usuario_cerrador_apellido,
        u.email as usuario_cerrador_email
      FROM ventas v
      LEFT JOIN estados_venta ev ON v.estado_venta_id = ev.id
      LEFT JOIN contactos c ON v.contacto_id = c.id
      LEFT JOIN propiedades p ON v.propiedad_id = p.id
      LEFT JOIN usuarios u ON v.usuario_cerrador_id = u.id
      WHERE v.tenant_id = $1 AND v.id = $2
    `;
    const result = await query(sql, [tenantId, ventaId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error en GET /ventas/:id:', error);
    res.status(500).json({ error: 'Error al obtener venta', message: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/ventas
 * Crea una nueva venta
 */
router.post('/:tenantId/ventas', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const {
      nombre_negocio,
      descripcion,
      propiedad_id,
      contacto_id,
      usuario_cerrador_id,
      equipo_id,
      vendedor_externo_tipo,
      vendedor_externo_nombre,
      vendedor_externo_contacto,
      vendedor_externo_id,
      referidor_nombre,
      referidor_id,
      referidor_contacto_id,
      estado_venta_id,
      es_propiedad_externa,
      nombre_propiedad_externa,
      codigo_propiedad_externa,
      ciudad_propiedad,
      sector_propiedad,
      categoria_propiedad,
      numero_unidad,
      valor_cierre,
      moneda,
      porcentaje_comision,
      monto_comision,
      fecha_cierre,
      aplica_impuestos,
      monto_impuestos,
      notas,
      datos_extra
    } = req.body;

    if (!valor_cierre) {
      return res.status(400).json({ error: 'El valor de cierre es requerido' });
    }

    // Obtener el próximo número de venta
    const numResult = await query(
      'SELECT COALESCE(MAX(numero_venta), 0) + 1 as next_num FROM ventas WHERE tenant_id = $1',
      [tenantId]
    );
    const numero_venta = numResult.rows[0].next_num;

    const sql = `
      INSERT INTO ventas (
        tenant_id, numero_venta, nombre_negocio, descripcion, propiedad_id, contacto_id,
        usuario_cerrador_id, equipo_id, vendedor_externo_tipo, vendedor_externo_nombre,
        vendedor_externo_contacto, vendedor_externo_id, referidor_nombre, referidor_id,
        referidor_contacto_id, estado_venta_id, es_propiedad_externa, nombre_propiedad_externa,
        codigo_propiedad_externa, ciudad_propiedad, sector_propiedad, categoria_propiedad,
        numero_unidad, valor_cierre, moneda, porcentaje_comision, monto_comision,
        fecha_cierre, aplica_impuestos, monto_impuestos, notas, datos_extra
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32
      )
      RETURNING *
    `;
    const result = await query(sql, [
      tenantId, numero_venta, nombre_negocio, descripcion, propiedad_id, contacto_id,
      usuario_cerrador_id, equipo_id, vendedor_externo_tipo, vendedor_externo_nombre,
      vendedor_externo_contacto, vendedor_externo_id, referidor_nombre, referidor_id,
      referidor_contacto_id, estado_venta_id, es_propiedad_externa || false, nombre_propiedad_externa,
      codigo_propiedad_externa, ciudad_propiedad, sector_propiedad, categoria_propiedad,
      numero_unidad, valor_cierre, moneda || 'USD', porcentaje_comision, monto_comision,
      fecha_cierre, aplica_impuestos || false, monto_impuestos, notas,
      datos_extra ? JSON.stringify(datos_extra) : '{}'
    ]);
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error en POST /ventas:', error);
    res.status(500).json({ error: 'Error al crear venta', message: error.message });
  }
});

/**
 * PUT /api/tenants/:tenantId/ventas/:ventaId
 * Actualiza una venta
 */
router.put('/:tenantId/ventas/:ventaId', async (req, res) => {
  try {
    const { tenantId, ventaId } = req.params;
    const {
      nombre_negocio,
      descripcion,
      propiedad_id,
      contacto_id,
      usuario_cerrador_id,
      equipo_id,
      vendedor_externo_tipo,
      vendedor_externo_nombre,
      vendedor_externo_contacto,
      vendedor_externo_id,
      referidor_nombre,
      referidor_id,
      referidor_contacto_id,
      estado_venta_id,
      es_propiedad_externa,
      nombre_propiedad_externa,
      codigo_propiedad_externa,
      ciudad_propiedad,
      sector_propiedad,
      categoria_propiedad,
      numero_unidad,
      valor_cierre,
      moneda,
      porcentaje_comision,
      monto_comision,
      estado_comision,
      monto_comision_pagado,
      fecha_pago_comision,
      notas_comision,
      fecha_cierre,
      aplica_impuestos,
      monto_impuestos,
      completada,
      cancelada,
      fecha_cancelacion,
      cancelado_por_id,
      razon_cancelacion,
      notas,
      datos_extra
    } = req.body;

    const sql = `
      UPDATE ventas SET
        nombre_negocio = COALESCE($3, nombre_negocio),
        descripcion = COALESCE($4, descripcion),
        propiedad_id = $5,
        contacto_id = $6,
        usuario_cerrador_id = $7,
        equipo_id = $8,
        vendedor_externo_tipo = $9,
        vendedor_externo_nombre = $10,
        vendedor_externo_contacto = $11,
        vendedor_externo_id = $12,
        referidor_nombre = $13,
        referidor_id = $14,
        referidor_contacto_id = $15,
        estado_venta_id = $16,
        es_propiedad_externa = COALESCE($17, es_propiedad_externa),
        nombre_propiedad_externa = $18,
        codigo_propiedad_externa = $19,
        ciudad_propiedad = $20,
        sector_propiedad = $21,
        categoria_propiedad = $22,
        numero_unidad = $23,
        valor_cierre = COALESCE($24, valor_cierre),
        moneda = COALESCE($25, moneda),
        porcentaje_comision = $26,
        monto_comision = $27,
        estado_comision = COALESCE($28, estado_comision),
        monto_comision_pagado = COALESCE($29, monto_comision_pagado),
        fecha_pago_comision = $30,
        notas_comision = $31,
        fecha_cierre = $32,
        aplica_impuestos = COALESCE($33, aplica_impuestos),
        monto_impuestos = $34,
        completada = COALESCE($35, completada),
        cancelada = COALESCE($36, cancelada),
        fecha_cancelacion = $37,
        cancelado_por_id = $38,
        razon_cancelacion = $39,
        notas = $40,
        datos_extra = COALESCE($41, datos_extra),
        updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING *
    `;
    const result = await query(sql, [
      tenantId, ventaId, nombre_negocio, descripcion, propiedad_id, contacto_id,
      usuario_cerrador_id, equipo_id, vendedor_externo_tipo, vendedor_externo_nombre,
      vendedor_externo_contacto, vendedor_externo_id, referidor_nombre, referidor_id,
      referidor_contacto_id, estado_venta_id, es_propiedad_externa, nombre_propiedad_externa,
      codigo_propiedad_externa, ciudad_propiedad, sector_propiedad, categoria_propiedad,
      numero_unidad, valor_cierre, moneda, porcentaje_comision, monto_comision,
      estado_comision, monto_comision_pagado, fecha_pago_comision, notas_comision,
      fecha_cierre, aplica_impuestos, monto_impuestos, completada, cancelada,
      fecha_cancelacion, cancelado_por_id, razon_cancelacion, notas,
      datos_extra ? JSON.stringify(datos_extra) : null
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error en PUT /ventas/:id:', error);
    res.status(500).json({ error: 'Error al actualizar venta', message: error.message });
  }
});

/**
 * DELETE /api/tenants/:tenantId/ventas/:ventaId
 * Elimina (desactiva) una venta
 */
router.delete('/:tenantId/ventas/:ventaId', async (req, res) => {
  try {
    const { tenantId, ventaId } = req.params;
    const sql = 'UPDATE ventas SET activo = false, updated_at = NOW() WHERE tenant_id = $1 AND id = $2 RETURNING *';
    const result = await query(sql, [tenantId, ventaId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    res.json({ success: true, message: 'Venta eliminada correctamente' });
  } catch (error: any) {
    console.error('Error en DELETE /ventas/:id:', error);
    res.status(500).json({ error: 'Error al eliminar venta', message: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/ventas/:ventaId/completar
 * Marca una venta como completada
 */
router.post('/:tenantId/ventas/:ventaId/completar', async (req, res) => {
  try {
    const { tenantId, ventaId } = req.params;
    const sql = `
      UPDATE ventas SET
        completada = true,
        fecha_cierre = COALESCE(fecha_cierre, NOW()),
        updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING *
    `;
    const result = await query(sql, [tenantId, ventaId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error en POST /ventas/:id/completar:', error);
    res.status(500).json({ error: 'Error al completar venta', message: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/ventas/:ventaId/cancelar
 * Cancela una venta
 */
router.post('/:tenantId/ventas/:ventaId/cancelar', async (req, res) => {
  try {
    const { tenantId, ventaId } = req.params;
    const { razon_cancelacion, cancelado_por_id } = req.body;

    const sql = `
      UPDATE ventas SET
        cancelada = true,
        fecha_cancelacion = NOW(),
        cancelado_por_id = $3,
        razon_cancelacion = $4,
        updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING *
    `;
    const result = await query(sql, [tenantId, ventaId, cancelado_por_id, razon_cancelacion]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error en POST /ventas/:id/cancelar:', error);
    res.status(500).json({ error: 'Error al cancelar venta', message: error.message });
  }
});

// ==================== RUTAS: DATOS DINÁMICOS ====================

/**
 * Montar router de datos dinámicos como ruta anidada
 * Esto crea las rutas: /api/tenants/:tenantId/dynamic-data/:tipo
 */
router.use('/:tenantId/dynamic-data', dynamicDataRouter);

export default router;

