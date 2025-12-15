import { Knex } from 'knex';

/**
 * Migración: Sistema de Catálogo de Páginas con Rutas Dinámicas
 *
 * 1. Actualiza tipos_pagina con campos para rutas dinámicas y jerarquías
 * 2. Crea tabla paginas_alias para multi-idioma
 * 3. Agrega feature "rutas_profundas" para permitir niveles adicionales
 * 4. Actualiza los tipos de página existentes con la nueva configuración
 */
export async function up(knex: Knex): Promise<void> {
  // 1. Agregar nuevos campos a tipos_pagina
  const hasRutaPatron = await knex.schema.hasColumn('tipos_pagina', 'ruta_patron');
  if (!hasRutaPatron) {
    await knex.schema.alterTable('tipos_pagina', (table) => {
      table.string('ruta_patron', 200).nullable().comment('Patrón de ruta (ej: /videos/:categoria/:slug)');
      table.string('ruta_padre', 50).nullable().comment('Código del tipo de página padre');
      table.integer('nivel').defaultTo(0).comment('Nivel de anidamiento (0=raíz, 1, 2...)');
      table.string('fuente_datos', 100).nullable().comment('Tabla o servicio de donde obtener datos');
      table.string('feature_requerido', 100).nullable().comment('Feature requerido para usar este tipo');
      table.boolean('es_plantilla').defaultTo(false).comment('Si es una plantilla reutilizable');
      table.boolean('protegida').defaultTo(false).comment('Si no se puede eliminar');
      table.jsonb('parametros').defaultTo('[]').comment('Definición de parámetros dinámicos');
      table.jsonb('alias_rutas').defaultTo('{}').comment('Alias de rutas por idioma');
      table.jsonb('componentes_requeridos').defaultTo('[]').comment('Componentes obligatorios para este tipo');
    });
    console.log('✅ Campos agregados a tipos_pagina');
  }

  // 2. Crear tabla paginas_alias para multi-idioma
  const hasAlias = await knex.schema.hasTable('paginas_alias');
  if (!hasAlias) {
    await knex.schema.createTable('paginas_alias', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('pagina_id').notNullable().references('id').inTable('paginas_web').onDelete('CASCADE');
      table.string('idioma', 5).notNullable().references('codigo').inTable('idiomas');
      table.string('slug_alias', 200).notNullable().comment('Slug en este idioma');
      table.string('titulo_alias', 200).nullable().comment('Título en este idioma');
      table.text('descripcion_alias').nullable().comment('Descripción en este idioma');
      table.boolean('activo').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.unique(['pagina_id', 'idioma'], 'idx_paginas_alias_pagina_idioma');
      table.index('idioma', 'idx_paginas_alias_idioma');
      table.index('slug_alias', 'idx_paginas_alias_slug');
    });
    console.log('✅ Tabla paginas_alias creada');
  }

  // 3. Agregar feature "rutas_profundas"
  const featureExists = await knex('features')
    .where('name', 'rutas_profundas')
    .first();

  if (!featureExists) {
    await knex('features').insert({
      name: 'rutas_profundas',
      description: 'Permite rutas con múltiples niveles de profundidad (ej: /videos/categoria/video, /proyectos/tipo/año/nombre)',
      icon: 'layers',
      category: 'addon',
      is_public: true,
      is_premium: true,
      available_in_plans: JSON.stringify(['pro', 'premium', 'enterprise']),
    });
    console.log('✅ Feature rutas_profundas creado');
  }

  // 4. Actualizar tipos de página existentes con nueva configuración
  const tiposPagina = [
    // Páginas directas protegidas (nivel 0)
    {
      codigo: 'homepage',
      ruta_patron: '/',
      nivel: 0,
      es_plantilla: false,
      protegida: true,
      alias_rutas: { es: '', en: '', fr: '', pt: '' },
      componentes_requeridos: ['header', 'hero', 'footer'],
    },
    {
      codigo: 'listados_propiedades',
      ruta_patron: '/propiedades',
      nivel: 0,
      fuente_datos: 'propiedades',
      es_plantilla: false,
      protegida: true,
      alias_rutas: { es: 'propiedades', en: 'properties', fr: 'proprietes', pt: 'imoveis' },
      componentes_requeridos: ['header', 'property_list', 'footer'],
    },
    {
      codigo: 'single_property',
      ruta_patron: '/propiedades/:id',
      ruta_padre: 'listados_propiedades',
      nivel: 1,
      fuente_datos: 'propiedades',
      es_plantilla: true,
      protegida: true,
      parametros: [{ nombre: 'id', posicion: 1, tipo: 'id', fuente: 'propiedades', campo: 'id' }],
      alias_rutas: { es: 'propiedades', en: 'properties', fr: 'proprietes', pt: 'imoveis' },
      componentes_requeridos: ['header', 'property_detail', 'footer'],
    },
    {
      codigo: 'contacto',
      ruta_patron: '/contacto',
      nivel: 0,
      es_plantilla: false,
      protegida: true,
      alias_rutas: { es: 'contacto', en: 'contact', fr: 'contact', pt: 'contato' },
      componentes_requeridos: ['header', 'contact_form', 'footer'],
    },
    {
      codigo: 'listado_asesores',
      ruta_patron: '/asesores',
      nivel: 0,
      fuente_datos: 'mock_asesores',
      es_plantilla: false,
      protegida: true,
      alias_rutas: { es: 'asesores', en: 'agents', fr: 'agents', pt: 'consultores' },
      componentes_requeridos: ['header', 'team_grid', 'footer'],
    },
    {
      codigo: 'asesor_single',
      ruta_patron: '/asesores/:slug',
      ruta_padre: 'listado_asesores',
      nivel: 1,
      fuente_datos: 'mock_asesores',
      es_plantilla: true,
      protegida: true,
      parametros: [{ nombre: 'slug', posicion: 1, tipo: 'slug', fuente: 'mock_asesores', campo: 'slug' }],
      alias_rutas: { es: 'asesores', en: 'agents', fr: 'agents', pt: 'consultores' },
      componentes_requeridos: ['header', 'asesor_detail', 'footer'],
    },
    // Blog
    {
      codigo: 'blog',
      ruta_patron: '/blog',
      nivel: 0,
      fuente_datos: 'mock_articulos',
      es_plantilla: false,
      protegida: false,
      alias_rutas: { es: 'blog', en: 'blog', fr: 'blog', pt: 'blog' },
      componentes_requeridos: ['header', 'article_list', 'footer'],
    },
    {
      codigo: 'articulo_single',
      ruta_patron: '/blog/:slug',
      ruta_padre: 'blog',
      nivel: 1,
      fuente_datos: 'mock_articulos',
      es_plantilla: true,
      protegida: false,
      parametros: [{ nombre: 'slug', posicion: 1, tipo: 'slug', fuente: 'mock_articulos', campo: 'slug' }],
      alias_rutas: { es: 'blog', en: 'blog', fr: 'blog', pt: 'blog' },
      componentes_requeridos: ['header', 'article_detail', 'footer'],
    },
    {
      codigo: 'articulo_categoria',
      ruta_patron: '/blog/:categoria/:slug',
      ruta_padre: 'blog',
      nivel: 2,
      fuente_datos: 'mock_articulos',
      feature_requerido: 'rutas_profundas',
      es_plantilla: true,
      protegida: false,
      parametros: [
        { nombre: 'categoria', posicion: 1, tipo: 'slug', fuente: 'mock_categorias_contenido', campo: 'slug' },
        { nombre: 'slug', posicion: 2, tipo: 'slug', fuente: 'mock_articulos', campo: 'slug' }
      ],
      alias_rutas: { es: 'blog', en: 'blog', fr: 'blog', pt: 'blog' },
      componentes_requeridos: ['header', 'article_detail', 'footer'],
    },
    // Videos
    {
      codigo: 'videos',
      ruta_patron: '/videos',
      nivel: 0,
      fuente_datos: 'mock_videos',
      es_plantilla: false,
      protegida: false,
      alias_rutas: { es: 'videos', en: 'videos', fr: 'videos', pt: 'videos' },
      componentes_requeridos: ['header', 'video_gallery', 'footer'],
    },
    {
      codigo: 'video_single',
      ruta_patron: '/videos/:slug',
      ruta_padre: 'videos',
      nivel: 1,
      fuente_datos: 'mock_videos',
      es_plantilla: true,
      protegida: false,
      parametros: [{ nombre: 'slug', posicion: 1, tipo: 'slug', fuente: 'mock_videos', campo: 'slug' }],
      alias_rutas: { es: 'videos', en: 'videos', fr: 'videos', pt: 'videos' },
      componentes_requeridos: ['header', 'video_detail', 'footer'],
    },
    {
      codigo: 'video_category',
      ruta_patron: '/videos/:categoria/:slug',
      ruta_padre: 'videos',
      nivel: 2,
      fuente_datos: 'mock_videos',
      feature_requerido: 'rutas_profundas',
      es_plantilla: true,
      protegida: false,
      parametros: [
        { nombre: 'categoria', posicion: 1, tipo: 'slug', fuente: 'mock_categorias_contenido', campo: 'slug' },
        { nombre: 'slug', posicion: 2, tipo: 'slug', fuente: 'mock_videos', campo: 'slug' }
      ],
      alias_rutas: { es: 'videos', en: 'videos', fr: 'videos', pt: 'videos' },
      componentes_requeridos: ['header', 'video_detail', 'footer'],
    },
    // Testimonios
    {
      codigo: 'testimonios',
      ruta_patron: '/testimonios',
      nivel: 0,
      fuente_datos: 'mock_testimonios',
      es_plantilla: false,
      protegida: false,
      alias_rutas: { es: 'testimonios', en: 'testimonials', fr: 'temoignages', pt: 'depoimentos' },
      componentes_requeridos: ['header', 'testimonials_grid', 'footer'],
    },
    {
      codigo: 'testimonio_single',
      ruta_patron: '/testimonios/:slug',
      ruta_padre: 'testimonios',
      nivel: 1,
      fuente_datos: 'mock_testimonios',
      es_plantilla: true,
      protegida: false,
      parametros: [{ nombre: 'slug', posicion: 1, tipo: 'slug', fuente: 'mock_testimonios', campo: 'slug' }],
      alias_rutas: { es: 'testimonios', en: 'testimonials', fr: 'temoignages', pt: 'depoimentos' },
      componentes_requeridos: ['header', 'testimonial_detail', 'footer'],
    },
    {
      codigo: 'testimonio_categoria',
      ruta_patron: '/testimonios/:categoria/:slug',
      ruta_padre: 'testimonios',
      nivel: 2,
      fuente_datos: 'mock_testimonios',
      feature_requerido: 'rutas_profundas',
      es_plantilla: true,
      protegida: false,
      parametros: [
        { nombre: 'categoria', posicion: 1, tipo: 'slug', fuente: 'mock_categorias_contenido', campo: 'slug' },
        { nombre: 'slug', posicion: 2, tipo: 'slug', fuente: 'mock_testimonios', campo: 'slug' }
      ],
      alias_rutas: { es: 'testimonios', en: 'testimonials', fr: 'temoignages', pt: 'depoimentos' },
      componentes_requeridos: ['header', 'testimonial_detail', 'footer'],
    },
    // Landing Pages / Proyectos
    {
      codigo: 'landing_page',
      ruta_patron: '/proyectos',
      nivel: 0,
      es_plantilla: false,
      protegida: false,
      alias_rutas: { es: 'proyectos', en: 'projects', fr: 'projets', pt: 'projetos' },
      componentes_requeridos: ['header', 'hero', 'footer'],
    },
    {
      codigo: 'landing_proyecto',
      ruta_patron: '/proyectos/:slug',
      ruta_padre: 'landing_page',
      nivel: 1,
      es_plantilla: true,
      protegida: false,
      parametros: [{ nombre: 'slug', posicion: 1, tipo: 'slug', fuente: 'paginas_web', campo: 'slug' }],
      alias_rutas: { es: 'proyectos', en: 'projects', fr: 'projets', pt: 'projetos' },
      componentes_requeridos: ['header', 'hero', 'footer'],
    },
    {
      codigo: 'landing_subpagina',
      ruta_patron: '/proyectos/:proyecto/:slug',
      ruta_padre: 'landing_proyecto',
      nivel: 2,
      feature_requerido: 'rutas_profundas',
      es_plantilla: true,
      protegida: false,
      parametros: [
        { nombre: 'proyecto', posicion: 1, tipo: 'slug', fuente: 'paginas_web', campo: 'slug' },
        { nombre: 'slug', posicion: 2, tipo: 'slug', fuente: 'paginas_web', campo: 'slug' }
      ],
      alias_rutas: { es: 'proyectos', en: 'projects', fr: 'projets', pt: 'projetos' },
      componentes_requeridos: ['header', 'hero', 'footer'],
    },
    // Políticas y términos
    {
      codigo: 'politicas_privacidad',
      ruta_patron: '/politicas-privacidad',
      nivel: 0,
      es_plantilla: false,
      protegida: false,
      alias_rutas: { es: 'politicas-privacidad', en: 'privacy-policy', fr: 'politique-confidentialite', pt: 'politica-privacidade' },
      componentes_requeridos: ['header', 'text_content', 'footer'],
    },
    {
      codigo: 'terminos_condiciones',
      ruta_patron: '/terminos-condiciones',
      nivel: 0,
      es_plantilla: false,
      protegida: false,
      alias_rutas: { es: 'terminos-condiciones', en: 'terms-conditions', fr: 'termes-conditions', pt: 'termos-condicoes' },
      componentes_requeridos: ['header', 'text_content', 'footer'],
    },
  ];

  for (const tipo of tiposPagina) {
    const exists = await knex('tipos_pagina').where('codigo', tipo.codigo).first();
    if (exists) {
      await knex('tipos_pagina')
        .where('codigo', tipo.codigo)
        .update({
          ruta_patron: tipo.ruta_patron,
          ruta_padre: tipo.ruta_padre || null,
          nivel: tipo.nivel,
          fuente_datos: tipo.fuente_datos || null,
          feature_requerido: tipo.feature_requerido || null,
          es_plantilla: tipo.es_plantilla,
          protegida: tipo.protegida,
          parametros: JSON.stringify(tipo.parametros || []),
          alias_rutas: JSON.stringify(tipo.alias_rutas),
          componentes_requeridos: JSON.stringify(tipo.componentes_requeridos),
          updated_at: knex.fn.now(),
        });
      console.log(`✅ Tipo ${tipo.codigo} actualizado`);
    } else {
      await knex('tipos_pagina').insert({
        codigo: tipo.codigo,
        nombre: tipo.codigo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        descripcion: `Página de tipo ${tipo.codigo}`,
        es_estandar: true,
        requiere_slug: tipo.nivel === 0,
        configuracion: JSON.stringify({ dynamic: tipo.es_plantilla }),
        ruta_patron: tipo.ruta_patron,
        ruta_padre: tipo.ruta_padre || null,
        nivel: tipo.nivel,
        fuente_datos: tipo.fuente_datos || null,
        feature_requerido: tipo.feature_requerido || null,
        es_plantilla: tipo.es_plantilla,
        protegida: tipo.protegida,
        parametros: JSON.stringify(tipo.parametros || []),
        alias_rutas: JSON.stringify(tipo.alias_rutas),
        componentes_requeridos: JSON.stringify(tipo.componentes_requeridos),
      });
      console.log(`✅ Tipo ${tipo.codigo} creado`);
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  // Eliminar tabla paginas_alias
  await knex.schema.dropTableIfExists('paginas_alias');

  // Eliminar feature rutas_profundas
  await knex('features').where('name', 'rutas_profundas').delete();

  // Eliminar columnas agregadas a tipos_pagina
  const columns = [
    'ruta_patron', 'ruta_padre', 'nivel', 'fuente_datos',
    'feature_requerido', 'es_plantilla', 'protegida',
    'parametros', 'alias_rutas', 'componentes_requeridos'
  ];

  for (const col of columns) {
    const hasCol = await knex.schema.hasColumn('tipos_pagina', col);
    if (hasCol) {
      await knex.schema.alterTable('tipos_pagina', (table) => {
        table.dropColumn(col);
      });
    }
  }

  // Eliminar tipos de página nuevos
  const nuevosTipos = [
    'articulo_single', 'articulo_categoria',
    'videos', 'testimonio_single', 'testimonio_categoria',
    'testimonios', 'landing_proyecto', 'landing_subpagina'
  ];
  await knex('tipos_pagina').whereIn('codigo', nuevosTipos).delete();
}
