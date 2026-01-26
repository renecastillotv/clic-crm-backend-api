import { Knex } from 'knex';

/**
 * Migración 131 - Simplificación RBAC
 *
 * Elimina la indirección template → propagación → roles_modulos.
 * Convierte templates en "roles globales" (tenant_id=NULL).
 * roles_modulos pasa a ser la ÚNICA fuente de verdad.
 *
 * Cambios:
 * - Agrega parent_id a roles (reemplaza template_id)
 * - Convierte cada template en un rol global
 * - Copia permisos de roles_templates_modulos a roles_modulos para los nuevos roles globales
 * - Elimina roles_templates y roles_templates_modulos
 * - Elimina tablas legacy: permisos, roles_permisos
 * - Elimina columnas template_id y hereda_nuevos_modulos de roles
 */
export async function up(knex: Knex): Promise<void> {
  // 1. Agregar parent_id a roles (si no existe)
  const hasParentId = await knex.schema.hasColumn('roles', 'parent_id');
  if (!hasParentId) {
    await knex.schema.alterTable('roles', (table) => {
      table.uuid('parent_id').nullable().comment('Rol padre del cual hereda (NULL = rol raíz/global)');
      table.foreign('parent_id').references('id').inTable('roles').onDelete('SET NULL');
      table.index('parent_id', 'idx_roles_parent_id');
    });
  }

  // 2. Convertir cada template en un rol global (si la tabla existe)
  const hasRolesTemplates = await knex.schema.hasTable('roles_templates');
  if (hasRolesTemplates) {
    const templates = await knex('roles_templates').select('*');

    for (const template of templates) {
      // Check if global role already exists
      const existingRole = await knex('roles')
        .where('codigo', `global_${template.codigo}`)
        .first();

      if (!existingRole) {
        // Crear rol global equivalente
        const [newRole] = await knex('roles').insert({
          nombre: template.nombre,
          codigo: `global_${template.codigo}`,
          descripcion: template.descripcion,
          tipo: 'global',
          tenant_id: null,
          es_protegido: true,
          color: template.color,
          icono: template.icono,
          activo: template.es_activo,
        }).returning('id');

        const newRoleId = newRole.id;

        // 3. Copiar permisos del template a roles_modulos del nuevo rol global
        const hasRolesTemplatesModulos = await knex.schema.hasTable('roles_templates_modulos');
        if (hasRolesTemplatesModulos) {
          const templateModulos = await knex('roles_templates_modulos')
            .where('template_id', template.id);

          for (const tm of templateModulos) {
            const existingMod = await knex('roles_modulos')
              .where('rol_id', newRoleId)
              .where('modulo_id', tm.modulo_id)
              .first();

            if (!existingMod) {
              await knex('roles_modulos').insert({
                rol_id: newRoleId,
                modulo_id: tm.modulo_id,
                puede_ver: tm.puede_ver,
                puede_crear: tm.puede_crear,
                puede_editar: tm.puede_editar,
                puede_eliminar: tm.puede_eliminar,
                alcance_ver: tm.alcance_ver,
                alcance_editar: tm.alcance_editar,
                permisos_campos: tm.permisos_campos || '{}',
              });
            }
          }
        }

        // 4. Actualizar roles que tenían este template_id → poner parent_id al nuevo rol global
        const hasTemplateId = await knex.schema.hasColumn('roles', 'template_id');
        if (hasTemplateId) {
          await knex('roles')
            .where('template_id', template.id)
            .update({ parent_id: newRoleId });
        }
      }
    }
  }

  // 5. Eliminar columnas template_id y hereda_nuevos_modulos de roles
  const hasTemplateId = await knex.schema.hasColumn('roles', 'template_id');
  if (hasTemplateId) {
    await knex.schema.alterTable('roles', (table) => {
      table.dropIndex('template_id', 'idx_roles_template_id');
      table.dropForeign('template_id');
      table.dropColumn('template_id');
    });
  }

  const hasHeredaNuevos = await knex.schema.hasColumn('roles', 'hereda_nuevos_modulos');
  if (hasHeredaNuevos) {
    await knex.schema.alterTable('roles', (table) => {
      table.dropColumn('hereda_nuevos_modulos');
    });
  }

  // 6. Eliminar tablas de templates
  await knex.schema.dropTableIfExists('roles_templates_modulos');
  await knex.schema.dropTableIfExists('roles_templates');

  // 7. Eliminar tablas legacy no usadas
  await knex.schema.dropTableIfExists('roles_permisos');
  await knex.schema.dropTableIfExists('permisos');
}

export async function down(knex: Knex): Promise<void> {
  // Recrear tablas legacy
  await knex.schema.createTable('permisos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('nombre', 100).notNullable();
    table.string('codigo', 100).unique().notNullable();
    table.text('descripcion').nullable();
    table.string('modulo', 50).nullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable('roles_permisos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('rol_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');
    table.uuid('permiso_id').notNullable().references('id').inTable('permisos').onDelete('CASCADE');
    table.unique(['rol_id', 'permiso_id']);
    table.timestamps(true, true);
  });

  // Recrear tablas de templates
  await knex.schema.createTable('roles_templates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('codigo', 50).unique().notNullable();
    table.string('nombre', 100).notNullable();
    table.text('descripcion').nullable();
    table.string('categoria', 50).defaultTo('operacional');
    table.string('icono', 50).nullable();
    table.string('color', 20).nullable();
    table.boolean('es_activo').defaultTo(true);
    table.boolean('visible_para_tenants').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('roles_templates_modulos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('template_id').notNullable().references('id').inTable('roles_templates').onDelete('CASCADE');
    table.string('modulo_id', 50).notNullable().references('id').inTable('modulos').onDelete('CASCADE');
    table.boolean('puede_ver').defaultTo(false);
    table.boolean('puede_crear').defaultTo(false);
    table.boolean('puede_editar').defaultTo(false);
    table.boolean('puede_eliminar').defaultTo(false);
    table.string('alcance_ver', 20).defaultTo('own');
    table.string('alcance_editar', 20).defaultTo('own');
    table.jsonb('permisos_campos').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['template_id', 'modulo_id']);
  });

  // Restaurar columnas en roles
  await knex.schema.alterTable('roles', (table) => {
    table.uuid('template_id').nullable();
    table.boolean('hereda_nuevos_modulos').defaultTo(true);
    table.foreign('template_id').references('id').inTable('roles_templates').onDelete('SET NULL');
    table.index('template_id', 'idx_roles_template_id');
  });

  // Eliminar parent_id
  const hasParentId = await knex.schema.hasColumn('roles', 'parent_id');
  if (hasParentId) {
    await knex.schema.alterTable('roles', (table) => {
      table.dropIndex('parent_id', 'idx_roles_parent_id');
      table.dropForeign('parent_id');
      table.dropColumn('parent_id');
    });
  }
}
