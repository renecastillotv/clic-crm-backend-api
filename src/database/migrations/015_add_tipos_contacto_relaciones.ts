import { Knex } from 'knex';

/**
 * Migración - Agregar tipos_contacto y tabla de relaciones entre contactos
 *
 * - tipos_contacto: Array de extensiones (lead, cliente, asesor, etc.)
 * - contactos_relaciones: Tabla para relacionar contactos entre sí
 */
export async function up(knex: Knex): Promise<void> {
  // Agregar columna tipos_contacto a la tabla contactos
  await knex.schema.alterTable('contactos', (table) => {
    table.jsonb('tipos_contacto').defaultTo('[]').comment('Array de tipos/extensiones del contacto');
  });

  // Crear tabla de relaciones entre contactos
  await knex.schema.createTable('contactos_relaciones', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');

    // Contacto origen y destino
    table.uuid('contacto_origen_id').notNullable().references('id').inTable('contactos').onDelete('CASCADE');
    table.uuid('contacto_destino_id').notNullable().references('id').inTable('contactos').onDelete('CASCADE');

    // Tipo de relación
    table.string('tipo_relacion', 50).notNullable()
      .comment('Tipo: socio, referidor, familiar, colega, cliente_de, proveedor, otro');

    // Notas sobre la relación
    table.text('notas').nullable();

    // Auditoría
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Índices
    table.index('tenant_id', 'idx_contactos_rel_tenant');
    table.index('contacto_origen_id', 'idx_contactos_rel_origen');
    table.index('contacto_destino_id', 'idx_contactos_rel_destino');

    // Restricción única para evitar duplicados
    table.unique(['contacto_origen_id', 'contacto_destino_id', 'tipo_relacion'], {
      indexName: 'idx_contactos_rel_unique',
    });
  });

  // Migrar datos existentes: copiar 'tipo' a 'tipos_contacto' como array
  await knex.raw(`
    UPDATE contactos
    SET tipos_contacto = jsonb_build_array(tipo)
    WHERE tipo IS NOT NULL AND tipo != ''
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('contactos_relaciones');
  await knex.schema.alterTable('contactos', (table) => {
    table.dropColumn('tipos_contacto');
  });
}
