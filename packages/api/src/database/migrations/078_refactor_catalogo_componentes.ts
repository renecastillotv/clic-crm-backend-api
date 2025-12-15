import { Knex } from 'knex';

/**
 * Migración: Refactorizar tabla catalogo_componentes
 *
 * Cambios:
 * 1. Convertir variantes de JSONB a INTEGER (número de variantes)
 * 2. Eliminar campo es_sistema
 * 3. Eliminar campo orden
 * 4. Renombrar activo → active
 * 5. Agregar required_features (boolean)
 * 6. Agregar feature_id (FK a features)
 * 7. Crear tabla junction componentes_features para relación many-to-many
 */
export async function up(knex: Knex): Promise<void> {
  console.log('🔧 Iniciando refactor de catalogo_componentes...');

  // 1. Agregar campo id (UUID) a la tabla existente
  await knex.schema.table('catalogo_componentes', (table) => {
    table.uuid('id').defaultTo(knex.raw('gen_random_uuid()'));
  });

  console.log('✅ Campo id agregado');

  //  2. Poblar el campo id con UUIDs
  await knex.raw(`UPDATE catalogo_componentes SET id = gen_random_uuid() WHERE id IS NULL`);

  // 3. Eliminar primary key existente (tipo)
  await knex.raw(`ALTER TABLE catalogo_componentes DROP CONSTRAINT IF EXISTS catalogo_componentes_pkey`);

  console.log('✅ Primary key antigua eliminada');

  // 4. Hacer id NOT NULL y primary key
  await knex.schema.alterTable('catalogo_componentes', (table) => {
    table.uuid('id').notNullable().primary().alter();
  });

  console.log('✅ Campo id configurado como PRIMARY KEY');

  // 5. Crear tabla junction para relación many-to-many con features
  await knex.schema.createTable('componentes_features', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('componente_id').notNullable()
      .references('id').inTable('catalogo_componentes').onDelete('CASCADE');
    table.uuid('feature_id').notNullable()
      .references('id').inTable('features').onDelete('CASCADE');
    table.boolean('required').defaultTo(false).comment('Si este feature es requerido para usar el componente');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Índices
    table.index('componente_id', 'idx_componentes_features_componente');
    table.index('feature_id', 'idx_componentes_features_feature');
    table.unique(['componente_id', 'feature_id'], 'unique_componente_feature');
  });

  console.log('✅ Tabla componentes_features creada');

  // 6. Crear columna temporal para calcular número de variantes
  await knex.schema.table('catalogo_componentes', (table) => {
    table.integer('num_variantes').nullable();
  });

  // 7. Migrar datos: contar variantes del JSONB array
  const componentes = await knex('catalogo_componentes').select('id', 'variantes');

  for (const comp of componentes) {
    let numVariantes = 0;
    if (comp.variantes) {
      try {
        const variantesArray = typeof comp.variantes === 'string'
          ? JSON.parse(comp.variantes)
          : comp.variantes;
        numVariantes = Array.isArray(variantesArray) ? variantesArray.length : 0;
      } catch (e) {
        console.warn(`⚠️  Error parsing variantes for componente ${comp.id}, defaulting to 0`);
        numVariantes = 0;
      }
    }

    await knex('catalogo_componentes')
      .where('id', comp.id)
      .update({ num_variantes: numVariantes });
  }

  console.log(`✅ Migrados ${componentes.length} componentes con conteo de variantes`);

  // 8. Modificar tabla catalogo_componentes
  await knex.schema.alterTable('catalogo_componentes', (table) => {
    // Renombrar variantes a variantes_old temporalmente
    table.renameColumn('variantes', 'variantes_old');

    // Renombrar disponible → active
    table.renameColumn('disponible', 'active');

    // Eliminar campos
    table.dropColumn('es_global');
    table.dropColumn('orden');

    // Agregar nuevo campo required_features
    table.boolean('required_features').defaultTo(false)
      .comment('Si este componente requiere features específicos para funcionar');

    // Crear nuevo índice para 'active'
    table.index('active', 'idx_catalogo_componentes_active');
  });

  // 9. Hacer num_variantes NOT NULL después de poblar datos
  await knex.raw(`ALTER TABLE catalogo_componentes ALTER COLUMN num_variantes SET NOT NULL`);
  await knex.raw(`ALTER TABLE catalogo_componentes ALTER COLUMN num_variantes SET DEFAULT 1`);

  // Renombrar num_variantes a variantes
  await knex.schema.alterTable('catalogo_componentes', (table) => {
    table.renameColumn('num_variantes', 'variantes');
  });

  // 10. Eliminar campo variantes_old
  await knex.schema.alterTable('catalogo_componentes', (table) => {
    table.dropColumn('variantes_old');
  });

  console.log('✅ Tabla catalogo_componentes refactorizada');
}

export async function down(knex: Knex): Promise<void> {
  console.log('⏪ Revirtiendo refactor de catalogo_componentes...');

  // 1. Renombrar variantes (int) de vuelta a un campo temporal
  await knex.schema.table('catalogo_componentes', (table) => {
    table.renameColumn('variantes', 'variantes_temp');
  });

  // 2. Recrear campos eliminados
  await knex.schema.table('catalogo_componentes', (table) => {
    table.jsonb('variantes').defaultTo('[]');
    table.renameColumn('active', 'disponible');
    table.boolean('es_global').defaultTo(false);
    table.integer('orden').defaultTo(0);
    table.dropColumn('required_features');
    table.dropColumn('variantes_temp');

    // Recrear índices
    table.dropIndex('', 'idx_catalogo_componentes_active');
  });

  // 3. Eliminar tabla junction
  await knex.schema.dropTableIfExists('componentes_features');

  // 4. Eliminar campo id y restaurar 'tipo' como PK
  await knex.schema.alterTable('catalogo_componentes', (table) => {
    table.dropColumn('id');
  });

  // 5. Restaurar tipo como primary key
  await knex.raw(`ALTER TABLE catalogo_componentes ADD PRIMARY KEY (tipo)`);

  console.log('✅ Rollback completado');
}
