import type { Knex } from 'knex';

/**
 * Migración: Agregar nombre_idiomas a tags_propiedades
 *
 * El campo alias_idiomas traduce el SLUG para la URL (/buy/, /apartment/)
 * El campo nombre_idiomas traduce el NOMBRE visible ("Buy", "Apartment")
 */

export async function up(knex: Knex): Promise<void> {
  // Agregar columna nombre_idiomas
  await knex.schema.alterTable('tags_propiedades', (table) => {
    // Nombre visible por idioma: {"es": "Comprar", "en": "Buy", "fr": "Acheter"}
    table.jsonb('nombre_idiomas').defaultTo('{}');
  });

  // Actualizar operaciones
  await knex('tags_propiedades').where('slug', 'comprar').update({
    nombre_idiomas: JSON.stringify({ es: 'Comprar', en: 'Buy', fr: 'Acheter', pt: 'Comprar' }),
  });
  await knex('tags_propiedades').where('slug', 'alquilar').update({
    nombre_idiomas: JSON.stringify({ es: 'Alquilar', en: 'Rent', fr: 'Louer', pt: 'Alugar' }),
  });
  await knex('tags_propiedades').where('slug', 'alquiler-temporal').update({
    nombre_idiomas: JSON.stringify({ es: 'Alquiler Temporal', en: 'Short Term Rental', fr: 'Location Courte Durée', pt: 'Aluguel Temporário' }),
  });

  // Actualizar tipos de propiedad
  await knex('tags_propiedades').where('slug', 'apartamento').update({
    nombre_idiomas: JSON.stringify({ es: 'Apartamento', en: 'Apartment', fr: 'Appartement', pt: 'Apartamento' }),
  });
  await knex('tags_propiedades').where('slug', 'casa').update({
    nombre_idiomas: JSON.stringify({ es: 'Casa', en: 'House', fr: 'Maison', pt: 'Casa' }),
  });
  await knex('tags_propiedades').where('slug', 'penthouse').update({
    nombre_idiomas: JSON.stringify({ es: 'Penthouse', en: 'Penthouse', fr: 'Penthouse', pt: 'Cobertura' }),
  });
  await knex('tags_propiedades').where('slug', 'local-comercial').update({
    nombre_idiomas: JSON.stringify({ es: 'Local Comercial', en: 'Commercial Space', fr: 'Local Commercial', pt: 'Ponto Comercial' }),
  });
  await knex('tags_propiedades').where('slug', 'oficina').update({
    nombre_idiomas: JSON.stringify({ es: 'Oficina', en: 'Office', fr: 'Bureau', pt: 'Escritório' }),
  });
  await knex('tags_propiedades').where('slug', 'terreno').update({
    nombre_idiomas: JSON.stringify({ es: 'Terreno', en: 'Land', fr: 'Terrain', pt: 'Terreno' }),
  });
  await knex('tags_propiedades').where('slug', 'villa').update({
    nombre_idiomas: JSON.stringify({ es: 'Villa', en: 'Villa', fr: 'Villa', pt: 'Villa' }),
  });

  // Actualizar filtros de habitaciones
  for (let i = 1; i <= 6; i++) {
    const slug = `${i}-habitacion${i > 1 ? 'es' : ''}`;
    await knex('tags_propiedades').where('slug', slug).update({
      nombre_idiomas: JSON.stringify({
        es: `${i} Habitacion${i > 1 ? 'es' : ''}`,
        en: `${i} Bedroom${i > 1 ? 's' : ''}`,
        fr: `${i} Chambre${i > 1 ? 's' : ''}`,
        pt: `${i} Quarto${i > 1 ? 's' : ''}`,
      }),
    });
  }

  // Actualizar filtros de baños
  for (let i = 1; i <= 4; i++) {
    const slug = `${i}-bano${i > 1 ? 's' : ''}`;
    await knex('tags_propiedades').where('slug', slug).update({
      nombre_idiomas: JSON.stringify({
        es: `${i} Baño${i > 1 ? 's' : ''}`,
        en: `${i} Bathroom${i > 1 ? 's' : ''}`,
        fr: `${i} Salle de Bain${i > 1 ? 's' : ''}`,
        pt: `${i} Banheiro${i > 1 ? 's' : ''}`,
      }),
    });
  }

  // Actualizar filtros de parqueos
  for (let i = 1; i <= 4; i++) {
    const slug = `${i}-parqueo${i > 1 ? 's' : ''}`;
    await knex('tags_propiedades').where('slug', slug).update({
      nombre_idiomas: JSON.stringify({
        es: `${i} Parqueo${i > 1 ? 's' : ''}`,
        en: `${i} Parking Spot${i > 1 ? 's' : ''}`,
        fr: `${i} Place${i > 1 ? 's' : ''} de Parking`,
        pt: `${i} Vaga${i > 1 ? 's' : ''}`,
      }),
    });
  }

  // Actualizar amenidades
  const amenidades: Record<string, { es: string; en: string; fr: string; pt: string }> = {
    'gym': { es: 'Gimnasio', en: 'Gym', fr: 'Salle de Sport', pt: 'Academia' },
    'piscina': { es: 'Piscina', en: 'Pool', fr: 'Piscine', pt: 'Piscina' },
    'terraza': { es: 'Terraza', en: 'Terrace', fr: 'Terrasse', pt: 'Terraço' },
    'balcon': { es: 'Balcón', en: 'Balcony', fr: 'Balcon', pt: 'Varanda' },
    'jardin': { es: 'Jardín', en: 'Garden', fr: 'Jardin', pt: 'Jardim' },
    'seguridad-24h': { es: 'Seguridad 24h', en: '24h Security', fr: 'Sécurité 24h', pt: 'Segurança 24h' },
    'portero': { es: 'Portero', en: 'Doorman', fr: 'Concierge', pt: 'Porteiro' },
    'ascensor': { es: 'Ascensor', en: 'Elevator', fr: 'Ascenseur', pt: 'Elevador' },
    'aire-acondicionado': { es: 'Aire Acondicionado', en: 'Air Conditioning', fr: 'Climatisation', pt: 'Ar Condicionado' },
    'amueblado': { es: 'Amueblado', en: 'Furnished', fr: 'Meublé', pt: 'Mobiliado' },
    'vista-al-mar': { es: 'Vista al Mar', en: 'Sea View', fr: 'Vue Mer', pt: 'Vista para o Mar' },
    'cerca-playa': { es: 'Cerca de la Playa', en: 'Near Beach', fr: 'Proche Plage', pt: 'Perto da Praia' },
    'area-social': { es: 'Área Social', en: 'Social Area', fr: 'Espace Commun', pt: 'Área Social' },
    'bbq': { es: 'BBQ', en: 'BBQ', fr: 'Barbecue', pt: 'Churrasqueira' },
    'jacuzzi': { es: 'Jacuzzi', en: 'Jacuzzi', fr: 'Jacuzzi', pt: 'Jacuzzi' },
    'sauna': { es: 'Sauna', en: 'Sauna', fr: 'Sauna', pt: 'Sauna' },
    'cancha-tenis': { es: 'Cancha de Tenis', en: 'Tennis Court', fr: 'Court de Tennis', pt: 'Quadra de Tênis' },
    'area-ninos': { es: 'Área de Niños', en: 'Kids Area', fr: 'Aire de Jeux', pt: 'Área Infantil' },
  };

  for (const [slug, nombres] of Object.entries(amenidades)) {
    await knex('tags_propiedades').where('slug', slug).update({
      nombre_idiomas: JSON.stringify(nombres),
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('tags_propiedades', (table) => {
    table.dropColumn('nombre_idiomas');
  });
}
