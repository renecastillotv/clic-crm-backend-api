import { Knex } from 'knex';

/**
 * Migración 124 - Agregar pesos y niveles al sistema de productividad
 *
 * CAMBIOS:
 * 1. Agregar campos de pesos para cálculo ponderado de productividad
 * 2. Crear tabla de niveles de productividad (básico, promedio, experto)
 * 3. Agregar campo nivel_productividad_id a usuarios_tenants
 */

export async function up(knex: Knex): Promise<void> {
  // ==================== PASO 1: AGREGAR CAMPOS DE PESOS A CONFIG_PRODUCTIVIDAD ====================
  const hasConfigProductividad = await knex.schema.hasTable('config_productividad');

  if (hasConfigProductividad) {
    await knex.schema.alterTable('config_productividad', (table) => {
      // Pesos para cálculo ponderado (suman 100%)
      table.integer('peso_contactos').defaultTo(20).comment('Peso de contactos en el cálculo (%)');
      table.integer('peso_captaciones').defaultTo(25).comment('Peso de captaciones en el cálculo (%)');
      table.integer('peso_ventas').defaultTo(30).comment('Peso de ventas en el cálculo (%)');
      table.integer('peso_llamadas').defaultTo(15).comment('Peso de llamadas en el cálculo (%)');
      table.integer('peso_visitas').defaultTo(10).comment('Peso de visitas en el cálculo (%)');
    });
  }

  // ==================== PASO 2: CREAR TABLA DE NIVELES DE PRODUCTIVIDAD ====================
  await knex.schema.createTable('niveles_productividad', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');

    // Identificación del nivel
    table.string('nombre', 50).notNullable().comment('Nombre del nivel: básico, promedio, experto');
    table.string('codigo', 20).notNullable().comment('Código: basico, promedio, experto');
    table.text('descripcion').nullable();
    table.integer('orden').defaultTo(1).comment('Orden de aparición');

    // Metas específicas por nivel (override de las del tenant)
    table.integer('meta_contactos_mes').nullable();
    table.integer('meta_captaciones_mes').nullable();
    table.integer('meta_ventas_mes').nullable();
    table.integer('meta_llamadas_mes').nullable();
    table.integer('meta_visitas_mes').nullable();
    table.integer('meta_propuestas_mes').nullable();

    // Indicadores visuales
    table.string('color', 20).defaultTo('#6366f1').comment('Color del nivel');
    table.string('icono', 50).nullable().comment('Icono del nivel');

    // Estado
    table.boolean('activo').defaultTo(true);
    table.boolean('es_default').defaultTo(false).comment('Si es el nivel por defecto para nuevos usuarios');

    // Auditoría
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Índices
    table.unique(['tenant_id', 'codigo'], 'uq_niveles_productividad_tenant_codigo');
    table.index(['tenant_id', 'activo'], 'idx_niveles_productividad_tenant_activo');
  });

  // ==================== PASO 3: AGREGAR NIVEL A USUARIOS_TENANTS ====================
  await knex.schema.alterTable('usuarios_tenants', (table) => {
    table.uuid('nivel_productividad_id').nullable()
      .references('id').inTable('niveles_productividad').onDelete('SET NULL')
      .comment('Nivel de productividad asignado al usuario');
  });

  // ==================== PASO 4: SEED NIVELES DEFAULT PARA TENANTS EXISTENTES ====================
  // Obtener todos los tenants
  const tenants = await knex('tenants').select('id');

  for (const tenant of tenants) {
    // Crear niveles básicos por defecto
    const niveles = [
      {
        tenant_id: tenant.id,
        nombre: 'Básico',
        codigo: 'basico',
        descripcion: 'Nivel inicial para nuevos asesores',
        orden: 1,
        meta_contactos_mes: 20,
        meta_captaciones_mes: 1,
        meta_ventas_mes: 0,
        meta_llamadas_mes: 60,
        meta_visitas_mes: 10,
        meta_propuestas_mes: 3,
        color: '#6366f1',
        es_default: true,
        activo: true
      },
      {
        tenant_id: tenant.id,
        nombre: 'Promedio',
        codigo: 'promedio',
        descripcion: 'Nivel intermedio con metas moderadas',
        orden: 2,
        meta_contactos_mes: 30,
        meta_captaciones_mes: 2,
        meta_ventas_mes: 1,
        meta_llamadas_mes: 100,
        meta_visitas_mes: 20,
        meta_propuestas_mes: 5,
        color: '#f59e0b',
        es_default: false,
        activo: true
      },
      {
        tenant_id: tenant.id,
        nombre: 'Experto',
        codigo: 'experto',
        descripcion: 'Nivel avanzado con metas exigentes',
        orden: 3,
        meta_contactos_mes: 50,
        meta_captaciones_mes: 4,
        meta_ventas_mes: 2,
        meta_llamadas_mes: 150,
        meta_visitas_mes: 30,
        meta_propuestas_mes: 10,
        color: '#16a34a',
        es_default: false,
        activo: true
      }
    ];

    // Insertar solo si no existen
    for (const nivel of niveles) {
      const exists = await knex('niveles_productividad')
        .where({ tenant_id: tenant.id, codigo: nivel.codigo })
        .first();

      if (!exists) {
        await knex('niveles_productividad').insert(nivel);
      }
    }

    // Asignar nivel básico a todos los usuarios del tenant que no tienen nivel
    const nivelBasico = await knex('niveles_productividad')
      .where({ tenant_id: tenant.id, codigo: 'basico' })
      .first();

    if (nivelBasico) {
      await knex('usuarios_tenants')
        .where({ tenant_id: tenant.id })
        .whereNull('nivel_productividad_id')
        .update({ nivel_productividad_id: nivelBasico.id });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  // Eliminar campo de usuarios_tenants
  await knex.schema.alterTable('usuarios_tenants', (table) => {
    table.dropColumn('nivel_productividad_id');
  });

  // Eliminar tabla de niveles
  await knex.schema.dropTableIfExists('niveles_productividad');

  // Eliminar campos de pesos de config_productividad
  const hasConfigProductividad = await knex.schema.hasTable('config_productividad');
  if (hasConfigProductividad) {
    await knex.schema.alterTable('config_productividad', (table) => {
      table.dropColumn('peso_visitas');
      table.dropColumn('peso_llamadas');
      table.dropColumn('peso_ventas');
      table.dropColumn('peso_captaciones');
      table.dropColumn('peso_contactos');
    });
  }
}
