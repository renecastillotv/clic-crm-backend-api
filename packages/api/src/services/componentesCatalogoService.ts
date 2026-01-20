import { query } from '../utils/db.js';

/**
 * Servicio para gestionar el catálogo de componentes del sistema
 */

export interface ComponenteCatalogo {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  descripcion?: string;
  variantes: Array<{ codigo: string; nombre: string }>;
  schema_config: {
    campos: Array<{
      nombre: string;
      tipo: string;
      requerido?: boolean;
      default?: any;
      opciones?: string[];
    }>;
    toggles?: Array<{
      nombre: string;
      tipo: string;
      label?: string;
      default?: any;
    }>;
  };
  plan_minimo?: string;
  feature_requerido?: string;
  es_sistema: boolean;
  activo: boolean;
  orden: number;
  icono?: string;
  tags: string[];
  created_at: Date;
  updated_at: Date;
}

export interface ComponenteDisponible extends ComponenteCatalogo {
  is_visible: boolean;
  is_enabled: boolean;
}

/**
 * Obtener todos los componentes del catálogo
 */
export async function getComponentesCatalogo(filtros?: {
  categoria?: string;
  activo?: boolean;
  es_sistema?: boolean;
}): Promise<ComponenteCatalogo[]> {
  let sql = 'SELECT * FROM componentes_catalogo WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (filtros?.categoria) {
    sql += ` AND categoria = $${paramIndex}`;
    params.push(filtros.categoria);
    paramIndex++;
  }

  if (filtros?.activo !== undefined) {
    sql += ` AND activo = $${paramIndex}`;
    params.push(filtros.activo);
    paramIndex++;
  }

  if (filtros?.es_sistema !== undefined) {
    sql += ` AND es_sistema = $${paramIndex}`;
    params.push(filtros.es_sistema);
    paramIndex++;
  }

  sql += ' ORDER BY categoria, orden, nombre';

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Obtener un componente del catálogo por código o tipo
 * Busca primero por componente_key, luego por tipo en catalogo_componentes
 */
export async function getComponenteCatalogoByCodigo(codigo: string): Promise<ComponenteCatalogo | null> {
  // Buscar en catalogo_componentes (la tabla que realmente existe)
  const result = await query(
    `SELECT
       id,
       tipo as codigo,
       nombre,
       categoria,
       componente_key,
       campos_config,
       active as activo,
       required_features
     FROM catalogo_componentes
     WHERE componente_key = $1 OR tipo = $1
     LIMIT 1`,
    [codigo]
  );

  if (!result.rows[0]) {
    return null;
  }

  const row = result.rows[0];

  // Transformar campos_config al formato schema_config esperado
  const camposConfig = Array.isArray(row.campos_config) ? row.campos_config : [];

  // Separar campos y toggles
  const campos = camposConfig
    .filter((c: any) => c.tipo !== 'toggle' && c.grupo !== 'toggles')
    .map((c: any) => ({
      nombre: c.key || c.name,
      tipo: c.tipo === 'json' ? 'array' : c.tipo,
      label: c.label,
      requerido: c.required,
      default: c.default,
      opciones: c.opciones,
      schema: c.schema,
    }));

  const toggles = camposConfig
    .filter((c: any) => c.tipo === 'toggle' || c.grupo === 'toggles')
    .map((c: any) => ({
      nombre: c.key || c.name,
      tipo: 'boolean',
      label: c.label,
      default: c.default,
    }));

  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    categoria: row.categoria || 'general',
    variantes: [],
    schema_config: {
      campos,
      toggles,
    },
    es_sistema: true,
    activo: row.activo,
    orden: 0,
    tags: [],
    created_at: new Date(),
    updated_at: new Date(),
  };
}

/**
 * Obtener componentes disponibles para un tenant según su plan
 */
export async function getComponentesDisponiblesParaTenant(tenantId: string): Promise<ComponenteDisponible[]> {
  const sql = `
    SELECT
      cc.*,
      tcd.is_visible,
      tcd.is_enabled
    FROM componentes_catalogo cc
    INNER JOIN tenant_componentes_disponibles tcd
      ON tcd.componente_catalogo_id = cc.id
    WHERE tcd.tenant_id = $1
      AND tcd.is_visible = true
      AND cc.activo = true
    ORDER BY cc.categoria, cc.orden, cc.nombre
  `;

  const result = await query(sql, [tenantId]);
  return result.rows;
}

/**
 * Obtener componentes de una categoría específica para un tenant
 */
export async function getComponentesPorCategoria(
  tenantId: string,
  categoria: string
): Promise<ComponenteDisponible[]> {
  const sql = `
    SELECT
      cc.*,
      tcd.is_visible,
      tcd.is_enabled
    FROM componentes_catalogo cc
    INNER JOIN tenant_componentes_disponibles tcd
      ON tcd.componente_catalogo_id = cc.id
    WHERE tcd.tenant_id = $1
      AND cc.categoria = $2
      AND tcd.is_visible = true
      AND cc.activo = true
    ORDER BY cc.orden, cc.nombre
  `;

  const result = await query(sql, [tenantId, categoria]);
  return result.rows;
}

/**
 * Verificar si un tenant puede usar un componente específico
 */
export async function tenantPuedeUsarComponente(
  tenantId: string,
  componenteCodigo: string
): Promise<{ puede: boolean; razon?: string }> {
  // Obtener componente del catálogo
  const componente = await getComponenteCatalogoByCodigo(componenteCodigo);
  if (!componente) {
    return { puede: false, razon: 'Componente no existe' };
  }

  // Verificar disponibilidad para el tenant
  const sql = `
    SELECT tcd.is_visible, tcd.is_enabled
    FROM tenant_componentes_disponibles tcd
    INNER JOIN componentes_catalogo cc ON cc.id = tcd.componente_catalogo_id
    WHERE tcd.tenant_id = $1 AND cc.codigo = $2
  `;

  const result = await query(sql, [tenantId, componenteCodigo]);

  if (result.rows.length === 0) {
    return { puede: false, razon: 'Componente no disponible para este tenant' };
  }

  const { is_visible, is_enabled } = result.rows[0];

  if (!is_visible) {
    return { puede: false, razon: 'Componente no incluido en tu plan actual' };
  }

  if (!is_enabled) {
    return { puede: false, razon: 'Componente deshabilitado' };
  }

  return { puede: true };
}

/**
 * Validar configuración de un componente según su schema
 */
export async function validarConfiguracionComponente(
  componenteCodigo: string,
  configuracion: any
): Promise<{ valido: boolean; errores: string[] }> {
  const componente = await getComponenteCatalogoByCodigo(componenteCodigo);
  if (!componente) {
    return { valido: false, errores: ['Componente no existe'] };
  }

  const errores: string[] = [];
  const schema = componente.schema_config;

  if (!schema || !schema.campos) {
    // Sin schema definido, aceptar cualquier config
    return { valido: true, errores: [] };
  }

  // Validar campos requeridos
  for (const campo of schema.campos) {
    if (campo.requerido && (configuracion[campo.nombre] === undefined || configuracion[campo.nombre] === null)) {
      errores.push(`Campo requerido faltante: ${campo.nombre}`);
    }

    // Validar tipo si el campo está presente
    if (configuracion[campo.nombre] !== undefined) {
      const valor = configuracion[campo.nombre];
      const tipo = campo.tipo;

      switch (tipo) {
        case 'boolean':
          if (typeof valor !== 'boolean') {
            errores.push(`Campo ${campo.nombre} debe ser boolean`);
          }
          break;
        case 'number':
          if (typeof valor !== 'number') {
            errores.push(`Campo ${campo.nombre} debe ser number`);
          }
          break;
        case 'text':
          if (typeof valor !== 'string') {
            errores.push(`Campo ${campo.nombre} debe ser string`);
          }
          break;
        case 'select':
          if (campo.opciones && !campo.opciones.includes(valor)) {
            errores.push(`Campo ${campo.nombre} debe ser una de: ${campo.opciones.join(', ')}`);
          }
          break;
      }
    }
  }

  return { valido: errores.length === 0, errores };
}

/**
 * Actualizar disponibilidad de componentes cuando cambia el plan de un tenant
 */
export async function actualizarComponentesDisponiblesPorPlan(
  tenantId: string,
  planNuevo: string
): Promise<void> {
  // Lógica de planes (de menor a mayor acceso)
  const jerarquiaPlanes = ['basic', 'pro', 'premium', 'enterprise'];
  const nivelPlan = jerarquiaPlanes.indexOf(planNuevo);

  if (nivelPlan === -1) {
    throw new Error(`Plan no válido: ${planNuevo}`);
  }

  // Obtener todos los componentes del catálogo
  const componentes = await getComponentesCatalogo();

  for (const componente of componentes) {
    const nivelRequerido = componente.plan_minimo
      ? jerarquiaPlanes.indexOf(componente.plan_minimo)
      : 0; // Sin plan mínimo = disponible para todos

    const isVisible = nivelPlan >= nivelRequerido;

    // Actualizar o crear registro
    await query(
      `INSERT INTO tenant_componentes_disponibles (tenant_id, componente_catalogo_id, is_visible, is_enabled)
       VALUES ($1, $2, $3, $3)
       ON CONFLICT (tenant_id, componente_catalogo_id)
       DO UPDATE SET is_visible = $3, updated_at = NOW()`,
      [tenantId, componente.id, isVisible]
    );
  }
}

/**
 * Habilitar/deshabilitar un componente para un tenant
 */
export async function toggleComponenteParaTenant(
  tenantId: string,
  componenteCodigo: string,
  enabled: boolean
): Promise<void> {
  const sql = `
    UPDATE tenant_componentes_disponibles tcd
    SET is_enabled = $3, updated_at = NOW()
    FROM componentes_catalogo cc
    WHERE tcd.componente_catalogo_id = cc.id
      AND tcd.tenant_id = $1
      AND cc.codigo = $2
  `;

  await query(sql, [tenantId, componenteCodigo, enabled]);
}

/**
 * Crear un componente personalizado (no del sistema)
 */
export async function crearComponentePersonalizado(data: {
  codigo: string;
  nombre: string;
  categoria: string;
  descripcion?: string;
  variantes?: any[];
  schema_config?: any;
}): Promise<ComponenteCatalogo> {
  const sql = `
    INSERT INTO componentes_catalogo (
      codigo, nombre, categoria, descripcion, variantes, schema_config,
      es_sistema, activo, orden
    ) VALUES ($1, $2, $3, $4, $5, $6, false, true, 999)
    RETURNING *
  `;

  const result = await query(sql, [
    data.codigo,
    data.nombre,
    data.categoria,
    data.descripcion || null,
    JSON.stringify(data.variantes || [{ codigo: 'default', nombre: 'Estándar' }]),
    JSON.stringify(data.schema_config || { campos: [] }),
  ]);

  return result.rows[0];
}
