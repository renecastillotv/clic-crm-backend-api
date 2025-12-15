import { Knex } from 'knex';

/**
 * Migración - Tablas de Ventas y Comisiones
 * 
 * Crea las tablas necesarias para gestionar ventas (deals) y comisiones:
 * - ventas: Registro de cierres/ventas realizadas
 * - estados_venta: Estados del proceso de venta (ej: en proceso, completada, etc.)
 * 
 * NOTA: El tipo de operación (venta, renta, traspaso) se hereda de la propiedad linkeada.
 * No se necesitan tablas adicionales para tipos de venta u operación.
 */
export async function up(knex: Knex): Promise<void> {
  // ==================== TABLA ESTADOS DE VENTA ====================
  await knex.schema.createTable('estados_venta', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('nombre', 100).notNullable().comment('Nombre del estado');
    table.text('descripcion').nullable();
    table.boolean('es_final').defaultTo(false).comment('Si es un estado final (completado, cancelado)');
    table.integer('orden').defaultTo(0).comment('Orden de visualización');
    table.boolean('activo').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index('tenant_id', 'idx_estados_venta_tenant');
    table.index('es_final', 'idx_estados_venta_final');
  });

  // ==================== TABLA VENTAS (DEALS) ====================
  await knex.schema.createTable('ventas', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    
    // Número de venta
    table.integer('numero_venta').nullable().comment('Número único de venta');
    
    // Información básica
    table.string('nombre_negocio', 255).nullable().comment('Nombre del negocio/cliente');
    table.text('descripcion').nullable();
    
    // Relaciones principales
    table.uuid('propiedad_id').nullable().references('id').inTable('propiedades').onDelete('SET NULL')
      .comment('ID de la propiedad vendida (el tipo de operación se hereda de aquí)');
    table.uuid('contacto_id').nullable().references('id').inTable('contactos').onDelete('SET NULL')
      .comment('Cliente/comprador');
    table.uuid('usuario_cerrador_id').nullable().references('id').inTable('usuarios').onDelete('SET NULL')
      .comment('Asesor de nuestra inmobiliaria que cerró la venta');
    table.uuid('equipo_id').nullable().comment('ID del equipo (si aplica)');
    
    // Vendedores externos (otra inmobiliaria o asesor independiente)
    table.string('vendedor_externo_tipo', 50).nullable()
      .comment('Tipo: inmobiliaria, asesor_independiente');
    table.string('vendedor_externo_nombre', 255).nullable()
      .comment('Nombre de la inmobiliaria o asesor externo');
    table.string('vendedor_externo_contacto', 255).nullable()
      .comment('Email o teléfono del vendedor externo');
    table.uuid('vendedor_externo_id').nullable().references('id').inTable('contactos').onDelete('SET NULL')
      .comment('Si el vendedor externo está registrado como contacto');
    
    // Referidor
    table.string('referidor_nombre', 255).nullable().comment('Nombre del referidor');
    table.uuid('referidor_id').nullable().references('id').inTable('usuarios').onDelete('SET NULL')
      .comment('Usuario referidor (si es interno)');
    table.uuid('referidor_contacto_id').nullable().references('id').inTable('contactos').onDelete('SET NULL')
      .comment('Contacto referidor (si es externo)');
    
    // Estado
    table.uuid('estado_venta_id').nullable().references('id').inTable('estados_venta').onDelete('SET NULL');
    
    // Información de la propiedad (puede ser externa)
    table.boolean('es_propiedad_externa').defaultTo(false).comment('Si la propiedad no está en el sistema');
    table.string('nombre_propiedad_externa', 255).nullable();
    table.string('codigo_propiedad_externa', 100).nullable();
    table.string('ciudad_propiedad', 100).nullable();
    table.string('sector_propiedad', 100).nullable();
    table.string('categoria_propiedad', 100).nullable();
    table.string('numero_unidad', 50).nullable();
    
    // Valores financieros
    table.decimal('valor_cierre', 15, 2).notNullable().comment('Valor del cierre');
    table.string('moneda', 3).defaultTo('USD').comment('Moneda del cierre');
    table.decimal('porcentaje_comision', 5, 2).nullable().comment('Porcentaje de comisión');
    table.decimal('monto_comision', 15, 2).nullable().comment('Monto de comisión calculado');
    
    // Estado de comisión
    table.string('estado_comision', 50).defaultTo('pendiente')
      .comment('Estado: pendiente, parcial, pagado');
    table.decimal('monto_comision_pagado', 15, 2).defaultTo(0).comment('Monto de comisión ya pagado');
    table.timestamp('fecha_pago_comision').nullable().comment('Fecha del último pago de comisión');
    table.text('notas_comision').nullable().comment('Notas sobre el pago de comisión');
    
    // Fechas importantes
    table.timestamp('fecha_cierre').nullable().comment('Fecha en que se cerró la venta');
    table.timestamp('fecha_creacion').defaultTo(knex.fn.now());
    
    
    // Impuestos y otros
    table.boolean('aplica_impuestos').defaultTo(false).comment('Si se aplicaron impuestos');
    table.decimal('monto_impuestos', 15, 2).nullable();
    
    // Estado general
    table.boolean('completada').defaultTo(false).comment('Si la venta está completada');
    table.boolean('cancelada').defaultTo(false).comment('Si la venta fue cancelada');
    table.timestamp('fecha_cancelacion').nullable();
    table.uuid('cancelado_por_id').nullable().references('id').inTable('usuarios').onDelete('SET NULL');
    table.text('razon_cancelacion').nullable();
    
    // Datos adicionales
    table.jsonb('datos_extra').defaultTo('{}').comment('Datos adicionales personalizados');
    table.text('notas').nullable();
    
    // Auditoría
    table.boolean('activo').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Índices
    table.index('tenant_id', 'idx_ventas_tenant');
    table.index('usuario_cerrador_id', 'idx_ventas_usuario');
    table.index('propiedad_id', 'idx_ventas_propiedad');
    table.index('contacto_id', 'idx_ventas_contacto');
    table.index('estado_venta_id', 'idx_ventas_estado');
    table.index('referidor_id', 'idx_ventas_referidor');
    table.index('vendedor_externo_id', 'idx_ventas_vendedor_externo');
    table.index('fecha_cierre', 'idx_ventas_fecha_cierre');
    table.index('completada', 'idx_ventas_completada');
    table.index('cancelada', 'idx_ventas_cancelada');
    table.index('numero_venta', 'idx_ventas_numero');
  });

  // ==================== TABLA COMISIONES (Historial de pagos) ====================
  await knex.schema.createTable('comisiones', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('venta_id').notNullable().references('id').inTable('ventas').onDelete('CASCADE');
    
    // Usuario que recibe la comisión
    table.uuid('usuario_id').notNullable().references('id').inTable('usuarios').onDelete('CASCADE');
    
    // Montos
    table.decimal('monto', 15, 2).notNullable().comment('Monto de la comisión');
    table.string('moneda', 3).defaultTo('USD');
    table.decimal('porcentaje', 5, 2).nullable().comment('Porcentaje de la comisión total');
    
    // Estado
    table.string('estado', 50).defaultTo('pendiente')
      .comment('Estado: pendiente, pagado, cancelado');
    table.decimal('monto_pagado', 15, 2).defaultTo(0);
    table.timestamp('fecha_pago').nullable();
    
    // Tipo de comisión
    table.string('tipo', 50).defaultTo('venta')
      .comment('Tipo: venta, captacion, referido, liderazgo, especialidad');
    
    // Notas
    table.text('notas').nullable();
    table.jsonb('datos_extra').defaultTo('{}');
    
    // Auditoría
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Índices
    table.index('tenant_id', 'idx_comisiones_tenant');
    table.index('venta_id', 'idx_comisiones_venta');
    table.index('usuario_id', 'idx_comisiones_usuario');
    table.index('estado', 'idx_comisiones_estado');
    table.index('fecha_pago', 'idx_comisiones_fecha_pago');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('comisiones');
  await knex.schema.dropTableIfExists('ventas');
  await knex.schema.dropTableIfExists('estados_venta');
}

