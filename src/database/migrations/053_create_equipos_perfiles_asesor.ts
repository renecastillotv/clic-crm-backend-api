import { Knex } from 'knex';

/**
 * Migración 053: Sistema de Equipos y Perfiles de Asesor
 *
 * Crea las tablas:
 * - equipos: Para organizar asesores en equipos de trabajo
 * - perfiles_asesor: Extiende usuarios con info específica de asesores inmobiliarios
 *
 * Relaciones:
 * - perfiles_asesor.usuario_id → usuarios.id (1:1)
 * - perfiles_asesor.equipo_id → equipos.id (N:1)
 * - equipos.lider_id → usuarios.id (N:1)
 */

export async function up(knex: Knex): Promise<void> {
  // =====================================================
  // TABLA: equipos
  // Organización de asesores en equipos de trabajo
  // =====================================================
  await knex.schema.createTable('equipos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');

    // Identificación
    table.string('nombre', 100).notNullable();
    table.string('slug', 100).notNullable();
    table.text('descripcion');

    // Liderazgo
    table.uuid('lider_id').references('id').inTable('usuarios').onDelete('SET NULL');

    // Zona/Territorio
    table.string('zona_principal', 200);
    table.jsonb('zonas_cobertura').defaultTo('[]'); // Array de zonas que cubre el equipo

    // Configuración
    table.decimal('meta_mensual', 15, 2); // Meta de ventas mensual del equipo
    table.decimal('split_comision_equipo', 5, 2); // % que va al equipo vs asesor individual

    // Estado
    table.boolean('activo').defaultTo(true);

    // Metadata
    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);

    // Índices
    table.unique(['tenant_id', 'slug']);
    table.index(['tenant_id', 'activo']);
  });

  // =====================================================
  // ENUM: rango_asesor
  // Niveles de experiencia/posición del asesor
  // =====================================================
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE rango_asesor AS ENUM (
        'trainee',
        'junior',
        'senior',
        'broker',
        'team_leader',
        'director'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // =====================================================
  // TABLA: perfiles_asesor
  // Extensión de usuarios para asesores inmobiliarios
  // =====================================================
  await knex.schema.createTable('perfiles_asesor', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');

    // Relación con usuario (1:1)
    table.uuid('usuario_id').notNullable().references('id').inTable('usuarios').onDelete('CASCADE');

    // Identificación pública
    table.string('slug', 100).notNullable();
    table.string('titulo_profesional', 100); // "Agente Inmobiliario", "Broker Asociado", etc.

    // Información personal/profesional
    table.text('biografia');
    table.string('foto_url', 500); // Override de avatar_url del usuario
    table.string('video_presentacion_url', 500);

    // Especialización
    table.jsonb('especialidades').defaultTo('[]'); // ["Residencial", "Comercial", "Lujo", "Inversión"]
    table.jsonb('idiomas').defaultTo('["es"]'); // ["es", "en", "fr", "pt"]
    table.jsonb('zonas').defaultTo('[]'); // ["Zona Norte", "Centro Histórico", etc.]
    table.jsonb('tipos_propiedad').defaultTo('[]'); // ["Casa", "Apartamento", "Local", "Terreno"]

    // Experiencia y rango
    table.integer('experiencia_anos').defaultTo(0);
    table.specificType('rango', 'rango_asesor').defaultTo('junior');
    table.date('fecha_inicio'); // Cuándo empezó en la empresa

    // Equipo
    table.uuid('equipo_id').references('id').inTable('equipos').onDelete('SET NULL');

    // Comisiones
    table.decimal('split_comision', 5, 2).defaultTo(50.00); // % que recibe el asesor (ej: 50%)
    table.decimal('meta_mensual', 15, 2); // Meta personal de ventas

    // Estadísticas (calculadas/cacheadas)
    table.jsonb('stats').defaultTo(JSON.stringify({
      propiedades_vendidas: 0,
      propiedades_activas: 0,
      volumen_ventas: 0,
      calificacion_promedio: 0,
      total_resenas: 0,
      tiempo_respuesta_hrs: 24
    }));

    // Redes sociales y contacto adicional
    table.jsonb('redes_sociales').defaultTo('{}'); // {linkedin, instagram, facebook, twitter, youtube, tiktok}
    table.string('whatsapp', 20);
    table.string('telefono_directo', 20);

    // Certificaciones y logros
    table.jsonb('certificaciones').defaultTo('[]'); // [{nombre, institucion, fecha, url}]
    table.jsonb('logros').defaultTo('[]'); // [{titulo, descripcion, fecha, icono}]

    // Visibilidad
    table.boolean('activo').defaultTo(true);
    table.boolean('destacado').defaultTo(false);
    table.boolean('visible_en_web').defaultTo(true);
    table.integer('orden').defaultTo(0);

    // Traducciones y metadata
    table.jsonb('traducciones').defaultTo('{}'); // {en: {biografia, titulo_profesional}, pt: {...}}
    table.jsonb('metadata').defaultTo('{}');

    // Timestamps
    table.timestamps(true, true);

    // Índices y constraints
    table.unique(['tenant_id', 'usuario_id']); // Un usuario solo puede tener un perfil de asesor por tenant
    table.unique(['tenant_id', 'slug']);
    table.index(['tenant_id', 'activo', 'visible_en_web']);
    table.index(['tenant_id', 'equipo_id']);
    table.index(['tenant_id', 'destacado']);
    table.index(['tenant_id', 'rango']);
  });

  // =====================================================
  // Actualizar tabla propiedades para usar perfiles_asesor
  // =====================================================
  const hasAgenteColumn = await knex.schema.hasColumn('propiedades', 'agente_id');
  if (hasAgenteColumn) {
    // Agregar columna para perfil de asesor (más específico que usuario)
    await knex.schema.alterTable('propiedades', (table) => {
      table.uuid('perfil_asesor_id').references('id').inTable('perfiles_asesor').onDelete('SET NULL');
    });
  }

  // =====================================================
  // Actualizar tabla ventas para usar perfiles_asesor y equipos
  // =====================================================
  const hasVentasTable = await knex.schema.hasTable('ventas');
  if (hasVentasTable) {
    const hasEquipoColumn = await knex.schema.hasColumn('ventas', 'equipo_id');
    if (hasEquipoColumn) {
      // Agregar FK a equipos si la columna existe pero no tiene FK
      await knex.raw(`
        DO $$ BEGIN
          ALTER TABLE ventas
          ADD CONSTRAINT ventas_equipo_id_foreign
          FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE SET NULL;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
    }

    // Agregar columna para perfil de asesor vendedor
    const hasPerfilColumn = await knex.schema.hasColumn('ventas', 'perfil_asesor_id');
    if (!hasPerfilColumn) {
      await knex.schema.alterTable('ventas', (table) => {
        table.uuid('perfil_asesor_id').references('id').inTable('perfiles_asesor').onDelete('SET NULL');
      });
    }
  }

  console.log('✅ Migración 053: Tablas equipos y perfiles_asesor creadas correctamente');
}

export async function down(knex: Knex): Promise<void> {
  // Remover columnas agregadas
  const hasVentasTable = await knex.schema.hasTable('ventas');
  if (hasVentasTable) {
    const hasPerfilColumn = await knex.schema.hasColumn('ventas', 'perfil_asesor_id');
    if (hasPerfilColumn) {
      await knex.schema.alterTable('ventas', (table) => {
        table.dropColumn('perfil_asesor_id');
      });
    }
  }

  const hasPropiedadesTable = await knex.schema.hasTable('propiedades');
  if (hasPropiedadesTable) {
    const hasPerfilColumn = await knex.schema.hasColumn('propiedades', 'perfil_asesor_id');
    if (hasPerfilColumn) {
      await knex.schema.alterTable('propiedades', (table) => {
        table.dropColumn('perfil_asesor_id');
      });
    }
  }

  // Eliminar tablas
  await knex.schema.dropTableIfExists('perfiles_asesor');
  await knex.schema.dropTableIfExists('equipos');

  // Eliminar enum
  await knex.raw('DROP TYPE IF EXISTS rango_asesor');

  console.log('✅ Migración 053: Rollback completado');
}
