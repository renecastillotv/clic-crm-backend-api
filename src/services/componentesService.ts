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
 * NUEVO ESQUEMA:
 * - componentes_web usa: componente_catalogo_id (FK a catalogo_componentes.id)
 * - componentes_web usa: tipo_pagina_id (FK a tipos_pagina.id)
 * - El "tipo" se obtiene de catalogo_componentes.tipo
 * - El "tipo de página" se obtiene de tipos_pagina.codigo
 *
 * @param soloPredeterminados - Si es true, solo devuelve un componente por tipo (el predeterminado)
 *                               Si es false, devuelve todos los componentes (útil para el CRM)
 * @param tipoPaginaCodigo - Código del tipo de página (ej: "homepage", "propiedades_single")
 */
export async function getComponentesByTenant(
  tenantId: string,
  tipoPaginaCodigo?: string,
  soloPredeterminados: boolean = true
): Promise<ComponenteWebResponse[]> {
  try {
    let sql: string;
    const params: any[] = [tenantId];

    // Obtener el tipo_pagina_id si se proporciona código
    let tipoPaginaId: string | null = null;
    if (tipoPaginaCodigo) {
      const tpResult = await query(
        `SELECT id FROM tipos_pagina WHERE codigo = $1`,
        [tipoPaginaCodigo]
      );
      if (tpResult.rows.length > 0) {
        tipoPaginaId = tpResult.rows[0].id;
      }
      console.log(`🔍 Buscando componentes para tipo_pagina: ${tipoPaginaCodigo} (ID: ${tipoPaginaId})`);
    }

    if (soloPredeterminados) {
      // Solo componentes predeterminados (para el frontend web)
      // Para cada tipo de componente, obtener solo uno (el de la página o el global)
      sql = `
        WITH ranked_components AS (
          SELECT
            cw.id,
            cc.tipo,
            COALESCE(cw.nombre, cc.nombre) as variante,
            cw.datos,
            cw.activo,
            cw.orden,
            cw.tipo_pagina_id as "tipoPaginaId",
            tp.codigo as "tipoPaginaCodigo",
            cw.nombre,
            cw.created_at,
            ROW_NUMBER() OVER (
              PARTITION BY cc.tipo
              ORDER BY
                CASE WHEN cw.tipo_pagina_id IS NOT NULL THEN 0 ELSE 1 END,
                cw.orden ASC,
                cw.created_at ASC
            ) as rn
          FROM componentes_web cw
          LEFT JOIN catalogo_componentes cc ON cw.componente_catalogo_id = cc.id
          LEFT JOIN tipos_pagina tp ON cw.tipo_pagina_id = tp.id
          WHERE cw.tenant_id = $1
            AND cw.activo = true
      `;

      // Filtrar por tipo de página
      if (tipoPaginaId) {
        // Componentes de esta página específica O componentes globales (header/footer)
        sql += ` AND (
          cw.tipo_pagina_id = $2::uuid
          OR (cw.tipo_pagina_id IS NULL AND cc.tipo IN ('header', 'footer'))
        )`;
        params.push(tipoPaginaId);
      } else {
        // Solo componentes globales (sin tipo_pagina)
        sql += ` AND cw.tipo_pagina_id IS NULL`;
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
          "tipoPaginaId",
          "tipoPaginaCodigo",
          nombre
        FROM ranked_components
        WHERE rn = 1
        ORDER BY
          orden ASC,
          created_at ASC
      `;
    } else {
      // Todos los componentes (para el CRM)
      sql = `
        SELECT
          cw.id,
          cc.tipo,
          COALESCE(cw.nombre, cc.nombre) as variante,
          cw.datos,
          cw.activo,
          cw.orden,
          cw.tipo_pagina_id as "tipoPaginaId",
          tp.codigo as "tipoPaginaCodigo",
          cw.nombre,
          cw.created_at
        FROM componentes_web cw
        LEFT JOIN catalogo_componentes cc ON cw.componente_catalogo_id = cc.id
        LEFT JOIN tipos_pagina tp ON cw.tipo_pagina_id = tp.id
        WHERE cw.tenant_id = $1
      `;

      // Filtrar por tipo de página si se especifica
      if (tipoPaginaId) {
        // Componentes de esta página O globales (header/footer)
        sql += ` AND (cw.tipo_pagina_id = $2::uuid OR cw.tipo_pagina_id IS NULL)`;
        params.push(tipoPaginaId);
      }

      sql += ` ORDER BY cw.orden ASC, cw.created_at ASC`;
    }

    console.log(`📝 SQL Query ejecutando...`);

    const result = await query(sql, params);

    console.log(`📊 Resultado: ${result.rows.length} componentes encontrados`);

    return result.rows.map((row: any) => {
      const datosRaw = typeof row.datos === 'string' ? JSON.parse(row.datos) : row.datos;

      // Validar y normalizar datos
      let datosNormalizados: ComponenteDataEstructurado;
      try {
        datosNormalizados = validateAndNormalizeComponentData(datosRaw);
      } catch (error: any) {
        console.warn(`⚠️ Componente ${row.id} (${row.tipo}) tiene datos inválidos:`, error.message);
        datosNormalizados = datosRaw;
      }

      return {
        id: row.id,
        tipo: row.tipo,
        variante: row.variante || 'default',
        datos: datosNormalizados,
        activo: row.activo,
        orden: row.orden,
        paginaId: row.tipoPaginaId || undefined,
        predeterminado: false, // Ya no usamos este campo
        scope: row.tipoPaginaId ? 'page_type' as const : 'tenant' as const,
        nombre: row.nombre,
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
 *
 * NUEVO ESQUEMA:
 * - componentes_web tiene: componente_catalogo_id (FK a catalogo_componentes)
 * - componentes_web tiene: tipo_pagina_id (FK a tipos_pagina)
 * - NO tiene: tipo, variante, predeterminado, scope, tipo_pagina, pagina_id, es_activo
 *
 * El frontend envía: tipo (string como "hero"), variante, tipo_pagina (string como "homepage")
 * Este servicio convierte a: componente_catalogo_id (UUID), tipo_pagina_id (UUID)
 */
// Función helper para validar UUID
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Cache para tipos de página (no cambian frecuentemente)
const tiposPaginaCache: Map<string, string> = new Map();

async function getTipoPaginaId(codigoTipoPagina: string): Promise<string | null> {
  if (!codigoTipoPagina) return null;

  // Buscar en cache
  if (tiposPaginaCache.has(codigoTipoPagina)) {
    return tiposPaginaCache.get(codigoTipoPagina)!;
  }

  // Buscar en BD
  const result = await query(
    `SELECT id FROM tipos_pagina WHERE codigo = $1`,
    [codigoTipoPagina]
  );

  if (result.rows.length > 0) {
    tiposPaginaCache.set(codigoTipoPagina, result.rows[0].id);
    return result.rows[0].id;
  }

  return null;
}

async function getComponenteCatalogoId(tipo: string): Promise<string | null> {
  // El tipo puede ser el código del componente (ej: "hero", "header")
  // Buscamos por tipo en el catálogo
  const result = await query(
    `SELECT id FROM catalogo_componentes WHERE tipo = $1 LIMIT 1`,
    [tipo]
  );

  if (result.rows.length > 0) {
    return result.rows[0].id;
  }

  return null;
}

export async function saveComponente(
  tenantId: string,
  componente: {
    id?: string;
    tipo: string;
    variante: string;
    datos: ComponenteDataEstructurado;
    activo?: boolean;
    orden?: number;
    paginaId?: string | null;
    predeterminado?: boolean;
    scope?: 'tenant' | 'page_type' | 'page';
    nombre?: string | null;
    tipoPagina?: string | null;
    tipo_pagina?: string | null; // Alias usado por frontend
  }
): Promise<ComponenteWebResponse> {
  try {
    // Validar y normalizar datos antes de guardar
    const datosValidados = validateAndNormalizeComponentData(componente.datos);
    const datosJson = JSON.stringify(datosValidados);
    const activo = componente.activo !== undefined ? componente.activo : true;
    const orden = componente.orden !== undefined ? componente.orden : 0;
    const nombre = componente.nombre || null;

    // Obtener el código del tipo de página (puede venir como tipoPagina o tipo_pagina)
    const tipoPaginaCodigo = componente.tipoPagina || componente.tipo_pagina || null;

    // Validar que si viene un ID, sea un UUID válido
    const tieneIdValido = componente.id && isValidUUID(componente.id);
    const componenteId = tieneIdValido ? componente.id : undefined;

    // Convertir tipo (string) a componente_catalogo_id (UUID)
    const componenteCatalogoId = await getComponenteCatalogoId(componente.tipo);
    if (!componenteCatalogoId) {
      throw new Error(`Tipo de componente "${componente.tipo}" no encontrado en el catálogo`);
    }

    // Convertir tipo_pagina (string como "homepage") a tipo_pagina_id (UUID)
    // Header y Footer son globales (no tienen tipo_pagina)
    let tipoPaginaId: string | null = null;
    if (tipoPaginaCodigo && componente.tipo !== 'header' && componente.tipo !== 'footer') {
      tipoPaginaId = await getTipoPaginaId(tipoPaginaCodigo);
      if (!tipoPaginaId && tipoPaginaCodigo !== 'custom') {
        console.warn(`⚠️ Tipo de página "${tipoPaginaCodigo}" no encontrado, creando componente global`);
      }
    }

    console.log(`🔄 Conversión: tipo="${componente.tipo}" → catalogo_id=${componenteCatalogoId}, tipoPagina="${tipoPaginaCodigo}" → tipo_pagina_id=${tipoPaginaId}`);

    if (componenteId) {
      // Actualizar componente existente
      const sql = `
        UPDATE componentes_web
        SET
          componente_catalogo_id = $1,
          datos = $2,
          activo = $3,
          orden = $4,
          tipo_pagina_id = $5,
          nombre = COALESCE($6, nombre),
          updated_at = NOW()
        WHERE id = $7 AND tenant_id = $8
        RETURNING
          cw.id,
          cc.tipo,
          COALESCE(cw.nombre, cc.nombre) as variante,
          cw.datos,
          cw.activo,
          cw.orden,
          cw.tipo_pagina_id as "tipoPaginaId",
          cw.nombre
        FROM componentes_web cw
        LEFT JOIN catalogo_componentes cc ON cw.componente_catalogo_id = cc.id
        WHERE cw.id = $7 AND cw.tenant_id = $8
      `;

      console.log(`💾 Actualizando componente ${componenteId}`);

      // Hacer UPDATE y luego SELECT por separado
      await query(`
        UPDATE componentes_web
        SET
          componente_catalogo_id = $1,
          datos = $2,
          activo = $3,
          orden = $4,
          tipo_pagina_id = $5,
          nombre = COALESCE($6, nombre),
          updated_at = NOW()
        WHERE id = $7 AND tenant_id = $8
      `, [
        componenteCatalogoId,
        datosJson,
        activo,
        orden,
        tipoPaginaId,
        nombre,
        componenteId,
        tenantId,
      ]);

      const selectResult = await query(`
        SELECT
          cw.id,
          cc.tipo,
          COALESCE(cw.nombre, cc.nombre) as variante,
          cw.datos,
          cw.activo,
          cw.orden,
          cw.tipo_pagina_id as "tipoPaginaId",
          cw.nombre,
          tp.codigo as "tipoPaginaCodigo"
        FROM componentes_web cw
        LEFT JOIN catalogo_componentes cc ON cw.componente_catalogo_id = cc.id
        LEFT JOIN tipos_pagina tp ON cw.tipo_pagina_id = tp.id
        WHERE cw.id = $1 AND cw.tenant_id = $2
      `, [componenteId, tenantId]);

      if (selectResult.rows.length === 0) {
        throw new Error('Componente no encontrado o no pertenece al tenant');
      }

      const row = selectResult.rows[0];
      console.log(`✅ Componente actualizado - ID: ${row.id}`);

      return {
        id: row.id,
        tipo: row.tipo,
        variante: row.variante || 'default',
        datos: typeof row.datos === 'string'
          ? JSON.parse(row.datos)
          : row.datos,
        activo: row.activo,
        orden: row.orden,
        paginaId: row.tipoPaginaId || undefined,
        predeterminado: false,
        scope: row.tipoPaginaId ? 'page_type' : 'tenant',
        nombre: row.nombre,
      };
    } else {
      console.log(`📝 Creando nuevo componente - tipo: ${componente.tipo}, tipoPagina: ${tipoPaginaCodigo}`);

      // Crear nuevo componente
      const sql = `
        INSERT INTO componentes_web (
          tenant_id,
          componente_catalogo_id,
          datos,
          activo,
          orden,
          tipo_pagina_id,
          nombre
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;

      const insertResult = await query(sql, [
        tenantId,
        componenteCatalogoId,
        datosJson,
        activo,
        orden,
        tipoPaginaId,
        nombre,
      ]);

      const newId = insertResult.rows[0].id;
      console.log(`✅ Componente insertado - ID: ${newId}`);

      // Obtener datos completos del componente
      const selectResult = await query(`
        SELECT
          cw.id,
          cc.tipo,
          COALESCE(cw.nombre, cc.nombre) as variante,
          cw.datos,
          cw.activo,
          cw.orden,
          cw.tipo_pagina_id as "tipoPaginaId",
          cw.nombre,
          tp.codigo as "tipoPaginaCodigo"
        FROM componentes_web cw
        LEFT JOIN catalogo_componentes cc ON cw.componente_catalogo_id = cc.id
        LEFT JOIN tipos_pagina tp ON cw.tipo_pagina_id = tp.id
        WHERE cw.id = $1
      `, [newId]);

      const row = selectResult.rows[0];

      const saved = {
        id: row.id,
        tipo: row.tipo,
        variante: row.variante || 'default',
        datos: typeof row.datos === 'string'
          ? JSON.parse(row.datos)
          : row.datos,
        activo: row.activo,
        orden: row.orden,
        paginaId: row.tipoPaginaId || undefined,
        predeterminado: false,
        scope: row.tipoPaginaId ? 'page_type' as const : 'tenant' as const,
        nombre: row.nombre,
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
