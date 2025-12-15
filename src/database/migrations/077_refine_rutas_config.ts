import { Knex } from 'knex';

/**
 * Migración 077 - Refinar tenants_rutas_config
 *
 * Agrega FK a tipos_pagina para validar rutas
 */
export async function up(knex: Knex): Promise<void> {
  console.log('🔄 Refinando tenants_rutas_config...');

  // ========================================
  // 1. Agregar columna tipo_pagina_id (opcional)
  // ========================================
  console.log('\n➕ Agregando tipo_pagina_id a tenants_rutas_config...');

  const hasTipoPaginaId = await knex.schema.hasColumn('tenants_rutas_config', 'tipo_pagina_id');

  if (!hasTipoPaginaId) {
    await knex.schema.alterTable('tenants_rutas_config', (table) => {
      table.uuid('tipo_pagina_id')
        .nullable()
        .comment('FK opcional a tipos_pagina para validar rutas válidas');
    });

    console.log('   ✅ Columna tipo_pagina_id agregada');
  } else {
    console.log('   ⏭️  Columna tipo_pagina_id ya existe');
  }

  // ========================================
  // 2. Intentar mapear prefijos existentes a tipos_pagina
  // ========================================
  console.log('\n🔗 Mapeando prefijos a tipos_pagina...');

  // Mapeo común de prefijos a códigos de tipo_pagina
  const prefijoToTipo: Record<string, string> = {
    'testimonios': 'testimonios',
    'videos': 'videos',
    'articulos': 'articulos',
    'propiedades': 'propiedades',
    'asesores': 'asesores',
    'proyectos': 'proyectos'
  };

  const rutas = await knex('tenants_rutas_config')
    .whereNull('tipo_pagina_id')
    .select('id', 'prefijo');

  let mappedCount = 0;

  for (const ruta of rutas) {
    const tipoCodigo = prefijoToTipo[ruta.prefijo];

    if (tipoCodigo) {
      // Buscar el tipo_pagina
      const tipo = await knex('tipos_pagina')
        .where('codigo', tipoCodigo)
        .first();

      if (tipo) {
        await knex('tenants_rutas_config')
          .where('id', ruta.id)
          .update({ tipo_pagina_id: tipo.id });

        mappedCount++;
      }
    }
  }

  console.log(`   ✅ ${mappedCount} rutas mapeadas a tipos_pagina`);

  // ========================================
  // 3. Agregar FK constraint (solo para futuras inserciones)
  // ========================================
  console.log('\n🔗 Agregando FK constraint...');

  // Verificar si ya existe el constraint
  const constraintExists = await knex.raw(`
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_name = 'tenants_rutas_config'
      AND constraint_name = 'tenants_rutas_config_tipo_pagina_id_foreign'
  `);

  if (constraintExists.rows.length === 0) {
    await knex.schema.alterTable('tenants_rutas_config', (table) => {
      table.foreign('tipo_pagina_id')
        .references('id')
        .inTable('tipos_pagina')
        .onDelete('SET NULL')
        .onUpdate('CASCADE');
    });

    console.log('   ✅ FK constraint agregado (ON DELETE SET NULL)');
  } else {
    console.log('   ⏭️  FK constraint ya existe');
  }

  // ========================================
  // 4. Agregar índice
  // ========================================
  console.log('\n📊 Agregando índice...');

  const hasIndex = await knex.raw(`
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'tenants_rutas_config'
      AND indexname = 'idx_tenants_rutas_config_tipo_pagina'
  `);

  if (hasIndex.rows.length === 0) {
    await knex.raw(`
      CREATE INDEX idx_tenants_rutas_config_tipo_pagina
      ON tenants_rutas_config(tipo_pagina_id)
      WHERE tipo_pagina_id IS NOT NULL
    `);

    console.log('   ✅ Índice creado');
  } else {
    console.log('   ⏭️  Índice ya existe');
  }

  console.log('\n✅ tenants_rutas_config refinado');
  console.log('   • tipo_pagina_id agregado para validación opcional');
  console.log('   • FK constraint con ON DELETE SET NULL');
  console.log('   • Índice parcial agregado');
}

export async function down(knex: Knex): Promise<void> {
  console.log('⏪ Revertiendo refinamiento de rutas_config...');

  // Drop índice
  await knex.raw(`
    DROP INDEX IF EXISTS idx_tenants_rutas_config_tipo_pagina
  `);

  // Drop FK constraint
  const hasConstraint = await knex.schema.hasColumn('tenants_rutas_config', 'tipo_pagina_id');
  if (hasConstraint) {
    await knex.schema.alterTable('tenants_rutas_config', (table) => {
      table.dropForeign(['tipo_pagina_id']);
      table.dropColumn('tipo_pagina_id');
    });
  }

  console.log('✅ Rollback completado');
}
