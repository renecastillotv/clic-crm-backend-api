import type { Knex } from 'knex';

/**
 * Migración 101: Crear catálogo de amenidades
 *
 * Tabla para gestionar las amenidades disponibles para propiedades y proyectos.
 * Incluye soporte multi-idioma via campo traducciones JSONB.
 *
 * Estructura de traducciones:
 * {
 *   "en": { "nombre": "Swimming Pool" },
 *   "fr": { "nombre": "Piscine" },
 *   "pt": { "nombre": "Piscina" }
 * }
 */

export async function up(knex: Knex): Promise<void> {
  console.log('⬆️  Ejecutando migración 101: create_amenidades_catalogo');

  // Crear tabla amenidades
  const hasTable = await knex.schema.hasTable('amenidades');

  if (!hasTable) {
    await knex.schema.createTable('amenidades', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('codigo', 50).notNullable().unique(); // Identificador único (ej: 'piscina', 'gym')
      table.string('nombre', 100).notNullable(); // Nombre en español (idioma por defecto)
      table.string('icono', 100); // Clase de icono FontAwesome (ej: 'fas fa-swimmer')
      table.string('categoria', 50).notNullable(); // Categoría (ej: 'recreacion', 'seguridad', 'servicios')
      table.jsonb('traducciones').defaultTo('{}'); // Traducciones por idioma
      table.boolean('activo').defaultTo(true);
      table.integer('orden').defaultTo(0);
      table.timestamps(true, true);
    });

    // Crear índices
    await knex.raw(`
      CREATE INDEX idx_amenidades_categoria ON amenidades(categoria);
      CREATE INDEX idx_amenidades_activo ON amenidades(activo) WHERE activo = true;
      CREATE INDEX idx_amenidades_codigo ON amenidades(codigo);
    `);

    console.log('✅ Tabla amenidades creada');
  } else {
    console.log('ℹ️  Tabla amenidades ya existe');
  }

  // Insertar amenidades comunes
  const amenidadesExistentes = await knex('amenidades').count('* as count').first();

  if (amenidadesExistentes && Number(amenidadesExistentes.count) === 0) {
    const amenidades = [
      // ========== RECREACIÓN ==========
      {
        codigo: 'piscina',
        nombre: 'Piscina',
        icono: 'fas fa-swimmer',
        categoria: 'recreacion',
        traducciones: JSON.stringify({
          en: { nombre: 'Swimming Pool' },
          fr: { nombre: 'Piscine' },
          pt: { nombre: 'Piscina' }
        }),
        orden: 1
      },
      {
        codigo: 'gimnasio',
        nombre: 'Gimnasio',
        icono: 'fas fa-dumbbell',
        categoria: 'recreacion',
        traducciones: JSON.stringify({
          en: { nombre: 'Gym' },
          fr: { nombre: 'Salle de sport' },
          pt: { nombre: 'Academia' }
        }),
        orden: 2
      },
      {
        codigo: 'spa',
        nombre: 'Spa',
        icono: 'fas fa-spa',
        categoria: 'recreacion',
        traducciones: JSON.stringify({
          en: { nombre: 'Spa' },
          fr: { nombre: 'Spa' },
          pt: { nombre: 'Spa' }
        }),
        orden: 3
      },
      {
        codigo: 'sauna',
        nombre: 'Sauna',
        icono: 'fas fa-hot-tub',
        categoria: 'recreacion',
        traducciones: JSON.stringify({
          en: { nombre: 'Sauna' },
          fr: { nombre: 'Sauna' },
          pt: { nombre: 'Sauna' }
        }),
        orden: 4
      },
      {
        codigo: 'jacuzzi',
        nombre: 'Jacuzzi',
        icono: 'fas fa-hot-tub',
        categoria: 'recreacion',
        traducciones: JSON.stringify({
          en: { nombre: 'Jacuzzi' },
          fr: { nombre: 'Jacuzzi' },
          pt: { nombre: 'Jacuzzi' }
        }),
        orden: 5
      },
      {
        codigo: 'cancha_tenis',
        nombre: 'Cancha de Tenis',
        icono: 'fas fa-baseball-ball',
        categoria: 'recreacion',
        traducciones: JSON.stringify({
          en: { nombre: 'Tennis Court' },
          fr: { nombre: 'Court de tennis' },
          pt: { nombre: 'Quadra de Tênis' }
        }),
        orden: 6
      },
      {
        codigo: 'cancha_basketball',
        nombre: 'Cancha de Basketball',
        icono: 'fas fa-basketball-ball',
        categoria: 'recreacion',
        traducciones: JSON.stringify({
          en: { nombre: 'Basketball Court' },
          fr: { nombre: 'Terrain de basketball' },
          pt: { nombre: 'Quadra de Basquete' }
        }),
        orden: 7
      },
      {
        codigo: 'area_juegos',
        nombre: 'Área de Juegos Infantiles',
        icono: 'fas fa-child',
        categoria: 'recreacion',
        traducciones: JSON.stringify({
          en: { nombre: 'Children\'s Playground' },
          fr: { nombre: 'Aire de jeux' },
          pt: { nombre: 'Playground' }
        }),
        orden: 8
      },
      {
        codigo: 'area_bbq',
        nombre: 'Área de BBQ',
        icono: 'fas fa-fire',
        categoria: 'recreacion',
        traducciones: JSON.stringify({
          en: { nombre: 'BBQ Area' },
          fr: { nombre: 'Espace barbecue' },
          pt: { nombre: 'Área de Churrasqueira' }
        }),
        orden: 9
      },
      {
        codigo: 'salon_fiestas',
        nombre: 'Salón de Fiestas',
        icono: 'fas fa-glass-cheers',
        categoria: 'recreacion',
        traducciones: JSON.stringify({
          en: { nombre: 'Party Room' },
          fr: { nombre: 'Salle de fêtes' },
          pt: { nombre: 'Salão de Festas' }
        }),
        orden: 10
      },
      {
        codigo: 'cine',
        nombre: 'Sala de Cine',
        icono: 'fas fa-film',
        categoria: 'recreacion',
        traducciones: JSON.stringify({
          en: { nombre: 'Movie Theater' },
          fr: { nombre: 'Salle de cinéma' },
          pt: { nombre: 'Sala de Cinema' }
        }),
        orden: 11
      },
      {
        codigo: 'golf',
        nombre: 'Campo de Golf',
        icono: 'fas fa-golf-ball',
        categoria: 'recreacion',
        traducciones: JSON.stringify({
          en: { nombre: 'Golf Course' },
          fr: { nombre: 'Terrain de golf' },
          pt: { nombre: 'Campo de Golfe' }
        }),
        orden: 12
      },

      // ========== SEGURIDAD ==========
      {
        codigo: 'seguridad_24h',
        nombre: 'Seguridad 24 Horas',
        icono: 'fas fa-shield-alt',
        categoria: 'seguridad',
        traducciones: JSON.stringify({
          en: { nombre: '24h Security' },
          fr: { nombre: 'Sécurité 24h' },
          pt: { nombre: 'Segurança 24h' }
        }),
        orden: 20
      },
      {
        codigo: 'control_acceso',
        nombre: 'Control de Acceso',
        icono: 'fas fa-door-closed',
        categoria: 'seguridad',
        traducciones: JSON.stringify({
          en: { nombre: 'Access Control' },
          fr: { nombre: 'Contrôle d\'accès' },
          pt: { nombre: 'Controle de Acesso' }
        }),
        orden: 21
      },
      {
        codigo: 'cctv',
        nombre: 'Circuito Cerrado (CCTV)',
        icono: 'fas fa-video',
        categoria: 'seguridad',
        traducciones: JSON.stringify({
          en: { nombre: 'CCTV' },
          fr: { nombre: 'Vidéosurveillance' },
          pt: { nombre: 'Circuito Fechado (CFTV)' }
        }),
        orden: 22
      },
      {
        codigo: 'portero',
        nombre: 'Portero/Conserje',
        icono: 'fas fa-user-tie',
        categoria: 'seguridad',
        traducciones: JSON.stringify({
          en: { nombre: 'Doorman/Concierge' },
          fr: { nombre: 'Concierge' },
          pt: { nombre: 'Porteiro' }
        }),
        orden: 23
      },
      {
        codigo: 'intercomunicador',
        nombre: 'Intercomunicador',
        icono: 'fas fa-phone-volume',
        categoria: 'seguridad',
        traducciones: JSON.stringify({
          en: { nombre: 'Intercom' },
          fr: { nombre: 'Interphone' },
          pt: { nombre: 'Interfone' }
        }),
        orden: 24
      },

      // ========== SERVICIOS ==========
      {
        codigo: 'ascensor',
        nombre: 'Ascensor',
        icono: 'fas fa-arrows-alt-v',
        categoria: 'servicios',
        traducciones: JSON.stringify({
          en: { nombre: 'Elevator' },
          fr: { nombre: 'Ascenseur' },
          pt: { nombre: 'Elevador' }
        }),
        orden: 30
      },
      {
        codigo: 'estacionamiento',
        nombre: 'Estacionamiento',
        icono: 'fas fa-parking',
        categoria: 'servicios',
        traducciones: JSON.stringify({
          en: { nombre: 'Parking' },
          fr: { nombre: 'Parking' },
          pt: { nombre: 'Estacionamento' }
        }),
        orden: 31
      },
      {
        codigo: 'estacionamiento_visitas',
        nombre: 'Estacionamiento de Visitas',
        icono: 'fas fa-car',
        categoria: 'servicios',
        traducciones: JSON.stringify({
          en: { nombre: 'Visitor Parking' },
          fr: { nombre: 'Parking visiteurs' },
          pt: { nombre: 'Estacionamento de Visitantes' }
        }),
        orden: 32
      },
      {
        codigo: 'lobby',
        nombre: 'Lobby',
        icono: 'fas fa-building',
        categoria: 'servicios',
        traducciones: JSON.stringify({
          en: { nombre: 'Lobby' },
          fr: { nombre: 'Hall d\'entrée' },
          pt: { nombre: 'Lobby' }
        }),
        orden: 33
      },
      {
        codigo: 'recepcion',
        nombre: 'Recepción',
        icono: 'fas fa-concierge-bell',
        categoria: 'servicios',
        traducciones: JSON.stringify({
          en: { nombre: 'Reception' },
          fr: { nombre: 'Réception' },
          pt: { nombre: 'Recepção' }
        }),
        orden: 34
      },
      {
        codigo: 'lavanderia',
        nombre: 'Lavandería',
        icono: 'fas fa-tshirt',
        categoria: 'servicios',
        traducciones: JSON.stringify({
          en: { nombre: 'Laundry' },
          fr: { nombre: 'Blanchisserie' },
          pt: { nombre: 'Lavanderia' }
        }),
        orden: 35
      },
      {
        codigo: 'area_mascotas',
        nombre: 'Área para Mascotas',
        icono: 'fas fa-paw',
        categoria: 'servicios',
        traducciones: JSON.stringify({
          en: { nombre: 'Pet Area' },
          fr: { nombre: 'Espace animaux' },
          pt: { nombre: 'Área para Pets' }
        }),
        orden: 36
      },
      {
        codigo: 'bicicletas',
        nombre: 'Estacionamiento de Bicicletas',
        icono: 'fas fa-bicycle',
        categoria: 'servicios',
        traducciones: JSON.stringify({
          en: { nombre: 'Bicycle Parking' },
          fr: { nombre: 'Parking vélos' },
          pt: { nombre: 'Bicicletário' }
        }),
        orden: 37
      },
      {
        codigo: 'deposito',
        nombre: 'Depósito/Storage',
        icono: 'fas fa-warehouse',
        categoria: 'servicios',
        traducciones: JSON.stringify({
          en: { nombre: 'Storage' },
          fr: { nombre: 'Dépôt' },
          pt: { nombre: 'Depósito' }
        }),
        orden: 38
      },

      // ========== COMODIDADES INTERIORES ==========
      {
        codigo: 'aire_acondicionado',
        nombre: 'Aire Acondicionado',
        icono: 'fas fa-snowflake',
        categoria: 'comodidades',
        traducciones: JSON.stringify({
          en: { nombre: 'Air Conditioning' },
          fr: { nombre: 'Climatisation' },
          pt: { nombre: 'Ar Condicionado' }
        }),
        orden: 40
      },
      {
        codigo: 'calefaccion',
        nombre: 'Calefacción',
        icono: 'fas fa-temperature-high',
        categoria: 'comodidades',
        traducciones: JSON.stringify({
          en: { nombre: 'Heating' },
          fr: { nombre: 'Chauffage' },
          pt: { nombre: 'Aquecimento' }
        }),
        orden: 41
      },
      {
        codigo: 'chimenea',
        nombre: 'Chimenea',
        icono: 'fas fa-fire-alt',
        categoria: 'comodidades',
        traducciones: JSON.stringify({
          en: { nombre: 'Fireplace' },
          fr: { nombre: 'Cheminée' },
          pt: { nombre: 'Lareira' }
        }),
        orden: 42
      },
      {
        codigo: 'balcon',
        nombre: 'Balcón',
        icono: 'fas fa-border-all',
        categoria: 'comodidades',
        traducciones: JSON.stringify({
          en: { nombre: 'Balcony' },
          fr: { nombre: 'Balcon' },
          pt: { nombre: 'Varanda' }
        }),
        orden: 43
      },
      {
        codigo: 'terraza',
        nombre: 'Terraza',
        icono: 'fas fa-umbrella-beach',
        categoria: 'comodidades',
        traducciones: JSON.stringify({
          en: { nombre: 'Terrace' },
          fr: { nombre: 'Terrasse' },
          pt: { nombre: 'Terraço' }
        }),
        orden: 44
      },
      {
        codigo: 'jardin',
        nombre: 'Jardín',
        icono: 'fas fa-leaf',
        categoria: 'comodidades',
        traducciones: JSON.stringify({
          en: { nombre: 'Garden' },
          fr: { nombre: 'Jardin' },
          pt: { nombre: 'Jardim' }
        }),
        orden: 45
      },
      {
        codigo: 'patio',
        nombre: 'Patio',
        icono: 'fas fa-home',
        categoria: 'comodidades',
        traducciones: JSON.stringify({
          en: { nombre: 'Patio' },
          fr: { nombre: 'Patio' },
          pt: { nombre: 'Pátio' }
        }),
        orden: 46
      },
      {
        codigo: 'walk_in_closet',
        nombre: 'Walk-in Closet',
        icono: 'fas fa-door-open',
        categoria: 'comodidades',
        traducciones: JSON.stringify({
          en: { nombre: 'Walk-in Closet' },
          fr: { nombre: 'Dressing' },
          pt: { nombre: 'Closet' }
        }),
        orden: 47
      },
      {
        codigo: 'cocina_equipada',
        nombre: 'Cocina Equipada',
        icono: 'fas fa-utensils',
        categoria: 'comodidades',
        traducciones: JSON.stringify({
          en: { nombre: 'Equipped Kitchen' },
          fr: { nombre: 'Cuisine équipée' },
          pt: { nombre: 'Cozinha Equipada' }
        }),
        orden: 48
      },
      {
        codigo: 'amueblado',
        nombre: 'Amueblado',
        icono: 'fas fa-couch',
        categoria: 'comodidades',
        traducciones: JSON.stringify({
          en: { nombre: 'Furnished' },
          fr: { nombre: 'Meublé' },
          pt: { nombre: 'Mobiliado' }
        }),
        orden: 49
      },

      // ========== TECNOLOGÍA ==========
      {
        codigo: 'internet',
        nombre: 'Internet/WiFi',
        icono: 'fas fa-wifi',
        categoria: 'tecnologia',
        traducciones: JSON.stringify({
          en: { nombre: 'Internet/WiFi' },
          fr: { nombre: 'Internet/WiFi' },
          pt: { nombre: 'Internet/WiFi' }
        }),
        orden: 50
      },
      {
        codigo: 'smart_home',
        nombre: 'Smart Home',
        icono: 'fas fa-home',
        categoria: 'tecnologia',
        traducciones: JSON.stringify({
          en: { nombre: 'Smart Home' },
          fr: { nombre: 'Maison intelligente' },
          pt: { nombre: 'Casa Inteligente' }
        }),
        orden: 51
      },
      {
        codigo: 'cable_tv',
        nombre: 'TV por Cable',
        icono: 'fas fa-tv',
        categoria: 'tecnologia',
        traducciones: JSON.stringify({
          en: { nombre: 'Cable TV' },
          fr: { nombre: 'TV câblée' },
          pt: { nombre: 'TV a Cabo' }
        }),
        orden: 52
      },
      {
        codigo: 'cargador_electrico',
        nombre: 'Cargador para Vehículo Eléctrico',
        icono: 'fas fa-charging-station',
        categoria: 'tecnologia',
        traducciones: JSON.stringify({
          en: { nombre: 'EV Charging Station' },
          fr: { nombre: 'Borne de recharge' },
          pt: { nombre: 'Carregador para Veículo Elétrico' }
        }),
        orden: 53
      },

      // ========== VISTAS ==========
      {
        codigo: 'vista_mar',
        nombre: 'Vista al Mar',
        icono: 'fas fa-water',
        categoria: 'vistas',
        traducciones: JSON.stringify({
          en: { nombre: 'Ocean View' },
          fr: { nombre: 'Vue sur mer' },
          pt: { nombre: 'Vista para o Mar' }
        }),
        orden: 60
      },
      {
        codigo: 'vista_ciudad',
        nombre: 'Vista a la Ciudad',
        icono: 'fas fa-city',
        categoria: 'vistas',
        traducciones: JSON.stringify({
          en: { nombre: 'City View' },
          fr: { nombre: 'Vue sur la ville' },
          pt: { nombre: 'Vista para a Cidade' }
        }),
        orden: 61
      },
      {
        codigo: 'vista_montana',
        nombre: 'Vista a la Montaña',
        icono: 'fas fa-mountain',
        categoria: 'vistas',
        traducciones: JSON.stringify({
          en: { nombre: 'Mountain View' },
          fr: { nombre: 'Vue sur la montagne' },
          pt: { nombre: 'Vista para a Montanha' }
        }),
        orden: 62
      },
      {
        codigo: 'vista_jardin',
        nombre: 'Vista al Jardín',
        icono: 'fas fa-tree',
        categoria: 'vistas',
        traducciones: JSON.stringify({
          en: { nombre: 'Garden View' },
          fr: { nombre: 'Vue sur le jardin' },
          pt: { nombre: 'Vista para o Jardim' }
        }),
        orden: 63
      },
      {
        codigo: 'vista_piscina',
        nombre: 'Vista a la Piscina',
        icono: 'fas fa-swimming-pool',
        categoria: 'vistas',
        traducciones: JSON.stringify({
          en: { nombre: 'Pool View' },
          fr: { nombre: 'Vue sur la piscine' },
          pt: { nombre: 'Vista para a Piscina' }
        }),
        orden: 64
      },

      // ========== ACCESIBILIDAD ==========
      {
        codigo: 'acceso_discapacitados',
        nombre: 'Acceso para Discapacitados',
        icono: 'fas fa-wheelchair',
        categoria: 'accesibilidad',
        traducciones: JSON.stringify({
          en: { nombre: 'Wheelchair Accessible' },
          fr: { nombre: 'Accès handicapés' },
          pt: { nombre: 'Acessível para Cadeirantes' }
        }),
        orden: 70
      },
      {
        codigo: 'rampa',
        nombre: 'Rampa de Acceso',
        icono: 'fas fa-ramp-loading',
        categoria: 'accesibilidad',
        traducciones: JSON.stringify({
          en: { nombre: 'Access Ramp' },
          fr: { nombre: 'Rampe d\'accès' },
          pt: { nombre: 'Rampa de Acesso' }
        }),
        orden: 71
      },

      // ========== SOSTENIBILIDAD ==========
      {
        codigo: 'paneles_solares',
        nombre: 'Paneles Solares',
        icono: 'fas fa-solar-panel',
        categoria: 'sostenibilidad',
        traducciones: JSON.stringify({
          en: { nombre: 'Solar Panels' },
          fr: { nombre: 'Panneaux solaires' },
          pt: { nombre: 'Painéis Solares' }
        }),
        orden: 80
      },
      {
        codigo: 'agua_reciclada',
        nombre: 'Sistema de Agua Reciclada',
        icono: 'fas fa-recycle',
        categoria: 'sostenibilidad',
        traducciones: JSON.stringify({
          en: { nombre: 'Recycled Water System' },
          fr: { nombre: 'Système d\'eau recyclée' },
          pt: { nombre: 'Sistema de Água Reciclada' }
        }),
        orden: 81
      },
      {
        codigo: 'certificacion_verde',
        nombre: 'Certificación Verde',
        icono: 'fas fa-leaf',
        categoria: 'sostenibilidad',
        traducciones: JSON.stringify({
          en: { nombre: 'Green Certification' },
          fr: { nombre: 'Certification verte' },
          pt: { nombre: 'Certificação Verde' }
        }),
        orden: 82
      },

      // ========== COMERCIAL/NEGOCIOS ==========
      {
        codigo: 'sala_reuniones',
        nombre: 'Sala de Reuniones',
        icono: 'fas fa-users',
        categoria: 'negocios',
        traducciones: JSON.stringify({
          en: { nombre: 'Meeting Room' },
          fr: { nombre: 'Salle de réunion' },
          pt: { nombre: 'Sala de Reuniões' }
        }),
        orden: 90
      },
      {
        codigo: 'coworking',
        nombre: 'Espacio Coworking',
        icono: 'fas fa-laptop-house',
        categoria: 'negocios',
        traducciones: JSON.stringify({
          en: { nombre: 'Coworking Space' },
          fr: { nombre: 'Espace coworking' },
          pt: { nombre: 'Espaço Coworking' }
        }),
        orden: 91
      },
      {
        codigo: 'business_center',
        nombre: 'Business Center',
        icono: 'fas fa-briefcase',
        categoria: 'negocios',
        traducciones: JSON.stringify({
          en: { nombre: 'Business Center' },
          fr: { nombre: 'Centre d\'affaires' },
          pt: { nombre: 'Business Center' }
        }),
        orden: 92
      },

      // ========== PLAYA/RESORT ==========
      {
        codigo: 'acceso_playa',
        nombre: 'Acceso a la Playa',
        icono: 'fas fa-umbrella-beach',
        categoria: 'playa',
        traducciones: JSON.stringify({
          en: { nombre: 'Beach Access' },
          fr: { nombre: 'Accès à la plage' },
          pt: { nombre: 'Acesso à Praia' }
        }),
        orden: 100
      },
      {
        codigo: 'club_playa',
        nombre: 'Club de Playa',
        icono: 'fas fa-cocktail',
        categoria: 'playa',
        traducciones: JSON.stringify({
          en: { nombre: 'Beach Club' },
          fr: { nombre: 'Club de plage' },
          pt: { nombre: 'Beach Club' }
        }),
        orden: 101
      },
      {
        codigo: 'muelle',
        nombre: 'Muelle/Marina',
        icono: 'fas fa-anchor',
        categoria: 'playa',
        traducciones: JSON.stringify({
          en: { nombre: 'Dock/Marina' },
          fr: { nombre: 'Quai/Marina' },
          pt: { nombre: 'Píer/Marina' }
        }),
        orden: 102
      },

      // ========== EXTRAS ==========
      {
        codigo: 'generador',
        nombre: 'Generador Eléctrico',
        icono: 'fas fa-bolt',
        categoria: 'extras',
        traducciones: JSON.stringify({
          en: { nombre: 'Electric Generator' },
          fr: { nombre: 'Générateur électrique' },
          pt: { nombre: 'Gerador Elétrico' }
        }),
        orden: 110
      },
      {
        codigo: 'cisterna',
        nombre: 'Cisterna',
        icono: 'fas fa-tint',
        categoria: 'extras',
        traducciones: JSON.stringify({
          en: { nombre: 'Water Tank' },
          fr: { nombre: 'Citerne' },
          pt: { nombre: 'Cisterna' }
        }),
        orden: 111
      },
      {
        codigo: 'cuarto_servicio',
        nombre: 'Cuarto de Servicio',
        icono: 'fas fa-bed',
        categoria: 'extras',
        traducciones: JSON.stringify({
          en: { nombre: 'Service Room' },
          fr: { nombre: 'Chambre de service' },
          pt: { nombre: 'Quarto de Serviço' }
        }),
        orden: 112
      },
    ];

    await knex('amenidades').insert(amenidades);
    console.log(`✅ ${amenidades.length} amenidades insertadas`);
  } else {
    console.log('ℹ️  Ya existen amenidades en la tabla');
  }
}

export async function down(knex: Knex): Promise<void> {
  console.log('⬇️  Revirtiendo migración 101');

  await knex.raw('DROP INDEX IF EXISTS idx_amenidades_categoria');
  await knex.raw('DROP INDEX IF EXISTS idx_amenidades_activo');
  await knex.raw('DROP INDEX IF EXISTS idx_amenidades_codigo');

  await knex.schema.dropTableIfExists('amenidades');
  console.log('✅ Tabla amenidades eliminada');
}
