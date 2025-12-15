/**
 * Script para ejecutar migración 097: tenant_catalogo_preferencias
 */
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL;
const isLocalhost = dbUrl?.includes('localhost') || dbUrl?.includes('127.0.0.1');

const pool = new Pool({
  connectionString: dbUrl,
  ssl: isLocalhost ? false : { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Ejecutando migración 097: tenant_catalogo_preferencias...\n');

    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'src/scripts/097-tenant-catalogo-preferencias.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Ejecutar
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    console.log('✅ Migración completada exitosamente\n');

    // Verificar
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'tenant_catalogo_preferencias'
      )
    `);
    console.log('📋 Tabla creada:', tableCheck.rows[0].exists);

    // Contar preferencias migradas
    const prefCount = await client.query('SELECT COUNT(*) FROM tenant_catalogo_preferencias');
    console.log('📊 Preferencias migradas:', prefCount.rows[0].count);

    // Contar catalogos restantes por tenant
    const tenantCats = await client.query(`
      SELECT COUNT(*) as count FROM catalogos WHERE tenant_id IS NOT NULL
    `);
    console.log('📁 Catálogos de tenant restantes (personalizaciones propias):', tenantCats.rows[0].count);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error en migración:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
