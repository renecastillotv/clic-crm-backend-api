import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('🚀 Ejecutando migración 110: Sistema University...\n');

    // 1. Agregar feature "University" si no existe
    const existingFeature = await client.query(`SELECT id FROM features WHERE name = 'University'`);
    if (existingFeature.rows.length === 0) {
      await client.query(`
        INSERT INTO features (name, description, icon, category, is_public, is_premium, available_in_plans)
        VALUES (
          'University',
          'Sistema de cursos, videos y certificados para capacitación',
          'graduation-cap',
          'training',
          false,
          true,
          '["premium", "enterprise"]'
        )
      `);
      console.log('✅ Feature "University" agregado');
    } else {
      console.log('⚠️ Feature "University" ya existe');
    }

    // 2. Crear tabla de certificados
    await client.query(`
      CREATE TABLE IF NOT EXISTS university_certificados (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        nombre VARCHAR(200) NOT NULL,
        descripcion TEXT,
        imagen_template VARCHAR(500),
        campos_personalizados JSONB DEFAULT '{}',
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_university_certificados_tenant ON university_certificados(tenant_id)`);
    console.log('✅ Tabla university_certificados creada');

    // 3. Crear tabla de cursos
    await client.query(`
      CREATE TABLE IF NOT EXISTS university_cursos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        titulo VARCHAR(300) NOT NULL,
        descripcion TEXT,
        imagen_portada VARCHAR(500),
        nivel VARCHAR(50) DEFAULT 'principiante',
        duracion_estimada_minutos INTEGER DEFAULT 0,
        estado VARCHAR(20) DEFAULT 'borrador' CHECK (estado IN ('borrador', 'publicado', 'archivado')),
        es_pago BOOLEAN DEFAULT false,
        precio DECIMAL(10, 2),
        moneda VARCHAR(3) DEFAULT 'USD',
        orden INTEGER DEFAULT 0,
        metadata JSONB DEFAULT '{}',
        fecha_publicacion TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_university_cursos_tenant ON university_cursos(tenant_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_university_cursos_estado ON university_cursos(estado)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_university_cursos_tenant_estado ON university_cursos(tenant_id, estado)`);
    console.log('✅ Tabla university_cursos creada');

    // 4. Relación cursos-certificados
    await client.query(`
      CREATE TABLE IF NOT EXISTS university_cursos_certificados (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        curso_id UUID NOT NULL REFERENCES university_cursos(id) ON DELETE CASCADE,
        certificado_id UUID NOT NULL REFERENCES university_certificados(id) ON DELETE CASCADE,
        porcentaje_requerido INTEGER DEFAULT 100,
        requiere_examen BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(curso_id, certificado_id)
      )
    `);
    console.log('✅ Tabla university_cursos_certificados creada');

    // 5. Crear tabla de secciones
    await client.query(`
      CREATE TABLE IF NOT EXISTS university_secciones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        curso_id UUID NOT NULL REFERENCES university_cursos(id) ON DELETE CASCADE,
        titulo VARCHAR(200) NOT NULL,
        descripcion TEXT,
        orden INTEGER DEFAULT 0,
        es_pago_adicional BOOLEAN DEFAULT false,
        precio_seccion DECIMAL(10, 2),
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_university_secciones_curso ON university_secciones(curso_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_university_secciones_orden ON university_secciones(curso_id, orden)`);
    console.log('✅ Tabla university_secciones creada');

    // 6. Crear tabla de videos
    await client.query(`
      CREATE TABLE IF NOT EXISTS university_videos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seccion_id UUID NOT NULL REFERENCES university_secciones(id) ON DELETE CASCADE,
        titulo VARCHAR(300) NOT NULL,
        descripcion TEXT,
        url_video VARCHAR(500) NOT NULL,
        proveedor VARCHAR(50) DEFAULT 'youtube',
        video_id VARCHAR(100),
        duracion_segundos INTEGER DEFAULT 0,
        thumbnail VARCHAR(500),
        orden INTEGER DEFAULT 0,
        es_preview BOOLEAN DEFAULT false,
        es_pago_adicional BOOLEAN DEFAULT false,
        precio_video DECIMAL(10, 2),
        recursos_adjuntos JSONB DEFAULT '[]',
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_university_videos_seccion ON university_videos(seccion_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_university_videos_orden ON university_videos(seccion_id, orden)`);
    console.log('✅ Tabla university_videos creada');

    // 7. Inscripciones de usuarios a cursos
    await client.query(`
      CREATE TABLE IF NOT EXISTS university_inscripciones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        curso_id UUID NOT NULL REFERENCES university_cursos(id) ON DELETE CASCADE,
        usuario_id UUID NOT NULL,
        email_usuario VARCHAR(255) NOT NULL,
        nombre_usuario VARCHAR(200),
        estado VARCHAR(20) DEFAULT 'activa' CHECK (estado IN ('activa', 'completada', 'cancelada', 'expirada')),
        progreso_porcentaje INTEGER DEFAULT 0,
        pago_completado BOOLEAN DEFAULT false,
        monto_pagado DECIMAL(10, 2),
        fecha_inscripcion TIMESTAMP DEFAULT NOW(),
        fecha_completado TIMESTAMP,
        fecha_expiracion TIMESTAMP,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(curso_id, usuario_id)
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_university_inscripciones_tenant ON university_inscripciones(tenant_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_university_inscripciones_curso ON university_inscripciones(curso_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_university_inscripciones_usuario ON university_inscripciones(usuario_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_university_inscripciones_estado ON university_inscripciones(estado)`);
    console.log('✅ Tabla university_inscripciones creada');

    // 8. Progreso de usuarios en videos específicos
    await client.query(`
      CREATE TABLE IF NOT EXISTS university_progreso (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        inscripcion_id UUID NOT NULL REFERENCES university_inscripciones(id) ON DELETE CASCADE,
        video_id UUID NOT NULL REFERENCES university_videos(id) ON DELETE CASCADE,
        segundos_vistos INTEGER DEFAULT 0,
        porcentaje_completado INTEGER DEFAULT 0,
        completado BOOLEAN DEFAULT false,
        ultimo_acceso TIMESTAMP DEFAULT NOW(),
        fecha_completado TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(inscripcion_id, video_id)
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_university_progreso_inscripcion ON university_progreso(inscripcion_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_university_progreso_video ON university_progreso(video_id)`);
    console.log('✅ Tabla university_progreso creada');

    // 9. Certificados emitidos a usuarios
    await client.query(`
      CREATE TABLE IF NOT EXISTS university_certificados_emitidos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        inscripcion_id UUID NOT NULL REFERENCES university_inscripciones(id) ON DELETE CASCADE,
        certificado_id UUID NOT NULL REFERENCES university_certificados(id) ON DELETE CASCADE,
        codigo_verificacion VARCHAR(50) NOT NULL UNIQUE,
        nombre_estudiante VARCHAR(200) NOT NULL,
        url_certificado VARCHAR(500),
        fecha_emision TIMESTAMP DEFAULT NOW(),
        datos_certificado JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_university_cert_emitidos_inscripcion ON university_certificados_emitidos(inscripcion_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_university_cert_emitidos_certificado ON university_certificados_emitidos(certificado_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_university_cert_emitidos_codigo ON university_certificados_emitidos(codigo_verificacion)`);
    console.log('✅ Tabla university_certificados_emitidos creada');

    console.log('\n✅ Migración 110 completada exitosamente!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
