/**
 * Script para sincronizar monto_pagado en comisiones basándose en pagos_comisiones
 *
 * Este script recalcula el monto_pagado de cada comisión sumando todos sus pagos
 * y actualiza el estado correspondiente (pendiente, parcial, pagado)
 */

import { query } from './dist/utils/db.js';

async function main() {
  try {
    console.log('🔄 Sincronizando montos pagados en comisiones...\n');

    // Obtener todas las comisiones con sus pagos
    const comisiones = await query(`
      SELECT
        c.id,
        c.tenant_id,
        c.venta_id,
        c.monto,
        c.monto_pagado,
        c.estado,
        c.moneda,
        COALESCE(SUM(p.monto), 0) as total_pagos
      FROM comisiones c
      LEFT JOIN pagos_comisiones p ON p.comision_id = c.id
      GROUP BY c.id, c.tenant_id, c.venta_id, c.monto, c.monto_pagado, c.estado, c.moneda
      ORDER BY c.created_at DESC
    `);

    console.log(`📋 Encontradas ${comisiones.rows.length} comisiones\n`);

    let actualizadas = 0;
    let sinCambios = 0;

    for (const comision of comisiones.rows) {
      const montoTotal = parseFloat(comision.monto) || 0;
      const montoPagadoActual = parseFloat(comision.monto_pagado) || 0;
      const totalPagos = parseFloat(comision.total_pagos) || 0;

      // Si el monto pagado actual difiere del total de pagos, actualizar
      if (Math.abs(montoPagadoActual - totalPagos) > 0.01) {
        // Determinar nuevo estado
        let nuevoEstado = 'pendiente';
        if (totalPagos >= montoTotal) {
          nuevoEstado = 'pagado';
        } else if (totalPagos > 0) {
          nuevoEstado = 'parcial';
        }

        console.log(`  📝 Comisión ${comision.id.substring(0, 8)}...`);
        console.log(`     Monto total: ${comision.moneda} ${montoTotal.toFixed(2)}`);
        console.log(`     Pagado actual: ${montoPagadoActual.toFixed(2)} → Nuevo: ${totalPagos.toFixed(2)}`);
        console.log(`     Estado: ${comision.estado} → ${nuevoEstado}`);

        // Actualizar la comisión
        await query(`
          UPDATE comisiones
          SET monto_pagado = $1,
              estado = $2::varchar,
              fecha_pago = CASE WHEN $3::varchar = 'pagado' THEN NOW() ELSE fecha_pago END,
              updated_at = NOW()
          WHERE id = $4
        `, [totalPagos, nuevoEstado, nuevoEstado, comision.id]);

        actualizadas++;
        console.log(`     ✅ Actualizada\n`);
      } else {
        sinCambios++;
      }
    }

    console.log('\n========================================');
    console.log(`✅ Comisiones actualizadas: ${actualizadas}`);
    console.log(`⏭️  Sin cambios necesarios: ${sinCambios}`);
    console.log('========================================\n');

    // Mostrar resumen de ventas afectadas
    if (actualizadas > 0) {
      const ventasAfectadas = await query(`
        SELECT DISTINCT v.id, v.numero_venta, v.nombre_negocio,
               SUM(c.monto) as total_comision,
               SUM(c.monto_pagado) as total_pagado
        FROM comisiones c
        JOIN ventas v ON v.id = c.venta_id
        GROUP BY v.id, v.numero_venta, v.nombre_negocio
        HAVING SUM(c.monto_pagado) > 0
        ORDER BY v.numero_venta DESC
        LIMIT 10
      `);

      if (ventasAfectadas.rows.length > 0) {
        console.log('📊 Últimas ventas con pagos:');
        for (const venta of ventasAfectadas.rows) {
          const porcentaje = ((parseFloat(venta.total_pagado) / parseFloat(venta.total_comision)) * 100).toFixed(1);
          console.log(`   Venta #${venta.numero_venta}: ${venta.nombre_negocio || 'Sin nombre'}`);
          console.log(`   Comisión: $${parseFloat(venta.total_comision).toFixed(2)} | Pagado: $${parseFloat(venta.total_pagado).toFixed(2)} (${porcentaje}%)\n`);
        }
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
