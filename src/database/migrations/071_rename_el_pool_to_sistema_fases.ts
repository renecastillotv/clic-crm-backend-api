import { Knex } from 'knex';

/**
 * Migración 071 - Renombrar feature "El Pool" a "Sistema de Fases"
 * 
 * Actualiza el nombre del feature en la base de datos si ya existe
 */
export async function up(knex: Knex): Promise<void> {
  // Actualizar el nombre del feature si existe
  await knex('features')
    .where('name', 'El Pool')
    .update({
      name: 'Sistema de Fases',
      updated_at: knex.fn.now(),
    });
}

export async function down(knex: Knex): Promise<void> {
  // Revertir el nombre del feature
  await knex('features')
    .where('name', 'Sistema de Fases')
    .update({
      name: 'El Pool',
      updated_at: knex.fn.now(),
    });
}













