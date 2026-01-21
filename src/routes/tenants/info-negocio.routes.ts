/**
 * MÓDULO DE INFO NEGOCIO - Rutas para información del negocio
 *
 * Este módulo maneja la información general del negocio del tenant.
 * Los datos se almacenan en la columna info_negocio (JSONB) de la tabla tenants.
 */

import express, { Request, Response, NextFunction } from 'express';
import { query } from '../../utils/db.js';

const router = express.Router({ mergeParams: true });

// Tipo para request con tenantId del parent router
interface TenantParams { tenantId: string }

// Estructura por defecto de info negocio
const defaultInfoNegocio = {
  nombre: '',
  nombre_traducciones: null,
  slogan: null,
  slogan_traducciones: null,
  descripcion: null,
  descripcion_traducciones: null,
  logo_url: null,
  isotipo_url: null,
  favicon_url: null,
  telefono_principal: null,
  telefono_secundario: null,
  whatsapp: null,
  email_principal: null,
  email_ventas: null,
  email_soporte: null,
  direccion: null,
  ciudad: null,
  estado_provincia: null,
  codigo_postal: null,
  pais: null,
  horario_atencion: null,
  facebook_url: null,
  instagram_url: null,
  twitter_url: null,
  linkedin_url: null,
  youtube_url: null,
  tiktok_url: null,
  rnc: null,
  razon_social: null,
  tipo_empresa: null,
  ceo_nombre: null,
  ceo_cargo: null,
  ceo_foto_url: null,
  ceo_bio: null,
  ceo_bio_traducciones: null,
};

/**
 * GET /api/tenants/:tenantId/info-negocio
 * Obtiene la información del negocio del tenant
 */
router.get('/', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;

    const result = await query(
      `SELECT id, nombre, info_negocio, created_at, updated_at
       FROM tenants
       WHERE id = $1`,
      [tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant no encontrado' });
    }

    const tenant = result.rows[0];
    const infoNegocio = tenant.info_negocio || {};

    // Combinar con el nombre del tenant y estructura por defecto
    const response = {
      id: tenant.id,
      tenant_id: tenant.id,
      ...defaultInfoNegocio,
      ...infoNegocio,
      nombre: infoNegocio.nombre || tenant.nombre,
      created_at: tenant.created_at,
      updated_at: tenant.updated_at,
    };

    res.json({ infoNegocio: response });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/tenants/:tenantId/info-negocio
 * Actualiza parcialmente la información del negocio
 */
router.patch('/', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const updates = req.body;

    // Primero obtener el info_negocio actual
    const currentResult = await query(
      `SELECT info_negocio FROM tenants WHERE id = $1`,
      [tenantId]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant no encontrado' });
    }

    const currentInfo = currentResult.rows[0].info_negocio || {};

    // Combinar con los nuevos valores
    const newInfoNegocio = {
      ...currentInfo,
      ...updates,
    };

    // Actualizar en la base de datos
    const result = await query(
      `UPDATE tenants
       SET info_negocio = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING id, nombre, info_negocio, created_at, updated_at`,
      [tenantId, JSON.stringify(newInfoNegocio)]
    );

    const tenant = result.rows[0];
    const response = {
      id: tenant.id,
      tenant_id: tenant.id,
      ...defaultInfoNegocio,
      ...tenant.info_negocio,
      nombre: tenant.info_negocio?.nombre || tenant.nombre,
      created_at: tenant.created_at,
      updated_at: tenant.updated_at,
    };

    res.json({ infoNegocio: response });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/info-negocio
 * Reemplaza completamente la información del negocio
 */
router.put('/', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const newInfoNegocio = req.body;

    const result = await query(
      `UPDATE tenants
       SET info_negocio = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING id, nombre, info_negocio, created_at, updated_at`,
      [tenantId, JSON.stringify(newInfoNegocio)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant no encontrado' });
    }

    const tenant = result.rows[0];
    const response = {
      id: tenant.id,
      tenant_id: tenant.id,
      ...defaultInfoNegocio,
      ...tenant.info_negocio,
      nombre: tenant.info_negocio?.nombre || tenant.nombre,
      created_at: tenant.created_at,
      updated_at: tenant.updated_at,
    };

    res.json({ infoNegocio: response });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// ASESOR DEFAULT
// ============================================================================

/**
 * GET /api/tenants/:tenantId/info-negocio/asesor-default
 * Obtiene el asesor por defecto del tenant con sus datos completos
 */
router.get('/asesor-default', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;

    const result = await query(
      `SELECT
        t.asesor_default_id,
        pa.id as perfil_id,
        pa.slug,
        pa.titulo_profesional,
        pa.foto_url,
        pa.whatsapp,
        pa.telefono_directo,
        u.id as usuario_id,
        u.nombre,
        u.apellido,
        u.email
      FROM tenants t
      LEFT JOIN perfiles_asesor pa ON t.asesor_default_id = pa.id
      LEFT JOIN usuarios u ON pa.usuario_id = u.id
      WHERE t.id = $1`,
      [tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant no encontrado' });
    }

    const row = result.rows[0];

    // Si no hay asesor default configurado
    if (!row.asesor_default_id) {
      return res.json({ asesorDefault: null });
    }

    res.json({
      asesorDefault: {
        id: row.perfil_id,
        usuario_id: row.usuario_id,
        slug: row.slug,
        nombre: row.nombre,
        apellido: row.apellido,
        nombre_completo: `${row.nombre || ''} ${row.apellido || ''}`.trim(),
        email: row.email,
        titulo_profesional: row.titulo_profesional,
        foto_url: row.foto_url,
        whatsapp: row.whatsapp,
        telefono_directo: row.telefono_directo,
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/info-negocio/asesores-disponibles
 * Lista todos los asesores activos del tenant para seleccionar como default
 */
router.get('/asesores-disponibles', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;

    const result = await query(
      `SELECT
        pa.id,
        pa.slug,
        pa.titulo_profesional,
        pa.foto_url,
        u.nombre,
        u.apellido,
        u.email
      FROM perfiles_asesor pa
      INNER JOIN usuarios u ON pa.usuario_id = u.id
      WHERE pa.tenant_id = $1
        AND pa.activo = true
        AND pa.visible_en_web = true
        AND u.activo = true
      ORDER BY u.nombre, u.apellido`,
      [tenantId]
    );

    const asesores = result.rows.map(row => ({
      id: row.id,
      slug: row.slug,
      nombre: row.nombre,
      apellido: row.apellido,
      nombre_completo: `${row.nombre || ''} ${row.apellido || ''}`.trim(),
      email: row.email,
      titulo_profesional: row.titulo_profesional,
      foto_url: row.foto_url,
    }));

    res.json({ asesores });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/tenants/:tenantId/info-negocio/asesor-default
 * Actualiza el asesor por defecto del tenant
 */
router.patch('/asesor-default', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { asesor_id } = req.body;

    if (!asesor_id) {
      return res.status(400).json({ error: 'Se requiere asesor_id' });
    }

    // Verificar que el asesor existe, está activo y pertenece al tenant
    const asesorCheck = await query(
      `SELECT pa.id
       FROM perfiles_asesor pa
       INNER JOIN usuarios u ON pa.usuario_id = u.id
       WHERE pa.id = $1
         AND pa.tenant_id = $2
         AND pa.activo = true
         AND u.activo = true`,
      [asesor_id, tenantId]
    );

    if (asesorCheck.rows.length === 0) {
      return res.status(400).json({
        error: 'El asesor seleccionado no existe, no está activo o no pertenece a este tenant'
      });
    }

    // Actualizar el asesor default
    await query(
      `UPDATE tenants SET asesor_default_id = $1, updated_at = NOW() WHERE id = $2`,
      [asesor_id, tenantId]
    );

    // Devolver el asesor actualizado con sus datos completos
    const result = await query(
      `SELECT
        pa.id as perfil_id,
        pa.slug,
        pa.titulo_profesional,
        pa.foto_url,
        pa.whatsapp,
        pa.telefono_directo,
        u.id as usuario_id,
        u.nombre,
        u.apellido,
        u.email
      FROM perfiles_asesor pa
      INNER JOIN usuarios u ON pa.usuario_id = u.id
      WHERE pa.id = $1`,
      [asesor_id]
    );

    const row = result.rows[0];

    res.json({
      asesorDefault: {
        id: row.perfil_id,
        usuario_id: row.usuario_id,
        slug: row.slug,
        nombre: row.nombre,
        apellido: row.apellido,
        nombre_completo: `${row.nombre || ''} ${row.apellido || ''}`.trim(),
        email: row.email,
        titulo_profesional: row.titulo_profesional,
        foto_url: row.foto_url,
        whatsapp: row.whatsapp,
        telefono_directo: row.telefono_directo,
      },
      message: 'Asesor por defecto actualizado correctamente'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
