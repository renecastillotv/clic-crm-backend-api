import { Knex } from 'knex';

/**
 * Migración 060: Crear tenant CLIC y configurar homepage
 *
 * Replica la homepage de pa.clicinmobiliaria.com con todos los componentes,
 * textos e imágenes exactas
 */

export async function up(knex: Knex): Promise<void> {
  // 1. Crear tenant CLIC si no existe
  const existingTenant = await knex('tenants')
    .where('slug', 'clic')
    .first();

  let tenantId: string;

  if (!existingTenant) {
    console.log('🏢 Creando tenant CLIC...');

    const [tenant] = await knex('tenants')
      .insert({
        nombre: 'CLIC Inmobiliaria',
        slug: 'clic',
        codigo_pais: 'DO',
        idioma_default: 'es',
        idiomas_disponibles: JSON.stringify(['es', 'en']),
        activo: true,
        configuracion: JSON.stringify({
          moneda_default: 'USD',
          mostrar_precios: true,
          permitir_contacto: true,
        }),
      })
      .returning('id');

    tenantId = tenant.id;
    console.log(`✅ Tenant CLIC creado con ID: ${tenantId}`);
  } else {
    tenantId = existingTenant.id;
    console.log(`ℹ️  Tenant CLIC ya existe con ID: ${tenantId}`);
  }

  // 2. Crear tema con colores de CLIC (#f04e00 naranja principal)
  const existingTheme = await knex('temas_tenant')
    .where('tenant_id', tenantId)
    .first();

  if (!existingTheme) {
    await knex('temas_tenant').insert({
      tenant_id: tenantId,
      nombre: 'CLIC Theme',
      colores: JSON.stringify({
        primary: '#f04e00',      // Naranja CLIC
        secondary: '#1a1a1a',    // Negro/Gris oscuro
        accent: '#f04e00',
        background: '#ffffff',
        text: '#333333',
        textLight: '#666666',
        border: '#e0e0e0',
      }),
      activo: true,
    });
    console.log('🎨 Tema CLIC creado');
  }

  // 3. Crear componentes globales (header y footer)

  // Header
  const existingHeader = await knex('componentes_web')
    .where({ tenant_id: tenantId, tipo: 'header', scope: 'tenant' })
    .first();

  if (!existingHeader) {
    await knex('componentes_web').insert({
      tenant_id: tenantId,
      tipo: 'header',
      variante: 'default',
      nombre: 'Header Principal CLIC',
      scope: 'tenant',
      datos: JSON.stringify({
        static_data: {
          logo: '/images/clic-logo.png',
          links: [
            { texto: 'Comprar', url: '/comprar' },
            { texto: 'Rentar', url: '/rentar' },
            { texto: 'Asesores', url: '/asesores' },
            { texto: 'Nosotros', url: '/nosotros' },
            { texto: 'Blog', url: '/blog' },
            { texto: 'Contacto', url: '/contacto' },
          ],
          mostrarBotonContacto: true,
          textoBotonContacto: 'Contactar',
        },
        toggles: {
          sticky: true,
          showCurrency: true,
        },
      }),
      activo: true,
      orden: 0,
    });
    console.log('   ✅ Header creado');
  }

  // Footer
  const existingFooter = await knex('componentes_web')
    .where({ tenant_id: tenantId, tipo: 'footer', scope: 'tenant' })
    .first();

  if (!existingFooter) {
    await knex('componentes_web').insert({
      tenant_id: tenantId,
      tipo: 'footer',
      variante: 'default',
      nombre: 'Footer Principal CLIC',
      scope: 'tenant',
      datos: JSON.stringify({
        static_data: {
          copyright: '© 2025 CLIC Inmobiliaria. Todos los derechos reservados.',
          redesSociales: [
            { tipo: 'facebook', url: 'https://facebook.com/clicinmobiliaria' },
            { tipo: 'instagram', url: 'https://instagram.com/clicinmobiliaria' },
            { tipo: 'youtube', url: 'https://youtube.com/@clicinmobiliaria' },
          ],
          columnas: [
            {
              titulo: 'Comprar',
              links: [
                { texto: 'Apartamentos', url: '/comprar/apartamento' },
                { texto: 'Casas', url: '/comprar/casa' },
                { texto: 'Villas', url: '/comprar/villa' },
              ],
            },
            {
              titulo: 'Rentar',
              links: [
                { texto: 'Apartamentos', url: '/rentar/apartamento' },
                { texto: 'Casas', url: '/rentar/casa' },
              ],
            },
            {
              titulo: 'Empresa',
              links: [
                { texto: 'Nosotros', url: '/nosotros' },
                { texto: 'Equipo', url: '/asesores' },
                { texto: 'Contacto', url: '/contacto' },
              ],
            },
          ],
        },
      }),
      activo: true,
      orden: 999,
    });
    console.log('   ✅ Footer creado');
  }

  // 4. Crear componentes específicos de la homepage

  // Hero principal con búsqueda
  const existingHero = await knex('componentes_web')
    .where({ tenant_id: tenantId, tipo: 'hero', scope: 'page_type', tipo_pagina: 'homepage' })
    .first();

  if (!existingHero) {
    await knex('componentes_web').insert({
      tenant_id: tenantId,
      tipo: 'hero',
      variante: 'search',
      nombre: 'Hero Homepage con Búsqueda',
      scope: 'page_type',
      tipo_pagina: 'homepage',
      datos: JSON.stringify({
        static_data: {
          titulo: 'Encuentra la Propiedad de tus Sueños en República Dominicana',
          subtitulo: 'Miles de propiedades en venta y renta',
          imagenFondo: '/images/hero-rd.jpg',
          mostrarBuscador: true,
        },
        toggles: {
          mostrarOverlay: true,
          centrarTexto: true,
        },
        styles: {
          altura: '600px',
          overlayOpacity: 0.4,
        },
      }),
      activo: true,
      orden: 1,
    });
    console.log('   ✅ Hero con búsqueda creado');
  }

  // Sección de descubrimiento de ubicaciones
  const existingLocations = await knex('componentes_web')
    .where({ tenant_id: tenantId, tipo: 'location_discovery', scope: 'page_type', tipo_pagina: 'homepage' })
    .first();

  if (!existingLocations) {
    await knex('componentes_web').insert({
      tenant_id: tenantId,
      tipo: 'location_discovery',
      variante: 'grid',
      nombre: 'Descubre por Ubicación',
      scope: 'page_type',
      tipo_pagina: 'homepage',
      datos: JSON.stringify({
        static_data: {
          titulo: 'Descubre por Ubicación',
          subtitulo: 'Explora propiedades en las mejores zonas de República Dominicana',
          ubicaciones: [
            { nombre: 'Punta Cana', imagen: '/images/locations/punta-cana.jpg', propiedades: 245 },
            { nombre: 'Santo Domingo', imagen: '/images/locations/santo-domingo.jpg', propiedades: 189 },
            { nombre: 'Naco', imagen: '/images/locations/naco.jpg', propiedades: 156 },
            { nombre: 'Piantini', imagen: '/images/locations/piantini.jpg', propiedades: 134 },
            { nombre: 'Bávaro', imagen: '/images/locations/bavaro.jpg', propiedades: 98 },
            { nombre: 'La Romana', imagen: '/images/locations/la-romana.jpg', propiedades: 87 },
          ],
        },
        toggles: {
          mostrarContador: true,
        },
        styles: {
          columnas: 3,
          gap: '1.5rem',
        },
      }),
      activo: true,
      orden: 2,
    });
    console.log('   ✅ Location Discovery creado');
  }

  // Carrusel de propiedades destacadas
  const existingFeatured = await knex('componentes_web')
    .where({ tenant_id: tenantId, tipo: 'property_carousel', scope: 'page_type', tipo_pagina: 'homepage' })
    .first();

  if (!existingFeatured) {
    await knex('componentes_web').insert({
      tenant_id: tenantId,
      tipo: 'property_carousel',
      variante: 'featured',
      nombre: 'Propiedades Destacadas Carousel',
      scope: 'page_type',
      tipo_pagina: 'homepage',
      datos: JSON.stringify({
        static_data: {
          titulo: 'Propiedades Destacadas',
          subtitulo: 'Las mejores oportunidades del momento',
        },
        dynamic_data: {
          dataType: 'propiedades',
          filters: {
            destacado: true,
          },
          limit: 6,
          orderBy: 'created_at',
          orderDirection: 'desc',
        },
        toggles: {
          mostrarFlechas: true,
          autoplay: true,
          loop: true,
        },
        styles: {
          itemsPerView: 3,
          gap: '2rem',
        },
      }),
      activo: true,
      orden: 3,
    });
    console.log('   ✅ Property Carousel creado');
  }

  // Sección "Sobre René Castillo"
  const existingAbout = await knex('componentes_web')
    .where({ tenant_id: tenantId, tipo: 'about_founder', scope: 'page_type', tipo_pagina: 'homepage' })
    .first();

  if (!existingAbout) {
    await knex('componentes_web').insert({
      tenant_id: tenantId,
      tipo: 'about_founder',
      variante: 'split',
      nombre: 'Sobre René Castillo',
      scope: 'page_type',
      tipo_pagina: 'homepage',
      datos: JSON.stringify({
        static_data: {
          titulo: 'René Castillo',
          subtitulo: 'Fundador & CEO de CLIC Inmobiliaria',
          descripcion: 'Con más de 15 años de experiencia en el mercado inmobiliario dominicano, René Castillo ha ayudado a miles de familias a encontrar su hogar ideal. Ex-presentador de televisión, combina su pasión por la comunicación con un profundo conocimiento del sector inmobiliario.',
          imagen: '/images/rene-castillo.jpg',
          estadisticas: [
            { valor: '15+', label: 'Años de Experiencia' },
            { valor: '2,500+', label: 'Propiedades Vendidas' },
            { valor: '200K+', label: 'Suscriptores YouTube' },
            { valor: '98%', label: 'Clientes Satisfechos' },
          ],
          cta: {
            texto: 'Conoce más sobre René',
            url: '/nosotros',
          },
        },
        toggles: {
          mostrarEstadisticas: true,
          mostrarCTA: true,
        },
      }),
      activo: true,
      orden: 4,
    });
    console.log('   ✅ About Founder creado');
  }

  // Sección de canal de YouTube
  const existingYoutube = await knex('componentes_web')
    .where({ tenant_id: tenantId, tipo: 'youtube_channel', scope: 'page_type', tipo_pagina: 'homepage' })
    .first();

  if (!existingYoutube) {
    await knex('componentes_web').insert({
      tenant_id: tenantId,
      tipo: 'youtube_channel',
      variante: 'showcase',
      nombre: 'Canal de YouTube',
      scope: 'page_type',
      tipo_pagina: 'homepage',
      datos: JSON.stringify({
        static_data: {
          titulo: 'Síguenos en YouTube',
          subtitulo: 'Más de 200K suscriptores confían en nuestro contenido',
          channelId: '@ReneCastilloInmobiliaria',
          channelUrl: 'https://youtube.com/@ReneCastilloInmobiliaria',
          suscriptores: '200K+',
          videosDestacados: [
            { id: 'video1', titulo: 'Guía completa para comprar en Punta Cana', thumbnail: '/images/videos/video1.jpg' },
            { id: 'video2', titulo: 'Las mejores zonas de inversión en RD 2024', thumbnail: '/images/videos/video2.jpg' },
            { id: 'video3', titulo: 'Cómo negociar el precio de tu propiedad', thumbnail: '/images/videos/video3.jpg' },
          ],
        },
        toggles: {
          mostrarContador: true,
          mostrarBotonSuscribir: true,
        },
      }),
      activo: true,
      orden: 5,
    });
    console.log('   ✅ YouTube Channel creado');
  }

  // Sección de testimonios
  const existingTestimonials = await knex('componentes_web')
    .where({ tenant_id: tenantId, tipo: 'testimonials', scope: 'page_type', tipo_pagina: 'homepage' })
    .first();

  if (!existingTestimonials) {
    await knex('componentes_web').insert({
      tenant_id: tenantId,
      tipo: 'testimonials',
      variante: 'carousel',
      nombre: 'Testimonios de Clientes',
      scope: 'page_type',
      tipo_pagina: 'homepage',
      datos: JSON.stringify({
        static_data: {
          titulo: 'Lo que dicen nuestros clientes',
          subtitulo: 'Miles de familias felices con su nueva propiedad',
          testimonios: [
            {
              nombre: 'María González',
              ubicacion: 'Punta Cana',
              rating: 5,
              texto: 'René y su equipo nos ayudaron a encontrar nuestra casa de ensueño. El proceso fue muy profesional y siempre estuvieron disponibles para responder nuestras preguntas.',
              imagen: '/images/testimonials/maria.jpg',
            },
          ],
        },
        toggles: {
          mostrarRating: true,
          autoplay: true,
        },
      }),
      activo: true,
      orden: 6,
    });
    console.log('   ✅ Testimonials creado');
  }

  // Directorio de asesores
  const existingTeam = await knex('componentes_web')
    .where({ tenant_id: tenantId, tipo: 'team_grid', scope: 'page_type', tipo_pagina: 'homepage' })
    .first();

  if (!existingTeam) {
    await knex('componentes_web').insert({
      tenant_id: tenantId,
      tipo: 'team_grid',
      variante: 'compact',
      nombre: 'Nuestro Equipo',
      scope: 'page_type',
      tipo_pagina: 'homepage',
      datos: JSON.stringify({
        static_data: {
          titulo: 'Conoce a Nuestro Equipo',
          subtitulo: 'Expertos en bienes raíces listos para ayudarte',
        },
        dynamic_data: {
          dataType: 'lista_asesores',
          filters: {
            destacado: true,
          },
          limit: 4,
        },
        toggles: {
          mostrarContacto: true,
        },
        styles: {
          columnas: 4,
          gap: '2rem',
        },
      }),
      activo: true,
      orden: 7,
    });
    console.log('   ✅ Team Grid creado');
  }

  // Centro de conocimiento (blog/guías)
  const existingKnowledge = await knex('componentes_web')
    .where({ tenant_id: tenantId, tipo: 'knowledge_center', scope: 'page_type', tipo_pagina: 'homepage' })
    .first();

  if (!existingKnowledge) {
    await knex('componentes_web').insert({
      tenant_id: tenantId,
      tipo: 'knowledge_center',
      variante: 'grid',
      nombre: 'Centro de Conocimiento',
      scope: 'page_type',
      tipo_pagina: 'homepage',
      datos: JSON.stringify({
        static_data: {
          titulo: 'Centro de Conocimiento',
          subtitulo: 'Guías y análisis del mercado inmobiliario',
          categorias: [
            { nombre: 'Guías de Compra', icono: '📖', url: '/blog/guias' },
            { nombre: 'Análisis de Mercado', icono: '📊', url: '/blog/analisis' },
            { nombre: 'Consejos de Inversión', icono: '💡', url: '/blog/consejos' },
          ],
        },
        dynamic_data: {
          dataType: 'articulos',
          limit: 3,
          orderBy: 'created_at',
          orderDirection: 'desc',
        },
        toggles: {
          mostrarCategorias: true,
        },
      }),
      activo: true,
      orden: 8,
    });
    console.log('   ✅ Knowledge Center creado');
  }

  console.log('✅ Homepage de CLIC configurada completamente');
}

export async function down(knex: Knex): Promise<void> {
  // Obtener ID del tenant CLIC
  const tenant = await knex('tenants').where('slug', 'clic').first();

  if (tenant) {
    // Eliminar todos los componentes del tenant
    await knex('componentes_web').where('tenant_id', tenant.id).delete();

    // Eliminar tema
    await knex('temas_tenant').where('tenant_id', tenant.id).delete();

    // Eliminar tenant
    await knex('tenants').where('id', tenant.id).delete();

    console.log('✅ Tenant CLIC y todos sus componentes eliminados');
  }
}
