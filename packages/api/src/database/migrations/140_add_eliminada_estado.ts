/**
 * Migration 140: Add 'eliminada' state to conversaciones
 */
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Drop existing check constraint and add new one with 'eliminada'
  await knex.schema.raw(`
    ALTER TABLE conversaciones
    DROP CONSTRAINT IF EXISTS conversaciones_estado_check;
  `);
  await knex.schema.raw(`
    ALTER TABLE conversaciones
    ADD CONSTRAINT conversaciones_estado_check
    CHECK (estado IN ('abierta', 'cerrada', 'archivada', 'spam', 'eliminada'));
  `);
  console.log('✅ Added eliminada state to conversaciones');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw(`
    UPDATE conversaciones SET estado = 'archivada' WHERE estado = 'eliminada';
  `);
  await knex.schema.raw(`
    ALTER TABLE conversaciones
    DROP CONSTRAINT IF EXISTS conversaciones_estado_check;
  `);
  await knex.schema.raw(`
    ALTER TABLE conversaciones
    ADD CONSTRAINT conversaciones_estado_check
    CHECK (estado IN ('abierta', 'cerrada', 'archivada', 'spam'));
  `);
}
