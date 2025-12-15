import type { Knex } from 'knex';

/**
 * Migración: Configuración del Route Resolver
 *
 * Crea las tablas necesarias para el sistema de resolución de rutas:
 *
 * 1. tenants_rutas_config: Configura niveles de navegación por prefijo para cada tenant
 *    - Ejemplo: CLIC tiene testimonios con nivel 2 → /testimonios/categoria/single
 *    - Ejemplo: Básico tiene testimonios con nivel 0 → /testimonios/single
 *
 * 2. tags_propiedades: Tags para descomponer URLs de propiedades
 *    - Ejemplo: /comprar/apartamento/2-banos/gym → operacion=venta, tipo=apartamento, filtros...
 */

export async function up(knex: Knex): Promise<void> {
  // ===========================================
  // TABLA: tenants_rutas_config
  // ===========================================
  await knex.schema.createTable('tenants_rutas_config', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');

    // Prefijo de la ruta (testimonios, articulos, videos, asesores, etc.)
    table.string('prefijo', 100).notNullable();

    // Nivel de navegación:
    // 0 = solo directorio (ej: /testimonios/ muestra todos, /testimonios/slug es single)
    // 1 = directorio + single (ej: /testimonios/ = todos, /testimonios/slug = single)
    // 2 = directorio + categoría + single (ej: /testimonios/categoria/slug)
    table.integer('nivel_navegacion').notNullable().defaultTo(1);

    // Aliases por idioma: {"en": "testimonials", "fr": "temoignages", "pt": "testemunhos"}
    table.jsonb('alias_idiomas').defaultTo('{}');

    // Si está habilitado para este tenant
    table.boolean('habilitado').defaultTo(true);

    // Orden de prioridad al resolver (menor = más prioritario)
    table.integer('orden').defaultTo(0);

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Un tenant solo puede tener una configuración por prefijo
    table.unique(['tenant_id', 'prefijo']);
  });

  // Índices para búsqueda rápida
  await knex.raw(`
    CREATE INDEX idx_tenants_rutas_config_tenant ON tenants_rutas_config(tenant_id);
    CREATE INDEX idx_tenants_rutas_config_prefijo ON tenants_rutas_config(prefijo);
    CREATE INDEX idx_tenants_rutas_config_habilitado ON tenants_rutas_config(habilitado) WHERE habilitado = true;
  `);

  // ===========================================
  // TABLA: tags_propiedades
  // ===========================================
  await knex.schema.createTable('tags_propiedades', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Slug que aparece en la URL (ej: "apartamento", "2-banos", "gym", "comprar")
    table.string('slug', 150).notNullable();

    // Tipo de tag para saber cómo usarlo en el query
    // - operacion: comprar, alquilar, alquiler-temporal
    // - tipo_propiedad: apartamento, casa, local, terreno, oficina
    // - ubicacion: ciudad, zona, sector
    // - filtro: 2-banos, 3-habitaciones, precio-desde-X-a-Y
    // - amenidad: gym, piscina, terraza, seguridad-24h
    table.string('tipo', 50).notNullable();

    // Valor para usar en el query (puede ser diferente del slug)
    // Ej: slug="comprar" → valor="venta"
    // Ej: slug="2-banos" → valor="2"
    table.string('valor', 255);

    // Campo de la tabla propiedades al que aplica (para construir el WHERE)
    // Ej: "tipo_operacion", "tipo_propiedad", "ciudad", "banos", "amenidades"
    table.string('campo_query', 100);

    // Operador SQL a usar: =, >=, <=, @>, LIKE, etc.
    table.string('operador', 20).defaultTo('=');

    // Aliases por idioma: {"en": "buy", "fr": "acheter"}
    table.jsonb('alias_idiomas').defaultTo('{}');

    // Tenant específico o NULL para global
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');

    // Orden para mostrar en UI
    table.integer('orden').defaultTo(0);

    // Si está activo
    table.boolean('activo').defaultTo(true);

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Índices
  await knex.raw(`
    CREATE INDEX idx_tags_propiedades_slug ON tags_propiedades(slug);
    CREATE INDEX idx_tags_propiedades_tipo ON tags_propiedades(tipo);
    CREATE INDEX idx_tags_propiedades_tenant ON tags_propiedades(tenant_id);
    CREATE INDEX idx_tags_propiedades_activo ON tags_propiedades(activo) WHERE activo = true;
  `);

  // ===========================================
  // SEED: Tags globales de propiedades
  // ===========================================

  // Operaciones
  await knex('tags_propiedades').insert([
    {
      slug: 'comprar',
      tipo: 'operacion',
      valor: 'venta',
      campo_query: 'tipo_operacion',
      operador: '=',
      alias_idiomas: JSON.stringify({ en: 'buy', fr: 'acheter', pt: 'comprar' }),
      orden: 1,
    },
    {
      slug: 'alquilar',
      tipo: 'operacion',
      valor: 'alquiler',
      campo_query: 'tipo_operacion',
      operador: '=',
      alias_idiomas: JSON.stringify({ en: 'rent', fr: 'louer', pt: 'alugar' }),
      orden: 2,
    },
    {
      slug: 'alquiler-temporal',
      tipo: 'operacion',
      valor: 'alquiler_temporal',
      campo_query: 'tipo_operacion',
      operador: '=',
      alias_idiomas: JSON.stringify({ en: 'short-term-rental', fr: 'location-courte-duree', pt: 'aluguel-temporario' }),
      orden: 3,
    },
  ]);

  // Tipos de propiedad
  await knex('tags_propiedades').insert([
    {
      slug: 'apartamento',
      tipo: 'tipo_propiedad',
      valor: 'apartamento',
      campo_query: 'tipo_propiedad',
      operador: '=',
      alias_idiomas: JSON.stringify({ en: 'apartment', fr: 'appartement', pt: 'apartamento' }),
      orden: 1,
    },
    {
      slug: 'casa',
      tipo: 'tipo_propiedad',
      valor: 'casa',
      campo_query: 'tipo_propiedad',
      operador: '=',
      alias_idiomas: JSON.stringify({ en: 'house', fr: 'maison', pt: 'casa' }),
      orden: 2,
    },
    {
      slug: 'penthouse',
      tipo: 'tipo_propiedad',
      valor: 'penthouse',
      campo_query: 'tipo_propiedad',
      operador: '=',
      alias_idiomas: JSON.stringify({ en: 'penthouse', fr: 'penthouse', pt: 'cobertura' }),
      orden: 3,
    },
    {
      slug: 'local-comercial',
      tipo: 'tipo_propiedad',
      valor: 'local_comercial',
      campo_query: 'tipo_propiedad',
      operador: '=',
      alias_idiomas: JSON.stringify({ en: 'commercial-space', fr: 'local-commercial', pt: 'ponto-comercial' }),
      orden: 4,
    },
    {
      slug: 'oficina',
      tipo: 'tipo_propiedad',
      valor: 'oficina',
      campo_query: 'tipo_propiedad',
      operador: '=',
      alias_idiomas: JSON.stringify({ en: 'office', fr: 'bureau', pt: 'escritorio' }),
      orden: 5,
    },
    {
      slug: 'terreno',
      tipo: 'tipo_propiedad',
      valor: 'terreno',
      campo_query: 'tipo_propiedad',
      operador: '=',
      alias_idiomas: JSON.stringify({ en: 'land', fr: 'terrain', pt: 'terreno' }),
      orden: 6,
    },
    {
      slug: 'villa',
      tipo: 'tipo_propiedad',
      valor: 'villa',
      campo_query: 'tipo_propiedad',
      operador: '=',
      alias_idiomas: JSON.stringify({ en: 'villa', fr: 'villa', pt: 'villa' }),
      orden: 7,
    },
  ]);

  // Filtros de habitaciones
  for (let i = 1; i <= 6; i++) {
    await knex('tags_propiedades').insert({
      slug: `${i}-habitacion${i > 1 ? 'es' : ''}`,
      tipo: 'filtro',
      valor: String(i),
      campo_query: 'habitaciones',
      operador: '>=',
      alias_idiomas: JSON.stringify({
        en: `${i}-bedroom${i > 1 ? 's' : ''}`,
        fr: `${i}-chambre${i > 1 ? 's' : ''}`,
        pt: `${i}-quarto${i > 1 ? 's' : ''}`
      }),
      orden: i,
    });
  }

  // Filtros de baños
  for (let i = 1; i <= 4; i++) {
    await knex('tags_propiedades').insert({
      slug: `${i}-bano${i > 1 ? 's' : ''}`,
      tipo: 'filtro',
      valor: String(i),
      campo_query: 'banos',
      operador: '>=',
      alias_idiomas: JSON.stringify({
        en: `${i}-bathroom${i > 1 ? 's' : ''}`,
        fr: `${i}-salle-de-bain${i > 1 ? 's' : ''}`,
        pt: `${i}-banheiro${i > 1 ? 's' : ''}`
      }),
      orden: i + 10,
    });
  }

  // Filtros de parqueos
  for (let i = 1; i <= 4; i++) {
    await knex('tags_propiedades').insert({
      slug: `${i}-parqueo${i > 1 ? 's' : ''}`,
      tipo: 'filtro',
      valor: String(i),
      campo_query: 'parqueos',
      operador: '>=',
      alias_idiomas: JSON.stringify({
        en: `${i}-parking${i > 1 ? 's' : ''}`,
        fr: `${i}-parking${i > 1 ? 's' : ''}`,
        pt: `${i}-vaga${i > 1 ? 's' : ''}`
      }),
      orden: i + 20,
    });
  }

  // Amenidades comunes
  const amenidades = [
    { slug: 'gym', en: 'gym', fr: 'salle-de-sport', pt: 'academia' },
    { slug: 'piscina', en: 'pool', fr: 'piscine', pt: 'piscina' },
    { slug: 'terraza', en: 'terrace', fr: 'terrasse', pt: 'terraco' },
    { slug: 'balcon', en: 'balcony', fr: 'balcon', pt: 'varanda' },
    { slug: 'jardin', en: 'garden', fr: 'jardin', pt: 'jardim' },
    { slug: 'seguridad-24h', en: '24h-security', fr: 'securite-24h', pt: 'seguranca-24h' },
    { slug: 'portero', en: 'doorman', fr: 'concierge', pt: 'porteiro' },
    { slug: 'ascensor', en: 'elevator', fr: 'ascenseur', pt: 'elevador' },
    { slug: 'aire-acondicionado', en: 'air-conditioning', fr: 'climatisation', pt: 'ar-condicionado' },
    { slug: 'amueblado', en: 'furnished', fr: 'meuble', pt: 'mobiliado' },
    { slug: 'vista-al-mar', en: 'sea-view', fr: 'vue-mer', pt: 'vista-mar' },
    { slug: 'cerca-playa', en: 'near-beach', fr: 'proche-plage', pt: 'perto-praia' },
    { slug: 'area-social', en: 'social-area', fr: 'espace-commun', pt: 'area-social' },
    { slug: 'bbq', en: 'bbq', fr: 'barbecue', pt: 'churrasqueira' },
    { slug: 'jacuzzi', en: 'jacuzzi', fr: 'jacuzzi', pt: 'jacuzzi' },
    { slug: 'sauna', en: 'sauna', fr: 'sauna', pt: 'sauna' },
    { slug: 'cancha-tenis', en: 'tennis-court', fr: 'court-tennis', pt: 'quadra-tenis' },
    { slug: 'area-ninos', en: 'kids-area', fr: 'aire-jeux', pt: 'area-criancas' },
  ];

  for (let i = 0; i < amenidades.length; i++) {
    const a = amenidades[i];
    await knex('tags_propiedades').insert({
      slug: a.slug,
      tipo: 'amenidad',
      valor: a.slug,
      campo_query: 'amenidades',
      operador: '@>',
      alias_idiomas: JSON.stringify({ en: a.en, fr: a.fr, pt: a.pt }),
      orden: i + 30,
    });
  }

  // ===========================================
  // SEED: Configuración de rutas para tenant demo
  // ===========================================

  // Obtener el primer tenant (demo)
  const tenants = await knex('tenants').select('id').limit(1);

  if (tenants.length > 0) {
    const tenantId = tenants[0].id;

    // Configurar prefijos con nivel 2 (directorio + categoría + single)
    const prefijos = [
      { prefijo: 'testimonios', alias: { en: 'testimonials', fr: 'temoignages', pt: 'testemunhos' } },
      { prefijo: 'articulos', alias: { en: 'articles', fr: 'articles', pt: 'artigos' } },
      { prefijo: 'videos', alias: { en: 'videos', fr: 'videos', pt: 'videos' } },
    ];

    for (const p of prefijos) {
      await knex('tenants_rutas_config').insert({
        tenant_id: tenantId,
        prefijo: p.prefijo,
        nivel_navegacion: 2,
        alias_idiomas: JSON.stringify(p.alias),
        habilitado: true,
        orden: 0,
      });
    }

    // Configurar prefijos con nivel 1 (directorio + single, sin categoría)
    const prefijosNivel1 = [
      { prefijo: 'asesores', alias: { en: 'advisors', fr: 'conseillers', pt: 'assessores' } },
      { prefijo: 'proyectos', alias: { en: 'projects', fr: 'projets', pt: 'projetos' } },
      { prefijo: 'listados-de-propiedades', alias: { en: 'property-lists', fr: 'listes-proprietes', pt: 'listas-imoveis' } },
    ];

    for (const p of prefijosNivel1) {
      await knex('tenants_rutas_config').insert({
        tenant_id: tenantId,
        prefijo: p.prefijo,
        nivel_navegacion: 1,
        alias_idiomas: JSON.stringify(p.alias),
        habilitado: true,
        orden: 0,
      });
    }

    // Páginas estáticas (nivel 0 = solo esa página, no tiene hijos)
    const paginasEstaticas = [
      { prefijo: 'contacto', alias: { en: 'contact', fr: 'contact', pt: 'contato' } },
      { prefijo: 'vender', alias: { en: 'sell', fr: 'vendre', pt: 'vender' } },
      { prefijo: 'sobre-nosotros', alias: { en: 'about-us', fr: 'a-propos', pt: 'sobre-nos' } },
      { prefijo: 'politica-de-privacidad', alias: { en: 'privacy-policy', fr: 'politique-confidentialite', pt: 'politica-privacidade' } },
    ];

    for (const p of paginasEstaticas) {
      await knex('tenants_rutas_config').insert({
        tenant_id: tenantId,
        prefijo: p.prefijo,
        nivel_navegacion: 0,
        alias_idiomas: JSON.stringify(p.alias),
        habilitado: true,
        orden: 0,
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('tenants_rutas_config');
  await knex.schema.dropTableIfExists('tags_propiedades');
}
