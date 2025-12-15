/**
 * componentSchema.ts
 * 
 * Validación de esquema para componentes estructurados
 * Asegura que los datos cumplan con el formato correcto
 */

import type { ComponenteDataEstructurado, StaticData, DynamicDataConfig, ComponentStyles, ComponentToggles } from '../types/componentes.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Valida que los datos de un componente cumplan con el esquema estructurado
 */
export function validateComponentData(
  datos: any
): ValidationResult {
  const errors: string[] = [];

  // Debe ser un objeto
  if (!datos || typeof datos !== 'object') {
    return {
      valid: false,
      errors: ['Los datos deben ser un objeto'],
    };
  }

  // Debe tener static_data
  if (!datos.static_data) {
    errors.push('El campo "static_data" es obligatorio');
  } else if (typeof datos.static_data !== 'object') {
    errors.push('El campo "static_data" debe ser un objeto');
  }

  // Validar dynamic_data si existe
  if (datos.dynamic_data !== undefined) {
    if (typeof datos.dynamic_data !== 'object') {
      errors.push('El campo "dynamic_data" debe ser un objeto');
    } else {
      const dynamicErrors = validateDynamicData(datos.dynamic_data);
      errors.push(...dynamicErrors);
    }
  }

  // Validar styles si existe
  if (datos.styles !== undefined) {
    if (typeof datos.styles !== 'object') {
      errors.push('El campo "styles" debe ser un objeto');
    } else {
      const stylesErrors = validateStyles(datos.styles);
      errors.push(...stylesErrors);
    }
  }

  // Validar toggles si existe
  if (datos.toggles !== undefined) {
    if (typeof datos.toggles !== 'object') {
      errors.push('El campo "toggles" debe ser un objeto');
    } else {
      const togglesErrors = validateToggles(datos.toggles);
      errors.push(...togglesErrors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Valida la configuración de dynamic_data
 */
function validateDynamicData(dynamicData: any): string[] {
  const errors: string[] = [];

  if (dynamicData.apiEndpoint && typeof dynamicData.apiEndpoint !== 'string') {
    errors.push('dynamic_data.apiEndpoint debe ser una cadena de texto');
  }

  if (dynamicData.dataType && typeof dynamicData.dataType !== 'string') {
    errors.push('dynamic_data.dataType debe ser una cadena de texto');
  } else if (
    dynamicData.dataType &&
    !['properties', 'agents', 'blog', 'testimonials', 'custom'].includes(
      dynamicData.dataType
    )
  ) {
    errors.push(
      `dynamic_data.dataType debe ser uno de: properties, agents, blog, testimonials, custom`
    );
  }

  if (dynamicData.pagination !== undefined) {
    if (typeof dynamicData.pagination !== 'object') {
      errors.push('dynamic_data.pagination debe ser un objeto');
    } else {
      if (
        dynamicData.pagination.page !== undefined &&
        typeof dynamicData.pagination.page !== 'number'
      ) {
        errors.push('dynamic_data.pagination.page debe ser un número');
      }
      if (
        dynamicData.pagination.limit !== undefined &&
        typeof dynamicData.pagination.limit !== 'number'
      ) {
        errors.push('dynamic_data.pagination.limit debe ser un número');
      }
    }
  }

  if (dynamicData.cache !== undefined && typeof dynamicData.cache !== 'number') {
    errors.push('dynamic_data.cache debe ser un número');
  }

  return errors;
}

/**
 * Valida los estilos del componente
 */
function validateStyles(styles: any): string[] {
  const errors: string[] = [];

  if (styles.colors !== undefined) {
    if (typeof styles.colors !== 'object') {
      errors.push('styles.colors debe ser un objeto');
    } else {
      // Validar que los valores de colores sean strings
      for (const [key, value] of Object.entries(styles.colors)) {
        if (typeof value !== 'string') {
          errors.push(`styles.colors.${key} debe ser una cadena de texto`);
        }
      }
    }
  }

  if (styles.spacing !== undefined) {
    if (typeof styles.spacing !== 'object') {
      errors.push('styles.spacing debe ser un objeto');
    } else {
      for (const [key, value] of Object.entries(styles.spacing)) {
        if (typeof value !== 'string') {
          errors.push(`styles.spacing.${key} debe ser una cadena de texto`);
        }
      }
    }
  }

  if (styles.fonts !== undefined) {
    if (typeof styles.fonts !== 'object') {
      errors.push('styles.fonts debe ser un objeto');
    } else {
      for (const [key, value] of Object.entries(styles.fonts)) {
        if (typeof value !== 'string') {
          errors.push(`styles.fonts.${key} debe ser una cadena de texto`);
        }
      }
    }
  }

  return errors;
}

/**
 * Valida los toggles del componente
 */
function validateToggles(toggles: any): string[] {
  const errors: string[] = [];

  // Todos los valores de toggles deben ser booleanos
  for (const [key, value] of Object.entries(toggles)) {
    if (typeof value !== 'boolean') {
      errors.push(`toggles.${key} debe ser un booleano`);
    }
  }

  return errors;
}

/**
 * Normaliza los datos de un componente, convirtiendo formato legacy a estructurado
 */
function normalizeLegacyData(datos: any): ComponenteDataEstructurado {
  // Si es null o undefined, retornar estructura mínima
  if (!datos || typeof datos !== 'object') {
    return {
      static_data: {},
    };
  }

  // Si es un array (formato legacy), tomar el primer elemento
  if (Array.isArray(datos) && datos.length > 0) {
    datos = datos[0];
  }

  // Si ya tiene static_data, es formato estructurado
  if (datos.static_data !== undefined) {
    return {
      static_data: typeof datos.static_data === 'object' ? (datos.static_data || {}) : {},
      ...(datos.dynamic_data && { dynamic_data: datos.dynamic_data }),
      ...(datos.styles && { styles: datos.styles }),
      ...(datos.toggles && { toggles: datos.toggles }),
    };
  }

  // Si es formato legacy (campos planos), convertir a estructura
  const staticData: Record<string, any> = {};
  const toggles: Record<string, boolean> = {};
  let styles: any = {};

  // Campos conocidos que van en static_data
  const staticFields = [
    'titulo', 'subtitulo', 'descripcion', 'textoBoton', 'textoCopyright',
    'urlBoton', 'imagenFondo', 'logo', 'telefono', 'email', 'direccion',
    'placeholder', 'itemsPorPagina', 'features'
  ];

  // Campos conocidos que van en toggles
  const toggleFields = [
    'mostrarPrecio', 'mostrarFiltros', 'mostrarMenu', 'mostrarBusqueda',
    'mostrarTelefono', 'mostrarEmail', 'mostrarMensaje', 'mostrarAutor',
    'mostrarFecha', 'mostrarResumen', 'mostrarCaracteristicas', 'mostrarUbicacion',
    'mostrarTotal'
  ];

  // Separar campos
  Object.keys(datos).forEach(key => {
    if (staticFields.includes(key)) {
      staticData[key] = datos[key];
    } else if (toggleFields.includes(key)) {
      toggles[key] = Boolean(datos[key]);
    } else if (key === 'styles' && typeof datos[key] === 'object') {
      styles = datos[key];
    }
  });

  const result: ComponenteDataEstructurado = {
    static_data: Object.keys(staticData).length > 0 ? staticData : {},
  };

  if (Object.keys(toggles).length > 0) {
    result.toggles = toggles;
  }
  if (datos.styles || Object.keys(styles).length > 0) {
    result.styles = datos.styles || styles;
  }
  if (datos.dynamic_data) {
    result.dynamic_data = datos.dynamic_data;
  }

  return result;
}

/**
 * Normaliza y valida los datos, lanzando error si no son válidos
 */
export function validateAndNormalizeComponentData(
  datos: any
): ComponenteDataEstructurado {
  // Primero normalizar (convertir legacy a estructurado)
  const normalized = normalizeLegacyData(datos);

  // Luego validar
  const validation = validateComponentData(normalized);

  if (!validation.valid) {
    throw new Error(
      `Datos de componente inválidos: ${validation.errors.join(', ')}`
    );
  }

  return normalized;
}

