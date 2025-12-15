import { pool } from './src/config/database';

async function checkRutasConfig() {
  console.log('=== Verificando tenants_rutas_config ===\n');
  const client = await pool.connect();
  try {
    // Check table structure
    const structure = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'tenants_rutas_config'
      ORDER BY ordinal_position
    `);
    console.log('Columnas de tenants_rutas_config:');
    for (const col of structure.rows) {
      console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    }

    // Check data count
    const count = await client.query(`SELECT COUNT(*) FROM tenants_rutas_config`);
    console.log(`\nTotal registros: ${count.rows[0].count}`);

    if (count.rows[0].count > 0) {
      // Show all records
      const records = await client.query(`
        SELECT * FROM tenants_rutas_config ORDER BY prefijo
      `);
      console.log('\nRegistros:');
      for (const rec of records.rows) {
        console.log(`  - prefijo: ${rec.prefijo}, habilitado: ${rec.habilitado}`);
      }
    }

    // Check if data was populated
    const hasData = await client.query(`
      SELECT COUNT(*) FROM tenants_rutas_config WHERE habilitado = true
    `);
    console.log(`\nRutas habilitadas: ${hasData.rows[0].count}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}
checkRutasConfig();
