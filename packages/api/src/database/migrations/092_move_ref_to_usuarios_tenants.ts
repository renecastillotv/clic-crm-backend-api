import type { Knex } from 'knex';

/**
 * Migración 092: Mover campo ref de perfiles_asesor a usuarios_tenants
 *
 * Propósito:
 * - Permitir que cualquier usuario (no solo asesores) pueda ser referidor
 * - Mayor flexibilidad para sistemas de afiliados, embajadores, etc.
 * - Centralizar el sistema de referencias en la tabla usuarios_tenants
 *
 * Estrategia:
 * 1. Agregar campo ref a usuarios_tenants
 * 2. Migrar datos existentes de perfiles_asesor a usuarios_tenants
 * 3. Eliminar campo ref de perfiles_asesor
 */

export async function up(knex: Knex): Promise<void> {
  console.log('⬆️  Ejecutando migración 092: move_ref_to_usuarios_tenants');

  // 1. Agregar campo ref a usuarios_tenants
  await knex.schema.alterTable('usuarios_tenants', (table) => {
    table.string('ref', 50).nullable().unique();
    table.index('ref'); // Índice para búsquedas rápidas
  });
  console.log('✅ Campo ref agregado a usuarios_tenants');

  // 2. Migrar datos existentes de perfiles_asesor a usuarios_tenants
  await knex.raw(`
    UPDATE usuarios_tenants ut
    SET ref = pa.ref
    FROM perfiles_asesor pa
    WHERE ut.usuario_id = pa.usuario_id
      AND ut.tenant_id = pa.tenant_id
      AND pa.ref IS NOT NULL
  `);
  console.log('✅ Datos de ref migrados de perfiles_asesor a usuarios_tenants');

  // 3. Eliminar campo ref de perfiles_asesor
  await knex.schema.alterTable('perfiles_asesor', (table) => {
    table.dropIndex('ref');
    table.dropColumn('ref');
  });
  console.log('✅ Campo ref eliminado de perfiles_asesor');
}

export async function down(knex: Knex): Promise<void> {
  console.log('⬇️  Revirtiendo migración 092');

  // 1. Reagregar campo ref a perfiles_asesor
  await knex.schema.alterTable('perfiles_asesor', (table) => {
    table.string('ref', 50).nullable().unique();
    table.index('ref');
  });

  // 2. Migrar datos de vuelta
  await knex.raw(`
    UPDATE perfiles_asesor pa
    SET ref = ut.ref
    FROM usuarios_tenants ut
    WHERE pa.usuario_id = ut.usuario_id
      AND pa.tenant_id = ut.tenant_id
      AND ut.ref IS NOT NULL
  `);

  // 3. Eliminar campo ref de usuarios_tenants
  await knex.schema.alterTable('usuarios_tenants', (table) => {
    table.dropIndex('ref');
    table.dropColumn('ref');
  });

  console.log('✅ Migración 092 revertida');
}
