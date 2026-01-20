/**
 * Migración 118: Agregar campos de snapshot y control a comisiones
 *
 * - tipo_participante: vendedor, captador, mentor, empresa, etc.
 * - escenario: solo_capta, solo_vende, capta_y_vende
 * - snapshot_distribucion: Copia INMUTABLE de la distribución al momento de crear
 * - monto_habilitado: Lo que está disponible para pago (proporcional a cobros empresa)
 * - es_override: Si el admin modificó manualmente la distribución
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Agregar nuevos campos a comisiones
  await knex.raw(`
    -- Tipo de participante en la venta
    ALTER TABLE comisiones ADD COLUMN IF NOT EXISTS
      tipo_participante VARCHAR(50);
    COMMENT ON COLUMN comisiones.tipo_participante IS 'vendedor, captador, mentor, lider, referidor, empresa';

    -- Escenario de la venta
    ALTER TABLE comisiones ADD COLUMN IF NOT EXISTS
      escenario VARCHAR(50);
    COMMENT ON COLUMN comisiones.escenario IS 'solo_capta, solo_vende, capta_y_vende';

    -- Snapshot INMUTABLE de la distribución
    ALTER TABLE comisiones ADD COLUMN IF NOT EXISTS
      snapshot_distribucion JSONB;
    COMMENT ON COLUMN comisiones.snapshot_distribucion IS 'Copia inmutable de la distribución al momento de crear la venta. Nunca se modifica.';

    -- Monto habilitado para pago (proporcional a cobros de empresa)
    ALTER TABLE comisiones ADD COLUMN IF NOT EXISTS
      monto_habilitado DECIMAL(15,2) DEFAULT 0;
    COMMENT ON COLUMN comisiones.monto_habilitado IS 'Monto disponible para pago, proporcional a lo cobrado por la empresa';

    -- Flag de override manual
    ALTER TABLE comisiones ADD COLUMN IF NOT EXISTS
      es_override BOOLEAN DEFAULT false;
    COMMENT ON COLUMN comisiones.es_override IS 'true si el admin modificó manualmente la distribución';

    -- Índices
    CREATE INDEX IF NOT EXISTS idx_comisiones_tipo_participante ON comisiones(tipo_participante);
    CREATE INDEX IF NOT EXISTS idx_comisiones_escenario ON comisiones(escenario);
  `);

  // Migrar datos existentes: asignar tipo_participante basado en datos_extra
  await knex.raw(`
    UPDATE comisiones
    SET tipo_participante = CASE
      WHEN datos_extra->>'split' = 'vendedor' THEN 'vendedor'
      WHEN datos_extra->>'split' = 'owner' THEN 'empresa'
      ELSE 'vendedor'
    END
    WHERE tipo_participante IS NULL;
  `);

  // Crear snapshot para comisiones existentes
  await knex.raw(`
    UPDATE comisiones
    SET snapshot_distribucion = jsonb_build_object(
      'porcentaje_original', porcentaje,
      'monto_original', monto,
      'split_vendedor', split_porcentaje_vendedor,
      'split_owner', split_porcentaje_owner,
      'migrado_de_datos_extra', datos_extra,
      'fecha_migracion', NOW()
    )
    WHERE snapshot_distribucion IS NULL;
  `);

  console.log('✅ Campos de snapshot agregados a comisiones');
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE comisiones DROP COLUMN IF EXISTS tipo_participante;
    ALTER TABLE comisiones DROP COLUMN IF EXISTS escenario;
    ALTER TABLE comisiones DROP COLUMN IF EXISTS snapshot_distribucion;
    ALTER TABLE comisiones DROP COLUMN IF EXISTS monto_habilitado;
    ALTER TABLE comisiones DROP COLUMN IF EXISTS es_override;
  `);
  console.log('✅ Campos de snapshot eliminados de comisiones');
}
