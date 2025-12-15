import type { Knex } from 'knex';

/**
 * Migración para actualizar propiedades con sistema de ubicaciones
 *
 * Cambios:
 * 1. Agregar ubicacion_id (FK a ubicaciones - nivel sector)
 * 2. Eliminar campos zona y codigo_postal (no usados)
 * 3. Agregar campos de rangos para proyectos (precio, metraje, habitaciones, baños, parqueos)
 *
 * Estrategia de ubicación:
 * - ubicacion_id apunta al SECTOR en la tabla ubicaciones
 * - Mantenemos pais, provincia, ciudad, sector como VARCHAR para:
 *   a) Búsquedas rápidas en web sin JOINs
 *   b) Nombres ya formateados para display
 *   c) Traducciones pre-calculadas si es necesario
 */

export async function up(knex: Knex): Promise<void> {
  console.log('⬆️  Ejecutando migración 096: update_propiedades_ubicaciones');

  // Verificar y agregar ubicacion_id si no existe
  const hasUbicacionId = await knex.schema.hasColumn('propiedades', 'ubicacion_id');
  if (!hasUbicacionId) {
    await knex.schema.alterTable('propiedades', (table) => {
      table.uuid('ubicacion_id').nullable().references('id').inTable('ubicaciones').onDelete('SET NULL');
      table.index('ubicacion_id');
    });
    console.log('✅ Campo ubicacion_id agregado');
  } else {
    console.log('ℹ️  Campo ubicacion_id ya existe');
  }

  // Eliminar campos no usados si existen
  const hasZona = await knex.schema.hasColumn('propiedades', 'zona');
  if (hasZona) {
    await knex.schema.alterTable('propiedades', (table) => {
      table.dropColumn('zona');
    });
    console.log('✅ Campo zona eliminado');
  }

  const hasCodigoPostal = await knex.schema.hasColumn('propiedades', 'codigo_postal');
  if (hasCodigoPostal) {
    await knex.schema.alterTable('propiedades', (table) => {
      table.dropColumn('codigo_postal');
    });
    console.log('✅ Campo codigo_postal eliminado');
  }

  // Campos de rangos para proyectos
  const camposRango = [
    { nombre: 'precio_min', tipo: 'decimal', precision: [15, 2] },
    { nombre: 'precio_max', tipo: 'decimal', precision: [15, 2] },
    { nombre: 'm2_min', tipo: 'decimal', precision: [10, 2] },
    { nombre: 'm2_max', tipo: 'decimal', precision: [10, 2] },
    { nombre: 'habitaciones_min', tipo: 'integer' },
    { nombre: 'habitaciones_max', tipo: 'integer' },
    { nombre: 'banos_min', tipo: 'integer' },
    { nombre: 'banos_max', tipo: 'integer' },
    { nombre: 'parqueos_min', tipo: 'integer' },
    { nombre: 'parqueos_max', tipo: 'integer' },
  ];

  for (const campo of camposRango) {
    const existe = await knex.schema.hasColumn('propiedades', campo.nombre);
    if (!existe) {
      await knex.schema.alterTable('propiedades', (table) => {
        if (campo.tipo === 'decimal') {
          table.decimal(campo.nombre, campo.precision[0], campo.precision[1]).nullable();
        } else {
          table.integer(campo.nombre).nullable();
        }
      });
      console.log(`✅ Campo ${campo.nombre} agregado`);
    } else {
      console.log(`ℹ️  Campo ${campo.nombre} ya existe`);
    }
  }

  console.log('✅ Migración 096 completada\n');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('propiedades', (table) => {
    // Restaurar campos eliminados
    table.string('zona', 255).nullable();
    table.string('codigo_postal', 20).nullable();

    // Eliminar campos de rangos
    table.dropColumn('precio_min');
    table.dropColumn('precio_max');
    table.dropColumn('m2_min');
    table.dropColumn('m2_max');
    table.dropColumn('habitaciones_min');
    table.dropColumn('habitaciones_max');
    table.dropColumn('banos_min');
    table.dropColumn('banos_max');
    table.dropColumn('parqueos_min');
    table.dropColumn('parqueos_max');

    // Eliminar FK
    table.dropColumn('ubicacion_id');
  });
}
