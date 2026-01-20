import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('🔄 Completando migraciones - Fix caches\n');

    // Verificar si pagos_comisiones tiene columna activo
    const checkActivoPagos = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'pagos_comisiones' AND column_name = 'activo'
    `);

    if (checkActivoPagos.rows.length === 0) {
      console.log('➕ Agregando columna activo a pagos_comisiones...');
      await client.query(`ALTER TABLE pagos_comisiones ADD COLUMN activo BOOLEAN DEFAULT true`);
      console.log('   ✅ Columna activo agregada');
    }

    // Calcular caches para ventas existentes
    console.log('\n🔄 Calculando caches para ventas existentes...');

    // Actualizar cache_monto_pagado_asesores
    await client.query(`
      UPDATE ventas v
      SET cache_monto_pagado_asesores = COALESCE((
        SELECT SUM(p.monto)
        FROM pagos_comisiones p
        JOIN comisiones c ON p.comision_id = c.id
        WHERE c.venta_id = v.id
      ), 0)
    `);
    console.log('   ✅ cache_monto_pagado_asesores calculado');

    // Actualizar estado_pagos
    await client.query(`
      UPDATE ventas v
      SET estado_pagos = CASE
        WHEN cache_monto_pagado_asesores = 0 OR cache_monto_pagado_asesores IS NULL THEN 'pendiente'
        WHEN cache_monto_pagado_asesores >= COALESCE((
          SELECT SUM(c.monto)
          FROM comisiones c
          WHERE c.venta_id = v.id AND c.tipo_participante != 'empresa'
        ), 0) THEN 'pagado'
        ELSE 'parcial'
      END
      WHERE monto_comision > 0 OR monto_comision IS NOT NULL
    `);
    console.log('   ✅ estado_pagos calculado');

    // ============================================
    // RESUMEN
    // ============================================
    console.log('\n✅ Migraciones completadas exitosamente\n');

    // Mostrar estadísticas
    const stats = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM ventas_cobros) as cobros,
        (SELECT COUNT(*) FROM ventas_historial) as historial,
        (SELECT COUNT(*) FROM comisiones WHERE tipo_participante IS NOT NULL) as comisiones_migradas,
        (SELECT COUNT(*) FROM ventas WHERE estado_cobro IS NOT NULL) as ventas_con_cache
    `);

    console.log('📊 Estadísticas:');
    console.log(`   - Tabla ventas_cobros: ${stats.rows[0].cobros} registros`);
    console.log(`   - Tabla ventas_historial: ${stats.rows[0].historial} registros`);
    console.log(`   - Comisiones con tipo_participante: ${stats.rows[0].comisiones_migradas}`);
    console.log(`   - Ventas con campos cache: ${stats.rows[0].ventas_con_cache}`);

    // Mostrar ejemplo de una venta
    const ventaEjemplo = await client.query(`
      SELECT id, nombre_negocio, valor_cierre, monto_comision,
             cache_monto_cobrado, cache_porcentaje_cobrado,
             cache_monto_pagado_asesores, estado_cobro, estado_pagos
      FROM ventas
      LIMIT 1
    `);

    if (ventaEjemplo.rows.length > 0) {
      console.log('\n📋 Ejemplo de venta con nuevos campos:');
      console.log(JSON.stringify(ventaEjemplo.rows[0], null, 2));
    }

    // Mostrar ejemplo de comisión
    const comisionEjemplo = await client.query(`
      SELECT id, tipo_participante, escenario, porcentaje, monto,
             monto_habilitado, es_override, snapshot_distribucion
      FROM comisiones
      LIMIT 1
    `);

    if (comisionEjemplo.rows.length > 0) {
      console.log('\n📋 Ejemplo de comisión con nuevos campos:');
      console.log(JSON.stringify(comisionEjemplo.rows[0], null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
