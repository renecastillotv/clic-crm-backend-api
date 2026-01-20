// Script para hacer usuario_id nullable en university_inscripciones
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
    console.log('Haciendo usuario_id nullable en university_inscripciones...');

    await client.query(`
      ALTER TABLE university_inscripciones
      ALTER COLUMN usuario_id DROP NOT NULL;
    `);

    console.log('✅ Migración completada: usuario_id ahora es nullable');
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    if (error.message.includes('does not exist')) {
      console.log('La columna o tabla puede no existir');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
