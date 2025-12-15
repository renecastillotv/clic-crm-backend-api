import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Configuración del pool de conexiones
const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('127.0.0.1')
    ? false
    : {
        rejectUnauthorized: false,
      },
  max: 20, // Máximo de conexiones en el pool
  idleTimeoutMillis: 30000, // Tiempo de espera antes de cerrar conexiones inactivas
  connectionTimeoutMillis: 10000, // Tiempo de espera para obtener una conexión del pool (aumentado a 10s)
};

// Crear el pool de conexiones
export const pool = new Pool(poolConfig);

// Manejar errores del pool
pool.on('error', (err) => {
  // No hacer exit si no hay DATABASE_URL configurada (modo sin BD)
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️  Error en el pool de conexiones (DATABASE_URL no configurada):', err.message);
    return;
  }
  // Solo hacer exit si hay una conexión establecida que falla inesperadamente
  console.error('❌ Error inesperado en el pool de conexiones:', err.message);
  // No hacer exit automático, permitir que la app continúe
});

// Función para probar la conexión
export async function testConnection(): Promise<boolean> {
  // Si no hay DATABASE_URL configurada, no intentar conectar
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL no está configurada. La aplicación funcionará sin base de datos.');
    return false;
  }

  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Conexión a la base de datos exitosa');
    console.log('📅 Fecha del servidor:', result.rows[0].now);
    return true;
  } catch (error: any) {
    // Si es un error de timeout o conexión, solo mostrar advertencia en desarrollo
    if (error.message?.includes('timeout') || error.message?.includes('ECONNREFUSED')) {
      console.warn('⚠️  No se pudo conectar a la base de datos. La API funcionará pero algunas funciones estarán limitadas.');
      console.warn('   Para habilitar la base de datos, configura DATABASE_URL en un archivo .env');
      return false;
    }
    console.error('❌ Error al conectar con la base de datos:', error.message || error);
    return false;
  }
}

// Función para cerrar el pool (útil para tests o shutdown)
export async function closePool(): Promise<void> {
  await pool.end();
  console.log('Pool de conexiones cerrado');
}


