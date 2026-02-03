/**
 * Rutas públicas (sin autenticación)
 *
 * Endpoints para acceder a información pública de tenants
 * para landing pages personalizadas.
 */

import express, { Request, Response, NextFunction } from 'express';
import { query } from '../utils/db.js';
import { getTenantBySlug } from '../services/tenantsService.js';
import { createJoinRequest } from '../services/clicConnectSolicitudesService.js';

const router = express.Router();

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
      },
    });
  } catch (error) {
    console.error('❌ Error en GET /api/public/tenants/:slug:', error);
    next(error);
  }
});

/**
 * POST /api/public/tenants/:slug/join-request
 *
 * Crea una solicitud para unirse a un tenant.
 * No requiere autenticación.
 */
router.post('/tenants/:slug/join-request', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const { nombre, apellido, email, telefono, motivacion } = req.body;

    console.log(`🌐 POST /api/public/tenants/${slug}/join-request`);

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

    // Verificar si ya existe una solicitud pendiente con este email para este tenant
    const existingRequest = await query(
      `SELECT id, estado FROM clic_connect_join_requests
       WHERE tenant_id = $1 AND email = $2 AND estado = 'pending'`,
      [tenant.id, email.toLowerCase()]
    );

    if (existingRequest.rows.length > 0) {
      return res.status(409).json({
        error: 'Solicitud duplicada',
        message: 'Ya existe una solicitud pendiente con este email. Te contactaremos pronto.',
      });
    }

    // Crear la solicitud usando el servicio existente
    const joinRequest = await createJoinRequest(tenant.id, {
      nombre,
      apellido: apellido || undefined,
      email: email.toLowerCase(),
      telefono: telefono || undefined,
      motivacion: motivacion || undefined,
    });

    console.log(`✅ Solicitud de acceso creada: ${joinRequest.id}`);

    res.status(201).json({
      success: true,
      message: 'Tu solicitud ha sido enviada. El administrador te contactará pronto.',
      requestId: joinRequest.id,
    });
  } catch (error) {
    console.error('❌ Error en POST /api/public/tenants/:slug/join-request:', error);
    next(error);
  }
});

export default router;
