import { Knex } from 'knex';

/**
 * Migración - Extender usuarios con información adicional y documentación
 *
 * - Agrega campos extendidos a usuarios (dirección, fecha_nacimiento, etc.)
 * - Crea tabla de documentos/archivos adjuntos para usuarios
 * - Permite extender usuarios similar a contactos
 */
export async function up(knex: Knex): Promise<void> {
  // 1. Agregar campos extendidos a la tabla usuarios
  await knex.schema.alterTable('usuarios', (table) => {
    // Información personal extendida
    table.string('cedula', 50).nullable().comment('Cédula o documento de identidad');
    table.date('fecha_nacimiento').nullable().comment('Fecha de nacimiento');
    table.string('direccion', 500).nullable().comment('Dirección completa');
    table.string('ciudad', 100).nullable().comment('Ciudad');
    table.string('estado', 100).nullable().comment('Estado/Provincia');
    table.string('codigo_postal', 20).nullable().comment('Código postal');
    table.string('pais', 100).nullable().comment('País');
    
    // Información profesional
    table.string('empresa', 255).nullable().comment('Empresa u organización');
    table.string('cargo', 255).nullable().comment('Cargo o puesto');
    table.string('departamento', 255).nullable().comment('Departamento');
    
    // Información adicional
    table.text('notas').nullable().comment('Notas adicionales sobre el usuario');
    table.jsonb('datos_extra').defaultTo('{}').comment('Datos adicionales personalizados (similar a contactos)');
    table.jsonb('tipos_usuario').defaultTo('[]').comment('Array de tipos/extensiones del usuario (ej: asesor, desarrollador, etc.)');
    
    // Índices
    table.index('cedula', 'idx_usuarios_cedula');
    table.index('empresa', 'idx_usuarios_empresa');
  });

  // 2. Crear tabla de documentos/archivos adjuntos para usuarios
  await knex.schema.createTable('usuarios_documentos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('usuario_id').notNullable().references('id').inTable('usuarios').onDelete('CASCADE');

    // Información del documento
    table.string('nombre', 255).notNullable().comment('Nombre del documento');
    table.string('tipo', 50).notNullable()
      .comment('Tipo: cedula, contrato, certificado, foto, otro');
    table.text('descripcion').nullable().comment('Descripción del documento');
    
    // Archivo
    table.string('nombre_archivo', 255).notNullable().comment('Nombre original del archivo');
    table.string('ruta_archivo', 500).notNullable().comment('Ruta donde se almacena el archivo');
    table.string('tipo_mime', 100).nullable().comment('Tipo MIME del archivo');
    table.integer('tamanio_bytes').nullable().comment('Tamaño del archivo en bytes');
    
    // Metadatos
    table.jsonb('metadata').defaultTo('{}').comment('Metadatos adicionales del archivo');
    table.boolean('es_publico').defaultTo(false).comment('Si el documento es público o privado');
    
    // Usuario que subió el archivo
    table.uuid('subido_por_id').nullable().references('id').inTable('usuarios').onDelete('SET NULL');
    
    // Auditoría
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Índices
    table.index('tenant_id', 'idx_usuarios_docs_tenant');
    table.index('usuario_id', 'idx_usuarios_docs_usuario');
    table.index('tipo', 'idx_usuarios_docs_tipo');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Eliminar tabla de documentos
  await knex.schema.dropTableIfExists('usuarios_documentos');

  // Eliminar campos extendidos de usuarios
  await knex.schema.alterTable('usuarios', (table) => {
    table.dropIndex('empresa', 'idx_usuarios_empresa');
    table.dropIndex('cedula', 'idx_usuarios_cedula');
    table.dropColumn('tipos_usuario');
    table.dropColumn('datos_extra');
    table.dropColumn('notas');
    table.dropColumn('departamento');
    table.dropColumn('cargo');
    table.dropColumn('empresa');
    table.dropColumn('pais');
    table.dropColumn('codigo_postal');
    table.dropColumn('estado');
    table.dropColumn('ciudad');
    table.dropColumn('direccion');
    table.dropColumn('fecha_nacimiento');
    table.dropColumn('cedula');
  });
}















