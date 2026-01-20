import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('🔄 Migraciones 116-119: Sistema de Ventas y Comisiones\n');

    // ============================================
    // MIGRACIÓN 116: Crear tabla ventas_cobros
    // ============================================
    console.log('📦 Migración 116: Tabla ventas_cobros');

    const checkVentasCobros = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'ventas_cobros'
      ) as exists
    `);

    if (checkVentasCobros.rows[0].exists) {
      console.log('   ⏭️  Tabla ventas_cobros ya existe');
    } else {
      await client.query(`
        CREATE TABLE ventas_cobros (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,

          monto DECIMAL(15,2) NOT NULL,
          moneda VARCHAR(3) DEFAULT 'USD',

          fecha_cobro DATE NOT NULL,
          metodo_pago VARCHAR(50),
          referencia VARCHAR(100),
          banco VARCHAR(100),

          recibo_url VARCHAR(500),
          notas TEXT,

          registrado_por_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
          fecha_registro TIMESTAMP DEFAULT NOW(),

          activo BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await client.query(`CREATE INDEX idx_ventas_cobros_tenant ON ventas_cobros(tenant_id)`);
      await client.query(`CREATE INDEX idx_ventas_cobros_venta ON ventas_cobros(venta_id)`);
      await client.query(`CREATE INDEX idx_ventas_cobros_fecha ON ventas_cobros(fecha_cobro)`);
      await client.query(`CREATE INDEX idx_ventas_cobros_activo ON ventas_cobros(activo)`);

      await client.query(`COMMENT ON TABLE ventas_cobros IS 'Registra los cobros que hace la empresa (inmobiliaria) al cliente'`);
      await client.query(`COMMENT ON COLUMN ventas_cobros.monto IS 'Monto cobrado al cliente'`);
      await client.query(`COMMENT ON COLUMN ventas_cobros.metodo_pago IS 'transferencia, cheque, efectivo, tarjeta'`);

      console.log('   ✅ Tabla ventas_cobros creada');
    }

    // ============================================
    // MIGRACIÓN 117: Crear tabla ventas_historial
    // ============================================
    console.log('\n📦 Migración 117: Tabla ventas_historial');

    const checkVentasHistorial = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'ventas_historial'
      ) as exists
    `);

    if (checkVentasHistorial.rows[0].exists) {
      console.log('   ⏭️  Tabla ventas_historial ya existe');
    } else {
      await client.query(`
        CREATE TABLE ventas_historial (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,

          tipo_cambio VARCHAR(50) NOT NULL,
          entidad VARCHAR(50),
          entidad_id UUID,

          datos_anteriores JSONB,
          datos_nuevos JSONB,

          descripcion TEXT NOT NULL,

          usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
          usuario_nombre VARCHAR(200),

          ip_address VARCHAR(45),
          user_agent TEXT,

          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await client.query(`CREATE INDEX idx_ventas_historial_tenant ON ventas_historial(tenant_id)`);
      await client.query(`CREATE INDEX idx_ventas_historial_venta ON ventas_historial(venta_id)`);
      await client.query(`CREATE INDEX idx_ventas_historial_tipo ON ventas_historial(tipo_cambio)`);
      await client.query(`CREATE INDEX idx_ventas_historial_fecha ON ventas_historial(created_at DESC)`);
      await client.query(`CREATE INDEX idx_ventas_historial_usuario ON ventas_historial(usuario_id)`);

      await client.query(`COMMENT ON TABLE ventas_historial IS 'Audit log de todos los cambios en ventas y comisiones'`);
      await client.query(`COMMENT ON COLUMN ventas_historial.tipo_cambio IS 'Tipo de operación: venta_creada, cobro_registrado, distribucion_modificada, pago_registrado, etc.'`);
      await client.query(`COMMENT ON COLUMN ventas_historial.datos_anteriores IS 'Estado antes del cambio (para auditoría)'`);
      await client.query(`COMMENT ON COLUMN ventas_historial.datos_nuevos IS 'Estado después del cambio'`);

      console.log('   ✅ Tabla ventas_historial creada');
    }

    // ============================================
    // MIGRACIÓN 118: Agregar campos a comisiones
    // ============================================
    console.log('\n📦 Migración 118: Campos snapshot en comisiones');

    // tipo_participante
    const checkTipoParticipante = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'comisiones' AND column_name = 'tipo_participante'
    `);

    if (checkTipoParticipante.rows.length > 0) {
      console.log('   ⏭️  Campo tipo_participante ya existe');
    } else {
      await client.query(`ALTER TABLE comisiones ADD COLUMN tipo_participante VARCHAR(50)`);
      console.log('   ✅ Campo tipo_participante agregado');
    }

    // escenario
    const checkEscenario = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'comisiones' AND column_name = 'escenario'
    `);

    if (checkEscenario.rows.length > 0) {
      console.log('   ⏭️  Campo escenario ya existe');
    } else {
      await client.query(`ALTER TABLE comisiones ADD COLUMN escenario VARCHAR(50)`);
      console.log('   ✅ Campo escenario agregado');
    }

    // snapshot_distribucion
    const checkSnapshot = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'comisiones' AND column_name = 'snapshot_distribucion'
    `);

    if (checkSnapshot.rows.length > 0) {
      console.log('   ⏭️  Campo snapshot_distribucion ya existe');
    } else {
      await client.query(`ALTER TABLE comisiones ADD COLUMN snapshot_distribucion JSONB`);
      console.log('   ✅ Campo snapshot_distribucion agregado');
    }

    // monto_habilitado
    const checkMontoHabilitado = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'comisiones' AND column_name = 'monto_habilitado'
    `);

    if (checkMontoHabilitado.rows.length > 0) {
      console.log('   ⏭️  Campo monto_habilitado ya existe');
    } else {
      await client.query(`ALTER TABLE comisiones ADD COLUMN monto_habilitado DECIMAL(15,2) DEFAULT 0`);
      console.log('   ✅ Campo monto_habilitado agregado');
    }

    // es_override
    const checkEsOverride = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'comisiones' AND column_name = 'es_override'
    `);

    if (checkEsOverride.rows.length > 0) {
      console.log('   ⏭️  Campo es_override ya existe');
    } else {
      await client.query(`ALTER TABLE comisiones ADD COLUMN es_override BOOLEAN DEFAULT false`);
      console.log('   ✅ Campo es_override agregado');
    }

    // Crear índices si no existen
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_comisiones_tipo_participante ON comisiones(tipo_participante)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_comisiones_escenario ON comisiones(escenario)`);
    } catch (e) {
      // Índices ya existen
    }

    // Migrar datos existentes
    console.log('   🔄 Migrando datos existentes...');

    await client.query(`
      UPDATE comisiones
      SET tipo_participante = CASE
        WHEN datos_extra->>'split' = 'vendedor' THEN 'vendedor'
        WHEN datos_extra->>'split' = 'owner' THEN 'empresa'
        ELSE 'vendedor'
      END
      WHERE tipo_participante IS NULL
    `);

    await client.query(`
      UPDATE comisiones
      SET snapshot_distribucion = jsonb_build_object(
        'porcentaje_original', porcentaje,
        'monto_original', monto,
        'split_vendedor', split_porcentaje_vendedor,
        'split_owner', split_porcentaje_owner,
        'migrado_de_datos_extra', datos_extra,
        'fecha_migracion', NOW()
      )
      WHERE snapshot_distribucion IS NULL
    `);

    console.log('   ✅ Datos migrados');

    // ============================================
    // MIGRACIÓN 119: Agregar campos cache a ventas
    // ============================================
    console.log('\n📦 Migración 119: Campos cache en ventas');

    // cache_monto_cobrado
    const checkCacheMontoCobrado = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'ventas' AND column_name = 'cache_monto_cobrado'
    `);

    if (checkCacheMontoCobrado.rows.length > 0) {
      console.log('   ⏭️  Campo cache_monto_cobrado ya existe');
    } else {
      await client.query(`ALTER TABLE ventas ADD COLUMN cache_monto_cobrado DECIMAL(15,2) DEFAULT 0`);
      console.log('   ✅ Campo cache_monto_cobrado agregado');
    }

    // cache_porcentaje_cobrado
    const checkCachePorcentaje = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'ventas' AND column_name = 'cache_porcentaje_cobrado'
    `);

    if (checkCachePorcentaje.rows.length > 0) {
      console.log('   ⏭️  Campo cache_porcentaje_cobrado ya existe');
    } else {
      await client.query(`ALTER TABLE ventas ADD COLUMN cache_porcentaje_cobrado DECIMAL(5,2) DEFAULT 0`);
      console.log('   ✅ Campo cache_porcentaje_cobrado agregado');
    }

    // cache_monto_pagado_asesores
    const checkCachePagado = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'ventas' AND column_name = 'cache_monto_pagado_asesores'
    `);

    if (checkCachePagado.rows.length > 0) {
      console.log('   ⏭️  Campo cache_monto_pagado_asesores ya existe');
    } else {
      await client.query(`ALTER TABLE ventas ADD COLUMN cache_monto_pagado_asesores DECIMAL(15,2) DEFAULT 0`);
      console.log('   ✅ Campo cache_monto_pagado_asesores agregado');
    }

    // estado_cobro
    const checkEstadoCobro = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'ventas' AND column_name = 'estado_cobro'
    `);

    if (checkEstadoCobro.rows.length > 0) {
      console.log('   ⏭️  Campo estado_cobro ya existe');
    } else {
      await client.query(`ALTER TABLE ventas ADD COLUMN estado_cobro VARCHAR(50) DEFAULT 'pendiente'`);
      console.log('   ✅ Campo estado_cobro agregado');
    }

    // estado_pagos
    const checkEstadoPagos = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'ventas' AND column_name = 'estado_pagos'
    `);

    if (checkEstadoPagos.rows.length > 0) {
      console.log('   ⏭️  Campo estado_pagos ya existe');
    } else {
      await client.query(`ALTER TABLE ventas ADD COLUMN estado_pagos VARCHAR(50) DEFAULT 'pendiente'`);
      console.log('   ✅ Campo estado_pagos agregado');
    }

    // Crear índices
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_ventas_estado_cobro ON ventas(estado_cobro)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_ventas_estado_pagos ON ventas(estado_pagos)`);
    } catch (e) {
      // Índices ya existen
    }

    // Calcular caches para ventas existentes
    console.log('   🔄 Calculando caches para ventas existentes...');

    // Actualizar cache_monto_pagado_asesores
    await client.query(`
      UPDATE ventas v
      SET cache_monto_pagado_asesores = COALESCE((
        SELECT SUM(p.monto)
        FROM pagos_comisiones p
        JOIN comisiones c ON p.comision_id = c.id
        WHERE c.venta_id = v.id AND p.activo = true
      ), 0)
    `);

    // Actualizar estado_pagos
    await client.query(`
      UPDATE ventas v
      SET estado_pagos = CASE
        WHEN cache_monto_pagado_asesores = 0 OR cache_monto_pagado_asesores IS NULL THEN 'pendiente'
        WHEN cache_monto_pagado_asesores >= COALESCE((
          SELECT SUM(c.monto)
          FROM comisiones c
          WHERE c.venta_id = v.id AND c.tipo_participante != 'empresa' AND c.activo = true
        ), 0) THEN 'pagado'
        ELSE 'parcial'
      END
      WHERE monto_comision > 0 OR monto_comision IS NOT NULL
    `);

    console.log('   ✅ Caches calculados');

    // ============================================
    // RESUMEN
    // ============================================
    console.log('\n✅ Migraciones 116-119 completadas exitosamente\n');

    // Mostrar estadísticas
    const stats = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM ventas_cobros) as cobros,
        (SELECT COUNT(*) FROM ventas_historial) as historial,
        (SELECT COUNT(*) FROM comisiones WHERE tipo_participante IS NOT NULL) as comisiones_migradas,
        (SELECT COUNT(*) FROM ventas WHERE cache_monto_cobrado IS NOT NULL) as ventas_con_cache
    `);

    console.log('📊 Estadísticas:');
    console.log(`   - Tabla ventas_cobros: ${stats.rows[0].cobros} registros`);
    console.log(`   - Tabla ventas_historial: ${stats.rows[0].historial} registros`);
    console.log(`   - Comisiones con tipo_participante: ${stats.rows[0].comisiones_migradas}`);
    console.log(`   - Ventas con campos cache: ${stats.rows[0].ventas_con_cache}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
