/**
 * Migration: Agregar campo etiquetas a propiedades
 *
 * Agrega un campo JSONB para almacenar los códigos de etiquetas aplicadas
 * a cada propiedad. Esto permite etiquetas múltiples y personalizadas
 * mientras mantiene compatibilidad con los campos booleanos existentes.
 *
 * Estructura del campo etiquetas:
 * - Array de strings con códigos de etiquetas del catálogo
 * - Ejemplo: ["exclusiva", "destacada", "mi_etiqueta_custom"]
 */

import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Agregar columna etiquetas JSONB
  await knex.schema.alterTable('propiedades', (table) => {
    table.jsonb('etiquetas').defaultTo('[]').comment('Array de códigos de etiquetas del catálogo aplicadas a la propiedad');
  });

  // 2. Migrar datos existentes: convertir booleanos a array de etiquetas
  // Las propiedades con destacada=true tendrán "destacada" en el array
  // Las propiedades con exclusiva=true tendrán "exclusiva" en el array
  await knex.raw(`
    UPDATE propiedades
    SET etiquetas = (
      SELECT jsonb_agg(etiqueta)
      FROM (
        SELECT 'destacada' as etiqueta WHERE destacada = true
        UNION ALL
        SELECT 'exclusiva' as etiqueta WHERE exclusiva = true
      ) subquery
      WHERE etiqueta IS NOT NULL
    )
    WHERE destacada = true OR exclusiva = true
  `);

  // 3. Asegurar que las que quedaron NULL tengan array vacío
  await knex.raw(`
    UPDATE propiedades
    SET etiquetas = '[]'::jsonb
    WHERE etiquetas IS NULL
  `);

  // 4. Crear índice GIN para búsquedas eficientes en el array
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_propiedades_etiquetas
    ON propiedades USING GIN (etiquetas)
  `);

  console.log('✅ Campo etiquetas agregado a propiedades y datos migrados');
}

export async function down(knex: Knex): Promise<void> {
  // Eliminar índice
  await knex.raw('DROP INDEX IF EXISTS idx_propiedades_etiquetas');

  // Eliminar columna
  await knex.schema.alterTable('propiedades', (table) => {
    table.dropColumn('etiquetas');
  });

  console.log('✅ Campo etiquetas eliminado de propiedades');
}
