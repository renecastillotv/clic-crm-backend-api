/**
 * Servicio para gestionar componentes web
 * 
 * Este servicio se encarga de obtener y formatear los componentes
 * con toda su configuración y datos listos para el frontend
 */

import { query } from '../utils/db.js';
import type { ComponenteDataEstructurado } from '../types/componentes.js';
import { validateAndNormalizeComponentData } from '../validators/componentSchema.js';

export interface ComponenteWebResponse {
  id: string;
  tipo: string;
  variante: string;
  datos: ComponenteDataEstructurado; // Formato estructurado obligatorio
  activo: boolean;
  orden: number;
  paginaId?: string;
  predeterminado?: boolean;
  scope?: 'tenant' | 'page_type' | 'page';
  nombre?: string | null;
}

/**
 * Obtiene todos los componentes activos de un tenant
 * Ordenados y listos para renderizar
 * 
 * @param soloPredeterminados - Si es true, solo devuelve un componente por tipo (el predeterminado)
 *                               Si es false, devuelve todos los componentes (útil para el CRM)
 */
export async function getComponentesByTenant(
  tenantId: string,
  paginaId?: string,
  soloPredeterminados: boolean = true
): Promise<ComponenteWebResponse[]> {
  try {
    let sql: string;
    const params: any[] = [tenantId];
    
    if (soloPredeterminados) {
      // Solo componentes predeterminados (para el frontend web)
      sql = `
        WITH ranked_components AS (
          SELECT 
            id,
            tipo,
            variante,
            datos,
            activo,
            orden,
            pagina_id as "paginaId",
            predeterminado,
            created_at,
            ROW_NUMBER() OVER (
              PARTITION BY tipo 
              ORDER BY 
                CASE WHEN pagina_id IS NOT NULL THEN 0 ELSE 1 END,
                CASE WHEN predeterminado = true THEN 0 ELSE 1 END,
                orden ASC, 
                created_at ASC
            ) as rn
          FROM componentes_web
          WHERE tenant_id = $1 
            AND activo = true
      `;
      
      // Si se especifica una página, filtrar por página o componentes globales (pagina_id IS NULL)
      if (paginaId) {
        // Excluir property_list global de páginas que no sean listado (homepage, propiedades, etc)
        // Solo incluir property_list si es específico de la página o si la página lo requiere
        sql += ` AND (
          pagina_id = $2::uuid 
          OR (pagina_id IS NULL AND tipo != 'property_list')
        )`;
        params.push(paginaId);
        console.log(`🔍 [Frontend] Filtrando por paginaId: ${paginaId} (excluyendo property_list global)`);
      } else {
        // Si no se especifica página, solo componentes globales
        sql += ` AND pagina_id IS NULL`;
      }
      
      sql += `
        )
        SELECT
          id,
          tipo,
          variante,
          datos,
          activo,
          orden,
          "paginaId",
          predeterminado
        FROM ranked_components
        WHERE rn = 1
        ORDER BY
          orden ASC,
          created_at ASC
      `;
    } else {
      // Todos los componentes (para el CRM)
      // IMPORTANTE: NO filtrar por activo aquí, para que el CRM pueda ver todos (activos e inactivos)
      
      // Primero hacer una consulta de diagnóstico para ver TODOS los componentes
      const diagnosticQuery = `SELECT id, tipo, pagina_id, activo, tenant_id FROM componentes_web WHERE tenant_id = $1`;
      const diagnostic = await query(diagnosticQuery, [tenantId]);
      console.log(`🔍 DIAGNÓSTICO: Total componentes en BD para tenant ${tenantId}: ${diagnostic.rows.length}`);
      diagnostic.rows.forEach((row: any, idx: number) => {
        console.log(`  [${idx}] ID: ${row.id}, tipo: ${row.tipo}, pagina_id: ${row.pagina_id}, activo: ${row.activo}`);
      });
      
      sql = `
        SELECT 
          id,
          tipo,
          variante,
          datos,
          activo,
          orden,
          pagina_id as "paginaId",
          predeterminado
        FROM componentes_web
        WHERE tenant_id = $1
      `;
      
      // Si se especifica una página, filtrar por página o componentes globales (pagina_id IS NULL)
      if (paginaId) {
        // Usar comparación de texto para evitar problemas de tipo UUID
        sql += ` AND (pagina_id::text = $2::text OR pagina_id IS NULL)`;
        params.push(paginaId);
        console.log(`🔍 Filtrando por paginaId: ${paginaId} (tipo: ${typeof paginaId})`);
        console.log(`🔍 SQL completo: ${sql}`);
        console.log(`🔍 Parámetros: ${JSON.stringify(params)}`);
      }
      // Si no se especifica paginaId y todos=true, devolver TODOS los componentes (no filtrar)
      // Si todos=false, este bloque no se ejecuta (soloPredeterminados ya filtró arriba)
      
      sql += ` ORDER BY orden ASC, created_at ASC`;
    }
    
    console.log(`📝 SQL Query: ${sql}`);
    console.log(`📝 Parámetros:`, params);
    
    const result = await query(sql, params);
    
    console.log(`📊 Resultado de la consulta: ${result.rows.length} filas`);
    if (result.rows.length > 0) {
      console.log(`📋 Primer componente:`, {
        id: result.rows[0].id,
        tipo: result.rows[0].tipo,
        paginaId: result.rows[0].paginaId,
        activo: result.rows[0].activo
      });
    }

    return result.rows.map((row: any) => {
      const datosRaw = typeof row.datos === 'string' ? JSON.parse(row.datos) : row.datos;
      
      // Los datos deben estar en formato estructurado (static_data, dynamic_data, styles, toggles)
      // Si no lo están, es un error de configuración
      if (!datosRaw.static_data) {
        console.warn(`⚠️ Componente ${row.id} (${row.tipo}) no tiene formato estructurado. Se espera static_data.`);
      }
      
      // Validar y normalizar datos
      let datosNormalizados: ComponenteDataEstructurado;
      try {
        datosNormalizados = validateAndNormalizeComponentData(datosRaw);
      } catch (error: any) {
        console.warn(`⚠️ Componente ${row.id} (${row.tipo}) tiene datos inválidos:`, error.message);
        // Si la validación falla, usar datos raw pero mostrar warning
        datosNormalizados = datosRaw;
      }

      return {
        id: row.id,
        tipo: row.tipo,
        variante: row.variante,
        datos: datosNormalizados,
        activo: row.activo,
        orden: row.orden,
        paginaId: row.paginaId || undefined,
        predeterminado: row.predeterminado || false,
      };
    });
  } catch (error: any) {
    console.error('Error al obtener componentes:', error);
    throw new Error(`Error al obtener componentes: ${error.message}`);
  }
}

/**
 * Obtiene el tema de un tenant
 */
export async function getTemaByTenant(tenantId: string): Promise<Record<string, string> | null> {
  try {
    const sql = `
      SELECT colores
      FROM temas_tenant
      WHERE tenant_id = $1 AND activo = true
      LIMIT 1
    `;
    
    const result = await query(sql, [tenantId]);
    
    if (result.rows.length === 0) {
      // Retornar tema por defecto
      return {
        primary: '#667eea',
        secondary: '#764ba2',
        accent: '#f56565',
        background: '#ffffff',
        text: '#1a202c',
        textSecondary: '#718096',
        border: '#e2e8f0',
        success: '#48bb78',
        warning: '#ed8936',
        error: '#f56565',
      };
    }
    
    const colores = result.rows[0].colores;
    return typeof colores === 'string' ? JSON.parse(colores) : colores;
  } catch (error: any) {
    console.error('Error al obtener tema:', error);
    // Retornar tema por defecto en caso de error
    return {
      primary: '#667eea',
      secondary: '#764ba2',
      accent: '#f56565',
      background: '#ffffff',
      text: '#1a202c',
      textSecondary: '#718096',
      border: '#e2e8f0',
      success: '#48bb78',
      warning: '#ed8936',
      error: '#f56565',
    };
  }
}

/**
 * Crea o actualiza un componente
 * Si se marca como predeterminado, desmarca los otros del mismo tipo
 */
// Función helper para validar UUID
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function saveComponente(
  tenantId: string,
  componente: {
    id?: string;
    tipo: string;
    variante: string;
    datos: ComponenteDataEstructurado; // Formato estructurado obligatorio
    activo?: boolean;
    orden?: number;
    paginaId?: string | null;
    predeterminado?: boolean;
    scope?: 'tenant' | 'page_type' | 'page'; // Nuevo: scope del componente
    nombre?: string | null; // Nuevo: nombre identificador
    tipoPagina?: string | null; // Nuevo: tipo de página para scope='page_type'
  }
): Promise<ComponenteWebResponse> {
  try {
    // Validar y normalizar datos antes de guardar
    const datosValidados = validateAndNormalizeComponentData(componente.datos);
    const datosJson = JSON.stringify(datosValidados);
    const activo = componente.activo !== undefined ? componente.activo : true;
    const orden = componente.orden !== undefined ? componente.orden : 0;
    const predeterminado = componente.predeterminado === true;
    // Si tiene paginaId y no tiene scope, asumir scope='page'
    const scope = componente.scope || (componente.paginaId ? 'page' : 'tenant');
    const nombre = componente.nombre || null;
    const tipoPagina = componente.tipoPagina || null;

    // Validar que si viene un ID, sea un UUID válido
    // Si no es válido, tratarlo como componente nuevo (no incluir ID)
    const tieneIdValido = componente.id && isValidUUID(componente.id);
    const componenteId = tieneIdValido ? componente.id : undefined;

    // Si se marca como predeterminado, desmarcar otros del mismo tipo
    if (predeterminado) {
      await query(
        `UPDATE componentes_web 
         SET predeterminado = false 
         WHERE tenant_id = $1 AND tipo = $2 AND id != COALESCE($3, '00000000-0000-0000-0000-000000000000'::uuid)`,
        [tenantId, componente.tipo, componenteId || null]
      );
    }

    if (componenteId) {
      // Actualizar componente existente
      const sql = `
        UPDATE componentes_web
        SET
          tipo = $1,
          variante = $2,
          datos = $3,
          activo = $4,
          orden = $5,
          pagina_id = $6,
          predeterminado = $7,
          scope = $8,
          nombre = COALESCE($9, nombre),
          tipo_pagina = $10,
          updated_at = NOW()
        WHERE id = $11 AND tenant_id = $12
        RETURNING
          id,
          tipo,
          variante,
          datos,
          activo,
          orden,
          pagina_id as "paginaId",
          predeterminado,
          scope,
          nombre,
          tipo_pagina as "tipoPagina"
      `;

      const paginaIdValue = componente.paginaId ? componente.paginaId : null;
      console.log(`💾 Actualizando componente ${componenteId} - paginaId: ${paginaIdValue}, scope: ${scope}, tipoPagina: ${tipoPagina}`);

      const result = await query(sql, [
        componente.tipo,
        componente.variante,
        datosJson,
        activo,
        orden,
        paginaIdValue,
        predeterminado,
        scope,
        nombre,
        tipoPagina,
        componenteId,
        tenantId,
      ]);

      console.log(`✅ Componente actualizado - paginaId: ${result.rows[0].paginaId}, scope: ${result.rows[0].scope}`);

      if (result.rows.length === 0) {
        throw new Error('Componente no encontrado o no pertenece al tenant');
      }

      return {
        id: result.rows[0].id,
        tipo: result.rows[0].tipo,
        variante: result.rows[0].variante,
        datos: typeof result.rows[0].datos === 'string'
          ? JSON.parse(result.rows[0].datos)
          : result.rows[0].datos,
        activo: result.rows[0].activo,
        orden: result.rows[0].orden,
        paginaId: result.rows[0].paginaId || undefined,
        predeterminado: result.rows[0].predeterminado || false,
        scope: result.rows[0].scope,
        nombre: result.rows[0].nombre,
      };
    } else {
      // Si es nuevo y no hay predeterminado del mismo tipo, marcarlo como predeterminado
      const checkPredeterminado = await query(
        `SELECT COUNT(*) as count 
         FROM componentes_web 
         WHERE tenant_id = $1 AND tipo = $2 AND predeterminado = true AND activo = true
         AND (pagina_id = $3 OR (pagina_id IS NULL AND $3 IS NULL))`,
        [tenantId, componente.tipo, componente.paginaId || null]
      );
      
      const esPredeterminado = predeterminado || checkPredeterminado.rows[0].count === '0';

      console.log(`📝 Creando nuevo componente - tipo: ${componente.tipo}, paginaId: ${componente.paginaId}, scope: ${scope}, activo: ${activo}`);

      // Crear nuevo componente
      const paginaIdValue = componente.paginaId ? componente.paginaId : null;
      console.log(`💾 Insertando componente - paginaId: ${paginaIdValue}, scope: ${scope}`);

      const sql = `
        INSERT INTO componentes_web (
          tenant_id,
          tipo,
          variante,
          datos,
          activo,
          orden,
          pagina_id,
          predeterminado,
          scope,
          nombre,
          tipo_pagina,
          es_activo
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::uuid, $8, $9, $10, $11, true)
        RETURNING
          id,
          tipo,
          variante,
          datos,
          activo,
          orden,
          pagina_id as "paginaId",
          predeterminado,
          scope,
          nombre,
          tipo_pagina as "tipoPagina"
      `;

      const result = await query(sql, [
        tenantId,
        componente.tipo,
        componente.variante,
        datosJson,
        activo,
        orden,
        paginaIdValue,
        esPredeterminado,
        scope,
        nombre,
        tipoPagina,
      ]);

      console.log(`✅ Componente insertado - ID: ${result.rows[0].id}, paginaId: ${result.rows[0].paginaId}, scope: ${result.rows[0].scope}`);

      // Si se marcó como predeterminado, desmarcar otros del mismo tipo y página
      if (esPredeterminado) {
        await query(
          `UPDATE componentes_web 
           SET predeterminado = false 
           WHERE tenant_id = $1 AND tipo = $2 AND id != $3
           AND (pagina_id = $4 OR (pagina_id IS NULL AND $4 IS NULL))`,
          [tenantId, componente.tipo, result.rows[0].id, componente.paginaId || null]
        );
      }

      const saved = {
        id: result.rows[0].id,
        tipo: result.rows[0].tipo,
        variante: result.rows[0].variante,
        datos: typeof result.rows[0].datos === 'string'
          ? JSON.parse(result.rows[0].datos)
          : result.rows[0].datos,
        activo: result.rows[0].activo,
        orden: result.rows[0].orden,
        paginaId: result.rows[0].paginaId || undefined,
        predeterminado: result.rows[0].predeterminado || false,
        scope: result.rows[0].scope,
        nombre: result.rows[0].nombre,
      };

      console.log(`📤 Retornando componente guardado:`, saved);
      return saved;
    }
  } catch (error: any) {
    console.error('Error al guardar componente:', error);
    throw new Error(`Error al guardar componente: ${error.message}`);
  }
}

/**
 * Elimina un componente
 */
export async function deleteComponente(
  tenantId: string,
  componenteId: string
): Promise<void> {
  try {
    const sql = `
      DELETE FROM componentes_web
      WHERE id = $1 AND tenant_id = $2
    `;

    const result = await query(sql, [componenteId, tenantId]);

    if (result.rowCount === 0) {
      throw new Error('Componente no encontrado o no pertenece al tenant');
    }
  } catch (error: any) {
    console.error('Error al eliminar componente:', error);
    throw new Error(`Error al eliminar componente: ${error.message}`);
  }
}

/**
 * Actualiza el tema de un tenant
 */
export async function updateTemaByTenant(
  tenantId: string,
  colores: Record<string, string>
): Promise<Record<string, string>> {
  try {
    const coloresJson = JSON.stringify(colores);

    // Verificar si existe un tema activo
    const checkSql = `
      SELECT id FROM temas_tenant
      WHERE tenant_id = $1 AND activo = true
      LIMIT 1
    `;
    const checkResult = await query(checkSql, [tenantId]);

    if (checkResult.rows.length > 0) {
      // Actualizar tema existente
      const updateSql = `
        UPDATE temas_tenant
        SET 
          colores = $1,
          updated_at = NOW()
        WHERE tenant_id = $2 AND activo = true
        RETURNING colores
      `;
      const result = await query(updateSql, [coloresJson, tenantId]);
      return typeof result.rows[0].colores === 'string' 
        ? JSON.parse(result.rows[0].colores) 
        : result.rows[0].colores;
    } else {
      // Crear nuevo tema
      const insertSql = `
        INSERT INTO temas_tenant (tenant_id, nombre, colores, activo)
        VALUES ($1, 'Tema Personalizado', $2, true)
        RETURNING colores
      `;
      const result = await query(insertSql, [tenantId, coloresJson]);
      return typeof result.rows[0].colores === 'string' 
        ? JSON.parse(result.rows[0].colores) 
        : result.rows[0].colores;
    }
  } catch (error: any) {
    console.error('Error al actualizar tema:', error);
    throw new Error(`Error al actualizar tema: ${error.message}`);
  }
}

/**
 * Crea un tema por defecto para un nuevo tenant
 */
export async function createTemaDefault(
  tenantId: string,
  nombreTenant: string
): Promise<void> {
  try {
    const coloresDefault = {
      primario: '#2563eb',
      secundario: '#1e40af',
      acento: '#3b82f6',
      fondo: '#ffffff',
      texto: '#0f172a',
      textoSecundario: '#64748b'
    };

    const insertSql = `
      INSERT INTO temas_tenant (tenant_id, nombre, colores, activo)
      VALUES ($1, $2, $3, true)
      ON CONFLICT (tenant_id) WHERE activo = true DO NOTHING
    `;
    await query(insertSql, [tenantId, `Tema de ${nombreTenant}`, JSON.stringify(coloresDefault)]);
  } catch (error: any) {
    console.error('Error al crear tema default:', error);
    // No lanzar error para no bloquear la creación del tenant
  }
}
