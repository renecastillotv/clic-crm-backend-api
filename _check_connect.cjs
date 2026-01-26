require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  // Buscar el rol CONNECT y sus permisos para propiedades
  const result = await pool.query(`
    SELECT
      r.id as rol_id,
      r.nombre as rol_nombre,
      rm.modulo_id,
      rm.puede_ver,
      rm.puede_crear,
      rm.puede_editar,
      rm.puede_eliminar,
      rm.alcance_ver,
      rm.alcance_editar,
      rm.permisos_campos
    FROM roles r
    JOIN roles_modulos rm ON r.id = rm.rol_id
    WHERE r.nombre ILIKE '%connect%'
    AND rm.modulo_id = 'propiedades'
  `);

  console.log('=== Permisos de rol CONNECT para propiedades ===');
  console.log(JSON.stringify(result.rows, null, 2));

  // Verificar qué usuario tiene el rol CONNECT
  const usuarios = await pool.query(`
    SELECT u.email, r.nombre as rol
    FROM usuarios_roles ur
    JOIN usuarios u ON ur.usuario_id = u.id
    JOIN roles r ON ur.rol_id = r.id
    WHERE r.nombre ILIKE '%connect%'
  `);

  console.log('\n=== Usuarios con rol CONNECT ===');
  console.log(JSON.stringify(usuarios.rows, null, 2));

  // Verificar los módulos que obtiene juanpablo@clic.do
  const modulos = await pool.query(`
    SELECT
      m.id,
      rm.puede_ver,
      rm.puede_crear,
      rm.puede_editar,
      rm.permisos_campos
    FROM usuarios u
    JOIN usuarios_roles ur ON u.id = ur.usuario_id
    JOIN roles_modulos rm ON ur.rol_id = rm.rol_id
    JOIN modulos m ON rm.modulo_id = m.id
    WHERE u.email = 'juanpablo@clic.do'
    AND rm.puede_ver = true
    ORDER BY m.id
  `);

  console.log('\n=== Módulos de juanpablo@clic.do ===');
  console.log(JSON.stringify(modulos.rows, null, 2));

  await pool.end();
}

check().catch(e => { console.error(e); process.exit(1); });
