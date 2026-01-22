/**
 * Script de diagnóstico para verificar un usuario y sus permisos
 *
 * Uso: node diagnose-user.mjs <email_o_clerk_id>
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
  const search = process.argv[2];

  if (!search) {
    console.log('Uso: node diagnose-user.mjs <email_o_clerk_id>');
    process.exit(1);
  }

  try {
    console.log('='.repeat(70));
    console.log('DIAGNÓSTICO DE USUARIO');
    console.log('='.repeat(70));

    // Buscar usuario por email o clerk_id
    const userResult = await pool.query(
      `SELECT id, email, nombre, apellido, clerk_id, es_platform_admin, activo
       FROM usuarios
       WHERE email = $1 OR clerk_id = $1`,
      [search]
    );

    if (userResult.rows.length === 0) {
      console.log(`\n❌ Usuario no encontrado: ${search}`);

      // Listar todos los clerk_ids para comparar
      console.log('\n📋 Usuarios con clerk_id en la BD:');
      const allUsers = await pool.query(
        `SELECT email, clerk_id FROM usuarios WHERE clerk_id IS NOT NULL ORDER BY email`
      );
      allUsers.rows.forEach(u => {
        console.log(`   - ${u.email}: ${u.clerk_id}`);
      });

      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log(`\n✅ USUARIO ENCONTRADO:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Nombre: ${user.nombre || '(sin nombre)'} ${user.apellido || ''}`);
    console.log(`   Clerk ID: ${user.clerk_id || '❌ NO SINCRONIZADO'}`);
    console.log(`   Platform Admin: ${user.es_platform_admin ? '✅ Sí' : 'No'}`);
    console.log(`   Activo: ${user.activo ? '✅ Sí' : '❌ No'}`);

    // Buscar tenants del usuario
    console.log('\n📂 TENANTS DEL USUARIO:');
    const tenantsResult = await pool.query(
      `SELECT t.id, t.nombre, t.slug, ut.es_owner, ut.activo
       FROM usuarios_tenants ut
       JOIN tenants t ON ut.tenant_id = t.id
       WHERE ut.usuario_id = $1`,
      [user.id]
    );

    if (tenantsResult.rows.length === 0) {
      console.log('   ❌ No tiene tenants asignados');
    } else {
      for (const tenant of tenantsResult.rows) {
        console.log(`\n   📁 ${tenant.nombre} (${tenant.slug})`);
        console.log(`      Owner: ${tenant.es_owner ? '✅ Sí' : 'No'}`);
        console.log(`      Activo: ${tenant.activo ? '✅ Sí' : '❌ No'}`);

        // Buscar roles en este tenant
        const rolesResult = await pool.query(
          `SELECT r.id, r.codigo, r.nombre
           FROM usuarios_roles ur
           JOIN roles r ON ur.rol_id = r.id
           WHERE ur.usuario_id = $1 AND ur.tenant_id = $2 AND ur.activo = true`,
          [user.id, tenant.id]
        );

        if (rolesResult.rows.length === 0) {
          console.log('      ❌ SIN ROLES ASIGNADOS');
        } else {
          console.log('      Roles:');
          for (const role of rolesResult.rows) {
            console.log(`         - ${role.nombre} (${role.codigo})`);

            // Contar módulos de este rol
            const modulosCount = await pool.query(
              `SELECT COUNT(*) as total FROM roles_modulos WHERE rol_id = $1 AND puede_ver = true`,
              [role.id]
            );
            console.log(`           Módulos con acceso: ${modulosCount.rows[0].total}`);
          }
        }

        // Verificar módulos accesibles
        const modulosResult = await pool.query(
          `SELECT DISTINCT m.nombre, m.categoria
           FROM usuarios_roles ur
           JOIN roles_modulos rm ON ur.rol_id = rm.rol_id
           JOIN modulos m ON rm.modulo_id = m.id
           WHERE ur.usuario_id = $1
             AND ur.tenant_id = $2
             AND ur.activo = true
             AND rm.puede_ver = true
             AND m.activo = true
           ORDER BY m.categoria, m.nombre`,
          [user.id, tenant.id]
        );

        console.log(`      Módulos accesibles: ${modulosResult.rows.length}`);
        if (modulosResult.rows.length > 0 && modulosResult.rows.length <= 10) {
          modulosResult.rows.forEach(m => {
            console.log(`         - [${m.categoria}] ${m.nombre}`);
          });
        }
      }
    }

    // Verificar si hay problema de clerk_id duplicado
    console.log('\n🔍 VERIFICACIÓN DE CLERK_ID:');
    if (user.clerk_id) {
      const duplicates = await pool.query(
        `SELECT id, email FROM usuarios WHERE clerk_id = $1`,
        [user.clerk_id]
      );
      if (duplicates.rows.length > 1) {
        console.log('   ⚠️  CLERK_ID DUPLICADO en múltiples usuarios:');
        duplicates.rows.forEach(u => console.log(`      - ${u.email} (${u.id})`));
      } else {
        console.log('   ✅ Clerk ID único');
      }
    }

    console.log('\n' + '='.repeat(70));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
