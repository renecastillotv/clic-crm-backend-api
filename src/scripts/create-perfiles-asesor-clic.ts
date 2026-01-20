import 'dotenv/config';
import { query } from '../utils/db.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Script para crear perfiles de asesor para usuarios de CLIC
 * que actualmente no tienen perfil
 */
async function main() {
  console.log('Creando perfiles de asesor para usuarios de CLIC...\n');

  // Obtener tenant CLIC
  const clic = await query("SELECT id FROM tenants WHERE slug = 'clic'");
  const tenantId = clic.rows[0].id;
  console.log('Tenant CLIC:', tenantId);

  // Usuarios que son asesores reales de CLIC (basado en correos @clic.do)
  // Excluimos asistentes y admin
  const asesoresPotenciales = [
    { email: 'Erosario@clic.do', titulo: 'Director Comercial' },
    { email: 'mlantigua@clic.do', titulo: 'Asesor Senior' },
    { email: 'pedro@clic.do', titulo: 'Asesor Inmobiliario' },
    { email: 'sultan@clic.do', titulo: 'Asesor Inmobiliario' },
  ];

  let created = 0;

  for (const asesor of asesoresPotenciales) {
    // Buscar usuario
    const usuarioResult = await query(
      'SELECT id, nombre, apellido FROM usuarios WHERE LOWER(email) = LOWER($1)',
      [asesor.email]
    );

    if (usuarioResult.rows.length === 0) {
      console.log(`  ⚠️  Usuario no encontrado: ${asesor.email}`);
      continue;
    }

    const usuario = usuarioResult.rows[0];

    // Verificar si ya tiene perfil
    const perfilExiste = await query(
      'SELECT 1 FROM perfiles_asesor WHERE tenant_id = $1 AND usuario_id = $2',
      [tenantId, usuario.id]
    );

    if (perfilExiste.rows.length > 0) {
      console.log(`  ⏭️  ${usuario.nombre} ${usuario.apellido} ya tiene perfil`);
      continue;
    }

    // Crear perfil de asesor
    const slug = `${usuario.nombre?.toLowerCase() || 'asesor'}-${usuario.apellido?.toLowerCase() || 'clic'}`.replace(/\s+/g, '-');

    await query(
      `INSERT INTO perfiles_asesor (
        id, tenant_id, usuario_id, slug, titulo_profesional,
        activo, visible_en_web, destacado, orden, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, true, true, false, $6, NOW(), NOW())`,
      [uuidv4(), tenantId, usuario.id, slug, asesor.titulo, created + 10]
    );

    console.log(`  ✅ Perfil creado: ${usuario.nombre} ${usuario.apellido} (${asesor.titulo})`);
    created++;
  }

  console.log(`\n✅ Total perfiles creados: ${created}`);

  // Verificar resultado final
  const perfilesFinales = await query(
    `SELECT pa.id, u.nombre, u.apellido, pa.titulo_profesional, pa.activo, pa.visible_en_web
     FROM perfiles_asesor pa
     JOIN usuarios u ON pa.usuario_id = u.id
     WHERE pa.tenant_id = $1
     ORDER BY pa.orden`,
    [tenantId]
  );

  console.log('\nPerfiles de asesor en CLIC ahora:');
  perfilesFinales.rows.forEach((p: any) => {
    console.log(`  - ${p.nombre} ${p.apellido} (${p.titulo_profesional}) - activo: ${p.activo}, visible: ${p.visible_en_web}`);
  });

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
