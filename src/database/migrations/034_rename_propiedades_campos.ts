import { Knex } from 'knex';

/**
 * Migración: Renombrar campos de propiedades a nueva estructura
 * 
 * Renombra campos antiguos a la nueva estructura:
 * - recamaras → habitaciones
 * - estado → provincia
 * - colonia → sector
 * 
 * Agrega campos nuevos si no existen:
 * - zona
 * - mostrar_ubicacion_exacta
 * 
 * Fecha: 2025-01-XX
 */
export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('propiedades');
  
  if (!hasTable) {
    console.log('⚠️  Tabla propiedades no existe, saltando renombrado');
    return;
  }

  // Verificar qué columnas existen
  const columnInfo = await knex.raw(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'propiedades'
  `);
  
  const existingColumns = columnInfo.rows.map((row: any) => row.column_name);

  // ============================================================================
  // 1. RENOMBRAR recamaras → habitaciones
  // ============================================================================
  if (existingColumns.includes('recamaras') && !existingColumns.includes('habitaciones')) {
    await knex.raw(`ALTER TABLE propiedades RENAME COLUMN recamaras TO habitaciones;`);
    console.log('✅ Renombrado: recamaras → habitaciones');
  } else if (existingColumns.includes('recamaras') && existingColumns.includes('habitaciones')) {
    // Si ambos existen, migrar datos y eliminar el antiguo
    await knex.raw(`
      UPDATE propiedades 
      SET habitaciones = recamaras 
      WHERE habitaciones IS NULL AND recamaras IS NOT NULL;
    `);
    await knex.schema.alterTable('propiedades', (table) => {
      table.dropColumn('recamaras');
    });
    console.log('✅ Migrado datos de recamaras → habitaciones y eliminado recamaras');
  }

  // ============================================================================
  // 2. RENOMBRAR estado → provincia
  // ============================================================================
  if (existingColumns.includes('estado') && !existingColumns.includes('provincia')) {
    await knex.raw(`ALTER TABLE propiedades RENAME COLUMN estado TO provincia;`);
    console.log('✅ Renombrado: estado → provincia');
  } else if (existingColumns.includes('estado') && existingColumns.includes('provincia')) {
    // Si ambos existen, migrar datos y eliminar el antiguo
    await knex.raw(`
      UPDATE propiedades 
      SET provincia = estado 
      WHERE provincia IS NULL AND estado IS NOT NULL;
    `);
    await knex.schema.alterTable('propiedades', (table) => {
      table.dropColumn('estado');
    });
    console.log('✅ Migrado datos de estado → provincia y eliminado estado');
  }

  // ============================================================================
  // 3. RENOMBRAR colonia → sector
  // ============================================================================
  if (existingColumns.includes('colonia') && !existingColumns.includes('sector')) {
    await knex.raw(`ALTER TABLE propiedades RENAME COLUMN colonia TO sector;`);
    console.log('✅ Renombrado: colonia → sector');
  } else if (existingColumns.includes('colonia') && existingColumns.includes('sector')) {
    // Si ambos existen, migrar datos y eliminar el antiguo
    await knex.raw(`
      UPDATE propiedades 
      SET sector = colonia 
      WHERE sector IS NULL AND colonia IS NOT NULL;
    `);
    await knex.schema.alterTable('propiedades', (table) => {
      table.dropColumn('colonia');
    });
    console.log('✅ Migrado datos de colonia → sector y eliminado colonia');
  }

  // ============================================================================
  // 4. AGREGAR zona si no existe
  // ============================================================================
  if (!existingColumns.includes('zona')) {
    await knex.schema.alterTable('propiedades', (table) => {
      table.string('zona', 150).nullable()
        .comment('Zona específica dentro del sector');
    });
    console.log('✅ Agregado campo: zona');
  }

  // ============================================================================
  // 5. AGREGAR mostrar_ubicacion_exacta si no existe
  // ============================================================================
  if (!existingColumns.includes('mostrar_ubicacion_exacta')) {
    await knex.schema.alterTable('propiedades', (table) => {
      table.boolean('mostrar_ubicacion_exacta').defaultTo(true)
        .comment('Mostrar ubicación exacta (GPS) en el sitio web');
    });
    console.log('✅ Agregado campo: mostrar_ubicacion_exacta');
  }

  // ============================================================================
  // 6. ACTUALIZAR TIPO DE direccion a TEXT si es necesario
  // ============================================================================
  const direccionInfo = await knex.raw(`
    SELECT data_type, character_maximum_length
    FROM information_schema.columns 
    WHERE table_name = 'propiedades' AND column_name = 'direccion'
  `);
  
  if (direccionInfo.rows.length > 0) {
    const direccionType = direccionInfo.rows[0].data_type;
    const maxLength = direccionInfo.rows[0].character_maximum_length;
    
    // Si es VARCHAR con límite, cambiar a TEXT
    if (direccionType === 'character varying' && maxLength && maxLength < 1000) {
      await knex.raw(`ALTER TABLE propiedades ALTER COLUMN direccion TYPE TEXT;`);
      console.log('✅ Actualizado tipo de direccion a TEXT');
    }
  }

  // ============================================================================
  // 7. ACTUALIZAR ÍNDICES
  // ============================================================================
  // Eliminar índices antiguos si existen
  try {
    await knex.raw(`DROP INDEX IF EXISTS idx_propiedades_ciudad;`);
  } catch (e) {
    // Ignorar si no existe
  }

  // Crear nuevos índices si no existen
  const indexInfo = await knex.raw(`
    SELECT indexname 
    FROM pg_indexes 
    WHERE tablename = 'propiedades'
  `);
  
  const existingIndexes = indexInfo.rows.map((row: any) => row.indexname);

  if (!existingIndexes.some((idx: string) => idx.includes('provincia'))) {
    await knex.schema.alterTable('propiedades', (table) => {
      table.index('provincia', 'idx_propiedades_provincia');
    });
    console.log('✅ Creado índice: idx_propiedades_provincia');
  }

  if (!existingIndexes.some((idx: string) => idx.includes('sector'))) {
    await knex.schema.alterTable('propiedades', (table) => {
      table.index('sector', 'idx_propiedades_sector');
    });
    console.log('✅ Creado índice: idx_propiedades_sector');
  }

  if (!existingIndexes.some((idx: string) => idx.includes('location'))) {
    await knex.schema.alterTable('propiedades', (table) => {
      table.index(['provincia', 'ciudad', 'sector'], 'idx_propiedades_location');
    });
    console.log('✅ Creado índice: idx_propiedades_location');
  }

  console.log('✅ Migración 034: Campos renombrados y actualizados');
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('propiedades');
  
  if (!hasTable) {
    return;
  }

  const columnInfo = await knex.raw(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'propiedades'
  `);
  
  const existingColumns = columnInfo.rows.map((row: any) => row.column_name);

  // Revertir renombrados
  if (existingColumns.includes('habitaciones') && !existingColumns.includes('recamaras')) {
    await knex.raw(`ALTER TABLE propiedades RENAME COLUMN habitaciones TO recamaras;`);
  }

  if (existingColumns.includes('provincia') && !existingColumns.includes('estado')) {
    await knex.raw(`ALTER TABLE propiedades RENAME COLUMN provincia TO estado;`);
  }

  if (existingColumns.includes('sector') && !existingColumns.includes('colonia')) {
    await knex.raw(`ALTER TABLE propiedades RENAME COLUMN sector TO colonia;`);
  }

  // Eliminar campos nuevos
  if (existingColumns.includes('zona')) {
    await knex.schema.alterTable('propiedades', (table) => {
      table.dropColumn('zona');
    });
  }

  if (existingColumns.includes('mostrar_ubicacion_exacta')) {
    await knex.schema.alterTable('propiedades', (table) => {
      table.dropColumn('mostrar_ubicacion_exacta');
    });
  }

  // Eliminar índices nuevos
  await knex.raw(`DROP INDEX IF EXISTS idx_propiedades_provincia;`);
  await knex.raw(`DROP INDEX IF EXISTS idx_propiedades_sector;`);
  await knex.raw(`DROP INDEX IF EXISTS idx_propiedades_location;`);

  console.log('✅ Migración 034: Revertida');
}
















