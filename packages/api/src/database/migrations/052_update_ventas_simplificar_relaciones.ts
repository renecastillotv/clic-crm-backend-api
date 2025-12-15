import { Knex } from 'knex';

/**
 * Migración - Actualizar tabla ventas para simplificar relaciones
 * 
 * Elimina:
 * - tipo_venta_id (no necesario)
 * - tipo_operacion_id (se hereda de la propiedad)
 * 
 * Agrega:
 * - Campos para vendedores externos (inmobiliaria o asesor independiente)
 * - Mejora campos de referidor
 */
export async function up(knex: Knex): Promise<void> {
  // Verificar si la tabla ventas existe
  const hasVentas = await knex.schema.hasTable('ventas');
  if (!hasVentas) {
    console.log('⚠️ Tabla ventas no existe, saltando migración');
    return;
  }

  // Verificar si ya tiene los nuevos campos
  const hasVendedorExterno = await knex.schema.hasColumn('ventas', 'vendedor_externo_tipo');
  
  if (!hasVendedorExterno) {
    // Agregar campos de vendedor externo
    await knex.schema.alterTable('ventas', (table) => {
      table.string('vendedor_externo_tipo', 50).nullable()
        .comment('Tipo: inmobiliaria, asesor_independiente');
      table.string('vendedor_externo_nombre', 255).nullable()
        .comment('Nombre de la inmobiliaria o asesor externo');
      table.string('vendedor_externo_contacto', 255).nullable()
        .comment('Email o teléfono del vendedor externo');
      table.uuid('vendedor_externo_id').nullable().references('id').inTable('contactos').onDelete('SET NULL')
        .comment('Si el vendedor externo está registrado como contacto');
    });

    // Agregar índice para vendedor externo
    await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_ventas_vendedor_externo 
      ON ventas(vendedor_externo_id) 
      WHERE vendedor_externo_id IS NOT NULL
    `);
  }

  // Actualizar campo referidor_nombre si existe nombre_referidor
  const hasNombreReferidor = await knex.schema.hasColumn('ventas', 'nombre_referidor');
  const hasReferidorNombre = await knex.schema.hasColumn('ventas', 'referidor_nombre');
  
  if (hasNombreReferidor && !hasReferidorNombre) {
    await knex.schema.alterTable('ventas', (table) => {
      table.renameColumn('nombre_referidor', 'referidor_nombre');
    });
  }

  // Agregar campo referidor_contacto_id si no existe
  const hasReferidorContacto = await knex.schema.hasColumn('ventas', 'referidor_contacto_id');
  if (!hasReferidorContacto) {
    await knex.schema.alterTable('ventas', (table) => {
      table.uuid('referidor_contacto_id').nullable().references('id').inTable('contactos').onDelete('SET NULL')
        .comment('Contacto referidor (si es externo)');
    });
  }

  // Eliminar campos innecesarios si existen
  const hasTipoVenta = await knex.schema.hasColumn('ventas', 'tipo_venta_id');
  if (hasTipoVenta) {
    await knex.schema.alterTable('ventas', (table) => {
      table.dropForeign('tipo_venta_id');
      table.dropColumn('tipo_venta_id');
    });
  }

  const hasTipoOperacion = await knex.schema.hasColumn('ventas', 'tipo_operacion_id');
  if (hasTipoOperacion) {
    await knex.schema.alterTable('ventas', (table) => {
      table.dropForeign('tipo_operacion_id');
      table.dropColumn('tipo_operacion_id');
    });
  }

  // Agregar foreign key a propiedad_id si no existe
  const hasPropiedadFk = await knex.raw(`
    SELECT constraint_name 
    FROM information_schema.table_constraints 
    WHERE table_name = 'ventas' 
    AND constraint_name LIKE '%propiedad%'
  `);
  
  // Verificar si propiedad_id tiene foreign key
  const propiedadFkExists = await knex.raw(`
    SELECT COUNT(*) as count
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'ventas'
      AND kcu.column_name = 'propiedad_id'
      AND tc.constraint_type = 'FOREIGN KEY'
  `);

  if (propiedadFkExists.rows[0]?.count === '0') {
    await knex.schema.alterTable('ventas', (table) => {
      table.foreign('propiedad_id').references('id').inTable('propiedades').onDelete('SET NULL');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // Revertir cambios
  const hasVentas = await knex.schema.hasTable('ventas');
  if (!hasVentas) return;

  // Eliminar campos de vendedor externo
  const hasVendedorExterno = await knex.schema.hasColumn('ventas', 'vendedor_externo_tipo');
  if (hasVendedorExterno) {
    await knex.schema.alterTable('ventas', (table) => {
      table.dropForeign('vendedor_externo_id');
      table.dropColumn('vendedor_externo_tipo');
      table.dropColumn('vendedor_externo_nombre');
      table.dropColumn('vendedor_externo_contacto');
      table.dropColumn('vendedor_externo_id');
    });
  }

  // Eliminar referidor_contacto_id
  const hasReferidorContacto = await knex.schema.hasColumn('ventas', 'referidor_contacto_id');
  if (hasReferidorContacto) {
    await knex.schema.alterTable('ventas', (table) => {
      table.dropForeign('referidor_contacto_id');
      table.dropColumn('referidor_contacto_id');
    });
  }

  // Renombrar referidor_nombre de vuelta a nombre_referidor si existe
  const hasReferidorNombre = await knex.schema.hasColumn('ventas', 'referidor_nombre');
  if (hasReferidorNombre) {
    await knex.schema.alterTable('ventas', (table) => {
      table.renameColumn('referidor_nombre', 'nombre_referidor');
    });
  }
}













