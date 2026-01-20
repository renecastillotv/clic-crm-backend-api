import { Knex } from 'knex';

/**
 * Migración: Sistema University
 *
 * Crea las tablas necesarias para el sistema de cursos, certificados y videos.
 *
 * Estructura:
 * - university_cursos: Cursos principales
 * - university_secciones: Secciones dentro de un curso (ej: Introducción, Fundamentos)
 * - university_videos: Videos individuales dentro de secciones
 * - university_certificados: Tipos de certificados que se emiten
 * - university_cursos_certificados: Relación entre cursos y certificados
 * - university_inscripciones: Inscripciones de usuarios a cursos
 * - university_progreso: Progreso de usuarios en videos
 */
export async function up(knex: Knex): Promise<void> {
  // 1. Agregar feature "University" si no existe
  const existingFeature = await knex('features').where('name', 'University').first();
  if (!existingFeature) {
    await knex('features').insert({
      name: 'University',
      description: 'Sistema de cursos, videos y certificados para capacitación',
      icon: 'graduation-cap',
      category: 'training',
      is_public: false,
      is_premium: true,
      available_in_plans: JSON.stringify(['premium', 'enterprise']),
    });
  }

  // 2. Crear tabla de certificados (tipos de certificados)
  await knex.schema.createTable('university_certificados', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('nombre', 200).notNullable().comment('Nombre del certificado');
    table.text('descripcion').nullable().comment('Descripción del certificado');
    table.string('imagen_template').nullable().comment('URL de la plantilla de imagen del certificado');
    table.jsonb('campos_personalizados').defaultTo('{}').comment('Campos personalizados del certificado');
    table.boolean('activo').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('tenant_id', 'idx_university_certificados_tenant');
  });

  // 3. Crear tabla de cursos
  await knex.schema.createTable('university_cursos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('titulo', 300).notNullable().comment('Título del curso');
    table.text('descripcion').nullable().comment('Descripción del curso');
    table.string('imagen_portada').nullable().comment('URL de la imagen de portada');
    table.string('nivel', 50).defaultTo('principiante').comment('Nivel: principiante, intermedio, avanzado');
    table.integer('duracion_estimada_minutos').defaultTo(0).comment('Duración estimada en minutos');
    table.enum('estado', ['borrador', 'publicado', 'archivado']).defaultTo('borrador');
    table.boolean('es_pago').defaultTo(false).comment('Si el curso completo requiere pago');
    table.decimal('precio', 10, 2).nullable().comment('Precio del curso si es de pago');
    table.string('moneda', 3).defaultTo('USD').comment('Código de moneda ISO');
    table.integer('orden').defaultTo(0).comment('Orden de visualización');
    table.jsonb('metadata').defaultTo('{}').comment('Metadatos adicionales');
    table.timestamp('fecha_publicacion').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('tenant_id', 'idx_university_cursos_tenant');
    table.index('estado', 'idx_university_cursos_estado');
    table.index(['tenant_id', 'estado'], 'idx_university_cursos_tenant_estado');
  });

  // 4. Relación cursos-certificados (un curso puede otorgar múltiples certificados)
  await knex.schema.createTable('university_cursos_certificados', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('curso_id').notNullable().references('id').inTable('university_cursos').onDelete('CASCADE');
    table.uuid('certificado_id').notNullable().references('id').inTable('university_certificados').onDelete('CASCADE');
    table.integer('porcentaje_requerido').defaultTo(100).comment('% de progreso requerido para obtener el certificado');
    table.boolean('requiere_examen').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['curso_id', 'certificado_id'], 'idx_university_cursos_certificados_unique');
  });

  // 5. Crear tabla de secciones
  await knex.schema.createTable('university_secciones', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('curso_id').notNullable().references('id').inTable('university_cursos').onDelete('CASCADE');
    table.string('titulo', 200).notNullable().comment('Título de la sección');
    table.text('descripcion').nullable().comment('Descripción de la sección');
    table.integer('orden').defaultTo(0).comment('Orden dentro del curso');
    table.boolean('es_pago_adicional').defaultTo(false).comment('Si esta sección requiere pago adicional');
    table.decimal('precio_seccion', 10, 2).nullable().comment('Precio de la sección si es pago adicional');
    table.boolean('activo').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('curso_id', 'idx_university_secciones_curso');
    table.index(['curso_id', 'orden'], 'idx_university_secciones_orden');
  });

  // 6. Crear tabla de videos
  await knex.schema.createTable('university_videos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('seccion_id').notNullable().references('id').inTable('university_secciones').onDelete('CASCADE');
    table.string('titulo', 300).notNullable().comment('Título del video');
    table.text('descripcion').nullable().comment('Descripción del video');
    table.string('url_video').notNullable().comment('URL del video (YouTube, Vimeo, etc.)');
    table.string('proveedor', 50).defaultTo('youtube').comment('Proveedor: youtube, vimeo, cloudflare, custom');
    table.string('video_id', 100).nullable().comment('ID del video en el proveedor');
    table.integer('duracion_segundos').defaultTo(0).comment('Duración del video en segundos');
    table.string('thumbnail').nullable().comment('URL de la miniatura');
    table.integer('orden').defaultTo(0).comment('Orden dentro de la sección');
    table.boolean('es_preview').defaultTo(false).comment('Si el video es preview gratuito');
    table.boolean('es_pago_adicional').defaultTo(false).comment('Si este video específico requiere pago adicional');
    table.decimal('precio_video', 10, 2).nullable().comment('Precio si es pago adicional');
    table.jsonb('recursos_adjuntos').defaultTo('[]').comment('Array de recursos descargables');
    table.boolean('activo').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('seccion_id', 'idx_university_videos_seccion');
    table.index(['seccion_id', 'orden'], 'idx_university_videos_orden');
  });

  // 7. Inscripciones de usuarios a cursos
  await knex.schema.createTable('university_inscripciones', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('curso_id').notNullable().references('id').inTable('university_cursos').onDelete('CASCADE');
    table.uuid('usuario_id').notNullable().comment('ID del usuario inscrito (puede ser usuario_tenant o externo)');
    table.string('email_usuario').notNullable().comment('Email del usuario');
    table.string('nombre_usuario').nullable();
    table.enum('estado', ['activa', 'completada', 'cancelada', 'expirada']).defaultTo('activa');
    table.integer('progreso_porcentaje').defaultTo(0);
    table.boolean('pago_completado').defaultTo(false);
    table.decimal('monto_pagado', 10, 2).nullable();
    table.timestamp('fecha_inscripcion').defaultTo(knex.fn.now());
    table.timestamp('fecha_completado').nullable();
    table.timestamp('fecha_expiracion').nullable();
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.unique(['curso_id', 'usuario_id'], 'idx_university_inscripciones_unique');
    table.index('tenant_id', 'idx_university_inscripciones_tenant');
    table.index('curso_id', 'idx_university_inscripciones_curso');
    table.index('usuario_id', 'idx_university_inscripciones_usuario');
    table.index('estado', 'idx_university_inscripciones_estado');
  });

  // 8. Progreso de usuarios en videos específicos
  await knex.schema.createTable('university_progreso', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('inscripcion_id').notNullable().references('id').inTable('university_inscripciones').onDelete('CASCADE');
    table.uuid('video_id').notNullable().references('id').inTable('university_videos').onDelete('CASCADE');
    table.integer('segundos_vistos').defaultTo(0).comment('Segundos del video vistos');
    table.integer('porcentaje_completado').defaultTo(0).comment('Porcentaje del video completado');
    table.boolean('completado').defaultTo(false);
    table.timestamp('ultimo_acceso').defaultTo(knex.fn.now());
    table.timestamp('fecha_completado').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.unique(['inscripcion_id', 'video_id'], 'idx_university_progreso_unique');
    table.index('inscripcion_id', 'idx_university_progreso_inscripcion');
    table.index('video_id', 'idx_university_progreso_video');
  });

  // 9. Certificados emitidos a usuarios
  await knex.schema.createTable('university_certificados_emitidos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('inscripcion_id').notNullable().references('id').inTable('university_inscripciones').onDelete('CASCADE');
    table.uuid('certificado_id').notNullable().references('id').inTable('university_certificados').onDelete('CASCADE');
    table.string('codigo_verificacion', 50).notNullable().unique().comment('Código único para verificar el certificado');
    table.string('nombre_estudiante').notNullable();
    table.string('url_certificado').nullable().comment('URL del PDF generado');
    table.timestamp('fecha_emision').defaultTo(knex.fn.now());
    table.jsonb('datos_certificado').defaultTo('{}').comment('Datos usados para generar el certificado');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('inscripcion_id', 'idx_university_cert_emitidos_inscripcion');
    table.index('certificado_id', 'idx_university_cert_emitidos_certificado');
    table.index('codigo_verificacion', 'idx_university_cert_emitidos_codigo');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('university_certificados_emitidos');
  await knex.schema.dropTableIfExists('university_progreso');
  await knex.schema.dropTableIfExists('university_inscripciones');
  await knex.schema.dropTableIfExists('university_videos');
  await knex.schema.dropTableIfExists('university_secciones');
  await knex.schema.dropTableIfExists('university_cursos_certificados');
  await knex.schema.dropTableIfExists('university_cursos');
  await knex.schema.dropTableIfExists('university_certificados');

  // Eliminar el feature
  await knex('features').where('name', 'University').del();
}
