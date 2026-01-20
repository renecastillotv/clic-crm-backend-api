import 'dotenv/config';
import { query } from '../utils/db.js';

async function main() {
  // Obtener el ID del tenant clic
  const clicTenant = await query("SELECT id FROM tenants WHERE slug = 'clic'");
  const clicId = clicTenant.rows[0]?.id;
  console.log('Tenant CLIC ID:', clicId);

  // Buscar usuarios del tenant clic con información de roles
  const result = await query(`
    SELECT
      u.id,
      u.nombre,
      u.apellido,
      u.email,
      u.activo,
      r.nombre as rol_nombre,
      r.codigo as rol_codigo
    FROM usuarios u
    LEFT JOIN roles r ON u.rol_id = r.id
    WHERE u.tenant_id = $1
    ORDER BY u.nombre
  `, [clicId]);

  console.log('\nUsuarios del tenant CLIC (' + result.rows.length + '):');
  result.rows.forEach((u: any) => {
    console.log('  -', u.nombre, u.apellido, '| rol:', u.rol_codigo, '| activo:', u.activo);
  });

  // Buscar específicamente usuarios con rol que contenga 'asesor'
  const asesoresResult = await query(`
    SELECT
      u.id,
      u.nombre,
      u.apellido,
      u.activo,
      r.codigo as rol_codigo
    FROM usuarios u
    LEFT JOIN roles r ON u.rol_id = r.id
    WHERE u.tenant_id = $1
      AND (r.codigo ILIKE '%asesor%' OR r.nombre ILIKE '%asesor%')
    ORDER BY u.nombre
  `, [clicId]);

  console.log('\nUsuarios con rol "asesor" en CLIC (' + asesoresResult.rows.length + '):');
  asesoresResult.rows.forEach((u: any) => {
    console.log('  -', u.nombre, u.apellido, '| rol:', u.rol_codigo, '| activo:', u.activo);
  });

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
