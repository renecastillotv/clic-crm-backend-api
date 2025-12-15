import { Knex } from 'knex';

/**
 * Migración 013: Sistema de componentes globales reutilizables
 *
 * Cambios:
 * 1. Agregar campo 'nombre' a componentes_web para identificar variantes
 * 2. Crear tabla paginas_componentes para relacionar páginas con componentes globales
 * 3. Permitir múltiples componentes del mismo tipo por tenant
 *
 * Modelo de uso:
 * - Header y Footer: siempre únicos por tenant, se aplican automáticamente
 * - Otros componentes (Hero, CTA, etc): pueden tener múltiples versiones globales
 * - Las páginas pueden:
 *   a) Usar un componente global existente (referencia)
 *   b) Crear un componente específico para esa página
 */

export async function up(knex: Knex): Promise<void> {
  // 1. Agregar campo 'nombre' a componentes_web
  const hasNombre = await knex.schema.hasColumn('componentes_web', 'nombre');
  if (!hasNombre) {
    await knex.schema.alterTable('componentes_web', (table) => {
      table.string('nombre', 100).nullable();
    });
  }

  // 2. Crear tabla de relación páginas-componentes
  const hasPaginasComponentes = await knex.schema.hasTable('paginas_componentes');
  if (!hasPaginasComponentes) {
    await knex.schema.createTable('paginas_componentes', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('pagina_id').notNullable().references('id').inTable('paginas_web').onDelete('CASCADE');
      table.uuid('componente_id').notNullable().references('id').inTable('componentes_web').onDelete('CASCADE');
      table.integer('orden').defaultTo(0);
      table.boolean('activo').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      // Índices
      table.index(['pagina_id', 'orden']);
      // Un componente puede estar en múltiples páginas, pero solo una vez por página
      table.unique(['pagina_id', 'componente_id']);
    });
  }

  // 3. Actualizar componentes existentes con nombres por defecto
  // Solo para componentes con scope='tenant' que no son header/footer
  await knex.raw(`
    UPDATE componentes_web
    SET nombre = CASE
      WHEN tipo = 'header' THEN 'Header Principal'
      WHEN tipo = 'footer' THEN 'Footer Principal'
      ELSE CONCAT(INITCAP(tipo), ' Principal')
    END
    WHERE scope = 'tenant'
      AND nombre IS NULL
  `);

  // 4. Componentes de página (scope='page') ya específicos, nombrarlos
  await knex.raw(`
    UPDATE componentes_web
    SET nombre = CONCAT(INITCAP(tipo), ' de Página')
    WHERE scope = 'page'
      AND nombre IS NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Eliminar tabla de relación
  await knex.schema.dropTableIfExists('paginas_componentes');

  // Remover columna nombre
  const hasNombre = await knex.schema.hasColumn('componentes_web', 'nombre');
  if (hasNombre) {
    await knex.schema.alterTable('componentes_web', (table) => {
      table.dropColumn('nombre');
    });
  }
}
