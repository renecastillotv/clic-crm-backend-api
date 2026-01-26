/**
 * MÓDULO DE CONFIGURACIÓN DE COMISIONES
 *
 * Este módulo maneja la configuración de comisiones del tenant.
 * Está aislado para que errores aquí NO afecten otros módulos.
 */

import express, { Request, Response, NextFunction } from 'express';
import { query } from '../../utils/db.js';
import { resolveUserScope } from '../../middleware/scopeResolver.js';

const router = express.Router({ mergeParams: true });
router.use(resolveUserScope);

// Tipo para request con tenantId del parent router
interface TenantParams { tenantId: string }

/**
 * GET /api/tenants/:tenantId/comision-config
 * Obtiene la configuración de comisiones por defecto del tenant
 */
router.get('/', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;

    const sql = `
      SELECT
        red_global_comision_default,
        connect_comision_default
      FROM tenants
      WHERE id = $1 AND activo = true
      LIMIT 1
    `;

    const result = await query(sql, [tenantId]);

    if (result.rows.length === 0) {
      return res.json({
        red_global_comision_default: null,
        connect_comision_default: null
      });
    }

    const row = result.rows[0];
    res.json({
      red_global_comision_default: row.red_global_comision_default || null,
      connect_comision_default: row.connect_comision_default || null
    });
  } catch (error) {
    next(error);
  }
});

export default router;
