import express from 'express';
import { requireAuth } from '../middleware/clerkAuth.js';
import * as componentesCatalogoService from '../services/componentesCatalogoService.js';

const router = express.Router();

/**
 * GET /api/componentes-catalogo
 * Obtener catálogo completo de componentes
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { categoria, activo, es_sistema } = req.query;

    const filtros: any = {};
    if (categoria) filtros.categoria = categoria as string;
    if (activo !== undefined) filtros.activo = activo === 'true';
    if (es_sistema !== undefined) filtros.es_sistema = es_sistema === 'true';

    const componentes = await componentesCatalogoService.getComponentesCatalogo(filtros);
    res.json(componentes);
  } catch (error: any) {
    console.error('Error al obtener catálogo de componentes:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/componentes-catalogo/:codigo
 * Obtener un componente específico por código o tipo
 *
 * Soporta tanto códigos de catálogo (ej: "testimonials_grid")
 * como tipos de componentes (ej: "testimonials")
 */
router.get('/:codigo', requireAuth, async (req, res) => {
  try {
    const { codigo } = req.params;

    // Primero intentar búsqueda exacta por código
    let componente = await componentesCatalogoService.getComponenteCatalogoByCodigo(codigo);

    // Si no se encuentra, intentar mapeo de tipo a código
    if (!componente) {
      // Mapeo de tipos comunes de componentes_web a códigos de catálogo
      const tipoACodigo: Record<string, string> = {
        'testimonials': 'testimonials_grid',
        'articles': 'article_grid',
        'team': 'team_grid',
        'properties': 'property_grid',
        'property_carousel': 'property_grid', // Puede usar el mismo schema
        'videos': 'video_gallery',
        'contact': 'contact_form',
        'search': 'search_box',
      };

      const codigoMapeado = tipoACodigo[codigo];
      if (codigoMapeado) {
        componente = await componentesCatalogoService.getComponenteCatalogoByCodigo(codigoMapeado);
      }
    }

    if (!componente) {
      return res.status(404).json({ error: 'Componente no encontrado' });
    }

    res.json(componente);
  } catch (error: any) {
    console.error('Error al obtener componente:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/componentes-disponibles
 * Obtener componentes disponibles para un tenant
 */
router.get('/tenants/:tenantId/disponibles', requireAuth, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { categoria } = req.query;

    let componentes;
    if (categoria) {
      componentes = await componentesCatalogoService.getComponentesPorCategoria(
        tenantId,
        categoria as string
      );
    } else {
      componentes = await componentesCatalogoService.getComponentesDisponiblesParaTenant(tenantId);
    }

    res.json(componentes);
  } catch (error: any) {
    console.error('Error al obtener componentes disponibles:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/componentes/:codigo/validar
 * Verificar si un tenant puede usar un componente
 */
router.post('/tenants/:tenantId/componentes/:codigo/validar', requireAuth, async (req, res) => {
  try {
    const { tenantId, codigo } = req.params;
    const resultado = await componentesCatalogoService.tenantPuedeUsarComponente(tenantId, codigo);
    res.json(resultado);
  } catch (error: any) {
    console.error('Error al validar componente:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/componentes-catalogo/:codigo/validar-config
 * Validar configuración de un componente según su schema
 */
router.post('/:codigo/validar-config', requireAuth, async (req, res) => {
  try {
    const { codigo } = req.params;
    const configuracion = req.body;

    const resultado = await componentesCatalogoService.validarConfiguracionComponente(
      codigo,
      configuracion
    );

    res.json(resultado);
  } catch (error: any) {
    console.error('Error al validar configuración:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/tenants/:tenantId/componentes/:codigo/toggle
 * Habilitar/deshabilitar un componente para un tenant
 */
router.put('/tenants/:tenantId/componentes/:codigo/toggle', requireAuth, async (req, res) => {
  try {
    const { tenantId, codigo } = req.params;
    const { enabled } = req.body;

    if (enabled === undefined) {
      return res.status(400).json({ error: 'Campo "enabled" requerido' });
    }

    await componentesCatalogoService.toggleComponenteParaTenant(tenantId, codigo, enabled);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error al toggle componente:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/componentes-catalogo/personalizados
 * Crear un componente personalizado
 */
router.post('/personalizados', requireAuth, async (req, res) => {
  try {
    const { codigo, nombre, categoria, descripcion, variantes, schema_config } = req.body;

    if (!codigo || !nombre || !categoria) {
      return res.status(400).json({
        error: 'Campos requeridos: codigo, nombre, categoria',
      });
    }

    const componente = await componentesCatalogoService.crearComponentePersonalizado({
      codigo,
      nombre,
      categoria,
      descripcion,
      variantes,
      schema_config,
    });

    res.status(201).json(componente);
  } catch (error: any) {
    console.error('Error al crear componente personalizado:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
