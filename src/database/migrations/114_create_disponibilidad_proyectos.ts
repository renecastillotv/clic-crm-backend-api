import { Knex } from 'knex';

/**
 * Migración 114: Sistema de Disponibilidad para Proyectos
 *
 * Agrega:
 * 1. Campo disponibilidad_config en propiedades (para enlace/archivo)
 * 2. Tabla unidades_proyecto (para inventario de unidades)
 */
export async function up(knex: Knex): Promise<void> {
  // 1. Agregar campo de configuración de disponibilidad a propiedades
  const hasDisponibilidadConfig = await knex.schema.hasColumn('propiedades', 'disponibilidad_config');
  if (!hasDisponibilidadConfig) {
    await knex.schema.alterTable('propiedades', (table) => {
      table.jsonb('disponibilidad_config').nullable();
      table.comment('Configuración de disponibilidad: { tipo: "enlace"|"archivo"|"inventario", enlace_url?, archivo_url?, archivo_nombre? }');
    });
    console.log('✓ Campo disponibilidad_config agregado a propiedades');
  }

  // 2. Crear tabla de unidades de proyecto
  const hasUnidadesTable = await knex.schema.hasTable('unidades_proyecto');
  if (!hasUnidadesTable) {
    await knex.schema.createTable('unidades_proyecto', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('propiedad_id').notNullable().references('id').inTable('propiedades').onDelete('CASCADE');
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');

      // Identificación
      table.string('codigo', 50).notNullable(); // "A-101", "B-205", "Torre1-PH"
      table.string('tipologia_id', 100).nullable(); // ID de tipología existente (opcional)
      table.string('tipologia_nombre', 255).nullable(); // Nombre descriptivo

      // Características (pueden heredar de tipología o ser únicas)
      table.integer('habitaciones').nullable();
      table.integer('banos').nullable();
      table.decimal('m2', 10, 2).nullable();
      table.decimal('precio', 15, 2).nullable();
      table.string('moneda', 10).defaultTo('USD');

      // Ubicación dentro del proyecto
      table.string('torre', 100).nullable();
      table.string('piso', 50).nullable();
      table.string('nivel', 50).nullable();

      // Estado
      table.string('estado', 50).defaultTo('disponible'); // disponible, reservada, bloqueada, vendida

      // Tracking de cambios de estado
      table.timestamp('fecha_reserva').nullable();
      table.timestamp('fecha_venta').nullable();
      table.uuid('reservado_por').nullable(); // Contacto que reservó
      table.uuid('vendido_a').nullable(); // Contacto que compró

      // Notas y metadatos
      table.text('notas').nullable();
      table.integer('orden').defaultTo(0);

      // Timestamps
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
    console.log('✓ Tabla unidades_proyecto creada');

    // Índices
    await knex.schema.alterTable('unidades_proyecto', (table) => {
      table.index(['propiedad_id'], 'idx_unidades_propiedad');
      table.index(['tenant_id'], 'idx_unidades_tenant');
      table.index(['estado'], 'idx_unidades_estado');
      table.index(['propiedad_id', 'codigo'], 'idx_unidades_propiedad_codigo');
    });
    console.log('✓ Índices creados para unidades_proyecto');

    // Índice único para código dentro de cada propiedad
    await knex.raw(`
      CREATE UNIQUE INDEX idx_unidades_codigo_unico
      ON unidades_proyecto (propiedad_id, codigo)
    `);
    console.log('✓ Índice único de código por propiedad creado');
  }

  console.log('✅ Migración 114 completada: Sistema de Disponibilidad para Proyectos');
}

export async function down(knex: Knex): Promise<void> {
  // Eliminar tabla de unidades
  await knex.schema.dropTableIfExists('unidades_proyecto');
  console.log('✓ Tabla unidades_proyecto eliminada');

  // Eliminar campo de disponibilidad
  const hasDisponibilidadConfig = await knex.schema.hasColumn('propiedades', 'disponibilidad_config');
  if (hasDisponibilidadConfig) {
    await knex.schema.alterTable('propiedades', (table) => {
      table.dropColumn('disponibilidad_config');
    });
    console.log('✓ Campo disponibilidad_config eliminado de propiedades');
  }

  console.log('✅ Rollback de migración 114 completado');
}
