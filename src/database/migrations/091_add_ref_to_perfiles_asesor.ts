import type { Knex } from 'knex';

/**
 * Migración 091: Agregar campo ref a perfiles_asesor
 *
 * Propósito:
 * - Agregar campo ref (VARCHAR) para referencias públicas de asesores
 * - Permitir tracking de URLs como /testimonios/vendedores/juan-rafael?ref=ABC123
 * - El ref se usa para identificar qué asesor refirió el tráfico
 *
 * Ejemplos de uso:
 * - ref: 'ABC123' -> se busca el asesor con ese ref
 * - ref: 'JR2024' -> código único del asesor Juan Rafael
 */

export async function up(knex: Knex): Promise<void> {
  console.log('⬆️  Ejecutando migración 091: add_ref_to_perfiles_asesor');

  // Agregar campo ref a perfiles_asesor
  await knex.schema.alterTable('perfiles_asesor', (table) => {
    table.string('ref', 50).nullable().unique();
    table.index('ref'); // Índice para búsquedas rápidas
  });

  console.log('✅ Campo ref agregado a perfiles_asesor');
}

export async function down(knex: Knex): Promise<void> {
  console.log('⬇️  Revirtiendo migración 091');

  // Eliminar campo ref
  await knex.schema.alterTable('perfiles_asesor', (table) => {
    table.dropIndex('ref');
    table.dropColumn('ref');
  });

  console.log('✅ Migración 091 revertida');
}
