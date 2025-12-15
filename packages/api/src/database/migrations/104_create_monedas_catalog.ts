import { Knex } from 'knex';

/**
 * Catálogo de monedas con tasas de conversión a USD
 * Permite triangulación entre monedas usando USD como base
 */
export async function up(knex: Knex): Promise<void> {
  // Crear tabla de catálogo de monedas
  const hasTable = await knex.schema.hasTable('cat_monedas');
  if (!hasTable) {
    await knex.schema.createTable('cat_monedas', (table) => {
      table.string('codigo', 3).primary().comment('Código ISO 4217 (USD, EUR, MXN, etc.)');
      table.string('nombre', 100).notNullable().comment('Nombre completo de la moneda');
      table.string('nombre_en', 100).nullable().comment('Nombre en inglés');
      table.string('simbolo', 10).notNullable().comment('Símbolo de la moneda ($, €, etc.)');
      table.decimal('tasa_usd', 18, 8).notNullable().defaultTo(1).comment('Tasa de conversión: 1 USD = X moneda');
      table.integer('decimales').defaultTo(2).comment('Cantidad de decimales para mostrar');
      table.string('formato', 50).defaultTo('{symbol}{amount}').comment('Formato de visualización');
      table.integer('orden').defaultTo(0).comment('Orden de visualización');
      table.boolean('activo').defaultTo(true);
      table.timestamp('tasa_actualizada_at').nullable().comment('Última actualización de la tasa');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.index('activo', 'idx_cat_monedas_activo');
      table.index('orden', 'idx_cat_monedas_orden');
    });

    // Insertar monedas iniciales con tasas aproximadas a USD
    // Tasa = cuántas unidades de esa moneda equivalen a 1 USD
    await knex('cat_monedas').insert([
      { codigo: 'USD', nombre: 'Dólar Estadounidense', nombre_en: 'US Dollar', simbolo: '$', tasa_usd: 1, decimales: 2, orden: 1 },
      { codigo: 'EUR', nombre: 'Euro', nombre_en: 'Euro', simbolo: '€', tasa_usd: 0.92, decimales: 2, orden: 2 },
      { codigo: 'MXN', nombre: 'Peso Mexicano', nombre_en: 'Mexican Peso', simbolo: '$', tasa_usd: 17.50, decimales: 2, orden: 3 },
      { codigo: 'DOP', nombre: 'Peso Dominicano', nombre_en: 'Dominican Peso', simbolo: 'RD$', tasa_usd: 58.50, decimales: 2, orden: 4 },
      { codigo: 'COP', nombre: 'Peso Colombiano', nombre_en: 'Colombian Peso', simbolo: '$', tasa_usd: 4100, decimales: 0, orden: 5 },
      { codigo: 'CLP', nombre: 'Peso Chileno', nombre_en: 'Chilean Peso', simbolo: '$', tasa_usd: 980, decimales: 0, orden: 6 },
      { codigo: 'ARS', nombre: 'Peso Argentino', nombre_en: 'Argentine Peso', simbolo: '$', tasa_usd: 875, decimales: 2, orden: 7 },
      { codigo: 'PEN', nombre: 'Sol Peruano', nombre_en: 'Peruvian Sol', simbolo: 'S/', tasa_usd: 3.75, decimales: 2, orden: 8 },
      { codigo: 'BRL', nombre: 'Real Brasileño', nombre_en: 'Brazilian Real', simbolo: 'R$', tasa_usd: 5.10, decimales: 2, orden: 9 },
      { codigo: 'GTQ', nombre: 'Quetzal Guatemalteco', nombre_en: 'Guatemalan Quetzal', simbolo: 'Q', tasa_usd: 7.85, decimales: 2, orden: 10 },
      { codigo: 'HNL', nombre: 'Lempira Hondureño', nombre_en: 'Honduran Lempira', simbolo: 'L', tasa_usd: 24.70, decimales: 2, orden: 11 },
      { codigo: 'NIO', nombre: 'Córdoba Nicaragüense', nombre_en: 'Nicaraguan Córdoba', simbolo: 'C$', tasa_usd: 36.70, decimales: 2, orden: 12 },
      { codigo: 'CRC', nombre: 'Colón Costarricense', nombre_en: 'Costa Rican Colón', simbolo: '₡', tasa_usd: 530, decimales: 0, orden: 13 },
      { codigo: 'PAB', nombre: 'Balboa Panameño', nombre_en: 'Panamanian Balboa', simbolo: 'B/.', tasa_usd: 1, decimales: 2, orden: 14 },
      { codigo: 'UYU', nombre: 'Peso Uruguayo', nombre_en: 'Uruguayan Peso', simbolo: '$U', tasa_usd: 39.50, decimales: 2, orden: 15 },
      { codigo: 'BOB', nombre: 'Boliviano', nombre_en: 'Bolivian Boliviano', simbolo: 'Bs', tasa_usd: 6.91, decimales: 2, orden: 16 },
      { codigo: 'PYG', nombre: 'Guaraní Paraguayo', nombre_en: 'Paraguayan Guaraní', simbolo: '₲', tasa_usd: 7500, decimales: 0, orden: 17 },
      { codigo: 'VES', nombre: 'Bolívar Venezolano', nombre_en: 'Venezuelan Bolívar', simbolo: 'Bs', tasa_usd: 36.50, decimales: 2, orden: 18 },
      { codigo: 'CAD', nombre: 'Dólar Canadiense', nombre_en: 'Canadian Dollar', simbolo: 'C$', tasa_usd: 1.36, decimales: 2, orden: 19 },
      { codigo: 'GBP', nombre: 'Libra Esterlina', nombre_en: 'British Pound', simbolo: '£', tasa_usd: 0.79, decimales: 2, orden: 20 },
    ]);
  }

  // Crear tabla de monedas habilitadas por tenant
  const hasTenantMonedas = await knex.schema.hasTable('tenant_monedas');
  if (!hasTenantMonedas) {
    await knex.schema.createTable('tenant_monedas', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.string('moneda_codigo', 3).notNullable().references('codigo').inTable('cat_monedas').onDelete('CASCADE');
      table.boolean('es_default').defaultTo(false).comment('Moneda por defecto del tenant');
      table.integer('orden').defaultTo(0).comment('Orden en el dropdown');
      table.boolean('activo').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.unique(['tenant_id', 'moneda_codigo']);
      table.index('tenant_id', 'idx_tenant_monedas_tenant');
    });
  }

  console.log('✅ Created cat_monedas and tenant_monedas tables');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('tenant_monedas');
  await knex.schema.dropTableIfExists('cat_monedas');
}
