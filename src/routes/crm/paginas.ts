import { Router, Request, Response } from 'express';
import * as paginasService from '../../services/crm/paginasService.js';

const router = Router();

/**
 * Rutas del CRM para gestión de páginas
 * Compatible con arquitectura refactorizada (migraciones 073-077)
 */

// ========================================
// 1. LISTAR PÁGINAS
// ========================================
router.get('/tenants/:tenantId/paginas', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const paginas = await paginasService.listarPaginasService(tenantId);

    res.json({
      success: true,
      data: paginas,
    });
  } catch (error: any) {
    console.error('Error listando páginas:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========================================
// 2. OBTENER PÁGINA POR ID
// ========================================
router.get('/tenants/:tenantId/paginas/:paginaId', async (req: Request, res: Response) => {
  try {
    const { tenantId, paginaId } = req.params;
    const pagina = await paginasService.obtenerPaginaService(tenantId, paginaId);

    if (!pagina) {
      return res.status(404).json({
        success: false,
        error: 'Página no encontrada',
      });
    }

    res.json({
      success: true,
      data: pagina,
    });
  } catch (error: any) {
    console.error('Error obteniendo página:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========================================
// 3. OBTENER EDITOR POR TIPO DE PÁGINA (código)
// ========================================
router.get('/tenants/:tenantId/tipos-pagina/:tipoPaginaCodigo/editor', async (req: Request, res: Response) => {
  try {
    const { tenantId: tenantIdOrSlug, tipoPaginaCodigo } = req.params;

    // Resolver tenant por ID o slug
    const { getTenantByIdOrSlug } = await import('../../services/tenantsService.js');
    const tenant = await getTenantByIdOrSlug(tenantIdOrSlug);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant no encontrado',
      });
    }
    const tenantId = tenant.id;

    const editor = await paginasService.obtenerEditorPorTipoService(tenantId, tipoPaginaCodigo);

    if (!editor) {
      return res.status(404).json({
        success: false,
        error: `No existe una página del tipo "${tipoPaginaCodigo}" para este tenant`,
      });
    }

    res.json({
      success: true,
      data: editor,
    });
  } catch (error: any) {
    console.error('Error obteniendo editor por tipo de página:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========================================
// 4. REORDENAR COMPONENTES POR TIPO DE PÁGINA
// (debe ir ANTES de :relacionId para que Express no confunda "reordenar" como un ID)
// ========================================
router.post('/tenants/:tenantId/tipos-pagina/:tipoPaginaCodigo/componentes/reordenar', async (req: Request, res: Response) => {
  try {
    const { tenantId: tenantIdOrSlug, tipoPaginaCodigo } = req.params;
    const { orden } = req.body;

    // Resolver tenant por ID o slug
    const { getTenantByIdOrSlug } = await import('../../services/tenantsService.js');
    const tenant = await getTenantByIdOrSlug(tenantIdOrSlug);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant no encontrado',
      });
    }
    const tenantId = tenant.id;

    // Buscar la página por tipo para obtener el tipo_pagina_id
    const pagina = await paginasService.obtenerPaginaPorTipoService(tenantId, tipoPaginaCodigo);
    if (!pagina) {
      return res.status(404).json({
        success: false,
        error: `No existe una página del tipo "${tipoPaginaCodigo}" para este tenant`,
      });
    }

    if (!orden || !Array.isArray(orden)) {
      return res.status(400).json({
        success: false,
        error: 'Falta campo requerido: orden (array)',
      });
    }

    console.log('📦 Reordenando componentes para tipo de página:', tipoPaginaCodigo);
    console.log('📦 tipo_pagina_id:', pagina.tipo_pagina_id);
    console.log('📦 orden recibido:', orden);

    // Usar el nuevo servicio para reordenar componentes del tipo de página (heredados)
    await paginasService.reordenarComponentesTipoPaginaService(tenantId, pagina.tipo_pagina_id, { orden });

    res.json({
      success: true,
      message: 'Componentes reordenados correctamente',
    });
  } catch (error: any) {
    console.error('Error reordenando componentes por tipo:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========================================
// 5. AGREGAR COMPONENTE A PÁGINA POR TIPO
// ========================================
router.post('/tenants/:tenantId/tipos-pagina/:tipoPaginaCodigo/componentes', async (req: Request, res: Response) => {
  try {
    const { tenantId: tenantIdOrSlug, tipoPaginaCodigo } = req.params;
    // Aceptar tanto componente_id como componente_catalogo_id (el frontend usa componente_catalogo_id)
    const { componente_id, componente_catalogo_id, orden } = req.body;
    const componenteId = componente_id || componente_catalogo_id;

    // Resolver tenant por ID o slug
    const { getTenantByIdOrSlug } = await import('../../services/tenantsService.js');
    const tenant = await getTenantByIdOrSlug(tenantIdOrSlug);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant no encontrado',
      });
    }
    const tenantId = tenant.id;

    // Buscar la página por tipo
    const pagina = await paginasService.obtenerPaginaPorTipoService(tenantId, tipoPaginaCodigo);
    if (!pagina) {
      return res.status(404).json({
        success: false,
        error: `No existe una página del tipo "${tipoPaginaCodigo}" para este tenant`,
      });
    }

    if (!componenteId) {
      return res.status(400).json({
        success: false,
        error: 'Falta campo requerido: componente_id o componente_catalogo_id',
      });
    }

    const relacion = await paginasService.agregarComponenteService(tenantId, pagina.id, {
      componente_id: componenteId,
      orden,
    });

    res.status(201).json({
      success: true,
      data: relacion,
    });
  } catch (error: any) {
    console.error('Error agregando componente por tipo:', error);

    if (error.code === '23505' && error.constraint === 'paginas_componentes_pagina_id_componente_id_unique') {
      return res.status(409).json({
        success: false,
        error: 'Este componente ya está agregado a la página',
      });
    }

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========================================
// 6. ACTUALIZAR COMPONENTE POR TIPO DE PÁGINA (heredado)
// ========================================
router.patch('/tenants/:tenantId/tipos-pagina/:tipoPaginaCodigo/componentes/:componenteId', async (req: Request, res: Response) => {
  try {
    const { tenantId: tenantIdOrSlug, tipoPaginaCodigo, componenteId } = req.params;
    const { config_override, activo } = req.body;

    console.log('📝 Actualizando componente heredado:', { tipoPaginaCodigo, componenteId, config_override });

    // Resolver tenant por ID o slug
    const { getTenantByIdOrSlug } = await import('../../services/tenantsService.js');
    const tenant = await getTenantByIdOrSlug(tenantIdOrSlug);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant no encontrado',
      });
    }
    const tenantId = tenant.id;

    // Buscar la página por tipo para obtener el tipo_pagina_id
    const pagina = await paginasService.obtenerPaginaPorTipoService(tenantId, tipoPaginaCodigo);
    if (!pagina) {
      return res.status(404).json({
        success: false,
        error: `No existe una página del tipo "${tipoPaginaCodigo}" para este tenant`,
      });
    }

    // Estructurar los datos en el formato esperado: { static_data: {...}, toggles: {}, styles: {} }
    // El frontend envía un objeto plano, lo envolvemos en static_data
    const datosEstructurados = config_override ? {
      static_data: config_override,
      toggles: {},
      styles: {}
    } : null;

    // Usar el servicio para componentes (actualiza componentes_web.datos)
    // El componenteId ES el id del registro en componentes_web
    const resultado = await paginasService.actualizarComponenteService(
      tenantId,
      componenteId,
      { datos: datosEstructurados, activo }
    );

    res.json({
      success: true,
      data: resultado,
    });
  } catch (error: any) {
    console.error('Error actualizando componente por tipo:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========================================
// 7. ELIMINAR COMPONENTE POR TIPO DE PÁGINA (heredado)
// ========================================
router.delete('/tenants/:tenantId/tipos-pagina/:tipoPaginaCodigo/componentes/:componenteId', async (req: Request, res: Response) => {
  try {
    const { tenantId: tenantIdOrSlug, tipoPaginaCodigo, componenteId } = req.params;

    console.log('🗑️ Eliminando componente heredado:', { tipoPaginaCodigo, componenteId });

    // Resolver tenant por ID o slug
    const { getTenantByIdOrSlug } = await import('../../services/tenantsService.js');
    const tenant = await getTenantByIdOrSlug(tenantIdOrSlug);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant no encontrado',
      });
    }
    const tenantId = tenant.id;

    // Buscar la página por tipo para obtener el tipo_pagina_id
    const pagina = await paginasService.obtenerPaginaPorTipoService(tenantId, tipoPaginaCodigo);
    if (!pagina) {
      return res.status(404).json({
        success: false,
        error: `No existe una página del tipo "${tipoPaginaCodigo}" para este tenant`,
      });
    }

    // Eliminar componente de componentes_web
    // El componenteId ES el id del registro en componentes_web
    await paginasService.eliminarComponenteService(tenantId, componenteId);

    res.json({
      success: true,
      message: 'Componente eliminado de la página',
    });
  } catch (error: any) {
    console.error('Error eliminando componente por tipo:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========================================
// 8. OBTENER EDITOR DE PÁGINA
// ========================================
router.get('/tenants/:tenantId/paginas/:paginaId/editor', async (req: Request, res: Response) => {
  try {
    const { tenantId, paginaId } = req.params;
    const editor = await paginasService.obtenerPaginaEditorService(tenantId, paginaId);

    if (!editor) {
      return res.status(404).json({
        success: false,
        error: 'Página no encontrada',
      });
    }

    res.json({
      success: true,
      data: editor,
    });
  } catch (error: any) {
    console.error('Error obteniendo editor de página:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========================================
// 5. CREAR PÁGINA PERSONALIZADA
// ========================================
router.post('/tenants/:tenantId/paginas', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { tipo_pagina_id, slug, titulo, descripcion, metadata } = req.body;

    // Validaciones
    if (!tipo_pagina_id || !slug || !titulo) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: tipo_pagina_id, slug, titulo',
      });
    }

    const pagina = await paginasService.crearPaginaService(tenantId, {
      tipo_pagina_id,
      slug,
      titulo,
      descripcion,
      metadata,
    });

    res.status(201).json({
      success: true,
      data: pagina,
    });
  } catch (error: any) {
    console.error('Error creando página:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========================================
// 5. ACTUALIZAR PÁGINA
// ========================================
router.patch('/tenants/:tenantId/paginas/:paginaId', async (req: Request, res: Response) => {
  try {
    const { tenantId, paginaId } = req.params;
    const { titulo, descripcion, activo, metadata } = req.body;

    const pagina = await paginasService.actualizarPaginaService(tenantId, paginaId, {
      titulo,
      descripcion,
      activo,
      metadata,
    });

    if (!pagina) {
      return res.status(404).json({
        success: false,
        error: 'Página no encontrada',
      });
    }

    res.json({
      success: true,
      data: pagina,
    });
  } catch (error: any) {
    console.error('Error actualizando página:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========================================
// 6. ELIMINAR PÁGINA
// ========================================
router.delete('/tenants/:tenantId/paginas/:paginaId', async (req: Request, res: Response) => {
  try {
    const { tenantId, paginaId } = req.params;

    await paginasService.eliminarPaginaService(tenantId, paginaId);

    res.json({
      success: true,
      message: 'Página eliminada correctamente',
    });
  } catch (error: any) {
    console.error('Error eliminando página:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========================================
// 7. AGREGAR COMPONENTE A PÁGINA
// ========================================
router.post('/tenants/:tenantId/paginas/:paginaId/componentes', async (req: Request, res: Response) => {
  // DEBUG: Log INMEDIATAMENTE al entrar a la ruta
  console.log('🔥 ENTRÓ A POST /componentes');
  console.log('🔥 Params:', req.params);
  console.log('🔥 Body:', req.body);
  console.log('🔥 Headers:', req.headers.authorization);

  try {
    const { tenantId, paginaId } = req.params;
    const { componente_id, orden } = req.body;

    // DEBUG: Log para ver qué llega
    console.log('===== POST COMPONENTE =====');
    console.log('Headers:', req.headers);
    console.log('Body recibido:', req.body);
    console.log('componente_id:', componente_id);
    console.log('===========================');

    if (!componente_id) {
      return res.status(400).json({
        success: false,
        error: 'Falta campo requerido: componente_id',
      });
    }

    const relacion = await paginasService.agregarComponenteService(tenantId, paginaId, {
      componente_id,
      orden,
    });

    res.status(201).json({
      success: true,
      data: relacion,
    });
  } catch (error: any) {
    console.error('Error agregando componente:', error);

    // Manejar error de duplicado
    if (error.code === '23505' && error.constraint === 'paginas_componentes_pagina_id_componente_id_unique') {
      return res.status(409).json({
        success: false,
        error: 'Este componente ya está agregado a la página',
      });
    }

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========================================
// 8. ACTUALIZAR CONFIGURACIÓN DE COMPONENTE
// ========================================
router.patch('/tenants/:tenantId/paginas/:paginaId/componentes/:relacionId', async (req: Request, res: Response) => {
  try {
    const { tenantId, paginaId, relacionId } = req.params;
    const { config_override, activo } = req.body;

    // Estructurar los datos en el formato esperado: { static_data: {...}, toggles: {}, styles: {} }
    // El frontend envía un objeto plano, lo envolvemos en static_data
    const datosEstructurados = config_override ? {
      static_data: config_override,
      toggles: {},
      styles: {}
    } : null;

    // relacionId ES el id del componente en componentes_web
    const relacion = await paginasService.actualizarComponenteService(
      tenantId,
      relacionId,
      {
        datos: datosEstructurados,
        activo,
      }
    );

    res.json({
      success: true,
      data: relacion,
    });
  } catch (error: any) {
    console.error('Error actualizando componente:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========================================
// 9. ELIMINAR COMPONENTE DE PÁGINA
// ========================================
router.delete('/tenants/:tenantId/paginas/:paginaId/componentes/:relacionId', async (req: Request, res: Response) => {
  try {
    const { tenantId, paginaId, relacionId } = req.params;

    // relacionId ES el id del componente en componentes_web
    await paginasService.eliminarComponenteService(tenantId, relacionId);

    res.json({
      success: true,
      message: 'Componente eliminado de la página',
    });
  } catch (error: any) {
    console.error('Error eliminando componente:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========================================
// 10. REORDENAR COMPONENTES
// ========================================
router.post('/tenants/:tenantId/paginas/:paginaId/componentes/reordenar', async (req: Request, res: Response) => {
  try {
    const { tenantId, paginaId } = req.params;
    const { orden } = req.body;

    if (!orden || !Array.isArray(orden)) {
      return res.status(400).json({
        success: false,
        error: 'Falta campo requerido: orden (array)',
      });
    }

    await paginasService.reordenarComponentesService(tenantId, paginaId, { orden });

    res.json({
      success: true,
      message: 'Componentes reordenados correctamente',
    });
  } catch (error: any) {
    console.error('Error reordenando componentes:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========================================
// 11. CAMBIAR VARIANTE DE COMPONENTE
// ========================================
router.post('/tenants/:tenantId/paginas/:paginaId/componentes/:relacionId/cambiar-variante', async (req: Request, res: Response) => {
  try {
    const { tenantId, paginaId, relacionId } = req.params;
    const { nueva_variante } = req.body;

    if (!nueva_variante) {
      return res.status(400).json({
        success: false,
        error: 'Falta campo requerido: nueva_variante',
      });
    }

    // relacionId ES el id del componente en componentes_web
    const resultado = await paginasService.cambiarVarianteComponenteService(
      tenantId,
      relacionId,
      { nueva_variante }
    );

    res.json({
      success: true,
      data: resultado,
    });
  } catch (error: any) {
    console.error('Error cambiando variante:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========================================
// 12. OBTENER CATÁLOGO DE COMPONENTES
// ========================================
router.get('/tenants/:tenantId/componentes/catalogo', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const catalogo = await paginasService.obtenerCatalogoComponentesService(tenantId);

    res.json({
      success: true,
      data: catalogo,
    });
  } catch (error: any) {
    console.error('Error obteniendo catálogo:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========================================
// 13. OBTENER VARIANTES DE UN TIPO
// ========================================
router.get('/tenants/:tenantId/componentes/:tipo/variantes', async (req: Request, res: Response) => {
  try {
    const { tenantId, tipo } = req.params;
    const variantes = await paginasService.obtenerVariantesTipoService(tenantId, tipo);

    res.json({
      success: true,
      data: variantes,
    });
  } catch (error: any) {
    console.error('Error obteniendo variantes:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========================================
// 14. OBTENER VARIANTES POR TIPO (ruta alternativa para frontend)
// El frontend usa esta ruta: /catalogo-componentes/tipo/:tipo/variantes
// ========================================
router.get('/tenants/:tenantId/catalogo-componentes/tipo/:tipo/variantes', async (req: Request, res: Response) => {
  try {
    const { tenantId: tenantIdOrSlug, tipo } = req.params;

    // Resolver tenant por ID o slug
    const { getTenantByIdOrSlug } = await import('../../services/tenantsService.js');
    const tenant = await getTenantByIdOrSlug(tenantIdOrSlug);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant no encontrado',
      });
    }
    const tenantId = tenant.id;

    const variantes = await paginasService.obtenerVariantesTipoService(tenantId, tipo);

    res.json({
      success: true,
      data: variantes,
    });
  } catch (error: any) {
    console.error('Error obteniendo variantes por tipo:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
