import type { Knex } from 'knex';

/**
 * Migración 156: Crear tabla portales_catalogo
 *
 * Catálogo de portales inmobiliarios administrado por platform admin.
 * Los tenants ven los portales activos y los activan/desactivan por propiedad.
 * El campo portales (JSONB) de propiedades usa el 'codigo' como key.
 */

export async function up(knex: Knex): Promise<void> {
  console.log('⬆️  Ejecutando migración 156: create_portales_catalogo');

  await knex.schema.createTable('portales_catalogo', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('codigo', 50).notNullable().unique();
    table.string('nombre', 100).notNullable();
    table.text('descripcion');
    table.string('logo_url', 255);
    table.string('icono', 10);
    table.string('color', 7).defaultTo('#3b82f6');
    table.specificType('roles_auto_activo', 'text[]').defaultTo('{}');
    table.boolean('activo').defaultTo(true);
    table.integer('orden').defaultTo(0);
    table.timestamps(true, true);
  });

  // Indexes
  await knex.raw(`CREATE INDEX idx_portales_catalogo_activo ON portales_catalogo(activo) WHERE activo = true`);
  await knex.raw(`CREATE INDEX idx_portales_catalogo_codigo ON portales_catalogo(codigo)`);
  await knex.raw(`CREATE INDEX idx_portales_catalogo_orden ON portales_catalogo(orden)`);

  // Seed initial portales (migrate existing hardcoded ones + Ubika)
  await knex('portales_catalogo').insert([
    {
      codigo: 'mercadolibre',
      nombre: 'MercadoLibre',
      descripcion: 'Marketplace líder en Latinoamérica',
      icono: 'ML',
      color: '#FFE600',
      roles_auto_activo: '{}',
      activo: true,
      orden: 1,
    },
    {
      codigo: 'easybroker',
      nombre: 'EasyBroker',
      descripcion: 'CRM y portal inmobiliario',
      icono: 'EB',
      color: '#2563eb',
      roles_auto_activo: '{}',
      activo: true,
      orden: 2,
    },
    {
      codigo: 'corotos',
      nombre: 'Corotos',
      descripcion: 'Portal de clasificados República Dominicana',
      icono: 'CO',
      color: '#0ea5e9',
      roles_auto_activo: '{}',
      activo: true,
      orden: 3,
    },
    {
      codigo: 'ubika',
      nombre: 'Ubika',
      descripcion: 'Red de portales inmobiliarios CLIC Connect',
      icono: 'UB',
      color: '#8b5cf6',
      roles_auto_activo: '{connect}',
      activo: true,
      orden: 4,
    },
  ]);

  console.log('✅ Tabla portales_catalogo creada y poblada con 4 portales');
}

export async function down(knex: Knex): Promise<void> {
  console.log('⬇️  Revirtiendo migración 156');
  await knex.raw('DROP INDEX IF EXISTS idx_portales_catalogo_activo');
  await knex.raw('DROP INDEX IF EXISTS idx_portales_catalogo_codigo');
  await knex.raw('DROP INDEX IF EXISTS idx_portales_catalogo_orden');
  await knex.schema.dropTableIfExists('portales_catalogo');
  console.log('✅ Migración 156 revertida');
}
