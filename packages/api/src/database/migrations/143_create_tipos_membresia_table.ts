import { Knex } from 'knex';

/**
 * Migración - Tabla de Tipos de Membresía
 *
 * Define los diferentes tipos de membresía/planes disponibles en la plataforma.
 * Cada tipo tiene su precio base, límites de usuarios/propiedades y costos adicionales.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('tipos_membresia', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Identificación
    table.string('codigo', 50).unique().notNullable().comment('Código único: tenant, marketplace, etc.');
    table.string('nombre', 100).notNullable().comment('Nombre visible');
    table.text('descripcion').nullable().comment('Descripción del plan');

    // Configuración de precios base
    table.decimal('precio_base', 10, 2).notNullable().defaultTo(0).comment('Precio mensual base');
    table.string('moneda', 3).defaultTo('USD').comment('Moneda del precio');
    table.string('ciclo_facturacion', 20).defaultTo('mensual').comment('mensual, anual, trimestral');

    // Límites incluidos en el precio base
    table.integer('usuarios_incluidos').defaultTo(1).comment('Usuarios incluidos en precio base');
    table.integer('propiedades_incluidas').defaultTo(0).comment('Propiedades incluidas en precio base');

    // Costos adicionales por unidad extra
    table.decimal('costo_usuario_adicional', 10, 2).defaultTo(0).comment('Costo por cada usuario extra/mes');
    table.decimal('costo_propiedad_adicional', 10, 4).defaultTo(0).comment('Costo por cada propiedad extra/mes');

    // Configuración especial
    table.boolean('permite_pagina_web').defaultTo(false).comment('Si incluye sitio web');
    table.boolean('permite_subtenants').defaultTo(false).comment('Puede tener tenant-child');
    table.boolean('es_individual').defaultTo(false).comment('Es para usuarios individuales (marketplace, connect)');

    // Features incluidos por defecto
    table.jsonb('features_incluidos').defaultTo('[]').comment('Array de feature_ids incluidos');

    // Control
    table.boolean('activo').defaultTo(true);
    table.integer('orden').defaultTo(0).comment('Orden de visualización');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Índices
    table.index('codigo', 'idx_tipos_membresia_codigo');
    table.index('activo', 'idx_tipos_membresia_activo');
  });

  // Insertar tipos de membresía iniciales
  await knex('tipos_membresia').insert([
    {
      codigo: 'tenant',
      nombre: 'Tenant Base',
      descripcion: 'Plan completo para inmobiliarias con sitio web, CRM y gestión de propiedades',
      precio_base: 90.00,
      moneda: 'USD',
      ciclo_facturacion: 'mensual',
      usuarios_incluidos: 2,
      propiedades_incluidas: 100,
      costo_usuario_adicional: 5.00,
      costo_propiedad_adicional: 0.05,
      permite_pagina_web: true,
      permite_subtenants: true,
      es_individual: false,
      orden: 1,
    },
    {
      codigo: 'tenant-child',
      nombre: 'Tenant Child',
      descripcion: 'Sub-cuenta dependiente de un tenant principal',
      precio_base: 0.00,
      moneda: 'USD',
      ciclo_facturacion: 'mensual',
      usuarios_incluidos: 1,
      propiedades_incluidas: 50,
      costo_usuario_adicional: 3.00,
      costo_propiedad_adicional: 0.03,
      permite_pagina_web: false,
      permite_subtenants: false,
      es_individual: false,
      orden: 2,
    },
    {
      codigo: 'marketplace',
      nombre: 'Marketplace',
      descripcion: 'Plan para agentes independientes que publican en el marketplace',
      precio_base: 15.00,
      moneda: 'USD',
      ciclo_facturacion: 'mensual',
      usuarios_incluidos: 1,
      propiedades_incluidas: 20,
      costo_usuario_adicional: 0.00,
      costo_propiedad_adicional: 0.10,
      permite_pagina_web: false,
      permite_subtenants: false,
      es_individual: true,
      orden: 3,
    },
    {
      codigo: 'rentas-vacacionales',
      nombre: 'Rentas Vacacionales',
      descripcion: 'Plan especializado para gestores de rentas vacacionales',
      precio_base: 50.00,
      moneda: 'USD',
      ciclo_facturacion: 'mensual',
      usuarios_incluidos: 2,
      propiedades_incluidas: 50,
      costo_usuario_adicional: 5.00,
      costo_propiedad_adicional: 0.08,
      permite_pagina_web: true,
      permite_subtenants: false,
      es_individual: false,
      orden: 4,
    },
    {
      codigo: 'entrenamiento',
      nombre: 'Entrenamiento',
      descripcion: 'Acceso solo a University - cursos y certificaciones',
      precio_base: 10.00,
      moneda: 'USD',
      ciclo_facturacion: 'mensual',
      usuarios_incluidos: 1,
      propiedades_incluidas: 0,
      costo_usuario_adicional: 0.00,
      costo_propiedad_adicional: 0.00,
      permite_pagina_web: false,
      permite_subtenants: false,
      es_individual: true,
      orden: 5,
    },
    {
      codigo: 'connect',
      nombre: 'Connect',
      descripcion: 'Plan para usuarios de CLIC Connect - networking inmobiliario',
      precio_base: 5.00,
      moneda: 'USD',
      ciclo_facturacion: 'mensual',
      usuarios_incluidos: 1,
      propiedades_incluidas: 10,
      costo_usuario_adicional: 0.00,
      costo_propiedad_adicional: 0.05,
      permite_pagina_web: false,
      permite_subtenants: false,
      es_individual: true,
      orden: 6,
    },
  ]);

  console.log('✅ Tabla tipos_membresia creada con 6 tipos iniciales');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('tipos_membresia');
}
