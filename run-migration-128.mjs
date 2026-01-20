// Script para ejecutar la migración 128
import pg from 'pg';
const { Pool } = pg;

import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const client = await pool.connect();

  try {
    // Verificar si las columnas ya existen
    const checkResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'tenant_api_credentials'
      AND column_name = 'alterestate_api_key_encrypted'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✅ Las columnas ya existen, saltando migración');
      return;
    }

    console.log('🔄 Ejecutando migración 128...');

    // Agregar columnas de Alterestate
    await client.query(`
      ALTER TABLE tenant_api_credentials
      ADD COLUMN IF NOT EXISTS alterestate_api_key_encrypted TEXT,
      ADD COLUMN IF NOT EXISTS alterestate_connected BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS alterestate_last_sync_at TIMESTAMP
    `);

    // Agregar columnas de EasyBroker
    await client.query(`
      ALTER TABLE tenant_api_credentials
      ADD COLUMN IF NOT EXISTS easybroker_api_key_encrypted TEXT,
      ADD COLUMN IF NOT EXISTS easybroker_connected BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS easybroker_last_sync_at TIMESTAMP
    `);

    console.log('✅ Migración 128 completada');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
