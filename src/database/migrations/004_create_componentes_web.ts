import { Knex } from 'knex';

/**
 * Migración - Componentes Web Configurados
 * 
 * Crea la estructura para gestionar componentes web configurados por tenant
 */
export async function up(knex: Knex): Promise<void> {
  // Tabla de componentes web configurados
  await knex.schema.createTable('componentes_web', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('tipo', 50).notNullable().comment('Tipo de componente (header, hero, footer, etc.)');
    table.string('variante', 50).notNullable().defaultTo('default').comment('Variante del componente');
    table.jsonb('datos').notNullable().defaultTo('{}').comment('Datos/configuración del componente (JSON)');
    table.boolean('activo').defaultTo(true).comment('Si el componente está activo');
    table.integer('orden').defaultTo(0).comment('Orden de visualización');
    table.uuid('pagina_id').nullable().references('id').inTable('paginas_web').onDelete('CASCADE').comment('Página específica (null = todas las páginas)');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Índices
    table.index('tenant_id', 'idx_componentes_web_tenant');
    table.index('pagina_id', 'idx_componentes_web_pagina');
    table.index(['tenant_id', 'activo'], 'idx_componentes_web_tenant_activo');
    table.index(['tenant_id', 'orden'], 'idx_componentes_web_tenant_orden');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('componentes_web');
}



