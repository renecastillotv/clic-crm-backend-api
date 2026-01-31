/**
 * Migración 153: Agregar campo activo a comisiones y pagos_comisiones
 *
 * Permite soft-delete para:
 * - Cancelación de ventas (marcar todo como inactivo)
 * - Corrección de errores sin perder historial
 * - Auditoría completa
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('🔄 Migración 153: Agregando campo activo\n');

  // Agregar activo a comisiones si no existe
  console.log('➕ Agregando activo a comisiones...');
  await knex.raw(`
    ALTER TABLE comisiones ADD COLUMN IF NOT EXISTS
      activo BOOLEAN DEFAULT true;
    CREATE INDEX IF NOT EXISTS idx_comisiones_activo ON comisiones(activo);
    COMMENT ON COLUMN comisiones.activo IS 'Soft delete para cancelaciones';
  `);

  // Agregar activo a pagos_comisiones si no existe
  console.log('➕ Agregando activo a pagos_comisiones...');
  await knex.raw(`
    ALTER TABLE pagos_comisiones ADD COLUMN IF NOT EXISTS
      activo BOOLEAN DEFAULT true;
    CREATE INDEX IF NOT EXISTS idx_pagos_comisiones_activo ON pagos_comisiones(activo);
    COMMENT ON COLUMN pagos_comisiones.activo IS 'Soft delete para cancelaciones';
  `);

  // Agregar campos de cancelación a comisiones
  console.log('➕ Agregando campos de cancelación a comisiones...');
  await knex.raw(`
    ALTER TABLE comisiones ADD COLUMN IF NOT EXISTS
      cancelada BOOLEAN DEFAULT false;
    ALTER TABLE comisiones ADD COLUMN IF NOT EXISTS
      fecha_cancelacion TIMESTAMP;
    ALTER TABLE comisiones ADD COLUMN IF NOT EXISTS
      cancelado_por_id UUID REFERENCES usuarios(id) ON DELETE SET NULL;
    ALTER TABLE comisiones ADD COLUMN IF NOT EXISTS
      razon_cancelacion TEXT;
  `);

  // Agregar campos de cancelación a pagos_comisiones
  console.log('➕ Agregando campos de cancelación a pagos_comisiones...');
  await knex.raw(`
    ALTER TABLE pagos_comisiones ADD COLUMN IF NOT EXISTS
      cancelado BOOLEAN DEFAULT false;
    ALTER TABLE pagos_comisiones ADD COLUMN IF NOT EXISTS
      fecha_cancelacion TIMESTAMP;
    ALTER TABLE pagos_comisiones ADD COLUMN IF NOT EXISTS
      cancelado_por_id UUID REFERENCES usuarios(id) ON DELETE SET NULL;
    ALTER TABLE pagos_comisiones ADD COLUMN IF NOT EXISTS
      razon_cancelacion TEXT;
  `);

  // Actualizar registros existentes (todos activos por defecto)
  await knex.raw(`
    UPDATE comisiones SET activo = true WHERE activo IS NULL;
    UPDATE pagos_comisiones SET activo = true WHERE activo IS NULL;
  `);

  console.log('\n✅ Migración 153 completada');
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE comisiones DROP COLUMN IF EXISTS activo;
    ALTER TABLE comisiones DROP COLUMN IF EXISTS cancelada;
    ALTER TABLE comisiones DROP COLUMN IF EXISTS fecha_cancelacion;
    ALTER TABLE comisiones DROP COLUMN IF EXISTS cancelado_por_id;
    ALTER TABLE comisiones DROP COLUMN IF EXISTS razon_cancelacion;

    ALTER TABLE pagos_comisiones DROP COLUMN IF EXISTS activo;
    ALTER TABLE pagos_comisiones DROP COLUMN IF EXISTS cancelado;
    ALTER TABLE pagos_comisiones DROP COLUMN IF EXISTS fecha_cancelacion;
    ALTER TABLE pagos_comisiones DROP COLUMN IF EXISTS cancelado_por_id;
    ALTER TABLE pagos_comisiones DROP COLUMN IF EXISTS razon_cancelacion;
  `);
  console.log('✅ Migración 153 revertida');
}
