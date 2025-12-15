import { Knex } from 'knex';

/**
 * Migración 061 - Migrar páginas a tipos consolidados
 *
 * Actualiza todas las páginas web que usan tipos duplicados
 * a los tipos consolidados oficiales
 */
export async function up(knex: Knex): Promise<void> {
  console.log('🔄 Migrando páginas a tipos consolidados...\n');

  // Mapeo de tipos duplicados -> tipos consolidados
  const migrations: { from: string; to: string }[] = [
    // Asesores
    { from: 'single_asesor', to: 'asesor_single' },
    { from: 'directorio_asesores', to: 'listado_asesores' },

    // Videos
    { from: 'video_category', to: 'videos_categoria' },
    { from: 'video_single', to: 'videos_single' },
    { from: 'directorio_videos', to: 'videos_listado' },
    { from: 'videos', to: 'videos_listado' },

    // Artículos
    { from: 'articulo_single', to: 'articulos_single' },
    { from: 'single_articulo', to: 'articulos_single' },
    { from: 'directorio_articulos', to: 'articulos_listado' },
    { from: 'blog', to: 'articulos_listado' },

    // Propiedades
    { from: 'listados_propiedades', to: 'propiedades_listado' },
    { from: 'single_property', to: 'propiedades_single' },

    // Testimonios
    { from: 'directorio_testimonios', to: 'testimonios' },
  ];

  for (const migration of migrations) {
    // Contar páginas afectadas
    const count = await knex('paginas_web')
      .where('tipo_pagina', migration.from)
      .count('* as count')
      .first();

    const pageCount = parseInt(count?.count as string || '0');

    if (pageCount > 0) {
      // Migrar páginas
      await knex('paginas_web')
        .where('tipo_pagina', migration.from)
        .update({ tipo_pagina: migration.to });

      console.log(`✅ ${migration.from} → ${migration.to} (${pageCount} páginas)`);
    } else {
      console.log(`⏭️  ${migration.from} → ${migration.to} (sin páginas)`);
    }
  }

  console.log('\n🗑️  Eliminando tipos de página duplicados obsoletos...\n');

  // Ahora eliminar los tipos duplicados que ya no se usan
  const duplicatesToDelete = migrations.map(m => m.from);

  for (const codigo of duplicatesToDelete) {
    // Verificar que ya no hay páginas usando este tipo
    const usage = await knex('paginas_web')
      .where('tipo_pagina', codigo)
      .count('* as count')
      .first();

    const pageCount = parseInt(usage?.count as string || '0');

    if (pageCount === 0) {
      await knex('tipos_pagina').where('codigo', codigo).delete();
      console.log(`✅ Eliminado: ${codigo}`);
    } else {
      console.log(`⚠️  OMITIDO (aún en uso): ${codigo} (${pageCount} páginas)`);
    }
  }

  console.log('\n✅ Migración de páginas completada');
}

export async function down(knex: Knex): Promise<void> {
  console.log('⚠️  No se puede revertir esta migración de forma segura');
}
