import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Ejecutando migración 111: university_cursos_acceso_roles...');

    // 1. Verificar si la tabla ya existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'university_cursos_acceso_roles'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('La tabla university_cursos_acceso_roles ya existe');
      return;
    }

    // 2. Crear tabla de acceso por rol
    await client.query(`
      CREATE TABLE university_cursos_acceso_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        curso_id UUID NOT NULL REFERENCES university_cursos(id) ON DELETE CASCADE,
        rol_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        seccion_limite_id UUID REFERENCES university_secciones(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (curso_id, rol_id)
      );

      CREATE INDEX idx_university_cursos_acceso_roles_curso ON university_cursos_acceso_roles(curso_id);
      CREATE INDEX idx_university_cursos_acceso_roles_rol ON university_cursos_acceso_roles(rol_id);
    `);
    console.log('✅ Tabla university_cursos_acceso_roles creada');

    // 3. Verificar si existe el módulo mi-entrenamiento
    const moduleCheck = await client.query(`
      SELECT id FROM modulos WHERE id = 'mi-entrenamiento'
    `);

    if (moduleCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO modulos (id, nombre, descripcion, icono, categoria, orden, activo)
        VALUES ('mi-entrenamiento', 'Mi Entrenamiento', 'Cursos de capacitación para usuarios', 'graduation-cap', 'features', 50, true)
      `);
      console.log('✅ Módulo mi-entrenamiento creado');
    } else {
      console.log('El módulo mi-entrenamiento ya existe');
    }

    // 4. Asignar permisos del módulo a roles base
    const rolesResult = await client.query(`
      SELECT id, codigo FROM roles WHERE codigo IN ('tenant_owner', 'tenant_admin', 'tenant_user', 'connect')
    `);

    for (const rol of rolesResult.rows) {
      const permisoCheck = await client.query(`
        SELECT id FROM roles_modulos WHERE rol_id = $1 AND modulo_id = 'mi-entrenamiento'
      `, [rol.id]);

      if (permisoCheck.rows.length === 0) {
        await client.query(`
          INSERT INTO roles_modulos (rol_id, modulo_id, puede_ver, puede_crear, puede_editar, puede_eliminar, alcance_ver, alcance_editar)
          VALUES ($1, 'mi-entrenamiento', true, false, false, false, 'own', 'own')
        `, [rol.id]);
        console.log(`✅ Permisos asignados al rol: ${rol.codigo}`);
      }
    }

    console.log('✅ Migración 111 completada exitosamente');

  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
