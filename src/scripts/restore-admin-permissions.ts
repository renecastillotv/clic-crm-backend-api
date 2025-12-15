/**
 * Script para restaurar permisos de administrador de plataforma
 * Usuario: renecastillotv@gmail.com
 */

import { query } from '../utils/db.js';

const EMAIL_USUARIO = 'renecastillotv@gmail.com';

async function restaurarPermisosAdmin() {
  console.log('🔧 Restaurando permisos de administrador de plataforma...\n');
  console.log(`📧 Usuario: ${EMAIL_USUARIO}\n`);

  try {
    // 1. Actualizar flag es_platform_admin
    console.log('1️⃣ Actualizando permisos de platform admin...');
    const updateResult = await query(
      `UPDATE usuarios
       SET es_platform_admin = true,
           activo = true,
           updated_at = NOW()
       WHERE email = $1
       RETURNING id, email, clerk_id, es_platform_admin, activo`,
      [EMAIL_USUARIO]
    );

    if (updateResult.rows.length === 0) {
      console.error('❌ Usuario no encontrado en la base de datos');
      process.exit(1);
    }

    console.log('✅ Permisos de platform admin actualizados:');
    console.log(JSON.stringify(updateResult.rows[0], null, 2));
    console.log('');

    // 2. Verificar el resultado final
    console.log('2️⃣ Verificando resultado final...');
    const verifyResult = await query(
      `SELECT id, email, clerk_id, es_platform_admin, activo
       FROM usuarios
       WHERE email = $1`,
      [EMAIL_USUARIO]
    );

    console.log('✅ Estado final del usuario:');
    console.log(JSON.stringify(verifyResult.rows[0], null, 2));
    console.log('');

    console.log('✅ Permisos restaurados exitosamente!');
    console.log('');
    console.log('👉 Por favor, recarga la aplicación en el navegador para que los cambios surtan efecto.');

  } catch (error: any) {
    console.error('❌ Error al restaurar permisos:', error.message);
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

restaurarPermisosAdmin();
