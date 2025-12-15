import type { Knex } from 'knex';

/**
 * Migración 100: Eliminar tabla obsoleta tenants_rutas_config
 *
 * Esta tabla fue reemplazada por:
 * - tipos_pagina.alias_rutas (fuente de verdad para rutas estándar del sistema)
 * - tenants_rutas_config_custom (rutas personalizadas por tenant)
 *
 * La arquitectura actual:
 * 1. tipos_pagina define todas las rutas estándar con alias por idioma
 * 2. tenants_rutas_config_custom permite a cada tenant agregar rutas personalizadas
 * 3. routeResolver.ts obtiene rutas de ambas fuentes en getRutasConfigTenant()
 */

export async function up(knex: Knex): Promise<void> {
  console.log('⬆️  Ejecutando migración 100: drop_tenants_rutas_config');

  // Verificar si la tabla existe
  const hasTable = await knex.schema.hasTable('tenants_rutas_config');

  if (hasTable) {
    // Primero eliminar las foreign keys que apuntan a esta tabla
    const hasFK = await knex.raw(`
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_type = 'FOREIGN KEY'
        AND table_name = 'componentes_web'
        AND constraint_name LIKE '%tenants_rutas_config%'
        AND constraint_name NOT LIKE '%custom%'
      LIMIT 1
    `);

    if (hasFK.rows.length > 0) {
      console.log('   Eliminando foreign keys...');
      await knex.raw(`
        ALTER TABLE componentes_web
        DROP CONSTRAINT IF EXISTS componentes_web_tenant_rutas_config_id_foreign
      `);
    }

    // Eliminar índices
    await knex.raw('DROP INDEX IF EXISTS idx_tenants_rutas_config_tenant');
    await knex.raw('DROP INDEX IF EXISTS idx_tenants_rutas_config_prefijo');
    await knex.raw('DROP INDEX IF EXISTS idx_tenants_rutas_config_habilitado');
    await knex.raw('DROP INDEX IF EXISTS idx_tenants_rutas_config_tipo_pagina');

    // Eliminar la tabla
    await knex.schema.dropTable('tenants_rutas_config');
    console.log('✅ Tabla tenants_rutas_config eliminada');
  } else {
    console.log('ℹ️  Tabla tenants_rutas_config no existe, nada que eliminar');
  }
}

export async function down(knex: Knex): Promise<void> {
  console.log('⬇️  Revirtiendo migración 100');

  // Recrear la tabla si se necesita revertir (estructura básica)
  const hasTable = await knex.schema.hasTable('tenants_rutas_config');

  if (!hasTable) {
    await knex.schema.createTable('tenants_rutas_config', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.string('prefijo', 100).notNullable();
      table.integer('nivel_navegacion').defaultTo(0);
      table.jsonb('alias_idiomas').defaultTo('{}');
      table.boolean('habilitado').defaultTo(true);
      table.integer('orden').defaultTo(0);
      table.uuid('tipo_pagina_id').references('id').inTable('tipos_pagina');
      table.timestamps(true, true);

      table.unique(['tenant_id', 'prefijo']);
    });

    // Recrear índices
    await knex.raw(`
      CREATE INDEX idx_tenants_rutas_config_tenant ON tenants_rutas_config(tenant_id);
      CREATE INDEX idx_tenants_rutas_config_prefijo ON tenants_rutas_config(prefijo);
      CREATE INDEX idx_tenants_rutas_config_habilitado ON tenants_rutas_config(habilitado) WHERE habilitado = true;
    `);

    console.log('✅ Tabla tenants_rutas_config recreada (vacía)');
  }
}
