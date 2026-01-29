import { Knex } from 'knex';

/**
 * Migración - Tabla de Precios de Features
 *
 * Define el precio de cada feature cuando se activa manualmente fuera del plan base.
 * Permite configurar precios diferentes por tipo de membresía.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('precios_features', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Referencias
    table.uuid('feature_id').notNullable().references('id').inTable('features').onDelete('CASCADE');
    table.uuid('tipo_membresia_id').nullable().references('id').inTable('tipos_membresia').onDelete('SET NULL')
      .comment('NULL = precio global para todos los tipos');

    // Precios
    table.decimal('precio_mensual', 10, 2).nullable().comment('Precio recurrente mensual');
    table.decimal('precio_unico', 10, 2).nullable().comment('Pago único de activación');
    table.string('moneda', 3).defaultTo('USD');

    // Control
    table.boolean('activo').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Restricción única
    table.unique(['feature_id', 'tipo_membresia_id'], { indexName: 'idx_precios_features_unique' });

    // Índices
    table.index('feature_id', 'idx_precios_features_feature');
    table.index('tipo_membresia_id', 'idx_precios_features_tipo');
  });

  console.log('✅ Tabla precios_features creada');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('precios_features');
}
