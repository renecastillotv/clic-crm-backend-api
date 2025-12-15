import { Knex } from 'knex';

/**
 * Migración 008 - Refactorizar sistema de roles
 *
 * Cambia el sistema de roles para soportar:
 * - Roles de plataforma (platform_owner, platform_admin)
 * - Roles protegidos por tenant (tenant_owner)
 * - Roles custom por tenant (asesor, content-creator, etc.)
 * - Un usuario puede tener MÚLTIPLES roles en un tenant
 */
export async function up(knex: Knex): Promise<void> {
  // 1. Modificar tabla roles para agregar campos necesarios
  await knex.schema.alterTable('roles', (table) => {
    table.uuid('tenant_id').nullable().references('id').inTable('tenants').onDelete('CASCADE')
      .comment('NULL = rol de plataforma, UUID = rol custom del tenant');
    table.boolean('es_protegido').defaultTo(false).comment('No se puede eliminar ni modificar permisos base');
    table.string('color', 20).nullable().comment('Color para mostrar en UI (hex)');
    table.string('icono', 50).nullable().comment('Icono del rol');

    table.index('tenant_id', 'idx_roles_tenant_id');
  });

  // 2. Crear tabla de permisos por rol y módulo
  await knex.schema.createTable('roles_modulos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('rol_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');
    table.string('modulo_id', 50).notNullable().references('id').inTable('modulos').onDelete('CASCADE');

    // Permisos granulares
    table.boolean('puede_ver').defaultTo(false).comment('Puede ver el módulo');
    table.boolean('puede_crear').defaultTo(false).comment('Puede crear registros');
    table.boolean('puede_editar').defaultTo(false).comment('Puede editar registros');
    table.boolean('puede_eliminar').defaultTo(false).comment('Puede eliminar registros');
    table.string('alcance_ver', 20).defaultTo('own').comment('all = todos, own = solo propios, team = equipo');
    table.string('alcance_editar', 20).defaultTo('own').comment('all = todos, own = solo propios, team = equipo');

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.unique(['rol_id', 'modulo_id'], { indexName: 'idx_roles_modulos_unique' });
  });

  // 3. Refactorizar usuarios_tenants para soportar múltiples roles
  // Primero eliminar la FK existente de rol_id
  await knex.schema.alterTable('usuarios_tenants', (table) => {
    table.dropColumn('rol_id');
  });

  // 4. Crear tabla de asignación de roles (muchos a muchos)
  await knex.schema.createTable('usuarios_roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('usuario_id').notNullable().references('id').inTable('usuarios').onDelete('CASCADE');
    table.uuid('tenant_id').nullable().references('id').inTable('tenants').onDelete('CASCADE')
      .comment('NULL = rol de plataforma');
    table.uuid('rol_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');
    table.uuid('asignado_por').nullable().references('id').inTable('usuarios').onDelete('SET NULL');
    table.timestamp('asignado_en').defaultTo(knex.fn.now());
    table.boolean('activo').defaultTo(true);
    table.jsonb('metadata').defaultTo('{}').comment('Datos adicionales de la asignación');

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Un usuario no puede tener el mismo rol duplicado en el mismo tenant
    table.unique(['usuario_id', 'tenant_id', 'rol_id'], { indexName: 'idx_usuarios_roles_unique' });
    table.index('usuario_id', 'idx_usuarios_roles_usuario');
    table.index('tenant_id', 'idx_usuarios_roles_tenant');
  });

  // 5. Actualizar roles existentes
  // Marcar roles de plataforma
  await knex('roles')
    .whereIn('codigo', ['super_admin', 'platform_admin'])
    .update({
      tenant_id: null,
      es_protegido: true,
    });

  // Marcar roles de tenant como protegidos
  await knex('roles')
    .whereIn('codigo', ['tenant_owner', 'tenant_admin', 'tenant_user'])
    .update({
      es_protegido: true,
    });

  // 6. Obtener IDs de roles para asignar permisos
  const roles = await knex('roles').select('id', 'codigo');
  const rolesMap = roles.reduce((acc: any, r: any) => {
    acc[r.codigo] = r.id;
    return acc;
  }, {});

  const modulos = await knex('modulos').select('id');
  const moduloIds = modulos.map((m: any) => m.id);

  // 7. Asignar permisos completos a platform_owner y platform_admin
  const platformRoles = ['super_admin', 'platform_admin'];
  for (const rolCodigo of platformRoles) {
    const rolId = rolesMap[rolCodigo];
    if (rolId) {
      const permisos = moduloIds.map((moduloId: string) => ({
        rol_id: rolId,
        modulo_id: moduloId,
        puede_ver: true,
        puede_crear: true,
        puede_editar: true,
        puede_eliminar: true,
        alcance_ver: 'all',
        alcance_editar: 'all',
      }));
      await knex('roles_modulos').insert(permisos);
    }
  }

  // 8. Asignar permisos a tenant_owner (todo en su tenant)
  const tenantOwnerPermisos = moduloIds.map((moduloId: string) => ({
    rol_id: rolesMap['tenant_owner'],
    modulo_id: moduloId,
    puede_ver: true,
    puede_crear: true,
    puede_editar: true,
    puede_eliminar: true,
    alcance_ver: 'all',
    alcance_editar: 'all',
  }));
  await knex('roles_modulos').insert(tenantOwnerPermisos);

  // 9. Asignar permisos a tenant_admin (casi todo excepto facturación)
  const tenantAdminPermisos = moduloIds
    .filter((id: string) => id !== 'facturacion')
    .map((moduloId: string) => ({
      rol_id: rolesMap['tenant_admin'],
      modulo_id: moduloId,
      puede_ver: true,
      puede_crear: true,
      puede_editar: true,
      puede_eliminar: moduloId !== 'configuracion',
      alcance_ver: 'all',
      alcance_editar: 'all',
    }));
  await knex('roles_modulos').insert(tenantAdminPermisos);

  // 10. Asignar permisos a tenant_user (básicos, solo propios)
  const tenantUserModulos = ['dashboard', 'propiedades', 'clientes', 'agenda'];
  const tenantUserPermisos = tenantUserModulos.map((moduloId: string) => ({
    rol_id: rolesMap['tenant_user'],
    modulo_id: moduloId,
    puede_ver: moduloId === 'propiedades' ? true : true,
    puede_crear: true,
    puede_editar: true,
    puede_eliminar: false,
    alcance_ver: moduloId === 'propiedades' ? 'all' : 'own',
    alcance_editar: 'own',
  }));
  await knex('roles_modulos').insert(tenantUserPermisos);
}

export async function down(knex: Knex): Promise<void> {
  // Revertir en orden inverso
  await knex.schema.dropTableIfExists('usuarios_roles');
  await knex.schema.dropTableIfExists('roles_modulos');

  // Restaurar rol_id en usuarios_tenants
  await knex.schema.alterTable('usuarios_tenants', (table) => {
    table.uuid('rol_id').nullable().references('id').inTable('roles').onDelete('SET NULL');
  });

  // Eliminar columnas agregadas a roles
  await knex.schema.alterTable('roles', (table) => {
    table.dropIndex('tenant_id', 'idx_roles_tenant_id');
    table.dropColumn('tenant_id');
    table.dropColumn('es_protegido');
    table.dropColumn('color');
    table.dropColumn('icono');
  });
}
