/**
 * Script para crear perfiles de asesor para el tenant otro-demo
 * Usa usuarios globales existentes
 */
import { query } from '../utils/db.js';

async function main() {
  try {
    // Obtener tenant otro-demo
    const tenantResult = await query(`SELECT id FROM tenants WHERE slug = 'otro-demo'`);
    if (tenantResult.rows.length === 0) {
      console.log('Tenant otro-demo no encontrado');
      process.exit(1);
    }
    const tenantId = tenantResult.rows[0].id;
    console.log('Tenant otro-demo ID:', tenantId);

    // Verificar si ya hay equipos para este tenant
    const equiposExist = await query(`SELECT COUNT(*) as count FROM equipos WHERE tenant_id = $1`, [tenantId]);
    if (parseInt(equiposExist.rows[0].count) > 0) {
      console.log('Ya existen equipos para este tenant');
    } else {
      // Crear equipos
      await query(`
        INSERT INTO equipos (tenant_id, nombre, slug, descripcion, zona_principal, zonas_cobertura, meta_mensual, activo)
        VALUES
          ($1, 'Equipo Residencial', 'equipo-residencial', 'Especialistas en propiedades residenciales', 'Zona Norte', '["Zona Norte", "Centro"]', 500000, true),
          ($1, 'Equipo Comercial', 'equipo-comercial', 'Expertos en locales y oficinas comerciales', 'Centro Histórico', '["Centro Histórico", "Zona Industrial"]', 800000, true),
          ($1, 'Equipo Premium', 'equipo-premium', 'Propiedades de lujo y exclusivas', 'Zona Exclusiva', '["Zona Exclusiva", "Playa"]', 1500000, true)
      `, [tenantId]);
      console.log('Equipos creados');
    }

    // Obtener IDs de equipos
    const equipos = await query(`SELECT id, slug FROM equipos WHERE tenant_id = $1`, [tenantId]);
    const equipoMap: Record<string, string> = {};
    equipos.rows.forEach((e: any) => { equipoMap[e.slug] = e.id; });
    console.log('Equipos:', Object.keys(equipoMap));

    // Obtener usuarios globales (la tabla usuarios no tiene tenant_id)
    const usuarios = await query(`
      SELECT id, nombre, apellido, email
      FROM usuarios
      WHERE tipos_usuario @> '["asesor_inmobiliario"]'
      AND activo = true
      LIMIT 10
    `);
    console.log('Usuarios asesores encontrados:', usuarios.rows.length);

    if (usuarios.rows.length === 0) {
      // Crear algunos usuarios si no existen
      console.log('Creando usuarios de ejemplo...');
      await query(`
        INSERT INTO usuarios (nombre, apellido, email, tipos_usuario, activo)
        VALUES
          ('Carlos', 'Rodríguez', 'carlos.otro@demo.com', '["asesor_inmobiliario"]', true),
          ('Ana', 'Martínez', 'ana.otro@demo.com', '["asesor_inmobiliario"]', true),
          ('Luis', 'González', 'luis.otro@demo.com', '["asesor_inmobiliario"]', true),
          ('Patricia', 'López', 'patricia.otro@demo.com', '["asesor_inmobiliario"]', true)
        ON CONFLICT (email) DO NOTHING
      `);

      // Re-obtener usuarios
      const newUsuarios = await query(`
        SELECT id, nombre, apellido, email
        FROM usuarios
        WHERE tipos_usuario @> '["asesor_inmobiliario"]'
        AND activo = true
        LIMIT 10
      `);
      usuarios.rows = newUsuarios.rows;
      console.log('Usuarios después de crear:', usuarios.rows.length);
    }

    // Verificar si ya hay perfiles para este tenant
    const perfilesExist = await query(`SELECT COUNT(*) as count FROM perfiles_asesor WHERE tenant_id = $1`, [tenantId]);
    if (parseInt(perfilesExist.rows[0].count) > 0) {
      console.log('Ya existen', perfilesExist.rows[0].count, 'perfiles de asesor para este tenant');
    } else {
      // Crear perfiles de asesor
      const perfilesData = [
        {
          titulo: 'Broker Senior',
          bio: 'Más de 15 años de experiencia en el mercado inmobiliario. Especializado en propiedades de lujo y negociaciones complejas.',
          especialidades: ['Residencial', 'Lujo', 'Inversión'],
          idiomas: ['es', 'en'],
          zonas: ['Zona Norte', 'Centro'],
          rango: 'broker',
          experiencia: 15,
          equipo: 'equipo-premium'
        },
        {
          titulo: 'Agente Inmobiliario Senior',
          bio: 'Apasionada por ayudar a familias a encontrar su hogar ideal. Experta en el mercado residencial.',
          especialidades: ['Residencial', 'Primera Vivienda'],
          idiomas: ['es', 'en', 'pt'],
          zonas: ['Zona Norte', 'Zona Sur'],
          rango: 'senior',
          experiencia: 8,
          equipo: 'equipo-residencial'
        },
        {
          titulo: 'Asesor Comercial',
          bio: 'Especialista en locales comerciales y oficinas. Amplio conocimiento del sector empresarial.',
          especialidades: ['Comercial', 'Oficinas', 'Locales'],
          idiomas: ['es'],
          zonas: ['Centro Histórico', 'Zona Industrial'],
          rango: 'senior',
          experiencia: 10,
          equipo: 'equipo-comercial'
        },
        {
          titulo: 'Agente Inmobiliario',
          bio: 'Joven profesional con gran energía y dedicación. Siempre disponible para mis clientes.',
          especialidades: ['Residencial', 'Apartamentos'],
          idiomas: ['es', 'en'],
          zonas: ['Centro', 'Zona Este'],
          rango: 'junior',
          experiencia: 3,
          equipo: 'equipo-residencial'
        }
      ];

      for (let i = 0; i < Math.min(usuarios.rows.length, perfilesData.length); i++) {
        const u = usuarios.rows[i];
        const p = perfilesData[i];
        const slug = `${u.nombre.toLowerCase()}-${u.apellido.toLowerCase()}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');

        try {
          await query(`
            INSERT INTO perfiles_asesor (
              tenant_id, usuario_id, slug, titulo_profesional, biografia,
              especialidades, idiomas, zonas, experiencia_anos, rango,
              equipo_id, split_comision, activo, destacado, visible_en_web, orden,
              stats
            ) VALUES (
              $1, $2, $3, $4, $5,
              $6, $7, $8, $9, $10::rango_asesor,
              $11, $12, true, $13, true, $14,
              $15
            )
            ON CONFLICT (tenant_id, usuario_id) DO NOTHING
          `, [
            tenantId,
            u.id,
            slug,
            p.titulo,
            p.bio,
            JSON.stringify(p.especialidades),
            JSON.stringify(p.idiomas),
            JSON.stringify(p.zonas),
            p.experiencia,
            p.rango,
            equipoMap[p.equipo] || null,
            50 + (i * 5),
            i === 0,
            i + 1,
            JSON.stringify({
              propiedades_vendidas: 10 + (i * 5),
              propiedades_activas: 3 + i,
              volumen_ventas: 500000 + (i * 100000),
              calificacion_promedio: 4.5 + (i * 0.1),
              total_resenas: 5 + (i * 2)
            })
          ]);
          console.log(`Perfil creado: ${u.nombre} ${u.apellido} (${p.rango})`);
        } catch (err: any) {
          console.log(`Error creando perfil ${u.nombre}: ${err.message}`);
        }
      }
    }

    // Verificar resultado
    const finalCount = await query(`
      SELECT COUNT(*) as total FROM perfiles_asesor WHERE tenant_id = $1
    `, [tenantId]);
    console.log(`\nTotal perfiles de asesor para otro-demo: ${finalCount.rows[0].total}`);

    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
