/**
 * Script para asignar un usuario a un tenant como owner
 *
 * Uso: node assign-user-tenant.mjs <email> <tenant_slug>
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
  const tenantSlug = process.argv[3];

  if (!email || !tenantSlug) {
    console.log('Uso: node assign-user-tenant.mjs <email> <tenant_slug>');
    console.log('\nPara ver usuarios y tenants disponibles:');
    console.log('  node check-user-status.mjs');
    process.exit(1);
  }

  try {
    console.log(`🔍 Buscando usuario: ${email}`);
    console.log(`🔍 Buscando tenant: ${tenantSlug}`);

    // Buscar usuario
    const userResult = await pool.query(
      'SELECT id, email FROM usuarios WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      console.log('❌ Usuario no encontrado');
      console.log('El usuario debe iniciar sesión primero para sincronizarse.');
      process.exit(1);
    }

    const user = userResult.rows[0];

    // Buscar tenant
    const tenantResult = await pool.query(
      'SELECT id, nombre, slug FROM tenants WHERE slug = $1',
      [tenantSlug]
    );

    if (tenantResult.rows.length === 0) {
      console.log('❌ Tenant no encontrado');
      console.log('Verifica el slug del tenant con: node check-user-status.mjs');
      process.exit(1);
    }

    const tenant = tenantResult.rows[0];

    // Verificar si ya existe la relación
    const existsResult = await pool.query(
      'SELECT 1 FROM usuarios_tenants WHERE usuario_id = $1 AND tenant_id = $2',
      [user.id, tenant.id]
    );

    if (existsResult.rows.length > 0) {
      console.log('✅ El usuario ya está asignado a este tenant');
      process.exit(0);
    }

    // Asignar usuario al tenant como owner
    await pool.query(
      `INSERT INTO usuarios_tenants (usuario_id, tenant_id, es_owner, activo, created_at)
       VALUES ($1, $2, true, true, NOW())`,
      [user.id, tenant.id]
    );

    // Buscar rol tenant_owner y asignarlo
    const ownerRoleResult = await pool.query(
      "SELECT id FROM roles WHERE codigo = 'tenant_owner'"
    );

    if (ownerRoleResult.rows.length > 0) {
      await pool.query(
        `INSERT INTO usuarios_roles (usuario_id, tenant_id, rol_id, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT DO NOTHING`,
        [user.id, tenant.id, ownerRoleResult.rows[0].id]
      );
      console.log('✅ Rol tenant_owner asignado');
    }

    console.log(`\n✅ Usuario ${email} asignado a tenant "${tenant.nombre}" como OWNER`);
    console.log(`\nEl usuario ahora puede acceder a: /crm/${tenant.slug}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
