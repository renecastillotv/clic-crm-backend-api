import { Knex } from 'knex';

/**
 * Migración: Sistema de acceso por rol para cursos University
 *
 * Crea la tabla para controlar qué roles pueden acceder a cada curso
 * y hasta qué sección tienen acceso.
 *
 * También crea el módulo "mi-entrenamiento" para el menú del CRM.
 */
export async function up(knex: Knex): Promise<void> {
  // 1. Crear tabla de acceso por rol
  await knex.schema.createTable('university_cursos_acceso_roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('curso_id').notNullable().references('id').inTable('university_cursos').onDelete('CASCADE');
    table.uuid('rol_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');
    table.uuid('seccion_limite_id').nullable().references('id').inTable('university_secciones').onDelete('SET NULL')
      .comment('NULL = acceso completo, UUID = acceso hasta esa sección (inclusive por orden)');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['curso_id', 'rol_id'], 'idx_university_cursos_acceso_roles_unique');
    table.index('curso_id', 'idx_university_cursos_acceso_roles_curso');
    table.index('rol_id', 'idx_university_cursos_acceso_roles_rol');
  });

  // 2. Verificar si existe el módulo mi-entrenamiento
  const existingModule = await knex('modulos').where('id', 'mi-entrenamiento').first();
  if (!existingModule) {
    await knex('modulos').insert({
      id: 'mi-entrenamiento',
      nombre: 'Mi Entrenamiento',
      descripcion: 'Cursos de capacitación para usuarios',
      icono: 'graduation-cap',
      categoria: 'features',
      orden: 50,
      activo: true,
    });
  }

  // 3. Asignar permisos del módulo a roles base (todos pueden ver su propio entrenamiento)
  const roles = await knex('roles')
    .whereIn('codigo', ['tenant_owner', 'tenant_admin', 'tenant_user', 'connect'])
    .select('id');

  for (const rol of roles) {
    const existingPermiso = await knex('roles_modulos')
      .where({ rol_id: rol.id, modulo_id: 'mi-entrenamiento' })
      .first();

    if (!existingPermiso) {
      await knex('roles_modulos').insert({
        rol_id: rol.id,
        modulo_id: 'mi-entrenamiento',
        puede_ver: true,
        puede_crear: false,
        puede_editar: false,
        puede_eliminar: false,
        alcance_ver: 'own',
        alcance_editar: 'own',
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  // Eliminar permisos del módulo
  await knex('roles_modulos').where('modulo_id', 'mi-entrenamiento').del();

  // Eliminar módulo
  await knex('modulos').where('id', 'mi-entrenamiento').del();

  // Eliminar tabla
  await knex.schema.dropTableIfExists('university_cursos_acceso_roles');
}
