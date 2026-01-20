/**
 * MÓDULO DE IDIOMAS - Rutas para gestión de idiomas del tenant
 *
 * Este módulo maneja la configuración de idiomas habilitados del tenant.
 * Está aislado para que errores aquí NO afecten otros módulos.
 */

import express, { Request, Response, NextFunction } from 'express';
import { query } from '../../utils/db.js';

const router = express.Router({ mergeParams: true });

// Tipo para request con tenantId del parent router
interface TenantParams { tenantId: string }

// Idiomas por defecto disponibles en el sistema
const IDIOMAS_SISTEMA = [
  { code: 'es', label: 'Spanish', labelNativo: 'Español', flag: 'ES', flagEmoji: '🇪🇸', activo: true },
  { code: 'en', label: 'English', labelNativo: 'English', flag: 'US', flagEmoji: '🇺🇸', activo: true },
  { code: 'fr', label: 'French', labelNativo: 'Français', flag: 'FR', flagEmoji: '🇫🇷', activo: true },
  { code: 'pt', label: 'Portuguese', labelNativo: 'Português', flag: 'BR', flagEmoji: '🇧🇷', activo: true },
];

/**
 * GET /api/tenants/:tenantId/idiomas
 * Obtiene los idiomas habilitados para un tenant
 * Lee la columna idiomas_habilitados del tenant si existe,
 * sino devuelve español e inglés por defecto
 */
router.get('/', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;

    // Verificar si el tenant existe
    const tenantCheck = await query(`SELECT id FROM tenants WHERE id = $1`, [tenantId]);

    if (tenantCheck.rows.length === 0) {
      // Si no existe el tenant, devolver idiomas por defecto
      return res.json(IDIOMAS_SISTEMA.filter(i => i.code === 'es' || i.code === 'en').map(i => ({
        ...i,
        activo: true,
        esDefault: i.code === 'es'
      })));
    }

    // Obtener configuración de idiomas del tenant desde idiomas_disponibles (jsonb)
    let idiomasHabilitados: string[] = ['es', 'en'];
    let idiomaDefault = 'es';

    try {
      const result = await query(
        `SELECT idiomas_disponibles, idioma_default FROM tenants WHERE id = $1`,
        [tenantId]
      );

      if (result.rows.length > 0) {
        const row = result.rows[0];

        // idiomas_disponibles es JSONB, PostgreSQL lo devuelve ya parseado como array
        if (row.idiomas_disponibles && Array.isArray(row.idiomas_disponibles)) {
          idiomasHabilitados = row.idiomas_disponibles;
        } else if (row.idiomas_disponibles && typeof row.idiomas_disponibles === 'string') {
          // Por si acaso viene como string JSON
          idiomasHabilitados = JSON.parse(row.idiomas_disponibles);
        }

        idiomaDefault = row.idioma_default || 'es';
      }
    } catch (err) {
      console.log('Error obteniendo idiomas del tenant, usando valores por defecto:', err);
    }

    // Filtrar idiomas del sistema según los habilitados por el tenant
    const idiomasTenant = IDIOMAS_SISTEMA
      .filter(idioma => idiomasHabilitados.includes(idioma.code))
      .map(idioma => ({
        ...idioma,
        activo: true,
        esDefault: idioma.code === idiomaDefault
      }));

    // Si no hay idiomas configurados, devolver español e inglés por defecto
    if (idiomasTenant.length === 0) {
      return res.json(IDIOMAS_SISTEMA.filter(i => i.code === 'es' || i.code === 'en').map(i => ({
        ...i,
        activo: true,
        esDefault: i.code === 'es'
      })));
    }

    res.json(idiomasTenant);
  } catch (error) {
    console.error('Error en GET /idiomas:', error);
    // En caso de error, devolver idiomas por defecto
    res.json(IDIOMAS_SISTEMA.filter(i => i.code === 'es' || i.code === 'en').map(i => ({
      ...i,
      activo: true,
      esDefault: i.code === 'es'
    })));
  }
});

export default router;
