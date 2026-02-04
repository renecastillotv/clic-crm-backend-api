/**
 * Rutas públicas (sin autenticación)
 *
 * Endpoints para acceder a información pública de tenants
 * para landing pages personalizadas.
 *
 * @version 1.0.0
 */

import express, { Request, Response, NextFunction } from 'express';
import { query } from '../utils/db.js';
import { getTenantBySlug } from '../services/tenantsService.js';
import {
  createRegistrationRequest,
  checkDuplicateRequest,
} from '../services/registrationRequestsService.js';

const router = express.Router();

/**
 * GET /api/public/stats
 *
 * Obtiene estadísticas públicas de la plataforma para la landing page.
 * No requiere autenticación.
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Contar tenants activos
    const tenantsResult = await query(
      `SELECT COUNT(*) FROM tenants WHERE activo = true`
    );
    const totalTenants = parseInt(tenantsResult.rows[0].count, 10);

    // Contar usuarios activos
    const usersResult = await query(
      `SELECT COUNT(*) FROM usuarios WHERE activo = true`
    );
    const totalUsers = parseInt(usersResult.rows[0].count, 10);

    // Contar propiedades
    const propertiesResult = await query(
      `SELECT COUNT(*) FROM propiedades WHERE activo = true`
    );
    const totalProperties = parseInt(propertiesResult.rows[0].count, 10);

    res.json({
      tenants: totalTenants,
      users: totalUsers,
      properties: totalProperties,
    });
  } catch (error) {
    console.error('❌ Error en GET /api/public/stats:', error);
    next(error);
  }
});

/**
 * GET /api/public/tenants/:slug
 *
 * Obtiene información pública de un tenant para mostrar en landing page.
 * No requiere autenticación.
 */
router.get('/tenants/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;

    console.log(`🌐 GET /api/public/tenants/${slug}`);

    // Obtener tenant básico
    const tenant = await getTenantBySlug(slug);

    if (!tenant) {
      return res.status(404).json({
        error: 'Tenant no encontrado',
        message: `No existe un tenant con el slug "${slug}"`,
      });
    }

    // Obtener info_negocio del tenant
    const infoResult = await query(
      `SELECT info_negocio FROM tenants WHERE id = $1`,
      [tenant.id]
    );

    const infoNegocio = infoResult.rows[0]?.info_negocio || {};

    // Retornar solo campos públicos
    res.json({
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        nombre: tenant.nombre,
        activo: tenant.activo,
      },
      infoNegocio: {
        nombre: infoNegocio.nombre || tenant.nombre,
        slogan: infoNegocio.slogan || null,
        slogan_traducciones: infoNegocio.slogan_traducciones || null,
        descripcion: infoNegocio.descripcion || null,
        descripcion_traducciones: infoNegocio.descripcion_traducciones || null,
        logo_url: infoNegocio.logo_url || null,
        isotipo_url: infoNegocio.isotipo_url || null,
        telefono_principal: infoNegocio.telefono_principal || null,
        whatsapp: infoNegocio.whatsapp || null,
        email_principal: infoNegocio.email_principal || null,
        facebook_url: infoNegocio.facebook_url || null,
        instagram_url: infoNegocio.instagram_url || null,
        twitter_url: infoNegocio.twitter_url || null,
        linkedin_url: infoNegocio.linkedin_url || null,
        youtube_url: infoNegocio.youtube_url || null,
        tiktok_url: infoNegocio.tiktok_url || null,
        color_primario: infoNegocio.color_primario || null,
      },
    });
  } catch (error) {
    console.error('❌ Error en GET /api/public/tenants/:slug:', error);
    next(error);
  }
});

/**
 * POST /api/public/tenants/:slug/registro
 *
 * Crea una solicitud de registro para un tenant.
 * Soporta diferentes tipos de solicitud según el tenant.
 * No requiere autenticación.
 */
router.post('/tenants/:slug/registro', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const {
      nombre,
      apellido,
      email,
      telefono,
      tipo_solicitud = 'usuario',
      datos_adicionales = {},
      // Campos legacy para compatibilidad
      motivacion,
    } = req.body;

    console.log(`🌐 POST /api/public/tenants/${slug}/registro [tipo: ${tipo_solicitud}]`);

    // Validar campos requeridos
    if (!nombre || !email) {
      return res.status(400).json({
        error: 'Campos requeridos faltantes',
        message: 'Se requiere nombre y email',
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Email inválido',
        message: 'El formato del email no es válido',
      });
    }

    // Obtener tenant
    const tenant = await getTenantBySlug(slug);

    if (!tenant) {
      return res.status(404).json({
        error: 'Tenant no encontrado',
        message: `No existe un tenant con el slug "${slug}"`,
      });
    }

    // Verificar si ya existe una solicitud pendiente
    const existingRequest = await checkDuplicateRequest(
      tenant.id,
      email,
      tipo_solicitud
    );

    if (existingRequest) {
      return res.status(409).json({
        error: 'Solicitud duplicada',
        message: 'Ya existe una solicitud pendiente con este email. Te contactaremos pronto.',
      });
    }

    // Preparar datos del formulario (incluir motivación si viene del form legacy)
    const datosFormulario = {
      ...datos_adicionales,
      ...(motivacion && { motivacion }),
    };

    // Crear la solicitud
    const request = await createRegistrationRequest(tenant.id, {
      nombre,
      apellido,
      email,
      telefono,
      tipo_solicitud,
      datos_formulario: datosFormulario,
    });

    console.log(`✅ Solicitud de registro creada: ${request.id} [tipo: ${tipo_solicitud}]`);

    res.status(201).json({
      success: true,
      message: 'Tu solicitud ha sido enviada. El administrador te contactará pronto.',
      requestId: request.id,
    });
  } catch (error) {
    console.error('❌ Error en POST /api/public/tenants/:slug/registro:', error);
    next(error);
  }
});

// Alias para compatibilidad con el endpoint anterior
router.post('/tenants/:slug/join-request', async (req: Request, res: Response, next: NextFunction) => {
  // Redirigir internamente al nuevo endpoint
  req.url = req.url.replace('/join-request', '/registro');
  req.body.tipo_solicitud = req.body.tipo_solicitud || 'usuario';

  // Forward to the registro handler
  const { slug } = req.params;
  const {
    nombre,
    apellido,
    email,
    telefono,
    motivacion,
  } = req.body;

  try {
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return res.status(404).json({
        error: 'Tenant no encontrado',
        message: `No existe un tenant con el slug "${slug}"`,
      });
    }

    if (!nombre || !email) {
      return res.status(400).json({
        error: 'Campos requeridos faltantes',
        message: 'Se requiere nombre y email',
      });
    }

    const existingRequest = await checkDuplicateRequest(tenant.id, email, 'usuario');
    if (existingRequest) {
      return res.status(409).json({
        error: 'Solicitud duplicada',
        message: 'Ya existe una solicitud pendiente con este email.',
      });
    }

    const request = await createRegistrationRequest(tenant.id, {
      nombre,
      apellido,
      email,
      telefono,
      tipo_solicitud: 'usuario',
      datos_formulario: motivacion ? { motivacion } : {},
    });

    res.status(201).json({
      success: true,
      message: 'Tu solicitud ha sido enviada. El administrador te contactará pronto.',
      requestId: request.id,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
