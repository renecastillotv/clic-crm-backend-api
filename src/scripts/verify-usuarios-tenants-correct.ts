import 'dotenv/config';
import { query } from '../utils/db.js';

async function main() {
  // Ver estructura de usuarios_tenants
  const cols = await query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'usuarios_tenants'
    ORDER BY ordinal_position
  `);
  console.log('Columnas de usuarios_tenants:');
  cols.rows.forEach((c: any) => console.log('  -', c.column_name));

  // Obtener tenant CLIC
  const clic = await query("SELECT id FROM tenants WHERE slug = 'clic'");
  const clicId = clic.rows[0].id;

  // Usuarios que pertenecen al tenant CLIC
  console.log('\n=== USUARIOS QUE PERTENECEN AL TENANT CLIC ===\n');
  const usuariosClic = await query(`
    SELECT u.id, u.nombre, u.apellido, u.email
    FROM usuarios u
    JOIN usuarios_tenants ut ON u.id = ut.usuario_id
    WHERE ut.tenant_id = $1
    ORDER BY u.nombre
  `, [clicId]);

  for (const u of usuariosClic.rows as any[]) {
    console.log(`  ${u.nombre} ${u.apellido} (${u.email})`);
  }
  console.log(`\nTotal usuarios en CLIC: ${usuariosClic.rows.length}`);

  // Ahora ver los perfiles de asesor en CLIC
  console.log('\n=== PERFILES DE ASESOR EN CLIC ===\n');
  const perfiles = await query(`
    SELECT pa.id, u.nombre, u.apellido, u.email, pa.activo, pa.visible_en_web
    FROM perfiles_asesor pa
    JOIN usuarios u ON pa.usuario_id = u.id
    WHERE pa.tenant_id = $1
    ORDER BY pa.orden
  `, [clicId]);

  for (const p of perfiles.rows as any[]) {
    // Verificar si este usuario pertenece al tenant CLIC
    const pertenece = await query(`
      SELECT 1 FROM usuarios_tenants WHERE usuario_id = $1 AND tenant_id = $2
    `, [p.id.split('-')[0] === 'dfb0ce3d' ? 'dfb0ce3d-4acf-4be9-90e1-9d09865591ad' : p.id, clicId]);

    console.log(`  ${p.nombre} ${p.apellido} (${p.email}) - activo: ${p.activo}, visible: ${p.visible_en_web}`);
  }
  console.log(`\nTotal perfiles de asesor en CLIC: ${perfiles.rows.length}`);

  // Verificar si Eddy y Michael pertenecen a CLIC
  console.log('\n=== VERIFICAR EDDY Y MICHAEL ===\n');
  const verificar = ['Erosario@clic.do', 'mlantigua@clic.do'];
  for (const email of verificar) {
    const usuario = await query(`SELECT id, nombre, apellido FROM usuarios WHERE LOWER(email) = LOWER($1)`, [email]);
    if (usuario.rows.length > 0) {
      const u = usuario.rows[0] as any;
      const enClic = await query(`SELECT 1 FROM usuarios_tenants WHERE usuario_id = $1 AND tenant_id = $2`, [u.id, clicId]);
      console.log(`  ${u.nombre} ${u.apellido} (${email}) - pertenece a CLIC: ${enClic.rows.length > 0 ? 'SÍ' : 'NO'}`);
    } else {
      console.log(`  Usuario no encontrado: ${email}`);
    }
  }

  process.exit(0);
}

main().catch(console.error);
