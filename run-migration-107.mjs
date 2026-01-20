/**
 * Script para ejecutar la migración 114: Sistema de Disponibilidad para Proyectos
 */

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({ connectionString: DATABASE_URL });

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🔍 Verificando si existe la columna disponibilidad_config...');

    const checkColumn = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'propiedades' AND column_name = 'disponibilidad_config'
    `);

    if (checkColumn.rows.length === 0) {
      console.log('📦 Agregando columna disponibilidad_config a propiedades...');
      await client.query(`
        ALTER TABLE propiedades
        ADD COLUMN disponibilidad_config JSONB
      `);
      console.log('✅ Columna disponibilidad_config agregada');
    } else {
      console.log('✅ La columna disponibilidad_config ya existe');
    }

    // Verificar tabla unidades_proyecto
    console.log('🔍 Verificando si existe la tabla unidades_proyecto...');
    const checkTable = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'unidades_proyecto'
    `);

    if (checkTable.rows.length === 0) {
      console.log('📦 Creando tabla unidades_proyecto...');
      await client.query(`
        CREATE TABLE unidades_proyecto (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          propiedad_id UUID NOT NULL REFERENCES propiedades(id) ON DELETE CASCADE,
          tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          codigo VARCHAR(50) NOT NULL,
          tipologia_id VARCHAR(100),
          tipologia_nombre VARCHAR(255),
          habitaciones INTEGER,
          banos INTEGER,
          m2 DECIMAL(10, 2),
          precio DECIMAL(15, 2),
          moneda VARCHAR(10) DEFAULT 'USD',
          torre VARCHAR(100),
          piso VARCHAR(50),
          nivel VARCHAR(50),
          estado VARCHAR(50) DEFAULT 'disponible',
          fecha_reserva TIMESTAMP,
          fecha_venta TIMESTAMP,
          reservado_por UUID,
          vendido_a UUID,
          notas TEXT,
          orden INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ Tabla unidades_proyecto creada');

      // Crear índices
      console.log('📦 Creando índices...');
      await client.query(`CREATE INDEX idx_unidades_propiedad ON unidades_proyecto(propiedad_id)`);
      await client.query(`CREATE INDEX idx_unidades_tenant ON unidades_proyecto(tenant_id)`);
      await client.query(`CREATE INDEX idx_unidades_estado ON unidades_proyecto(estado)`);
      await client.query(`CREATE INDEX idx_unidades_propiedad_codigo ON unidades_proyecto(propiedad_id, codigo)`);
      await client.query(`CREATE UNIQUE INDEX idx_unidades_codigo_unico ON unidades_proyecto(propiedad_id, codigo)`);
      console.log('✅ Índices creados');
    } else {
      console.log('✅ La tabla unidades_proyecto ya existe');
    }

    console.log('✅ Migración 114 completada exitosamente');

  } catch (error) {
    console.error('❌ Error en migración:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
