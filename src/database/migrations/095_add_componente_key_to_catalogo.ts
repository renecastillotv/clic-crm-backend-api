import { Knex } from 'knex';

/**
 * Migración 095: Agregar componente_key a catalogo_componentes
 *
 * Este campo es la clave exacta que usa el ComponentRenderer de Astro
 * para mapear componentes. Debe coincidir EXACTAMENTE con las claves
 * del componentMap en ComponentRenderer.astro
 *
 * Ejemplos:
 * - hero-default, hero-search, hero-simple
 * - footer-default
 * - header-default
 */
export async function up(knex: Knex): Promise<void> {
  console.log('🔧 Agregando componente_key a catalogo_componentes...\n');

  // 1. Verificar si la columna ya existe
  const hasColumn = await knex.schema.hasColumn('catalogo_componentes', 'componente_key');

  if (!hasColumn) {
    await knex.schema.alterTable('catalogo_componentes', (table) => {
      table.string('componente_key', 100).nullable();
    });
    console.log('✅ Columna componente_key agregada');
  }

  // 2. Poblar componente_key basado en el tipo actual
  // El formato es: {tipo}-default (para la mayoría)
  // Luego se pueden agregar más variantes manualmente

  const componentesActuales = await knex('catalogo_componentes').select('id', 'tipo');

  for (const comp of componentesActuales) {
    // Por defecto, el componente_key es {tipo con guiones}-default
    // Convertir underscore a guion para consistencia con Astro
    const tipoNormalizado = comp.tipo.replace(/_/g, '-');
    const componenteKey = `${tipoNormalizado}-default`;

    await knex('catalogo_componentes')
      .where('id', comp.id)
      .update({ componente_key: componenteKey });

    console.log(`  ✅ ${comp.tipo} → ${componenteKey}`);
  }

  // 3. Hacer la columna NOT NULL y UNIQUE después de poblarla
  await knex.raw(`
    ALTER TABLE catalogo_componentes
    ALTER COLUMN componente_key SET NOT NULL
  `);

  await knex.raw(`
    ALTER TABLE catalogo_componentes
    ADD CONSTRAINT uq_catalogo_componentes_key UNIQUE (componente_key)
  `);

  console.log('\n✅ Constraint UNIQUE agregado a componente_key');

  // 4. Crear índice para búsquedas rápidas
  await knex.raw(`
    CREATE INDEX idx_catalogo_componentes_key
    ON catalogo_componentes(componente_key)
  `);

  console.log('✅ Índice creado en componente_key');

  console.log('\n✅ Migración 095 completada');
  console.log('   Ahora cada componente tiene un componente_key único');
  console.log('   que debe coincidir con el componentMap de Astro\n');
}

export async function down(knex: Knex): Promise<void> {
  console.log('⏪ Revirtiendo migración 095...\n');

  // Eliminar índice
  await knex.raw(`DROP INDEX IF EXISTS idx_catalogo_componentes_key`);

  // Eliminar constraint
  await knex.raw(`
    ALTER TABLE catalogo_componentes
    DROP CONSTRAINT IF EXISTS uq_catalogo_componentes_key
  `);

  // Eliminar columna
  const hasColumn = await knex.schema.hasColumn('catalogo_componentes', 'componente_key');
  if (hasColumn) {
    await knex.schema.alterTable('catalogo_componentes', (table) => {
      table.dropColumn('componente_key');
    });
  }

  console.log('✅ Rollback completado\n');
}
