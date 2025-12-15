/**
 * Script para verificar datos de asesores en otro-demo
 */
import { query } from '../utils/db.js';

async function main() {
  try {
    // Obtener tenant otro-demo
    const tenant = await query(`SELECT id FROM tenants WHERE slug = 'otro-demo'`);
    if (tenant.rows.length === 0) {
      console.log('Tenant otro-demo no encontrado');
      process.exit(0);
    }
    const tenantId = tenant.rows[0].id;
    console.log('Tenant ID:', tenantId);

    // Verificar perfiles_asesor
    console.log('\n=== PERFILES ASESOR ===');
    const perfiles = await query(
      `SELECT id, tenant_id, usuario_id, slug, activo, visible_en_web
       FROM perfiles_asesor
       WHERE tenant_id = $1`,
      [tenantId]
    );
    console.log('Perfiles encontrados:', perfiles.rows.length);
    perfiles.rows.forEach((p: any) => {
      console.log(`  - ${p.slug} | activo: ${p.activo} | visible_en_web: ${p.visible_en_web} | usuario_id: ${p.usuario_id}`);
    });

    // Verificar usuarios referenciados
    if (perfiles.rows.length > 0) {
      console.log('\n=== USUARIOS REFERENCIADOS ===');
      const userIds = perfiles.rows.map((p: any) => p.usuario_id);
      console.log('User IDs a buscar:', userIds);

      const usuarios = await query(
        `SELECT id, nombre, apellido FROM usuarios WHERE id = ANY($1::uuid[])`,
        [userIds]
      );
      console.log('Usuarios encontrados:', usuarios.rows.length);
      usuarios.rows.forEach((u: any) => {
        console.log(`  - ${u.nombre} ${u.apellido} (${u.id})`);
      });

      // Probar el query completo del servicio
      console.log('\n=== QUERY COMPLETO DEL SERVICIO ===');
      const fullQuery = await query(`
        SELECT
          pa.id,
          pa.slug,
          pa.titulo_profesional as cargo,
          pa.activo,
          pa.visible_en_web,
          u.nombre,
          u.apellido
        FROM perfiles_asesor pa
        INNER JOIN usuarios u ON pa.usuario_id = u.id
        LEFT JOIN equipos e ON pa.equipo_id = e.id
        WHERE pa.tenant_id = $1
          AND pa.activo = true
          AND pa.visible_en_web = true
        ORDER BY pa.destacado DESC, pa.orden ASC, u.nombre ASC
        LIMIT 20
      `, [tenantId]);
      console.log('Resultados del query completo:', fullQuery.rows.length);
      fullQuery.rows.forEach((r: any) => {
        console.log(`  - ${r.nombre} ${r.apellido} | ${r.slug} | activo: ${r.activo} | visible: ${r.visible_en_web}`);
      });
    }

    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
