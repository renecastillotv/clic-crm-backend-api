import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function runMigration114() {
  const client = await pool.connect();
  try {
    console.log('=== Migración 114: Sistema de Disponibilidad para Proyectos ===\n');

    // 1. Agregar campo disponibilidad_config a propiedades
    console.log('1. Agregando campo disponibilidad_config a propiedades...');
    await client.query(`
      ALTER TABLE propiedades
      ADD COLUMN IF NOT EXISTS disponibilidad_config JSONB
    `);
    console.log('   ✓ Campo disponibilidad_config agregado');

    // 2. Verificar si la tabla ya existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'unidades_proyecto'
      )
    `);

    if (tableCheck.rows[0].exists) {
      console.log('\n2. La tabla unidades_proyecto ya existe, saltando...');
    } else {
      console.log('\n2. Creando tabla unidades_proyecto...');

      await client.query(`
        CREATE TABLE unidades_proyecto (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          propiedad_id UUID NOT NULL REFERENCES propiedades(id) ON DELETE CASCADE,
          tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

          -- Identificación
          codigo VARCHAR(50) NOT NULL,
          tipologia_id VARCHAR(100),
          tipologia_nombre VARCHAR(255),

          -- Características
          habitaciones INTEGER,
          banos INTEGER,
          m2 DECIMAL(10,2),
          precio DECIMAL(15,2),
          moneda VARCHAR(10) DEFAULT 'USD',

          -- Ubicación
          torre VARCHAR(100),
          piso VARCHAR(50),
          nivel VARCHAR(50),

          -- Estado
          estado VARCHAR(50) DEFAULT 'disponible',

          -- Tracking
          fecha_reserva TIMESTAMP,
          fecha_venta TIMESTAMP,
          reservado_por UUID,
          vendido_a UUID,

          -- Notas
          notas TEXT,
          orden INTEGER DEFAULT 0,

          -- Timestamps
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('   ✓ Tabla creada');

      // Índices
      console.log('\n3. Creando índices...');
      await client.query(`CREATE INDEX idx_unidades_propiedad ON unidades_proyecto(propiedad_id)`);
      await client.query(`CREATE INDEX idx_unidades_tenant ON unidades_proyecto(tenant_id)`);
      await client.query(`CREATE INDEX idx_unidades_estado ON unidades_proyecto(estado)`);
      await client.query(`CREATE INDEX idx_unidades_propiedad_codigo ON unidades_proyecto(propiedad_id, codigo)`);
      await client.query(`CREATE UNIQUE INDEX idx_unidades_codigo_unico ON unidades_proyecto(propiedad_id, codigo)`);
      console.log('   ✓ Índices creados');
    }

    // 4. Verificar estructura
    console.log('\n=== VERIFICACIÓN ===');

    const propCols = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'propiedades' AND column_name = 'disponibilidad_config'
    `);
    console.log('\nCampo en propiedades:');
    propCols.rows.forEach(r => console.log(`  - ${r.column_name}: ${r.data_type}`));

    const unidadesCols = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'unidades_proyecto'
      ORDER BY ordinal_position
    `);
    console.log('\nColumnas en unidades_proyecto:');
    unidadesCols.rows.forEach(r => console.log(`  - ${r.column_name}: ${r.data_type}`));

    console.log('\n✅ Migración 114 completada exitosamente');

  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration114().catch(console.error);
