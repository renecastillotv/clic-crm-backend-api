import { Knex } from 'knex';

/**
 * Migración - Tabla de Metas para CRM (Gamificación)
 *
 * Crea la tabla de metas para tracking de objetivos personales y de equipo
 * con sistema de recompensas.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('metas', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');

    // Usuario asignado
    table.uuid('usuario_id').nullable().references('id').inTable('usuarios').onDelete('CASCADE')
      .comment('Usuario al que aplica la meta');
    table.uuid('creado_por_id').nullable().references('id').inTable('usuarios').onDelete('SET NULL')
      .comment('Usuario que creó la meta');

    // Datos básicos
    table.string('titulo', 255).notNullable().comment('Título de la meta');
    table.text('descripcion').nullable().comment('Descripción detallada');

    // Tipo de meta
    table.string('tipo_meta', 50).notNullable().defaultTo('ventas')
      .comment('Tipo: ventas, contactos, actividades, cierres, propuestas, propiedades');
    table.string('metrica', 50).notNullable().defaultTo('cantidad')
      .comment('Métrica: cantidad, monto, porcentaje');

    // Objetivos
    table.decimal('valor_objetivo', 15, 2).notNullable().comment('Valor objetivo a alcanzar');
    table.decimal('valor_actual', 15, 2).defaultTo(0).comment('Valor actual logrado');

    // Periodo
    table.string('periodo', 50).notNullable().defaultTo('mensual')
      .comment('Periodo: diario, semanal, mensual, trimestral, anual, personalizado');
    table.timestamp('fecha_inicio').notNullable().comment('Fecha de inicio');
    table.timestamp('fecha_fin').notNullable().comment('Fecha de fin');

    // Estado
    table.string('estado', 50).notNullable().defaultTo('activa')
      .comment('Estado: activa, completada, fallida, cancelada');
    table.string('origen', 50).notNullable().defaultTo('personal')
      .comment('Origen: personal, asignada');

    // Recompensa
    table.string('tipo_recompensa', 100).nullable().comment('Tipo de recompensa: bono, reconocimiento, premio, etc.');
    table.text('descripcion_recompensa').nullable().comment('Descripción de la recompensa');
    table.decimal('monto_recompensa', 15, 2).nullable().comment('Monto de la recompensa (si aplica)');

    // Tracking
    table.timestamp('fecha_completada').nullable().comment('Fecha en que se completó');
    table.jsonb('historial_progreso').defaultTo('[]').comment('Historial de cambios de progreso');

    // Auditoría
    table.boolean('activo').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Índices
    table.index('tenant_id', 'idx_metas_tenant');
    table.index('usuario_id', 'idx_metas_usuario');
    table.index('tipo_meta', 'idx_metas_tipo');
    table.index('estado', 'idx_metas_estado');
    table.index('fecha_fin', 'idx_metas_fecha_fin');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('metas');
}
