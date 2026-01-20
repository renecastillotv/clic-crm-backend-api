import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL;
const isLocal = dbUrl?.includes('localhost') || dbUrl?.includes('127.0.0.1');

const pool = new Pool({
  connectionString: dbUrl,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Verificando columnas en university_certificados_emitidos...');

    // Verificar qué columnas existen
    const columns = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'university_certificados_emitidos'
    `);
    const existingColumns = columns.rows.map(r => r.column_name);
    console.log('Columnas existentes:', existingColumns);

    // Agregar url_pdf si no existe
    if (!existingColumns.includes('url_pdf')) {
      console.log('Agregando columna url_pdf...');
      await client.query(`
        ALTER TABLE university_certificados_emitidos
        ADD COLUMN url_pdf VARCHAR(500)
      `);
      console.log('✅ url_pdf agregada');
    } else {
      console.log('url_pdf ya existe');
    }

    // Agregar curso_titulo si no existe (para redundancia/performance)
    if (!existingColumns.includes('curso_titulo')) {
      console.log('Agregando columna curso_titulo...');
      await client.query(`
        ALTER TABLE university_certificados_emitidos
        ADD COLUMN curso_titulo VARCHAR(255)
      `);
      console.log('✅ curso_titulo agregada');
    } else {
      console.log('curso_titulo ya existe');
    }

    console.log('✅ Migración completada');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
