import { Knex } from 'knex';

/**
 * Migración para agregar tipos de página para videos
 */
export async function up(knex: Knex): Promise<void> {
  // Verificar si los tipos ya existen
  const existingTypes = await knex('tipos_pagina')
    .whereIn('codigo', ['video_category', 'video_single'])
    .select('codigo');

  const existingCodes = existingTypes.map((t: any) => t.codigo);

  // Insertar tipos de página para videos si no existen
  const tiposVideo = [
    {
      codigo: 'video_category',
      nombre: 'Categoría de Videos',
      descripcion: 'Página que muestra videos de una categoría específica',
      es_estandar: true,
      requiere_slug: true,
      configuracion: JSON.stringify({
        dynamic: true,
        requires_category_slug: true,
        default_slug: 'videos'
      }),
    },
    {
      codigo: 'video_single',
      nombre: 'Video Individual',
      descripcion: 'Página para mostrar un video específico con embed',
      es_estandar: true,
      requiere_slug: true,
      configuracion: JSON.stringify({
        dynamic: true,
        requires_category_slug: true,
        requires_video_slug: true
      }),
    },
  ];

  for (const tipo of tiposVideo) {
    if (!existingCodes.includes(tipo.codigo)) {
      await knex('tipos_pagina').insert(tipo);
      console.log(`✅ Tipo de página agregado: ${tipo.codigo}`);
    } else {
      console.log(`ℹ️ Tipo de página ya existe: ${tipo.codigo}`);
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  // Eliminar tipos de página de videos
  await knex('tipos_pagina')
    .whereIn('codigo', ['video_category', 'video_single'])
    .delete();
}
