import { Knex } from 'knex';

/**
 * Seed - Páginas Web Estándar
 * 
 * Crea las páginas estándar para cada tenant
 */
export async function seed(knex: Knex): Promise<void> {
  // Obtener todos los tenants
  const tenants = await knex('tenants').where('activo', true);
  
  if (tenants.length === 0) {
    console.log('No hay tenants activos, saltando seed de páginas...');
    return;
  }

  // Tipos de página estándar con sus configuraciones
  const paginasEstandar = [
    {
      tipo_pagina: 'homepage',
      titulo: 'Inicio',
      slug: '/',
      descripcion: 'Página principal del sitio web',
      contenido: JSON.stringify({
        componentes: ['header', 'hero', 'features', 'testimonials', 'cta', 'footer'],
      }),
      meta: JSON.stringify({
        title: 'Inicio - Inmobiliaria',
        description: 'Bienvenido a nuestra inmobiliaria',
      }),
      publica: true,
      activa: true,
      orden: 0,
    },
    {
      tipo_pagina: 'listados_propiedades',
      titulo: 'Propiedades',
      slug: 'propiedades',
      descripcion: 'Listado de todas las propiedades disponibles',
      contenido: JSON.stringify({
        componentes: ['header', 'search_bar', 'filter_panel', 'property_list', 'pagination', 'footer'],
      }),
      meta: JSON.stringify({
        title: 'Propiedades - Inmobiliaria',
        description: 'Explora nuestras propiedades disponibles',
      }),
      publica: true,
      activa: true,
      orden: 1,
    },
    {
      tipo_pagina: 'blog',
      titulo: 'Blog',
      slug: 'blog',
      descripcion: 'Artículos y noticias sobre el mercado inmobiliario',
      contenido: JSON.stringify({
        componentes: ['header', 'blog_list', 'pagination', 'footer'],
      }),
      meta: JSON.stringify({
        title: 'Blog - Inmobiliaria',
        description: 'Últimas noticias y artículos',
      }),
      publica: true,
      activa: true,
      orden: 2,
    },
    {
      tipo_pagina: 'contacto',
      titulo: 'Contacto',
      slug: 'contacto',
      descripcion: 'Página de contacto',
      contenido: JSON.stringify({
        componentes: ['header', 'contact_form', 'footer'],
      }),
      meta: JSON.stringify({
        title: 'Contacto - Inmobiliaria',
        description: 'Ponte en contacto con nosotros',
      }),
      publica: true,
      activa: true,
      orden: 3,
    },
    {
      tipo_pagina: 'politicas_privacidad',
      titulo: 'Políticas de Privacidad',
      slug: 'politicas-privacidad',
      descripcion: 'Políticas de privacidad del sitio',
      contenido: JSON.stringify({
        componentes: ['header', 'footer'],
        texto: 'Contenido de políticas de privacidad...',
      }),
      meta: JSON.stringify({
        title: 'Políticas de Privacidad - Inmobiliaria',
        description: 'Nuestras políticas de privacidad',
      }),
      publica: true,
      activa: true,
      orden: 4,
    },
    {
      tipo_pagina: 'terminos_condiciones',
      titulo: 'Términos y Condiciones',
      slug: 'terminos-condiciones',
      descripcion: 'Términos y condiciones de uso',
      contenido: JSON.stringify({
        componentes: ['header', 'footer'],
        texto: 'Contenido de términos y condiciones...',
      }),
      meta: JSON.stringify({
        title: 'Términos y Condiciones - Inmobiliaria',
        description: 'Términos y condiciones de uso',
      }),
      publica: true,
      activa: true,
      orden: 5,
    },
  ];

  // Crear páginas estándar para cada tenant
  for (const tenant of tenants) {
    // Verificar si ya existen páginas para este tenant
    const existingPages = await knex('paginas_web')
      .where('tenant_id', tenant.id)
      .first();

    if (existingPages) {
      console.log(`Ya existen páginas para el tenant ${tenant.nombre}, saltando...`);
      continue;
    }

    // Insertar páginas estándar
    for (const pagina of paginasEstandar) {
      await knex('paginas_web').insert({
        tenant_id: tenant.id,
        ...pagina,
      });
    }

    console.log(`✅ Páginas estándar creadas para el tenant: ${tenant.nombre}`);
  }

  console.log('✅ Seed de páginas web completado');
}



