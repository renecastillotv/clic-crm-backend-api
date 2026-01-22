import { Knex } from 'knex';

/**
 * Migración 130 - Sistema RBAC con Templates
 *
 * Implementa:
 * - Nuevas columnas en `modulos` para jerarquía de sub-módulos
 * - Tabla `roles_templates` para definir tipos de rol gestionados por platform admin
 * - Tabla `roles_templates_modulos` para permisos por defecto del template (techo máximo)
 * - Referencia template_id en `roles` para herencia
 * - Campo JSONB permisos_campos en `roles_modulos` para permisos a nivel de campo
 * - Tabla `permisos_version` para invalidación de caché
 */
export async function up(knex: Knex): Promise<void> {
  // 1. Agregar columnas a tabla modulos para sub-módulos y metadata
  await knex.schema.alterTable('modulos', (table) => {
    table.boolean('es_submenu').defaultTo(false).comment('Es un sub-módulo dentro de otro');
    table.string('modulo_padre_id', 50).nullable().comment('ID del módulo padre si es submenu');
    table.text('ruta').nullable().comment('Ruta del frontend (ej: /crm/:tenantSlug/contactos)');
    table.string('requiere_feature', 100).nullable().comment('Feature flag requerido para acceder');

    table.foreign('modulo_padre_id').references('id').inTable('modulos').onDelete('SET NULL');
    table.index('modulo_padre_id', 'idx_modulos_padre');
  });

  // 2. Crear tabla roles_templates
  await knex.schema.createTable('roles_templates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('codigo', 50).unique().notNullable().comment('Código único del template');
    table.string('nombre', 100).notNullable().comment('Nombre para mostrar');
    table.text('descripcion').nullable();
    table.string('categoria', 50).defaultTo('operacional').comment('operacional, gerencial, tecnico');
    table.string('icono', 50).nullable();
    table.string('color', 20).nullable();
    table.boolean('es_activo').defaultTo(true);
    table.boolean('visible_para_tenants').defaultTo(true).comment('Mostrar en UI de creación de roles del tenant');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('codigo', 'idx_roles_templates_codigo');
    table.index('es_activo', 'idx_roles_templates_activo');
  });

  // 3. Crear tabla roles_templates_modulos
  await knex.schema.createTable('roles_templates_modulos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('template_id').notNullable().references('id').inTable('roles_templates').onDelete('CASCADE');
    table.string('modulo_id', 50).notNullable().references('id').inTable('modulos').onDelete('CASCADE');

    table.boolean('puede_ver').defaultTo(false);
    table.boolean('puede_crear').defaultTo(false);
    table.boolean('puede_editar').defaultTo(false);
    table.boolean('puede_eliminar').defaultTo(false);
    table.string('alcance_ver', 20).defaultTo('own').comment('all, team, own');
    table.string('alcance_editar', 20).defaultTo('own').comment('all, team, own');
    table.jsonb('permisos_campos').defaultTo('{}').comment('Permisos por defecto a nivel de campo');

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.unique(['template_id', 'modulo_id'], { indexName: 'idx_roles_templates_modulos_unique' });
    table.index('template_id', 'idx_roles_templates_modulos_template');
    table.index('modulo_id', 'idx_roles_templates_modulos_modulo');
  });

  // 4. Agregar template_id y hereda_nuevos_modulos a tabla roles
  await knex.schema.alterTable('roles', (table) => {
    table.uuid('template_id').nullable().comment('Template del cual hereda (NULL = rol de plataforma)');
    table.boolean('hereda_nuevos_modulos').defaultTo(true).comment('Auto-hereda nuevos módulos del template');

    table.foreign('template_id').references('id').inTable('roles_templates').onDelete('SET NULL');
    table.index('template_id', 'idx_roles_template_id');
  });

  // 5. Agregar permisos_campos JSONB a roles_modulos
  await knex.schema.alterTable('roles_modulos', (table) => {
    table.jsonb('permisos_campos').defaultTo('{}').comment('Permisos granulares por campo: {hide:[], readonly:[], hideTabs:[], hideActions:[]}');
  });

  // 6. Crear tabla permisos_version para invalidación de caché
  await knex.schema.createTable('permisos_version', (table) => {
    table.uuid('tenant_id').primary().references('id').inTable('tenants').onDelete('CASCADE');
    table.integer('version').defaultTo(1);
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 7. Inicializar permisos_version para todos los tenants existentes
  const tenants = await knex('tenants').select('id');
  if (tenants.length > 0) {
    await knex('permisos_version').insert(
      tenants.map((t: any) => ({ tenant_id: t.id, version: 1 }))
    );
  }
}

export async function down(knex: Knex): Promise<void> {
  // Revertir en orden inverso
  await knex.schema.dropTableIfExists('permisos_version');

  await knex.schema.alterTable('roles_modulos', (table) => {
    table.dropColumn('permisos_campos');
  });

  await knex.schema.alterTable('roles', (table) => {
    table.dropIndex('template_id', 'idx_roles_template_id');
    table.dropForeign('template_id');
    table.dropColumn('template_id');
    table.dropColumn('hereda_nuevos_modulos');
  });

  await knex.schema.dropTableIfExists('roles_templates_modulos');
  await knex.schema.dropTableIfExists('roles_templates');

  await knex.schema.alterTable('modulos', (table) => {
    table.dropIndex('modulo_padre_id', 'idx_modulos_padre');
    table.dropForeign('modulo_padre_id');
    table.dropColumn('requiere_feature');
    table.dropColumn('ruta');
    table.dropColumn('modulo_padre_id');
    table.dropColumn('es_submenu');
  });
}
