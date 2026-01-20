import { Knex } from 'knex';

/**
 * Migración 069 - Agregar rol Connect
 * 
 * Agrega el rol "connect" para usuarios CLIC Connect
 */
export async function up(knex: Knex): Promise<void> {
  // Verificar si el rol ya existe
  const existingRole = await knex('roles')
    .where({ codigo: 'connect' })
    .first();

  if (!existingRole) {
    await knex('roles').insert({
      nombre: 'CLIC Connect',
      codigo: 'connect',
      tipo: 'tenant',
      descripcion: 'Usuario de la red CLIC Connect con acceso al CRM e inventario pero sin afectar estadísticas del tenant',
      activo: true,
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex('roles').where({ codigo: 'connect' }).del();
}













