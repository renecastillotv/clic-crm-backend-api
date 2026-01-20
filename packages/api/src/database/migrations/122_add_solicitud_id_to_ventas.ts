/**
 * Migración 122: Agregar solicitud_id a tabla ventas
 *
 * Permite vincular una venta con la solicitud que le dio origen,
 * facilitando el seguimiento del pipeline de ventas completo.
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Agregar campo solicitud_id a la tabla ventas
  await knex.schema.alterTable('ventas', (table) => {
    table.uuid('solicitud_id')
      .nullable()
      .references('id')
      .inTable('solicitudes')
      .onDelete('SET NULL')
      .comment('Solicitud que originó esta venta');
  });

  // Crear índice para búsquedas rápidas
  await knex.schema.alterTable('ventas', (table) => {
    table.index('solicitud_id', 'idx_ventas_solicitud');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('ventas', (table) => {
    table.dropIndex('solicitud_id', 'idx_ventas_solicitud');
    table.dropColumn('solicitud_id');
  });
}
