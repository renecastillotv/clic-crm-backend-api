import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigration() {
  const client = await pool.connect();
  try {
    // Check if table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'catalogos'
      );
    `);

    if (tableExists.rows[0].exists) {
      console.log('Table catalogos already exists');
      return;
    }

    console.log('Creating catalogos table...');

    await client.query(`
      CREATE TABLE catalogos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        tipo VARCHAR(50) NOT NULL,
        codigo VARCHAR(50) NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        nombre_plural VARCHAR(100),
        descripcion TEXT,
        icono VARCHAR(100),
        color VARCHAR(20),
        orden INTEGER DEFAULT 0,
        activo BOOLEAN DEFAULT true,
        es_default BOOLEAN DEFAULT false,
        config JSONB,
        traducciones JSONB,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tenant_id, tipo, codigo)
      );

      CREATE INDEX idx_catalogos_tenant_tipo ON catalogos(tenant_id, tipo);
      CREATE INDEX idx_catalogos_tipo_codigo ON catalogos(tipo, codigo);
      CREATE INDEX idx_catalogos_tipo_activo ON catalogos(tipo, activo);
    `);
    console.log('Created catalogos table');

    // Seed global values - TIPOS DE PROPIEDAD
    console.log('Seeding tipos de propiedad...');
    await client.query(`
      INSERT INTO catalogos (tenant_id, tipo, codigo, nombre, nombre_plural, icono, orden, es_default) VALUES
      (NULL, 'tipo_propiedad', 'apartamento', 'Apartamento', 'Apartamentos', 'Building2', 1, true),
      (NULL, 'tipo_propiedad', 'casa', 'Casa', 'Casas', 'Home', 2, false),
      (NULL, 'tipo_propiedad', 'villa', 'Villa', 'Villas', 'Castle', 3, false),
      (NULL, 'tipo_propiedad', 'penthouse', 'Penthouse', 'Penthouses', 'Building', 4, false),
      (NULL, 'tipo_propiedad', 'local', 'Local Comercial', 'Locales Comerciales', 'Store', 5, false),
      (NULL, 'tipo_propiedad', 'oficina', 'Oficina', 'Oficinas', 'Briefcase', 6, false),
      (NULL, 'tipo_propiedad', 'terreno', 'Terreno', 'Terrenos', 'Map', 7, false),
      (NULL, 'tipo_propiedad', 'nave', 'Nave Industrial', 'Naves Industriales', 'Warehouse', 8, false),
      (NULL, 'tipo_propiedad', 'finca', 'Finca', 'Fincas', 'Trees', 9, false),
      (NULL, 'tipo_propiedad', 'solar', 'Solar', 'Solares', 'Square', 10, false)
    `);

    // TIPOS DE OPERACION
    console.log('Seeding tipos de operacion...');
    await client.query(`
      INSERT INTO catalogos (tenant_id, tipo, codigo, nombre, nombre_plural, icono, orden, es_default) VALUES
      (NULL, 'tipo_operacion', 'venta', 'Venta', 'Ventas', 'DollarSign', 1, true),
      (NULL, 'tipo_operacion', 'alquiler', 'Alquiler', 'Alquileres', 'Key', 2, false),
      (NULL, 'tipo_operacion', 'alquiler_vacacional', 'Alquiler Vacacional', 'Alquileres Vacacionales', 'Umbrella', 3, false),
      (NULL, 'tipo_operacion', 'traspaso', 'Traspaso', 'Traspasos', 'ArrowRightLeft', 4, false)
    `);

    // TIPOS DE CONTACTO
    console.log('Seeding tipos de contacto...');
    await client.query(`
      INSERT INTO catalogos (tenant_id, tipo, codigo, nombre, nombre_plural, icono, orden, es_default, config) VALUES
      (NULL, 'tipo_contacto', 'cliente', 'Cliente', 'Clientes', 'User', 1, true, '{"puede_ser_comprador": true, "puede_ser_inquilino": true}'),
      (NULL, 'tipo_contacto', 'propietario', 'Propietario', 'Propietarios', 'UserCheck', 2, false, '{"puede_ser_vendedor": true, "puede_ser_arrendador": true}'),
      (NULL, 'tipo_contacto', 'desarrollador', 'Desarrollador', 'Desarrolladores', 'Building2', 3, false, '{"es_empresa": true}'),
      (NULL, 'tipo_contacto', 'inversionista', 'Inversionista', 'Inversionistas', 'TrendingUp', 4, false, NULL),
      (NULL, 'tipo_contacto', 'referido', 'Referido', 'Referidos', 'Users', 5, false, NULL),
      (NULL, 'tipo_contacto', 'proveedor', 'Proveedor', 'Proveedores', 'Truck', 6, false, NULL),
      (NULL, 'tipo_contacto', 'colaborador', 'Colaborador', 'Colaboradores', 'Handshake', 7, false, '{"es_asesor_externo": true}')
    `);

    // TIPOS DE ACTIVIDAD
    console.log('Seeding tipos de actividad...');
    await client.query(`
      INSERT INTO catalogos (tenant_id, tipo, codigo, nombre, icono, orden, config, color) VALUES
      (NULL, 'tipo_actividad', 'llamada', 'Llamada', 'Phone', 1, '{"requiere_nota": false}', '#3B82F6'),
      (NULL, 'tipo_actividad', 'reunion', 'Reunion', 'Users', 2, '{"requiere_fecha": true}', '#8B5CF6'),
      (NULL, 'tipo_actividad', 'visita', 'Visita a Propiedad', 'MapPin', 3, '{"requiere_propiedad": true}', '#10B981'),
      (NULL, 'tipo_actividad', 'email', 'Email', 'Mail', 4, NULL, '#F59E0B'),
      (NULL, 'tipo_actividad', 'whatsapp', 'WhatsApp', 'MessageCircle', 5, NULL, '#22C55E'),
      (NULL, 'tipo_actividad', 'nota', 'Nota', 'StickyNote', 6, NULL, '#6B7280'),
      (NULL, 'tipo_actividad', 'tarea', 'Tarea', 'CheckSquare', 7, '{"requiere_fecha_limite": true}', '#EF4444'),
      (NULL, 'tipo_actividad', 'seguimiento', 'Seguimiento', 'Clock', 8, '{"requiere_fecha": true}', '#0EA5E9')
    `);

    // ETIQUETAS DE PROPIEDAD
    console.log('Seeding etiquetas de propiedad...');
    await client.query(`
      INSERT INTO catalogos (tenant_id, tipo, codigo, nombre, icono, orden, config, color) VALUES
      (NULL, 'etiqueta_propiedad', 'exclusiva', 'Exclusiva', 'Star', 1, '{"badge_style": "warning", "mostrar_en_listado": true}', '#F59E0B'),
      (NULL, 'etiqueta_propiedad', 'destacada', 'Destacada', 'Award', 2, '{"badge_style": "primary", "mostrar_en_listado": true}', '#8B5CF6'),
      (NULL, 'etiqueta_propiedad', 'rebajada', 'Rebajada', 'ArrowDown', 3, '{"badge_style": "danger", "mostrar_en_listado": true}', '#EF4444'),
      (NULL, 'etiqueta_propiedad', 'nueva', 'Nueva', 'Sparkles', 4, '{"badge_style": "success", "mostrar_en_listado": true}', '#10B981'),
      (NULL, 'etiqueta_propiedad', 'oportunidad', 'Oportunidad', 'Zap', 5, '{"badge_style": "info", "mostrar_en_listado": true}', '#0EA5E9')
    `);

    // TIPOS DE DOCUMENTO
    console.log('Seeding tipos de documento...');
    await client.query(`
      INSERT INTO catalogos (tenant_id, tipo, codigo, nombre, orden, config) VALUES
      (NULL, 'tipo_documento', 'cedula', 'Cedula', 1, NULL),
      (NULL, 'tipo_documento', 'pasaporte', 'Pasaporte', 2, NULL),
      (NULL, 'tipo_documento', 'rnc', 'RNC', 3, '{"es_empresa": true}'),
      (NULL, 'tipo_documento', 'licencia', 'Licencia de Conducir', 4, NULL)
    `);

    // ESPECIALIDADES DE ASESOR
    console.log('Seeding especialidades de asesor...');
    await client.query(`
      INSERT INTO catalogos (tenant_id, tipo, codigo, nombre, icono, orden, es_default) VALUES
      (NULL, 'especialidad_asesor', 'residencial', 'Residencial', 'Home', 1, true),
      (NULL, 'especialidad_asesor', 'comercial', 'Comercial', 'Store', 2, false),
      (NULL, 'especialidad_asesor', 'industrial', 'Industrial', 'Warehouse', 3, false),
      (NULL, 'especialidad_asesor', 'terrenos', 'Terrenos', 'Map', 4, false),
      (NULL, 'especialidad_asesor', 'lujo', 'Lujo', 'Crown', 5, false),
      (NULL, 'especialidad_asesor', 'proyectos', 'Proyectos Nuevos', 'Building2', 6, false)
    `);

    // TIPOS DE ASESOR (con % comision)
    console.log('Seeding tipos de asesor...');
    await client.query(`
      INSERT INTO catalogos (tenant_id, tipo, codigo, nombre, orden, es_default, config) VALUES
      (NULL, 'tipo_asesor', 'senior', 'Asesor Senior', 1, false, '{"comision_porcentaje": 60, "descripcion": "Mas de 5 anios de experiencia"}'),
      (NULL, 'tipo_asesor', 'pleno', 'Asesor Pleno', 2, false, '{"comision_porcentaje": 50, "descripcion": "2-5 anios de experiencia"}'),
      (NULL, 'tipo_asesor', 'junior', 'Asesor Junior', 3, true, '{"comision_porcentaje": 40, "descripcion": "Menos de 2 anios de experiencia"}'),
      (NULL, 'tipo_asesor', 'trainee', 'Asesor en Entrenamiento', 4, false, '{"comision_porcentaje": 30, "descripcion": "En periodo de capacitacion"}'),
      (NULL, 'tipo_asesor', 'asociado', 'Asociado Externo', 5, false, '{"comision_porcentaje": 35, "descripcion": "Colaborador de otra inmobiliaria"}')
    `);

    console.log('Migration 107 completed successfully!');

  } catch (error) {
    console.error('Error running migration:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
