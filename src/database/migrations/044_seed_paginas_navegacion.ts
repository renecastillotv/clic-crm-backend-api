import { Knex } from 'knex';

/**
 * Migración - Seed de páginas de navegación para todos los tenants
 *
 * Crea las páginas básicas y sus componentes:
 * - Listado de propiedades (/propiedades)
 * - Directorio de asesores (/asesores)
 * - Single property (plantilla)
 * - Contacto (/contacto)
 * - Artículos/Blog (/articulos)
 */
export async function up(knex: Knex): Promise<void> {
  // Obtener todos los tenants activos
  const tenants = await knex('tenants').where('activo', true).select('id', 'slug', 'nombre');

  for (const tenant of tenants) {
    console.log(`\n📄 Creando páginas para tenant: ${tenant.nombre} (${tenant.slug})`);

    // =========================================================================
    // 1. LISTADO DE PROPIEDADES
    // =========================================================================
    const existePropiedades = await knex('paginas_web')
      .where('tenant_id', tenant.id)
      .where('slug', '/propiedades')
      .first();

    if (!existePropiedades) {
      const [paginaPropiedades] = await knex('paginas_web')
        .insert({
          tenant_id: tenant.id,
          tipo_pagina: 'listados_propiedades',
          variante: 'default',
          titulo: 'Propiedades',
          slug: '/propiedades',
          descripcion: 'Explora todas nuestras propiedades disponibles',
          contenido: JSON.stringify({ componentes: ['header', 'hero', 'property_grid', 'footer'] }),
          meta: JSON.stringify({ title: 'Propiedades - ' + tenant.nombre }),
          publica: true,
          activa: true,
          orden: 1,
        })
        .returning('id');

      // Componentes para listado de propiedades
      await knex('componentes_web').insert({
        tenant_id: tenant.id,
        tipo: 'hero',
        variante: 'simple',
        nombre: 'Hero Listado Propiedades',
        datos: JSON.stringify({
          static_data: {
            titulo: tenant.slug === 'otro-demo' ? 'Oportunidades de Inversión' : 'Nuestras Propiedades',
            subtitulo: tenant.slug === 'otro-demo'
              ? 'Encuentra la inversión perfecta para tu portafolio'
              : 'Encuentra tu próximo hogar entre nuestra selección',
          },
          toggles: {
            mostrarBuscador: false,
            mostrarStats: false,
          },
        }),
        activo: true,
        orden: 1,
        scope: 'page_type',
        tipo_pagina: 'listados_propiedades',
        es_activo: true,
        config_completa: true,
      });

      await knex('componentes_web').insert({
        tenant_id: tenant.id,
        tipo: 'property_grid',
        variante: 'default',
        nombre: 'Grid de Propiedades',
        datos: JSON.stringify({
          static_data: {
            titulo: 'Propiedades Disponibles',
            mostrarFiltros: true,
            propiedadesPorPagina: 12,
          },
          toggles: {
            mostrarPrecio: true,
            mostrarUbicacion: true,
            mostrarCaracteristicas: true,
          },
        }),
        activo: true,
        orden: 2,
        scope: 'page_type',
        tipo_pagina: 'listados_propiedades',
        es_activo: true,
        config_completa: true,
      });

      console.log(`   ✅ Página propiedades creada`);
    }

    // =========================================================================
    // 2. DIRECTORIO DE ASESORES
    // =========================================================================
    const existeAsesores = await knex('paginas_web')
      .where('tenant_id', tenant.id)
      .where('slug', '/asesores')
      .first();

    if (!existeAsesores) {
      await knex('paginas_web').insert({
        tenant_id: tenant.id,
        tipo_pagina: 'directorio_asesores',
        variante: 'default',
        titulo: 'Nuestros Asesores',
        slug: '/asesores',
        descripcion: 'Conoce a nuestro equipo de asesores inmobiliarios',
        contenido: JSON.stringify({ componentes: ['header', 'hero', 'team_grid', 'footer'] }),
        meta: JSON.stringify({ title: 'Asesores - ' + tenant.nombre }),
        publica: true,
        activa: true,
        orden: 2,
      });

      // Componentes para asesores
      await knex('componentes_web').insert({
        tenant_id: tenant.id,
        tipo: 'hero',
        variante: 'simple',
        nombre: 'Hero Asesores',
        datos: JSON.stringify({
          static_data: {
            titulo: tenant.slug === 'otro-demo' ? 'Expertos en Inversiones' : 'Nuestro Equipo',
            subtitulo: tenant.slug === 'otro-demo'
              ? 'Profesionales con años de experiencia en el mercado de lujo'
              : 'Profesionales dedicados a encontrar tu hogar ideal',
          },
          toggles: {
            mostrarBuscador: false,
            mostrarStats: false,
          },
        }),
        activo: true,
        orden: 1,
        scope: 'page_type',
        tipo_pagina: 'directorio_asesores',
        es_activo: true,
        config_completa: true,
      });

      await knex('componentes_web').insert({
        tenant_id: tenant.id,
        tipo: 'team_grid',
        variante: 'default',
        nombre: 'Grid de Asesores',
        datos: JSON.stringify({
          static_data: {
            titulo: tenant.slug === 'otro-demo' ? 'Nuestros Especialistas' : 'Conoce a Nuestros Asesores',
            subtitulo: 'Estamos aquí para ayudarte',
          },
          toggles: {
            mostrarContacto: true,
            mostrarEspecialidad: true,
            mostrarRating: true,
          },
        }),
        activo: true,
        orden: 2,
        scope: 'page_type',
        tipo_pagina: 'directorio_asesores',
        es_activo: true,
        config_completa: true,
      });

      console.log(`   ✅ Página asesores creada`);
    }

    // =========================================================================
    // 3. SINGLE PROPERTY (plantilla para propiedades individuales)
    // =========================================================================
    const existeSingleProperty = await knex('paginas_web')
      .where('tenant_id', tenant.id)
      .where('tipo_pagina', 'single_property')
      .first();

    if (!existeSingleProperty) {
      await knex('paginas_web').insert({
        tenant_id: tenant.id,
        tipo_pagina: 'single_property',
        variante: 'default',
        titulo: 'Detalle de Propiedad',
        slug: '/propiedad/:slug',
        descripcion: 'Plantilla para mostrar detalles de una propiedad',
        contenido: JSON.stringify({ componentes: ['header', 'property_detail', 'contact_form', 'related_properties', 'footer'] }),
        meta: JSON.stringify({ title: 'Propiedad - ' + tenant.nombre }),
        publica: true,
        activa: true,
        orden: 10,
      });

      // Componentes para single property
      await knex('componentes_web').insert({
        tenant_id: tenant.id,
        tipo: 'property_detail',
        variante: 'default',
        nombre: 'Detalle de Propiedad',
        datos: JSON.stringify({
          static_data: {
            etiquetaPrecio: tenant.slug === 'otro-demo' ? 'Precio de Inversión' : 'Precio',
            etiquetaUbicacion: 'Ubicación',
            etiquetaCaracteristicas: 'Características',
            textoContactar: tenant.slug === 'otro-demo' ? 'Solicitar Información' : 'Contactar Asesor',
          },
          toggles: {
            mostrarGaleria: true,
            mostrarMapa: true,
            mostrarCaracteristicas: true,
            mostrarAsesor: true,
            mostrarFormulario: true,
          },
        }),
        activo: true,
        orden: 1,
        scope: 'page_type',
        tipo_pagina: 'single_property',
        es_activo: true,
        config_completa: true,
      });

      await knex('componentes_web').insert({
        tenant_id: tenant.id,
        tipo: 'related_properties',
        variante: 'default',
        nombre: 'Propiedades Relacionadas',
        datos: JSON.stringify({
          static_data: {
            titulo: tenant.slug === 'otro-demo' ? 'Otras Oportunidades' : 'Propiedades Similares',
            cantidad: 3,
          },
          toggles: {
            mostrarPrecio: true,
          },
        }),
        activo: true,
        orden: 2,
        scope: 'page_type',
        tipo_pagina: 'single_property',
        es_activo: true,
        config_completa: true,
      });

      console.log(`   ✅ Plantilla single property creada`);
    }

    // =========================================================================
    // 4. PÁGINA DE CONTACTO
    // =========================================================================
    const existeContacto = await knex('paginas_web')
      .where('tenant_id', tenant.id)
      .where('slug', '/contacto')
      .first();

    if (!existeContacto) {
      await knex('paginas_web').insert({
        tenant_id: tenant.id,
        tipo_pagina: 'contacto',
        variante: 'default',
        titulo: 'Contacto',
        slug: '/contacto',
        descripcion: 'Ponte en contacto con nosotros',
        contenido: JSON.stringify({ componentes: ['header', 'hero', 'contact_info', 'contact_form', 'map', 'footer'] }),
        meta: JSON.stringify({ title: 'Contacto - ' + tenant.nombre }),
        publica: true,
        activa: true,
        orden: 5,
      });

      // Componentes para contacto
      await knex('componentes_web').insert({
        tenant_id: tenant.id,
        tipo: 'hero',
        variante: 'simple',
        nombre: 'Hero Contacto',
        datos: JSON.stringify({
          static_data: {
            titulo: tenant.slug === 'otro-demo' ? 'Hablemos de tu Inversión' : 'Contáctanos',
            subtitulo: tenant.slug === 'otro-demo'
              ? 'Nuestros expertos están listos para asesorarte'
              : 'Estamos aquí para ayudarte a encontrar tu hogar',
          },
          toggles: {
            mostrarBuscador: false,
            mostrarStats: false,
          },
        }),
        activo: true,
        orden: 1,
        scope: 'page_type',
        tipo_pagina: 'contacto',
        es_activo: true,
        config_completa: true,
      });

      await knex('componentes_web').insert({
        tenant_id: tenant.id,
        tipo: 'contact_info',
        variante: 'default',
        nombre: 'Info de Contacto',
        datos: JSON.stringify({
          static_data: {
            titulo: 'Información de Contacto',
            telefono: tenant.slug === 'otro-demo' ? '+1 809 555 1234' : '+1 809 555 0000',
            email: tenant.slug === 'otro-demo' ? 'inversiones@otro-demo.com' : 'info@demo.com',
            direccion: tenant.slug === 'otro-demo'
              ? 'Torre Empresarial, Piso 15, Piantini'
              : 'Av. Principal #123, Santo Domingo',
            horario: 'Lunes a Viernes: 9:00 AM - 6:00 PM',
          },
          toggles: {
            mostrarTelefono: true,
            mostrarEmail: true,
            mostrarDireccion: true,
            mostrarHorario: true,
            mostrarRedesSociales: true,
          },
        }),
        activo: true,
        orden: 2,
        scope: 'page_type',
        tipo_pagina: 'contacto',
        es_activo: true,
        config_completa: true,
      });

      await knex('componentes_web').insert({
        tenant_id: tenant.id,
        tipo: 'contact_form',
        variante: 'default',
        nombre: 'Formulario de Contacto',
        datos: JSON.stringify({
          static_data: {
            titulo: tenant.slug === 'otro-demo' ? 'Solicita una Consulta' : 'Envíanos un Mensaje',
            subtitulo: 'Completa el formulario y te contactaremos pronto',
            textoBoton: tenant.slug === 'otro-demo' ? 'Agendar Consulta' : 'Enviar Mensaje',
            campos: ['nombre', 'email', 'telefono', 'mensaje'],
          },
          toggles: {
            mostrarTelefono: true,
            mostrarAsunto: false,
          },
        }),
        activo: true,
        orden: 3,
        scope: 'page_type',
        tipo_pagina: 'contacto',
        es_activo: true,
        config_completa: true,
      });

      console.log(`   ✅ Página contacto creada`);
    }

    // =========================================================================
    // 5. ARTÍCULOS / BLOG
    // =========================================================================
    const existeArticulos = await knex('paginas_web')
      .where('tenant_id', tenant.id)
      .where('slug', '/articulos')
      .first();

    if (!existeArticulos) {
      await knex('paginas_web').insert({
        tenant_id: tenant.id,
        tipo_pagina: 'directorio_articulos',
        variante: 'default',
        titulo: tenant.slug === 'otro-demo' ? 'Centro de Conocimiento' : 'Blog',
        slug: '/articulos',
        descripcion: 'Artículos y noticias del sector inmobiliario',
        contenido: JSON.stringify({ componentes: ['header', 'hero', 'article_grid', 'footer'] }),
        meta: JSON.stringify({ title: (tenant.slug === 'otro-demo' ? 'Centro de Conocimiento' : 'Blog') + ' - ' + tenant.nombre }),
        publica: true,
        activa: true,
        orden: 4,
      });

      // Componentes para artículos
      await knex('componentes_web').insert({
        tenant_id: tenant.id,
        tipo: 'hero',
        variante: 'simple',
        nombre: 'Hero Artículos',
        datos: JSON.stringify({
          static_data: {
            titulo: tenant.slug === 'otro-demo' ? 'Centro de Conocimiento' : 'Nuestro Blog',
            subtitulo: tenant.slug === 'otro-demo'
              ? 'Análisis de mercado, tendencias y oportunidades de inversión'
              : 'Consejos, noticias y tendencias del mercado inmobiliario',
          },
          toggles: {
            mostrarBuscador: false,
            mostrarStats: false,
          },
        }),
        activo: true,
        orden: 1,
        scope: 'page_type',
        tipo_pagina: 'directorio_articulos',
        es_activo: true,
        config_completa: true,
      });

      await knex('componentes_web').insert({
        tenant_id: tenant.id,
        tipo: 'article_grid',
        variante: 'default',
        nombre: 'Grid de Artículos',
        datos: JSON.stringify({
          static_data: {
            titulo: tenant.slug === 'otro-demo' ? 'Últimos Análisis' : 'Artículos Recientes',
            articulosPorPagina: 9,
          },
          toggles: {
            mostrarFecha: true,
            mostrarAutor: true,
            mostrarCategoria: true,
            mostrarExcerpt: true,
          },
        }),
        activo: true,
        orden: 2,
        scope: 'page_type',
        tipo_pagina: 'directorio_articulos',
        es_activo: true,
        config_completa: true,
      });

      console.log(`   ✅ Página artículos creada`);
    }

    // =========================================================================
    // 6. SINGLE ARTICLE (plantilla para artículos individuales)
    // =========================================================================
    const existeSingleArticle = await knex('paginas_web')
      .where('tenant_id', tenant.id)
      .where('tipo_pagina', 'single_articulo')
      .first();

    if (!existeSingleArticle) {
      await knex('paginas_web').insert({
        tenant_id: tenant.id,
        tipo_pagina: 'single_articulo',
        variante: 'default',
        titulo: 'Detalle de Artículo',
        slug: '/articulos/:slug',
        descripcion: 'Plantilla para mostrar un artículo',
        contenido: JSON.stringify({ componentes: ['header', 'article_detail', 'related_articles', 'footer'] }),
        meta: JSON.stringify({ title: 'Artículo - ' + tenant.nombre }),
        publica: true,
        activa: true,
        orden: 11,
      });

      await knex('componentes_web').insert({
        tenant_id: tenant.id,
        tipo: 'article_detail',
        variante: 'default',
        nombre: 'Detalle de Artículo',
        datos: JSON.stringify({
          static_data: {
            etiquetaCompartir: 'Compartir',
            etiquetaAutor: 'Escrito por',
          },
          toggles: {
            mostrarFecha: true,
            mostrarAutor: true,
            mostrarCompartir: true,
            mostrarRelacionados: true,
          },
        }),
        activo: true,
        orden: 1,
        scope: 'page_type',
        tipo_pagina: 'single_articulo',
        es_activo: true,
        config_completa: true,
      });

      console.log(`   ✅ Plantilla single artículo creada`);
    }

    // =========================================================================
    // 7. SINGLE ASESOR (plantilla para asesores individuales)
    // =========================================================================
    const existeSingleAsesor = await knex('paginas_web')
      .where('tenant_id', tenant.id)
      .where('tipo_pagina', 'single_asesor')
      .first();

    if (!existeSingleAsesor) {
      await knex('paginas_web').insert({
        tenant_id: tenant.id,
        tipo_pagina: 'single_asesor',
        variante: 'default',
        titulo: 'Perfil de Asesor',
        slug: '/asesores/:slug',
        descripcion: 'Plantilla para mostrar perfil de asesor',
        contenido: JSON.stringify({ componentes: ['header', 'agent_profile', 'agent_listings', 'contact_form', 'footer'] }),
        meta: JSON.stringify({ title: 'Asesor - ' + tenant.nombre }),
        publica: true,
        activa: true,
        orden: 12,
      });

      await knex('componentes_web').insert({
        tenant_id: tenant.id,
        tipo: 'agent_profile',
        variante: 'default',
        nombre: 'Perfil de Asesor',
        datos: JSON.stringify({
          static_data: {
            etiquetaContactar: tenant.slug === 'otro-demo' ? 'Agendar Reunión' : 'Contactar',
            etiquetaPropiedades: 'Propiedades del Asesor',
          },
          toggles: {
            mostrarBio: true,
            mostrarContacto: true,
            mostrarEspecialidades: true,
            mostrarPropiedades: true,
            mostrarReviews: true,
          },
        }),
        activo: true,
        orden: 1,
        scope: 'page_type',
        tipo_pagina: 'single_asesor',
        es_activo: true,
        config_completa: true,
      });

      console.log(`   ✅ Plantilla single asesor creada`);
    }
  }

  console.log(`\n✅ Migración de páginas de navegación completada`);
}

export async function down(knex: Knex): Promise<void> {
  const tiposPagina = [
    'listados_propiedades',
    'directorio_asesores',
    'single_property',
    'contacto',
    'directorio_articulos',
    'single_articulo',
    'single_asesor',
  ];

  // Eliminar componentes
  for (const tipo of tiposPagina) {
    await knex('componentes_web')
      .where('scope', 'page_type')
      .where('tipo_pagina', tipo)
      .del();
  }

  // Eliminar páginas
  const slugs = ['/propiedades', '/asesores', '/contacto', '/articulos'];
  await knex('paginas_web').whereIn('slug', slugs).del();
  await knex('paginas_web').whereIn('tipo_pagina', ['single_property', 'single_articulo', 'single_asesor']).del();
}
