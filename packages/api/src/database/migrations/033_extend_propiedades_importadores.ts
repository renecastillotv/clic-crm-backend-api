import { Knex } from 'knex';

/**
 * Migración: Extender tabla propiedades para compatibilidad con importadores
 * 
 * Agrega campos necesarios para importar desde Alterestate y EasyBroker:
 * - Campos de tracking externo (external_id, external_source, external_url)
 * - Separación de precios (precio_venta, precio_alquiler)
 * - Campos de ubicación estándar (province, sector)
 * - Campo is_project (ya usado en frontend)
 * - Campos opcionales adicionales
 * 
 * Fecha: 2025-01-XX
 */
export async function up(knex: Knex): Promise<void> {
  // ============================================================================
  // 1. CAMPOS DE TRACKING EXTERNO (CRÍTICOS)
  // ============================================================================
  await knex.schema.alterTable('propiedades', (table) => {
    // IDs externos para tracking de importaciones
    table.string('external_id', 50).nullable()
      .comment('ID del CRM externo (CID de Alterestate, public_id de EasyBroker)');
    table.string('external_source', 50).nullable()
      .comment('Fuente del dato: alterestate, easybroker, manual');
    table.text('external_url').nullable()
      .comment('URL directa a la propiedad en el CRM externo');
  });

  // Índices para búsquedas de propiedades externas
  await knex.schema.alterTable('propiedades', (table) => {
    table.index('external_source', 'idx_propiedades_external_source');
    table.index('external_id', 'idx_propiedades_external_id');
  });

  // Constraint único para evitar duplicados de la misma fuente
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_propiedades_external_unique 
    ON propiedades(tenant_id, external_source, external_id) 
    WHERE external_id IS NOT NULL AND external_source IS NOT NULL;
  `);

  // ============================================================================
  // 2. SEPARACIÓN DE PRECIOS (CRÍTICO)
  // ============================================================================
  await knex.schema.alterTable('propiedades', (table) => {
    // Renombrar 'precio' a 'precio_venta' y agregar 'precio_alquiler'
    // Nota: No podemos renombrar directamente, así que agregamos nuevos campos
    // y luego migramos datos en un script separado
    table.decimal('precio_venta', 15, 2).nullable()
      .comment('Precio de venta (separado de precio general)');
    table.decimal('precio_alquiler', 15, 2).nullable()
      .comment('Precio de alquiler');
    table.decimal('maintenance', 15, 2).nullable()
      .comment('Mantenimiento mensual (opcional)');
  });

  // ============================================================================
  // 3. CAMPOS DE UBICACIÓN ADICIONALES (si no existen ya)
  // ============================================================================
  // Nota: La estructura base ya tiene pais/provincia/ciudad/sector
  // Solo agregamos 'zona' si no existe y mejoramos direccion
  const hasZona = await knex.schema.hasColumn('propiedades', 'zona');
  if (!hasZona) {
    await knex.schema.alterTable('propiedades', (table) => {
      table.string('zona', 150).nullable()
        .comment('Zona específica dentro del sector');
    });
  }

  // Verificar si existe mostrar_ubicacion_exacta
  const hasMostrarUbicacion = await knex.schema.hasColumn('propiedades', 'mostrar_ubicacion_exacta');
  if (!hasMostrarUbicacion) {
    await knex.schema.alterTable('propiedades', (table) => {
      table.boolean('mostrar_ubicacion_exacta').defaultTo(true)
        .comment('Mostrar ubicación exacta (GPS) en el sitio web');
    });
  }

  // Mejorar tipo de dato de direccion si es necesario (ya debería ser TEXT)
  // No hacemos nada aquí, ya está como TEXT en la migración base

  // ============================================================================
  // 4. CAMPOS DE ESTADO Y FLAGS (CRÍTICOS)
  // ============================================================================
  await knex.schema.alterTable('propiedades', (table) => {
    // Campo is_project (ya usado en frontend)
    table.boolean('is_project').defaultTo(false)
      .comment('Indica si es un proyecto inmobiliario');
    
    // Campos opcionales adicionales
    table.boolean('is_furnished').defaultTo(false)
      .comment('Propiedad amueblada');
    table.timestamp('featured_until').nullable()
      .comment('Fecha hasta la cual la propiedad debe estar destacada');
  });

  // Índice para is_project
  await knex.schema.alterTable('propiedades', (table) => {
    table.index('is_project', 'idx_propiedades_is_project');
  });

  // ============================================================================
  // 5. CAMPOS OPCIONALES ADICIONALES
  // ============================================================================
  await knex.schema.alterTable('propiedades', (table) => {
    // Descripción corta
    table.text('short_description').nullable()
      .comment('Descripción corta para listados');
    
    // Traducciones de slug
    table.jsonb('slug_translations').defaultTo('{}')
      .comment('Traducciones del slug por idioma: {es: "...", en: "..."}');
    
    // Información de construcción
    table.integer('floor_level').nullable()
      .comment('Piso donde está ubicada la propiedad');
    table.integer('year_built').nullable()
      .comment('Año de construcción');
    table.integer('condition').nullable()
      .comment('Estado de la propiedad (1-10, donde 10 es excelente)');
    
    // Información comercial
    table.decimal('share_commission', 5, 2).nullable()
      .comment('Porcentaje de comisión compartida con otros agentes');
  });

  // ============================================================================
  // 6. ACTUALIZAR COMENTARIOS DE CAMPOS EXISTENTES
  // ============================================================================
  await knex.raw(`
    COMMENT ON COLUMN propiedades.precio IS 'Precio general (mantener para compatibilidad, usar precio_venta/precio_alquiler para nuevos datos)';
    COMMENT ON COLUMN propiedades.direccion IS 'Dirección escrita completa. Puede obtenerse desde Google Maps o escribirse manualmente';
  `);

  console.log('✅ Migración 033: Campos de importadores agregados a propiedades');
}

export async function down(knex: Knex): Promise<void> {
  // Eliminar índices primero
  await knex.raw(`DROP INDEX IF EXISTS idx_propiedades_external_unique;`);
  await knex.raw(`DROP INDEX IF EXISTS idx_propiedades_external_source;`);
  await knex.raw(`DROP INDEX IF EXISTS idx_propiedades_external_id;`);
  await knex.raw(`DROP INDEX IF EXISTS idx_propiedades_location;`);
  await knex.raw(`DROP INDEX IF EXISTS idx_propiedades_is_project;`);

  // Eliminar columnas
  await knex.schema.alterTable('propiedades', (table) => {
    // Tracking externo
    table.dropColumn('external_id');
    table.dropColumn('external_source');
    table.dropColumn('external_url');
    
    // Precios
    table.dropColumn('precio_venta');
    table.dropColumn('precio_alquiler');
    table.dropColumn('maintenance');
    
    // Ubicación adicional
    table.dropColumn('zona');
    table.dropColumn('mostrar_ubicacion_exacta');
    
    // Estado y flags
    table.dropColumn('is_project');
    table.dropColumn('is_furnished');
    table.dropColumn('featured_until');
    
    // Opcionales
    table.dropColumn('short_description');
    table.dropColumn('slug_translations');
    table.dropColumn('floor_level');
    table.dropColumn('year_built');
    table.dropColumn('condition');
    table.dropColumn('share_commission');
  });

  console.log('✅ Migración 033: Campos de importadores revertidos');
}

