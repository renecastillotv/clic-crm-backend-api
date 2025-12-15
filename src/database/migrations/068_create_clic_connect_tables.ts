import { Knex } from 'knex';

/**
 * Migración 068 - Crear tablas para CLIC Connect
 * 
 * CLIC Connect permite a una inmobiliaria mantener una red de usuarios externos
 * con acceso al CRM e inventario, pero sin afectar la data, marca ni estadísticas del tenant.
 */

export async function up(knex: Knex): Promise<void> {
  // Tabla de usuarios Connect (usuarios externos de la red)
  await knex.schema.createTable('usuarios_connect', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('email').notNullable();
    table.string('nombre').notNullable();
    table.string('apellido').nullable();
    table.string('telefono').nullable();
    table.string('clerk_user_id').nullable().comment('ID del usuario en Clerk si tiene cuenta');
    table.boolean('activo').defaultTo(true);
    table.timestamp('fecha_registro').defaultTo(knex.fn.now());
    table.timestamp('ultimo_acceso').nullable();
    table.jsonb('configuracion').defaultTo('{}').comment('Configuración específica del usuario Connect');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.unique(['tenant_id', 'email'], 'idx_usuarios_connect_tenant_email');
    table.index('tenant_id', 'idx_usuarios_connect_tenant');
    table.index('clerk_user_id', 'idx_usuarios_connect_clerk');
    table.index('activo', 'idx_usuarios_connect_activo');
  });

  // Tabla de contactos Connect (contactos gestionados por usuarios Connect, separados del tenant)
  await knex.schema.createTable('contactos_connect', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('usuario_connect_id').notNullable().references('id').inTable('usuarios_connect').onDelete('CASCADE');
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('nombre').notNullable();
    table.string('apellido').nullable();
    table.string('email').nullable();
    table.string('telefono').nullable();
    table.text('notas').nullable();
    table.jsonb('datos_adicionales').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index('usuario_connect_id', 'idx_contactos_connect_usuario');
    table.index('tenant_id', 'idx_contactos_connect_tenant');
  });

  // Tabla de interacciones Connect (para tracking sin afectar estadísticas del tenant)
  await knex.schema.createTable('interacciones_connect', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('usuario_connect_id').notNullable().references('id').inTable('usuarios_connect').onDelete('CASCADE');
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('tipo').notNullable().comment('tipo: contacto_creado, propiedad_vista, propuesta_enviada, etc.');
    table.string('entidad_tipo').nullable().comment('contacto, propiedad, propuesta, etc.');
    table.uuid('entidad_id').nullable().comment('ID de la entidad relacionada');
    table.jsonb('datos').defaultTo('{}').comment('Datos adicionales de la interacción');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index('usuario_connect_id', 'idx_interacciones_connect_usuario');
    table.index('tenant_id', 'idx_interacciones_connect_tenant');
    table.index('tipo', 'idx_interacciones_connect_tipo');
    table.index('created_at', 'idx_interacciones_connect_fecha');
  });

  // Tabla de acceso a propiedades Connect (tracking de qué propiedades ha visto/compartido cada usuario Connect)
  await knex.schema.createTable('propiedades_connect_acceso', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('usuario_connect_id').notNullable().references('id').inTable('usuarios_connect').onDelete('CASCADE');
    table.uuid('propiedad_id').notNullable().references('id').inTable('propiedades').onDelete('CASCADE');
    table.string('tipo_acceso').notNullable().defaultTo('vista').comment('vista, compartida, favorita, etc.');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.unique(['usuario_connect_id', 'propiedad_id', 'tipo_acceso'], 'idx_propiedades_connect_acceso_unique');
    table.index('usuario_connect_id', 'idx_propiedades_connect_acceso_usuario');
    table.index('propiedad_id', 'idx_propiedades_connect_acceso_propiedad');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('propiedades_connect_acceso');
  await knex.schema.dropTableIfExists('interacciones_connect');
  await knex.schema.dropTableIfExists('contactos_connect');
  await knex.schema.dropTableIfExists('usuarios_connect');
}












