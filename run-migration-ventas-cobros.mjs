/**
 * Migración para asegurar que existan las tablas ventas_cobros y ventas_historial
 */

import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();

  try {
    console.log('Verificando y creando tablas...\n');

    // 1. Verificar si existe la tabla ventas_cobros
    const checkCobros = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'ventas_cobros'
      );
    `);

    if (!checkCobros.rows[0].exists) {
      console.log('Creando tabla ventas_cobros...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS ventas_cobros (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,

          -- Monto del cobro
          monto DECIMAL(15,2) NOT NULL,
          moneda VARCHAR(3) DEFAULT 'USD',

          -- Información del cobro
          fecha_cobro DATE NOT NULL,
          metodo_pago VARCHAR(50),
          referencia VARCHAR(100),
          banco VARCHAR(100),

          -- Documentación
          recibo_url VARCHAR(500),
          notas TEXT,

          -- Auditoría
          registrado_por_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
          fecha_registro TIMESTAMP DEFAULT NOW(),

          -- Control
          activo BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_ventas_cobros_tenant ON ventas_cobros(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_ventas_cobros_venta ON ventas_cobros(venta_id);
        CREATE INDEX IF NOT EXISTS idx_ventas_cobros_fecha ON ventas_cobros(fecha_cobro);
        CREATE INDEX IF NOT EXISTS idx_ventas_cobros_activo ON ventas_cobros(activo);
      `);
      console.log('✅ Tabla ventas_cobros creada');
    } else {
      console.log('✅ Tabla ventas_cobros ya existe');
    }

    // 2. Verificar si existe la tabla ventas_historial
    const checkHistorial = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'ventas_historial'
      );
    `);

    if (!checkHistorial.rows[0].exists) {
      console.log('Creando tabla ventas_historial...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS ventas_historial (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,

          -- Tipo de cambio
          tipo_cambio VARCHAR(50) NOT NULL,
          entidad VARCHAR(50),
          entidad_id UUID,

          -- Datos del cambio
          datos_anteriores JSONB,
          datos_nuevos JSONB,
          descripcion TEXT,

          -- Auditoría
          usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
          usuario_nombre VARCHAR(200),
          ip_address VARCHAR(50),
          user_agent TEXT,

          -- Control
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_ventas_historial_tenant ON ventas_historial(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_ventas_historial_venta ON ventas_historial(venta_id);
        CREATE INDEX IF NOT EXISTS idx_ventas_historial_tipo ON ventas_historial(tipo_cambio);
        CREATE INDEX IF NOT EXISTS idx_ventas_historial_fecha ON ventas_historial(created_at);
      `);
      console.log('✅ Tabla ventas_historial creada');
    } else {
      console.log('✅ Tabla ventas_historial ya existe');
    }

    // 3. Verificar campos de cache en ventas
    console.log('\nVerificando campos de cache en ventas...');

    const cacheFields = [
      { name: 'cache_monto_cobrado', type: 'DECIMAL(15,2) DEFAULT 0' },
      { name: 'cache_porcentaje_cobrado', type: 'DECIMAL(5,2) DEFAULT 0' },
      { name: 'estado_cobro', type: "VARCHAR(20) DEFAULT 'pendiente'" },
      { name: 'cache_monto_pagado_asesores', type: 'DECIMAL(15,2) DEFAULT 0' },
      { name: 'estado_pagos', type: "VARCHAR(20) DEFAULT 'pendiente'" }
    ];

    for (const field of cacheFields) {
      const checkField = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = 'ventas' AND column_name = $1
        );
      `, [field.name]);

      if (!checkField.rows[0].exists) {
        console.log(`  Agregando campo ${field.name}...`);
        await client.query(`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS ${field.name} ${field.type}`);
        console.log(`  ✅ Campo ${field.name} agregado`);
      } else {
        console.log(`  ✅ Campo ${field.name} ya existe`);
      }
    }

    console.log('\n✅ Todas las migraciones completadas');

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
