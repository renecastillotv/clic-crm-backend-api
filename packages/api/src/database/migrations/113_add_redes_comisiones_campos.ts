import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Agregar campos para Red Afiliados y Connect en propiedades
  await knex.schema.alterTable('propiedades', (table) => {
    // Red Afiliados
    table.text('red_afiliados_terminos').nullable();
    table.decimal('red_afiliados_comision', 10, 2).nullable();
    // CLIC Connect
    table.text('connect_terminos').nullable();
    table.decimal('connect_comision', 10, 2).nullable();
  });

  // Agregar campos de defaults en tenants
  await knex.schema.alterTable('tenants', (table) => {
    // Porcentajes por defecto
    table.decimal('red_global_porcentaje_default', 10, 2).nullable().defaultTo(50);
    table.text('red_afiliados_terminos_default').nullable();
    table.decimal('red_afiliados_porcentaje_default', 10, 2).nullable().defaultTo(50);
    table.decimal('connect_porcentaje_default', 10, 2).nullable().defaultTo(50);
  });

  console.log('✅ Campos de comisiones por red agregados a propiedades y tenants');
}

export async function down(knex: Knex): Promise<void> {
  // Remover campos de propiedades
  await knex.schema.alterTable('propiedades', (table) => {
    table.dropColumn('red_afiliados_terminos');
    table.dropColumn('red_afiliados_comision');
    table.dropColumn('connect_terminos');
    table.dropColumn('connect_comision');
  });

  // Remover campos de tenants
  await knex.schema.alterTable('tenants', (table) => {
    table.dropColumn('red_global_porcentaje_default');
    table.dropColumn('red_afiliados_terminos_default');
    table.dropColumn('red_afiliados_porcentaje_default');
    table.dropColumn('connect_porcentaje_default');
  });
}
