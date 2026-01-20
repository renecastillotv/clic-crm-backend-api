import { Knex } from 'knex';

/**
 * Migración 072 - Crear tablas para Sistema de Fases
 * 
 * Sistema de marketing estratégico, gamificación y productividad que permite:
 * - Configurar proyectos con distribución de comisiones
 * - Tracking de leads del pool
 * - Sistema de fases (1-5) con montos de inversión
 * - Modo solitario
 * - PRESTIGE (acumulativo)
 * - ULTRA (record de ventas máximas en un mes)
 */
export async function up(knex: Knex): Promise<void> {
  // ==================== TABLA: PROYECTOS DEL SISTEMA DE FASES ====================
  await knex.schema.createTable('sistema_fases_proyectos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('propiedad_id').nullable().references('id').inTable('propiedades').onDelete('SET NULL')
      .comment('Proyecto inmobiliario asociado');
    
    // Configuración de comisiones
    table.decimal('porcentaje_comision_asesor', 5, 2).defaultTo(50.00)
      .comment('Porcentaje de comisión para el asesor (estándar 50/50)');
    table.decimal('porcentaje_comision_tenant', 5, 2).defaultTo(50.00)
      .comment('Porcentaje de comisión para el tenant');
    
    // Configuración de montos de inversión por fase
    table.decimal('monto_fase_1', 10, 2).defaultTo(100.00).comment('Monto de inversión para Fase 1');
    table.decimal('monto_fase_2', 10, 2).defaultTo(150.00).comment('Monto de inversión para Fase 2');
    table.decimal('monto_fase_3', 10, 2).defaultTo(200.00).comment('Monto de inversión para Fase 3');
    table.decimal('monto_fase_4', 10, 2).defaultTo(250.00).comment('Monto de inversión para Fase 4');
    table.decimal('monto_fase_5', 10, 2).defaultTo(300.00).comment('Monto de inversión para Fase 5');
    
    // Configuración de intentos
    table.integer('intentos_fase_1').defaultTo(3)
      .comment('Número de intentos (meses) permitidos en Fase 1');
    table.integer('meses_solitario').defaultTo(3)
      .comment('Meses sin ventas en modo solitario antes de salir o pasar a Connect');
    
    // Estado
    table.boolean('activo').defaultTo(true).comment('Si el proyecto está activo');
    table.timestamp('fecha_inicio').nullable().comment('Fecha de inicio de la campaña');
    table.timestamp('fecha_fin').nullable().comment('Fecha de fin de la campaña');
    
    // Auditoría
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index('tenant_id', 'idx_sf_proyectos_tenant');
    table.index('propiedad_id', 'idx_sf_proyectos_propiedad');
    table.index('activo', 'idx_sf_proyectos_activo');
  });

  // ==================== TABLA: TRACKING DE ASESORES EN EL SISTEMA ====================
  await knex.schema.createTable('sistema_fases_asesores', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('usuario_id').notNullable().references('id').inTable('usuarios').onDelete('CASCADE');
    table.uuid('proyecto_id').notNullable().references('id').inTable('sistema_fases_proyectos').onDelete('CASCADE');
    
    // Fase actual
    table.integer('fase_actual').defaultTo(1)
      .comment('Fase actual del asesor (1-5, 0 = modo solitario)');
    
    // Sistema de intentos (Fase 1)
    table.integer('intentos_usados').defaultTo(0)
      .comment('Intentos usados en Fase 1');
    table.integer('intentos_totales').defaultTo(3)
      .comment('Total de intentos permitidos en Fase 1');
    
    // Modo solitario
    table.boolean('en_modo_solitario').defaultTo(false)
      .comment('Si el asesor está en modo solitario');
    table.timestamp('fecha_entrada_solitario').nullable()
      .comment('Fecha en que entró a modo solitario');
    table.integer('meses_sin_venta_solitario').defaultTo(0)
      .comment('Meses sin ventas en modo solitario');
    
    // PRESTIGE (acumulativo, nunca se pierde)
    table.integer('prestige').defaultTo(0)
      .comment('PRESTIGE acumulado (cada 3 ventas en Fase 5 = +1)');
    table.integer('ventas_fase_5_actuales').defaultTo(0)
      .comment('Ventas acumuladas en Fase 5 para el próximo PRESTIGE');
    
    // ULTRA (record de ventas máximas en un mes en Fase 5)
    table.integer('ultra_maximo').defaultTo(0)
      .comment('Record de ventas máximas en un mismo mes después de estar en Fase 5');
    table.date('ultra_fecha').nullable()
      .comment('Fecha del mes en que se alcanzó el ULTRA máximo');
    
    // Tracking mensual
    table.integer('ventas_mes_actual').defaultTo(0)
      .comment('Ventas del mes actual');
    table.date('mes_tracking').nullable()
      .comment('Mes que se está trackeando (YYYY-MM-01)');
    
    // Estado
    table.boolean('activo').defaultTo(true)
      .comment('Si el asesor está activo en el sistema');
    table.timestamp('fecha_ingreso').defaultTo(knex.fn.now())
      .comment('Fecha en que ingresó al sistema');
    table.timestamp('fecha_salida').nullable()
      .comment('Fecha en que salió del sistema (si aplica)');
    
    // Auditoría
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Índices
    table.unique(['tenant_id', 'usuario_id', 'proyecto_id'], 'uq_sf_asesores_tenant_usuario_proyecto');
    table.index('tenant_id', 'idx_sf_asesores_tenant');
    table.index('usuario_id', 'idx_sf_asesores_usuario');
    table.index('proyecto_id', 'idx_sf_asesores_proyecto');
    table.index('fase_actual', 'idx_sf_asesores_fase');
    table.index('en_modo_solitario', 'idx_sf_asesores_solitario');
    table.index('activo', 'idx_sf_asesores_activo');
  });

  // ==================== TABLA: ASIGNACIÓN DE LEADS DEL POOL ====================
  await knex.schema.createTable('sistema_fases_leads', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('proyecto_id').notNullable().references('id').inTable('sistema_fases_proyectos').onDelete('CASCADE');
    table.uuid('contacto_id').notNullable().references('id').inTable('contactos').onDelete('CASCADE');
    table.uuid('asesor_id').nullable().references('id').inTable('sistema_fases_asesores').onDelete('SET NULL')
      .comment('Asesor asignado (null = pendiente de asignación)');
    
    // Información del lead
    table.decimal('valor_asignado', 10, 2).notNullable()
      .comment('Valor monetario asignado a este lead (según fase del asesor)');
    table.integer('fase_asignacion').nullable()
      .comment('Fase en que se asignó el lead');
    table.timestamp('fecha_asignacion').nullable()
      .comment('Fecha en que se asignó el lead');
    
    // Estado
    table.string('estado', 50).defaultTo('asignado')
      .comment('Estado: asignado, convertido, perdido, rechazado');
    table.uuid('venta_id').nullable().references('id').inTable('ventas').onDelete('SET NULL')
      .comment('Venta asociada si el lead se convirtió');
    
    // Auditoría
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Índices
    table.index('tenant_id', 'idx_sf_leads_tenant');
    table.index('proyecto_id', 'idx_sf_leads_proyecto');
    table.index('contacto_id', 'idx_sf_leads_contacto');
    table.index('asesor_id', 'idx_sf_leads_asesor');
    table.index('estado', 'idx_sf_leads_estado');
    table.index('venta_id', 'idx_sf_leads_venta');
  });

  // ==================== TABLA: HISTORIAL DE CAMBIOS DE FASE ====================
  await knex.schema.createTable('sistema_fases_historial', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('asesor_id').notNullable().references('id').inTable('sistema_fases_asesores').onDelete('CASCADE');
    
    // Cambio de fase
    table.integer('fase_anterior').nullable()
      .comment('Fase anterior');
    table.integer('fase_nueva').notNullable()
      .comment('Fase nueva');
    table.string('tipo_cambio', 50).notNullable()
      .comment('Tipo: avance, retroceso, entrada_solitario, salida_solitario, ingreso_sistema');
    
    // Razón del cambio
    table.string('razon', 255).nullable()
      .comment('Razón del cambio (ej: "Venta cerrada", "Sin ventas en el mes")');
    table.uuid('venta_id').nullable().references('id').inTable('ventas').onDelete('SET NULL')
      .comment('Venta que causó el cambio (si aplica)');
    
    // PRESTIGE y ULTRA
    table.integer('prestige_anterior').nullable();
    table.integer('prestige_nuevo').nullable();
    table.integer('ultra_anterior').nullable();
    table.integer('ultra_nuevo').nullable();
    
    // Auditoría
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Índices
    table.index('asesor_id', 'idx_sf_historial_asesor');
    table.index('fase_nueva', 'idx_sf_historial_fase');
    table.index('tipo_cambio', 'idx_sf_historial_tipo');
    table.index('created_at', 'idx_sf_historial_fecha');
  });

  // ==================== AGREGAR CAMPOS A TABLA VENTAS ====================
  await knex.schema.alterTable('ventas', (table) => {
    table.boolean('es_lead_pool').defaultTo(false)
      .comment('Si la venta proviene de un lead del Sistema de Fases');
    table.uuid('sistema_fases_lead_id').nullable().references('id').inTable('sistema_fases_leads').onDelete('SET NULL')
      .comment('Lead del pool asociado a esta venta');
  });

  // ==================== AGREGAR CAMPOS A TABLA CONTACTOS ====================
  await knex.schema.alterTable('contactos', (table) => {
    table.boolean('es_lead_pool').defaultTo(false)
      .comment('Si el contacto es un lead del Sistema de Fases');
    table.uuid('sistema_fases_proyecto_id').nullable().references('id').inTable('sistema_fases_proyectos').onDelete('SET NULL')
      .comment('Proyecto del Sistema de Fases del cual proviene este lead');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Revertir cambios en tablas existentes
  await knex.schema.alterTable('contactos', (table) => {
    table.dropColumn('es_lead_pool');
    table.dropColumn('sistema_fases_proyecto_id');
  });

  await knex.schema.alterTable('ventas', (table) => {
    table.dropColumn('es_lead_pool');
    table.dropColumn('sistema_fases_lead_id');
  });

  // Eliminar tablas nuevas
  await knex.schema.dropTableIfExists('sistema_fases_historial');
  await knex.schema.dropTableIfExists('sistema_fases_leads');
  await knex.schema.dropTableIfExists('sistema_fases_asesores');
  await knex.schema.dropTableIfExists('sistema_fases_proyectos');
}













