import { Knex } from 'knex';

/**
 * Migración 073 - Refactorización Arquitectura de Páginas
 *
 * Cambios principales:
 * 1. paginas_web.tipo_pagina (string) → tipo_pagina_id (FK)
 * 2. componentes_web.default_data (JSONB) para datos de ejemplo
 * 3. paginas_componentes.config_override (JSONB) para overrides
 * 4. paginas_web.inherit_from_type (boolean) para herencia
 *
 * Objetivos:
 * - Fuente única de verdad: tipos_pagina
 * - Herencia de componentes desde el tipo
 * - Sin duplicación innecesaria
 * - Integridad referencial
 */
export async function up(knex: Knex): Promise<void> {
  console.log('🔄 Iniciando refactorización de arquitectura de páginas...');

  // ========================================
  // 0. Agregar ID UUID a tipos_pagina (si no existe)
  // ========================================
  console.log('🆔 Verificando/agregando ID a tipos_pagina...');

  const hasId = await knex.schema.hasColumn('tipos_pagina', 'id');
  if (!hasId) {
    console.log('   Agregando columna id...');
    await knex.schema.alterTable('tipos_pagina', (table) => {
      table.uuid('id').defaultTo(knex.raw('gen_random_uuid()'));
    });

    // Generar IDs para registros existentes
    await knex.raw(`UPDATE tipos_pagina SET id = gen_random_uuid() WHERE id IS NULL`);

    // Hacer NOT NULL
    await knex.raw(`ALTER TABLE tipos_pagina ALTER COLUMN id SET NOT NULL`);

    // Crear índice único
    await knex.raw(`CREATE UNIQUE INDEX tipos_pagina_id_idx ON tipos_pagina(id)`);

    console.log('   ✅ ID agregado a tipos_pagina');
  }

  // ========================================
  // 1. Agregar default_data a componentes_web
  // ========================================
  console.log('📦 Agregando default_data a componentes_web...');

  const hasDefaultData = await knex.schema.hasColumn('componentes_web', 'default_data');
  if (!hasDefaultData) {
    await knex.schema.alterTable('componentes_web', (table) => {
      table.jsonb('default_data').nullable().comment('Datos de ejemplo/default para nuevas instancias');
    });

    // Copiar datos existentes a default_data (solo para componentes globales)
    await knex.raw(`
      UPDATE componentes_web
      SET default_data = datos
      WHERE pagina_id IS NULL
        AND tenant_id IS NULL
        AND default_data IS NULL
    `);
  }

  // ========================================
  // 2. Agregar config_override a paginas_componentes
  // ========================================
  console.log('⚙️  Agregando config_override a paginas_componentes...');

  const hasConfigOverride = await knex.schema.hasColumn('paginas_componentes', 'config_override');
  if (!hasConfigOverride) {
    await knex.schema.alterTable('paginas_componentes', (table) => {
      table.jsonb('config_override').nullable().comment('Configuración customizada que sobreescribe default_data');
    });
  }

  // ========================================
  // 3. Agregar tipo_pagina_id a paginas_web
  // ========================================
  console.log('🔗 Agregando tipo_pagina_id a paginas_web...');

  const hasTipoPaginaId = await knex.schema.hasColumn('paginas_web', 'tipo_pagina_id');
  if (!hasTipoPaginaId) {
    await knex.schema.alterTable('paginas_web', (table) => {
      table.uuid('tipo_pagina_id').nullable().comment('FK a tipos_pagina.id - reemplaza tipo_pagina string');
      table.foreign('tipo_pagina_id').references('id').inTable('tipos_pagina').onDelete('RESTRICT');
    });
  }

  // ========================================
  // 4. Migrar datos: tipo_pagina (string) → tipo_pagina_id (FK)
  // ========================================
  console.log('🔄 Migrando tipo_pagina de string a FK...');

  // Mapear strings a IDs
  const tiposPagina = await knex('tipos_pagina').select('id', 'codigo');
  const tipoMap: Record<string, string> = {};
  tiposPagina.forEach((tipo: any) => {
    tipoMap[tipo.codigo] = tipo.id;
  });

  // Actualizar páginas existentes
  const paginas = await knex('paginas_web').select('id', 'tipo_pagina');
  let migratedCount = 0;
  let unmatchedCount = 0;

  for (const pagina of paginas) {
    const tipoId = tipoMap[pagina.tipo_pagina];

    if (tipoId) {
      await knex('paginas_web')
        .where('id', pagina.id)
        .update({ tipo_pagina_id: tipoId });
      migratedCount++;
    } else {
      console.warn(`⚠️  Página ${pagina.id} tiene tipo_pagina '${pagina.tipo_pagina}' sin match en tipos_pagina`);
      unmatchedCount++;

      // Intentar encontrar un tipo por defecto (homepage)
      const defaultTipo = tipoMap['homepage'] || tipoMap['home'] || Object.values(tipoMap)[0];
      if (defaultTipo) {
        await knex('paginas_web')
          .where('id', pagina.id)
          .update({ tipo_pagina_id: defaultTipo });
        console.log(`   → Asignado a tipo por defecto`);
      }
    }
  }

  console.log(`   ✅ Migradas: ${migratedCount} páginas`);
  if (unmatchedCount > 0) {
    console.log(`   ⚠️  Sin match: ${unmatchedCount} páginas (asignadas a default)`);
  }

  // ========================================
  // 5. Agregar inherit_from_type a paginas_web
  // ========================================
  console.log('📋 Agregando inherit_from_type a paginas_web...');

  const hasInheritFromType = await knex.schema.hasColumn('paginas_web', 'inherit_from_type');
  if (!hasInheritFromType) {
    await knex.schema.alterTable('paginas_web', (table) => {
      table.boolean('inherit_from_type').defaultTo(true).comment('Si true, hereda componentes del tipo_pagina');
    });
  }

  // ========================================
  // 6. Hacer tipo_pagina_id NOT NULL (después de migrar datos)
  // ========================================
  console.log('🔒 Haciendo tipo_pagina_id NOT NULL...');

  // Verificar que todas las páginas tienen tipo_pagina_id
  const paginasSinTipo = await knex('paginas_web')
    .whereNull('tipo_pagina_id')
    .count('* as count')
    .first();

  if (parseInt(paginasSinTipo?.count as string) === 0) {
    await knex.raw(`
      ALTER TABLE paginas_web
      ALTER COLUMN tipo_pagina_id SET NOT NULL
    `);
    console.log('   ✅ tipo_pagina_id ahora es NOT NULL');
  } else {
    console.warn(`   ⚠️  ${paginasSinTipo?.count} páginas sin tipo_pagina_id, omitiendo NOT NULL constraint`);
  }

  // ========================================
  // 7. Deprecar tipo_pagina (string) - Mantenemos por compatibilidad temporal
  // ========================================
  console.log('📝 Marcando tipo_pagina como deprecated...');
  await knex.raw(`
    COMMENT ON COLUMN paginas_web.tipo_pagina IS 'DEPRECATED - Usar tipo_pagina_id en su lugar'
  `);

  console.log('✅ Refactorización completada!');
  console.log('');
  console.log('📊 Resumen de cambios:');
  console.log('   • componentes_web: + default_data (JSONB)');
  console.log('   • paginas_componentes: + config_override (JSONB)');
  console.log('   • paginas_web: + tipo_pagina_id (FK), + inherit_from_type (boolean)');
  console.log('   • paginas_web.tipo_pagina: DEPRECATED');
  console.log('');
  console.log('⚡ Nueva arquitectura:');
  console.log('   tipos_pagina → fuente de verdad de tipos');
  console.log('   paginas_web → instancias con herencia opcional');
  console.log('   componentes_web → catálogo con default_data');
  console.log('   paginas_componentes → composición + config_override');
}

export async function down(knex: Knex): Promise<void> {
  console.log('⏪ Revertiendo refactorización de arquitectura...');

  // Revertir en orden inverso
  await knex.schema.alterTable('paginas_web', (table) => {
    table.dropForeign(['tipo_pagina_id']);
    table.dropColumn('tipo_pagina_id');
    table.dropColumn('inherit_from_type');
  });

  await knex.schema.alterTable('paginas_componentes', (table) => {
    table.dropColumn('config_override');
  });

  await knex.schema.alterTable('componentes_web', (table) => {
    table.dropColumn('default_data');
  });

  console.log('✅ Rollback completado');
}
