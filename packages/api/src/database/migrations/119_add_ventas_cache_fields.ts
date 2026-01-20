/**
 * Migración 119: Agregar campos cache a ventas
 *
 * Campos que se calculan dinámicamente pero se guardan para rendimiento.
 * Se actualizan con cada operación de cobro/pago.
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    -- Cache de monto cobrado por la empresa
    ALTER TABLE ventas ADD COLUMN IF NOT EXISTS
      cache_monto_cobrado DECIMAL(15,2) DEFAULT 0;
    COMMENT ON COLUMN ventas.cache_monto_cobrado IS 'Cache: SUM(ventas_cobros.monto) WHERE activo = true';

    -- Cache de porcentaje cobrado
    ALTER TABLE ventas ADD COLUMN IF NOT EXISTS
      cache_porcentaje_cobrado DECIMAL(5,2) DEFAULT 0;
    COMMENT ON COLUMN ventas.cache_porcentaje_cobrado IS 'Cache: (cache_monto_cobrado / monto_comision) * 100';

    -- Cache de monto pagado a asesores
    ALTER TABLE ventas ADD COLUMN IF NOT EXISTS
      cache_monto_pagado_asesores DECIMAL(15,2) DEFAULT 0;
    COMMENT ON COLUMN ventas.cache_monto_pagado_asesores IS 'Cache: SUM(pagos_comisiones.monto) para comisiones de esta venta';

    -- Estado de cobro de la empresa
    ALTER TABLE ventas ADD COLUMN IF NOT EXISTS
      estado_cobro VARCHAR(50) DEFAULT 'pendiente';
    COMMENT ON COLUMN ventas.estado_cobro IS 'pendiente, parcial, cobrado';

    -- Estado de pagos a asesores
    ALTER TABLE ventas ADD COLUMN IF NOT EXISTS
      estado_pagos VARCHAR(50) DEFAULT 'pendiente';
    COMMENT ON COLUMN ventas.estado_pagos IS 'pendiente, parcial, pagado';

    -- Índices para filtros comunes
    CREATE INDEX IF NOT EXISTS idx_ventas_estado_cobro ON ventas(estado_cobro);
    CREATE INDEX IF NOT EXISTS idx_ventas_estado_pagos ON ventas(estado_pagos);
  `);

  // Calcular caches para ventas existentes (si hay cobros/pagos)
  await knex.raw(`
    -- Actualizar cache_monto_cobrado desde ventas_cobros (si existe la tabla)
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ventas_cobros') THEN
        UPDATE ventas v
        SET cache_monto_cobrado = COALESCE((
          SELECT SUM(vc.monto)
          FROM ventas_cobros vc
          WHERE vc.venta_id = v.id AND vc.activo = true
        ), 0);
      END IF;
    END $$;
  `);

  // Actualizar estado_cobro basado en monto_comision y cache_monto_cobrado
  await knex.raw(`
    UPDATE ventas
    SET estado_cobro = CASE
      WHEN cache_monto_cobrado = 0 OR cache_monto_cobrado IS NULL THEN 'pendiente'
      WHEN cache_monto_cobrado >= monto_comision THEN 'cobrado'
      ELSE 'parcial'
    END
    WHERE monto_comision > 0;
  `);

  // Actualizar porcentaje cobrado
  await knex.raw(`
    UPDATE ventas
    SET cache_porcentaje_cobrado = CASE
      WHEN monto_comision > 0 THEN ROUND((cache_monto_cobrado / monto_comision) * 100, 2)
      ELSE 0
    END;
  `);

  // Actualizar cache_monto_pagado_asesores desde pagos_comisiones
  await knex.raw(`
    UPDATE ventas v
    SET cache_monto_pagado_asesores = COALESCE((
      SELECT SUM(p.monto)
      FROM pagos_comisiones p
      JOIN comisiones c ON p.comision_id = c.id
      WHERE c.venta_id = v.id AND p.activo = true
    ), 0);
  `);

  // Actualizar estado_pagos
  await knex.raw(`
    UPDATE ventas v
    SET estado_pagos = CASE
      WHEN cache_monto_pagado_asesores = 0 OR cache_monto_pagado_asesores IS NULL THEN 'pendiente'
      WHEN cache_monto_pagado_asesores >= (
        SELECT COALESCE(SUM(c.monto), 0)
        FROM comisiones c
        WHERE c.venta_id = v.id AND c.tipo_participante != 'empresa' AND c.activo = true
      ) THEN 'pagado'
      ELSE 'parcial'
    END
    WHERE monto_comision > 0;
  `);

  console.log('✅ Campos cache agregados a ventas');
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE ventas DROP COLUMN IF EXISTS cache_monto_cobrado;
    ALTER TABLE ventas DROP COLUMN IF EXISTS cache_porcentaje_cobrado;
    ALTER TABLE ventas DROP COLUMN IF EXISTS cache_monto_pagado_asesores;
    ALTER TABLE ventas DROP COLUMN IF EXISTS estado_cobro;
    ALTER TABLE ventas DROP COLUMN IF EXISTS estado_pagos;

    DROP INDEX IF EXISTS idx_ventas_estado_cobro;
    DROP INDEX IF EXISTS idx_ventas_estado_pagos;
  `);
  console.log('✅ Campos cache eliminados de ventas');
}
