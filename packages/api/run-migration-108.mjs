/**
 * Script para ejecutar migración 108: tenant_global_catalogo_preferencias
 * Esta tabla permite toggle de catálogos globales por tenant sin afectar a otros tenants
 */
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('=== Ejecutando migración 108: tenant_global_catalogo_preferencias ===\n');

    // Verificar si ya existe la tabla
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'tenant_global_catalogo_preferencias'
      )
    `);

    if (tableExists.rows[0].exists) {
      console.log('La tabla tenant_global_catalogo_preferencias ya existe.');
      const count = await client.query('SELECT COUNT(*) FROM tenant_global_catalogo_preferencias');
      console.log(`Registros existentes: ${count.rows[0].count}`);
      return;
    }

    // Leer y ejecutar el archivo SQL
    const sqlPath = path.join(__dirname, 'src', 'scripts', '108-tenant-global-catalogo-preferencias.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('Ejecutando SQL...\n');
    await client.query(sql);

    // Verificar resultado
    const prefCount = await client.query('SELECT COUNT(*) FROM tenant_global_catalogo_preferencias');
    console.log(`\n✅ Migración 108 completada exitosamente`);
    console.log(`   Preferencias creadas: ${prefCount.rows[0].count}`);

    // Mostrar desglose por tabla
    const breakdown = await client.query(`
      SELECT tabla, COUNT(*) as count
      FROM tenant_global_catalogo_preferencias
      GROUP BY tabla
    `);
    console.log('\n   Desglose por tabla:');
    for (const row of breakdown.rows) {
      console.log(`   - ${row.tabla}: ${row.count}`);
    }

  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
