/**
 * Rutas para gestión de secciones
 *
 * v2: Soporte para configuración independiente por variante
 */

import { Router, Request, Response } from 'express';
import {
  getCatalogoComponentes,
  getSeccionesTenant,
  getSeccionesPorTipo,
  getSeccionesActivas,
  getSeccionesPorTipoPagina,
  saveSeccionTenant,
  activarVariante,
  deleteSeccion,
  // Componentes globales reutilizables
  getComponentesGlobales,
  getComponentesPagina,
  agregarComponenteAPagina,
  removerComponenteDePagina,
  reordenarComponentesPagina,
  crearComponenteGlobal,
  actualizarNombreComponente,
  duplicarComponenteGlobal,
} from '../services/seccionesService.js';

const router = Router();

/**
 * GET /api/secciones/catalogo
 * Obtiene el catálogo de componentes disponibles
 * 
 * Query params:
 * - tenantId (opcional): ID del tenant para filtrar variantes por features
 */
router.get('/catalogo', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;
    const catalogo = await getCatalogoComponentes(tenantId as string | undefined);
    res.json(catalogo);
  } catch (error: any) {
    console.error('Error al obtener catálogo:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/secciones
 * Obtiene las secciones globales del tenant
 */
router.get('/tenants/:tenantId/secciones', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const secciones = await getSeccionesTenant(tenantId);
    res.json(secciones);
  } catch (error: any) {
    console.error('Error al obtener secciones:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/secciones/tipo/:tipoPagina
 * Obtiene las secciones para un tipo de página específico
 */
router.get('/tenants/:tenantId/secciones/tipo/:tipoPagina', async (req: Request, res: Response) => {
  try {
    const { tenantId, tipoPagina } = req.params;
    const secciones = await getSeccionesPorTipoPagina(tenantId, tipoPagina);
    res.json(secciones);
  } catch (error: any) {
    console.error('Error al obtener secciones por tipo:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/secciones
 * Crea o actualiza una sección
 */
router.post('/tenants/:tenantId/secciones', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const seccion = await saveSeccionTenant(tenantId, req.body);
    res.json(seccion);
  } catch (error: any) {
    console.error('Error al guardar sección:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/tenants/:tenantId/secciones/:seccionId
 * Actualiza una sección existente
 */
router.put('/tenants/:tenantId/secciones/:seccionId', async (req: Request, res: Response) => {
  try {
    const { tenantId, seccionId } = req.params;
    const seccion = await saveSeccionTenant(tenantId, {
      ...req.body,
      id: seccionId,
    });
    res.json(seccion);
  } catch (error: any) {
    console.error('Error al actualizar sección:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/tenants/:tenantId/secciones/:seccionId
 * Elimina una sección
 */
router.delete('/tenants/:tenantId/secciones/:seccionId', async (req: Request, res: Response) => {
  try {
    const { tenantId, seccionId } = req.params;
    const deleted = await deleteSeccion(tenantId, seccionId);
    if (deleted) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Sección no encontrada' });
    }
  } catch (error: any) {
    console.error('Error al eliminar sección:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===============================================
// NUEVAS RUTAS v2: Configuración por variante
// ===============================================

/**
 * GET /api/tenants/:tenantId/secciones/componente/:tipo
 * Obtiene TODAS las configuraciones de variantes para un tipo de componente
 */
router.get('/tenants/:tenantId/secciones/componente/:tipo', async (req: Request, res: Response) => {
  try {
    const { tenantId, tipo } = req.params;
    const secciones = await getSeccionesPorTipo(tenantId, tipo);
    res.json(secciones);
  } catch (error: any) {
    console.error('Error al obtener secciones por componente:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/secciones/activas
 * Obtiene solo las secciones activas (una por tipo)
 */
router.get('/tenants/:tenantId/secciones/activas', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const secciones = await getSeccionesActivas(tenantId);
    res.json(secciones);
  } catch (error: any) {
    console.error('Error al obtener secciones activas:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/secciones/activar
 * Activa una variante específica para un tipo de componente
 * Body: { tipo: string, variante: string }
 */
router.post('/tenants/:tenantId/secciones/activar', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { tipo, variante } = req.body;

    if (!tipo || !variante) {
      return res.status(400).json({ error: 'Se requiere tipo y variante' });
    }

    await activarVariante(tenantId, tipo, variante);
    res.json({ success: true, tipo, variante });
  } catch (error: any) {
    console.error('Error al activar variante:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===============================================
// RUTAS v3: Componentes globales reutilizables
// ===============================================

/**
 * GET /api/tenants/:tenantId/componentes-globales
 * Obtiene todos los componentes globales del tenant
 * Query param opcional: ?tipo=hero para filtrar por tipo
 */
router.get('/tenants/:tenantId/componentes-globales', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { tipo } = req.query;
    const componentes = await getComponentesGlobales(tenantId, tipo as string);
    res.json(componentes);
  } catch (error: any) {
    console.error('Error al obtener componentes globales:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/componentes-globales
 * Crea un nuevo componente global reutilizable
 * Body: { tipo, variante, nombre, datos? }
 */
router.post('/tenants/:tenantId/componentes-globales', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { tipo, variante, nombre, datos } = req.body;

    if (!tipo || !variante || !nombre) {
      return res.status(400).json({ error: 'Se requiere tipo, variante y nombre' });
    }

    const componente = await crearComponenteGlobal(tenantId, { tipo, variante, nombre, datos });
    res.status(201).json(componente);
  } catch (error: any) {
    console.error('Error al crear componente global:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/tenants/:tenantId/componentes-globales/:componenteId/nombre
 * Actualiza el nombre de un componente global
 */
router.put('/tenants/:tenantId/componentes-globales/:componenteId/nombre', async (req: Request, res: Response) => {
  try {
    const { componenteId } = req.params;
    const { nombre } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'Se requiere nombre' });
    }

    await actualizarNombreComponente(componenteId, nombre);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error al actualizar nombre:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/componentes-globales/:componenteId/duplicar
 * Duplica un componente global con un nuevo nombre
 */
router.post('/tenants/:tenantId/componentes-globales/:componenteId/duplicar', async (req: Request, res: Response) => {
  try {
    const { componenteId } = req.params;
    const { nombre } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'Se requiere nombre para el duplicado' });
    }

    const componente = await duplicarComponenteGlobal(componenteId, nombre);
    res.status(201).json(componente);
  } catch (error: any) {
    console.error('Error al duplicar componente:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/paginas/:paginaId/componentes
 * Obtiene los componentes asignados a una página
 */
router.get('/tenants/:tenantId/paginas/:paginaId/componentes', async (req: Request, res: Response) => {
  try {
    const { tenantId, paginaId } = req.params;
    const componentes = await getComponentesPagina(tenantId, paginaId);
    res.json(componentes);
  } catch (error: any) {
    console.error('Error al obtener componentes de página:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/paginas/:paginaId/componentes
 * Agrega un componente global a una página
 * Body: { componenteId, orden? }
 */
router.post('/tenants/:tenantId/paginas/:paginaId/componentes', async (req: Request, res: Response) => {
  try {
    const { paginaId } = req.params;
    const { componenteId, orden } = req.body;

    if (!componenteId) {
      return res.status(400).json({ error: 'Se requiere componenteId' });
    }

    const result = await agregarComponenteAPagina(paginaId, componenteId, orden);
    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error al agregar componente a página:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/tenants/:tenantId/paginas/:paginaId/componentes/:componenteId
 * Remueve un componente de una página (solo la referencia)
 */
router.delete('/tenants/:tenantId/paginas/:paginaId/componentes/:componenteId', async (req: Request, res: Response) => {
  try {
    const { paginaId, componenteId } = req.params;
    await removerComponenteDePagina(paginaId, componenteId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error al remover componente de página:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/tenants/:tenantId/paginas/:paginaId/componentes/orden
 * Reordena los componentes de una página
 * Body: [{ componenteId, orden }, ...]
 */
router.put('/tenants/:tenantId/paginas/:paginaId/componentes/orden', async (req: Request, res: Response) => {
  try {
    const { paginaId } = req.params;
    const ordenComponentes = req.body;

    if (!Array.isArray(ordenComponentes)) {
      return res.status(400).json({ error: 'Se requiere un array de componentes con orden' });
    }

    await reordenarComponentesPagina(paginaId, ordenComponentes);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error al reordenar componentes:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
