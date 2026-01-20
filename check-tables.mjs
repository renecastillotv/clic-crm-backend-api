import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function runMigration113() {
  const client = await pool.connect();
  try {
    console.log('Ejecutando migración 113: Campos de comisiones en redes...\n');

    // Agregar campos a propiedades
    console.log('Agregando campos a propiedades...');

    await client.query(`ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS red_afiliados_terminos TEXT`);
    await client.query(`ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS red_afiliados_comision NUMERIC(10,2)`);
    await client.query(`ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS connect_terminos TEXT`);
    await client.query(`ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS connect_comision NUMERIC(10,2)`);

    console.log('✅ Campos agregados a propiedades');

    // Agregar campos a tenants
    console.log('\nAgregando campos a tenants...');

    await client.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS red_global_porcentaje_default NUMERIC(10,2) DEFAULT 50`);
    await client.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS red_afiliados_terminos_default TEXT`);
    await client.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS red_afiliados_porcentaje_default NUMERIC(10,2) DEFAULT 50`);
    await client.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS connect_porcentaje_default NUMERIC(10,2) DEFAULT 50`);

    console.log('✅ Campos agregados a tenants');

    // Verificar campos creados
    console.log('\n=== VERIFICACIÓN ===');

    const propCols = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'propiedades'
      AND (column_name LIKE '%comision%' OR column_name LIKE '%terminos%' OR column_name = 'share_commission')
      ORDER BY column_name
    `);
    console.log('\nCampos de comisiones en propiedades:');
    propCols.rows.forEach(r => console.log('  - ' + r.column_name + ': ' + r.data_type));

    const tenantCols = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'tenants'
      AND (column_name LIKE '%comision%' OR column_name LIKE '%porcentaje%' OR column_name LIKE '%terminos%')
      ORDER BY column_name
    `);
    console.log('\nCampos de defaults en tenants:');
    tenantCols.rows.forEach(r => console.log('  - ' + r.column_name + ': ' + r.data_type));

    console.log('\n✅ Migración 113 completada exitosamente');

  } catch (error) {
    console.error('❌ Error en migración:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration113();
