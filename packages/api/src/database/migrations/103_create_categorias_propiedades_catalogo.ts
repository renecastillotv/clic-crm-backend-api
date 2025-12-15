import type { Knex } from 'knex';

/**
 * Migración 103: Crear catálogo de categorías de propiedades
 *
 * Tabla para gestionar los tipos de propiedades (apartamento, casa, solar, etc.)
 * Incluye soporte multi-idioma via campo traducciones JSONB.
 */

export async function up(knex: Knex): Promise<void> {
  console.log('⬆️  Ejecutando migración 103: create_categorias_propiedades_catalogo');

  const hasTable = await knex.schema.hasTable('categorias_propiedades');

  if (!hasTable) {
    await knex.schema.createTable('categorias_propiedades', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('slug', 50).notNullable().unique(); // Identificador único (ej: 'apartamento', 'casa')
      table.string('nombre', 100).notNullable(); // Nombre en español (idioma por defecto)
      table.string('icono', 100); // Clase de icono o emoji
      table.string('color', 20); // Color para badges/etiquetas
      table.text('descripcion'); // Descripción corta
      table.jsonb('traducciones').defaultTo('{}'); // Traducciones por idioma
      table.jsonb('slug_traducciones').defaultTo('{}'); // Slugs traducidos para SEO
      table.boolean('activo').defaultTo(true);
      table.integer('orden').defaultTo(0);
      table.timestamps(true, true);
    });

    // Crear índices
    await knex.raw(`
      CREATE INDEX idx_categorias_propiedades_slug ON categorias_propiedades(slug);
      CREATE INDEX idx_categorias_propiedades_activo ON categorias_propiedades(activo) WHERE activo = true;
    `);

    console.log('✅ Tabla categorias_propiedades creada');
  } else {
    console.log('ℹ️  Tabla categorias_propiedades ya existe');
  }

  // Insertar categorías base
  const categoriasExistentes = await knex('categorias_propiedades').count('* as count').first();

  if (categoriasExistentes && Number(categoriasExistentes.count) === 0) {
    const categorias = [
      {
        slug: 'apartamento',
        nombre: 'Apartamento',
        icono: 'fas fa-building',
        color: '#3B82F6',
        descripcion: 'Unidad habitacional en edificio',
        traducciones: JSON.stringify({
          en: { nombre: 'Apartment', descripcion: 'Residential unit in a building' },
          fr: { nombre: 'Appartement', descripcion: 'Logement dans un immeuble' },
          pt: { nombre: 'Apartamento', descripcion: 'Unidade residencial em edifício' }
        }),
        slug_traducciones: JSON.stringify({
          en: 'apartment',
          fr: 'appartement',
          pt: 'apartamento'
        }),
        orden: 1
      },
      {
        slug: 'casa',
        nombre: 'Casa',
        icono: 'fas fa-home',
        color: '#10B981',
        descripcion: 'Vivienda unifamiliar independiente',
        traducciones: JSON.stringify({
          en: { nombre: 'House', descripcion: 'Single-family detached home' },
          fr: { nombre: 'Maison', descripcion: 'Maison individuelle' },
          pt: { nombre: 'Casa', descripcion: 'Residência unifamiliar' }
        }),
        slug_traducciones: JSON.stringify({
          en: 'house',
          fr: 'maison',
          pt: 'casa'
        }),
        orden: 2
      },
      {
        slug: 'villa',
        nombre: 'Villa',
        icono: 'fas fa-house-user',
        color: '#8B5CF6',
        descripcion: 'Residencia de lujo con amplios espacios',
        traducciones: JSON.stringify({
          en: { nombre: 'Villa', descripcion: 'Luxury residence with ample space' },
          fr: { nombre: 'Villa', descripcion: 'Résidence de luxe avec grands espaces' },
          pt: { nombre: 'Villa', descripcion: 'Residência de luxo com amplos espaços' }
        }),
        slug_traducciones: JSON.stringify({
          en: 'villa',
          fr: 'villa',
          pt: 'villa'
        }),
        orden: 3
      },
      {
        slug: 'penthouse',
        nombre: 'Penthouse',
        icono: 'fas fa-city',
        color: '#EC4899',
        descripcion: 'Apartamento de lujo en último piso',
        traducciones: JSON.stringify({
          en: { nombre: 'Penthouse', descripcion: 'Luxury top-floor apartment' },
          fr: { nombre: 'Penthouse', descripcion: 'Appartement de luxe au dernier étage' },
          pt: { nombre: 'Cobertura', descripcion: 'Apartamento de luxo no último andar' }
        }),
        slug_traducciones: JSON.stringify({
          en: 'penthouse',
          fr: 'penthouse',
          pt: 'cobertura'
        }),
        orden: 4
      },
      {
        slug: 'solar',
        nombre: 'Solar',
        icono: 'fas fa-vector-square',
        color: '#F59E0B',
        descripcion: 'Terreno para construcción',
        traducciones: JSON.stringify({
          en: { nombre: 'Land', descripcion: 'Building lot' },
          fr: { nombre: 'Terrain', descripcion: 'Terrain à bâtir' },
          pt: { nombre: 'Terreno', descripcion: 'Lote para construção' }
        }),
        slug_traducciones: JSON.stringify({
          en: 'land',
          fr: 'terrain',
          pt: 'terreno'
        }),
        orden: 5
      },
      {
        slug: 'finca',
        nombre: 'Finca',
        icono: 'fas fa-tractor',
        color: '#84CC16',
        descripcion: 'Propiedad rural o agrícola',
        traducciones: JSON.stringify({
          en: { nombre: 'Farm', descripcion: 'Rural or agricultural property' },
          fr: { nombre: 'Ferme', descripcion: 'Propriété rurale ou agricole' },
          pt: { nombre: 'Fazenda', descripcion: 'Propriedade rural ou agrícola' }
        }),
        slug_traducciones: JSON.stringify({
          en: 'farm',
          fr: 'ferme',
          pt: 'fazenda'
        }),
        orden: 6
      },
      {
        slug: 'local-comercial',
        nombre: 'Local Comercial',
        icono: 'fas fa-store',
        color: '#06B6D4',
        descripcion: 'Espacio para comercio o servicios',
        traducciones: JSON.stringify({
          en: { nombre: 'Commercial Space', descripcion: 'Space for retail or services' },
          fr: { nombre: 'Local Commercial', descripcion: 'Espace pour commerce ou services' },
          pt: { nombre: 'Ponto Comercial', descripcion: 'Espaço para comércio ou serviços' }
        }),
        slug_traducciones: JSON.stringify({
          en: 'commercial-space',
          fr: 'local-commercial',
          pt: 'ponto-comercial'
        }),
        orden: 7
      },
      {
        slug: 'oficina',
        nombre: 'Oficina',
        icono: 'fas fa-briefcase',
        color: '#6366F1',
        descripcion: 'Espacio para oficinas o trabajo',
        traducciones: JSON.stringify({
          en: { nombre: 'Office', descripcion: 'Office or workspace' },
          fr: { nombre: 'Bureau', descripcion: 'Espace de bureau ou travail' },
          pt: { nombre: 'Escritório', descripcion: 'Espaço para escritório' }
        }),
        slug_traducciones: JSON.stringify({
          en: 'office',
          fr: 'bureau',
          pt: 'escritorio'
        }),
        orden: 8
      },
      {
        slug: 'nave-industrial',
        nombre: 'Nave Industrial',
        icono: 'fas fa-industry',
        color: '#78716C',
        descripcion: 'Espacio industrial o de almacenamiento',
        traducciones: JSON.stringify({
          en: { nombre: 'Industrial Warehouse', descripcion: 'Industrial or storage space' },
          fr: { nombre: 'Entrepôt Industriel', descripcion: 'Espace industriel ou de stockage' },
          pt: { nombre: 'Galpão Industrial', descripcion: 'Espaço industrial ou armazém' }
        }),
        slug_traducciones: JSON.stringify({
          en: 'industrial-warehouse',
          fr: 'entrepot-industriel',
          pt: 'galpao-industrial'
        }),
        orden: 9
      },
      {
        slug: 'estudio',
        nombre: 'Estudio',
        icono: 'fas fa-door-open',
        color: '#A855F7',
        descripcion: 'Apartamento pequeño tipo loft',
        traducciones: JSON.stringify({
          en: { nombre: 'Studio', descripcion: 'Small loft-style apartment' },
          fr: { nombre: 'Studio', descripcion: 'Petit appartement type loft' },
          pt: { nombre: 'Estúdio', descripcion: 'Apartamento pequeno tipo loft' }
        }),
        slug_traducciones: JSON.stringify({
          en: 'studio',
          fr: 'studio',
          pt: 'estudio'
        }),
        orden: 10
      },
      {
        slug: 'duplex',
        nombre: 'Dúplex',
        icono: 'fas fa-layer-group',
        color: '#F43F5E',
        descripcion: 'Vivienda de dos niveles',
        traducciones: JSON.stringify({
          en: { nombre: 'Duplex', descripcion: 'Two-level dwelling' },
          fr: { nombre: 'Duplex', descripcion: 'Logement sur deux niveaux' },
          pt: { nombre: 'Duplex', descripcion: 'Moradia de dois andares' }
        }),
        slug_traducciones: JSON.stringify({
          en: 'duplex',
          fr: 'duplex',
          pt: 'duplex'
        }),
        orden: 11
      },
      {
        slug: 'townhouse',
        nombre: 'Townhouse',
        icono: 'fas fa-house-chimney',
        color: '#0EA5E9',
        descripcion: 'Casa adosada en conjunto residencial',
        traducciones: JSON.stringify({
          en: { nombre: 'Townhouse', descripcion: 'Attached house in residential complex' },
          fr: { nombre: 'Maison Mitoyenne', descripcion: 'Maison en rangée dans un complexe' },
          pt: { nombre: 'Casa Geminada', descripcion: 'Casa em condomínio residencial' }
        }),
        slug_traducciones: JSON.stringify({
          en: 'townhouse',
          fr: 'maison-mitoyenne',
          pt: 'casa-geminada'
        }),
        orden: 12
      },
      {
        slug: 'hotel',
        nombre: 'Hotel',
        icono: 'fas fa-hotel',
        color: '#EAB308',
        descripcion: 'Establecimiento hotelero',
        traducciones: JSON.stringify({
          en: { nombre: 'Hotel', descripcion: 'Hotel establishment' },
          fr: { nombre: 'Hôtel', descripcion: 'Établissement hôtelier' },
          pt: { nombre: 'Hotel', descripcion: 'Estabelecimento hoteleiro' }
        }),
        slug_traducciones: JSON.stringify({
          en: 'hotel',
          fr: 'hotel',
          pt: 'hotel'
        }),
        orden: 13
      },
      {
        slug: 'edificio',
        nombre: 'Edificio',
        icono: 'fas fa-building',
        color: '#64748B',
        descripcion: 'Edificio completo para inversión',
        traducciones: JSON.stringify({
          en: { nombre: 'Building', descripcion: 'Entire building for investment' },
          fr: { nombre: 'Immeuble', descripcion: 'Immeuble complet pour investissement' },
          pt: { nombre: 'Edifício', descripcion: 'Edifício completo para investimento' }
        }),
        slug_traducciones: JSON.stringify({
          en: 'building',
          fr: 'immeuble',
          pt: 'edificio'
        }),
        orden: 14
      },
      {
        slug: 'parking',
        nombre: 'Parking',
        icono: 'fas fa-parking',
        color: '#94A3B8',
        descripcion: 'Plaza de estacionamiento',
        traducciones: JSON.stringify({
          en: { nombre: 'Parking', descripcion: 'Parking space' },
          fr: { nombre: 'Parking', descripcion: 'Place de stationnement' },
          pt: { nombre: 'Estacionamento', descripcion: 'Vaga de estacionamento' }
        }),
        slug_traducciones: JSON.stringify({
          en: 'parking',
          fr: 'parking',
          pt: 'estacionamento'
        }),
        orden: 15
      }
    ];

    await knex('categorias_propiedades').insert(categorias);
    console.log(`✅ ${categorias.length} categorías de propiedades insertadas`);
  } else {
    console.log('ℹ️  Ya existen categorías en la tabla');
  }
}

export async function down(knex: Knex): Promise<void> {
  console.log('⬇️  Revirtiendo migración 103');

  await knex.raw('DROP INDEX IF EXISTS idx_categorias_propiedades_slug');
  await knex.raw('DROP INDEX IF EXISTS idx_categorias_propiedades_activo');

  await knex.schema.dropTableIfExists('categorias_propiedades');
  console.log('✅ Tabla categorias_propiedades eliminada');
}
