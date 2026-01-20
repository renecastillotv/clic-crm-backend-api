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
import { getJoinRequests, getJoinRequestById, createJoinRequest, approveJoinRequest, rejectJoinRequest, getUpgradeRequests, getUpgradeRequestById, approveUpgradeRequest, rejectUpgradeRequest } from '../services/clicConnectSolicitudesService.js';
import {
  getAmenidades,
  getAmenidadesTenant,
  getCategoriasAmenidades,
  createAmenidadTenant,
  updateAmenidadTenant,
  deleteAmenidadTenant,
} from '../services/catalogosService.js';

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
 * Las páginas son tipos estándar del sistema (tipos_pagina).
 */
router.post('/:tenantId/paginas', async (_req, res) => {
  res.status(400).json({
    error: 'Operación no permitida',
    message: 'Las páginas son tipos estándar del sistema. Para personalizar componentes de una página, use el endpoint de componentes.'
  });
});

/**
 * PUT /api/tenants/:tenantId/paginas/:paginaId
 * Las páginas son tipos estándar del sistema (tipos_pagina).
 */
router.put('/:tenantId/paginas/:paginaId', async (_req, res) => {
  res.status(400).json({
    error: 'Operación no permitida',
    message: 'Las páginas son tipos estándar del sistema. Para personalizar componentes de una página, use el endpoint de componentes.'
  });
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

/**
 * POST /api/tenants/:tenantId/propiedades/:propiedadId/regenerate-slugs
 *
 * Regenera los slugs de una propiedad (afecta SEO si ya está publicada)
 */
router.post('/:tenantId/propiedades/:propiedadId/regenerate-slugs', async (req, res) => {
  try {
    const { tenantId, propiedadId } = req.params;
    const { forceRegenerate, nuevoTitulo } = req.body;

    // Importar el servicio dinámicamente para evitar dependencias circulares
    const { regeneratePropiedadSlugs } = await import('../services/propiedadesCrmService.js');

    const result = await regeneratePropiedadSlugs(tenantId, propiedadId, {
      forceRegenerate,
      nuevoTitulo
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error en POST /propiedades/:id/regenerate-slugs:', error);
    res.status(500).json({ error: 'Error al regenerar slugs', message: error.message });
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

// ==================== RUTAS: SISTEMA DE FASES ====================

/**
 * GET /api/tenants/:tenantId/sistema-fases/proyectos
 * Obtiene los proyectos del Sistema de Fases
 */
router.get('/:tenantId/sistema-fases/proyectos', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const sql = `
      SELECT p.*,
        prop.titulo as propiedad_nombre
      FROM sistema_fases_proyectos p
      LEFT JOIN propiedades prop ON p.propiedad_id = prop.id
      WHERE p.tenant_id = $1
      ORDER BY p.created_at DESC
    `;
    const result = await query(sql, [tenantId]);
    res.json({ proyectos: result.rows });
  } catch (error: any) {
    console.error('Error en GET /sistema-fases/proyectos:', error);
    res.status(500).json({ error: 'Error al obtener proyectos', message: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/sistema-fases/proyectos
 * Crea un nuevo proyecto del Sistema de Fases
 */
router.post('/:tenantId/sistema-fases/proyectos', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const {
      propiedad_id,
      porcentaje_comision_asesor = 50,
      porcentaje_comision_tenant = 50,
      monto_fase_1 = 100,
      monto_fase_2 = 150,
      monto_fase_3 = 200,
      monto_fase_4 = 250,
      monto_fase_5 = 300,
      intentos_fase_1 = 3,
      meses_solitario = 3,
      activo = true,
      fecha_inicio,
      fecha_fin
    } = req.body;

    const sql = `
      INSERT INTO sistema_fases_proyectos (
        tenant_id, propiedad_id, porcentaje_comision_asesor, porcentaje_comision_tenant,
        monto_fase_1, monto_fase_2, monto_fase_3, monto_fase_4, monto_fase_5,
        intentos_fase_1, meses_solitario, activo, fecha_inicio, fecha_fin
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    const result = await query(sql, [
      tenantId, propiedad_id, porcentaje_comision_asesor, porcentaje_comision_tenant,
      monto_fase_1, monto_fase_2, monto_fase_3, monto_fase_4, monto_fase_5,
      intentos_fase_1, meses_solitario, activo, fecha_inicio, fecha_fin
    ]);
    res.status(201).json({ proyecto: result.rows[0] });
  } catch (error: any) {
    console.error('Error en POST /sistema-fases/proyectos:', error);
    res.status(500).json({ error: 'Error al crear proyecto', message: error.message });
  }
});

/**
 * PUT /api/tenants/:tenantId/sistema-fases/proyectos/:proyectoId
 * Actualiza un proyecto del Sistema de Fases
 */
router.put('/:tenantId/sistema-fases/proyectos/:proyectoId', async (req, res) => {
  try {
    const { tenantId, proyectoId } = req.params;
    const {
      propiedad_id,
      porcentaje_comision_asesor,
      porcentaje_comision_tenant,
      monto_fase_1, monto_fase_2, monto_fase_3, monto_fase_4, monto_fase_5,
      intentos_fase_1, meses_solitario, activo, fecha_inicio, fecha_fin
    } = req.body;

    const sql = `
      UPDATE sistema_fases_proyectos SET
        propiedad_id = COALESCE($3, propiedad_id),
        porcentaje_comision_asesor = COALESCE($4, porcentaje_comision_asesor),
        porcentaje_comision_tenant = COALESCE($5, porcentaje_comision_tenant),
        monto_fase_1 = COALESCE($6, monto_fase_1),
        monto_fase_2 = COALESCE($7, monto_fase_2),
        monto_fase_3 = COALESCE($8, monto_fase_3),
        monto_fase_4 = COALESCE($9, monto_fase_4),
        monto_fase_5 = COALESCE($10, monto_fase_5),
        intentos_fase_1 = COALESCE($11, intentos_fase_1),
        meses_solitario = COALESCE($12, meses_solitario),
        activo = COALESCE($13, activo),
        fecha_inicio = COALESCE($14, fecha_inicio),
        fecha_fin = COALESCE($15, fecha_fin),
        updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING *
    `;
    const result = await query(sql, [
      tenantId, proyectoId, propiedad_id, porcentaje_comision_asesor, porcentaje_comision_tenant,
      monto_fase_1, monto_fase_2, monto_fase_3, monto_fase_4, monto_fase_5,
      intentos_fase_1, meses_solitario, activo, fecha_inicio, fecha_fin
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }
    res.json({ proyecto: result.rows[0] });
  } catch (error: any) {
    console.error('Error en PUT /sistema-fases/proyectos/:id:', error);
    res.status(500).json({ error: 'Error al actualizar proyecto', message: error.message });
  }
});

/**
 * DELETE /api/tenants/:tenantId/sistema-fases/proyectos/:proyectoId
 * Elimina (desactiva) un proyecto del Sistema de Fases
 */
router.delete('/:tenantId/sistema-fases/proyectos/:proyectoId', async (req, res) => {
  try {
    const { tenantId, proyectoId } = req.params;
    const sql = 'UPDATE sistema_fases_proyectos SET activo = false, updated_at = NOW() WHERE tenant_id = $1 AND id = $2 RETURNING *';
    const result = await query(sql, [tenantId, proyectoId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }
    res.json({ success: true, message: 'Proyecto eliminado correctamente' });
  } catch (error: any) {
    console.error('Error en DELETE /sistema-fases/proyectos/:id:', error);
    res.status(500).json({ error: 'Error al eliminar proyecto', message: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/sistema-fases/asesores
 * Obtiene los asesores del Sistema de Fases
 */
router.get('/:tenantId/sistema-fases/asesores', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { proyectoId } = req.query;

    let sql = `
      SELECT a.*,
        u.nombre as usuario_nombre,
        u.apellido as usuario_apellido,
        u.email as usuario_email
      FROM sistema_fases_asesores a
      JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.tenant_id = $1
    `;
    const params: any[] = [tenantId];

    if (proyectoId) {
      sql += ' AND a.proyecto_id = $2';
      params.push(proyectoId);
    }

    sql += ' ORDER BY a.fase_actual DESC, a.prestige DESC';

    const result = await query(sql, params);
    res.json({ asesores: result.rows });
  } catch (error: any) {
    console.error('Error en GET /sistema-fases/asesores:', error);
    res.status(500).json({ error: 'Error al obtener asesores', message: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/sistema-fases/asesores
 * Agrega un asesor al Sistema de Fases
 */
router.post('/:tenantId/sistema-fases/asesores', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { proyectoId, usuarioId } = req.body;

    if (!proyectoId || !usuarioId) {
      return res.status(400).json({ error: 'proyectoId y usuarioId son requeridos' });
    }

    // Obtener configuración de intentos del proyecto
    const proyectoResult = await query(
      'SELECT intentos_fase_1 FROM sistema_fases_proyectos WHERE id = $1 AND tenant_id = $2',
      [proyectoId, tenantId]
    );
    const intentosTotales = proyectoResult.rows[0]?.intentos_fase_1 || 3;

    const sql = `
      INSERT INTO sistema_fases_asesores (
        tenant_id, usuario_id, proyecto_id, fase_actual, intentos_totales,
        mes_tracking
      ) VALUES ($1, $2, $3, 1, $4, date_trunc('month', CURRENT_DATE))
      ON CONFLICT (tenant_id, usuario_id, proyecto_id)
      DO UPDATE SET activo = true, updated_at = NOW()
      RETURNING *
    `;
    const result = await query(sql, [tenantId, usuarioId, proyectoId, intentosTotales]);
    res.status(201).json({ asesor: result.rows[0] });
  } catch (error: any) {
    console.error('Error en POST /sistema-fases/asesores:', error);
    res.status(500).json({ error: 'Error al agregar asesor', message: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/sistema-fases/leads
 * Obtiene los leads del Sistema de Fases
 */
router.get('/:tenantId/sistema-fases/leads', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { asesorId, proyectoId } = req.query;

    let sql = `
      SELECT l.*,
        c.nombre as contacto_nombre,
        c.apellido as contacto_apellido,
        c.email as contacto_email,
        c.telefono as contacto_telefono
      FROM sistema_fases_leads l
      JOIN contactos c ON l.contacto_id = c.id
      WHERE l.tenant_id = $1
    `;
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (asesorId) {
      sql += ` AND l.asesor_id = $${paramIndex}`;
      params.push(asesorId);
      paramIndex++;
    }

    if (proyectoId) {
      sql += ` AND l.proyecto_id = $${paramIndex}`;
      params.push(proyectoId);
      paramIndex++;
    }

    sql += ' ORDER BY l.created_at DESC';

    const result = await query(sql, params);
    res.json({ leads: result.rows });
  } catch (error: any) {
    console.error('Error en GET /sistema-fases/leads:', error);
    res.status(500).json({ error: 'Error al obtener leads', message: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/sistema-fases/estadisticas
 * Obtiene estadísticas del Sistema de Fases
 */
router.get('/:tenantId/sistema-fases/estadisticas', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { proyectoId } = req.query;

    let whereProyecto = '';
    const params: any[] = [tenantId];

    if (proyectoId) {
      whereProyecto = ' AND proyecto_id = $2';
      params.push(proyectoId);
    }

    // Total de asesores por fase
    const asesoresPorFaseResult = await query(`
      SELECT fase_actual, COUNT(*) as total
      FROM sistema_fases_asesores
      WHERE tenant_id = $1 AND activo = true ${whereProyecto}
      GROUP BY fase_actual
      ORDER BY fase_actual
    `, params);

    // Top asesores por PRESTIGE
    const topPrestigeResult = await query(`
      SELECT a.*, u.nombre, u.apellido
      FROM sistema_fases_asesores a
      JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.tenant_id = $1 AND a.activo = true ${whereProyecto}
      ORDER BY a.prestige DESC
      LIMIT 10
    `, params);

    // Leads por estado
    const leadsPorEstadoResult = await query(`
      SELECT estado, COUNT(*) as total
      FROM sistema_fases_leads
      WHERE tenant_id = $1 ${whereProyecto}
      GROUP BY estado
    `, params);

    res.json({
      asesoresPorFase: asesoresPorFaseResult.rows,
      topPrestige: topPrestigeResult.rows,
      leadsPorEstado: leadsPorEstadoResult.rows
    });
  } catch (error: any) {
    console.error('Error en GET /sistema-fases/estadisticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas', message: error.message });
  }
});

// ==================== RUTAS: CONFIGURACIÓN DE COMISIONES ====================

/**
 * GET /api/tenants/:tenantId/comision-config
 *
 * Obtiene la configuración de comisiones por defecto del tenant
 */
router.get('/:tenantId/comision-config', async (req, res) => {
  try {
    const { tenantId } = req.params;

    const sql = `
      SELECT
        red_global_comision_default,
        connect_comision_default
      FROM tenants
      WHERE id = $1 AND activo = true
      LIMIT 1
    `;

    const result = await query(sql, [tenantId]);

    if (result.rows.length === 0) {
      return res.json({
        red_global_comision_default: null,
        connect_comision_default: null
      });
    }

    const row = result.rows[0];
    res.json({
      red_global_comision_default: row.red_global_comision_default || null,
      connect_comision_default: row.connect_comision_default || null
    });
  } catch (error: any) {
    console.error('Error al obtener configuración de comisiones:', error);
    res.status(500).json({ error: 'Error al obtener configuración de comisiones', message: error.message });
  }
});

// ==================== RUTAS: CLIC CONNECT JOIN REQUESTS ====================

/**
 * GET /api/tenants/:tenantId/join-requests
 *
 * Obtiene todas las solicitudes de unirse a CLIC Connect para el tenant
 * Query params:
 *   - estado: filtrar por estado (pending, approved, rejected)
 */
router.get('/:tenantId/join-requests', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { estado } = req.query;

    let solicitudes = await getJoinRequests(tenantId);

    // Filtrar por estado si se especifica
    if (estado && typeof estado === 'string') {
      solicitudes = solicitudes.filter(s => s.estado === estado);
    }

    res.json({ solicitudes });
  } catch (error: any) {
    console.error('Error en GET /join-requests:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes', message: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/join-requests/:requestId
 *
 * Obtiene una solicitud específica
 */
router.get('/:tenantId/join-requests/:requestId', async (req, res) => {
  try {
    const { tenantId, requestId } = req.params;
    const solicitud = await getJoinRequestById(tenantId, requestId);

    if (!solicitud) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.json(solicitud);
  } catch (error: any) {
    console.error('Error en GET /join-requests/:requestId:', error);
    res.status(500).json({ error: 'Error al obtener solicitud', message: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/join-requests
 *
 * Crea una nueva solicitud de unirse a CLIC Connect
 */
router.post('/:tenantId/join-requests', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const data = req.body;

    const solicitud = await createJoinRequest(tenantId, data);
    res.status(201).json(solicitud);
  } catch (error: any) {
    console.error('Error en POST /join-requests:', error);
    res.status(500).json({ error: 'Error al crear solicitud', message: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/join-requests/:requestId/approve
 *
 * Aprueba una solicitud
 */
router.post('/:tenantId/join-requests/:requestId/approve', async (req, res) => {
  try {
    const { tenantId, requestId } = req.params;
    const { revisadoPor, notas } = req.body;

    const solicitud = await approveJoinRequest(tenantId, requestId, revisadoPor, notas);
    res.json(solicitud);
  } catch (error: any) {
    console.error('Error en POST /join-requests/:requestId/approve:', error);
    res.status(500).json({ error: 'Error al aprobar solicitud', message: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/join-requests/:requestId/reject
 *
 * Rechaza una solicitud
 */
router.post('/:tenantId/join-requests/:requestId/reject', async (req, res) => {
  try {
    const { tenantId, requestId } = req.params;
    const { revisadoPor, notas } = req.body;

    const solicitud = await rejectJoinRequest(tenantId, requestId, revisadoPor, notas);
    res.json(solicitud);
  } catch (error: any) {
    console.error('Error en POST /join-requests/:requestId/reject:', error);
    res.status(500).json({ error: 'Error al rechazar solicitud', message: error.message });
  }
});

// ==================== RUTAS: CATALOGOS TENANT ====================

/**
 * GET /api/tenants/:tenantId/catalogos
 *
 * Obtiene todos los items de catálogo para el tenant
 * Incluye items globales (tenant_id = NULL) + items personalizados del tenant
 * Query params:
 *   - tipo: filtrar por tipo de catálogo
 *   - activo: si es 'false' incluye items inactivos (default: solo activos)
 */
router.get('/:tenantId/catalogos', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { tipo, activo } = req.query;
    const soloActivos = activo !== 'false';

    let sql = `
      SELECT
        c.*,
        CASE
          WHEN c.tenant_id IS NULL THEN 'global'
          ELSE 'tenant'
        END as origen
      FROM catalogos c
      WHERE (c.tenant_id IS NULL OR c.tenant_id = $1)
    `;
    const params: any[] = [tenantId];

    if (tipo) {
      sql += ` AND c.tipo = $${params.length + 1}`;
      params.push(tipo);
    }

    if (soloActivos) {
      sql += ` AND c.activo = true`;
    }

    sql += ` ORDER BY c.tipo, c.orden, c.nombre`;

    const result = await query(sql, params);

    // Agrupar por tipo
    const catalogos: Record<string, any[]> = {};
    for (const row of result.rows) {
      const t = row.tipo;
      if (!catalogos[t]) {
        catalogos[t] = [];
      }
      catalogos[t].push(row);
    }

    // El frontend espera { catalogos: { tipo_contacto: [], ... } }
    res.json({ catalogos });
  } catch (error: any) {
    console.error('Error en GET /catalogos:', error);
    res.status(500).json({ error: 'Error al obtener catálogos', message: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/catalogos
 *
 * Crea un nuevo item de catálogo para el tenant
 */
router.post('/:tenantId/catalogos', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { tipo, codigo, nombre, nombre_plural, descripcion, icono, color, orden, activo, es_default, config, traducciones, metadata } = req.body;

    if (!tipo || !codigo || !nombre) {
      return res.status(400).json({ error: 'tipo, codigo y nombre son requeridos' });
    }

    const sql = `
      INSERT INTO catalogos (tenant_id, tipo, codigo, nombre, nombre_plural, descripcion, icono, color, orden, activo, es_default, config, traducciones, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const result = await query(sql, [
      tenantId,
      tipo,
      codigo,
      nombre,
      nombre_plural || null,
      descripcion || null,
      icono || null,
      color || null,
      orden || 0,
      activo !== false,
      es_default || false,
      config ? JSON.stringify(config) : null,
      traducciones ? JSON.stringify(traducciones) : null,
      metadata ? JSON.stringify(metadata) : null
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error en POST /catalogos:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un item con ese código para este tipo y tenant' });
    }
    res.status(500).json({ error: 'Error al crear item de catálogo', message: error.message });
  }
});

/**
 * PUT /api/tenants/:tenantId/catalogos/:itemId
 *
 * Actualiza un item de catálogo
 */
router.put('/:tenantId/catalogos/:itemId', async (req, res) => {
  try {
    const { tenantId, itemId } = req.params;
    const { nombre, nombre_plural, descripcion, icono, color, orden, activo, es_default, config, traducciones, metadata } = req.body;

    const sql = `
      UPDATE catalogos
      SET
        nombre = COALESCE($1, nombre),
        nombre_plural = COALESCE($2, nombre_plural),
        descripcion = COALESCE($3, descripcion),
        icono = COALESCE($4, icono),
        color = COALESCE($5, color),
        orden = COALESCE($6, orden),
        activo = COALESCE($7, activo),
        es_default = COALESCE($8, es_default),
        config = COALESCE($9, config),
        traducciones = COALESCE($10, traducciones),
        metadata = COALESCE($11, metadata),
        updated_at = NOW()
      WHERE id = $12 AND (tenant_id = $13 OR tenant_id IS NULL)
      RETURNING *
    `;

    const result = await query(sql, [
      nombre || null,
      nombre_plural || null,
      descripcion || null,
      icono || null,
      color || null,
      orden !== undefined ? orden : null,
      activo !== undefined ? activo : null,
      es_default !== undefined ? es_default : null,
      config ? JSON.stringify(config) : null,
      traducciones ? JSON.stringify(traducciones) : null,
      metadata ? JSON.stringify(metadata) : null,
      itemId,
      tenantId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item de catálogo no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error en PUT /catalogos/:itemId:', error);
    res.status(500).json({ error: 'Error al actualizar item de catálogo', message: error.message });
  }
});

/**
 * DELETE /api/tenants/:tenantId/catalogos/:itemId
 *
 * Elimina un item de catálogo (solo items del tenant, no globales)
 */
router.delete('/:tenantId/catalogos/:itemId', async (req, res) => {
  try {
    const { tenantId, itemId } = req.params;

    // Solo permitir eliminar items del tenant, no globales
    const sql = `
      DELETE FROM catalogos
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `;

    const result = await query(sql, [itemId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item de catálogo no encontrado o no pertenece al tenant' });
    }

    res.json({ message: 'Item eliminado correctamente', item: result.rows[0] });
  } catch (error: any) {
    console.error('Error en DELETE /catalogos/:itemId:', error);
    res.status(500).json({ error: 'Error al eliminar item de catálogo', message: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/catalogos/:tipo/toggle/:codigo
 *
 * Activa o desactiva un item de catálogo para el tenant
 */
router.post('/:tenantId/catalogos/:tipo/toggle/:codigo', async (req, res) => {
  try {
    const { tenantId, tipo, codigo } = req.params;
    const { activo } = req.body;

    // Primero buscar si existe un override del tenant
    const existsSql = `
      SELECT id FROM catalogos
      WHERE tenant_id = $1 AND tipo = $2 AND codigo = $3
    `;
    const existsResult = await query(existsSql, [tenantId, tipo, codigo]);

    if (existsResult.rows.length > 0) {
      // Actualizar el override existente
      const updateSql = `
        UPDATE catalogos
        SET activo = $1, updated_at = NOW()
        WHERE tenant_id = $2 AND tipo = $3 AND codigo = $4
        RETURNING *
      `;
      const result = await query(updateSql, [activo, tenantId, tipo, codigo]);
      return res.json(result.rows[0]);
    }

    // Si no existe override, crear uno copiando del global
    const globalSql = `
      SELECT * FROM catalogos
      WHERE tenant_id IS NULL AND tipo = $1 AND codigo = $2
    `;
    const globalResult = await query(globalSql, [tipo, codigo]);

    if (globalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Item de catálogo no encontrado' });
    }

    const global = globalResult.rows[0];
    const insertSql = `
      INSERT INTO catalogos (tenant_id, tipo, codigo, nombre, nombre_plural, descripcion, icono, color, orden, activo, es_default, config, traducciones, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const insertResult = await query(insertSql, [
      tenantId,
      global.tipo,
      global.codigo,
      global.nombre,
      global.nombre_plural,
      global.descripcion,
      global.icono,
      global.color,
      global.orden,
      activo,
      global.es_default,
      global.config,
      global.traducciones,
      global.metadata
    ]);

    res.json(insertResult.rows[0]);
  } catch (error: any) {
    console.error('Error en POST /catalogos/:tipo/toggle/:codigo:', error);
    res.status(500).json({ error: 'Error al toggle item de catálogo', message: error.message });
  }
});

// ==================== RUTAS: CLIC CONNECT UPGRADE REQUESTS ====================

/**
 * GET /api/tenants/:tenantId/upgrade-requests
 *
 * Obtiene todas las solicitudes de upgrade de CLIC Connect para el tenant
 * Query params:
 *   - estado: filtrar por estado (pending, approved, rejected)
 */
router.get('/:tenantId/upgrade-requests', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { estado } = req.query;

    let solicitudes = await getUpgradeRequests(tenantId);

    // Filtrar por estado si se especifica
    if (estado && typeof estado === 'string') {
      solicitudes = solicitudes.filter(s => s.estado === estado);
    }

    res.json({ solicitudes });
  } catch (error: any) {
    console.error('Error en GET /upgrade-requests:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes de upgrade', message: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/upgrade-requests/:requestId
 *
 * Obtiene una solicitud de upgrade específica
 */
router.get('/:tenantId/upgrade-requests/:requestId', async (req, res) => {
  try {
    const { tenantId, requestId } = req.params;
    const solicitud = await getUpgradeRequestById(tenantId, requestId);

    if (!solicitud) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.json(solicitud);
  } catch (error: any) {
    console.error('Error en GET /upgrade-requests/:requestId:', error);
    res.status(500).json({ error: 'Error al obtener solicitud de upgrade', message: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/upgrade-requests/:requestId/approve
 *
 * Aprueba una solicitud de upgrade
 */
router.post('/:tenantId/upgrade-requests/:requestId/approve', async (req, res) => {
  try {
    const { tenantId, requestId } = req.params;
    const { revisadoPor, notas } = req.body;

    const solicitud = await approveUpgradeRequest(tenantId, requestId, revisadoPor, notas);
    res.json(solicitud);
  } catch (error: any) {
    console.error('Error en POST /upgrade-requests/:requestId/approve:', error);
    res.status(500).json({ error: 'Error al aprobar solicitud de upgrade', message: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/upgrade-requests/:requestId/reject
 *
 * Rechaza una solicitud de upgrade
 */
router.post('/:tenantId/upgrade-requests/:requestId/reject', async (req, res) => {
  try {
    const { tenantId, requestId } = req.params;
    const { revisadoPor, notas } = req.body;

    const solicitud = await rejectUpgradeRequest(tenantId, requestId, revisadoPor, notas);
    res.json(solicitud);
  } catch (error: any) {
    console.error('Error en POST /upgrade-requests/:requestId/reject:', error);
    res.status(500).json({ error: 'Error al rechazar solicitud de upgrade', message: error.message });
  }
});

// ==================== RUTAS: AMENIDADES ====================

/**
 * GET /api/tenants/:tenantId/amenidades
 *
 * Obtiene las amenidades del tenant (globales + personalizadas)
 * Query params:
 *   - incluirInactivas (boolean, default false)
 */
router.get('/:tenantId/amenidades', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const incluirInactivas = req.query.incluirInactivas === 'true';

    // Obtener amenidades globales + del tenant
    const amenidades = await getAmenidades(!incluirInactivas, tenantId);

    res.json({ amenidades });
  } catch (error: any) {
    console.error('Error en GET /amenidades:', error);
    res.status(500).json({ error: 'Error al obtener amenidades', message: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/amenidades/categorias
 *
 * Obtiene las categorías de amenidades disponibles
 */
router.get('/:tenantId/amenidades/categorias', async (req, res) => {
  try {
    const categorias = await getCategoriasAmenidades();
    res.json(categorias);
  } catch (error: any) {
    console.error('Error en GET /amenidades/categorias:', error);
    res.status(500).json({ error: 'Error al obtener categorías', message: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/amenidades
 *
 * Crea una nueva amenidad personalizada para el tenant
 */
router.post('/:tenantId/amenidades', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { nombre, icono, categoria, traducciones } = req.body;

    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre de la amenidad es requerido' });
    }

    const amenidad = await createAmenidadTenant(tenantId, {
      nombre: nombre.trim(),
      icono,
      categoria,
      traducciones
    });

    res.status(201).json(amenidad);
  } catch (error: any) {
    console.error('Error en POST /amenidades:', error);
    res.status(500).json({ error: 'Error al crear amenidad', message: error.message });
  }
});

/**
 * PUT /api/tenants/:tenantId/amenidades/:amenidadId
 *
 * Actualiza una amenidad del tenant
 */
router.put('/:tenantId/amenidades/:amenidadId', async (req, res) => {
  try {
    const { tenantId, amenidadId } = req.params;
    const { nombre, icono, categoria, traducciones, activo } = req.body;

    const amenidad = await updateAmenidadTenant(tenantId, amenidadId, {
      nombre,
      icono,
      categoria,
      traducciones,
      activo
    });

    if (!amenidad) {
      return res.status(404).json({ error: 'Amenidad no encontrada' });
    }

    res.json(amenidad);
  } catch (error: any) {
    console.error('Error en PUT /amenidades/:amenidadId:', error);
    res.status(500).json({ error: 'Error al actualizar amenidad', message: error.message });
  }
});

/**
 * DELETE /api/tenants/:tenantId/amenidades/:amenidadId
 *
 * Elimina una amenidad del tenant
 */
router.delete('/:tenantId/amenidades/:amenidadId', async (req, res) => {
  try {
    const { tenantId, amenidadId } = req.params;

    const deleted = await deleteAmenidadTenant(tenantId, amenidadId);

    if (!deleted) {
      return res.status(404).json({ error: 'Amenidad no encontrada' });
    }

    res.json({ success: true, message: 'Amenidad eliminada correctamente' });
  } catch (error: any) {
    console.error('Error en DELETE /amenidades/:amenidadId:', error);
    res.status(500).json({ error: 'Error al eliminar amenidad', message: error.message });
  }
});

// ==================== RUTAS: IDIOMAS ====================

// Idiomas por defecto disponibles en el sistema
const IDIOMAS_SISTEMA = [
  { code: 'es', label: 'Spanish', labelNativo: 'Español', flag: 'ES', flagEmoji: '🇪🇸', activo: true },
  { code: 'en', label: 'English', labelNativo: 'English', flag: 'US', flagEmoji: '🇺🇸', activo: true },
  { code: 'fr', label: 'French', labelNativo: 'Français', flag: 'FR', flagEmoji: '🇫🇷', activo: true },
  { code: 'pt', label: 'Portuguese', labelNativo: 'Português', flag: 'BR', flagEmoji: '🇧🇷', activo: true },
];

/**
 * GET /api/tenants/:tenantId/idiomas
 *
 * Obtiene los idiomas habilitados para un tenant
 * Si la columna idiomas_habilitados no existe, devuelve español e inglés por defecto
 */
router.get('/:tenantId/idiomas', async (req, res) => {
  try {
    const { tenantId } = req.params;

    // Verificar si el tenant existe
    const tenantCheck = await query(`SELECT id FROM tenants WHERE id = $1`, [tenantId]);

    if (tenantCheck.rows.length === 0) {
      // Si no existe el tenant, devolver idiomas por defecto
      return res.json(IDIOMAS_SISTEMA.filter(i => i.code === 'es' || i.code === 'en'));
    }

    // Intentar obtener configuración de idiomas del tenant (puede no existir la columna)
    let idiomasHabilitados = ['es', 'en'];
    let idiomaDefault = 'es';

    try {
      const result = await query(
        `SELECT idiomas_habilitados, idioma_default FROM tenants WHERE id = $1`,
        [tenantId]
      );

      if (result.rows.length > 0 && result.rows[0].idiomas_habilitados) {
        idiomasHabilitados = result.rows[0].idiomas_habilitados;
        idiomaDefault = result.rows[0].idioma_default || 'es';
      }
    } catch {
      // Si la columna no existe, usamos los valores por defecto
      console.log('Columna idiomas_habilitados no existe, usando valores por defecto');
    }

    // Filtrar idiomas del sistema según los habilitados por el tenant
    const idiomasTenant = IDIOMAS_SISTEMA
      .filter(idioma => idiomasHabilitados.includes(idioma.code))
      .map(idioma => ({
        ...idioma,
        activo: true,
        esDefault: idioma.code === idiomaDefault
      }));

    // Si no hay idiomas configurados, devolver español e inglés por defecto
    if (idiomasTenant.length === 0) {
      return res.json(IDIOMAS_SISTEMA.filter(i => i.code === 'es' || i.code === 'en'));
    }

    res.json(idiomasTenant);
  } catch (error: any) {
    console.error('Error en GET /idiomas:', error);
    // En caso de error, devolver idiomas por defecto en lugar de fallar
    res.json(IDIOMAS_SISTEMA.filter(i => i.code === 'es' || i.code === 'en'));
  }
});

// ==================== RUTAS: EXTENSIONES DE CONTACTO ====================

/**
 * GET /api/tenants/:tenantId/extensiones-contacto
 * Obtiene todas las extensiones de contacto disponibles para el tenant
 * Query params: activo (boolean, default false = muestra todas)
 */
router.get('/:tenantId/extensiones-contacto', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const soloActivas = req.query.activo === 'true';

    // Obtener extensiones globales (tenant_id IS NULL) + extensiones del tenant
    let queryStr = `
      SELECT
        c.*,
        CASE
          WHEN c.tenant_id IS NULL THEN 'sistema'
          ELSE 'tenant'
        END as origen,
        COALESCE(p.activo, c.activo) as activo_tenant
      FROM catalogo_extensiones_contacto c
      LEFT JOIN tenant_extension_preferencias p
        ON p.extension_id = c.id AND p.tenant_id = $1
      WHERE (c.tenant_id IS NULL OR c.tenant_id = $1)
    `;

    if (soloActivas) {
      queryStr += ` AND COALESCE(p.activo, c.activo) = true`;
    }

    queryStr += ` ORDER BY c.orden, c.nombre`;

    const result = await query(queryStr, [tenantId]);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error en GET /extensiones-contacto:', error);
    res.status(500).json({ error: error.message || 'Error al obtener extensiones de contacto' });
  }
});

/**
 * GET /api/tenants/:tenantId/extensiones-contacto/:extensionId
 * Obtiene una extensión específica por ID
 */
router.get('/:tenantId/extensiones-contacto/:extensionId', async (req, res) => {
  try {
    const { tenantId, extensionId } = req.params;

    const result = await query(`
      SELECT
        c.*,
        CASE WHEN c.tenant_id IS NULL THEN 'sistema' ELSE 'tenant' END as origen,
        COALESCE(p.activo, c.activo) as activo_tenant
      FROM catalogo_extensiones_contacto c
      LEFT JOIN tenant_extension_preferencias p
        ON p.extension_id = c.id AND p.tenant_id = $1
      WHERE c.id = $2 AND (c.tenant_id IS NULL OR c.tenant_id = $1)
    `, [tenantId, extensionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Extensión no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error en GET /extensiones-contacto/:extensionId:', error);
    res.status(500).json({ error: error.message || 'Error al obtener extensión' });
  }
});

/**
 * POST /api/tenants/:tenantId/extensiones-contacto
 * Crea una nueva extensión personalizada para el tenant
 */
router.post('/:tenantId/extensiones-contacto', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { codigo, nombre, descripcion, icono, color, campos_schema, orden } = req.body;

    if (!codigo || !nombre) {
      return res.status(400).json({ error: 'Código y nombre son requeridos' });
    }

    const result = await query(`
      INSERT INTO catalogo_extensiones_contacto (tenant_id, codigo, nombre, descripcion, icono, color, campos_schema, orden, activo, es_sistema)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, false)
      RETURNING *
    `, [tenantId, codigo, nombre, descripcion || null, icono || null, color || null, JSON.stringify(campos_schema || []), orden || 0]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error en POST /extensiones-contacto:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Ya existe una extensión con ese código' });
    }
    res.status(500).json({ error: error.message || 'Error al crear extensión' });
  }
});

/**
 * PUT /api/tenants/:tenantId/extensiones-contacto/:extensionId
 * Actualiza una extensión del tenant
 */
router.put('/:tenantId/extensiones-contacto/:extensionId', async (req, res) => {
  try {
    const { tenantId, extensionId } = req.params;
    const { nombre, descripcion, icono, color, campos_schema, orden, activo } = req.body;

    // Solo permitir editar extensiones del tenant (no las de sistema)
    const checkResult = await query(`
      SELECT * FROM catalogo_extensiones_contacto WHERE id = $1
    `, [extensionId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Extensión no encontrada' });
    }

    const extension = checkResult.rows[0];

    // Si es extensión de sistema, solo permitir toggle de activo via preferencias
    if (extension.es_sistema || extension.tenant_id === null) {
      return res.status(403).json({ error: 'No se puede editar extensiones del sistema' });
    }

    const result = await query(`
      UPDATE catalogo_extensiones_contacto
      SET
        nombre = COALESCE($1, nombre),
        descripcion = COALESCE($2, descripcion),
        icono = COALESCE($3, icono),
        color = COALESCE($4, color),
        campos_schema = COALESCE($5, campos_schema),
        orden = COALESCE($6, orden),
        activo = COALESCE($7, activo),
        updated_at = NOW()
      WHERE id = $8 AND tenant_id = $9
      RETURNING *
    `, [nombre, descripcion, icono, color, campos_schema ? JSON.stringify(campos_schema) : null, orden, activo, extensionId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Extensión no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error en PUT /extensiones-contacto/:extensionId:', error);
    res.status(500).json({ error: error.message || 'Error al actualizar extensión' });
  }
});

/**
 * POST /api/tenants/:tenantId/extensiones-contacto/:extensionId/toggle
 * Activa/desactiva una extensión para el tenant (incluso las de sistema)
 */
router.post('/:tenantId/extensiones-contacto/:extensionId/toggle', async (req, res) => {
  try {
    const { tenantId, extensionId } = req.params;
    const { activo } = req.body;

    if (typeof activo !== 'boolean') {
      return res.status(400).json({ error: 'El campo activo es requerido (boolean)' });
    }

    // Upsert en tenant_extension_preferencias
    const result = await query(`
      INSERT INTO tenant_extension_preferencias (tenant_id, extension_id, activo)
      VALUES ($1, $2, $3)
      ON CONFLICT (tenant_id, extension_id)
      DO UPDATE SET activo = $3
      RETURNING *
    `, [tenantId, extensionId, activo]);

    res.json({ success: true, preferencia: result.rows[0] });
  } catch (error: any) {
    console.error('Error en POST /extensiones-contacto/:extensionId/toggle:', error);
    res.status(500).json({ error: error.message || 'Error al toggle extensión' });
  }
});

/**
 * DELETE /api/tenants/:tenantId/extensiones-contacto/:extensionId
 * Elimina una extensión personalizada del tenant
 */
router.delete('/:tenantId/extensiones-contacto/:extensionId', async (req, res) => {
  try {
    const { tenantId, extensionId } = req.params;

    // Solo permitir eliminar extensiones del tenant (no las de sistema)
    const result = await query(`
      DELETE FROM catalogo_extensiones_contacto
      WHERE id = $1 AND tenant_id = $2 AND es_sistema = false
      RETURNING id
    `, [extensionId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Extensión no encontrada o no se puede eliminar' });
    }

    res.json({ success: true, message: 'Extensión eliminada' });
  } catch (error: any) {
    console.error('Error en DELETE /extensiones-contacto/:extensionId:', error);
    res.status(500).json({ error: error.message || 'Error al eliminar extensión' });
  }
});

/**
 * GET /api/tenants/:tenantId/extensiones-contacto/:extensionId/campo-opciones
 * Obtiene las opciones de un campo select de una extensión
 */
router.get('/:tenantId/extensiones-contacto/:extensionId/campo-opciones', async (req, res) => {
  try {
    const { tenantId, extensionId } = req.params;
    const { campo } = req.query;

    if (!campo) {
      return res.status(400).json({ error: 'Campo es requerido' });
    }

    const result = await query(`
      SELECT campos_schema FROM catalogo_extensiones_contacto
      WHERE id = $1 AND (tenant_id IS NULL OR tenant_id = $2)
    `, [extensionId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Extensión no encontrada' });
    }

    const camposSchema = result.rows[0].campos_schema || [];
    const campoSchema = camposSchema.find((c: any) => c.campo === campo);

    if (!campoSchema) {
      return res.status(404).json({ error: 'Campo no encontrado' });
    }

    res.json({ opciones: campoSchema.opciones || [] });
  } catch (error: any) {
    console.error('Error en GET /campo-opciones:', error);
    res.status(500).json({ error: error.message || 'Error al obtener opciones' });
  }
});

// ==================== RUTAS: EXTENSIONES DE CONTACTO POR CONTACTO ====================

/**
 * GET /api/tenants/:tenantId/contactos/:contactoId/extensiones
 * Obtiene las extensiones asignadas a un contacto específico
 */
router.get('/:tenantId/contactos/:contactoId/extensiones', async (req, res) => {
  try {
    const { tenantId, contactoId } = req.params;

    const result = await query(`
      SELECT
        ce.*,
        c.codigo as extension_codigo,
        c.nombre as extension_nombre,
        c.icono as extension_icono,
        c.color as extension_color,
        c.campos_schema
      FROM contacto_extensiones ce
      JOIN catalogo_extensiones_contacto c ON c.id = ce.extension_id
      WHERE ce.tenant_id = $1 AND ce.contacto_id = $2 AND ce.activo = true
      ORDER BY c.orden, c.nombre
    `, [tenantId, contactoId]);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error en GET /contactos/:contactoId/extensiones:', error);
    res.status(500).json({ error: error.message || 'Error al obtener extensiones del contacto' });
  }
});

/**
 * POST /api/tenants/:tenantId/contactos/:contactoId/extensiones
 * Asigna una extensión a un contacto
 */
router.post('/:tenantId/contactos/:contactoId/extensiones', async (req, res) => {
  try {
    const { tenantId, contactoId } = req.params;
    const { extension_id, datos } = req.body;

    if (!extension_id) {
      return res.status(400).json({ error: 'extension_id es requerido' });
    }

    const result = await query(`
      INSERT INTO contacto_extensiones (tenant_id, contacto_id, extension_id, datos, activo)
      VALUES ($1, $2, $3, $4, true)
      ON CONFLICT (contacto_id, extension_id)
      DO UPDATE SET datos = $4, activo = true, updated_at = NOW()
      RETURNING *
    `, [tenantId, contactoId, extension_id, JSON.stringify(datos || {})]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error en POST /contactos/:contactoId/extensiones:', error);
    res.status(500).json({ error: error.message || 'Error al asignar extensión' });
  }
});

/**
 * PUT /api/tenants/:tenantId/contactos/:contactoId/extensiones/:extensionId
 * Actualiza los datos de una extensión de un contacto
 */
router.put('/:tenantId/contactos/:contactoId/extensiones/:extensionId', async (req, res) => {
  try {
    const { tenantId, contactoId, extensionId } = req.params;
    const { datos } = req.body;

    const result = await query(`
      UPDATE contacto_extensiones
      SET datos = $1, updated_at = NOW()
      WHERE tenant_id = $2 AND contacto_id = $3 AND extension_id = $4
      RETURNING *
    `, [JSON.stringify(datos || {}), tenantId, contactoId, extensionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Extensión no encontrada para este contacto' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error en PUT /contactos/:contactoId/extensiones/:extensionId:', error);
    res.status(500).json({ error: error.message || 'Error al actualizar extensión' });
  }
});

/**
 * DELETE /api/tenants/:tenantId/contactos/:contactoId/extensiones/:extensionId
 * Elimina (desactiva) una extensión de un contacto
 */
router.delete('/:tenantId/contactos/:contactoId/extensiones/:extensionId', async (req, res) => {
  try {
    const { tenantId, contactoId, extensionId } = req.params;

    const result = await query(`
      UPDATE contacto_extensiones
      SET activo = false, updated_at = NOW()
      WHERE tenant_id = $1 AND contacto_id = $2 AND extension_id = $3
      RETURNING id
    `, [tenantId, contactoId, extensionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Extensión no encontrada' });
    }

    res.json({ success: true, message: 'Extensión removida del contacto' });
  } catch (error: any) {
    console.error('Error en DELETE /contactos/:contactoId/extensiones/:extensionId:', error);
    res.status(500).json({ error: error.message || 'Error al eliminar extensión' });
  }
});

// ==================== RUTAS: CATALOGOS SEPARADOS CONTEOS ====================

/**
 * GET /api/tenants/:tenantId/catalogos-separados/conteos
 * Obtiene conteos de items en catálogos separados (tablas propias)
 */
router.get('/:tenantId/catalogos-separados/conteos', async (req, res) => {
  try {
    const { tenantId } = req.params;

    // Obtener conteos de varias tablas en paralelo
    const [
      extensionesResult,
      amenidadesResult,
      equiposResult,
      oficinasResult
    ] = await Promise.all([
      // Extensiones de contacto (globales + tenant)
      query(`
        SELECT COUNT(*) as count FROM catalogo_extensiones_contacto
        WHERE tenant_id IS NULL OR tenant_id = $1
      `, [tenantId]).catch(() => ({ rows: [{ count: 0 }] })),

      // Amenidades (globales + tenant)
      query(`
        SELECT COUNT(*) as count FROM amenidades
        WHERE tenant_id IS NULL OR tenant_id = $1
      `, [tenantId]).catch(() => ({ rows: [{ count: 0 }] })),

      // Equipos del tenant
      query(`
        SELECT COUNT(*) as count FROM equipos
        WHERE tenant_id = $1
      `, [tenantId]).catch(() => ({ rows: [{ count: 0 }] })),

      // Oficinas del tenant
      query(`
        SELECT COUNT(*) as count FROM oficinas
        WHERE tenant_id = $1
      `, [tenantId]).catch(() => ({ rows: [{ count: 0 }] }))
    ]);

    res.json({
      extensiones_contacto: parseInt(extensionesResult.rows[0]?.count || '0'),
      amenidades: parseInt(amenidadesResult.rows[0]?.count || '0'),
      equipos: parseInt(equiposResult.rows[0]?.count || '0'),
      oficinas: parseInt(oficinasResult.rows[0]?.count || '0')
    });
  } catch (error: any) {
    console.error('Error en GET /catalogos-separados/conteos:', error);
    res.status(500).json({ error: error.message || 'Error al obtener conteos' });
  }
});

// ==================== RUTAS: EQUIPOS ====================

/**
 * GET /api/tenants/:tenantId/equipos
 * Lista todos los equipos del tenant
 */
router.get('/:tenantId/equipos', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const activo = req.query.activo !== 'false';

    let queryStr = `
      SELECT e.*
      FROM equipos e
      WHERE e.tenant_id = $1
    `;

    if (activo) {
      queryStr += ` AND e.activo = true`;
    }

    queryStr += ` ORDER BY e.nombre`;

    const result = await query(queryStr, [tenantId]);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error en GET /equipos:', error);
    // Si la tabla no existe o error de columna, devolver array vacío
    if (error.code === '42P01' || error.code === '42703') {
      return res.json([]);
    }
    res.status(500).json({ error: error.message || 'Error al obtener equipos' });
  }
});

/**
 * GET /api/tenants/:tenantId/equipos/:equipoId
 * Obtiene un equipo específico con sus miembros
 */
router.get('/:tenantId/equipos/:equipoId', async (req, res) => {
  try {
    const { tenantId, equipoId } = req.params;

    const equipoResult = await query(`
      SELECT * FROM equipos
      WHERE id = $1 AND tenant_id = $2
    `, [equipoId, tenantId]);

    if (equipoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    res.json(equipoResult.rows[0]);
  } catch (error: any) {
    console.error('Error en GET /equipos/:equipoId:', error);
    if (error.code === '42P01' || error.code === '42703') {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }
    res.status(500).json({ error: error.message || 'Error al obtener equipo' });
  }
});

/**
 * POST /api/tenants/:tenantId/equipos
 * Crea un nuevo equipo
 */
router.post('/:tenantId/equipos', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { nombre, descripcion, color, icono } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    const result = await query(`
      INSERT INTO equipos (tenant_id, nombre, descripcion, color, icono, activo)
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING *
    `, [tenantId, nombre, descripcion || null, color || '#3b82f6', icono || 'Users']);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error en POST /equipos:', error);
    res.status(500).json({ error: error.message || 'Error al crear equipo' });
  }
});

/**
 * PUT /api/tenants/:tenantId/equipos/:equipoId
 * Actualiza un equipo
 */
router.put('/:tenantId/equipos/:equipoId', async (req, res) => {
  try {
    const { tenantId, equipoId } = req.params;
    const { nombre, descripcion, color, icono, activo } = req.body;

    const result = await query(`
      UPDATE equipos
      SET nombre = COALESCE($1, nombre),
          descripcion = COALESCE($2, descripcion),
          color = COALESCE($3, color),
          icono = COALESCE($4, icono),
          activo = COALESCE($5, activo),
          updated_at = NOW()
      WHERE id = $6 AND tenant_id = $7
      RETURNING *
    `, [nombre, descripcion, color, icono, activo, equipoId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error en PUT /equipos/:equipoId:', error);
    res.status(500).json({ error: error.message || 'Error al actualizar equipo' });
  }
});

/**
 * DELETE /api/tenants/:tenantId/equipos/:equipoId
 * Elimina (desactiva) un equipo
 */
router.delete('/:tenantId/equipos/:equipoId', async (req, res) => {
  try {
    const { tenantId, equipoId } = req.params;

    const result = await query(`
      UPDATE equipos
      SET activo = false, updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING id
    `, [equipoId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    res.json({ success: true, message: 'Equipo eliminado' });
  } catch (error: any) {
    console.error('Error en DELETE /equipos/:equipoId:', error);
    res.status(500).json({ error: error.message || 'Error al eliminar equipo' });
  }
});

// ==================== RUTAS: OFICINAS ====================

/**
 * GET /api/tenants/:tenantId/oficinas
 * Lista todas las oficinas del tenant
 */
router.get('/:tenantId/oficinas', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const activo = req.query.activo !== 'false';

    let queryStr = `
      SELECT o.*
      FROM oficinas o
      WHERE o.tenant_id = $1
    `;

    if (activo) {
      queryStr += ` AND o.activo = true`;
    }

    queryStr += ` ORDER BY o.nombre`;

    const result = await query(queryStr, [tenantId]);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error en GET /oficinas:', error);
    // Si la tabla no existe o error de columna, devolver array vacío
    if (error.code === '42P01' || error.code === '42703') {
      return res.json([]);
    }
    res.status(500).json({ error: error.message || 'Error al obtener oficinas' });
  }
});

/**
 * GET /api/tenants/:tenantId/oficinas/:oficinaId
 * Obtiene una oficina específica
 */
router.get('/:tenantId/oficinas/:oficinaId', async (req, res) => {
  try {
    const { tenantId, oficinaId } = req.params;

    const result = await query(`
      SELECT o.*
      FROM oficinas o
      WHERE o.id = $1 AND o.tenant_id = $2
    `, [oficinaId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Oficina no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error en GET /oficinas/:oficinaId:', error);
    if (error.code === '42P01' || error.code === '42703') {
      return res.status(404).json({ error: 'Oficina no encontrada' });
    }
    res.status(500).json({ error: error.message || 'Error al obtener oficina' });
  }
});

/**
 * POST /api/tenants/:tenantId/oficinas
 * Crea una nueva oficina
 */
router.post('/:tenantId/oficinas', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { nombre, direccion, ciudad, telefono, email } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    const result = await query(`
      INSERT INTO oficinas (tenant_id, nombre, direccion, ciudad, telefono, email, activo)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING *
    `, [tenantId, nombre, direccion || null, ciudad || null, telefono || null, email || null]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error en POST /oficinas:', error);
    res.status(500).json({ error: error.message || 'Error al crear oficina' });
  }
});

/**
 * PUT /api/tenants/:tenantId/oficinas/:oficinaId
 * Actualiza una oficina
 */
router.put('/:tenantId/oficinas/:oficinaId', async (req, res) => {
  try {
    const { tenantId, oficinaId } = req.params;
    const { nombre, direccion, ciudad, telefono, email, activo } = req.body;

    const result = await query(`
      UPDATE oficinas
      SET nombre = COALESCE($1, nombre),
          direccion = COALESCE($2, direccion),
          ciudad = COALESCE($3, ciudad),
          telefono = COALESCE($4, telefono),
          email = COALESCE($5, email),
          activo = COALESCE($6, activo),
          updated_at = NOW()
      WHERE id = $7 AND tenant_id = $8
      RETURNING *
    `, [nombre, direccion, ciudad, telefono, email, activo, oficinaId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Oficina no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error en PUT /oficinas/:oficinaId:', error);
    res.status(500).json({ error: error.message || 'Error al actualizar oficina' });
  }
});

/**
 * DELETE /api/tenants/:tenantId/oficinas/:oficinaId
 * Elimina (desactiva) una oficina
 */
router.delete('/:tenantId/oficinas/:oficinaId', async (req, res) => {
  try {
    const { tenantId, oficinaId } = req.params;

    const result = await query(`
      UPDATE oficinas
      SET activo = false, updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING id
    `, [oficinaId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Oficina no encontrada' });
    }

    res.json({ success: true, message: 'Oficina eliminada' });
  } catch (error: any) {
    console.error('Error en DELETE /oficinas/:oficinaId:', error);
    res.status(500).json({ error: error.message || 'Error al eliminar oficina' });
  }
});

// ==================== RUTAS: DATOS DINÁMICOS ====================

/**
 * Montar router de datos dinámicos como ruta anidada
 * Esto crea las rutas: /api/tenants/:tenantId/dynamic-data/:tipo
 */
router.use('/:tenantId/dynamic-data', dynamicDataRouter);

export default router;

