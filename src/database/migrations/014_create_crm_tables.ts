import { Knex } from 'knex';

/**
 * Migración CRM - Tablas para Contactos, Solicitudes y Propuestas
 *
 * Crea las tablas base para el CRM:
 * - contactos: Gestión de leads, clientes, asesores, etc.
 * - solicitudes: Pipeline de ventas con etapas y PURGE Score
 * - propuestas: Propuestas comerciales vinculadas a solicitudes/propiedades
 */
export async function up(knex: Knex): Promise<void> {
  // ==================== TABLA CONTACTOS ====================
  await knex.schema.createTable('contactos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');

    // Datos básicos
    table.string('nombre', 255).notNullable().comment('Nombre del contacto');
    table.string('apellido', 255).nullable().comment('Apellido del contacto');
    table.string('email', 255).nullable().comment('Email del contacto');
    table.string('telefono', 50).nullable().comment('Teléfono principal');
    table.string('telefono_secundario', 50).nullable().comment('Teléfono secundario');
    table.string('whatsapp', 50).nullable().comment('Número de WhatsApp');

    // Clasificación
    table.string('tipo', 50).notNullable().defaultTo('lead')
      .comment('Tipo: lead, cliente, asesor, desarrollador, referidor, propietario, vendedor');
    table.string('empresa', 255).nullable().comment('Empresa u organización');
    table.string('cargo', 255).nullable().comment('Cargo o puesto');
    table.string('origen', 100).nullable().comment('Origen: web, referido, publicidad, portal, etc.');

    // Estado y seguimiento
    table.boolean('favorito').defaultTo(false).comment('Marcado como favorito');
    table.text('notas').nullable().comment('Notas adicionales');
    table.jsonb('etiquetas').defaultTo('[]').comment('Array de etiquetas');
    table.jsonb('datos_extra').defaultTo('{}').comment('Datos adicionales personalizados');

    // Usuario asignado
    table.uuid('usuario_asignado_id').nullable().references('id').inTable('usuarios').onDelete('SET NULL');

    // Auditoría
    table.boolean('activo').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Índices
    table.index('tenant_id', 'idx_contactos_tenant');
    table.index('tipo', 'idx_contactos_tipo');
    table.index('email', 'idx_contactos_email');
    table.index('favorito', 'idx_contactos_favorito');
    table.index('usuario_asignado_id', 'idx_contactos_usuario');
  });

  // ==================== TABLA SOLICITUDES (PIPELINE) ====================
  await knex.schema.createTable('solicitudes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');

    // Datos básicos
    table.string('titulo', 255).notNullable().comment('Título de la solicitud');
    table.text('descripcion').nullable().comment('Descripción detallada');

    // Etapa del pipeline
    table.string('etapa', 50).notNullable().defaultTo('nuevo_lead')
      .comment('Etapa: nuevo_lead, contactado, calificado, mostrando, negociacion, cierre, ganado, perdido');

    // PURGE Score (0-25 puntos)
    table.integer('purge_power').defaultTo(0).comment('Power (0-5): Capacidad de decisión');
    table.integer('purge_urgency').defaultTo(0).comment('Urgency (0-5): Urgencia de compra');
    table.integer('purge_resources').defaultTo(0).comment('Resources (0-5): Recursos financieros');
    table.integer('purge_genuine').defaultTo(0).comment('Genuine (0-5): Interés genuino');
    table.integer('purge_expectations').defaultTo(0).comment('Expectations (0-5): Expectativas realistas');

    // Relaciones
    table.uuid('contacto_id').nullable().references('id').inTable('contactos').onDelete('SET NULL');
    table.uuid('propiedad_id').nullable().comment('ID de la propiedad de interés');
    table.uuid('usuario_asignado_id').nullable().references('id').inTable('usuarios').onDelete('SET NULL');

    // Valores
    table.decimal('presupuesto', 15, 2).nullable().comment('Presupuesto del cliente');
    table.string('moneda', 3).defaultTo('MXN').comment('Moneda del presupuesto');
    table.decimal('valor_estimado', 15, 2).nullable().comment('Valor estimado de la venta');

    // Requisitos
    table.string('tipo_operacion', 50).nullable().comment('Tipo: venta, renta, traspaso');
    table.string('tipo_propiedad', 100).nullable().comment('Tipo de propiedad buscada');
    table.string('zona_interes', 255).nullable().comment('Zona o ubicación de interés');
    table.integer('recamaras_min').nullable().comment('Recámaras mínimas');
    table.integer('banos_min').nullable().comment('Baños mínimos');

    // Seguimiento
    table.timestamp('fecha_contacto').nullable().comment('Fecha del primer contacto');
    table.timestamp('fecha_cierre_esperada').nullable().comment('Fecha esperada de cierre');
    table.timestamp('fecha_cierre_real').nullable().comment('Fecha real de cierre');
    table.string('razon_perdida', 255).nullable().comment('Razón si se pierde');

    // Datos adicionales
    table.text('notas').nullable().comment('Notas de seguimiento');
    table.jsonb('etiquetas').defaultTo('[]').comment('Array de etiquetas');
    table.jsonb('datos_extra').defaultTo('{}').comment('Datos adicionales');

    // Auditoría
    table.boolean('activo').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Índices
    table.index('tenant_id', 'idx_solicitudes_tenant');
    table.index('etapa', 'idx_solicitudes_etapa');
    table.index('contacto_id', 'idx_solicitudes_contacto');
    table.index('usuario_asignado_id', 'idx_solicitudes_usuario');
    table.index('propiedad_id', 'idx_solicitudes_propiedad');
  });

  // ==================== TABLA PROPUESTAS ====================
  await knex.schema.createTable('propuestas', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');

    // Datos básicos
    table.string('titulo', 255).notNullable().comment('Título de la propuesta');
    table.text('descripcion').nullable().comment('Descripción de la propuesta');

    // Estado
    table.string('estado', 50).notNullable().defaultTo('borrador')
      .comment('Estado: borrador, enviada, vista, aceptada, rechazada, expirada');

    // Relaciones
    table.uuid('solicitud_id').nullable().references('id').inTable('solicitudes').onDelete('SET NULL');
    table.uuid('contacto_id').nullable().references('id').inTable('contactos').onDelete('SET NULL');
    table.uuid('propiedad_id').nullable().comment('ID de la propiedad propuesta');
    table.uuid('usuario_creador_id').nullable().references('id').inTable('usuarios').onDelete('SET NULL');

    // Valores
    table.decimal('precio_propuesto', 15, 2).nullable().comment('Precio propuesto');
    table.string('moneda', 3).defaultTo('MXN').comment('Moneda');
    table.decimal('comision_porcentaje', 5, 2).nullable().comment('Porcentaje de comisión');
    table.decimal('comision_monto', 15, 2).nullable().comment('Monto de comisión calculado');

    // Condiciones
    table.text('condiciones').nullable().comment('Condiciones de la propuesta');
    table.text('notas_internas').nullable().comment('Notas internas (no visibles al cliente)');

    // URL pública
    table.string('url_publica', 100).unique().nullable().comment('Código único para URL pública');
    table.timestamp('fecha_expiracion').nullable().comment('Fecha de expiración de la propuesta');

    // Seguimiento
    table.timestamp('fecha_enviada').nullable().comment('Fecha en que se envió');
    table.timestamp('fecha_vista').nullable().comment('Fecha en que fue vista');
    table.timestamp('fecha_respuesta').nullable().comment('Fecha de respuesta del cliente');
    table.integer('veces_vista').defaultTo(0).comment('Contador de visualizaciones');

    // Datos adicionales
    table.jsonb('datos_extra').defaultTo('{}').comment('Datos adicionales');

    // Auditoría
    table.boolean('activo').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Índices
    table.index('tenant_id', 'idx_propuestas_tenant');
    table.index('estado', 'idx_propuestas_estado');
    table.index('solicitud_id', 'idx_propuestas_solicitud');
    table.index('contacto_id', 'idx_propuestas_contacto');
    table.index('url_publica', 'idx_propuestas_url');
  });

  // ==================== TABLA ACTIVIDADES (para historial) ====================
  await knex.schema.createTable('actividades_crm', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');

    // Tipo de actividad
    table.string('tipo', 50).notNullable()
      .comment('Tipo: llamada, email, reunion, nota, tarea, visita, whatsapp');
    table.string('titulo', 255).notNullable().comment('Título de la actividad');
    table.text('descripcion').nullable().comment('Descripción o contenido');

    // Relaciones polimórficas
    table.uuid('contacto_id').nullable().references('id').inTable('contactos').onDelete('CASCADE');
    table.uuid('solicitud_id').nullable().references('id').inTable('solicitudes').onDelete('CASCADE');
    table.uuid('propuesta_id').nullable().references('id').inTable('propuestas').onDelete('CASCADE');

    // Usuario
    table.uuid('usuario_id').nullable().references('id').inTable('usuarios').onDelete('SET NULL');

    // Fechas
    table.timestamp('fecha_actividad').defaultTo(knex.fn.now()).comment('Fecha de la actividad');
    table.timestamp('fecha_recordatorio').nullable().comment('Fecha de recordatorio');
    table.boolean('completada').defaultTo(false);

    // Datos adicionales
    table.jsonb('datos_extra').defaultTo('{}');

    // Auditoría
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Índices
    table.index('tenant_id', 'idx_actividades_tenant');
    table.index('tipo', 'idx_actividades_tipo');
    table.index('contacto_id', 'idx_actividades_contacto');
    table.index('solicitud_id', 'idx_actividades_solicitud');
    table.index('fecha_actividad', 'idx_actividades_fecha');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('actividades_crm');
  await knex.schema.dropTableIfExists('propuestas');
  await knex.schema.dropTableIfExists('solicitudes');
  await knex.schema.dropTableIfExists('contactos');
}
