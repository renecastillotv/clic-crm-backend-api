require('dotenv').config();
const knex = require('knex')({
  client: 'pg',
  connection: process.env.DATABASE_URL
});

async function setupVideoPages() {
  const tenantId = 'ec0f1d48-57c7-4e2a-bb8b-9daf0cedf471';

  console.log('Configurando tipos de página para videos...\n');

  // 0. Crear tipos de página para videos
  const tiposPagina = [
    {
      codigo: 'videos_listado',
      nombre: 'Videos - Listado',
      descripcion: 'Página que muestra el listado de todos los videos',
      es_estandar: true,
      requiere_slug: true,
      configuracion: JSON.stringify({ protected: true, default_slug: 'videos' }),
      ruta_patron: '/videos',
      ruta_padre: null,
      nivel: 0,
      fuente_datos: 'mock_videos',
      es_plantilla: false,
      protegida: true,
      parametros: JSON.stringify([]),
      alias_rutas: JSON.stringify({ es: 'videos', en: 'videos', fr: 'videos', pt: 'videos' }),
      componentes_requeridos: JSON.stringify(['header', 'video_hero', 'video_gallery', 'footer']),
      visible: true,
      featured: true,
      publico: true,
      orden_catalogo: 20
    },
    {
      codigo: 'videos_categoria',
      nombre: 'Videos - Categoría',
      descripcion: 'Página que muestra videos filtrados por categoría',
      es_estandar: true,
      requiere_slug: false,
      configuracion: JSON.stringify({ dynamic: true, protected: true }),
      ruta_patron: '/videos/:categoria',
      ruta_padre: 'videos_listado',
      nivel: 1,
      fuente_datos: 'mock_videos',
      es_plantilla: true,
      protegida: true,
      parametros: JSON.stringify([{ nombre: 'categoria', tipo: 'slug', fuente: 'categorias_videos', campo: 'slug', posicion: 1 }]),
      alias_rutas: JSON.stringify({ es: 'videos', en: 'videos', fr: 'videos', pt: 'videos' }),
      componentes_requeridos: JSON.stringify(['header', 'video_category', 'footer']),
      visible: true,
      featured: false,
      publico: true,
      orden_catalogo: 21
    },
    {
      codigo: 'videos_single',
      nombre: 'Videos - Detalle',
      descripcion: 'Página de detalle de un video individual',
      es_estandar: true,
      requiere_slug: false,
      configuracion: JSON.stringify({ dynamic: true, protected: true }),
      ruta_patron: '/videos/:categoria/:slug',
      ruta_padre: 'videos_categoria',
      nivel: 2,
      fuente_datos: 'mock_videos',
      feature_requerido: 'rutas_profundas',
      es_plantilla: true,
      protegida: true,
      parametros: JSON.stringify([
        { nombre: 'categoria', tipo: 'slug', fuente: 'categorias_videos', campo: 'slug', posicion: 1 },
        { nombre: 'slug', tipo: 'slug', fuente: 'mock_videos', campo: 'slug', posicion: 2 }
      ]),
      alias_rutas: JSON.stringify({ es: 'videos', en: 'videos', fr: 'videos', pt: 'videos' }),
      componentes_requeridos: JSON.stringify(['header', 'video_detail', 'footer']),
      visible: true,
      featured: false,
      publico: true,
      orden_catalogo: 22
    }
  ];

  for (const tipo of tiposPagina) {
    const existe = await knex('tipos_pagina').where('codigo', tipo.codigo).first();
    if (existe) {
      await knex('tipos_pagina').where('codigo', tipo.codigo).update(tipo);
      console.log(`✅ Tipo de página ${tipo.codigo} actualizado`);
    } else {
      await knex('tipos_pagina').insert(tipo);
      console.log(`✅ Tipo de página ${tipo.codigo} creado`);
    }
  }

  console.log('\nConfigurando páginas de videos...\n');

  // 1. Crear/actualizar página de listado de videos
  const paginaListado = {
    tenant_id: tenantId,
    tipo_pagina: 'videos_listado',
    variante: 'default',
    titulo: 'Galería de Videos',
    slug: '/videos',
    descripcion: 'Descubre nuestro contenido exclusivo en video',
    contenido: JSON.stringify({
      componentes: ['header', 'video_hero', 'video_gallery', 'footer']
    }),
    meta: JSON.stringify({
      title: 'Videos - Otro Demo Inmobiliaria'
    }),
    publica: true,
    activa: true,
    orden: 50
  };

  // Verificar si ya existe
  const existeListado = await knex('paginas_web')
    .where({ tenant_id: tenantId, tipo_pagina: 'videos_listado' })
    .first();

  let paginaListadoId;
  if (existeListado) {
    await knex('paginas_web').where('id', existeListado.id).update(paginaListado);
    paginaListadoId = existeListado.id;
    console.log('✅ Página listado videos actualizada');
  } else {
    const [inserted] = await knex('paginas_web').insert(paginaListado).returning('id');
    paginaListadoId = inserted.id;
    console.log('✅ Página listado videos creada');
  }

  // 2. Crear/actualizar página de categoría
  const paginaCategoria = {
    tenant_id: tenantId,
    tipo_pagina: 'videos_categoria',
    variante: 'default',
    titulo: 'Videos por Categoría',
    slug: '/videos/:categoria',
    descripcion: 'Videos filtrados por categoría',
    contenido: JSON.stringify({
      componentes: ['header', 'video_category', 'footer']
    }),
    meta: JSON.stringify({
      title: '{categoria} - Videos'
    }),
    publica: true,
    activa: true,
    orden: 51
  };

  const existeCategoria = await knex('paginas_web')
    .where({ tenant_id: tenantId, tipo_pagina: 'videos_categoria' })
    .first();

  let paginaCategoriaId;
  if (existeCategoria) {
    await knex('paginas_web').where('id', existeCategoria.id).update(paginaCategoria);
    paginaCategoriaId = existeCategoria.id;
    console.log('✅ Página categoría videos actualizada');
  } else {
    const [inserted] = await knex('paginas_web').insert(paginaCategoria).returning('id');
    paginaCategoriaId = inserted.id;
    console.log('✅ Página categoría videos creada');
  }

  // 3. Crear/actualizar página single video
  const paginaSingle = {
    tenant_id: tenantId,
    tipo_pagina: 'videos_single',
    variante: 'default',
    titulo: 'Detalle de Video',
    slug: '/videos/:categoria/:video',
    descripcion: 'Página de detalle de video',
    contenido: JSON.stringify({
      componentes: ['header', 'video_detail', 'footer']
    }),
    meta: JSON.stringify({
      title: '{video} - Videos'
    }),
    publica: true,
    activa: true,
    orden: 52
  };

  const existeSingle = await knex('paginas_web')
    .where({ tenant_id: tenantId, tipo_pagina: 'videos_single' })
    .first();

  let paginaSingleId;
  if (existeSingle) {
    await knex('paginas_web').where('id', existeSingle.id).update(paginaSingle);
    paginaSingleId = existeSingle.id;
    console.log('✅ Página single video actualizada');
  } else {
    const [inserted] = await knex('paginas_web').insert(paginaSingle).returning('id');
    paginaSingleId = inserted.id;
    console.log('✅ Página single video creada');
  }

  // 4. Crear componentes para página de listado
  console.log('\nConfigurando componentes...\n');

  // Componente video_hero
  const componenteHero = {
    tenant_id: tenantId,
    tipo: 'video_hero',
    variante: 'default',
    datos: JSON.stringify({
      static_data: {
        titulo: 'Galería de Videos',
        subtitulo: 'Descubre tours virtuales, testimonios y contenido exclusivo sobre propiedades'
      },
      toggles: {
        mostrarBuscador: true,
        mostrarEstadisticas: true,
        mostrarCategorias: true
      },
      dynamic_data: {
        dataType: 'categorias_videos'
      }
    }),
    activo: true,
    orden: 1,
    predeterminado: true,
    scope: 'global',
    tipo_pagina: 'videos_listado'
  };

  const existeHero = await knex('componentes_web')
    .where({ tenant_id: tenantId, tipo: 'video_hero', predeterminado: true })
    .first();

  if (existeHero) {
    await knex('componentes_web').where('id', existeHero.id).update(componenteHero);
    console.log('✅ Componente video_hero actualizado');
  } else {
    await knex('componentes_web').insert(componenteHero);
    console.log('✅ Componente video_hero creado');
  }

  // Componente video_gallery
  const componenteGallery = {
    tenant_id: tenantId,
    tipo: 'video_gallery',
    variante: 'default',
    datos: JSON.stringify({
      static_data: {
        titulo: 'Todos los Videos'
      },
      toggles: {
        mostrarCategoria: true,
        mostrarVistas: true
      },
      dynamic_data: {
        dataType: 'lista_videos'
      }
    }),
    activo: true,
    orden: 2,
    predeterminado: true,
    scope: 'global',
    tipo_pagina: 'videos_listado'
  };

  const existeGallery = await knex('componentes_web')
    .where({ tenant_id: tenantId, tipo: 'video_gallery', predeterminado: true })
    .first();

  if (existeGallery) {
    await knex('componentes_web').where('id', existeGallery.id).update(componenteGallery);
    console.log('✅ Componente video_gallery actualizado');
  } else {
    await knex('componentes_web').insert(componenteGallery);
    console.log('✅ Componente video_gallery creado');
  }

  // Componente video_category
  const componenteCategory = {
    tenant_id: tenantId,
    tipo: 'video_category',
    variante: 'default',
    datos: JSON.stringify({
      static_data: {},
      toggles: {},
      dynamic_data: {
        dataType: 'categoria_videos'
      }
    }),
    activo: true,
    orden: 1,
    predeterminado: true,
    scope: 'global',
    tipo_pagina: 'videos_categoria'
  };

  const existeCategory = await knex('componentes_web')
    .where({ tenant_id: tenantId, tipo: 'video_category', predeterminado: true })
    .first();

  if (existeCategory) {
    await knex('componentes_web').where('id', existeCategory.id).update(componenteCategory);
    console.log('✅ Componente video_category actualizado');
  } else {
    await knex('componentes_web').insert(componenteCategory);
    console.log('✅ Componente video_category creado');
  }

  // Componente video_detail
  const componenteDetail = {
    tenant_id: tenantId,
    tipo: 'video_detail',
    variante: 'default',
    datos: JSON.stringify({
      static_data: {},
      toggles: {},
      dynamic_data: {
        dataType: 'video_single'
      }
    }),
    activo: true,
    orden: 1,
    predeterminado: true,
    scope: 'global',
    tipo_pagina: 'videos_single'
  };

  const existeDetail = await knex('componentes_web')
    .where({ tenant_id: tenantId, tipo: 'video_detail', predeterminado: true })
    .first();

  if (existeDetail) {
    await knex('componentes_web').where('id', existeDetail.id).update(componenteDetail);
    console.log('✅ Componente video_detail actualizado');
  } else {
    await knex('componentes_web').insert(componenteDetail);
    console.log('✅ Componente video_detail creado');
  }

  console.log('\n✅ Configuración completada!\n');

  // Mostrar resumen
  console.log('Páginas creadas:');
  console.log('  - /videos (listado)');
  console.log('  - /videos/:categoria (categoría)');
  console.log('  - /videos/:categoria/:video (single)');

  await knex.destroy();
}

setupVideoPages().catch(e => {
  console.error(e);
  process.exit(1);
});
