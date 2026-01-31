/**
 * Migración 151: Corregir cálculos de cache en ventas
 *
 * PROBLEMA CRÍTICO DETECTADO:
 * - cache_porcentaje_cobrado se calculaba como (cobrado / comision) × 100
 * - DEBERÍA ser (cobrado / valor_cierre) × 100
 *
 * Esta migración:
 * 1. Agrega cache_comision_disponible (comisión proporcional a lo cobrado)
 * 2. Corrige los cálculos de todos los registros existentes
 * 3. Crea función SQL para recálculo automático
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('🔄 Migración 151: Corrigiendo cálculos de cache en ventas\n');

  // 1. Agregar campo cache_comision_disponible
  console.log('➕ Agregando cache_comision_disponible...');
  await knex.raw(`
    ALTER TABLE ventas ADD COLUMN IF NOT EXISTS
      cache_comision_disponible DECIMAL(15,2) DEFAULT 0;
    COMMENT ON COLUMN ventas.cache_comision_disponible IS
      'Comisión disponible para pagar, proporcional a lo cobrado del cliente';
  `);

  // 2. Crear función de recálculo
  console.log('➕ Creando función recalcular_caches_venta...');
  await knex.raw(`
    CREATE OR REPLACE FUNCTION recalcular_caches_venta(p_venta_id UUID)
    RETURNS void AS $$
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
      IF v_valor_cierre IS NULL THEN
        RETURN;
      END IF;

      -- Calcular monto cobrado desde ventas_cobros
      SELECT COALESCE(SUM(monto), 0)
      INTO v_monto_cobrado
      FROM ventas_cobros
      WHERE venta_id = p_venta_id AND activo = true;

      -- Calcular porcentaje cobrado (sobre VALOR, no comisión)
      v_porcentaje_cobrado := CASE
        WHEN v_valor_cierre > 0 THEN
          LEAST(ROUND((v_monto_cobrado / v_valor_cierre) * 100, 2), 100)
        ELSE 0
      END;

      -- Calcular comisión disponible (proporcional a lo cobrado)
      v_comision_disponible := CASE
        WHEN v_monto_comision > 0 THEN
          ROUND((v_porcentaje_cobrado / 100) * v_monto_comision, 2)
        ELSE 0
      END;

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
          WHEN v_monto_cobrado >= v_valor_cierre THEN 'cobrado'
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
    $$ LANGUAGE plpgsql;
  `);

  // 3. Corregir datos existentes
  console.log('🔄 Corrigiendo datos existentes...');

  // Primero, obtener todas las ventas con cobros
  const ventasConCobros = await knex.raw(`
    SELECT DISTINCT v.id
    FROM ventas v
    WHERE v.activo = true
      AND v.cancelada = false
      AND v.valor_cierre > 0
  `);

  let corregidas = 0;
  for (const row of ventasConCobros.rows) {
    await knex.raw('SELECT recalcular_caches_venta($1)', [row.id]);
    corregidas++;
  }

  console.log(`✅ ${corregidas} ventas recalculadas`);

  // 4. Mostrar estadísticas
  const stats = await knex.raw(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE estado_cobro = 'cobrado') as cobradas,
      COUNT(*) FILTER (WHERE estado_cobro = 'parcial') as parciales,
      COUNT(*) FILTER (WHERE estado_cobro = 'pendiente') as pendientes
    FROM ventas
    WHERE activo = true AND cancelada = false
  `);

  console.log('\n📊 Estadísticas después de corrección:');
  console.log(`   Total ventas: ${stats.rows[0].total}`);
  console.log(`   Cobradas: ${stats.rows[0].cobradas}`);
  console.log(`   Parciales: ${stats.rows[0].parciales}`);
  console.log(`   Pendientes: ${stats.rows[0].pendientes}`);

  console.log('\n✅ Migración 151 completada');
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP FUNCTION IF EXISTS recalcular_caches_venta(UUID);
    ALTER TABLE ventas DROP COLUMN IF EXISTS cache_comision_disponible;
  `);
  console.log('✅ Migración 151 revertida');
}
