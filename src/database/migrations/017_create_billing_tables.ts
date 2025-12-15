import { Knex } from 'knex';

/**
 * Migración: Crear tablas de facturación
 * 
 * Sistema de facturación y pagos para tenants
 */
export async function up(knex: Knex): Promise<void> {
  // Tabla de facturas
  await knex.schema.createTable('facturas', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('numero_factura', 50).notNullable().unique().comment('Número único de factura');
    table.string('plan', 50).notNullable().comment('Plan facturado: basic, pro, premium');
    table.decimal('monto', 10, 2).notNullable().comment('Monto total de la factura');
    table.string('moneda', 3).defaultTo('USD').comment('Código de moneda ISO');
    table.string('estado', 20).defaultTo('pendiente').comment('estado: pendiente, pagada, vencida, cancelada');
    table.date('fecha_emision').notNullable().comment('Fecha de emisión');
    table.date('fecha_vencimiento').notNullable().comment('Fecha de vencimiento');
    table.date('fecha_pago').nullable().comment('Fecha de pago (si está pagada)');
    table.string('metodo_pago', 50).nullable().comment('Método de pago: tarjeta, transferencia, etc.');
    table.string('referencia_pago', 100).nullable().comment('Referencia de pago externa');
    table.jsonb('detalles').defaultTo('{}').comment('Detalles adicionales de la factura');
    table.text('notas').nullable().comment('Notas internas');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index('tenant_id', 'idx_facturas_tenant');
    table.index('estado', 'idx_facturas_estado');
    table.index('fecha_emision', 'idx_facturas_fecha_emision');
    table.index('numero_factura', 'idx_facturas_numero');
  });

  // Tabla de suscripciones (relación tenant-plan con fechas)
  await knex.schema.createTable('suscripciones', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('plan', 50).notNullable().comment('Plan actual');
    table.string('estado', 20).defaultTo('activa').comment('estado: activa, suspendida, cancelada');
    table.date('fecha_inicio').notNullable().comment('Fecha de inicio de la suscripción');
    table.date('fecha_fin').nullable().comment('Fecha de fin (null = sin fecha de fin)');
    table.date('proximo_cobro').nullable().comment('Fecha del próximo cobro');
    table.decimal('monto_mensual', 10, 2).notNullable().comment('Monto mensual del plan');
    table.string('metodo_pago_guardado', 50).nullable().comment('Método de pago guardado');
    table.jsonb('configuracion').defaultTo('{}').comment('Configuración de la suscripción');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.unique(['tenant_id'], 'idx_suscripciones_tenant_unique');
    table.index('estado', 'idx_suscripciones_estado');
    table.index('proximo_cobro', 'idx_suscripciones_proximo_cobro');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('suscripciones');
  await knex.schema.dropTableIfExists('facturas');
}

