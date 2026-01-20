import 'dotenv/config';
import { query } from '../utils/db.js';

async function main() {
  // Todos los usuarios con sus tenants
  const usuarios = await query(`
    SELECT u.id, u.nombre, u.apellido, u.email, t.slug as tenant_slug
    FROM usuarios u
    LEFT JOIN tenants t ON u.tenant_id = t.id
    ORDER BY t.slug, u.nombre
  `);

  console.log('=== TODOS LOS USUARIOS Y SUS TENANTS ===\n');
  let currentTenant = '';
  for (const u of usuarios.rows as any[]) {
    if (u.tenant_slug !== currentTenant) {
      currentTenant = u.tenant_slug;
      console.log(`\n--- Tenant: ${currentTenant || 'SIN TENANT'} ---`);
    }
    console.log(`  ${u.nombre} ${u.apellido} (${u.email})`);
  }

  // Perfiles de asesor en CLIC
  const clic = await query("SELECT id FROM tenants WHERE slug = 'clic'");
  const clicId = clic.rows[0].id;

  console.log('\n\n=== PERFILES DE ASESOR EN TENANT CLIC ===\n');
  const perfiles = await query(`
    SELECT pa.id, u.nombre, u.apellido, u.email, t.slug as usuario_tenant
    FROM perfiles_asesor pa
    JOIN usuarios u ON pa.usuario_id = u.id
    LEFT JOIN tenants t ON u.tenant_id = t.id
    WHERE pa.tenant_id = $1
  `, [clicId]);

  for (const p of perfiles.rows as any[]) {
    console.log(`  ${p.nombre} ${p.apellido} (${p.email}) - usuario pertenece a tenant: ${p.usuario_tenant}`);
  }

  process.exit(0);
}

main().catch(console.error);
