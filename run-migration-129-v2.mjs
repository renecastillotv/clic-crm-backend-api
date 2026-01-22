// Run migration 129: Add asesor_default_id to tenants
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if column already exists
    const checkCol = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'tenants' AND column_name = 'asesor_default_id'
    `);

    if (checkCol.rows.length > 0) {
      console.log('⚠️ Column asesor_default_id already exists');
    } else {
      // Add column
      await client.query(`
        ALTER TABLE tenants
        ADD COLUMN asesor_default_id UUID REFERENCES perfiles_asesor(id) ON DELETE SET NULL
      `);
      console.log('✅ Column asesor_default_id added to tenants');

      // Create index
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_tenants_asesor_default ON tenants(asesor_default_id)
      `);
      console.log('✅ Index created');
    }

    // For each tenant with active asesores, assign the first one as default
    const updateResult = await client.query(`
      UPDATE tenants t
      SET asesor_default_id = (
        SELECT pa.id
        FROM perfiles_asesor pa
        INNER JOIN usuarios u ON pa.usuario_id = u.id
        WHERE pa.tenant_id = t.id
          AND pa.activo = true
          AND pa.visible_en_web = true
          AND u.activo = true
        ORDER BY pa.created_at ASC
        LIMIT 1
      )
      WHERE asesor_default_id IS NULL
        AND EXISTS (
          SELECT 1
          FROM perfiles_asesor pa
          INNER JOIN usuarios u ON pa.usuario_id = u.id
          WHERE pa.tenant_id = t.id
            AND pa.activo = true
            AND pa.visible_en_web = true
            AND u.activo = true
        )
    `);
    console.log(`✅ Default asesores assigned for ${updateResult.rowCount} tenants`);

    await client.query('COMMIT');
    console.log('✅ Migration completed successfully');

    // Show current state
    const result = await client.query(`
      SELECT t.nombre, t.asesor_default_id,
        CONCAT(u.nombre, ' ', u.apellido) as asesor_nombre
      FROM tenants t
      LEFT JOIN perfiles_asesor pa ON t.asesor_default_id = pa.id
      LEFT JOIN usuarios u ON pa.usuario_id = u.id
    `);
    console.log('\nCurrent tenant asesor defaults:');
    result.rows.forEach(r => {
      console.log(`  - ${r.nombre}: ${r.asesor_nombre || '(none)'}`);
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
