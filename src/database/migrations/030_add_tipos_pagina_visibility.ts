import { Knex } from 'knex';

/**
 * Migración: Agregar campos de visibilidad a tipos_pagina
 *
 * - visible: Si el tipo es visible para seleccionar por tenants
 * - featured: Si se destaca en la lista de tipos disponibles
 * - publico: Si está disponible para todos los planes o solo premium
 */
export async function up(knex: Knex): Promise<void> {
  // Agregar campos de visibilidad
  const hasVisible = await knex.schema.hasColumn('tipos_pagina', 'visible');
  if (!hasVisible) {
    await knex.schema.alterTable('tipos_pagina', (table) => {
      table.boolean('visible').defaultTo(true).comment('Si está visible para los tenants');
      table.boolean('featured').defaultTo(false).comment('Si se destaca en la lista');
      table.boolean('publico').defaultTo(true).comment('Disponible para todos o solo premium');
      table.integer('orden_catalogo').defaultTo(100).comment('Orden en el catálogo de tipos');
    });
    console.log('✅ Campos de visibilidad agregados a tipos_pagina');
  }

  // Actualizar tipos existentes con orden y visibilidad
  const ordenTipos: Record<string, { orden: number; featured: boolean }> = {
    homepage: { orden: 1, featured: true },
    listados_propiedades: { orden: 2, featured: true },
    single_property: { orden: 3, featured: false },
    contacto: { orden: 4, featured: true },
    listado_asesores: { orden: 5, featured: false },
    asesor_single: { orden: 6, featured: false },
    blog: { orden: 10, featured: true },
    articulo_single: { orden: 11, featured: false },
    articulo_categoria: { orden: 12, featured: false },
    videos: { orden: 20, featured: true },
    video_single: { orden: 21, featured: false },
    video_category: { orden: 22, featured: false },
    testimonios: { orden: 30, featured: false },
    testimonio_single: { orden: 31, featured: false },
    testimonio_categoria: { orden: 32, featured: false },
    landing_page: { orden: 40, featured: true },
    landing_proyecto: { orden: 41, featured: false },
    landing_subpagina: { orden: 42, featured: false },
    politicas_privacidad: { orden: 90, featured: false },
    terminos_condiciones: { orden: 91, featured: false },
  };

  for (const [codigo, config] of Object.entries(ordenTipos)) {
    await knex('tipos_pagina')
      .where('codigo', codigo)
      .update({
        orden_catalogo: config.orden,
        featured: config.featured,
        visible: true,
        publico: true,
      });
  }

  console.log('✅ Orden y visibilidad actualizados en tipos_pagina');
}

export async function down(knex: Knex): Promise<void> {
  const columns = ['visible', 'featured', 'publico', 'orden_catalogo'];
  for (const col of columns) {
    const hasCol = await knex.schema.hasColumn('tipos_pagina', col);
    if (hasCol) {
      await knex.schema.alterTable('tipos_pagina', (table) => {
        table.dropColumn(col);
      });
    }
  }
  console.log('✅ Campos de visibilidad eliminados de tipos_pagina');
}
