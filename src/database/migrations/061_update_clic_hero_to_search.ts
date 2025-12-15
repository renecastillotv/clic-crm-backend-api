import { Knex } from 'knex';

/**
 * Migración 061: Actualizar Hero de CLIC a variante "search"
 *
 * Cambia el Hero del tenant CLIC de variante "default" a "search"
 * para que use el nuevo componente con buscador integrado
 */

export async function up(knex: Knex): Promise<void> {
  // Obtener tenant CLIC
  const clicTenant = await knex('tenants')
    .where('slug', 'clic')
    .first();

  if (!clicTenant) {
    console.log('⚠️  Tenant CLIC no encontrado');
    return;
  }

  console.log(`🔧 Actualizando Hero de CLIC (tenant: ${clicTenant.id})`);

  // Buscar el Hero actual del homepage de CLIC
  const heroComponent = await knex('componentes_web')
    .where({
      tenant_id: clicTenant.id,
      tipo: 'hero',
      scope: 'page_type',
      tipo_pagina: 'homepage',
    })
    .first();

  if (heroComponent) {
    // Parsear datos actuales
    const datosActuales = typeof heroComponent.datos === 'string'
      ? JSON.parse(heroComponent.datos)
      : heroComponent.datos;

    // Actualizar a variante "search" con datos mejorados
    await knex('componentes_web')
      .where('id', heroComponent.id)
      .update({
        variante: 'search',
        nombre: 'Hero Homepage con Búsqueda',
        datos: JSON.stringify({
          static_data: {
            titulo: 'Encuentra la Propiedad de tus Sueños en República Dominicana',
            tagline: 'Miles de propiedades en venta y renta',
            subtitulo: 'Más de 15 años de experiencia ayudando a familias a encontrar su hogar ideal',
            imagenFondo: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1920&h=1080&fit=crop&auto=format&q=80',
            mostrarBuscador: true,
            badge: 'Fundada por René Castillo • Presentador TV 18 años',
            valueProps: [
              { texto: 'Asesoría personalizada', color: '#3b82f6' },
              { texto: 'Experiencia local', color: '#f59e0b' },
              { texto: 'Proceso transparente', color: '#10b981' },
            ],
          },
          toggles: {
            mostrarOverlay: true,
            centrarTexto: true,
            mostrarBadge: true,
          },
          styles: {
            altura: '75vh',
            overlayOpacity: 0.6,
          },
        }),
        updated_at: knex.fn.now(),
      });

    console.log('   ✅ Hero actualizado a variante "search"');
  } else {
    console.log('   ⚠️  Hero no encontrado para CLIC homepage');
  }
}

export async function down(knex: Knex): Promise<void> {
  // Obtener tenant CLIC
  const clicTenant = await knex('tenants')
    .where('slug', 'clic')
    .first();

  if (!clicTenant) {
    return;
  }

  // Revertir a variante "default"
  const heroComponent = await knex('componentes_web')
    .where({
      tenant_id: clicTenant.id,
      tipo: 'hero',
      scope: 'page_type',
      tipo_pagina: 'homepage',
    })
    .first();

  if (heroComponent) {
    await knex('componentes_web')
      .where('id', heroComponent.id)
      .update({
        variante: 'default',
        updated_at: knex.fn.now(),
      });

    console.log('✅ Hero revertido a variante "default"');
  }
}
