import { Knex } from 'knex';

/**
 * Migración - Temas y Colores de Tenants
 * 
 * Crea la estructura para gestionar temas personalizados por tenant
 */
export async function up(knex: Knex): Promise<void> {
  // Tabla de temas
  await knex.schema.createTable('temas_tenant', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().unique().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('nombre').notNullable().defaultTo('Tema Personalizado');
    table.jsonb('colores').notNullable().defaultTo(JSON.stringify({
      primary: '#667eea',
      secondary: '#764ba2',
      accent: '#f56565',
      background: '#ffffff',
      text: '#1a202c',
      textSecondary: '#718096',
      border: '#e2e8f0',
      success: '#48bb78',
      warning: '#ed8936',
      error: '#f56565',
    })).comment('Colores del tema en formato JSON');
    table.jsonb('tipografia').defaultTo('{}').comment('Configuración de tipografía');
    table.jsonb('espaciado').defaultTo('{}').comment('Configuración de espaciado');
    table.boolean('activo').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index('tenant_id', 'idx_temas_tenant_id');
  });

  // Tabla de variantes de componentes
  await knex.schema.createTable('variantes_componentes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('tipo_componente', 50).notNullable().comment('Tipo de componente (hero, footer, etc.)');
    table.string('variante', 50).notNullable().defaultTo('default').comment('Nombre de la variante');
    table.jsonb('configuracion').defaultTo('{}').comment('Configuración específica de la variante');
    table.boolean('es_default').defaultTo(false).comment('Si es la variante por defecto para este tipo');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.unique(['tenant_id', 'tipo_componente', 'variante'], 'idx_variantes_unique');
    table.index('tenant_id', 'idx_variantes_tenant');
    table.index('tipo_componente', 'idx_variantes_tipo');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('variantes_componentes');
  await knex.schema.dropTableIfExists('temas_tenant');
}



