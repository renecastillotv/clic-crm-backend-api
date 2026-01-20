import 'dotenv/config';
import { query } from '../utils/db.js';

async function main() {
  const tenants = await query("SELECT id, slug FROM tenants WHERE slug IN ('clic', 'demo')");
  console.log('Tenants encontrados:');
  tenants.rows.forEach((t: any) => console.log('  -', t.slug, ':', t.id));

  for (const tenant of tenants.rows as any[]) {
    console.log('\n=== Perfiles Asesor para', tenant.slug, '===');

    const perfiles = await query(
      `SELECT pa.id, pa.activo, pa.visible_en_web, u.nombre, u.apellido
       FROM perfiles_asesor pa
       JOIN usuarios u ON pa.usuario_id = u.id
       WHERE pa.tenant_id = $1`,
      [tenant.id]
    );

    console.log('Perfiles encontrados:', perfiles.rows.length);
    if (perfiles.rows.length === 0) {
      console.log('  (No hay perfiles_asesor)');
    } else {
      perfiles.rows.forEach((p: any) => {
        console.log('  -', p.nombre, p.apellido, '| activo:', p.activo, '| visible_en_web:', p.visible_en_web);
      });
    }

  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
