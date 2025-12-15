import { Knex } from 'knex';

/**
 * Migracion - Crear tenant otro-demo con homepage diferente
 *
 * Crea un nuevo tenant para demostrar que cada tenant tiene su propia homepage
 */
export async function up(knex: Knex): Promise<void> {
  // 1. Crear el tenant
  const [tenant] = await knex('tenants')
    .insert({
      nombre: 'Otro Demo Inmobiliaria',
      slug: 'otro-demo',
      codigo_pais: 'DO',
      idioma_default: 'es',
      activo: true,
    })
    .returning('id');

  const tenantId = tenant.id;
  console.log(`✅ Tenant creado: otro-demo (ID: ${tenantId})`);

  // 2. Crear tema
  await knex('temas_tenant').insert({
    tenant_id: tenantId,
    nombre: 'Tema Otro Demo',
    colores: JSON.stringify({
      primary: '#e63946',      // Rojo
      secondary: '#1d3557',    // Azul oscuro
      accent: '#a8dadc',       // Celeste
      background: '#f1faee',   // Crema
      text: '#1d3557',
      textSecondary: '#457b9d',
      border: '#a8dadc',
      success: '#2a9d8f',
      warning: '#e9c46a',
      error: '#e63946',
    }),
    activo: true,
  });

  // 3. Crear pagina homepage
  const [pagina] = await knex('paginas_web')
    .insert({
      tenant_id: tenantId,
      tipo_pagina: 'homepage',
      variante: 'default',
      titulo: 'Inicio',
      slug: '/',
      descripcion: 'Pagina principal de Otro Demo',
      contenido: JSON.stringify({ componentes: ['header', 'hero', 'features', 'testimonials', 'footer'] }),
      meta: JSON.stringify({ title: 'Inicio - Otro Demo Inmobiliaria' }),
      publica: true,
      activa: true,
      orden: 0,
    })
    .returning('id');

  // 4. Crear componentes globales (header, footer)
  await knex('componentes_web').insert({
    tenant_id: tenantId,
    tipo: 'header',
    variante: 'default',
    nombre: 'Header Otro Demo',
    datos: JSON.stringify({
      static_data: {
        logoAlt: 'Otro Demo',
        links: [
          { texto: 'Comprar', url: '/propiedades?operacion=venta' },
          { texto: 'Alquilar', url: '/propiedades?operacion=renta' },
          { texto: 'Contacto', url: '/contacto' },
        ],
        textoBotonContacto: 'Llamanos',
        urlBotonContacto: '/contacto',
      },
      toggles: {
        mostrarMenu: true,
        mostrarBotonContacto: true,
      },
    }),
    activo: true,
    orden: 0,
    scope: 'tenant',
    es_activo: true,
  });

  await knex('componentes_web').insert({
    tenant_id: tenantId,
    tipo: 'footer',
    variante: 'default',
    nombre: 'Footer Otro Demo',
    datos: JSON.stringify({
      static_data: {
        copyright: '2025 Otro Demo Inmobiliaria. Todos los derechos reservados.',
        telefono: '+1 809 555 1234',
        email: 'info@otro-demo.com',
        direccion: 'Av. Principal #456, Santo Domingo',
      },
    }),
    activo: true,
    orden: 999,
    scope: 'tenant',
    es_activo: true,
  });

  // 5. Crear componentes de homepage (DIFERENTES al tenant demo)
  // HERO - Texto completamente diferente
  await knex('componentes_web').insert({
    tenant_id: tenantId,
    tipo: 'hero',
    variante: 'default',
    nombre: 'Hero Principal - Otro Demo',
    datos: JSON.stringify({
      static_data: {
        badge: 'NUEVO EN EL MERCADO',
        titulo: 'Tu proxima inversion esta aqui',
        subtitulo: 'Somos expertos en propiedades de lujo y oportunidades unicas de inversion.',
        stats: [
          { numero: '250+', etiqueta: 'Propiedades Exclusivas' },
          { numero: '98%', etiqueta: 'Satisfaccion' },
          { numero: '50+', etiqueta: 'Anos de Experiencia' },
        ],
        buscador_tabs: [
          { valor: 'venta', etiqueta: 'Invertir' },
          { valor: 'renta', etiqueta: 'Rentar' },
        ],
        buscador_placeholder_ubicacion: 'Busca por sector o proyecto',
        buscador_label_tipo: 'Categoria',
        buscador_label_precio: 'Presupuesto',
        buscador_texto_boton: 'Encontrar Propiedades',
      },
      toggles: {
        mostrarBadge: true,
        mostrarStats: true,
        mostrarBuscador: true,
      },
    }),
    activo: true,
    orden: 1,
    scope: 'page_type',
    tipo_pagina: 'homepage',
    es_activo: true,
    config_completa: true,
  });

  // FEATURES - Diferentes caracteristicas
  await knex('componentes_web').insert({
    tenant_id: tenantId,
    tipo: 'features',
    variante: 'default',
    nombre: 'Caracteristicas - Otro Demo',
    datos: JSON.stringify({
      static_data: {
        titulo: 'Nuestras Ventajas Competitivas',
        subtitulo: 'Lo que nos hace diferentes en el mercado',
        features: [
          {
            icono: 'building',
            titulo: 'Propiedades Premium',
            descripcion: 'Solo trabajamos con las mejores propiedades del mercado',
          },
          {
            icono: 'shield',
            titulo: 'Garantia Total',
            descripcion: 'Todos nuestros inmuebles cuentan con documentacion verificada',
          },
          {
            icono: 'users',
            titulo: 'Atencion VIP',
            descripcion: 'Un asesor dedicado exclusivamente para ti',
          },
          {
            icono: 'star',
            titulo: 'Exclusividad',
            descripcion: 'Acceso a propiedades que no encontraras en otro lugar',
          },
        ],
      },
      toggles: {
        mostrarTitulo: true,
        mostrarSubtitulo: true,
      },
    }),
    activo: true,
    orden: 2,
    scope: 'page_type',
    tipo_pagina: 'homepage',
    es_activo: true,
    config_completa: true,
  });

  // TESTIMONIALS - Diferentes testimonios
  await knex('componentes_web').insert({
    tenant_id: tenantId,
    tipo: 'testimonials',
    variante: 'default',
    nombre: 'Testimonios - Otro Demo',
    datos: JSON.stringify({
      static_data: {
        titulo: 'Casos de Exito',
        subtitulo: 'Inversionistas que confiaron en nosotros',
        testimonios: [
          {
            nombre: 'Roberto Fernandez',
            cargo: 'Empresario',
            texto: 'Compre 5 apartamentos como inversion. El retorno ha sido espectacular, mas del 12% anual.',
            calificacion: 5,
          },
          {
            nombre: 'Patricia Mendez',
            cargo: 'Inversionista Internacional',
            texto: 'Desde Miami gestione toda mi compra. Servicio impecable y totalmente transparente.',
            calificacion: 5,
          },
          {
            nombre: 'Luis Alberto Torres',
            cargo: 'CEO TechStartup',
            texto: 'Encontraron exactamente lo que buscaba: una propiedad de lujo con vista al mar.',
            calificacion: 5,
          },
        ],
      },
      toggles: {
        mostrarTitulo: true,
        mostrarRating: true,
        mostrarAvatar: true,
      },
    }),
    activo: true,
    orden: 3,
    scope: 'page_type',
    tipo_pagina: 'homepage',
    es_activo: true,
    config_completa: true,
  });

  console.log(`✅ Componentes homepage creados para otro-demo`);
}

export async function down(knex: Knex): Promise<void> {
  // Buscar el tenant
  const tenant = await knex('tenants').where('slug', 'otro-demo').first();

  if (tenant) {
    // Eliminar componentes
    await knex('componentes_web').where('tenant_id', tenant.id).del();
    // Eliminar paginas
    await knex('paginas_web').where('tenant_id', tenant.id).del();
    // Eliminar tema
    await knex('temas_tenant').where('tenant_id', tenant.id).del();
    // Eliminar tenant
    await knex('tenants').where('id', tenant.id).del();
  }
}
