import { Knex } from 'knex';

/**
 * Migración - Tabla de Propiedades para CRM Inmobiliario
 *
 * Crea la tabla de propiedades con todos los campos necesarios
 * para gestionar el inventario de inmuebles.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('propiedades', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');

    // Datos básicos
    table.string('titulo', 255).notNullable().comment('Título de la propiedad');
    table.string('codigo', 50).nullable().comment('Código interno de referencia');
    table.text('descripcion').nullable().comment('Descripción detallada');

    // Tipo y operación
    table.string('tipo', 50).notNullable().defaultTo('casa')
      .comment('Tipo: casa, departamento, terreno, oficina, local, bodega');
    table.string('operacion', 50).notNullable().defaultTo('venta')
      .comment('Operación: venta, renta, traspaso');

    // Precios
    table.decimal('precio', 15, 2).nullable().comment('Precio principal');
    table.decimal('precio_anterior', 15, 2).nullable().comment('Precio anterior (para descuentos)');
    table.string('moneda', 3).defaultTo('USD').comment('Moneda: USD, MXN, EUR');

    // Ubicación (Jerarquía: país/provincia/ciudad/sector/zona)
    table.string('pais', 100).nullable().defaultTo('México').comment('País');
    table.string('provincia', 100).nullable().comment('Provincia o estado');
    table.string('ciudad', 100).nullable().comment('Ciudad');
    table.string('sector', 255).nullable().comment('Sector o barrio');
    table.string('zona', 150).nullable().comment('Zona específica dentro del sector');
    
    // Dirección escrita y geográfica
    table.text('direccion').nullable().comment('Dirección escrita completa (ej: Calle 26 de Enero esquina...)');
    table.string('codigo_postal', 20).nullable().comment('Código postal');
    table.decimal('latitud', 10, 8).nullable().comment('Latitud GPS');
    table.decimal('longitud', 11, 8).nullable().comment('Longitud GPS');
    table.boolean('mostrar_ubicacion_exacta').defaultTo(true).comment('Mostrar ubicación exacta (GPS) en el sitio web');

    // Características numéricas
    table.integer('habitaciones').nullable().comment('Número de habitaciones');
    table.integer('banos').nullable().comment('Número de baños completos');
    table.integer('medios_banos').nullable().comment('Número de medios baños');
    table.integer('estacionamientos').nullable().comment('Lugares de estacionamiento');
    table.decimal('m2_construccion', 10, 2).nullable().comment('Metros cuadrados de construcción');
    table.decimal('m2_terreno', 10, 2).nullable().comment('Metros cuadrados de terreno');
    table.integer('antiguedad').nullable().comment('Años de antigüedad');
    table.integer('pisos').nullable().comment('Número de pisos/niveles');

    // Características adicionales
    table.jsonb('amenidades').defaultTo('[]').comment('Array de amenidades: piscina, gimnasio, etc.');
    table.jsonb('caracteristicas').defaultTo('{}').comment('Características adicionales como objeto');

    // Imágenes y multimedia
    table.string('imagen_principal', 500).nullable().comment('URL de imagen principal');
    table.jsonb('imagenes').defaultTo('[]').comment('Array de URLs de imágenes');
    table.string('video_url', 500).nullable().comment('URL de video tour');
    table.string('tour_virtual_url', 500).nullable().comment('URL de tour virtual 360');

    // Estado de la propiedad
    table.string('estado_propiedad', 50).notNullable().defaultTo('disponible')
      .comment('Estado: disponible, reservada, vendida, rentada, inactiva');
    table.boolean('destacada').defaultTo(false).comment('Propiedad destacada');
    table.boolean('exclusiva').defaultTo(false).comment('Propiedad exclusiva');

    // Relaciones
    table.uuid('agente_id').nullable().references('id').inTable('usuarios').onDelete('SET NULL')
      .comment('Agente asignado');
    table.uuid('propietario_id').nullable().references('id').inTable('contactos').onDelete('SET NULL')
      .comment('Propietario (contacto)');

    // SEO y URL
    table.string('slug', 255).nullable().comment('URL slug');

    // Notas internas
    table.text('notas').nullable().comment('Notas internas');

    // Auditoría
    table.boolean('activo').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Índices
    table.index('tenant_id', 'idx_propiedades_tenant');
    table.index('tipo', 'idx_propiedades_tipo');
    table.index('operacion', 'idx_propiedades_operacion');
    table.index('estado_propiedad', 'idx_propiedades_estado');
    table.index('precio', 'idx_propiedades_precio');
    table.index('ciudad', 'idx_propiedades_ciudad');
    table.index('provincia', 'idx_propiedades_provincia');
    table.index('sector', 'idx_propiedades_sector');
    table.index(['provincia', 'ciudad', 'sector'], 'idx_propiedades_location');
    table.index('agente_id', 'idx_propiedades_agente');
    table.index('destacada', 'idx_propiedades_destacada');
    table.unique(['tenant_id', 'codigo'], { indexName: 'idx_propiedades_tenant_codigo' });
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('propiedades');
}
