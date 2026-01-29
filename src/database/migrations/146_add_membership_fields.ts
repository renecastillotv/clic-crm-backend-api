import { Knex } from 'knex';

/**
 * Migración - Agregar campos de membresía a tablas existentes
 *
 * Modifica tenants, facturas y suscripciones para soportar el nuevo sistema de membresías.
 */
export async function up(knex: Knex): Promise<void> {
  // ==================== MODIFICAR TABLA TENANTS ====================
  await knex.schema.alterTable('tenants', (table) => {
    // Vinculación con tipo de membresía
    table.uuid('tipo_membresia_id').nullable().references('id').inTable('tipos_membresia').onDelete('SET NULL');

    // Jerarquía de tenants (para tenant-child)
    table.uuid('tenant_padre_id').nullable().references('id').inTable('tenants').onDelete('SET NULL')
      .comment('Tenant padre si es un tenant-child');

    // Estado de cuenta
    table.string('estado_cuenta', 20).defaultTo('al_dia')
      .comment('al_dia, por_vencer, vencido, suspendido');
    table.date('fecha_ultimo_pago').nullable();
    table.decimal('saldo_pendiente', 10, 2).defaultTo(0).comment('Saldo pendiente de pago');

    // Límites personalizados (override de tipo_membresia)
    table.integer('limite_usuarios_override').nullable()
      .comment('Override del límite de usuarios (-1 = ilimitado)');
    table.integer('limite_propiedades_override').nullable()
      .comment('Override del límite de propiedades (-1 = ilimitado)');

    // Descuentos especiales
    table.decimal('descuento_porcentaje', 5, 2).nullable()
      .comment('Descuento fijo en porcentaje');
    table.text('notas_facturacion').nullable()
      .comment('Notas internas sobre facturación');

    // Índices
    table.index('tipo_membresia_id', 'idx_tenants_tipo_membresia');
    table.index('tenant_padre_id', 'idx_tenants_tenant_padre');
    table.index('estado_cuenta', 'idx_tenants_estado_cuenta');
  });

  // ==================== MODIFICAR TABLA FACTURAS ====================
  await knex.schema.alterTable('facturas', (table) => {
    // Vinculación con tipo de membresía y uso
    table.uuid('tipo_membresia_id').nullable().references('id').inTable('tipos_membresia').onDelete('SET NULL');
    table.uuid('uso_tenant_id').nullable().references('id').inTable('uso_tenant').onDelete('SET NULL')
      .comment('Registro de uso asociado a esta factura');

    // Desglose detallado de costos
    table.decimal('costo_base', 10, 2).defaultTo(0).comment('Costo base del plan');
    table.decimal('costo_usuarios_extra', 10, 2).defaultTo(0).comment('Costo por usuarios adicionales');
    table.integer('cantidad_usuarios_extra').defaultTo(0).comment('Número de usuarios extra');
    table.decimal('costo_propiedades_extra', 10, 2).defaultTo(0).comment('Costo por propiedades adicionales');
    table.integer('cantidad_propiedades_extra').defaultTo(0).comment('Número de propiedades extra');
    table.decimal('costo_features', 10, 2).defaultTo(0).comment('Costo total de features adicionales');
    table.jsonb('features_facturados').defaultTo('[]')
      .comment('Array: [{feature_id, nombre, precio}]');

    // Descuentos
    table.decimal('descuento', 10, 2).defaultTo(0);
    table.text('descripcion_descuento').nullable();

    // Subtotal (antes de descuento)
    table.decimal('subtotal', 10, 2).defaultTo(0);
  });

  // ==================== MODIFICAR TABLA SUSCRIPCIONES ====================
  await knex.schema.alterTable('suscripciones', (table) => {
    // Vinculación con tipo de membresía
    table.uuid('tipo_membresia_id').nullable().references('id').inTable('tipos_membresia').onDelete('SET NULL');

    // Recursos contratados (para planes personalizados)
    table.integer('usuarios_contratados').defaultTo(1)
      .comment('Usuarios incluidos en la suscripción');
    table.integer('propiedades_contratadas').defaultTo(0)
      .comment('Propiedades incluidas en la suscripción');
    table.jsonb('features_contratados').defaultTo('[]')
      .comment('Features adicionales contratados');

    // Precio personalizado (si difiere del tipo de membresía)
    table.decimal('precio_personalizado', 10, 2).nullable()
      .comment('Precio especial si es diferente al estándar');
    table.text('notas_suscripcion').nullable();
  });

  console.log('✅ Campos de membresía agregados a tenants, facturas y suscripciones');
}

export async function down(knex: Knex): Promise<void> {
  // Revertir cambios en suscripciones
  await knex.schema.alterTable('suscripciones', (table) => {
    table.dropColumn('tipo_membresia_id');
    table.dropColumn('usuarios_contratados');
    table.dropColumn('propiedades_contratadas');
    table.dropColumn('features_contratados');
    table.dropColumn('precio_personalizado');
    table.dropColumn('notas_suscripcion');
  });

  // Revertir cambios en facturas
  await knex.schema.alterTable('facturas', (table) => {
    table.dropColumn('tipo_membresia_id');
    table.dropColumn('uso_tenant_id');
    table.dropColumn('costo_base');
    table.dropColumn('costo_usuarios_extra');
    table.dropColumn('cantidad_usuarios_extra');
    table.dropColumn('costo_propiedades_extra');
    table.dropColumn('cantidad_propiedades_extra');
    table.dropColumn('costo_features');
    table.dropColumn('features_facturados');
    table.dropColumn('descuento');
    table.dropColumn('descripcion_descuento');
    table.dropColumn('subtotal');
  });

  // Revertir cambios en tenants
  await knex.schema.alterTable('tenants', (table) => {
    table.dropIndex('tipo_membresia_id', 'idx_tenants_tipo_membresia');
    table.dropIndex('tenant_padre_id', 'idx_tenants_tenant_padre');
    table.dropIndex('estado_cuenta', 'idx_tenants_estado_cuenta');
    table.dropColumn('tipo_membresia_id');
    table.dropColumn('tenant_padre_id');
    table.dropColumn('estado_cuenta');
    table.dropColumn('fecha_ultimo_pago');
    table.dropColumn('saldo_pendiente');
    table.dropColumn('limite_usuarios_override');
    table.dropColumn('limite_propiedades_override');
    table.dropColumn('descuento_porcentaje');
    table.dropColumn('notas_facturacion');
  });
}
