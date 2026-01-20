import 'dotenv/config';
import { query } from '../utils/db.js';

async function main() {
  // Obtener tenant CLIC
  const clic = await query("SELECT id FROM tenants WHERE slug = 'clic'");
  const tenantId = clic.rows[0].id;

  // Obtener todos los usuarios
  const usuarios = await query('SELECT id, nombre, apellido, email FROM usuarios');

  console.log('Todos los usuarios en el sistema:');
  usuarios.rows.forEach((u: any) => console.log('  -', u.nombre, u.apellido, '-', u.email));

  // Usuarios que YA tienen perfil de asesor en CLIC
  const conPerfil = await query(
    `SELECT u.nombre, u.apellido
     FROM perfiles_asesor pa
     JOIN usuarios u ON pa.usuario_id = u.id
     WHERE pa.tenant_id = $1`,
    [tenantId]
  );
  console.log('\nUsuarios CON perfil de asesor en CLIC:');
  conPerfil.rows.forEach((u: any) => console.log('  -', u.nombre, u.apellido));

  // Usuarios que NO tienen perfil de asesor en CLIC
  const sinPerfil = await query(
    `SELECT u.id, u.nombre, u.apellido
     FROM usuarios u
     WHERE u.id NOT IN (SELECT usuario_id FROM perfiles_asesor WHERE tenant_id = $1)`,
    [tenantId]
  );
  console.log('\nUsuarios SIN perfil de asesor en CLIC (candidatos para agregar):');
  sinPerfil.rows.forEach((u: any) => console.log('  -', u.id, '-', u.nombre, u.apellido));

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
