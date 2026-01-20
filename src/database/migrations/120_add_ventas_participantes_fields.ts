/**
 * Migración: Agregar campos de participantes a ventas
 *
 * Agrega:
 * - unidad_id: FK a unidades_proyecto para proyectos con inventario
 * - captador_id: FK a usuarios para el asesor que captó la propiedad
 *
 * Estos campos permiten:
 * 1. Vincular una venta a una unidad específica de un proyecto
 * 2. Registrar explícitamente quién captó vs quién vendió
 */

import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Verificar si las columnas ya existen
  const hasUnidadId = await knex.schema.hasColumn('ventas', 'unidad_id');
  const hasCaptadorId = await knex.schema.hasColumn('ventas', 'captador_id');

  if (!hasUnidadId || !hasCaptadorId) {
    await knex.schema.alterTable('ventas', (table) => {
      // Unidad del proyecto (opcional, para proyectos con inventario)
      if (!hasUnidadId) {
        table.uuid('unidad_id')
          .nullable()
          .comment('ID de la unidad vendida (para proyectos con inventario)');

        // No agregamos FK porque la tabla unidades_proyecto puede no existir
        // La validación se hace en el servicio
      }

      // Captador de la venta (quien captó la propiedad/cliente)
      if (!hasCaptadorId) {
        table.uuid('captador_id')
          .nullable()
          .references('id')
          .inTable('usuarios')
          .onDelete('SET NULL')
          .comment('Asesor que captó la propiedad (diferente del cerrador/vendedor)');
      }
    });

    console.log('✓ Campos unidad_id y captador_id agregados a ventas');
  } else {
    console.log('ℹ Campos ya existen en ventas');
  }

  // Crear índices si no existen
  const indices = await knex.raw(`
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'ventas'
    AND indexname IN ('idx_ventas_unidad', 'idx_ventas_captador')
  `);

  const existingIndices = indices.rows.map((r: any) => r.indexname);

  if (!existingIndices.includes('idx_ventas_unidad')) {
    await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_ventas_unidad ON ventas(unidad_id) WHERE unidad_id IS NOT NULL
    `);
    console.log('✓ Índice idx_ventas_unidad creado');
  }

  if (!existingIndices.includes('idx_ventas_captador')) {
    await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_ventas_captador ON ventas(captador_id) WHERE captador_id IS NOT NULL
    `);
    console.log('✓ Índice idx_ventas_captador creado');
  }
}

export async function down(knex: Knex): Promise<void> {
  // Eliminar índices
  await knex.raw('DROP INDEX IF EXISTS idx_ventas_unidad');
  await knex.raw('DROP INDEX IF EXISTS idx_ventas_captador');

  // Eliminar columnas
  await knex.schema.alterTable('ventas', (table) => {
    table.dropColumn('unidad_id');
    table.dropColumn('captador_id');
  });

  console.log('✓ Campos unidad_id y captador_id eliminados de ventas');
}
