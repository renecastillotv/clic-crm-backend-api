/**
 * Rutas para catálogos de propiedades
 * - Amenidades
 * - Operaciones (venta, alquiler, etc.)
 * - Categorías de propiedades (apartamento, casa, etc.)
 */

import express from 'express';
import {
  getAmenidades,
  getAmenidadesPorCategoria,
  getAmenidadByCodigo,
  createAmenidadTenant,
  getCategoriasAmenidades,
  getAmenidadesTenant,
  updateAmenidadTenant,
  deleteAmenidadTenant,
  getOperaciones,
  getOperacionBySlug,
  getOperacionBySlugTraducido,
  getCategoriasPropiedades,
  getCategoriaBySlug,
  getCategoriaBySlugTraducido,
  getMonedas,
  getMonedaByCodigo,
  getTenantMonedas,
  setTenantMonedas,
  convertirMoneda,
} from '../services/catalogosService.js';

const router = express.Router();

// ============================================================
// AMENIDADES
// ============================================================

/**
 * GET /api/catalogos/amenidades
 * Obtiene todas las amenidades
 * Query params:
 *   - soloActivas (boolean, default true)
 *   - tenantId (string, opcional) - Si se pasa, incluye amenidades globales + las del tenant
 */
router.get('/amenidades', async (req, res) => {
  try {
    const soloActivas = req.query.soloActivas !== 'false';
    const tenantId = req.query.tenantId as string | undefined;
    const amenidades = await getAmenidades(soloActivas, tenantId);
    res.json(amenidades);
  } catch (error: any) {
    console.error('Error al obtener amenidades:', error);
    res.status(500).json({ error: error.message || 'Error al obtener amenidades' });
  }
});

/**
 * GET /api/catalogos/amenidades/categorias
 * Obtiene la lista de categorías únicas de amenidades
 */
router.get('/amenidades/categorias', async (req, res) => {
  try {
    const categorias = await getCategoriasAmenidades();
    res.json(categorias);
  } catch (error: any) {
    console.error('Error al obtener categorías de amenidades:', error);
    res.status(500).json({ error: error.message || 'Error al obtener categorías' });
  }
});

/**
 * GET /api/catalogos/amenidades/por-categoria
 * Obtiene amenidades agrupadas por categoría
 * Query params:
 *   - soloActivas (boolean, default true)
 *   - tenantId (string, opcional) - Si se pasa, incluye amenidades globales + las del tenant
 */
router.get('/amenidades/por-categoria', async (req, res) => {
  try {
    const soloActivas = req.query.soloActivas !== 'false';
    const tenantId = req.query.tenantId as string | undefined;
    const amenidadesPorCategoria = await getAmenidadesPorCategoria(soloActivas, tenantId);
    res.json(amenidadesPorCategoria);
  } catch (error: any) {
    console.error('Error al obtener amenidades por categoría:', error);
    res.status(500).json({ error: error.message || 'Error al obtener amenidades' });
  }
});

/**
 * GET /api/catalogos/amenidades/tenant/:tenantId
 * Obtiene todas las amenidades de un tenant (incluyendo inactivas) para administración
 */
router.get('/amenidades/tenant/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const amenidades = await getAmenidadesTenant(tenantId);
    res.json(amenidades);
  } catch (error: any) {
    console.error('Error al obtener amenidades del tenant:', error);
    res.status(500).json({ error: error.message || 'Error al obtener amenidades del tenant' });
  }
});

/**
 * POST /api/catalogos/amenidades/tenant/:tenantId
 * Crea una nueva amenidad personalizada para un tenant
 * Body: { nombre: string, icono?: string, categoria?: string, traducciones?: Record<string, string> }
 */
router.post('/amenidades/tenant/:tenantId', async (req, res) => {
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
    console.error('Error al crear amenidad:', error);
    res.status(500).json({ error: error.message || 'Error al crear amenidad' });
  }
});

/**
 * PUT /api/catalogos/amenidades/tenant/:tenantId/:amenidadId
 * Actualiza una amenidad de un tenant (nombre, icono, categoria, traducciones, activo)
 * Body: { nombre?: string, icono?: string, categoria?: string, traducciones?: Record<string, string>, activo?: boolean }
 */
router.put('/amenidades/tenant/:tenantId/:amenidadId', async (req, res) => {
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
    console.error('Error al actualizar amenidad:', error);
    res.status(500).json({ error: error.message || 'Error al actualizar amenidad' });
  }
});

/**
 * DELETE /api/catalogos/amenidades/tenant/:tenantId/:amenidadId
 * Elimina una amenidad de un tenant
 */
router.delete('/amenidades/tenant/:tenantId/:amenidadId', async (req, res) => {
  try {
    const { tenantId, amenidadId } = req.params;

    const deleted = await deleteAmenidadTenant(tenantId, amenidadId);

    if (!deleted) {
      return res.status(404).json({ error: 'Amenidad no encontrada' });
    }

    res.json({ success: true, message: 'Amenidad eliminada correctamente' });
  } catch (error: any) {
    console.error('Error al eliminar amenidad:', error);
    res.status(500).json({ error: error.message || 'Error al eliminar amenidad' });
  }
});

/**
 * GET /api/catalogos/amenidades/:codigo
 * Obtiene una amenidad por código
 */
router.get('/amenidades/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    const amenidad = await getAmenidadByCodigo(codigo);

    if (!amenidad) {
      return res.status(404).json({ error: 'Amenidad no encontrada' });
    }

    res.json(amenidad);
  } catch (error: any) {
    console.error('Error al obtener amenidad:', error);
    res.status(500).json({ error: error.message || 'Error al obtener amenidad' });
  }
});

// ============================================================
// OPERACIONES
// ============================================================

/**
 * GET /api/catalogos/operaciones
 * Obtiene todas las operaciones
 * Query params: soloActivas (boolean, default true)
 */
router.get('/operaciones', async (req, res) => {
  try {
    const soloActivas = req.query.soloActivas !== 'false';
    const operaciones = await getOperaciones(soloActivas);
    res.json(operaciones);
  } catch (error: any) {
    console.error('Error al obtener operaciones:', error);
    res.status(500).json({ error: error.message || 'Error al obtener operaciones' });
  }
});

/**
 * GET /api/catalogos/operaciones/por-slug/:slug
 * Obtiene una operación por slug
 */
router.get('/operaciones/por-slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const operacion = await getOperacionBySlug(slug);

    if (!operacion) {
      return res.status(404).json({ error: 'Operación no encontrada' });
    }

    res.json(operacion);
  } catch (error: any) {
    console.error('Error al obtener operación:', error);
    res.status(500).json({ error: error.message || 'Error al obtener operación' });
  }
});

/**
 * GET /api/catalogos/operaciones/traducido/:idioma/:slugTraducido
 * Obtiene una operación por slug traducido
 */
router.get('/operaciones/traducido/:idioma/:slugTraducido', async (req, res) => {
  try {
    const { idioma, slugTraducido } = req.params;
    const operacion = await getOperacionBySlugTraducido(slugTraducido, idioma);

    if (!operacion) {
      return res.status(404).json({ error: 'Operación no encontrada' });
    }

    res.json(operacion);
  } catch (error: any) {
    console.error('Error al obtener operación por slug traducido:', error);
    res.status(500).json({ error: error.message || 'Error al obtener operación' });
  }
});

// ============================================================
// CATEGORÍAS DE PROPIEDADES
// ============================================================

/**
 * GET /api/catalogos/categorias
 * Obtiene todas las categorías de propiedades
 * Query params: soloActivas (boolean, default true)
 */
router.get('/categorias', async (req, res) => {
  try {
    const soloActivas = req.query.soloActivas !== 'false';
    const categorias = await getCategoriasPropiedades(soloActivas);
    res.json(categorias);
  } catch (error: any) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ error: error.message || 'Error al obtener categorías' });
  }
});

/**
 * GET /api/catalogos/categorias/por-slug/:slug
 * Obtiene una categoría por slug
 */
router.get('/categorias/por-slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const categoria = await getCategoriaBySlug(slug);

    if (!categoria) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json(categoria);
  } catch (error: any) {
    console.error('Error al obtener categoría:', error);
    res.status(500).json({ error: error.message || 'Error al obtener categoría' });
  }
});

/**
 * GET /api/catalogos/categorias/traducido/:idioma/:slugTraducido
 * Obtiene una categoría por slug traducido
 */
router.get('/categorias/traducido/:idioma/:slugTraducido', async (req, res) => {
  try {
    const { idioma, slugTraducido } = req.params;
    const categoria = await getCategoriaBySlugTraducido(slugTraducido, idioma);

    if (!categoria) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json(categoria);
  } catch (error: any) {
    console.error('Error al obtener categoría por slug traducido:', error);
    res.status(500).json({ error: error.message || 'Error al obtener categoría' });
  }
});

// ============================================================
// MONEDAS
// ============================================================

/**
 * GET /api/catalogos/monedas
 * Obtiene todas las monedas del catálogo
 * Query params: soloActivas (boolean, default true)
 */
router.get('/monedas', async (req, res) => {
  try {
    const soloActivas = req.query.soloActivas !== 'false';
    const monedas = await getMonedas(soloActivas);
    res.json(monedas);
  } catch (error: any) {
    console.error('Error al obtener monedas:', error);
    res.status(500).json({ error: error.message || 'Error al obtener monedas' });
  }
});

/**
 * GET /api/catalogos/monedas/tenant/:tenantId
 * Obtiene las monedas habilitadas para un tenant
 * Si el tenant no tiene monedas configuradas, devuelve solo USD por defecto
 * IMPORTANTE: Esta ruta debe estar ANTES de /monedas/:codigo
 */
router.get('/monedas/tenant/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const monedas = await getTenantMonedas(tenantId);
    res.json(monedas);
  } catch (error: any) {
    console.error('Error al obtener monedas del tenant:', error);
    res.status(500).json({ error: error.message || 'Error al obtener monedas del tenant' });
  }
});

/**
 * PUT /api/catalogos/monedas/tenant/:tenantId
 * Configura las monedas habilitadas para un tenant
 * Body: { monedas: [{ codigo: "USD", esDefault: true }, { codigo: "DOP" }] }
 */
router.put('/monedas/tenant/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { monedas } = req.body;

    if (!monedas || !Array.isArray(monedas)) {
      return res.status(400).json({ error: 'Se requiere un array de monedas' });
    }

    // Validar que al menos una moneda esté marcada como default
    const tieneDefault = monedas.some(m => m.esDefault);
    if (!tieneDefault && monedas.length > 0) {
      // Si no hay default, marcar la primera como default
      monedas[0].esDefault = true;
    }

    await setTenantMonedas(tenantId, monedas);
    res.json({ success: true, message: 'Monedas configuradas correctamente' });
  } catch (error: any) {
    console.error('Error al configurar monedas del tenant:', error);
    res.status(500).json({ error: error.message || 'Error al configurar monedas del tenant' });
  }
});

/**
 * GET /api/catalogos/monedas/convertir
 * Convierte un monto entre monedas usando USD como base
 * Query params: monto, origen, destino
 * IMPORTANTE: Esta ruta debe estar ANTES de /monedas/:codigo
 */
router.get('/monedas/convertir', async (req, res) => {
  try {
    const { monto, origen, destino } = req.query;

    if (!monto || !origen || !destino) {
      return res.status(400).json({ error: 'Parámetros requeridos: monto, origen, destino' });
    }

    const montoNumerico = parseFloat(monto as string);
    if (isNaN(montoNumerico)) {
      return res.status(400).json({ error: 'El monto debe ser un número válido' });
    }

    const resultado = await convertirMoneda(
      montoNumerico,
      (origen as string).toUpperCase(),
      (destino as string).toUpperCase()
    );

    res.json({
      montoOriginal: montoNumerico,
      monedaOrigen: origen,
      monedaDestino: destino,
      montoConvertido: resultado
    });
  } catch (error: any) {
    console.error('Error al convertir moneda:', error);
    res.status(500).json({ error: error.message || 'Error al convertir moneda' });
  }
});

/**
 * GET /api/catalogos/monedas/:codigo
 * Obtiene una moneda por código
 * IMPORTANTE: Esta ruta debe estar DESPUÉS de las rutas específicas como /tenant y /convertir
 */
router.get('/monedas/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    const moneda = await getMonedaByCodigo(codigo.toUpperCase());

    if (!moneda) {
      return res.status(404).json({ error: 'Moneda no encontrada' });
    }

    res.json(moneda);
  } catch (error: any) {
    console.error('Error al obtener moneda:', error);
    res.status(500).json({ error: error.message || 'Error al obtener moneda' });
  }
});

// ============================================================
// TODOS LOS CATÁLOGOS (para carga inicial del frontend)
// ============================================================

/**
 * GET /api/catalogos/todos
 * Obtiene todos los catálogos en una sola llamada
 * Útil para cargar dropdowns en el formulario de propiedades
 */
router.get('/todos', async (req, res) => {
  try {
    const soloActivas = req.query.soloActivas !== 'false';

    const [amenidades, operaciones, categorias, monedas] = await Promise.all([
      getAmenidadesPorCategoria(soloActivas),
      getOperaciones(soloActivas),
      getCategoriasPropiedades(soloActivas),
      getMonedas(soloActivas),
    ]);

    res.json({
      amenidades,
      operaciones,
      categorias,
      monedas,
    });
  } catch (error: any) {
    console.error('Error al obtener catálogos:', error);
    res.status(500).json({ error: error.message || 'Error al obtener catálogos' });
  }
});

export default router;
