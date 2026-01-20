import 'dotenv/config';
import { query } from '../utils/db.js';
import { v4 as uuidv4 } from 'uuid';

async function main() {
  console.log('=== CORRIGIENDO PERFILES DE ASESOR EN CLIC ===\n');

  // Obtener tenant CLIC
  const clic = await query("SELECT id FROM tenants WHERE slug = 'clic'");
  const clicId = clic.rows[0].id;

  // 1. Eliminar perfiles de asesor de usuarios que NO pertenecen al tenant CLIC
  console.log('1. Eliminando perfiles de usuarios que no pertenecen a CLIC...\n');

  const perfilesActuales = await query(`
    SELECT pa.id, pa.usuario_id, u.nombre, u.apellido, u.email
    FROM perfiles_asesor pa
    JOIN usuarios u ON pa.usuario_id = u.id
    WHERE pa.tenant_id = $1
  `, [clicId]);

  let eliminados = 0;
  for (const p of perfilesActuales.rows as any[]) {
    // Verificar si el usuario pertenece al tenant CLIC
    const pertenece = await query(`
      SELECT 1 FROM usuarios_tenants WHERE usuario_id = $1 AND tenant_id = $2
    `, [p.usuario_id, clicId]);

    if (pertenece.rows.length === 0) {
      // No pertenece, eliminar el perfil
      await query(`DELETE FROM perfiles_asesor WHERE id = $1`, [p.id]);
      console.log(`   ❌ Eliminado: ${p.nombre} ${p.apellido} (no pertenece a CLIC)`);
      eliminados++;
    } else {
      console.log(`   ✅ Conservado: ${p.nombre} ${p.apellido} (sí pertenece a CLIC)`);
    }
  }
  console.log(`\n   Total eliminados: ${eliminados}`);

  // 2. Crear perfiles para usuarios de CLIC que tienen rol de asesor y no tienen perfil
  console.log('\n2. Creando perfiles para usuarios de CLIC con rol Asesor Inmobiliario...\n');

  // Obtener usuarios de CLIC con rol de asesor
  const usuariosConRolAsesor = await query(`
    SELECT DISTINCT u.id, u.nombre, u.apellido, u.email
    FROM usuarios u
    JOIN usuarios_tenants ut ON u.id = ut.usuario_id
    JOIN usuarios_roles ur ON u.id = ur.usuario_id AND ur.tenant_id = ut.tenant_id
    JOIN roles r ON ur.rol_id = r.id
    WHERE ut.tenant_id = $1
      AND ut.activo = true
      AND r.nombre ILIKE '%asesor%'
  `, [clicId]);

  console.log(`   Usuarios con rol de asesor en CLIC: ${usuariosConRolAsesor.rows.length}`);

  let creados = 0;
  for (const u of usuariosConRolAsesor.rows as any[]) {
    // Verificar si ya tiene perfil
    const tienePerfil = await query(`
      SELECT 1 FROM perfiles_asesor WHERE usuario_id = $1 AND tenant_id = $2
    `, [u.id, clicId]);

    if (tienePerfil.rows.length === 0) {
      // Crear perfil
      const slug = `${(u.nombre || 'asesor').toLowerCase()}-${(u.apellido || 'clic').toLowerCase()}`.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      await query(`
        INSERT INTO perfiles_asesor (
          id, tenant_id, usuario_id, slug, titulo_profesional,
          activo, visible_en_web, destacado, orden, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'Asesor Inmobiliario', true, true, false, $5, NOW(), NOW())
      `, [uuidv4(), clicId, u.id, slug, creados + 10]);

      console.log(`   ✅ Creado: ${u.nombre} ${u.apellido}`);
      creados++;
    } else {
      console.log(`   ⏭️  Ya tiene perfil: ${u.nombre} ${u.apellido}`);
    }
  }
  console.log(`\n   Total creados: ${creados}`);

  // 3. Verificar resultado final
  console.log('\n=== RESULTADO FINAL ===\n');
  const perfilesFinales = await query(`
    SELECT u.nombre, u.apellido, u.email, pa.activo, pa.visible_en_web
    FROM perfiles_asesor pa
    JOIN usuarios u ON pa.usuario_id = u.id
    WHERE pa.tenant_id = $1
    ORDER BY pa.orden
  `, [clicId]);

  console.log('Perfiles de asesor en CLIC:');
  for (const p of perfilesFinales.rows as any[]) {
    console.log(`   - ${p.nombre} ${p.apellido} (${p.email})`);
  }
  console.log(`\nTotal: ${perfilesFinales.rows.length}`);

  process.exit(0);
}

main().catch(console.error);
