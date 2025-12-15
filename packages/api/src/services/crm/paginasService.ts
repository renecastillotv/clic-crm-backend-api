import { query } from '../../utils/db.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Servicio de gestión de páginas del CRM
 *
 * ARQUITECTURA CORRECTA (4 tablas principales):
 * - catalogo_componentes: catálogo global de tipos de componentes disponibles
 * - tipos_pagina: catálogo estándar de páginas (homepage, propiedades, contacto, etc.)
 * - tenants_rutas_config_custom: rutas personalizadas adicionales de cada tenant
 * - componentes_web: instancias de componentes por tenant vinculadas a:
 *   - tipo_pagina_id (para páginas estándar)
 *   - tenant_rutas_config_custom_id (para páginas custom)
 *
 * TABLAS OBSOLETAS (NO USAR - planificadas para eliminación):
 * - paginas_web: DEPRECADA
 * - paginas_componentes: DEPRECADA
 * - tenants_rutas_config: DEPRECADA
 */

// ========================================
// 1. LISTAR TIPOS DE PÁGINA (páginas estándar)
// ========================================
export async function listarPaginasService(tenantId: string) {
  // Listar tipos de página estándar con conteo de componentes del tenant
  const result = await query(
    `
    SELECT
      tp.id,
      tp.codigo as slug,
      tp.nombre as titulo,
      tp.codigo as tipo_codigo,
      tp.nombre as tipo_nombre,
      tp.ruta_patron,
      tp.descripcion,
      (
        SELECT COUNT(*)
        FROM componentes_web cw
        WHERE cw.tipo_pagina_id = tp.id
          AND cw.tenant_id = $1
          AND cw.activo = true
      ) as total_componentes
    FROM tipos_pagina tp
    WHERE tp.visible = true
      AND tp.es_estandar = true
    ORDER BY tp.nivel ASC, tp.nombre ASC
    `,
    [tenantId]
  );

  return result.rows;
}

// ========================================
// 2. OBTENER TIPO DE PÁGINA POR ID
// ========================================
export async function obtenerPaginaService(tenantId: string, tipoPaginaId: string) {
  const result = await query(
    `
    SELECT
      tp.id,
      tp.codigo as slug,
      tp.nombre as titulo,
      tp.descripcion,
      tp.ruta_patron,
      tp.id as tipo_pagina_id,
      tp.codigo as tipo_codigo,
      tp.nombre as tipo_nombre
    FROM tipos_pagina tp
    WHERE tp.id = $1 AND tp.visible = true
    `,
    [tipoPaginaId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

// ========================================
// 3. OBTENER TIPO DE PÁGINA POR CÓDIGO
// ========================================
export async function obtenerPaginaPorTipoService(tenantId: string, tipoPaginaCodigo: string) {
  const result = await query(
    `
    SELECT
      tp.id,
      tp.codigo as slug,
      tp.nombre as titulo,
      tp.descripcion,
      tp.ruta_patron,
      tp.id as tipo_pagina_id,
      tp.codigo as tipo_codigo,
      tp.nombre as tipo_nombre
    FROM tipos_pagina tp
    WHERE tp.codigo = $1 AND tp.visible = true
    LIMIT 1
    `,
    [tipoPaginaCodigo]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

// ========================================
// 4. OBTENER EDITOR DE PÁGINA (con componentes del tenant)
// ========================================
export async function obtenerPaginaEditorService(
  tenantId: string,
  tipoPaginaId: string
) {
  // 1. Obtener información del tipo de página
  const tipoPaginaResult = await query(
    `
    SELECT
      tp.id,
      tp.codigo as slug,
      tp.nombre as titulo,
      tp.descripcion,
      tp.ruta_patron,
      tp.id as tipo_pagina_id,
      tp.codigo as tipo_codigo,
      tp.nombre as tipo_nombre
    FROM tipos_pagina tp
    WHERE tp.id = $1 AND tp.visible = true
    `,
    [tipoPaginaId]
  );

  if (tipoPaginaResult.rows.length === 0) {
    return null;
  }

  const tipoPagina = tipoPaginaResult.rows[0];

  // 2. Obtener componentes del tenant para este tipo de página
  const componentesResult = await query(
    `
    SELECT
      cw.id as componente_id,
      cw.id as relacion_id,
      cw.nombre as variante,
      cw.datos as default_data,
      cw.orden,
      cw.activo,
      cc.id as catalogo_id,
      cc.tipo,
      cc.nombre as catalogo_nombre,
      cc.campos_config
    FROM componentes_web cw
    JOIN catalogo_componentes cc ON cc.id = cw.componente_catalogo_id
    WHERE cw.tenant_id = $1
      AND cw.tipo_pagina_id = $2
    ORDER BY cw.orden ASC
    `,
    [tenantId, tipoPaginaId]
  );

  // 3. Obtener componentes disponibles del catálogo global
  const componentesDisponibles = await query(
    `
    SELECT
      id,
      tipo,
      nombre,
      descripcion,
      icono,
      categoria,
      variantes,
      campos_config as "camposConfig",
      active as disponible,
      required_features as "requiredFeatures"
    FROM catalogo_componentes
    WHERE active = true
    ORDER BY categoria, tipo, nombre
    `
  );

  // 4. Formatear componentes asignados para el frontend del CRM
  const componentesConDatos = componentesResult.rows.map((comp: any) => {
    const defaultData = comp.default_data || {};

    let camposConfig = comp.campos_config || [];
    if (typeof camposConfig === 'string') {
      try {
        camposConfig = JSON.parse(camposConfig);
      } catch (e) {
        camposConfig = [];
      }
    }

    return {
      relacion_id: comp.relacion_id,
      componente_id: comp.componente_id,
      tipo: comp.tipo,
      variante: comp.variante || comp.catalogo_nombre,
      nombre: comp.variante || comp.catalogo_nombre,
      componente_nombre: comp.variante || comp.catalogo_nombre,
      componente_tipo: comp.tipo,
      orden: comp.orden,
      activo: comp.activo,
      default_data: defaultData,
      datos: defaultData, // Alias para el frontend (ComponenteEditorModal usa componente.datos)
      config_override: {},
      datos_finales: defaultData,
      campos_config: camposConfig,
      es_heredado: false
    };
  });

  return {
    pagina: tipoPagina,
    componentes_asignados: componentesConDatos,
    componentes_disponibles: componentesDisponibles.rows
  };
}

// ========================================
// 5. OBTENER EDITOR POR TIPO (código)
// ========================================
export async function obtenerEditorPorTipoService(
  tenantId: string,
  tipoPaginaCodigo: string
) {
  // Obtener el tipo de página por código
  const tipoPagina = await obtenerPaginaPorTipoService(tenantId, tipoPaginaCodigo);

  if (!tipoPagina) {
    return null;
  }

  return obtenerPaginaEditorService(tenantId, tipoPagina.id);
}

// ========================================
// 6. CREAR PÁGINA PERSONALIZADA
// Solo para tenants_rutas_config_custom (rutas custom)
// Los tipos de página estándar NO se crean, ya existen
// ========================================
export async function crearPaginaService(
  tenantId: string,
  data: {
    slug: string;
    titulo: string;
    descripcion?: string;
    tipo_pagina_id?: string;
  }
) {
  // Verificar que el slug no exista ya para este tenant
  const existeSlug = await query(
    `SELECT id FROM tenants_rutas_config_custom WHERE tenant_id = $1 AND slug = $2`,
    [tenantId, data.slug]
  );

  if (existeSlug.rows.length > 0) {
    throw new Error('Ya existe una página personalizada con este slug');
  }

  // Crear la página personalizada
  const id = uuidv4();
  const result = await query(
    `
    INSERT INTO tenants_rutas_config_custom (
      id,
      tenant_id,
      slug,
      titulo,
      descripcion,
      tipo_pagina_id,
      activo,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
    RETURNING *
    `,
    [
      id,
      tenantId,
      data.slug,
      data.titulo,
      data.descripcion || null,
      data.tipo_pagina_id || null
    ]
  );

  return result.rows[0];
}

// ========================================
// 7. ACTUALIZAR PÁGINA PERSONALIZADA
// ========================================
export async function actualizarPaginaService(
  tenantId: string,
  rutaCustomId: string,
  data: {
    slug?: string;
    titulo?: string;
    descripcion?: string;
    activo?: boolean;
  }
) {
  const result = await query(
    `
    UPDATE tenants_rutas_config_custom
    SET
      slug = COALESCE($3, slug),
      titulo = COALESCE($4, titulo),
      descripcion = COALESCE($5, descripcion),
      activo = COALESCE($6, activo),
      updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
    RETURNING *
    `,
    [
      rutaCustomId,
      tenantId,
      data.slug,
      data.titulo,
      data.descripcion,
      data.activo
    ]
  );

  if (result.rows.length === 0) {
    throw new Error('Página personalizada no encontrada');
  }

  return result.rows[0];
}

// ========================================
// 8. ELIMINAR PÁGINA PERSONALIZADA
// ========================================
export async function eliminarPaginaService(
  tenantId: string,
  rutaCustomId: string
) {
  // Los componentes se eliminan automáticamente por CASCADE
  const result = await query(
    `DELETE FROM tenants_rutas_config_custom WHERE id = $1 AND tenant_id = $2 RETURNING id`,
    [rutaCustomId, tenantId]
  );

  if (result.rows.length === 0) {
    throw new Error('Página personalizada no encontrada');
  }

  return { success: true };
}

// ========================================
// 9. AGREGAR COMPONENTE A PÁGINA
// ========================================
export async function agregarComponenteService(
  tenantId: string,
  tipoPaginaIdOrCustomId: string,
  data: {
    componente_id: string; // ID del catalogo_componentes
    orden?: number;
    es_pagina_custom?: boolean;
  }
) {
  // Determinar si es página estándar o custom
  const esPaginaCustom = data.es_pagina_custom || false;

  // Buscar el componente en el catálogo
  const catalogoComponente = await query(
    `SELECT id, tipo, nombre, campos_config
     FROM catalogo_componentes WHERE id = $1 AND active = true`,
    [data.componente_id]
  );

  if (catalogoComponente.rows.length === 0) {
    throw new Error('Componente no encontrado en el catálogo');
  }

  const catalogo = catalogoComponente.rows[0];

  // Obtener el último orden si no se especificó
  let orden = data.orden;
  if (orden === undefined) {
    const maxOrdenResult = await query(
      esPaginaCustom
        ? `SELECT COALESCE(MAX(orden), 0) as max_orden FROM componentes_web WHERE tenant_id = $1 AND tenant_rutas_config_custom_id = $2`
        : `SELECT COALESCE(MAX(orden), 0) as max_orden FROM componentes_web WHERE tenant_id = $1 AND tipo_pagina_id = $2`,
      [tenantId, tipoPaginaIdOrCustomId]
    );
    orden = maxOrdenResult.rows[0].max_orden + 1;
  }

  // Crear el componente en componentes_web
  const componenteId = uuidv4();
  const insertQuery = esPaginaCustom
    ? `INSERT INTO componentes_web (
        id, tenant_id, componente_catalogo_id, tenant_rutas_config_custom_id,
        nombre, datos, orden, activo, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
      RETURNING *`
    : `INSERT INTO componentes_web (
        id, tenant_id, componente_catalogo_id, tipo_pagina_id,
        nombre, datos, orden, activo, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
      RETURNING *`;

  const result = await query(insertQuery, [
    componenteId,
    tenantId,
    catalogo.id,
    tipoPaginaIdOrCustomId,
    catalogo.nombre,
    JSON.stringify(catalogo.campos_config || {}),
    orden
  ]);

  console.log(`✅ Componente ${catalogo.tipo} agregado a ${esPaginaCustom ? 'página custom' : 'tipo de página'}`);

  return result.rows[0];
}

// ========================================
// 10. ACTUALIZAR COMPONENTE
// ========================================
export async function actualizarComponenteService(
  tenantId: string,
  componenteId: string,
  data: {
    datos?: any;
    activo?: boolean;
    nombre?: string;
  }
) {
  const result = await query(
    `
    UPDATE componentes_web
    SET
      datos = COALESCE($3, datos),
      activo = COALESCE($4, activo),
      nombre = COALESCE($5, nombre),
      updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
    RETURNING *
    `,
    [
      componenteId,
      tenantId,
      data.datos ? JSON.stringify(data.datos) : null,
      data.activo,
      data.nombre
    ]
  );

  if (result.rows.length === 0) {
    throw new Error('Componente no encontrado');
  }

  return result.rows[0];
}

// ========================================
// 11. ELIMINAR COMPONENTE
// ========================================
export async function eliminarComponenteService(
  tenantId: string,
  componenteId: string
) {
  const result = await query(
    `DELETE FROM componentes_web WHERE id = $1 AND tenant_id = $2 RETURNING id`,
    [componenteId, tenantId]
  );

  if (result.rows.length === 0) {
    throw new Error('Componente no encontrado');
  }

  return { success: true };
}

// ========================================
// 12. REORDENAR COMPONENTES
// ========================================
export async function reordenarComponentesService(
  tenantId: string,
  tipoPaginaIdOrCustomId: string,
  data: {
    orden: Array<{ id: string; orden: number }>;
    es_pagina_custom?: boolean;
  }
) {
  const isValidUUID = (str: string) => {
    if (!str || typeof str !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  const ordenValido = data.orden.filter(item => {
    if (!isValidUUID(item.id)) {
      console.warn(`⚠️ ID inválido ignorado: "${item.id}"`);
      return false;
    }
    return true;
  });

  for (const item of ordenValido) {
    await query(
      `UPDATE componentes_web SET orden = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
      [item.orden, item.id, tenantId]
    );
  }

  return { success: true, actualizados: ordenValido.length };
}

// Alias para compatibilidad
export async function reordenarComponentesTipoPaginaService(
  tenantId: string,
  tipoPaginaId: string,
  data: { orden: Array<{ id: string; orden: number }> }
) {
  return reordenarComponentesService(tenantId, tipoPaginaId, {
    orden: data.orden,
    es_pagina_custom: false
  });
}

// ========================================
// 13. CAMBIAR VARIANTE DE COMPONENTE
// ========================================
export async function cambiarVarianteComponenteService(
  tenantId: string,
  componenteId: string,
  data: {
    nueva_variante: string; // ID del nuevo componente en catalogo_componentes
  }
) {
  // Buscar el nuevo componente en el catálogo
  const nuevoCatalogo = await query(
    `SELECT id, tipo, nombre, campos_config
     FROM catalogo_componentes WHERE id = $1 AND active = true`,
    [data.nueva_variante]
  );

  if (nuevoCatalogo.rows.length === 0) {
    throw new Error('Variante no encontrada en el catálogo');
  }

  const catalogo = nuevoCatalogo.rows[0];

  // Actualizar el componente con la nueva variante
  const result = await query(
    `
    UPDATE componentes_web
    SET
      componente_catalogo_id = $3,
      nombre = $4,
      datos = $5,
      updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
    RETURNING *
    `,
    [
      componenteId,
      tenantId,
      catalogo.id,
      catalogo.nombre,
      JSON.stringify(catalogo.campos_config || {})
    ]
  );

  if (result.rows.length === 0) {
    throw new Error('Componente no encontrado');
  }

  return result.rows[0];
}

// ========================================
// 14. OBTENER CATÁLOGO DE COMPONENTES
// ========================================
export async function obtenerCatalogoComponentesService(tenantId: string) {
  const result = await query(
    `
    SELECT
      id,
      tipo,
      nombre,
      descripcion,
      icono,
      categoria,
      variantes,
      campos_config as "camposConfig",
      active as disponible,
      required_features as "requiredFeatures"
    FROM catalogo_componentes
    WHERE active = true
    ORDER BY categoria, tipo, nombre
    `
  );

  return result.rows;
}

// ========================================
// 15. OBTENER VARIANTES DE UN TIPO
// ========================================
export async function obtenerVariantesTipoService(
  tenantId: string,
  tipo: string
) {
  // Las variantes son registros en catalogo_componentes con el mismo "tipo"
  const result = await query(
    `
    SELECT
      id,
      tipo,
      nombre,
      nombre as variante,
      descripcion,
      icono,
      categoria,
      campos_config,
      active as activo
    FROM catalogo_componentes
    WHERE tipo = $1 AND active = true
    ORDER BY nombre
    `,
    [tipo]
  );

  return result.rows;
}

// ========================================
// NOTAS DE ARQUITECTURA
// ========================================
/**
 * TABLAS EN USO (arquitectura correcta):
 * - catalogo_componentes: catálogo global de tipos de componentes
 * - tipos_pagina: catálogo estándar de páginas/rutas
 * - tenants_rutas_config_custom: rutas personalizadas por tenant
 * - componentes_web: instancias de componentes con FK a tipo_pagina_id o tenant_rutas_config_custom_id
 *
 * TABLAS OBSOLETAS (planificadas para eliminación):
 * - paginas_web: DEPRECADA - no usar
 * - paginas_componentes: DEPRECADA - no usar
 * - tenants_rutas_config: DEPRECADA - usar tenants_rutas_config_custom
 */
