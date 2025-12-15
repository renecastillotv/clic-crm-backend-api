/**
 * Dynamic Field Parser
 * Analyzes JSONB component data and generates editable field definitions
 */

export type FieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'image' | 'url' | 'select' | 'array' | 'object';

export interface DynamicField {
  key: string;
  label: string;
  type: FieldType;
  value: any;
  path: string[]; // Full path in nested structure
  children?: DynamicField[]; // For objects and arrays
  opciones?: string[]; // For select fields
}

/**
 * Converts key to human-readable label
 * e.g., "titulo_principal" -> "Título Principal"
 */
function keyToLabel(key: string): string {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Infers field type from value
 */
function inferFieldType(value: any, key: string): FieldType {
  if (value === null || value === undefined) {
    return 'text';
  }

  const type = typeof value;

  // Check key patterns for specific types
  if (key.toLowerCase().includes('imagen') || key.toLowerCase().includes('image') || key.toLowerCase().includes('foto')) {
    return 'image';
  }
  if (key.toLowerCase().includes('url') || key.toLowerCase().includes('link') || key.toLowerCase().includes('enlace')) {
    return 'url';
  }
  if (key.toLowerCase().includes('descripcion') || key.toLowerCase().includes('description') || key.toLowerCase().includes('contenido')) {
    return 'textarea';
  }

  // Check by type
  if (type === 'boolean') return 'boolean';
  if (type === 'number') return 'number';
  if (type === 'string') {
    if (value.length > 100) return 'textarea';
    return 'text';
  }
  if (Array.isArray(value)) return 'array';
  if (type === 'object') return 'object';

  return 'text';
}

/**
 * Recursively parses an object into DynamicField definitions
 */
function parseObject(obj: any, parentPath: string[] = []): DynamicField[] {
  if (!obj || typeof obj !== 'object') return [];

  const fields: DynamicField[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const path = [...parentPath, key];
    const fieldType = inferFieldType(value, key);

    const field: DynamicField = {
      key,
      label: keyToLabel(key),
      type: fieldType,
      value,
      path,
    };

    // Handle nested structures
    if (fieldType === 'object' && value && typeof value === 'object' && !Array.isArray(value)) {
      field.children = parseObject(value, path);
    } else if (fieldType === 'array' && Array.isArray(value)) {
      // For arrays, create a template field based on first item
      if (value.length > 0) {
        const firstItem = value[0];
        if (typeof firstItem === 'object' && !Array.isArray(firstItem)) {
          field.children = parseObject(firstItem, [...path, '0']);
        }
      }
    }

    fields.push(field);
  }

  return fields;
}

/**
 * Main function: Parses component data into editable fields
 */
export function parseComponentData(datos: any): {
  staticFields: DynamicField[];
  toggleFields: DynamicField[];
  styleFields: DynamicField[];
} {
  const staticFields = datos?.static_data ? parseObject(datos.static_data, ['static_data']) : [];
  const toggleFields = datos?.toggles ? parseObject(datos.toggles, ['toggles']) : [];
  const styleFields = datos?.styles ? parseObject(datos.styles, ['styles']) : [];

  return {
    staticFields,
    toggleFields,
    styleFields,
  };
}

/**
 * Updates a value in nested object using path
 */
export function setNestedValue(obj: any, path: string[], value: any): any {
  if (path.length === 0) return value;

  const newObj = { ...obj };
  let current = newObj;

  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!(key in current)) {
      current[key] = {};
    } else {
      current[key] = { ...current[key] };
    }
    current = current[key];
  }

  current[path[path.length - 1]] = value;
  return newObj;
}

/**
 * Gets a value from nested object using path
 */
export function getNestedValue(obj: any, path: string[]): any {
  let current = obj;
  for (const key of path) {
    if (!current || typeof current !== 'object') return undefined;
    current = current[key];
  }
  return current;
}
