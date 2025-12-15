# 📚 Manual de Trabajo - Base de Datos

Este manual describe el proceso para realizar cambios en la base de datos de forma controlada y documentada.

## 📋 Índice

1. [Flujo de Trabajo](#flujo-de-trabajo)
2. [Crear una Nueva Tabla](#crear-una-nueva-tabla)
3. [Modificar una Tabla Existente](#modificar-una-tabla-existente)
4. [Agregar Relaciones](#agregar-relaciones)
5. [Consultar el Esquema](#consultar-el-esquema)
6. [Comandos Útiles](#comandos-útiles)

---

## 🔄 Flujo de Trabajo

### Paso 1: Planificar el Cambio
Antes de crear cualquier migración, planifica:
- ¿Qué tabla(s) necesitas crear/modificar?
- ¿Qué columnas necesitas?
- ¿Qué relaciones necesitas establecer?
- ¿Qué índices necesitas?

### Paso 2: Crear la Migración
```bash
pnpm migrate:make nombre_descriptivo_de_la_migracion
```

Esto creará un archivo en `src/database/migrations/` con un timestamp.

### Paso 3: Escribir la Migración
Edita el archivo de migración creado. Ejemplo:

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('usuarios', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email').notNullable().unique();
    table.string('nombre').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('usuarios');
}
```

### Paso 4: Actualizar el Esquema
**IMPORTANTE**: Después de crear la migración, actualiza `src/database/schema.ts` con la nueva tabla/columna/relación.

### Paso 5: Aplicar la Migración
```bash
pnpm migrate:latest
```

### Paso 6: Verificar
```bash
pnpm migrate:status
```

---

## 🆕 Crear una Nueva Tabla

### Ejemplo: Crear tabla `productos`

1. **Crear la migración:**
```bash
pnpm migrate:make create_productos_table
```

2. **Escribir la migración:**
```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('productos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('nombre').notNullable();
    table.text('descripcion').nullable();
    table.decimal('precio', 10, 2).notNullable();
    table.integer('stock').defaultTo(0);
    table.uuid('categoria_id').references('id').inTable('categorias');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Índices
    table.index('categoria_id', 'idx_productos_categoria');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('productos');
}
```

3. **Actualizar el esquema en `src/database/schema.ts`:**
```typescript
{
  name: 'productos',
  description: 'Tabla de productos del catálogo',
  columns: [
    {
      name: 'id',
      type: 'uuid',
      nullable: false,
      description: 'Identificador único del producto',
    },
    {
      name: 'nombre',
      type: 'varchar(255)',
      nullable: false,
      description: 'Nombre del producto',
    },
    {
      name: 'descripcion',
      type: 'text',
      nullable: true,
      description: 'Descripción detallada del producto',
    },
    {
      name: 'precio',
      type: 'decimal(10,2)',
      nullable: false,
      description: 'Precio del producto',
    },
    {
      name: 'stock',
      type: 'integer',
      nullable: false,
      defaultValue: 0,
      description: 'Cantidad disponible en stock',
    },
    {
      name: 'categoria_id',
      type: 'uuid',
      nullable: true,
      description: 'ID de la categoría a la que pertenece',
      foreignKey: {
        table: 'categorias',
        column: 'id',
      },
    },
    {
      name: 'created_at',
      type: 'timestamp',
      nullable: false,
      defaultValue: 'now()',
      description: 'Fecha de creación',
    },
    {
      name: 'updated_at',
      type: 'timestamp',
      nullable: false,
      defaultValue: 'now()',
      description: 'Fecha de última actualización',
    },
  ],
  indexes: [
    {
      name: 'idx_productos_categoria',
      columns: ['categoria_id'],
      description: 'Índice para búsquedas por categoría',
    },
  ],
}
```

4. **Agregar la relación en el esquema:**
```typescript
{
  from: { table: 'productos', column: 'categoria_id' },
  to: { table: 'categorias', column: 'id' },
  type: 'many-to-one',
  description: 'Un producto pertenece a una categoría, una categoría tiene muchos productos',
}
```

5. **Aplicar la migración:**
```bash
pnpm migrate:latest
```

---

## ✏️ Modificar una Tabla Existente

### Agregar una Columna

1. **Crear la migración:**
```bash
pnpm migrate:make add_column_to_table
```

2. **Escribir la migración:**
```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('productos', (table) => {
    table.string('codigo_barras').nullable().after('nombre');
    table.index('codigo_barras', 'idx_productos_codigo_barras');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('productos', (table) => {
    table.dropIndex('codigo_barras', 'idx_productos_codigo_barras');
    table.dropColumn('codigo_barras');
  });
}
```

3. **Actualizar el esquema** agregando la nueva columna en la definición de la tabla.

### Modificar una Columna

```typescript
export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('productos', (table) => {
    table.string('nombre', 500).alter(); // Cambiar longitud
  });
}
```

### Eliminar una Columna

```typescript
export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('productos', (table) => {
    table.dropColumn('columna_a_eliminar');
  });
}
```

---

## 🔗 Agregar Relaciones

### Relación Uno a Muchos (One-to-Many)

Ya está incluida en el ejemplo de `productos` → `categorias`.

### Relación Muchos a Muchos (Many-to-Many)

Necesitas una tabla intermedia:

```typescript
export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('producto_tags', (table) => {
    table.uuid('producto_id').references('id').inTable('productos').onDelete('CASCADE');
    table.uuid('tag_id').references('id').inTable('tags').onDelete('CASCADE');
    table.primary(['producto_id', 'tag_id']);
  });
}
```

Luego en el esquema:
```typescript
{
  from: { table: 'producto_tags', column: 'producto_id' },
  to: { table: 'productos', column: 'id' },
  type: 'many-to-many',
  description: 'Un producto puede tener muchos tags, un tag puede estar en muchos productos',
}
```

---

## 🔍 Consultar el Esquema

### Desde el Código

```typescript
import { getTable, getTableColumns, getTableRelationships } from './database/schema';

// Obtener información de una tabla
const productosTable = getTable('productos');

// Obtener columnas de una tabla
const columns = getTableColumns('productos');

// Obtener relaciones de una tabla
const relationships = getTableRelationships('productos');
```

### Generar Documentación del Esquema

```bash
pnpm schema:generate
```

Esto generará un archivo `SCHEMA_DOCUMENTATION.md` con toda la información del esquema.

---

## 🛠️ Comandos Útiles

### Migraciones

```bash
# Crear una nueva migración
pnpm migrate:make nombre_migracion

# Aplicar todas las migraciones pendientes
pnpm migrate:latest

# Revertir la última migración
pnpm migrate:rollback

# Ver el estado de las migraciones
pnpm migrate:status

# Revertir todas las migraciones
pnpm migrate:rollback --all
```

### Esquema

```bash
# Generar documentación del esquema
pnpm schema:generate
```

---

## ⚠️ Reglas Importantes

1. **SIEMPRE** actualiza `src/database/schema.ts` después de crear una migración
2. **NUNCA** modifiques una migración que ya fue aplicada en producción
3. **SIEMPRE** prueba la migración `down()` antes de aplicar en producción
4. **SIEMPRE** documenta cada tabla, columna y relación en el esquema
5. **NUNCA** elimines datos sin crear un backup primero

---

## 📝 Plantilla de Migración

```typescript
import { Knex } from 'knex';

/**
 * Descripción breve de lo que hace esta migración
 * 
 * Cambios:
 * - Cambio 1
 * - Cambio 2
 * - Cambio 3
 */
export async function up(knex: Knex): Promise<void> {
  // Tu código aquí
}

export async function down(knex: Knex): Promise<void> {
  // Código para revertir los cambios
}
```

---

## 🆘 Solución de Problemas

### Error: "Migration already exists"
- Verifica que no hayas creado una migración con el mismo nombre
- Usa un nombre más específico

### Error: "Cannot find module"
- Asegúrate de haber ejecutado `pnpm install`
- Verifica que el archivo de migración esté en `src/database/migrations/`

### Error al aplicar migración
- Revisa los logs de error
- Verifica que la base de datos esté accesible
- Asegúrate de que `DATABASE_URL` esté configurada correctamente

---

## 📚 Recursos

- [Documentación de Knex.js](https://knexjs.org/)
- [PostgreSQL Data Types](https://www.postgresql.org/docs/current/datatype.html)
- [Esquema actual](./src/database/schema.ts)



