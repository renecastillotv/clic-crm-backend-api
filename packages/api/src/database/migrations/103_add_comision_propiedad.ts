import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasComision = await knex.schema.hasColumn('propiedades', 'comision');
  const hasComisionNota = await knex.schema.hasColumn('propiedades', 'comision_nota');

  if (!hasComision || !hasComisionNota) {
    await knex.schema.alterTable('propiedades', (table) => {
      if (!hasComision) {
        table.decimal('comision', 5, 2).nullable(); // Ej: 3.50, 4.00, etc.
      }
      if (!hasComisionNota) {
        table.text('comision_nota').nullable();
      }
    });
  }

  console.log('✅ Added comision and comision_nota to propiedades');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('propiedades', (table) => {
    table.dropColumn('comision');
    table.dropColumn('comision_nota');
  });
}
