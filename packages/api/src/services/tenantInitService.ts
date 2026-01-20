/**
 * tenantInitService.ts
 *
 * Servicio para inicializar componentes_web cuando se crea un nuevo tenant.
 * Lee las plantillas de plantillas_pagina y crea los componentes correspondientes.
 *
 * ARQUITECTURA:
 * - plantillas_pagina: Define qué componentes van en cada tipo de página con config default
 * - componentes_web: Instancias de componentes por tenant, con tipo_pagina_id o global (null)
 * - catalogo_componentes: Catálogo de componentes disponibles
 */

import { query, getClient } from '../utils/db.js';
import type { PoolClient } from 'pg';

interface PlantillaComponente {
  id: string;
  tipoPaginaId: string;
  tipoPaginaCodigo: string;
  componenteCatalogoId: string;
  componenteTipo: string;
  componenteNombre: string;
  orden: number;
  datosDefault: Record<string, any>;
  esGlobal: boolean;
}

/**
 * Obtiene todas las plantillas de componentes agrupadas por tipo de página
 */
async function getPlantillasComponentes(
  client?: PoolClient
): Promise<PlantillaComponente[]> {
  const sql = `
    SELECT
      pp.id,
      pp.tipo_pagina_id as "tipoPaginaId",
      tp.codigo as "tipoPaginaCodigo",
      pp.componente_catalogo_id as "componenteCatalogoId",
      cc.tipo as "componenteTipo",
      cc.nombre as "componenteNombre",
      pp.orden,
      pp.datos_default as "datosDefault",
      pp.es_global as "esGlobal"
    FROM plantillas_pagina pp
    INNER JOIN tipos_pagina tp ON pp.tipo_pagina_id = tp.id
    INNER JOIN catalogo_componentes cc ON pp.componente_catalogo_id = cc.id
    WHERE pp.activo = true
    ORDER BY tp.codigo, pp.orden
  `;

  const executeQuery = client
    ? (sql: string, params: any[]) => client.query(sql, params)
    : (sql: string, params: any[]) => query(sql, params);

  const result = await executeQuery(sql, []);
  return result.rows.map((row: any) => ({
    ...row,
    datosDefault: typeof row.datosDefault === 'string'
      ? JSON.parse(row.datosDefault)
      : row.datosDefault || {}
  }));
}

/**
 * Inicializa los componentes_web para un nuevo tenant
 *
 * Lee las plantillas de plantillas_pagina y crea registros en componentes_web
 * para cada tipo de página.
 *
 * Los componentes globales (header, footer) se crean UNA sola vez
 * sin tipo_pagina_id. Los demás se crean con su tipo_pagina_id correspondiente.
 */
export async function initComponentesWebTenant(
  tenantId: string,
  clientOrNull?: PoolClient | null
): Promise<{ created: number; skipped: number }> {
  console.log(`\n🔧 Inicializando componentes_web para tenant ${tenantId}...`);

  const executeQuery = clientOrNull
    ? (sql: string, params: any[]) => clientOrNull.query(sql, params)
    : (sql: string, params: any[]) => query(sql, params);

  // Verificar si el tenant ya tiene componentes_web
  const existingComponents = await executeQuery(
    `SELECT COUNT(*) as count FROM componentes_web WHERE tenant_id = $1`,
    [tenantId]
  );

  if (Number(existingComponents.rows[0].count) > 0) {
    console.log(`  ⏭️  Tenant ya tiene ${existingComponents.rows[0].count} componentes, omitiendo inicialización`);
    return { created: 0, skipped: Number(existingComponents.rows[0].count) };
  }

  // Obtener plantillas
  const plantillas = await getPlantillasComponentes(clientOrNull || undefined);

  if (plantillas.length === 0) {
    console.log(`  ⚠️  No hay plantillas definidas en plantillas_pagina`);
    return { created: 0, skipped: 0 };
  }

  let created = 0;
  const globalComponentesCreados = new Set<string>(); // Para evitar duplicar header/footer

  // Agrupar por tipo de página
  const plantillasPorTipo = new Map<string, PlantillaComponente[]>();
  for (const p of plantillas) {
    if (!plantillasPorTipo.has(p.tipoPaginaCodigo)) {
      plantillasPorTipo.set(p.tipoPaginaCodigo, []);
    }
    plantillasPorTipo.get(p.tipoPaginaCodigo)!.push(p);
  }

  // Crear componentes globales primero (header, footer)
  console.log(`\n  📦 Creando componentes globales...`);

  for (const plantilla of plantillas) {
    if (plantilla.esGlobal && !globalComponentesCreados.has(plantilla.componenteTipo)) {
      await executeQuery(
        `INSERT INTO componentes_web (
          tenant_id,
          componente_catalogo_id,
          nombre,
          datos,
          activo,
          orden,
          tipo_pagina_id,
          tenant_rutas_config_custom_id
        ) VALUES ($1, $2, $3, $4, true, $5, NULL, NULL)`,
        [
          tenantId,
          plantilla.componenteCatalogoId,
          plantilla.componenteNombre,
          JSON.stringify(plantilla.datosDefault),
          plantilla.orden
        ]
      );

      globalComponentesCreados.add(plantilla.componenteTipo);
      created++;
      console.log(`    ✅ ${plantilla.componenteTipo} (global)`);
    }
  }

  // Crear componentes por tipo de página
  console.log(`\n  📦 Creando componentes por tipo de página...`);

  for (const [tipoPagina, componentesPlantilla] of Array.from(plantillasPorTipo.entries())) {
    const componentesNonGlobal = componentesPlantilla.filter(p => !p.esGlobal);

    if (componentesNonGlobal.length === 0) {
      continue;
    }

    for (const plantilla of componentesNonGlobal) {
      await executeQuery(
        `INSERT INTO componentes_web (
          tenant_id,
          componente_catalogo_id,
          nombre,
          datos,
          activo,
          orden,
          tipo_pagina_id,
          tenant_rutas_config_custom_id
        ) VALUES ($1, $2, $3, $4, true, $5, $6, NULL)`,
        [
          tenantId,
          plantilla.componenteCatalogoId,
          `${plantilla.componenteNombre} - ${tipoPagina}`,
          JSON.stringify(plantilla.datosDefault),
          plantilla.orden,
          plantilla.tipoPaginaId
        ]
      );

      created++;
    }

    console.log(`    ✅ ${tipoPagina}: ${componentesNonGlobal.length} componente(s)`);
  }

  console.log(`\n✅ Inicialización completada: ${created} componentes creados`);
  return { created, skipped: 0 };
}

/**
 * Reinicializa los componentes de un tenant (elimina y vuelve a crear)
 * CUIDADO: Esto elimina TODOS los componentes existentes y su configuración personalizada
 */
export async function reinitComponentesWebTenant(
  tenantId: string
): Promise<{ deleted: number; created: number }> {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Contar componentes existentes
    const existing = await client.query(
      `SELECT COUNT(*) as count FROM componentes_web WHERE tenant_id = $1`,
      [tenantId]
    );
    const deletedCount = Number(existing.rows[0].count);

    // Eliminar todos los componentes existentes
    await client.query(
      `DELETE FROM componentes_web WHERE tenant_id = $1`,
      [tenantId]
    );

    console.log(`🗑️  Eliminados ${deletedCount} componentes existentes`);

    // Reinicializar
    const { created } = await initComponentesWebTenant(tenantId, client);

    await client.query('COMMIT');

    return { deleted: deletedCount, created };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Inicializa componentes para un tipo de página específico
 * Útil cuando se agrega un nuevo tipo de página a un tenant existente
 */
export async function initComponentesTipoPagina(
  tenantId: string,
  tipoPaginaCodigo: string
): Promise<{ created: number }> {
  console.log(`🔧 Inicializando componentes para ${tipoPaginaCodigo} en tenant ${tenantId}...`);

  // Obtener plantillas solo para este tipo de página
  const sql = `
    SELECT
      pp.id,
      pp.tipo_pagina_id as "tipoPaginaId",
      tp.codigo as "tipoPaginaCodigo",
      pp.componente_catalogo_id as "componenteCatalogoId",
      cc.tipo as "componenteTipo",
      cc.nombre as "componenteNombre",
      pp.orden,
      pp.datos_default as "datosDefault",
      pp.es_global as "esGlobal"
    FROM plantillas_pagina pp
    INNER JOIN tipos_pagina tp ON pp.tipo_pagina_id = tp.id
    INNER JOIN catalogo_componentes cc ON pp.componente_catalogo_id = cc.id
    WHERE pp.activo = true AND tp.codigo = $1
    ORDER BY pp.orden
  `;

  const plantillasResult = await query(sql, [tipoPaginaCodigo]);

  if (plantillasResult.rows.length === 0) {
    console.log(`  ⚠️  No hay plantillas definidas para ${tipoPaginaCodigo}`);
    return { created: 0 };
  }

  let created = 0;

  for (const plantilla of plantillasResult.rows) {
    // Omitir componentes globales (ya deberían existir)
    if (plantilla.esGlobal) {
      continue;
    }

    // Verificar si ya existe
    const exists = await query(
      `SELECT id FROM componentes_web
       WHERE tenant_id = $1 AND componente_catalogo_id = $2 AND tipo_pagina_id = $3`,
      [tenantId, plantilla.componenteCatalogoId, plantilla.tipoPaginaId]
    );

    if (exists.rows.length === 0) {
      const datosDefault = typeof plantilla.datosDefault === 'string'
        ? JSON.parse(plantilla.datosDefault)
        : plantilla.datosDefault || {};

      await query(
        `INSERT INTO componentes_web (
          tenant_id,
          componente_catalogo_id,
          nombre,
          datos,
          activo,
          orden,
          tipo_pagina_id,
          tenant_rutas_config_custom_id
        ) VALUES ($1, $2, $3, $4, true, $5, $6, NULL)`,
        [
          tenantId,
          plantilla.componenteCatalogoId,
          `${plantilla.componenteNombre} - ${tipoPaginaCodigo}`,
          JSON.stringify(datosDefault),
          plantilla.orden,
          plantilla.tipoPaginaId
        ]
      );

      created++;
    }
  }

  console.log(`✅ ${created} componentes creados para ${tipoPaginaCodigo}`);
  return { created };
}

/**
 * Verifica si un tenant tiene todos los componentes necesarios
 * según las plantillas definidas
 */
export async function verificarComponentesTenant(
  tenantId: string
): Promise<{
  completo: boolean;
  faltantes: Array<{ tipoPagina: string; componente: string }>;
  existentes: number;
}> {
  // Obtener todas las plantillas
  const plantillas = await getPlantillasComponentes();

  // Obtener componentes existentes del tenant
  const existentesResult = await query(
    `SELECT
       c.componente_catalogo_id,
       c.tipo_pagina_id,
       tp.codigo as "tipoPaginaCodigo"
     FROM componentes_web c
     LEFT JOIN tipos_pagina tp ON c.tipo_pagina_id = tp.id
     WHERE c.tenant_id = $1`,
    [tenantId]
  );

  const existentes = new Set<string>();
  for (const e of existentesResult.rows) {
    // Key: componenteCatalogoId|tipoPaginaId (null para globales)
    existentes.add(`${e.componente_catalogo_id}|${e.tipo_pagina_id || 'global'}`);
  }

  const faltantes: Array<{ tipoPagina: string; componente: string }> = [];

  for (const p of plantillas) {
    const key = p.esGlobal
      ? `${p.componenteCatalogoId}|global`
      : `${p.componenteCatalogoId}|${p.tipoPaginaId}`;

    if (!existentes.has(key)) {
      faltantes.push({
        tipoPagina: p.esGlobal ? 'global' : p.tipoPaginaCodigo,
        componente: p.componenteNombre
      });
    }
  }

  return {
    completo: faltantes.length === 0,
    faltantes,
    existentes: existentesResult.rows.length
  };
}

// Exportar funciones legadas por compatibilidad (deprecadas)
/** @deprecated Usar initComponentesWebTenant */
export const inicializarTenantCompleto = initComponentesWebTenant;
/** @deprecated Usar reinitComponentesWebTenant */
export const reinicializarTenant = reinitComponentesWebTenant;

export default {
  initComponentesWebTenant,
  reinitComponentesWebTenant,
  initComponentesTipoPagina,
  verificarComponentesTenant,
  // Legadas
  inicializarTenantCompleto,
  reinicializarTenant
};
