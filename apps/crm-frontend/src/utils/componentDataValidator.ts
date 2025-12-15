/**
 * Utilidad para validar y normalizar datos de componentes
 * @deprecated Este archivo no se usa actualmente
 */

interface ComponenteDataEstructurado {
  static_data: Record<string, any>;
  dynamic_data?: Record<string, any>;
  styles?: Record<string, any>;
  toggles?: Record<string, boolean>;
}

/**
 * Normaliza los datos de un componente al formato estructurado
 */
export function normalizeComponentData(datos: any): ComponenteDataEstructurado {
  if (!datos || typeof datos !== 'object') {
    return { static_data: {} };
  }

  if (Array.isArray(datos) && datos.length > 0) {
    datos = datos[0];
  }

  if (datos.static_data !== undefined) {
    return {
      static_data: typeof datos.static_data === 'object' ? datos.static_data || {} : {},
      ...(datos.dynamic_data && { dynamic_data: datos.dynamic_data }),
      ...(datos.styles && { styles: datos.styles }),
      ...(datos.toggles && { toggles: datos.toggles }),
    };
  }

  return { static_data: datos };
}
