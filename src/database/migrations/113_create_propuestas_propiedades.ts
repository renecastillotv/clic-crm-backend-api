/**
 * Migration: Create propuestas_propiedades table
 *
 * Tabla de relación N:N entre propuestas y propiedades.
 * Permite que una propuesta contenga múltiples propiedades.
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Crear tabla propuestas_propiedades
  await knex.schema.createTable('propuestas_propiedades', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('propuesta_id').notNullable()
      .references('id').inTable('propuestas').onDelete('CASCADE');
    table.uuid('propiedad_id').notNullable()
      .references('id').inTable('propiedades').onDelete('CASCADE');
    table.integer('orden').defaultTo(0);
    table.text('notas').nullable();
    table.decimal('precio_especial', 15, 2).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Índice único para evitar duplicados
    table.unique(['propuesta_id', 'propiedad_id']);

    // Índices para búsquedas rápidas
    table.index('propuesta_id');
    table.index('propiedad_id');
  });

  // Migrar datos existentes: si hay propuestas con propiedad_id, crear registros en la nueva tabla
  await knex.raw(`
    INSERT INTO propuestas_propiedades (propuesta_id, propiedad_id, orden)
    SELECT id, propiedad_id, 0
    FROM propuestas
    WHERE propiedad_id IS NOT NULL
    ON CONFLICT DO NOTHING
  `);

  console.log('✅ Tabla propuestas_propiedades creada');
  console.log('✅ Datos existentes migrados');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('propuestas_propiedades');
  console.log('✅ Tabla propuestas_propiedades eliminada');
}
