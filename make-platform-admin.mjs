/**
 * Script para hacer a un usuario Platform Admin
 *
 * Uso: node make-platform-admin.mjs <email>
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.log('Uso: node make-platform-admin.mjs <email>');
    process.exit(1);
  }

  try {
    console.log(`🔍 Buscando usuario: ${email}`);

    // Buscar usuario
    const userResult = await pool.query(
      'SELECT id, email, nombre, es_platform_admin FROM usuarios WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      console.log('❌ Usuario no encontrado');
      console.log('El usuario debe iniciar sesión primero para sincronizarse.');
      process.exit(1);
    }

    const user = userResult.rows[0];

    if (user.es_platform_admin) {
      console.log('✅ El usuario ya es Platform Admin');
      process.exit(0);
    }

    // Hacer platform admin
    await pool.query(
      'UPDATE usuarios SET es_platform_admin = true WHERE id = $1',
      [user.id]
    );

    console.log(`✅ ${email} ahora es Platform Admin`);
    console.log('El usuario puede acceder a /admin para gestionar la plataforma.');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
