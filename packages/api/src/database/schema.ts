/**
 * ESQUEMA DE BASE DE DATOS
 * 
 * Este archivo contiene la definición completa del esquema de la base de datos.
 * Cada tabla, relación y campo debe estar documentado aquí.
 * 
 * IMPORTANTE: Este archivo debe mantenerse actualizado con cada migración.
 * 
 * Última actualización: 2024-01-XX
 */

export interface DatabaseSchema {
  tables: TableDefinition[];
  relationships: Relationship[];
}

export interface TableDefinition {
  name: string;
  description: string;
  columns: ColumnDefinition[];
  indexes?: IndexDefinition[];
  constraints?: ConstraintDefinition[];
}

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  description: string;
  foreignKey?: {
    table: string;
    column: string;
  };
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  unique?: boolean;
  description?: string;
}

export interface ConstraintDefinition {
  name: string;
  type: 'primary' | 'foreign' | 'unique' | 'check';
  columns?: string[];
  description?: string;
}

export interface Relationship {
  from: {
    table: string;
    column: string;
  };
  to: {
    table: string;
    column: string;
  };
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  description: string;
}

/**
 * ESQUEMA ACTUAL DE LA BASE DE DATOS
 * 
 * Este objeto contiene la definición completa del esquema.
 * Actualiza este objeto cada vez que crees una nueva migración.
 */
export const schema: DatabaseSchema = {
  tables: [
    // Ejemplo de tabla - reemplazar con tus tablas reales
    // {
    //   name: 'usuarios',
    //   description: 'Tabla de usuarios del sistema',
    //   columns: [
    //     {
    //       name: 'id',
    //       type: 'uuid',
    //       nullable: false,
    //       description: 'Identificador único del usuario',
    //     },
    //     {
    //       name: 'email',
    //       type: 'varchar(255)',
    //       nullable: false,
    //       description: 'Email del usuario',
    //     },
    //     {
    //       name: 'nombre',
    //       type: 'varchar(255)',
    //       nullable: true,
    //       description: 'Nombre completo del usuario',
    //     },
    //     {
    //       name: 'created_at',
    //       type: 'timestamp',
    //       nullable: false,
    //       defaultValue: 'now()',
    //       description: 'Fecha de creación del registro',
    //     },
    //     {
    //       name: 'updated_at',
    //       type: 'timestamp',
    //       nullable: false,
    //       defaultValue: 'now()',
    //       description: 'Fecha de última actualización',
    //     },
    //   ],
    //   indexes: [
    //     {
    //       name: 'idx_usuarios_email',
    //       columns: ['email'],
    //       unique: true,
    //       description: 'Índice único para email',
    //     },
    //   ],
    //   constraints: [
    //     {
    //       name: 'pk_usuarios',
    //       type: 'primary',
    //       columns: ['id'],
    //       description: 'Clave primaria',
    //     },
    //   ],
    // },
  ],
  relationships: [
    // Ejemplo de relación
    // {
    //   from: { table: 'posts', column: 'usuario_id' },
    //   to: { table: 'usuarios', column: 'id' },
    //   type: 'many-to-one',
    //   description: 'Un usuario puede tener muchos posts',
    // },
  ],
};

/**
 * Función helper para obtener información de una tabla
 */
export function getTable(name: string): TableDefinition | undefined {
  return schema.tables.find((table) => table.name === name);
}

/**
 * Función helper para obtener todas las columnas de una tabla
 */
export function getTableColumns(tableName: string): ColumnDefinition[] {
  const table = getTable(tableName);
  return table?.columns || [];
}

/**
 * Función helper para obtener relaciones de una tabla
 */
export function getTableRelationships(tableName: string): Relationship[] {
  return schema.relationships.filter(
    (rel) => rel.from.table === tableName || rel.to.table === tableName
  );
}



