import { pool } from './src/config/database';

async function cleanTenantsRutasConfig() {
  console.log('=== Vaciando tenants_rutas_config (OBSOLETA) ===\n');
  const client = await pool.connect();

  try {
    // Ver cuántos registros hay
    const count = await client.query('SELECT COUNT(*) FROM tenants_rutas_config');
    console.log(`Registros actuales: ${count.rows[0].count}`);

    // Vaciar la tabla
    await client.query('DELETE FROM tenants_rutas_config');
    console.log('\n✅ Tabla tenants_rutas_config vaciada');

    // Verificar
    const newCount = await client.query('SELECT COUNT(*) FROM tenants_rutas_config');
    console.log(`Registros después: ${newCount.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanTenantsRutasConfig();
