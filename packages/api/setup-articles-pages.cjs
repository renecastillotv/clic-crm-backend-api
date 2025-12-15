require('dotenv').config();
const knex = require('knex')({
  client: 'pg',
  connection: process.env.DATABASE_URL
});

async function setupArticlePages() {
  const tenantId = 'ec0f1d48-57c7-4e2a-bb8b-9daf0cedf471';

  console.log('Configurando tipos de página para artículos...\n');

  // 0. Crear tipos de página para artículos
  const tiposPagina = [
    {
      codigo: 'articulos_listado',
      nombre: 'Artículos - Listado',
      descripcion: 'Página que muestra el listado de todos los artículos',
      es_estandar: true,
      requiere_slug: true,
      configuracion: JSON.stringify({ protected: true, default_slug: 'articulos' }),
      ruta_patron: '/articulos',
      ruta_padre: null,
      nivel: 0,
      fuente_datos: 'articulos',
      es_plantilla: false,
      protegida: true,
      parametros: JSON.stringify([]),
      alias_rutas: JSON.stringify({ es: 'articulos', en: 'articles', fr: 'articles', pt: 'artigos' }),
      componentes_requeridos: JSON.stringify(['header', 'article_hero', 'article_grid', 'footer']),
      visible: true,
      featured: true,
      publico: true,
      orden_catalogo: 30
    },
    {
      codigo: 'articulos_categoria',
      nombre: 'Artículos - Categoría',
      descripcion: 'Página que muestra artículos filtrados por categoría',
      es_estandar: true,
      requiere_slug: false,
      configuracion: JSON.stringify({ dynamic: true, protected: true }),
      ruta_patron: '/articulos/:categoria',
      ruta_padre: 'articulos_listado',
      nivel: 1,
      fuente_datos: 'articulos',
      es_plantilla: true,
      protegida: true,
      parametros: JSON.stringify([{ nombre: 'categoria', tipo: 'slug', fuente: 'categorias_articulos', campo: 'slug', posicion: 1 }]),
      alias_rutas: JSON.stringify({ es: 'articulos', en: 'articles', fr: 'articles', pt: 'artigos' }),
      componentes_requeridos: JSON.stringify(['header', 'article_category', 'footer']),
      visible: true,
      featured: false,
      publico: true,
      orden_catalogo: 31
    },
    {
      codigo: 'articulos_single',
      nombre: 'Artículos - Detalle',
      descripcion: 'Página de detalle de un artículo individual',
      es_estandar: true,
      requiere_slug: false,
      configuracion: JSON.stringify({ dynamic: true, protected: true }),
      ruta_patron: '/articulos/:categoria/:slug',
      ruta_padre: 'articulos_categoria',
      nivel: 2,
      fuente_datos: 'articulos',
      feature_requerido: 'rutas_profundas',
      es_plantilla: true,
      protegida: true,
      parametros: JSON.stringify([
        { nombre: 'categoria', tipo: 'slug', fuente: 'categorias_articulos', campo: 'slug', posicion: 1 },
        { nombre: 'slug', tipo: 'slug', fuente: 'articulos', campo: 'slug', posicion: 2 }
      ]),
      alias_rutas: JSON.stringify({ es: 'articulos', en: 'articles', fr: 'articles', pt: 'artigos' }),
      componentes_requeridos: JSON.stringify(['header', 'article_detail', 'footer']),
      visible: true,
      featured: false,
      publico: true,
      orden_catalogo: 32
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

  // 0.5 Verificar/crear configuración de ruta para artículos (nivel_navegacion = 2)
  console.log('\nVerificando configuración de ruta para artículos...\n');

  const existeRuta = await knex('tenants_rutas_config')
    .where({ tenant_id: tenantId, prefijo: 'articulos' })
    .first();

  if (existeRuta) {
    await knex('tenants_rutas_config')
      .where({ tenant_id: tenantId, prefijo: 'articulos' })
      .update({
        nivel_navegacion: 2,
        habilitado: true,
        alias_idiomas: JSON.stringify({ es: 'articulos', en: 'articles', fr: 'articles', pt: 'artigos' })
      });
    console.log('✅ Ruta articulos actualizada (nivel_navegacion=2)');
  } else {
    await knex('tenants_rutas_config').insert({
      tenant_id: tenantId,
      prefijo: 'articulos',
      nivel_navegacion: 2,
      habilitado: true,
      alias_idiomas: JSON.stringify({ es: 'articulos', en: 'articles', fr: 'articles', pt: 'artigos' }),
      orden: 30
    });
    console.log('✅ Ruta articulos creada (nivel_navegacion=2)');
  }

  console.log('\nConfigurando páginas de artículos...\n');

  // 1. Crear/actualizar página de listado de artículos
  const paginaListado = {
    tenant_id: tenantId,
    tipo_pagina: 'articulos_listado',
    variante: 'default',
    titulo: 'Blog / Artículos',
    slug: '/articulos',
    descripcion: 'Descubre nuestros artículos y consejos sobre bienes raíces',
    contenido: JSON.stringify({
      componentes: ['header', 'article_hero', 'article_grid', 'footer']
    }),
    meta: JSON.stringify({
      title: 'Blog - Artículos | Inmobiliaria'
    }),
    publica: true,
    activa: true,
    orden: 60
  };

  // Verificar si ya existe (por tipo_pagina o por slug)
  const existeListado = await knex('paginas_web')
    .where({ tenant_id: tenantId, tipo_pagina: 'articulos_listado' })
    .orWhere({ tenant_id: tenantId, slug: '/articulos' })
    .first();

  let paginaListadoId;
  if (existeListado) {
    await knex('paginas_web').where('id', existeListado.id).update(paginaListado);
    paginaListadoId = existeListado.id;
    console.log('✅ Página listado artículos actualizada');
  } else {
    const [inserted] = await knex('paginas_web').insert(paginaListado).returning('id');
    paginaListadoId = inserted.id;
    console.log('✅ Página listado artículos creada');
  }

  // 2. Crear/actualizar página de categoría
  const paginaCategoria = {
    tenant_id: tenantId,
    tipo_pagina: 'articulos_categoria',
    variante: 'default',
    titulo: 'Artículos por Categoría',
    slug: '/articulos/:categoria',
    descripcion: 'Artículos filtrados por categoría',
    contenido: JSON.stringify({
      componentes: ['header', 'article_category', 'footer']
    }),
    meta: JSON.stringify({
      title: '{categoria} - Blog'
    }),
    publica: true,
    activa: true,
    orden: 61
  };

  const existeCategoria = await knex('paginas_web')
    .where({ tenant_id: tenantId, tipo_pagina: 'articulos_categoria' })
    .orWhere({ tenant_id: tenantId, slug: '/articulos/:categoria' })
    .first();

  let paginaCategoriaId;
  if (existeCategoria) {
    await knex('paginas_web').where('id', existeCategoria.id).update(paginaCategoria);
    paginaCategoriaId = existeCategoria.id;
    console.log('✅ Página categoría artículos actualizada');
  } else {
    const [inserted] = await knex('paginas_web').insert(paginaCategoria).returning('id');
    paginaCategoriaId = inserted.id;
    console.log('✅ Página categoría artículos creada');
  }

  // 3. Crear/actualizar página single artículo
  const paginaSingle = {
    tenant_id: tenantId,
    tipo_pagina: 'articulos_single',
    variante: 'default',
    titulo: 'Detalle de Artículo',
    slug: '/articulos/:categoria/:articulo',
    descripcion: 'Página de detalle de artículo',
    contenido: JSON.stringify({
      componentes: ['header', 'article_detail', 'footer']
    }),
    meta: JSON.stringify({
      title: '{articulo} - Blog'
    }),
    publica: true,
    activa: true,
    orden: 62
  };

  const existeSingle = await knex('paginas_web')
    .where({ tenant_id: tenantId, tipo_pagina: 'articulos_single' })
    .orWhere({ tenant_id: tenantId, slug: '/articulos/:categoria/:articulo' })
    .first();

  let paginaSingleId;
  if (existeSingle) {
    await knex('paginas_web').where('id', existeSingle.id).update(paginaSingle);
    paginaSingleId = existeSingle.id;
    console.log('✅ Página single artículo actualizada');
  } else {
    const [inserted] = await knex('paginas_web').insert(paginaSingle).returning('id');
    paginaSingleId = inserted.id;
    console.log('✅ Página single artículo creada');
  }

  // 4. Crear componentes para página de listado
  console.log('\nConfigurando componentes...\n');

  // Componente article_hero
  const componenteHero = {
    tenant_id: tenantId,
    tipo: 'article_hero',
    variante: 'default',
    datos: JSON.stringify({
      static_data: {
        titulo: 'Blog & Artículos',
        subtitulo: 'Consejos, guías y noticias del mundo inmobiliario'
      },
      toggles: {
        mostrarBuscador: true,
        mostrarEstadisticas: true,
        mostrarCategorias: true
      },
      dynamic_data: {
        dataType: 'categorias_articulos'
      }
    }),
    activo: true,
    orden: 1,
    predeterminado: true,
    scope: 'global',
    tipo_pagina: 'articulos_listado'
  };

  const existeHero = await knex('componentes_web')
    .where({ tenant_id: tenantId, tipo: 'article_hero', predeterminado: true })
    .first();

  if (existeHero) {
    await knex('componentes_web').where('id', existeHero.id).update(componenteHero);
    console.log('✅ Componente article_hero actualizado');
  } else {
    await knex('componentes_web').insert(componenteHero);
    console.log('✅ Componente article_hero creado');
  }

  // Componente article_grid
  const componenteGrid = {
    tenant_id: tenantId,
    tipo: 'article_grid',
    variante: 'default',
    datos: JSON.stringify({
      static_data: {
        titulo: 'Artículos Recientes'
      },
      toggles: {
        mostrarAutor: true,
        mostrarFecha: true,
        mostrarExcerpt: true,
        mostrarCategoria: true
      },
      dynamic_data: {
        dataType: 'lista_articulos'
      }
    }),
    activo: true,
    orden: 2,
    predeterminado: true,
    scope: 'global',
    tipo_pagina: 'articulos_listado'
  };

  const existeGrid = await knex('componentes_web')
    .where({ tenant_id: tenantId, tipo: 'article_grid', predeterminado: true })
    .first();

  if (existeGrid) {
    await knex('componentes_web').where('id', existeGrid.id).update(componenteGrid);
    console.log('✅ Componente article_grid actualizado');
  } else {
    await knex('componentes_web').insert(componenteGrid);
    console.log('✅ Componente article_grid creado');
  }

  // Componente article_category
  const componenteCategory = {
    tenant_id: tenantId,
    tipo: 'article_category',
    variante: 'default',
    datos: JSON.stringify({
      static_data: {},
      toggles: {},
      dynamic_data: {
        dataType: 'categoria_articulos'
      }
    }),
    activo: true,
    orden: 1,
    predeterminado: true,
    scope: 'global',
    tipo_pagina: 'articulos_categoria'
  };

  const existeCategory = await knex('componentes_web')
    .where({ tenant_id: tenantId, tipo: 'article_category', predeterminado: true })
    .first();

  if (existeCategory) {
    await knex('componentes_web').where('id', existeCategory.id).update(componenteCategory);
    console.log('✅ Componente article_category actualizado');
  } else {
    await knex('componentes_web').insert(componenteCategory);
    console.log('✅ Componente article_category creado');
  }

  // Componente article_detail
  const componenteDetail = {
    tenant_id: tenantId,
    tipo: 'article_detail',
    variante: 'default',
    datos: JSON.stringify({
      static_data: {},
      toggles: {},
      dynamic_data: {
        dataType: 'articulo_single'
      }
    }),
    activo: true,
    orden: 1,
    predeterminado: true,
    scope: 'global',
    tipo_pagina: 'articulos_single'
  };

  const existeDetail = await knex('componentes_web')
    .where({ tenant_id: tenantId, tipo: 'article_detail', predeterminado: true })
    .first();

  if (existeDetail) {
    await knex('componentes_web').where('id', existeDetail.id).update(componenteDetail);
    console.log('✅ Componente article_detail actualizado');
  } else {
    await knex('componentes_web').insert(componenteDetail);
    console.log('✅ Componente article_detail creado');
  }

  console.log('\n✅ Configuración completada!\n');

  // Mostrar resumen
  console.log('Páginas creadas:');
  console.log('  - /articulos (listado)');
  console.log('  - /articulos/:categoria (categoría)');
  console.log('  - /articulos/:categoria/:articulo (single)');

  await knex.destroy();
}

setupArticlePages().catch(e => {
  console.error(e);
  process.exit(1);
});
