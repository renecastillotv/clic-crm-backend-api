import { Knex } from 'knex';

/**
 * Migración: Extender Sistema de Páginas
 *
 * Agrega campos y tablas para:
 * - Separar páginas del sistema vs custom
 * - Control de visibilidad por tenant/plan
 * - Configuración por variante sin pérdida de datos
 * - Herencia entre variantes
 */
export async function up(knex: Knex): Promise<void> {
  // 1. Extender tipos_pagina
  const hasCategoria = await knex.schema.hasColumn('tipos_pagina', 'categoria');
  if (!hasCategoria) {
    await knex.schema.alterTable('tipos_pagina', (table) => {
      table.string('categoria', 20).defaultTo('estandar').comment('sistema | estandar | premium');
      table.string('plan_minimo', 20).nullable().comment('Plan mínimo: basic, pro, premium, enterprise');
      table.boolean('is_visible_default').defaultTo(true).comment('Si es visible por defecto para nuevos tenants');
    });
    console.log('✅ Campos agregados a tipos_pagina');
  }

  // 2. Extender paginas_web
  const hasOrigen = await knex.schema.hasColumn('paginas_web', 'origen');
  if (!hasOrigen) {
    await knex.schema.alterTable('paginas_web', (table) => {
      table.string('origen', 20).defaultTo('sistema').comment('sistema | custom');
      table.uuid('pagina_padre_id').nullable().references('id').inTable('paginas_web').onDelete('SET NULL').comment('Para herencia de config');
    });
    console.log('✅ Campos agregados a paginas_web');

    // Marcar páginas existentes según tipo
    await knex('paginas_web')
      .where('tipo_pagina', 'custom')
      .update({ origen: 'custom' });

    await knex('paginas_web')
      .whereNot('tipo_pagina', 'custom')
      .update({ origen: 'sistema' });

    console.log('✅ Páginas existentes clasificadas');
  }

  // 3. Crear tabla tenant_paginas_activas
  const hasTenantPaginas = await knex.schema.hasTable('tenant_paginas_activas');
  if (!hasTenantPaginas) {
    await knex.schema.createTable('tenant_paginas_activas', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.string('tipo_pagina', 50).notNullable().references('codigo').inTable('tipos_pagina').onDelete('CASCADE');

      // Control de visibilidad y activación
      table.boolean('is_visible').defaultTo(true).comment('Visible según plan/features del tenant');
      table.boolean('is_enabled').defaultTo(true).comment('Usuario activó esta página');

      // Configuración activa
      table.string('variante_activa', 50).defaultTo('default').comment('Variante actualmente activa');
      table.jsonb('configuracion_variantes').defaultTo('{}').comment('Config guardada por variante: {default: {...}, variant1: {...}}');

      // Metadata
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('last_activated_at').nullable().comment('Última vez que se activó');

      // Constraints
      table.unique(['tenant_id', 'tipo_pagina'], 'idx_tenant_paginas_activas_unique');
      table.index('tenant_id', 'idx_tenant_paginas_activas_tenant');
      table.index('is_visible', 'idx_tenant_paginas_activas_visible');
      table.index('is_enabled', 'idx_tenant_paginas_activas_enabled');
    });
    console.log('✅ Tabla tenant_paginas_activas creada');
  }

  // 4. Crear tabla paginas_variantes_config
  const hasPaginasVariantes = await knex.schema.hasTable('paginas_variantes_config');
  if (!hasPaginasVariantes) {
    await knex.schema.createTable('paginas_variantes_config', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('pagina_id').notNullable().references('id').inTable('paginas_web').onDelete('CASCADE');
      table.string('variante', 50).notNullable().comment('Código de la variante');

      // Configuración
      table.jsonb('componentes_activos').defaultTo('[]').comment('Array de códigos de componentes activos');
      table.jsonb('configuracion_componentes').defaultTo('{}').comment('Config por componente: {header: {...}, hero: {...}}');

      // Herencia
      table.string('hereda_de_variante', 50).nullable().comment('Variante de la que hereda config base');
      table.jsonb('campos_heredados').defaultTo('[]').comment('Campos que se heredan de la variante padre');

      // Metadata
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('last_used_at').nullable().comment('Última vez que se activó esta variante');

      // Constraints
      table.unique(['pagina_id', 'variante'], 'idx_paginas_variantes_config_unique');
      table.index('pagina_id', 'idx_paginas_variantes_config_pagina');
      table.index('variante', 'idx_paginas_variantes_config_variante');
    });
    console.log('✅ Tabla paginas_variantes_config creada');
  }

  // 5. Crear tabla tenant_componentes_disponibles
  const hasTenantComponentes = await knex.schema.hasTable('tenant_componentes_disponibles');
  if (!hasTenantComponentes) {
    await knex.schema.createTable('tenant_componentes_disponibles', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('componente_catalogo_id').notNullable().references('id').inTable('componentes_catalogo').onDelete('CASCADE');

      // Control de acceso
      table.boolean('is_visible').defaultTo(true).comment('Visible para este tenant según plan');
      table.boolean('is_enabled').defaultTo(true).comment('Usuario puede usarlo');

      // Metadata
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      // Constraints
      table.unique(['tenant_id', 'componente_catalogo_id'], 'idx_tenant_componentes_unique');
      table.index('tenant_id', 'idx_tenant_componentes_tenant');
      table.index('is_visible', 'idx_tenant_componentes_visible');
    });
    console.log('✅ Tabla tenant_componentes_disponibles creada');
  }

  // 6. Poblar tenant_paginas_activas con datos existentes
  const tenants = await knex('tenants').select('id');
  const tiposPagina = await knex('tipos_pagina').where('es_estandar', true).select('codigo', 'is_visible_default');

  for (const tenant of tenants) {
    for (const tipo of tiposPagina) {
      // Verificar si ya existe una página de este tipo para este tenant
      const paginaExiste = await knex('paginas_web')
        .where({
          tenant_id: tenant.id,
          tipo_pagina: tipo.codigo
        })
        .first();

      const exists = await knex('tenant_paginas_activas')
        .where({
          tenant_id: tenant.id,
          tipo_pagina: tipo.codigo
        })
        .first();

      if (!exists) {
        await knex('tenant_paginas_activas').insert({
          tenant_id: tenant.id,
          tipo_pagina: tipo.codigo,
          is_visible: tipo.is_visible_default ?? true,
          is_enabled: !!paginaExiste && paginaExiste.activa,
          variante_activa: paginaExiste?.variante || 'default',
        });
      }
    }
  }
  console.log('✅ tenant_paginas_activas poblado con datos existentes');

  // 7. Migrar configuraciones de páginas existentes a paginas_variantes_config
  const paginasConConfig = await knex('paginas_web')
    .whereNotNull('contenido')
    .select('id', 'variante', 'contenido');

  for (const pagina of paginasConConfig) {
    const exists = await knex('paginas_variantes_config')
      .where({
        pagina_id: pagina.id,
        variante: pagina.variante || 'default'
      })
      .first();

    if (!exists && pagina.contenido) {
      const componentesActivos = pagina.contenido.componentes || [];
      const configuracionComponentes = pagina.contenido.configuracion || {};

      await knex('paginas_variantes_config').insert({
        pagina_id: pagina.id,
        variante: pagina.variante || 'default',
        componentes_activos: JSON.stringify(componentesActivos),
        configuracion_componentes: JSON.stringify(configuracionComponentes),
        last_used_at: knex.fn.now(),
      });
    }
  }
  console.log('✅ Configuraciones migradas a paginas_variantes_config');

  // 8. Poblar tenant_componentes_disponibles
  const componentesCatalogo = await knex('componentes_catalogo').select('id', 'plan_minimo');

  for (const tenant of tenants) {
    // Obtener plan del tenant
    const tenantData = await knex('tenants').where('id', tenant.id).first();
    const planTenant = tenantData?.plan || 'basic';

    for (const componente of componentesCatalogo) {
      const isVisible = !componente.plan_minimo ||
        (planTenant === 'enterprise') ||
        (planTenant === 'premium' && ['premium', 'pro', 'basic'].includes(componente.plan_minimo)) ||
        (planTenant === 'pro' && ['pro', 'basic'].includes(componente.plan_minimo)) ||
        (planTenant === 'basic' && componente.plan_minimo === 'basic');

      const exists = await knex('tenant_componentes_disponibles')
        .where({
          tenant_id: tenant.id,
          componente_catalogo_id: componente.id
        })
        .first();

      if (!exists) {
        await knex('tenant_componentes_disponibles').insert({
          tenant_id: tenant.id,
          componente_catalogo_id: componente.id,
          is_visible: isVisible,
          is_enabled: isVisible,
        });
      }
    }
  }
  console.log('✅ tenant_componentes_disponibles poblado');
}

export async function down(knex: Knex): Promise<void> {
  // Eliminar tablas nuevas
  await knex.schema.dropTableIfExists('tenant_componentes_disponibles');
  await knex.schema.dropTableIfExists('paginas_variantes_config');
  await knex.schema.dropTableIfExists('tenant_paginas_activas');

  // Eliminar columnas agregadas
  const hasOrigen = await knex.schema.hasColumn('paginas_web', 'origen');
  if (hasOrigen) {
    await knex.schema.alterTable('paginas_web', (table) => {
      table.dropColumn('origen');
      table.dropColumn('pagina_padre_id');
    });
  }

  const hasCategoria = await knex.schema.hasColumn('tipos_pagina', 'categoria');
  if (hasCategoria) {
    await knex.schema.alterTable('tipos_pagina', (table) => {
      table.dropColumn('categoria');
      table.dropColumn('plan_minimo');
      table.dropColumn('is_visible_default');
    });
  }

  console.log('❌ Rollback completado');
}
