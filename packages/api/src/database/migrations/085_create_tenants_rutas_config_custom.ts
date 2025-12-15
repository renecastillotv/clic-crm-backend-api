import { Knex } from 'knex';

/**
 * Migración 085: Crear tabla tenants_rutas_config_custom
 *
 * Crea una tabla con la misma estructura que tenants_rutas_config
 * para almacenar configuraciones personalizadas de rutas por tenant
 */
export async function up(knex: Knex): Promise<void> {
  console.log('📦 Creando tabla tenants_rutas_config_custom...\n');

  const hasTable = await knex.schema.hasTable('tenants_rutas_config_custom');

  if (!hasTable) {
    await knex.schema.createTable('tenants_rutas_config_custom', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');

      // Prefijo de la ruta (testimonios, articulos, videos, asesores, etc.)
      table.string('prefijo', 100).notNullable();

      // Nivel de navegación:
      // 0 = solo directorio (ej: /testimonios/ muestra todos, /testimonios/slug es single)
      // 1 = directorio + single (ej: /testimonios/ = todos, /testimonios/slug = single)
      // 2 = directorio + categoría + single (ej: /testimonios/categoria/slug)
      table.integer('nivel_navegacion').notNullable().defaultTo(1);

      // Aliases por idioma: {"en": "testimonials", "fr": "temoignages", "pt": "testemunhos"}
      table.jsonb('alias_idiomas').defaultTo('{}');

      // Si está habilitado para este tenant
      table.boolean('habilitado').defaultTo(true);

      // Orden de prioridad al resolver (menor = más prioritario)
      table.integer('orden').defaultTo(0);

      // FK opcional a tipos_pagina para validar rutas válidas
      table.uuid('tipo_pagina_id')
        .nullable()
        .references('id')
        .inTable('tipos_pagina')
        .onDelete('SET NULL')
        .onUpdate('CASCADE');

      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      // Un tenant solo puede tener una configuración por prefijo
      table.unique(['tenant_id', 'prefijo']);
    });

    // Índices para búsqueda rápida
    await knex.raw(`
      CREATE INDEX idx_tenants_rutas_config_custom_tenant ON tenants_rutas_config_custom(tenant_id);
      CREATE INDEX idx_tenants_rutas_config_custom_prefijo ON tenants_rutas_config_custom(prefijo);
      CREATE INDEX idx_tenants_rutas_config_custom_habilitado ON tenants_rutas_config_custom(habilitado) WHERE habilitado = true;
      CREATE INDEX idx_tenants_rutas_config_custom_tipo_pagina ON tenants_rutas_config_custom(tipo_pagina_id) WHERE tipo_pagina_id IS NOT NULL;
    `);

    console.log('✅ Tabla tenants_rutas_config_custom creada exitosamente');
  } else {
    console.log('⏭️  Tabla tenants_rutas_config_custom ya existe');
  }

  console.log('\n✅ Migración 085 completada\n');
}

export async function down(knex: Knex): Promise<void> {
  console.log('⏪ Eliminando tabla tenants_rutas_config_custom...\n');

  await knex.schema.dropTableIfExists('tenants_rutas_config_custom');

  console.log('✅ Rollback completado\n');
}
