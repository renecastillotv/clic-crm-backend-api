import { Knex } from 'knex';

/**
 * Migración 070 - Crear tablas para solicitudes CLIC Connect
 * 
 * Crea tablas para:
 * - Solicitudes de unirse a CLIC Connect (join requests)
 * - Solicitudes de upgrade (crear tenant o regresar a tenant original)
 */

export async function up(knex: Knex): Promise<void> {
  // Tabla para solicitudes de unirse a CLIC Connect
  await knex.schema.createTable('clic_connect_join_requests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('email').notNullable();
    table.string('nombre').notNullable();
    table.string('apellido').nullable();
    table.string('telefono').nullable();
    table.string('codigo_referido').nullable().comment('Código de referido si fue invitado por otro usuario');
    table.integer('anos_experiencia').nullable();
    table.string('especializacion').nullable();
    table.string('agencia_actual').nullable();
    table.text('motivacion').nullable();
    table.string('estado').defaultTo('pending').comment('pending, approved, rejected');
    table.uuid('revisado_por').nullable().references('id').inTable('usuarios').onDelete('SET NULL');
    table.timestamp('revisado_at').nullable();
    table.text('notas_revision').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('tenant_id', 'idx_join_requests_tenant');
    table.index('email', 'idx_join_requests_email');
    table.index('estado', 'idx_join_requests_estado');
    table.index('codigo_referido', 'idx_join_requests_referido');
  });

  // Tabla para solicitudes de upgrade (crear tenant o regresar)
  await knex.schema.createTable('clic_connect_upgrade_requests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('usuario_id').notNullable().references('id').inTable('usuarios').onDelete('CASCADE');
    table.string('tipo_solicitud').notNullable().comment('create_new_tenant, return_to_tenant');
    table.text('razon').notNullable();
    table.string('nombre_tenant_propuesto').nullable().comment('Si es create_new_tenant');
    table.string('plan_propuesto').nullable().comment('Si es create_new_tenant');
    table.integer('tamano_equipo_estimado').nullable();
    table.uuid('tenant_original_id').nullable().references('id').inTable('tenants').onDelete('SET NULL').comment('Si es return_to_tenant');
    table.integer('propiedades_a_migrar').defaultTo(0);
    table.integer('propiedades_publicadas').defaultTo(0);
    table.integer('propiedades_captacion').defaultTo(0);
    table.integer('propiedades_rechazadas').defaultTo(0);
    table.decimal('tarifa_setup', 10, 2).defaultTo(0);
    table.boolean('tarifa_setup_pagada').defaultTo(false);
    table.string('estado').defaultTo('pending').comment('pending, approved, rejected');
    table.uuid('revisado_por').nullable().references('id').inTable('usuarios').onDelete('SET NULL');
    table.timestamp('revisado_at').nullable();
    table.text('notas_revision').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('tenant_id', 'idx_upgrade_requests_tenant');
    table.index('usuario_id', 'idx_upgrade_requests_usuario');
    table.index('estado', 'idx_upgrade_requests_estado');
    table.index('tipo_solicitud', 'idx_upgrade_requests_tipo');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('clic_connect_upgrade_requests');
  await knex.schema.dropTableIfExists('clic_connect_join_requests');
}












