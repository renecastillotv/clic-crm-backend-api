import { Knex } from 'knex';

/**
 * Migración 123 - Refactorizar Sistema de Fases y Crear Sistema de Productividad
 *
 * CAMBIOS:
 * 1. ELIMINAR tablas redundantes del sistema de fases anterior
 * 2. CREAR tabla de configuración simplificada (1 por tenant)
 * 3. AGREGAR campos de fases a usuarios_tenants (donde ya está la relación usuario-tenant)
 * 4. CREAR sistema de productividad con metas configurables
 * 5. MODIFICAR contactos para marcar origen de leads
 *
 * CONCEPTO SIMPLIFICADO:
 * - Sistema de Fases: Gamificación para asesores con leads del pool publicitario
 * - Sistema de Productividad: Metas mensuales/semanales (contactos, captaciones, ventas, etc.)
 * - Todo integrado con tablas existentes (usuarios_tenants, contactos, ventas, comisiones)
 */

export async function up(knex: Knex): Promise<void> {
  // ==================== PASO 1: ELIMINAR TABLAS ANTIGUAS ====================
  // Primero quitamos las FK de ventas y contactos
  const hasVentasLeadPoolColumn = await knex.schema.hasColumn('ventas', 'es_lead_pool');
  if (hasVentasLeadPoolColumn) {
    await knex.schema.alterTable('ventas', (table) => {
      table.dropColumn('sistema_fases_lead_id');
      table.dropColumn('es_lead_pool');
    });
  }

  const hasContactosLeadPoolColumn = await knex.schema.hasColumn('contactos', 'es_lead_pool');
  if (hasContactosLeadPoolColumn) {
    await knex.schema.alterTable('contactos', (table) => {
      table.dropColumn('sistema_fases_proyecto_id');
      table.dropColumn('es_lead_pool');
    });
  }

  // Eliminar tablas en orden (por dependencias)
  await knex.schema.dropTableIfExists('sistema_fases_historial');
  await knex.schema.dropTableIfExists('sistema_fases_leads');
  await knex.schema.dropTableIfExists('sistema_fases_asesores');
  await knex.schema.dropTableIfExists('sistema_fases_proyectos');

  // ==================== PASO 2: CONFIGURACIÓN SISTEMA DE FASES (1 por tenant) ====================
  await knex.schema.createTable('config_sistema_fases', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().unique().references('id').inTable('tenants').onDelete('CASCADE');

    // Estado del sistema
    table.boolean('activo').defaultTo(false).comment('Si el sistema de fases está activo');

    // Propiedad/proyecto vinculado al pool de leads (opcional, para futuro módulo de campañas)
    table.uuid('propiedad_pool_id').nullable().references('id').inTable('propiedades').onDelete('SET NULL')
      .comment('Propiedad vinculada a la campaña de leads');

    // Configuración de comisiones especiales para leads del pool
    table.decimal('comision_asesor_pct', 5, 2).defaultTo(50.00)
      .comment('% comisión para asesor en ventas de leads del pool');
    table.decimal('comision_empresa_pct', 5, 2).defaultTo(50.00)
      .comment('% comisión para empresa en ventas de leads del pool');

    // Pesos por fase para distribución de leads (proporcional)
    table.integer('peso_fase_1').defaultTo(100).comment('Peso de leads para Fase 1 (base)');
    table.integer('peso_fase_2').defaultTo(150).comment('Peso de leads para Fase 2');
    table.integer('peso_fase_3').defaultTo(200).comment('Peso de leads para Fase 3');
    table.integer('peso_fase_4').defaultTo(250).comment('Peso de leads para Fase 4');
    table.integer('peso_fase_5').defaultTo(300).comment('Peso de leads para Fase 5');

    // Reglas de fase 1 y modo solitario
    table.integer('intentos_fase_1').defaultTo(3)
      .comment('Meses sin venta en Fase 1 antes de pasar a solitario');
    table.integer('meses_solitario_max').defaultTo(3)
      .comment('Meses sin venta en solitario antes de salir del sistema');

    // Auditoría
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // ==================== PASO 3: CAMPOS DE FASES EN USUARIOS_TENANTS ====================
  await knex.schema.alterTable('usuarios_tenants', (table) => {
    // Sistema de fases
    table.boolean('en_sistema_fases').defaultTo(false)
      .comment('Si el usuario participa en el sistema de fases');
    table.integer('fase_actual').defaultTo(1)
      .comment('Fase actual: 1-5, 0=solitario');
    table.boolean('en_modo_solitario').defaultTo(false)
      .comment('Si está en modo solitario (sin leads del pool)');

    // Tracking de intentos y meses
    table.integer('intentos_fase_1_usados').defaultTo(0)
      .comment('Meses sin venta en Fase 1');
    table.integer('meses_solitario_sin_venta').defaultTo(0)
      .comment('Meses sin venta en modo solitario');

    // Gamificación
    table.integer('prestige').defaultTo(0)
      .comment('PRESTIGE acumulativo (cada 3 ventas en Fase 5)');
    table.integer('ventas_fase_5_contador').defaultTo(0)
      .comment('Contador de ventas en Fase 5 para próximo PRESTIGE');
    table.integer('ultra_record').defaultTo(0)
      .comment('ULTRA: máximo de ventas en un mes');
    table.string('ultra_mes', 7).nullable()
      .comment('Mes del ULTRA record (YYYY-MM)');

    // Tracking mensual
    table.integer('ventas_mes_actual').defaultTo(0)
      .comment('Ventas del mes actual');
    table.string('mes_tracking', 7).nullable()
      .comment('Mes que se está trackeando (YYYY-MM)');

    // Fecha de ingreso al sistema de fases
    table.timestamp('fecha_ingreso_fases').nullable()
      .comment('Cuándo ingresó al sistema de fases');
  });

  // ==================== PASO 4: MARCAR CONTACTOS COMO LEADS DEL POOL ====================
  await knex.schema.alterTable('contactos', (table) => {
    table.boolean('es_lead_pool').defaultTo(false)
      .comment('Si el contacto viene del pool de leads (sistema de fases)');
    table.string('origen_lead', 50).nullable()
      .comment('Origen: facebook, instagram, google, referido, directo, pool_fases');
    table.uuid('lead_asignado_a').nullable().references('id').inTable('usuarios').onDelete('SET NULL')
      .comment('Usuario al que se asignó este lead del pool');
    table.timestamp('fecha_asignacion_lead').nullable()
      .comment('Cuándo se asignó el lead');
  });

  // ==================== PASO 5: SISTEMA DE PRODUCTIVIDAD ====================

  // Configuración de metas de productividad por tenant
  await knex.schema.createTable('config_productividad', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().unique().references('id').inTable('tenants').onDelete('CASCADE');

    // Estado
    table.boolean('activo').defaultTo(true).comment('Si el sistema de productividad está activo');

    // Metas mensuales por defecto (pueden ser personalizadas por usuario)
    table.integer('meta_contactos_mes').defaultTo(30)
      .comment('Meta de contactos a registrar por mes');
    table.integer('meta_captaciones_mes').defaultTo(2)
      .comment('Meta de captaciones (propiedades) por mes');
    table.integer('meta_ventas_mes').defaultTo(1)
      .comment('Meta de ventas cerradas por mes');
    table.integer('meta_llamadas_mes').defaultTo(100)
      .comment('Meta de llamadas/actividades por mes');
    table.integer('meta_visitas_mes').defaultTo(20)
      .comment('Meta de visitas a propiedades por mes');
    table.integer('meta_propuestas_mes').defaultTo(5)
      .comment('Meta de propuestas enviadas por mes');

    // Configuración de visualización
    table.boolean('mostrar_ranking').defaultTo(true)
      .comment('Mostrar ranking entre asesores');
    table.boolean('notificar_cumplimiento').defaultTo(true)
      .comment('Enviar notificaciones de cumplimiento');

    // Auditoría
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Metas personalizadas por usuario (override de las del tenant)
  await knex.schema.createTable('productividad_metas_usuario', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('usuario_id').notNullable().references('id').inTable('usuarios').onDelete('CASCADE');

    // Período
    table.string('periodo', 7).notNullable().comment('Mes: YYYY-MM');

    // Metas del período (null = usar default del tenant)
    table.integer('meta_contactos').nullable();
    table.integer('meta_captaciones').nullable();
    table.integer('meta_ventas').nullable();
    table.integer('meta_llamadas').nullable();
    table.integer('meta_visitas').nullable();
    table.integer('meta_propuestas').nullable();

    // Notas del admin
    table.text('notas').nullable().comment('Notas del admin sobre las metas');

    // Auditoría
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Índices
    table.unique(['tenant_id', 'usuario_id', 'periodo'], 'uq_productividad_metas_periodo');
    table.index(['tenant_id', 'periodo'], 'idx_productividad_metas_tenant_periodo');
  });

  // Tracking de productividad (calculado en tiempo real desde otras tablas)
  // Esta tabla es un CACHE/resumen para consultas rápidas
  await knex.schema.createTable('productividad_resumen', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('usuario_id').notNullable().references('id').inTable('usuarios').onDelete('CASCADE');

    // Período
    table.string('periodo', 7).notNullable().comment('Mes: YYYY-MM');
    table.string('tipo_periodo', 10).defaultTo('mensual').comment('mensual o semanal');
    table.integer('semana').nullable().comment('Número de semana (si es semanal)');

    // Contadores (se actualizan al registrar actividad)
    table.integer('contactos_registrados').defaultTo(0);
    table.integer('captaciones_registradas').defaultTo(0);
    table.integer('ventas_cerradas').defaultTo(0);
    table.integer('llamadas_realizadas').defaultTo(0);
    table.integer('visitas_realizadas').defaultTo(0);
    table.integer('propuestas_enviadas').defaultTo(0);

    // Valores monetarios
    table.decimal('monto_ventas', 15, 2).defaultTo(0).comment('Suma de valores de ventas');
    table.decimal('monto_comisiones', 15, 2).defaultTo(0).comment('Suma de comisiones generadas');

    // Porcentaje de cumplimiento (calculado)
    table.decimal('pct_cumplimiento', 5, 2).defaultTo(0)
      .comment('Porcentaje promedio de cumplimiento de metas');

    // Última actualización
    table.timestamp('ultimo_calculo').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Índices
    table.unique(['tenant_id', 'usuario_id', 'periodo', 'tipo_periodo', 'semana'], 'uq_productividad_resumen');
    table.index(['tenant_id', 'periodo'], 'idx_productividad_resumen_periodo');
    table.index(['usuario_id', 'periodo'], 'idx_productividad_resumen_usuario');
  });

  // ==================== PASO 6: HISTORIAL DE CAMBIOS DE FASE ====================
  await knex.schema.createTable('sistema_fases_historial', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('usuario_id').notNullable().references('id').inTable('usuarios').onDelete('CASCADE');

    // Cambio
    table.integer('fase_anterior').nullable();
    table.integer('fase_nueva').notNullable();
    table.string('tipo_cambio', 50).notNullable()
      .comment('ingreso, avance, retroceso, entrada_solitario, salida_solitario, prestige, ultra');

    // Razón y referencia
    table.string('razon', 255).nullable();
    table.uuid('venta_id').nullable().references('id').inTable('ventas').onDelete('SET NULL');

    // Valores de prestige/ultra en el momento
    table.integer('prestige_valor').nullable();
    table.integer('ultra_valor').nullable();

    // Auditoría
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Índices
    table.index(['tenant_id', 'usuario_id'], 'idx_fases_historial_tenant_usuario');
    table.index('created_at', 'idx_fases_historial_fecha');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Eliminar nuevas tablas
  await knex.schema.dropTableIfExists('sistema_fases_historial');
  await knex.schema.dropTableIfExists('productividad_resumen');
  await knex.schema.dropTableIfExists('productividad_metas_usuario');
  await knex.schema.dropTableIfExists('config_productividad');
  await knex.schema.dropTableIfExists('config_sistema_fases');

  // Eliminar campos de contactos
  await knex.schema.alterTable('contactos', (table) => {
    table.dropColumn('fecha_asignacion_lead');
    table.dropColumn('lead_asignado_a');
    table.dropColumn('origen_lead');
    table.dropColumn('es_lead_pool');
  });

  // Eliminar campos de usuarios_tenants
  await knex.schema.alterTable('usuarios_tenants', (table) => {
    table.dropColumn('fecha_ingreso_fases');
    table.dropColumn('mes_tracking');
    table.dropColumn('ventas_mes_actual');
    table.dropColumn('ultra_mes');
    table.dropColumn('ultra_record');
    table.dropColumn('ventas_fase_5_contador');
    table.dropColumn('prestige');
    table.dropColumn('meses_solitario_sin_venta');
    table.dropColumn('intentos_fase_1_usados');
    table.dropColumn('en_modo_solitario');
    table.dropColumn('fase_actual');
    table.dropColumn('en_sistema_fases');
  });

  // NOTA: No recreamos las tablas antiguas del sistema de fases
  // Si se necesita revertir completamente, ejecutar la migración 072 manualmente
}
