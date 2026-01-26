/**
 * Migración 129: Agregar asesor_default_id a tenants
 *
 * Agrega la columna para almacenar el perfil de asesor por defecto del tenant.
 * Este asesor se usa como fallback cuando el asesor original de una propiedad
 * está inactivo o no existe.
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Check if column already exists
  const hasColumn = await knex.schema.hasColumn('tenants', 'asesor_default_id');
  if (hasColumn) {
    console.log('✅ Columna asesor_default_id ya existe en tenants');
    return;
  }

  // Agregar columna asesor_default_id a tenants
  await knex.schema.alterTable('tenants', (table) => {
    table.uuid('asesor_default_id').nullable().references('id').inTable('perfiles_asesor').onDelete('SET NULL');
    table.index('asesor_default_id', 'idx_tenants_asesor_default');
  });

  // Para cada tenant que tenga asesores activos, asignar el primero como default
  await knex.raw(`
    UPDATE tenants t
    SET asesor_default_id = (
      SELECT pa.id
      FROM perfiles_asesor pa
      INNER JOIN usuarios u ON pa.usuario_id = u.id
      WHERE pa.tenant_id = t.id
        AND pa.activo = true
        AND pa.visible_en_web = true
        AND u.activo = true
      ORDER BY pa.created_at ASC
      LIMIT 1
    )
    WHERE EXISTS (
      SELECT 1
      FROM perfiles_asesor pa
      INNER JOIN usuarios u ON pa.usuario_id = u.id
      WHERE pa.tenant_id = t.id
        AND pa.activo = true
        AND pa.visible_en_web = true
        AND u.activo = true
    )
  `);

  console.log('✅ Columna asesor_default_id agregada a tenants');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('tenants', (table) => {
    table.dropIndex('asesor_default_id', 'idx_tenants_asesor_default');
    table.dropColumn('asesor_default_id');
  });

  console.log('✅ Columna asesor_default_id eliminada de tenants');
}
