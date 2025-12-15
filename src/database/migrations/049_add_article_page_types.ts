import { Knex } from 'knex';

/**
 * Migración para agregar tipos de página para artículos
 * Similar a 026_add_video_page_types.ts
 */
export async function up(knex: Knex): Promise<void> {
  // Verificar si los tipos ya existen
  const existingTypes = await knex('tipos_pagina')
    .whereIn('codigo', ['article_category', 'article_single'])
    .select('codigo');

  const existingCodes = existingTypes.map((t: any) => t.codigo);

  // Insertar tipos de página para artículos si no existen
  const tiposArticulo = [
    {
      codigo: 'article_category',
      nombre: 'Categoría de Artículos',
      descripcion: 'Página que muestra artículos de una categoría específica',
      es_estandar: true,
      requiere_slug: true,
      configuracion: JSON.stringify({
        dynamic: true,
        requires_category_slug: true,
        default_slug: 'articulos'
      }),
    },
    {
      codigo: 'article_single',
      nombre: 'Artículo Individual',
      descripcion: 'Página para mostrar un artículo específico',
      es_estandar: true,
      requiere_slug: true,
      configuracion: JSON.stringify({
        dynamic: true,
        requires_category_slug: true,
        requires_article_slug: true
      }),
    },
  ];

  for (const tipo of tiposArticulo) {
    if (!existingCodes.includes(tipo.codigo)) {
      await knex('tipos_pagina').insert(tipo);
      console.log(`✅ Tipo de página agregado: ${tipo.codigo}`);
    } else {
      console.log(`ℹ️ Tipo de página ya existe: ${tipo.codigo}`);
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  // Eliminar tipos de página de artículos
  await knex('tipos_pagina')
    .whereIn('codigo', ['article_category', 'article_single'])
    .delete();
}
