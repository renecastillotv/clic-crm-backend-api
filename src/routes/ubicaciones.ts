/**
 * Ubicaciones Routes
 * API para gestión de ubicaciones jerárquicas
 */

import { Router } from 'express';
import {
  getUbicaciones,
  getUbicacionById,
  getUbicacionBySlug,
  getArbolUbicaciones,
  getHijosUbicacion,
  createUbicacion,
  updateUbicacion,
  deleteUbicacion,
  searchUbicaciones,
  type TipoUbicacion,
} from '../services/ubicacionesService.js';

const router = Router();

/**
 * GET /api/ubicaciones
 * Listar ubicaciones con filtros
 */
router.get('/', async (req, res) => {
  try {
    const {
      tipo,
      parent_id,
      activo,
      destacado,
      search,
    } = req.query;

    const ubicaciones = await getUbicaciones({
      tipo: tipo as TipoUbicacion,
      parent_id: parent_id === 'null' ? null : parent_id as string,
      activo: activo === undefined ? undefined : activo === 'true',
      destacado: destacado === undefined ? undefined : destacado === 'true',
      search: search as string,
    });

    res.json({ ubicaciones });
  } catch (error: any) {
    console.error('Error en GET /api/ubicaciones:', error);
    res.status(500).json({ error: 'Error al obtener ubicaciones', message: error.message });
  }
});

/**
 * GET /api/ubicaciones/arbol
 * Obtener árbol jerárquico de ubicaciones
 */
router.get('/arbol', async (req, res) => {
  try {
    const { maxNivel, soloDestacados, soloMenu } = req.query;

    const arbol = await getArbolUbicaciones({
      maxNivel: maxNivel ? parseInt(maxNivel as string) : undefined,
      soloDestacados: soloDestacados === 'true',
      soloMenu: soloMenu === 'true',
    });

    // Construir estructura anidada
    const buildTree = (items: any[], parentId: string | null = null): any[] => {
      return items
        .filter(item => item.parent_id === parentId)
        .map(item => ({
          ...item,
          children: buildTree(items, item.id),
        }));
    };

    const arbolAnidado = buildTree(arbol);

    res.json({ arbol: arbolAnidado });
  } catch (error: any) {
    console.error('Error en GET /api/ubicaciones/arbol:', error);
    res.status(500).json({ error: 'Error al obtener árbol', message: error.message });
  }
});

/**
 * GET /api/ubicaciones/search
 * Buscar ubicaciones para autocompletado
 */
router.get('/search', async (req, res) => {
  try {
    const { q, limit } = req.query;

    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.json({ ubicaciones: [] });
    }

    const ubicaciones = await searchUbicaciones(q, limit ? parseInt(limit as string) : 10);

    res.json({ ubicaciones });
  } catch (error: any) {
    console.error('Error en GET /api/ubicaciones/search:', error);
    res.status(500).json({ error: 'Error en búsqueda', message: error.message });
  }
});

/**
 * GET /api/ubicaciones/paises
 * Obtener solo países
 */
router.get('/paises', async (req, res) => {
  try {
    const paises = await getUbicaciones({ tipo: 'pais', activo: true });
    res.json({ paises });
  } catch (error: any) {
    console.error('Error en GET /api/ubicaciones/paises:', error);
    res.status(500).json({ error: 'Error al obtener países', message: error.message });
  }
});

/**
 * GET /api/ubicaciones/provincias/:paisId
 * Obtener provincias de un país
 */
router.get('/provincias/:paisId', async (req, res) => {
  try {
    const { paisId } = req.params;
    const provincias = await getHijosUbicacion(paisId);
    res.json({ provincias });
  } catch (error: any) {
    console.error('Error en GET /api/ubicaciones/provincias:', error);
    res.status(500).json({ error: 'Error al obtener provincias', message: error.message });
  }
});

/**
 * GET /api/ubicaciones/ciudades/:provinciaId
 * Obtener ciudades de una provincia
 */
router.get('/ciudades/:provinciaId', async (req, res) => {
  try {
    const { provinciaId } = req.params;
    const ciudades = await getHijosUbicacion(provinciaId);
    res.json({ ciudades });
  } catch (error: any) {
    console.error('Error en GET /api/ubicaciones/ciudades:', error);
    res.status(500).json({ error: 'Error al obtener ciudades', message: error.message });
  }
});

/**
 * GET /api/ubicaciones/sectores/:ciudadId
 * Obtener sectores de una ciudad
 */
router.get('/sectores/:ciudadId', async (req, res) => {
  try {
    const { ciudadId } = req.params;
    const sectores = await getHijosUbicacion(ciudadId);
    res.json({ sectores });
  } catch (error: any) {
    console.error('Error en GET /api/ubicaciones/sectores:', error);
    res.status(500).json({ error: 'Error al obtener sectores', message: error.message });
  }
});

/**
 * GET /api/ubicaciones/hijos/:parentId
 * Obtener hijos directos de cualquier ubicación
 */
router.get('/hijos/:parentId', async (req, res) => {
  try {
    const { parentId } = req.params;
    const hijos = await getHijosUbicacion(parentId);
    res.json({ hijos });
  } catch (error: any) {
    console.error('Error en GET /api/ubicaciones/hijos:', error);
    res.status(500).json({ error: 'Error al obtener hijos', message: error.message });
  }
});

/**
 * GET /api/ubicaciones/slug/:slug
 * Obtener ubicación por slug
 */
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { parentSlug } = req.query;

    const ubicacion = await getUbicacionBySlug(slug, parentSlug as string);

    if (!ubicacion) {
      return res.status(404).json({ error: 'Ubicación no encontrada' });
    }

    res.json(ubicacion);
  } catch (error: any) {
    console.error('Error en GET /api/ubicaciones/slug:', error);
    res.status(500).json({ error: 'Error al obtener ubicación', message: error.message });
  }
});

/**
 * GET /api/ubicaciones/:id
 * Obtener ubicación por ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ubicacion = await getUbicacionById(id);

    if (!ubicacion) {
      return res.status(404).json({ error: 'Ubicación no encontrada' });
    }

    res.json(ubicacion);
  } catch (error: any) {
    console.error('Error en GET /api/ubicaciones/:id:', error);
    res.status(500).json({ error: 'Error al obtener ubicación', message: error.message });
  }
});

/**
 * POST /api/ubicaciones
 * Crear ubicación
 */
router.post('/', async (req, res) => {
  try {
    const ubicacion = await createUbicacion(req.body);
    res.status(201).json(ubicacion);
  } catch (error: any) {
    console.error('Error en POST /api/ubicaciones:', error);
    res.status(400).json({ error: 'Error al crear ubicación', message: error.message });
  }
});

/**
 * PUT /api/ubicaciones/:id
 * Actualizar ubicación
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ubicacion = await updateUbicacion(id, req.body);

    if (!ubicacion) {
      return res.status(404).json({ error: 'Ubicación no encontrada' });
    }

    res.json(ubicacion);
  } catch (error: any) {
    console.error('Error en PUT /api/ubicaciones/:id:', error);
    res.status(400).json({ error: 'Error al actualizar ubicación', message: error.message });
  }
});

/**
 * DELETE /api/ubicaciones/:id
 * Eliminar ubicación (soft delete por defecto)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { hard } = req.query;

    const deleted = await deleteUbicacion(id, hard === 'true');

    if (!deleted) {
      return res.status(404).json({ error: 'Ubicación no encontrada' });
    }

    res.json({ success: true, message: 'Ubicación eliminada' });
  } catch (error: any) {
    console.error('Error en DELETE /api/ubicaciones/:id:', error);
    res.status(500).json({ error: 'Error al eliminar ubicación', message: error.message });
  }
});

export default router;
