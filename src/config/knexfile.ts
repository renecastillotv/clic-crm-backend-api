import type { Knex } from 'knex';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Función para obtener la configuración de conexión
function getConnection() {
  if (!process.env.DATABASE_URL) {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'neondb',
      ssl: {
        rejectUnauthorized: false,
      },
    };
  }

  const dbUrl = process.env.DATABASE_URL;
  
  // Para Neon y otras bases de datos que requieren SSL
  // Usar connectionString como objeto con SSL configurado
  return {
    connectionString: dbUrl,
    ssl: dbUrl.includes('neon.tech') || dbUrl.includes('sslmode=require') 
      ? { rejectUnauthorized: false }
      : false,
  };
}

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'postgresql',
    connection: getConnection(),
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: path.join(__dirname, '../database/migrations'),
      extension: 'ts',
    },
    seeds: {
      directory: path.join(__dirname, '../database/seeds'),
      extension: 'ts',
    },
  },

  production: {
    client: 'postgresql',
    connection: getConnection(),
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: '../database/migrations',
      extension: 'ts',
    },
  },
};

export default config;
