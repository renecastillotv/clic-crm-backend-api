import { Knex } from 'knex';

/**
 * Migracion - Componentes de Homepage
 *
 * Inserta los componentes de la homepage para cada tenant existente:
 * - Hero (con buscador, stats, badges)
 * - Features (caracteristicas del servicio)
 * - Testimonials (testimonios de clientes)
 *
 * Estos componentes se guardan con scope='page_type' y tipo_pagina='homepage'
 * para que getSeccionesResueltas() los lea de la BD.
 */
export async function up(knex: Knex): Promise<void> {
  // Obtener todos los tenants activos
  const tenants = await knex('tenants').where('activo', true).select('id', 'nombre');

  for (const tenant of tenants) {
    console.log(`Insertando componentes homepage para tenant: ${tenant.nombre}`);

    // Verificar si ya existen componentes homepage para este tenant
    const existingHomepage = await knex('componentes_web')
      .where('tenant_id', tenant.id)
      .where('scope', 'page_type')
      .where('tipo_pagina', 'homepage')
      .first();

    if (existingHomepage) {
      console.log(`  Ya existen componentes homepage, saltando...`);
      continue;
    }

    // =====================================================================
    // HERO - Homepage con buscador
    // =====================================================================
    await knex('componentes_web').insert({
      tenant_id: tenant.id,
      tipo: 'hero',
      variante: 'default',
      nombre: 'Hero Principal Homepage',
      datos: JSON.stringify({
        static_data: {
          badge: 'Plataforma Inmobiliaria #1',
          titulo: 'Encuentra tu hogar ideal',
          subtitulo: 'Explora miles de propiedades en las mejores ubicaciones. Tu proximo hogar esta a un clic de distancia.',
          stats: [
            { numero: '10,000+', etiqueta: 'Propiedades' },
            { numero: '5,000+', etiqueta: 'Clientes Felices' },
            { numero: '500+', etiqueta: 'Agentes' },
          ],
          buscador_tabs: [
            { valor: 'venta', etiqueta: 'Comprar' },
            { valor: 'renta', etiqueta: 'Alquilar' },
          ],
          buscador_placeholder_ubicacion: 'Ciudad, zona o direccion',
          buscador_label_tipo: 'Tipo de propiedad',
          buscador_label_precio: 'Rango de precio',
          buscador_texto_boton: 'Buscar Propiedades',
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

    // =====================================================================
    // FEATURES - Caracteristicas del servicio
    // =====================================================================
    await knex('componentes_web').insert({
      tenant_id: tenant.id,
      tipo: 'features',
      variante: 'default',
      nombre: 'Caracteristicas Homepage',
      datos: JSON.stringify({
        static_data: {
          titulo: 'Por que elegirnos?',
          subtitulo: 'Descubre las ventajas de trabajar con nosotros',
          features: [
            {
              icono: 'home',
              titulo: 'Amplio Catalogo',
              descripcion: 'Miles de propiedades verificadas esperando por ti',
            },
            {
              icono: 'dollar',
              titulo: 'Mejores Precios',
              descripcion: 'Encuentra las mejores ofertas del mercado inmobiliario',
            },
            {
              icono: 'key',
              titulo: 'Proceso Sencillo',
              descripcion: 'Te acompanamos en cada paso hasta obtener tus llaves',
            },
            {
              icono: 'chart',
              titulo: 'Asesoria Experta',
              descripcion: 'Agentes certificados con anos de experiencia',
            },
            {
              icono: 'shield',
              titulo: 'Transacciones Seguras',
              descripcion: 'Procesos legales transparentes y seguros',
            },
            {
              icono: 'clock',
              titulo: 'Atencion 24/7',
              descripcion: 'Estamos disponibles cuando nos necesites',
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

    // =====================================================================
    // TESTIMONIALS - Testimonios de clientes
    // =====================================================================
    await knex('componentes_web').insert({
      tenant_id: tenant.id,
      tipo: 'testimonials',
      variante: 'default',
      nombre: 'Testimonios Homepage',
      datos: JSON.stringify({
        static_data: {
          titulo: 'Lo que dicen nuestros clientes',
          subtitulo: 'Historias reales de personas que encontraron su hogar ideal',
          testimonios: [
            {
              nombre: 'Maria Garcia',
              cargo: 'Compradora',
              texto: 'Excelente servicio. Encontre mi departamento sonado en menos de un mes. El equipo fue muy profesional y atento.',
              calificacion: 5,
            },
            {
              nombre: 'Carlos Rodriguez',
              cargo: 'Inversionista',
              texto: 'He comprado 3 propiedades con ellos. Siempre me ofrecen las mejores oportunidades de inversion.',
              calificacion: 5,
            },
            {
              nombre: 'Ana Martinez',
              cargo: 'Propietaria',
              texto: 'Vendi mi casa en tiempo record y a un precio justo. Muy recomendados.',
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

    console.log(`  ✅ Componentes homepage creados para ${tenant.nombre}`);
  }
}

export async function down(knex: Knex): Promise<void> {
  // Eliminar componentes de homepage (scope='page_type' AND tipo_pagina='homepage')
  await knex('componentes_web')
    .where('scope', 'page_type')
    .where('tipo_pagina', 'homepage')
    .whereIn('tipo', ['hero', 'features', 'testimonials'])
    .del();
}
