import { Knex } from 'knex';

/**
 * Migración para agregar campos faltantes a la tabla solicitudes
 *
 * Agrega:
 * - presupuesto_min: Presupuesto mínimo del cliente
 * - presupuesto_max: Presupuesto máximo del cliente
 * - motivo: Motivo de búsqueda (vivienda, inversión, etc.)
 * - prioridad: Nivel de prioridad de la solicitud
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('solicitudes', (table) => {
    table.decimal('presupuesto_min', 15, 2).nullable().comment('Presupuesto mínimo del cliente');
    table.decimal('presupuesto_max', 15, 2).nullable().comment('Presupuesto máximo del cliente');
    table.string('motivo', 100).nullable().comment('Motivo: mudanza, inversion, vacaciones, negocio, oficina, otro');
    table.string('prioridad', 50).nullable().defaultTo('media').comment('Prioridad: baja, media, alta, urgente');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('solicitudes', (table) => {
    table.dropColumn('presupuesto_min');
    table.dropColumn('presupuesto_max');
    table.dropColumn('motivo');
    table.dropColumn('prioridad');
  });
}
