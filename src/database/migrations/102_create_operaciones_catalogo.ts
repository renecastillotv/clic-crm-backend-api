import type { Knex } from 'knex';

/**
 * Migración 102: Crear catálogo de operaciones inmobiliarias
 *
 * Tabla para gestionar los tipos de operación (venta, alquiler, etc.)
 * Incluye soporte multi-idioma via campo traducciones JSONB.
 */

export async function up(knex: Knex): Promise<void> {
  console.log('⬆️  Ejecutando migración 102: create_operaciones_catalogo');

  const hasTable = await knex.schema.hasTable('operaciones');

  if (!hasTable) {
    await knex.schema.createTable('operaciones', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('slug', 50).notNullable().unique(); // Identificador único (ej: 'venta', 'alquiler')
      table.string('nombre', 100).notNullable(); // Nombre en español (idioma por defecto)
      table.string('icono', 100); // Clase de icono o emoji
      table.string('color', 20); // Color para badges/etiquetas (ej: '#10B981')
      table.text('descripcion'); // Descripción corta
      table.jsonb('traducciones').defaultTo('{}'); // Traducciones por idioma
      table.jsonb('slug_traducciones').defaultTo('{}'); // Slugs traducidos para SEO
      table.boolean('activo').defaultTo(true);
      table.integer('orden').defaultTo(0);
      table.timestamps(true, true);
    });

    // Crear índices
    await knex.raw(`
      CREATE INDEX idx_operaciones_slug ON operaciones(slug);
      CREATE INDEX idx_operaciones_activo ON operaciones(activo) WHERE activo = true;
    `);

    console.log('✅ Tabla operaciones creada');
  } else {
    console.log('ℹ️  Tabla operaciones ya existe');
  }

  // Insertar operaciones base
  const operacionesExistentes = await knex('operaciones').count('* as count').first();

  if (operacionesExistentes && Number(operacionesExistentes.count) === 0) {
    const operaciones = [
      {
        slug: 'venta',
        nombre: 'Venta',
        icono: 'fas fa-tag',
        color: '#10B981',
        descripcion: 'Propiedad en venta',
        traducciones: JSON.stringify({
          en: { nombre: 'Sale', descripcion: 'Property for sale' },
          fr: { nombre: 'Vente', descripcion: 'Propriété à vendre' },
          pt: { nombre: 'Venda', descripcion: 'Imóvel à venda' }
        }),
        slug_traducciones: JSON.stringify({
          en: 'for-sale',
          fr: 'a-vendre',
          pt: 'venda'
        }),
        orden: 1
      },
      {
        slug: 'alquiler',
        nombre: 'Alquiler',
        icono: 'fas fa-key',
        color: '#3B82F6',
        descripcion: 'Propiedad en alquiler a largo plazo',
        traducciones: JSON.stringify({
          en: { nombre: 'Rent', descripcion: 'Long-term rental property' },
          fr: { nombre: 'Location', descripcion: 'Location longue durée' },
          pt: { nombre: 'Aluguel', descripcion: 'Imóvel para alugar' }
        }),
        slug_traducciones: JSON.stringify({
          en: 'for-rent',
          fr: 'a-louer',
          pt: 'aluguel'
        }),
        orden: 2
      },
      {
        slug: 'renta-vacacional',
        nombre: 'Renta Vacacional',
        icono: 'fas fa-umbrella-beach',
        color: '#F59E0B',
        descripcion: 'Alquiler por temporada o corto plazo',
        traducciones: JSON.stringify({
          en: { nombre: 'Vacation Rental', descripcion: 'Short-term or seasonal rental' },
          fr: { nombre: 'Location Saisonnière', descripcion: 'Location courte durée ou saisonnière' },
          pt: { nombre: 'Aluguel de Temporada', descripcion: 'Aluguel de curta duração' }
        }),
        slug_traducciones: JSON.stringify({
          en: 'vacation-rental',
          fr: 'location-vacances',
          pt: 'aluguel-temporada'
        }),
        orden: 3
      },
      {
        slug: 'alquiler-amueblado',
        nombre: 'Alquiler Amueblado',
        icono: 'fas fa-couch',
        color: '#8B5CF6',
        descripcion: 'Alquiler con muebles incluidos',
        traducciones: JSON.stringify({
          en: { nombre: 'Furnished Rental', descripcion: 'Rental with furniture included' },
          fr: { nombre: 'Location Meublée', descripcion: 'Location avec meubles inclus' },
          pt: { nombre: 'Aluguel Mobiliado', descripcion: 'Aluguel com móveis incluídos' }
        }),
        slug_traducciones: JSON.stringify({
          en: 'furnished-rental',
          fr: 'location-meublee',
          pt: 'aluguel-mobiliado'
        }),
        orden: 4
      },
      {
        slug: 'venta-amueblado',
        nombre: 'Venta Amueblado',
        icono: 'fas fa-home',
        color: '#EC4899',
        descripcion: 'Venta con muebles incluidos',
        traducciones: JSON.stringify({
          en: { nombre: 'Furnished Sale', descripcion: 'Sale with furniture included' },
          fr: { nombre: 'Vente Meublée', descripcion: 'Vente avec meubles inclus' },
          pt: { nombre: 'Venda Mobiliada', descripcion: 'Venda com móveis incluídos' }
        }),
        slug_traducciones: JSON.stringify({
          en: 'furnished-sale',
          fr: 'vente-meublee',
          pt: 'venda-mobiliada'
        }),
        orden: 5
      },
      {
        slug: 'traspaso',
        nombre: 'Traspaso',
        icono: 'fas fa-exchange-alt',
        color: '#6366F1',
        descripcion: 'Traspaso de negocio o local',
        traducciones: JSON.stringify({
          en: { nombre: 'Business Transfer', descripcion: 'Business or lease transfer' },
          fr: { nombre: 'Cession', descripcion: 'Cession de commerce ou bail' },
          pt: { nombre: 'Repasse', descripcion: 'Repasse de negócio' }
        }),
        slug_traducciones: JSON.stringify({
          en: 'business-transfer',
          fr: 'cession',
          pt: 'repasse'
        }),
        orden: 6
      },
      {
        slug: 'preventa',
        nombre: 'Preventa',
        icono: 'fas fa-hard-hat',
        color: '#F97316',
        descripcion: 'Proyecto en preventa o construcción',
        traducciones: JSON.stringify({
          en: { nombre: 'Pre-sale', descripcion: 'Project in pre-sale or construction' },
          fr: { nombre: 'Pré-vente', descripcion: 'Projet en pré-vente ou construction' },
          pt: { nombre: 'Pré-venda', descripcion: 'Projeto em pré-venda ou construção' }
        }),
        slug_traducciones: JSON.stringify({
          en: 'pre-sale',
          fr: 'pre-vente',
          pt: 'pre-venda'
        }),
        orden: 7
      },
      {
        slug: 'subasta',
        nombre: 'Subasta',
        icono: 'fas fa-gavel',
        color: '#EF4444',
        descripcion: 'Propiedad en subasta',
        traducciones: JSON.stringify({
          en: { nombre: 'Auction', descripcion: 'Property at auction' },
          fr: { nombre: 'Vente aux Enchères', descripcion: 'Propriété aux enchères' },
          pt: { nombre: 'Leilão', descripcion: 'Imóvel em leilão' }
        }),
        slug_traducciones: JSON.stringify({
          en: 'auction',
          fr: 'encheres',
          pt: 'leilao'
        }),
        orden: 8
      }
    ];

    await knex('operaciones').insert(operaciones);
    console.log(`✅ ${operaciones.length} operaciones insertadas`);
  } else {
    console.log('ℹ️  Ya existen operaciones en la tabla');
  }
}

export async function down(knex: Knex): Promise<void> {
  console.log('⬇️  Revirtiendo migración 102');

  await knex.raw('DROP INDEX IF EXISTS idx_operaciones_slug');
  await knex.raw('DROP INDEX IF EXISTS idx_operaciones_activo');

  await knex.schema.dropTableIfExists('operaciones');
  console.log('✅ Tabla operaciones eliminada');
}
