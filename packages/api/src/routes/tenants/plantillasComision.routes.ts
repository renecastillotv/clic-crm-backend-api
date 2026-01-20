/**
 * Rutas API para Plantillas de Comisión
 *
 * Base: /api/tenants/:tenantId/finanzas/plantillas-comision
 */

import express, { Request, Response, NextFunction } from 'express';
import {
  getPlantillasComision,
  getPlantillaById,
  createPlantillaComision,
  updatePlantillaComision,
  deletePlantillaComision,
  createPlantillaPersonalizada,
  getDistribucionEmpresa,
  updateDistribucionEmpresa,
  asignarPlantillaAPerfil,
  getPlantillaDePerfil,
  calcularDistribucionComision,
  PlantillaComisionConfig,
} from '../../services/plantillasComisionService.js';

const router = express.Router({ mergeParams: true });

// Tipo para request con tenantId del parent router
interface TenantParams { tenantId: string }
interface PlantillaParams extends TenantParams { plantillaId: string }
interface PerfilParams extends TenantParams { perfilId: string }

// ============================================
// Plantillas de Comisión
// ============================================

/**
 * GET /api/tenants/:tenantId/finanzas/plantillas-comision
 * Obtiene todas las plantillas disponibles para el tenant
 */
router.get('/plantillas-comision', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const plantillas = await getPlantillasComision(tenantId);
    res.json(plantillas);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/finanzas/plantillas-comision/:plantillaId
 * Obtiene una plantilla específica
 */
router.get('/plantillas-comision/:plantillaId', async (req: Request<PlantillaParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, plantillaId } = req.params;
    const plantilla = await getPlantillaById(tenantId, plantillaId);

    if (!plantilla) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    res.json(plantilla);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/finanzas/plantillas-comision
 * Crea una nueva plantilla de comisión
 */
router.post('/plantillas-comision', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { codigo, nombre, descripcion, icono, color, config } = req.body;

    if (!codigo || !nombre || !config) {
      return res.status(400).json({
        error: 'Se requiere codigo, nombre y config'
      });
    }

    // Validar que la suma de porcentajes sea 100
    const validacion = validarConfigPlantilla(config);
    if (!validacion.valido) {
      return res.status(400).json({ error: validacion.error });
    }

    const plantilla = await createPlantillaComision(tenantId, {
      codigo,
      nombre,
      descripcion,
      icono,
      color,
      config
    });

    res.status(201).json(plantilla);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ya existe una plantilla con ese código' });
    }
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/finanzas/plantillas-comision/:plantillaId
 * Actualiza una plantilla existente
 */
router.put('/plantillas-comision/:plantillaId', async (req: Request<PlantillaParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, plantillaId } = req.params;
    const { nombre, descripcion, icono, color, activo, config } = req.body;

    // Si se envía config, validar
    if (config) {
      const validacion = validarConfigPlantilla(config);
      if (!validacion.valido) {
        return res.status(400).json({ error: validacion.error });
      }
    }

    const plantilla = await updatePlantillaComision(tenantId, plantillaId, {
      nombre,
      descripcion,
      icono,
      color,
      activo,
      config
    });

    res.json(plantilla);
  } catch (error: any) {
    if (error.message.includes('no tiene permisos')) {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/finanzas/plantillas-comision/:plantillaId
 * Elimina una plantilla
 */
router.delete('/plantillas-comision/:plantillaId', async (req: Request<PlantillaParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, plantillaId } = req.params;
    await deletePlantillaComision(tenantId, plantillaId);
    res.json({ success: true, message: 'Plantilla eliminada correctamente' });
  } catch (error: any) {
    if (error.message.includes('no tiene permisos')) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message.includes('siendo usada')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/finanzas/plantillas-comision/personalizada
 * Crea una plantilla personalizada para un usuario específico
 */
router.post('/plantillas-comision/personalizada', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { usuarioId, nombreUsuario, config } = req.body;

    if (!usuarioId || !nombreUsuario || !config) {
      return res.status(400).json({
        error: 'Se requiere usuarioId, nombreUsuario y config'
      });
    }

    const validacion = validarConfigPlantilla(config);
    if (!validacion.valido) {
      return res.status(400).json({ error: validacion.error });
    }

    const plantilla = await createPlantillaPersonalizada(
      tenantId,
      usuarioId,
      nombreUsuario,
      config
    );

    res.status(201).json(plantilla);
  } catch (error) {
    next(error);
  }
});

// ============================================
// Distribución Interna de Empresa
// ============================================

/**
 * GET /api/tenants/:tenantId/finanzas/distribucion-empresa
 * Obtiene la configuración de distribución interna
 */
router.get('/distribucion-empresa', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const config = await getDistribucionEmpresa(tenantId);
    res.json(config || { distribuciones: [] });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/finanzas/distribucion-empresa
 * Actualiza la configuración de distribución interna
 */
router.put('/distribucion-empresa', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { distribuciones } = req.body;

    if (!Array.isArray(distribuciones)) {
      return res.status(400).json({
        error: 'Se requiere un array de distribuciones'
      });
    }

    // Validar que los porcentajes no excedan 100
    const totalPorcentaje = distribuciones
      .filter((d: any) => d.tipo === 'porcentaje')
      .reduce((sum: number, d: any) => sum + (d.valor || 0), 0);

    if (totalPorcentaje > 100) {
      return res.status(400).json({
        error: 'La suma de porcentajes no puede exceder 100%'
      });
    }

    const config = await updateDistribucionEmpresa(tenantId, distribuciones);
    res.json(config);
  } catch (error) {
    next(error);
  }
});

// ============================================
// Asignación a Perfiles
// ============================================

/**
 * GET /api/tenants/:tenantId/finanzas/perfiles/:perfilId/plantilla
 * Obtiene la plantilla asignada a un perfil
 */
router.get('/perfiles/:perfilId/plantilla', async (req: Request<PerfilParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, perfilId } = req.params;
    const plantilla = await getPlantillaDePerfil(tenantId, perfilId);

    if (!plantilla) {
      return res.status(404).json({ error: 'No hay plantilla asignada' });
    }

    res.json(plantilla);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/finanzas/perfiles/:perfilId/plantilla
 * Asigna una plantilla a un perfil
 */
router.put('/perfiles/:perfilId/plantilla', async (req: Request<PerfilParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, perfilId } = req.params;
    const { plantillaId } = req.body;

    if (!plantillaId) {
      return res.status(400).json({ error: 'Se requiere plantillaId' });
    }

    await asignarPlantillaAPerfil(tenantId, perfilId, plantillaId);
    res.json({ success: true, message: 'Plantilla asignada correctamente' });
  } catch (error: any) {
    if (error.message.includes('no encontrada')) {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

// ============================================
// Cálculo de Comisiones
// ============================================

/**
 * POST /api/tenants/:tenantId/finanzas/calcular-comision
 * Calcula la distribución de una comisión según una plantilla
 */
router.post('/calcular-comision', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { montoComision, tipoPropiedad, escenario, plantillaId } = req.body;

    if (!montoComision || !tipoPropiedad || !escenario || !plantillaId) {
      return res.status(400).json({
        error: 'Se requiere montoComision, tipoPropiedad, escenario y plantillaId'
      });
    }

    const plantilla = await getPlantillaById(tenantId, plantillaId);
    if (!plantilla) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    const resultado = calcularDistribucionComision({
      montoComision,
      tipoPropiedad,
      escenario,
      plantilla
    });

    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

// ============================================
// Helpers
// ============================================

function validarConfigPlantilla(config: PlantillaComisionConfig): { valido: boolean; error?: string } {
  if (!config.distribuciones) {
    return { valido: false, error: 'Se requiere el campo distribuciones' };
  }

  const tipos = ['propiedad_lista', 'proyecto'] as const;
  const escenarios = ['solo_capta', 'solo_vende', 'capta_y_vende'] as const;

  for (const tipo of tipos) {
    if (!config.distribuciones[tipo]) {
      return { valido: false, error: `Falta configuración para ${tipo}` };
    }

    for (const escenario of escenarios) {
      const dist = config.distribuciones[tipo][escenario];
      if (!dist) {
        return { valido: false, error: `Falta configuración para ${tipo}.${escenario}` };
      }

      const suma = (dist.captador || 0) + (dist.vendedor || 0) + (dist.empresa || 0);
      // Permitir valores negativos (bonificaciones) pero advertir si suma > 100
      if (suma > 100) {
        return {
          valido: false,
          error: `La suma de porcentajes en ${tipo}.${escenario} (${suma}%) excede 100%`
        };
      }
    }
  }

  return { valido: true };
}

export default router;
