import { Knex } from 'knex';

/**
 * Migración inicial - Estructura multi-tenant
 * 
 * Crea las tablas base para:
 * - Tenants (organizaciones/clientes)
 * - Usuarios (con soporte multi-tenant)
 * - Roles y permisos
 * - Configuraciones de idioma y país
 */
export async function up(knex: Knex): Promise<void> {
  // Tabla de países
  await knex.schema.createTable('paises', (table) => {
    table.string('codigo', 2).primary().comment('Código ISO del país (ej: MX, US, FR)');
    table.string('nombre', 100).notNullable().comment('Nombre del país');
    table.string('nombre_en', 100).nullable().comment('Nombre en inglés');
    table.string('moneda', 3).nullable().comment('Código de moneda ISO');
    table.string('zona_horaria', 50).nullable().comment('Zona horaria');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Tabla de idiomas
  await knex.schema.createTable('idiomas', (table) => {
    table.string('codigo', 5).primary().comment('Código ISO del idioma (ej: es, en, fr)');
    table.string('nombre', 50).notNullable().comment('Nombre del idioma');
    table.string('nombre_nativo', 50).nullable().comment('Nombre en su idioma nativo');
    table.integer('prioridad').defaultTo(0).comment('Prioridad (mayor = más importante)');
    table.boolean('activo').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Tabla de tenants (organizaciones)
  await knex.schema.createTable('tenants', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('nombre').notNullable().comment('Nombre de la organización');
    table.string('slug').notNullable().unique().comment('Slug único para URLs');
    table.string('codigo_pais', 2).references('codigo').inTable('paises').onDelete('SET NULL');
    table.string('idioma_default', 5).defaultTo('es').references('codigo').inTable('idiomas');
    table.jsonb('idiomas_disponibles').defaultTo('["es", "en", "fr"]').comment('Array de códigos de idiomas disponibles');
    table.jsonb('configuracion').defaultTo('{}').comment('Configuración personalizada del tenant');
    table.boolean('activo').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index('slug', 'idx_tenants_slug');
    table.index('codigo_pais', 'idx_tenants_pais');
  });

  // Tabla de roles
  await knex.schema.createTable('roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('nombre').notNullable().comment('Nombre del rol');
    table.string('codigo').notNullable().unique().comment('Código único del rol');
    table.text('descripcion').nullable();
    table.string('tipo').notNullable().comment('platform o tenant');
    table.boolean('activo').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index('codigo', 'idx_roles_codigo');
    table.index('tipo', 'idx_roles_tipo');
  });

  // Tabla de permisos
  await knex.schema.createTable('permisos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('nombre').notNullable().comment('Nombre del permiso');
    table.string('codigo').notNullable().unique().comment('Código único del permiso');
    table.text('descripcion').nullable();
    table.string('recurso').notNullable().comment('Recurso al que aplica (ej: usuarios, propiedades)');
    table.string('accion').notNullable().comment('Acción permitida (ej: crear, leer, actualizar, eliminar)');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index('codigo', 'idx_permisos_codigo');
    table.index('recurso', 'idx_permisos_recurso');
  });

  // Tabla de relación roles-permisos
  await knex.schema.createTable('roles_permisos', (table) => {
    table.uuid('rol_id').references('id').inTable('roles').onDelete('CASCADE');
    table.uuid('permiso_id').references('id').inTable('permisos').onDelete('CASCADE');
    table.primary(['rol_id', 'permiso_id']);
  });

  // Tabla de usuarios
  await knex.schema.createTable('usuarios', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email').notNullable().unique().comment('Email único del usuario');
    table.string('password_hash').nullable().comment('Hash de contraseña (null si usa OAuth)');
    table.string('nombre').nullable();
    table.string('apellido').nullable();
    table.string('idioma_preferido', 5).defaultTo('es').references('codigo').inTable('idiomas');
    table.string('codigo_pais', 2).references('codigo').inTable('paises').onDelete('SET NULL');
    table.boolean('es_platform_admin').defaultTo(false).comment('Es administrador de la plataforma');
    table.boolean('activo').defaultTo(true);
    table.timestamp('ultimo_acceso').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index('email', 'idx_usuarios_email');
    table.index('es_platform_admin', 'idx_usuarios_platform_admin');
  });

  // Tabla de relación usuarios-tenants (muchos a muchos)
  await knex.schema.createTable('usuarios_tenants', (table) => {
    table.uuid('usuario_id').references('id').inTable('usuarios').onDelete('CASCADE');
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('rol_id').references('id').inTable('roles').onDelete('SET NULL');
    table.boolean('es_owner').defaultTo(false).comment('Es dueño del tenant');
    table.boolean('activo').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.primary(['usuario_id', 'tenant_id']);
    
    table.index('tenant_id', 'idx_usuarios_tenants_tenant');
    table.index('usuario_id', 'idx_usuarios_tenants_usuario');
  });

  // Insertar idiomas por defecto
  await knex('idiomas').insert([
    { codigo: 'es', nombre: 'Español', nombre_nativo: 'Español', prioridad: 1, activo: true },
    { codigo: 'en', nombre: 'English', nombre_nativo: 'English', prioridad: 2, activo: true },
    { codigo: 'fr', nombre: 'Français', nombre_nativo: 'Français', prioridad: 3, activo: true },
  ]);

  // Insertar roles por defecto
  await knex('roles').insert([
    { nombre: 'Super Admin', codigo: 'super_admin', tipo: 'platform', descripcion: 'Administrador completo de la plataforma', activo: true },
    { nombre: 'Admin Plataforma', codigo: 'platform_admin', tipo: 'platform', descripcion: 'Administrador de la plataforma', activo: true },
    { nombre: 'Dueño Tenant', codigo: 'tenant_owner', tipo: 'tenant', descripcion: 'Dueño de un tenant', activo: true },
    { nombre: 'Admin Tenant', codigo: 'tenant_admin', tipo: 'tenant', descripcion: 'Administrador de un tenant', activo: true },
    { nombre: 'Usuario Tenant', codigo: 'tenant_user', tipo: 'tenant', descripcion: 'Usuario regular de un tenant', activo: true },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('usuarios_tenants');
  await knex.schema.dropTableIfExists('usuarios');
  await knex.schema.dropTableIfExists('roles_permisos');
  await knex.schema.dropTableIfExists('permisos');
  await knex.schema.dropTableIfExists('roles');
  await knex.schema.dropTableIfExists('tenants');
  await knex.schema.dropTableIfExists('idiomas');
  await knex.schema.dropTableIfExists('paises');
}



