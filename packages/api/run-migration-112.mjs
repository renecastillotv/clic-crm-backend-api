import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('=== Migración 113: Crear tabla propuestas_propiedades ===\n');

    // Verificar si la tabla ya existe
    console.log('1. Verificando si la tabla ya existe...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'propuestas_propiedades'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('   La tabla propuestas_propiedades ya existe');
      return;
    }

    // Crear tabla propuestas_propiedades
    console.log('\n2. Creando tabla propuestas_propiedades...');
    await client.query(`
      CREATE TABLE propuestas_propiedades (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        propuesta_id UUID NOT NULL REFERENCES propuestas(id) ON DELETE CASCADE,
        propiedad_id UUID NOT NULL REFERENCES propiedades(id) ON DELETE CASCADE,
        orden INTEGER DEFAULT 0,
        notas TEXT,
        precio_especial DECIMAL(15, 2),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(propuesta_id, propiedad_id)
      )
    `);
    console.log('   Tabla creada exitosamente');

    // Crear índices
    console.log('\n3. Creando índices...');
    await client.query(`
      CREATE INDEX idx_propuestas_propiedades_propuesta ON propuestas_propiedades(propuesta_id);
      CREATE INDEX idx_propuestas_propiedades_propiedad ON propuestas_propiedades(propiedad_id);
    `);
    console.log('   Índices creados');

    // Migrar datos existentes
    console.log('\n4. Migrando datos existentes...');
    const migrateResult = await client.query(`
      INSERT INTO propuestas_propiedades (propuesta_id, propiedad_id, orden)
      SELECT id, propiedad_id, 0
      FROM propuestas
      WHERE propiedad_id IS NOT NULL
      ON CONFLICT DO NOTHING
    `);
    console.log(`   ${migrateResult.rowCount} registros migrados desde propiedad_id existentes`);

    console.log('\n=== Migración 113 completada exitosamente ===');
  } catch (error) {
    console.error('Error en migración:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
