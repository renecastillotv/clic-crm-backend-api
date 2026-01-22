/**
 * Script para verificar el estado de un usuario y sus tenants
 *
 * Uso: node check-user-status.mjs [email]
 * Si no se proporciona email, lista todos los usuarios y tenants
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

  try {
    console.log('='.repeat(60));
    console.log('VERIFICACIÓN DE USUARIOS Y TENANTS');
    console.log('='.repeat(60));

    // Listar tenants
    console.log('\n📁 TENANTS DISPONIBLES:');
    const tenantsResult = await pool.query(
      'SELECT id, nombre, slug, activo FROM tenants ORDER BY nombre'
    );

    if (tenantsResult.rows.length === 0) {
      console.log('   ⚠️  No hay tenants en la base de datos');
    } else {
      tenantsResult.rows.forEach(t => {
        console.log(`   - ${t.nombre} (slug: ${t.slug}) ${t.activo ? '✅' : '❌ inactivo'}`);
        console.log(`     ID: ${t.id}`);
      });
    }

    // Si se proporciona email, buscar ese usuario
    if (email) {
      console.log(`\n👤 BUSCANDO USUARIO: ${email}`);

      const userResult = await pool.query(
        `SELECT id, email, nombre, apellido, clerk_id, es_platform_admin, activo
         FROM usuarios WHERE email = $1`,
        [email]
      );

      if (userResult.rows.length === 0) {
        console.log('   ⚠️  Usuario no encontrado en la base de datos');
        console.log('   El usuario debe iniciar sesión para sincronizarse automáticamente.');
      } else {
        const user = userResult.rows[0];
        console.log(`   ✅ Usuario encontrado:`);
        console.log(`      - ID: ${user.id}`);
        console.log(`      - Nombre: ${user.nombre || '(sin nombre)'} ${user.apellido || ''}`);
        console.log(`      - Clerk ID: ${user.clerk_id || '(no sincronizado)'}`);
        console.log(`      - Platform Admin: ${user.es_platform_admin ? 'Sí' : 'No'}`);
        console.log(`      - Activo: ${user.activo ? 'Sí' : 'No'}`);

        // Buscar tenants del usuario
        const userTenantsResult = await pool.query(
          `SELECT t.id, t.nombre, t.slug, ut.es_owner, r.nombre as rol_nombre, r.codigo as rol_codigo
           FROM usuarios_tenants ut
           JOIN tenants t ON ut.tenant_id = t.id
           LEFT JOIN usuarios_roles ur ON ur.usuario_id = ut.usuario_id AND ur.tenant_id = ut.tenant_id
           LEFT JOIN roles r ON ur.rol_id = r.id
           WHERE ut.usuario_id = $1`,
          [user.id]
        );

        if (userTenantsResult.rows.length === 0) {
          console.log('\n   ⚠️  El usuario NO tiene tenants asignados');
          console.log('   Por eso ve el mensaje "Tu cuenta aún no tiene acceso a ningún CRM"');
        } else {
          console.log('\n   📂 TENANTS DEL USUARIO:');
          userTenantsResult.rows.forEach(ut => {
            console.log(`      - ${ut.nombre} (${ut.slug})`);
            console.log(`        Owner: ${ut.es_owner ? 'Sí' : 'No'}, Rol: ${ut.rol_nombre || '(sin rol)'}`);
          });
        }
      }
    } else {
      // Listar todos los usuarios
      console.log('\n👥 USUARIOS EN EL SISTEMA:');
      const usersResult = await pool.query(
        `SELECT u.id, u.email, u.nombre, u.clerk_id, u.es_platform_admin,
                COUNT(ut.tenant_id) as num_tenants
         FROM usuarios u
         LEFT JOIN usuarios_tenants ut ON u.id = ut.usuario_id
         WHERE u.activo = true
         GROUP BY u.id
         ORDER BY u.email`
      );

      if (usersResult.rows.length === 0) {
        console.log('   ⚠️  No hay usuarios en la base de datos');
      } else {
        usersResult.rows.forEach(u => {
          const adminBadge = u.es_platform_admin ? ' [PLATFORM ADMIN]' : '';
          const syncBadge = u.clerk_id ? '' : ' [NO SINCRONIZADO]';
          console.log(`   - ${u.email}${adminBadge}${syncBadge}`);
          console.log(`     Tenants: ${u.num_tenants}`);
        });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Para asignar un usuario a un tenant, usa:');
    console.log('  node assign-user-tenant.mjs <email> <tenant_slug>');
    console.log('Para hacer platform admin a un usuario:');
    console.log('  node make-platform-admin.mjs <email>');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
