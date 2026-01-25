/**
 * Migration: Create planes_pago table
 *
 * Planes de Pago (Payment Plans) for CRM
 * Similar structure to propuestas but for payment plan generation
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create planes_pago table
  await knex.schema.createTable('planes_pago', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');

    // Basic info
    table.string('titulo', 255).notNullable();
    table.text('descripcion').nullable();
    table.string('estado', 50).notNullable().defaultTo('borrador')
      .comment('Estado: borrador, enviado, visto, aceptado, rechazado');

    // Relationships
    table.uuid('contacto_id').nullable().references('id').inTable('contactos').onDelete('SET NULL');
    table.uuid('solicitud_id').nullable().references('id').inTable('solicitudes').onDelete('SET NULL');
    table.uuid('propiedad_id').nullable().references('id').inTable('propiedades').onDelete('SET NULL');
    table.uuid('unidad_id').nullable().references('id').inTable('unidades_proyecto').onDelete('SET NULL');
    table.uuid('usuario_creador_id').nullable().references('id').inTable('usuarios').onDelete('SET NULL');

    // Price and plan
    table.decimal('precio_total', 15, 2).nullable();
    table.string('moneda', 3).notNullable().defaultTo('USD');
    table.jsonb('plan_detalle').defaultTo('{}').comment('Payment plan breakdown structure');

    // Content
    table.text('condiciones').nullable().comment('Terms and conditions');
    table.text('notas_internas').nullable().comment('Internal notes (not visible to client)');

    // Public URL
    table.string('url_publica', 100).nullable().unique();
    table.timestamp('fecha_expiracion').nullable();
    table.timestamp('fecha_enviada').nullable();
    table.timestamp('fecha_vista').nullable();
    table.timestamp('fecha_respuesta').nullable();
    table.integer('veces_vista').notNullable().defaultTo(0);

    // Audit
    table.jsonb('datos_extra').defaultTo('{}');
    table.boolean('activo').notNullable().defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('tenant_id', 'idx_planes_pago_tenant');
    table.index('estado', 'idx_planes_pago_estado');
    table.index('contacto_id', 'idx_planes_pago_contacto');
    table.index('propiedad_id', 'idx_planes_pago_propiedad');
    table.index('usuario_creador_id', 'idx_planes_pago_usuario');
  });

  console.log('✅ planes_pago table created');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('planes_pago');
  console.log('✅ planes_pago table dropped');
}
