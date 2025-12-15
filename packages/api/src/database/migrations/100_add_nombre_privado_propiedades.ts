/**
 * Migration 100: Add nombre_privado to propiedades
 * Campo para identificar la propiedad internamente (no se muestra al público)
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Verificar si la columna ya existe
  const hasColumn = await knex.schema.hasColumn('propiedades', 'nombre_privado');

  if (!hasColumn) {
    await knex.schema.alterTable('propiedades', (table) => {
      table.string('nombre_privado', 255).nullable();
    });

    console.log('Added nombre_privado column to propiedades table');
  } else {
    console.log('Column nombre_privado already exists in propiedades');
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('propiedades', 'nombre_privado');

  if (hasColumn) {
    await knex.schema.alterTable('propiedades', (table) => {
      table.dropColumn('nombre_privado');
    });
  }
}
