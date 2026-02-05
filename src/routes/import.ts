/**
 * Rutas de Importación de Propiedades
 *
 * Endpoints para importar propiedades desde proveedores externos
 * como Alterestate y EasyBroker.
 */

import express from 'express';
import {
  getAlterestateCredentials,
  testConnection,
  analyzeProperties,
  importProperties,
  syncProperties,
  fetchPropertyDetail,
  fetchAllProperties,
} from '../services/alterestateImportService.js';
import { query } from '../utils/db.js';

const router = express.Router();

// ============================================================================
// ALTERESTATE ENDPOINTS
// ============================================================================

/**
 * GET /api/import/alterestate/test
 * Prueba la conexión con Alterestate
 */
router.get('/alterestate/test', async (req, res) => {
  try {
    const tenantId = req.query.tenant_id as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenant_id is required',
      });
    }

    // Obtener credenciales
    const credentials = await getAlterestateCredentials(tenantId);

    if (!credentials) {
      return res.status(404).json({
        success: false,
        error: 'No Alterestate credentials found for this tenant',
        hint: 'Please configure Alterestate API key in tenant settings',
      });
    }

    // Probar conexión
    const result = await testConnection(credentials.apiKey);

    return res.json({
      success: result.success,
      message: result.message,
      totalProperties: result.count,
    });

  } catch (error: any) {
    console.error('Error testing Alterestate connection:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/import/alterestate/detail/:cid
 * Obtiene el detalle RAW de una propiedad de Alterestate para debugging
 */
router.get('/alterestate/detail/:cid', async (req, res) => {
  try {
    const tenantId = req.query.tenant_id as string;
    const cid = parseInt(req.params.cid, 10);

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenant_id is required',
      });
    }

    const credentials = await getAlterestateCredentials(tenantId);

    if (!credentials) {
      return res.status(404).json({
        success: false,
        error: 'No Alterestate credentials found',
      });
    }

    // Obtener lista para encontrar el slug
    const allProperties = await fetchAllProperties(credentials.apiKey);
    const property = allProperties.find(p => p.cid === cid);

    if (!property) {
      return res.status(404).json({
        success: false,
        error: `Property with CID ${cid} not found`,
      });
    }

    // Obtener detalle completo
    const detail = await fetchPropertyDetail(credentials.apiKey, property.slug, property);

    return res.json({
      success: true,
      cid: cid,
      slug: property.slug,
      rawData: detail,
      keys: Object.keys(detail),
    });

  } catch (error: any) {
    console.error('Error getting Alterestate property detail:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/import/alterestate/analyze
 * Analiza las propiedades disponibles en Alterestate sin importar
 */
router.get('/alterestate/analyze', async (req, res) => {
  try {
    const tenantId = req.query.tenant_id as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenant_id is required',
      });
    }

    const credentials = await getAlterestateCredentials(tenantId);

    if (!credentials) {
      return res.status(404).json({
        success: false,
        error: 'No Alterestate credentials found',
      });
    }

    const analysis = await analyzeProperties(tenantId, credentials.apiKey);

    return res.json({
      success: true,
      data: {
        totalProperties: analysis.totalCount,
        sampleProperty: analysis.sampleProperty,
        fieldCoverage: analysis.fieldCoverage,
      },
    });

  } catch (error: any) {
    console.error('Error analyzing Alterestate properties:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/import/alterestate/import
 * Importa propiedades desde Alterestate (solo nuevas)
 */
router.post('/alterestate/import', async (req, res) => {
  try {
    const { tenant_id, limit = 10, cid } = req.body;

    if (!tenant_id) {
      return res.status(400).json({
        success: false,
        error: 'tenant_id is required',
      });
    }

    const credentials = await getAlterestateCredentials(tenant_id);

    if (!credentials) {
      return res.status(404).json({
        success: false,
        error: 'No Alterestate credentials found',
      });
    }

    const result = await importProperties(tenant_id, credentials.apiKey, {
      limit: parseInt(limit, 10),
      cid: cid ? parseInt(cid, 10) : undefined,
    });

    return res.json({
      success: true,
      mode: 'import',
      data: result,
    });

  } catch (error: any) {
    console.error('Error importing from Alterestate:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/import/alterestate/sync
 * Sincroniza propiedades (actualiza existentes, crea nuevas)
 */
router.post('/alterestate/sync', async (req, res) => {
  try {
    const { tenant_id, limit = 10 } = req.body;

    if (!tenant_id) {
      return res.status(400).json({
        success: false,
        error: 'tenant_id is required',
      });
    }

    const credentials = await getAlterestateCredentials(tenant_id);

    if (!credentials) {
      return res.status(404).json({
        success: false,
        error: 'No Alterestate credentials found',
      });
    }

    const result = await syncProperties(tenant_id, credentials.apiKey, {
      limit: parseInt(limit, 10),
    });

    return res.json({
      success: true,
      mode: 'sync',
      data: result,
    });

  } catch (error: any) {
    console.error('Error syncing from Alterestate:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// CREDENCIALES ENDPOINTS
// ============================================================================

/**
 * GET /api/import/credentials
 * Obtiene las credenciales de importación configuradas para un tenant
 */
router.get('/credentials', async (req, res) => {
  try {
    const tenantId = req.query.tenant_id as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenant_id is required',
      });
    }

    const sql = `
      SELECT
        id,
        alterestate_connected,
        alterestate_last_sync_at,
        easybroker_connected,
        easybroker_last_sync_at,
        created_at,
        updated_at
      FROM tenant_api_credentials
      WHERE tenant_id = $1
    `;

    const result = await query(sql, [tenantId]);

    // Transformar a formato esperado por el frontend
    const credentials = [];
    if (result.rows.length > 0) {
      const row = result.rows[0];
      if (row.alterestate_connected) {
        credentials.push({
          id: row.id,
          provider: 'alterestate',
          is_active: row.alterestate_connected,
          created_at: row.created_at,
          updated_at: row.alterestate_last_sync_at || row.updated_at,
        });
      }
      if (row.easybroker_connected) {
        credentials.push({
          id: row.id,
          provider: 'easybroker',
          is_active: row.easybroker_connected,
          created_at: row.created_at,
          updated_at: row.easybroker_last_sync_at || row.updated_at,
        });
      }
    }

    return res.json({
      success: true,
      data: credentials,
    });

  } catch (error: any) {
    console.error('Error getting import credentials:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/import/credentials
 * Guarda o actualiza credenciales de importación
 */
router.post('/credentials', async (req, res) => {
  try {
    const { tenant_id, provider, api_key, is_active = true } = req.body;

    if (!tenant_id || !provider || !api_key) {
      return res.status(400).json({
        success: false,
        error: 'tenant_id, provider, and api_key are required',
      });
    }

    // Validar provider
    if (!['alterestate', 'easybroker'].includes(provider)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider. Must be alterestate or easybroker',
      });
    }

    // Verificar si ya existe registro para este tenant
    const existingSql = `
      SELECT id FROM tenant_api_credentials
      WHERE tenant_id = $1
    `;
    const existing = await query(existingSql, [tenant_id]);

    const apiKeyField = `${provider}_api_key_encrypted`;
    const connectedField = `${provider}_connected`;
    const lastSyncField = `${provider}_last_sync_at`;

    if (existing.rows.length > 0) {
      // Actualizar
      const updateSql = `
        UPDATE tenant_api_credentials
        SET ${apiKeyField} = $1, ${connectedField} = $2, updated_at = NOW()
        WHERE tenant_id = $3
        RETURNING id
      `;
      const result = await query(updateSql, [api_key, is_active, tenant_id]);

      return res.json({
        success: true,
        action: 'updated',
        data: {
          id: result.rows[0].id,
          provider,
          is_active,
        },
      });

    } else {
      // Crear nuevo registro
      const insertSql = `
        INSERT INTO tenant_api_credentials (tenant_id, ${apiKeyField}, ${connectedField})
        VALUES ($1, $2, $3)
        RETURNING id
      `;
      const result = await query(insertSql, [tenant_id, api_key, is_active]);

      return res.json({
        success: true,
        action: 'created',
        data: {
          id: result.rows[0].id,
          provider,
          is_active,
        },
      });
    }

  } catch (error: any) {
    console.error('Error saving import credentials:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/import/credentials/:id
 * Elimina credenciales de importación (desconecta el provider)
 */
router.delete('/credentials/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const provider = req.query.provider as string;

    if (!provider || !['alterestate', 'easybroker'].includes(provider)) {
      return res.status(400).json({
        success: false,
        error: 'Valid provider query param required (alterestate or easybroker)',
      });
    }

    const apiKeyField = `${provider}_api_key_encrypted`;
    const connectedField = `${provider}_connected`;

    const sql = `
      UPDATE tenant_api_credentials
      SET ${apiKeyField} = NULL, ${connectedField} = FALSE, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `;

    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Credential not found',
      });
    }

    return res.json({
      success: true,
      deleted: { id: result.rows[0].id, provider },
    });

  } catch (error: any) {
    console.error('Error deleting import credentials:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// HISTORIAL DE IMPORTACIONES
// ============================================================================

/**
 * GET /api/import/history
 * Obtiene el historial de importaciones de un tenant
 */
router.get('/history', async (req, res) => {
  try {
    const tenantId = req.query.tenant_id as string;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenant_id is required',
      });
    }

    // Obtener propiedades importadas recientemente
    const sql = `
      SELECT
        id,
        titulo,
        external_id,
        external_source,
        estado_propiedad,
        created_at,
        updated_at
      FROM propiedades
      WHERE tenant_id = $1
        AND external_source IS NOT NULL
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await query(sql, [tenantId, limit]);

    // Estadísticas por fuente
    const statsSql = `
      SELECT
        external_source,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE estado_propiedad = 'disponible') as disponibles,
        MAX(created_at) as ultima_importacion
      FROM propiedades
      WHERE tenant_id = $1
        AND external_source IS NOT NULL
      GROUP BY external_source
    `;

    const stats = await query(statsSql, [tenantId]);

    return res.json({
      success: true,
      data: {
        recentImports: result.rows,
        statsBySource: stats.rows,
      },
    });

  } catch (error: any) {
    console.error('Error getting import history:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// CSV IMPORT ENDPOINTS (Agent Assignment)
// ============================================================================

import {
  analyzeCSVAgents,
  assignAgentsToProperties,
  getPropertiesWithoutAgent,
  getAgentAssignmentStats,
  getTenantUsers,
} from '../services/csvImportService.js';

/**
 * GET /api/import/csv/users
 * Obtiene los usuarios del tenant para mapeo de agentes
 */
router.get('/csv/users', async (req, res) => {
  try {
    const tenantId = req.query.tenant_id as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenant_id is required',
      });
    }

    const users = await getTenantUsers(tenantId);

    return res.json({
      success: true,
      data: users,
    });

  } catch (error: any) {
    console.error('Error getting tenant users:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/import/csv/analyze-agents
 * Analiza un CSV y mapea agentes a usuarios
 */
router.post('/csv/analyze-agents', async (req, res) => {
  try {
    const { tenant_id, csv_content } = req.body;

    if (!tenant_id || !csv_content) {
      return res.status(400).json({
        success: false,
        error: 'tenant_id and csv_content are required',
      });
    }

    const analysis = await analyzeCSVAgents(csv_content, tenant_id);

    return res.json({
      success: true,
      data: analysis,
    });

  } catch (error: any) {
    console.error('Error analyzing CSV agents:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/import/csv/assign-agents
 * Asigna agentes a propiedades basándose en el análisis previo
 */
router.post('/csv/assign-agents', async (req, res) => {
  try {
    const { tenant_id, property_agent_map, agent_mappings } = req.body;

    if (!tenant_id || !property_agent_map || !agent_mappings) {
      return res.status(400).json({
        success: false,
        error: 'tenant_id, property_agent_map, and agent_mappings are required',
      });
    }

    const result = await assignAgentsToProperties(
      tenant_id,
      property_agent_map,
      agent_mappings
    );

    return res.json({
      success: true,
      data: result,
    });

  } catch (error: any) {
    console.error('Error assigning agents:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/import/csv/unassigned
 * Obtiene propiedades sin agente asignado
 */
router.get('/csv/unassigned', async (req, res) => {
  try {
    const tenantId = req.query.tenant_id as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenant_id is required',
      });
    }

    const properties = await getPropertiesWithoutAgent(tenantId);

    return res.json({
      success: true,
      data: properties,
    });

  } catch (error: any) {
    console.error('Error getting unassigned properties:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/import/csv/stats
 * Obtiene estadísticas de asignación de agentes
 */
router.get('/csv/stats', async (req, res) => {
  try {
    const tenantId = req.query.tenant_id as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenant_id is required',
      });
    }

    const stats = await getAgentAssignmentStats(tenantId);

    return res.json({
      success: true,
      data: stats,
    });

  } catch (error: any) {
    console.error('Error getting agent stats:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// VENTAS CSV IMPORT
// ============================================================================

import {
  previewImportVentas,
  importarVentas,
} from '../services/ventasImportService.js';

/**
 * POST /api/import/ventas/preview
 * Analiza un CSV de ventas sin insertar nada
 */
router.post('/ventas/preview', async (req, res) => {
  try {
    const { tenant_id, csv_content } = req.body;

    if (!tenant_id || !csv_content) {
      return res.status(400).json({
        success: false,
        error: 'tenant_id and csv_content are required',
      });
    }

    const preview = await previewImportVentas(tenant_id, csv_content);

    return res.json({
      success: true,
      data: preview,
    });
  } catch (error: any) {
    console.error('Error previewing ventas import:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/import/ventas
 * Importa ventas desde un CSV
 */
router.post('/ventas', async (req, res) => {
  try {
    const { tenant_id, csv_content } = req.body;

    if (!tenant_id || !csv_content) {
      return res.status(400).json({
        success: false,
        error: 'tenant_id and csv_content are required',
      });
    }

    const result = await importarVentas(tenant_id, csv_content);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error importing ventas:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
