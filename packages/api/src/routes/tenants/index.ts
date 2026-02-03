/**
 * MÓDULO DE RUTAS DE TENANTS - ARQUITECTURA MODULAR (SIN LEGACY)
 *
 * Este archivo actúa como el enrutador principal para todas las rutas
 * relacionadas con tenants. Usa arquitectura modular pura:
 *
 * - Cada módulo está aislado
 * - Un error en un módulo NO afecta a otros módulos
 * - NO hay fallback a legacy - si una ruta falla, devuelve 404
 *
 * RUTAS NO MIGRADAS (devolverán 404):
 * - /properties/:propertyId (público)
 * - /resolve, /tema, /pages/:slug
 */

import express, { Request, Response, NextFunction } from 'express';
import { getTasasCambio, updateTasasCambio } from '../../services/tasasCambioService.js';
import { resolveUserScope } from '../../middleware/scopeResolver.js';

// Importar sub-routers modulares - CRM Core
import contactosRouter from './contactos.routes.js';
import propiedadesRouter from './propiedades.routes.js';
import solicitudesRouter from './solicitudes.routes.js';
import actividadesRouter from './actividades.routes.js';
import propuestasRouter from './propuestas.routes.js';
import planesPagoRouter from './planes-pago.routes.js';
import metasRouter from './metas.routes.js';

// Importar sub-routers modulares - Ventas y Sistema de Fases
import ventasRouter from './ventas.routes.js';
import estadosVentaRouter from './estados-venta.routes.js';
import sistemaFasesRouter from './sistema-fases.routes.js';
import productividadRouter from './productividad.routes.js';

// Importar sub-routers modulares - Contenido y Páginas
import contenidoRouter from './contenido.routes.js';
import paginasRouter from './paginas.routes.js';
import uploadRouter from './upload.routes.js';

// Importar sub-routers modulares - Organización
import equiposRouter from './equipos.routes.js';
import oficinasRouter from './oficinas.routes.js';
import usuariosRouter from './usuarios.routes.js';
import rolesRouter from './roles.routes.js';

// Importar sub-routers modulares - Configuración
import configuracionRouter from './configuracion.routes.js';
import catalogosRouter from './catalogos.routes.js';
import catalogosSeparadosRouter from './catalogos-separados.routes.js';
import componentesRouter from './componentes.routes.js';
import clicConnectRouter from './clic-connect.routes.js';
import joinRequestsRouter from './join-requests.routes.js';
import upgradeRequestsRouter from './upgrade-requests.routes.js';
import registrationRequestsRouter from './registration-requests.routes.js';

// Importar sub-routers modulares - Rutas específicas del tenant
import amenidadesRouter from './amenidades.routes.js';
import idiomasRouter from './idiomas.routes.js';
import comisionConfigRouter from './comision-config.routes.js';
import extensionesContactoRouter from './extensiones-contacto.routes.js';
import infoNegocioRouter from './info-negocio.routes.js';
import universityRouter from './university.routes.js';
import miEntrenamientoRouter from './miEntrenamiento.routes.js';
import plantillasComisionRouter from './plantillasComision.routes.js';
import documentosRequeridosRouter from './documentos-requeridos.routes.js';
import comisionesRouter from './comisiones.routes.js';
import apiCredentialsRouter from './api-credentials.routes.js';

// Importar sub-routers modulares - Mensajería
import mensajeriaRouter from './mensajeria.routes.js';
import mensajeriaEmailRouter from './mensajeria-email.routes.js';
import mensajeriaWhatsappRouter from './mensajeria-whatsapp.routes.js';
import mensajeriaWebchatRouter from './mensajeria-webchat.routes.js';

// Importar sub-routers modulares - Documentos
import bibliotecaRouter from './biblioteca.routes.js';
import plantillasDocumentosRouter from './plantillas-documentos.routes.js';

const router = express.Router();

// ============================================================================
// MÓDULOS ACTIVOS - Rutas aisladas
// ============================================================================

// CRM Core Modules (scope resolution handled inside each sub-router via mergeParams)
router.use('/:tenantId/contactos', contactosRouter);
router.use('/:tenantId/propiedades', propiedadesRouter);
router.use('/:tenantId/solicitudes', solicitudesRouter);
router.use('/:tenantId/actividades', actividadesRouter);
router.use('/:tenantId/propuestas', propuestasRouter);
router.use('/:tenantId/planes-pago', planesPagoRouter);
router.use('/:tenantId/metas', metasRouter);

// Ventas Module (incluye ventas-stats)
router.use('/:tenantId/ventas', ventasRouter);

// Estados de Venta Module (ruta separada para compatibilidad con frontend)
router.use('/:tenantId/estados-venta', estadosVentaRouter);

// Sistema de Fases Module
router.use('/:tenantId/sistema-fases', sistemaFasesRouter);

// Productividad Module
router.use('/:tenantId/productividad', productividadRouter);

// Contenido Module (articulos, videos, faqs, testimonios, tags)
router.use('/:tenantId/contenido', contenidoRouter);

// Páginas Module
router.use('/:tenantId/paginas', paginasRouter);

// Upload Module
router.use('/:tenantId/upload', uploadRouter);

// Organization Modules
router.use('/:tenantId/equipos', equiposRouter);
router.use('/:tenantId/oficinas', oficinasRouter);
router.use('/:tenantId/usuarios', usuariosRouter);
router.use('/:tenantId/roles', rolesRouter);

// Configuration Modules
router.use('/:tenantId/configuracion', configuracionRouter);
router.use('/:tenantId/catalogos', catalogosRouter);
router.use('/:tenantId/catalogos-separados', catalogosSeparadosRouter);

// Web Components Module (tema, componentes, resolve)
router.use('/:tenantId', componentesRouter);

// CLIC Connect Module
router.use('/:tenantId/clic-connect', clicConnectRouter);

// Join Requests Module (CLIC Connect solicitudes de unión)
router.use('/:tenantId/join-requests', joinRequestsRouter);

// Upgrade Requests Module (CLIC Connect solicitudes de upgrade)
router.use('/:tenantId/upgrade-requests', upgradeRequestsRouter);

// Registration Requests Module (solicitudes de registro públicas)
router.use('/:tenantId/registration-requests', registrationRequestsRouter);

// University Module (cursos, videos, certificados)
router.use('/:tenantId/university', universityRouter);

// Mi Entrenamiento Module (cursos para usuarios)
router.use('/:tenantId/mi-entrenamiento', miEntrenamientoRouter);

// Tenant-specific Modules (rutas directas del frontend)
router.use('/:tenantId/amenidades', amenidadesRouter);
router.use('/:tenantId/idiomas', idiomasRouter);
router.use('/:tenantId/comision-config', comisionConfigRouter);
router.use('/:tenantId/extensiones-contacto', extensionesContactoRouter);
router.use('/:tenantId/info-negocio', infoNegocioRouter);

// Finanzas Module (plantillas de comisión, distribución empresa)
router.use('/:tenantId/finanzas', plantillasComisionRouter);

// Documentos Requeridos Module (expediente de ventas y alquileres)
router.use('/:tenantId/documentos-requeridos', documentosRequeridosRouter);

// Comisiones Module (listado y resumen de comisiones optimizado)
router.use('/:tenantId/comisiones', comisionesRouter);

// API Credentials Module (integraciones externas: Google, Meta, Email)
router.use('/:tenantId/api-credentials', apiCredentialsRouter);

// Mensajería Module (conversaciones, mensajes, etiquetas, firmas)
router.use('/:tenantId/mensajeria', mensajeriaRouter);

// Mensajería Email Module (credentials, IMAP/SMTP, inbox, send/reply)
router.use('/:tenantId/mensajeria-email', mensajeriaEmailRouter);

// Mensajería WhatsApp Module (credentials, templates, business profile)
router.use('/:tenantId/mensajeria-whatsapp', mensajeriaWhatsappRouter);

// Mensajería Web Chat Module (config, agents, availability, visitor messages)
router.use('/:tenantId/mensajeria-webchat', mensajeriaWebchatRouter);

// Biblioteca Module (documentos compartidos, categorías, versiones, confirmaciones)
router.use('/:tenantId/biblioteca', bibliotecaRouter);

// Plantillas de Documentos Module (plantillas, documentos generados)
router.use('/:tenantId/documentos', plantillasDocumentosRouter);

// ============================================================================
// RUTAS DIRECTAS (sin sub-router)
// ============================================================================

interface TenantParams { tenantId: string }

/**
/**
 * GET /api/tenants/:tenantId/expediente-requerimientos (LEGACY - compatibilidad)
 * Redirige al nuevo endpoint documentos-requeridos
 */
router.get('/:tenantId/expediente-requerimientos', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
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
 * GET /api/tenants/:tenantId/tasas-cambio
 * Obtiene las tasas de cambio del tenant
 */
router.get('/:tenantId/tasas-cambio', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const tasas = await getTasasCambio(tenantId);
    res.json(tasas);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/tasas-cambio
 * Actualiza las tasas de cambio del tenant
 */
router.put('/:tenantId/tasas-cambio', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { tasas, actualizadoPor } = req.body;
    const result = await updateTasasCambio(tenantId, tasas, actualizadoPor);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// DIAGNÓSTICO DE SCOPE (temporal)
// ============================================================================

/**
 * GET /api/tenants/:tenantId/debug-scope
 * Endpoint de diagnóstico para verificar resolución de scope
 */
router.get('/:tenantId/debug-scope', resolveUserScope, async (req: any, res: any) => {
  res.json({
    hasScope: !!req.scope,
    scope: req.scope ? {
      dbUserId: req.scope.dbUserId,
      tenantId: req.scope.tenantId,
      isPlatformAdmin: req.scope.isPlatformAdmin,
      alcancesCount: Object.keys(req.scope.alcances).length,
      alcances: req.scope.alcances,
    } : null,
    params: req.params,
    hasAuthHeader: !!req.headers.authorization,
  });
});

// ============================================================================
// NO HAY LEGACY FALLBACK - Las rutas no migradas devolverán 404
// ============================================================================

export default router;
