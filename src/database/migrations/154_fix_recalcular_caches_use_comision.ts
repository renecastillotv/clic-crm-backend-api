/**
 * Migración 154: Corregir función recalcular_caches_venta
 *
 * CORRECCIÓN: Los cobros son sobre la COMISIÓN, no sobre el valor de la venta.
 * En el negocio inmobiliario:
 * - El valor de la venta ($100,000) va al dueño/desarrollador
 * - La empresa cobra su comisión ($5,000 = 5%)
 * - La empresa distribuye esa comisión entre los participantes
 *
 * Por lo tanto:
 * - cache_porcentaje_cobrado = (monto_cobrado / monto_comision) × 100
 * - cache_comision_disponible = monto_cobrado (lo cobrado ES la comisión disponible)
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('🔄 Migración 154: Corrigiendo función recalcular_caches_venta\n');

  // Actualizar la función SQL para usar monto_comision en lugar de valor_cierre
  await knex.raw(`
    CREATE OR REPLACE FUNCTION recalcular_caches_venta(p_venta_id UUID)
    RETURNS void AS $func$
    DECLARE
      v_valor_cierre DECIMAL(15,2);
      v_monto_comision DECIMAL(15,2);
      v_monto_cobrado DECIMAL(15,2);
      v_porcentaje_cobrado DECIMAL(5,2);
      v_comision_disponible DECIMAL(15,2);
      v_monto_pagado DECIMAL(15,2);
      v_total_comisiones_asesores DECIMAL(15,2);
    BEGIN
      -- Obtener valores de la venta
      SELECT valor_cierre, monto_comision
      INTO v_valor_cierre, v_monto_comision
      FROM ventas WHERE id = p_venta_id;

      -- Si no existe la venta, salir
      IF v_monto_comision IS NULL THEN
        RETURN;
      END IF;

      -- Calcular monto cobrado desde ventas_cobros
      SELECT COALESCE(SUM(monto), 0)
      INTO v_monto_cobrado
      FROM ventas_cobros
      WHERE venta_id = p_venta_id AND activo = true;

      -- Calcular porcentaje cobrado (sobre COMISIÓN, no valor)
      -- Los cobros son sobre la comisión, que es lo que la empresa recibe
      v_porcentaje_cobrado := CASE
        WHEN v_monto_comision > 0 THEN
          LEAST(ROUND((v_monto_cobrado / v_monto_comision) * 100, 2), 100)
        ELSE 0
      END;

      -- La comisión disponible ES lo cobrado (cobramos la comisión directamente)
      v_comision_disponible := v_monto_cobrado;

      -- Calcular pagos realizados a asesores
      SELECT COALESCE(SUM(p.monto), 0)
      INTO v_monto_pagado
      FROM pagos_comisiones p
      JOIN comisiones c ON p.comision_id = c.id
      WHERE c.venta_id = p_venta_id
        AND (p.activo = true OR p.activo IS NULL)
        AND (c.activo = true OR c.activo IS NULL);

      -- Obtener total de comisiones de asesores (excluyendo empresa)
      SELECT COALESCE(SUM(monto), 0)
      INTO v_total_comisiones_asesores
      FROM comisiones
      WHERE venta_id = p_venta_id
        AND (activo = true OR activo IS NULL)
        AND (tipo_participante IS NULL OR tipo_participante != 'empresa');

      -- Actualizar venta
      UPDATE ventas SET
        cache_monto_cobrado = v_monto_cobrado,
        cache_porcentaje_cobrado = v_porcentaje_cobrado,
        cache_comision_disponible = v_comision_disponible,
        cache_monto_pagado_asesores = v_monto_pagado,
        estado_cobro = CASE
          WHEN v_monto_cobrado = 0 THEN 'pendiente'
          WHEN v_monto_cobrado >= v_monto_comision THEN 'cobrado'
          ELSE 'parcial'
        END,
        estado_pagos = CASE
          WHEN v_monto_pagado = 0 THEN 'pendiente'
          WHEN v_total_comisiones_asesores > 0 AND v_monto_pagado >= v_total_comisiones_asesores THEN 'pagado'
          ELSE 'parcial'
        END,
        updated_at = NOW()
      WHERE id = p_venta_id;

      -- Actualizar monto_habilitado en comisiones (proporcional a lo cobrado)
      UPDATE comisiones SET
        monto_habilitado = ROUND((v_porcentaje_cobrado / 100) * monto, 2),
        updated_at = NOW()
      WHERE venta_id = p_venta_id
        AND (activo = true OR activo IS NULL);

    END;
    $func$ LANGUAGE plpgsql;
  `);

  console.log('✅ Función recalcular_caches_venta actualizada');

  // Recalcular todas las ventas con la nueva lógica
  console.log('🔄 Recalculando ventas con la lógica corregida...');

  const ventas = await knex.raw(`
    SELECT id FROM ventas
    WHERE activo = true AND cancelada = false AND monto_comision > 0
  `);

  let recalculadas = 0;
  for (const row of ventas.rows) {
    await knex.raw('SELECT recalcular_caches_venta(?)', [row.id]);
    recalculadas++;
  }

  console.log(`✅ ${recalculadas} ventas recalculadas`);
  console.log('\n✅ Migración 154 completada');
}

export async function down(knex: Knex): Promise<void> {
  // Revertir a la versión anterior que usaba valor_cierre
  console.log('⚠️ Revirtiendo a versión que usa valor_cierre (incorrecta para este negocio)');
}
