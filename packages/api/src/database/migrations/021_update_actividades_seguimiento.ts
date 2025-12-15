import { Knex } from 'knex';

/**
 * Migración - Actualizar actividades_crm para módulo Seguimiento
 *
 * Agrega campos para:
 * - Estado (pendiente, en_progreso, completada, cancelada)
 * - Prioridad (baja, normal, alta, urgente)
 * - Nota de completación
 * - Fecha de completación
 * - Metadata para evidencias
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('actividades_crm', (table) => {
    // Estado de la actividad (reemplaza el boolean 'completada')
    table.string('estado', 20).defaultTo('pendiente')
      .comment('Estado: pendiente, en_progreso, completada, cancelada');

    // Prioridad
    table.string('prioridad', 20).defaultTo('normal')
      .comment('Prioridad: baja, normal, alta, urgente');

    // Nota al completar
    table.text('nota_completacion').nullable()
      .comment('Nota agregada al completar la actividad');

    // Fecha de completación
    table.timestamp('fecha_completada').nullable()
      .comment('Fecha y hora en que se completó');

    // Metadata para evidencias y otros datos
    table.jsonb('metadata').defaultTo('{}')
      .comment('Metadata adicional: evidencias, archivos, etc.');

    // Renombrar fecha_actividad a fecha_programada para mayor claridad
    // (mantenemos fecha_actividad por compatibilidad)
    table.timestamp('fecha_programada').nullable()
      .comment('Fecha programada / vencimiento');

    // Índices
    table.index('estado', 'idx_actividades_estado');
    table.index('prioridad', 'idx_actividades_prioridad');
  });

  // Migrar datos existentes: convertir 'completada' boolean a 'estado' string
  await knex.raw(`
    UPDATE actividades_crm
    SET estado = CASE
      WHEN completada = true THEN 'completada'
      ELSE 'pendiente'
    END
  `);

  // Copiar fecha_actividad a fecha_programada
  await knex.raw(`
    UPDATE actividades_crm
    SET fecha_programada = fecha_actividad
    WHERE fecha_actividad IS NOT NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('actividades_crm', (table) => {
    table.dropIndex('estado', 'idx_actividades_estado');
    table.dropIndex('prioridad', 'idx_actividades_prioridad');
    table.dropColumn('estado');
    table.dropColumn('prioridad');
    table.dropColumn('nota_completacion');
    table.dropColumn('fecha_completada');
    table.dropColumn('metadata');
    table.dropColumn('fecha_programada');
  });
}
