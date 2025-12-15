/**
 * Script manual para agregar el campo etiquetas a propiedades
 */
import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
const isNeon = connectionString?.includes('neon.tech');

const pool = new Pool({
  connectionString,
  ssl: isNeon ? { rejectUnauthorized: false } : false
});

async function main() {
  const client = await pool.connect();

  try {
    // 1. Verificar si la columna ya existe
    const checkColumn = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'propiedades' AND column_name = 'etiquetas'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('✅ Columna etiquetas ya existe en propiedades');
      return;
    }

    // 2. Agregar la columna
    console.log('Agregando columna etiquetas...');
    await client.query(`
      ALTER TABLE propiedades
      ADD COLUMN etiquetas JSONB DEFAULT '[]'::jsonb
    `);
    console.log('✅ Columna etiquetas agregada');

    // 3. Migrar datos existentes
    console.log('Migrando datos de destacada/exclusiva...');
    await client.query(`
      UPDATE propiedades
      SET etiquetas = COALESCE(
        (
          SELECT jsonb_agg(etiqueta)
          FROM (
            SELECT 'destacada' as etiqueta WHERE propiedades.destacada = true
            UNION ALL
            SELECT 'exclusiva' as etiqueta WHERE propiedades.exclusiva = true
          ) subquery
          WHERE etiqueta IS NOT NULL
        ),
        '[]'::jsonb
      )
    `);
    console.log('✅ Datos migrados');

    // 4. Crear índice GIN
    console.log('Creando índice GIN...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_propiedades_etiquetas
      ON propiedades USING GIN (etiquetas)
    `);
    console.log('✅ Índice creado');

    // 5. Verificar
    const result = await client.query(`
      SELECT COUNT(*) as total,
             COUNT(*) FILTER (WHERE etiquetas != '[]') as con_etiquetas
      FROM propiedades
    `);
    console.log(`\n📊 Resultado:`);
    console.log(`   Total propiedades: ${result.rows[0].total}`);
    console.log(`   Con etiquetas: ${result.rows[0].con_etiquetas}`);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
