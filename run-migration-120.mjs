/**
 * Script para ejecutar la migración 120
 * Agrega campos unidad_id y captador_id a la tabla ventas
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Ejecutando migración 120: Agregar campos de participantes a ventas\n');

    // Verificar si las columnas ya existen
    const checkColumns = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'ventas'
        AND column_name IN ('unidad_id', 'captador_id')
    `);

    const existingColumns = checkColumns.rows.map(r => r.column_name);
    console.log('Columnas existentes:', existingColumns.length > 0 ? existingColumns.join(', ') : 'ninguna');

    // Agregar columnas si no existen
    if (!existingColumns.includes('unidad_id')) {
      await client.query(`
        ALTER TABLE ventas
        ADD COLUMN unidad_id UUID NULL
      `);
      console.log('✓ Columna unidad_id agregada');
    } else {
      console.log('ℹ Columna unidad_id ya existe');
    }

    if (!existingColumns.includes('captador_id')) {
      await client.query(`
        ALTER TABLE ventas
        ADD COLUMN captador_id UUID NULL REFERENCES usuarios(id) ON DELETE SET NULL
      `);
      console.log('✓ Columna captador_id agregada');
    } else {
      console.log('ℹ Columna captador_id ya existe');
    }

    // Crear índices si no existen
    const checkIndices = await client.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'ventas'
        AND indexname IN ('idx_ventas_unidad', 'idx_ventas_captador')
    `);

    const existingIndices = checkIndices.rows.map(r => r.indexname);

    if (!existingIndices.includes('idx_ventas_unidad')) {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_ventas_unidad ON ventas(unidad_id) WHERE unidad_id IS NOT NULL
      `);
      console.log('✓ Índice idx_ventas_unidad creado');
    } else {
      console.log('ℹ Índice idx_ventas_unidad ya existe');
    }

    if (!existingIndices.includes('idx_ventas_captador')) {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_ventas_captador ON ventas(captador_id) WHERE captador_id IS NOT NULL
      `);
      console.log('✓ Índice idx_ventas_captador creado');
    } else {
      console.log('ℹ Índice idx_ventas_captador ya existe');
    }

    console.log('\n✅ Migración 120 completada exitosamente');

  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
