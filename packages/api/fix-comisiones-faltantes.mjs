/**
 * Script para generar comisiones faltantes para ventas existentes
 *
 * Busca ventas que tienen monto_comision pero no tienen registros en la tabla comisiones
 * y crea las comisiones automáticamente (70% vendedor, 30% owner)
 */

import { query } from './dist/utils/db.js';

async function getTenantOwner(tenantId) {
  const sql = `
    SELECT usuario_id
    FROM usuarios_tenants
    WHERE tenant_id = $1 AND es_owner = true AND activo = true
    LIMIT 1
  `;
  const result = await query(sql, [tenantId]);
  return result.rows.length > 0 ? result.rows[0].usuario_id : null;
}

async function main() {
  try {
    console.log('🔍 Buscando ventas sin comisiones...\n');

    // Buscar ventas que tienen monto pero no tienen comisiones
    const ventasSinComisiones = await query(`
      SELECT v.id, v.tenant_id, v.numero_venta, v.nombre_negocio,
             v.valor_cierre, v.monto_comision, v.porcentaje_comision,
             v.usuario_cerrador_id, v.moneda
      FROM ventas v
      LEFT JOIN comisiones c ON c.venta_id = v.id
      WHERE v.activo = true
        AND (v.monto_comision > 0 OR (v.porcentaje_comision > 0 AND v.valor_cierre > 0))
        AND c.id IS NULL
      ORDER BY v.created_at DESC
    `);

    if (ventasSinComisiones.rows.length === 0) {
      console.log('✅ No hay ventas sin comisiones. Todo está en orden.');
      process.exit(0);
    }

    console.log(`📋 Encontradas ${ventasSinComisiones.rows.length} ventas sin comisiones:\n`);

    for (const venta of ventasSinComisiones.rows) {
      console.log(`  - Venta #${venta.numero_venta}: ${venta.nombre_negocio || 'Sin nombre'}`);
      console.log(`    Valor: ${venta.moneda || 'USD'} ${venta.valor_cierre}`);
      console.log(`    Porcentaje: ${venta.porcentaje_comision || 0}%`);
      console.log(`    Monto Comisión: ${venta.monto_comision || 'No calculado'}`);
      console.log(`    Vendedor ID: ${venta.usuario_cerrador_id || 'No asignado'}`);

      // Calcular monto de comisión si no existe
      let montoComision = venta.monto_comision;
      if (!montoComision && venta.porcentaje_comision && venta.valor_cierre) {
        montoComision = (parseFloat(venta.valor_cierre) * parseFloat(venta.porcentaje_comision)) / 100;
        console.log(`    Calculando comisión: ${montoComision}`);

        // Actualizar la venta con el monto calculado
        await query(
          'UPDATE ventas SET monto_comision = $1 WHERE id = $2',
          [montoComision, venta.id]
        );
      }

      if (!montoComision || montoComision <= 0) {
        console.log(`    ⚠️ Sin monto de comisión válido, saltando...\n`);
        continue;
      }

      // Obtener owner del tenant
      const ownerId = await getTenantOwner(venta.tenant_id);

      // Crear comisión para vendedor (70%)
      if (venta.usuario_cerrador_id) {
        const montoVendedor = montoComision * 0.7;
        await query(`
          INSERT INTO comisiones (
            tenant_id, venta_id, usuario_id, monto, moneda, porcentaje, estado, tipo,
            datos_extra, split_porcentaje_vendedor, split_porcentaje_owner
          ) VALUES (
            $1, $2, $3, $4, $5, $6, 'pendiente', 'venta',
            $7, 70, 30
          )
        `, [
          venta.tenant_id,
          venta.id,
          venta.usuario_cerrador_id,
          montoVendedor,
          venta.moneda || 'USD',
          (venta.porcentaje_comision || 0) * 0.7,
          JSON.stringify({ split: 'vendedor', porcentajeSplit: 70, montoTotalComision: montoComision })
        ]);
        console.log(`    ✅ Comisión vendedor creada: ${venta.moneda || 'USD'} ${montoVendedor.toFixed(2)}`);
      }

      // Crear comisión para owner (30%)
      if (ownerId) {
        const montoOwner = montoComision * 0.3;
        await query(`
          INSERT INTO comisiones (
            tenant_id, venta_id, usuario_id, monto, moneda, porcentaje, estado, tipo,
            datos_extra, split_porcentaje_vendedor, split_porcentaje_owner
          ) VALUES (
            $1, $2, $3, $4, $5, $6, 'pendiente', 'venta',
            $7, 70, 30
          )
        `, [
          venta.tenant_id,
          venta.id,
          ownerId,
          montoOwner,
          venta.moneda || 'USD',
          (venta.porcentaje_comision || 0) * 0.3,
          JSON.stringify({ split: 'owner', porcentajeSplit: 30, montoTotalComision: montoComision })
        ]);
        console.log(`    ✅ Comisión owner creada: ${venta.moneda || 'USD'} ${montoOwner.toFixed(2)}`);
      } else {
        console.log(`    ⚠️ No se encontró owner para el tenant`);
      }

      console.log('');
    }

    console.log('\n🎉 Proceso completado!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
