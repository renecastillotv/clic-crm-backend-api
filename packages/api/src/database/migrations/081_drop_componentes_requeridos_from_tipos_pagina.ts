import { Knex } from 'knex';

/**
 * Migración: Eliminar campo componentes_requeridos de tipos_pagina
 *
 * El campo componentes_requeridos ya no se usa.
 * La configuración de componentes se maneja directamente
 * en la tabla componentes_web.
 */
export async function up(knex: Knex): Promise<void> {
  console.log('🗑️  Eliminando campo componentes_requeridos de tipos_pagina...');

  await knex.schema.alterTable('tipos_pagina', (table) => {
    table.dropColumn('componentes_requeridos');
  });

  console.log('✅ Campo componentes_requeridos eliminado');
}

export async function down(knex: Knex): Promise<void> {
  console.log('⏪ Restaurando campo componentes_requeridos...');

  await knex.schema.alterTable('tipos_pagina', (table) => {
    table.jsonb('componentes_requeridos').nullable();
  });

  console.log('✅ Campo componentes_requeridos restaurado');
}
