/**
 * Migración 056: Tablas de Expediente de Ventas
 * 
 * Crea las tablas necesarias para gestionar el expediente/documentación de las ventas:
 * - ventas_expediente_requerimientos: Requerimientos de documentos según tipo de operación
 * - ventas_expediente_items: Documentos subidos para cada venta
 */
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ==================== TABLA REQUERIMIENTOS DE EXPEDIENTE ====================
  await knex.schema.createTable('ventas_expediente_requerimientos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    
    // Información del requerimiento
    table.string('titulo', 255).notNullable().comment('Título del requerimiento');
    table.text('descripcion').nullable().comment('Descripción detallada');
    table.text('instrucciones').nullable().comment('Instrucciones para cumplir el requerimiento');
    
    // Categoría y tipo
    table.string('categoria', 50).notNullable()
      .comment('Categoría: cierre_venta, cierre_alquiler, cierre_renta');
    table.string('tipo', 50).nullable()
      .comment('Tipo específico del requerimiento');
    
    // Configuración
    table.boolean('requiere_documento').defaultTo(true)
      .comment('Si requiere subir un documento');
    table.boolean('es_obligatorio').defaultTo(false)
      .comment('Si es obligatorio para completar el expediente');
    table.integer('orden_visualizacion').defaultTo(0)
      .comment('Orden de visualización');
    
    // Tipos de archivo permitidos (JSONB)
    table.jsonb('tipos_archivo_permitidos').defaultTo('["pdf", "jpg", "jpeg", "png", "doc", "docx"]')
      .comment('Tipos de archivo permitidos');
    
    // Tamaño máximo de archivo (en bytes)
    table.bigInteger('tamaño_maximo_archivo').defaultTo(10485760)
      .comment('Tamaño máximo en bytes (default 10MB)');
    
    // Estado
    table.boolean('activo').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Índices
    table.index('tenant_id', 'idx_expediente_req_tenant');
    table.index('categoria', 'idx_expediente_req_categoria');
    table.index('activo', 'idx_expediente_req_activo');
    table.index('orden_visualizacion', 'idx_expediente_req_orden');
  });

  // ==================== TABLA ITEMS DE EXPEDIENTE ====================
  await knex.schema.createTable('ventas_expediente_items', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('venta_id').notNullable().references('id').inTable('ventas').onDelete('CASCADE');
    table.uuid('requerimiento_id').notNullable()
      .references('id').inTable('ventas_expediente_requerimientos').onDelete('CASCADE');
    
    // Información del documento
    table.string('titulo', 255).notNullable()
      .comment('Título del requerimiento (copiado del requerimiento)');
    table.text('descripcion').nullable();
    table.string('categoria', 50).notNullable()
      .comment('Categoría (copiada del requerimiento)');
    table.string('tipo', 50).nullable();
    
    // Configuración (copiada del requerimiento)
    table.boolean('requiere_documento').defaultTo(true);
    table.boolean('es_obligatorio').defaultTo(false);
    
    // Estado del item
    table.string('estado', 50).defaultTo('pendiente')
      .comment('Estado: pendiente, completado, rechazado');
    
    // Información del archivo subido
    table.text('url_documento').nullable()
      .comment('URL pública del documento subido');
    table.text('ruta_documento').nullable()
      .comment('Ruta en el storage (bucket/key)');
    table.string('tipo_archivo', 100).nullable()
      .comment('MIME type del archivo');
    table.bigInteger('tamaño_archivo').nullable()
      .comment('Tamaño del archivo en bytes');
    table.string('nombre_documento', 255).nullable()
      .comment('Nombre original del archivo');
    
    // Fechas
    table.timestamp('fecha_subida_documento').nullable()
      .comment('Fecha en que se subió el documento');
    table.timestamp('fecha_revision').nullable()
      .comment('Fecha en que se revisó el documento');
    
    // Usuario que subió/revisó
    table.uuid('subido_por_id').nullable()
      .references('id').inTable('usuarios').onDelete('SET NULL');
    table.uuid('revisado_por_id').nullable()
      .references('id').inTable('usuarios').onDelete('SET NULL');
    
    // Notas y comentarios
    table.text('notas_revision').nullable()
      .comment('Notas de la revisión');
    table.text('comentarios').nullable();
    
    // Auditoría
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Índices
    table.index('tenant_id', 'idx_expediente_items_tenant');
    table.index('venta_id', 'idx_expediente_items_venta');
    table.index('requerimiento_id', 'idx_expediente_items_req');
    table.index('estado', 'idx_expediente_items_estado');
    table.index('subido_por_id', 'idx_expediente_items_subido');
    
    // Índice único: una venta solo puede tener un item por requerimiento
    table.unique(['venta_id', 'requerimiento_id'], 'uq_expediente_items_venta_req');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('ventas_expediente_items');
  await knex.schema.dropTableIfExists('ventas_expediente_requerimientos');
}

