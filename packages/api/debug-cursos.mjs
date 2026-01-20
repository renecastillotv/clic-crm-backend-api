import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function debug() {
  try {
    // 1. Ver todos los cursos con tenant
    console.log('\n=== CURSOS UNIVERSITY ===');
    const cursos = await pool.query(`
      SELECT c.id, c.titulo, c.estado, c.tenant_id, t.nombre as tenant_nombre, t.slug
      FROM university_cursos c
      JOIN tenants t ON c.tenant_id = t.id
      ORDER BY c.created_at DESC
      LIMIT 10
    `);
    console.table(cursos.rows);

    // 2. Ver tenants existentes
    console.log('\n=== TENANTS ===');
    const tenants = await pool.query(`
      SELECT id, nombre, slug FROM tenants WHERE activo = true
    `);
    console.table(tenants.rows);

    // 3. Ver usuarios_tenants (que usuarios pertenecen a que tenants)
    console.log('\n=== USUARIOS_TENANTS (primeros 15) ===');
    const usuariosTenants = await pool.query(`
      SELECT ut.*, u.email as usuario_email, t.nombre as tenant_nombre, t.slug
      FROM usuarios_tenants ut
      JOIN usuarios u ON ut.usuario_id = u.id
      JOIN tenants t ON ut.tenant_id = t.id
      WHERE ut.activo = true
      ORDER BY u.email
      LIMIT 15
    `);
    console.table(usuariosTenants.rows);

    // 4. Ver usuarios con roles en el tenant del curso (d43e30b1-61d0-46e5-a760-7595f78dd184)
    const cursoTenantId = 'd43e30b1-61d0-46e5-a760-7595f78dd184';
    console.log('\n=== USUARIOS CON ROLES EN TENANT DEL CURSO (' + cursoTenantId + ') ===');
    const usuariosEnTenantCurso = await pool.query(`
      SELECT ur.*, u.email as usuario_email, r.nombre as rol_nombre
      FROM usuarios_roles ur
      JOIN usuarios u ON ur.usuario_id = u.id
      JOIN roles r ON ur.rol_id = r.id
      WHERE ur.tenant_id = $1 AND ur.activo = true
    `, [cursoTenantId]);
    console.table(usuariosEnTenantCurso.rows);

    // 5. Ver accesos configurados para el curso
    console.log('\n=== ACCESOS POR ROL DEL CURSO ===');
    const accesos = await pool.query(`
      SELECT ar.*, c.titulo as curso_titulo, r.nombre as rol_nombre, r.id as rol_id
      FROM university_cursos_acceso_roles ar
      JOIN university_cursos c ON ar.curso_id = c.id
      JOIN roles r ON ar.rol_id = r.id
      WHERE c.tenant_id = $1
    `, [cursoTenantId]);
    console.table(accesos.rows);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

debug();
