import { query } from '../utils/db.js';

/**
 * Servicio para gestionar configuraciones de variantes de páginas con herencia
 */

export interface ConfiguracionVariante {
  id: string;
  pagina_id: string;
  variante: string;
  componentes_activos: string[];
  configuracion_componentes: { [componente: string]: any };
  hereda_de_variante?: string;
  campos_heredados: string[];
  created_at: Date;
  updated_at: Date;
  last_used_at?: Date;
}

/**
 * Obtener configuración de una variante específica
 */
export async function getConfiguracionVariante(
  paginaId: string,
  variante: string
): Promise<ConfiguracionVariante | null> {
  const result = await query(
    'SELECT * FROM paginas_variantes_config WHERE pagina_id = $1 AND variante = $2',
    [paginaId, variante]
  );

  return result.rows[0] || null;
}

/**
 * Obtener configuración completa con herencia resuelta
 */
export async function getConfiguracionConHerencia(
  paginaId: string,
  variante: string
): Promise<{
  componentes_activos: string[];
  configuracion_componentes: { [componente: string]: any };
}> {
  const config = await getConfiguracionVariante(paginaId, variante);

  if (!config) {
    // No existe config para esta variante, retornar vacío
    return {
      componentes_activos: [],
      configuracion_componentes: {},
    };
  }

  // Si no hereda de ninguna variante, retornar directamente
  if (!config.hereda_de_variante) {
    return {
      componentes_activos: config.componentes_activos,
      configuracion_componentes: config.configuracion_componentes,
    };
  }

  // Obtener config de la variante padre
  const configPadre = await getConfiguracionConHerencia(paginaId, config.hereda_de_variante);

  // Merge: padre como base, hijo sobrescribe
  const componentesActivos = Array.from(
    new Set([...configPadre.componentes_activos, ...config.componentes_activos])
  );

  const configuracionComponentes = {
    ...configPadre.configuracion_componentes,
    ...config.configuracion_componentes,
  };

  return {
    componentes_activos: componentesActivos,
    configuracion_componentes: configuracionComponentes,
  };
}

/**
 * Crear o actualizar configuración de una variante
 */
export async function guardarConfiguracionVariante(data: {
  pagina_id: string;
  variante: string;
  componentes_activos: string[];
  configuracion_componentes: { [componente: string]: any };
  hereda_de_variante?: string;
  campos_heredados?: string[];
}): Promise<ConfiguracionVariante> {
  const sql = `
    INSERT INTO paginas_variantes_config (
      pagina_id, variante, componentes_activos, configuracion_componentes,
      hereda_de_variante, campos_heredados, last_used_at
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    ON CONFLICT (pagina_id, variante)
    DO UPDATE SET
      componentes_activos = $3,
      configuracion_componentes = $4,
      hereda_de_variante = $5,
      campos_heredados = $6,
      last_used_at = NOW(),
      updated_at = NOW()
    RETURNING *
  `;

  const result = await query(sql, [
    data.pagina_id,
    data.variante,
    JSON.stringify(data.componentes_activos),
    JSON.stringify(data.configuracion_componentes),
    data.hereda_de_variante || null,
    JSON.stringify(data.campos_heredados || []),
  ]);

  return result.rows[0];
}

/**
 * Copiar configuración de una variante a otra
 */
export async function copiarConfiguracionVariante(
  paginaId: string,
  varianteOrigen: string,
  varianteDestino: string,
  establecerHerencia: boolean = true
): Promise<ConfiguracionVariante> {
  // Obtener configuración origen CON herencia resuelta
  const configOrigen = await getConfiguracionConHerencia(paginaId, varianteOrigen);

  // Crear nueva configuración
  const nuevaConfig = await guardarConfiguracionVariante({
    pagina_id: paginaId,
    variante: varianteDestino,
    componentes_activos: configOrigen.componentes_activos,
    configuracion_componentes: configOrigen.configuracion_componentes,
    hereda_de_variante: establecerHerencia ? varianteOrigen : undefined,
    campos_heredados: establecerHerencia ? Object.keys(configOrigen.configuracion_componentes) : [],
  });

  return nuevaConfig;
}

/**
 * Establecer herencia entre variantes
 */
export async function establecerHerenciaVariante(
  paginaId: string,
  variante: string,
  variantePadre: string,
  camposHeredar: string[]
): Promise<void> {
  // Verificar que la variante padre existe
  const configPadre = await getConfiguracionVariante(paginaId, variantePadre);
  if (!configPadre) {
    throw new Error(`Variante padre ${variantePadre} no existe`);
  }

  // Verificar que la variante hija existe, si no, crearla
  let configHija = await getConfiguracionVariante(paginaId, variante);

  if (!configHija) {
    // Crear variante hija con herencia
    await guardarConfiguracionVariante({
      pagina_id: paginaId,
      variante: variante,
      componentes_activos: [],
      configuracion_componentes: {},
      hereda_de_variante: variantePadre,
      campos_heredados: camposHeredar,
    });
  } else {
    // Actualizar herencia
    await query(
      `UPDATE paginas_variantes_config
       SET hereda_de_variante = $3, campos_heredados = $4, updated_at = NOW()
       WHERE pagina_id = $1 AND variante = $2`,
      [paginaId, variante, variantePadre, JSON.stringify(camposHeredar)]
    );
  }
}

/**
 * Eliminar herencia de una variante
 */
export async function eliminarHerenciaVariante(
  paginaId: string,
  variante: string
): Promise<void> {
  // Primero resolver la herencia para que la variante sea standalone
  const configCompleta = await getConfiguracionConHerencia(paginaId, variante);

  // Actualizar con toda la config resuelta, sin herencia
  await guardarConfiguracionVariante({
    pagina_id: paginaId,
    variante: variante,
    componentes_activos: configCompleta.componentes_activos,
    configuracion_componentes: configCompleta.configuracion_componentes,
    hereda_de_variante: undefined,
    campos_heredados: [],
  });
}

/**
 * Obtener todas las variantes configuradas de una página
 */
export async function getVariantesPagina(paginaId: string): Promise<ConfiguracionVariante[]> {
  const result = await query(
    'SELECT * FROM paginas_variantes_config WHERE pagina_id = $1 ORDER BY last_used_at DESC NULLS LAST, created_at',
    [paginaId]
  );

  return result.rows;
}

/**
 * Marcar variante como usada recientemente
 */
export async function marcarVarianteUsada(
  paginaId: string,
  variante: string
): Promise<void> {
  await query(
    'UPDATE paginas_variantes_config SET last_used_at = NOW() WHERE pagina_id = $1 AND variante = $2',
    [paginaId, variante]
  );
}

/**
 * Eliminar una variante
 */
export async function eliminarVariante(
  paginaId: string,
  variante: string
): Promise<void> {
  // No permitir eliminar la variante 'default'
  if (variante === 'default') {
    throw new Error('No se puede eliminar la variante default');
  }

  // Verificar si otras variantes heredan de esta
  const result = await query(
    'SELECT variante FROM paginas_variantes_config WHERE pagina_id = $1 AND hereda_de_variante = $2',
    [paginaId, variante]
  );

  if (result.rows.length > 0) {
    const variantesHijas = result.rows.map((r: any) => r.variante).join(', ');
    throw new Error(
      `No se puede eliminar la variante ${variante} porque las siguientes variantes heredan de ella: ${variantesHijas}`
    );
  }

  await query(
    'DELETE FROM paginas_variantes_config WHERE pagina_id = $1 AND variante = $2',
    [paginaId, variante]
  );
}

/**
 * Obtener árbol de herencia de variantes de una página
 */
export async function getArbolHerenciaVariantes(paginaId: string): Promise<any> {
  const variantes = await getVariantesPagina(paginaId);

  // Construir árbol
  const arbol: any = {};

  for (const variante of variantes) {
    if (!variante.hereda_de_variante) {
      // Es raíz
      arbol[variante.variante] = {
        variante: variante.variante,
        hijas: [],
      };
    }
  }

  // Agregar hijas
  for (const variante of variantes) {
    if (variante.hereda_de_variante) {
      if (!arbol[variante.hereda_de_variante]) {
        arbol[variante.hereda_de_variante] = {
          variante: variante.hereda_de_variante,
          hijas: [],
        };
      }
      arbol[variante.hereda_de_variante].hijas.push({
        variante: variante.variante,
        campos_heredados: variante.campos_heredados,
      });
    }
  }

  return arbol;
}

/**
 * Actualizar solo un componente dentro de una configuración de variante
 */
export async function actualizarComponenteEnVariante(
  paginaId: string,
  variante: string,
  codigoComponente: string,
  configuracion: any
): Promise<void> {
  // Obtener configuración actual
  const configActual = await getConfiguracionVariante(paginaId, variante);

  if (!configActual) {
    throw new Error(`No existe configuración para la variante ${variante}`);
  }

  // Actualizar componente
  const configuracionComponentes = {
    ...configActual.configuracion_componentes,
    [codigoComponente]: configuracion,
  };

  // Agregar a componentes activos si no está
  let componentesActivos = [...configActual.componentes_activos];
  if (!componentesActivos.includes(codigoComponente)) {
    componentesActivos.push(codigoComponente);
  }

  // Guardar
  await guardarConfiguracionVariante({
    pagina_id: paginaId,
    variante: variante,
    componentes_activos: componentesActivos,
    configuracion_componentes: configuracionComponentes,
    hereda_de_variante: configActual.hereda_de_variante,
    campos_heredados: configActual.campos_heredados,
  });
}

/**
 * Remover un componente de una variante
 */
export async function removerComponenteDeVariante(
  paginaId: string,
  variante: string,
  codigoComponente: string
): Promise<void> {
  const configActual = await getConfiguracionVariante(paginaId, variante);

  if (!configActual) {
    throw new Error(`No existe configuración para la variante ${variante}`);
  }

  // Remover componente
  const componentesActivos = configActual.componentes_activos.filter(c => c !== codigoComponente);
  const configuracionComponentes = { ...configActual.configuracion_componentes };
  delete configuracionComponentes[codigoComponente];

  await guardarConfiguracionVariante({
    pagina_id: paginaId,
    variante: variante,
    componentes_activos: componentesActivos,
    configuracion_componentes: configuracionComponentes,
    hereda_de_variante: configActual.hereda_de_variante,
    campos_heredados: configActual.campos_heredados,
  });
}

/**
 * Obtener diferencias entre dos variantes
 */
export async function getDiferenciasEntreVariantes(
  paginaId: string,
  variante1: string,
  variante2: string
): Promise<{
  solo_en_v1: string[];
  solo_en_v2: string[];
  diferentes: string[];
  iguales: string[];
}> {
  const config1 = await getConfiguracionConHerencia(paginaId, variante1);
  const config2 = await getConfiguracionConHerencia(paginaId, variante2);

  const componentes1 = new Set(config1.componentes_activos);
  const componentes2 = new Set(config2.componentes_activos);

  const solo_en_v1 = [...componentes1].filter(c => !componentes2.has(c));
  const solo_en_v2 = [...componentes2].filter(c => !componentes1.has(c));
  const comunes = [...componentes1].filter(c => componentes2.has(c));

  const diferentes: string[] = [];
  const iguales: string[] = [];

  for (const comp of comunes) {
    const conf1 = JSON.stringify(config1.configuracion_componentes[comp] || {});
    const conf2 = JSON.stringify(config2.configuracion_componentes[comp] || {});

    if (conf1 !== conf2) {
      diferentes.push(comp);
    } else {
      iguales.push(comp);
    }
  }

  return { solo_en_v1, solo_en_v2, diferentes, iguales };
}
