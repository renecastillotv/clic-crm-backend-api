import { Knex } from 'knex';

/**
 * Migración: Normalizar nombres de componentes en componentes_web
 *
 * Problema: Los componentes en componentes_web usan nombres con guiones (article-grid)
 * pero el catálogo usa guiones bajos (article_grid), causando que no se encuentren
 * las definiciones y schemas.
 *
 * Esta migración:
 * 1. Normaliza todos los nombres de guiones a guiones bajos
 * 2. Mapea tipos personalizados a sus códigos correctos del catálogo
 */
export async function up(knex: Knex): Promise<void> {
  console.log('📦 Normalizando nombres de componentes...');

  // Mapeo de tipos usados en componentes_web a códigos de catálogo
  const mapeoTipos: Record<string, string> = {
    // Guiones a guiones bajos (normalización)
    'article-grid': 'article_grid',
    'article-detail': 'article_detail',
    'article-category': 'article_grid', // Usar article_grid como base
    'article-hero': 'hero', // Es un tipo de hero
    'asesor-detail': 'agent_profile',
    'contact-form': 'contact_form',
    'contact-info': 'contact_form', // Tipo similar
    'property-grid': 'property_grid',
    'property-detail': 'property_detail',
    'property-list': 'property_grid', // Lista es un tipo de grid
    'property-carousel': 'property_grid',
    'team-grid': 'team_grid',
    'video-gallery': 'video_gallery',
    'video-detail': 'video_gallery', // Detalle usa gallery como base
    'video-category': 'video_gallery',
    'video-hero': 'hero', // Es un tipo de hero
    'about-founder': 'agent_profile', // Perfil de fundador similar a asesor

    // Tipos personalizados que no están en catálogo (crear mapeo temporal)
    'cta': 'hero', // CTA puede usar hero como base
    'features': 'hero', // Features puede usar hero
    'filter-panel': 'search_box',
    'knowledge-center': 'article_grid',
    'location-discovery': 'property_grid',
    'related_properties': 'property_grid',
    'dynamic_faqs': 'article_grid',
    'youtube-channel': 'video_gallery',
    'youtube_channel': 'video_gallery',
    'article_list': 'article_grid',
    'about_founder': 'agent_profile',
  };

  let totalActualizados = 0;
  let totalEliminados = 0;

  // Obtener todos los tipos únicos que necesitan actualización
  const tiposExistentes = await knex('componentes_web')
    .distinct('tipo')
    .select('tipo');

  console.log(`📋 Encontrados ${tiposExistentes.length} tipos únicos de componentes`);

  for (const row of tiposExistentes) {
    const tipoActual = row.tipo;
    const tipoNuevo = mapeoTipos[tipoActual];

    if (tipoNuevo && tipoNuevo !== tipoActual) {
      // Obtener todos los registros con el tipo actual
      const registrosActuales = await knex('componentes_web')
        .where('tipo', tipoActual)
        .select('*');

      let actualizados = 0;
      let eliminados = 0;

      for (const registro of registrosActuales) {
        // Construir query de verificación con manejo correcto de nulls
        let query = knex('componentes_web')
          .where({
            tenant_id: registro.tenant_id,
            tipo: tipoNuevo,
            variante: registro.variante,
            scope: registro.scope,
          });

        // Manejar tipo_pagina (puede ser null)
        if (registro.tipo_pagina === null) {
          query = query.whereNull('tipo_pagina');
        } else {
          query = query.where('tipo_pagina', registro.tipo_pagina);
        }

        // Manejar pagina_id (puede ser null)
        if (registro.pagina_id === null) {
          query = query.whereNull('pagina_id');
        } else {
          query = query.where('pagina_id', registro.pagina_id);
        }

        const existe = await query.first();

        if (existe) {
          // Ya existe, eliminar el duplicado (mantener el que ya tiene el nombre normalizado)
          await knex('componentes_web')
            .where('id', registro.id)
            .delete();
          eliminados++;
          console.log(`  🗑️  Duplicado eliminado: ${registro.id} (${tipoActual})`);
        } else {
          // No existe, actualizar el tipo
          await knex('componentes_web')
            .where('id', registro.id)
            .update({
              tipo: tipoNuevo,
              updated_at: knex.fn.now()
            });
          actualizados++;
        }
      }

      if (actualizados > 0 || eliminados > 0) {
        console.log(`✅ "${tipoActual}" → "${tipoNuevo}" (${actualizados} actualizados, ${eliminados} duplicados eliminados)`);
        totalActualizados += actualizados;
        totalEliminados += eliminados;
      }
    }
  }

  console.log(`✅ Migración completada: ${totalActualizados} componentes normalizados, ${totalEliminados} duplicados eliminados`);
}

export async function down(knex: Knex): Promise<void> {
  console.log('⚠️  Rollback: No se puede revertir automáticamente la normalización de nombres');
  console.log('Los nombres originales no fueron guardados.');
}
